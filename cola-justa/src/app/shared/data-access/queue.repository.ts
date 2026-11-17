import { Injectable, computed, signal } from '@angular/core';
import { AppState, Turn, Wallet } from '../models/models';
import {
  calculatePointsForBoarding,
  countPeopleAhead,
  isTurnExpired,
  sumPointsEarnedToday,
} from '../domain/queue-rules';
import { REWARDS, buildDemoState } from './demo-seed';

const STORAGE_KEY = 'cola-justa:state:banco-v1';
const CHANNEL = 'cola-justa';

/**
 * Repositorio de la demo: guarda el estado en el navegador y lo sincroniza en vivo
 * entre pestañas (cliente, pantalla de la agencia y panel de gestión).
 * En el piloto, estas mismas operaciones pasan a Netlify Functions + Firestore.
 */
@Injectable({ providedIn: 'root' })
export class QueueRepository {
  private readonly state = signal<AppState>(this.load());
  private readonly channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;

  readonly stops = computed(() => this.state().stops);
  readonly turns = computed(() => this.state().turns);
  readonly events = computed(() => this.state().events);
  readonly wallets = computed(() => this.state().wallets);
  readonly rewards = REWARDS;

  constructor() {
    this.channel?.addEventListener('message', (e: MessageEvent<AppState>) => this.state.set(e.data));
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY && e.newValue) this.state.set(JSON.parse(e.newValue));
    });
    setInterval(() => this.expireOldTurns(), 30_000);
  }

  findStop(stopId: string) {
    return this.stops().find((s) => s.id === stopId);
  }

  findActiveTurn(stopId: string, deviceId: string): Turn | undefined {
    return this.turns().find((t) => t.stopId === stopId && t.deviceId === deviceId && t.status === 'waiting');
  }

  findLastBoardedTurn(stopId: string, deviceId: string): Turn | undefined {
    return this.turns()
      .filter((t) => t.stopId === stopId && t.deviceId === deviceId && t.status === 'boarded')
      .sort((a, b) => (b.boardedAt ?? 0) - (a.boardedAt ?? 0))[0];
  }

  waitingTurns(stopId: string): Turn[] {
    return this.turns()
      .filter((t) => t.stopId === stopId && t.status === 'waiting')
      .sort((a, b) => a.number - b.number);
  }

  peopleAhead(turn: Turn): number {
    return countPeopleAhead(this.turns(), turn);
  }

  wallet(deviceId: string): Wallet {
    return this.wallets()[deviceId] ?? { deviceId, points: 0, history: [] };
  }

  takeTurn(stopId: string, deviceId: string): Turn {
    const existing = this.findActiveTurn(stopId, deviceId);
    if (existing) return existing;
    const s = this.state();
    const number = (s.counters[stopId] ?? 0) + 1;
    const turn: Turn = {
      id: `${stopId}-${number}-${Date.now()}`,
      stopId,
      number,
      deviceId,
      status: 'waiting',
      ceded: false,
      createdAt: Date.now(),
    };
    this.commit({ ...s, turns: [...s.turns, turn], counters: { ...s.counters, [stopId]: number } });
    return turn;
  }

  /** Cede su lugar a una persona prioritaria: la persona prioritaria pasa antes y quien cede gana doble al ser atendido. */
  cedeTurn(turnId: string): void {
    const s = this.state();
    const turn = s.turns.find((t) => t.id === turnId);
    if (!turn || turn.status !== 'waiting' || turn.ceded) return;
    // La persona prioritaria ocupa el lugar justo antes del que cede.
    const priority: Turn = {
      id: `prio-${Date.now()}`,
      stopId: turn.stopId,
      number: turn.number - 0.5,
      deviceId: 'prioritario',
      status: 'waiting',
      ceded: false,
      createdAt: Date.now(),
    };
    const turns = s.turns.map((t) => (t.id === turnId ? { ...t, ceded: true } : t));
    this.commit({ ...s, turns: [...turns, priority] });
  }

  /** Confirma la atención en ventanilla del primero en la cola y otorga puntos. */
  boardTurn(turnId: string): number {
    const s = this.state();
    const turn = s.turns.find((t) => t.id === turnId);
    if (!turn || turn.status !== 'waiting') return 0;
    if (countPeopleAhead(s.turns, turn) > 0) return 0;
    const now = Date.now();
    const wallet = s.wallets[turn.deviceId] ?? { deviceId: turn.deviceId, points: 0, history: [] };
    const points = calculatePointsForBoarding(turn, sumPointsEarnedToday(wallet, now));
    const updatedWallet: Wallet = {
      ...wallet,
      points: wallet.points + points,
      history: [
        { at: now, points, concept: turn.ceded ? 'Te atendieron y cediste tu lugar' : 'Te atendieron respetando tu turno' },
        ...wallet.history,
      ],
    };
    this.commit({
      ...s,
      turns: s.turns.map((t) => (t.id === turnId ? { ...t, status: 'boarded', boardedAt: now, pointsAwarded: points } : t)),
      events: [...s.events, { stopId: turn.stopId, at: now, kind: 'respected' }],
      wallets: { ...s.wallets, [turn.deviceId]: updatedWallet },
    });
    return points;
  }

  /** Se liberan ventanillas: se atiende en orden a las primeras `windows` personas (y a veces alguien se cuela). */
  simulateBusArrival(stopId: string, windows = 2): void {
    for (const turn of this.waitingTurns(stopId).slice(0, windows)) this.boardTurn(turn.id);
    if (Math.random() < 0.25) this.reportCutter(stopId);
    this.refillQueue(stopId);
  }

  reportCutter(stopId: string): void {
    const s = this.state();
    this.commit({ ...s, events: [...s.events, { stopId, at: Date.now(), kind: 'cutter' }] });
  }

  /** Hora de mayor afluencia simulada en todas las agencias para mover el panel en vivo. */
  simulateRushHour(): void {
    const s = this.state();
    const now = Date.now();
    const events = [...s.events];
    for (const stop of s.stops) {
      for (let k = 0; k < 15; k++) {
        events.push({ stopId: stop.id, at: now - Math.floor(Math.random() * 600_000), kind: Math.random() < 0.1 ? 'cutter' : 'respected' });
      }
    }
    this.commit({ ...s, events });
  }

  redeem(deviceId: string, rewardId: string): boolean {
    const reward = REWARDS.find((r) => r.id === rewardId);
    const s = this.state();
    const wallet = s.wallets[deviceId];
    if (!reward || !wallet || wallet.points < reward.cost) return false;
    const updated: Wallet = {
      ...wallet,
      points: wallet.points - reward.cost,
      history: [{ at: Date.now(), points: -reward.cost, concept: `Canje: ${reward.title}` }, ...wallet.history],
    };
    this.commit({ ...s, wallets: { ...s.wallets, [deviceId]: updated } });
    return true;
  }

  resetDemo(): void {
    this.commit(buildDemoState(Date.now()));
  }

  private refillQueue(stopId: string): void {
    const s = this.state();
    const waiting = s.turns.filter((t) => t.stopId === stopId && t.status === 'waiting').length;
    if (waiting >= 2) return;
    let counter = s.counters[stopId] ?? 0;
    const added: Turn[] = [1, 2].map((k) => {
      counter++;
      return { id: `auto-${stopId}-${counter}-${k}`, stopId, number: counter, deviceId: `cliente-${counter}`, status: 'waiting', ceded: false, createdAt: Date.now() };
    });
    this.commit({ ...s, turns: [...s.turns, ...added], counters: { ...s.counters, [stopId]: counter } });
  }

  private expireOldTurns(): void {
    const s = this.state();
    const now = Date.now();
    if (!s.turns.some((t) => isTurnExpired(t, now) && !t.deviceId.startsWith('cliente'))) return;
    this.commit({
      ...s,
      turns: s.turns.map((t) => (isTurnExpired(t, now) && !t.deviceId.startsWith('cliente') ? { ...t, status: 'expired' } : t)),
    });
  }

  private commit(next: AppState): void {
    this.state.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* almacenamiento no disponible: la demo sigue en memoria */
    }
    this.channel?.postMessage(next);
  }

  private load(): AppState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        if (parsed.version === 1) return parsed;
      }
    } catch {
      /* ignorar y sembrar */
    }
    return buildDemoState(Date.now());
  }
}

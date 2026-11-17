import { AppState, BoardingEvent, BusStop, Reward, Turn } from '../models/models';
import { startOfDay } from '../domain/queue-rules';

export const STOPS: BusStop[] = [
  { id: 'olivos', name: 'Agencia Los Olivos – Av. Alfredo Mendiola', district: 'Los Olivos' },
  { id: 'izaguirre', name: 'Agencia Carlos Izaguirre', district: 'Los Olivos' },
  { id: 'palmeras', name: 'Agencia Las Palmeras', district: 'Los Olivos' },
  { id: 'megaplaza', name: 'Agencia Megaplaza', district: 'Independencia' },
  { id: 'plazanorte', name: 'Agencia Plaza Norte', district: 'Independencia' },
];

export const REWARDS: Reward[] = [
  { id: 'bodega', title: '10% de descuento en tu bodega', partner: 'Comercios de Los Olivos', cost: 50 },
  { id: 'cashback', title: 'S/ 2 de cashback', partner: 'Yape', cost: 100 },
  { id: 'cine', title: 'Entrada 2x1 al cine', partner: 'Aliados del programa', cost: 150 },
];

/** PRNG determinista para que la demo se vea igual en cada carga. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildDemoState(now: number): AppState {
  const rand = mulberry32(2027);
  const dayStart = startOfDay(now);
  const currentHour = Math.min(new Date(now).getHours(), 18);
  const events: BoardingEvent[] = [];

  // Historia del día (horario bancario 9:00–18:00): los colados bajan a medida que la gente usa Cola Justa.
  STOPS.forEach((stop, i) => {
    for (let hour = 9; hour <= currentHour; hour++) {
      const progress = (hour - 9) / 9;
      const cutterRate = Math.max(0.06, 0.3 - progress * 0.2 + (i - 2) * 0.025);
      const total = 18 + Math.floor(rand() * 18);
      for (let k = 0; k < total; k++) {
        const at = dayStart + hour * 3_600_000 + Math.floor(rand() * 3_500_000);
        if (at > now) continue;
        events.push({ stopId: stop.id, at, kind: rand() < cutterRate ? 'cutter' : 'respected' });
      }
    }
  });

  // Personas ya esperando en cada agencia.
  const turns: Turn[] = [];
  const counters: Record<string, number> = {};
  STOPS.forEach((stop) => {
    const waiting = stop.id === 'olivos' ? 4 : 2 + Math.floor(rand() * 4);
    counters[stop.id] = 0;
    for (let k = 0; k < waiting; k++) {
      counters[stop.id]++;
      turns.push({
        id: `seed-${stop.id}-${k}`,
        stopId: stop.id,
        number: counters[stop.id],
        deviceId: `cliente-${stop.id}-${k}`,
        status: 'waiting',
        ceded: false,
        createdAt: now - (waiting - k) * 60_000,
      });
    }
  });

  return { version: 1, stops: STOPS, turns, events, wallets: {}, counters };
}

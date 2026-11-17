import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { QueueRepository } from '../../shared/data-access/queue.repository';
import { getDeviceId } from '../../core/device/device-id';
import { RULES } from '../../shared/domain/queue-rules';
import { formatTurnLabel } from '../../shared/ui/turn-label';
import { QrCode } from '../../shared/ui/qr-code';
import { Turn } from '../../shared/models/models';

@Component({
  selector: 'app-passenger-page',
  imports: [DatePipe, RouterLink, QrCode],
  template: `
    <div class="mx-auto max-w-md">
      @if (stop(); as s) {
        <p class="text-xs font-bold uppercase tracking-wide text-brand-600">{{ s.district }}</p>
        <h1 class="text-2xl font-extrabold text-brand-900">{{ s.name }}</h1>
        <p class="mt-1 text-sm text-slate-500">{{ queueSize() }} personas en la cola ahora</p>

        <section class="mt-5 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          @if (activeTurn(); as turn) {
            <p class="text-center text-sm font-semibold text-slate-500">Tu turno</p>
            <p class="animate-pop text-center text-8xl font-extrabold tabular-nums text-brand-700">{{ label(turn) }}</p>
            <div class="mx-auto mt-3 flex w-fit items-center gap-3 rounded-2xl bg-brand-50 p-3">
              <app-qr-code class="w-28" [value]="ticketCode(turn)" alt="QR de tu turno para mostrar en ventanilla" />
              <p class="max-w-36 text-sm text-slate-600"><b class="text-brand-900">Tu ticket digital.</b> Muéstralo en ventanilla cuando llamen tu número.</p>
            </div>
            @if (ahead() === 0) {
              <p class="mt-2 rounded-xl bg-good-500/10 py-2 text-center font-bold text-good-500">¡Es tu turno! Acércate a la ventanilla</p>
              <button (click)="board(turn.id)" class="mt-4 w-full rounded-xl bg-good-500 py-3.5 font-bold text-white hover:brightness-95">
                Confirmar que me atendieron
              </button>
            } @else {
              <p class="mt-2 text-center text-lg"><b class="tabular-nums">{{ ahead() }}</b> {{ ahead() === 1 ? 'persona' : 'personas' }} antes que tú</p>
              <p class="text-center text-sm text-slate-500">Tiempo estimado: ~{{ ahead() * 4 }} min · vence a los {{ ttl }} min</p>
            }
            @if (turn.ceded) {
              <p class="mt-4 rounded-xl bg-sun-400/20 p-3 text-center text-sm font-semibold text-amber-800">
                Cediste tu lugar a una persona prioritaria. Ganarás el doble cuando te atiendan.
              </p>
            } @else {
              <button (click)="cede(turn.id)" class="mt-4 w-full rounded-xl border-2 border-sun-500 py-3 font-bold text-amber-800 hover:bg-sun-400/10">
                Ceder mi lugar a un adulto mayor o gestante (+20)
              </button>
            }
          } @else {
            @if (justBoarded(); as pts) {
              <div class="animate-pop text-center">
                <p class="text-5xl font-extrabold text-good-500">+{{ pts }}</p>
                <p class="font-bold">Puntos Justos</p>
                <p class="mt-1 text-sm text-slate-500">Gracias por respetar la cola. Tu agencia sube en el ranking.</p>
              </div>
              <hr class="my-5 border-slate-200" />
            }
            <p class="text-center text-slate-600">Escaneaste el QR de la agencia.</p>
            <button (click)="take()" class="mt-4 w-full rounded-xl bg-brand-600 py-3.5 text-lg font-bold text-white hover:bg-brand-700">
              Tomar mi turno
            </button>
            <p class="mt-3 text-center text-xs text-slate-500">Fórmate detrás de la línea amarilla y espera a que la pantalla llame tu número.</p>
          }
        </section>

        <section class="mt-5 rounded-3xl bg-brand-900 p-6 text-white">
          <div class="flex items-end justify-between">
            <div>
              <p class="text-sm text-brand-100">Mis Puntos Justos</p>
              <p class="text-4xl font-extrabold tabular-nums">{{ wallet().points }}</p>
            </div>
            <p class="text-xs text-brand-100">Tope diario: {{ cap }} pts</p>
          </div>
          <div class="mt-4 space-y-2">
            @for (r of repo.rewards; track r.id) {
              <div class="flex items-center gap-3 rounded-xl bg-white/10 p-3">
                <div class="mr-auto">
                  <p class="font-semibold">{{ r.title }}</p>
                  <p class="text-xs text-brand-100">{{ r.partner }} · {{ r.cost }} pts</p>
                </div>
                <button (click)="redeem(r.id)" [disabled]="wallet().points < r.cost"
                        class="rounded-lg bg-sun-400 px-3 py-1.5 text-sm font-bold text-brand-900 disabled:opacity-40">Canjear</button>
              </div>
            }
          </div>
          @if (message(); as m) {
            <p class="mt-3 rounded-lg bg-white/15 p-2 text-center text-sm">{{ m }}</p>
          }
        </section>

        @if (wallet().history.length) {
          <section class="mt-5 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <p class="mb-2 font-bold">Historial</p>
            @for (h of wallet().history.slice(0, 5); track h.at) {
              <div class="flex justify-between border-t border-slate-100 py-2 text-sm">
                <span>{{ h.concept }} <span class="text-slate-400">· {{ h.at | date: 'HH:mm' }}</span></span>
                <b [class]="h.points >= 0 ? 'text-good-500' : 'text-bad-500'">{{ h.points >= 0 ? '+' : '' }}{{ h.points }}</b>
              </div>
            }
          </section>
        }

        <div class="mt-5 flex justify-center gap-4 text-sm">
          <button (click)="repo.reportCutter(stopId())" class="font-semibold text-bad-500 hover:underline">Reportar que alguien se coló</button>
          <a [routerLink]="['/pantalla', stopId()]" target="_blank" class="font-semibold text-brand-600 hover:underline">Ver pantalla</a>
        </div>
      } @else {
        <p>Agencia no encontrada.</p>
      }
    </div>
  `,
})
export class PassengerPage {
  protected readonly repo = inject(QueueRepository);
  readonly stopId = input.required<string>();
  private readonly deviceId = getDeviceId();

  protected readonly ttl = RULES.turnTtlMinutes;
  protected readonly cap = RULES.dailyPointsCap;
  protected readonly message = signal<string | null>(null);

  protected readonly stop = computed(() => this.repo.findStop(this.stopId()));
  protected readonly activeTurn = computed(() => this.repo.findActiveTurn(this.stopId(), this.deviceId));
  protected readonly ahead = computed(() => {
    const t = this.activeTurn();
    return t ? this.repo.peopleAhead(t) : 0;
  });
  protected readonly queueSize = computed(() => this.repo.waitingTurns(this.stopId()).length);
  protected readonly wallet = computed(() => this.repo.wallet(this.deviceId));
  /** Puntos de la última atención (también si la ventanilla llamó su número desde la pantalla). */
  protected readonly justBoarded = computed(() => {
    const last = this.repo.findLastBoardedTurn(this.stopId(), this.deviceId);
    if (!last || Date.now() - (last.boardedAt ?? 0) > 10 * 60_000) return null;
    return last.pointsAwarded ?? 0;
  });

  protected label = formatTurnLabel;

  /** Código que lee la ventanilla para validar la atención del turno. */
  protected ticketCode(turn: Turn): string {
    return `COLAJUSTA|${turn.stopId}|${turn.number}|${turn.id}`;
  }

  take(): void {
    this.message.set(null);
    this.repo.takeTurn(this.stopId(), this.deviceId);
  }

  cede(turnId: string): void {
    this.repo.cedeTurn(turnId);
  }

  board(turnId: string): void {
    this.repo.boardTurn(turnId);
  }

  redeem(rewardId: string): void {
    const ok = this.repo.redeem(this.deviceId, rewardId);
    this.message.set(ok ? '¡Canje realizado! Te llegará el beneficio (simulado).' : 'No tienes puntos suficientes.');
  }
}

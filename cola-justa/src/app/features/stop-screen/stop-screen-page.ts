import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QueueRepository } from '../../shared/data-access/queue.repository';
import { calculateRespectRate, filterEventsOfToday, rankStopsByRespect } from '../../shared/domain/queue-rules';
import { QrCode } from '../../shared/ui/qr-code';
import { formatTurnLabel } from '../../shared/ui/turn-label';

@Component({
  selector: 'app-stop-screen-page',
  imports: [QrCode, RouterLink],
  template: `
    <div class="min-h-screen bg-brand-900 p-6 text-white md:p-10">
      @if (stop(); as s) {
        <header class="flex flex-wrap items-center gap-3">
          <a routerLink="/" class="grid h-10 w-10 place-items-center rounded-xl bg-sun-400 font-extrabold text-brand-900">CJ</a>
          <div class="mr-auto">
            <p class="text-sm font-semibold text-brand-100">Cola Justa · {{ s.district }}</p>
            <h1 class="text-2xl font-extrabold md:text-3xl">{{ s.name }}</h1>
          </div>
          <button (click)="repo.simulateBusArrival(stopId())" class="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">
            Llamar siguientes (2 ventanillas)
          </button>
        </header>

        <div class="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr_1fr]">
          <section class="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <p class="text-lg font-semibold text-brand-100">Hoy respetamos la cola</p>
            <p class="text-[7rem] font-extrabold leading-none tabular-nums" [class.text-sun-400]="(rate() ?? 0) >= 85">
              {{ rate() ?? '–' }}<span class="text-5xl">%</span>
            </p>
            <div class="mt-4 h-4 overflow-hidden rounded-full bg-white/10">
              <div class="h-full rounded-full bg-sun-400 transition-all duration-700" [style.width.%]="rate() ?? 0"></div>
            </div>
            <p class="mt-3 text-brand-100">{{ boardedToday() }} atenciones hoy en esta agencia · {{ cuttersToday() }} colados reportados</p>
          </section>

          <section class="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <p class="text-lg font-semibold text-brand-100">Cola en este momento</p>
            <ol class="mt-3 space-y-2">
              @for (t of queue().slice(0, 6); track t.id; let i = $index) {
                <li class="flex items-center gap-3 rounded-xl px-3 py-2" [class]="i === 0 ? 'bg-sun-400 text-brand-900' : 'bg-white/10'">
                  <span class="text-2xl font-extrabold tabular-nums">{{ label(t) }}</span>
                  <span class="ml-auto text-sm font-semibold">{{ i === 0 ? 'Pase a ventanilla' : (t.ceded ? 'cedió su lugar' : 'esperando') }}</span>
                </li>
              } @empty {
                <li class="text-brand-100">Nadie en cola. ¡Escanea y toma tu turno!</li>
              }
            </ol>
            @if (queue().length > 6) {
              <p class="mt-2 text-sm text-brand-100">y {{ queue().length - 6 }} más…</p>
            }
          </section>

          <section class="flex flex-col items-center rounded-3xl bg-white p-6 text-center text-brand-900">
            <p class="font-extrabold">Escanea y toma tu turno</p>
            <app-qr-code class="mt-3 w-48" [value]="passengerUrl()" alt="QR para tomar turno" />
            <p class="mt-3 text-sm text-slate-600">Respeta tu turno: <b>+10 pts</b>. Cede tu lugar: <b>+20 pts</b>.</p>
          </section>
        </div>

        <section class="mt-6 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
          <p class="text-lg font-semibold text-brand-100">Ranking de agencias · hoy</p>
          <div class="mt-3 grid gap-2 md:grid-cols-5">
            @for (r of ranking(); track r.stop.id; let i = $index) {
              <div class="rounded-xl p-3" [class]="r.stop.id === stopId() ? 'bg-sun-400 text-brand-900' : 'bg-white/10'">
                <p class="text-xs font-bold">#{{ i + 1 }}</p>
                <p class="truncate text-sm font-semibold">{{ r.stop.name }}</p>
                <p class="text-2xl font-extrabold tabular-nums">{{ r.rate ?? '–' }}%</p>
              </div>
            }
          </div>
        </section>
      } @else {
        <p>Agencia no encontrada.</p>
      }
    </div>
  `,
})
export class StopScreenPage {
  protected readonly repo = inject(QueueRepository);
  readonly stopId = input.required<string>();

  protected readonly stop = computed(() => this.repo.findStop(this.stopId()));
  private readonly todayEvents = computed(() => filterEventsOfToday(this.repo.events(), Date.now()));
  private readonly stopEvents = computed(() => this.todayEvents().filter((e) => e.stopId === this.stopId()));
  protected readonly rate = computed(() => calculateRespectRate(this.stopEvents()));
  protected readonly boardedToday = computed(() => this.stopEvents().length);
  protected readonly cuttersToday = computed(() => this.stopEvents().filter((e) => e.kind === 'cutter').length);
  protected readonly queue = computed(() => this.repo.waitingTurns(this.stopId()));
  protected readonly ranking = computed(() => rankStopsByRespect(this.repo.stops(), this.todayEvents()));
  protected readonly passengerUrl = computed(() => `${location.href.split('#')[0]}#/agencia/${this.stopId()}`);
  protected label = formatTurnLabel;
}

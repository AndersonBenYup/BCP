import { AfterViewInit, Component, ElementRef, OnDestroy, computed, effect, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { QueueRepository } from '../../shared/data-access/queue.repository';
import {
  RULES,
  calculateCuttersPer100,
  calculateRespectRate,
  filterEventsOfToday,
  groupRespectRateByHour,
  rankStopsByRespect,
} from '../../shared/domain/queue-rules';

Chart.register(...registerables);

@Component({
  selector: 'app-city-panel-page',
  imports: [RouterLink],
  template: `
    <div class="flex flex-wrap items-end gap-3">
      <div class="mr-auto">
        <p class="text-xs font-bold uppercase tracking-wide text-brand-600">Panel de gestión · Piloto 2027</p>
        <h1 class="text-3xl font-extrabold text-brand-900">Respeto de la cola en agencias de Lima Norte</h1>
      </div>
      <button (click)="repo.simulateRushHour()" class="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700">Simular hora de mayor afluencia</button>
      <button (click)="repo.resetDemo()" class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">Reiniciar demo</button>
    </div>

    <section class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <article class="rounded-2xl bg-brand-900 p-5 text-white">
        <p class="text-sm text-brand-100">Colados por cada 100 atenciones</p>
        <p class="text-5xl font-extrabold tabular-nums">{{ cuttersPer100() ?? '–' }}</p>
        <p class="mt-1 text-xs text-brand-100">Línea base {{ baseline }} · Meta {{ target }}</p>
      </article>
      <article class="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <p class="text-sm text-slate-500">% de respeto hoy</p>
        <p class="text-5xl font-extrabold tabular-nums text-good-500">{{ rate() ?? '–' }}%</p>
      </article>
      <article class="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <p class="text-sm text-slate-500">Atenciones registradas hoy</p>
        <p class="text-5xl font-extrabold tabular-nums">{{ today().length }}</p>
      </article>
      <article class="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <p class="text-sm text-slate-500">Lugares cedidos a prioritarios</p>
        <p class="text-5xl font-extrabold tabular-nums text-amber-600">{{ ceded() }}</p>
      </article>
    </section>

    <section class="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <article class="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <p class="font-bold">% de respeto por hora (todas las agencias)</p>
        <div class="relative mt-3 h-72"><canvas #hourly></canvas></div>
      </article>
      <article class="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <p class="font-bold">Ranking de agencias</p>
        <table class="mt-3 w-full text-sm">
          <thead><tr class="text-left text-slate-500"><th class="py-1">#</th><th>Agencia</th><th class="text-right">Respeto</th><th class="text-right">Atenciones</th></tr></thead>
          <tbody>
            @for (r of ranking(); track r.stop.id; let i = $index) {
              <tr class="border-t border-slate-100">
                <td class="py-2 font-bold">{{ i + 1 }}</td>
                <td><a [routerLink]="['/agencia', r.stop.id]" class="font-semibold hover:text-brand-600">{{ r.stop.name }}</a></td>
                <td class="text-right font-bold tabular-nums">{{ r.rate ?? '–' }}%</td>
                <td class="text-right tabular-nums text-slate-500">{{ r.total }}</td>
              </tr>
            }
          </tbody>
        </table>
        <p class="mt-4 text-xs text-slate-500">
          Medición del piloto: observación directa en 5 agencias con Cola Justa frente a 5 de control, más los datos del sistema de turnos.
        </p>
      </article>
    </section>
  `,
})
export class CityPanelPage implements AfterViewInit, OnDestroy {
  protected readonly repo = inject(QueueRepository);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('hourly');
  private chart?: Chart;

  protected readonly baseline = RULES.baselineCuttersPer100;
  protected readonly target = RULES.targetCuttersPer100;
  protected readonly today = computed(() => filterEventsOfToday(this.repo.events(), Date.now()));
  protected readonly rate = computed(() => calculateRespectRate(this.today()));
  protected readonly cuttersPer100 = computed(() => calculateCuttersPer100(this.today()));
  protected readonly ceded = computed(() => this.repo.turns().filter((t) => t.ceded).length);
  protected readonly ranking = computed(() => rankStopsByRespect(this.repo.stops(), this.today()));
  private readonly hourly = computed(() => groupRespectRateByHour(this.today(), 9, Math.max(18, new Date().getHours())));

  constructor() {
    effect(() => {
      const data = this.hourly();
      if (!this.chart) return;
      this.chart.data.datasets[0].data = data.map((h) => h.rate);
      this.chart.update();
    });
  }

  ngAfterViewInit(): void {
    const data = this.hourly();
    this.chart = new Chart(this.canvas().nativeElement, {
      type: 'line',
      data: {
        labels: data.map((h) => `${h.hour}:00`),
        datasets: [
          {
            label: '% de respeto',
            data: data.map((h) => h.rate),
            borderColor: '#1f45c9',
            backgroundColor: 'rgba(47,91,234,0.12)',
            fill: true,
            tension: 0.35,
            spanGaps: false,
          },
          {
            label: `Meta (${100 - RULES.targetCuttersPer100}%)`,
            data: data.map(() => 100 - RULES.targetCuttersPer100),
            borderColor: '#f5a800',
            borderDash: [6, 6],
            pointRadius: 0,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        scales: { y: { min: 50, max: 100, ticks: { callback: (v) => `${v}%` } } },
        plugins: { legend: { position: 'bottom' } },
      },
    });  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}

import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QueueRepository } from '../../shared/data-access/queue.repository';
import { calculateRespectRate, filterEventsOfToday } from '../../shared/domain/queue-rules';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  template: `
    <section class="grid items-center gap-8 py-6 md:grid-cols-[1.2fr_1fr]">
      <div>
        <p class="mb-3 inline-block rounded-full bg-sun-400/25 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">
          Hackatón UPN × BCP · Respetar las reglas
        </p>
        <h1 class="text-4xl font-extrabold leading-tight tracking-tight text-brand-900 md:text-5xl">
          Que respetar la cola en el banco sea lo más fácil.
        </h1>
        <p class="mt-4 max-w-xl text-lg text-slate-600">
          Al llegar a la agencia escaneas el QR, recibes tu turno visible, te atienden en orden y ganas puntos.
          La pantalla de la agencia muestra en vivo cuánto respetamos la cola.
        </p>
        <div class="mt-6 flex flex-wrap gap-3">
          <a routerLink="/agencia/olivos" class="rounded-xl bg-brand-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-brand-700">Probar como cliente</a>
          <a routerLink="/pantalla/olivos" target="_blank" class="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-100">Abrir pantalla de la agencia</a>
        </div>
      </div>
      <div class="rounded-3xl bg-brand-900 p-6 text-white shadow-xl">
        <p class="text-sm font-semibold text-brand-100">Respeto de la cola hoy · 5 agencias</p>
        <p class="mt-1 text-7xl font-extrabold tabular-nums">{{ todayRate() ?? '–' }}<span class="text-4xl">%</span></p>
        <p class="mt-2 text-brand-100">8 de cada 10 creemos que juntos podemos cambiar. Aquí se ve que sí lo hacemos.</p>
      </div>
    </section>

    <section class="mt-6 grid gap-4 md:grid-cols-3">
      @for (step of steps; track step.n) {
        <article class="rounded-2xl border border-slate-200 bg-white p-5">
          <span class="grid h-9 w-9 place-items-center rounded-full bg-sun-400 font-extrabold text-brand-900">{{ step.n }}</span>
          <h2 class="mt-3 text-lg font-bold">{{ step.title }}</h2>
          <p class="mt-1 text-slate-600">{{ step.text }}</p>
        </article>
      }
    </section>

    <section class="mt-6 grid gap-4 md:grid-cols-3">
      <a routerLink="/agencia/olivos" class="group rounded-2xl border border-slate-200 bg-white p-5 hover:border-brand-500">
        <p class="text-xs font-bold uppercase text-brand-600">Cliente</p>
        <p class="mt-1 font-bold">Tomar turno, ceder, ser atendido y canjear</p>
      </a>
      <a routerLink="/pantalla/olivos" target="_blank" class="group rounded-2xl border border-slate-200 bg-white p-5 hover:border-brand-500">
        <p class="text-xs font-bold uppercase text-brand-600">Pantalla de la agencia</p>
        <p class="mt-1 font-bold">QR, cola en vivo y % de respeto</p>
      </a>
      <a routerLink="/panel" class="group rounded-2xl border border-slate-200 bg-white p-5 hover:border-brand-500">
        <p class="text-xs font-bold uppercase text-brand-600">Panel de gestión</p>
        <p class="mt-1 font-bold">Indicador del piloto y ranking de agencias</p>
      </a>
    </section>
  `,
})
export class HomePage {
  private readonly repo = inject(QueueRepository);
  protected readonly todayRate = computed(() => calculateRespectRate(filterEventsOfToday(this.repo.events(), Date.now())));
  protected readonly steps = [
    { n: 1, title: 'Marca tu turno', text: 'Escaneas el QR en la entrada de la agencia y recibes un número visible. Nadie te quita tu lugar.' },
    { n: 2, title: 'Te atienden y sumas', text: 'Cuando la ventanilla llama tu número ganas 10 Puntos Justos; si cedes tu lugar a un adulto mayor o gestante, 20.' },
    { n: 3, title: 'Todos lo ven', text: 'La pantalla de la agencia muestra en vivo el % de respeto y el ranking de agencias. Respetar se contagia.' },
  ];
}

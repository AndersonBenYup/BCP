import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-main-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav class="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <a routerLink="/" class="mr-auto flex items-center gap-2 whitespace-nowrap font-extrabold tracking-tight text-brand-900">
          <span class="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm text-white">CJ</span>
          Cola Justa
        </a>
        <a routerLink="/agencia/olivos" routerLinkActive="bg-brand-50 text-brand-700"
           class="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cliente</a>
        <a routerLink="/pantalla/olivos" class="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Pantalla</a>
        <a routerLink="/panel" routerLinkActive="bg-brand-50 text-brand-700"
           class="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Panel</a>
      </nav>
    </header>
    <main class="mx-auto max-w-6xl px-4 py-6">
      <router-outlet />
    </main>
  `,
})
export class MainShell {}

import { Routes } from '@angular/router';
import { MainShell } from './layouts/main-shell';

export const routes: Routes = [
  {
    path: '',
    component: MainShell,
    children: [
      { path: '', loadComponent: () => import('./features/home/home-page').then((m) => m.HomePage) },
      { path: 'agencia/:stopId', loadComponent: () => import('./features/passenger/passenger-page').then((m) => m.PassengerPage) },
      { path: 'panel', loadComponent: () => import('./features/city-panel/city-panel-page').then((m) => m.CityPanelPage) },
    ],
  },
  // Pantalla de la agencia: a pantalla completa, sin barra de navegación.
  { path: 'pantalla/:stopId', loadComponent: () => import('./features/stop-screen/stop-screen-page').then((m) => m.StopScreenPage) },
  { path: '**', redirectTo: '' },
];

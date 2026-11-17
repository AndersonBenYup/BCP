import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Hash routing: la demo funciona en cualquier hosting estático sin reglas de reescritura.
    provideRouter(routes, withHashLocation(), withComponentInputBinding()),
  ],
};

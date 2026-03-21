import { Routes } from '@angular/router';

export const showcaseRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./showcase.component').then((m) => m.ShowcaseComponent),
  },
];

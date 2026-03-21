import { Routes } from '@angular/router';

export const updatesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./updates-list.component').then((m) => m.UpdatesListComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./update-detail.component').then((m) => m.UpdateDetailComponent),
  },
];

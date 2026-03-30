import { Routes } from '@angular/router';
import { canDeactivateAdmin } from './admin.component';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin.component').then((m) => m.AdminComponent),
    canDeactivate: [canDeactivateAdmin],
  },
];

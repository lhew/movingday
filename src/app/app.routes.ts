import { Routes } from '@angular/router';
import { adminGuard } from './shared/guards/admin.guard';

export const appRoutes: Routes = [
  {
    path: '',
    redirectTo: 'showcase',
    pathMatch: 'full',
  },
  {
    path: 'showcase',
    loadChildren: () =>
      import('./features/showcase/showcase.routes').then((m) => m.showcaseRoutes),
    title: 'Free Stuff — Moving Day',
  },
  {
    path: 'updates',
    loadChildren: () =>
      import('./features/updates/updates.routes').then((m) => m.updatesRoutes),
    title: 'What\'s Happening — Moving Day',
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.routes').then((m) => m.adminRoutes),
    canActivate: [adminGuard],
    title: 'Admin — Moving Day',
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
    title: 'Page Not Found',
  },
];

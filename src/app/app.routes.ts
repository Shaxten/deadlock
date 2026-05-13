import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then(m => m.Home)
  },
  {
    path: 'tierlist',
    loadComponent: () => import('./pages/tierlist/tierlist').then(m => m.Tierlist)
  },
  {
    path: '**',
    redirectTo: ''
  }
];

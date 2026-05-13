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
    path: 'hero/:id',
    loadComponent: () => import('./pages/hero-detail/hero-detail').then(m => m.HeroDetail)
  },
  {
    path: '**',
    redirectTo: ''
  }
];

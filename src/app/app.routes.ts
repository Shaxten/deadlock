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
    path: 'match/:id',
    loadComponent: () => import('./pages/match-detail/match-detail').then(m => m.MatchDetail)
  },
  {
    path: 'player',
    loadComponent: () => import('./pages/player/player').then(m => m.Player)
  },
  {
    path: 'player/:id',
    loadComponent: () => import('./pages/player/player').then(m => m.Player)
  },
  {
    path: 'guide',
    loadComponent: () => import('./pages/guide/guide').then(m => m.Guide)
  },
  {
    path: 'guide/structures',
    loadComponent: () => import('./pages/guide/structures/structures').then(m => m.Structures)
  },
  {
    path: '**',
    redirectTo: ''
  }
];

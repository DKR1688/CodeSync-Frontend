import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/home/home-page').then((module) => module.HomePageComponent),
        title: 'CodeSync | Home',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];

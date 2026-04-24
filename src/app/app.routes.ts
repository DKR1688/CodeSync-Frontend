import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/landing/landing-page').then((module) => module.LandingPageComponent),
        title: 'CodeSync | Collaborative Coding Platform',
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/login/login-page').then((module) => module.LoginPageComponent),
        title: 'CodeSync | Login',
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./pages/register/register-page').then((module) => module.RegisterPageComponent),
        title: 'CodeSync | Register',
      },
      {
        path: 'oauth/callback',
        loadComponent: () =>
          import('./pages/oauth-callback/oauth-callback-page').then(
            (module) => module.OauthCallbackPageComponent,
          ),
        title: 'CodeSync | Sign In',
      },
      {
        path: 'dashboard',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/dashboard/dashboard-page').then((module) => module.DashboardPageComponent),
        title: 'CodeSync | Dashboard',
      },
      {
        path: 'projects/:projectId',
        loadComponent: () =>
          import('./pages/workspace/workspace-page').then((module) => module.WorkspacePageComponent),
        title: 'CodeSync | Workspace',
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/admin/admin-page').then((module) => module.AdminPageComponent),
        title: 'CodeSync | Admin Console',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];

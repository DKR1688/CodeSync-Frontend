import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestGuard } from './core/guards/auth.guard';
import { LandingComponent } from './features/landing/landing.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { OAuthCallbackComponent } from './features/auth/oauth-callback/oauth-callback.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'explore', loadComponent: () => import('./features/projects/project-list/project-list.component').then(m => m.ProjectListComponent) },
  {
    path: 'auth', children: [
      { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
      { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
      { path: 'callback', component: OAuthCallbackComponent }
    ]
  },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  {
    path: 'projects', canActivate: [authGuard], children: [
      { path: '', loadComponent: () => import('./features/projects/project-list/project-list.component').then(m => m.ProjectListComponent) },
      { path: 'new', loadComponent: () => import('./features/projects/project-create/project-create.component').then(m => m.ProjectCreateComponent) },
      { path: ':id', loadComponent: () => import('./features/projects/project-detail/project-detail.component').then(m => m.ProjectDetailComponent) },
      { path: ':id/editor/:fileId', loadComponent: () => import('./features/editor/editor.component').then(m => m.EditorComponent) },
      { path: ':id/sessions/:fileId/:sessionId', loadComponent: () => import('./features/collaboration/collaboration.component').then(m => m.CollaborationComponent) },
      { path: ':id/history/:fileId', loadComponent: () => import('./features/version-history/version-history.component').then(m => m.VersionHistoryComponent) },
      { path: ':id/comments', loadComponent: () => import('./features/comments/comments.component').then(m => m.CommentsComponent) }
    ]
  },
  { path: 'notifications', loadComponent: () => import('./features/notifications/notifications.component').then(m => m.NotificationsComponent), canActivate: [authGuard] },
  { path: 'profile', loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent), canActivate: [authGuard] },
  { path: 'admin', loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [adminGuard] },
  { path: '**', redirectTo: '' }
];

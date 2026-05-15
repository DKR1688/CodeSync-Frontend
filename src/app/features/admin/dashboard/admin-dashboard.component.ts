import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ExecutionService } from '../../../core/services/execution.service';
import { NotificationService } from '../../../core/services/notification.service';
import { environment } from '../../../../environments/environment';
import { ExecutionJob, LanguagePayload, Project, SupportedLanguage, User } from '../../../core/models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  cdr = inject(ChangeDetectorRef);
  http = inject(HttpClient);
  auth = inject(AuthService);
  executionService = inject(ExecutionService);
  notifService = inject(NotificationService);

  activeTab: 'overview' | 'users' | 'projects' | 'executions' | 'languages' | 'notifications' = 'overview';

  users: User[] = [];
  projects: Project[] = [];
  executionStats: any = {};
  executions: ExecutionJob[] = [];
  languages: SupportedLanguage[] = [];
  loading: Record<string, boolean> = {};
  overviewWarnings: string[] = [];
  executionFilters = {
    status: '',
    language: ''
  };
  showLanguageModal = false;
  languageForm: LanguagePayload = {
    language: '',
    displayName: '',
    runtimeVersion: '',
    dockerImage: '',
    sourceFileName: '',
    runCommand: '',
    enabled: true,
    defaultTimeLimitSeconds: 10,
    defaultMemoryLimitMb: 256
  };
  languageError = '';
  savingLanguage = false;

  broadcastTitle = '';
  broadcastMessage = '';
  sendingBroadcast = false;
  broadcastSent = false;

  ngOnInit(): void {
    this.loadOverview();
  }

  loadOverview(): void {
    this.loading['overview'] = true;
    this.overviewWarnings = [];
    forkJoin({
      users: this.http.get<User[]>(`${environment.apiUrl}/auth/users`).pipe(
        catchError(() => {
          this.overviewWarnings.push('Unable to load user totals right now.');
          return of([] as User[]);
        })
      ),
      projects: this.http.get<Project[]>(`${environment.apiUrl}/api/v1/projects/admin/all`).pipe(
        catchError(() => {
          this.overviewWarnings.push('Unable to load project totals right now.');
          return of([] as Project[]);
        })
      ),
      executionStats: this.executionService.getStats().pipe(
        catchError(() => {
          this.overviewWarnings.push('Execution stats are temporarily unavailable.');
          return of({
            totalExecutions: 0,
            executionsByLanguage: {}
          });
        })
      ),
      activeSessions: this.http.get<any[]>(`${environment.apiUrl}/api/v1/sessions/active`).pipe(
        catchError(() => {
          this.overviewWarnings.push('Active collaboration sessions could not be loaded.');
          return of([] as any[]);
        })
      )
    }).subscribe({
      next: ({ users, projects, executionStats, activeSessions }) => {
        this.users = users;
        this.projects = projects;
        this.executionStats = {
          totalUsers: users.length,
          totalProjects: projects.length,
          totalExecutions: executionStats.totalExecutions ?? 0,
          activeSessions: activeSessions.length,
          byLanguage: executionStats.executionsByLanguage ?? {}
        };
        this.loading['overview'] = false;
        this.syncView();
      },
      error: () => {
        this.overviewWarnings = ['The overview could not be loaded completely.'];
        this.loading['overview'] = false;
        this.syncView();
      }
    });
  }

  loadUsers(): void {
    this.loading['users'] = true;
    this.http.get<User[]>(`${environment.apiUrl}/auth/users`).subscribe({
      next: (u) => {
        this.users = u;
        this.loading['users'] = false;
        this.syncView();
      },
      error: () => {
        this.loading['users'] = false;
        this.syncView();
      }
    });
  }

  loadLanguages(): void {
    this.executionService.getSupportedLanguages(true).subscribe(l => {
      this.languages = l;
      this.syncView();
    });
  }

  loadExecutions(): void {
    this.loading['executions'] = true;
    this.executionService.getAllJobs({
      status: this.executionFilters.status || undefined,
      language: this.executionFilters.language || undefined
    }).subscribe({
      next: jobs => {
        this.executions = jobs;
        this.loading['executions'] = false;
        this.syncView();
      },
      error: () => {
        this.loading['executions'] = false;
        this.syncView();
      }
    });
  }

  suspendUser(userId: string | number): void {
    if (!confirm('Suspend this user?')) return;
    this.http.put(`${environment.apiUrl}/auth/deactivate/${userId}`, {}).subscribe(() => {
      const u = this.users.find(x => String(x.userId) === String(userId));
      if (u) u.active = false;
      this.syncView();
    });
  }

  reactivateUser(userId: string | number): void {
    this.http.put(`${environment.apiUrl}/auth/reactivate/${userId}`, {}).subscribe(() => {
      const u = this.users.find(x => String(x.userId) === String(userId));
      if (u) u.active = true;
      this.syncView();
    });
  }

  deleteUser(userId: string | number): void {
    if (!confirm('Permanently delete this user?')) return;
    this.http.delete(`${environment.apiUrl}/auth/users/${userId}`).subscribe(() => {
      this.users = this.users.filter(u => String(u.userId) !== String(userId));
      this.syncView();
    });
  }

  sendBroadcast(): void {
    if (!this.broadcastTitle.trim() || !this.broadcastMessage.trim()) return;
    const actorId = this.auth.getCurrentUserId();
    const recipientIds = this.users.filter(user => user.active).map(user => Number(user.userId));
    if (actorId == null || recipientIds.length === 0) return;
    this.sendingBroadcast = true;
    this.notifService.sendBulk({
      recipientIds,
      actorId: Number(actorId),
      title: this.broadcastTitle,
      message: this.broadcastMessage,
      type: 'BROADCAST'
    }).subscribe({
      next: () => {
        this.sendingBroadcast = false;
        this.broadcastSent = true;
        this.broadcastTitle = '';
        this.broadcastMessage = '';
        this.syncView();
        setTimeout(() => {
          this.broadcastSent = false;
          this.syncView();
        }, 3000);
      },
      error: () => {
        this.sendingBroadcast = false;
        this.syncView();
      }
    });
  }

  setTab(tab: typeof this.activeTab): void {
    this.activeTab = tab;
    if (tab === 'users') this.loadUsers();
    if (tab === 'executions') this.loadExecutions();
    if (tab === 'languages') this.loadLanguages();
    if (tab === 'notifications') this.loadUsers();
  }

  toggleLanguage(language: SupportedLanguage): void {
    this.executionService.setLanguageEnabled(language.id, !language.enabled).subscribe(updated => {
      this.languages = this.languages.map(item => item.id === language.id ? {
        ...item,
        enabled: updated.enabled
      } : item);
      this.syncView();
    });
  }

  saveLanguage(): void {
    this.savingLanguage = true;
    this.languageError = '';
    this.executionService.createLanguage(this.languageForm).subscribe({
      next: language => {
        this.languages = [...this.languages, {
          id: language.language,
          name: language.displayName,
          version: language.runtimeVersion,
          dockerImage: language.dockerImage,
          extension: language.sourceFileName.includes('.') ? `.${language.sourceFileName.split('.').pop()}` : '',
          monacoLanguage: language.language,
          enabled: language.enabled
        }];
        this.languageForm = {
          language: '',
          displayName: '',
          runtimeVersion: '',
          dockerImage: '',
          sourceFileName: '',
          runCommand: '',
          enabled: true,
          defaultTimeLimitSeconds: 10,
          defaultMemoryLimitMb: 256
        };
        this.showLanguageModal = false;
        this.savingLanguage = false;
        this.syncView();
      },
      error: err => {
        this.languageError = err?.error?.message || 'Unable to save this language.';
        this.savingLanguage = false;
        this.syncView();
      }
    });
  }

  getTimeAgo(d: string): string {
    const diff = (Date.now() - new Date(d).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  getStatusTone(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'badge-success';
      case 'FAILED':
      case 'TIMED_OUT':
        return 'badge-danger';
      case 'RUNNING':
        return 'badge-warning';
      default:
        return 'badge-muted';
    }
  }

  private syncView(): void {
    this.cdr.detectChanges();
  }
}

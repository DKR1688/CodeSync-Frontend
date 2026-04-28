import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthStateService } from '../../core/services/auth-state.service';
import { CodesyncApiService } from '../../core/services/codesync-api.service';
import {
  CollabSession,
  ExecutionJob,
  ExecutionStats,
  LanguageRequest,
  NotificationItem,
  NotificationType,
  Project,
  SupportedLanguage,
  UserResponse,
} from '../../shared/models/codesync.models';

@Component({
  selector: 'app-admin-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.css',
})
export class AdminPageComponent {
  private readonly api = inject(CodesyncApiService);
  protected readonly auth = inject(AuthStateService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly status = signal<string | null>(null);
  protected readonly users = signal<UserResponse[]>([]);
  protected readonly projects = signal<Project[]>([]);
  protected readonly jobs = signal<ExecutionJob[]>([]);
  protected readonly sessions = signal<CollabSession[]>([]);
  protected readonly languages = signal<SupportedLanguage[]>([]);
  protected readonly stats = signal<ExecutionStats | null>(null);
  protected readonly notifications = signal<NotificationItem[]>([]);
  protected readonly editingLanguage = signal<string | null>(null);
  protected readonly sidebarCollapsed = signal(false);
  protected readonly profileOpen = signal(false);
  protected readonly userInitials = computed(() => {
    const source = this.auth.user()?.fullName || this.auth.user()?.username || 'Admin';
    return source
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  });
  protected readonly recentUsers = computed(() =>
    [...this.users()].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 5),
  );
  protected readonly activeSection = signal<
    'overview' | 'users' | 'projects' | 'sessions' | 'executions' | 'broadcast' | 'languages' | 'notifications'
  >('overview');
  protected readonly languageUsage = computed(() => {
    const stats = this.stats();
    const entries = Object.entries(stats?.executionsByLanguage || {}).sort((left, right) => right[1] - left[1]);
    const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1;
    return entries.map(([language, count]) => ({
      language,
      count,
      percentage: Math.round((count / total) * 100),
    }));
  });

  protected readonly notificationTypes: NotificationType[] = [
    'BROADCAST',
    'SESSION_INVITE',
    'PARTICIPANT_JOINED',
    'PARTICIPANT_LEFT',
    'COMMENT',
    'MENTION',
    'SNAPSHOT',
    'FORK',
  ];

  protected languageForm: LanguageRequest = this.emptyLanguageForm();
  protected bulkRecipientIds = '';
  protected bulkNotificationType: NotificationType = 'BROADCAST';
  protected bulkNotificationTitle = '';
  protected bulkNotificationMessage = '';
  protected bulkNotificationRelatedId = '';
  protected bulkNotificationRelatedType = '';
  protected bulkNotificationLink = '';
  protected notificationTypeFilter = 'ALL';
  protected notificationRelatedLookup = '';
  protected emailTo = '';
  protected emailSubject = '';
  protected emailBody = '';

  constructor() {
    this.loadAdmin();
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const message =
        typeof error.error === 'string'
          ? error.error
          : (error.error?.message as string | undefined) || error.message;
      if (message?.trim()) {
        return message;
      }
    }

    return fallback;
  }

  protected deactivateUser(userId: number): void {
    this.api.deactivateUser(userId).subscribe({
      next: () => {
        this.status.set(`User ${userId} deactivated.`);
        this.loadAdmin();
      },
      error: () => this.error.set('Deactivating the user failed.'),
    });
  }

  protected reactivateUser(userId: number): void {
    this.api.reactivateUser(userId).subscribe({
      next: () => {
        this.status.set(`User ${userId} reactivated.`);
        this.loadAdmin();
      },
      error: () => this.error.set('Reactivating the user failed.'),
    });
  }

  protected deleteUser(userId: number): void {
    this.api.deleteUser(userId).subscribe({
      next: () => {
        this.status.set(`User ${userId} deleted.`);
        this.loadAdmin();
      },
      error: (error) => this.error.set(this.extractErrorMessage(error, 'Deleting the user failed.')),
    });
  }

  protected toggleLanguage(language: SupportedLanguage): void {
    this.api.setLanguageEnabled(language.language, !language.enabled).subscribe({
      next: () => {
        this.status.set(`Language ${language.displayName} updated.`);
        this.loadAdmin();
      },
      error: () => this.error.set('Updating the language failed.'),
    });
  }

  protected editLanguage(language: SupportedLanguage): void {
    this.editingLanguage.set(language.language);
    this.languageForm = {
      language: language.language,
      displayName: language.displayName,
      runtimeVersion: language.runtimeVersion,
      dockerImage: language.dockerImage,
      sourceFileName: language.sourceFileName,
      runCommand: language.runCommand,
      enabled: language.enabled,
      defaultTimeLimitSeconds: language.defaultTimeLimitSeconds,
      defaultMemoryLimitMb: language.defaultMemoryLimitMb,
    };
  }

  protected resetLanguageForm(): void {
    this.editingLanguage.set(null);
    this.languageForm = this.emptyLanguageForm();
  }

  protected saveLanguage(): void {
    const request = { ...this.languageForm };
    const action = this.editingLanguage()
      ? this.api.updateLanguage(this.editingLanguage()!, request)
      : this.api.createLanguage(request);

    action.subscribe({
      next: (language) => {
        this.status.set(`Language ${language.displayName} saved.`);
        this.resetLanguageForm();
        this.loadAdmin();
      },
      error: () => {
        this.error.set('Saving the language failed.');
      },
    });
  }

  protected cancelExecution(jobId: string): void {
    this.api.cancelExecution(jobId).subscribe({
      next: () => {
        this.status.set(`Execution ${jobId} cancelled.`);
        this.loadAdmin();
      },
      error: () => this.error.set('Cancelling the execution failed.'),
    });
  }

  protected sendBulkNotification(): void {
    const actorId = this.auth.user()?.userId;
    const recipientIds = this.bulkRecipientIds
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (!actorId || !recipientIds.length || !this.bulkNotificationTitle.trim() || !this.bulkNotificationMessage.trim()) {
      this.error.set('Recipient ids, title, and message are required for bulk notifications.');
      return;
    }

    this.api
      .sendBulkNotifications({
        recipientIds,
        actorId,
        type: this.bulkNotificationType,
        title: this.bulkNotificationTitle.trim(),
        message: this.bulkNotificationMessage.trim(),
        relatedId: this.bulkNotificationRelatedId.trim() || null,
        relatedType: this.bulkNotificationRelatedType.trim() || null,
        deepLinkUrl: this.bulkNotificationLink.trim() || null,
      })
      .subscribe({
        next: (notifications) => {
          this.status.set(`${notifications.length} notifications sent.`);
          this.bulkRecipientIds = '';
          this.bulkNotificationTitle = '';
          this.bulkNotificationMessage = '';
          this.bulkNotificationRelatedId = '';
          this.bulkNotificationRelatedType = '';
          this.bulkNotificationLink = '';
          this.loadNotifications();
        },
        error: () => this.error.set('Sending bulk notifications failed.'),
      });
  }

  protected sendAdminEmail(): void {
    if (!this.emailTo.trim() || !this.emailSubject.trim() || !this.emailBody.trim()) {
      this.error.set('Email address, subject, and body are required.');
      return;
    }

    this.api
      .sendEmailNotification({
        to: this.emailTo.trim(),
        subject: this.emailSubject.trim(),
        body: this.emailBody.trim(),
      })
      .subscribe({
        next: () => {
          this.status.set('Email notification queued.');
          this.emailTo = '';
          this.emailSubject = '';
          this.emailBody = '';
        },
        error: () => this.error.set('Sending admin email failed.'),
      });
  }

  protected filterNotificationsByType(): void {
    if (this.notificationTypeFilter === 'ALL') {
      this.loadNotifications();
      return;
    }

    this.api.getNotificationsByType(this.notificationTypeFilter).subscribe({
      next: (notifications) => this.notifications.set(notifications),
      error: () => this.error.set('Filtering notifications by type failed.'),
    });
  }

  protected filterNotificationsByRelated(): void {
    if (!this.notificationRelatedLookup.trim()) {
      this.loadNotifications();
      return;
    }

    this.api.getNotificationsByRelatedId(this.notificationRelatedLookup.trim()).subscribe({
      next: (notifications) => this.notifications.set(notifications),
      error: () => this.error.set('Filtering notifications by related id failed.'),
    });
  }

  protected deleteNotification(notificationId: number): void {
    this.api.deleteNotification(notificationId).subscribe({
      next: () => {
        this.notifications.update((items) =>
          items.filter((notification) => notification.notificationId !== notificationId),
        );
        this.status.set(`Notification ${notificationId} deleted.`);
      },
      error: () => this.error.set('Deleting the notification failed.'),
    });
  }

  protected loadAdmin(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      users: this.api.getAllUsers().pipe(catchError(() => of([]))),
      projects: this.api.getAllProjectsAdmin().pipe(catchError(() => of([]))),
      jobs: this.api.getAdminJobs().pipe(catchError(() => of([]))),
      sessions: this.api.getActiveSessionsAdmin().pipe(catchError(() => of([]))),
      languages: this.api.getSupportedLanguages(true).pipe(catchError(() => of([]))),
      stats: this.api.getExecutionStats().pipe(catchError(() => of(null))),
      notifications: this.api.getAllNotificationsAdmin().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ users, projects, jobs, sessions, languages, stats, notifications }) => {
        this.users.set(users);
        this.projects.set(projects);
        this.jobs.set(jobs);
        this.sessions.set(sessions);
        this.languages.set(languages);
        this.stats.set(stats);
        this.notifications.set(notifications);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('The admin console could not load its backend data.');
        this.loading.set(false);
      },
    });
  }

  private loadNotifications(): void {
    this.api.getAllNotificationsAdmin().subscribe({
      next: (notifications) => this.notifications.set(notifications),
      error: () => this.error.set('Loading notifications failed.'),
    });
  }

  private emptyLanguageForm(): LanguageRequest {
    return {
      language: '',
      displayName: '',
      runtimeVersion: '',
      dockerImage: '',
      sourceFileName: '',
      runCommand: '',
      enabled: true,
      defaultTimeLimitSeconds: 20,
      defaultMemoryLimitMb: 256,
    };
  }
}

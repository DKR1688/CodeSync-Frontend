import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { ExecutionService } from '../../core/services/execution.service';
import { NotificationService } from '../../core/services/notification.service';
import { Project, Notification, User } from '../../core/models';
import { catchError, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  cdr = inject(ChangeDetectorRef);
  auth = inject(AuthService);
  projectService = inject(ProjectService);
  executionService = inject(ExecutionService);
  notifService = inject(NotificationService);

  user: User | null = null;
  myProjects: Project[] = [];
  memberProjects: Project[] = [];
  recentNotifications: Notification[] = [];
  loading = true;
  stats = { projects: 0, executions: 0, unread: 0 };
  collaboratorCount = 0;

  LANGS: Record<string, string> = {
    python: '#3572a5', javascript: '#f1e05a', typescript: '#3178c6',
    java: '#b07219', go: '#00add8', rust: '#dea584', cpp: '#f34b7d',
    kotlin: '#a97bff', swift: '#f05138', ruby: '#701516', php: '#4f5d95', r: '#198ce7'
  };

  ngOnInit(): void {
    this.user = this.auth.currentUser$.value;
    this.auth.currentUser$.subscribe(u => {
      this.user = u;
      this.syncView();
    });
    this.auth.ensureProfileLoaded().subscribe(() => this.loadDashboard());
  }

  loadDashboard(): void {
    this.loading = true;
    forkJoin({
      myProjects: this.projectService.getMyProjects().pipe(catchError(() => of([]))),
      notifications: this.notifService.getNotifications().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ myProjects, notifications }) => {
        this.myProjects = myProjects.slice(0, 6);
        this.recentNotifications = notifications.slice(0, 5);
        this.stats.projects = myProjects.length;
        this.stats.unread = notifications.filter(n => !n.isRead).length;
        this.collaboratorCount = this.myProjects.reduce((total, project) => total + project.memberUserIds.length, 0);
        this.loading = false;
        this.syncView();
      },
      error: () => {
        this.loading = false;
        this.syncView();
      }
    });

    this.executionService.getHistory().pipe(
      catchError(() => of([]))
    ).subscribe(executions => {
      this.stats.executions = executions.length;
      this.syncView();
    });
  }

  getLangColor(lang?: string): string {
    return this.LANGS[lang?.toLowerCase() || ''] || '#9b9590';
  }

  getInitials(user: User): string {
    if (user.fullName) return user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return user.username[0].toUpperCase();
  }

  getTimeAgo(dateStr: string): string {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
  }

  getNotifIcon(type: string): string {
    const icons: Record<string, string> = {
      SESSION_INVITE: '🎯', COMMENT: '💬', MENTION: '@', SNAPSHOT: '📸', FORK: '🔀'
    };
    return icons[type] || '🔔';
  }
  private syncView(): void {
    this.cdr.detectChanges();
  }
}

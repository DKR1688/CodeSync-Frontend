import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthStateService } from '../../core/services/auth-state.service';
import { CodesyncApiService } from '../../core/services/codesync-api.service';
import { Project, SupportedLanguage } from '../../shared/models/codesync.models';

type PlatformService = {
  title: string;
  label: string;
  description: string;
  detail: string;
};

type WorkflowStep = {
  step: string;
  title: string;
  description: string;
};

@Component({
  selector: 'app-landing-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css',
})
export class LandingPageComponent {
  private readonly api = inject(CodesyncApiService);

  protected readonly auth = inject(AuthStateService);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly projects = signal<Project[]>([]);
  protected readonly languages = signal<SupportedLanguage[]>([]);
  protected readonly platformServices: PlatformService[] = [
    {
      title: 'Identity & access',
      label: 'Auth service',
      description: 'Local auth, OAuth, roles, profile management, and secure session-aware access.',
      detail: 'Signup, login, providers, password flows',
    },
    {
      title: 'Projects & membership',
      label: 'Project service',
      description: 'Create, fork, archive, and organize workspaces with clear ownership and member access.',
      detail: 'Ownership, visibility, membership, discovery',
    },
    {
      title: 'Files & workspace state',
      label: 'File service',
      description: 'Structured file trees, content updates, folder management, and recovery-friendly operations.',
      detail: 'Files, folders, restore, search',
    },
    {
      title: 'Code review context',
      label: 'Comment service',
      description: 'Threaded feedback tied to files and lines so reviews stay focused and traceable.',
      detail: 'Line comments, replies, resolution states',
    },
    {
      title: 'Execution & runtimes',
      label: 'Execution service',
      description: 'Run supported languages in sandboxed environments with job history and runtime controls.',
      detail: 'Queued runs, results, language registry',
    },
    {
      title: 'Live collaboration',
      label: 'Collab service',
      description: 'Sessions, participant presence, cursor updates, and synchronized workspace changes.',
      detail: 'Sessions, participants, shared edits',
    },
    {
      title: 'History & recovery',
      label: 'Version service',
      description: 'Snapshots, branches, tags, diffs, and recovery points for safer iteration.',
      detail: 'Snapshots, branching, diff, restore',
    },
    {
      title: 'Alerts & operations',
      label: 'Notification + admin',
      description: 'Unread activity, broadcasts, moderation, and platform-level controls for admins.',
      detail: 'Notifications, broadcasts, operational views',
    },
  ];
  protected readonly workflowSteps: WorkflowStep[] = [
    {
      step: '01',
      title: 'Discover or create',
      description: 'Start from a public project, fork into your account, or create a new workspace with the right language and visibility.',
    },
    {
      step: '02',
      title: 'Collaborate in context',
      description: 'Edit files, leave line-specific comments, manage members, and keep discussion attached to the code itself.',
    },
    {
      step: '03',
      title: 'Run, review, and recover',
      description: 'Execute code, inspect history, compare snapshots, and restore changes without losing flow.',
    },
  ];
  protected readonly featuredProjects = computed(() =>
    [...this.projects()]
      .sort((left, right) => right.starCount - left.starCount || right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 3),
  );
  protected readonly topLanguages = computed(() => this.languages().slice(0, 5));

  constructor() {
    this.loadLandingData();
  }

  private loadLandingData(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      projects: this.api.getPublicProjects().pipe(catchError(() => of([]))),
      languages: this.api.getSupportedLanguages().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ projects, languages }) => {
        this.projects.set(projects);
        this.languages.set(languages);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('The landing page could not reach the API gateway.');
        this.loading.set(false);
      },
    });
  }
}

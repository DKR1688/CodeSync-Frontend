import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthStateService } from '../../core/services/auth-state.service';
import { CodesyncApiService } from '../../core/services/codesync-api.service';
import {
  ExecutionJob,
  NotificationItem,
  Project,
  SupportedLanguage,
} from '../../shared/models/codesync.models';

const createFallbackLanguage = (
  language: string,
  displayName: string,
  sourceFileName: string,
  runCommand: string,
): SupportedLanguage => ({
  language,
  displayName,
  runtimeVersion: 'builtin',
  dockerImage: 'pending-backend-runtime',
  sourceFileName,
  runCommand,
  enabled: true,
  defaultTimeLimitSeconds: 10,
  defaultMemoryLimitMb: 256,
  createdAt: '',
  updatedAt: '',
});

const FALLBACK_SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  createFallbackLanguage('java', 'Java', 'Main.java', 'javac Main.java && java Main'),
  createFallbackLanguage('python', 'Python', 'main.py', 'python main.py'),
  createFallbackLanguage('javascript', 'JavaScript', 'index.js', 'node index.js'),
  createFallbackLanguage('typescript', 'TypeScript', 'main.ts', 'ts-node main.ts'),
  createFallbackLanguage('go', 'Go', 'main.go', 'go run main.go'),
  createFallbackLanguage('cpp', 'C++', 'main.cpp', 'g++ main.cpp -o main && ./main'),
  createFallbackLanguage('rust', 'Rust', 'main.rs', 'rustc main.rs && ./main'),
];

@Component({
  selector: 'app-dashboard-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css',
})
export class DashboardPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly api = inject(CodesyncApiService);
  private readonly router = inject(Router);

  protected readonly auth = inject(AuthStateService);
  protected readonly loading = signal(true);
  protected readonly status = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly ownerProjects = signal<Project[]>([]);
  protected readonly memberProjects = signal<Project[]>([]);
  protected readonly backendLanguages = signal<SupportedLanguage[]>([]);
  protected readonly notifications = signal<NotificationItem[]>([]);
  protected readonly myExecutions = signal<ExecutionJob[]>([]);
  protected readonly selectedOwnedProjectId = signal<number | null>(null);
  protected readonly availableLanguages = computed(() =>
    this.backendLanguages().length ? this.backendLanguages() : FALLBACK_SUPPORTED_LANGUAGES,
  );
  protected readonly languageNotice = computed(() =>
    !this.loading() && !this.backendLanguages().length
      ? 'Execution languages are not loading from the backend right now, so this form is using a built-in language list.'
      : null,
  );
  protected readonly selectedOwnedProject = computed(() =>
    this.ownerProjects().find((project) => project.projectId === this.selectedOwnedProjectId()) || null,
  );
  protected readonly recentProjects = computed(() =>
    [...this.ownerProjects(), ...this.memberProjects()]
      .filter(
        (project, index, projects) =>
          projects.findIndex((candidate) => candidate.projectId === project.projectId) === index,
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 4),
  );
  protected readonly codeRunsToday = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.myExecutions().filter((job) => job.createdAt.startsWith(today)).length;
  });
  protected readonly unreadNotifications = computed(() =>
    this.notifications().filter((notification) => !notification.read).length,
  );
  protected readonly displayName = computed(() => this.auth.user()?.fullName?.split(' ')[0] || 'Developer');
  protected readonly activeSection = signal<'overview' | 'projects' | 'profile' | 'create' | 'security'>(
    'overview',
  );

  protected readonly createProjectForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required]],
    description: [''],
    language: [FALLBACK_SUPPORTED_LANGUAGES[0].language, [Validators.required]],
    visibility: ['PRIVATE' as 'PUBLIC' | 'PRIVATE', [Validators.required]],
  });

  protected readonly profileForm = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    fullName: ['', [Validators.required]],
    avatarUrl: [''],
    bio: [''],
  });

  protected readonly passwordForm = this.formBuilder.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected readonly projectDetailsForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required]],
    description: [''],
    language: [FALLBACK_SUPPORTED_LANGUAGES[0].language, [Validators.required]],
    visibility: ['PRIVATE' as 'PUBLIC' | 'PRIVATE', [Validators.required]],
  });

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (!user) {
        return;
      }

      this.profileForm.patchValue({
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl || '',
        bio: user.bio || '',
      });

      this.loadDashboard(user.userId);
    });
  }

  protected createProject(): void {
    if (this.createProjectForm.invalid) {
      this.createProjectForm.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.status.set(null);
    this.api.createProject(this.createProjectForm.getRawValue()).subscribe({
      next: (project) => {
        this.status.set(`Project "${project.name}" was created successfully.`);
        this.ownerProjects.update((projects) => [project, ...projects]);
        this.createProjectForm.patchValue({
          name: '',
          description: '',
          language: this.availableLanguages()[0]?.language ?? FALLBACK_SUPPORTED_LANGUAGES[0].language,
          visibility: 'PRIVATE',
        });
        this.router.navigate(['/projects', project.projectId]);
      },
      error: () => {
        this.error.set('Project creation failed. Please check backend authentication and try again.');
      },
    });
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.status.set(null);
    this.auth.updateProfile(this.profileForm.getRawValue()).subscribe({
      next: () => {
        this.status.set('Profile updated successfully.');
      },
      error: () => {
        this.error.set(this.auth.error() || 'Profile update failed.');
      },
    });
  }

  protected changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.status.set(null);
    this.auth.changePassword(this.passwordForm.getRawValue()).subscribe({
      next: () => {
        this.status.set('Password changed successfully.');
        this.passwordForm.reset();
      },
      error: () => {
        this.error.set(this.auth.error() || 'Password change failed.');
      },
    });
  }

  protected selectOwnedProject(project: Project): void {
    this.selectedOwnedProjectId.set(project.projectId);
    this.projectDetailsForm.patchValue({
      name: project.name,
      description: project.description || '',
      language: project.language,
      visibility: project.visibility,
    });
  }

  protected saveProjectDetails(): void {
    const project = this.selectedOwnedProject();
    if (!project || this.projectDetailsForm.invalid) {
      this.projectDetailsForm.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.status.set(null);
    this.api.updateProject(project.projectId, this.projectDetailsForm.getRawValue()).subscribe({
      next: (updated) => {
        this.ownerProjects.update((projects) =>
          projects.map((item) => (item.projectId === updated.projectId ? updated : item)),
        );
        this.selectOwnedProject(updated);
        this.status.set(`Project "${updated.name}" updated successfully.`);
      },
      error: () => {
        this.error.set('Project update failed.');
      },
    });
  }

  protected archiveSelectedProject(): void {
    const project = this.selectedOwnedProject();
    if (!project) {
      return;
    }

    this.api.archiveProject(project.projectId).subscribe({
      next: () => {
        this.status.set(`Project "${project.name}" archived.`);
        this.loadDashboard(this.auth.user()!.userId);
      },
      error: () => {
        this.error.set('Archiving the project failed.');
      },
    });
  }

  protected deleteSelectedProject(): void {
    const project = this.selectedOwnedProject();
    if (!project) {
      return;
    }

    this.api.deleteProject(project.projectId).subscribe({
      next: () => {
        this.status.set(`Project "${project.name}" deleted.`);
        this.ownerProjects.update((projects) =>
          projects.filter((item) => item.projectId !== project.projectId),
        );
        this.selectedOwnedProjectId.set(null);
      },
      error: () => {
        this.error.set('Deleting the project failed.');
      },
    });
  }

  protected deactivateCurrentAccount(): void {
    this.error.set(null);
    this.status.set(null);
    this.api.deactivateCurrentAccount().subscribe({
      next: () => {
        this.auth.clearSession();
        this.router.navigate(['/']);
      },
      error: () => {
        this.error.set('Account deactivation failed.');
      },
    });
  }

  protected forkProject(projectId: number): void {
    const user = this.auth.user();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.api.forkProject(projectId, user.userId).subscribe({
      next: (project) => {
        this.status.set(`Project "${project.name}" forked into your account.`);
        this.ownerProjects.update((projects) => [project, ...projects]);
        this.selectOwnedProject(project);
      },
      error: () => {
        this.error.set('Forking the project failed.');
      },
    });
  }

  private loadDashboard(userId: number): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      ownerProjects: this.api.getProjectsByOwner(userId).pipe(catchError(() => of([]))),
      memberProjects: this.api.getProjectsByMember(userId).pipe(catchError(() => of([]))),
      languages: this.api.getSupportedLanguages().pipe(catchError(() => of([]))),
      notifications: this.api.getNotificationsByRecipient(userId).pipe(catchError(() => of([]))),
      myExecutions: this.api.getMyExecutions().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ ownerProjects, memberProjects, languages, notifications, myExecutions }) => {
        this.ownerProjects.set(ownerProjects);
        this.memberProjects.set(
          memberProjects.filter(
            (project) => !ownerProjects.some((owned) => owned.projectId === project.projectId),
          ),
        );
        this.backendLanguages.set(languages);
        this.notifications.set(
          [...notifications].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
        );
        this.myExecutions.set(
          [...myExecutions].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
        );

        const selectedId = this.selectedOwnedProjectId();
        const selectedProject =
          ownerProjects.find((project) => project.projectId === selectedId) || ownerProjects[0] || null;
        if (selectedProject) {
          this.selectOwnedProject(selectedProject);
        } else {
          this.selectedOwnedProjectId.set(null);
        }

        this.ensureLanguageSelection();

        this.loading.set(false);
      },
      error: () => {
        this.error.set('The dashboard could not load your data from the backend.');
        this.loading.set(false);
      },
    });
  }

  private ensureLanguageSelection(): void {
    const languages = this.availableLanguages();
    if (!languages.length) {
      return;
    }

    const available = new Set(languages.map((language) => language.language));
    const defaultLanguage = languages[0].language;

    if (!available.has(this.createProjectForm.controls.language.value)) {
      this.createProjectForm.controls.language.setValue(defaultLanguage);
    }

    if (!available.has(this.projectDetailsForm.controls.language.value)) {
      this.projectDetailsForm.controls.language.setValue(defaultLanguage);
    }
  }
}

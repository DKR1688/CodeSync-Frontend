import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthStateService } from '../../core/services/auth-state.service';
import { CodesyncApiService } from '../../core/services/codesync-api.service';
import { Project, SupportedLanguage } from '../../shared/models/codesync.models';

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
  protected readonly languages = signal<SupportedLanguage[]>([]);
  protected readonly selectedOwnedProjectId = signal<number | null>(null);
  protected readonly selectedOwnedProject = computed(() =>
    this.ownerProjects().find((project) => project.projectId === this.selectedOwnedProjectId()) || null,
  );

  protected readonly createProjectForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required]],
    description: [''],
    language: ['java', [Validators.required]],
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
    language: ['java', [Validators.required]],
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
    }).subscribe({
      next: ({ ownerProjects, memberProjects, languages }) => {
        this.ownerProjects.set(ownerProjects);
        this.memberProjects.set(
          memberProjects.filter(
            (project) => !ownerProjects.some((owned) => owned.projectId === project.projectId),
          ),
        );
        this.languages.set(languages);
        const selectedId = this.selectedOwnedProjectId();
        const selectedProject =
          ownerProjects.find((project) => project.projectId === selectedId) || ownerProjects[0] || null;
        if (selectedProject) {
          this.selectOwnedProject(selectedProject);
        } else {
          this.selectedOwnedProjectId.set(null);
        }
        if (!this.createProjectForm.controls.language.value && languages.length) {
          this.createProjectForm.controls.language.setValue(languages[0].language);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('The dashboard could not load your data from the backend.');
        this.loading.set(false);
      },
    });
  }
}

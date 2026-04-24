import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthStateService } from '../../core/services/auth-state.service';
import { CodesyncApiService } from '../../core/services/codesync-api.service';
import { Project, SupportedLanguage } from '../../shared/models/codesync.models';

@Component({
  selector: 'app-landing-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css',
})
export class LandingPageComponent {
  private readonly api = inject(CodesyncApiService);
  private readonly router = inject(Router);

  protected readonly auth = inject(AuthStateService);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly projects = signal<Project[]>([]);
  protected readonly languages = signal<SupportedLanguage[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly selectedLanguage = signal('ALL');

  protected readonly filteredProjects = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const language = this.selectedLanguage();

    return this.projects().filter((project) => {
      const matchesTerm =
        !term ||
        project.name.toLowerCase().includes(term) ||
        project.description?.toLowerCase().includes(term) ||
        project.language?.toLowerCase().includes(term);

      const matchesLanguage = language === 'ALL' || project.language === language;
      return matchesTerm && matchesLanguage;
    });
  });

  constructor() {
    this.loadLandingData();
  }

  protected refreshSearch(): void {
    const term = this.searchTerm().trim();
    this.loading.set(true);
    this.error.set(null);

    const projectSource = term ? this.api.searchProjects(term) : this.api.getPublicProjects();
    projectSource.pipe(catchError(() => of([]))).subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('The project catalogue could not be loaded from the backend right now.');
        this.loading.set(false);
      },
    });
  }

  protected clearFilters(): void {
    this.searchTerm.set('');
    this.selectedLanguage.set('ALL');
    this.loadLandingData();
  }

  protected starProject(projectId: number): void {
    this.api.starProject(projectId).subscribe({
      next: () => {
        this.projects.update((projects) =>
          projects.map((project) =>
            project.projectId === projectId
              ? { ...project, starCount: project.starCount + 1 }
              : project,
          ),
        );
      },
      error: () => {
        this.error.set('Starring the project failed.');
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
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.error.set('Forking the project failed.');
      },
    });
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

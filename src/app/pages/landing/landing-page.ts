import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthStateService } from '../../core/services/auth-state.service';
import { CodesyncApiService } from '../../core/services/codesync-api.service';
import { Project, SupportedLanguage } from '../../shared/models/codesync.models';

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

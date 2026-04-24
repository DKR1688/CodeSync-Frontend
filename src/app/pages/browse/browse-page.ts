import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthStateService } from '../../core/services/auth-state.service';
import { CodesyncApiService } from '../../core/services/codesync-api.service';
import { Project, SupportedLanguage, UserResponse } from '../../shared/models/codesync.models';

type BrowseSort = 'STARRED' | 'LATEST' | 'FORKED';

@Component({
  selector: 'app-browse-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './browse-page.html',
  styleUrl: './browse-page.css',
})
export class BrowsePageComponent {
  private readonly api = inject(CodesyncApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly auth = inject(AuthStateService);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly projects = signal<Project[]>([]);
  protected readonly languages = signal<SupportedLanguage[]>([]);
  protected readonly owners = signal<Record<number, UserResponse>>({});
  protected readonly searchTerm = signal('');
  protected readonly selectedLanguage = signal('ALL');
  protected readonly sortMode = signal<BrowseSort>('STARRED');

  protected readonly filteredProjects = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const language = this.selectedLanguage();
    const sorted = [...this.projects()].filter((project) => {
      const matchesTerm =
        !term ||
        project.name.toLowerCase().includes(term) ||
        (project.description || '').toLowerCase().includes(term) ||
        this.ownerLabel(project.ownerId).toLowerCase().includes(term);
      const matchesLanguage = language === 'ALL' || project.language.toLowerCase() === language.toLowerCase();
      return matchesTerm && matchesLanguage;
    });

    if (this.sortMode() === 'LATEST') {
      return sorted.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    }

    if (this.sortMode() === 'FORKED') {
      return sorted.sort((left, right) => right.forkCount - left.forkCount);
    }

    return sorted.sort((left, right) => right.starCount - left.starCount);
  });

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const language = params.get('language');
      if (language) {
        this.selectedLanguage.set(language);
      }
      this.loadBrowseData();
    });
  }

  protected applyFilters(): void {
    const keyword = this.searchTerm().trim();
    const selectedLanguage = this.selectedLanguage();
    this.loading.set(true);
    this.error.set(null);

    const request =
      keyword || selectedLanguage !== 'ALL'
        ? this.api.searchProjects({
            keyword: keyword || null,
          })
        : this.api.getPublicProjects();

    request.pipe(catchError(() => of([]))).subscribe({
      next: (projects) => {
        const languageFiltered =
          selectedLanguage === 'ALL'
            ? projects
            : projects.filter(
                (project) => project.language.toLowerCase() === selectedLanguage.toLowerCase(),
              );
        this.projects.set(languageFiltered);
        this.loadOwnerProfiles(languageFiltered);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Public projects could not be loaded right now.');
        this.loading.set(false);
      },
    });
  }

  protected resetFilters(): void {
    this.searchTerm.set('');
    this.selectedLanguage.set('ALL');
    this.sortMode.set('STARRED');
    this.router.navigate(['/browse']);
    this.loadBrowseData();
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
      error: () => this.error.set('Starring this project failed.'),
    });
  }

  protected forkProject(projectId: number): void {
    const user = this.auth.user();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.api.forkProject(projectId, user.userId).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => this.error.set('Forking this project failed.'),
    });
  }

  protected ownerLabel(ownerId: number): string {
    const owner = this.owners()[ownerId];
    if (!owner) {
      return `user-${ownerId}`;
    }
    return owner.username;
  }

  private loadBrowseData(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      projects: this.api.getPublicProjects().pipe(catchError(() => of([]))),
      languages: this.api.getSupportedLanguages().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ projects, languages }) => {
        const selectedLanguage = this.selectedLanguage();
        const languageFiltered =
          selectedLanguage === 'ALL'
            ? projects
            : projects.filter(
                (project) => project.language.toLowerCase() === selectedLanguage.toLowerCase(),
              );
        this.projects.set(languageFiltered);
        this.languages.set(languages);
        this.loadOwnerProfiles(languageFiltered);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('The browse page could not reach the backend.');
        this.loading.set(false);
      },
    });
  }

  private loadOwnerProfiles(projects: Project[]): void {
    const ownerIds = [...new Set(projects.map((project) => project.ownerId))].filter(
      (ownerId) => !this.owners()[ownerId],
    );

    if (!ownerIds.length) {
      return;
    }

    forkJoin(ownerIds.map((ownerId) => this.api.getUserProfile(ownerId).pipe(catchError(() => of(null))))).subscribe(
      (results) => {
        const nextOwners = { ...this.owners() };
        for (const owner of results) {
          if (owner) {
            nextOwners[owner.userId] = owner;
          }
        }
        this.owners.set(nextOwners);
      },
    );
  }
}

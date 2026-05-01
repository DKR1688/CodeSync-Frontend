import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/services/auth.service';
import { Project } from '../../../core/models';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.scss'
})
export class ProjectListComponent implements OnInit {
  cdr = inject(ChangeDetectorRef);
  projectService = inject(ProjectService);
  auth = inject(AuthService);

  projects: Project[] = [];
  filtered: Project[] = [];
  loading = true;
  search = '';
  selectedLang = '';
  activeTab: 'my' | 'member' | 'public' = 'my';

  LANGS: Record<string, string> = {
    python: '#3572a5', javascript: '#f1e05a', typescript: '#3178c6',
    java: '#b07219', go: '#00add8', rust: '#dea584', cpp: '#f34b7d',
    kotlin: '#a97bff', swift: '#f05138', ruby: '#701516', php: '#4f5d95', r: '#198ce7'
  };

  languages: string[] = [];

  ngOnInit(): void {
    const isAuth = this.auth.isAuthenticated();
    this.activeTab = isAuth ? 'my' : 'public';
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading = true;
    const obs = this.activeTab === 'my'
      ? this.projectService.getMyProjects()
      : this.activeTab === 'member'
        ? this.projectService.getMemberProjects()
        : this.projectService.getPublicProjects();

    obs.subscribe({
      next: (p) => {
        this.projects = p;
        this.languages = [...new Set(p.map(x => x.language).filter(Boolean))];
        this.applyFilter();
        this.loading = false;
        this.syncView();
      },
      error: () => {
        this.loading = false;
        this.syncView();
      }
    });
  }

  setTab(tab: 'my' | 'member' | 'public'): void {
    this.activeTab = tab;
    this.selectedLang = '';
    this.search = '';
    this.loadProjects();
  }

  applyFilter(): void {
    this.filtered = this.projects.filter(p => {
      const matchSearch = !this.search || p.name.toLowerCase().includes(this.search.toLowerCase()) || p.description?.toLowerCase().includes(this.search.toLowerCase());
      const matchLang = !this.selectedLang || p.language?.toLowerCase() === this.selectedLang.toLowerCase();
      return matchSearch && matchLang;
    });
  }

  getLangColor(lang?: string): string {
    return this.LANGS[lang?.toLowerCase() || ''] || '#9b9590';
  }

  getTimeAgo(d: string): string {
    const diff = (Date.now() - new Date(d).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  starProject(e: Event, p: Project): void {
    e.preventDefault();
    this.projectService.starProject(p.projectId).subscribe(updated => {
      const idx = this.projects.findIndex(x => x.projectId === p.projectId);
      if (idx > -1) this.projects[idx] = updated;
      this.applyFilter();
      this.syncView();
    });
  }

  private syncView(): void {
    this.cdr.detectChanges();
  }
}

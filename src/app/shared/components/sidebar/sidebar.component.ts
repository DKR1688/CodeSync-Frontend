import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

export interface SidebarItem {
  label: string;
  route: string;
  icon: string;
  badge?: number;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <div class="sidebar-header" *ngIf="title">
        <h4 class="sidebar-title">{{ title }}</h4>
      </div>
      <nav class="sidebar-nav">
        <a *ngFor="let item of items"
           [routerLink]="item.route"
           routerLinkActive="active"
           class="sidebar-link">
          <span [innerHTML]="item.icon" class="sidebar-icon"></span>
          <span>{{ item.label }}</span>
          <span class="badge badge-accent" *ngIf="item.badge" style="margin-left:auto">{{ item.badge }}</span>
        </a>
      </nav>
    </aside>
  `,
  styles: [`
    .sidebar {
      position: fixed;
      top: var(--navbar-h);
      left: 0;
      bottom: 0;
      width: var(--sidebar-w);
      background: var(--bg-card);
      border-right: 1px solid var(--border);
      overflow-y: auto;
      z-index: 200;
      padding: 1.25rem 0.75rem;
    }
    .sidebar-header { padding: 0 0.75rem 1rem; }
    .sidebar-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
    .sidebar-nav { display: flex; flex-direction: column; gap: 0.25rem; }
    .sidebar-link {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.625rem 0.875rem; border-radius: var(--radius-md);
      font-size: 0.9rem; font-weight: 500; color: var(--text-secondary);
      text-decoration: none; transition: var(--transition);
      &:hover { background: var(--bg-tertiary); color: var(--text-primary); }
      &.active { background: var(--accent-subtle); color: var(--accent); font-weight: 600; }
    }
    .sidebar-icon { display: flex; align-items: center; flex-shrink: 0; }
    @media (max-width: 768px) { .sidebar { display: none; } }
  `]
})
export class SidebarComponent {
  @Input() title?: string;
  @Input() items: SidebarItem[] = [];
}

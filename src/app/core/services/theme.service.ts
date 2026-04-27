import { Injectable, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'codesync-theme';
  readonly theme = signal<AppTheme>('light');

  initialize(): void {
    const storedTheme = this.readStoredTheme();
    const preferredTheme =
      storedTheme ||
      (typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light');

    this.applyTheme(preferredTheme);
  }

  toggleTheme(): void {
    this.applyTheme(this.theme() === 'light' ? 'dark' : 'light');
  }

  private applyTheme(theme: AppTheme): void {
    this.theme.set(theme);

    if (typeof document !== 'undefined') {
      document.documentElement.dataset['theme'] = theme;
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, theme);
    }
  }

  private readStoredTheme(): AppTheme | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const value = localStorage.getItem(this.storageKey);
    return value === 'light' || value === 'dark' ? value : null;
  }
}

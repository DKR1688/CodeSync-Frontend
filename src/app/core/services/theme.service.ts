import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly THEME_KEY = 'codesync_theme';
  isDark = signal<boolean>(this.getInitialTheme());

  constructor() {
    this.applyTheme(this.isDark());
  }

  toggle(): void {
    const newVal = !this.isDark();
    this.isDark.set(newVal);
    localStorage.setItem(this.THEME_KEY, newVal ? 'dark' : 'light');
    this.applyTheme(newVal);
  }

  private applyTheme(dark: boolean): void {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  private getInitialTheme(): boolean {
    const stored = localStorage.getItem(this.THEME_KEY);
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
  });

  it('initializes from the stored dark mode preference', () => {
    localStorage.setItem('codesync_theme', 'dark');

    const service = new ThemeService();

    expect(service.isDark()).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggles theme state and persists it', () => {
    const service = new ThemeService();

    service.toggle();

    expect(service.isDark()).toBe(true);
    expect(localStorage.getItem('codesync_theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    service.toggle();

    expect(service.isDark()).toBe(false);
    expect(localStorage.getItem('codesync_theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});

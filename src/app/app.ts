import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthStateService } from './core/services/auth-state.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor(
    private readonly authState: AuthStateService,
    private readonly themeService: ThemeService,
  ) {
    this.themeService.initialize();
    this.authState.restoreSession().subscribe();
  }
}

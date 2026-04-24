import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthStateService } from './core/services/auth-state.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor(private readonly authState: AuthStateService) {
    this.authState.restoreSession().subscribe();
  }
}

import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthStateService } from '../../core/services/auth-state.service';

@Component({
  selector: 'app-oauth-callback-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './oauth-callback-page.html',
  styleUrl: './oauth-callback-page.css',
})
export class OauthCallbackPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly auth = inject(AuthStateService);
  protected readonly error = signal<string | null>(null);
  protected readonly provider = this.route.snapshot.queryParamMap.get('provider') || 'OAuth';

  constructor() {
    queueMicrotask(() => this.finishLogin());
  }

  private finishLogin(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.error.set('Social sign-in could not be completed.');
      return;
    }

    this.auth.completeOAuthLogin(token).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => this.error.set(this.auth.error() || 'Social sign-in failed.'),
    });
  }
}

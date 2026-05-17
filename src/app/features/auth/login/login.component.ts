import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  fb = inject(FormBuilder);
  auth = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  loading = false;
  error = '';
  showPassword = false;
  apiUrl = environment.apiUrl;
  authUrl = environment.authUrl;
  githubOAuthUrl = this.buildOAuthUrl('github');
  googleOAuthUrl = this.buildOAuthUrl('google');

  constructor() {
    const oauthError = this.route.snapshot.queryParamMap.get('oauthError');
    if (oauthError === 'true') {
      this.error = 'OAuth sign-in failed. Please try again and confirm the Google redirect URI is configured correctly.';
    }
  }

  submit(): void {
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    this.error = '';
    this.auth.login(this.form.value as any).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error = err?.error?.message || 'Invalid credentials. Please try again.';
      }
    });
  }

  continueWithGoogle(): void {
    window.location.href = this.googleOAuthUrl;
  }

  continueWithGithub(): void {
    window.location.href = this.githubOAuthUrl;
  }

  private buildOAuthUrl(provider: 'github' | 'google'): string {
    const origin = this.getOAuthFrontendOrigin();

    const query = origin
      ? `?frontendOrigin=${encodeURIComponent(origin)}`
      : '';

    return `${environment.authUrl}/auth/oauth2/${provider}${query}`;
  }

  private getOAuthFrontendOrigin(): string {
    if (typeof window === 'undefined' || !window.location?.origin) {
      return '';
    }

    const { hostname, origin, port, protocol } = window.location;
    if (hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]') {
      return `${protocol}//localhost${port ? `:${port}` : ''}`;
    }

    return origin;
  }
}

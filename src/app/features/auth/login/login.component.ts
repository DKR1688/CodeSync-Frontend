import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
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

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  loading = false;
  error = '';
  showPassword = false;
  apiUrl = environment.apiUrl;
  githubOAuthUrl = this.buildOAuthUrl('github');
  googleOAuthUrl = this.buildOAuthUrl('google');

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
    return `${environment.apiUrl}/oauth2/authorization/${provider}`;
  }
}

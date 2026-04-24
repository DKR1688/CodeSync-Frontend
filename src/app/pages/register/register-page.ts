import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStateService } from '../../core/services/auth-state.service';

@Component({
  selector: 'app-register-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register-page.html',
  styleUrl: './register-page.css',
})
export class RegisterPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly auth = inject(AuthStateService);
  protected readonly error = signal<string | null>(null);
  protected readonly googleLoginUrl = '/oauth2/authorization/google';
  protected readonly githubLoginUrl = '/oauth2/authorization/github';

  protected readonly form = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => this.error.set(this.auth.error() || 'Registration failed.'),
    });
  }
}

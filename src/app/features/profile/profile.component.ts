import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  fb = inject(FormBuilder);
  auth = inject(AuthService);
  http = inject(HttpClient);

  user: User | null = null;
  activeTab: 'profile' | 'security' = 'profile';
  saving = false;
  saved = false;
  error = '';
  pwError = '';
  pwSaved = false;

  profileForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    bio: ['']
  });

  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]]
  });

  ngOnInit(): void {
    this.auth.currentUser$.subscribe(u => {
      this.user = u;
      if (u) this.profileForm.patchValue({ fullName: u.fullName, username: u.username, bio: u.bio });
    });
    this.auth.getProfile().subscribe();
  }

  saveProfile(): void {
    if (this.profileForm.invalid || this.saving) return;
    this.saving = true;
    this.error = '';
    this.http.put<User>(`${environment.apiUrl}/auth/profile`, this.profileForm.value).subscribe({
      next: (u) => {
        localStorage.setItem('codesync_user', JSON.stringify(u));
        this.auth.currentUser$.next(u);
        this.saving = false;
        this.saved = true;
        setTimeout(() => this.saved = false, 2000);
      },
      error: (err) => { this.error = err?.error?.message || 'Failed to update profile.'; this.saving = false; }
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;
    this.pwError = '';
    this.http.put(`${environment.apiUrl}/auth/password`, this.passwordForm.value).subscribe({
      next: () => { this.pwSaved = true; this.passwordForm.reset(); setTimeout(() => this.pwSaved = false, 3000); },
      error: (err) => { this.pwError = err?.error?.message || 'Failed to change password.'; }
    });
  }

  getInitials(u: User): string {
    if (u.fullName) return u.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return u.username[0].toUpperCase();
  }
}

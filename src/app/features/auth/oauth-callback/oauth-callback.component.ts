import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display:flex;align-items:center;justify-content:center;min-height:calc(100vh - var(--navbar-h));flex-direction:column;gap:1rem;">
      <div class="spinner" style="width:40px;height:40px;border-width:3px"></div>
      <p style="color:var(--text-secondary)">Completing sign-in...</p>
    </div>
  `
})
export class OAuthCallbackComponent implements OnInit {
  route = inject(ActivatedRoute);
  auth = inject(AuthService);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.auth.handleOAuthCallback(token);
    }
  }
}

import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { EMPTY } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { NotificationService } from '../../../core/services/notification.service';
import { User } from '../../../core/models';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  notifService = inject(NotificationService);

  user = toSignal(this.auth.currentUser$, { initialValue: this.auth.currentUser$.value });
  authenticated = computed(() => !!this.user() || !!this.auth.getStoredToken());
  admin = computed(() => this.user()?.role === 'ADMIN');
  unreadCount = toSignal(this.notifService.unreadCount$, { initialValue: this.notifService.unreadCount$.value });
  userMenuOpen = false;
  mobileMenuOpen = false;

  ngOnInit(): void {
    if (this.authenticated()) {
      this.auth.ensureProfileLoaded().pipe(
        switchMap(user => user ? this.notifService.getUnreadCount() : EMPTY),
        catchError(() => EMPTY)
      ).subscribe();
    }
  }

  getInitials(user: User): string {
    if (user.fullName) return user.fullName.split(' ').map((name: string) => name[0]).join('').toUpperCase().slice(0, 2);
    return user.username[0].toUpperCase();
  }

  logout(): void {
    this.auth.logout();
    this.userMenuOpen = false;
    this.mobileMenuOpen = false;
  }

  closeMenus(): void {
    this.userMenuOpen = false;
    this.mobileMenuOpen = false;
  }
}

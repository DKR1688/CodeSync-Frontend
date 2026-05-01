import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
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

  user: User | null = null;
  unreadCount = 0;
  userMenuOpen = false;
  mobileMenuOpen = false;

  ngOnInit(): void {
    this.auth.currentUser$.subscribe(u => this.user = u);
    this.notifService.unreadCount$.subscribe(c => this.unreadCount = c);

    if (this.auth.isAuthenticated()) {
      this.auth.ensureProfileLoaded().pipe(
        switchMap(user => user ? this.notifService.getUnreadCount() : EMPTY),
        catchError(() => EMPTY)
      ).subscribe();
    }
  }

  getInitials(user: User): string {
    if (user.fullName) return user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return user.username[0].toUpperCase();
  }

  logout(): void {
    this.auth.logout();
    this.userMenuOpen = false;
  }

  closeMenus(): void {
    this.userMenuOpen = false;
    this.mobileMenuOpen = false;
  }
}

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent {
  features = [
    { icon: '⚡', title: 'Real-time Collaboration', desc: 'Co-edit files simultaneously with live cursor sharing and instant sync across all participants.' },
    { icon: '🛡️', title: 'Sandboxed Execution', desc: 'Run code safely in Docker containers with configurable CPU, memory, and time limits.' },
    { icon: '🌿', title: 'Version Control', desc: 'Create snapshots, compare diffs, manage branches, and restore any previous state instantly.' },
    { icon: '💬', title: 'Code Reviews', desc: 'Add inline comments on specific lines, reply in threads, and track review progress with resolve states.' },
    { icon: '🔔', title: 'Smart Notifications', desc: 'Real-time alerts for mentions, session invites, comments, and snapshot events via WebSocket.' },
    { icon: '🔐', title: 'OAuth & JWT', desc: 'Secure authentication with GitHub/Google OAuth plus local email/password with JWT tokens.' },
  ];

  languages = ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Go', 'Rust', 'Kotlin', 'Swift', 'PHP', 'Ruby', 'C'];
}

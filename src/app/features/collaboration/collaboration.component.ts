import { ChangeDetectorRef, Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CollaborationService } from '../../core/services/collaboration.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { AuthService } from '../../core/services/auth.service';
import { CollabSession, Participant } from '../../core/models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-collaboration',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './collaboration.component.html',
  styleUrl: './collaboration.component.css'
})
export class CollaborationComponent implements OnInit, OnDestroy {
  cdr = inject(ChangeDetectorRef);
  route = inject(ActivatedRoute);
  collaborationService = inject(CollaborationService);
  wsService = inject(WebSocketService);
  auth = inject(AuthService);

  projectId = '';
  fileId = '';
  sessionId = '';
  session?: CollabSession;
  participants: Participant[] = [];
  currentParticipant?: Participant;
  code = '';
  loading = true;
  connected = false;
  wsSub?: Subscription;
  syncTimer?: ReturnType<typeof setTimeout>;
  joinError = '';
  joinLoading = false;
  joinForm = {
    password: '',
    role: 'EDITOR' as 'EDITOR' | 'VIEWER'
  };
  cursor = { line: 1, col: 1 };
  joined = false;
  private lastAppliedRevision = 0;
  private pendingContent: string | null = null;

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id')!;
    this.fileId = this.route.snapshot.paramMap.get('fileId')!;
    this.sessionId = this.route.snapshot.paramMap.get('sessionId')!;
    this.loadSession();
  }

  loadSession(): void {
    this.collaborationService.getSession(this.sessionId).subscribe({
      next: (s) => {
        this.session = s;
        this.lastAppliedRevision = s.currentRevision ?? this.lastAppliedRevision;
        if (this.pendingContent === null) {
          this.code = s.currentContent ?? '';
        }
        if (s.status !== 'ACTIVE') {
          this.loading = false;
          this.loadParticipants();
          this.syncView();
          return;
        }
        if (!this.joined) {
          this.joinSession();
        }
        this.syncView();
      },
      error: () => {
        this.loading = false;
        this.syncView();
      }
    });
  }

  loadParticipants(): void {
    this.collaborationService.getParticipants(this.sessionId).subscribe(participants => {
      this.participants = participants.filter(participant => participant.active !== false && !participant.leftAt);
      this.syncView();
    });
  }

  joinSession(): void {
    if (this.joined || this.joinLoading) {
      return;
    }
    this.joinLoading = true;
    this.joinError = '';
    this.collaborationService.joinSession(this.sessionId, {
      password: this.joinForm.password.trim() || undefined,
      role: this.joinForm.role
    }).subscribe({
      next: participant => {
        this.currentParticipant = participant;
        this.joined = true;
        this.loading = false;
        this.joinLoading = false;
        this.connectWs();
        this.loadParticipants();
        this.syncView();
      },
      error: err => {
        this.loading = false;
        this.joinLoading = false;
        this.joinError = err?.error?.message || 'Unable to join the collaboration session.';
        this.syncView();
      }
    });
  }

  connectWs(): void {
    this.wsSub?.unsubscribe();
    this.wsSub = this.wsService.connectCollab(this.sessionId).subscribe(event => {
      this.connected = true;
      switch (event.type) {
        case 'CONTENT_SYNC':
          this.applyContentSync(event.payload);
          break;
        case 'PARTICIPANT_JOINED':
        case 'PARTICIPANT_LEFT':
        case 'PARTICIPANT_KICKED':
          this.loadParticipants();
          break;
        case 'SESSION_ENDED':
          this.session = { ...this.session!, status: 'ENDED' };
          break;
      }
      this.syncView();
    });
  }

  sendContentUpdate(): void {
    if (!this.session || this.session.status !== 'ACTIVE' || !this.joined) {
      return;
    }

    clearTimeout(this.syncTimer);
    this.pendingContent = this.code;
    this.syncTimer = setTimeout(() => {
      this.collaborationService.broadcastChange(this.sessionId, {
        content: this.code,
        baseRevision: this.session?.currentRevision ?? this.lastAppliedRevision,
        cursorLine: this.cursor.line,
        cursorCol: this.cursor.col
      }).subscribe({
        next: session => {
          this.session = session;
          this.lastAppliedRevision = session.currentRevision ?? this.lastAppliedRevision;
          if (session.currentContent === this.pendingContent) {
            this.pendingContent = null;
          }
          this.syncView();
        },
        error: err => {
          this.joinError = err?.error?.message || 'Unable to sync your latest change. Please try again.';
          this.syncView();
        }
      });
    }, 250);
  }

  onCursorChange(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    const beforeCursor = target.value.slice(0, target.selectionStart);
    const lines = beforeCursor.split('\n');
    this.cursor = {
      line: lines.length,
      col: lines[lines.length - 1].length + 1
    };

    if (!this.joined || this.session?.status !== 'ACTIVE') {
      return;
    }

    this.collaborationService.updateCursor(this.sessionId, {
      cursorLine: this.cursor.line,
      cursorCol: this.cursor.col
    }).subscribe();
  }

  kickParticipant(participant: Participant): void {
    this.collaborationService.kickParticipant(this.sessionId, participant.userId).subscribe(() => {
      this.loadParticipants();
      this.syncView();
    });
  }

  endSession(): void {
    if (!confirm('End this collaboration session?')) return;
    this.collaborationService.endSession(this.sessionId).subscribe(() => {
      if (this.session) this.session.status = 'ENDED';
      this.syncView();
    });
  }

  leaveSession(): void {
    if (!this.joined) {
      return;
    }
    this.collaborationService.leaveSession(this.sessionId).subscribe();
    this.joined = false;
  }

  isHost(): boolean {
    const userId = this.auth.currentUser$.value?.userId;
    return String(this.session?.ownerId) === String(userId);
  }

  getParticipantInitial(participant: Participant): string {
    return String(participant.userId).slice(0, 1).toUpperCase();
  }

  ngOnDestroy(): void {
    clearTimeout(this.syncTimer);
    this.leaveSession();
    this.wsSub?.unsubscribe();
    this.wsService.disconnectCollab();
  }

  private applyContentSync(session?: CollabSession): void {
    if (!session) {
      return;
    }

    const incomingRevision = session.currentRevision ?? this.lastAppliedRevision;
    if (incomingRevision < this.lastAppliedRevision) {
      return;
    }

    this.session = session;
    this.lastAppliedRevision = incomingRevision;
    const incomingContent = session.currentContent ?? this.code;
    if (this.pendingContent === null || incomingContent === this.pendingContent) {
      this.code = incomingContent;
      this.pendingContent = null;
    }
  }

  private syncView(): void {
    this.cdr.detectChanges();
  }
}

import { ChangeDetectorRef, Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileService } from '../../core/services/file.service';
import { ExecutionService } from '../../core/services/execution.service';
import { VersionService } from '../../core/services/version.service';
import { CommentService } from '../../core/services/comment.service';
import { CollaborationService } from '../../core/services/collaboration.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { ThemeService } from '../../core/services/theme.service';
import { ProjectService } from '../../core/services/project.service';
import { CodeFile, CollabSession, ExecutionJob, Snapshot, Comment, FileTreeNode } from '../../core/models';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.css'
})
export class EditorComponent implements OnInit, OnDestroy {
  cdr = inject(ChangeDetectorRef);
  route = inject(ActivatedRoute);
  router = inject(Router);
  fileService = inject(FileService);
  executionService = inject(ExecutionService);
  versionService = inject(VersionService);
  commentService = inject(CommentService);
  collaborationService = inject(CollaborationService);
  wsService = inject(WebSocketService);
  theme = inject(ThemeService);
  projectService = inject(ProjectService);

  projectId = '';
  fileId = '';
  file?: CodeFile;
  code = '';
  fileTree: FileTreeNode[] = [];
  loading = true;
  saving = false;
  saved = false;

  // Execution
  activePanel: 'output' | 'history' | 'comments' | 'versions' | null = 'output';
  executionJob?: ExecutionJob;
  runOutput = '';
  stdin = '';
  running = false;
  executionHistory: ExecutionJob[] = [];
  execSub?: Subscription;

  // Versions
  snapshots: Snapshot[] = [];
  snapshotMessage = '';
  showSnapshotModal = false;
  creatingSnapshot = false;

  // Comments
  comments: Comment[] = [];
  newComment = { lineNumber: 1, content: '' };
  showCommentModal = false;
  activeSession: CollabSession | null = null;
  loadingSession = false;
  showSessionModal = false;
  creatingSession = false;
  sessionError = '';
  sessionForm = {
    maxParticipants: 10,
    password: ''
  };

  autoSaveTimer: any;

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id')!;
    this.fileId = this.route.snapshot.paramMap.get('fileId')!;
    this.loadFile();
    this.loadSidebar();
    this.loadActiveSession();
  }

  loadFile(): void {
    this.fileService.getFile(this.fileId).subscribe({
      next: (f) => {
        this.file = f;
        this.code = f.content || '';
        this.loading = false;
        this.syncView();
      },
      error: () => {
        this.loading = false;
        this.syncView();
      }
    });
  }

  loadSidebar(): void {
    this.fileService.getFileTree(this.projectId).subscribe(t => {
      this.fileTree = t;
      this.syncView();
    });
    this.commentService.getByFile(this.fileId).subscribe(c => {
      this.comments = c;
      this.syncView();
    });
  }

  loadActiveSession(): void {
    this.loadingSession = true;
    this.collaborationService.getActiveSessionForFile(this.fileId).subscribe({
      next: session => {
        this.activeSession = session;
        this.loadingSession = false;
        this.syncView();
      },
      error: () => {
        this.activeSession = null;
        this.loadingSession = false;
        this.syncView();
      }
    });
  }

  onCodeChange(value: string): void {
    this.code = value;
    this.saved = false;
    clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => this.saveFile(), 3000);
  }

  saveFile(): void {
    if (!this.file || this.saving) return;
    this.saving = true;
    this.fileService.updateContent(this.fileId, this.code).subscribe({
      next: () => {
        this.saving = false;
        this.saved = true;
        this.syncView();
        setTimeout(() => {
          this.saved = false;
          this.syncView();
        }, 2000);
      },
      error: () => {
        this.saving = false;
        this.syncView();
      }
    });
  }

  runCode(): void {
    if (!this.file || this.running) return;
    this.running = true;
    this.runOutput = '';
    this.activePanel = 'output';

    this.executionService.submit({
      projectId: this.projectId,
      fileId: this.fileId,
      language: this.file.language || 'python',
      sourceCode: this.code,
      stdin: this.stdin
    }).subscribe({
      next: (job) => {
        this.executionJob = job;
        this.pollJobStatus(job.jobId);
        this.syncView();
        this.execSub = this.wsService.connectExecution(job.jobId).subscribe(event => {
          if (event.type === 'STDOUT') this.runOutput += event.data;
          if (event.type === 'STATUS') {
            if (['COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED'].includes(event.status)) {
              this.running = false;
            }
          }
          this.syncView();
        });
      },
      error: () => {
        this.running = false;
        this.syncView();
      }
    });
  }

  private pollJobStatus(jobId: string): void {
    const poll = setInterval(() => {
      this.executionService.getJob(jobId).subscribe(job => {
        this.executionJob = job;
        if (job.stdout) this.runOutput = job.stdout;
        if (['COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED'].includes(job.status)) {
          clearInterval(poll);
          this.running = false;
        }
        this.syncView();
      });
    }, 1500);
  }

  cancelRun(): void {
    if (this.executionJob) {
      this.executionService.cancelJob(this.executionJob.jobId).subscribe(() => {
        this.running = false;
        this.syncView();
      });
    }
  }

  createSnapshot(): void {
    if (!this.snapshotMessage.trim()) return;
    this.creatingSnapshot = true;
    this.versionService.createSnapshot({
      projectId: this.projectId,
      fileId: this.fileId,
      message: this.snapshotMessage,
      content: this.code
    }).subscribe({
      next: (s) => {
        this.snapshots.unshift(s);
        this.showSnapshotModal = false;
        this.snapshotMessage = '';
        this.creatingSnapshot = false;
        this.syncView();
      },
      error: () => {
        this.creatingSnapshot = false;
        this.syncView();
      }
    });
  }

  loadVersions(): void {
    this.activePanel = 'versions';
    this.versionService.getFileHistory(this.fileId).subscribe(s => {
      this.snapshots = s;
      this.syncView();
    });
  }

  restoreSnapshot(s: Snapshot): void {
    if (!confirm(`Restore to snapshot "${s.message}"?`)) return;
    this.versionService.restoreSnapshot(s.snapshotId).subscribe(() => {
      this.code = s.content;
      this.saveFile();
      this.syncView();
    });
  }

  addComment(): void {
    if (!this.newComment.content.trim()) return;
    this.commentService.addComment({
      projectId: this.projectId,
      fileId: this.fileId,
      lineNumber: this.newComment.lineNumber,
      content: this.newComment.content
    }).subscribe(c => {
      this.comments.unshift(c);
      this.showCommentModal = false;
      this.newComment = { lineNumber: 1, content: '' };
      this.syncView();
    });
  }

  openCollaboration(): void {
    if (this.activeSession) {
      this.router.navigate(['/projects', this.projectId, 'sessions', this.fileId, this.activeSession.sessionId]);
      return;
    }
    this.showSessionModal = true;
    this.sessionError = '';
  }

  createSession(): void {
    this.creatingSession = true;
    this.sessionError = '';
    this.collaborationService.createSession({
      projectId: this.projectId,
      fileId: this.fileId,
      maxParticipants: this.sessionForm.maxParticipants,
      password: this.sessionForm.password.trim() || undefined
    }).subscribe({
      next: session => {
        this.creatingSession = false;
        this.showSessionModal = false;
        this.activeSession = session;
        this.syncView();
        this.router.navigate(['/projects', this.projectId, 'sessions', this.fileId, session.sessionId]);
      },
      error: err => {
        this.creatingSession = false;
        this.sessionError = err?.error?.message || 'Unable to start a collaboration session.';
        this.loadActiveSession();
        this.syncView();
      }
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      COMPLETED: 'success', FAILED: 'danger', TIMED_OUT: 'warning',
      RUNNING: 'accent', QUEUED: 'muted', CANCELLED: 'muted'
    };
    return map[status] || 'muted';
  }

  getFileIcon(node: FileTreeNode): string {
    if (node.folder) return '📁';
    const ext = node.name.split('.').pop()?.toLowerCase();
    const icons: Record<string, string> = { py: '🐍', js: '🌐', ts: '💙', java: '☕', go: '🐹', rs: '🦀', cpp: '⚙️', c: '🔧', kt: '🎯', md: '📝', json: '📋', txt: '📄' };
    return icons[ext || ''] || '📄';
  }

  getTimeAgo(d: string): string {
    const diff = (Date.now() - new Date(d).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }

  insertTab(event: KeyboardEvent): void {
    const ta = event.target as HTMLTextAreaElement;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    this.code = this.code.substring(0, start) + "  " + this.code.substring(end);
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2; });
  }

  ngOnDestroy(): void {
    clearTimeout(this.autoSaveTimer);
    this.execSub?.unsubscribe();
  }

  private syncView(): void {
    this.cdr.detectChanges();
  }
}

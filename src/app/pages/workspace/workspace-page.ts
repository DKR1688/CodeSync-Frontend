import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthStateService } from '../../core/services/auth-state.service';
import { CodesyncApiService } from '../../core/services/codesync-api.service';
import {
  BroadcastChangeRequest,
  CodeFile,
  CollabSession,
  Comment,
  DiffResponse,
  ExecutionJob,
  ExecutionResult,
  Participant,
  Project,
  ProjectPermission,
  Snapshot,
  SupportedLanguage,
  UserResponse,
} from '../../shared/models/codesync.models';

@Component({
  selector: 'app-workspace-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './workspace-page.html',
  styleUrl: './workspace-page.css',
})
export class WorkspacePageComponent {
  private readonly api = inject(CodesyncApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly auth = inject(AuthStateService);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly status = signal<string | null>(null);
  protected readonly project = signal<Project | null>(null);
  protected readonly permissions = signal<ProjectPermission | null>(null);
  protected readonly files = signal<CodeFile[]>([]);
  protected readonly comments = signal<Comment[]>([]);
  protected readonly snapshots = signal<Snapshot[]>([]);
  protected readonly latestSnapshot = signal<Snapshot | null>(null);
  protected readonly diff = signal<DiffResponse | null>(null);
  protected readonly executions = signal<ExecutionJob[]>([]);
  protected readonly executionResult = signal<ExecutionResult | null>(null);
  protected readonly languages = signal<SupportedLanguage[]>([]);
  protected readonly sessions = signal<CollabSession[]>([]);
  protected readonly activeSession = signal<CollabSession | null>(null);
  protected readonly participants = signal<Participant[]>([]);
  protected readonly selectedFile = signal<CodeFile | null>(null);
  protected readonly editorContent = signal('');
  protected readonly editorDirty = signal(false);
  protected readonly memberIds = signal<number[]>([]);
  protected readonly userDirectory = signal<Record<number, UserResponse>>({});
  protected readonly memberSearchResults = signal<UserResponse[]>([]);
  protected readonly fileSearchResults = signal<CodeFile[]>([]);
  protected readonly commentCount = signal(0);
  protected readonly commentFilter = signal<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  protected readonly editingCommentId = signal<number | null>(null);
  protected readonly activeView = signal<'editor' | 'history' | 'review'>('editor');

  protected readonly sortedFiles = computed(() =>
    [...this.files()].sort((left, right) => left.path.localeCompare(right.path)),
  );
  protected readonly displayedFiles = computed(() => {
    if (!this.fileSearchTerm.trim()) {
      return this.sortedFiles();
    }
    return [...this.fileSearchResults()].sort((left, right) => left.path.localeCompare(right.path));
  });
  protected readonly rootComments = computed(() =>
    [...this.comments()]
      .filter((comment) => {
        const filter = this.commentFilter();
        if (filter === 'OPEN') {
          return !comment.resolved;
        }
        if (filter === 'RESOLVED') {
          return comment.resolved;
        }
        return true;
      })
      .filter((comment) => !comment.parentCommentId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
  );
  protected readonly currentUser = computed(() => this.auth.user());
  protected readonly isAuthenticated = computed(() => !!this.auth.user() || this.auth.hasToken());
  protected readonly canUseDeveloperFeatures = computed(() => this.isAuthenticated());
  protected readonly canWrite = computed(() => !!this.permissions()?.canWrite);
  protected readonly canManage = computed(() => !!this.permissions()?.canManage);
  protected readonly canComment = computed(() => this.canUseDeveloperFeatures() && this.canWrite());
  protected readonly ownerProfile = computed(() => {
    const project = this.project();
    if (!project) {
      return null;
    }
    return this.userDirectory()[project.ownerId] || null;
  });
  protected readonly memberProfiles = computed(() =>
    this.memberIds()
      .map((id) => this.userDirectory()[id])
      .filter((user): user is UserResponse => !!user),
  );

  protected newFilePath = '';
  protected fileSearchTerm = '';
  protected newFileLanguage = 'java';
  protected newFolderPath = '';
  protected renameValue = '';
  protected movePath = '';
  protected executionInput = '';
  protected snapshotMessage = '';
  protected snapshotBranch = 'main';
  protected snapshotTag = '';
  protected newBranchName = '';
  protected newBranchMessage = '';
  protected diffFromSnapshotId: number | null = null;
  protected diffToSnapshotId: number | null = null;
  protected commentContent = '';
  protected editingCommentContent = '';
  protected commentLineNumber = 1;
  protected commentReplyParentId: number | null = null;
  protected sessionPassword = '';
  protected sessionJoinPassword = '';
  protected sessionMaxParticipants = 6;
  protected memberSearchTerm = '';

  private readonly preserveSelectionState = {
    preserveStatus: true,
    preserveDiff: true,
    preserveExecutionResult: true,
    preserveActiveView: true,
  };
  private fileSelectionRequestId = 0;
  private sessionPollHandle: ReturnType<typeof setInterval> | null = null;
  private activePolledSessionId: string | null = null;

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const projectId = Number(params.get('projectId'));
      if (!projectId) {
        this.error.set('A valid project id is required.');
        this.loading.set(false);
        return;
      }
      this.loadWorkspace(projectId);
    });
  }

  protected selectFile(
    file: CodeFile,
    options: {
      preserveStatus?: boolean;
      preserveDiff?: boolean;
      preserveExecutionResult?: boolean;
      preserveActiveView?: boolean;
    } = {},
  ): void {
    if (!file.fileId || !file.language) {
      return;
    }

    if (!options.preserveActiveView) {
      this.activeView.set('editor');
    }
    this.restrictGuestView();
    this.selectedFile.set(file);
    this.renameValue = file.name;
    this.movePath = file.path;
    const requestId = ++this.fileSelectionRequestId;
    if (!options.preserveStatus) {
      this.status.set(null);
    }
    if (!options.preserveDiff) {
      this.diff.set(null);
    }
    if (!options.preserveExecutionResult) {
      this.executionResult.set(null);
    }

    const developerFeaturesEnabled = this.canUseDeveloperFeatures();
    forkJoin({
      content: this.api.getFileContent(file.fileId),
      comments: developerFeaturesEnabled
        ? this.api.getCommentsByFile(file.fileId, this.project()!.projectId).pipe(catchError(() => of([])))
        : of([]),
      commentCount: developerFeaturesEnabled
        ? this.api.getCommentCount(file.fileId, this.project()!.projectId).pipe(catchError(() => of(0)))
        : of(0),
      snapshots: developerFeaturesEnabled
        ? this.api.getFileHistory(file.fileId, this.project()!.projectId).pipe(catchError(() => of([])))
        : of([]),
      latestSnapshot: developerFeaturesEnabled
        ? this.api.getLatestSnapshot(file.fileId, this.snapshotBranch.trim() || undefined).pipe(catchError(() => of(null)))
        : of(null),
      activeSession: developerFeaturesEnabled
        ? this.api.getActiveSessionForFile(file.fileId).pipe(catchError(() => of(null)))
        : of(null),
    }).subscribe({
      next: ({ content, comments, commentCount, snapshots, latestSnapshot, activeSession }) => {
        if (requestId !== this.fileSelectionRequestId || this.selectedFile()?.fileId !== file.fileId) {
          return;
        }
        this.editorContent.set(content);
        this.editorDirty.set(false);
        this.comments.set(comments);
        this.commentCount.set(commentCount);
        this.snapshots.set(snapshots);
        this.latestSnapshot.set(latestSnapshot);
        this.activeSession.set(activeSession);
        this.syncSessionPolling(activeSession?.sessionId || null);
        this.commentLineNumber = 1;
        const userIds = comments.map((comment) => comment.authorId);
        this.loadUserProfiles(userIds);

        if (developerFeaturesEnabled && activeSession) {
          this.loadParticipants(activeSession.sessionId);
        } else {
          this.participants.set([]);
        }
      },
      error: () => {
        this.error.set('File details could not be loaded.');
      },
    });
  }

  protected saveFile(): void {
    const file = this.selectedFile();
    if (!file?.fileId || !this.canWrite()) {
      return;
    }

    this.api.updateFileContent(file.fileId, this.editorContent()).subscribe({
      next: (updatedFile) => {
        this.status.set('File content saved successfully.');
        this.editorDirty.set(false);
        this.selectedFile.set(updatedFile);
        this.files.update((files) =>
          files.map((item) => (item.fileId === updatedFile.fileId ? updatedFile : item)),
        );
      },
      error: () => this.error.set('Saving this file failed.'),
    });
  }

  protected createFile(): void {
    const project = this.project();
    if (!project || !this.canWrite() || !this.newFilePath.trim()) {
      return;
    }

    const normalizedPath = this.normalizePath(this.newFilePath);
    const name = normalizedPath.split('/').pop() || normalizedPath;
    this.api
      .createFile({
        projectId: project.projectId,
        name,
        path: normalizedPath,
        language: this.newFileLanguage || project.language || 'java',
        content: '',
        size: 0,
      })
      .subscribe({
        next: (file) => {
          this.status.set(`File "${file.name}" created.`);
          this.newFilePath = '';
          this.fileSearchTerm = '';
          this.fileSearchResults.set([]);
          this.refreshWorkspaceLists(file.fileId);
        },
        error: () => this.error.set('Creating the file failed.'),
      });
  }

  protected createFolder(): void {
    const project = this.project();
    if (!project || !this.canWrite() || !this.newFolderPath.trim()) {
      return;
    }

    this.api
      .createFolder({
        projectId: project.projectId,
        path: this.normalizePath(this.newFolderPath),
      })
      .subscribe({
        next: () => {
          this.status.set('Folder created successfully.');
          this.newFolderPath = '';
          this.fileSearchTerm = '';
          this.fileSearchResults.set([]);
          this.refreshWorkspaceLists(this.selectedFile()?.fileId || null);
        },
        error: () => this.error.set('Creating the folder failed.'),
      });
  }

  protected renameSelectedFile(): void {
    const file = this.selectedFile();
    if (!file?.fileId || !this.canWrite() || !this.renameValue.trim()) {
      return;
    }

    this.api.renameFile(file.fileId, this.renameValue.trim()).subscribe({
      next: () => {
        this.status.set('File renamed successfully.');
        this.refreshWorkspaceLists(file.fileId);
      },
      error: () => this.error.set('Renaming the file failed.'),
    });
  }

  protected deleteSelectedFile(): void {
    const file = this.selectedFile();
    if (!file?.fileId || !this.canWrite()) {
      return;
    }

    this.api.deleteFile(file.fileId).subscribe({
      next: () => {
        this.status.set('File deleted successfully.');
        this.selectedFile.set(null);
        this.editorContent.set('');
        this.comments.set([]);
        this.snapshots.set([]);
        this.latestSnapshot.set(null);
        this.diff.set(null);
        this.refreshWorkspaceLists(null);
      },
      error: () => this.error.set('Deleting the file failed.'),
    });
  }

  protected moveSelectedFile(): void {
    const file = this.selectedFile();
    if (!file?.fileId || !this.canWrite() || !this.movePath.trim()) {
      return;
    }

    this.api
      .moveFile(file.fileId, {
        newPath: this.normalizePath(this.movePath),
      })
      .subscribe({
        next: (updated) => {
          this.status.set('File path updated successfully.');
          this.refreshWorkspaceLists(updated.fileId);
        },
        error: () => this.error.set('Moving the file failed.'),
      });
  }

  protected restoreSelectedFile(): void {
    const file = this.selectedFile();
    if (!file?.fileId || !this.canWrite()) {
      return;
    }

    this.api.restoreFile(file.fileId).subscribe({
      next: () => {
        this.status.set('File restored successfully.');
        this.refreshWorkspaceLists(file.fileId);
      },
      error: () => this.error.set('Restoring the file failed.'),
    });
  }

  protected runCode(): void {
    const file = this.selectedFile();
    const project = this.project();
    if (!file?.fileId || !project || !this.canWrite()) {
      return;
    }

    this.api
      .submitExecution({
        projectId: project.projectId,
        fileId: file.fileId,
        language: file.language || project.language || 'java',
        sourceCode: this.editorContent(),
        stdin: this.executionInput,
        timeLimitSeconds: 10,
        memoryLimitMb: 256,
        cpuLimit: 1,
      })
      .subscribe({
        next: (job) => {
          this.status.set('Execution submitted.');
          this.executions.update((jobs) => [job, ...jobs]);
          this.pollExecution(job.jobId);
        },
        error: () => this.error.set('Execution request failed.'),
      });
  }

  protected createSnapshot(): void {
    const file = this.selectedFile();
    const project = this.project();
    if (!file?.fileId || !project || !this.canWrite() || !this.snapshotMessage.trim()) {
      return;
    }

    const latestSnapshot = this.snapshots()[0];
    this.api
      .createSnapshot({
        projectId: project.projectId,
        fileId: file.fileId,
        parentSnapshotId: latestSnapshot?.snapshotId || null,
        content: this.editorContent(),
        message: this.snapshotMessage.trim(),
        branch: this.snapshotBranch.trim() || 'main',
      })
      .subscribe({
        next: (snapshot) => {
          this.status.set('Snapshot created.');
          this.activeView.set('history');
          this.snapshotMessage = '';
          this.latestSnapshot.set(snapshot);
          this.snapshots.update((snapshots) => [snapshot, ...snapshots]);
        },
        error: () => this.error.set('Creating a snapshot failed.'),
      });
  }

  protected compareSnapshots(): void {
    if (!this.diffFromSnapshotId || !this.diffToSnapshotId) {
      return;
    }

    this.api.diffSnapshots(this.diffFromSnapshotId, this.diffToSnapshotId).subscribe({
      next: (diff) => {
        this.activeView.set('history');
        this.diff.set(diff);
      },
      error: () => this.error.set('Diff generation failed.'),
    });
  }

  protected restoreSnapshot(snapshotId: number): void {
    if (!this.canWrite()) {
      return;
    }

    this.api
      .restoreSnapshot(snapshotId, {
        branch: this.snapshotBranch.trim() || 'main',
        message: 'Restored from frontend workspace',
      })
      .subscribe({
        next: () => {
          this.status.set('Snapshot restored successfully.');
          if (this.selectedFile()) {
            this.selectFile(this.selectedFile()!);
          }
        },
        error: () => this.error.set('Restoring this snapshot failed.'),
      });
  }

  protected createBranch(): void {
    const latestSnapshot = this.latestSnapshot();
    if (!latestSnapshot || !this.canWrite() || !this.newBranchName.trim()) {
      return;
    }

    this.api
      .createBranch({
        sourceSnapshotId: latestSnapshot.snapshotId,
        branch: this.newBranchName.trim(),
        message: this.newBranchMessage.trim() || null,
      })
      .subscribe({
        next: (snapshot) => {
          this.status.set(`Branch "${snapshot.branch}" created.`);
          this.newBranchName = '';
          this.newBranchMessage = '';
          this.snapshots.update((items) => [snapshot, ...items]);
        },
        error: () => this.error.set('Creating the branch failed.'),
      });
  }

  protected tagLatestSnapshot(): void {
    const latestSnapshot = this.latestSnapshot();
    if (!latestSnapshot || !this.canWrite() || !this.snapshotTag.trim()) {
      return;
    }

    this.api.tagSnapshot(latestSnapshot.snapshotId, this.snapshotTag.trim()).subscribe({
      next: (snapshot) => {
        this.status.set('Snapshot tag saved.');
        this.snapshotTag = '';
        this.latestSnapshot.set(snapshot);
        this.snapshots.update((items) =>
          items.map((item) => (item.snapshotId === snapshot.snapshotId ? snapshot : item)),
        );
      },
      error: () => this.error.set('Tagging the snapshot failed.'),
    });
  }

  protected addComment(): void {
    const file = this.selectedFile();
    const project = this.project();
    if (!file?.fileId || !project || !this.canWrite() || !this.commentContent.trim()) {
      return;
    }

    this.api
      .addComment({
        projectId: project.projectId,
        fileId: file.fileId,
        content: this.commentContent.trim(),
        lineNumber: this.commentLineNumber,
        columnNumber: 1,
        parentCommentId: this.commentReplyParentId,
      })
      .subscribe({
        next: (comment) => {
          this.status.set('Comment added.');
          this.activeView.set('review');
          this.commentContent = '';
          this.commentReplyParentId = null;
          this.comments.update((comments) => [comment, ...comments]);
          this.loadUserProfiles([comment.authorId]);
        },
        error: () => this.error.set('Adding the comment failed.'),
      });
  }

  protected toggleCommentResolution(comment: Comment): void {
    if (!this.canComment()) {
      return;
    }
    const action = comment.resolved
      ? this.api.unresolveComment(comment.commentId)
      : this.api.resolveComment(comment.commentId);

    action.subscribe({
      next: (updated) => {
        this.comments.update((comments) =>
          comments.map((item) => (item.commentId === updated.commentId ? updated : item)),
        );
      },
      error: () => this.error.set('Updating the comment failed.'),
    });
  }

  protected beginReply(commentId: number): void {
    if (!this.canComment()) {
      return;
    }
    this.activeView.set('review');
    this.commentReplyParentId = commentId;
    this.commentContent = '';
  }

  protected beginCommentEdit(comment: Comment): void {
    if (!this.canModifyComment(comment)) {
      return;
    }
    this.editingCommentId.set(comment.commentId);
    this.editingCommentContent = comment.content;
  }

  protected saveCommentEdit(commentId: number): void {
    const comment = this.comments().find((item) => item.commentId === commentId);
    if (!comment || !this.canModifyComment(comment) || !this.editingCommentContent.trim()) {
      return;
    }

    this.api.updateComment(commentId, { content: this.editingCommentContent.trim() }).subscribe({
      next: (updated) => {
        this.comments.update((comments) =>
          comments.map((item) => (item.commentId === updated.commentId ? updated : item)),
        );
        this.editingCommentId.set(null);
        this.editingCommentContent = '';
        this.status.set('Comment updated.');
      },
      error: () => this.error.set('Updating the comment failed.'),
    });
  }

  protected deleteComment(commentId: number): void {
    const comment = this.comments().find((item) => item.commentId === commentId);
    if (!comment || !this.canModifyComment(comment)) {
      return;
    }
    this.api.deleteComment(commentId).subscribe({
      next: () => {
        this.comments.update((comments) => comments.filter((item) => item.commentId !== commentId));
        this.status.set('Comment deleted.');
      },
      error: () => this.error.set('Deleting the comment failed.'),
    });
  }

  protected createSession(): void {
    const file = this.selectedFile();
    const project = this.project();
    if (!file?.fileId || !project || !this.canWrite()) {
      return;
    }

    this.api
      .createSession({
        projectId: project.projectId,
        fileId: file.fileId,
        maxParticipants: this.sessionMaxParticipants,
        password: this.sessionPassword || null,
      })
      .subscribe({
        next: (session) => {
          this.status.set('Live session created.');
          this.activeSession.set(session);
          this.syncSessionPolling(session.sessionId);
          this.sessions.update((sessions) => [session, ...sessions]);
          this.loadParticipants(session.sessionId);
        },
        error: () => this.error.set('Creating the live session failed.'),
      });
  }

  protected joinSession(): void {
    const session = this.activeSession();
    if (!session || !this.canUseDeveloperFeatures()) {
      return;
    }

    this.api
      .joinSession(session.sessionId, {
        password: this.sessionJoinPassword || null,
      })
      .subscribe({
        next: () => {
          this.status.set('Joined the active session.');
          this.syncSessionPolling(session.sessionId);
          this.loadParticipants(session.sessionId);
        },
        error: () => this.error.set('Joining the session failed.'),
      });
  }

  protected leaveSession(): void {
    const session = this.activeSession();
    if (!session || !this.canUseDeveloperFeatures()) {
      return;
    }

    this.api.leaveSession(session.sessionId).subscribe({
        next: () => {
          this.status.set('Left the current session.');
          this.activeSession.set(null);
          this.participants.set([]);
          this.syncSessionPolling(null);
        },
      error: () => this.error.set('Leaving the session failed.'),
    });
  }

  protected endSession(): void {
    const session = this.activeSession();
    if (!session || !this.canUseDeveloperFeatures()) {
      return;
    }

    this.api.endSession(session.sessionId).subscribe({
        next: () => {
          this.status.set('Session ended.');
          this.activeSession.set(null);
          this.participants.set([]);
          this.syncSessionPolling(null);
          this.refreshWorkspaceLists(this.selectedFile()?.fileId || null);
        },
      error: () => this.error.set('Ending the session failed.'),
    });
  }

  protected broadcastCurrentContent(): void {
    const session = this.activeSession();
    if (!session || !this.canUseDeveloperFeatures()) {
      return;
    }

    const request: BroadcastChangeRequest = {
      baseRevision: session.currentRevision,
      content: this.editorContent(),
      cursorLine: 1,
      cursorCol: 1,
      selectionEndLine: 1,
      selectionEndCol: 1,
    };

    this.api.broadcastSessionChange(session.sessionId, request).subscribe({
      next: (updated) => {
        this.status.set('Session content broadcasted.');
        this.activeSession.set(updated);
      },
      error: () => this.error.set('Broadcasting session content failed.'),
    });
  }

  protected syncCursor(): void {
    const session = this.activeSession();
    if (!session || !this.canUseDeveloperFeatures()) {
      return;
    }

    this.api
      .updateSessionCursor(session.sessionId, {
        cursorLine: Math.max(1, this.commentLineNumber),
        cursorCol: 1,
        selectionEndLine: Math.max(1, this.commentLineNumber),
        selectionEndCol: 1,
      })
      .subscribe({
        next: () => {
          this.loadParticipants(session.sessionId);
        },
        error: () => this.error.set('Updating session cursor failed.'),
      });
  }

  protected kickParticipant(userId: number): void {
    const session = this.activeSession();
    if (!session || !this.canManage()) {
      return;
    }

    this.api.kickParticipant(session.sessionId, userId).subscribe({
      next: () => {
        this.status.set('Participant removed from the session.');
        this.loadParticipants(session.sessionId);
      },
      error: () => this.error.set('Removing the participant failed.'),
    });
  }

  protected searchFiles(): void {
    const project = this.project();
    if (!project || !this.canUseDeveloperFeatures() || !this.fileSearchTerm.trim()) {
      this.fileSearchResults.set([]);
      return;
    }

    this.api.searchProjectFiles(project.projectId, this.fileSearchTerm.trim()).subscribe({
      next: (files) => this.fileSearchResults.set(files),
      error: () => this.error.set('Searching project files failed.'),
    });
  }

  protected cancelExecution(jobId: string): void {
    this.api.cancelExecution(jobId).subscribe({
      next: (job) => {
        this.status.set(`Execution ${job.jobId} cancelled.`);
        this.executions.update((jobs) =>
          jobs.map((item) => (item.jobId === job.jobId ? job : item)),
        );
      },
      error: () => this.error.set('Cancelling the execution failed.'),
    });
  }

  protected searchMembers(): void {
    if (!this.memberSearchTerm.trim()) {
      this.memberSearchResults.set([]);
      return;
    }

    this.api.searchUsers(this.memberSearchTerm.trim()).subscribe({
      next: (users) => this.memberSearchResults.set(users),
      error: () => this.error.set('User search failed.'),
    });
  }

  protected addMember(userId: number): void {
    const project = this.project();
    if (!project || !this.canManage()) {
      return;
    }

    this.api.addProjectMember(project.projectId, userId).subscribe({
      next: () => {
        this.status.set('Member added to the project.');
        this.memberSearchResults.set([]);
        this.memberSearchTerm = '';
        this.refreshWorkspaceLists(this.selectedFile()?.fileId || null);
      },
      error: () => this.error.set('Adding the member failed.'),
    });
  }

  protected removeMember(userId: number): void {
    const project = this.project();
    if (!project || !this.canManage()) {
      return;
    }

    this.api.removeProjectMember(project.projectId, userId).subscribe({
      next: () => {
        this.status.set('Member removed from the project.');
        this.refreshWorkspaceLists(this.selectedFile()?.fileId || null);
      },
      error: () => this.error.set('Removing the member failed.'),
    });
  }

  protected userLabel(userId: number): string {
    const user = this.userDirectory()[userId];
    return user ? `${user.fullName || user.username} (@${user.username})` : `User #${userId}`;
  }

  protected repliesFor(commentId: number): Comment[] {
    return this.comments()
      .filter((comment) => comment.parentCommentId === commentId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  protected updateEditorContent(value: string): void {
    if (!this.editorDirty()) {
      this.fileSelectionRequestId++;
    }
    this.editorContent.set(value);
    this.editorDirty.set(true);
  }

  private loadWorkspace(projectId: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.status.set(null);

    const developerFeaturesEnabled = this.canUseDeveloperFeatures();
    forkJoin({
      project: this.api.getProject(projectId),
      permissions: this.api.getProjectPermissions(projectId),
      files: this.api.getProjectFiles(projectId).pipe(catchError(() => of([]))),
      executions: developerFeaturesEnabled
        ? this.api.getExecutionsByProject(projectId).pipe(catchError(() => of([])))
        : of([]),
      sessions: developerFeaturesEnabled ? this.api.getProjectSessions(projectId).pipe(catchError(() => of([]))) : of([]),
      languages: this.api.getSupportedLanguages().pipe(catchError(() => of([]))),
      memberIds: developerFeaturesEnabled ? this.api.getProjectMembers(projectId).pipe(catchError(() => of([]))) : of([]),
    }).subscribe({
      next: ({ project, permissions, files, executions, sessions, languages, memberIds }) => {
        this.project.set(project);
        this.permissions.set(permissions);
        this.files.set(files);
        this.fileSearchResults.set([]);
        this.executions.set([...executions].sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
        this.sessions.set(sessions);
        this.languages.set(languages);
        this.memberIds.set(memberIds);
        this.loadUserProfiles([project.ownerId, ...memberIds]);
        this.restrictGuestView();
        this.syncSessionPolling(null);

        const firstCodeFile = files.find((file) => !!file.language);
        if (firstCodeFile) {
          this.selectFile(firstCodeFile);
        } else {
          this.selectedFile.set(null);
        }

        this.loading.set(false);
      },
      error: () => {
        this.error.set('The workspace could not be loaded from the backend.');
        this.loading.set(false);
      },
    });
  }

  private refreshWorkspaceLists(preferredFileId: number | null): void {
    const projectId = this.project()?.projectId;
    if (!projectId) {
      return;
    }

    const developerFeaturesEnabled = this.canUseDeveloperFeatures();
    forkJoin({
      project: this.api.getProject(projectId),
      permissions: this.api.getProjectPermissions(projectId),
      files: this.api.getProjectFiles(projectId).pipe(catchError(() => of([]))),
      executions: developerFeaturesEnabled
        ? this.api.getExecutionsByProject(projectId).pipe(catchError(() => of([])))
        : of([]),
      sessions: developerFeaturesEnabled ? this.api.getProjectSessions(projectId).pipe(catchError(() => of([]))) : of([]),
      memberIds: developerFeaturesEnabled ? this.api.getProjectMembers(projectId).pipe(catchError(() => of([]))) : of([]),
    }).subscribe({
      next: ({ project, permissions, files, executions, sessions, memberIds }) => {
        this.project.set(project);
        this.permissions.set(permissions);
        this.files.set(files);
        this.fileSearchResults.set([]);
        this.executions.set([...executions].sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
        this.sessions.set(sessions);
        this.memberIds.set(memberIds);
        this.loadUserProfiles([project.ownerId, ...memberIds]);
        this.restrictGuestView();

        const desiredFile =
          (preferredFileId && files.find((file) => file.fileId === preferredFileId)) ||
          files.find((file) => !!file.language) ||
          null;

        if (desiredFile) {
          this.selectFile(desiredFile, this.preserveSelectionState);
        } else {
          this.syncSessionPolling(null);
        }
      },
    });
  }

  private loadParticipants(sessionId: string): void {
    this.api.getSessionParticipants(sessionId).subscribe({
      next: (participants) => {
        this.participants.set(participants);
        this.loadUserProfiles(participants.map((participant) => participant.userId));
      },
      error: () => {
        this.participants.set([]);
      },
    });
  }

  private loadUserProfiles(userIds: number[]): void {
    const missingIds = [...new Set(userIds.filter((id) => id && !this.userDirectory()[id]))];
    if (!missingIds.length) {
      return;
    }

    forkJoin(
      missingIds.map((id) =>
        this.api.getUserProfile(id).pipe(
          catchError(() => of(null)),
        ),
      ),
    ).subscribe((results) => {
      const nextDirectory = { ...this.userDirectory() };
      for (const result of results) {
        if (result) {
          nextDirectory[result.userId] = result;
        }
      }
      this.userDirectory.set(nextDirectory);
    });
  }

  private pollExecution(jobId: string): void {
    timer(2000)
      .pipe(
        switchMap(() => this.api.getExecutionResult(jobId)),
        catchError(() => of(null)),
      )
      .subscribe((result) => {
        if (!result) {
          return;
        }
        this.executionResult.set(result);
        this.refreshWorkspaceLists(this.selectedFile()?.fileId || null);
        if (!['COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED'].includes(result.status)) {
          this.pollExecution(jobId);
        }
      });
  }

  private normalizePath(path: string): string {
    return path
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+/, '');
  }

  private restrictGuestView(): void {
    if (!this.canUseDeveloperFeatures() && this.activeView() !== 'editor') {
      this.activeView.set('editor');
    }
  }

  private syncSessionPolling(sessionId: string | null): void {
    if (!sessionId || !this.canUseDeveloperFeatures()) {
      if (this.sessionPollHandle) {
        clearInterval(this.sessionPollHandle);
      }
      this.sessionPollHandle = null;
      this.activePolledSessionId = null;
      return;
    }

    if (this.activePolledSessionId === sessionId && this.sessionPollHandle) {
      return;
    }

    if (this.sessionPollHandle) {
      clearInterval(this.sessionPollHandle);
    }

    this.activePolledSessionId = sessionId;
    this.sessionPollHandle = setInterval(() => {
      const activeSessionId = this.activeSession()?.sessionId;
      if (!activeSessionId || activeSessionId !== sessionId) {
        this.syncSessionPolling(null);
        return;
      }

      this.api.getSessionById(sessionId).pipe(catchError(() => of(null))).subscribe((session) => {
        if (!session) {
          this.activeSession.set(null);
          this.participants.set([]);
          this.syncSessionPolling(null);
          return;
        }

        this.activeSession.set(session);
        this.sessions.update((sessions) => {
          const others = sessions.filter((item) => item.sessionId !== session.sessionId);
          return [session, ...others];
        });
      });

      this.loadParticipants(sessionId);
    }, 3000);
  }

  protected canModifyComment(comment: Comment): boolean {
    const currentUserId = this.currentUser()?.userId;
    return !!currentUserId && (comment.authorId === currentUserId || this.canManage());
  }
}

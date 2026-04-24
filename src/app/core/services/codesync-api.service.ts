import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  AddCommentRequest,
  AuthResponse,
  BulkNotificationRequest,
  BroadcastChangeRequest,
  ChangePasswordRequest,
  CodeFile,
  CollabSession,
  Comment,
  CreateBranchRequest,
  CreateCodeFileRequest,
  CreateFolderRequest,
  CreateSessionRequest,
  CreateSnapshotRequest,
  DiffResponse,
  EmailNotificationRequest,
  ExecutionJob,
  ExecutionResult,
  ExecutionStats,
  FileMoveRequest,
  GatewayInfo,
  JoinSessionRequest,
  CursorUpdateRequest,
  LanguageRequest,
  LoginRequest,
  NotificationItem,
  Participant,
  Project,
  ProjectPermission,
  RegisterRequest,
  RestoreSnapshotRequest,
  SendNotificationRequest,
  Snapshot,
  SubmitExecutionRequest,
  SupportedLanguage,
  UpdateCommentRequest,
  UpdateProfileRequest,
  UserResponse,
  FileTreeNode,
} from '../../shared/models/codesync.models';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CodesyncApiService {
  private readonly http = inject(HttpClient);

  getGatewayInfo(): Observable<GatewayInfo> {
    return this.http.get<GatewayInfo>('/gateway/info');
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/login', request);
  }

  register(request: RegisterRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>('/auth/register', request);
  }

  bootstrapAdmin(request: RegisterRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>('/auth/admin/bootstrap', request);
  }

  logout(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/logout', {});
  }

  refreshToken(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/refresh', {});
  }

  getCurrentProfile(): Observable<UserResponse> {
    return this.http.get<UserResponse>('/auth/profile');
  }

  getUserProfile(userId: number): Observable<UserResponse> {
    return this.http.get<UserResponse>(`/auth/profile/${userId}`);
  }

  updateCurrentProfile(request: UpdateProfileRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>('/auth/profile', request);
  }

  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http.put<void>('/auth/password', request);
  }

  deactivateCurrentAccount(): Observable<void> {
    return this.http.put<void>('/auth/deactivate', {});
  }

  searchUsers(username: string): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>('/auth/search', {
      params: new HttpParams().set('username', username),
    });
  }

  getAllUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>('/auth/users');
  }

  deactivateUser(userId: number): Observable<void> {
    return this.http.put<void>(`/auth/deactivate/${userId}`, {});
  }

  reactivateUser(userId: number): Observable<void> {
    return this.http.put<void>(`/auth/reactivate/${userId}`, {});
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(`/auth/users/${userId}`);
  }

  getPublicProjects(): Observable<Project[]> {
    return this.http.get<Project[]>('/api/v1/projects/public');
  }

  searchProjects(term: string): Observable<Project[]> {
    const params = new HttpParams().set('keyword', term);
    return this.http.get<Project[]>('/api/v1/projects/search', { params });
  }

  getProjectsByOwner(userId: number): Observable<Project[]> {
    return this.http.get<Project[]>(`/api/v1/projects/owner/${userId}`);
  }

  getProjectsByMember(userId: number): Observable<Project[]> {
    return this.http.get<Project[]>(`/api/v1/projects/member/${userId}`);
  }

  getProjectsByLanguage(language: string): Observable<Project[]> {
    return this.http.get<Project[]>(`/api/v1/projects/language/${language}`);
  }

  getProject(projectId: number): Observable<Project> {
    return this.http.get<Project>(`/api/v1/projects/${projectId}`);
  }

  getProjectPermissions(projectId: number): Observable<ProjectPermission> {
    return this.http.get<ProjectPermission>(`/api/v1/projects/${projectId}/permissions`);
  }

  getProjectMembers(projectId: number): Observable<number[]> {
    return this.http.get<number[]>(`/api/v1/projects/${projectId}/members`);
  }

  createProject(project: Partial<Project>): Observable<Project> {
    return this.http.post<Project>('/api/v1/projects', project);
  }

  updateProject(projectId: number, project: Partial<Project>): Observable<Project> {
    return this.http.put<Project>(`/api/v1/projects/${projectId}`, project);
  }

  archiveProject(projectId: number): Observable<void> {
    return this.http.put<void>(`/api/v1/projects/${projectId}/archive`, {});
  }

  deleteProject(projectId: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/projects/${projectId}`);
  }

  starProject(projectId: number): Observable<void> {
    return this.http.put<void>(`/api/v1/projects/${projectId}/star`, {});
  }

  forkProject(projectId: number, userId: number): Observable<Project> {
    return this.http.post<Project>(`/api/v1/projects/${projectId}/fork/${userId}`, {});
  }

  addProjectMember(projectId: number, userId: number): Observable<void> {
    return this.http.post<void>(`/api/v1/projects/${projectId}/members/${userId}`, {});
  }

  removeProjectMember(projectId: number, userId: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/projects/${projectId}/members/${userId}`);
  }

  getAllProjectsAdmin(): Observable<Project[]> {
    return this.http.get<Project[]>('/api/v1/projects/admin/all');
  }

  getProjectFiles(projectId: number): Observable<CodeFile[]> {
    return this.http.get<CodeFile[]>(`/api/v1/files/project/${projectId}`);
  }

  getFileById(fileId: number): Observable<CodeFile> {
    return this.http.get<CodeFile>(`/api/v1/files/${fileId}`);
  }

  getFileTree(projectId: number): Observable<FileTreeNode[]> {
    return this.http.get<FileTreeNode[]>(`/api/v1/files/project/${projectId}/tree`);
  }

  searchProjectFiles(projectId: number, query: string): Observable<CodeFile[]> {
    const params = new HttpParams().set('query', query);
    return this.http.get<CodeFile[]>(`/api/v1/files/project/${projectId}/search`, { params });
  }

  getFileContent(fileId: number): Observable<string> {
    return this.http.get(`/api/v1/files/${fileId}/content`, { responseType: 'text' });
  }

  createFile(request: CreateCodeFileRequest): Observable<CodeFile> {
    return this.http.post<CodeFile>('/api/v1/files', request);
  }

  createFolder(request: CreateFolderRequest): Observable<CodeFile> {
    return this.http.post<CodeFile>('/api/v1/files/folders', request);
  }

  updateFileContent(fileId: number, content: string): Observable<CodeFile> {
    return this.http.put<CodeFile>(`/api/v1/files/${fileId}/content`, { content });
  }

  renameFile(fileId: number, newName: string): Observable<CodeFile> {
    return this.http.put<CodeFile>(`/api/v1/files/${fileId}/rename`, { newName });
  }

  moveFile(fileId: number, request: FileMoveRequest): Observable<CodeFile> {
    return this.http.put<CodeFile>(`/api/v1/files/${fileId}/move`, request);
  }

  deleteFile(fileId: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/files/${fileId}`);
  }

  restoreFile(fileId: number): Observable<void> {
    return this.http.post<void>(`/api/v1/files/${fileId}/restore`, {});
  }

  getCommentsByFile(fileId: number, projectId: number): Observable<Comment[]> {
    const params = new HttpParams().set('projectId', projectId);
    return this.http.get<Comment[]>(`/api/v1/comments/file/${fileId}`, { params });
  }

  addComment(request: AddCommentRequest): Observable<Comment> {
    return this.http.post<Comment>('/api/v1/comments', request);
  }

  getCommentById(commentId: number): Observable<Comment> {
    return this.http.get<Comment>(`/api/v1/comments/${commentId}`);
  }

  getCommentsByProject(projectId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`/api/v1/comments/project/${projectId}`);
  }

  getCommentReplies(commentId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`/api/v1/comments/${commentId}/replies`);
  }

  getCommentsByLine(fileId: number, lineNumber: number, projectId: number): Observable<Comment[]> {
    const params = new HttpParams().set('projectId', projectId);
    return this.http.get<Comment[]>(`/api/v1/comments/file/${fileId}/line/${lineNumber}`, { params });
  }

  getCommentCount(fileId: number, projectId: number): Observable<number> {
    const params = new HttpParams().set('projectId', projectId);
    return this.http.get<number>(`/api/v1/comments/file/${fileId}/count`, { params });
  }

  getCommentsByResolved(projectId: number, resolved: boolean): Observable<Comment[]> {
    const params = new HttpParams()
      .set('projectId', projectId)
      .set('resolved', String(resolved));
    return this.http.get<Comment[]>('/api/v1/comments/resolved', { params });
  }

  updateComment(commentId: number, request: UpdateCommentRequest): Observable<Comment> {
    return this.http.put<Comment>(`/api/v1/comments/${commentId}`, request);
  }

  resolveComment(commentId: number): Observable<Comment> {
    return this.http.put<Comment>(`/api/v1/comments/${commentId}/resolve`, {});
  }

  unresolveComment(commentId: number): Observable<Comment> {
    return this.http.put<Comment>(`/api/v1/comments/${commentId}/unresolve`, {});
  }

  deleteComment(commentId: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/comments/${commentId}`);
  }

  getFileHistory(fileId: number, projectId: number): Observable<Snapshot[]> {
    const params = new HttpParams().set('projectId', projectId);
    return this.http.get<Snapshot[]>(`/api/v1/versions/file/${fileId}/history`, { params });
  }

  createSnapshot(request: CreateSnapshotRequest): Observable<Snapshot> {
    return this.http.post<Snapshot>('/api/v1/versions', request);
  }

  getSnapshotById(snapshotId: number): Observable<Snapshot> {
    return this.http.get<Snapshot>(`/api/v1/versions/${snapshotId}`);
  }

  getSnapshotsByProject(projectId: number): Observable<Snapshot[]> {
    return this.http.get<Snapshot[]>(`/api/v1/versions/project/${projectId}`);
  }

  getSnapshotsByBranch(projectId: number, branch: string): Observable<Snapshot[]> {
    return this.http.get<Snapshot[]>(`/api/v1/versions/project/${projectId}/branch/${branch}`);
  }

  getLatestSnapshot(fileId: number, branch?: string): Observable<Snapshot> {
    const params = branch ? new HttpParams().set('branch', branch) : undefined;
    return this.http.get<Snapshot>(`/api/v1/versions/file/${fileId}/latest`, { params });
  }

  diffSnapshots(fromSnapshotId: number, toSnapshotId: number): Observable<DiffResponse> {
    const params = new HttpParams()
      .set('fromSnapshotId', fromSnapshotId)
      .set('toSnapshotId', toSnapshotId);
    return this.http.get<DiffResponse>('/api/v1/versions/diff', { params });
  }

  restoreSnapshot(snapshotId: number, request: RestoreSnapshotRequest): Observable<Snapshot> {
    return this.http.post<Snapshot>(`/api/v1/versions/${snapshotId}/restore`, request);
  }

  createBranch(request: CreateBranchRequest): Observable<Snapshot> {
    return this.http.post<Snapshot>('/api/v1/versions/branches', request);
  }

  tagSnapshot(snapshotId: number, tag: string): Observable<Snapshot> {
    return this.http.post<Snapshot>(`/api/v1/versions/${snapshotId}/tag`, { tag });
  }

  getExecutionsByProject(projectId: number): Observable<ExecutionJob[]> {
    return this.http.get<ExecutionJob[]>(`/api/v1/executions/projects/${projectId}`);
  }

  submitExecution(request: SubmitExecutionRequest): Observable<ExecutionJob> {
    return this.http.post<ExecutionJob>('/api/v1/executions', request);
  }

  getExecutionJob(jobId: string): Observable<ExecutionJob> {
    return this.http.get<ExecutionJob>(`/api/v1/executions/${jobId}`);
  }

  getExecutionResult(jobId: string): Observable<ExecutionResult> {
    return this.http.get<ExecutionResult>(`/api/v1/executions/${jobId}/result`);
  }

  cancelExecution(jobId: string): Observable<ExecutionJob> {
    return this.http.post<ExecutionJob>(`/api/v1/executions/${jobId}/cancel`, {});
  }

  getMyExecutions(): Observable<ExecutionJob[]> {
    return this.http.get<ExecutionJob[]>('/api/v1/executions/me');
  }

  getExecutionsByUser(userId: number): Observable<ExecutionJob[]> {
    return this.http.get<ExecutionJob[]>(`/api/v1/executions/users/${userId}`);
  }

  getSupportedLanguages(includeDisabled = false): Observable<SupportedLanguage[]> {
    const params = includeDisabled
      ? new HttpParams().set('includeDisabled', 'true')
      : undefined;
    return this.http.get<SupportedLanguage[]>('/api/v1/executions/languages', { params });
  }

  getExecutionStats(): Observable<ExecutionStats> {
    return this.http.get<ExecutionStats>('/api/v1/executions/admin/stats');
  }

  getAdminJobs(): Observable<ExecutionJob[]> {
    return this.http.get<ExecutionJob[]>('/api/v1/executions/admin/jobs');
  }

  setLanguageEnabled(language: string, enabled: boolean): Observable<SupportedLanguage> {
    const params = new HttpParams().set('enabled', enabled);
    return this.http.patch<SupportedLanguage>(
      `/api/v1/executions/languages/${language}/enabled`,
      {},
      { params },
    );
  }

  getLanguageVersion(language: string): Observable<string> {
    return this.http.get(`/api/v1/executions/languages/${language}/version`, { responseType: 'text' });
  }

  createLanguage(request: LanguageRequest): Observable<SupportedLanguage> {
    return this.http.post<SupportedLanguage>('/api/v1/executions/languages', request);
  }

  updateLanguage(language: string, request: LanguageRequest): Observable<SupportedLanguage> {
    return this.http.put<SupportedLanguage>(`/api/v1/executions/languages/${language}`, request);
  }

  getProjectSessions(projectId: number): Observable<CollabSession[]> {
    return this.http.get<CollabSession[]>(`/api/v1/sessions/project/${projectId}`);
  }

  getSessionById(sessionId: string): Observable<CollabSession> {
    return this.http.get<CollabSession>(`/api/v1/sessions/${sessionId}`);
  }

  getActiveSessionForFile(fileId: number): Observable<CollabSession> {
    return this.http.get<CollabSession>(`/api/v1/sessions/file/${fileId}/active`);
  }

  createSession(request: CreateSessionRequest): Observable<CollabSession> {
    return this.http.post<CollabSession>('/api/v1/sessions', request);
  }

  joinSession(sessionId: string, request: JoinSessionRequest): Observable<Participant> {
    return this.http.post<Participant>(`/api/v1/sessions/${sessionId}/join`, request);
  }

  leaveSession(sessionId: string): Observable<void> {
    return this.http.post<void>(`/api/v1/sessions/${sessionId}/leave`, {});
  }

  endSession(sessionId: string): Observable<void> {
    return this.http.post<void>(`/api/v1/sessions/${sessionId}/end`, {});
  }

  getSessionParticipants(sessionId: string): Observable<Participant[]> {
    return this.http.get<Participant[]>(`/api/v1/sessions/${sessionId}/participants`);
  }

  updateSessionCursor(sessionId: string, request: CursorUpdateRequest): Observable<Participant> {
    return this.http.put<Participant>(`/api/v1/sessions/${sessionId}/cursor`, request);
  }

  broadcastSessionChange(sessionId: string, request: BroadcastChangeRequest): Observable<CollabSession> {
    return this.http.put<CollabSession>(`/api/v1/sessions/${sessionId}/content`, request);
  }

  kickParticipant(sessionId: string, userId: number): Observable<void> {
    return this.http.post<void>(`/api/v1/sessions/${sessionId}/participants/${userId}/kick`, {});
  }

  getActiveSessionsAdmin(): Observable<CollabSession[]> {
    return this.http.get<CollabSession[]>('/api/v1/sessions/active');
  }

  getNotificationsByRecipient(recipientId: number): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>(`/api/v1/notifications/recipient/${recipientId}`);
  }

  sendNotification(request: SendNotificationRequest): Observable<NotificationItem> {
    return this.http.post<NotificationItem>('/api/v1/notifications', request);
  }

  sendBulkNotifications(request: BulkNotificationRequest): Observable<NotificationItem[]> {
    return this.http.post<NotificationItem[]>('/api/v1/notifications/bulk', {
      ...request,
      recipientIds: [...request.recipientIds],
    });
  }

  sendEmailNotification(request: EmailNotificationRequest): Observable<void> {
    return this.http.post<void>('/api/v1/notifications/email', request);
  }

  getNotificationById(notificationId: number): Observable<NotificationItem> {
    return this.http.get<NotificationItem>(`/api/v1/notifications/${notificationId}`);
  }

  getUnreadNotificationCount(recipientId: number): Observable<{ recipientId: number; unreadCount: number }> {
    return this.http.get<{ recipientId: number; unreadCount: number }>(
      `/api/v1/notifications/recipient/${recipientId}/unread-count`,
    );
  }

  markNotificationRead(notificationId: number): Observable<NotificationItem> {
    return this.http.put<NotificationItem>(`/api/v1/notifications/${notificationId}/read`, {});
  }

  markAllNotificationsRead(recipientId: number): Observable<{ updatedCount: number }> {
    return this.http.put<{ updatedCount: number }>(
      `/api/v1/notifications/recipient/${recipientId}/read-all`,
      {},
    );
  }

  deleteReadNotifications(recipientId: number): Observable<{ deletedCount: number }> {
    return this.http.delete<{ deletedCount: number }>(
      `/api/v1/notifications/recipient/${recipientId}/read`,
    );
  }

  deleteNotification(notificationId: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/notifications/${notificationId}`);
  }

  getAllNotificationsAdmin(): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>('/api/v1/notifications/all');
  }

  getNotificationsByType(type: string): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>(`/api/v1/notifications/type/${type}`);
  }

  getNotificationsByRelatedId(relatedId: string): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>(`/api/v1/notifications/related/${relatedId}`);
  }
}

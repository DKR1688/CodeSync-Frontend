export type Visibility = 'PUBLIC' | 'PRIVATE';
export type UserRole = 'DEVELOPER' | 'ADMIN' | 'GUEST';
export type NotificationType =
  | 'SESSION_INVITE'
  | 'PARTICIPANT_JOINED'
  | 'PARTICIPANT_LEFT'
  | 'COMMENT'
  | 'MENTION'
  | 'SNAPSHOT'
  | 'FORK'
  | 'BROADCAST';
export type ExecutionStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'TIMED_OUT'
  | 'CANCELLED';
export type DiffOperation = 'EQUAL' | 'ADD' | 'REMOVE';

export interface GatewayInfo {
  name: string;
  status: string;
  serviceRoutes: Record<string, string>;
  healthEndpoint: string;
  gatewayRoutesEndpoint: string;
}

export interface AuthResponse {
  token: string | null;
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
}

export interface UpdateProfileRequest {
  username?: string | null;
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RefreshTokenResponse {
  token: string | null;
  message: string;
}

export interface UserResponse {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl: string | null;
  provider: string | null;
  bio: string | null;
  active: boolean;
  createdAt: string;
}

export interface Project {
  projectId: number;
  ownerId: number;
  name: string;
  description: string;
  language: string;
  visibility: Visibility;
  templateId: number | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  starCount: number;
  forkCount: number;
  memberUserIds: number[];
}

export interface ProjectPermission {
  projectId: number;
  canRead: boolean;
  canWrite: boolean;
  canManage: boolean;
  owner: boolean;
  member: boolean;
  admin: boolean;
  archived: boolean;
  visibility: Visibility;
}

export interface CodeFile {
  fileId: number;
  projectId: number;
  name: string;
  path: string;
  language: string | null;
  content: string;
  size: number;
  createdById: number;
  lastEditedBy: number;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  folder?: boolean;
}

export interface CreateCodeFileRequest {
  projectId: number;
  name: string;
  path: string;
  language: string;
  content: string;
  size: number;
}

export interface CreateFolderRequest {
  projectId: number;
  path: string;
}

export interface FileMoveRequest {
  newPath: string;
}

export interface FileTreeNode {
  fileId: number | null;
  name: string;
  path: string;
  folder: boolean;
  language: string | null;
  children: FileTreeNode[];
}

export interface Comment {
  commentId: number;
  projectId: number;
  fileId: number;
  authorId: number;
  content: string;
  lineNumber: number;
  columnNumber: number;
  parentCommentId: number | null;
  resolved: boolean;
  snapshotId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddCommentRequest {
  projectId: number;
  fileId: number;
  content: string;
  lineNumber?: number | null;
  columnNumber?: number | null;
  parentCommentId?: number | null;
  snapshotId?: number | null;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface Snapshot {
  snapshotId: number;
  projectId: number;
  fileId: number;
  authorId: number;
  message: string;
  content: string;
  hash: string;
  parentSnapshotId: number | null;
  branch: string;
  tag: string | null;
  createdAt: string;
}

export interface CreateSnapshotRequest {
  projectId: number;
  fileId: number;
  parentSnapshotId?: number | null;
  content: string;
  message: string;
  branch?: string | null;
}

export interface RestoreSnapshotRequest {
  branch?: string | null;
  message?: string | null;
}

export interface CreateBranchRequest {
  sourceSnapshotId: number;
  branch: string;
  message?: string | null;
}

export interface DiffLine {
  operation: DiffOperation;
  oldLineNumber: number | null;
  newLineNumber: number | null;
  content: string;
}

export interface DiffResponse {
  fromSnapshotId: number;
  toSnapshotId: number;
  fromHash: string;
  toHash: string;
  addedLines: number;
  removedLines: number;
  lines: DiffLine[];
}

export interface ExecutionJob {
  jobId: string;
  projectId: number;
  fileId: number | null;
  userId: number;
  language: string;
  sourceCode: string;
  stdin: string;
  status: ExecutionStatus;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTimeMs: number | null;
  memoryUsedKb: number | null;
  timeLimitSeconds: number;
  memoryLimitMb: number;
  cpuLimit: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface SubmitExecutionRequest {
  projectId: number;
  fileId?: number | null;
  language: string;
  sourceCode: string;
  stdin?: string | null;
  timeLimitSeconds?: number | null;
  memoryLimitMb?: number | null;
  cpuLimit?: number | null;
}

export interface ExecutionResult {
  jobId: string;
  status: ExecutionStatus;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTimeMs: number | null;
  memoryUsedKb: number | null;
  completedAt: string | null;
}

export interface ExecutionStats {
  totalExecutions: number;
  executionsByStatus: Record<string, number>;
  executionsByLanguage: Record<string, number>;
  runningExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  averageExecutionTimeMs: number;
}

export interface SupportedLanguage {
  language: string;
  displayName: string;
  runtimeVersion: string;
  dockerImage: string;
  sourceFileName: string;
  runCommand: string;
  enabled: boolean;
  defaultTimeLimitSeconds: number;
  defaultMemoryLimitMb: number;
  createdAt: string;
  updatedAt: string;
}

export interface LanguageRequest {
  language: string;
  displayName: string;
  runtimeVersion: string;
  dockerImage: string;
  sourceFileName: string;
  runCommand: string;
  enabled: boolean;
  defaultTimeLimitSeconds: number;
  defaultMemoryLimitMb: number;
}

export interface CollabSession {
  sessionId: string;
  projectId: number;
  fileId: number;
  ownerId: number;
  status: string;
  language: string;
  currentContent: string;
  currentRevision: number;
  createdAt: string;
  lastActivityAt: string;
  endedAt: string | null;
  maxParticipants: number;
  passwordProtected: boolean;
  participantCount: number;
}

export interface CreateSessionRequest {
  projectId: number;
  fileId: number;
  maxParticipants?: number;
  password?: string | null;
}

export interface JoinSessionRequest {
  password?: string | null;
  role?: string | null;
}

export interface Participant {
  participantId: number;
  sessionId: string;
  userId: number;
  role: string;
  joinedAt: string;
  leftAt: string | null;
  cursorLine: number;
  cursorCol: number;
  selectionEndLine: number;
  selectionEndCol: number;
  color: string;
  active: boolean;
}

export interface BroadcastChangeRequest {
  baseRevision: number;
  content: string;
  cursorLine?: number | null;
  cursorCol?: number | null;
  selectionEndLine?: number | null;
  selectionEndCol?: number | null;
}

export interface CursorUpdateRequest {
  cursorLine: number;
  cursorCol: number;
  selectionEndLine?: number | null;
  selectionEndCol?: number | null;
}

export interface NotificationItem {
  notificationId: number;
  recipientId: number;
  actorId: number;
  type: string;
  title: string;
  message: string;
  relatedId: string | null;
  relatedType: string | null;
  deepLinkUrl: string | null;
  read: boolean;
  createdAt: string;
}

export interface SendNotificationRequest {
  recipientId: number;
  actorId: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string | null;
  relatedType?: string | null;
  deepLinkUrl?: string | null;
}

export interface BulkNotificationRequest {
  recipientIds: number[];
  actorId: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string | null;
  relatedType?: string | null;
  deepLinkUrl?: string | null;
}

export interface EmailNotificationRequest {
  to: string;
  subject: string;
  body: string;
}

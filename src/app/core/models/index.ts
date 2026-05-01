export type EntityId = string | number;

export interface User {
  userId: EntityId;
  username: string;
  email: string;
  fullName: string;
  role: 'DEVELOPER' | 'ADMIN';
  avatarUrl?: string;
  provider: 'LOCAL' | 'GITHUB' | 'GOOGLE';
  bio?: string;
  active: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  message: string;
}

export interface Project {
  projectId: EntityId;
  ownerId: EntityId;
  name: string;
  description: string;
  language: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  templateId?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  starCount: number;
  forkCount: number;
  memberUserIds: EntityId[];
}

export interface ProjectPermission {
  canRead: boolean;
  canWrite: boolean;
  canManage: boolean;
  owner: boolean;
  member: boolean;
  admin: boolean;
  archived: boolean;
  visibility: 'PUBLIC' | 'PRIVATE';
}

export interface FileTreeNode {
  fileId: EntityId;
  name: string;
  path: string;
  folder: boolean;
  language?: string;
  children?: FileTreeNode[];
}

export interface CodeFile {
  fileId: EntityId;
  projectId: EntityId;
  name: string;
  path: string;
  language?: string;
  content: string;
  size: number;
  createdById: EntityId;
  lastEditedBy: EntityId;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export interface CollabSession {
  sessionId: string;
  projectId: EntityId;
  fileId: EntityId;
  ownerId: EntityId;
  status: 'ACTIVE' | 'ENDED';
  language: string;
  createdAt: string;
  lastActivityAt?: string;
  endedAt?: string;
  maxParticipants: number;
  passwordProtected: boolean;
  participantCount: number;
  currentContent?: string;
  currentRevision?: number;
}

export interface Participant {
  participantId: EntityId;
  sessionId: string;
  userId: EntityId;
  username?: string;
  role: 'HOST' | 'EDITOR' | 'VIEWER';
  joinedAt: string;
  leftAt?: string;
  cursorLine: number;
  cursorCol: number;
  color: string;
  active?: boolean;
}

export interface Snapshot {
  snapshotId: EntityId;
  projectId: EntityId;
  fileId: EntityId;
  authorId: EntityId;
  message: string;
  content: string;
  hash: string;
  parentSnapshotId?: EntityId;
  branch: string;
  tag?: string;
  createdAt: string;
}

export interface Comment {
  commentId: EntityId;
  projectId: EntityId;
  fileId: EntityId;
  authorId: EntityId;
  content: string;
  lineNumber: number;
  columnNumber?: number;
  parentCommentId?: EntityId;
  resolved: boolean;
  snapshotId?: EntityId;
  createdAt: string;
  updatedAt: string;
  author?: User;
  replies?: Comment[];
}

export interface Notification {
  notificationId: EntityId;
  recipientId: EntityId;
  actorId: EntityId;
  type: 'SESSION_INVITE' | 'COMMENT' | 'MENTION' | 'SNAPSHOT' | 'FORK' | 'BROADCAST';
  title: string;
  message: string;
  relatedId: string;
  relatedType: string;
  deepLinkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ExecutionJob {
  jobId: string;
  projectId: EntityId;
  fileId?: EntityId;
  userId: EntityId;
  language: string;
  sourceCode: string;
  stdin?: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMED_OUT' | 'CANCELLED';
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  executionTimeMs?: number;
  memoryUsedKb?: number;
  createdAt: string;
  completedAt?: string;
}

export interface SupportedLanguage {
  id: string;
  name: string;
  version: string;
  dockerImage: string;
  extension: string;
  monacoLanguage: string;
  enabled: boolean;
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

export interface SubmitExecutionRequest {
  projectId: EntityId;
  fileId?: EntityId;
  language: string;
  sourceCode: string;
  stdin?: string;
  timeLimitSeconds?: number;
  memoryLimitMb?: number;
  cpuLimit?: number;
}

export interface DiffResult {
  lines: DiffLine[];
}

export interface DiffLine {
  lineNumber: number;
  content: string;
  type: 'ADDED' | 'REMOVED' | 'UNCHANGED';
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

export interface LanguagePayload {
  language: string;
  displayName: string;
  runtimeVersion: string;
  dockerImage: string;
  sourceFileName: string;
  runCommand: string;
  enabled?: boolean;
  defaultTimeLimitSeconds?: number;
  defaultMemoryLimitMb?: number;
}

export interface ExecutionLanguageRecord {
  language: string;
  displayName: string;
  runtimeVersion: string;
  dockerImage: string;
  sourceFileName: string;
  runCommand: string;
  enabled: boolean;
  defaultTimeLimitSeconds?: number;
  defaultMemoryLimitMb?: number;
}

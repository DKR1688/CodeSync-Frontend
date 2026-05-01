import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CollabSession, EntityId, Participant } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CollaborationService {
  private baseUrl = `${environment.apiUrl}/api/v1/sessions`;

  constructor(private http: HttpClient) {}

  createSession(data: { projectId: EntityId; fileId: EntityId; maxParticipants?: number; password?: string }): Observable<CollabSession> {
    return this.http.post<CollabSession>(this.baseUrl, data);
  }

  getSession(sessionId: string): Observable<CollabSession> {
    return this.http.get<CollabSession>(`${this.baseUrl}/${sessionId}`);
  }

  getProjectSessions(projectId: EntityId): Observable<CollabSession[]> {
    return this.http.get<CollabSession[]>(`${this.baseUrl}/project/${projectId}`);
  }

  getActiveSessionForFile(fileId: EntityId): Observable<CollabSession | null> {
    return this.http.get<CollabSession | null>(`${this.baseUrl}/file/${fileId}/active`);
  }

  joinSession(sessionId: string, data?: { password?: string; role?: 'EDITOR' | 'VIEWER' }): Observable<Participant> {
    return this.http.post<Participant>(`${this.baseUrl}/${sessionId}/join`, data ?? {});
  }

  leaveSession(sessionId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${sessionId}/leave`, {});
  }

  endSession(sessionId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${sessionId}/end`, {});
  }

  getParticipants(sessionId: string): Observable<Participant[]> {
    return this.http.get<Participant[]>(`${this.baseUrl}/${sessionId}/participants`);
  }

  updateCursor(
    sessionId: string,
    data: { cursorLine: number; cursorCol: number; selectionEndLine?: number; selectionEndCol?: number }
  ): Observable<Participant> {
    return this.http.put<Participant>(`${this.baseUrl}/${sessionId}/cursor`, data);
  }

  broadcastChange(
    sessionId: string,
    data: {
      baseRevision: number;
      content: string;
      cursorLine?: number;
      cursorCol?: number;
      selectionEndLine?: number;
      selectionEndCol?: number;
    }
  ): Observable<CollabSession> {
    return this.http.put<CollabSession>(`${this.baseUrl}/${sessionId}/content`, data);
  }

  kickParticipant(sessionId: string, userId: EntityId): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${sessionId}/participants/${userId}/kick`, {});
  }
}

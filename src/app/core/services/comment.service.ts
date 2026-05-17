import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Comment, EntityId } from '../models';
import { environment } from '../../../environments/environment';

export interface AddCommentPayload {
  projectId: EntityId;
  fileId: EntityId;
  content: string;
  lineNumber?: number;
  columnNumber?: number;
  parentCommentId?: EntityId;
  snapshotId?: EntityId;
}

@Injectable({ providedIn: 'root' })
export class CommentService {
  private baseUrl = `${environment.apiUrl}/api/v1/comments`;

  constructor(private http: HttpClient) {}

  addComment(data: AddCommentPayload): Observable<Comment> {
    return this.http.post<Comment>(this.baseUrl, data);
  }

  getByFile(fileId: EntityId, projectId?: EntityId): Observable<Comment[]> {
    const params = projectId === undefined
      ? undefined
      : new HttpParams().set('projectId', String(projectId));
    return this.http.get<Comment[]>(`${this.baseUrl}/file/${fileId}`, { params });
  }

  getByProject(projectId: EntityId): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.baseUrl}/project/${projectId}`);
  }

  getReplies(commentId: EntityId): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.baseUrl}/${commentId}/replies`);
  }

  updateComment(commentId: EntityId, content: string): Observable<Comment> {
    return this.http.put<Comment>(`${this.baseUrl}/${commentId}`, { content });
  }

  deleteComment(commentId: EntityId): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${commentId}`);
  }

  resolveComment(commentId: EntityId): Observable<Comment> {
    return this.http.put<Comment>(`${this.baseUrl}/${commentId}/resolve`, {});
  }

  unresolveComment(commentId: EntityId): Observable<Comment> {
    return this.http.put<Comment>(`${this.baseUrl}/${commentId}/unresolve`, {});
  }
}

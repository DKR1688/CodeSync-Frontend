import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { EntityId, Project, ProjectPermission } from '../models';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private baseUrl = `${environment.apiUrl}/api/v1/projects`;

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  createProject(data: Partial<Project>): Observable<Project> {
    return this.http.post<Project>(this.baseUrl, data);
  }

  getProject(id: EntityId): Observable<Project> {
    return this.http.get<Project>(`${this.baseUrl}/${id}`);
  }

  getPublicProjects(page = 0, size = 12): Observable<Project[]> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Project[]>(`${this.baseUrl}/public`, { params });
  }

  getMyProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/owner/${this.requireCurrentUserId()}`);
  }

  getMemberProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/member/${this.requireCurrentUserId()}`);
  }

  searchProjects(query: string): Observable<Project[]> {
    const params = new HttpParams().set('keyword', query);
    return this.http.get<Project[]>(`${this.baseUrl}/search`, { params });
  }

  getProjectsByLanguage(lang: string): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/language/${lang}`);
  }

  updateProject(id: EntityId, data: Partial<Project>): Observable<Project> {
    return this.http.put<Project>(`${this.baseUrl}/${id}`, data);
  }

  deleteProject(id: EntityId): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  archiveProject(id: EntityId): Observable<Project> {
    return this.http.put<void>(`${this.baseUrl}/${id}/archive`, {}).pipe(
      switchMap(() => this.getProject(id))
    );
  }

  starProject(id: EntityId): Observable<Project> {
    return this.http.put<void>(`${this.baseUrl}/${id}/star`, {}).pipe(
      switchMap(() => this.getProject(id))
    );
  }

  forkProject(id: EntityId): Observable<Project> {
    return this.http.post<Project>(`${this.baseUrl}/${id}/fork/${this.requireCurrentUserId()}`, {});
  }

  getPermissions(id: EntityId): Observable<ProjectPermission> {
    return this.http.get<ProjectPermission>(`${this.baseUrl}/${id}/permissions`);
  }

  getMembers(id: EntityId): Observable<EntityId[]> {
    return this.http.get<EntityId[]>(`${this.baseUrl}/${id}/members`);
  }

  addMember(id: EntityId, userId: EntityId): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/members/${userId}`, {});
  }

  removeMember(id: EntityId, userId: EntityId): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/members/${userId}`);
  }

  private requireCurrentUserId(): string | number {
    const userId = this.auth.getCurrentUserId();
    if (userId == null) {
      throw new Error('Authenticated user is not available yet.');
    }
    return userId;
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { CodeFile, EntityId, FileTreeNode } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FileService {
  private baseUrl = `${environment.apiUrl}/api/v1/files`;

  constructor(private http: HttpClient) {}

  getFileTree(projectId: EntityId): Observable<FileTreeNode[]> {
    return this.http.get<FileTreeNode[]>(`${this.baseUrl}/project/${projectId}/tree`);
  }

  getFile(fileId: EntityId): Observable<CodeFile> {
    return this.http.get<CodeFile>(`${this.baseUrl}/${fileId}`);
  }

  getFileContent(fileId: EntityId): Observable<string> {
    return this.http.get<string>(`${this.baseUrl}/${fileId}/content`);
  }

  createFile(data: { projectId: EntityId; name: string; path: string; language: string; content?: string }): Observable<CodeFile> {
    return this.http.post<CodeFile>(this.baseUrl, data);
  }

  createFolder(data: { projectId: EntityId; name: string; path: string }): Observable<CodeFile> {
    return this.http.post<CodeFile>(`${this.baseUrl}/folders`, {
      projectId: data.projectId,
      path: data.path
    });
  }

  updateContent(fileId: EntityId, content: string): Observable<CodeFile> {
    return this.http.put<CodeFile>(`${this.baseUrl}/${fileId}/content`, { content });
  }

  renameFile(fileId: EntityId, name: string): Observable<CodeFile> {
    return this.http.put<CodeFile>(`${this.baseUrl}/${fileId}/rename`, { newName: name });
  }

  moveFile(fileId: EntityId, path: string): Observable<CodeFile> {
    return this.http.put<CodeFile>(`${this.baseUrl}/${fileId}/move`, { newPath: path });
  }

  deleteFile(fileId: EntityId): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${fileId}`);
  }

  restoreFile(fileId: EntityId): Observable<CodeFile> {
    return this.http.post<void>(`${this.baseUrl}/${fileId}/restore`, {}).pipe(
      switchMap(() => this.getFile(fileId))
    );
  }

  searchInProject(projectId: EntityId, query: string): Observable<CodeFile[]> {
    return this.http.get<CodeFile[]>(`${this.baseUrl}/project/${projectId}/search?query=${encodeURIComponent(query)}`);
  }
}

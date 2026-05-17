import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { DiffResult, EntityId, Snapshot } from '../models';
import { environment } from '../../../environments/environment';

interface VersionDiffResponse {
  lines?: Array<{
    operation: 'ADD' | 'REMOVE' | 'EQUAL';
    oldLineNumber?: number | null;
    newLineNumber?: number | null;
    content: string;
  }>;
}

@Injectable({ providedIn: 'root' })
export class VersionService {
  private baseUrl = `${environment.apiUrl}/api/v1/versions`;

  constructor(private http: HttpClient) {}

  createSnapshot(data: { projectId: EntityId; fileId: EntityId; message: string; content: string; branch?: string }): Observable<Snapshot> {
    return this.http.post<Snapshot>(this.baseUrl, data);
  }

  getSnapshot(id: EntityId): Observable<Snapshot> {
    return this.http.get<Snapshot>(`${this.baseUrl}/${id}`);
  }

  getFileHistory(fileId: EntityId): Observable<Snapshot[]> {
    return this.http.get<Snapshot[]>(`${this.baseUrl}/file/${fileId}/history`);
  }

  getLatestSnapshot(fileId: EntityId): Observable<Snapshot> {
    return this.http.get<Snapshot>(`${this.baseUrl}/file/${fileId}/latest`);
  }

  restoreSnapshot(snapshotId: EntityId): Observable<Snapshot> {
    return this.http.post<Snapshot>(`${this.baseUrl}/${snapshotId}/restore`, {});
  }

  diffSnapshots(id1: EntityId, id2: EntityId): Observable<DiffResult> {
    return this.http
      .get<VersionDiffResponse>(`${this.baseUrl}/diff?fromSnapshotId=${id1}&toSnapshotId=${id2}`)
      .pipe(
        map(response => ({
          lines: (response.lines ?? []).map(line => ({
            lineNumber: line.newLineNumber ?? line.oldLineNumber ?? 0,
            content: line.content,
            type: this.mapDiffOperation(line.operation)
          }))
        }))
      );
  }

  createBranch(sourceSnapshotId: EntityId, name: string, message?: string): Observable<Snapshot> {
    return this.http.post<Snapshot>(`${this.baseUrl}/branches`, {
      sourceSnapshotId,
      branch: name,
      message
    });
  }

  tagSnapshot(snapshotId: EntityId, tag: string): Observable<Snapshot> {
    return this.http.post<Snapshot>(`${this.baseUrl}/${snapshotId}/tag`, { tag });
  }

  private mapDiffOperation(operation: 'ADD' | 'REMOVE' | 'EQUAL'): 'ADDED' | 'REMOVED' | 'UNCHANGED' {
    switch (operation) {
      case 'ADD':
        return 'ADDED';
      case 'REMOVE':
        return 'REMOVED';
      default:
        return 'UNCHANGED';
    }
  }
}

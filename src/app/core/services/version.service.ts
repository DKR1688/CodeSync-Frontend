import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DiffResult, EntityId, Snapshot } from '../models';
import { environment } from '../../../environments/environment';

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
    return this.http.get<DiffResult>(`${this.baseUrl}/diff?fromSnapshotId=${id1}&toSnapshotId=${id2}`);
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
}

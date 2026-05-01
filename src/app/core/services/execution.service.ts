import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ExecutionJob, ExecutionLanguageRecord, ExecutionStats, LanguagePayload, SupportedLanguage, SubmitExecutionRequest } from '../models';
import { environment } from '../../../environments/environment';

type ApiSupportedLanguage = {
  language: string;
  displayName: string;
  runtimeVersion: string;
  dockerImage: string;
  sourceFileName: string;
  enabled: boolean;
};

@Injectable({ providedIn: 'root' })
export class ExecutionService {
  private baseUrl = `${environment.apiUrl}/api/v1/executions`;

  constructor(private http: HttpClient) {}

  submit(req: SubmitExecutionRequest): Observable<ExecutionJob> {
    return this.http.post<ExecutionJob>(this.baseUrl, req);
  }

  getJob(jobId: string): Observable<ExecutionJob> {
    return this.http.get<ExecutionJob>(`${this.baseUrl}/${jobId}`);
  }

  cancelJob(jobId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${jobId}/cancel`, {});
  }

  getHistory(projectId?: string): Observable<ExecutionJob[]> {
    const url = projectId ? `${this.baseUrl}/projects/${projectId}` : `${this.baseUrl}/me`;
    return this.http.get<ExecutionJob[]>(url);
  }

  getSupportedLanguages(includeDisabled = false): Observable<SupportedLanguage[]> {
    const suffix = includeDisabled ? '?includeDisabled=true' : '';
    return this.http.get<ApiSupportedLanguage[]>(`${this.baseUrl}/languages${suffix}`).pipe(
      map(languages => languages.map(language => {
        const parts = language.sourceFileName.split('.');
        const extension = parts.length > 1 ? `.${parts.pop()}` : '';
        return {
          id: language.language,
          name: language.displayName,
          version: language.runtimeVersion,
          dockerImage: language.dockerImage,
          extension,
          monacoLanguage: language.language,
          enabled: language.enabled,
        };
      }))
    );
  }

  getStats(): Observable<ExecutionStats> {
    return this.http.get<ExecutionStats>(`${this.baseUrl}/admin/stats`);
  }

  getAllJobs(filters?: { status?: string; language?: string; from?: string; to?: string }): Observable<ExecutionJob[]> {
    let params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.language) params.set('language', filters.language);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    const query = params.toString();
    return this.http.get<ExecutionJob[]>(`${this.baseUrl}/admin/jobs${query ? `?${query}` : ''}`);
  }

  createLanguage(payload: LanguagePayload): Observable<ExecutionLanguageRecord> {
    return this.http.post<ExecutionLanguageRecord>(`${this.baseUrl}/languages`, payload);
  }

  setLanguageEnabled(language: string, enabled: boolean): Observable<ExecutionLanguageRecord> {
    return this.http.patch<ExecutionLanguageRecord>(`${this.baseUrl}/languages/${language}/enabled?enabled=${enabled}`, {});
  }
}

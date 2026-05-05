import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ExecutionService } from './execution.service';

describe('ExecutionService', () => {
  let service: ExecutionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ExecutionService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ExecutionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('maps supported languages into the frontend model', async () => {
    const result = firstValueFrom(service.getSupportedLanguages());

    const request = httpMock.expectOne('http://127.0.0.1:8080/api/v1/executions/languages');
    request.flush([
      {
        language: 'java',
        displayName: 'Java',
        runtimeVersion: '21',
        dockerImage: 'eclipse-temurin:21',
        sourceFileName: 'Main.java',
        enabled: true,
      },
    ]);

    await expect(result).resolves.toEqual([
      {
        id: 'java',
        name: 'Java',
        version: '21',
        dockerImage: 'eclipse-temurin:21',
        extension: '.java',
        monacoLanguage: 'java',
        enabled: true,
      },
    ]);
  });

  it('includes disabled languages when requested', () => {
    service.getSupportedLanguages(true).subscribe();

    const request = httpMock.expectOne('http://127.0.0.1:8080/api/v1/executions/languages?includeDisabled=true');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('builds admin job filters into the query string', () => {
    service.getAllJobs({
      status: 'FAILED',
      language: 'java',
      from: '2026-05-01',
      to: '2026-05-05',
    }).subscribe();

    const request = httpMock.expectOne(
      'http://127.0.0.1:8080/api/v1/executions/admin/jobs?status=FAILED&language=java&from=2026-05-01&to=2026-05-05'
    );
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('toggles language availability with a patch request', () => {
    service.setLanguageEnabled('java', false).subscribe();

    const request = httpMock.expectOne(
      'http://127.0.0.1:8080/api/v1/executions/languages/java/enabled?enabled=false'
    );
    expect(request.request.method).toBe('PATCH');
    request.flush({});
  });
});

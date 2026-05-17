import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { VersionService } from './version.service';

describe('VersionService', () => {
  const versionBaseUrl = `${environment.apiUrl}/api/v1/versions`;
  let service: VersionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [VersionService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(VersionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('creates branches from snapshots', () => {
    service.createBranch(15, 'feature/rabbit', 'Start branch').subscribe();

    const request = httpMock.expectOne(`${versionBaseUrl}/branches`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      sourceSnapshotId: 15,
      branch: 'feature/rabbit',
      message: 'Start branch',
    });
    request.flush({});
  });

  it('diffs snapshots using query parameters', () => {
    service.diffSnapshots(1, 2).subscribe(result => {
      expect(result.lines).toEqual([
        { lineNumber: 7, content: 'added line', type: 'ADDED' },
        { lineNumber: 4, content: 'removed line', type: 'REMOVED' },
        { lineNumber: 9, content: 'same line', type: 'UNCHANGED' },
      ]);
    });

    const request = httpMock.expectOne(`${versionBaseUrl}/diff?fromSnapshotId=1&toSnapshotId=2`);
    expect(request.request.method).toBe('GET');
    request.flush({
      lines: [
        { operation: 'ADD', newLineNumber: 7, content: 'added line' },
        { operation: 'REMOVE', oldLineNumber: 4, content: 'removed line' },
        { operation: 'EQUAL', oldLineNumber: 9, newLineNumber: 9, content: 'same line' },
      ],
    });
  });
});

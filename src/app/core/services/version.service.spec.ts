import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { VersionService } from './version.service';

describe('VersionService', () => {
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

    const request = httpMock.expectOne('http://127.0.0.1:8080/api/v1/versions/branches');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      sourceSnapshotId: 15,
      branch: 'feature/rabbit',
      message: 'Start branch',
    });
    request.flush({});
  });

  it('diffs snapshots using query parameters', () => {
    service.diffSnapshots(1, 2).subscribe();

    const request = httpMock.expectOne('http://127.0.0.1:8080/api/v1/versions/diff?fromSnapshotId=1&toSnapshotId=2');
    expect(request.request.method).toBe('GET');
    request.flush({ lines: [] });
  });
});

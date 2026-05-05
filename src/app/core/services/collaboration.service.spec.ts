import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CollaborationService } from './collaboration.service';

describe('CollaborationService', () => {
  let service: CollaborationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CollaborationService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CollaborationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('joins sessions with an empty body by default', () => {
    service.joinSession('session-1').subscribe();

    const request = httpMock.expectOne('http://127.0.0.1:8080/api/v1/sessions/session-1/join');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({});
  });

  it('broadcasts content updates to the collaboration endpoint', () => {
    const payload = { baseRevision: 3, content: 'next', cursorLine: 2, cursorCol: 5 };

    service.broadcastChange('session-2', payload).subscribe();

    const request = httpMock.expectOne('http://127.0.0.1:8080/api/v1/sessions/session-2/content');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    request.flush({});
  });
});

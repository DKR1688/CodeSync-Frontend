import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CollaborationService } from './collaboration.service';

describe('CollaborationService', () => {
  const collaborationBaseUrl = `${environment.apiUrl}/api/v1/sessions`;
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

    const request = httpMock.expectOne(`${collaborationBaseUrl}/session-1/join`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({});
  });

  it('broadcasts content updates to the collaboration endpoint', () => {
    const payload = { baseRevision: 3, content: 'next', cursorLine: 2, cursorCol: 5 };

    service.broadcastChange('session-2', payload).subscribe();

    const request = httpMock.expectOne(`${collaborationBaseUrl}/session-2/content`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    request.flush({});
  });

  it('times out stalled collaboration requests', async () => {
    jest.useFakeTimers();

    const result = firstValueFrom(service.createSession({ projectId: 6, fileId: 2 }));
    httpMock.expectOne(collaborationBaseUrl);

    jest.advanceTimersByTime(15001);

    await expect(result).rejects.toMatchObject({ name: 'TimeoutError' });
    jest.useRealTimers();
  });
});

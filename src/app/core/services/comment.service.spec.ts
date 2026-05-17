import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CommentService } from './comment.service';

describe('CommentService', () => {
  const commentBaseUrl = `${environment.apiUrl}/api/v1/comments`;
  let service: CommentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CommentService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CommentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads replies for a comment', () => {
    service.getReplies(14).subscribe();

    const request = httpMock.expectOne(`${commentBaseUrl}/14/replies`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('resolves and unresolves comments', () => {
    service.resolveComment(3).subscribe();
    service.unresolveComment(3).subscribe();

    const resolveRequest = httpMock.expectOne(`${commentBaseUrl}/3/resolve`);
    expect(resolveRequest.request.method).toBe('PUT');
    resolveRequest.flush({});

    const unresolveRequest = httpMock.expectOne(`${commentBaseUrl}/3/unresolve`);
    expect(unresolveRequest.request.method).toBe('PUT');
    unresolveRequest.flush({});
  });

  it('passes the project id when loading comments for a file', () => {
    service.getByFile(20, 8).subscribe();

    const request = httpMock.expectOne(`${commentBaseUrl}/file/20?projectId=8`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });
});

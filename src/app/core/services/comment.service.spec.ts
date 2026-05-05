import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CommentService } from './comment.service';

describe('CommentService', () => {
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

    const request = httpMock.expectOne('http://127.0.0.1:8080/api/v1/comments/14/replies');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('resolves and unresolves comments', () => {
    service.resolveComment(3).subscribe();
    service.unresolveComment(3).subscribe();

    const resolveRequest = httpMock.expectOne('http://127.0.0.1:8080/api/v1/comments/3/resolve');
    expect(resolveRequest.request.method).toBe('PUT');
    resolveRequest.flush({});

    const unresolveRequest = httpMock.expectOne('http://127.0.0.1:8080/api/v1/comments/3/unresolve');
    expect(unresolveRequest.request.method).toBe('PUT');
    unresolveRequest.flush({});
  });
});

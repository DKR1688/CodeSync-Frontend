import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { ProjectService } from './project.service';

describe('ProjectService', () => {
  const projectBaseUrl = `${environment.apiUrl}/api/v1/projects`;
  let service: ProjectService;
  let httpMock: HttpTestingController;
  let authService: { getCurrentUserId: jest.Mock };

  beforeEach(() => {
    authService = { getCurrentUserId: jest.fn().mockReturnValue(11) };

    TestBed.configureTestingModule({
      providers: [
        ProjectService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(ProjectService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('creates a project', async () => {
    const result = firstValueFrom(service.createProject({ name: 'CodeSync' }));

    const request = httpMock.expectOne(projectBaseUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'CodeSync' });
    request.flush({ projectId: 1, name: 'CodeSync' });

    await expect(result).resolves.toEqual({ projectId: 1, name: 'CodeSync' });
  });

  it('uses the current user id for owner and member project queries', () => {
    service.getMyProjects().subscribe();
    service.getMemberProjects().subscribe();

    const ownerRequest = httpMock.expectOne(`${projectBaseUrl}/owner/11`);
    expect(ownerRequest.request.method).toBe('GET');
    ownerRequest.flush([]);

    const memberRequest = httpMock.expectOne(`${projectBaseUrl}/member/11`);
    expect(memberRequest.request.method).toBe('GET');
    memberRequest.flush([]);
  });

  it('throws when a user-scoped action runs without an authenticated user', () => {
    authService.getCurrentUserId.mockReturnValue(null);

    expect(() => service.getMyProjects()).toThrow('Authenticated user is not available yet.');
    expect(() => service.forkProject(3)).toThrow('Authenticated user is not available yet.');
  });

  it('archives and reloads the project', async () => {
    const result = firstValueFrom(service.archiveProject(4));

    const archiveRequest = httpMock.expectOne(`${projectBaseUrl}/4/archive`);
    expect(archiveRequest.request.method).toBe('PUT');
    archiveRequest.flush({});

    const reloadRequest = httpMock.expectOne(`${projectBaseUrl}/4`);
    reloadRequest.flush({ projectId: 4, isArchived: true });

    await expect(result).resolves.toEqual({ projectId: 4, isArchived: true });
  });

  it('stars and reloads the project', async () => {
    const result = firstValueFrom(service.starProject(6));

    const starRequest = httpMock.expectOne(`${projectBaseUrl}/6/star`);
    expect(starRequest.request.method).toBe('PUT');
    starRequest.flush({});

    const reloadRequest = httpMock.expectOne(`${projectBaseUrl}/6`);
    reloadRequest.flush({ projectId: 6, starCount: 9 });

    await expect(result).resolves.toEqual({ projectId: 6, starCount: 9 });
  });
});

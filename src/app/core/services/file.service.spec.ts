import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FileService } from './file.service';

describe('FileService', () => {
  const fileBaseUrl = `${environment.apiUrl}/api/v1/files`;
  let service: FileService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FileService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(FileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('creates folders through the folder endpoint', () => {
    service.createFolder({ projectId: 8, name: 'src', path: 'src' }).subscribe();

    const request = httpMock.expectOne(`${fileBaseUrl}/folders`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ projectId: 8, path: 'src' });
    request.flush({});
  });

  it('restores a file and reloads it', async () => {
    const result = firstValueFrom(service.restoreFile(2));

    const restoreRequest = httpMock.expectOne(`${fileBaseUrl}/2/restore`);
    expect(restoreRequest.request.method).toBe('POST');
    restoreRequest.flush({});

    const reloadRequest = httpMock.expectOne(`${fileBaseUrl}/2`);
    reloadRequest.flush({ fileId: 2, name: 'main.ts' });

    await expect(result).resolves.toEqual({ fileId: 2, name: 'main.ts' });
  });

  it('encodes project search queries', () => {
    service.searchInProject(4, 'class Main()').subscribe();

    const request = httpMock.expectOne(`${fileBaseUrl}/project/4/search?query=class%20Main()`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });
});

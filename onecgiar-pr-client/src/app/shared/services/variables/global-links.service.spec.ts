import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { GlobalLinksService } from './global-links.service';
import { ApiService } from '../api/api.service'; // Replace 'path/to/api.service' with the actual path to your ApiService
import { of } from 'rxjs';

describe('GlobalLinksService', () => {
  let service: GlobalLinksService;
  let apiService: ApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService],
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(GlobalLinksService);
    apiService = TestBed.inject(ApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call getInfo method and populate links', () => {
    const mockResponse = [
      { name: 'link1', value: 'https://example.com/link1' },
      { name: 'link2', value: 'https://example.com/link2' }
    ];

    jest.spyOn(apiService.resultsSE, 'GET_platformGlobalVariablesByCategoryId').mockReturnValue(of({ response: mockResponse }));

    service.getInfo();

    expect(apiService.resultsSE.GET_platformGlobalVariablesByCategoryId).toHaveBeenCalledWith(3);
    expect(service.links).toEqual({
      link1: 'https://example.com/link1',
      link2: 'https://example.com/link2'
    });
  });
});

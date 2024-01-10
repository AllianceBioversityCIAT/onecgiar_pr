import { TestBed } from '@angular/core/testing';
import { TocApiService } from './toc-api.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

describe('TocApiService', () => {
  let service: TocApiService;
  let httpMock: HttpTestingController;
  const mockResponse = {
    response: [
      {
        wp_short_name: 'WP1',
        title: 'Title 1'
      }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TocApiService],
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(TocApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('GET_AllTocLevels', () => {
    it('should call GET_AllTocLevels and return expected data', (done) => {
      const mockResponse = {};

      service.GET_AllTocLevels().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}level/get/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_tocLevelsByresultId', () => {
    it('should call GET_tocLevelsByresultId and map response correctly', (done) => {
      const initiativeId = 'initiativeId';
      const levelId = 'levelId';

      service.GET_tocLevelsByresultId(initiativeId, levelId).subscribe(result => {
        expect(result).toEqual({
          response: [
            {
              extraInformation: "<strong>WP1</strong> <br> <div class=\"select_item_description\">Title 1</div>",
              title: "Title 1",
              wp_short_name: "WP1"
            }
          ]
        });
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}result/get/all/initiative/${initiativeId}/level/${levelId}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_tocLevelsByconfig', () => {
    it('should call GET_tocLevelsByconfig and map response correctly', (done) => {
      const initiativeId = 'initiativeId';
      const levelId = 'levelId';
      const result_id = 'result_id'

      service.GET_tocLevelsByconfig(result_id, initiativeId, levelId).subscribe(result => {
        expect(result).toEqual(
          {
            response: [
              {
                extraInformation: "<strong>WP1</strong> <br> <div class=\"select_item_description\">Title 1</div>",
                title: "Title 1",
                wp_short_name: "WP1"
              }
            ]
          });
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}result/${result_id}/initiative/${initiativeId}/level/${levelId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('GET_fullInitiativeToc', () => {
    it('should call GET_fullInitiativeToc and return expected data', (done) => {
      const mockResponse = {};
      const resultId = 'resultId';

      service.GET_fullInitiativeToc(resultId).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}result/get/full-initiative-toc/result/${resultId}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_fullInitiativeTocByinitId', () => {
    it('should call GET_fullInitiativeTocByinitId and return expected data', (done) => {
      const mockResponse = {};
      const initiativeId = 'initiativeId';

      service.GET_fullInitiativeTocByinitId(initiativeId).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}result/get/full-initiative-toc/initiative/${initiativeId}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });
});

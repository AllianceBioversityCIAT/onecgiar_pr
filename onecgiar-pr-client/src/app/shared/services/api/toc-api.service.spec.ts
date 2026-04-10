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
    it('should call GET_AllTocLevels and return expected data', done => {
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

  describe('GET_AllTocLevels with isP25 parameter', () => {
    it('should call GET_AllTocLevels with isP25=true and use v2 endpoint', done => {
      const mockResponse = {};

      service.GET_AllTocLevels(true).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrlV2}level/get/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_tocLevelsByconfig', () => {
    it('should call GET_tocLevelsByconfig and map response correctly', done => {
      const initiativeId = 'initiativeId';
      const levelId = 'levelId';
      const result_id = 'result_id';

      service.GET_tocLevelsByconfig(result_id, initiativeId, levelId).subscribe(result => {
        expect(result).toEqual({
          response: [
            {
              extraInformation: '<strong>WP1</strong> <br> <div class="select_item_description">Title 1</div>',
              title: 'Title 1',
              wp_short_name: 'WP1'
            }
          ]
        });
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}result/${result_id}/initiative/${initiativeId}/level/${levelId}?planned=false`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should call GET_tocLevelsByconfig with isP25=true and use v2 endpoint', done => {
      const initiativeId = 'initiativeId';
      const levelId = 'levelId';
      const result_id = 'result_id';

      service.GET_tocLevelsByconfig(result_id, initiativeId, levelId, true).subscribe(result => {
        expect(result).toEqual({
          response: [
            {
              extraInformation: '<strong>WP1</strong> <br> <div class="select_item_description">Title 1</div>',
              title: 'Title 1',
              wp_short_name: 'WP1'
            }
          ]
        });
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrlV2}result/${result_id}/initiative/${initiativeId}/level/${levelId}?planned=false`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('GET_fullInitiativeToc', () => {
    it('should call GET_fullInitiativeToc and return expected data', done => {
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
    it('should call GET_fullInitiativeTocByinitId and return expected data', done => {
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

  describe('GET_tocLevelsByconfig - branch coverage', () => {
    it('should handle innovation with empty wp_short_name (falsy wpLabel branch)', done => {
      const responseWithEmptyWp = {
        response: [
          {
            wp_short_name: null,
            title: 'Some Title'
          }
        ]
      };

      service.GET_tocLevelsByconfig('r1', 'i1', 'l1').subscribe(result => {
        expect(result.response[0].extraInformation).toBe(
          '<div class="select_item_description">Some Title</div>'
        );
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}result/r1/initiative/i1/level/l1?planned=false`);
      req.flush(responseWithEmptyWp);
    });

    it('should handle innovation with empty string wp_short_name (falsy wpLabel)', done => {
      const responseWithEmptyString = {
        response: [
          {
            wp_short_name: '',
            title: 'Title Only'
          }
        ]
      };

      service.GET_tocLevelsByconfig('r1', 'i1', 'l1').subscribe(result => {
        expect(result.response[0].extraInformation).toBe(
          '<div class="select_item_description">Title Only</div>'
        );
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}result/r1/initiative/i1/level/l1?planned=false`);
      req.flush(responseWithEmptyString);
    });

    it('should handle innovation with null title (title ?? empty string)', done => {
      const responseWithNullTitle = {
        response: [
          {
            wp_short_name: 'WP2',
            title: null
          }
        ]
      };

      service.GET_tocLevelsByconfig('r1', 'i1', 'l1').subscribe(result => {
        expect(result.response[0].extraInformation).toBe(
          '<strong>WP2</strong> <br> <div class="select_item_description"></div>'
        );
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}result/r1/initiative/i1/level/l1?planned=false`);
      req.flush(responseWithNullTitle);
    });

    it('should pass isPlanned=true as query param when isPlanned is true', done => {
      service.GET_tocLevelsByconfig('r1', 'i1', 'l1', false, true).subscribe(result => {
        expect(result).toBeTruthy();
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}result/r1/initiative/i1/level/l1?planned=true`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should pass isPlanned=false as query param when isPlanned is undefined', done => {
      service.GET_tocLevelsByconfig('r1', 'i1', 'l1', false, undefined).subscribe(result => {
        expect(result).toBeTruthy();
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}result/r1/initiative/i1/level/l1?planned=false`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });
});

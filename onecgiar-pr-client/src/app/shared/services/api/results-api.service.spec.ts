import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ResultsApiService } from './results-api.service';
import { environment } from '../../../../environments/environment';
import { SaveButtonService } from '../../../custom-fields/save-button/save-button.service';
import { resultToResultInterfaceToc } from '../../../../app/pages/results/pages/result-detail/pages/rd-theory-of-change/model/theoryOfChangeBody';
import { jest } from '@jest/globals';
import { HttpHeaders, HttpResponse } from '@angular/common/http';

describe('ResultsApiService', () => {
  let service: ResultsApiService;

  let httpMock: HttpTestingController;
  let mockResponse: any;
  const mockSaveButtonService = {
    isCreatingPipe: jest.fn().mockReturnValue(observable => observable),
    isGettingSectionPipe: jest.fn().mockReturnValue(observable => observable),
    isSavingPipe: jest.fn().mockReturnValue(observable => observable),
    showSaveSpinner: jest.fn(),
    isSavingPipeNextStep: jest.fn().mockReturnValue(observable => observable)
  };
  beforeEach(() => {
    mockResponse = {
      response: [
        {
          id: '1'
        }
      ]
    };
    TestBed.configureTestingModule({
      providers: [{ provide: SaveButtonService, useValue: mockSaveButtonService }, ResultsApiService],
      imports: [HttpClientTestingModule]
    });

    service = TestBed.inject(ResultsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('GET_AllResultLevel', () => {
    it('should call GET_AllResultLevel and return expected data', done => {
      service.GET_AllResultLevel().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}levels/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_TypeByResultLevel', () => {
    it('should call GET_TypeByResultLevel and return expected data', done => {
      service.GET_TypeByResultLevel().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}type-by-level/get/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_AllResults', () => {
    it('should call GET_AllResults and return expected data', done => {
      service.GET_AllResults().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}get/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_AllResultsWithUseRole', () => {
    it('should call GET_AllResultsWithUseRole and map response correctly', done => {
      const userId = 'userId';
      mockResponse = {
        response: [
          {
            id: '1',
            result_code: '1001',
            create_last_name: 'Doe',
            create_first_name: 'John'
          }
        ]
      };

      service.GET_AllResultsWithUseRole(userId).subscribe(result => {
        expect(result).toEqual({
          response: [
            {
              id: 1,
              result_code: 1001,
              full_name: 'Doe John',
              create_first_name: 'John',
              create_last_name: 'Doe'
            }
          ]
        });
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}get/all/roles/${userId}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('PATCH_DeleteResult', () => {
    it('should call PATCH_DeleteResult and send a DELETE request', done => {
      mockResponse = {
        response: {
          status: 200
        }
      };
      const resultIdToDelete = '123';

      service.PATCH_DeleteResult(resultIdToDelete).subscribe(result => {
        expect(result).toBeTruthy();
        done();
      });

      const req = httpMock.expectOne(`${service.baseApiBaseUrl}manage-data/result/${resultIdToDelete}/delete`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });
  });

  describe('GET_FindResultsElastic', () => {
    it('should call GET_FindResultsElastic, send a POST request and map response correctly when search and type exists', done => {
      const search = 'search';
      const type = 'type';
      mockResponse = {
        hits: {
          hits: [
            {
              _score: 0.8,
              _id: 'id',
              _index: 'index',
              _source: {
                id: 'id',
                title: 'title',
                description: 'description',
                crp: 'crp',
                countries: 'countries',
                regions: 'regions',
                year: 2023,
                type: 'type',
                is_legacy: 'is_legacy'
              }
            }
          ],
          total: undefined,
          max_score: 0
        },
        took: 0,
        timed_out: false,
        _shards: undefined
      };

      service.GET_FindResultsElastic(search, type).subscribe(results => {
        expect(results.length).toBeGreaterThanOrEqual(0);
        if (results.length > 0) {
          expect(results[0].probability).toEqual(mockResponse.hits.hits[0]._score);
          expect(results[0]).toEqual({ probability: mockResponse.hits.hits[0]._score, ...mockResponse.hits.hits[0]._source });
        }
        done();
      });

      const req = httpMock.expectOne(`${environment.elastic.baseUrl}`);
      expect(req.request.method).toBe('POST');

      req.flush(mockResponse);
    });

    it('should call GET_FindResultsElastic, send a POST request, search and types are not received as parameters, and response hits.hits should not be in the response', done => {
      service.GET_FindResultsElastic().subscribe(results => {
        expect(results).toBeTruthy();
        expect(results).toEqual([]);
        done();
      });

      const req = httpMock.expectOne(`${environment.elastic.baseUrl}`);
      expect(req.request.method).toBe('POST');

      req.flush(mockResponse);
    });
  });

  describe('POST_resultCreateHeader', () => {
    it('should call POST_resultCreateHeader, send a POST request and should call isCreatingPipe', done => {
      const mockBody = {
        initiative_id: 0,
        result_type_id: 0,
        result_name: '',
        result_level_id: '',
        handler: ''
      };
      const spy = jest.spyOn(mockSaveButtonService, 'isCreatingPipe');

      service.POST_resultCreateHeader(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}create/header`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GET_allGenderTag', () => {
    it('should call GET_allGenderTag and map response correctly', done => {
      mockResponse = {
        response: [{ id: 2, title: 'title' }]
      };

      service.GET_allGenderTag().subscribe(result => {
        expect(result).toEqual({
          response: [{ id: 2, full_name: '(1) title', title: 'title' }]
        });
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}gender-tag-levels/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_newInstitutionTypes', () => {
    it('should call GET_newInstitutionTypes and return expected data', done => {
      service.GET_newInstitutionTypes().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}get/institutions-type/new`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_legacyInstitutionTypes', () => {
    it('should call GET_legacyInstitutionTypes and return expected data', done => {
      service.GET_legacyInstitutionTypes().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}get/institutions-type/legacy`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_allInstitutionTypes', () => {
    it('should call GET_allInstitutionTypes and return expected data', done => {
      service.GET_allInstitutionTypes().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}get/institutions-type/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_allChildlessInstitutionTypes', () => {
    it('should call GET_allChildlessInstitutionTypes and return expected data', done => {
      service.GET_allChildlessInstitutionTypes().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}get/institutions-type/childless`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_allInstitutions', () => {
    it('should call GET_allInstitutions and map response correctly', done => {
      mockResponse = {
        response: [
          {
            institutions_id: 1,
            institutions_acronym: 'ABC',
            institutions_name: 'institutions_name',
            headquarter_name: 'HQ'
          }
        ]
      };
      service.GET_allInstitutions().subscribe(response => {
        expect(response).toEqual({
          response: [
            {
              institutions_id: 1,
              institutions_acronym: 'ABC',
              institutions_name: 'institutions_name',
              headquarter_name: 'HQ',
              full_name: '(Id:1) <strong>ABC</strong>  -  institutions_name - HQ'
            }
          ]
        });
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}get/institutions/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });

    it('should call GET_allInstitutions and map response correctly when institutions_acronym is not in the response', done => {
      mockResponse = {
        response: [
          {
            institutions_id: 1,
            institutions_name: 'institutions_name',
            headquarter_name: 'HQ'
          }
        ]
      };
      service.GET_allInstitutions().subscribe(response => {
        expect(response).toEqual({
          response: [
            {
              institutions_id: 1,
              institutions_name: 'institutions_name',
              headquarter_name: 'HQ',
              full_name: '(Id:1) <strong></strong>  institutions_name - HQ'
            }
          ]
        });
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}get/institutions/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_generalInformationByResultId', () => {
    it('should call GET_generalInformationByResultId, return expected data and should call isGettingSectionPipe', done => {
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');
      service.GET_generalInformationByResultId().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}get/general-information/result/${service.currentResultId}`);
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('PATCH_generalInformation', () => {
    it('should call PATCH_generalInformation, return expected data and should call isGettingSectionPipe and isSavingPipe', done => {
      const mockBody = {
        result_type_name: 'result_type_name',
        result_level_name: 'result_level_name',
        result_id: 1,
        initiative_id: 1,
        result_type_id: 1,
        result_level_id: 1,
        result_name: 'result_name',
        result_description: 'result_description',
        gender_tag_id: 1,
        climate_change_tag_id: 1,
        institutions: [],
        institutions_type: [],
        krs_url: 'krs_url',
        is_krs: false,
        reporting_year: '2023',
        lead_contact_person: 'lead_contact_person',
        nutrition_tag_level_id: 1,
        environmental_biodiversity_tag_level_id: 1,
        poverty_tag_level_id: 1,
        is_discontinued: false,
        discontinued_options: [],
        is_replicated: false,
        result_code: 200
      };
      const spyShowSaveSpinner = jest.spyOn(mockSaveButtonService, 'showSaveSpinner');
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipe');

      service.PATCH_generalInformation(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}create/general-information`);
      expect(req.request.method).toBe('PATCH');
      expect(spy).toHaveBeenCalled();
      expect(spyShowSaveSpinner).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GET_resultById', () => {
    it('should call GET_resultById and return expected data', done => {
      service.GET_resultById().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}get/${service.currentResultId}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_depthSearch', () => {
    it('should call GET_depthSearch and return expected data', done => {
      const title = 'title';
      service.GET_depthSearch(title).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}get/depth-search/${title}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_ostMeliaStudiesByResultId', () => {
    it('should call GET_ostMeliaStudiesByResultId and return expected data', done => {
      service.GET_ostMeliaStudiesByResultId().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}melia-studies/get/all/result/${service.currentResultId}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('PATCH_partnersSection', () => {
    it('should call PATCH_partnersSection, return expected data and should call isSavingPipe', done => {
      const mockBody = {
        no_applicable_partner: false,
        mqap_institutions: [],
        institutions: []
      };
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipe');

      service.PATCH_partnersSection(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}results-by-institutions/create/partners/${service.currentResultId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('PATCH_knowledgeProductSection', () => {
    it('should call PATCH_knowledgeProductSection, return expected data should call isSavingPipe', done => {
      const mockBody = {
        isMeliaProduct: false,
        ostSubmitted: false,
        ostMeliaId: 1,
        clarisaMeliaTypeId: 1
      };
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipe');

      service.PATCH_knowledgeProductSection(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}results-knowledge-products/upsert/${service.currentResultId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GET_partnersSection', () => {
    it('should call GET_partnersSection, map response correctly and should call isGettingSectionPipe', done => {
      mockResponse = {
        response: {
          mqap_institutions: [
            {
              user_matched_institution: {
                deliveries: null
              }
            }
          ]
        }
      };

      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');

      service.GET_partnersSection().subscribe(response => {
        expect(response).toEqual({
          response: {
            mqap_institutions: [
              {
                user_matched_institution: {
                  deliveries: [3]
                }
              }
            ]
          }
        });
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}results-by-institutions/partners/result/${service.currentResultId}`);
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GET_AllPrmsGeographicScope', () => {
    it('should call GET_AllPrmsGeographicScope and return expected data', done => {
      service.GET_AllPrmsGeographicScope().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}clarisa/geographic-scope/get/all/prms`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_ClarisaQaToken', () => {
    it('should call GET_ClarisaQaToken and return expected data', done => {
      const offcial_code = 1;
      service.GET_ClarisaQaToken(offcial_code).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/clarisa/qa/token/${offcial_code}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_AllCLARISARegions', () => {
    it('should call GET_AllCLARISARegions and return expected data', done => {
      service.GET_AllCLARISARegions().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}clarisa/regions/get/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('POST_partnerRequest', () => {
    it('should call POST_partnerRequest and return expected data', done => {
      const mockBody = {
        name: 'name',
        acronym: 'ABC',
        institutionTypeCode: 'type',
        hqCountryIso: 'iso',
        websiteLink: 'link',
        externalUserMail: 'mail@mail.com',
        externalUserName: 'name',
        externalUserComments: 'comments'
      };
      service.POST_partnerRequest(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const expectedUrl = `${environment.apiBaseUrl}api/clarisa/partner-request/${service.currentResultId}`;

      const req = httpMock.expectOne(expectedUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockBody);

      req.flush(mockResponse);
    });

    it('should call POST_partnerRequest,return expected data when ipsrDataControlSE.inIpsr exists', done => {
      const mockBody = {
        name: 'name',
        acronym: 'ABC',
        institutionTypeCode: 'type',
        hqCountryIso: 'iso',
        websiteLink: 'link',
        externalUserMail: 'mail@mail.com',
        externalUserName: 'name',
        externalUserComments: 'comments'
      };
      service.ipsrDataControlSE.inIpsr = {};
      service.POST_partnerRequest(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const expectedUrl = `${environment.apiBaseUrl}api/clarisa/partner-request/${service.ipsrDataControlSE.resultInnovationId}`;

      const req = httpMock.expectOne(expectedUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockBody);

      req.flush(mockResponse);
    });
  });

  describe('GET_AllCLARISACountries', () => {
    it('should call GET_AllCLARISACountries and map response correctly', done => {
      mockResponse = {
        response: [
          { iso_alpha_2: 'US', name: 'United States' },
          { iso_alpha_2: 'CA', name: 'Canada' }
        ]
      };
      service.GET_AllCLARISACountries().subscribe(response => {
        expect(response).toEqual({
          response: [
            { iso_alpha_2: 'US', name: 'United States', full_name: 'US - United States' },
            { iso_alpha_2: 'CA', name: 'Canada', full_name: 'CA - Canada' }
          ]
        });
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}clarisa/countries/get/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_AllCLARISACenters', () => {
    it('should call GET_AllCLARISACenters and map response correctly', done => {
      mockResponse = {
        response: [
          {
            code: 'C1',
            acronym: 'ACR1',
            name: 'Center 1'
          }
        ]
      };
      service.GET_AllCLARISACenters().subscribe(response => {
        expect(response).toEqual({
          response: [
            {
              code: 'C1',
              acronym: 'ACR1',
              name: 'Center 1',
              lead_center: 'C1',
              full_name: '<strong>ACR1 - </strong> Center 1'
            }
          ]
        });
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}clarisa/centers/get/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_AllWithoutResults', () => {
    it('should call GET_AllWithoutResults and map response correctly', done => {
      mockResponse = {
        response: [
          {
            official_code: 'IC1',
            short_name: 'Init1',
            name: 'Initiative 1'
          }
        ]
      };
      service.GET_AllWithoutResults().subscribe(response => {
        expect(response).toEqual({
          response: [
            {
              official_code: 'IC1',
              short_name: 'Init1',
              name: 'Initiative 1',
              full_name: 'IC1 - <strong>Init1</strong> - Initiative 1'
            }
          ]
        });
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}clarisa/initiatives/get/all/without/result/${service.currentResultId}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('PATCH_geographicSection', () => {
    it('should call PATCH_geographicSection and return expected data', done => {
      const mockBody = {
        geo_scope_id: 1,
        has_countries: false,
        has_regions: false,
        regions: [],
        countries: []
      };
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipe');
      service.PATCH_geographicSection(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}update/geographic/${service.currentResultId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GET_geographicSection', () => {
    it('should call GET_geographicSection and return expected data', done => {
      service.GET_geographicSection().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}get/geographic/${service.currentResultId}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_resultsLinked', () => {
    it('should call GET_resultsLinked and return expected data when isIpsr is true', done => {
      const isIpsr = true;
      service.GET_resultsLinked(isIpsr).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}linked/get/${service.ipsrDataControlSE.resultInnovationId}`);
      expect(req.request.method).toBe('GET');
      expect(isIpsr).toBeTruthy();

      req.flush(mockResponse);
    });

    it('should call GET_resultsLinked and return expected data when isIpsr is false', done => {
      const isIpsr = false;
      service.GET_resultsLinked(isIpsr).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}linked/get/${service.currentResultId}`);
      expect(req.request.method).toBe('GET');
      expect(isIpsr).toBeFalsy();

      req.flush(mockResponse);
    });
  });

  describe('POST_resultsLinked', () => {
    it('should call POST_resultsLinked and return expected data when isIpsr is true', done => {
      const mockBody = {
        links: [],
        legacy_link: [],
        linkedInnovation: {
          linked_innovation_dev: false,
          linked_innovation_use: false
        }
      };
      const isIpsr = true;
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipe');

      service.POST_resultsLinked(mockBody, isIpsr).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}linked/create/${service.ipsrDataControlSE.resultInnovationId}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockBody);
      expect(isIpsr).toBeTruthy();
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });

    it('should call POST_resultsLinked and return expected data when isIpsr is false', done => {
      const mockBody = {
        links: [],
        legacy_link: [],
        linkedInnovation: {
          linked_innovation_dev: false,
          linked_innovation_use: false
        }
      };
      const isIpsr = false;
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipe');

      service.POST_resultsLinked(mockBody, isIpsr).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}linked/create/${service.currentResultId}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockBody);
      expect(isIpsr).toBeFalsy();
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GET_evidences', () => {
    it('should call GET_evidences and return expected data', done => {
      service.GET_evidences().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}evidences/get/${service.currentResultId}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('POST_evidences', () => {
    it('should call POST_evidences and return expected data', done => {
      const mockBody = {
        result_id: 1,
        evidences: [],
        gender_tag_level: 'Gender',
        climate_change_tag_level: 'Climate Change Tag',
        nutrition_tag_level: 'Nutrition ',
        environmental_biodiversity_tag_level: 'Tag',
        poverty_tag_level: 'Poverty Tag'
      };
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipe');

      service.POST_evidences(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}evidences/create/${service.currentResultId}`);
      expect(req.request.method).toBe('POST');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('PUT_loadFileInUploadSession', () => {
    it('should call PUT_loadFileInUploadSession with correct arguments', () => {
      const mockFile = new File([''], 'filename', { type: 'text/html' });
      const mockLink = 'http://example.com';

      service.PUT_loadFileInUploadSession(mockFile, mockLink);

      const req = httpMock.expectOne(mockLink);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toBe(mockFile);

      const expectedHeaders = new HttpHeaders({
        'Content-Type': 'application/octet-stream',
        'Content-Range': `bytes 0-${mockFile.size - 1}/${mockFile.size}`,
        eampleee: 'asasas'
      });
      expect(req.request.headers.keys()).toEqual(expectedHeaders.keys());
    });
  });

  describe('GET_loadFileInUploadSession', () => {
    it('should call GET_loadFileInUploadSession with correct arguments', () => {
      const mockLink = 'http://example.com';

      service.GET_loadFileInUploadSession(mockLink);

      const req = httpMock.expectOne(mockLink);
      expect(req.request.method).toBe('GET');
    });
  });

  describe('POST_createUploadSession', () => {
    it('should call POST_createUploadSession with correct arguments', () => {
      const mockBody = { fileName: 'testFile', resultId: '123', count: 0 };

      service.POST_createUploadSession(mockBody);

      const req = httpMock.expectOne(`${service.apiBaseUrl}evidences/createUploadSession`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockBody);
    });
  });

  describe('POST_toc', () => {
    it('should call POST_toc and return expected data', done => {
      const mockBody = {
        result_id: 1,
        contributing_initiatives: [],
        contributing_np_projects: [],
        contributing_center: [],
        result_toc_result: new resultToResultInterfaceToc(),
        contributors_result_toc_result: [],
        impacts: [],
        pending_contributing_initiatives: 'pending',
        contributing_and_primary_initiative: 'contributing',
        bodyNewTheoryOfChanges: [],
        impactsTarge: [],
        sdgTargets: [],
        bodyActionArea: [],
        planned_result: true
      };
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipe');

      service.POST_toc(mockBody as any).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}toc/create/toc/result/${service.currentResultId}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GET_mqapValidation', () => {
    it('should call GET_mqapValidation and return expected data', done => {
      const handle = 'handle';
      service.GET_mqapValidation(handle).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}results-knowledge-products/mqap?handle=${handle}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_resultknowledgeProducts', () => {
    it('should call GET_resultknowledgeProducts and return expected data', done => {
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');
      service.GET_resultknowledgeProducts().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}results-knowledge-products/get/result/${service.currentResultId}`);
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('PATCH_resyncKnowledgeProducts', () => {
    it('should call PATCH_resyncKnowledgeProducts and return expected data', done => {
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');
      service.PATCH_resyncKnowledgeProducts().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}results-knowledge-products/resync/${service.currentResultId}`);
      expect(req.request.method).toBe('PATCH');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('POST_createWithHandle', () => {
    it('should call POST_createWithHandle and return expected data', done => {
      const spy = jest.spyOn(mockSaveButtonService, 'isCreatingPipe');
      const mockBody = {};
      service.POST_createWithHandle(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}results-knowledge-products/create`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('PATCH_createWithHandleChangeType', () => {
    it('should call PATCH_createWithHandleChangeType and return expected data', done => {
      const spy = jest.spyOn(mockSaveButtonService, 'isCreatingPipe');
      const mockBody = {};
      const init_id = 1;
      service.PATCH_createWithHandleChangeType(mockBody, init_id).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/manage-data/change/result/${init_id}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GET_toc', () => {
    it('should call GET_toc and map response correctly when initiative.short_name exists', done => {
      mockResponse = {
        response: {
          contributing_initiatives: [
            {
              official_code: 'IC1',
              short_name: 'Init1',
              initiative_name: 'Initiative 1'
            }
          ]
        }
      };
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');

      service.GET_toc().subscribe(response => {
        expect(response).toEqual({
          response: {
            contributing_initiatives: [
              {
                official_code: 'IC1',
                short_name: 'Init1',
                initiative_name: 'Initiative 1',
                full_name: 'IC1 - <strong>Init1</strong> - Initiative 1'
              }
            ]
          }
        });
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}toc/get/result/${service.currentResultId}`);
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });

    it('should call GET_toc and map response correctly when initiative.short_name does not exist', done => {
      mockResponse = {
        response: {
          contributing_initiatives: [
            {
              official_code: 'IC1',
              initiative_name: 'Initiative 1'
            }
          ]
        }
      };
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');

      service.GET_toc().subscribe(response => {
        expect(response).toEqual({
          response: {
            contributing_initiatives: [
              {
                official_code: 'IC1',
                initiative_name: 'Initiative 1',
                full_name: 'IC1 - <strong></strong> - Initiative 1'
              }
            ]
          }
        });
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}toc/get/result/${service.currentResultId}`);
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GET_centers', () => {
    it('should call GET_centers and return expected data', done => {
      service.GET_centers().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}get/centers/${service.currentResultId}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('Get_indicator', () => {
    it('should call Get_indicator and return expected data when currentResultId is null', done => {
      const id_toc = 'id_toc';
      const init = 'init';
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');

      service.Get_indicator(id_toc, init).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });
      const expectedUrl = `${service.apiBaseUrl}toc/get/indicator/${id_toc}/result/${service.ipsrDataControlSE.resultInnovationId}/initiative/${init}`;
      const req = httpMock.expectOne(expectedUrl);
      expect(req.request.method).toBe('GET');
      expect(service.currentResultId).toBeNull();
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
    it('should call Get_indicator and return expected data when currentResultId is not null', done => {
      const id_toc = 'id_toc';
      const init = 'init';
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');
      service.currentResultId = 1;

      service.Get_indicator(id_toc, init).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });
      const expectedUrl = `${service.apiBaseUrl}toc/get/indicator/${id_toc}/result/${service.currentResultId}/initiative/${init}`;
      const req = httpMock.expectOne(expectedUrl);
      expect(req.request.method).toBe('GET');
      expect(service.currentResultId).not.toBeNull();
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('get_vesrsionDashboard', () => {
    it('should call get_vesrsionDashboard and return expected data when ipsrDataControlSE.inIpsr exists', done => {
      const id_toc = 'id_toc';
      const init = 'init';
      service.ipsrDataControlSE.inIpsr = 1;
      service.get_vesrsionDashboard(id_toc, init).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(
        `${service.apiBaseUrl}toc/get/version/${service.ipsrDataControlSE.resultInnovationId}/initiative/${init}/resultToc/${id_toc}`
      );
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });

    it('should call get_vesrsionDashboard and return expected data when ipsrDataControlSE.inIpsr does not exist', done => {
      const id_toc = 'id_toc';
      const init = 'init';
      service.get_vesrsionDashboard(id_toc, init).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}toc/get/version/${service.currentResultId}/initiative/${init}/resultToc/${id_toc}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_resultActionArea', () => {
    it('should call GET_resultActionArea and return expected data', done => {
      const resultId = 'resultId';
      const initiative = 'initiative';
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');

      service.GET_resultActionArea(resultId, initiative).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}toc/get/result/${resultId}/initiative/${initiative}`);
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('PATCH_innovationUse', () => {
    it('should call PATCH_innovationUse and return expected data', done => {
      const mockBody = {};
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipe');

      service.PATCH_innovationUse(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}summary/innovation-use/create/result/${service.currentResultId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GET_innovationUse', () => {
    it('should call GET_innovationUse and return expected data', done => {
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');

      service.GET_innovationUse().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}summary/innovation-use/get/result/${service.currentResultId}`);
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('PATCH_capacityDevelopent', () => {
    it('should call PATCH_capacityDevelopent and return expected data', done => {
      const mockBody = {};
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipe');

      service.PATCH_capacityDevelopent(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}summary/capacity-developent/create/result/${service.currentResultId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GET_capacityDevelopent', () => {
    it('should call GET_capacityDevelopent and map response correctly when institution.institutions_acronym exists', done => {
      mockResponse = {
        response: {
          institutions: [
            {
              institutions_id: 1,
              institutions_acronym: 'ABC',
              institutions_name: 'Institution 1'
            }
          ]
        }
      };
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');

      service.GET_capacityDevelopent().subscribe(response => {
        expect(response).toEqual({
          response: {
            institutions: [
              {
                full_name: '(Id:1) <strong>ABC</strong>  -  Institution 1',
                institutions_acronym: 'ABC',
                institutions_id: 1,
                institutions_name: 'Institution 1'
              }
            ]
          }
        });
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}summary/capacity-developent/get/result/${service.currentResultId}`);
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
    it('should call GET_capacityDevelopent and map response correctly when institution.institutions_acronym does not exist', done => {
      mockResponse = {
        response: {
          institutions: [
            {
              institutions_id: 1,
              institutions_name: 'Institution 1'
            }
          ]
        }
      };
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');

      service.GET_capacityDevelopent().subscribe(response => {
        expect(response).toEqual({
          response: {
            institutions: [
              {
                full_name: '(Id:1) <strong></strong>  Institution 1',
                institutions_id: 1,
                institutions_name: 'Institution 1'
              }
            ]
          }
        });
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}summary/capacity-developent/get/result/${service.currentResultId}`);
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GET_capdevsTerms', () => {
    it('should call GET_capdevsTerms and return expected data', done => {
      service.GET_capdevsTerms().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}capdevs-terms/get/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_capdevsDeliveryMethod', () => {
    it('should call GET_capdevsDeliveryMethod and return expected data', done => {
      service.GET_capdevsDeliveryMethod().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}capdevs-delivery-methods/get/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_AllInitiatives', () => {
    it('should call GET_AllInitiatives and map response correctly', done => {
      mockResponse = {
        response: [
          {
            id: 1,
            official_code: 'ABC',
            short_name: 'Init1',
            name: 'Initiative 1'
          }
        ]
      };
      service.GET_AllInitiatives().subscribe(response => {
        expect(response).toEqual({
          response: [
            {
              id: 1,
              initiative_id: 1,
              full_name: 'ABC - <strong>Init1</strong> - Initiative 1',
              official_code: 'ABC',
              short_name: 'Init1',
              name: 'Initiative 1'
            }
          ]
        });
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}clarisa/initiatives`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_clarisaInnovationType', () => {
    it('should call GET_clarisaInnovationType and map response correctly', done => {
      mockResponse = {
        response: [
          {
            id: 1,
            name: 'Innovation Type 1',
            definition: 'Definition 1'
          }
        ]
      };
      service.GET_clarisaInnovationType().subscribe(response => {
        expect(response).toEqual({
          response: [
            {
              id: 1,
              name: 'Innovation Type 1',
              definition: 'Definition 1',
              extraInformation: '<strong>Innovation Type 1</strong> <br> <div class="select_item_description">Definition 1</div>'
            }
          ]
        });
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}clarisa/innovation-type/get/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_clarisaInnovationCharacteristics', () => {
    it('should call GET_clarisaInnovationCharacteristics and map response correctly', done => {
      mockResponse = {
        response: [
          {
            id: 1,
            name: 'Innovation Characteristic 1',
            definition: 'Definition 1'
          }
        ]
      };
      service.GET_clarisaInnovationCharacteristics().subscribe(response => {
        expect(response).toEqual({
          response: [
            {
              id: 1,
              name: 'Innovation Characteristic 1',
              definition: 'Definition 1',
              extraInformation: '<strong>Innovation Characteristic 1</strong> <br> <div class="select_item_description">Definition 1</div>'
            }
          ]
        });
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}clarisa/innovation-characteristics/get/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_clarisaInnovationReadinessLevels', () => {
    it('should call GET_clarisaInnovationReadinessLevels and return expected data', done => {
      service.GET_clarisaInnovationReadinessLevels().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}clarisa/innovation-readiness-levels/get/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('PATCH_innovationDev', () => {
    it('should call PATCH_innovationDev and return expected data', done => {
      const mockBody = {};
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipe');
      service.PATCH_innovationDev(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}summary/innovation-dev/create/result/${service.currentResultId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GET_innovationDev', () => {
    it('should call GET_innovationDev and return expected data', done => {
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');
      service.GET_innovationDev().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}summary/innovation-dev/get/result/${service.currentResultId}`);
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('PATCH_policyChanges', () => {
    it('should call PATCH_policyChanges and return expected data', done => {
      const mockBody = {};
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipe');
      service.PATCH_policyChanges(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}summary/policy-changes/create/result/${service.currentResultId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GET_policyChangesQuestions', () => {
    it('should call GET_policyChangesQuestions and return expected data', done => {
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');
      service.GET_policyChangesQuestions().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}questions/policy-change/${service.currentResultId}`);
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GET_policyChanges', () => {
    it('should call GET_policyChanges and map response correctly when institution.institutions_acronym exists', done => {
      mockResponse = {
        response: {
          institutions: [
            {
              institutions_id: 1,
              institutions_acronym: 'ACR',
              institutions_name: 'Institution 1'
            }
          ]
        }
      };
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');

      service.GET_policyChanges().subscribe(response => {
        expect(response).toEqual({
          response: {
            institutions: [
              {
                institutions_id: 1,
                institutions_acronym: 'ACR',
                institutions_name: 'Institution 1',
                full_name: '(Id:1) <strong>ACR</strong>  -  Institution 1'
              }
            ]
          }
        });
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}summary/policy-changes/get/result/${service.currentResultId}`);
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });

    it('should call GET_policyChanges and map response correctly when institution.institutions_acronym does not exist', done => {
      mockResponse = {
        response: {
          institutions: [
            {
              institutions_id: 1,
              institutions_name: 'Institution 1'
            }
          ]
        }
      };
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');

      service.GET_policyChanges().subscribe(response => {
        expect(response).toEqual({
          response: {
            institutions: [
              {
                institutions_id: 1,
                institutions_name: 'Institution 1',
                full_name: '(Id:1) <strong></strong>  Institution 1'
              }
            ]
          }
        });
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}summary/policy-changes/get/result/${service.currentResultId}`);
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GET_clarisaPolicyTypes', () => {
    it('should call GET_clarisaPolicyTypes and return expected data', done => {
      service.GET_clarisaPolicyTypes().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}clarisa/policy-types/get/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_clarisaPolicyStages', () => {
    it('should call GET_clarisaPolicyStages and map response correctly', done => {
      mockResponse = {
        response: [
          {
            name: 'Stage 1',
            definition: 'Definition 1'
          }
        ]
      };
      service.GET_clarisaPolicyStages().subscribe(response => {
        expect(response).toEqual({
          response: [
            {
              name: 'Stage 1',
              definition: 'Definition 1',
              full_name: '<strong>Stage 1</strong> - Definition 1'
            }
          ]
        });
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}clarisa/policy-stages/get/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_AllClarisaImpactAreaIndicators', () => {
    it('should call GET_AllClarisaImpactAreaIndicators and return expected data', done => {
      service.GET_AllClarisaImpactAreaIndicators().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}clarisa/impact-area-indicators/get/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_AllLarisaImpactArea', () => {
    it('should call GET_AllLarisaImpactArea and return expected data', done => {
      service.GET_AllLarisaImpactArea().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}clarisa/impact-area/get/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_AllglobalTarget', () => {
    it('should call GET_AllglobalTarget and return expected data', done => {
      service.GET_AllglobalTarget().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}clarisa/global-target/get/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_allClarisaMeliaStudyTypes', () => {
    it('should call GET_allClarisaMeliaStudyTypes and return expected data', done => {
      service.GET_allClarisaMeliaStudyTypes().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}clarisa/melia-study-type/get/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('POST_createRequest', () => {
    it('should call POST_createRequest and return expected data', done => {
      const mockBody = {};
      service.POST_createRequest(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}request/create/${service.currentResultId}`);
      expect(req.request.method).toBe('POST');

      req.flush(mockResponse);
    });
  });

  describe('GET_allRequest', () => {
    it('should call GET_allRequest and return expected data', done => {
      service.GET_allRequest().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}request/get/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('PATCH_updateRequest', () => {
    it('should call PATCH_updateRequest and return expected data ', done => {
      const mockBody = {};
      service.PATCH_updateRequest(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}request/update`);
      expect(req.request.method).toBe('PATCH');

      req.flush(mockResponse);
    });
  });

  describe('GET_requestStatus', () => {
    it('should call GET_requestStatus and return expected data ', done => {
      service.GET_requestStatus().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}request/get/status`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('POST_updateRequest', () => {
    it('should call POST_updateRequest and return expected data ', done => {
      const mockBody = {};
      service.POST_updateRequest(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}map/legacy`);
      expect(req.request.method).toBe('POST');

      req.flush(mockResponse);
    });
  });

  describe('GET_greenChecksByResultId', () => {
    it('should call GET_greenChecksByResultId and return expected data ', done => {
      service.GET_greenChecksByResultId().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}results-validation/get/green-checks/${service.currentResultId}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('PATCH_greenChecksByResultId', () => {
    it('should call PATCH_greenChecksByResultId and return expected data ', done => {
      service.PATCH_greenChecksByResultId().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}results-validation/save/green-checks/${service.currentResultId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({});

      req.flush(mockResponse);
    });
  });

  describe('PATCH_submit', () => {
    it('should call PATCH_submit and return expected data ', done => {
      const comment = 'Test comment';
      service.PATCH_submit(comment).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}submissions/submit/${service.currentResultId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ comment });

      req.flush(mockResponse);
    });
  });

  describe('PATCH_unsubmit', () => {
    it('should call PATCH_unsubmit and return expected data ', done => {
      const comment = 'Test comment';
      service.PATCH_unsubmit(comment).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}submissions/unsubmit/${service.currentResultId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ comment });

      req.flush(mockResponse);
    });
  });

  describe('POST_reportSesultsCompleteness', () => {
    it('should call POST_reportSesultsCompleteness and map response correctly', done => {
      mockResponse = {
        response: [
          {
            result_code: '123',
            result_title: 'Result Title',
            official_code: 'OC123',
            result_type_name: 'Result Type',
            completeness: '80',
            general_information: {
              value: '60'
            },
            theory_of_change: {
              value: '70'
            },
            partners: {
              value: '50'
            },
            geographic_location: {
              value: '90'
            },
            links_to_results: {
              value: '80'
            },
            evidence: {
              value: '75'
            },
            section_seven: {
              value: '85'
            }
          }
        ]
      };
      const initiatives = [];
      const phases = [];
      const rol_user = 'testUser';
      service.POST_reportSesultsCompleteness(initiatives, phases, rol_user).subscribe(response => {
        const map = {
          response: [
            {
              completeness: 80,
              evidence: {
                value: '75'
              },
              evidence_value: 75,
              full_name: 'Result Title 123 OC123 Result Type',
              general_information: {
                value: '60'
              },
              general_information_value: 60,
              geographic_location: {
                value: '90'
              },
              geographic_location_value: 90,
              links_to_results: {
                value: '80'
              },
              links_to_results_value: 80,
              official_code: 'OC123',
              partners: {
                value: '50'
              },
              partners_value: 50,
              result_code: 123,
              result_title: 'Result Title',
              result_type_name: 'Result Type',
              section_seven: {
                value: '85'
              },
              section_seven_value: 85,
              theory_of_change: {
                value: '70'
              },
              theory_of_change_value: 70
            }
          ]
        };
        expect(response).toEqual(map);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}admin-panel/report/results/completeness`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ rol_user, initiatives, phases });

      req.flush(mockResponse);
    });
  });

  describe('GET_historicalByResultId', () => {
    it('should call GET_historicalByResultId and return expected data ', done => {
      const resultId = 1;
      service.GET_historicalByResultId(resultId).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}admin-panel/report/results/${resultId}/submissions`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_reportUsers', () => {
    it('should call GET_reportUsers and map response correctly when user.official_code exists', done => {
      mockResponse = {
        response: [
          {
            user_id: 1,
            user_first_name: 'John',
            user_last_name: 'Doe',
            user_email: 'john.doe@example.com',
            initiative_name: 'Initiative Name',
            official_code: 'OC123',
            initiative_role_name: 'Role Name'
          }
        ]
      };
      service.GET_reportUsers().subscribe(response => {
        expect(response).toEqual({
          response: [
            {
              full_name: '1 John Doe john.doe@example.com Initiative Name OC123 Role Name',
              init_name_official_code: '(OC123) Initiative Name',
              initiative_name: 'Initiative Name',
              initiative_role_name: 'Role Name',
              official_code: 'OC123',
              user_email: 'john.doe@example.com',
              user_first_name: 'John',
              user_id: 1,
              user_last_name: 'Doe'
            }
          ]
        });
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}admin-panel/report/users`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });

    it('should call GET_reportUsers and map response correctly when user.official_code does not exist', done => {
      mockResponse = {
        response: [
          {
            user_id: 1,
            user_first_name: 'John',
            user_last_name: 'Doe',
            user_email: 'john.doe@example.com',
            initiative_name: 'Initiative Name',
            initiative_role_name: 'Role Name'
          }
        ]
      };
      service.GET_reportUsers().subscribe(response => {
        expect(response).toEqual({
          response: [
            {
              full_name: '1 John Doe john.doe@example.com Initiative Name undefined Role Name',
              init_name_official_code: 'Initiative Name',
              initiative_name: 'Initiative Name',
              initiative_role_name: 'Role Name',
              user_email: 'john.doe@example.com',
              user_first_name: 'John',
              user_id: 1,
              user_last_name: 'Doe'
            }
          ]
        });
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}admin-panel/report/users`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_resultIdToCode', () => {
    it('should call GET_resultIdToCode and return expected data', done => {
      const resultCode = 1;
      service.GET_resultIdToCode(resultCode).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}get/transform/${resultCode}?phase=null`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('POST_excelFullReport', () => {
    it('should call POST_excelFullReport and return expected data', done => {
      const resultIds = [];
      service.POST_excelFullReport(resultIds).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}admin-panel/report/results/excel-full-report`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ resultIds: [] });

      req.flush(mockResponse);
    });
  });

  describe('GET_factSheetByInitiativeId', () => {
    it('should call GET_factSheetByInitiativeId and return expected data', done => {
      const initiativeId = 1;
      service.GET_factSheetByInitiativeId(initiativeId).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/type-one-report/fact-sheet/initiative/${initiativeId}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_keyResultStoryInitiativeId', () => {
    it('should call GET_keyResultStoryInitiativeId and return expected data', done => {
      const initiativeId = 1;
      const phase = 'phase';
      service.GET_keyResultStoryInitiativeId(initiativeId, phase).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/type-one-report/key-result-story/initiative/${initiativeId}?phase=${phase}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_excelFullReportByInitiativeId', () => {
    it('should call GET_excelFullReportByInitiativeId and return expected data', done => {
      const initiativeId = 1;
      const phase = 'phase';

      service.GET_excelFullReportByInitiativeId(initiativeId, phase).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${service.apiBaseUrl}admin-panel/report/results/excel-full-report/${initiativeId}?phase=${phase}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('PATCH_primaryImpactAreaKrs', () => {
    it('should call PATCH_primaryImpactAreaKrs and return expected data', done => {
      const mockBody = {};
      service.PATCH_primaryImpactAreaKrs(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/type-one-report/primary/primary-impact-area/create`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(mockBody);

      req.flush(mockResponse);
    });
  });

  describe('GETallInnovations', () => {
    it('should call GETallInnovations and return expected data', done => {
      const initiativesList = [];
      service.GETallInnovations(initiativesList).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/all-innovations`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(initiativesList);

      req.flush(mockResponse);
    });
  });

  describe('GETInnovationByResultId', () => {
    it('should call GETInnovationByResultId and return expected data', done => {
      const resultId = 1;
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');

      service.GETInnovationByResultId(resultId).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/innovation/${resultId}`);
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GET_downloadPDF', () => {
    it('should call GET_downloadPDF and return expected data', done => {
      const resultCode = 1;
      const resultPhase = 'resultPhase';
      mockResponse = new Blob();
      service.GET_downloadPDF(resultCode, resultPhase).subscribe((response: HttpResponse<Blob>) => {
        expect(response.body).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/platform-report/result/${resultCode}?phase=${resultPhase}&downloadable=true`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('POSTResultInnovationPackage', () => {
    it('should call POSTResultInnovationPackage and return expected data', done => {
      const mockBody = {};
      const spy = jest.spyOn(mockSaveButtonService, 'isCreatingPipe');

      service.POSTResultInnovationPackage(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/results-innovation-package/create-header`);
      expect(req.request.method).toBe('POST');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GETAllInnovationPackages', () => {
    it('should call GETAllInnovationPackages and return expected data', done => {
      service.GETAllInnovationPackages().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/all-innovation-packages`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('PATCHIpsrGeneralInfo', () => {
    it('should call PATCHIpsrGeneralInfo and return expected data', done => {
      const resulId = 1;
      const mockBody = {};
      const spy = jest.spyOn(mockSaveButtonService, 'isCreatingPipe');

      service.PATCHIpsrGeneralInfo(mockBody, resulId).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/results-innovation-package/general-information/${resulId}`);
      expect(req.request.method).toBe('PATCH');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GETContributorsByIpsrResultId', () => {
    it('should call GETContributorsByIpsrResultId and map response correctly when short_name exists', done => {
      mockResponse = {
        response: {
          contributing_initiatives: [
            {
              official_code: '123',
              short_name: 'SN',
              initiative_name: 'Initiative Name'
            }
          ]
        }
      };
      const spy = jest.spyOn(mockSaveButtonService, 'isCreatingPipe');

      service.GETContributorsByIpsrResultId().subscribe(response => {
        expect(response).toEqual({
          response: {
            contributing_initiatives: [
              {
                official_code: '123',
                short_name: 'SN',
                initiative_name: 'Initiative Name',
                full_name: '123 - <strong>SN</strong> - Initiative Name'
              }
            ]
          }
        });
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/contributors/get/${service.ipsrDataControlSE.resultInnovationId}`);
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });

    it('should call GETContributorsByIpsrResultId and map response correctly when short_name does not exist', done => {
      mockResponse = {
        response: {
          contributing_initiatives: [
            {
              official_code: '123',
              initiative_name: 'Initiative Name'
            }
          ]
        }
      };
      const spy = jest.spyOn(mockSaveButtonService, 'isCreatingPipe');

      service.GETContributorsByIpsrResultId().subscribe(response => {
        expect(response).toEqual({
          response: {
            contributing_initiatives: [
              {
                official_code: '123',
                initiative_name: 'Initiative Name',
                full_name: '123 - <strong></strong> - Initiative Name'
              }
            ]
          }
        });
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/contributors/get/${service.ipsrDataControlSE.resultInnovationId}`);
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('PATCHContributorsByIpsrResultId', () => {
    it('should call PATCHContributorsByIpsrResultId and return expected data', done => {
      const mockBody = {};
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipe');

      service.PATCHContributorsByIpsrResultId(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/contributors/save/${service.ipsrDataControlSE.resultInnovationId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GETInnovationPackageDetail', () => {
    it('should call GETInnovationPackageDetail and return expected data', done => {
      service.GETInnovationPackageDetail().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/innovation-package-detail/${service.ipsrDataControlSE.resultInnovationId}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GETInnovationPathwayByStepOneResultId', () => {
    it('should call GETInnovationPathwayByStepOneResultId and return expected data', done => {
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');
      service.GETInnovationPathwayByStepOneResultId().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiBaseUrl}api/ipsr/innovation-pathway/get-step-one/${service.ipsrDataControlSE.resultInnovationId}`
      );
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('PATCHInnovationPathwayByStepOneResultId', () => {
    it('should call PATCHInnovationPathwayByStepOneResultId and return expected data', done => {
      const mockBody = {};
      service.ipsrDataControlSE.resultInnovationId = 1;
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipe');
      service.PATCHInnovationPathwayByStepOneResultId(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiBaseUrl}api/ipsr/innovation-pathway/save/step-one/${service.ipsrDataControlSE.resultInnovationId}`
      );
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('PATCHInnovationPathwayByStepOneResultIdNextStep', () => {
    it('should call PATCHInnovationPathwayByStepOneResultIdNextStep and return expected data', done => {
      const mockBody = {};
      const descrip = 'descrip';
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipeNextStep');
      service.PATCHInnovationPathwayByStepOneResultIdNextStep(mockBody, descrip).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiBaseUrl}api/ipsr/innovation-pathway/save/step-one/${service.ipsrDataControlSE.resultInnovationId}`
      );
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GETAllClarisaActionAreasOutcomes', () => {
    it('should call GETAllClarisaActionAreasOutcomes and return expected data', done => {
      service.GETAllClarisaActionAreasOutcomes().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}clarisa/action-areas-outcomes/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GETAllClarisaSdgsTargets', () => {
    it('should call GETAllClarisaSdgsTargets and return expected data', done => {
      service.GETAllClarisaSdgsTargets().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}clarisa/sdgs-targets/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GETAllActorsTypes', () => {
    it('should call GETAllActorsTypes and return expected data', done => {
      service.GETAllActorsTypes().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/results/actors/type/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GETInstitutionsTypeTree', () => {
    it('should call GETInstitutionsTypeTree and return expected data', done => {
      service.GETInstitutionsTypeTree().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}clarisa/institutions-type/tree`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('DELETEInnovationPackage', () => {
    it('should call DELETEInnovationPackage and delete the innovation package via DELETE request', done => {
      const resultId = 1;
      service.DELETEInnovationPackage(resultId).subscribe(response => {
        expect(response).toBeTruthy();
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/results-innovation-package/${resultId}`);
      expect(req.request.method).toBe('DELETE');

      req.flush(mockResponse);
    });
  });

  describe('GETinnovationpathwayStepTwo', () => {
    it('should call GETinnovationpathwayStepTwo and return expected data', done => {
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');

      service.GETinnovationpathwayStepTwo().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/get/complementary-innovations`);
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GETInnovationPathwayStepTwoInnovationSelect', () => {
    it('should call GETInnovationPathwayStepTwoInnovationSelect and return expected data', done => {
      service.GETInnovationPathwayStepTwoInnovationSelect().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiBaseUrl}api/ipsr/innovation-pathway/get/step-two/${service.ipsrDataControlSE.resultInnovationId}`
      );
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GETAllInnovationPackagingExpertsExpertises', () => {
    it('should call GETAllInnovationPackagingExpertsExpertises and return expected data', done => {
      service.GETAllInnovationPackagingExpertsExpertises().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/innovation-packaging-experts/expertises`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('getAllInnoPaActiveBackstopping', () => {
    it('should call getAllInnoPaActiveBackstopping and return expected data', done => {
      service.getAllInnoPaActiveBackstopping().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/results-innovation-package/active-backstopping`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('getAllInnoPaConsensusInitiativeWorkPackage', () => {
    it('should call getAllInnoPaConsensusInitiativeWorkPackage and return expected data', done => {
      service.getAllInnoPaConsensusInitiativeWorkPackage().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/results-innovation-package/consensus-initiative-work-package`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('getAllInnoPaRegionalIntegrated', () => {
    it('should call getAllInnoPaRegionalIntegrated and return expected data', done => {
      service.getAllInnoPaRegionalIntegrated().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/results-innovation-package/regional-integrated`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('getAllInnoPaRegionalLeadership', () => {
    it('should call getAllInnoPaRegionalLeadership and return expected data', done => {
      service.getAllInnoPaRegionalLeadership().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/results-innovation-package/regional-leadership`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('getAllInnoPaRelevantCountry', () => {
    it('should call getAllInnoPaRelevantCountry and return expected data', done => {
      service.getAllInnoPaRelevantCountry().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/results-innovation-package/relevant-country`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('PATCHComplementaryInnovation', () => {
    it('should call PATCHComplementaryInnovation and return expected data', done => {
      const mockBody = {};
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipe');
      service.PATCHComplementaryInnovation(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiBaseUrl}api/ipsr/innovation-pathway/save/step-two/${service.ipsrDataControlSE.resultInnovationId}`
      );
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('PATCHComplementaryInnovationPrevious', () => {
    it('should call PATCHComplementaryInnovationPrevious and return expected data', done => {
      const mockBody = {};
      const descrip = 'descrip';
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipeNextStep');
      service.PATCHComplementaryInnovationPrevious(mockBody, descrip).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiBaseUrl}api/ipsr/innovation-pathway/save/step-two/${service.ipsrDataControlSE.resultInnovationId}`
      );
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GETComplementaryById', () => {
    it('should call GETComplementaryById and return expected data', done => {
      const idInnovationPackages = 1;
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');

      service.GETComplementaryById(idInnovationPackages).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/get/complementary-innovation/${idInnovationPackages}`);
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GETComplementataryInnovationFunctions', () => {
    it('should call GETComplementataryInnovationFunctions and return expected data', done => {
      service.GETComplementataryInnovationFunctions().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/get/complementary-innovations-functions`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('POSTNewCompletaryInnovation', () => {
    it('should call POSTNewCompletaryInnovation and return expected data', done => {
      const mockBody = {};
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipeNextStep');
      service.POSTNewCompletaryInnovation(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiBaseUrl}api/ipsr/innovation-pathway/save/complementary-innovation/${service.ipsrDataControlSE.resultInnovationId}`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GETInnovationPathwayByRiId', () => {
    it('should call GETInnovationPathwayByRiId and return expected data', done => {
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');
      service.GETInnovationPathwayByRiId().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiBaseUrl}api/ipsr/innovation-pathway/get/step-three/${service.ipsrDataControlSE.resultInnovationId}`
      );
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('PATCHInnovationPathwayByRiId', () => {
    it('should call PATCHInnovationPathwayByRiId and return expected data', done => {
      const mockBody = {};
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipe');
      service.PATCHInnovationPathwayByRiId(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiBaseUrl}api/ipsr/innovation-pathway/save/step-three/${service.ipsrDataControlSE.resultInnovationId}`
      );
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('PATCHInnovationPathwayByRiIdNextPrevius', () => {
    it('should call PATCHInnovationPathwayByRiIdNextPrevius and return expected data', done => {
      const mockBody = {};
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipeNextStep');
      const descrip = 'descrip';
      service.PATCHInnovationPathwayByRiIdNextPrevius(mockBody, descrip).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiBaseUrl}api/ipsr/innovation-pathway/save/step-three/${service.ipsrDataControlSE.resultInnovationId}`
      );
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GETAllClarisaInnovationReadinessLevels', () => {
    it('should call GETAllClarisaInnovationReadinessLevels and return expected data', done => {
      service.GETAllClarisaInnovationReadinessLevels().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}clarisa/innovation-readiness-levels/get/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GETAllClarisaInnovationUseLevels', () => {
    it('should call GETAllClarisaInnovationUseLevels and return expected data', done => {
      service.GETAllClarisaInnovationUseLevels().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}clarisa/innovation-use-levels`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GETInnovationPathwayStepFourByRiId', () => {
    it('should call GETInnovationPathwayStepFourByRiId and return expected data', done => {
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');
      service.GETInnovationPathwayStepFourByRiId().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiBaseUrl}api/ipsr/innovation-pathway/get/step-four/${service.ipsrDataControlSE.resultInnovationId}`
      );
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('PATCHInnovationPathwayStepFourByRiId', () => {
    it('should call PATCHInnovationPathwayStepFourByRiId and return expected data', done => {
      const mockBody = {};
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipe');
      service.PATCHInnovationPathwayStepFourByRiId(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiBaseUrl}api/ipsr/innovation-pathway/save/step-four/${service.ipsrDataControlSE.resultInnovationId}`
      );
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('PATCHInnovationPathwayStepFourByRiIdPrevious', () => {
    it('should call PATCHInnovationPathwayStepFourByRiIdPrevious and return expected data', done => {
      const mockBody = {};
      const descrip = 'descrip';
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipeNextStep');
      service.PATCHInnovationPathwayStepFourByRiIdPrevious(mockBody, descrip).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiBaseUrl}api/ipsr/innovation-pathway/save/step-four/${service.ipsrDataControlSE.resultInnovationId}`
      );
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('GETAllResultsInnovationPackageUnitTime', () => {
    it('should call GETAllResultsInnovationPackageUnitTime and return expected data', done => {
      service.GETAllResultsInnovationPackageUnitTime().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/results-innovation-package/unit-time`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('PATCHInnovationPathwayStep4Partners', () => {
    it('should call PATCHInnovationPathwayStep4Partners and return expected data', done => {
      const mockBody = {};
      service.PATCHInnovationPathwayStep4Partners(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiBaseUrl}api/ipsr/innovation-pathway/save/step-four/partners/${service.ipsrDataControlSE.resultInnovationId}`
      );
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(mockBody);

      req.flush(mockResponse);
    });
  });

  describe('PATCHInnovationPathwayStep4BilateralsnonPooledProjects', () => {
    it('should call PATCHInnovationPathwayStep4BilateralsnonPooledProjects and return expected data', done => {
      const idNonPoolen = 1;
      const mockBody = {};
      service.PATCHInnovationPathwayStep4BilateralsnonPooledProjects(idNonPoolen, mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/results/non-pooled-projects/${idNonPoolen}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(mockBody);

      req.flush(mockResponse);
    });
  });

  describe('PATCHInnovationPathwayStep4Bilaterals', () => {
    it('should call PATCHInnovationPathwayStep4Bilaterals and return expected data', done => {
      const mockBody = {};
      service.PATCHInnovationPathwayStep4Bilaterals(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiBaseUrl}api/ipsr/innovation-pathway/save/step-four/bilaterals/${service.ipsrDataControlSE.resultInnovationId}`
      );
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(mockBody);

      req.flush(mockResponse);
    });
  });

  describe('getCompletenessStatus', () => {
    it('should call getCompletenessStatus and return expected data', done => {
      service.getCompletenessStatus().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiBaseUrl}api/ipsr/results-innovation-packages-validation-module/get/green-checks/${service.ipsrDataControlSE.resultInnovationId}`
      );
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('getSubNationalLevelOne', () => {
    it('should call getSubNationalLevelOne and return expected data', done => {
      const isoAlpha = 'isoAlpha';
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');
      service.getSubNationalLevelOne(isoAlpha).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}clarisa/first-order-administrative-division/iso-alpha-2/${isoAlpha}`);
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('getSubNationalLevelTwo', () => {
    it('should call getSubNationalLevelTwo and return expected data', done => {
      const isoAlpha = 'isoAlpha';
      const adminCode = 'adminCode';
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');
      service.getSubNationalLevelTwo(isoAlpha, adminCode).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiBaseUrl}clarisa/second-order-administrative-division/iso-alpha-2/${isoAlpha}/admin-code-1/${adminCode}`
      );
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('PATCHsubmissionsSubmitIpsr', () => {
    it('should call PATCHsubmissionsSubmitIpsr and return expected data', done => {
      const comment = 'comment';
      service.PATCHsubmissionsSubmitIpsr(comment).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/results/submissions/submit-ipsr/${service.ipsrDataControlSE.resultInnovationId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ comment });

      req.flush(mockResponse);
    });
  });

  describe('PATCHSubmissionsUnsubmitIpsr', () => {
    it('should call PATCHSubmissionsUnsubmitIpsr and return expected data', done => {
      const comment = 'comment';
      service.PATCHSubmissionsUnsubmitIpsr(comment).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiBaseUrl}api/results/submissions/unsubmit-ipsr/${service.ipsrDataControlSE.resultInnovationId}`
      );
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ comment });

      req.flush(mockResponse);
    });
  });

  describe('getStepTwoComentariesInnovation', () => {
    it('should call getStepTwoComentariesInnovation and return expected data', done => {
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');
      service.getStepTwoComentariesInnovation().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/results-innovation-packages-enabler-type`);
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('PostStepTwoComentariesInnovation', () => {
    it('should call PostStepTwoComentariesInnovation and return expected data', done => {
      const mockBody = {};
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipe');
      service.PostStepTwoComentariesInnovation(mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/results-innovation-packages-enabler-type/createInnovationEnablers`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('PostStepTwoComentariesInnovationPrevius', () => {
    it('should call PostStepTwoComentariesInnovationPrevius and return expected data', done => {
      const mockBody = {};
      const descrip = 'descrip';
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipeNextStep');
      service.PostStepTwoComentariesInnovationPrevius(mockBody, descrip).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/results-innovation-packages-enabler-type/createInnovationEnablers`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalledWith(descrip);

      req.flush(mockResponse);
    });
  });

  describe('getStepTwoComentariesInnovationId', () => {
    it('should call getStepTwoComentariesInnovationId and return expected data', done => {
      const spy = jest.spyOn(mockSaveButtonService, 'isGettingSectionPipe');
      service.getStepTwoComentariesInnovationId().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiBaseUrl}api/ipsr/results-innovation-packages-enabler-type/${service.ipsrDataControlSE.resultInnovationId}`
      );
      expect(req.request.method).toBe('GET');
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('getAssessedDuringExpertWorkshop', () => {
    it('should call getAssessedDuringExpertWorkshop and return expected data', done => {
      service.getAssessedDuringExpertWorkshop().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/assessed-during-expert-workshop`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('PATCHcomplementaryinnovation', () => {
    it('should call PATCHcomplementaryinnovation and return expected data', done => {
      const idResult = 1;
      const mockBody = {};
      const spy = jest.spyOn(mockSaveButtonService, 'isSavingPipe');

      service.PATCHcomplementaryinnovation(mockBody, idResult).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/updated/complementary-innovation/${idResult}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(mockBody);
      expect(spy).toHaveBeenCalled();

      req.flush(mockResponse);
    });
  });

  describe('DELETEcomplementaryinnovation', () => {
    it('should call DELETEcomplementaryinnovation and delete the complementary innovation via DELETE request', done => {
      const idResult = 1;
      service.DELETEcomplementaryinnovation(idResult).subscribe(response => {
        expect(response).toBeTruthy();
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/delete/complementary-innovation/${idResult}`);
      expect(req.request.method).toBe('DELETE');

      req.flush(mockResponse);
    });
  });

  describe('GET_versioning', () => {
    it('should call GET_versioning and return expected data when status exists', done => {
      const status = 1;
      const modules = 'modules';
      const mockResponse = {
        response: [
          {
            phase_name: 'phase name',
            status: 1
          }
        ]
      };
      service.GET_versioning(status, modules).subscribe(response => {
        expect(response).toEqual({
          response: [
            {
              phase_name: 'phase name',
              status: 1,
              phase_name_status: 'phase name - (Open)'
            }
          ]
        });
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/versioning?status=${status}&module=${modules}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
    it('should call GET_versioning and return expected data when status does not exist', done => {
      const status = 1;
      const modules = 'modules';
      const mockResponse = {
        response: [
          {
            phase_name: 'phase name'
          }
        ]
      };
      service.GET_versioning(status, modules).subscribe(response => {
        expect(response).toEqual({
          response: [
            {
              phase_name: 'phase name',
              phase_name_status: 'phase name - (Closed)'
            }
          ]
        });
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/versioning?status=${status}&module=${modules}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('PATCH_versioningProcess', () => {
    it('should call PATCH_versioningProcess and return expected data', done => {
      const id = 1;
      service.PATCH_versioningProcess(id).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/versioning/phase-change/process/result/${id}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toBeNull;

      req.flush(mockResponse);
    });
  });

  describe('PATCH_updatePhase', () => {
    it('should call PATCH_updatePhase and return expected data', done => {
      const id = 1;
      const phase = 'phase';
      service.PATCH_updatePhase(id, phase).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/versioning/${id}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(phase);

      req.flush(mockResponse);
    });
  });

  describe('DELETE_updatePhase', () => {
    it('should call DELETE_updatePhase via DELETE request', done => {
      const id = 1;
      service.DELETE_updatePhase(id).subscribe(response => {
        expect(response).toBeTruthy();
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/versioning/${id}`);
      expect(req.request.method).toBe('DELETE');

      req.flush(mockResponse);
    });
  });

  describe('POST_createPhase', () => {
    it('should call POST_createPhase and return expected data', done => {
      const phase = 'phase';
      service.POST_createPhase(phase).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/versioning`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(phase);

      req.flush(mockResponse);
    });
  });

  describe('GET_tocPhases', () => {
    it('should call GET_tocPhases and return expected data', done => {
      service.GET_tocPhases().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}clarisa/toc-phases`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_resultYears', () => {
    it('should call GET_resultYears and return expected data', done => {
      service.GET_resultYears().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/results/years`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_questionsInnovationDevelopment', () => {
    it('should call GET_questionsInnovationDevelopment and return expected data', done => {
      service.GET_questionsInnovationDevelopment().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/results/questions/innovation-development/${service.currentResultId}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_versioningResult', () => {
    it('should call GET_versioningResult and return expected data when ipsrDataControlSE.inIpsr exists', done => {
      service.ipsrDataControlSE.inIpsr = 'test';
      service.ipsrDataControlSE.resultInnovationId = 1;
      service.GET_versioningResult().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/versioning/result/${service.ipsrDataControlSE.resultInnovationId}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
    it('should call GET_versioningResult and return expected data when ipsrDataControlSE.inIpsr does not exist', done => {
      service.currentResultId = 1;
      service.GET_versioningResult().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/versioning/result/${service.currentResultId}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('PATCH_versioningAnnually', () => {
    it('should call PATCH_versioningAnnually and return expected data', done => {
      service.PATCH_versioningAnnually().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/versioning/execute/annual/replicate/result`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({});

      req.flush(mockResponse);
    });
  });

  describe('GET_numberOfResultsByResultType', () => {
    it('should call GET_numberOfResultsByResultType and return expected data', done => {
      const statusId = 1;
      const resultTypeId = 1;
      service.GET_numberOfResultsByResultType(statusId, resultTypeId).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/versioning/number/results/status/${statusId}/result-type/${resultTypeId}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_allResultStatuses', () => {
    it('should call GET_allResultStatuses and return expected data', done => {
      service.GET_allResultStatuses().subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/results/result-status/all`);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('GET_subNationalByIsoAlpha2', () => {
    it('should call GET_subNationalByIsoAlpha2 with correct arguments', () => {
      const mockIsoAlpha2 = 'US';

      service.GET_subNationalByIsoAlpha2(mockIsoAlpha2).subscribe();

      const req = httpMock.expectOne(`${environment.apiBaseUrl}clarisa/subnational-scope/get/by-country-iso2/${mockIsoAlpha2}`);
      expect(req.request.method).toBe('GET');
    });
  });

  describe('GET_platformGlobalVariables', () => {
    it('should call GET_platformGlobalVariables with correct arguments', () => {
      service.GET_platformGlobalVariables().subscribe();

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/global-parameters/platform/global/variables`);
      expect(req.request.method).toBe('GET');
    });
  });

  describe('GET_platformGlobalVariablesByCategoryId', () => {
    it('should call GET_platformGlobalVariablesByCategoryId with correct arguments', () => {
      const mockCategoryId = '123';

      service.GET_platformGlobalVariablesByCategoryId(mockCategoryId).subscribe();

      const req = httpMock.expectOne(`${environment.apiBaseUrl}api/global-parameters/category/${mockCategoryId}`);
      expect(req.request.method).toBe('GET');
    });
  });
});

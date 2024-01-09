import { TestBed } from '@angular/core/testing';
import { ResultsNotificationsService } from './results-notifications.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ApiService } from '../../../../../../shared/services/api/api.service';

describe('ResultsNotificationsService', () => {
  let service: ResultsNotificationsService;
  let mockApiService: any;
  let mockGET_allRequestResponse = {
    requestData: [{
      approving_inititiative_id: 1,
      result_type_id: 10
    }],
    requestPendingData: [
      {
        request_status_id: 1,
        requester_initiative_id: 1,
        result_type_id: 10
      }
    ]
  };

  beforeEach(() => {
    mockApiService = {
      resultsSE: {
        GET_allRequest: () => of({ response: mockGET_allRequestResponse }),
        GET_requestStatus: () => of({}),

      },
      dataControlSE: {
        myInitiativesList: [
          {
            role: 'Member',
            initiative_id: 1
          }
        ]
      }
    };

    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        }
      ]
    });
    service = TestBed.inject(ResultsNotificationsService);
  });

  describe('get_section_information()', () => {
    it('should update data for get_section_information', () => {
      service.get_section_information();

      expect(service.data).toEqual([
        { 
          approving_inititiative_id: 1, 
          result_type_id: 10, 
          readOnly: true 
        },
        { 
          result_type_id: 10,
          requester_initiative_id: 1, 
          request_status_id: 4, 
          shared_inititiative_id: 1, 
          pending: true 
        },
      ]);
    });
    it('should update data for get_section_information when item.request_status_id is not 1', () => {
      mockGET_allRequestResponse.requestPendingData[0].request_status_id = 2;
      service.get_section_information();

      expect(service.data).toEqual([
        { 
          approving_inititiative_id: 1, 
          result_type_id: 10, 
          readOnly: true 
        },
        { 
          result_type_id: 10,
          requester_initiative_id: 1, 
          request_status_id: 2, 
        },
      ]);
    });
    it('should not update data for get_section_information', () => {
      mockApiService.resultsSE.GET_allRequest = () => of({});
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_allRequest');

      service.get_section_information();

      expect(spy).toHaveBeenCalled();
      expect(service.data).toEqual([]);
    });
  });
  describe('get_section_innovation_packages()', () => {
    it('should update dataIPSR for get_section_innovation_packages', () => {
      mockGET_allRequestResponse.requestPendingData[0].request_status_id = 1;

      service.get_section_innovation_packages();

      expect(service.dataIPSR).toEqual([
        { 
          approving_inititiative_id: 1, 
          result_type_id: 10, 
          readOnly: true 
        },
        { 
          requester_initiative_id: 1, 
          request_status_id: 4, 
          shared_inititiative_id: 1, 
          result_type_id: 10, 
          pending: true 
        },
      ]);
    });
    it('should update dataIPSR for get_section_innovation_packages when request_status_id is not 1', () => {
      mockGET_allRequestResponse.requestPendingData[0].request_status_id = 2;

      service.get_section_innovation_packages();

      expect(service.dataIPSR).toEqual([
        { 
          approving_inititiative_id: 1, 
          result_type_id: 10, 
          readOnly: true 
        },
        { 
          requester_initiative_id: 1, 
          request_status_id: 2, 
          result_type_id: 10, 
        },
      ]);
    });
    it('should not update dataIPSR for get_section_innovation_packages', () => {
      mockApiService.resultsSE.GET_allRequest = () => of({});
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_allRequest');

      service.get_section_innovation_packages();

      expect(spy).toHaveBeenCalled();
      expect(service.dataIPSR).toEqual([]);
    });
  });
});

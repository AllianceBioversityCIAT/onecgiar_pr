import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ResultFrameworkReportingHomeService } from './result-framework-reporting-home.service';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { RecentActivity } from '../../../../../shared/interfaces/recentActivity.interface';

describe('ResultFrameworkReportingHomeService', () => {
  let service: ResultFrameworkReportingHomeService;
  let mockApiService: jest.Mocked<ApiService>;

  const mockRecentActivity: RecentActivity[] = [
    {
      id: 1,
      resultId: 1,
      resultCode: '123',
      resultTitle: 'Test Activity 1',
      initiativeId: 1,
      initiativeName: 'Test Initiative 1',
      initiativeOfficialCode: '123',
      eventType: 'Test Event 1',
      message: 'Test description 1',
      emitterId: 1,
      emitterName: 'Test Emitter 1',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      phase: '1'
    },
    {
      id: 2,
      resultId: 2,
      resultCode: '456',
      resultTitle: 'Test Activity 2',
      initiativeId: 2,
      initiativeName: 'Test Initiative 2',
      initiativeOfficialCode: '456',
      eventType: 'Test Event 2',
      message: 'Test description 2',
      emitterId: 2,
      emitterName: 'Test Emitter 2',
      createdAt: new Date('2024-01-02T00:00:00Z'),
      phase: '2'
    }
  ];

  beforeEach(() => {
    mockApiService = {
      resultsSE: {
        GET_RecentActivity: jest.fn(),
        GET_ScienceProgramsProgress: jest.fn()
      }
    } as any;

    TestBed.configureTestingModule({
      providers: [ResultFrameworkReportingHomeService, { provide: ApiService, useValue: mockApiService }]
    });

    service = TestBed.inject(ResultFrameworkReportingHomeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with empty recent activity list', () => {
    expect(service.recentActivityList()).toEqual([]);
  });

  describe('getRecentActivity', () => {
    it('should fetch and set recent activity list', () => {
      const mockResponse = { response: mockRecentActivity };
      mockApiService.resultsSE.GET_RecentActivity = jest.fn().mockReturnValue(of(mockResponse));

      service.getRecentActivity();

      expect(mockApiService.resultsSE.GET_RecentActivity).toHaveBeenCalledTimes(1);
      expect(service.recentActivityList()).toEqual(mockRecentActivity);
    });

    it('should handle empty response', () => {
      const mockResponse = { response: [] };
      mockApiService.resultsSE.GET_RecentActivity = jest.fn().mockReturnValue(of(mockResponse));

      service.getRecentActivity();

      expect(service.recentActivityList()).toEqual([]);
    });

    it('should update existing recent activity list', () => {
      const initialActivity: RecentActivity[] = [
        {
          id: 3,
          resultId: 1,
          resultCode: '123',
          resultTitle: 'Initial Activity',
          initiativeId: 1,
          initiativeName: 'Initial Initiative',
          initiativeOfficialCode: '123',
          eventType: 'Initial Event',
          message: 'Initial message',
          emitterId: 1,
          emitterName: 'Initial Emitter',
          createdAt: new Date('2024-01-03T00:00:00Z'),
          phase: '1'
        }
      ];
      service.recentActivityList.set(initialActivity);

      const mockResponse = { response: mockRecentActivity };
      mockApiService.resultsSE.GET_RecentActivity = jest.fn().mockReturnValue(of(mockResponse));

      service.getRecentActivity();

      expect(service.recentActivityList()).toEqual(mockRecentActivity);
      expect(service.recentActivityList()).not.toEqual(initialActivity);
    });
  });

  describe('getScienceProgramsProgress', () => {
    it('should fetch and set SP progress lists', () => {
      const mockResponse = {
        response: {
          mySciencePrograms: [{ id: 1, acronym: 'SP1', name: 'Science Program 1', progress: 50 }],
          otherSciencePrograms: [{ id: 2, acronym: 'SP2', name: 'Science Program 2', progress: 25 }]
        }
      } as any;

      mockApiService.resultsSE.GET_ScienceProgramsProgress = jest.fn().mockReturnValue(of(mockResponse));

      service.getScienceProgramsProgress();

      expect(mockApiService.resultsSE.GET_ScienceProgramsProgress).toHaveBeenCalledTimes(1);
      expect(service.mySPsList()).toEqual(mockResponse.response.mySciencePrograms);
      expect(service.otherSPsList()).toEqual(mockResponse.response.otherSciencePrograms);
    });

    it('should handle missing response properties gracefully', () => {
      const mockResponse = { response: {} } as any;
      mockApiService.resultsSE.GET_ScienceProgramsProgress = jest.fn().mockReturnValue(of(mockResponse));

      service.getScienceProgramsProgress();

      expect(service.mySPsList()).toBeUndefined();
      expect(service.otherSPsList()).toBeUndefined();
    });

    it('signals should be settable and readable', () => {
      const myList = [{ id: 3 } as any];
      const otherList = [{ id: 4 } as any];
      service.mySPsList.set(myList as any);
      service.otherSPsList.set(otherList as any);
      expect(service.mySPsList()).toEqual(myList as any);
      expect(service.otherSPsList()).toEqual(otherList as any);
    });
  });

  describe('recentActivityList signal', () => {
    it('should be readable', () => {
      const activity = service.recentActivityList();
      expect(Array.isArray(activity)).toBe(true);
    });

    it('should be settable', () => {
      service.recentActivityList.set(mockRecentActivity);
      expect(service.recentActivityList()).toEqual(mockRecentActivity);
    });
  });
});

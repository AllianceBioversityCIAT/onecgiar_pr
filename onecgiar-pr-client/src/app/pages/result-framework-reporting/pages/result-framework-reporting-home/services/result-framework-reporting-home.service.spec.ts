import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  isAvisaScienceProgram,
  partitionScienceProgramsForHome,
  ResultFrameworkReportingHomeService
} from './result-framework-reporting-home.service';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { RecentActivity } from '../../../../../shared/interfaces/recentActivity.interface';
import { SPProgress } from '../../../../../shared/interfaces/SP-progress.interface';

describe('ResultFrameworkReportingHomeService', () => {
  let service: ResultFrameworkReportingHomeService;
  let mockApiService: jest.Mocked<ApiService>;

  const avisaProgram = {
    initiativeId: 41,
    initiativeCode: 'SGP-02',
    initiativeName: 'Accelerated Varietal Improvement and Seed Delivery of Legumes and Cereals in Africa',
    initiativeShortName: 'AVISA',
    progress: 10
  } as SPProgress;

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

  describe('isAvisaScienceProgram', () => {
    it('should match SGP-02 by initiativeId', () => {
      expect(isAvisaScienceProgram({ initiativeId: 41, initiativeCode: 'SP99' } as SPProgress)).toBe(true);
    });

    it('should match SGP-02 and SGP02 codes', () => {
      expect(isAvisaScienceProgram({ initiativeId: 99, initiativeCode: 'SGP-02' } as SPProgress)).toBe(true);
      expect(isAvisaScienceProgram({ initiativeId: 99, initiativeCode: 'SGP02' } as SPProgress)).toBe(true);
    });

    it('should return false for other programs', () => {
      expect(isAvisaScienceProgram({ initiativeId: 2, initiativeCode: 'SP02' } as SPProgress)).toBe(false);
    });
  });

  describe('partitionScienceProgramsForHome', () => {
    it('should move AVISA from my and other lists into otherProjects', () => {
      const result = partitionScienceProgramsForHome({
        mySciencePrograms: [avisaProgram, { initiativeId: 1, initiativeCode: 'SP01' } as SPProgress],
        otherSciencePrograms: [{ initiativeId: 2, initiativeCode: 'SP02' } as SPProgress]
      });

      expect(result.mySciencePrograms).toEqual([{ initiativeId: 1, initiativeCode: 'SP01' }]);
      expect(result.otherSciencePrograms).toEqual([{ initiativeId: 2, initiativeCode: 'SP02' }]);
      expect(result.otherProjects).toEqual([avisaProgram]);
    });

    it('should dedupe AVISA when present in both buckets', () => {
      const result = partitionScienceProgramsForHome({
        mySciencePrograms: [avisaProgram],
        otherSciencePrograms: [avisaProgram]
      });

      expect(result.otherProjects).toEqual([avisaProgram]);
      expect(result.mySciencePrograms).toEqual([]);
      expect(result.otherSciencePrograms).toEqual([]);
    });
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
    it('should partition AVISA into otherProjectsList', () => {
      const mockResponse = {
        response: {
          mySciencePrograms: [avisaProgram, { id: 1, initiativeCode: 'SP01' } as any],
          otherSciencePrograms: [{ id: 2, initiativeCode: 'SP02' } as any]
        }
      } as any;

      mockApiService.resultsSE.GET_ScienceProgramsProgress = jest.fn().mockReturnValue(of(mockResponse));

      service.getScienceProgramsProgress();

      expect(mockApiService.resultsSE.GET_ScienceProgramsProgress).toHaveBeenCalledTimes(1);
      expect(service.mySPsList()).toEqual([{ id: 1, initiativeCode: 'SP01' }]);
      expect(service.otherSPsList()).toEqual([{ id: 2, initiativeCode: 'SP02' }]);
      expect(service.otherProjectsList()).toEqual([avisaProgram]);
    });

    it('should handle missing response properties gracefully', () => {
      const mockResponse = { response: {} } as any;
      mockApiService.resultsSE.GET_ScienceProgramsProgress = jest.fn().mockReturnValue(of(mockResponse));

      service.getScienceProgramsProgress();

      expect(service.mySPsList()).toEqual([]);
      expect(service.otherSPsList()).toEqual([]);
      expect(service.otherProjectsList()).toEqual([]);
    });

    it('signals should be settable and readable', () => {
      const myList = [{ id: 3 } as any];
      const otherList = [{ id: 4 } as any];
      const otherProjects = [{ id: 41 } as any];
      service.mySPsList.set(myList as any);
      service.otherSPsList.set(otherList as any);
      service.otherProjectsList.set(otherProjects as any);
      expect(service.mySPsList()).toEqual(myList as any);
      expect(service.otherSPsList()).toEqual(otherList as any);
      expect(service.otherProjectsList()).toEqual(otherProjects as any);
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

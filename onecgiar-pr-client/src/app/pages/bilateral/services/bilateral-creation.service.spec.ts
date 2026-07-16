import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BilateralCreationService } from './bilateral-creation.service';
import { ApiService } from '../../../shared/services/api/api.service';
import { BilateralApiService } from '../../../shared/services/api/bilateral-api.service';

describe('BilateralCreationService', () => {
  let service: BilateralCreationService;
  let mockBilateralApi: jest.Mocked<Pick<
    BilateralApiService,
    'GET_bilateralProjects' | 'GET_BilateralResultDetail' | 'POST_createBilateralHeader' | 'PATCH_BilateralReviewDecision'
  >>;
  let mockApiService: Partial<ApiService>;

  beforeEach(() => {
    localStorage.removeItem('bp_project');
    localStorage.removeItem('bp_primary_sp');
    localStorage.removeItem('bp_secondary_sps');

    mockBilateralApi = {
      GET_bilateralProjects: jest.fn(),
      GET_BilateralResultDetail: jest.fn(),
      POST_createBilateralHeader: jest.fn().mockReturnValue(of({})),
      PATCH_BilateralReviewDecision: jest.fn().mockReturnValue(of({})),
    };

    mockApiService = {
      resultsSE: {
        currentResultId: null,
      } as any,
    };

    TestBed.configureTestingModule({
      providers: [
        BilateralCreationService,
        { provide: ApiService, useValue: mockApiService },
        { provide: BilateralApiService, useValue: mockBilateralApi },
      ],
    });

    service = TestBed.inject(BilateralCreationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch projects via GET_bilateralProjects', () => {
    const mockResponse = {
      response: {
        projects: [
          { id: 1, shortName: 'P1', fullName: 'Project 1', summary: null, description: null, leadCenter: null, sciencePrograms: [] },
        ],
      },
    };
    mockBilateralApi.GET_bilateralProjects.mockReturnValue({
      subscribe: ({ next }: any) => next(mockResponse),
    } as any);

    service.getProjects('CENTER-01');
    expect(service.isLoadingProjects()).toBe(false);
    expect(service.projects()).toEqual(mockResponse.response.projects);
    expect(mockBilateralApi.GET_bilateralProjects).toHaveBeenCalledWith('CENTER-01');
  });

  it('should handle empty project list', () => {
    mockBilateralApi.GET_bilateralProjects.mockReturnValue({
      subscribe: ({ next }: any) => next({ response: { projects: [] } }),
    } as any);

    service.getProjects('CENTER-01');
    expect(service.projects()).toEqual([]);
    expect(service.isLoadingProjects()).toBe(false);
  });

  it('should select a project', () => {
    const project = { id: 1, shortName: 'P1', fullName: 'Project 1', summary: null, description: null, leadCenter: null, sciencePrograms: [] };
    service.selectProject(project);
    expect(service.selectedProject()).toEqual(project);
    expect(service.selectedPrimarySp()).toBeNull();
    expect(service.selectedSecondarySps()).toEqual([]);
  });

  it('clearEditorState should wipe description and contributing project ids', () => {
    service.resultDescription.set('stale description');
    service.resultContributingProjectIds.set([99, 100]);
    service.resultTitle.set('stale title');
    service.clearEditorState();
    expect(service.resultDescription()).toBe('');
    expect(service.resultTitle()).toBe('');
    expect(service.resultContributingProjectIds()).toEqual([]);
  });

  it('loadResult should clear editor state before applying the payload', () => {
    service.resultDescription.set('from previous result');
    service.resultContributingProjectIds.set([55]);
    mockBilateralApi.GET_BilateralResultDetail.mockReturnValue({
      subscribe: ({ next }: any) =>
        next({
          response: {
            commonFields: { result_title: 'New', result_description: '' },
            contributingProjects: [],
            contributingCenters: [],
          },
        }),
    } as any);

    service.loadResult(7);

    expect(service.resultDescription()).toBe('');
    expect(service.resultContributingProjectIds()).toEqual([]);
    expect(service.resultTitle()).toBe('New');
    expect(mockBilateralApi.GET_BilateralResultDetail).toHaveBeenCalledWith(7);
  });

  it('should select a primary SP', () => {
    const sp = { programId: 100, programCode: 'P11', allocation: '45.00' };
    service.selectPrimarySp(sp);
    expect(service.selectedPrimarySp()).toEqual(sp);
  });

  it('should toggle secondary SPs', () => {
    const sp1 = { programId: 100, programCode: 'P11', allocation: '45.00' };
    const sp2 = { programId: 200, programCode: 'P12', allocation: '25.00' };
    service.toggleSecondarySp(sp1);
    expect(service.selectedSecondarySps()).toEqual([sp1]);
    service.toggleSecondarySp(sp2);
    expect(service.selectedSecondarySps()).toEqual([sp1, sp2]);
    service.toggleSecondarySp(sp1);
    expect(service.selectedSecondarySps()).toEqual([sp2]);
  });

  it('should create a result via POST_createBilateralHeader', () => {
    service.resetWizard();
    service.selectPrimarySp({ programId: 100, programCode: 'P11', allocation: '45.00' });
    service.createResult(1, 2).subscribe();
    expect(mockBilateralApi.POST_createBilateralHeader).toHaveBeenCalledWith({
      result_level_id: 1,
      result_type_id: 2,
      program_code: 'P11',
    });
  });

  it('should submit a result via PATCH_BilateralReviewDecision', () => {
    service.submitResult(123).subscribe();
    expect(mockBilateralApi.PATCH_BilateralReviewDecision).toHaveBeenCalledWith(123, {
      decision: 'APPROVE',
      justification: 'Submitted by Center User',
    });
  });
});

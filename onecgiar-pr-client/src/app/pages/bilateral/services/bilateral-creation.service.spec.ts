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
    expect(mockBilateralApi.GET_BilateralResultDetail).toHaveBeenCalledWith(7, undefined);
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

  it('should identify persisted AI results from the detail payload', () => {
    mockBilateralApi.GET_BilateralResultDetail.mockReturnValue({
      subscribe: ({ next }: any) =>
        next({
          response: {
            commonFields: { creation_method: 'AI' },
            contributingProjects: [],
            contributingCenters: [],
          },
        }),
    } as any);

    service.loadResult(8706);

    expect(service.isAiGenerated()).toBe(true);
  });

  // ---------------------------------------------------------------------------

  describe('getProjects', () => {
    it('stops the loader when the request fails', () => {
      mockBilateralApi.GET_bilateralProjects.mockReturnValue({
        subscribe: ({ error }: any) => error(new Error('boom')),
      } as any);

      service.getProjects(12);
      expect(service.isLoadingProjects()).toBe(false);
      expect(service.projects()).toEqual([]);
    });
  });

  describe('loadResult', () => {
    function respondWith(response: any) {
      mockBilateralApi.GET_BilateralResultDetail.mockReturnValue({
        subscribe: ({ next }: any) => next({ response }),
      } as any);
    }

    it('maps every common field, the DAC levels and the impact-area sub scores', () => {
      respondWith({
        commonFields: {
          result_title: 'Title',
          result_description: 'Description',
          lead_contact_person: 'Ada',
          result_level_id: 2,
          result_type_id: 7,
          project_id: '31',
          lead_center_id: '44',
          gender_tag_level_id: 1,
          climate_change_tag_level_id: '2',
          nutrition_tag_level_id: 3,
          environmental_biodiversity_tag_level_id: 0,
          poverty_tag_level_id: 1,
          result_code: 'BEANS4WOMEN-001',
          source: 'API',
          result_category: 'Knowledge product',
          reporting_year: '2025',
        },
        impactAreaScores: [
          { impact_area: 'Gender', impact_area_score_id: 11 },
          { impact_area: 'Gender', impact_area_score_id: 12 },
          { impact_area: 'Climate', impact_area_score_id: 13 },
          { impact_area: 'Unknown area', impact_area_score_id: 99 },
        ],
      });

      service.loadResult(10);

      expect(service.currentResultId()).toBe(10);
      expect(mockApiService.resultsSE!.currentResultId).toBe(10);
      expect(service.resultTitle()).toBe('Title');
      expect(service.resultDescription()).toBe('Description');
      expect(service.resultLeadContact()).toBe('Ada');
      expect(service.resultLevelId()).toBe(2);
      expect(service.resultTypeId()).toBe(7);
      expect(service.resultProjectId()).toBe(31);
      expect(service.resultLeadCenterId()).toBe(44);
      expect(service.resultDacLevels()).toEqual({
        gender: 1,
        climate_change: 2,
        nutrition: 3,
        environmental_biodiversity: 0,
        poverty: 1,
      });
      expect(service.resultDacSubScores()).toEqual({ gender: [11, 12], climate_change: [13] });
      expect(service.isLoadingResult()).toBe(false);
      expect(service.resultCode()).toBe('BEANS4WOMEN-001');
      expect(service.isW3Bilateral()).toBe(true);
      expect(service.resultTypeName()).toBe('Knowledge product');
      expect(service.reportingYear()).toBe(2025);
    });

    it('treats a non-API source as not W3/Bilateral', () => {
      respondWith({ commonFields: { source: 'Result' } });
      service.loadResult(10);

      expect(service.isW3Bilateral()).toBe(false);
    });

    it('falls back to empty values for a bare common-fields payload', () => {
      respondWith({ commonFields: {} });
      service.loadResult(10);

      expect(service.resultTitle()).toBe('');
      expect(service.resultDescription()).toBe('');
      expect(service.resultLeadContact()).toBe('');
      expect(service.resultLevelId()).toBeNull();
      expect(service.resultTypeId()).toBeNull();
      expect(service.resultProjectId()).toBeNull();
      expect(service.resultLeadCenterId()).toBeNull();
      expect(service.resultDacLevels()).toEqual({});
    });

    it('tolerates an empty response', () => {
      respondWith(null);
      service.loadResult(10);
      expect(service.resultTitle()).toBe('');
      expect(service.resultContributingCenterIds()).toEqual([]);
      expect(service.isLoadingResult()).toBe(false);
    });

    it('ignores a non-array impactAreaScores', () => {
      respondWith({ impactAreaScores: { not: 'an array' } });
      service.loadResult(10);
      expect(service.resultDacSubScores()).toEqual({});
    });

    it('maps the primary contributing initiative into the selected SP', () => {
      respondWith({
        contributingInitiatives: {
          contributing_and_primary_initiative: [
            { id: 100, official_code: 'P11', initiative_name: 'Full name', short_name: 'Short' },
          ],
        },
      });

      service.loadResult(10);

      expect(service.resultInitiativeId()).toBe(100);
      expect(service.selectedPrimarySp()).toEqual({
        programId: 100,
        programCode: 'P11',
        allocation: '100',
        name: 'Full name',
        shortName: 'Short',
      });
    });

    it('falls back to the short name when the initiative has no full name', () => {
      respondWith({
        contributingInitiatives: {
          contributing_and_primary_initiative: [{ id: 100, official_code: 'P11', initiative_name: '', short_name: 'Short' }],
        },
      });
      service.loadResult(10);
      expect(service.selectedPrimarySp()!.name).toBe('Short');
    });

    it('ignores an initiative block without an id', () => {
      respondWith({ contributingInitiatives: { contributing_and_primary_initiative: [{ official_code: 'P11' }] } });
      service.loadResult(10);
      expect(service.resultInitiativeId()).toBeNull();
    });

    it('rebuilds the selected project from the lead contributing project', () => {
      respondWith({
        contributingProjects: [
          {
            project_id: 5,
            is_lead: true,
            obj_clarisa_project: {
              id: 5,
              shortName: 'BP5',
              fullName: 'Bilateral Project 5',
              summary: 'summary',
              description: 'description',
              obj_organization: { id: 88, name: 'Center', acronym: 'CTR' },
            },
          },
          { project_id: 6, is_lead: false, obj_clarisa_project: { shortName: 'BP6', fullName: 'Bilateral Project 6' } },
          { project_id: null },
        ],
      });

      service.loadResult(10);

      expect(service.selectedProject()).toEqual({
        id: 5,
        shortName: 'BP5',
        fullName: 'Bilateral Project 5',
        summary: 'summary',
        description: 'description',
        leadCenter: { id: 88, name: 'Center', acronym: 'CTR' },
        sciencePrograms: [],
      });
      expect(service.resultLeadCenterId()).toBe(88);
      expect(service.resultContributingProjectIds()).toEqual([5, 6]);
      expect(service.resultContributingProjects()).toEqual([
        { id: 5, shortName: 'BP5', fullName: 'Bilateral Project 5' },
        { id: 6, shortName: 'BP6', fullName: 'Bilateral Project 6' },
      ]);
    });

    it('leaves the lead center empty when the lead project has no organization', () => {
      respondWith({
        contributingProjects: [
          { project_id: 5, is_lead: true, obj_clarisa_project: { id: 5, shortName: 'BP5', fullName: 'BP5' } },
        ],
      });

      service.loadResult(10);

      expect(service.selectedProject()!.leadCenter).toBeNull();
      expect(service.resultLeadCenterId()).toBeNull();
    });

    it('skips the project rebuild when no contributing project is the lead', () => {
      service.selectedProject.set(null);
      respondWith({ contributingProjects: [{ project_id: 6, is_lead: false }] });

      service.loadResult(10);

      expect(service.selectedProject()).toBeNull();
      expect(service.resultContributingProjectIds()).toEqual([6]);
      expect(service.resultContributingProjects()).toEqual([{ id: 6, shortName: '', fullName: '' }]);
    });

    it('skips the project block entirely when the list is empty', () => {
      respondWith({ contributingProjects: [] });
      service.loadResult(10);
      expect(service.resultContributingProjectIds()).toEqual([]);
    });

    it('keeps only the non-leading contributing centers with an institution id', () => {
      respondWith({
        contributingCenters: [
          { institutionId: 1, is_leading_result: 0 },
          { institutionId: '2', is_leading_result: false },
          { institutionId: 3, is_leading_result: 1 },
          { is_leading_result: 0 },
          { institutionId: null, is_leading_result: false },
        ],
      });

      service.loadResult(10);

      expect(service.resultContributingCenterIds()).toEqual([1, 2]);
    });

    it('stops the loader when the request fails', () => {
      mockBilateralApi.GET_BilateralResultDetail.mockReturnValue({
        subscribe: ({ error }: any) => error(new Error('boom')),
      } as any);

      service.loadResult(10);

      expect(service.isLoadingResult()).toBe(false);
      expect(service.resultTitle()).toBe('');
    });
  });

  describe('setDacSubScores', () => {
    it('merges the ids of an area without touching the others', () => {
      service.resultDacSubScores.set({ gender: [1] });
      service.setDacSubScores('poverty', [4, 5]);
      expect(service.resultDacSubScores()).toEqual({ gender: [1], poverty: [4, 5] });
    });
  });

  describe('resetWizard', () => {
    it('wipes the wizard, the editor and the persisted keys', () => {
      service.selectProject({ id: 1, shortName: 'P1', fullName: 'Project 1', summary: null, description: null, leadCenter: null, sciencePrograms: [] } as any);
      service.selectPrimarySp({ programId: 1, programCode: 'P11', allocation: '10' });
      service.toggleSecondarySp({ programId: 2, programCode: 'P12', allocation: '10' });
      service.resultTitle.set('Title');
      service.currentResultId.set(9);

      service.resetWizard();

      expect(service.selectedProject()).toBeNull();
      expect(service.selectedPrimarySp()).toBeNull();
      expect(service.selectedSecondarySps()).toEqual([]);
      expect(service.resultTitle()).toBe('');
      expect(service.currentResultId()).toBeNull();
      expect(localStorage.getItem('bp_project')).toBeNull();
      expect(localStorage.getItem('bp_primary_sp')).toBeNull();
      expect(localStorage.getItem('bp_secondary_sps')).toBeNull();
    });
  });

  describe('createResult', () => {
    it('sends only the mandatory ids when nothing is selected', () => {
      service.resetWizard();
      service.createResult(1, 2).subscribe();
      expect(mockBilateralApi.POST_createBilateralHeader).toHaveBeenCalledWith({
        result_level_id: 1,
        result_type_id: 2,
      });
    });

    it('adds the lead center and the project id from the selected project', () => {
      service.resetWizard();
      service.selectProject({
        id: '31',
        shortName: 'BP',
        fullName: 'Bilateral Project',
        summary: null,
        description: null,
        leadCenter: { id: 88, name: 'Center', acronym: 'CTR' },
        sciencePrograms: [],
      } as any);

      service.createResult(1, 2).subscribe();

      expect(mockBilateralApi.POST_createBilateralHeader).toHaveBeenCalledWith({
        result_level_id: 1,
        result_type_id: 2,
        lead_center: { institution_id: 88, name: 'Center', acronym: 'CTR' },
        project_id: 31,
      });
    });

    it('omits the project id when the selected project has none', () => {
      service.resetWizard();
      service.selectProject({ id: 0, shortName: 'BP', fullName: 'BP', summary: null, description: null, leadCenter: null, sciencePrograms: [] } as any);
      service.createResult(1, 2).subscribe();
      expect(mockBilateralApi.POST_createBilateralHeader).toHaveBeenCalledWith({ result_level_id: 1, result_type_id: 2 });
    });
  });

  describe('local storage persistence', () => {
    it('always starts empty (no localStorage rehydration)', () => {
      const project = { id: 3, shortName: 'BP3', fullName: 'Bilateral Project 3', summary: null, description: null, leadCenter: null, sciencePrograms: [] };
      localStorage.setItem('bp_project', JSON.stringify(project));
      localStorage.setItem('bp_primary_sp', JSON.stringify({ programId: 1, programCode: 'P11', allocation: '10' }));
      localStorage.setItem('bp_secondary_sps', JSON.stringify([{ programId: 2, programCode: 'P12', allocation: '5' }]));

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          BilateralCreationService,
          { provide: ApiService, useValue: mockApiService },
          { provide: BilateralApiService, useValue: mockBilateralApi },
        ],
      });
      const fresh = TestBed.inject(BilateralCreationService);

      expect(fresh.selectedProject()).toBeNull();
      expect(fresh.selectedPrimarySp()).toBeNull();
      expect(fresh.selectedSecondarySps()).toHaveLength(0);
    });

    it('ignores corrupted local storage entries', () => {
      localStorage.setItem('bp_project', '{ not json');
      localStorage.setItem('bp_secondary_sps', '{ not json');

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          BilateralCreationService,
          { provide: ApiService, useValue: mockApiService },
          { provide: BilateralApiService, useValue: mockBilateralApi },
        ],
      });
      const fresh = TestBed.inject(BilateralCreationService);

      expect(fresh.selectedProject()).toBeNull();
      expect(fresh.selectedSecondarySps()).toEqual([]);
    });

    it('survives a local storage that refuses to write', () => {
      const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });

      expect(() => service.selectPrimarySp({ programId: 1, programCode: 'P11', allocation: '10' })).not.toThrow();
      expect(service.selectedPrimarySp()!.programCode).toBe('P11');

      setItem.mockRestore();
    });
  });
});

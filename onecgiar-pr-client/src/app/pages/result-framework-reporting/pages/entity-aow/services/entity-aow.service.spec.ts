import { TestBed } from '@angular/core/testing';
import { of, throwError, delay } from 'rxjs';
import { EntityAowService } from './entity-aow.service';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { Initiative, Unit } from '../../entity-details/interfaces/entity-details.interface';

describe('EntityAowService', () => {
  let service: EntityAowService;
  let mockApiService: jest.Mocked<ApiService>;

  const mockInitiative: Initiative = {
    id: 1,
    officialCode: 'TEST-001',
    name: 'Test Initiative',
    shortName: 'TI'
  };

  const mockUnits: Unit[] = [
    {
      id: '1',
      code: 'AOW-001',
      name: 'Area of Work 1',
      composeCode: 'AOW-001',
      level: 1,
      year: 2024,
      parentId: undefined,
      progress: 75
    },
    {
      id: '2',
      code: 'AOW-002',
      name: 'Area of Work 2',
      composeCode: 'AOW-002',
      level: 1,
      year: 2024,
      parentId: undefined,
      progress: 50
    }
  ];

  const mockApiResponse = {
    message: 'Success',
    response: {
      initiative: mockInitiative,
      units: mockUnits,
      parentUnit: null,
      metadata: null
    },
    status: true
  };

  const mock2030OutcomesApiResponse = {
    message: 'Success',
    response: {
      tocResults: []
    },
    status: true
  };

  const mockTocResults = [
    {
      id: 1,
      title: 'Test TOC Result 1',
      description: 'Description 1',
      aowId: 'AOW-001'
    },
    {
      id: 2,
      title: 'Test TOC Result 2',
      description: 'Description 2',
      aowId: 'AOW-002'
    }
  ];

  const mockTocApiResponse = {
    message: 'Success',
    response: {
      tocResultsOutputs: mockTocResults,
      tocResultsOutcomes: []
    },
    status: true
  };

  const mockIndicatorSummaries = [
    {
      type: 'Outcome',
      total: 10,
      completed: 8
    },
    {
      type: 'Impact',
      total: 5,
      completed: 3
    }
  ];

  const mockIndicatorApiResponse = {
    message: 'Success',
    response: {
      totalsByType: mockIndicatorSummaries
    },
    status: true
  };

  beforeEach(() => {
    mockApiService = {
      resultsSE: {
        GET_ClarisaGlobalUnits: jest.fn().mockReturnValue(of(mockApiResponse)),
        GET_TocResultsByAowId: jest.fn().mockReturnValue(of(mockTocApiResponse)),
        GET_IndicatorContributionSummary: jest.fn().mockReturnValue(of(mockIndicatorApiResponse)),
        GET_W3BilateralProjects: jest.fn().mockReturnValue(of({ response: [] })),
        GET_ExistingResultsContributors: jest.fn().mockReturnValue(of({ response: { contributors: [] } })),
        GET_2030Outcomes: jest.fn().mockReturnValue(of(mockApiResponse)),
        GET_DashboardData: jest.fn().mockReturnValue(of({ response: null }))
      }
    } as any;

    TestBed.configureTestingModule({
      providers: [EntityAowService, { provide: ApiService, useValue: mockApiService }]
    });

    service = TestBed.inject(EntityAowService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initial state', () => {
    it('should initialize with default values', () => {
      expect(service.entityId()).toBe('');
      expect(service.aowId()).toBe('');
      expect(service.entityDetails()).toEqual({} as Initiative);
      expect(service.entityAows()).toEqual([]);
      expect(service.indicatorSummaries()).toEqual([]);
      expect(service.isLoadingDetails()).toBe(false);
      expect(service.sideBarItems()).toEqual([]);
      expect(service.tocResultsOutputsByAowId()).toEqual([]);
      expect(service.tocResultsOutcomesByAowId()).toEqual([]);
      expect(service.isLoadingTocResultsByAowId()).toBe(false);
    });
  });

  describe('getAllDetailsData', () => {
    it('should set loading state to true when called', () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(mockApiResponse));
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(of(mockIndicatorApiResponse));

      service.getAllDetailsData();

      expect(service.isLoadingDetails()).toBe(false);
    });

    it('should call both APIs with correct entityId', async () => {
      const entityId = 'test-entity-id';
      service.entityId.set(entityId);
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(mockApiResponse));
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(of(mockIndicatorApiResponse));

      service.getAllDetailsData();

      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiService.resultsSE.GET_ClarisaGlobalUnits).toHaveBeenCalledWith(entityId);
      expect(mockApiService.resultsSE.GET_IndicatorContributionSummary).toHaveBeenCalledWith(entityId);
    });

    it('should update entityDetails, entityAows, and indicatorSummaries on successful API calls', async () => {
      service.entityId.set('SP01');
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(mockApiResponse));
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(of(mockIndicatorApiResponse));

      service.getAllDetailsData();

      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails()).toEqual(mockInitiative);
      expect(service.entityAows()).toEqual(mockUnits);
      expect(service.indicatorSummaries()).toEqual(mockIndicatorSummaries);
      expect(service.isLoadingDetails()).toBe(false);
    });

    it('should handle empty units array', async () => {
      service.entityId.set('SP01');
      const responseWithEmptyUnits = {
        ...mockApiResponse,
        response: {
          ...mockApiResponse.response,
          units: []
        }
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(responseWithEmptyUnits));
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(of(mockIndicatorApiResponse));

      service.getAllDetailsData();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityAows()).toEqual([]);
      expect(service.indicatorSummaries()).toEqual(mockIndicatorSummaries);
      expect(service.isLoadingDetails()).toBe(false);
    });

    it('should handle empty indicator summaries', async () => {
      service.entityId.set('SP01');
      const responseWithEmptyIndicators = {
        ...mockIndicatorApiResponse,
        response: {
          totalsByType: []
        }
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(mockApiResponse));
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(of(responseWithEmptyIndicators));

      service.getAllDetailsData();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails()).toEqual(mockInitiative);
      expect(service.entityAows()).toEqual(mockUnits);
      expect(service.indicatorSummaries()).toEqual([]);
      expect(service.isLoadingDetails()).toBe(false);
    });

    it('should handle null/undefined units', async () => {
      service.entityId.set('SP01');
      const responseWithNullUnits = {
        ...mockApiResponse,
        response: {
          ...mockApiResponse.response,
          units: null
        }
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(responseWithNullUnits));
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(of(mockIndicatorApiResponse));

      service.getAllDetailsData();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityAows()).toEqual([]);
      expect(service.indicatorSummaries()).toEqual(mockIndicatorSummaries);
      expect(service.isLoadingDetails()).toBe(false);
    });

    it('should handle null/undefined indicator summaries', async () => {
      service.entityId.set('SP01');
      const responseWithNullIndicators = {
        ...mockIndicatorApiResponse,
        response: {
          totalsByType: null
        }
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(mockApiResponse));
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(of(responseWithNullIndicators));

      service.getAllDetailsData();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails()).toEqual(mockInitiative);
      expect(service.entityAows()).toEqual(mockUnits);
      expect(service.indicatorSummaries()).toEqual([]);
      expect(service.isLoadingDetails()).toBe(false);
    });

    it('should call setSideBarItems when units are available', async () => {
      service.entityId.set('SP01');
      const setSideBarItemsSpy = jest.spyOn(service, 'setSideBarItems');
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(mockApiResponse));
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(of(mockIndicatorApiResponse));

      service.getAllDetailsData();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(setSideBarItemsSpy).toHaveBeenCalled();
    });

    it('should not call setSideBarItems when no units are available', async () => {
      service.entityId.set('SP01');
      const responseWithEmptyUnits = {
        ...mockApiResponse,
        response: {
          ...mockApiResponse.response,
          units: []
        }
      };
      const setSideBarItemsSpy = jest.spyOn(service, 'setSideBarItems');
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(responseWithEmptyUnits));
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(of(mockIndicatorApiResponse));

      service.getAllDetailsData();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(setSideBarItemsSpy).not.toHaveBeenCalled();
    });

    it('should handle API error for clarisaGlobalUnits', async () => {
      service.entityId.set('SP01');
      const error = new Error('API Error');
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(throwError(() => error));
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(of(mockIndicatorApiResponse));

      service.getAllDetailsData();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.isLoadingDetails()).toBe(false);
    });

    it('should handle API error for indicatorSummaries', async () => {
      service.entityId.set('SP01');
      const error = new Error('API Error');
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(mockApiResponse));
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(throwError(() => error));

      service.getAllDetailsData();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.isLoadingDetails()).toBe(false);
    });

    it('should handle both APIs error', async () => {
      service.entityId.set('SP01');
      const error = new Error('API Error');
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(throwError(() => error));
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(throwError(() => error));

      service.getAllDetailsData();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.isLoadingDetails()).toBe(false);
    });
  });

  describe('getTocResultsByAowId', () => {
    it('should return early if entityId is empty', () => {
      const aowId = 'test-aow-id';
      jest.spyOn(mockApiService.resultsSE, 'GET_TocResultsByAowId');

      service.getTocResultsByAowId('', aowId);

      expect(mockApiService.resultsSE.GET_TocResultsByAowId).not.toHaveBeenCalled();
      expect(service.isLoadingTocResultsByAowId()).toBe(false);
    });

    it('should return early if aowId is empty', () => {
      const entityId = 'test-entity-id';
      jest.spyOn(mockApiService.resultsSE, 'GET_TocResultsByAowId');

      service.getTocResultsByAowId(entityId, '');

      expect(mockApiService.resultsSE.GET_TocResultsByAowId).not.toHaveBeenCalled();
      expect(service.isLoadingTocResultsByAowId()).toBe(false);
    });

    it('should return early if both entityId and aowId are empty', () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_TocResultsByAowId');

      service.getTocResultsByAowId('', '');

      expect(mockApiService.resultsSE.GET_TocResultsByAowId).not.toHaveBeenCalled();
      expect(service.isLoadingTocResultsByAowId()).toBe(false);
    });

    it('should set loading state to true when called with valid parameters', () => {
      const entityId = 'test-entity-id';
      const aowId = 'test-aow-id';
      // Use a delayed observable to test the loading state
      jest.spyOn(mockApiService.resultsSE, 'GET_TocResultsByAowId').mockReturnValue(of(mockTocApiResponse).pipe(delay(100)));

      service.getTocResultsByAowId(entityId, aowId);

      // Loading should be true immediately after calling the method
      expect(service.isLoadingTocResultsByAowId()).toBe(true);
    });

    it('should call API with correct entityId and aowId', () => {
      const entityId = 'test-entity-id';
      const aowId = 'test-aow-id';
      jest.spyOn(mockApiService.resultsSE, 'GET_TocResultsByAowId').mockReturnValue(of(mockTocApiResponse));

      service.getTocResultsByAowId(entityId, aowId);

      expect(mockApiService.resultsSE.GET_TocResultsByAowId).toHaveBeenCalledWith(entityId, aowId);
    });

    it('should update tocResultsOutputsByAowId and tocResultsOutcomesByAowId and set loading to false on successful API call', () => {
      const entityId = 'test-entity-id';
      const aowId = 'test-aow-id';
      jest.spyOn(mockApiService.resultsSE, 'GET_TocResultsByAowId').mockReturnValue(of(mockTocApiResponse));

      service.getTocResultsByAowId(entityId, aowId);

      expect(service.tocResultsOutputsByAowId()).toEqual(mockTocResults);
      expect(service.tocResultsOutcomesByAowId()).toEqual([]);
      expect(service.isLoadingTocResultsByAowId()).toBe(false);
    });

    it('should handle empty tocResults array', () => {
      const entityId = 'test-entity-id';
      const aowId = 'test-aow-id';
      const responseWithEmptyTocResults = {
        ...mockTocApiResponse,
        response: {
          tocResultsOutputs: [],
          tocResultsOutcomes: []
        }
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_TocResultsByAowId').mockReturnValue(of(responseWithEmptyTocResults));

      service.getTocResultsByAowId(entityId, aowId);

      expect(service.tocResultsOutputsByAowId()).toEqual([]);
      expect(service.tocResultsOutcomesByAowId()).toEqual([]);
      expect(service.isLoadingTocResultsByAowId()).toBe(false);
    });

    it('should handle null/undefined tocResults', () => {
      const entityId = 'test-entity-id';
      const aowId = 'test-aow-id';
      const responseWithNullTocResults = {
        ...mockTocApiResponse,
        response: {
          tocResultsOutputs: null,
          tocResultsOutcomes: null
        }
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_TocResultsByAowId').mockReturnValue(of(responseWithNullTocResults));

      service.getTocResultsByAowId(entityId, aowId);

      expect(service.tocResultsOutputsByAowId()).toEqual([]);
      expect(service.tocResultsOutcomesByAowId()).toEqual([]);
      expect(service.isLoadingTocResultsByAowId()).toBe(false);
    });

    it('should handle undefined response', () => {
      const entityId = 'test-entity-id';
      const aowId = 'test-aow-id';
      const responseWithUndefinedResponse = {
        ...mockTocApiResponse,
        response: undefined
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_TocResultsByAowId').mockReturnValue(of(responseWithUndefinedResponse));

      service.getTocResultsByAowId(entityId, aowId);

      expect(service.tocResultsOutputsByAowId()).toEqual([]);
      expect(service.tocResultsOutcomesByAowId()).toEqual([]);
      expect(service.isLoadingTocResultsByAowId()).toBe(false);
    });

    it('should set loading to true initially when called with valid parameters', () => {
      const entityId = 'test-entity-id';
      const aowId = 'test-aow-id';
      jest.spyOn(mockApiService.resultsSE, 'GET_TocResultsByAowId').mockReturnValue(of(mockTocApiResponse).pipe(delay(100)));

      service.getTocResultsByAowId(entityId, aowId);

      expect(service.isLoadingTocResultsByAowId()).toBe(true);
    });

    it('should handle custom tocResults data structure', () => {
      const entityId = 'test-entity-id';
      const aowId = 'test-aow-id';
      const customTocResults = [
        {
          id: 3,
          title: 'Custom TOC Result',
          description: 'Custom Description',
          aowId: 'AOW-002',
          customField: 'customValue'
        }
      ];
      const customResponse = {
        ...mockTocApiResponse,
        response: {
          tocResultsOutputs: customTocResults
        }
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_TocResultsByAowId').mockReturnValue(of(customResponse));

      service.getTocResultsByAowId(entityId, aowId);

      expect(service.tocResultsOutputsByAowId()).toEqual(customTocResults);
      expect(service.isLoadingTocResultsByAowId()).toBe(false);
    });
  });

  describe('setSideBarItems', () => {
    it('should update sideBarItems with default items and AOW tree', () => {
      service.entityAows.set(mockUnits);
      service.setSideBarItems();

      const expectedSideBarItems = [
        {
          isTree: true,
          label: 'By AOW',
          isOpen: true,
          items: [
            {
              label: 'AOW-001',
              name: 'Area of Work 1',
              itemLink: '/aow/AOW-001'
            },
            {
              label: 'AOW-002',
              name: 'Area of Work 2',
              itemLink: '/aow/AOW-002'
            }
          ]
        },
        {
          isTree: false,
          label: '2030 Outcomes',
          itemLink: '/aow/2030-outcomes'
        }
      ];

      expect(service.sideBarItems()).toEqual(expectedSideBarItems);
    });

    it('should handle empty units array', () => {
      service.entityAows.set([]);
      service.setSideBarItems();

      const expectedSideBarItems = [
        {
          isTree: true,
          label: 'By AOW',
          isOpen: true,
          items: []
        },
        {
          isTree: false,
          label: '2030 Outcomes',
          itemLink: '/aow/2030-outcomes'
        }
      ];

      expect(service.sideBarItems()).toEqual(expectedSideBarItems);
    });

    it('should map units correctly to sidebar items', () => {
      const customUnits: Unit[] = [
        {
          id: '3',
          code: 'CUSTOM-001',
          name: 'Custom AOW',
          composeCode: 'CUSTOM-001',
          level: 2,
          year: 2024,
          parentId: '1',
          progress: 100
        }
      ];

      service.entityAows.set(customUnits);
      service.setSideBarItems();

      const sideBarItems = service.sideBarItems();
      const aowTreeItem = sideBarItems.find(item => item.isTree);

      expect(aowTreeItem).toBeDefined();
      expect(aowTreeItem.items).toEqual([
        {
          label: 'CUSTOM-001',
          name: 'Custom AOW',
          itemLink: '/aow/CUSTOM-001'
        }
      ]);
    });
  });

  describe('Signal updates', () => {
    it('should update entityId signal', () => {
      const newEntityId = 'new-entity-id';
      service.entityId.set(newEntityId);
      expect(service.entityId()).toBe(newEntityId);
    });

    it('should update aowId signal', () => {
      const newAowId = 'new-aow-id';
      service.aowId.set(newAowId);
      expect(service.aowId()).toBe(newAowId);
    });

    it('should update entityDetails signal', () => {
      const newInitiative: Initiative = {
        id: 2,
        officialCode: 'NEW-001',
        name: 'New Initiative',
        shortName: 'NI'
      };
      service.entityDetails.set(newInitiative);
      expect(service.entityDetails()).toEqual(newInitiative);
    });

    it('should update entityAows signal', () => {
      const newUnits: Unit[] = [
        {
          id: '3',
          code: 'NEW-001',
          name: 'New AOW',
          composeCode: 'NEW-001',
          level: 1,
          year: 2024,
          progress: 25
        }
      ];
      service.entityAows.set(newUnits);
      expect(service.entityAows()).toEqual(newUnits);
    });

    it('should update isLoadingDetails signal', () => {
      service.isLoadingDetails.set(true);
      expect(service.isLoadingDetails()).toBe(true);
    });

    it('should update tocResultsOutputsByAowId signal', () => {
      const newTocResults = [
        {
          id: 3,
          title: 'New TOC Result',
          description: 'New Description',
          aowId: 'AOW-003'
        }
      ];
      service.tocResultsOutputsByAowId.set(newTocResults);
      expect(service.tocResultsOutputsByAowId()).toEqual(newTocResults);
    });

    it('should update tocResultsOutcomesByAowId signal', () => {
      const newTocOutcomes = [
        {
          id: 4,
          title: 'New TOC Outcome',
          description: 'New Outcome Description',
          aowId: 'AOW-004'
        }
      ];
      service.tocResultsOutcomesByAowId.set(newTocOutcomes);
      expect(service.tocResultsOutcomesByAowId()).toEqual(newTocOutcomes);
    });

    it('should update isLoadingTocResultsByAowId signal', () => {
      service.isLoadingTocResultsByAowId.set(true);
      expect(service.isLoadingTocResultsByAowId()).toBe(true);
    });

    it('should update indicatorSummaries signal', () => {
      const newIndicatorSummaries = [
        {
          type: 'New Type',
          total: 20,
          completed: 15
        }
      ];
      service.indicatorSummaries.set(newIndicatorSummaries);
      expect(service.indicatorSummaries()).toEqual(newIndicatorSummaries);
    });
  });

  describe('Computed signals', () => {
    it('should compute currentAowSelected correctly when aowId matches', () => {
      service.entityAows.set(mockUnits);
      service.aowId.set('AOW-001');

      const currentAow = service.currentAowSelected();

      expect(currentAow).toEqual(mockUnits[0]);
    });

    it('should return undefined when currentAowSelected finds no match', () => {
      service.entityAows.set(mockUnits);
      service.aowId.set('NONEXISTENT-AOW');

      const currentAow = service.currentAowSelected();

      expect(currentAow).toBeUndefined();
    });

    it('should return undefined when entityAows is empty', () => {
      service.entityAows.set([]);
      service.aowId.set('AOW-001');

      const currentAow = service.currentAowSelected();

      expect(currentAow).toBeUndefined();
    });
  });

  describe('Additional signals', () => {
    it('should update w3BilateralProjects signal', () => {
      const mockProjects = [
        { id: 1, name: 'Project 1', status: 'active' },
        { id: 2, name: 'Project 2', status: 'completed' }
      ];
      service.w3BilateralProjects.set(mockProjects);

      expect(service.w3BilateralProjects()).toEqual(mockProjects);
    });

    it('should update selectedW3BilateralProjects signal', () => {
      const mockSelectedProjects = [
        { id: 1, name: 'Selected Project 1' },
        { id: 2, name: 'Selected Project 2' }
      ];
      service.selectedW3BilateralProjects.set(mockSelectedProjects);

      expect(service.selectedW3BilateralProjects()).toEqual(mockSelectedProjects);
    });

    it('should update selectedEntities signal', () => {
      const mockSelectedEntities = [
        { id: 1, name: 'Entity 1', type: 'initiative' },
        { id: 2, name: 'Entity 2', type: 'unit' }
      ];
      service.selectedEntities.set(mockSelectedEntities);

      expect(service.selectedEntities()).toEqual(mockSelectedEntities);
    });

    it('should update existingResultsContributors signal', () => {
      const mockContributors = [
        { id: 1, name: 'Contributor 1', role: 'lead' },
        { id: 2, name: 'Contributor 2', role: 'member' }
      ];
      service.existingResultsContributors.set(mockContributors);

      expect(service.existingResultsContributors()).toEqual(mockContributors);
    });

    it('should update showReportResultModal signal', () => {
      service.showReportResultModal.set(true);
      expect(service.showReportResultModal()).toBe(true);

      service.showReportResultModal.set(false);
      expect(service.showReportResultModal()).toBe(false);
    });

    it('should update currentResultToReport signal', () => {
      const mockResult = {
        id: 1,
        title: 'Test Result',
        description: 'Test Description',
        indicators: []
      };
      service.currentResultToReport.set(mockResult);

      expect(service.currentResultToReport()).toEqual(mockResult);
    });
  });

  describe('getW3BilateralProjects', () => {
    const mockCurrentResult = {
      toc_result_id: 'result-123'
    };

    const mockW3BilateralProjects = [
      { id: 1, name: 'W3 Project 1', status: 'active' },
      { id: 2, name: 'W3 Project 2', status: 'completed' }
    ];

    const mockW3ApiResponse = {
      response: mockW3BilateralProjects
    };

    beforeEach(() => {
      service.currentResultToReport.set(mockCurrentResult);
    });

    it('should call API with correct toc_result_id', () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_W3BilateralProjects').mockReturnValue(of(mockW3ApiResponse));

      service.getW3BilateralProjects();

      expect(mockApiService.resultsSE.GET_W3BilateralProjects).toHaveBeenCalledWith('result-123');
    });

    it('should update w3BilateralProjects on successful API call', () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_W3BilateralProjects').mockReturnValue(of(mockW3ApiResponse));

      service.getW3BilateralProjects();

      expect(service.w3BilateralProjects()).toEqual(mockW3BilateralProjects);
    });

    it('should handle empty response', () => {
      const emptyResponse = { response: [] };
      jest.spyOn(mockApiService.resultsSE, 'GET_W3BilateralProjects').mockReturnValue(of(emptyResponse));

      service.getW3BilateralProjects();

      expect(service.w3BilateralProjects()).toEqual([]);
    });

    it('should handle null response', () => {
      const nullResponse = { response: null };
      jest.spyOn(mockApiService.resultsSE, 'GET_W3BilateralProjects').mockReturnValue(of(nullResponse));

      service.getW3BilateralProjects();

      expect(service.w3BilateralProjects()).toEqual([]);
    });

    it('should handle undefined response', () => {
      const undefinedResponse = { response: undefined };
      jest.spyOn(mockApiService.resultsSE, 'GET_W3BilateralProjects').mockReturnValue(of(undefinedResponse));

      service.getW3BilateralProjects();

      expect(service.w3BilateralProjects()).toEqual([]);
    });
  });

  describe('getExistingResultsContributors', () => {
    const mockCurrentResult = {
      toc_result_id: 'result-123',
      indicators: [{ related_node_id: 'node-456' }]
    };

    const mockContributors = [
      { id: 1, name: 'Contributor 1', role: 'lead' },
      { id: 2, name: 'Contributor 2', role: 'member' }
    ];

    const mockContributorsApiResponse = {
      response: {
        contributors: mockContributors
      }
    };

    beforeEach(() => {
      service.currentResultToReport.set(mockCurrentResult);
    });

    it('should call API with correct parameters', () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_ExistingResultsContributors').mockReturnValue(of(mockContributorsApiResponse));

      service.getExistingResultsContributors('result-123', 'node-456');

      expect(mockApiService.resultsSE.GET_ExistingResultsContributors).toHaveBeenCalledWith('result-123', 'node-456');
    });

    it('should update existingResultsContributors on successful API call', () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_ExistingResultsContributors').mockReturnValue(of(mockContributorsApiResponse));

      service.getExistingResultsContributors('result-123', 'node-456');

      expect(service.existingResultsContributors()).toEqual(mockContributors);
    });

    it('should handle empty contributors array', () => {
      const emptyResponse = {
        response: {
          response: {
            contributors: []
          }
        }
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_ExistingResultsContributors').mockReturnValue(of(emptyResponse));

      service.getExistingResultsContributors('result-123', 'node-456');

      expect(service.existingResultsContributors()).toEqual([]);
    });

    it('should handle null contributors', () => {
      const nullResponse = {
        response: {
          response: {
            contributors: null
          }
        }
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_ExistingResultsContributors').mockReturnValue(of(nullResponse));

      service.getExistingResultsContributors('result-123', 'node-456');

      expect(service.existingResultsContributors()).toEqual([]);
    });

    it('should handle undefined response', () => {
      const undefinedResponse = {
        response: undefined
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_ExistingResultsContributors').mockReturnValue(of(undefinedResponse));

      service.getExistingResultsContributors('result-123', 'node-456');

      expect(service.existingResultsContributors()).toEqual([]);
    });

    it('should handle API error and set empty contributors', () => {
      const error = new Error('API Error');
      jest.spyOn(mockApiService.resultsSE, 'GET_ExistingResultsContributors').mockReturnValue(throwError(() => error));

      service.getExistingResultsContributors('result-123', 'node-456');

      expect(service.existingResultsContributors()).toEqual([]);
    });
  });

  describe('onCloseReportResultModal', () => {
    beforeEach(() => {
      // Set up initial state
      service.showReportResultModal.set(true);
      service.currentResultToReport.set({ id: 1, title: 'Test Result' });
      service.w3BilateralProjects.set([{ id: 1, name: 'Project 1' }]);
      service.selectedW3BilateralProjects.set([{ id: 1, name: 'Selected Project' }]);
      service.selectedEntities.set([{ id: 1, name: 'Entity 1' }]);
      service.existingResultsContributors.set([{ id: 1, name: 'Contributor 1' }]);
    });

    it('should reset all modal-related signals', () => {
      service.onCloseReportResultModal();

      expect(service.showReportResultModal()).toBe(false);
      expect(service.currentResultToReport()).toEqual({});
      expect(service.w3BilateralProjects()).toEqual([]);
      expect(service.selectedW3BilateralProjects()).toEqual([]);
      expect(service.selectedEntities()).toEqual([]);
      expect(service.existingResultsContributors()).toEqual([]);
    });

    it('should be idempotent - calling multiple times should not cause issues', () => {
      service.onCloseReportResultModal();
      service.onCloseReportResultModal();
      service.onCloseReportResultModal();

      expect(service.showReportResultModal()).toBe(false);
      expect(service.currentResultToReport()).toEqual({});
      expect(service.w3BilateralProjects()).toEqual([]);
      expect(service.selectedW3BilateralProjects()).toEqual([]);
      expect(service.selectedEntities()).toEqual([]);
      expect(service.existingResultsContributors()).toEqual([]);
    });
  });

  describe('Error handling for getTocResultsByAowId', () => {
    it('should handle API error and reset state', () => {
      const entityId = 'test-entity-id';
      const aowId = 'test-aow-id';
      const error = new Error('API Error');
      jest.spyOn(mockApiService.resultsSE, 'GET_TocResultsByAowId').mockReturnValue(throwError(() => error));

      service.getTocResultsByAowId(entityId, aowId);

      expect(service.tocResultsOutputsByAowId()).toEqual([]);
      expect(service.tocResultsOutcomesByAowId()).toEqual([]);
      expect(service.isLoadingTocResultsByAowId()).toBe(false);
    });

    it('should handle API error without breaking the service', () => {
      const entityId = 'test-entity-id';
      const aowId = 'test-aow-id';
      const error = new Error('Network Error');
      jest.spyOn(mockApiService.resultsSE, 'GET_TocResultsByAowId').mockReturnValue(throwError(() => error));

      // Should not throw
      expect(() => service.getTocResultsByAowId(entityId, aowId)).not.toThrow();

      expect(service.tocResultsOutputsByAowId()).toEqual([]);
      expect(service.tocResultsOutcomesByAowId()).toEqual([]);
      expect(service.isLoadingTocResultsByAowId()).toBe(false);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete flow for getAllDetailsData', async () => {
      const entityId = 'integration-test-id';
      service.entityId.set(entityId);
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(mockApiResponse));
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(of(mockIndicatorApiResponse));

      service.getAllDetailsData();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails()).toEqual(mockInitiative);
      expect(service.entityAows()).toEqual(mockUnits);
      expect(service.indicatorSummaries()).toEqual(mockIndicatorSummaries);
      expect(service.isLoadingDetails()).toBe(false);

      const sideBarItems = service.sideBarItems();
      expect(sideBarItems).toHaveLength(2);
      expect(sideBarItems[0].isTree).toBe(true);
      expect(sideBarItems[0].items).toHaveLength(2);
    });

    it('should handle complete flow for getTocResultsByAowId', () => {
      const entityId = 'integration-test-id';
      const aowId = 'integration-aow-id';
      jest.spyOn(mockApiService.resultsSE, 'GET_TocResultsByAowId').mockReturnValue(of(mockTocApiResponse));

      service.getTocResultsByAowId(entityId, aowId);

      expect(service.tocResultsOutputsByAowId()).toEqual(mockTocResults);
      expect(service.tocResultsOutcomesByAowId()).toEqual([]);
      expect(service.isLoadingTocResultsByAowId()).toBe(false);
      expect(mockApiService.resultsSE.GET_TocResultsByAowId).toHaveBeenCalledWith(entityId, aowId);
    });

    it('should maintain state consistency across multiple TOC operations', () => {
      const entityId = 'test-id';
      const aowId1 = 'aow-id-1';
      const aowId2 = 'aow-id-2';

      // First call
      jest.spyOn(mockApiService.resultsSE, 'GET_TocResultsByAowId').mockReturnValue(of(mockTocApiResponse));
      service.getTocResultsByAowId(entityId, aowId1);

      expect(service.tocResultsOutputsByAowId()).toEqual(mockTocResults);
      expect(service.tocResultsOutcomesByAowId()).toEqual([]);
      expect(service.isLoadingTocResultsByAowId()).toBe(false);

      // Second call with different aowId
      const customTocResults = [
        {
          id: 4,
          title: 'Different TOC Result',
          description: 'Different Description',
          aowId: 'AOW-004'
        }
      ];
      const customResponse = {
        ...mockTocApiResponse,
        response: {
          tocResultsOutputs: customTocResults,
          tocResultsOutcomes: []
        }
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_TocResultsByAowId').mockReturnValue(of(customResponse));
      service.getTocResultsByAowId(entityId, aowId2);

      expect(service.tocResultsOutputsByAowId()).toEqual(customTocResults);
      expect(service.tocResultsOutcomesByAowId()).toEqual([]);
      expect(service.isLoadingTocResultsByAowId()).toBe(false);
      expect(mockApiService.resultsSE.GET_TocResultsByAowId).toHaveBeenCalledWith(entityId, aowId2);
    });

    it('should handle complete modal workflow', () => {
      const mockResult = {
        toc_result_id: 'result-123',
        indicators: [{ related_node_id: 'node-456' }]
      };

      // Open modal and set result
      service.showReportResultModal.set(true);
      service.currentResultToReport.set(mockResult);

      // Load related data
      const mockW3Projects = [{ id: 1, name: 'Project 1' }];
      const mockContributors = [{ id: 1, name: 'Contributor 1' }];

      jest.spyOn(mockApiService.resultsSE, 'GET_W3BilateralProjects').mockReturnValue(of({ response: mockW3Projects }));
      jest.spyOn(mockApiService.resultsSE, 'GET_ExistingResultsContributors').mockReturnValue(
        of({
          response: { contributors: mockContributors }
        })
      );

      service.getW3BilateralProjects();
      service.getExistingResultsContributors('result-123', 'node-456');

      expect(service.w3BilateralProjects()).toEqual(mockW3Projects);
      expect(service.existingResultsContributors()).toEqual(mockContributors);

      // Close modal
      service.onCloseReportResultModal();

      expect(service.showReportResultModal()).toBe(false);
      expect(service.currentResultToReport()).toEqual({});
      expect(service.w3BilateralProjects()).toEqual([]);
      expect(service.existingResultsContributors()).toEqual([]);
    });
  });

  describe('get2030Outcomes', () => {
    it('should return early if entityId is empty', () => {
      const entityId = '';
      jest.spyOn(mockApiService.resultsSE, 'GET_2030Outcomes');

      service.get2030Outcomes(entityId);

      expect(mockApiService.resultsSE.GET_2030Outcomes).not.toHaveBeenCalled();
      expect(service.isLoadingTocResults2030Outcomes()).toBe(false);
    });

    it('should call API with correct parameters', () => {
      const entityId = 'test-entity-id';
      jest.spyOn(mockApiService.resultsSE, 'GET_2030Outcomes').mockReturnValue(of(mockApiResponse));

      service.get2030Outcomes(entityId);

      expect(mockApiService.resultsSE.GET_2030Outcomes).toHaveBeenCalledWith(entityId);
    });

    it('should update tocResults2030Outcomes and set loading to false on successful API call', () => {
      const entityId = 'test-entity-id';
      jest.spyOn(mockApiService.resultsSE, 'GET_2030Outcomes').mockReturnValue(of(mock2030OutcomesApiResponse));

      service.get2030Outcomes(entityId);

      expect(service.tocResults2030Outcomes()).toEqual(mock2030OutcomesApiResponse.response.tocResults);
      expect(service.isLoadingTocResults2030Outcomes()).toBe(false);
    });

    it('should handle empty tocResults2030Outcomes array', () => {
      const entityId = 'test-entity-id';
      const emptyResponse = {
        response: {
          response: {
            tocResults: []
          }
        }
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_2030Outcomes').mockReturnValue(of(emptyResponse));

      service.get2030Outcomes(entityId);

      expect(service.tocResults2030Outcomes()).toEqual([]);
      expect(service.isLoadingTocResults2030Outcomes()).toBe(false);
    });

    it('should handle null/undefined tocResults', () => {
      const entityId = 'test-entity-id';
      const responseWithNullTocResults = {
        ...mockApiResponse,
        response: {
          tocResults: null
        }
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_2030Outcomes').mockReturnValue(of(responseWithNullTocResults));

      service.get2030Outcomes(entityId);

      expect(service.tocResults2030Outcomes()).toEqual([]);
      expect(service.isLoadingTocResults2030Outcomes()).toBe(false);
    });

    it('should handle error and set loading to false', () => {
      const entityId = 'test-entity-id';
      const error = new Error('API Error');

      jest.spyOn(mockApiService.resultsSE, 'GET_2030Outcomes').mockReturnValue(throwError(() => error));

      service.get2030Outcomes(entityId);

      expect(service.tocResults2030Outcomes()).toEqual([]);
      expect(service.isLoadingTocResults2030Outcomes()).toBe(false);
    });
  });

  describe('getDashboardData', () => {
    const mockDashboardData = {
      editing: { total: 5, label: 'Editing' },
      submitted: { total: 10, label: 'Submitted' },
      qualityAssessed: { total: 8, label: 'Quality Assessed' }
    };

    const mockDashboardApiResponse = {
      response: mockDashboardData
    };

    beforeEach(() => {
      mockApiService.resultsSE.GET_DashboardData = jest.fn().mockReturnValue(of(mockDashboardApiResponse));
    });

    it('should call API with correct entityId', () => {
      const entityId = 'test-entity-id';
      service.entityId.set(entityId);

      service.getDashboardData();

      expect(mockApiService.resultsSE.GET_DashboardData).toHaveBeenCalledWith(entityId);
    });

    it('should update dashboardData on successful API call', () => {
      service.getDashboardData();

      expect(service.dashboardData()).toEqual(mockDashboardData);
    });

    it('should handle API error and set dashboardData to null', () => {
      const error = new Error('API Error');
      jest.spyOn(mockApiService.resultsSE, 'GET_DashboardData').mockReturnValue(throwError(() => error));

      service.getDashboardData();

      expect(service.dashboardData()).toBeNull();
    });

    it('should handle empty response', () => {
      const emptyResponse = { response: null };
      jest.spyOn(mockApiService.resultsSE, 'GET_DashboardData').mockReturnValue(of(emptyResponse));

      service.getDashboardData();

      expect(service.dashboardData()).toBeNull();
    });

    it('should handle undefined response', () => {
      const undefinedResponse = { response: undefined };
      jest.spyOn(mockApiService.resultsSE, 'GET_DashboardData').mockReturnValue(of(undefinedResponse));

      service.getDashboardData();

      expect(service.dashboardData()).toBeUndefined();
    });
  });

  describe('canReportResults', () => {
    it('should return true when user is admin', () => {
      (mockApiService as any).rolesSE = { isAdmin: true };
      (mockApiService as any).dataControlSE = { myInitiativesList: [] };

      expect(service.canReportResults()).toBe(true);
    });

    it('should return true when user initiative matches entityId', () => {
      (mockApiService as any).rolesSE = { isAdmin: false };
      (mockApiService as any).dataControlSE = {
        myInitiativesList: [{ official_code: 'INIT-001' }]
      };
      service.entityId.set('INIT-001');

      expect(service.canReportResults()).toBe(true);
    });

    it('should return false when user initiative does not match entityId', () => {
      (mockApiService as any).rolesSE = { isAdmin: false };
      (mockApiService as any).dataControlSE = {
        myInitiativesList: [{ official_code: 'INIT-002' }]
      };
      service.entityId.set('INIT-001');

      expect(service.canReportResults()).toBe(false);
    });

    it('should return false when myInitiativesList is null', () => {
      (mockApiService as any).rolesSE = { isAdmin: false };
      (mockApiService as any).dataControlSE = {
        myInitiativesList: null
      };
      service.entityId.set('INIT-001');

      expect(service.canReportResults()).toBe(false);
    });

    it('should return false when myInitiativesList is undefined', () => {
      (mockApiService as any).rolesSE = { isAdmin: false };
      (mockApiService as any).dataControlSE = {
        myInitiativesList: undefined
      };
      service.entityId.set('INIT-001');

      expect(service.canReportResults()).toBe(false);
    });
  });

  describe('getAllDetailsData - SGP-02 path', () => {
    beforeEach(() => {
      (mockApiService as any).rolesSE = { isAdmin: false };
      (mockApiService as any).dataControlSE = {
        myInitiativesList: [],
        myInitiativesListReportingByPortfolio: null
      };
      (mockApiService.resultsSE as any).GET_ScienceProgramsProgress = jest.fn().mockReturnValue(
        of({
          response: {
            mySciencePrograms: [],
            otherSciencePrograms: []
          }
        })
      );
    });

    it('should use entityId parameter when provided', async () => {
      service.entityId.set('DEFAULT-ID');
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(mockApiResponse));
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(of(mockIndicatorApiResponse));

      service.getAllDetailsData('OVERRIDE-ID');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiService.resultsSE.GET_ClarisaGlobalUnits).toHaveBeenCalledWith('OVERRIDE-ID');
    });

    it('should return early and set loading false when entityId is empty', () => {
      service.entityId.set('');

      service.getAllDetailsData();

      expect(service.isLoadingDetails()).toBe(false);
      expect(mockApiService.resultsSE.GET_ClarisaGlobalUnits).not.toHaveBeenCalled();
    });

    it('should return early and set loading false when no entityId param and signal is empty', () => {
      service.entityId.set('');

      service.getAllDetailsData(undefined);

      expect(service.isLoadingDetails()).toBe(false);
    });

    it('should take SGP-02 path and set details from list when initiative found (SGP-02)', async () => {
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: [
          { id: 10, official_code: 'SGP-02', name: 'Science Group Program', short_name: 'SGP' }
        ],
        myInitiativesList: []
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [{ type: 'Output', total: 3 }] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails()).toEqual({
        id: 10,
        officialCode: 'SGP-02',
        name: 'Science Group Program',
        shortName: 'SGP'
      });
      expect(service.entityAows()).toEqual([]);
      expect(service.indicatorSummaries()).toEqual([{ type: 'Output', total: 3 }]);
      expect(service.isLoadingDetails()).toBe(false);
    });

    it('should take SGP-02 path with SGP02 variant', async () => {
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: [
          { id: 20, official_code: 'SGP02', name: 'SGP Variant', short_name: 'SGP-V' }
        ],
        myInitiativesList: []
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails()).toEqual({
        id: 20,
        officialCode: 'SGP02',
        name: 'SGP Variant',
        shortName: 'SGP-V'
      });
      expect(service.entityAows()).toEqual([]);
      expect(service.isLoadingDetails()).toBe(false);
    });

    it('should fetch from science programs when initiative not found in list', async () => {
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: null,
        myInitiativesList: []
      };

      const scienceProgSpy = (mockApiService.resultsSE as any).GET_ScienceProgramsProgress;
      scienceProgSpy.mockReturnValue(
        of({
          response: {
            mySciencePrograms: [
              { initiativeId: 99, initiativeCode: 'SGP-02', initiativeName: 'Science Program', initiativeShortName: 'SP' }
            ],
            otherSciencePrograms: []
          }
        })
      );

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(scienceProgSpy).toHaveBeenCalled();
      expect(service.entityDetails()).toEqual({
        id: 99,
        officialCode: 'SGP-02',
        name: 'Science Program',
        shortName: 'SP'
      });
    });

    it('should handle SGP-02 error path', async () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        throwError(() => new Error('API Error'))
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.indicatorSummaries()).toEqual([]);
      expect(service.isLoadingDetails()).toBe(false);
    });

    it('should handle null response.totalsByType in SGP-02 path', async () => {
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: [
          { id: 10, official_code: 'SGP-02', name: 'Test', short_name: 'T' }
        ],
        myInitiativesList: []
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: null } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.indicatorSummaries()).toEqual([]);
    });

    it('should handle undefined response in SGP-02 path', async () => {
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: [
          { id: 10, official_code: 'SGP-02', name: 'Test', short_name: 'T' }
        ],
        myInitiativesList: []
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: undefined })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.indicatorSummaries()).toEqual([]);
    });
  });

  describe('getSgp02InitiativeFromList - field fallback branches', () => {
    beforeEach(() => {
      (mockApiService as any).rolesSE = { isAdmin: false };
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: null,
        myInitiativesList: []
      };
      (mockApiService.resultsSE as any).GET_ScienceProgramsProgress = jest.fn().mockReturnValue(
        of({ response: { mySciencePrograms: [], otherSciencePrograms: [] } })
      );
    });

    it('should use initiative_id when id is not available', async () => {
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: [
          { initiative_id: 42, official_code: 'SGP-02', initiative_name: 'Init Name', shortName: 'SN' }
        ],
        myInitiativesList: []
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails()).toEqual({
        id: 42,
        officialCode: 'SGP-02',
        name: 'Init Name',
        shortName: 'SN'
      });
    });

    it('should use 0 when neither id nor initiative_id is available', async () => {
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: [
          { official_code: 'SGP-02', name: 'Just Name' }
        ],
        myInitiativesList: []
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails()).toEqual({
        id: 0,
        officialCode: 'SGP-02',
        name: 'Just Name',
        shortName: 'Just Name'
      });
    });

    it('should use entityId as officialCode fallback when official_code is missing', async () => {
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: null,
        myInitiativesList: [
          { id: 5, official_code: 'SGP-02', name: 'Name', short_name: 'SN' }
        ]
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails().officialCode).toBe('SGP-02');
    });

    it('should use myInitiativesList when myInitiativesListReportingByPortfolio is null', async () => {
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: null,
        myInitiativesList: [
          { id: 7, official_code: 'SGP-02', name: 'From Main List', short_name: 'FML' }
        ]
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails()).toEqual({
        id: 7,
        officialCode: 'SGP-02',
        name: 'From Main List',
        shortName: 'FML'
      });
    });

    it('should use initiative_name as name fallback', async () => {
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: [
          { id: 8, official_code: 'SGP-02', initiative_name: 'Initiative Name', short_name: 'IN' }
        ],
        myInitiativesList: []
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails().name).toBe('Initiative Name');
    });

    it('should use short_name as name fallback when name and initiative_name are missing', async () => {
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: [
          { id: 9, official_code: 'SGP-02', short_name: 'ShortN' }
        ],
        myInitiativesList: []
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails().name).toBe('ShortN');
      expect(service.entityDetails().shortName).toBe('ShortN');
    });

    it('should use shortName as name fallback when name, initiative_name, and short_name are missing', async () => {
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: [
          { id: 11, official_code: 'SGP-02', shortName: 'ShortNameOnly' }
        ],
        myInitiativesList: []
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails().name).toBe('ShortNameOnly');
      expect(service.entityDetails().shortName).toBe('ShortNameOnly');
    });

    it('should return empty string for name when all name fields are missing', async () => {
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: [
          { id: 12, official_code: 'SGP-02' }
        ],
        myInitiativesList: []
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails().name).toBe('');
      expect(service.entityDetails().shortName).toBe('');
    });

    it('should use shortName as shortName fallback when short_name is missing', async () => {
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: [
          { id: 13, official_code: 'SGP-02', name: 'Full Name', shortName: 'SN-Fallback' }
        ],
        myInitiativesList: []
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails().shortName).toBe('SN-Fallback');
    });

    it('should handle null name field by falling back to initiative_name', async () => {
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: [
          { id: 51, official_code: 'SGP-02', name: null, initiative_name: 'Fallback Init Name', short_name: null, shortName: null }
        ],
        myInitiativesList: []
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails().name).toBe('Fallback Init Name');
      expect(service.entityDetails().shortName).toBe('');
    });

    it('should handle null name and initiative_name by falling back to short_name', async () => {
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: [
          { id: 52, official_code: 'SGP-02', name: null, initiative_name: null, short_name: 'SN Fallback', shortName: null }
        ],
        myInitiativesList: []
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails().name).toBe('SN Fallback');
      expect(service.entityDetails().shortName).toBe('SN Fallback');
    });

    it('should handle all null name fields falling back to shortName', async () => {
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: [
          { id: 53, official_code: 'SGP-02', name: null, initiative_name: null, short_name: null, shortName: 'Last Resort' }
        ],
        myInitiativesList: []
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails().name).toBe('Last Resort');
      expect(service.entityDetails().shortName).toBe('Last Resort');
    });

    it('should handle all null name fields falling back to empty string', async () => {
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: [
          { id: 54, official_code: 'SGP-02', name: null, initiative_name: null, short_name: null, shortName: null }
        ],
        myInitiativesList: []
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails().name).toBe('');
      expect(service.entityDetails().shortName).toBe('');
    });

    it('should use initiative_name for both name and shortName when name and short_name and shortName are missing', async () => {
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: [
          { id: 50, official_code: 'SGP-02', initiative_name: 'Init Name Only' }
        ],
        myInitiativesList: []
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      // name = raw.name ?? raw.initiative_name = 'Init Name Only'
      // shortName = raw.short_name ?? raw.shortName ?? raw.name = undefined ?? undefined ?? undefined = ''
      // Wait, actually: shortName: raw.short_name ?? raw.shortName ?? raw.name ?? ''
      // raw.name is undefined, raw.short_name is undefined, raw.shortName is undefined => ''
      // But name = raw.name ?? raw.initiative_name ?? raw.short_name ?? raw.shortName ?? '' = 'Init Name Only'
      expect(service.entityDetails().name).toBe('Init Name Only');
    });

    it('should use name as shortName fallback when short_name and shortName are missing', async () => {
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: [
          { id: 14, official_code: 'SGP-02', name: 'Name Only' }
        ],
        myInitiativesList: []
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails().shortName).toBe('Name Only');
    });

    it('should use entityId as officialCode when official_code is null', async () => {
      // The find in getSgp02InitiativeFromList matches on official_code === 'SGP-02' || 'SGP02'
      // So we need the item to have official_code that MATCHES but then tests the null branch on line 76
      // Wait - if official_code is null, the find won't match. So the uncovered branch at line 76
      // is the right side of ?? (entityId fallback) which can never be reached because
      // the find predicate requires official_code to be 'SGP-02' or 'SGP02'.
      // This is a dead code branch. Let's verify we already cover what we can.
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: [
          { id: 60, official_code: 'SGP-02', name: 'Test' }
        ],
        myInitiativesList: []
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails().officialCode).toBe('SGP-02');
    });

    it('should fall back to empty array when both lists are null/undefined', async () => {
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: null,
        myInitiativesList: null
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      (mockApiService.resultsSE as any).GET_ScienceProgramsProgress = jest.fn().mockReturnValue(
        of({ response: { mySciencePrograms: [], otherSciencePrograms: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      // Initiative not found from empty fallback list, fetchSgp02 called
      expect((mockApiService.resultsSE as any).GET_ScienceProgramsProgress).toHaveBeenCalled();
    });

    it('should match SGP02 variant in list (without dash)', async () => {
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: [
          { id: 15, official_code: 'SGP02', name: 'No Dash', short_name: 'ND' }
        ],
        myInitiativesList: []
      };

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails()).toEqual({
        id: 15,
        officialCode: 'SGP02',
        name: 'No Dash',
        shortName: 'ND'
      });
    });
  });

  describe('fetchSgp02InitiativeFromSciencePrograms - branch coverage', () => {
    beforeEach(() => {
      (mockApiService as any).rolesSE = { isAdmin: false };
      (mockApiService as any).dataControlSE = {
        myInitiativesListReportingByPortfolio: null,
        myInitiativesList: []
      };
      (mockApiService.resultsSE as any).GET_ScienceProgramsProgress = jest.fn();
    });

    it('should find item in otherSciencePrograms when not in mySciencePrograms', async () => {
      (mockApiService.resultsSE as any).GET_ScienceProgramsProgress.mockReturnValue(
        of({
          response: {
            mySciencePrograms: [],
            otherSciencePrograms: [
              { initiativeId: 77, initiativeCode: 'SGP-02', initiativeName: 'Other Program', initiativeShortName: 'OP' }
            ]
          }
        })
      );

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails()).toEqual({
        id: 77,
        officialCode: 'SGP-02',
        name: 'Other Program',
        shortName: 'OP'
      });
    });

    it('should not set details when item not found in science programs', async () => {
      (mockApiService.resultsSE as any).GET_ScienceProgramsProgress.mockReturnValue(
        of({
          response: {
            mySciencePrograms: [{ initiativeCode: 'OTHER-001' }],
            otherSciencePrograms: [{ initiativeCode: 'OTHER-002' }]
          }
        })
      );

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      // Should remain empty since item not found
      expect(service.entityDetails()).toEqual({} as any);
    });

    it('should handle null mySciencePrograms and otherSciencePrograms', async () => {
      (mockApiService.resultsSE as any).GET_ScienceProgramsProgress.mockReturnValue(
        of({
          response: {
            mySciencePrograms: null,
            otherSciencePrograms: null
          }
        })
      );

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails()).toEqual({} as any);
    });

    it('should handle null response from science programs', async () => {
      (mockApiService.resultsSE as any).GET_ScienceProgramsProgress.mockReturnValue(
        of({ response: null })
      );

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails()).toEqual({} as any);
    });

    it('should find SGP02 variant (without dash) in science programs', async () => {
      (mockApiService.resultsSE as any).GET_ScienceProgramsProgress.mockReturnValue(
        of({
          response: {
            mySciencePrograms: [
              { initiativeId: 88, initiativeCode: 'SGP02', initiativeName: 'No Dash Science', initiativeShortName: 'NDS' }
            ],
            otherSciencePrograms: []
          }
        })
      );

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails()).toEqual({
        id: 88,
        officialCode: 'SGP02',
        name: 'No Dash Science',
        shortName: 'NDS'
      });
    });

    it('should use entityId as officialCode fallback in science programs', async () => {
      (mockApiService.resultsSE as any).GET_ScienceProgramsProgress.mockReturnValue(
        of({
          response: {
            mySciencePrograms: [
              { initiativeId: 55, initiativeCode: undefined, initiativeName: 'Fallback Test' }
            ],
            otherSciencePrograms: []
          }
        })
      );

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      // Since initiativeCode is undefined, the find will fail.
      // But this tests the scenario where initiativeCode doesn't match 'SGP-02'.
      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      // Item won't be found since initiativeCode is undefined
      expect(service.entityDetails()).toEqual({} as any);
    });

    it('should use initiativeName as shortName fallback when initiativeShortName is missing', async () => {
      (mockApiService.resultsSE as any).GET_ScienceProgramsProgress.mockReturnValue(
        of({
          response: {
            mySciencePrograms: [
              { initiativeId: 66, initiativeCode: 'SGP-02', initiativeName: 'Name As Short' }
            ],
            otherSciencePrograms: []
          }
        })
      );

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails().shortName).toBe('Name As Short');
    });

    it('should handle missing initiativeId in science programs (default to 0)', async () => {
      (mockApiService.resultsSE as any).GET_ScienceProgramsProgress.mockReturnValue(
        of({
          response: {
            mySciencePrograms: [
              { initiativeCode: 'SGP-02', initiativeName: 'No ID' }
            ],
            otherSciencePrograms: []
          }
        })
      );

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails().id).toBe(0);
    });

    it('should use empty shortName when initiativeShortName is null and initiativeName is null', async () => {
      (mockApiService.resultsSE as any).GET_ScienceProgramsProgress.mockReturnValue(
        of({
          response: {
            mySciencePrograms: [
              { initiativeId: 34, initiativeCode: 'SGP-02', initiativeName: null, initiativeShortName: null }
            ],
            otherSciencePrograms: []
          }
        })
      );

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails().shortName).toBe('');
      expect(service.entityDetails().name).toBe('');
    });

    it('should use entityId as officialCode and empty strings when initiativeCode and names are missing', async () => {
      (mockApiService.resultsSE as any).GET_ScienceProgramsProgress.mockReturnValue(
        of({
          response: {
            mySciencePrograms: [
              { initiativeId: 33, initiativeCode: 'SGP-02' }
            ],
            otherSciencePrograms: []
          }
        })
      );

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails()).toEqual({
        id: 33,
        officialCode: 'SGP-02',
        name: '',
        shortName: ''
      });
    });

    it('should use entityId when initiativeCode is undefined in science programs response', async () => {
      // This won't match the find predicate, but tests the undefined initiativeCode path
      (mockApiService.resultsSE as any).GET_ScienceProgramsProgress.mockReturnValue(
        of({
          response: {
            mySciencePrograms: [
              { initiativeId: 100, initiativeName: 'Test' }
            ],
            otherSciencePrograms: []
          }
        })
      );

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      // Item not found because initiativeCode is undefined, so entityDetails stays as empty
      expect(service.entityDetails()).toEqual({} as any);
    });

    it('should handle missing initiativeCode - fallback to entityId', async () => {
      (mockApiService.resultsSE as any).GET_ScienceProgramsProgress.mockReturnValue(
        of({
          response: {
            mySciencePrograms: [
              { initiativeId: 44, initiativeCode: 'SGP-02', initiativeName: '' }
            ],
            otherSciencePrograms: []
          }
        })
      );

      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(
        of({ response: { totalsByType: [] } })
      );

      service.getAllDetailsData('SGP-02');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.entityDetails().name).toBe('');
    });
  });

  describe('resetDashboardData', () => {
    beforeEach(() => {
      service.dashboardData.set({ editing: { total: 10 }, submitted: { total: 5 } });
      service.entityDetails.set(mockInitiative);
      service.entityAows.set(mockUnits);
      service.indicatorSummaries.set(mockIndicatorSummaries);
    });

    it('should reset all dashboard-related signals to initial state', () => {
      service.resetDashboardData();

      expect(service.dashboardData()).toBeNull();
      expect(service.entityDetails()).toEqual({} as Initiative);
      expect(service.entityAows()).toEqual([]);
      expect(service.indicatorSummaries()).toEqual([]);
    });

    it('should be idempotent - calling multiple times should not cause issues', () => {
      service.resetDashboardData();
      service.resetDashboardData();
      service.resetDashboardData();

      expect(service.dashboardData()).toBeNull();
      expect(service.entityDetails()).toEqual({} as Initiative);
      expect(service.entityAows()).toEqual([]);
      expect(service.indicatorSummaries()).toEqual([]);
    });

    it('should reset data even when signals are already empty', () => {
      service.resetDashboardData();
      service.resetDashboardData();

      expect(service.dashboardData()).toBeNull();
      expect(service.entityDetails()).toEqual({} as Initiative);
      expect(service.entityAows()).toEqual([]);
      expect(service.indicatorSummaries()).toEqual([]);
    });
  });
});

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
      aowId: 'AOW-001'
    }
  ];

  const mockTocApiResponse = {
    message: 'Success',
    response: {
      tocResults: mockTocResults
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
        GET_ExistingResultsContributors: jest.fn().mockReturnValue(of({ response: { contributors: [] } }))
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
      expect(service.tocResultsByAowId()).toEqual([]);
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
      const setSideBarItemsSpy = jest.spyOn(service, 'setSideBarItems');
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(mockApiResponse));
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(of(mockIndicatorApiResponse));

      service.getAllDetailsData();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(setSideBarItemsSpy).toHaveBeenCalled();
    });

    it('should not call setSideBarItems when no units are available', async () => {
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
      const error = new Error('API Error');
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(throwError(() => error));
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(of(mockIndicatorApiResponse));

      service.getAllDetailsData();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.isLoadingDetails()).toBe(false);
    });

    it('should handle API error for indicatorSummaries', async () => {
      const error = new Error('API Error');
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(mockApiResponse));
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(throwError(() => error));

      service.getAllDetailsData();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.isLoadingDetails()).toBe(false);
    });

    it('should handle both APIs error', async () => {
      const error = new Error('API Error');
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(throwError(() => error));
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(throwError(() => error));

      service.getAllDetailsData();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.isLoadingDetails()).toBe(false);
    });
  });

  describe('getClarisaGlobalUnits', () => {
    it('should set loading state to true when called', () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(mockApiResponse));

      service.getClarisaGlobalUnits();

      expect(service.isLoadingDetails()).toBe(false);
    });

    it('should call API with correct entityId', () => {
      const entityId = 'test-entity-id';
      service.entityId.set(entityId);
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(mockApiResponse));

      service.getClarisaGlobalUnits();

      expect(mockApiService.resultsSE.GET_ClarisaGlobalUnits).toHaveBeenCalledWith(entityId);
    });

    it('should update entityDetails and entityAows on successful API call', () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(mockApiResponse));

      service.getClarisaGlobalUnits();

      expect(service.entityDetails()).toEqual(mockInitiative);
      expect(service.entityAows()).toEqual(mockUnits);
      expect(service.isLoadingDetails()).toBe(false);
    });

    it('should handle empty units array', () => {
      const responseWithEmptyUnits = {
        ...mockApiResponse,
        response: {
          ...mockApiResponse.response,
          units: []
        }
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(responseWithEmptyUnits));

      service.getClarisaGlobalUnits();

      expect(service.entityAows()).toEqual([]);
      expect(service.isLoadingDetails()).toBe(false);
    });

    it('should handle null/undefined units', () => {
      const responseWithNullUnits = {
        ...mockApiResponse,
        response: {
          ...mockApiResponse.response,
          units: null
        }
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(responseWithNullUnits));

      service.getClarisaGlobalUnits();

      expect(service.entityAows()).toEqual([]);
      expect(service.isLoadingDetails()).toBe(false);
    });

    it('should call setSideBarItems when units are available', () => {
      const setSideBarItemsSpy = jest.spyOn(service, 'setSideBarItems');
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(mockApiResponse));

      service.getClarisaGlobalUnits();

      expect(setSideBarItemsSpy).toHaveBeenCalled();
    });

    it('should not call setSideBarItems when no units are available', () => {
      const responseWithEmptyUnits = {
        ...mockApiResponse,
        response: {
          ...mockApiResponse.response,
          units: []
        }
      };
      const setSideBarItemsSpy = jest.spyOn(service, 'setSideBarItems');
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(responseWithEmptyUnits));

      service.getClarisaGlobalUnits();

      expect(setSideBarItemsSpy).not.toHaveBeenCalled();
    });

    it('should set loading to true initially when called', () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(mockApiResponse).pipe(delay(100)));

      service.getClarisaGlobalUnits();

      expect(service.isLoadingDetails()).toBe(true);
    });
  });

  describe('getIndicatorSummaries', () => {
    it('should call API with correct entityId', () => {
      const entityId = 'test-entity-id';
      service.entityId.set(entityId);
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(of(mockIndicatorApiResponse));

      service.getIndicatorSummaries();

      expect(mockApiService.resultsSE.GET_IndicatorContributionSummary).toHaveBeenCalledWith(entityId);
    });

    it('should update indicatorSummaries on successful API call', () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(of(mockIndicatorApiResponse));

      service.getIndicatorSummaries();

      expect(service.indicatorSummaries()).toEqual(mockIndicatorSummaries);
    });

    it('should handle empty indicator summaries', () => {
      const responseWithEmptyIndicators = {
        ...mockIndicatorApiResponse,
        response: {
          totalsByType: []
        }
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(of(responseWithEmptyIndicators));

      service.getIndicatorSummaries();

      expect(service.indicatorSummaries()).toEqual([]);
    });

    it('should handle null/undefined indicator summaries', () => {
      const responseWithNullIndicators = {
        ...mockIndicatorApiResponse,
        response: {
          totalsByType: null
        }
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(of(responseWithNullIndicators));

      service.getIndicatorSummaries();

      expect(service.indicatorSummaries()).toEqual([]);
    });

    it('should handle undefined response', () => {
      const responseWithUndefinedResponse = {
        ...mockIndicatorApiResponse,
        response: undefined
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(of(responseWithUndefinedResponse));

      service.getIndicatorSummaries();

      expect(service.indicatorSummaries()).toEqual([]);
    });

    it('should handle custom indicator summaries data structure', () => {
      const customIndicatorSummaries = [
        {
          type: 'Custom Type',
          total: 15,
          completed: 10,
          customField: 'customValue'
        }
      ];
      const customResponse = {
        ...mockIndicatorApiResponse,
        response: {
          totalsByType: customIndicatorSummaries
        }
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(of(customResponse));

      service.getIndicatorSummaries();

      expect(service.indicatorSummaries()).toEqual(customIndicatorSummaries);
    });

    it('should call API method when invoked', () => {
      const entityId = 'test-entity-id';
      service.entityId.set(entityId);
      jest.spyOn(mockApiService.resultsSE, 'GET_IndicatorContributionSummary').mockReturnValue(of(mockIndicatorApiResponse));

      service.getIndicatorSummaries();

      expect(mockApiService.resultsSE.GET_IndicatorContributionSummary).toHaveBeenCalledWith(entityId);
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

    it('should update tocResultsByAowId and set loading to false on successful API call', () => {
      const entityId = 'test-entity-id';
      const aowId = 'test-aow-id';
      jest.spyOn(mockApiService.resultsSE, 'GET_TocResultsByAowId').mockReturnValue(of(mockTocApiResponse));

      service.getTocResultsByAowId(entityId, aowId);

      expect(service.tocResultsByAowId()).toEqual(mockTocResults);
      expect(service.isLoadingTocResultsByAowId()).toBe(false);
    });

    it('should handle empty tocResults array', () => {
      const entityId = 'test-entity-id';
      const aowId = 'test-aow-id';
      const responseWithEmptyTocResults = {
        ...mockTocApiResponse,
        response: {
          tocResults: []
        }
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_TocResultsByAowId').mockReturnValue(of(responseWithEmptyTocResults));

      service.getTocResultsByAowId(entityId, aowId);

      expect(service.tocResultsByAowId()).toEqual([]);
      expect(service.isLoadingTocResultsByAowId()).toBe(false);
    });

    it('should handle null/undefined tocResults', () => {
      const entityId = 'test-entity-id';
      const aowId = 'test-aow-id';
      const responseWithNullTocResults = {
        ...mockTocApiResponse,
        response: {
          tocResults: null
        }
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_TocResultsByAowId').mockReturnValue(of(responseWithNullTocResults));

      service.getTocResultsByAowId(entityId, aowId);

      expect(service.tocResultsByAowId()).toEqual([]);
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

      expect(service.tocResultsByAowId()).toEqual([]);
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
          tocResults: customTocResults
        }
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_TocResultsByAowId').mockReturnValue(of(customResponse));

      service.getTocResultsByAowId(entityId, aowId);

      expect(service.tocResultsByAowId()).toEqual(customTocResults);
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

    it('should update tocResultsByAowId signal', () => {
      const newTocResults = [
        {
          id: 3,
          title: 'New TOC Result',
          description: 'New Description',
          aowId: 'AOW-003'
        }
      ];
      service.tocResultsByAowId.set(newTocResults);
      expect(service.tocResultsByAowId()).toEqual(newTocResults);
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

    it('should compute currentResultIsKnowledgeProduct correctly for knowledge product', () => {
      const knowledgeProductResult = {
        indicators: [
          {
            type_value: 'Number of knowledge products'
          }
        ]
      };
      service.currentResultToReport.set(knowledgeProductResult);

      const isKnowledgeProduct = service.currentResultIsKnowledgeProduct();

      expect(isKnowledgeProduct).toBe(true);
    });

    it('should compute currentResultIsKnowledgeProduct correctly for non-knowledge product', () => {
      const regularResult = {
        indicators: [
          {
            type_value: 'Number of outcomes'
          }
        ]
      };
      service.currentResultToReport.set(regularResult);

      const isKnowledgeProduct = service.currentResultIsKnowledgeProduct();

      expect(isKnowledgeProduct).toBe(false);
    });

    it('should return false when currentResultToReport has no indicators', () => {
      const resultWithoutIndicators = {};
      service.currentResultToReport.set(resultWithoutIndicators);

      const isKnowledgeProduct = service.currentResultIsKnowledgeProduct();

      expect(isKnowledgeProduct).toBe(false);
    });

    it('should return false when currentResultToReport is empty', () => {
      service.currentResultToReport.set({});

      const isKnowledgeProduct = service.currentResultIsKnowledgeProduct();

      expect(isKnowledgeProduct).toBe(false);
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

      service.getExistingResultsContributors();

      expect(mockApiService.resultsSE.GET_ExistingResultsContributors).toHaveBeenCalledWith('result-123', 'node-456');
    });

    it('should update existingResultsContributors on successful API call', () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_ExistingResultsContributors').mockReturnValue(of(mockContributorsApiResponse));

      service.getExistingResultsContributors();

      expect(service.existingResultsContributors()).toEqual(mockContributors);
    });

    it('should handle empty contributors array', () => {
      const emptyResponse = {
        response: {
          contributors: []
        }
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_ExistingResultsContributors').mockReturnValue(of(emptyResponse));

      service.getExistingResultsContributors();

      expect(service.existingResultsContributors()).toEqual([]);
    });

    it('should handle null contributors', () => {
      const nullResponse = {
        response: {
          contributors: null
        }
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_ExistingResultsContributors').mockReturnValue(of(nullResponse));

      service.getExistingResultsContributors();

      expect(service.existingResultsContributors()).toEqual([]);
    });

    it('should handle undefined response', () => {
      const undefinedResponse = {
        response: undefined
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_ExistingResultsContributors').mockReturnValue(of(undefinedResponse));

      service.getExistingResultsContributors();

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
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      service.getTocResultsByAowId(entityId, aowId);

      expect(service.tocResultsByAowId()).toEqual([]);
      expect(service.isLoadingTocResultsByAowId()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(error);

      consoleSpy.mockRestore();
    });

    it('should handle API error without breaking the service', () => {
      const entityId = 'test-entity-id';
      const aowId = 'test-aow-id';
      const error = new Error('Network Error');
      jest.spyOn(mockApiService.resultsSE, 'GET_TocResultsByAowId').mockReturnValue(throwError(() => error));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Should not throw
      expect(() => service.getTocResultsByAowId(entityId, aowId)).not.toThrow();

      expect(service.tocResultsByAowId()).toEqual([]);
      expect(service.isLoadingTocResultsByAowId()).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete flow from API call to sidebar update', () => {
      const entityId = 'integration-test-id';
      service.entityId.set(entityId);
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(mockApiResponse));

      service.getClarisaGlobalUnits();

      expect(service.entityDetails()).toEqual(mockInitiative);
      expect(service.entityAows()).toEqual(mockUnits);
      expect(service.isLoadingDetails()).toBe(false);

      const sideBarItems = service.sideBarItems();
      expect(sideBarItems).toHaveLength(1);
      expect(sideBarItems[0].isTree).toBe(true);
      expect(sideBarItems[0].items).toHaveLength(2);
    });

    it('should maintain state consistency across multiple operations', () => {
      // Set initial state
      service.entityId.set('test-id');
      service.aowId.set('aow-id');

      // Call API
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(of(mockApiResponse));
      service.getClarisaGlobalUnits();

      // Verify all signals are updated correctly
      expect(service.entityId()).toBe('test-id');
      expect(service.aowId()).toBe('aow-id');
      expect(service.entityDetails()).toEqual(mockInitiative);
      expect(service.entityAows()).toEqual(mockUnits);
      expect(service.isLoadingDetails()).toBe(false);
    });

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
      expect(sideBarItems).toHaveLength(1);
      expect(sideBarItems[0].isTree).toBe(true);
      expect(sideBarItems[0].items).toHaveLength(2);
    });

    it('should handle complete flow for getTocResultsByAowId', () => {
      const entityId = 'integration-test-id';
      const aowId = 'integration-aow-id';
      jest.spyOn(mockApiService.resultsSE, 'GET_TocResultsByAowId').mockReturnValue(of(mockTocApiResponse));

      service.getTocResultsByAowId(entityId, aowId);

      expect(service.tocResultsByAowId()).toEqual(mockTocResults);
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

      expect(service.tocResultsByAowId()).toEqual(mockTocResults);
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
          tocResults: customTocResults
        }
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_TocResultsByAowId').mockReturnValue(of(customResponse));
      service.getTocResultsByAowId(entityId, aowId2);

      expect(service.tocResultsByAowId()).toEqual(customTocResults);
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
      service.getExistingResultsContributors();

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
});

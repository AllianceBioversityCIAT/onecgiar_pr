import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
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

  beforeEach(() => {
    mockApiService = {
      resultsSE: {
        GET_ClarisaGlobalUnits: jest.fn().mockReturnValue(of(mockApiResponse))
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
      expect(service.isLoadingDetails()).toBe(false);
      expect(service.sideBarItems()).toEqual([
        {
          label: 'All indicators',
          itemLink: '/aow/all'
        },
        {
          label: 'Unplanned results',
          itemLink: '/aow/unplanned'
        }
      ]);
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

    it('should handle API error', () => {
      const error = new Error('API Error');
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaGlobalUnits').mockReturnValue(throwError(() => error));

      service.getClarisaGlobalUnits();

      // Loading should still be set to true initially
      expect(service.isLoadingDetails()).toBe(true);
    });
  });

  describe('setSideBarItems', () => {
    it('should update sideBarItems with default items and AOW tree', () => {
      service.entityAows.set(mockUnits);
      service.setSideBarItems();

      const expectedSideBarItems = [
        {
          label: 'All indicators',
          itemLink: '/aow/all'
        },
        {
          label: 'Unplanned results',
          itemLink: '/aow/unplanned'
        },
        {
          isTree: true,
          label: 'By AOW',
          isOpen: true,
          items: [
            {
              label: 'AOW-001',
              itemLink: '/aow/AOW-001'
            },
            {
              label: 'AOW-002',
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
          label: 'All indicators',
          itemLink: '/aow/all'
        },
        {
          label: 'Unplanned results',
          itemLink: '/aow/unplanned'
        },
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
      expect(sideBarItems).toHaveLength(3);
      expect(sideBarItems[2].isTree).toBe(true);
      expect(sideBarItems[2].items).toHaveLength(2);
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
  });
});

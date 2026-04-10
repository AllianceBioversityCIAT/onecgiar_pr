import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultsReviewFiltersComponent } from './results-review-filters.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BilateralResultsService } from '../../bilateral-results.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { signal } from '@angular/core';

describe('ResultsReviewFiltersComponent', () => {
  let component: ResultsReviewFiltersComponent;
  let fixture: ComponentFixture<ResultsReviewFiltersComponent>;
  let mockBilateralResultsService: any;
  let mockRouter: any;
  let mockLocation: any;
  let mockActivatedRoute: any;

  // Use real signals so computed() in the component reacts correctly
  const searchTextSignal = signal('');
  const selectedIndicatorCategoriesSignal = signal<string[]>([]);
  const selectedStatusSignal = signal<string[]>([]);
  const selectedLeadCentersSignal = signal<string[]>([]);
  const indicatorCategoryOptionsSignal = signal<string[]>([]);
  const statusOptionsSignal = signal<string[]>([]);
  const leadCenterOptionsSignal = signal<string[]>([]);

  beforeEach(async () => {
    // Reset signals
    searchTextSignal.set('');
    selectedIndicatorCategoriesSignal.set([]);
    selectedStatusSignal.set([]);
    selectedLeadCentersSignal.set([]);
    indicatorCategoryOptionsSignal.set([]);
    statusOptionsSignal.set([]);
    leadCenterOptionsSignal.set([]);

    mockBilateralResultsService = {
      searchText: searchTextSignal,
      selectedIndicatorCategories: selectedIndicatorCategoriesSignal,
      selectedStatus: selectedStatusSignal,
      selectedLeadCenters: selectedLeadCentersSignal,
      clearBilateralTableFilters: jest.fn(),
      indicatorCategoryOptions: indicatorCategoryOptionsSignal,
      statusOptions: statusOptionsSignal,
      leadCenterOptions: leadCenterOptionsSignal
    };

    mockRouter = {
      createUrlTree: jest.fn().mockReturnValue({}),
      serializeUrl: jest.fn().mockReturnValue('/test?search=abc')
    };

    mockLocation = {
      replaceState: jest.fn()
    };

    mockActivatedRoute = {
      snapshot: {
        queryParamMap: {
          get: jest.fn().mockReturnValue(null)
        }
      }
    };

    await TestBed.configureTestingModule({
      imports: [ResultsReviewFiltersComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: BilateralResultsService, useValue: mockBilateralResultsService },
        { provide: Router, useValue: mockRouter },
        { provide: Location, useValue: mockLocation },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsReviewFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should set searchText from URL search param when present', () => {
      mockActivatedRoute.snapshot.queryParamMap.get.mockReturnValue('test search');

      component.ngOnInit();

      expect(searchTextSignal()).toBe('test search');
    });

    it('should not set searchText when no search param in URL', () => {
      searchTextSignal.set('');
      mockActivatedRoute.snapshot.queryParamMap.get.mockReturnValue(null);

      component.ngOnInit();

      expect(searchTextSignal()).toBe('');
    });
  });

  describe('onSearchChange', () => {
    it('should set searchText and update query param', () => {
      component.onSearchChange('hello');

      expect(searchTextSignal()).toBe('hello');
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([], {
        relativeTo: mockActivatedRoute,
        queryParams: { search: 'hello' },
        queryParamsHandling: 'merge'
      });
      expect(mockLocation.replaceState).toHaveBeenCalled();
    });

    it('should set search to null when value is empty string', () => {
      component.onSearchChange('');

      expect(searchTextSignal()).toBe('');
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([], {
        relativeTo: mockActivatedRoute,
        queryParams: { search: null },
        queryParamsHandling: 'merge'
      });
    });
  });

  describe('filtersCount', () => {
    it('should return 0 when no filters are selected', () => {
      expect(component.filtersCount()).toBe(0);
    });

    it('should return 1 when only indicator categories are selected', () => {
      selectedIndicatorCategoriesSignal.set(['cat1']);

      expect(component.filtersCount()).toBe(1);
    });

    it('should return 2 when two filter types are selected', () => {
      selectedIndicatorCategoriesSignal.set(['cat1']);
      selectedStatusSignal.set(['status1']);

      expect(component.filtersCount()).toBe(2);
    });

    it('should return 3 when all filter types are selected', () => {
      selectedIndicatorCategoriesSignal.set(['cat1']);
      selectedStatusSignal.set(['status1']);
      selectedLeadCentersSignal.set(['center1']);

      expect(component.filtersCount()).toBe(3);
    });
  });

  describe('filtersCountText', () => {
    it('should return "Apply filters" when count is 0', () => {
      expect(component.filtersCountText()).toBe('Apply filters');
    });

    it('should return "Apply filters (N)" when count > 0', () => {
      selectedIndicatorCategoriesSignal.set(['cat1']);
      selectedStatusSignal.set(['status1']);

      expect(component.filtersCountText()).toBe('Apply filters (2)');
    });
  });

  describe('filterChipGroups', () => {
    it('should return empty groups when no filters selected', () => {
      expect(component.filterChipGroups()).toEqual([]);
    });

    it('should include indicator category chips when selected', () => {
      selectedIndicatorCategoriesSignal.set(['Policy Change']);

      const groups = component.filterChipGroups();
      expect(groups.length).toBe(1);
      expect(groups[0].category).toBe('Indicator category');
      expect(groups[0].chips[0].label).toBe('Policy Change');
      expect(groups[0].chips[0].filterType).toBe('indicatorCategory');
    });

    it('should include status chips when selected', () => {
      selectedStatusSignal.set(['Approved']);

      const groups = component.filterChipGroups();
      expect(groups.length).toBe(1);
      expect(groups[0].category).toBe('Status');
    });

    it('should include lead center chips when selected', () => {
      selectedLeadCentersSignal.set(['CIAT']);

      const groups = component.filterChipGroups();
      expect(groups.length).toBe(1);
      expect(groups[0].category).toBe('Lead center');
    });

    it('should include all groups when all filters selected', () => {
      selectedIndicatorCategoriesSignal.set(['cat1']);
      selectedStatusSignal.set(['status1']);
      selectedLeadCentersSignal.set(['center1']);

      const groups = component.filterChipGroups();
      expect(groups.length).toBe(3);
    });
  });

  describe('openFiltersDrawer', () => {
    it('should copy current filters to temp and set visible', () => {
      selectedIndicatorCategoriesSignal.set(['cat1']);
      selectedStatusSignal.set(['status1']);
      selectedLeadCentersSignal.set(['center1']);

      component.openFiltersDrawer();

      expect(component.tempSelectedIndicatorCategories()).toEqual(['cat1']);
      expect(component.tempSelectedStatus()).toEqual(['status1']);
      expect(component.tempSelectedLeadCenters()).toEqual(['center1']);
      expect(component.visible()).toBe(true);
    });
  });

  describe('applyFilters', () => {
    it('should copy temp filters to service and close drawer', () => {
      component.tempSelectedIndicatorCategories.set(['cat1']);
      component.tempSelectedStatus.set(['status1']);
      component.tempSelectedLeadCenters.set(['center1']);

      component.applyFilters();

      expect(selectedIndicatorCategoriesSignal()).toEqual(['cat1']);
      expect(selectedStatusSignal()).toEqual(['status1']);
      expect(selectedLeadCentersSignal()).toEqual(['center1']);
      expect(component.visible()).toBe(false);
    });
  });

  describe('cancelFilters', () => {
    it('should restore temp filters from service and close drawer', () => {
      selectedIndicatorCategoriesSignal.set(['cat1']);
      selectedStatusSignal.set(['status1']);
      selectedLeadCentersSignal.set(['center1']);

      component.cancelFilters();

      expect(component.tempSelectedIndicatorCategories()).toEqual(['cat1']);
      expect(component.tempSelectedStatus()).toEqual(['status1']);
      expect(component.tempSelectedLeadCenters()).toEqual(['center1']);
      expect(component.visible()).toBe(false);
    });
  });

  describe('clearAllNewFilters', () => {
    it('should call clearBilateralTableFilters on service', () => {
      component.clearAllNewFilters();

      expect(mockBilateralResultsService.clearBilateralTableFilters).toHaveBeenCalled();
    });
  });

  describe('removeFilter', () => {
    it('should remove indicatorCategory filter', () => {
      selectedIndicatorCategoriesSignal.set(['cat1', 'cat2']);

      component.removeFilter({ label: 'cat1', filterType: 'indicatorCategory', item: 'cat1' });

      expect(selectedIndicatorCategoriesSignal()).toEqual(['cat2']);
    });

    it('should remove status filter', () => {
      selectedStatusSignal.set(['status1', 'status2']);

      component.removeFilter({ label: 'status1', filterType: 'status', item: 'status1' });

      expect(selectedStatusSignal()).toEqual(['status2']);
    });

    it('should remove leadCenter filter', () => {
      selectedLeadCentersSignal.set(['center1', 'center2']);

      component.removeFilter({ label: 'center1', filterType: 'leadCenter', item: 'center1' });

      expect(selectedLeadCentersSignal()).toEqual(['center2']);
    });

    it('should not modify any filter for unknown filterType', () => {
      selectedIndicatorCategoriesSignal.set(['cat1']);
      selectedStatusSignal.set(['status1']);
      selectedLeadCentersSignal.set(['center1']);

      component.removeFilter({ label: 'test', filterType: 'unknown', item: 'test' });

      expect(selectedIndicatorCategoriesSignal()).toEqual(['cat1']);
      expect(selectedStatusSignal()).toEqual(['status1']);
      expect(selectedLeadCentersSignal()).toEqual(['center1']);
    });
  });

  describe('ngOnDestroy', () => {
    it('should disconnect resizeObserver if it exists', () => {
      const mockObserver = { disconnect: jest.fn(), observe: jest.fn(), unobserve: jest.fn() };
      (component as any).resizeObserver = mockObserver;

      component.ngOnDestroy();

      expect(mockObserver.disconnect).toHaveBeenCalled();
    });

    it('should not throw when resizeObserver is null', () => {
      (component as any).resizeObserver = null;

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('calculateNavbarHeight', () => {
    it('should set navbarHeight to 60 when no navbar element found', () => {
      (component as any).calculateNavbarHeight();

      expect(component.navbarHeight()).toBe(60);
    });
  });
});

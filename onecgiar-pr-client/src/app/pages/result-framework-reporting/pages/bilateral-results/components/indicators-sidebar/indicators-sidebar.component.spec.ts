import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { IndicatorsSidebarComponent } from './indicators-sidebar.component';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { BilateralResultsService } from '../../bilateral-results.service';

describe('IndicatorsSidebarComponent', () => {
  let component: IndicatorsSidebarComponent;
  let fixture: ComponentFixture<IndicatorsSidebarComponent>;
  let mockCentersService: any;
  let mockBilateralResultsService: any;
  let mockRouter: any;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    mockCentersService = {
      getData: jest.fn().mockResolvedValue([
        { code: 'CIAT', name: 'CIAT', acronym: 'CIAT' },
        { code: 'IFPRI', name: 'IFPRI', acronym: 'IFPRI' }
      ])
    };

    mockBilateralResultsService = {
      centers: { set: jest.fn() },
      selectCenter: jest.fn(),
      searchText: { set: jest.fn() },
      totalPendingCount: jest.fn().mockReturnValue(0),
      centerAcronymsWithResults: jest.fn().mockReturnValue(new Set()),
      centersToShowInSidebar: jest.fn().mockReturnValue([]),
      pendingCountByAcronym: jest.fn().mockReturnValue({})
    };
    // Make selectedCenterCode callable for isSelected and settable
    mockBilateralResultsService.selectedCenterCode = jest.fn().mockReturnValue(null);
    mockBilateralResultsService.selectedCenterCode.set = jest.fn();

    mockRouter = {
      navigate: jest.fn()
    };

    mockActivatedRoute = {
      params: of({}),
      snapshot: { queryParams: {} }
    };

    await TestBed.configureTestingModule({
      imports: [IndicatorsSidebarComponent, HttpClientTestingModule],
      providers: [
        { provide: CentersService, useValue: mockCentersService },
        { provide: BilateralResultsService, useValue: mockBilateralResultsService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(IndicatorsSidebarComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('getCenters', () => {
    it('should load centers and select null when no center in URL', async () => {
      const spy = jest.spyOn(component, 'selectCenter');
      await component.getCenters();

      expect(mockBilateralResultsService.centers.set).toHaveBeenCalledWith([
        { code: 'CIAT', name: 'CIAT', acronym: 'CIAT' },
        { code: 'IFPRI', name: 'IFPRI', acronym: 'IFPRI' }
      ]);
      expect(spy).toHaveBeenCalledWith(null, false);
    });

    it('should select center from URL when it exists in centers list', async () => {
      mockActivatedRoute.snapshot.queryParams = { center: 'CIAT' };
      const spy = jest.spyOn(component, 'selectCenter');
      await component.getCenters();

      expect(spy).toHaveBeenCalledWith('CIAT', false);
    });

    it('should select null when center from URL does not exist in centers list', async () => {
      mockActivatedRoute.snapshot.queryParams = { center: 'NONEXISTENT' };
      const spy = jest.spyOn(component, 'selectCenter');
      await component.getCenters();

      expect(spy).toHaveBeenCalledWith(null, false);
    });
  });

  describe('selectCenter', () => {
    it('should set center code and update URL with merge when centerCode is provided and updateUrl is true', () => {
      component.selectCenter('CIAT', true);

      expect(mockBilateralResultsService.selectedCenterCode.set).toHaveBeenCalledWith('CIAT');
      expect(mockBilateralResultsService.selectCenter).toHaveBeenCalledWith('CIAT');
      expect(mockRouter.navigate).toHaveBeenCalledWith([], {
        relativeTo: mockActivatedRoute,
        queryParams: { center: 'CIAT' },
        queryParamsHandling: 'merge'
      });
      expect(mockBilateralResultsService.searchText.set).toHaveBeenCalledWith('');
    });

    it('should set null center code and update URL with empty params when centerCode is null and updateUrl is true', () => {
      component.selectCenter(null, true);

      expect(mockBilateralResultsService.selectedCenterCode.set).toHaveBeenCalledWith(null);
      expect(mockBilateralResultsService.selectCenter).toHaveBeenCalledWith(null);
      expect(mockRouter.navigate).toHaveBeenCalledWith([], {
        relativeTo: mockActivatedRoute,
        queryParams: {},
        queryParamsHandling: ''
      });
    });

    it('should not update URL when updateUrl is false', () => {
      component.selectCenter('CIAT', false);

      expect(mockBilateralResultsService.selectedCenterCode.set).toHaveBeenCalledWith('CIAT');
      expect(mockBilateralResultsService.selectCenter).toHaveBeenCalledWith('CIAT');
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should default updateUrl to true', () => {
      component.selectCenter('IFPRI');

      expect(mockRouter.navigate).toHaveBeenCalled();
      expect(mockBilateralResultsService.searchText.set).toHaveBeenCalledWith('');
    });
  });

  describe('isSelected', () => {
    it('should return true when centerCode matches selectedCenterCode', () => {
      mockBilateralResultsService.selectedCenterCode.mockReturnValue('CIAT');

      expect(component.isSelected('CIAT')).toBe(true);
    });

    it('should return false when centerCode does not match selectedCenterCode', () => {
      mockBilateralResultsService.selectedCenterCode.mockReturnValue('CIAT');

      expect(component.isSelected('IFPRI')).toBe(false);
    });

    it('should return true when both are null', () => {
      mockBilateralResultsService.selectedCenterCode.mockReturnValue(null);

      expect(component.isSelected(null)).toBe(true);
    });
  });
});

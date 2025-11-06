import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TorKrsPrimaryImpactAreaSelectorComponent } from './tor-krs-primary-impact-area-selector.component';
import { HttpClientModule } from '@angular/common/http';
import { TypeOneReportService } from '../../../../../pages/type-one-report/type-one-report.service';

describe('TorKrsPrimaryImpactAreaSelectorComponent', () => {
  let component: TorKrsPrimaryImpactAreaSelectorComponent;
  let fixture: ComponentFixture<TorKrsPrimaryImpactAreaSelectorComponent>;
  let mockTypeOneReportService: any;

  beforeEach(async () => {
    mockTypeOneReportService = {
      keyResultStoryData: []
    };

    await TestBed.configureTestingModule({
      declarations: [TorKrsPrimaryImpactAreaSelectorComponent],
      imports: [HttpClientModule],
      providers: [{ provide: TypeOneReportService, useValue: mockTypeOneReportService }]
    }).compileComponents();

    fixture = TestBed.createComponent(TorKrsPrimaryImpactAreaSelectorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with isSaving as false', () => {
    expect(component.isSaving).toBe(false);
  });

  it('should accept Input properties', () => {
    component.flatFormat = true;
    component.selectOptions = [{ id: 1 }];
    component.result_code = 'TEST-001';

    expect(component.flatFormat).toBe(true);
    expect(component.selectOptions).toEqual([{ id: 1 }]);
    expect(component.result_code).toBe('TEST-001');
  });

  describe('resultIndex getter', () => {
    it('should return the index of the result in keyResultStoryData', () => {
      mockTypeOneReportService.keyResultStoryData = [
        { result_code: 'RES-001', impact_area_id: 1 },
        { result_code: 'RES-002', impact_area_id: 2 },
        { result_code: 'RES-003', impact_area_id: 3 }
      ];
      component.result_code = 'RES-002';

      expect(component.resultIndex).toBe(1);
    });

    it('should return -1 when result_code is not found', () => {
      mockTypeOneReportService.keyResultStoryData = [
        { result_code: 'RES-001', impact_area_id: 1 },
        { result_code: 'RES-002', impact_area_id: 2 }
      ];
      component.result_code = 'RES-999';

      expect(component.resultIndex).toBe(-1);
    });

    it('should return -1 when keyResultStoryData is empty', () => {
      mockTypeOneReportService.keyResultStoryData = [];
      component.result_code = 'RES-001';

      expect(component.resultIndex).toBe(-1);
    });

    it('should handle number comparison correctly', () => {
      mockTypeOneReportService.keyResultStoryData = [
        { result_code: 123, impact_area_id: 1 },
        { result_code: 456, impact_area_id: 2 }
      ];
      component.result_code = 123;

      expect(component.resultIndex).toBe(0);
    });
  });

  describe('impactAreaName', () => {
    beforeEach(() => {
      mockTypeOneReportService.keyResultStoryData = [
        { result_code: 'RES-001', impact_area_id: 1 },
        { result_code: 'RES-002', impact_area_id: 2 },
        { result_code: 'RES-003', impact_area_id: 3 }
      ];
    });

    it('should return impact area name for valid index', () => {
      component.selectOptions = [
        { id_impactArea: 1, nameImpact: 'Climate Change' },
        { id_impactArea: 2, nameImpact: 'Food Security' },
        { id_impactArea: 3, nameImpact: 'Water Management' }
      ];

      const name = component.impactAreaName(1);

      expect(name).toBe('Food Security');
    });

    it('should return undefined when impact area is not found in selectOptions', () => {
      component.selectOptions = [
        { id_impactArea: 1, nameImpact: 'Climate Change' },
        { id_impactArea: 2, nameImpact: 'Food Security' }
      ];

      const name = component.impactAreaName(2);

      expect(name).toBeUndefined();
    });

    it('should return undefined when selectOptions is null', () => {
      component.selectOptions = null;

      const name = component.impactAreaName(0);

      expect(name).toBeUndefined();
    });

    it('should return undefined when selectOptions is undefined', () => {
      component.selectOptions = undefined;

      const name = component.impactAreaName(0);

      expect(name).toBeUndefined();
    });

    it('should return undefined when keyResultStoryData item is undefined', () => {
      component.selectOptions = [{ id_impactArea: 1, nameImpact: 'Climate Change' }];
      mockTypeOneReportService.keyResultStoryData = [];

      const name = component.impactAreaName(0);

      expect(name).toBeUndefined();
    });

    it('should return undefined when keyResultStoryData item has no impact_area_id', () => {
      mockTypeOneReportService.keyResultStoryData = [{ result_code: 'RES-001' }];
      component.selectOptions = [{ id_impactArea: 1, nameImpact: 'Climate Change' }];

      const name = component.impactAreaName(0);

      expect(name).toBeUndefined();
    });

    it('should handle empty selectOptions array', () => {
      component.selectOptions = [];

      const name = component.impactAreaName(0);

      expect(name).toBeUndefined();
    });

    it('should handle multiple items with same id_impactArea', () => {
      component.selectOptions = [
        { id_impactArea: 1, nameImpact: 'First' },
        { id_impactArea: 1, nameImpact: 'Second' }
      ];

      const name = component.impactAreaName(0);

      // Should return the first match
      expect(name).toBe('First');
    });
  });
});

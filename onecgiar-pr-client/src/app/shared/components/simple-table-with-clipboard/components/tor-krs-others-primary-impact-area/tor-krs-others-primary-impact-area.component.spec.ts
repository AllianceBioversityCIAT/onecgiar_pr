import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TorKrsOthersPrimaryImpactAreaComponent } from './tor-krs-others-primary-impact-area.component';
import { HttpClientModule } from '@angular/common/http';
import { TypeOneReportService } from '../../../../../pages/type-one-report/type-one-report.service';

describe('TorKrsOthersPrimaryImpactAreaComponent', () => {
  let component: TorKrsOthersPrimaryImpactAreaComponent;
  let fixture: ComponentFixture<TorKrsOthersPrimaryImpactAreaComponent>;
  let mockTypeOneReportService: any;

  beforeEach(async () => {
    mockTypeOneReportService = {
      keyResultStoryData: []
    };

    await TestBed.configureTestingModule({
      declarations: [TorKrsOthersPrimaryImpactAreaComponent],
      imports: [HttpClientModule],
      providers: [
        { provide: TypeOneReportService, useValue: mockTypeOneReportService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TorKrsOthersPrimaryImpactAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getImpactAreasList', () => {
    it('should return empty text with <br> when keyResultStoryData is undefined', () => {
      const result = component.getImpactAreasList(undefined);
      expect(result).toBe('<br>');
    });

    it('should return empty text with <br> when impact_areas is undefined', () => {
      const keyResultStoryData = {};
      const result = component.getImpactAreasList(keyResultStoryData);
      expect(result).toBe('<br>');
    });

    it('should parse JSON and return formatted text when impact_areas exists', () => {
      const impactAreas = [
        { nameImpact: 'Impact Area 1' },
        { nameImpact: 'Impact Area 2' }
      ];
      const keyResultStoryData = {
        impact_areas: JSON.stringify(impactAreas)
      };
      const result = component.getImpactAreasList(keyResultStoryData);
      expect(result).toBe('Impact Area 1; Impact Area 2<br>');
    });

    it('should handle single impact area', () => {
      const impactAreas = [
        { nameImpact: 'Single Impact Area' }
      ];
      const keyResultStoryData = {
        impact_areas: JSON.stringify(impactAreas)
      };
      const result = component.getImpactAreasList(keyResultStoryData);
      expect(result).toBe('Single Impact Area<br>');
    });

    it('should handle empty impact_areas array', () => {
      const keyResultStoryData = {
        impact_areas: JSON.stringify([])
      };
      const result = component.getImpactAreasList(keyResultStoryData);
      expect(result).toBe('<br>');
    });

    it('should handle multiple impact areas correctly', () => {
      const impactAreas = [
        { nameImpact: 'Area 1' },
        { nameImpact: 'Area 2' },
        { nameImpact: 'Area 3' }
      ];
      const keyResultStoryData = {
        impact_areas: JSON.stringify(impactAreas)
      };
      const result = component.getImpactAreasList(keyResultStoryData);
      expect(result).toBe('Area 1; Area 2; Area 3<br>');
    });
  });

  describe('resultIndex', () => {
    it('should return undefined when keyResultStoryData is undefined', () => {
      mockTypeOneReportService.keyResultStoryData = undefined;
      component.result_code = '123';
      expect(component.resultIndex).toBeUndefined();
    });

    it('should return -1 when keyResultStoryData is empty', () => {
      mockTypeOneReportService.keyResultStoryData = [];
      component.result_code = '123';
      expect(component.resultIndex).toBe(-1);
    });

    it('should return correct index when result_code is found', () => {
      mockTypeOneReportService.keyResultStoryData = [
        { result_code: '111' },
        { result_code: '222' },
        { result_code: '333' }
      ];
      component.result_code = '222';
      expect(component.resultIndex).toBe(1);
    });

    it('should return -1 when result_code is not found', () => {
      mockTypeOneReportService.keyResultStoryData = [
        { result_code: '111' },
        { result_code: '222' }
      ];
      component.result_code = '999';
      expect(component.resultIndex).toBe(-1);
    });

    it('should return 0 when result_code is first item', () => {
      mockTypeOneReportService.keyResultStoryData = [
        { result_code: '123' },
        { result_code: '456' }
      ];
      component.result_code = '123';
      expect(component.resultIndex).toBe(0);
    });
  });
});

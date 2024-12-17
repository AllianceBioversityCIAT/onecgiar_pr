import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IndicatorResultsModalComponent } from './indicator-results-modal.component';
import { IndicatorDetailsService } from '../../services/indicator-details.service';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { RouterModule } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('IndicatorResultsModalComponent', () => {
  let component: IndicatorResultsModalComponent;
  let fixture: ComponentFixture<IndicatorResultsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, TableModule, DialogModule, CustomFieldsModule, RouterModule, HttpClientTestingModule],
      providers: [IndicatorDetailsService]
    }).compileComponents();

    fixture = TestBed.createComponent(IndicatorResultsModalComponent);
    component = fixture.componentInstance;

    // Mock the update function
    component.indicatorDetailsService.indicatorData = {
      update: jest.fn()
    } as any;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct column order configuration', () => {
    expect(component.columnOrder).toHaveLength(8);
    expect(component.columnOrder[0]).toEqual({
      attr: 'result_code',
      title: 'Result Code',
      class: 'result_code'
    });
  });

  describe('openInNewPage', () => {
    it('should open result in new window with correct URL', () => {
      const windowSpy = jest.spyOn(window, 'open').mockImplementation();
      const resultCode = 'TEST123';
      const versionId = 'V1';

      component.openInNewPage(resultCode, versionId);

      expect(windowSpy).toHaveBeenCalledWith(`/result/result-detail/${resultCode}/general-information?phase=${versionId}`, '_blank');

      windowSpy.mockRestore();
    });
  });

  describe('handleAddIndicator', () => {
    it('should not update if result is already saved', () => {
      const result = { is_saved: true };

      component.handleAddIndicator(result);

      expect(component.indicatorDetailsService.indicatorData.update).not.toHaveBeenCalled();
    });

    it('should add result to contributing_results when is_added is true', () => {
      const result = {
        is_saved: false,
        is_added: false,
        id: '123',
        title: 'Test Result'
      };

      component.handleAddIndicator(result);

      expect(component.indicatorDetailsService.indicatorData.update).toHaveBeenCalled();
      const updateFn = (component.indicatorDetailsService.indicatorData.update as jest.Mock).mock.calls[0][0];
      const state = { contributing_results: [] };
      const newState = updateFn(state);

      expect(newState.contributing_results).toHaveLength(1);
      expect(newState.contributing_results[0]).toEqual({
        ...result,
        result_id: result.id,
        is_active: true
      });
    });

    it('should remove result from contributing_results when is_added is false', () => {
      const result = {
        is_saved: false,
        is_added: true,
        id: '123',
        result_id: '123',
        title: 'Test Result'
      };

      const initialState = {
        contributing_results: [result]
      };

      component.handleAddIndicator(result);

      expect(component.indicatorDetailsService.indicatorData.update).toHaveBeenCalled();
      const updateFn = (component.indicatorDetailsService.indicatorData.update as jest.Mock).mock.calls[0][0];
      const newState = updateFn(initialState);

      expect(newState.contributing_results).toHaveLength(0);
    });
  });
});

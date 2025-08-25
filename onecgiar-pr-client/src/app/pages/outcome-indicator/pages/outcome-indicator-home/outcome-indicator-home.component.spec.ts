import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OutcomeIndicatorHomeComponent } from './outcome-indicator-home.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { RouterTestingModule } from '@angular/router/testing';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';
import { OutcomeIndicatorService } from '../../services/outcome-indicator.service';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../shared/services/api/api.service';

describe('OutcomeIndicatorHomeComponent', () => {
  let component: OutcomeIndicatorHomeComponent;
  let fixture: ComponentFixture<OutcomeIndicatorHomeComponent>;
  let exportTablesService: ExportTablesService;
  let outcomeIndicatorService: OutcomeIndicatorService;
  let apiService: ApiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, CustomFieldsModule, OutcomeIndicatorHomeComponent, RouterTestingModule],
      providers: [ExportTablesService, OutcomeIndicatorService, MessageService]
    }).compileComponents();

    fixture = TestBed.createComponent(OutcomeIndicatorHomeComponent);
    component = fixture.componentInstance;
    exportTablesService = TestBed.inject(ExportTablesService);
    outcomeIndicatorService = TestBed.inject(OutcomeIndicatorService);
    apiService = TestBed.inject(ApiService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('exportFullReport', () => {
    it('should call GET_fullReport and exportIndicatorsToExcel on success', () => {
      const mockResponse = {
        response: {
          eois: [{ initiative_official_code: 'code1' }],
          wps: [{ initiative_official_code: 'code2' }]
        }
      };

      const apiSpy = jest.spyOn(apiService.resultsSE, 'GET_fullReport').mockReturnValue(of(mockResponse));

      const exportSpy = jest.spyOn(component, 'exportIndicatorsToExcel').mockImplementation();

      const requestingSpy = jest.spyOn(outcomeIndicatorService.requestingFullReport, 'set');

      component.exportFullReport();

      expect(requestingSpy).toHaveBeenCalledWith(true);
      expect(apiSpy).toHaveBeenCalled();
      expect(exportSpy).toHaveBeenCalledWith(mockResponse.response.eois, mockResponse.response.wps, 'Full_report_OIM_', true);
      expect(requestingSpy).toHaveBeenCalledWith(false);
    });

    it('should handle error in GET_fullReport', () => {
      const apiSpy = jest.spyOn(apiService.resultsSE, 'GET_fullReport').mockReturnValue(throwError(() => new Error('API error')));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const requestingSpy = jest.spyOn(outcomeIndicatorService.requestingFullReport, 'set');

      component.exportFullReport();

      expect(requestingSpy).toHaveBeenCalledWith(true);
      expect(apiSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      expect(requestingSpy).toHaveBeenCalledWith(false);
    });
  });

  describe('exportIndicatorsToExcel', () => {
    it('should call exportOutcomesIndicatorsToExcel with correct parameters', () => {
      const exportSpy = jest.spyOn(exportTablesService, 'exportOutcomesIndicatorsToExcel').mockResolvedValue();

      const wscolsEOIs = [
        { header: 'Outcome', key: 'toc_result_title', width: 50 },
        { header: 'Indicator', key: 'indicator_name', width: 50 },
        { header: 'Indicator Type', key: 'indicator_type', width: 50 },
        { header: 'Expected target', key: 'expected_target', width: 22 },
        { header: 'Actual target achieved', key: 'actual_target_achieved', width: 30 },
        { header: 'Achieved status', key: 'achieved_status', width: 22 },
        { header: 'Reporting status', key: 'reporting_status', width: 22 },
        { header: 'Narrative', key: 'indicator_achieved_narrative', width: 50 },
        { header: 'Supporting results', key: 'indicator_supporting_results', width: 60 }
      ];

      const wscolsWPs = [
        { header: 'Workpackage name', key: 'workpackage_name', width: 50 },
        { header: 'Outcome', key: 'toc_result_title', width: 50 },
        { header: 'Indicator', key: 'indicator_name', width: 50 },
        { header: 'Indicator Type', key: 'indicator_type', width: 50 },
        { header: 'Expected target', key: 'expected_target', width: 22 },
        { header: 'Actual target achieved', key: 'actual_target_achieved', width: 30 },
        { header: 'Achieved status', key: 'achieved_status', width: 22 },
        { header: 'Reporting status', key: 'reporting_status', width: 22 },
        { header: 'Narrative', key: 'indicator_achieved_narrative', width: 50 },
        { header: 'Supporting results', key: 'indicator_supporting_results', width: 60 }
      ];

      outcomeIndicatorService.eoisData = [{ indicators: [{ indicator_name: 'test' }] }];
      outcomeIndicatorService.wpsData = [{ indicators: [{ indicator_name: 'test' }] }];
      outcomeIndicatorService.loading.set(false);
      outcomeIndicatorService.loadingWPs.set(false);
      outcomeIndicatorService.initiativeIdFilter = 'test';
      component.api.dataControlSE.reportingCurrentPhase.phaseName = 'test';

      component.exportIndicatorsToExcel(outcomeIndicatorService.eoisData, outcomeIndicatorService.wpsData);

      expect(exportSpy).toHaveBeenCalledWith({
        fileName: `test_Contribution_Outcome_Indicators_`,
        EOIsConfig: {
          data: outcomeIndicatorService.eoisData,
          wscols: wscolsEOIs,
          cellToCenter: [1, 4, 5, 6, 7],
          worksheetName: 'EoI outcomes'
        },
        WPsConfig: {
          data: outcomeIndicatorService.wpsData,
          wscols: wscolsWPs,
          cellToCenter: [1, 5, 6, 7, 8],
          worksheetName: 'WP outcomes'
        },
        isT1R: false,
        showInitiativeCode: false
      });
    });

    it('should include initiative code column when showInitiativeCode is true', () => {
      const exportSpy = jest.spyOn(exportTablesService, 'exportOutcomesIndicatorsToExcel').mockResolvedValue();
      const messageSpy = jest.spyOn(component.messageService, 'add');

      outcomeIndicatorService.eoisData = [{ indicators: [{ indicator_name: 'test' }] }];
      outcomeIndicatorService.wpsData = [{ indicators: [{ indicator_name: 'test' }] }];
      outcomeIndicatorService.loading.set(false);
      outcomeIndicatorService.loadingWPs.set(false);
      outcomeIndicatorService.initiativeIdFilter = 'test';
      component.api.dataControlSE.reportingCurrentPhase.phaseName = 'test';

      component.exportIndicatorsToExcel(outcomeIndicatorService.eoisData, outcomeIndicatorService.wpsData, 'test_file', true);

      const expectedEOIsWsCols = [
        { header: 'Initiative', key: 'initiative_official_code', width: 22 },
        { header: 'Outcome', key: 'toc_result_title', width: 50 },
        { header: 'Indicator', key: 'indicator_name', width: 50 },
        { header: 'Indicator Type', key: 'indicator_type', width: 50 },
        { header: 'Expected target', key: 'expected_target', width: 22 },
        { header: 'Actual target achieved', key: 'actual_target_achieved', width: 30 },
        { header: 'Achieved status', key: 'achieved_status', width: 22 },
        { header: 'Reporting status', key: 'reporting_status', width: 22 },
        { header: 'Narrative', key: 'indicator_achieved_narrative', width: 50 },
        { header: 'Supporting results', key: 'indicator_supporting_results', width: 60 }
      ];

      const expectedWPsWsCols = [
        { header: 'Initiative', key: 'initiative_official_code', width: 22 },
        { header: 'Workpackage name', key: 'workpackage_name', width: 50 },
        { header: 'Outcome', key: 'toc_result_title', width: 50 },
        { header: 'Indicator', key: 'indicator_name', width: 50 },
        { header: 'Indicator Type', key: 'indicator_type', width: 50 },
        { header: 'Expected target', key: 'expected_target', width: 22 },
        { header: 'Actual target achieved', key: 'actual_target_achieved', width: 30 },
        { header: 'Achieved status', key: 'achieved_status', width: 22 },
        { header: 'Reporting status', key: 'reporting_status', width: 22 },
        { header: 'Narrative', key: 'indicator_achieved_narrative', width: 50 },
        { header: 'Supporting results', key: 'indicator_supporting_results', width: 60 }
      ];

      expect(exportSpy).toHaveBeenCalledWith({
        fileName: 'test_file',
        EOIsConfig: {
          data: outcomeIndicatorService.eoisData,
          wscols: expectedEOIsWsCols,
          cellToCenter: [1, 4, 5, 6, 7],
          worksheetName: 'EoI outcomes'
        },
        WPsConfig: {
          data: outcomeIndicatorService.wpsData,
          wscols: expectedWPsWsCols,
          cellToCenter: [1, 5, 6, 7, 8],
          worksheetName: 'WP outcomes'
        },
        isT1R: false,
        showInitiativeCode: true
      });

      expect(messageSpy).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'File exported successfully',
        detail: 'File exported successfully',
        key: 'outcomeIndicators',
        life: 3000
      });
    });

    it('should not call exportOutcomesIndicatorsToExcel if the conditions are not met', () => {
      const exportSpy = jest.spyOn(exportTablesService, 'exportOutcomesIndicatorsToExcel').mockResolvedValue();
      outcomeIndicatorService.eoisData = [];
      outcomeIndicatorService.wpsData = [];
      outcomeIndicatorService.loading.set(true);
      outcomeIndicatorService.loadingWPs.set(true);

      component.exportIndicatorsToExcel(outcomeIndicatorService.eoisData, outcomeIndicatorService.wpsData);

      expect(exportSpy).not.toHaveBeenCalled();
    });
  });
});

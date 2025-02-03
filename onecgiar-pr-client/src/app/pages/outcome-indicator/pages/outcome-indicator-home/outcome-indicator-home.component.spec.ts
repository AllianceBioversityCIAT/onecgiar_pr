import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OutcomeIndicatorHomeComponent } from './outcome-indicator-home.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { RouterTestingModule } from '@angular/router/testing';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';
import { OutcomeIndicatorService } from '../../services/outcome-indicator.service';
import { MessageService } from 'primeng/api';

describe('OutcomeIndicatorHomeComponent', () => {
  let component: OutcomeIndicatorHomeComponent;
  let fixture: ComponentFixture<OutcomeIndicatorHomeComponent>;
  let exportTablesService: ExportTablesService;
  let outcomeIndicatorService: OutcomeIndicatorService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, CustomFieldsModule, OutcomeIndicatorHomeComponent, RouterTestingModule],
      providers: [ExportTablesService, OutcomeIndicatorService, MessageService]
    }).compileComponents();

    fixture = TestBed.createComponent(OutcomeIndicatorHomeComponent);
    component = fixture.componentInstance;
    exportTablesService = TestBed.inject(ExportTablesService);
    outcomeIndicatorService = TestBed.inject(OutcomeIndicatorService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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

      component.exportIndicatorsToExcel();

      expect(exportSpy).toHaveBeenCalledWith({
        fileName: `test_Contribution_Outcome_Indicators_`,
        EOIsConfig: {
          data: outcomeIndicatorService.eoisData,
          wscols: wscolsEOIs,
          cellToCenter: [4, 5, 6, 7],
          worksheetName: 'EoI outcomes'
        },
        WPsConfig: {
          data: outcomeIndicatorService.wpsData,
          wscols: wscolsWPs,
          cellToCenter: [5, 6, 7, 8],
          worksheetName: 'WP outcomes'
        },
        isT1R: false
      });
    });

    it('should not call exportOutcomesIndicatorsToExcel if the conditions are not met', () => {
      const exportSpy = jest.spyOn(exportTablesService, 'exportOutcomesIndicatorsToExcel').mockResolvedValue();
      outcomeIndicatorService.eoisData = [];
      outcomeIndicatorService.wpsData = [];
      outcomeIndicatorService.loading.set(true);
      outcomeIndicatorService.loadingWPs.set(true);

      component.exportIndicatorsToExcel();

      expect(exportSpy).not.toHaveBeenCalled();
    });
  });
});

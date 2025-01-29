import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EoioHomeComponent } from './eoio-home.component';
import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';
import { OutcomeIndicatorService } from '../../services/outcome-indicator.service';
import { MessageService } from 'primeng/api';
jest.useFakeTimers();

describe('EoioHomeComponent', () => {
  let component: EoioHomeComponent;
  let fixture: ComponentFixture<EoioHomeComponent>;
  let exportTablesService: ExportTablesService;
  let outcomeIndicatorService: OutcomeIndicatorService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, EoioHomeComponent, HttpClientTestingModule, RouterTestingModule],
      declarations: [],
      providers: [ExportTablesService, OutcomeIndicatorService, MessageService]
    }).compileComponents();

    fixture = TestBed.createComponent(EoioHomeComponent);
    component = fixture.componentInstance;
    exportTablesService = TestBed.inject(ExportTablesService);
    outcomeIndicatorService = TestBed.inject(OutcomeIndicatorService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call outcomeIService.searchText.set with an empty string on ngOnDestroy', () => {
    const spy = jest.spyOn(component.outcomeIService.searchText, 'set');
    component.ngOnDestroy();
    expect(spy).toHaveBeenCalledWith('');
  });

  describe('ngOnInit', () => {
    it('should set detail section title', () => {
      const spy = jest.spyOn(component.api.dataControlSE, 'detailSectionTitle');
      component.ngOnInit();
      expect(spy).toHaveBeenCalledWith('End of initiative outcome indicators list');
    });
  });

  describe('exportProgressEoioExcel', () => {
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

      outcomeIndicatorService.eoisData = [{ indicators: [{ indicator_name: 'test' }] }];
      outcomeIndicatorService.loading.set(false);
      outcomeIndicatorService.initiativeIdFilter = 'test';

      component.exportProgressEoioExcel();
      jest.runAllTimers();

      expect(exportSpy).toHaveBeenCalledWith({
        fileName: `test_EOIO`,
        EOIsConfig: {
          data: outcomeIndicatorService.eoisData,
          wscols: wscolsEOIs,
          cellToCenter: [4, 5, 6, 7],
          worksheetName: 'EoI outcomes'
        }
      });
    });

    it('should not call exportOutcomesIndicatorsToExcel if the conditions are not met', () => {
      const exportSpy = jest.spyOn(exportTablesService, 'exportOutcomesIndicatorsToExcel').mockResolvedValue();
      outcomeIndicatorService.eoisData = [];
      outcomeIndicatorService.loading.set(true);

      component.exportProgressEoioExcel();

      expect(exportSpy).not.toHaveBeenCalled();
    });
  });
});

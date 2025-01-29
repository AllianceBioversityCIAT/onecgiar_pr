import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TorProgressEoioComponent } from './tor-progress-eoio.component';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';
import { OutcomeIndicatorService } from '../../../outcome-indicator/services/outcome-indicator.service';
import { MessageService } from 'primeng/api';
jest.useFakeTimers();

describe('TorProgressEoioComponent', () => {
  let component: TorProgressEoioComponent;
  let fixture: ComponentFixture<TorProgressEoioComponent>;
  let exportTablesService: ExportTablesService;
  let outcomeIndicatorService: OutcomeIndicatorService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [],
      imports: [HttpClientTestingModule],
      providers: [ExportTablesService, OutcomeIndicatorService, MessageService]
    }).compileComponents();

    fixture = TestBed.createComponent(TorProgressEoioComponent);
    component = fixture.componentInstance;
    exportTablesService = TestBed.inject(ExportTablesService);
    outcomeIndicatorService = TestBed.inject(OutcomeIndicatorService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call getEOIsData', () => {
      const getEOIsDataSpy = jest.spyOn(outcomeIndicatorService, 'getEOIsData');

      component.ngOnInit();
      expect(getEOIsDataSpy).toHaveBeenCalled();
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
        { header: 'Achieved status', key: 'achieved_status', width: 22 }
      ];

      outcomeIndicatorService.eoisData = [{ indicators: [{ indicator_name: 'test' }] }];
      outcomeIndicatorService.loading.set(false);
      outcomeIndicatorService.initiativeIdFilter = 'test';
      component.typeOneReportSE.initiativeSelected = 'test';

      component.exportProgressEoioExcel();
      jest.runAllTimers();

      expect(exportSpy).toHaveBeenCalledWith({
        fileName: `test_T1R_Progress_EOIO_`,
        EOIsConfig: {
          data: outcomeIndicatorService.eoisData,
          wscols: wscolsEOIs,
          cellToCenter: [4, 5, 6],
          worksheetName: 'EOIO'
        },
        isT1R: true
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

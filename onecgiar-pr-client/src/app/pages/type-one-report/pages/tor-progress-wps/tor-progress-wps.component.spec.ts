import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TorProgressWpsComponent } from './tor-progress-wps.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';
import { OutcomeIndicatorService } from '../../../outcome-indicator/services/outcome-indicator.service';
import { MessageService } from 'primeng/api';
jest.useFakeTimers();

describe('TorProgressWpsComponent', () => {
  let component: TorProgressWpsComponent;
  let fixture: ComponentFixture<TorProgressWpsComponent>;
  let exportTablesService: ExportTablesService;
  let outcomeIndicatorService: OutcomeIndicatorService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [],
      imports: [HttpClientTestingModule],
      providers: [ExportTablesService, OutcomeIndicatorService, MessageService]
    }).compileComponents();

    fixture = TestBed.createComponent(TorProgressWpsComponent);
    component = fixture.componentInstance;
    exportTablesService = TestBed.inject(ExportTablesService);
    outcomeIndicatorService = TestBed.inject(OutcomeIndicatorService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call getWorkPackagesData', () => {
      const getWPsDataSpy = jest.spyOn(outcomeIndicatorService, 'getWorkPackagesData');

      component.ngOnInit();
      expect(getWPsDataSpy).toHaveBeenCalled();
    });
  });

  describe('exportProgressWpsExcel', () => {
    it('should call exportOutcomesIndicatorsToExcel with correct parameters', () => {
      const exportSpy = jest.spyOn(exportTablesService, 'exportOutcomesIndicatorsToExcel').mockResolvedValue();

      const wscolsWPs = [
        { header: 'Workpackage name', key: 'workpackage_name', width: 50 },
        { header: 'Outcome', key: 'toc_result_title', width: 50 },
        { header: 'Indicator', key: 'indicator_name', width: 50 },
        { header: 'Indicator Type', key: 'indicator_type', width: 50 },
        { header: 'Expected target', key: 'expected_target', width: 22 },
        { header: 'Actual target achieved', key: 'actual_target_achieved', width: 30 },
        { header: 'Achieved status', key: 'achieved_status', width: 22 }
      ];

      outcomeIndicatorService.wpsData = [{ indicators: [{ indicator_name: 'test' }] }];
      outcomeIndicatorService.loadingWPs.set(false);
      outcomeIndicatorService.initiativeIdFilter = 'test';
      component.typeOneReportSE.initiativeSelected = 'test';

      component.exportProgressWpsExcel();
      jest.runAllTimers();

      expect(component.requesting).toBe(false);
      expect(exportSpy).toHaveBeenCalledWith({
        fileName: `test_T1R_Progress_WPs_`,
        WPsConfig: {
          data: outcomeIndicatorService.wpsData,
          wscols: wscolsWPs,
          cellToCenter: [5, 6, 7],
          worksheetName: 'WP'
        },
        isT1R: true
      });
    });

    it('should not call exportOutcomesIndicatorsToExcel if the conditions are not met', () => {
      const exportSpy = jest.spyOn(exportTablesService, 'exportOutcomesIndicatorsToExcel').mockResolvedValue();
      outcomeIndicatorService.eoisData = [];
      outcomeIndicatorService.loading.set(true);

      component.exportProgressWpsExcel();

      expect(exportSpy).not.toHaveBeenCalled();
    });
  });
});

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
      outcomeIndicatorService.eoisData = [];
      outcomeIndicatorService.wpsData = [];
      outcomeIndicatorService.initiativeIdFilter = 'test';

      component.exportIndicatorsToExcel();

      expect(exportSpy).toHaveBeenCalledWith(
        outcomeIndicatorService.eoisData,
        outcomeIndicatorService.wpsData,
        'test_Contribution_Outcome_Indicators_',
        expect.any(Array),
        expect.any(Array)
      );
    });
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { KnowledgeProductsComponent } from './knowledge-products.component';
import { PrButtonComponent } from '../../../../custom-fields/pr-button/pr-button.component';
import { PrInputComponent } from '../../../../custom-fields/pr-input/pr-input.component';
import { InputNumberModule } from 'primeng/inputnumber';
import { GlobalVariablesService } from '../../../../shared/services/global-variables.service';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';
import { MessageService } from 'primeng/api';
import { ModuleTypeEnum, StatusPhaseEnum } from '../../../../shared/enum/api.enum';

describe('KnowledgeProductsComponent', () => {
  let component: KnowledgeProductsComponent;
  let fixture: ComponentFixture<KnowledgeProductsComponent>;
  let globalVariablesService: GlobalVariablesService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [KnowledgeProductsComponent, PrButtonComponent, PrInputComponent],
      imports: [HttpClientTestingModule, InputNumberModule],
      providers: [GlobalVariablesService, ExportTablesService, ApiService, MessageService]
    }).compileComponents();

    fixture = TestBed.createComponent(KnowledgeProductsComponent);
    component = fixture.componentInstance;
    globalVariablesService = TestBed.inject(GlobalVariablesService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should set confidence_level and previous_confidence_level to the value of kp_mqap_institutions_confidence and call getAllPhases()', () => {
      globalVariablesService.get.kp_mqap_institutions_confidence = '10';
      const getAllPhasesSpy = jest.spyOn(component, 'getAllPhases');

      component.ngOnInit();

      expect(component.confidence_level).toEqual(10);
      expect(component.previous_confidence_level).toEqual(10);
      expect(getAllPhasesSpy).toHaveBeenCalled();
    });
  });

  describe('getAllPhases', () => {
    it('should set phaseList and phaseFilter to the response value of GET_versioning', () => {
      const response = [{ id: '2024', phase_year: '2024', status: true }];
      const get_versioningSpy = jest.spyOn(component.api.resultsSE, 'GET_versioning').mockReturnValue(of({ response }));

      component.getAllPhases();

      expect(component.phaseList).toEqual(response);
      expect(component.phaseFilter).toEqual('2024');
      expect(get_versioningSpy).toHaveBeenCalledWith(StatusPhaseEnum.ALL, ModuleTypeEnum.REPORTING);
    });
  });

  describe('onUpdateConfidenceLevel', () => {
    it('should update the confidence level and previous confidence level', () => {
      globalVariablesService.get.kp_mqap_institutions_confidence = '10';
      const putSpy = jest.spyOn(component.api.resultsSE, 'PUT_updateAdminKPConfidenceLevel').mockReturnValue(of({ response: { value: 20 } }));

      component.confidence_level = 20;
      component.previous_confidence_level = 10;
      component.onUpdateConfidenceLevel();

      expect(component.isLoadingConfidence).toBe(false);
      expect(component.confidence_level).toEqual(20);
      expect(component.previous_confidence_level).toEqual(20);
      expect(globalVariablesService.get.kp_mqap_institutions_confidence).toEqual(20);
      expect(putSpy).toHaveBeenCalledWith({ name: 'kp_mqap_institutions_confidence', value: 20 });
    });

    it('should not update the confidence level if it is the same as the previous confidence level', () => {
      const putSpy = jest.spyOn(component.api.resultsSE, 'PUT_updateAdminKPConfidenceLevel');

      globalVariablesService.get.kp_mqap_institutions_confidence = '10';
      component.confidence_level = 10;
      component.previous_confidence_level = 10;
      component.onUpdateConfidenceLevel();

      expect(component.isLoadingConfidence).toBe(false);
      expect(putSpy).not.toHaveBeenCalled();
    });

    it('should handle error', () => {
      const putSpy = jest.spyOn(component.api.resultsSE, 'PUT_updateAdminKPConfidenceLevel').mockReturnValue(
        throwError(() => ({
          error: 'Error occurred'
        }))
      );
      const consoleErrorSpy = jest.spyOn(console, 'error');

      globalVariablesService.get.kp_mqap_institutions_confidence = '10';
      component.confidence_level = 20;
      component.previous_confidence_level = 10;
      component.onUpdateConfidenceLevel();

      expect(component.isLoadingConfidence).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith({
        error: 'Error occurred'
      });
      expect(putSpy).toHaveBeenCalledWith({ name: 'kp_mqap_institutions_confidence', value: 20 });
    });
  });

  describe('onDownLoadTableAsExcel', () => {
    it('should call exportExcel method and set isLoadingReport to false when onDownLoadTableAsExcel is called', () => {
      const wscols = [
        { header: 'Result code', key: 'result_code', width: 14 },
        { header: 'Handle', key: 'kp_handle', width: 45 },
        { header: 'Author affiliation', key: 'author_affiliation', width: 60 },
        { header: 'CLARISA partner ID', key: 'partner_id', width: 27 },
        { header: 'CLARISA partner name', key: 'partner_name', width: 60 },
        { header: 'Matching type', key: 'matching_type', width: 20 },
        { header: 'Confidence level', key: 'confidence_level', width: 20 },
        { header: 'Is a correction', key: 'is_correction', width: 20 }
      ];

      component.phaseList = [{ id: '2024', phase_year: '2024', status: true }];
      component.phaseFilter = '2024';
      const exportTablesServiceSpy = jest.spyOn(TestBed.inject(ExportTablesService), 'exportExcelAdminKP');
      const apiServiceSpy = jest.spyOn(TestBed.inject(ApiService).resultsSE, 'POST_AdminKPExcelReport').mockReturnValue(of({ response: [] }));

      component.onDownLoadTableAsExcel();

      expect(exportTablesServiceSpy).toHaveBeenCalledWith([], `KPs_2024_Partner_Matching`, wscols);
      expect(component.isLoading).toBeFalsy();
      expect(apiServiceSpy).toHaveBeenCalledWith({ phase_id: '2024' });
    });

    it('should log error and set isLoadingReport to false when onDownLoadTableAsExcel encounters an error', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error');
      const apiServiceSpy = jest.spyOn(TestBed.inject(ApiService).resultsSE, 'POST_AdminKPExcelReport').mockReturnValue(
        throwError(() => {
          console.error('error');
        })
      );

      component.onDownLoadTableAsExcel();

      expect(consoleErrorSpy).toHaveBeenCalledWith('error');
      expect(component.isLoading).toBeFalsy();
      expect(apiServiceSpy).toHaveBeenCalledWith({ phase_id: null });
    });
  });
});

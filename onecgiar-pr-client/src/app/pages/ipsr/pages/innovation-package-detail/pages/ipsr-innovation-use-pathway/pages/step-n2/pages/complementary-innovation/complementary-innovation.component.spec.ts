import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ComplementaryInnovationComponent } from './complementary-innovation.component';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { IpsrDataControlService } from '../../../../../../../../services/ipsr-data-control.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrButtonComponent } from '../../../../../../../../../../custom-fields/pr-button/pr-button.component';
import { PrFieldHeaderComponent } from '../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { TableInnovationComponent } from './components/table-innovation/table-innovation.component';

describe('ComplementaryInnovationComponent', () => {
  let component: ComplementaryInnovationComponent;
  let fixture: ComponentFixture<ComplementaryInnovationComponent>;
  let apiService: ApiService;
  let ipsrDataControlService: IpsrDataControlService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ComplementaryInnovationComponent, PrButtonComponent, PrFieldHeaderComponent, TableInnovationComponent],
      imports: [RouterTestingModule, HttpClientTestingModule],
      providers: [ApiService, IpsrDataControlService]
    }).compileComponents();

    fixture = TestBed.createComponent(ComplementaryInnovationComponent);
    component = fixture.componentInstance;
    apiService = TestBed.inject(ApiService);
    ipsrDataControlService = TestBed.inject(IpsrDataControlService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // it('should initialize component', () => {
  //   spyOn(apiService, 'isStepTwoOne').and.returnValue(true);
  //   spyOn(apiService, 'isStepTwoTwo').and.returnValue(false);
  //   spyOn(component, 'innovationSving');
  //   spyOn(apiService.resultsSE, 'GETComplementataryInnovationFunctions').and.returnValue({ subscribe: () => {} });
  //   spyOn(component, 'columns');
  //   spyOn(component, 'getInformationInnovationComentary');

  //   component.ngOnInit();

  //   expect(apiService.isStepTwoOne).toHaveBeenCalled();
  //   expect(apiService.isStepTwoTwo).toHaveBeenCalled();
  //   expect(component.innovationSving).toHaveBeenCalled();
  //   expect(apiService.resultsSE.GETComplementataryInnovationFunctions).toHaveBeenCalled();
  //   expect(component.columns).toHaveBeenCalled();
  //   expect(component.getInformationInnovationComentary).toHaveBeenCalledWith(false);
  // });

  // it('should select innovation event', () => {
  //   const e = { result_id: 1 };
  //   component.selectInnovationEvent(e);

  //   expect(component.innovationPackageCreatorBody).toContain(e);
  // });

  // it('should save innovation event', async () => {
  //   const e = { result_id: 1 };
  //   spyOn(component, 'getInformationInnovationComentary');

  //   await component.createInnovationEvent(e);

  //   expect(component.innovationPackageCreatorBody).toContain(e);
  //   expect(component.getInformationInnovationComentary).toHaveBeenCalledWith(true);
  // });

  // it('should cancel innovation', () => {
  //   const result_id = 1;
  //   component.innovationPackageCreatorBody = [{ result_id: 1 }, { result_id: 2 }];
  //   component.informationComplementaryInnovations = [
  //     { result_code: 1, selected: true },
  //     { result_code: 2, selected: true }
  //   ];

  //   component.cancelInnovation(result_id);

  //   expect(component.innovationPackageCreatorBody).not.toContain({ result_id: 1 });
  //   expect(component.informationComplementaryInnovations.find(item => item.result_code === 1).selected).toBe(false);
  // });

  // it('should register complementary innovation', () => {
  //   const complementaryInnovcation = [{ result_id: 1 }, { id: 2 }];
  //   const expectedOutput = [{ result_id: 1 }, { result_id: 2 }];

  //   const result = component.regiterInnovationComplementary(complementaryInnovcation);

  //   expect(result).toEqual(expectedOutput);
  // });

  // it('should save section', () => {
  //   spyOn(apiService.resultsSE, 'PATCHComplementaryInnovation').and.returnValue({ subscribe: () => {} });
  //   component.innovationPackageCreatorBody = [{ result_id: 1 }, { result_id: 2 }];

  //   component.onSaveSection();

  //   expect(apiService.resultsSE.PATCHComplementaryInnovation).toHaveBeenCalledWith({ complementaryInovatins: [{ result_id: 1 }, { result_id: 2 }] });
  // });

  // it('should save previous or next', () => {
  //   spyOn(apiService.resultsSE, 'PATCHComplementaryInnovationPrevious').and.returnValue({ subscribe: () => {} });
  //   spyOn(apiService.rolesSE, 'readOnly').and.returnValue(true);
  //   spyOn(component.router, 'navigate');

  //   component.onSavePreviuosNext('next');

  //   expect(apiService.resultsSE.PATCHComplementaryInnovationPrevious).toHaveBeenCalledWith({ complementaryInovatins: [] }, 'next');
  //   expect(component.router.navigate).toHaveBeenCalledWith(['/ipsr/detail/' + ipsrDataControlService.resultInnovationCode + '/ipsr-innovation-use-pathway/step-3'], {
  //     queryParams: { phase: ipsrDataControlService.resultInnovationPhase }
  //   });
  // });

  // it('should get information innovation commentary', () => {
  //   spyOn(apiService.resultsSE, 'GETinnovationpathwayStepTwo').and.returnValue({ subscribe: () => {} });
  //   component.innovationPackageCreatorBody = [{ result_code: 1 }, { result_code: 2 }];
  //   component.informationComplementaryInnovations = [{ result_code: 1 }, { result_code: 2 }];
  //   spyOn(apiService.rolesSE, 'validateInitiative').and.returnValue(true);

  //   component.getInformationInnovationComentary(false);

  //   expect(apiService.resultsSE.GETinnovationpathwayStepTwo).toHaveBeenCalled();
  //   expect(component.informationComplementaryInnovations[0].selected).toBe(true);
  //   expect(component.informationComplementaryInnovations[0].full_name).toContain('1');
  //   expect(apiService.rolesSE.validateInitiative).toHaveBeenCalled();
  // });

  // it('should save edit', () => {
  //   spyOn(component, 'getInformationInnovationComentary');
  //   spyOn(component, 'innovationSving');

  //   component.saveEdit(null);

  //   expect(component.getInformationInnovationComentary).toHaveBeenCalledWith(true);
  //   expect(component.innovationSving).toHaveBeenCalled();
  // });
});

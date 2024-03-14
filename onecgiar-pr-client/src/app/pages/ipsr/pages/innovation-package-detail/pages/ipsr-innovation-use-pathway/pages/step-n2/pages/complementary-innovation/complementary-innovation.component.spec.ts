import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ComplementaryInnovationComponent } from './complementary-innovation.component';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { IpsrDataControlService } from '../../../../../../../../services/ipsr-data-control.service';
import { PrButtonComponent } from '../../../../../../../../../../custom-fields/pr-button/pr-button.component';
import { PrFieldHeaderComponent } from '../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { TableInnovationComponent } from './components/table-innovation/table-innovation.component';
import { NewComplementaryInnovationComponent } from './components/new-complementary-innovation/new-complementary-innovation.component';
import { YesOrNotByBooleanPipe } from '../../../../../../../../../../custom-fields/pipes/yes-or-not-by-boolean.pipe';
import { SaveButtonComponent } from '../../../../../../../../../../custom-fields/save-button/save-button.component';
import { PrInputComponent } from '../../../../../../../../../../custom-fields/pr-input/pr-input.component';
import { PrTextareaComponent } from '../../../../../../../../../../custom-fields/pr-textarea/pr-textarea.component';
import { PrRadioButtonComponent } from '../../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { PrFieldValidationsComponent } from '../../../../../../../../../../custom-fields/pr-field-validations/pr-field-validations.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';
import { RadioButtonModule } from 'primeng/radiobutton';
import { of } from 'rxjs';
import { Router } from '@angular/router';

describe('ComplementaryInnovationComponent', () => {
  let component: ComplementaryInnovationComponent;
  let fixture: ComponentFixture<ComplementaryInnovationComponent>;
  let mockRouter: any;

  beforeEach(async () => {
    mockRouter = {
      navigate: jest.fn(),
      navigateByUrl: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [ComplementaryInnovationComponent, PrButtonComponent, PrFieldHeaderComponent, TableInnovationComponent, NewComplementaryInnovationComponent, YesOrNotByBooleanPipe, SaveButtonComponent, PrInputComponent, PrTextareaComponent, PrRadioButtonComponent, PrFieldValidationsComponent],
      imports: [RouterTestingModule, HttpClientTestingModule, DialogModule, FormsModule, TooltipModule, RadioButtonModule],
      providers: [
        ApiService,
        IpsrDataControlService,
        {
          provide: Router,
          useValue: mockRouter
        }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ComplementaryInnovationComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize component properties', () => {
    expect(component.body).toBeUndefined();
    expect(component.innovationPackageCreatorBody).toEqual([]);
    expect(component.complemntaryFunction).toBeUndefined();
    expect(component.status).toBe(false);
    expect(component.informationComplementaryInnovations).toEqual([]);
    expect(component.cols).toEqual([]);
    expect(component.isInitiative).toBe(true);
  });

  it('should call API methods on component initialization', () => {
    const apiService = TestBed.inject(ApiService);
    jest.spyOn(apiService.resultsSE, 'GETComplementataryInnovationFunctions').mockReturnValue(of({}));
    jest.spyOn(apiService.resultsSE, 'GETInnovationPathwayStepTwoInnovationSelect').mockReturnValue(of({}));

    component.ngOnInit();

    expect(apiService.isStepTwoOne).toBe(true);
    expect(apiService.isStepTwoTwo).toBe(false);
    expect(apiService.resultsSE.GETComplementataryInnovationFunctions).toHaveBeenCalled();
    expect(apiService.resultsSE.GETInnovationPathwayStepTwoInnovationSelect).toHaveBeenCalled();
  });

  it('should select innovation event', () => {
    const e = { result_id: 1 };
    component.selectInnovationEvent(e);

    expect(component.innovationPackageCreatorBody).toContain(e);
  });

  it('should create innovation event', () => {
    const e = { result_id: 1 };
    jest.spyOn(component, 'getInformationInnovationComentary');

    component.createInnovationEvent(e);

    expect(component.innovationPackageCreatorBody).toContain(e);
    expect(component.getInformationInnovationComentary).toHaveBeenCalled();
  });

  it('should populate cols array correctly', () => {
    component.complemntaryFunction = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    component.columns();

    expect(component.cols).toEqual([
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10]
    ]);
  });

  it('should populate cols array correctly when complementaryFunction length is less than 5', () => {
    component.complemntaryFunction = [1, 2, 3];

    component.columns();

    expect(component.cols).toEqual([[1, 2, 3]]);
  });

  it('should cancel innovation', () => {
    const result_id = 1;
    const innovationFind = { result_code: 'code', selected: true };
    component.innovationPackageCreatorBody = [{ result_id: '1', result_code: 'code' }] as any;
    component.informationComplementaryInnovations = [innovationFind];

    component.cancelInnovation(result_id);

    expect(component.innovationPackageCreatorBody.length).toBe(0);
    expect(innovationFind.selected).toBe(false);
  });

  it('should return an array of selected innovations with "result_id" property', () => {
    const complementaryInnovcation = [{ result_id: 1 }, { result_id: 2 }, { result_id: 3 }];

    const result = component.regiterInnovationComplementary(complementaryInnovcation);

    expect(result).toEqual([{ result_id: 1 }, { result_id: 2 }, { result_id: 3 }]);
  });

  it('should return an array of selected innovations with "id" property if "result_id" is not available', () => {
    const complementaryInnovcation = [{ id: 1 }, { id: 2 }, { id: 3 }];

    const result = component.regiterInnovationComplementary(complementaryInnovcation);

    expect(result).toEqual([{ result_id: 1 }, { result_id: 2 }, { result_id: 3 }]);
  });

  it('should return an empty array if no innovations are provided', () => {
    const complementaryInnovcation = [];

    const result = component.regiterInnovationComplementary(complementaryInnovcation);

    expect(result).toEqual([]);
  });

  it('should call PATCHComplementaryInnovation API method', () => {
    const apiService = TestBed.inject(ApiService);
    const mockResponse = {};
    jest.spyOn(apiService.resultsSE, 'PATCHComplementaryInnovation').mockReturnValue(of(mockResponse));

    component.onSaveSection();

    expect(apiService.resultsSE.PATCHComplementaryInnovation).toHaveBeenCalledWith({ complementaryInovatins: component.body });
  });

  it('should navigate to step 3 when descrip is "next" and user is in read-only mode', () => {
    const descrip = 'next';
    const routerSpy = jest.spyOn(component.router, 'navigate');
    component.api.rolesSE.readOnly = true;
    component.ipsrDataControlSE.resultInnovationCode = '123';
    component.ipsrDataControlSE.resultInnovationPhase = 'phase';

    component.onSavePreviuosNext(descrip);

    expect(routerSpy).toHaveBeenCalledWith(['/ipsr/detail/123/ipsr-innovation-use-pathway/step-3'], {
      queryParams: { phase: 'phase' }
    });
  });

  it('should navigate to step 1 when descrip is "previous" and user is in read-only mode', () => {
    const descrip = 'previous';
    const routerSpy = jest.spyOn(component.router, 'navigate');
    component.api.rolesSE.readOnly = true;
    component.ipsrDataControlSE.resultInnovationCode = '123';
    component.ipsrDataControlSE.resultInnovationPhase = 'phase';

    component.onSavePreviuosNext(descrip);

    expect(routerSpy).toHaveBeenCalledWith(['/ipsr/detail/123/ipsr-innovation-use-pathway/step-1'], {
      queryParams: { phase: 'phase' }
    });
  });

  it('it should redirect to step-3 if is read-only and descrip is next', () => {
    const descrip = 'next';
    const routerSpy = jest.spyOn(mockRouter, 'navigate');
    component.api.rolesSE.readOnly = true;
    component.ipsrDataControlSE.resultInnovationCode = '123';
    component.ipsrDataControlSE.resultInnovationPhase = 'phase';

    component.onSavePreviuosNext(descrip);

    expect(routerSpy).toHaveBeenCalledWith(['/ipsr/detail/123/ipsr-innovation-use-pathway/step-3'], {
      queryParams: { phase: 'phase' }
    });
  });

  it('it should redirect to step-1 if is read-only and descrip is previous', () => {
    const descrip = 'previous';
    const routerSpy = jest.spyOn(mockRouter, 'navigate');
    component.api.rolesSE.readOnly = true;
    component.ipsrDataControlSE.resultInnovationCode = '123';
    component.ipsrDataControlSE.resultInnovationPhase = 'phase';

    component.onSavePreviuosNext(descrip);

    expect(routerSpy).toHaveBeenCalledWith(['/ipsr/detail/123/ipsr-innovation-use-pathway/step-1'], {
      queryParams: { phase: 'phase' }
    });
  });

  it('should call PATCHComplementaryInnovationPrevious API method', () => {
    const apiService = TestBed.inject(ApiService);
    const mockResponse = {};
    component.api.rolesSE.readOnly = false;

    jest.spyOn(apiService.resultsSE, 'PATCHComplementaryInnovationPrevious').mockReturnValue(of(mockResponse));

    component.onSavePreviuosNext('next');

    expect(apiService.resultsSE.PATCHComplementaryInnovationPrevious).toHaveBeenCalledWith({ complementaryInovatins: component.body }, 'next');
  });

  it('should populate informationComplementaryInnovations and set selected flag to true for matching items', () => {
    const mockResponse = {
      response: [
        { result_code: 'code1', title: 'Title 1', initiative_official_code: 'Initiative 1', lead_contact_person: 'Person 1' },
        { result_code: 'code2', title: 'Title 2', initiative_official_code: 'Initiative 2', lead_contact_person: 'Person 2' },
        { result_code: 'code3', title: 'Title 3', initiative_official_code: 'Initiative 3', lead_contact_person: 'Person 3' }
      ]
    };
    jest.spyOn(component.api.resultsSE, 'GETinnovationpathwayStepTwo').mockReturnValue(of(mockResponse));

    component.innovationPackageCreatorBody = [{ result_code: 'code1' }, { result_code: 'code2' }] as any;

    component.getInformationInnovationComentary('estado');

    expect(component.informationComplementaryInnovations).toEqual(mockResponse.response);
    expect(component.informationComplementaryInnovations[0].selected).toBe(true);
    expect(component.informationComplementaryInnovations[1].selected).toBe(true);
    expect(component.informationComplementaryInnovations[2].selected).toBeUndefined();
  });

  it('should set additional properties and validate initiative', () => {
    const mockResponse = {
      response: [{ result_code: 'code1', title: 'Title 1', initiative_official_code: 'Initiative 1', lead_contact_person: 'Person 1' }]
    };
    jest.spyOn(component.api.resultsSE, 'GETinnovationpathwayStepTwo').mockReturnValue(of(mockResponse));
    jest.spyOn(component.api.rolesSE, 'validateInitiative').mockReturnValue(true);

    component.getInformationInnovationComentary('estado');

    expect(component.informationComplementaryInnovations[0].full_name).toBe('code1 Title 1 Initiative 1 Initiative 1 Person 1 yes no ');
    expect(component.informationComplementaryInnovations[0].result_code).toBe('code1');
    expect(component.informationComplementaryInnovations[0].permissos).toBe(true);
  });

  it('should call getInformationInnovationComentary and innovationSving', () => {
    jest.spyOn(component, 'getInformationInnovationComentary');
    jest.spyOn(component, 'innovationSving');

    component.saveEdit(true);

    expect(component.getInformationInnovationComentary).toHaveBeenCalledWith(true);
    expect(component.innovationSving).toHaveBeenCalled();
  });
});

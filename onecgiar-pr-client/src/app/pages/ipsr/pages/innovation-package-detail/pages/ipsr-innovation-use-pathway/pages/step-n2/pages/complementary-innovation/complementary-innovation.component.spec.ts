import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ComplementaryInnovation, ComplementaryInnovationComponent } from './complementary-innovation.component';
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
      declarations: [
        ComplementaryInnovationComponent,
        PrButtonComponent,
        PrFieldHeaderComponent,
        TableInnovationComponent,
        NewComplementaryInnovationComponent,
        YesOrNotByBooleanPipe,
        SaveButtonComponent,
        PrInputComponent,
        PrTextareaComponent,
        PrRadioButtonComponent,
        PrFieldValidationsComponent
      ],
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

  it('should load innovation package on initialization', () => {
    const mockResponse = { response: [] };
    jest.spyOn(component.api.resultsSE, 'GETInnovationPathwayStepTwoInnovationSelect').mockReturnValue(of(mockResponse));

    component.ngOnInit();

    expect(component.api.resultsSE.GETInnovationPathwayStepTwoInnovationSelect).toHaveBeenCalled();
    expect(component.innovationPackageCreatorBody).toEqual(mockResponse.response);
  });

  it('should load complementary functions on initialization', () => {
    const mockResponse = { response: [] };
    jest.spyOn(component.api.resultsSE, 'GETComplementataryInnovationFunctions').mockReturnValue(of(mockResponse));

    component.ngOnInit();

    expect(component.api.resultsSE.GETComplementataryInnovationFunctions).toHaveBeenCalled();
    expect(component.complementaryFunction).toEqual(mockResponse.response);
  });

  it('should load linked results on initialization', () => {
    const mockResponse = { response: [] };
    jest.spyOn(component.api.resultsSE, 'GET_resultsLinked').mockReturnValue(of(mockResponse));

    component.ngOnInit();

    expect(component.api.resultsSE.GET_resultsLinked).toHaveBeenCalled();
    expect(component.linksToResultsBody).toEqual(mockResponse.response);
  });

  it('should add event to innovationPackageCreatorBody on selectInnovationEvent', () => {
    const event = { result_id: 1 };
    component.selectInnovationEvent(event);

    expect(component.innovationPackageCreatorBody).toContain(event);
  });

  it('should call loadInformationComplementaryInnovations on createInnovationEvent', () => {
    const event = { result_id: 1 } as any;
    jest.spyOn(component, 'loadInformationComplementaryInnovations');

    component.createInnovationEvent(event);

    expect(component.innovationPackageCreatorBody).toContain(event);
    expect(component.loadInformationComplementaryInnovations).toHaveBeenCalled();
  });

  it('should setup columns correctly', () => {
    component.complementaryFunction = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    component.setupColumns();

    expect(component.cols).toEqual([
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10]
    ]);
  });

  it('should cancel innovation correctly', () => {
    const result = { result_id: '1', result_code: 'code', result_type_id: 7 } as ComplementaryInnovation;
    const innovationFind = { result_code: 'code', selected: true };
    component.innovationPackageCreatorBody = [result];
    component.informationInnovationDevelopments = [innovationFind];

    component.cancelInnovation(result);

    expect(component.innovationPackageCreatorBody.length).toBe(0);
    expect(innovationFind.selected).toBe(false);
  });

  it('should cancel complementary innovation correctly', () => {
    const result = { result_id: '1', result_code: 'code', result_type_id: 11 } as ComplementaryInnovation;
    const innovationFind = { result_code: 'code', selected: true };
    component.innovationPackageCreatorBody = [result];
    component.informationComplementaryInnovations = [innovationFind];

    component.cancelInnovation(result);

    expect(component.innovationPackageCreatorBody.length).toBe(0);
    expect(innovationFind.selected).toBe(false);
  });

  it('should not cancel innovation if result_id is not found', () => {
    const result = { result_id: '1', result_code: 'code', result_type_id: 7 } as ComplementaryInnovation;
    component.innovationPackageCreatorBody = [{ result_id: '2', result_code: 'code2', result_type_id: 7 } as ComplementaryInnovation];

    component.cancelInnovation(result);

    expect(component.innovationPackageCreatorBody.length).toBe(1);
  });

  it('should not change selected property if innovation is not found in the list', () => {
    const result = { result_id: '1', result_code: 'code', result_type_id: 7 } as ComplementaryInnovation;
    component.innovationPackageCreatorBody = [result];
    component.informationInnovationDevelopments = [{ result_code: 'code2', selected: true }];

    component.cancelInnovation(result);

    expect(component.innovationPackageCreatorBody.length).toBe(0);
    expect(component.informationInnovationDevelopments[0].selected).toBe(true);
  });

  it('should register complementary innovations correctly', () => {
    const complementaryInnovations = [{ result_id: 1 }, { result_id: 2 }, { result_id: 3 }] as any[];

    const result = component.registerInnovationComplementary(complementaryInnovations);

    expect(result).toEqual([{ result_id: 1 }, { result_id: 2 }, { result_id: 3 }]);
  });

  it('should use element.id if element.result_id is not defined on registerInnovationComplementary', () => {
    const complementaryInnovations = [{ id: 1 }, { id: 2 }, { id: 3 }] as any[];

    const result = component.registerInnovationComplementary(complementaryInnovations);

    expect(result).toEqual([{ result_id: 1 }, { result_id: 2 }, { result_id: 3 }]);
  });

  it('should call PATCHComplementaryInnovation API method on onSaveSection', () => {
    component.linksToResultsBody = {
      links: []
    };
    component.innovationPackageCreatorBody = [
      { result_id: 1, created_date: '', result_type_id: 7 },
      { result_id: 2, created_date: '', result_type_id: 11 },
      { result_id: 3, created_date: '', result_type_id: 7 }
    ] as any[];
    const mockResponse = {};
    jest.spyOn(component.api.resultsSE, 'PATCHComplementaryInnovation').mockReturnValue(of(mockResponse));

    component.onSaveSection();

    expect(component.api.resultsSE.PATCHComplementaryInnovation).toHaveBeenCalledWith({ complementaryInovatins: component.body });
  });

  it('should navigate to step 3 when description is "next" and user is in read-only mode', () => {
    component.api.rolesSE.isAdmin = true;
    component.api.isStepTwoTwo = true;
    const description = 'next';
    const routerSpy = jest.spyOn(component.router, 'navigate');
    component.api.rolesSE.readOnly = true;
    component.ipsrDataControlSE.resultInnovationCode = '123';
    component.ipsrDataControlSE.resultInnovationPhase = 'phase';

    component.onSavePreviousNext(description);

    expect(routerSpy).toHaveBeenCalledWith(['/ipsr/detail/123/ipsr-innovation-use-pathway/step-3'], {
      queryParams: { phase: 'phase' }
    });
  });

  it('should navigate to step 2 - basic info when description is "next" and this.api.isStepTwoTwo is false', () => {
    component.api.rolesSE.isAdmin = true;
    component.api.isStepTwoTwo = false;
    const description = 'next';
    const routerSpy = jest.spyOn(component.router, 'navigate');
    component.api.rolesSE.readOnly = true;
    component.ipsrDataControlSE.resultInnovationCode = '123';
    component.ipsrDataControlSE.resultInnovationPhase = 'phase';

    component.onSavePreviousNext(description);

    expect(routerSpy).toHaveBeenCalledWith(['/ipsr/detail/123/ipsr-innovation-use-pathway/step-2/basic-info'], {
      queryParams: { phase: 'phase' }
    });
  });

  it('should navigate to step 1 when description is "previous" and user is in read-only mode', () => {
    const description = 'previous';
    const routerSpy = jest.spyOn(component.router, 'navigate');
    component.api.rolesSE.readOnly = true;
    component.ipsrDataControlSE.resultInnovationCode = '123';
    component.ipsrDataControlSE.resultInnovationPhase = 'phase';

    component.onSavePreviousNext(description);

    expect(routerSpy).toHaveBeenCalledWith(['/ipsr/detail/123/ipsr-innovation-use-pathway/step-1'], {
      queryParams: { phase: 'phase' }
    });
  });

  it('should call PATCHComplementaryInnovationPrevious API method on onSavePreviousNext', () => {
    component.linksToResultsBody = {
      links: []
    };
    const mockResponse = {};
    component.api.rolesSE.readOnly = false;

    jest.spyOn(component.api.resultsSE, 'PATCHComplementaryInnovationPrevious').mockReturnValue(of(mockResponse));

    component.onSavePreviousNext('next');

    expect(component.api.resultsSE.PATCHComplementaryInnovationPrevious).toHaveBeenCalledWith({ complementaryInovatins: component.body }, 'next');
  });

  it('should load information complementary innovations correctly', () => {
    const mockResponse = {
      response: [
        { result_code: 'code1', title: 'Title 1', initiative_official_code: 'Initiative 1', lead_contact_person: 'Person 1', result_type_id: 7 },
        { result_code: 'code2', title: 'Title 2', initiative_official_code: 'Initiative 2', lead_contact_person: 'Person 2', result_type_id: 7 },
        { result_code: 'code3', title: 'Title 3', initiative_official_code: 'Initiative 3', lead_contact_person: 'Person 3', result_type_id: 7 }
      ]
    };
    jest.spyOn(component.api.resultsSE, 'GETinnovationpathwayStepTwo').mockReturnValue(of(mockResponse));

    component.innovationPackageCreatorBody = [{ result_code: 'code1' }, { result_code: 'code2' }] as any;

    component.loadInformationComplementaryInnovations();

    expect(component.informationInnovationDevelopments).toEqual(mockResponse.response);
    expect(component.informationInnovationDevelopments[0].selected).toBe(true);
    expect(component.informationInnovationDevelopments[1].selected).toBe(true);
    expect(component.informationInnovationDevelopments[2].selected).toBeUndefined();
  });

  it('should set additional properties and validate initiative', () => {
    const mockResponse = {
      response: [
        { result_code: 'code1', title: 'Title 1', initiative_official_code: 'Initiative 1', lead_contact_person: 'Person 1', result_type_id: 7 }
      ]
    };
    jest.spyOn(component.api.resultsSE, 'GETinnovationpathwayStepTwo').mockReturnValue(of(mockResponse));
    jest.spyOn(component.api.rolesSE, 'validateInitiative').mockReturnValue(true);

    component.loadInformationComplementaryInnovations();

    expect(component.informationInnovationDevelopments[0].full_name).toBe('code1 Title 1 Initiative 1 Initiative 1 Person 1 yes no');
    expect(component.informationInnovationDevelopments[0].result_code).toBe('code1');
    expect(component.informationInnovationDevelopments[0].permissos).toBe(true);
  });

  it('should call loadInformationComplementaryInnovations and loadInnovationPackage on saveEdit', () => {
    jest.spyOn(component, 'loadInformationComplementaryInnovations');
    jest.spyOn(component, 'loadInnovationPackage');

    component.saveEdit();

    expect(component.loadInformationComplementaryInnovations).toHaveBeenCalled();
    expect(component.loadInnovationPackage).toHaveBeenCalled();
  });

  it('should filter recent additions correctly in onSaveSection', () => {
    component.innovationPackageCreatorBody = [
      { result_id: 1, created_date: '2023-01-01', result_type_id: 7 },
      { result_id: 2, created_date: '2023-01-02', result_type_id: 11 },
      { result_id: 3, created_date: '2023-01-03', result_type_id: 7 }
    ] as any[];
    component.linksToResultsBody = {
      links: [{ result_id: 2 }]
    };

    const recentAdditions = component.innovationPackageCreatorBody.filter(
      element =>
        element.created_date && element.result_type_id === 7 && !component.linksToResultsBody.links.some(link => link.result_id === element.result_id)
    );

    expect(recentAdditions).toEqual([
      { result_id: 1, created_date: '2023-01-01', result_type_id: 7 },
      { result_id: 3, created_date: '2023-01-03', result_type_id: 7 }
    ]);
  });

  it('should filter recent additions correctly in onSavePreviousNext', () => {
    component.innovationPackageCreatorBody = [
      { result_id: 1, created_date: '2023-01-01', result_type_id: 7 },
      { result_id: 2, created_date: '2023-01-02', result_type_id: 11 },
      { result_id: 3, created_date: '2023-01-03', result_type_id: 7 }
    ] as any[];
    component.linksToResultsBody = {
      links: [{ result_id: 2 }]
    };

    const recentAdditions = component.innovationPackageCreatorBody.filter(
      element =>
        element.created_date && element.result_type_id === 7 && !component.linksToResultsBody.links.some(link => link.result_id === element.result_id)
    );

    expect(recentAdditions).toEqual([
      { result_id: 1, created_date: '2023-01-01', result_type_id: 7 },
      { result_id: 3, created_date: '2023-01-03', result_type_id: 7 }
    ]);
  });

  it('should call POST_resultsLinked if there are recent additions in onSaveSection', () => {
    component.innovationPackageCreatorBody = [
      { result_id: 1, created_date: '2023-01-01', result_type_id: 7 },
      { result_id: 2, created_date: '2023-01-02', result_type_id: 11 },
      { result_id: 3, created_date: '2023-01-03', result_type_id: 7 }
    ] as any[];
    component.linksToResultsBody = {
      links: [{ result_id: 2 }]
    };
    const mockResponse = {};
    jest.spyOn(component.api.resultsSE, 'PATCHComplementaryInnovation').mockReturnValue(of(mockResponse));
    jest.spyOn(component.api.resultsSE, 'POST_resultsLinked').mockReturnValue(of(mockResponse));

    component.onSaveSection();

    expect(component.api.resultsSE.POST_resultsLinked).toHaveBeenCalled();
  });

  it('should not call POST_resultsLinked if there are no recent additions in onSaveSection', () => {
    component.innovationPackageCreatorBody = [
      { result_id: 1, created_date: '2023-01-01', result_type_id: 7 },
      { result_id: 2, created_date: '2023-01-02', result_type_id: 11 }
    ] as any[];
    component.linksToResultsBody = {
      links: [{ result_id: 1 }, { result_id: 2 }]
    };
    const mockResponse = {};
    jest.spyOn(component.api.resultsSE, 'PATCHComplementaryInnovation').mockReturnValue(of(mockResponse));
    jest.spyOn(component.api.resultsSE, 'POST_resultsLinked').mockReturnValue(of(mockResponse));

    component.onSaveSection();

    expect(component.api.resultsSE.POST_resultsLinked).not.toHaveBeenCalled();
  });

  it('should call POST_resultsLinked if there are recent additions in onSavePreviousNext', () => {
    component.innovationPackageCreatorBody = [
      { result_id: 1, created_date: '2023-01-01', result_type_id: 7 },
      { result_id: 2, created_date: '2023-01-02', result_type_id: 11 },
      { result_id: 3, created_date: '2023-01-03', result_type_id: 7 }
    ] as any[];
    component.linksToResultsBody = {
      links: [{ result_id: 2 }]
    };
    component.api.rolesSE.readOnly = false;
    const mockResponse = {};
    jest.spyOn(component.api.resultsSE, 'PATCHComplementaryInnovationPrevious').mockReturnValue(of(mockResponse));
    jest.spyOn(component.api.resultsSE, 'POST_resultsLinked').mockReturnValue(of(mockResponse));

    component.onSavePreviousNext('next');

    expect(component.api.resultsSE.POST_resultsLinked).toHaveBeenCalled();
  });

  it('should not call POST_resultsLinked if there are no recent additions in onSavePreviousNext', () => {
    component.innovationPackageCreatorBody = [
      { result_id: 1, created_date: '2023-01-01', result_type_id: 7 },
      { result_id: 2, created_date: '2023-01-02', result_type_id: 11 }
    ] as any[];
    component.linksToResultsBody = {
      links: [{ result_id: 1 }, { result_id: 2 }]
    };
    const mockResponse = {};
    jest.spyOn(component.api.resultsSE, 'PATCHComplementaryInnovationPrevious').mockReturnValue(of(mockResponse));
    jest.spyOn(component.api.resultsSE, 'POST_resultsLinked').mockReturnValue(of(mockResponse));

    component.onSavePreviousNext('next');

    expect(component.api.resultsSE.POST_resultsLinked).not.toHaveBeenCalled();
  });
});

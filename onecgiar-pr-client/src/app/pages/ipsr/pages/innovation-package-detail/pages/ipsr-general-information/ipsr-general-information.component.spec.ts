import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IpsrGeneralInformationComponent } from './ipsr-general-information.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { YesOrNotByBooleanPipe } from '../../../../../../custom-fields/pipes/yes-or-not-by-boolean.pipe';
import { FormsModule } from '@angular/forms';
import { PrRadioButtonComponent } from '../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { PrYesOrNotComponent } from '../../../../../../custom-fields/pr-yes-or-not/pr-yes-or-not.component';
import { PrInputComponent } from '../../../../../../custom-fields/pr-input/pr-input.component';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrTextareaComponent } from '../../../../../../custom-fields/pr-textarea/pr-textarea.component';
import { AlertStatusComponent } from '../../../../../../custom-fields/alert-status/alert-status.component';
import { PrFieldValidationsComponent } from '../../../../../../custom-fields/pr-field-validations/pr-field-validations.component';
import { SaveButtonComponent } from '../../../../../../custom-fields/save-button/save-button.component';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { IpsrDataControlService } from '../../../../../../pages/ipsr/services/ipsr-data-control.service';
import { ScoreService } from '../../../../../../shared/services/global/score.service';

describe('IpsrGeneralInformationComponent', () => {
  let component: IpsrGeneralInformationComponent;
  let fixture: ComponentFixture<IpsrGeneralInformationComponent>;
  let mockApiService: any;
  let mockIpsrDataControlService: any;
  let mockScoreService: any;
  const mockGETInnovationByResultIdResponse = {
    is_krs: ''
  };
  const mockPATCHIpsrGeneralInfoResponse = {};

  const mockGET_investmentDiscontinuedOptionsResponse: any = [
    {
      investment_discontinued_option_id: 1,
      value: true,
      is_active: false,
      description: 'desc1'
    }
  ];

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GETInnovationByResultId: () => of({ response: mockGETInnovationByResultIdResponse }),
        PATCHIpsrGeneralInfo: () => of({ response: mockPATCHIpsrGeneralInfoResponse }),
        GET_investmentDiscontinuedOptions: () => {
          return of({ response: mockGET_investmentDiscontinuedOptionsResponse });
        }
      },
      alertsFe: {
        show: jest.fn()
      },
      dataControlSE: {
        detailSectionTitle: jest.fn()
      }
    };

    mockIpsrDataControlService = {
      resultInnovationId: 'mockInnovationId'
    };

    mockScoreService = {};

    await TestBed.configureTestingModule({
      declarations: [IpsrGeneralInformationComponent, YesOrNotByBooleanPipe, PrRadioButtonComponent, PrYesOrNotComponent, PrInputComponent, PrFieldHeaderComponent, PrTextareaComponent, AlertStatusComponent, PrFieldValidationsComponent, SaveButtonComponent],
      imports: [HttpClientTestingModule, FormsModule],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: IpsrDataControlService,
          useValue: mockIpsrDataControlService
        },
        {
          provide: ScoreService,
          useValue: mockScoreService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(IpsrGeneralInformationComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit()', () => {
    it('should call getSectionInformation on ngOnInit and dataControlSE.detailSectionTitle', () => {
      const getSectionInformationSpy = jest.spyOn(component, 'getSectionInformation');
      const detailSectionTitleSpy = jest.spyOn(mockApiService.dataControlSE, 'detailSectionTitle');

      component.ngOnInit();
      expect(getSectionInformationSpy).toHaveBeenCalled();
      expect(detailSectionTitleSpy).toHaveBeenCalled();
    });
  });

  describe('getSectionInformation()', () => {
    it('should call GETInnovationByResultId and set ipsrGeneralInformationBody on getSectionInformation', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GETInnovationByResultId');
      component.getSectionInformation();

      expect(spy).toHaveBeenCalled();
      expect(component.ipsrGeneralInformationBody).toEqual(mockGETInnovationByResultIdResponse);
    });
  });

  describe('GET_investmentDiscontinuedOptions', () => {
    it('should call GET_investmentDiscontinuedOptions and convertChecklistToDiscontinuedOptions', () => {
      const spyGET_investmentDiscontinuedOptions = jest.spyOn(mockApiService.resultsSE, 'GET_investmentDiscontinuedOptions');
      const spyConvertChecklistToDiscontinuedOptions = jest.spyOn(component, 'convertChecklistToDiscontinuedOptions');

      component.GET_investmentDiscontinuedOptions();

      expect(spyGET_investmentDiscontinuedOptions).toHaveBeenCalled();
      expect(spyConvertChecklistToDiscontinuedOptions).toHaveBeenCalledWith(mockGET_investmentDiscontinuedOptionsResponse);
    });
  });

  describe('convertChecklistToDiscontinuedOptions', () => {
    it('should call convertChecklistToDiscontinuedOptions and update generalInfoBody.discontinued_options', () => {
      const spyConvertChecklistToDiscontinuedOptions = jest.spyOn(component, 'convertChecklistToDiscontinuedOptions');

      component.convertChecklistToDiscontinuedOptions(mockGET_investmentDiscontinuedOptionsResponse);

      expect(spyConvertChecklistToDiscontinuedOptions).toHaveBeenCalled();
      expect(component.ipsrGeneralInformationBody.discontinued_options).toEqual(mockGET_investmentDiscontinuedOptionsResponse);
    });
  });

  describe('onChangeKrs()', () => {
    it('should set is_krs to null on onChangeKrs if is_krs is false', () => {
      component.ipsrGeneralInformationBody.is_krs = false;
      component.onChangeKrs();
      expect(component.ipsrGeneralInformationBody.is_krs).toBeNull();
    });
  });

  describe('onSaveSection()', () => {
    it('should call PATCHIpsrGeneralInfo and show success alert on onSaveSection', () => {
      const getSectionInformationSpy = jest.spyOn(component, 'getSectionInformation');
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCHIpsrGeneralInfo');
      const showSuccessAlertSpy = jest.spyOn(mockApiService.alertsFe, 'show');

      component.onSaveSection();

      expect(spy).toHaveBeenCalled();
      expect(getSectionInformationSpy).toHaveBeenCalled();
      expect(showSuccessAlertSpy).toHaveBeenCalledWith({
        id: 'save-button',
        title: 'Section saved successfully',
        description: '',
        status: 'success',
        closeIn: 500
      });
    });
    it('should call PATCHIpsrGeneralInfo and show error alert on onSaveSection error', () => {
      const mockError = new Error('Error');
      jest.spyOn(mockApiService.resultsSE, 'PATCHIpsrGeneralInfo').mockReturnValue(throwError({ error: mockError }));
      const showErrorAlertSpy = jest.spyOn(mockApiService.alertsFe, 'show');

      component.onSaveSection();

      expect(showErrorAlertSpy).toHaveBeenCalledWith({
        id: 'save-button',
        title: 'There was an error saving the section',
        description: '',
        status: 'error',
        closeIn: 500
      });
    });
  });

  describe('climateInformation()', () => {
    it('should return climate information string', () => {
      const climateInformationString = component.climateInformation();
      expect(climateInformationString).toContain('<strong>Climate change tag guidance</strong>');
    });
  });

  describe('nutritionInformation()', () => {
    it('should return nutrition information string', () => {
      const nutritionInformationString = component.nutritionInformation();
      expect(nutritionInformationString).toContain('<strong>Nutrition, health and food security tag guidance</strong>');
    });
  });

  describe('environmentInformation()', () => {
    it('should return environment information string', () => {
      const environmentInformationString = component.environmentInformation();
      expect(environmentInformationString).toContain('<strong>Environmental health and biodiversity tag guidance</strong>');
    });
  });

  describe('povertyInformation()', () => {
    it('should return poverty information string', () => {
      const povertyInformationString = component.povertyInformation();
      expect(povertyInformationString).toContain('<strong>Poverty reduction, livelihoods and jobs tag guidance</strong>');
    });
  });

  describe('genderInformation()', () => {
    it('should return gender information string', () => {
      const genderInformationString = component.genderInformation();
      expect(genderInformationString).toContain('<strong>Gender equality tag guidance</strong>');
    });
  });
});

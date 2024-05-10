import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PartnersRequestComponent } from './partners-request.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { PrInputComponent } from '../../../../../../custom-fields/pr-input/pr-input.component';
import { PrSelectComponent } from '../../../../../../custom-fields/pr-select/pr-select.component';
import { PrButtonComponent } from '../../../../../../custom-fields/pr-button/pr-button.component';
import { AlertStatusComponent } from '../../../../../../custom-fields/alert-status/alert-status.component';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrFieldValidationsComponent } from '../../../../../../custom-fields/pr-field-validations/pr-field-validations.component';
import { LabelNamePipe } from '../../../../../../custom-fields/pr-select/label-name.pipe';
import { YesOrNotByBooleanPipe } from '../../../../../../custom-fields/pipes/yes-or-not-by-boolean.pipe';
import { IpsrDataControlService } from '../../../../../../pages/ipsr/services/ipsr-data-control.service';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';
import { jest } from '@jest/globals';

jest.useFakeTimers();

describe('PartnersRequestComponent', () => {
  let component: PartnersRequestComponent;
  let fixture: ComponentFixture<PartnersRequestComponent>;
  let mockApiService: any;
  let mockIpsrDataControlService: any;

  beforeEach(async () => {
    mockApiService = {
      alertsFe: {
        show: jest.fn()
      },
      resultsSE: {
        GET_AllCLARISARegions: () => of({ response: [] }),
        GET_AllCLARISACountries: () => of({ response: [] }),
        GET_allInstitutions: () => of({ response: [] }),
        GET_allInstitutionTypes: () => of({ response: [] }),
        GET_allChildlessInstitutionTypes: () => of({ response: [] }),
        POST_partnerRequest: () => of({ response: {} }),
      },
      dataControlSE: {
        someMandatoryFieldIncomplete: jest.fn(),
        myInitiativesList: [
          {
            official_code: 1,
            role: 'role'
          },
        ],
        currentResult: {
          initiative_official_code: 1,
          initiative_short_name: 'short name',
          initiative_name: 'name',
          initiative_id: 1
        }
      },
      rolesSE: {
        roles: {
          application: 'application',
          initiative: [{
            initiative_id: 1
          }]
        },
      },
      authSE: {
        localStorageUser: {
          id: 'id',
          email: 'email@email.com',
          user_name: 'username'
        }
      }
    }

    mockIpsrDataControlService = {
      inIpsr: true,
      detailData: {
        initiative_official_code: 1,
        initiative_short_name: 'short name',
        initiative_name: 'name',
        initiative_id: 1
      }
    }

    await TestBed.configureTestingModule({
      declarations: [
        PartnersRequestComponent,
        PrInputComponent,
        PrSelectComponent,
        PrButtonComponent,
        AlertStatusComponent,
        PrFieldHeaderComponent,
        PrFieldValidationsComponent,
        LabelNamePipe,
        YesOrNotByBooleanPipe
      ],
      imports: [
        HttpClientTestingModule,
        DialogModule,
        FormsModule,
        TooltipModule
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: IpsrDataControlService,
          useValue: mockIpsrDataControlService
        },
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(PartnersRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('ngOnInit', () => {
    it('should call getInitiativeAndRole on ngOnInit', () => {
      const spy = jest.spyOn(component, 'getInitiativeAndRole');
      component.ngOnInit();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getInitiativeAndRole', () => {
    it('should generate correct text based on myInitiativesList', () => {
      const result = component.getInitiativeAndRole();

      expect(result).toContain('[1 - role]');
    });
  });

  describe('cleanObject', () => {
    it('should set showForm to false and then true after a timeout', () => {
      component.cleanObject();

      expect(component.showForm).toBeFalsy();
      jest.runAllTimers();
      fixture.detectChanges();

      expect(component.showForm).toBeTruthy();
    });
  });

  describe('onRequestPartner', () => {
    it('should set the partnersRequestBody and call POST_partnerRequeston success', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'POST_partnerRequest');
      const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');

      component.onRequestPartner();

      expect(spy).toHaveBeenCalled();
      expect(component.partnersRequestBody.externalUserName).toBe(mockApiService.authSE.localStorageUser.user_name);
      expect(component.partnersRequestBody.externalUserMail).toBe(mockApiService.authSE.localStorageUser.email);
      expect(component.requesting).toBeFalsy();
      expect(mockApiService.dataControlSE.showPartnersRequest).toBeFalsy();

      expect(spyShow).toHaveBeenCalledWith({
        id: 'partners',
        title: 'Partner has been requested.',
        description: `The partner request was sent successfully. You will receive a confirmation message as soon as it has been processed <strong>(Please note that the partner review process may take up to 2 business days)</strong>. Please note that once your partner request is approved, it could take up to an hour to be available in the CLARISA institutions list. In case of any questions, please contact the technical support`,
        status: 'success',
      });
    });
    it('should set the partnersRequestBody and call POST_partnerRequest on success when ipsrDataControlSE.inIpsr is false', () => {
      mockIpsrDataControlService.inIpsr = false;
      const spy = jest.spyOn(mockApiService.resultsSE, 'POST_partnerRequest');

      component.onRequestPartner();

      expect(spy).toHaveBeenCalled();
    });
    it('should set the partnersRequestBody and call POST_partnerRequest on success when ipsrDataControlSE.inIpsr is false and api.dataControlSE.currentResult is undefined', () => {
      mockIpsrDataControlService.inIpsr = false;
      mockApiService.dataControlSE.currentResult = undefined;
      const spy = jest.spyOn(mockApiService.resultsSE, 'POST_partnerRequest');

      component.onRequestPartner();

      expect(spy).toHaveBeenCalled();
    });

    it('should set the partnersRequestBody and call POST_partnerRequest on success when status = 500', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'POST_partnerRequest').mockReturnValue(of({ status: 500 }));
      const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');

      component.onRequestPartner();

      expect(spy).toHaveBeenCalled();
      expect(spyShow).toHaveBeenCalledWith({
        id: 'partners-error',
        title: 'Error when requesting partner',
        description: 'Server problems',
        status: 'error'
      });
    });
    it('should set the partnersRequestBody and call POST_partnerRequest on success when status = 500', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'POST_partnerRequest')
        .mockReturnValue(throwError('error'));
      const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');

      component.onRequestPartner();

      expect(spy).toHaveBeenCalled();
      expect(component.requesting).toBeFalsy();
      expect(mockApiService.dataControlSE.showPartnersRequest).toBeFalsy();
      expect(spyShow).toHaveBeenCalledWith({
        id: 'partners-error',
        title: 'Error when requesting partner',
        description: '',
        status: 'error'
      });
    });
  });
  describe('ngDoCheck', () => {
    it('should set formIsInvalid based on someMandatoryFieldIncomplete', () => {
      const spy = jest.spyOn(mockApiService.dataControlSE, 'someMandatoryFieldIncomplete');
      spy.mockReturnValue(true);

      component.ngDoCheck();
      expect(spy).toHaveBeenCalled();
      expect(component.formIsInvalid).toBeTruthy();
    });
  });
});

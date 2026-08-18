import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CapDevInfoComponent } from './cap-dev-info.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrRadioButtonComponent } from '../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { PrInputComponent } from '../../../../../../../custom-fields/pr-input/pr-input.component';
import { PrFieldHeaderComponent } from '../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { SaveButtonComponent } from '../../../../../../../custom-fields/save-button/save-button.component';
import { AlertStatusComponent } from '../../../../../../../custom-fields/alert-status/alert-status.component';
import { YesOrNotByBooleanPipe } from '../../../../../../../custom-fields/pipes/yes-or-not-by-boolean.pipe';
import { PrFieldValidationsComponent } from '../../../../../../../custom-fields/pr-field-validations/pr-field-validations.component';
import { DetailSectionTitleComponent } from '../../../../../../../custom-fields/detail-section-title/detail-section-title.component';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { environment } from '../../../../../../../../environments/environment';
import { signal } from '@angular/core';
import { CustomFieldsModule } from '../../../../../../../custom-fields/custom-fields.module';
import { RolesService } from '../../../../../../../shared/services/global/roles.service';

describe('CapDevInfoComponent', () => {
  let component: CapDevInfoComponent;
  let fixture: ComponentFixture<CapDevInfoComponent>;
  let mockApiService: any;

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_capdevsTerms: () => of({ response: ['term1', 'term2', 'term3', 'term4'] }),
        GET_capdevsDeliveryMethod: () => of({ response: ['method1', 'method2'] }),
        GET_capacityDevelopent: () => of({ response: { capdev_term_id: 1 } }),
        PATCH_capacityDevelopent: () => of({}),
        GET_allInstitutions: () => of({ response: [] }),
        GET_allInstitutionTypes: () => of({ response: [] }),
        GET_allChildlessInstitutionTypes: () => of({ response: [] }),
        currentResultCode: 1,
        currentResultPhase: 1
      },
      dataControlSE: {
        currentResultSectionName: signal<string>('Capacity Sharing for Development information'),
        findClassTenSeconds: jest.fn(() => Promise.resolve())
      }
    };

    await TestBed.configureTestingModule({
      declarations: [
        CapDevInfoComponent,
        PrRadioButtonComponent,
        PrInputComponent,
        PrFieldHeaderComponent,
        SaveButtonComponent,
        AlertStatusComponent,
        YesOrNotByBooleanPipe,
        PrFieldValidationsComponent,
        DetailSectionTitleComponent
      ],
      imports: [HttpClientTestingModule, FormsModule],
      providers: [{ provide: ApiService, useValue: mockApiService }]
    }).compileComponents();

    fixture = TestBed.createComponent(CapDevInfoComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit()', () => {
    it('should call getData() on initialization', () => {
      const spyGET_capdevsTerms = jest.spyOn(component, 'GET_capdevsTerms');
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');
      const spyRequestEvent = jest.spyOn(component, 'requestEvent');
      const spyGET_capdevsDeliveryMethod = jest.spyOn(component, 'GET_capdevsDeliveryMethod');

      component.ngOnInit();
      expect(spyGET_capdevsTerms).toHaveBeenCalled();
      expect(spyGetSectionInformation).toHaveBeenCalled();
      expect(spyRequestEvent).toHaveBeenCalled();
      expect(spyGET_capdevsDeliveryMethod).toHaveBeenCalled();
    });
  });

  describe('GET_capdevsTerms()', () => {
    it('should fetch and set capdevsTerms and capdevsSubTerms', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_capdevsTerms');

      component.GET_capdevsTerms();

      expect(spy).toHaveBeenCalled();
      expect(component.capdevsTerms).toEqual(['term3', 'term4']);
      expect(component.capdevsSubTerms).toEqual(['term1', 'term2']);
    });
  });

  describe('GET_capdevsDeliveryMethod()', () => {
    it('should fetch and set deliveryMethodOptions', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_capdevsDeliveryMethod');

      component.GET_capdevsDeliveryMethod();

      expect(spy).toHaveBeenCalled();
      expect(component.deliveryMethodOptions).toEqual(['method1', 'method2']);
    });
  });

  describe('getSectionInformation()', () => {
    it('should fetch and set capDevInfoRoutingBody', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_capacityDevelopent');

      component.getSectionInformation();

      expect(spy).toHaveBeenCalled();
      expect(component.capDevInfoRoutingBody).toEqual({ capdev_term_id: 1 });
    });
  });

  describe('clean_capdev_term_2()', () => {
    it('should set capdev_term_id_2 to null if capdev_term_id_1 is 3', () => {
      component.capdev_term_id_1 = 3;

      component.clean_capdev_term_2();

      expect(component.capdev_term_id_2).toBeNull();
    });
  });

  describe('length_of_training()', () => {
    it('should return HTML string with correct training information', () => {
      const result = component.length_of_training();

      expect(result).toContain('<ul>');
      expect(result).toContain('<li>Long-term training refers to training that goes for 3 or more months.</li>');
      expect(result).toContain('<li>Short-term training refers to training that goes for less than 3 months.</li>');
      expect(result).toContain(
        '<li>Both long-term and short-term training programs must be completed before reporting (to avoid reporting the same trainee multiple times across years).</li>'
      );
      expect(result).toContain('</ul>');
    });
  });

  describe('length_of_training()', () => {
    it('should set capdev_term_id_1 to 3 if capdev_term_id is 3', () => {
      component.capDevInfoRoutingBody.capdev_term_id = 3;

      component.get_capdev_term_id();

      expect(component.capdev_term_id_1).toEqual(3);
      expect(component.capdev_term_id_2).toBeNull();
    });
  });

  it('should set capdev_term_id_1 to 4 if capdev_term_id is 4', () => {
    component.capDevInfoRoutingBody.capdev_term_id = 4;

    component.get_capdev_term_id();

    expect(component.capdev_term_id_1).toEqual(4);
    expect(component.capdev_term_id_2).toBeNull();
  });

  it('should set capdev_term_id_1 to 4 and capdev_term_id_2 to capdev_term_id if capdev_term_id is 1 or 2', () => {
    component.capDevInfoRoutingBody.capdev_term_id = 2;

    component.get_capdev_term_id();

    expect(component.capdev_term_id_1).toEqual(4);
    expect(component.capdev_term_id_2).toEqual(2);
  });

  describe('cleanOrganizationsList()', () => {
    it('should set capDevInfoRoutingBody.institutions to []', () => {
      component.cleanOrganizationsList();

      expect(component.capDevInfoRoutingBody.institutions).toEqual([]);
    });
  });

  describe('validate_capdev_term_id()', () => {
    it('should set capdev_term_id to capdev_term_id_2 if capdev_term_id_2 is defined', () => {
      component.capdev_term_id_1 = 3;
      component.capdev_term_id_2 = 2;

      component.validate_capdev_term_id();

      expect(component.capDevInfoRoutingBody.capdev_term_id).toEqual(2);
    });

    it('should set capdev_term_id to capdev_term_id_1 if capdev_term_id_2 is not defined', () => {
      component.capdev_term_id_1 = 4;
      component.capdev_term_id_2 = null;

      component.validate_capdev_term_id();

      expect(component.capDevInfoRoutingBody.capdev_term_id).toEqual(4);
    });
  });

  describe('validate_capdev_term_id()', () => {
    it('should call validate_capdev_term_id and cleanOrganizationsList when onSaveSection is called', () => {
      component.capDevInfoRoutingBody.is_attending_for_organization = false;

      const validateCapDevTermIdSpy = jest.spyOn(component, 'validate_capdev_term_id');
      const cleanOrganizationsListSpy = jest.spyOn(component, 'cleanOrganizationsList');
      const PATCH_capacityDevelopentSpy = jest.spyOn(mockApiService.resultsSE, 'PATCH_capacityDevelopent');

      component.onSaveSection();

      expect(validateCapDevTermIdSpy).toHaveBeenCalled();
      expect(cleanOrganizationsListSpy).toHaveBeenCalled();
      expect(PATCH_capacityDevelopentSpy).toHaveBeenCalled();
    });
  });

  describe('validate_capdev_term_id()', () => {
    it('should return the correct description for delivery method', () => {
      const description = component.deliveryMethodDescription();
      const expectedDescription = `If you selected 'In person' or 'Blended', please ensure that you have the correct selections for <a href="${environment.frontBaseUrl}result/result-detail/${mockApiService.resultsSE.currentResultCode}/geographic-location?phase=${mockApiService.resultsSE.currentResultPhase}" class="open_route" target="_blank">section 4. Geographic Location</a>.`;

      expect(description).toEqual(expectedDescription);
    });
  });

  describe('normalizeAttendanceValue()', () => {
    it.each([
      [1, true],
      ['1', true],
      [true, true],
      [0, false],
      ['0', false],
      [false, false],
      [null, null],
      [undefined, null]
    ])('maps %p to %p', (input, expected) => {
      expect(component.normalizeAttendanceValue(input)).toBe(expected);
    });
  });

  describe('getSectionInformation() — tinyint attendance hydration (P2-3246)', () => {
    it('normalizes the tinyint 0 returned by MySQL into the boolean false the radio options use', () => {
      jest
        .spyOn(mockApiService.resultsSE, 'GET_capacityDevelopent')
        .mockReturnValue(of({ response: { capdev_term_id: 1, is_attending_for_organization: 0 } }));

      component.getSectionInformation();

      expect(component.capDevInfoRoutingBody.is_attending_for_organization).toBe(false);
    });

    it('normalizes the tinyint 1 returned by MySQL into the boolean true the radio options use', () => {
      jest
        .spyOn(mockApiService.resultsSE, 'GET_capacityDevelopent')
        .mockReturnValue(of({ response: { capdev_term_id: 1, is_attending_for_organization: 1 } }));

      component.getSectionInformation();

      expect(component.capDevInfoRoutingBody.is_attending_for_organization).toBe(true);
    });

    it('leaves an unanswered field as null instead of coercing it to a selected option', () => {
      jest
        .spyOn(mockApiService.resultsSE, 'GET_capacityDevelopent')
        .mockReturnValue(of({ response: { capdev_term_id: 1, is_attending_for_organization: null } }));

      component.getSectionInformation();

      expect(component.capDevInfoRoutingBody.is_attending_for_organization).toBeNull();
    });
  });

  describe('sectionLoading (skeleton)', () => {
    it('is released once the section GET responds', () => {
      component.sectionLoading.set(true);

      component.getSectionInformation();

      expect(component.sectionLoading()).toBe(false);
    });

    it('is released when the section GET fails, so the skeleton can never get stuck', () => {
      component.sectionLoading.set(true);
      jest.spyOn(mockApiService.resultsSE, 'GET_capacityDevelopent').mockReturnValue(throwError(() => new Error('boom')));

      component.getSectionInformation();

      expect(component.sectionLoading()).toBe(false);
    });
  });

});

describe('CapDevInfoComponent — attendance radio reflects the saved value (P2-3246)', () => {
  let fixture: ComponentFixture<CapDevInfoComponent>;
  let capDevResponse: any;

  const attendanceRadios = (): HTMLInputElement[] => {
    const groups: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('app-pr-radio-button'));
    const attendanceGroup = groups.find(group => Array.from(group.querySelectorAll('label.name')).some(label => label.textContent.trim() === 'Yes'));
    return Array.from(attendanceGroup.querySelectorAll('input.pr-native-radio'));
  };

  const renderWith = async (isAttendingForOrganization: unknown) => {
    capDevResponse = { capdev_term_id: 1, institutions: [], is_attending_for_organization: isAttendingForOrganization };
    fixture = TestBed.createComponent(CapDevInfoComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();

    const apiServiceMock = {
      resultsSE: {
        GET_capdevsTerms: () =>
          of({
            response: [
              { capdev_term_id: 1, name: 'Long-term' },
              { capdev_term_id: 2, name: 'Short-term' },
              { capdev_term_id: 3, name: 'Not applicable' },
              { capdev_term_id: 4, name: 'Training' }
            ]
          }),
        GET_capdevsDeliveryMethod: () => of({ response: [{ capdev_delivery_method_id: 1, name: 'In person' }] }),
        GET_capacityDevelopent: () => of({ response: capDevResponse }),
        PATCH_capacityDevelopent: () => of({}),
        GET_allInstitutions: () => of({ response: [] }),
        GET_allInstitutionTypes: () => of({ response: [] }),
        GET_allChildlessInstitutionTypes: () => of({ response: [] }),
        currentResultCode: 1,
        currentResultPhase: 1
      },
      dataControlSE: {
        currentResultSectionName: signal<string>('Capacity Sharing for Development information'),
        findClassTenSeconds: jest.fn(() => Promise.resolve())
      }
    };

    await TestBed.configureTestingModule({
      declarations: [CapDevInfoComponent],
      imports: [HttpClientTestingModule, FormsModule, CustomFieldsModule],
      providers: [{ provide: ApiService, useValue: apiServiceMock }]
    }).compileComponents();

    TestBed.inject(RolesService).readOnly = false;
  });

  it('checks "No" when the backend returns the tinyint 0', async () => {
    await renderWith(0);

    const [yesRadio, noRadio] = attendanceRadios();
    expect(noRadio.checked).toBe(true);
    expect(yesRadio.checked).toBe(false);
  });

  it('checks "Yes" when the backend returns the tinyint 1', async () => {
    await renderWith(1);

    const [yesRadio, noRadio] = attendanceRadios();
    expect(yesRadio.checked).toBe(true);
    expect(noRadio.checked).toBe(false);
  });

  it('leaves both options unchecked when the field was never answered', async () => {
    await renderWith(null);

    const [yesRadio, noRadio] = attendanceRadios();
    expect(yesRadio.checked).toBe(false);
    expect(noRadio.checked).toBe(false);
  });
});

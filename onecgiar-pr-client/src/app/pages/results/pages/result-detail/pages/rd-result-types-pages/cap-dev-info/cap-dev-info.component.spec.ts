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
import { DataControlService } from '../../../../../../../shared/services/data-control.service';
import { FeedbackValidationDirectiveModule } from '../../../../../../../shared/directives/feedback-validation-directive.module';

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

/**
 * P2-3241 — the client's mandatory fields must be EXACTLY the ones the green check asks for.
 *
 * The verdict is not computed here: it comes from the MySQL function `validation_capacity_dev_P25`
 * (`onecgiar-pr-server/src/migrations/1762528725798-createValidtionP25.ts:251-292`), resolved by the
 * stored procedure `validate_sections_mapped_batch`. It demands seven things, and the client used to
 * flag only one of them — so the section never turned green and nothing named the empty field.
 * `validation_capacity_dev_P22` (`…/1761849861521-createValidtionP22.ts:125-166`) is byte-identical,
 * which is why these fields are required for every portfolio and not behind an `isP25()` gate.
 */
describe('CapDevInfoComponent — mandatory fields mirror validation_capacity_dev_P25 (P2-3241)', () => {
  let fixture: ComponentFixture<CapDevInfoComponent>;
  let capDevResponse: any;
  let innerTextDescriptor: PropertyDescriptor | undefined;

  /** The count inputs, in the order the server lists them. */
  const COUNT_LABELS = ['Women', 'Men', 'Non-binary', 'Unknown'];

  const cardWithTitle = (title: string): HTMLElement => {
    const cards: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('app-field-card'));
    return cards.find(card => card.querySelector('.fch_title')?.textContent.trim() === title);
  };

  /** The radio group that offers the given option labels — matched by options, not by title. */
  const radioGroupWithOptions = (...optionLabels: string[]): HTMLElement => {
    const groups: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('app-pr-radio-button'));
    return groups.find(group => {
      const labels = Array.from(group.querySelectorAll('label.name')).map(label => label.textContent.trim());
      return optionLabels.every(expected => labels.includes(expected));
    });
  };

  const organizationsReporter = (): HTMLElement => fixture.nativeElement.querySelector('[appFeedbackValidation]');

  const renderWith = async (body: any) => {
    capDevResponse = body;
    fixture = TestBed.createComponent(CapDevInfoComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeAll(() => {
    // jsdom does not implement `innerText`, and `DataControlService` reads exactly that to decide
    // whether a mandatory input is empty. Without the shim every filled field reads as blank and
    // the completeness assertion below would pass for the wrong reason.
    innerTextDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerText');
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get(this: HTMLElement) {
        return this.textContent;
      },
      set(this: HTMLElement, value: string) {
        this.textContent = value;
      }
    });
  });

  afterAll(() => {
    if (innerTextDescriptor) Object.defineProperty(HTMLElement.prototype, 'innerText', innerTextDescriptor);
    else delete (HTMLElement.prototype as any).innerText;
  });

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
      imports: [HttpClientTestingModule, FormsModule, CustomFieldsModule, FeedbackValidationDirectiveModule],
      providers: [{ provide: ApiService, useValue: apiServiceMock }]
    }).compileComponents();

    TestBed.inject(RolesService).readOnly = false;
  });

  describe('the four trainee counts — `female_using` / `male_using` / `non_binary_using` / `has_unkown_using` IS NOT NULL', () => {
    it.each(COUNT_LABELS)('"%s" is mandatory and is reported when left empty', async label => {
      await renderWith({ capdev_term_id: null, institutions: [], is_attending_for_organization: null });

      const card = cardWithTitle(label);
      expect(card).toBeTruthy();
      expect(card.querySelector('.fch_required')).toBeTruthy();
      expect(card.querySelector('.pr-input').classList).toContain('mandatory');
    });

    it('accepts zero as an answer — the server rejects NULL, not 0', async () => {
      await renderWith({
        capdev_term_id: 3,
        capdev_delivery_method_id: 1,
        female_using: 0,
        male_using: 0,
        non_binary_using: 0,
        has_unkown_using: 12,
        institutions: [],
        is_attending_for_organization: false
      });

      const validation = cardWithTitle('Women').querySelector('.input-validation');
      expect(validation.textContent.trim()).toBe('0');
    });
  });

  it('"Length of training" is mandatory — `valid_text(rcd.capdev_term_id)`', async () => {
    await renderWith({ capdev_term_id: null, institutions: [], is_attending_for_organization: null });

    const field = cardWithTitle('Length of training').querySelector('.pr-field');
    expect(field.classList).toContain('mandatory');
    expect(field.classList).not.toContain('complete');
  });

  it('the long/short sub-question stays OPTIONAL — `validate_capdev_term_id()` falls back to the group above', async () => {
    await renderWith({ capdev_term_id: 4, institutions: [], is_attending_for_organization: null });

    const subGroup = radioGroupWithOptions('Long-term', 'Short-term');
    expect(subGroup).toBeTruthy();
    expect(subGroup.querySelector('.pr-field').classList).not.toContain('mandatory');
  });

  /**
   * P2-3385: the sub-question used to pass no `label`, which made `field-card`'s `isBare` getter true
   * and skipped the `field_card` class entirely — the options were drawn loose outside the container
   * that frames every sibling question. The label is the fix, so the label is what this asserts.
   */
  it('the sub-question renders INSIDE a field card, titled "Degree"', async () => {
    await renderWith({ capdev_term_id: 4, institutions: [], is_attending_for_organization: null });

    // `pr-radio-button` renders the card, so the card sits INSIDE the group, not around it.
    const card = cardWithTitle('Degree');
    expect(card).toBeTruthy();
    expect(card.closest('app-pr-radio-button')).toBe(radioGroupWithOptions('Long-term', 'Short-term'));
    // `.field_card` is the container `isBare` used to suppress — this is the assertion that fails
    // if the label is ever dropped again.
    expect(card.querySelector('.field_card')).toBeTruthy();
  });

  /**
   * The guard that matters: framing a control is presentation. If giving it a label ever flipped
   * `required`, `validation_capacity_dev_P25` would start demanding a value the parent group already
   * satisfies via `validate_capdev_term_id()`, and the section could never be completed.
   */
  it('framing the sub-question did NOT make it mandatory', async () => {
    await renderWith({ capdev_term_id: 4, institutions: [], is_attending_for_organization: null });

    const card = cardWithTitle('Degree');
    expect(card.querySelector('.fch_required')).toBeNull();
    expect(card.querySelector('.pr-field').classList).not.toContain('mandatory');
  });

  it('"Delivery Method" is mandatory — `valid_text(rcd.capdev_delivery_method_id)`', async () => {
    await renderWith({ capdev_term_id: null, institutions: [], is_attending_for_organization: null });

    const field = cardWithTitle('Delivery Method').querySelector('.pr-field');
    expect(field.classList).toContain('mandatory');
    expect(field.classList).not.toContain('complete');
  });

  it('the attendance question is mandatory — `rcd.is_attending_for_organization IS NOT NULL`', async () => {
    await renderWith({ capdev_term_id: null, institutions: [], is_attending_for_organization: null });

    const field = cardWithTitle('Were the trainees attending on behalf of an organization?').querySelector('.pr-field');
    expect(field.classList).toContain('mandatory');
    expect(field.classList).not.toContain('complete');
  });

  describe('organizations — the conditional branch `IF (is_attending_for_organization = TRUE)`', () => {
    it('is not demanded while the attendance question is unanswered', async () => {
      await renderWith({ capdev_term_id: 3, institutions: [], is_attending_for_organization: null });

      expect(fixture.nativeElement.querySelector('app-pr-multi-select')).toBeNull();
      expect(organizationsReporter()).toBeNull();
    });

    it('is not demanded when the trainees did NOT attend on behalf of an organization', async () => {
      await renderWith({ capdev_term_id: 3, institutions: [], is_attending_for_organization: 0 });

      expect(fixture.nativeElement.querySelector('app-pr-multi-select')).toBeNull();
      expect(organizationsReporter()).toBeNull();
    });

    it('is demanded, and reported as still missing, once the answer is "Yes" and no organization is picked', async () => {
      await renderWith({ capdev_term_id: 3, institutions: [], is_attending_for_organization: 1 });

      const reporter = organizationsReporter();
      expect(reporter).toBeTruthy();
      expect(reporter.querySelector('.pr_label').textContent.trim()).toBe('Select organizations');
      const field = reporter.querySelector('.pr-field');
      expect(field.classList).toContain('mandatory');
      expect(field.classList).not.toContain('complete');
    });

    it('is satisfied as soon as one organization is selected', async () => {
      await renderWith({ capdev_term_id: 3, institutions: [{ institutions_id: 42 }], is_attending_for_organization: 1 });

      expect(organizationsReporter().querySelector('.pr-field').classList).toContain('complete');
    });
  });

  describe('the section as a whole, read the way the bottom bar reads it', () => {
    /** Same scan `ResultDetailComponent.ngDoCheck` runs; the bar renders `fieldFeedbackList()`. */
    const scan = () => {
      const dataControl = TestBed.inject(DataControlService);
      const incomplete = dataControl.someMandatoryFieldIncompleteResultDetail('.detail_container');
      return { incomplete, missing: dataControl.fieldFeedbackList() };
    };

    it('names every field the server will reject when the form is untouched', async () => {
      await renderWith({ capdev_term_id: null, institutions: [], is_attending_for_organization: null });

      const { incomplete, missing } = scan();
      expect(incomplete).toBe(true);
      expect(missing).toEqual(
        expect.arrayContaining([
          'Women',
          'Men',
          'Non-binary',
          'Unknown',
          'Length of training',
          'Delivery Method',
          'Were the trainees attending on behalf of an organization?'
        ])
      );
    });

    it('reports nothing missing once the seven server-side conditions are met (attendance = No)', async () => {
      await renderWith({
        capdev_term_id: 3,
        capdev_delivery_method_id: 1,
        female_using: 4,
        male_using: 6,
        non_binary_using: 0,
        has_unkown_using: 0,
        institutions: [],
        is_attending_for_organization: 0
      });

      const { incomplete, missing } = scan();
      expect(missing).toEqual([]);
      expect(incomplete).toBe(false);
    });

    it('still blocks on the organization list when attendance = Yes and nothing is picked', async () => {
      await renderWith({
        capdev_term_id: 3,
        capdev_delivery_method_id: 1,
        female_using: 4,
        male_using: 6,
        non_binary_using: 0,
        has_unkown_using: 0,
        institutions: [],
        is_attending_for_organization: 1
      });

      const { incomplete, missing } = scan();
      expect(incomplete).toBe(true);
      expect(missing).toEqual(['Select organizations']);
    });

    it('reports nothing missing when attendance = Yes and an organization is picked', async () => {
      await renderWith({
        capdev_term_id: 3,
        capdev_delivery_method_id: 1,
        female_using: 4,
        male_using: 6,
        non_binary_using: 0,
        has_unkown_using: 0,
        institutions: [{ institutions_id: 42, full_name: 'Alpha Center' }],
        is_attending_for_organization: 1
      });

      const { incomplete, missing } = scan();
      expect(missing).toEqual([]);
      expect(incomplete).toBe(false);
    });
  });
});

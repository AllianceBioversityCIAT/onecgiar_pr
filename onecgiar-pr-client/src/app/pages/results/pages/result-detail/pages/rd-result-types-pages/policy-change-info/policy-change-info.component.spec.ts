import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PolicyChangeInfoComponent } from './policy-change-info.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrMultiSelectComponent } from '../../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { PrFieldHeaderComponent } from '../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrSelectComponent } from '../../../../../../../custom-fields/pr-select/pr-select.component';
import { AlertStatusComponent } from '../../../../../../../custom-fields/alert-status/alert-status.component';
import { SaveButtonComponent } from '../../../../../../../custom-fields/save-button/save-button.component';
import { DetailSectionTitleComponent } from '../../../../../../../custom-fields/detail-section-title/detail-section-title.component';
import { LabelNamePipe } from '../../../../../../../custom-fields/pr-select/label-name.pipe';
import { SectionSkeletonDirective } from '../../../../../../../custom-fields/section-skeleton/section-skeleton.directive';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { signal } from '@angular/core';

describe('PolicyChangeInfoComponent', () => {
  let component: PolicyChangeInfoComponent;
  let fixture: ComponentFixture<PolicyChangeInfoComponent>;
  let mockApiService: any;
  const mockPolicyChangeQuestions = {
    optionsWithAnswers: [
      {
        answer_boolean: true,
        result_question_id: 'id'
      }
    ]
  };

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_policyChanges: () => of({ response: [] }),
        GET_policyChangesQuestions: () => of({ response: mockPolicyChangeQuestions }),
        PATCH_policyChanges: () => of({ response: [] }),
        GET_clarisaPolicyTypes: () => of({ response: [] }),
        GET_clarisaPolicyStages: () => of({ response: [] }),
        GET_allInstitutions: () => of({ response: [] }),
        GET_allInstitutionTypes: () => of({ response: [] }),
        GET_allChildlessInstitutionTypes: () => of({ response: [] })
      },
      dataControlSE: {
        currentResultSectionName: signal<string>('Policy change information'),
        currentResultSignal: signal<any>({}),
        reportingCurrentPhase: { phaseName: null, phaseYear: null, phaseId: null, portfolioAcronym: null, portfolioId: null },
        findClassTenSeconds: () => {
          return Promise.resolve();
        },
        showPartnersRequest: false
      }
    };

    await TestBed.configureTestingModule({
      declarations: [
        PolicyChangeInfoComponent,
        PrMultiSelectComponent,
        PrFieldHeaderComponent,
        PrSelectComponent,
        AlertStatusComponent,
        SaveButtonComponent,
        DetailSectionTitleComponent,
        LabelNamePipe,
        SectionSkeletonDirective
      ],
      imports: [HttpClientTestingModule, FormsModule],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PolicyChangeInfoComponent);
    component = fixture.componentInstance;
  });

  describe('sectionLoading (skeleton)', () => {
    it('is released once the section GET responds', () => {
      component.sectionLoading.set(true);

      component.getSectionInformation();

      expect(component.sectionLoading()).toBe(false);
    });

    it('is released when the section GET fails, so the skeleton can never get stuck', () => {
      component.sectionLoading.set(true);
      jest.spyOn(mockApiService.resultsSE, 'GET_policyChanges').mockReturnValue(throwError(() => new Error('boom')));

      component.getSectionInformation();

      expect(component.sectionLoading()).toBe(false);
    });
  });

  describe('changeAnswerBoolean()', () => {
    it('should set answer_boolean to true for the selected value', () => {
      const valueToSelect = 'someValue';
      component.policyChangeQuestions.optionsWithAnswers = [
        {
          result_question_id: 'someValue',
          answer_boolean: undefined,
          answer_text: '',
          disabled: false,
          parent_question_id: '',
          question_description: null,
          question_level: '',
          question_text: '',
          question_type_id: '',
          result_type_id: 1,
          selected: false
        }
      ];

      component.changeAnswerBoolean(valueToSelect);

      expect(component.policyChangeQuestions.optionsWithAnswers[0].answer_boolean).toBeTruthy();
    });

    it('should set answer_boolean to null for non-selected values', () => {
      const valueToSelect = 'someValue';
      component.policyChangeQuestions.optionsWithAnswers = [
        {
          result_question_id: '',
          answer_boolean: undefined,
          answer_text: '',
          disabled: false,
          parent_question_id: '',
          question_description: null,
          question_level: '',
          question_text: '',
          question_type_id: '',
          result_type_id: 1,
          selected: false
        }
      ];

      component.changeAnswerBoolean(valueToSelect);

      expect(component.policyChangeQuestions.optionsWithAnswers[0].answer_boolean).toBeNull();
    });
  });

  describe('getSectionInformation()', () => {
    it('should get section information successfully', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_policyChanges');

      component.getSectionInformation();

      expect(spy).toHaveBeenCalled();
      expect(component.innovationUseInfoBody).toEqual([]);
    });
  });

  describe('getPolicyChangesQuestions()', () => {
    it('should fetch policy change questions and set relatedTo', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_policyChangesQuestions');

      component.getPolicyChangesQuestions();

      expect(spy).toHaveBeenCalled();
      expect(component.policyChangeQuestions).toEqual(mockPolicyChangeQuestions);
      expect(component.relatedTo).toEqual(mockPolicyChangeQuestions.optionsWithAnswers[0].result_question_id);
    });
  });

  describe('policyTypeDescriptions() — P2-3261 phase gate (epic P2-3243)', () => {
    const GUIDANCE_2026_SENTENCE = 'Policies are written and formally approved decisions on, or commitments to, a particular course of action';
    const LEGACY_SENTENCE = 'This could also be observed as information campaigns';
    const LEGAL_INSTRUMENT_SENTENCE = 'Legal instruments include laws, which are defined as Bills passed into law';

    /**
     * Reads what the section actually PAINTS, not what the method returns.
     * The client runs zoneless change detection: a test that only asserts on the returned string
     * passes even when the grey box never re-renders. The guidance is the `app-alert-status`
     * whose `[innerHTML]` carries the "Policy type guidance" heading.
     */
    const renderedGuidance = (): string => {
      fixture.detectChanges();
      const boxes = Array.from(fixture.nativeElement.querySelectorAll('.alert_text')) as HTMLElement[];
      const guidance = boxes.find(box => box.textContent?.includes('Policy type guidance'));
      return guidance?.innerHTML ?? '';
    };

    const openResultOfPhase = (phaseYear: unknown) => {
      mockApiService.dataControlSE.currentResultSignal.set({ result_type_id: 1, phase_year: phaseYear });
    };

    it('paints the 2026 wording on a result of the 2026 reporting phase', () => {
      openResultOfPhase(2026);

      const painted = renderedGuidance();

      expect(painted).toContain(GUIDANCE_2026_SENTENCE);
      expect(painted).not.toContain(LEGACY_SENTENCE);
    });

    it('paints the 2026 wording on any later phase', () => {
      openResultOfPhase(2027);

      expect(renderedGuidance()).toContain(GUIDANCE_2026_SENTENCE);
    });

    it('keeps the pre-P2-3261 wording on a result of the 2025 phase, which shares the P25 portfolio', () => {
      openResultOfPhase(2025);

      const painted = renderedGuidance();

      expect(painted).toContain(LEGACY_SENTENCE);
      expect(painted).not.toContain(GUIDANCE_2026_SENTENCE);
    });

    it('keeps the pre-P2-3261 wording on the closed P22 phases', () => {
      openResultOfPhase(2024);

      expect(renderedGuidance()).toContain(LEGACY_SENTENCE);
    });

    it('treats a phase year arriving as a string as a bad payload and falls back to the legacy wording', () => {
      openResultOfPhase('2026');

      expect(renderedGuidance()).toContain(LEGACY_SENTENCE);
    });

    it('falls back to the open reporting phase when the result carries no phase year', () => {
      mockApiService.dataControlSE.currentResultSignal.set({ result_type_id: 1 });
      mockApiService.dataControlSE.reportingCurrentPhase.phaseYear = 2026;

      expect(renderedGuidance()).toContain(GUIDANCE_2026_SENTENCE);
    });

    it('leaves the "Legal instrument" definition identical in both phases — P2-3261 never touched it', () => {
      openResultOfPhase(2026);
      expect(renderedGuidance()).toContain(LEGAL_INSTRUMENT_SENTENCE);

      openResultOfPhase(2025);
      expect(renderedGuidance()).toContain(LEGAL_INSTRUMENT_SENTENCE);
    });
  });

  describe('onSaveSection()', () => {
    it('should save section successfully', () => {
      const spyPATCH_policyChanges = jest.spyOn(mockApiService.resultsSE, 'PATCH_policyChanges');
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');

      component.onSaveSection();

      expect(spyPATCH_policyChanges).toHaveBeenCalled();
      expect(spyGetSectionInformation).toHaveBeenCalled();
    });
  });

  describe('clearAmountWhenNotApplicable() — P2-3371 AC05', () => {
    it('keeps the USD amount and its status while the policy type is "Program, budget or investment"', () => {
      component.innovationUseInfoBody.policy_type_id = 1;
      component.innovationUseInfoBody.amount = 250000;
      component.innovationUseInfoBody.status_amount = 1;

      component.clearAmountWhenNotApplicable();

      expect(component.innovationUseInfoBody.amount).toBe(250000);
      expect(component.innovationUseInfoBody.status_amount).toBe(1);
    });

    it('drops the USD amount and its status as soon as another policy type is chosen', () => {
      component.innovationUseInfoBody.policy_type_id = 2;
      component.innovationUseInfoBody.amount = 250000;
      component.innovationUseInfoBody.status_amount = 1;

      component.clearAmountWhenNotApplicable();

      expect(component.innovationUseInfoBody.amount).toBeNull();
      expect(component.innovationUseInfoBody.status_amount).toBeNull();
    });

    it('does not send an amount that the form no longer shows (the two fields are hidden for policy types other than 1)', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_policyChanges');
      component.innovationUseInfoBody.policy_type_id = 3;
      component.innovationUseInfoBody.amount = 250000;
      component.innovationUseInfoBody.status_amount = 2;

      component.onSaveSection();

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ amount: null, status_amount: null }));
    });

    it('still sends the amount when the policy type does show the field', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_policyChanges');
      component.innovationUseInfoBody.policy_type_id = 1;
      component.innovationUseInfoBody.amount = 250000;
      component.innovationUseInfoBody.status_amount = 1;

      component.onSaveSection();

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ amount: 250000, status_amount: 1 }));
    });
  });

  describe('ngOnInit()', () => {
    it('should get section information on initialization', async () => {
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');
      const spyGetPolicyChangesQuestions = jest.spyOn(component, 'getPolicyChangesQuestions');
      const spyFindClassTenSeconds = jest.spyOn(mockApiService.dataControlSE, 'findClassTenSeconds');
      const parser = new DOMParser();
      const dom = parser.parseFromString(
        `
        <div class="alert-event"></div>`,
        'text/html'
      );
      jest.spyOn(document, 'querySelector').mockImplementation(selector => dom.querySelector(selector));

      await component.ngOnInit();

      const alertDiv = dom.querySelector('.alert-event');
      if (alertDiv) {
        const clickEvent = new MouseEvent('click');
        alertDiv.dispatchEvent(clickEvent);
        expect(component.api.dataControlSE.showPartnersRequest).toBeTruthy();
      }
      expect(spyGetSectionInformation).toHaveBeenCalled();
      expect(spyGetPolicyChangesQuestions).toHaveBeenCalled();
      expect(spyFindClassTenSeconds).toHaveBeenCalled();
    });
  });

});

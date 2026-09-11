import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
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
import { of, throwError, delay, NEVER } from 'rxjs';
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

  // `UCA-T-11`: `ngOnInit()`'s test below stubs `document.querySelector` globally and never
  // restored it, so every test declared AFTER it in this file inherited the stub and failed to
  // locate its own `TestBed.createComponent()` root element (`NG05104`) — a pre-existing test
  // isolation gap this task's new `CanComponentDeactivate` suite (appended after `ngOnInit()`)
  // surfaced. Restoring after every test fixes it without touching that test's own assertions.
  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * P2-3667 — "Policy type" showed a grey line reading "Select policy type" right under its label,
   * above the control, and it never changed. It was not a broken binding: it was the field's
   * DESCRIPTION repeating the placeholder word for word, so it read as an unanswered required field
   * sitting next to the answer. QA reported it on result 9154.
   */
  describe('no description repeats its own placeholder (P2-3667)', () => {
    it('leaves Policy type, Status and Stage with no placeholder-shaped description', () => {
      fixture.detectChanges();

      const selects = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('app-pr-select'));
      const offenders = selects
        .map(el => ({
          label: (el.querySelector('.pr_label')?.textContent || '').trim().replace(/[:*]/g, '').trim(),
          description: (el.querySelector('.pr_description')?.textContent || '').trim()
        }))
        .filter(f => /^select\s/i.test(f.description));

      expect(offenders).toEqual([]);
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

    /**
     * P2-3558 — this used to assert the 2026 sentence, i.e. it was describing the defect. With no
     * `phase_year` on the result the gate read `reportingCurrentPhase.phaseYear`, the OPEN
     * reporting phase (2026 in production), so a legacy result got the 2026 guidance. Confirmed on
     * screen before the fix: result 8501 (phase 2025, internal id 10969) served with
     * `phase_year: null` painted the 2026 wording, while the already-fixed sibling
     * `innovation-dev-info` fell to its legacy form on the same intercepted payload.
     *
     * Tenth and last site of the pattern; the eight `FieldsManagerService` gates were fixed in
     * `8afb574f3` and `innovation-use-form` in `6efe11cba`.
     *
     * ⚠️ This assertion reads the RENDERED grey box (`renderedGuidance()`), not the return
     * value of the private method — zoneless change detection means a property-level assert would
     * pass with the defect in place.
     */
    it('ignores the open reporting phase when the result carries no phase year — unknown means legacy', () => {
      mockApiService.dataControlSE.currentResultSignal.set({ result_type_id: 1 });
      mockApiService.dataControlSE.reportingCurrentPhase.phaseYear = 2026;

      const painted = renderedGuidance();

      expect(painted).toContain(LEGACY_SENTENCE);
      expect(painted).not.toContain(GUIDANCE_2026_SENTENCE);
    });

    // The permanent variant of the same window: a non-404 `GET_resultById` failure leaves
    // `currentResultSignal` at `{}` for good (`current-result.service.ts:65-69`), form on screen.
    it('paints the legacy wording while the result is still an empty object, with the 2026 phase open', () => {
      mockApiService.dataControlSE.currentResultSignal.set({});
      mockApiService.dataControlSE.reportingCurrentPhase.phaseYear = 2026;

      const painted = renderedGuidance();

      expect(painted).toContain(LEGACY_SENTENCE);
      expect(painted).not.toContain(GUIDANCE_2026_SENTENCE);
    });

    // Locks (P2-3558): the result's OWN year still decides, in both directions, with the open
    // phase at 2026 exactly as production carries it (`data-control.service.ts:125`).
    it('still paints the legacy wording for a 2025-phase result while the 2026 phase is open', () => {
      mockApiService.dataControlSE.reportingCurrentPhase.phaseYear = 2026;
      openResultOfPhase(2025);

      const painted = renderedGuidance();

      expect(painted).toContain(LEGACY_SENTENCE);
      expect(painted).not.toContain(GUIDANCE_2026_SENTENCE);
    });

    it('still paints the 2026 wording for a 2026-phase result while the 2026 phase is open', () => {
      mockApiService.dataControlSE.reportingCurrentPhase.phaseYear = 2026;
      openResultOfPhase(2026);

      const painted = renderedGuidance();

      expect(painted).toContain(GUIDANCE_2026_SENTENCE);
      expect(painted).not.toContain(LEGACY_SENTENCE);
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

  describe('CanComponentDeactivate (UCA-T-11)', () => {
    /**
     * A realistic loaded fixture — distinct from the class defaults so a snapshot taken against
     * the WRONG (pre-load or partially-loaded) value would provably diverge from this one.
     */
    const loadedBody = {
      policy_stage_id: 3,
      policy_type_id: 2,
      amount: null,
      status_amount: null,
      actors_influenced: null,
      institutions: [{ institutions_id: 42 }],
      result_related_engagement: null
    };
    const loadedQuestions = {
      optionsWithAnswers: [{ result_question_id: '50', answer_boolean: true }],
      parent_question_id: null,
      question_description: null,
      question_level: 'l1',
      question_text: 'Is this result related to:',
      question_type_id: 'q1',
      result_question_id: '50',
      result_type_id: 1
    };

    it('is false before any load resolves', () => {
      expect(component.hasUnsavedChanges()).toBe(false);
    });

    /**
     * `UCA-T-11`'s load flow is TWO independent top-level GETs with no guaranteed order
     * (`getSectionInformation()`/`GET_policyChanges` and `getPolicyChangesQuestions()`/
     * `GET_policyChangesQuestions`), each writing a different half of the tracked composite.
     * Genuinely async (`delay(0)` under `fakeAsync`/`tick()`), not a synchronous `of(...)` — a
     * synchronous mock would collapse the real race this test exists to prove is handled. Fires
     * both orders in the same test: the questions GET resolves before the policy-changes GET here.
     */
    it('stays clean once BOTH independent load GETs settle, in either order', fakeAsync(() => {
      jest.spyOn(mockApiService.resultsSE, 'GET_policyChangesQuestions').mockReturnValue(of({ response: loadedQuestions }).pipe(delay(5)));
      jest.spyOn(mockApiService.resultsSE, 'GET_policyChanges').mockReturnValue(of({ response: loadedBody }).pipe(delay(10)));

      component.getSectionInformation();
      component.getPolicyChangesQuestions();
      tick(10);

      expect(component.hasUnsavedChanges()).toBe(false);
    }));

    it('stays clean once BOTH independent load GETs settle, in the opposite order', fakeAsync(() => {
      jest.spyOn(mockApiService.resultsSE, 'GET_policyChanges').mockReturnValue(of({ response: loadedBody }).pipe(delay(5)));
      jest.spyOn(mockApiService.resultsSE, 'GET_policyChangesQuestions').mockReturnValue(of({ response: loadedQuestions }).pipe(delay(10)));

      component.getSectionInformation();
      component.getPolicyChangesQuestions();
      tick(10);

      expect(component.hasUnsavedChanges()).toBe(false);
    }));

    /**
     * The regression case: `sectionLoading` (the skeleton) is released by `GET_policyChanges`
     * alone, so the form is interactive as soon as it lands — even if `GET_policyChangesQuestions`
     * (slower here) hasn't resolved yet. An edit made in that exact gap must NOT be silently
     * erased when the second GET finally resolves and the composite snapshot is completed.
     *
     * Falsifying input: an implementation that snapshots by re-reading the LIVE
     * `innovationUseInfoBody` at the moment the SECOND GET resolves (instead of the FROZEN
     * baseline recorded when the first GET itself resolved) would capture the user's edit as if
     * it were the clean starting value — `hasUnsavedChanges()` would wrongly read `false` here,
     * silently losing the edit on the next Back/Next silent save.
     */
    it('does not erase a user edit made while the SECOND load GET is still in flight', fakeAsync(() => {
      jest.spyOn(mockApiService.resultsSE, 'GET_policyChanges').mockReturnValue(of({ response: loadedBody }).pipe(delay(5)));
      jest.spyOn(mockApiService.resultsSE, 'GET_policyChangesQuestions').mockReturnValue(of({ response: loadedQuestions }).pipe(delay(10)));

      component.getSectionInformation();
      component.getPolicyChangesQuestions();
      tick(5);
      // Only GET_policyChanges has resolved; GET_policyChangesQuestions is still in flight.
      component.innovationUseInfoBody.policy_stage_id = 99;
      tick(5);
      // GET_policyChangesQuestions has now resolved too, completing the composite baseline.

      expect(component.hasUnsavedChanges()).toBe(true);
    }));

    it('reports dirty after editing a bound field post-load', fakeAsync(() => {
      jest.spyOn(mockApiService.resultsSE, 'GET_policyChanges').mockReturnValue(of({ response: loadedBody }).pipe(delay(0)));
      jest.spyOn(mockApiService.resultsSE, 'GET_policyChangesQuestions').mockReturnValue(of({ response: loadedQuestions }).pipe(delay(0)));

      component.getSectionInformation();
      component.getPolicyChangesQuestions();
      tick(0);
      expect(component.hasUnsavedChanges()).toBe(false);

      component.innovationUseInfoBody.policy_stage_id = 7;

      expect(component.hasUnsavedChanges()).toBe(true);
    }));

    it('reports dirty after an edit to policyChangeQuestions (the "related to" answer), not just innovationUseInfoBody', fakeAsync(() => {
      jest.spyOn(mockApiService.resultsSE, 'GET_policyChanges').mockReturnValue(of({ response: loadedBody }).pipe(delay(0)));
      jest.spyOn(mockApiService.resultsSE, 'GET_policyChangesQuestions').mockReturnValue(of({ response: loadedQuestions }).pipe(delay(0)));

      component.getSectionInformation();
      component.getPolicyChangesQuestions();
      tick(0);
      expect(component.hasUnsavedChanges()).toBe(false);

      component.changeAnswerBoolean('some-other-question-id');

      expect(component.hasUnsavedChanges()).toBe(true);
    }));

    it('saveSection() resolves false (not throws) on a failing PATCH_policyChanges', () => {
      jest.spyOn(mockApiService.resultsSE, 'PATCH_policyChanges').mockReturnValue(throwError(() => new Error('boom')));

      let result: boolean | undefined;
      component.saveSection().subscribe(value => (result = value));

      expect(result).toBe(false);
    });

    /**
     * `UCA-T-11` (per the `UCA-T-6` rework lesson) — `saveSection()` must snapshot DIRECTLY on
     * PATCH success, not solely via the delegated `getSectionInformation()` reload. Forces the
     * reload's own GET to never resolve (`NEVER`), so the ONLY thing that can make
     * `hasUnsavedChanges()` read clean right after `saveSection()` emits is the direct snapshot in
     * `performSave()`'s `tap` — isolating this from the reload's own re-snapshot.
     */
    it('saveSection() snapshots directly on success, before the delegated reload resolves', () => {
      // Establish a REAL clean baseline first — without one, `hasUnsavedChanges()` reads `false`
      // trivially ("no snapshot yet"), which would make this test pass even without the direct
      // snapshot fix (vacuous). The default suite-wide mock resolves `GET_policyChanges` to an
      // ARRAY (`response: []`) — a plain object property assigned onto an array is invisible to
      // `JSON.stringify`, so the dirty diff below would never see the edit either. Use a plain
      // object response instead. `GET_policyChanges` is later re-mocked to `NEVER` for the save
      // itself, so this initial (synchronous) load must complete before that re-mock is installed.
      jest.spyOn(mockApiService.resultsSE, 'GET_policyChanges').mockReturnValue(of({ response: loadedBody }));
      component.getSectionInformation();
      component.getPolicyChangesQuestions();
      expect(component.hasUnsavedChanges()).toBe(false);

      component.innovationUseInfoBody.policy_stage_id = 9;
      expect(component.hasUnsavedChanges()).toBe(true);

      jest.spyOn(mockApiService.resultsSE, 'PATCH_policyChanges').mockReturnValue(of({ response: [] }));
      jest.spyOn(mockApiService.resultsSE, 'GET_policyChanges').mockReturnValue(NEVER);

      let result: boolean | undefined;
      component.saveSection().subscribe(value => (result = value));

      expect(result).toBe(true);
      expect(component.hasUnsavedChanges()).toBe(false);
    });
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError, Subject } from 'rxjs';
import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { TypePolicyChangeComponent } from './type-policy-change.component';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../../services/bilateral-auto-save.service';
import { BilateralExpandableStateService } from '../../../services/bilateral-expandable-state.service';
import { PolicyControlListService } from '../../../../../shared/services/global/policy-control-list.service';
import { InstitutionsService } from '../../../../../shared/services/global/institutions.service';

describe('TypePolicyChangeComponent', () => {
  let fixture: ComponentFixture<TypePolicyChangeComponent>;
  let component: TypePolicyChangeComponent;
  let bilateralApi: any;
  let creation: any;
  let mdsTracker: any;
  let autoSave: any;
  let expandableState: any;
  let policyControlList: any;
  let institutionsService: any;

  const QUESTIONS_RESPONSE = {
    question_text: 'Is this policy related to a CGIAR initiative?',
    optionsWithAnswers: [
      { result_question_id: 1, question_text: 'Yes', answer_boolean: null },
      { result_question_id: 2, question_text: 'No', answer_boolean: true },
    ],
  };

  /**
   * P2-3556 — `build()` now RUNS the first change detection, so `ngOnInit` fires and the default
   * `GET_policyChanges` mock (which resolves synchronously) leaves the component `loaded`. Every
   * save is now gated on that flag, so a component that was never initialized can no longer save
   * anything — which is the point of the fix, and would otherwise silently neuter every save
   * assertion in this file (they would pass because nothing ever loaded, not because saving works).
   */
  const build = () => {
    fixture = TestBed.createComponent(TypePolicyChangeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return component;
  };

  const makeMocks = () => {
    mdsTracker = { setSectionFields: jest.fn() };
    autoSave = {
      fieldStatus: signal<Record<string, string>>({}),
      schedulePayload: jest.fn(),
    };
    creation = { currentResultId: signal<number | null>(123) };
    expandableState = {
      getShowAllFields: jest.fn().mockReturnValue(false),
      setShowAllFields: jest.fn(),
    };
    policyControlList = {
      policyTypesList: [{ id: 1, name: 'Policy or strategy' }],
      policyStages: [{ id: 2, full_name: 'Design' }],
    };
    institutionsService = { institutionsList: [{ institutions_id: 1, institutions_name: 'Org A' }] };
    bilateralApi = {
      GET_policyChanges: jest.fn().mockReturnValue(of({ response: {} })),
      GET_policyChangesQuestions: jest.fn().mockReturnValue(of({ response: { ...QUESTIONS_RESPONSE } })),
      PATCH_policyChanges: jest.fn().mockReturnValue(of({})),
    };
  };

  const configure = () =>
    TestBed.configureTestingModule({
      imports: [TypePolicyChangeComponent],
      providers: [
        { provide: BilateralApiService, useValue: bilateralApi },
        { provide: BilateralCreationService, useValue: creation },
        { provide: BilateralMdsTrackerService, useValue: mdsTracker },
        { provide: BilateralAutoSaveService, useValue: autoSave },
        { provide: BilateralExpandableStateService, useValue: expandableState },
        { provide: PolicyControlListService, useValue: policyControlList },
        { provide: InstitutionsService, useValue: institutionsService },
      ],
    });

  beforeEach(async () => {
    makeMocks();
    await configure().overrideTemplate(TypePolicyChangeComponent, '<div></div>').compileComponents();
  });

  it('should create', () => {
    expect(build()).toBeTruthy();
  });

  describe('loadData', () => {
    it('loads the body and derives the selected related-to answer from the questions response', () => {
      build();
      fixture.detectChanges();
      expect(component.questions.question_text).toBe(QUESTIONS_RESPONSE.question_text);
      expect(component.relatedTo).toBe(2);
    });

    it('leaves relatedTo null when no option is answered yet', () => {
      bilateralApi.GET_policyChangesQuestions.mockReturnValue(
        of({
          response: {
            question_text: 'Q',
            optionsWithAnswers: [{ result_question_id: 1, question_text: 'Yes', answer_boolean: null }],
          },
        }),
      );
      build();
      fixture.detectChanges();
      expect(component.relatedTo).toBeNull();
    });

    it('restores the show-all-fields toggle from the expandable state service', () => {
      expandableState.getShowAllFields.mockReturnValue(true);
      build();
      fixture.detectChanges();
      expect(expandableState.getShowAllFields).toHaveBeenCalledWith(123, 'type-specific');
      expect(component.showAllFields()).toBe(true);
    });

    it('falls back to resultId 0 when there is no current result yet', () => {
      creation.currentResultId.set(null);
      build();
      fixture.detectChanges();
      expect(expandableState.getShowAllFields).toHaveBeenCalledWith(0, 'type-specific');
    });

    it('does nothing when there is no current result id', () => {
      creation.currentResultId.set(null);
      build();
      fixture.detectChanges();
      expect(bilateralApi.GET_policyChanges).not.toHaveBeenCalled();
    });

    it('falls back to empty defaults when the responses are empty', () => {
      bilateralApi.GET_policyChanges.mockReturnValue(of({ response: null }));
      bilateralApi.GET_policyChangesQuestions.mockReturnValue(of({ response: null }));
      build();
      fixture.detectChanges();
      expect(component.body).toEqual({});
      expect(component.questions).toEqual({});
      expect(component.relatedTo).toBeNull();
    });

    it('marks the section as loaded once the body is in hand', () => {
      build();
      expect(component.loaded()).toBe(true);
    });

    /**
     * P2-3556 — the data-loss chain, cut at its root.
     *
     * `loadData()` had no error handler at all. The interceptor rethrows every failed response
     * (`shared/interceptors/general-interceptor.service.ts:81-83`), so `next` never ran, `body`
     * stayed the `{}` it was constructed with, and the form painted blank with no warning. The
     * first keystroke then autosaved a payload built from that `{}`, and the server reads it as a
     * deletion, not as "nothing to say":
     *
     * - `institutions` absent (or `[]`) falls into the `else` branch of `savePolicyChanges`
     *   (`api/results/summary/summary.service.ts:1021`, `:1048-1054`) which calls
     *   `updateGenericIstitutions(resultId, [], 4, ...)` — and that runs `upDateAllInactiveRBI`,
     *   `set is_active = 0 ... where result_id = ? and institution_roles_id = ?`
     *   (`results_by_institutions/result_by_intitutions.repository.ts:606-650`). Every stored
     *   implementing organization is de-activated.
     * - `amount` absent becomes `amount || null` (`summary.service.ts:996`), so the stored USD
     *   figure is nulled.
     *
     * These assert on the ABSENCE of a request, which is the only thing that separates the fix from
     * the defect: the old code reached `schedulePayload` on every one of these paths.
     */
    describe('when the GET fails (P2-3556)', () => {
      const failLoad = (status = 500) =>
        bilateralApi.GET_policyChanges.mockReturnValue(
          throwError(() => new HttpErrorResponse({ status, statusText: 'Internal Server Error' })),
        );

      it('leaves the section not loaded, with an empty body', () => {
        failLoad();
        build();
        expect(component.loaded()).toBe(false);
        expect(component.body).toEqual({});
      });

      it('sends NOTHING when the person types on a form that never loaded', () => {
        failLoad();
        build();
        autoSave.schedulePayload.mockClear();

        component.body.policy_type_id = 1;
        component.onFieldChange();

        expect(autoSave.schedulePayload).not.toHaveBeenCalled();
      });

      it('sends nothing when the person presses Save either', () => {
        failLoad();
        build();
        autoSave.schedulePayload.mockClear();
        component.onSave();
        expect(autoSave.schedulePayload).not.toHaveBeenCalled();
      });

      it('sends nothing from onRelatedToChange, the third write path', () => {
        failLoad();
        build();
        autoSave.schedulePayload.mockClear();
        component.onRelatedToChange(1);
        expect(autoSave.schedulePayload).not.toHaveBeenCalled();
      });

      // Same reason as the sibling sections (P2-3355): publishing no checklist at all leaves the
      // section at "0/0 fields", which reads as "nothing required here" instead of as incomplete.
      it('still publishes the three unfilled MDS items, so the section stays honestly incomplete', () => {
        failLoad();
        bilateralApi.GET_policyChangesQuestions.mockReturnValue(throwError(() => new Error('down too')));
        build();
        const fields = mdsTracker.setSectionFields.mock.calls.at(-1)[1];
        expect(fields.map((f: any) => f.key)).toEqual(['policy-type', 'policy-stage', 'policy-institutions']);
        expect(fields.every((f: any) => f.filled === false)).toBe(true);
      });

      /**
       * 🛑 The one place this section is NOT the same as its siblings.
       *
       * `getPolicyChanges` throws `{ status: 404 }` whenever the result has no
       * `results_policy_changes` row yet (`summary.service.ts:1104-1110`) and the controller's
       * `ResponseInterceptor` turns that field into the real HTTP status
       * (`shared/Interceptors/Return-data.interceptor.ts:46`). Measured on prtest 2-Sep-2026:
       * `GET summary/policy-changes/get/result/999999` -> `404 {"response":{},"message":"Results
       * Innovations Dev not found"}`. So 404 is the ORDINARY answer for every brand-new policy
       * change, and an empty body is then the truth rather than a failure. Treating it as a failed
       * load would leave the Save button disabled forever on a result nobody has filled in yet —
       * i.e. it would make the section impossible to complete.
       */
      it('treats a 404 as an empty record, not as a failure — a brand-new result must still save', () => {
        failLoad(404);
        build();
        expect(component.loaded()).toBe(true);
        expect(component.body).toEqual({});

        autoSave.schedulePayload.mockClear();
        component.body.policy_type_id = 1;
        component.onFieldChange();
        expect(autoSave.schedulePayload).toHaveBeenCalledTimes(1);
      });
    });

    /**
     * P2-3556, the secondary window: the GET takes 180-280 ms on prtest against an 800 ms autosave
     * debounce, so an edit could reach the PATCH before the body ever arrived — and a payload built
     * from `{}` deletes the organizations exactly as a failed load does. `null` therefore blocks too.
     */
    describe('while the GET is still in flight (P2-3556)', () => {
      it('sends nothing before the body arrives, and saves normally afterwards', () => {
        const inFlight = new Subject<any>();
        bilateralApi.GET_policyChanges.mockReturnValue(inFlight.asObservable());
        build();

        expect(component.loaded()).toBeNull();
        component.body.policy_type_id = 1;
        component.onFieldChange();
        expect(autoSave.schedulePayload).not.toHaveBeenCalled();

        inFlight.next({ response: { policy_type_id: 2, institutions: [{ institutions_id: 7 }] } });
        expect(component.loaded()).toBe(true);

        component.onFieldChange();
        expect(autoSave.schedulePayload).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('onRelatedToChange', () => {
    it('marks only the chosen option as answered and clears the rest', () => {
      build();
      fixture.detectChanges();
      component.onRelatedToChange(1);
      expect(component.questions.optionsWithAnswers).toEqual([
        { result_question_id: 1, question_text: 'Yes', answer_boolean: true },
        { result_question_id: 2, question_text: 'No', answer_boolean: null },
      ]);
    });

    it('updates the MDS tracker and queues a save', () => {
      build();
      fixture.detectChanges();
      mdsTracker.setSectionFields.mockClear();
      autoSave.schedulePayload.mockClear();
      component.onRelatedToChange(1);
      expect(mdsTracker.setSectionFields).toHaveBeenCalled();
      expect(autoSave.schedulePayload).toHaveBeenCalled();
    });
  });

  describe('updateMds', () => {
    // P2-3383: el tracker decía 'Policy stage' mientras el formulario muestra 'Stage'. El
    // usuario ve dos nombres para el mismo campo y no puede saber cuál pendiente es cuál.
    // El AC llama al campo "Stage in policy process", pero renombrar el campo visible quedó
    // fuera de alcance (ver P2-3377), así que la fuente de verdad es la plantilla.
    it('names the stage item exactly as the form labels it', () => {
      build();
      component.body = {};
      component.questions = {};
      component.updateMds();
      const items = mdsTracker.setSectionFields.mock.calls.at(-1)[1];
      const stage = items.find((i: any) => i.key === 'policy-stage');
      expect(stage.label).toBe('Stage');
      expect(stage.label).not.toBe('Policy stage');
    });

    it('counts nothing while every field is empty', () => {
      build();
      component.body = {};
      component.questions = {};
      component.relatedTo = null;
      component.updateMds();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('type-specific', [
        { key: 'policy-type', label: 'Policy type', filled: false },
        { key: 'policy-stage', label: 'Stage', filled: false },
        {
          key: 'policy-institutions',
          label: 'Whose policy is this? (Implementing organizations)',
          filled: false,
        },
      ]);
    });

    // P2-3388: replaced the old "dynamic label" case, which only existed to assert the related-to
    // ITEM. The story moves that question to full metadata, so it must not be tracked at all — and
    // this guards the rule, not just today's shape: an optional field added back to this list
    // silently disables Submit, which is how P2-3348 happened.
    it('never tracks the related-to answer, even when it is answered', () => {
      build();
      component.body = {};
      component.questions = { question_text: 'Custom question?' };
      component.relatedTo = 2;
      component.updateMds();
      const items = mdsTracker.setSectionFields.mock.calls.at(-1)[1];
      expect(items).toHaveLength(3);
      expect(items.map((i: any) => i.key)).toEqual(['policy-type', 'policy-stage', 'policy-institutions']);
    });

    it('counts a fully answered form as filled', () => {
      build();
      component.body = { policy_type_id: 1, policy_stage_id: 2, institutions: [{ institutions_id: 1 }] };
      component.questions = { question_text: 'Q' };
      component.relatedTo = 1;
      component.updateMds();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('type-specific', [
        { key: 'policy-type', label: 'Policy type', filled: true },
        { key: 'policy-stage', label: 'Stage', filled: true },
        {
          key: 'policy-institutions',
          label: 'Whose policy is this? (Implementing organizations)',
          filled: true,
        },
      ]);
    });
  });

  describe('save flow', () => {
    it('onFieldChange updates the MDS tracker and queues a debounced save merging body and questions', () => {
      build();
      component.body = { policy_type_id: 1 };
      component.questions = { question_text: 'Q' };
      component.onFieldChange();
      expect(mdsTracker.setSectionFields).toHaveBeenCalled();
      expect(autoSave.schedulePayload).toHaveBeenCalledWith(
        'typeSpecific',
        { policy_type_id: 1, question_text: 'Q' },
        expect.objectContaining({ debounceMs: 800, statusKey: 'type-specific' }),
      );
    });

    it('onSave queues an immediate save', () => {
      build();
      component.body = { policy_type_id: 1 };
      component.questions = {};
      component.onSave();
      expect(autoSave.schedulePayload).toHaveBeenCalledWith(
        'typeSpecific',
        { policy_type_id: 1 },
        expect.objectContaining({ debounceMs: 0 }),
      );
    });

    it('tracks the saving state from fieldStatus', () => {
      build();
      expect(component.saving()).toBe(false);
      autoSave.fieldStatus.set({ 'type-specific': 'saving' });
      expect(component.saving()).toBe(true);
    });

    // P2-3556 regression guards: the load gate must not change the happy path in any way.
    it('saves normally once the body has loaded', () => {
      bilateralApi.GET_policyChanges.mockReturnValue(
        of({ response: { policy_type_id: 1, institutions: [{ institutions_id: 7 }] } }),
      );
      build();
      autoSave.schedulePayload.mockClear();

      component.body.policy_stage_id = 2;
      component.onFieldChange();

      const [, payload] = autoSave.schedulePayload.mock.calls.at(-1);
      expect(payload.policy_type_id).toBe(1);
      expect(payload.policy_stage_id).toBe(2);
      expect(payload.institutions).toEqual([{ institutions_id: 7 }]);
    });

    /**
     * The deletion the user actually asked for still goes through. `institutions: []` is what makes
     * the server de-activate every stored organization (`summary.service.ts:1048-1054`), so the fix
     * must not start omitting or filtering that key — only refuse to send it before the body is
     * known. Removing the last organization is a legitimate edit and has to persist.
     */
    it('still sends an empty institutions array once the user removes the last organization', () => {
      bilateralApi.GET_policyChanges.mockReturnValue(of({ response: { institutions: [{ institutions_id: 7 }] } }));
      build();
      autoSave.schedulePayload.mockClear();

      component.body.institutions = [];
      component.onFieldChange();

      const [, payload] = autoSave.schedulePayload.mock.calls.at(-1);
      expect('institutions' in payload).toBe(true);
      expect(payload.institutions).toEqual([]);
    });
  });

  describe('toggleShowAll', () => {
    it('flips the signal and persists it under the current result id', () => {
      build();
      component.toggleShowAll();
      expect(component.showAllFields()).toBe(true);
      expect(expandableState.setShowAllFields).toHaveBeenCalledWith(123, 'type-specific', true);
      component.toggleShowAll();
      expect(expandableState.setShowAllFields).toHaveBeenLastCalledWith(123, 'type-specific', false);
    });
  });

  /**
   * ── P2-3556 — rendered template ────────────────────────────────────────────────────────────────
   * This runs against the REAL template on purpose: whether the person is told that the section
   * failed to load, and whether the Save button still invites a save that `queueTypeSave` would
   * refuse, are the two things the fix promises on screen. Every other block in this file overrides
   * the template away.
   */
  describe('rendered template (P2-3556)', () => {
    // `app-alert-status` declares plain `@Input()`s while some `app-pr-*` controls use signals, so
    // read both shapes — same helper the sibling section uses.
    const read = (value: any) => (typeof value === 'function' ? value() : value);
    const alerts = () =>
      fixture.debugElement.queryAll(By.css('app-alert-status')).map(d => ({
        status: read(d.componentInstance.status),
        description: read(d.componentInstance.description),
      }));
    const saveButton = (): HTMLButtonElement => fixture.nativeElement.querySelector('.tsf-actions button');
    const render = () => {
      build();
      fixture.detectChanges();
    };

    beforeEach(async () => {
      TestBed.resetTestingModule();
      makeMocks();
      await configure().compileComponents();
    });

    it('renders an error note that says nothing typed will be saved', () => {
      bilateralApi.GET_policyChanges.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      render();

      const error = alerts().find(a => a.status === 'error');
      expect(error).toBeDefined();
      expect(error.description).toContain('nothing typed here will be saved');
      expect(error.description).toContain('reported earlier has not been changed');
    });

    // The note sits at the TOP of the field list, above the fields it explains — unlike the sibling
    // section, whose MDS note happens to be the first block of its own template. Here the MDS note
    // is halfway down the form, and an error placed next to it would only be read after the person
    // had already scrolled past every blank field.
    it('keeps the MDS note in place, and puts the error note above it', () => {
      bilateralApi.GET_policyChanges.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      render();
      expect(alerts().map(a => a.status)).toEqual(['error', 'info']);
    });

    it('renders no error note on a successful load', () => {
      render();
      expect(alerts().map(a => a.status)).toEqual(['info']);
    });

    // A naive `@if (!loaded())` would flash the error note on every open, while the GET is normal
    // and simply not back yet. The template asks for `=== false` on purpose.
    it('renders no error note while the GET is still in flight — null is not an error', () => {
      bilateralApi.GET_policyChanges.mockReturnValue(new Subject<any>().asObservable());
      render();
      expect(component.loaded()).toBeNull();
      expect(alerts().map(a => a.status)).toEqual(['info']);
    });

    it('renders no error note for a 404 — a result with no policy-change row yet is not an error', () => {
      bilateralApi.GET_policyChanges.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
      render();
      expect(alerts().map(a => a.status)).toEqual(['info']);
      expect(saveButton().disabled).toBe(false);
    });

    it('disables the Save button when the section could not load', () => {
      bilateralApi.GET_policyChanges.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      render();
      expect(saveButton().disabled).toBe(true);
    });

    it('leaves the Save button enabled on the happy path', () => {
      render();
      expect(saveButton().disabled).toBe(false);
    });
  });
});

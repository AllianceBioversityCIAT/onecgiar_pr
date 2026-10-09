import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { BilateralAnnualUpdatingComponent } from './bilateral-annual-updating.component';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { BilateralMarkDiscontinuedDialogService } from './bilateral-mark-discontinued-dialog.service';

describe('BilateralAnnualUpdatingComponent', () => {
  let fixture: ComponentFixture<BilateralAnnualUpdatingComponent>;
  let component: BilateralAnnualUpdatingComponent;

  let creation: any;
  let autoSave: any;
  let mdsTracker: any;
  let api: any;
  let markDiscontinuedDialog: any;

  let catalogueResponse: any;

  const REASON_A = { investment_discontinued_option_id: 1, option: 'Plain reason', order: 1 };
  const REASON_B = { investment_discontinued_option_id: 4, option: 'Another reason, never ticked', order: 2 };
  const MERGE_REASON = { investment_discontinued_option_id: 2, option: 'Discontinued: merging with another innovation', order: 2 };
  const SPLIT_REASON = { investment_discontinued_option_id: 3, option: 'Discontinued: splitting into multiple innovations', order: 3 };

  const build = () => {
    fixture = TestBed.createComponent(BilateralAnnualUpdatingComponent);
    component = fixture.componentInstance;
    return component;
  };

  const configure = () =>
    TestBed.configureTestingModule({
      imports: [BilateralAnnualUpdatingComponent],
      providers: [
        { provide: BilateralCreationService, useValue: creation },
        { provide: BilateralAutoSaveService, useValue: autoSave },
        { provide: BilateralMdsTrackerService, useValue: mdsTracker },
        { provide: ApiService, useValue: api },
        { provide: BilateralMarkDiscontinuedDialogService, useValue: markDiscontinuedDialog },
      ],
    });

  beforeEach(async () => {
    catalogueResponse = of({ response: [REASON_A] });

    creation = {
      currentResultId: signal<number | null>(11),
      resultTypeId: signal<number | null>(7),
      reportingYear: signal<number | null>(2026),
      resultStatusId: signal<number | null>(1),
      isReplicated: signal(true),
      storedIsDiscontinued: signal<number | boolean | null>(null),
      storedDiscontinuedOptions: signal<any[]>([]),
      storedMergeSplitTargets: signal<any[]>([]),
      isEditableByCenterUser: signal(true),
      setResultStatus: jest.fn(),
    };

    autoSave = {
      isReadOnly: signal(false), // R2B-1/2 — the editor lock the sections read
      updateFieldsBatch: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      hasErrorFor: jest.fn().mockReturnValue(false),
      // Reviewer Issue 2: default "already settled" so every test that does not care about the
      // save-in-flight window keeps its old, fast behavior — only the dedicated timing test below
      // overrides this to prove `confirmDiscontinuation()` actually waits.
      hasPendingFor: jest.fn().mockReturnValue(false),
      lastErrorMessageFor: jest.fn().mockReturnValue(null),
      lastGeneralInfoResponse: signal<Record<string, unknown> | null>(null),
    };

    mdsTracker = { setSectionFields: jest.fn() };

    api = {
      rolesSE: { isAdmin: false, access: { canDdit: false } },
      resultsSE: {
        GET_investmentDiscontinuedOptions: jest.fn(() => catalogueResponse),
        GET_globalNarratives: jest.fn(() => of({ response: { value: '' } })),
      },
      dataControlSE: { currentResult: null, reportingCurrentPhase: null },
    };

    markDiscontinuedDialog = { open: jest.fn() };

    await configure()
      .overrideComponent(BilateralAnnualUpdatingComponent, { set: { template: '<div></div>' } })
      .compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('loads the catalogue and sets loaded=true (P2-3556 pattern)', () => {
    build();
    fixture.detectChanges();
    expect(api.resultsSE.GET_investmentDiscontinuedOptions).toHaveBeenCalledWith(7, 2026);
    expect(component.loaded()).toBe(true);
  });

  // (b) catalogue GET -> 500: error visible, and a later answerChange stages nothing.
  describe('(b) failed load', () => {
    it('sets loaded=false and blocks a later answerChange', () => {
      catalogueResponse = throwError(() => new Error('boom'));
      build();
      fixture.detectChanges();

      expect(component.loaded()).toBe(false);

      component.generalInfoBody.is_discontinued = false as any;
      component.onAnswerChange();

      expect(autoSave.updateFieldsBatch).not.toHaveBeenCalled();
    });
  });

  // (c) pick No, advanceTimersByTime(1000): nothing staged, button disabled. Tick 1 reason: enabled.
  // Confirm: exactly one updateFieldsBatch with all three keys, reasons mapped for ticked only.
  describe('(c) No -> confirm', () => {
    it('stages nothing on No and keeps the confirm button disabled until a reason is ticked', fakeAsync(() => {
      build();
      fixture.detectChanges();

      component.generalInfoBody.is_discontinued = true as any;
      component.onAnswerChange();
      tick(1000);

      expect(autoSave.updateFieldsBatch).not.toHaveBeenCalled();
      expect(component.canConfirmDiscontinuation()).toBe(false);

      component.generalInfoBody.discontinued_options[0].value = true;
      component.onAnswerChange();

      expect(component.canConfirmDiscontinuation()).toBe(true);
    }));

    // Reviewer Issue 6 (c): the original fixture had only ONE catalogue reason, ticked, so removing
    // the `.filter(value === true)` in `confirmDiscontinuation()` produced the same batch — the
    // falsifier could not fail. A second, never-ticked reason makes "ticked only" load-bearing.
    it('confirm sends exactly one updateFieldsBatch with all three keys, ticked reasons only', fakeAsync(() => {
      catalogueResponse = of({ response: [REASON_A, REASON_B] });
      build();
      fixture.detectChanges();

      component.generalInfoBody.is_discontinued = true as any;
      component.generalInfoBody.discontinued_options[0].value = true;
      component.generalInfoBody.discontinued_options[0].description = null;
      // REASON_B stays untouched (value: false) — must not appear in the batch.
      component.onAnswerChange();

      markDiscontinuedDialog.open.mockReturnValue(of('confirm'));
      component.openMarkDiscontinuedDialog();
      tick();

      expect(autoSave.updateFieldsBatch).toHaveBeenCalledTimes(1);
      expect(autoSave.updateFieldsBatch).toHaveBeenCalledWith({
        is_discontinued: true,
        discontinued_options: [{ investment_discontinued_option_id: 1, is_active: true, description: null }],
        merge_split_targets: [],
      });
      expect(autoSave.flush).toHaveBeenCalledWith(['generalInfo']);
    }));

    // (g) No with zero reasons ticked shows "Please provide a reason." and confirm stays disabled;
    // ticking a reason removes the warning; a server 400 on save is shown as an error.
    describe('(g) S-11.3', () => {
      it('shows the warning with zero reasons ticked and clears it once one is ticked', () => {
        build();
        fixture.detectChanges();

        component.generalInfoBody.is_discontinued = true as any;
        component.onAnswerChange();
        expect(component.showsNoReasonWarning()).toBe(true);
        expect(component.canConfirmDiscontinuation()).toBe(false);

        component.generalInfoBody.discontinued_options[0].value = true;
        component.onAnswerChange();
        expect(component.showsNoReasonWarning()).toBe(false);
      });

      // A real `async` test, not `fakeAsync`/`flushMicrotasks`: `confirmDiscontinuation()` awaits a
      // Promise returned by a Jest mock (`autoSave.flush.mockResolvedValue`), and that Promise does
      // not resolve through zone.js's fake microtask queue reliably in this environment.
      it('shows a server 400 "Please provide a reason." as an error in the block', async () => {
        build();
        fixture.detectChanges();
        component.generalInfoBody.is_discontinued = true as any;
        component.generalInfoBody.discontinued_options[0].value = true;
        component.onAnswerChange();

        autoSave.hasErrorFor.mockReturnValue(true);
        autoSave.lastErrorMessageFor.mockReturnValue('Please provide a reason.');
        markDiscontinuedDialog.open.mockReturnValue(of('confirm'));

        component.openMarkDiscontinuedDialog();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        expect(component.saveError()).toBe('Please provide a reason.');
      });

      /**
       * Reviewer Issue 2 (attempt 3) — timing-faithful, modeling the REAL `hasPendingFor`/
       * `hasErrorFor` semantics (`bilateral-auto-save.service.ts`): a field status of `'error'`
       * counts as BOTH pending AND errored (`hasPendingFor`: `'dirty' || 'saving' || 'error'`),
       * because for every other caller "pending" correctly means "still unsaved, including a
       * failed save the user hasn't retried yet". Attempt 2's test put the mocks in a combination
       * the real service can never reach (`hasPendingFor` false while `hasErrorFor` true) and so
       * could not catch the loop missing its own exit. This test never sets that combination: only
       * `'saving'` (pending, not error) and `'error'` (pending AND error) exist, matching
       * `waitForSave()`'s own extra `&& !hasErrorFor(...)` exit — the one this round adds, mirroring
       * `bilateral-result-creator.component.ts`'s `waitForSectionSave()`.
       */
      it('waits for the request to settle before reading hasErrorFor, and keeps confirming() true until then', async () => {
        build();
        fixture.detectChanges();
        component.generalInfoBody.is_discontinued = true as any;
        component.generalInfoBody.discontinued_options[0].value = true;
        component.onAnswerChange();

        let status: 'saving' | 'error' = 'saving';
        autoSave.hasPendingFor.mockImplementation(() => status === 'saving' || status === 'error');
        autoSave.hasErrorFor.mockImplementation(() => status === 'error');
        autoSave.lastErrorMessageFor.mockReturnValue('Please provide a reason.');
        markDiscontinuedDialog.open.mockReturnValue(of('confirm'));

        component.openMarkDiscontinuedDialog();
        expect(component.confirming()).toBe(true);

        // flush() itself resolves (dispatch only) — the request is still "in flight" per `status`.
        await Promise.resolve();
        await Promise.resolve();
        expect(component.confirming()).toBe(true);
        expect(component.saveError()).toBeNull();

        // The server answers with the T-6 400. Asserted well BEFORE `SAVE_TIMEOUT_MS` (15s) — the
        // whole point of the extra `hasErrorFor` exit is that this does not wait for the timeout.
        status = 'error';
        await new Promise(resolve => setTimeout(resolve, 250));

        expect(component.confirming()).toBe(false);
        expect(component.saveError()).toBe('Please provide a reason.');
      });

      it('the success path also settles well before the timeout: pending and error both clear', async () => {
        build();
        fixture.detectChanges();
        component.generalInfoBody.is_discontinued = true as any;
        component.generalInfoBody.discontinued_options[0].value = true;
        component.onAnswerChange();

        let status: 'saving' | 'saved' = 'saving';
        autoSave.hasPendingFor.mockImplementation(() => status === 'saving');
        autoSave.hasErrorFor.mockImplementation(() => false);
        markDiscontinuedDialog.open.mockReturnValue(of('confirm'));

        component.openMarkDiscontinuedDialog();
        await Promise.resolve();
        await Promise.resolve();
        expect(component.confirming()).toBe(true);
        expect(component.saveError()).toBeNull();

        status = 'saved';
        await new Promise(resolve => setTimeout(resolve, 250));

        expect(component.confirming()).toBe(false);
        expect(component.saveError()).toBeNull();
      });
    });
  });

  // (d) cancel stages nothing.
  it('(d) cancel sends nothing', fakeAsync(() => {
    build();
    fixture.detectChanges();
    component.generalInfoBody.is_discontinued = true as any;
    component.generalInfoBody.discontinued_options[0].value = true;
    component.onAnswerChange();

    markDiscontinuedDialog.open.mockReturnValue(of('cancel'));
    component.openMarkDiscontinuedDialog();
    tick();

    expect(autoSave.updateFieldsBatch).not.toHaveBeenCalled();
  }));

  // (e) replicated and unanswered: the MDS item 'annual-update' is unfilled.
  it('(e) reports the annual-update MDS item unfilled while unanswered', () => {
    build();
    fixture.detectChanges();

    expect(mdsTracker.setSectionFields).toHaveBeenCalledWith(
      'general-info',
      [{ key: 'annual-update', label: 'Annual update', filled: false }],
      'annual-updating'
    );
  });

  // (f) Yes on stored status 4 (admin): batch is is_discontinued:false/[]/[], and a response of
  // status_id:1 calls setResultStatus(1).
  it('(f) Yes on stored status 4 stages the Yes batch and calls setResultStatus from the response', () => {
    creation.storedIsDiscontinued.set(1);
    creation.resultStatusId.set(4);
    api.rolesSE.isAdmin = true;
    build();
    fixture.detectChanges();

    expect(component.generalInfoBody.is_discontinued).toBe(true);

    component.generalInfoBody.is_discontinued = false as any;
    component.onAnswerChange();

    expect(autoSave.updateFieldsBatch).toHaveBeenCalledWith({
      is_discontinued: false,
      discontinued_options: [],
      merge_split_targets: [],
    });
    expect(autoSave.flush).toHaveBeenCalledWith(['generalInfo']);

    autoSave.lastGeneralInfoResponse.set({ id: 11, status_id: 1, is_discontinued: false });
    fixture.detectChanges();

    expect(creation.setResultStatus).toHaveBeenCalledWith(1);
  });

  // Reviewer Issue 3 (attempt 2): a response left over from a PREVIOUS result (this creator-scoped
  // service instance is shared across results in the same visit) must never drive THIS result's
  // status. `id: 99` never matches this component's `currentResultId` (11).
  it('Issue 3: a stale response for a different result id is ignored', () => {
    build();
    fixture.detectChanges();

    autoSave.lastGeneralInfoResponse.set({ id: 99, status_id: 4, is_discontinued: true });
    fixture.detectChanges();

    expect(creation.setResultStatus).not.toHaveBeenCalled();
  });

  // Reviewer Issue 5 (attempt 2): a non-admin on a result already locked (stored No, status 4) must
  // never be able to reach the confirm path, even with a complete answer staged locally.
  describe('Issue 5: locked block refuses the confirm path', () => {
    it('canConfirmDiscontinuation() is false and the dialog never opens', () => {
      creation.isEditableByCenterUser.set(false);
      creation.resultStatusId.set(4);
      api.rolesSE.isAdmin = false;
      build();
      fixture.detectChanges();

      component.generalInfoBody.is_discontinued = true as any;
      component.generalInfoBody.discontinued_options[0].value = true;
      component.onAnswerChange();

      expect(component.context().editable).toBe(false);
      expect(component.canConfirmDiscontinuation()).toBe(false);

      component.openMarkDiscontinuedDialog();
      expect(markDiscontinuedDialog.open).not.toHaveBeenCalled();
    });
  });

  it('builds a stable context reference that only rebuilds when a dependency changes', () => {
    build();
    fixture.detectChanges();
    const first = component.context();
    const second = component.context();
    expect(second).toBe(first);

    // `reportingYear` is read unconditionally (unlike `resultStatusId`, which sits behind an
    // `isAdmin &&` short-circuit and would not register as a dependency while `isAdmin` is false).
    creation.reportingYear.set(2025);
    const third = component.context();
    expect(third).not.toBe(first);
  });

  it('editable = isEditableByCenterUser() || (isAdmin && status === 4)', () => {
    build();
    fixture.detectChanges();
    expect(component.context().editable).toBe(true);

    // `rolesSE.isAdmin` is a plain property (same convention as the bilateral-result-creator
    // exemption effect), so it is only read fresh when an actual signal dependency changes —
    // hence a signal write alongside every `isAdmin` mutation below.
    creation.isEditableByCenterUser.set(false);
    creation.resultStatusId.set(4);
    expect(component.context().editable).toBe(false);

    api.rolesSE.isAdmin = true;
    creation.resultStatusId.set(6);
    expect(component.context().editable).toBe(false);

    creation.resultStatusId.set(4);
    expect(component.context().editable).toBe(true);
  });

  it('R2B-1: a non-admin whose editor lock is up (not the lead centre) gets editable=false; an admin is unaffected', () => {
    build();
    fixture.detectChanges();
    expect(component.context().editable).toBe(true);

    autoSave.isReadOnly.set(true);
    expect(component.context().editable).toBe(false);
  });

  it('merges the stored reasons into the catalogue', () => {
    catalogueResponse = of({ response: [REASON_A, MERGE_REASON, SPLIT_REASON] });
    creation.storedDiscontinuedOptions.set([{ investment_discontinued_option_id: 1, description: null }]);
    build();
    fixture.detectChanges();

    expect(component.generalInfoBody.discontinued_options[0].value).toBe(true);
    expect(component.generalInfoBody.discontinued_options[1].value).toBe(false);
  });

  /**
   * A real, minimal STAND-IN for the shared `app-rd-annual-updating` — same selector, same
   * inputs/output, empty template. Reviewer Issue 6 (b)/(g): the rest of this suite stubs the
   * WHOLE template out (`overrideComponent(... { set: { template: '<div></div>' } })`), so the
   * literal warning text, the button's `[disabled]` binding and `app-alert-status` were never
   * actually rendered by any test — deleting them left the suite green. This block renders the
   * REAL wrapper template instead, with this lightweight stand-in for the shared component
   * (nothing here asserts on ITS output, only the wrapper's own conditional blocks around it).
   */
  @Component({
    selector: 'app-rd-annual-updating',
    standalone: true,
    template: '',
  })
  class RdAnnualUpdatingStubComponent {
    @Input() generalInfoBody: unknown;
    @Input() context: unknown;
    @Input() isPhaseOpen = false;
    @Output() answerChange = new EventEmitter<void>();
  }

  describe('rendered markup (Reviewer Issue 6 (b)/(g))', () => {
    const buildReal = async () => {
      TestBed.resetTestingModule();
      await configure()
        .overrideComponent(BilateralAnnualUpdatingComponent, {
          set: { imports: [CustomFieldsModule, RdAnnualUpdatingStubComponent] },
        })
        .compileComponents();
      fixture = TestBed.createComponent(BilateralAnnualUpdatingComponent);
      component = fixture.componentInstance;
      return component;
    };

    /**
     * Mutating `component.generalInfoBody` (a plain object, never a signal — by design; the shared
     * child mutates it in place too, same contract W1/W2 uses) does not go through any API that
     * marks this view for check in this Angular version, unlike a real click's zone-triggered
     * event. Measured: `fixture.detectChanges()` alone left the wrapper's OWN top-level `@if`
     * blocks reading stale state (`ApplicationRef`'s dirty-view tracking never saw them as
     * needing a refresh), while the dev-mode `checkNoChanges()` diagnostic pass — which walks
     * every view unconditionally — computed the correct new value and threw NG0100 on the
     * mismatch. `markForCheck()` is what a real event dispatch would have done implicitly.
     */
    const detectAfterMutation = () => {
      fixture.componentRef.changeDetectorRef.markForCheck();
      fixture.detectChanges();
    };

    it('(b) renders app-alert-status on a failed load, and nothing else', async () => {
      catalogueResponse = throwError(() => new Error('boom'));
      await buildReal();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-alert-status')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('[data-testid="mark-discontinued-button"]')).toBeNull();
    });

    it('(g) the literal warning text is exactly "Please provide a reason." and disappears once a reason is ticked', async () => {
      await buildReal();
      fixture.detectChanges();

      component.generalInfoBody.is_discontinued = true as any;
      component.onAnswerChange();
      detectAfterMutation();

      const warning = fixture.nativeElement.querySelector('[data-testid="annual-update-warning"]');
      expect(warning?.textContent?.trim()).toBe('Please provide a reason.');

      component.generalInfoBody.discontinued_options[0].value = true;
      component.onAnswerChange();
      detectAfterMutation();

      expect(fixture.nativeElement.querySelector('[data-testid="annual-update-warning"]')).toBeNull();
    });

    it('the confirm button is [disabled] with zero reasons ticked, and enabled once one is', async () => {
      await buildReal();
      fixture.detectChanges();

      component.generalInfoBody.is_discontinued = true as any;
      component.onAnswerChange();
      detectAfterMutation();

      const button = () => fixture.nativeElement.querySelector('[data-testid="mark-discontinued-button"]') as HTMLButtonElement;
      expect(button().disabled).toBe(true);

      component.generalInfoBody.discontinued_options[0].value = true;
      component.onAnswerChange();
      detectAfterMutation();

      expect(button().disabled).toBe(false);
    });

    it('Issue 5: the confirm button does not render at all on a locked (non-editable) block', async () => {
      creation.isEditableByCenterUser.set(false);
      creation.resultStatusId.set(4);
      api.rolesSE.isAdmin = false;
      await buildReal();
      fixture.detectChanges();

      component.generalInfoBody.is_discontinued = true as any;
      component.generalInfoBody.discontinued_options[0].value = true;
      component.onAnswerChange();
      detectAfterMutation();

      expect(fixture.nativeElement.querySelector('[data-testid="mark-discontinued-button"]')).toBeNull();
    });
  });
});

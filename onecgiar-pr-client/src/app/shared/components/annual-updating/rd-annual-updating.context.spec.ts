import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { RdAnnualUpdatingComponent, AnnualUpdatingContext } from './rd-annual-updating.component';
import { DataControlService } from '../../services/data-control.service';
import { ApiService } from '../../services/api/api.service';

/**
 * BIL-RAU-T-4 — the `context` input / `answerChange` output that let the bilateral wrapper (T-8)
 * reuse this component without ever touching `dataControlSE.currentResult` / `rolesSE.*`.
 *
 * Every case here builds the component with NO `dataControlSE.currentResult` seeded — the whole
 * point of `context` is that it stands in for that source completely. A test that seeded both
 * would not tell `context` actually won.
 */
describe('RdAnnualUpdatingComponent — context input (BIL-RAU-T-4)', () => {
  let dataControlSE: DataControlService;
  let api: ApiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdAnnualUpdatingComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    dataControlSE = TestBed.inject(DataControlService);
    api = TestBed.inject(ApiService);
  });

  /**
   * Seeds `currentResult` (and, when asked, `rolesSE.isAdmin`) with a value that CONFLICTS with the
   * `context` under test — i.e. one that would flip the assertion if any resolver silently fell
   * back to it instead of reading `context`. Used by every negative case below: a case built with
   * `currentResult` left at its untouched `{}` default cannot fail without the change (the fallback
   * source already agrees with `context` by omission), so it cannot show that `context` won.
   */
  const seedConflictingFallback = (over: Partial<{ isAdmin: boolean }> = {}): void => {
    dataControlSE.currentResult = { id: 999, result_type_id: 7, phase_year: 2026, is_discontinued: 1 };
    if (over.isAdmin !== undefined) {
      Object.defineProperty(api.rolesSE, 'isAdmin', { get: () => over.isAdmin, configurable: true });
    }
  };

  /**
   * Builds a component with `context` set the way Angular actually sets an `@Input()`: AFTER the
   * constructor (so the construction-time fields resolve against `currentResult` first, exactly as
   * DD-2 requires), then fires `ngOnChanges` the same way the framework would for a bound input —
   * which is what makes `usesStatusTriggerWording` / `headerLabel` / `options` re-resolve.
   *
   * `dataControlSE.currentResult` is deliberately left unseeded: the falsifier requires every
   * class-field read to come from `context` alone.
   */
  const buildWithContext = (context: AnnualUpdatingContext): RdAnnualUpdatingComponent => {
    const component = TestBed.createComponent(RdAnnualUpdatingComponent).componentInstance;
    component.context = context;
    component.ngOnChanges({ context: { previousValue: undefined, currentValue: context, firstChange: true, isFirstChange: () => true } });
    return component;
  };

  const baseContext = (over: Partial<AnnualUpdatingContext> = {}): AnnualUpdatingContext => ({
    resultTypeId: 7,
    phaseYear: 2026,
    storedIsDiscontinued: 1,
    isAdmin: false,
    editable: true,
    ...over
  });

  describe('the falsifier', () => {
    it('asks the 2026 status-trigger question, locks and hides the reopen button for a non-admin — no currentResult seeded', () => {
      // `DataControlService.currentResult` defaults to `{}`, never seeded with a `result_type_id`
      // or `phase_year` — every read below must come from `context` alone to pass.
      expect(dataControlSE.currentResult?.result_type_id).toBeUndefined();
      expect(dataControlSE.currentResult?.phase_year).toBeUndefined();

      const c = buildWithContext(baseContext());

      expect(c.usesStatusTriggerWording).toBe(true);
      expect(c.lockedByDiscontinuation).toBe(true);
      expect(c.canReopenDiscontinuation).toBe(false);
    });

    it('unlocks and offers reopen for an admin, same context otherwise', () => {
      const c = buildWithContext(baseContext({ isAdmin: true }));

      expect(c.lockedByDiscontinuation).toBe(false);
      expect(c.canReopenDiscontinuation).toBe(true);
    });

    it('keeps the legacy "Innovation use is …" wording for type 2, against a type-7 currentResult that would say "development"', () => {
      // Conflicting fallback: `currentResult.result_type_id` is 7. A `buildOptions()` that read
      // through to it instead of `context.resultTypeId` would print "Innovation development is …"
      // here — only reading `context` produces "Innovation use is …".
      seedConflictingFallback();

      const c = buildWithContext(baseContext({ resultTypeId: 2 }));

      expect(c.usesStatusTriggerWording).toBe(false);
      expect(c.options).toEqual([
        { name: 'Innovation use is active/investment was continued', value: false },
        { name: 'Innovation use is inactive/investment was discontinued, because:', value: true }
      ]);
    });

    it('keeps the legacy "Innovation development is …" wording for type 7 phase 2025, against a type-2/2026 currentResult', () => {
      // Conflicting fallback in the OTHER direction: currentResult here is type 2 at phase 2026
      // (would say "use" AND could resolve `usesStatusTriggerWording` true if the fallback won).
      dataControlSE.currentResult = { id: 999, result_type_id: 2, phase_year: 2026, is_discontinued: 1 };

      const c = buildWithContext(baseContext({ resultTypeId: 7, phaseYear: 2025 }));

      expect(c.usesStatusTriggerWording).toBe(false);
      expect(c.options).toEqual([
        { name: 'Innovation development is active/investment was continued', value: false },
        { name: 'Innovation development is inactive/investment was discontinued, because:', value: true }
      ]);
    });

    it('does not lock when the stored answer is null (never answered), against a currentResult stored as discontinued', () => {
      // Conflicting fallback: `currentResult.is_discontinued` is 1 (would lock). Only reading
      // `context.storedIsDiscontinued` (explicitly `null` here) proves the resolver reads the WHOLE
      // object from `context`, not a per-field `??` that would fall through `null` to the fallback.
      seedConflictingFallback();

      const c = buildWithContext(baseContext({ storedIsDiscontinued: null }));

      expect(c.lockedByDiscontinuation).toBe(false);
    });

    it('S-6.1 — picking No while stored active does not lock before the answer is saved, against a currentResult stored as discontinued', () => {
      // Conflicting fallback: `currentResult.is_discontinued` is 1. If `lockedByDiscontinuation`
      // read that instead of `context.storedIsDiscontinued` (0, active), this would wrongly lock.
      seedConflictingFallback();

      const c = buildWithContext(baseContext({ storedIsDiscontinued: 0 }));

      // The reporter picked "No" but it has not been stored yet — the lock must read the STORED
      // flag from context, never the value being edited.
      c.generalInfoBody.is_discontinued = true;

      expect(c.lockedByDiscontinuation).toBe(false);
    });

    it('emits answerChange exactly once per mutation', () => {
      const c = buildWithContext(baseContext({ storedIsDiscontinued: 0, isAdmin: true }));
      const seen: void[] = [];
      c.answerChange.subscribe(() => seen.push(undefined));

      c.onAnswerChange(true);
      expect(seen.length).toBe(1);

      c.generalInfoBody.discontinued_options = [{ option: 'Some reason', value: false }];
      c.onReasonToggle(c.generalInfoBody.discontinued_options[0], true);
      expect(seen.length).toBe(2);

      c.onDescriptionChange(c.generalInfoBody.discontinued_options[0], 'typed text');
      expect(seen.length).toBe(3);

      c.onTargetsChange('merge', [123]);
      expect(seen.length).toBe(4);

      c.reopenDiscontinuation();
      expect(seen.length).toBe(5);
    });
  });

  describe('the tinyint shape survives through context, same as through currentResult', () => {
    it('locks on storedIsDiscontinued: 1', () => {
      // Conflicting fallback: `currentResult.is_discontinued` is left absent by default ({}), which
      // would ALSO read as "not locked" if the resolver fell through — so this case is pinned by
      // giving the fallback the OPPOSITE answer (0 / active) and asserting the LOCK still applies.
      dataControlSE.currentResult = { id: 999, result_type_id: 7, phase_year: 2026, is_discontinued: 0 };

      expect(buildWithContext(baseContext({ storedIsDiscontinued: 1 })).lockedByDiscontinuation).toBe(true);
    });

    it('does not lock on storedIsDiscontinued: 0, against a currentResult stored as discontinued', () => {
      seedConflictingFallback();

      expect(buildWithContext(baseContext({ storedIsDiscontinued: 0 })).lockedByDiscontinuation).toBe(false);
    });

    it('does not lock on storedIsDiscontinued: undefined, against a currentResult stored as discontinued', () => {
      seedConflictingFallback();

      expect(buildWithContext(baseContext({ storedIsDiscontinued: undefined })).lockedByDiscontinuation).toBe(false);
    });
  });

  describe('resultId routes through context for the merge/split catalogue fetches', () => {
    it('uses context.resultId instead of currentResult.id', () => {
      const c = buildWithContext(baseContext({ resultId: 4242 }));
      const spy = jest.spyOn(c.api.resultsSE, 'GET_mergeSplitTargetInnovations').mockReturnValue(of({ response: [] }) as any);

      c.generalInfoBody.is_discontinued = true;
      c.generalInfoBody.discontinued_options = [{ option: 'Discontinued: merging with another innovation', value: true }];
      c.ensureMergeSplitCatalogue();

      expect(spy).toHaveBeenCalledWith(4242);
    });
  });

  describe('editable routes through context.editable, replacing isPhaseOpen + rolesSE.access.canDdit together', () => {
    it('is editable when context.editable is true and not locked', () => {
      const c = buildWithContext(baseContext({ storedIsDiscontinued: 0, editable: true }));
      expect(c.annualUpdatingEditable).toBe(true);
    });

    it('is not editable when context.editable is false, against a fallback that would say true', () => {
      // Conflicting fallback: `isPhaseOpen` + `rolesSE.access.canDdit` are set so the OLD combined
      // read would resolve to editable — only reading `context.editable` (false) produces `false`.
      Object.defineProperty(api.rolesSE, 'access', { get: () => ({ canDdit: true }), configurable: true });
      const c = buildWithContext(baseContext({ storedIsDiscontinued: 0, editable: false }));
      c.isPhaseOpen = true;

      expect(c.annualUpdatingEditable).toBe(false);
    });

    it('stays locked-out of editability while locked, even if context.editable is true', () => {
      const c = buildWithContext(baseContext({ storedIsDiscontinued: 1, isAdmin: false, editable: true }));
      expect(c.annualUpdatingEditable).toBe(false);
    });
  });

  describe('the outer *ngIf gate (resolvedResultTypeId) also reads context', () => {
    it('resolves type 7 from context alone', () => {
      expect(buildWithContext(baseContext({ resultTypeId: 7 })).resolvedResultTypeId).toBe(7);
    });

    it('resolves type 2 from context alone', () => {
      expect(buildWithContext(baseContext({ resultTypeId: 2 })).resolvedResultTypeId).toBe(2);
    });
  });

  describe('re-resolution only fires when context is actually bound (DD-2)', () => {
    it('does not touch usesStatusTriggerWording/options when ngOnChanges fires for another input', () => {
      dataControlSE.currentResult = { result_type_id: 7, phase_year: 2025, portfolio: 'P25' };
      const component = TestBed.createComponent(RdAnnualUpdatingComponent).componentInstance;
      const before = { wording: component.usesStatusTriggerWording, options: component.options };

      component.ngOnChanges({ isPhaseOpen: { previousValue: false, currentValue: true, firstChange: false, isFirstChange: () => false } });

      expect(component.usesStatusTriggerWording).toBe(before.wording);
      expect(component.options).toEqual(before.options);
    });
  });
});

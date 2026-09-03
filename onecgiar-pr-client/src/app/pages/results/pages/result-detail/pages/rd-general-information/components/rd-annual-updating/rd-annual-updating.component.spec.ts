import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RdAnnualUpdatingComponent } from './rd-annual-updating.component';
import { DataControlService } from '../../../../../../../../shared/services/data-control.service';
import { of } from 'rxjs';

const INNOVATION_DEVELOPMENT = 7;
const INNOVATION_USE = 2;

const STATUS_TRIGGER_LABEL = 'Is this innovation active and receiving investment?';
const LEGACY_LABEL = 'Please indicate if the investment for this innovation was continued or discontinued';
const REASONS_LABEL = 'What are the main reasons this innovation is inactive?';
const REASONS_HINT = '(select all that apply)';

describe('RdAnnualUpdatingComponent', () => {
  let component: RdAnnualUpdatingComponent;
  let fixture: ComponentFixture<RdAnnualUpdatingComponent>;
  let dataControlSE: DataControlService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdAnnualUpdatingComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    dataControlSE = TestBed.inject(DataControlService);

    fixture = TestBed.createComponent(RdAnnualUpdatingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /**
   * Builds a fresh component AFTER seeding the phase/result context, because the P2-3292 wording is
   * resolved once at construction (same as `options` always was). `detectChanges()` is deliberately
   * not called: it would fire `ngOnInit` -> `GET_globalNarratives`, which these tests do not exercise.
   */
  const buildFor = (currentResult: any, openPhaseYear: any = null): RdAnnualUpdatingComponent => {
    dataControlSE.currentResult = currentResult;
    dataControlSE.reportingCurrentPhase = { ...dataControlSE.reportingCurrentPhase, phaseYear: openPhaseYear };
    return TestBed.createComponent(RdAnnualUpdatingComponent).componentInstance;
  };

  /**
   * Same seeding as `buildFor`, but renders the template so the assertions read the text a reporter
   * actually sees — colon included. `app-pr-field-header` appends ':' unless `useColon` is false,
   * so only a DOM read can catch the "...investment?:" defect; asserting on `headerLabel` cannot.
   * `GET_globalNarratives` is stubbed because `detectChanges()` fires `ngOnInit`.
   */
  const renderFor = (currentResult: any): string => {
    // The shared `beforeEach` fixture rendered with no `currentResult`, so its outer *ngIf is false.
    // It stays attached to ApplicationRef, and seeding the result below would flip it to true inside
    // this fixture's own tick -> NG0100. It is unused here, so detach it first.
    fixture.destroy();
    dataControlSE.currentResult = currentResult;
    const renderedFixture = TestBed.createComponent(RdAnnualUpdatingComponent);
    jest.spyOn(renderedFixture.componentInstance.api.resultsSE, 'GET_globalNarratives').mockReturnValue(of({ response: { value: '' } }));
    renderedFixture.detectChanges();
    return renderedFixture.nativeElement.querySelector('.header .pr_label').textContent.trim();
  };

  /**
   * Renders the whole block with the discontinuation branch already answered, and hands back the
   * root element so a test can assert on the reason checklist itself. Same `fixture.destroy()`
   * precaution as `renderFor` (see the note there).
   */
  const renderChecklistFor = (currentResult: any, isDiscontinued: any = true): HTMLElement => {
    fixture.destroy();
    dataControlSE.currentResult = currentResult;
    const renderedFixture = TestBed.createComponent(RdAnnualUpdatingComponent);
    jest.spyOn(renderedFixture.componentInstance.api.resultsSE, 'GET_globalNarratives').mockReturnValue(of({ response: { value: '' } }));
    renderedFixture.componentInstance.generalInfoBody.is_discontinued = isDiscontinued;
    renderedFixture.componentInstance.generalInfoBody.discontinued_options = [
      { investment_discontinued_option_id: 1, option: 'Some stored reason', value: false }
    ];
    renderedFixture.detectChanges();
    return renderedFixture.nativeElement;
  };

  describe('isDiscontinuedOptionsTrue()', () => {
    it('should return true for isDiscontinuedOptionsTrue when is_discontinued is false', () => {
      const result = component.isDiscontinuedOptionsTrue();

      expect(result).toBeTruthy();
    });

    it('should return true for isDiscontinuedOptionsTrue when is_discontinued is true and some discontinued option is true', () => {
      component.generalInfoBody.is_discontinued = true;
      component.generalInfoBody.discontinued_options = [
        {
          value: true
        },
        {
          value: false
        }
      ];

      const result = component.isDiscontinuedOptionsTrue();

      expect(result).toBeTruthy();
    });
  });

  describe('getAlertNarrative()', () => {
    it('should set alertText with the response value from the API', () => {
      const mockResponse = { response: { value: 'Test alert narrative' } };
      jest.spyOn(component.api.resultsSE, 'GET_globalNarratives').mockReturnValue(of(mockResponse));

      component.getAlertNarrative();

      expect(component.alertText).toBe('Test alert narrative');
    });

    it('should handle empty response from the API', () => {
      const mockResponse = { response: { value: '' } };
      jest.spyOn(component.api.resultsSE, 'GET_globalNarratives').mockReturnValue(of(mockResponse));

      component.getAlertNarrative();

      expect(component.alertText).toBe('');
    });
  });

  /**
   * P2-3292 Step 1 (Status Trigger), epic P2-3243.
   *
   * The gate is the reporting PHASE YEAR, never the portfolio: prtest holds phase-2025 results
   * inside portfolio P25, and `isP25()` would reword the block for those too — breaking the epic's
   * governing rule that earlier phases must render exactly as they do today.
   */
  describe('P2-3292 Step 1 — status trigger wording', () => {
    it('asks the new question for Innovation Development from the 2026 phase on', () => {
      const c = buildFor({ result_type_id: INNOVATION_DEVELOPMENT, phase_year: 2026, portfolio: 'P25' });

      expect(c.usesStatusTriggerWording).toBe(true);
      expect(c.headerLabel).toBe(STATUS_TRIGGER_LABEL);
    });

    it('answers the new question with a plain Yes / No mapped onto the stored is_discontinued flag', () => {
      const c = buildFor({ result_type_id: INNOVATION_DEVELOPMENT, phase_year: 2026, portfolio: 'P25' });

      expect(c.options).toEqual([
        { name: 'Yes', value: false },
        { name: 'No', value: true }
      ]);
    });

    it('keeps the legacy wording verbatim for an Innovation Development result in the 2025 phase', () => {
      const c = buildFor({ result_type_id: INNOVATION_DEVELOPMENT, phase_year: 2025, portfolio: 'P25' });

      expect(c.usesStatusTriggerWording).toBe(false);
      expect(c.headerLabel).toBe(LEGACY_LABEL);
      expect(c.options).toEqual([
        { name: 'Innovation development is active/investment was continued', value: false },
        { name: 'Innovation development is inactive/investment was discontinued, because:', value: true }
      ]);
    });

    it('never applies to Innovation Use, not even in the 2026 phase', () => {
      const c = buildFor({ result_type_id: INNOVATION_USE, phase_year: 2026, portfolio: 'P25' });

      expect(c.usesStatusTriggerWording).toBe(false);
      expect(c.headerLabel).toBe(LEGACY_LABEL);
      expect(c.options).toEqual([
        { name: 'Innovation use is active/investment was continued', value: false },
        { name: 'Innovation use is inactive/investment was discontinued, because:', value: true }
      ]);
    });

    it('falls back to the open reporting phase year when the result payload carries none', () => {
      const c = buildFor({ result_type_id: INNOVATION_DEVELOPMENT, portfolio: 'P25' }, 2026);

      expect(c.usesStatusTriggerWording).toBe(true);
      expect(c.headerLabel).toBe(STATUS_TRIGGER_LABEL);
    });

    it('keeps the legacy wording when the year arrives as a string, so a bad payload cannot flip the form', () => {
      const c = buildFor({ result_type_id: INNOVATION_DEVELOPMENT, phase_year: '2026', portfolio: 'P25' });

      expect(c.usesStatusTriggerWording).toBe(false);
      expect(c.headerLabel).toBe(LEGACY_LABEL);
    });

    it('keeps the legacy wording when neither the result nor the open phase carries a year', () => {
      const c = buildFor({ result_type_id: INNOVATION_DEVELOPMENT, portfolio: 'P25' });

      expect(c.usesStatusTriggerWording).toBe(false);
      expect(c.headerLabel).toBe(LEGACY_LABEL);
    });

    it('keeps the legacy wording when there is no open result at all', () => {
      const c = buildFor(undefined);

      expect(c.usesStatusTriggerWording).toBe(false);
      expect(c.headerLabel).toBe(LEGACY_LABEL);
    });

    /**
     * Rendered-DOM guard. The class fields above cannot see the trailing ':' that
     * `app-pr-field-header` adds by default, which is exactly how the question shipped reading
     * "Is this innovation active and receiving investment?:".
     */
    describe('as rendered in the DOM', () => {
      it('shows the 2026 question with no trailing colon', () => {
        const renderedLabel = renderFor({ result_type_id: INNOVATION_DEVELOPMENT, phase_year: 2026, portfolio: 'P25' });

        expect(renderedLabel).toBe(STATUS_TRIGGER_LABEL);
        expect(renderedLabel).not.toContain('?:');
        expect(renderedLabel.endsWith(':')).toBe(false);
      });

      it('shows the 2025 legacy label with its colon, exactly as it renders today', () => {
        const renderedLabel = renderFor({ result_type_id: INNOVATION_DEVELOPMENT, phase_year: 2025, portfolio: 'P25' });

        expect(renderedLabel).toBe(`${LEGACY_LABEL}:`);
      });

      it('shows the legacy label with its colon for Innovation Use in the 2026 phase', () => {
        const renderedLabel = renderFor({ result_type_id: INNOVATION_USE, phase_year: 2026, portfolio: 'P25' });

        expect(renderedLabel).toBe(`${LEGACY_LABEL}:`);
      });
    });
  });

  /**
   * P2-3292 Step 2 — the prompt above the reason checklist.
   *
   * Step 1 swapped the second radio label ("...investment was discontinued, because:") for a bare
   * "No" on the 2026 branch, which left the checklist with no prompt at all. Step 2 words that
   * prompt. Same phase-year gate as Step 1, so 2025 and Innovation Use must show nothing new.
   *
   * The reason TEXTS themselves are catalogue rows (`investment_discontinued_option`) and are not
   * part of this delivery — only the prompt is.
   */
  describe('P2-3292 Step 2 — reason checklist prompt', () => {
    const promptOf = (root: HTMLElement) => root.querySelector('.discontinued_options .pr_label');

    it('asks for the reasons above the checklist on a 2026 Innovation Development result', () => {
      const root = renderChecklistFor({ result_type_id: INNOVATION_DEVELOPMENT, phase_year: 2026, portfolio: 'P25' });

      expect(promptOf(root)?.textContent?.trim()).toBe(REASONS_LABEL);
    });

    it('prints the prompt as a question, with no trailing colon', () => {
      const root = renderChecklistFor({ result_type_id: INNOVATION_DEVELOPMENT, phase_year: 2026, portfolio: 'P25' });
      const rendered = promptOf(root)?.textContent?.trim() ?? '';

      expect(rendered.endsWith('?')).toBe(true);
      expect(rendered).not.toContain('?:');
    });

    it('prints the "select all that apply" hint with no "Description:" chip in front of it', () => {
      const root = renderChecklistFor({ result_type_id: INNOVATION_DEVELOPMENT, phase_year: 2026, portfolio: 'P25' });
      const hint = root.querySelector('.discontinued_options .pr_description');

      expect(hint?.textContent?.trim()).toBe(REASONS_HINT);
      expect(hint?.textContent).not.toContain('Description:');
    });

    it('still renders the stored reason checkboxes underneath the prompt', () => {
      const root = renderChecklistFor({ result_type_id: INNOVATION_DEVELOPMENT, phase_year: 2026, portfolio: 'P25' });

      expect(root.querySelectorAll('.discontinued_options .discontinued_option').length).toBe(1);
    });

    it('adds nothing to a 2025 Innovation Development result — the checklist renders exactly as today', () => {
      const root = renderChecklistFor({ result_type_id: INNOVATION_DEVELOPMENT, phase_year: 2025, portfolio: 'P25' });

      expect(root.querySelector('.discontinued_options')).not.toBeNull();
      expect(promptOf(root)).toBeNull();
    });

    it('adds nothing to Innovation Use, not even in the 2026 phase', () => {
      const root = renderChecklistFor({ result_type_id: INNOVATION_USE, phase_year: 2026, portfolio: 'P25' });

      expect(root.querySelector('.discontinued_options')).not.toBeNull();
      expect(promptOf(root)).toBeNull();
    });

    it('shows no prompt while the innovation is still reported as active', () => {
      const root = renderChecklistFor({ result_type_id: INNOVATION_DEVELOPMENT, phase_year: 2026, portfolio: 'P25' }, false);

      expect(root.querySelector('.discontinued_options')).toBeNull();
      expect(promptOf(root)).toBeNull();
    });
  });

  /**
   * P2-3292 Step 2 — which reason owns the free-text box.
   *
   * The template used to hardcode `investment_discontinued_option_id == 6`. The 2026 "Other" row is
   * a NEW row with an AUTO_INCREMENT id, so under the old rule its box would simply never have
   * rendered and the reporter could not have typed the reason at all. The catalogue now says so
   * itself; the id is kept only for the legacy row, which was deliberately not flagged (that would
   * have been an UPDATE on a row a 2025-phase result still renders).
   */
  describe('needsDescription()', () => {
    it('trusts the catalogue flag when the row declares it', () => {
      expect(component.needsDescription({ investment_discontinued_option_id: 46, requires_description: true })).toBe(true);
    });

    it('hides the box on a 2026 row that declares it does not need one', () => {
      expect(component.needsDescription({ investment_discontinued_option_id: 44, requires_description: false })).toBe(false);
    });

    it('still recognises the legacy "Other" row by its id', () => {
      // Row 6 of the base generation. It carries no flag on purpose.
      expect(component.needsDescription({ investment_discontinued_option_id: 6 })).toBe(true);
    });

    it('hides the box on every other legacy row', () => {
      for (const id of [1, 2, 3, 4, 5]) {
        expect(component.needsDescription({ investment_discontinued_option_id: id })).toBe(false);
      }
    });

    it('lets the flag override the legacy id in both directions', () => {
      expect(component.needsDescription({ investment_discontinued_option_id: 6, requires_description: false })).toBe(false);
    });

    it('does not throw on a missing row', () => {
      expect(component.needsDescription(undefined)).toBe(false);
      expect(component.needsDescription(null)).toBe(false);
    });

    it('renders the box for the 2026 "Other" row and for nothing else', () => {
      fixture.destroy();
      dataControlSE.currentResult = { result_type_id: INNOVATION_DEVELOPMENT, phase_year: 2026, portfolio: 'P25' };
      const rendered = TestBed.createComponent(RdAnnualUpdatingComponent);
      jest.spyOn(rendered.componentInstance.api.resultsSE, 'GET_globalNarratives').mockReturnValue(of({ response: { value: '' } }));
      rendered.componentInstance.generalInfoBody.is_discontinued = true;
      rendered.componentInstance.generalInfoBody.discontinued_options = [
        { investment_discontinued_option_id: 40, option: 'Discontinued: limited design / testing / validation progress', requires_description: false, value: false },
        { investment_discontinued_option_id: 46, option: 'Other (please specify)', requires_description: true, value: false }
      ];
      rendered.detectChanges();

      expect(rendered.nativeElement.querySelectorAll('.discontinued_option app-pr-input').length).toBe(1);
    });
  });
  /**
   * P2-3292 Step 4 — the auto-lock and the administrator's way out.
   *
   * The story asks for the record to lock the moment the reporter confirms the innovation is no
   * longer active. Taken literally that reinstates `P2-2923`, a bug QA raised and that was closed
   * as fixed, where whoever closed an innovation by mistake was trapped with no way back. Yeck's
   * decision on 3 Sep 2026: it locks, and an administrator can reopen it.
   *
   * Every case below is pinned because each one, on its own, would either put that trap back or
   * make the lock useless.
   */
  describe('Step 4 — auto-lock on discontinuation (P2-3292)', () => {
    const seed = (over: any = {}) =>
      buildFor({ result_type_id: INNOVATION_DEVELOPMENT, phase_year: 2026, portfolio: 'P25', is_discontinued: true, ...over });

    const asAdmin = (c: RdAnnualUpdatingComponent, isAdmin: boolean) => {
      Object.defineProperty(c.api.rolesSE, 'isAdmin', { get: () => isAdmin, configurable: true });
      return c;
    };

    it('locks the block on a 2026 result already stored as inactive', () => {
      const c = asAdmin(seed(), false);

      expect(c.lockedByDiscontinuation).toBe(true);
    });

    it('does NOT lock while the answer is only being edited, not stored', () => {
      // The reporter just picked "No" and has not confirmed. Reading the form instead of the stored
      // flag would lock the block that same instant and they could never tick a single reason.
      const c = asAdmin(seed({ is_discontinued: false }), false);
      c.generalInfoBody.is_discontinued = true;

      expect(c.lockedByDiscontinuation).toBe(false);
    });

    it('never locks a phase-2025 result', () => {
      const c = asAdmin(seed({ phase_year: 2025 }), false);

      expect(c.lockedByDiscontinuation).toBe(false);
    });

    it('never locks Innovation Use, not even in 2026', () => {
      const c = asAdmin(seed({ result_type_id: INNOVATION_USE }), false);

      expect(c.lockedByDiscontinuation).toBe(false);
    });

    it('leaves an administrator free to edit', () => {
      const c = asAdmin(seed(), true);

      expect(c.lockedByDiscontinuation).toBe(false);
      expect(c.canReopenDiscontinuation).toBe(true);
    });

    it('shows the reopen button to nobody but an administrator', () => {
      expect(asAdmin(seed(), false).canReopenDiscontinuation).toBe(false);
    });

    it('offers no reopen button on a result that is not stored as inactive', () => {
      expect(asAdmin(seed({ is_discontinued: false }), true).canReopenDiscontinuation).toBe(false);
    });

    it('tells the locked-out reporter who to ask, instead of showing a dead form', () => {
      expect(asAdmin(seed(), false).showDiscontinuationLockNotice).toBe(true);
      expect(asAdmin(seed(), true).showDiscontinuationLockNotice).toBe(false);
    });

    it('closes the editable escape hatch while locked', () => {
      // `annualUpdatingEditable` forces editability despite the global read-only (P2-2923), so the
      // lock is only real if it closes that too.
      const c = asAdmin(seed(), false);
      c.isPhaseOpen = true;
      Object.defineProperty(c.api.rolesSE, 'access', { get: () => ({ canDdit: true }), configurable: true });

      expect(c.annualUpdatingEditable).toBe(false);
    });

    it('reopening sets the innovation back to active and clears every ticked reason', () => {
      const c = asAdmin(seed(), true);
      c.generalInfoBody.is_discontinued = true;
      c.generalInfoBody.discontinued_options = [
        { investment_discontinued_option_id: 40, value: true, description: null },
        { investment_discontinued_option_id: 46, value: true, description: 'typed by mistake' }
      ];

      c.reopenDiscontinuation();

      expect(c.generalInfoBody.is_discontinued).toBe(false);
      // A reason left ticked under an "active" answer is a contradiction the parent would still send.
      expect(c.generalInfoBody.discontinued_options.every((o: any) => o.value === false)).toBe(true);
      expect(c.generalInfoBody.discontinued_options.every((o: any) => o.description === null)).toBe(true);
    });

    it('reopening does not throw when there are no reasons stored', () => {
      const c = asAdmin(seed(), true);
      c.generalInfoBody.discontinued_options = undefined as any;

      expect(() => c.reopenDiscontinuation()).not.toThrow();
      expect(c.generalInfoBody.is_discontinued).toBe(false);
    });
  });
});

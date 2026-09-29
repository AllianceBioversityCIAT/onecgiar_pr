import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BilateralQualityAssessmentDialogComponent } from './bilateral-quality-assessment-dialog.component';
import { BilateralQualityAssessmentView } from '../../services/bilateral-quality-assessment-ui.service';

function view(sections: BilateralQualityAssessmentView['sections'] = {}): BilateralQualityAssessmentView {
  return {
    id: 9,
    result_id: 42,
    status: 'completed',
    is_current: true,
    ai_status: 'completed',
    degraded_reason: null,
    unavailable_reason: null,
    overall: { verdict: 'red', score: 40, summary: 'This result does not meet the quality criteria.' },
    sections,
    evidence: [],
  };
}

/**
 * BIL-QAD-R-2 full inventory fixture: all five `SECTION_ORDER` sections present (one of each
 * verdict), a score, a summary, and two evidence lines — the shape the parity block (BIL-QAD-T-3)
 * asserts state by state. Dropping or rewording any string this fixture drives is exactly the
 * input the parity assertions below are written to catch.
 */
function fullView(): BilateralQualityAssessmentView {
  return {
    id: 9,
    result_id: 42,
    status: 'completed',
    is_current: true,
    ai_status: 'completed',
    degraded_reason: null,
    unavailable_reason: null,
    overall: { verdict: 'amber', score: 72, summary: 'A few sections need attention before submitting.' },
    sections: {
      general_information: {
        verdict: 'amber',
        comments: 'One point to address.',
        issues: ['Describe what was produced.'],
        strengths: [],
      },
      contributors_and_partners: {
        verdict: 'red',
        comments: 'Missing required partners.',
        issues: ['List every contributing centre.'],
        strengths: [],
      },
      geographic_location: {
        verdict: 'green',
        comments: 'Meets the criteria.',
        issues: [],
        strengths: ['Coordinates are precise.'],
      },
      evidence: { verdict: 'grey', comments: null, issues: [], strengths: [] },
      type_specific: {
        verdict: 'amber',
        comments: 'Needs one more field.',
        issues: ['Add the missing metric.'],
        strengths: [],
      },
    },
    evidence: [
      { index: 0, verdict: 'red', reason: 'The attached file could not be read.' },
      { index: 1, verdict: 'green', reason: 'The linked publication matches the claim.' },
    ],
  };
}

describe('BilateralQualityAssessmentDialogComponent', () => {
  let fixture: ComponentFixture<BilateralQualityAssessmentDialogComponent>;
  const host = () => fixture.nativeElement as HTMLElement;
  const text = () => host().textContent ?? '';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // HttpClientTestingModule: BIL-QTS-T-4 pulls in CustomFieldsModule for `app-pr-input` /
      // `app-pr-textarea`, whose dependency chain (RolesService -> AuthService) injects HttpClient.
      imports: [BilateralQualityAssessmentDialogComponent, HttpClientTestingModule],
    }).compileComponents();
    fixture = TestBed.createComponent(BilateralQualityAssessmentDialogComponent);
  });

  afterEach(() => fixture.destroy());

  describe('while the check runs', () => {
    // Installed before the first change detection: the tip interval is created by an effect that
    // runs on it, and a real interval cannot be advanced by fake timers afterwards.
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    beforeEach(() => {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('running', true);
      fixture.detectChanges();
    });

    // The window opens before any verdict exists — binding it to the assessment would leave the
    // user with nothing but the rail button for a wait that can run a minute.
    it('opens with no assessment in hand', () => {
      expect(text()).toContain('Checking quality');
      expect(host().querySelector('.bqa-dialog__progress')).toBeTruthy();
    });

    // P2-3150 AC2, in the ticket's own words. Grey is ours (contract v0.2) and is deliberate.
    it('teaches every colour the verdict can use', () => {
      expect(text()).toContain('The result meets the quality criteria.');
      expect(text()).toContain('The result is acceptable, but this is not its best version.');
      expect(text()).toContain('The result does not meet the quality criteria.');
      expect(text()).toContain('Not evaluated');
    });

    it('shows a tip and rotates it while waiting', () => {
      const first = host().querySelector('.bqa-dialog__tip')!.textContent;

      jest.advanceTimersByTime(5000);
      fixture.detectChanges();

      expect(host().querySelector('.bqa-dialog__tip')!.textContent).not.toBe(first);
    });

    // There is nothing a Cancel could undo here: the server has already claimed the row.
    it('offers no exit', () => {
      expect(host().querySelector('.pr-dialog-footer')).toBeNull();
      expect(text()).not.toContain('Make adjustments');
    });

    // BIL-QAD-T-3 — D-1 content parity, Running row of the BIL-QAD-R-2 inventory. Previously
    // ungated: the lead line had no assertion anywhere, "What the colours mean" appeared only as
    // a NEGATIVE (in the deciding-state test), and the four VERDICT_LEGEND labels were never
    // read — only their meanings (asserted above). The lead-line string below is now the
    // inventory's own full wording (requirements.md quotes it in full, no ellipsis, after the
    // 2026-09-18 correction), not scraped from the template.
    it('renders the running lead line, the "What the colours mean" heading and all four legend labels', () => {
      expect(text()).toContain('Reading the result against the quality criteria. This usually takes under a minute.');
      expect(text()).toContain('What the colours mean');

      const labels = Array.from(host().querySelectorAll('.bqa-dialog__legend .bqa-dialog__pill')) as HTMLElement[];
      expect(labels.map((el) => el.textContent?.trim())).toEqual(['Green', 'Amber', 'Red', 'Grey']);
    });
  });

  describe('once the verdict is in', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('running', false);
      fixture.componentRef.setInput('assessment', view({
        general_information: { verdict: 'amber', comments: 'One point to address.', issues: ['Describe what was produced.'], strengths: [] },
        geographic_location: { verdict: 'green', comments: 'Meets the criteria.' },
      }));
      fixture.detectChanges();
    });

    it('swaps the running view for the sections and the decision', () => {
      expect(text()).not.toContain('What the colours mean');
      expect(text()).toContain('General information');
      expect(text()).toContain('Make adjustments');
    });

    // 🛑 The panel used to render after the whole list, so the first section's feedback appeared
    // five cards below the row that opened it. It must stay inside its own card.
    it('keeps a section feedback panel inside that section card', () => {
      const card = host().querySelectorAll('.bqa-dialog__section')[0];
      expect(card.querySelector('.bqa-dialog__feedback')!.textContent).toContain('Describe what was produced.');
    });

    it('only offers the trigger on a section that has feedback to show', () => {
      const cards = host().querySelectorAll('.bqa-dialog__section');

      expect(cards[0].querySelector('.bqa-dialog__details-trigger')).toBeTruthy();
      expect(cards[1].querySelector('.bqa-dialog__details-trigger')).toBeNull();
    });

    it('expands one section at a time and reports it to assistive tech', () => {
      const trigger = host().querySelector('.bqa-dialog__details-trigger') as HTMLButtonElement;
      expect(trigger.getAttribute('aria-expanded')).toBe('false');

      trigger.click();
      fixture.detectChanges();

      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(host().querySelector('.bqa-dialog__section--open')).toBeTruthy();
      expect(trigger.textContent).toContain('Hide feedback');
    });

    // QA feedback 2026-09-18 — the reporter forgets the comment on the way to the form.
    it('offers a way into the section only where there is something to fix', () => {
      const cards = host().querySelectorAll('.bqa-dialog__section');

      // amber
      expect(cards[0].querySelector('.bqa-dialog__goto')!.textContent).toContain('Go to General information');
      // green — nothing to correct, so no dead-end trip
      expect(cards[1].querySelector('.bqa-dialog__goto')).toBeNull();
    });

    it('emits the AI section key, leaving the navigation to the creator', () => {
      const keys: string[] = [];
      fixture.componentInstance.sectionSelected.subscribe((k: string) => keys.push(k));

      (host().querySelector('.bqa-dialog__goto') as HTMLButtonElement).click();

      expect(keys).toEqual(['general_information']);
    });

    it('emits the decision the verdict calls for', () => {
      const decisions: string[] = [];
      fixture.componentInstance.decisionChosen.subscribe((d: string) => decisions.push(d));

      const buttons = Array.from(host().querySelectorAll('.pr-dialog-footer button')) as HTMLButtonElement[];
      buttons[buttons.length - 1].click();

      expect(decisions).toEqual(['submitted_anyway']);
    });
  });

  it('offers the without-check exit when the service could not answer', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('assessment', {
      ...view(),
      status: 'unavailable',
      degraded_reason: 'The model timed out.',
    });
    fixture.detectChanges();

    expect(text()).toContain('The model timed out.');
    expect(text()).toContain('Submit without quality check');
  });

  // BIL-QAD-T-3 — D-1 content parity. Each assertion is written against the full BIL-QAD-R-2
  // inventory; dropping, rewording or shortening any one of the strings below fails its assertion.
  describe('content parity — BIL-QAD-R-2 inventory', () => {
    // Mirrors the `open()` helper the guarded-exits block (D-2) already uses below — the
    // per-test delta is now just which assessment opens the drawer.
    function open(assessment: BilateralQualityAssessmentView) {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('running', false);
      fixture.componentRef.setInput('assessment', assessment);
      fixture.detectChanges();
    }

    it('renders the overall eyebrow, verdict word, score and summary', () => {
      open(fullView());

      expect(text()).toContain('Overall result');
      expect(host().querySelector('.bqa-dialog__overall strong')?.textContent).toBe('amber');
      expect(text()).toContain('72/100');
      expect(text()).toContain('A few sections need attention before submitting.');
    });

    it('falls back to the default summary copy when none is provided, and hides the score when null', () => {
      open({ ...view(), overall: { verdict: 'red', score: null, summary: null } });

      expect(text()).toContain('Review the assessment before submitting.');
      expect(host().querySelector('.bqa-dialog__score')).toBeNull();
    });

    it('renders the stale banner verbatim', () => {
      open({ ...view(), is_current: false });

      expect(host().querySelector('.bqa-dialog__stale')?.textContent).toBe(
        'This assessment predates your latest edits. It remains available as history, but you must run it again before submitting.',
      );
    });

    it('renders every section in SECTION_ORDER with its label, verdict chip and comments', () => {
      open(fullView());

      expect(text()).toContain('By section');
      const cards = host().querySelectorAll('.bqa-dialog__section');
      expect(cards.length).toBe(5);

      const expected = [
        ['General information', 'amber', 'One point to address.'],
        ['Contributors and partners', 'red', 'Missing required partners.'],
        ['Geographic location', 'green', 'Meets the criteria.'],
        ['Evidence', 'grey', null],
        ['Type-specific details', 'amber', 'Needs one more field.'],
      ] as const;

      expected.forEach(([label, verdict, comments], i) => {
        expect(cards[i].querySelector('.bqa-dialog__section-row strong')?.textContent).toBe(label);
        expect(cards[i].querySelector('.bqa-dialog__pill')?.textContent?.trim()).toBe(verdict);
        if (comments) expect(cards[i].textContent).toContain(comments);
      });
    });

    it('offers "Go to <label>" only where canNavigate, and a feedback trigger only where hasFeedback', () => {
      open(fullView());

      const cards = host().querySelectorAll('.bqa-dialog__section');
      const goto = (i: number) => cards[i].querySelector('.bqa-dialog__goto');
      const trigger = (i: number) => cards[i].querySelector('.bqa-dialog__details-trigger');

      expect(goto(0)?.textContent).toContain('Go to General information');
      expect(goto(1)?.textContent).toContain('Go to Contributors and partners');
      expect(goto(2)).toBeNull(); // green — nothing to correct
      expect(goto(3)).toBeNull(); // grey — not evaluated, a dead end
      expect(goto(4)?.textContent).toContain('Go to Type-specific details');

      expect(trigger(0)).toBeTruthy();
      expect(trigger(1)).toBeTruthy();
      expect(trigger(2)).toBeTruthy();
      expect(trigger(3)).toBeNull(); // nothing to show
      expect(trigger(4)).toBeTruthy();
    });

    it('lists every issue under "What to address" and every strength under "What is working well"', () => {
      open(fullView());

      const cards = host().querySelectorAll('.bqa-dialog__section');

      expect(cards[0].querySelector('.bqa-dialog__feedback-block--issues h5')?.textContent).toContain('What to address');
      expect(cards[0].querySelector('.bqa-dialog__feedback')?.textContent).toContain('Describe what was produced.');

      expect(cards[2].querySelector('.bqa-dialog__feedback-block--strengths h5')?.textContent).toContain('What is working well');
      expect(cards[2].querySelector('.bqa-dialog__feedback')?.textContent).toContain('Coordinates are precise.');
    });

    it('renders one evidence line per item with its verdict and reason', () => {
      open(fullView());

      expect(text()).toContain('Evidence');
      const lines = Array.from(host().querySelectorAll('.bqa-dialog__evidence')) as HTMLElement[];
      expect(lines.length).toBe(2);
      expect(lines[0].textContent).toContain('red');
      expect(lines[0].textContent).toContain('The attached file could not be read.');
      expect(lines[1].textContent).toContain('green');
      expect(lines[1].textContent).toContain('The linked publication matches the claim.');
    });

    it('shows the unavailable title and the default reason when none is provided', () => {
      open({ ...view(), status: 'unavailable', degraded_reason: null });

      expect(host().querySelector('.pr-dialog-header-title')?.textContent).toBe('Quality check unavailable');
      expect(text()).toContain('The quality service could not complete this check. You may submit without it.');
    });

    it('labels the footer actions exactly — Make adjustments and Submit for review', () => {
      open(view());

      const buttons = Array.from(host().querySelectorAll('.pr-dialog-footer button')) as HTMLButtonElement[];
      expect(buttons[0].textContent?.trim()).toBe('Make adjustments');
      expect(buttons[1].textContent?.trim()).toContain('Submit for review');
    });
  });

  // BIL-QAD-T-3 — D-2 behaviour drift at the gate: the three dismissal doors (BIL-QAD-R-3), the
  // running/submitting guard (BIL-QAD-R-4, amended 2026-09-18) and the amended footer state
  // (BIL-QAD-AC-4b). The two `.pr-dialog-footer` selectors above (running/deciding) already
  // resolved against the class that survives on the re-laid-out footer — see the completion report.
  describe('guarded exits — BIL-QAD-R-1, R-3, R-4', () => {
    function open(overrides: Partial<{ running: boolean; submitting: boolean }> = {}) {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('running', overrides.running ?? false);
      fixture.componentRef.setInput('submitting', overrides.submitting ?? false);
      fixture.componentRef.setInput('assessment', view());
      fixture.detectChanges();
    }

    function pressEscape() {
      const panel = host().querySelector('[data-testid="bqa-dialog-panel"]') as HTMLElement;
      panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
    }

    function clickScrim() {
      (host().querySelector('[data-testid="bqa-dialog-scrim"]') as HTMLElement).click();
      fixture.detectChanges();
    }

    it('renders a scrim and a labelled modal dialog, not app-pr-dialog', () => {
      open();

      expect(host().querySelector('[data-testid="bqa-dialog-scrim"]')).toBeTruthy();
      const panel = host().querySelector('[data-testid="bqa-dialog-panel"]');
      expect(panel?.getAttribute('role')).toBe('dialog');
      expect(panel?.getAttribute('aria-modal')).toBe('true');
      expect(host().querySelector('app-pr-dialog')).toBeNull();
    });

    it('dismisses on scrim click, with no submission', () => {
      open();
      let dismissedCount = 0;
      fixture.componentInstance.dismissed.subscribe(() => dismissedCount++);

      clickScrim();

      expect(dismissedCount).toBe(1);
    });

    it('dismisses on Escape, with no submission', () => {
      open();
      let dismissedCount = 0;
      fixture.componentInstance.dismissed.subscribe(() => dismissedCount++);

      pressEscape();

      expect(dismissedCount).toBe(1);
    });

    it('dismisses on the ✕ control, with no submission', () => {
      open();
      let dismissedCount = 0;
      fixture.componentInstance.dismissed.subscribe(() => dismissedCount++);

      (host().querySelector('[data-testid="bqa-dialog-close"]') as HTMLElement).click();

      expect(dismissedCount).toBe(1);
    });

    // Input that fails this: an unguarded requestClose() — a shell that forwards Escape/scrim
    // clicks to `dismissed` regardless of state emits here, and the assertion below catches it.
    it('ignores Escape and the scrim while the check runs, and renders no close control', () => {
      open({ running: true });
      let dismissedCount = 0;
      fixture.componentInstance.dismissed.subscribe(() => dismissedCount++);

      expect(host().querySelector('[data-testid="bqa-dialog-close"]')).toBeNull();
      pressEscape();
      clickScrim();

      expect(dismissedCount).toBe(0);
    });

    it('ignores Escape and the scrim while the submit is in flight, and renders no close control', () => {
      open({ submitting: true });
      let dismissedCount = 0;
      fixture.componentInstance.dismissed.subscribe(() => dismissedCount++);

      expect(host().querySelector('[data-testid="bqa-dialog-close"]')).toBeNull();
      pressEscape();
      clickScrim();

      expect(dismissedCount).toBe(0);
    });

    // BIL-QAD-AC-4b, amended 2026-09-18: unlike `running()`, the footer stays present while
    // submitting — with the primary button busy. Input that fails this: a footer still gated on
    // `!running() && !submitting()` (the pre-amendment reading) renders no footer here; dropping
    // `aria-busy` or the "Submitting…" label off the primary button fails the two assertions below.
    //
    // ⚠️ NOT asserted here: `[disabled]="submitting()"` on the footer buttons — present in the
    // template (`bilateral-quality-assessment-dialog.component.html`, both footer buttons) but
    // structurally unobservable under Jest. `tests/mocks/spartanBrainMock.ts`'s `BrnButton` stub
    // (which `@spartan-ng/brain/button` resolves to via `moduleNameMapper`) declares `disabled` as
    // a bare `@Input()` with no host bindings — confirmed by direct reproduction: an isolated
    // `[disabled]="true"` binding through this stub sets neither the `disabled` DOM property nor
    // any `data-*`/`aria-*` attribute, so no DOM query can distinguish a disabled button from an
    // enabled one here. Same caveat the mock file already documents for `BrnDialog`/`BrnPopover`/
    // `BrnCommand`. This is `BIL-QAD-T-4`'s to confirm in a real browser, not a gap this task can
    // close without touching a shared mock outside this task's one-file scope.
    it('keeps the footer present, with the primary button busy, while submitting', () => {
      open({ submitting: true });

      const footer = host().querySelector('.pr-dialog-footer');
      expect(footer).toBeTruthy();

      const buttons = Array.from(footer!.querySelectorAll('button')) as HTMLButtonElement[];
      expect(buttons.length).toBeGreaterThan(0);

      const primary = buttons[buttons.length - 1];
      expect(primary.getAttribute('aria-busy')).toBe('true');
      expect(primary.textContent).toContain('Submitting…');
    });
  });

  // QSG-T-2 — QSG-R-5, `QSG-DD-5`. A submitted result (status outside Editing/Draft) reopens the
  // drawer read-only: no footer, no stale line; ✕ still closes. Falsifier per tasks.md `QSG-T-2`:
  // renders the real template with a completed assessment and `readOnly: true`.
  describe('read-only — QSG-R-5', () => {
    function open(overrides: Partial<{ readOnly: boolean; assessment: BilateralQualityAssessmentView }> = {}) {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('running', false);
      fixture.componentRef.setInput('readOnly', overrides.readOnly ?? true);
      fixture.componentRef.setInput('assessment', overrides.assessment ?? fullView());
      fixture.detectChanges();
    }

    it('renders no footer action buttons when read-only, but keeps the ✕ close control', () => {
      open();

      const buttons = Array.from(host().querySelectorAll('button')) as HTMLButtonElement[];
      expect(buttons.some((b) => b.textContent?.trim() === 'Make adjustments')).toBe(false);
      expect(buttons.some((b) => b.textContent?.includes('Submit for review'))).toBe(false);
      expect(host().querySelector('.pr-dialog-footer')).toBeNull();
      expect(host().querySelector('[data-testid="bqa-dialog-close"]')).toBeTruthy();
    });

    it('renders no stale line when read-only, even on a non-current row', () => {
      open({ assessment: { ...fullView(), is_current: false } });

      expect(host().querySelector('.bqa-dialog__stale')).toBeNull();
    });

    // Regression for `dialog.component.spec.ts:336-340` (now shifted by this describe block) — the
    // new input's default (`false`) must not affect the editable case.
    it('still renders both footer buttons when not read-only', () => {
      open({ readOnly: false, assessment: view() });

      const buttons = Array.from(host().querySelectorAll('.pr-dialog-footer button')) as HTMLButtonElement[];
      expect(buttons[0].textContent?.trim()).toBe('Make adjustments');
      expect(buttons[1].textContent?.trim()).toContain('Submit for review');
    });
  });

  // BIL-QAD-T-3 — D-6, BIL-QAD-DD-3. The component is mounted by the creator under
  // `@if (!isCreating())`, not under `visible()` — open/close is a signal transition on a
  // persisting instance, not a construct/destroy cycle, so the fixture exercises that same
  // transition rather than `fixture.destroy()`. Input that fails this: the naive blank-and-reset
  // implementation (`document.body.style.overflow = ''` on close) — it would restore '', not
  // 'hidden'.
  describe('body scroll lock — BIL-QAD-DD-3 / D-6', () => {
    afterEach(() => {
      document.body.style.overflow = '';
    });

    it('restores the value captured on open — not a blank string — when the drawer closes via the visible() transition the app actually uses', () => {
      document.body.style.overflow = 'hidden'; // simulates another dialog already holding the lock

      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('running', false);
      fixture.componentRef.setInput('assessment', view());
      fixture.detectChanges();

      fixture.componentRef.setInput('visible', false);
      fixture.detectChanges();

      expect(document.body.style.overflow).toBe('hidden');
    });

    // Reviewer FAIL remediation — the case above alone passes identically for a leak (sets
    // 'hidden', never restores) and for no lock at all (the effect deleted): the body already
    // read 'hidden' before either implementation ran. Starting from a clean baseline separates
    // all three failure modes between this case and the one above:
    //   • no lock engages      → caught HERE (first assertion: overflow would still be '')
    //   • leak (never restores) → caught HERE (second assertion: overflow would still be 'hidden')
    //   • blank-and-reset       → caught by the case ABOVE (it restores '' instead of 'hidden')
    it('engages the lock on open and releases it back to the pre-open value, from a clean baseline', () => {
      document.body.style.overflow = '';

      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('running', false);
      fixture.componentRef.setInput('assessment', view());
      fixture.detectChanges();

      expect(document.body.style.overflow).toBe('hidden');

      fixture.componentRef.setInput('visible', false);
      fixture.detectChanges();

      expect(document.body.style.overflow).toBe('');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // BIL-QTS-T-4 — GI edit block in the drawer
  // ══════════════════════════════════════════════════════════════════════════════════════════

  /** A GI-flagged, fully-editable, idle assessment — the one happy-path row every other row in
   * the truth table below deviates from by exactly one dimension. */
  function giView(overrides: {
    verdict?: 'green' | 'amber' | 'red' | 'grey';
    status?: 'completed' | 'unavailable' | 'skipped_kp_rule';
    isCurrent?: boolean;
    suggestions?: { title?: string; description?: string };
    comments?: string | null;
    issues?: string[];
  } = {}): BilateralQualityAssessmentView {
    return {
      ...view({
        general_information: {
          verdict: overrides.verdict ?? 'amber',
          comments: overrides.comments ?? null,
          issues: overrides.issues ?? [],
          strengths: [],
          ...(overrides.suggestions ? { suggestions: overrides.suggestions } : {}),
        },
      }),
      status: overrides.status ?? 'completed',
      is_current: overrides.isCurrent ?? true,
    };
  }

  describe('BIL-QTS-T-4 — canEditGi truth table (BIL-QTS-R-1)', () => {
    function open(input: {
      verdict?: 'green' | 'amber' | 'red' | 'grey';
      status?: 'completed' | 'unavailable' | 'skipped_kp_rule';
      editable?: boolean;
      running?: boolean;
      submitting?: boolean;
      resultTypeId?: number | null;
      suggestions?: { title?: string };
    }) {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('running', input.running ?? false);
      fixture.componentRef.setInput('submitting', input.submitting ?? false);
      fixture.componentRef.setInput('editable', input.editable ?? true);
      fixture.componentRef.setInput('resultTypeId', input.resultTypeId ?? 1);
      fixture.componentRef.setInput(
        'assessment',
        giView({ verdict: input.verdict, status: input.status, suggestions: input.suggestions }),
      );
      fixture.detectChanges();
    }

    it('shows the fields: amber + completed + editable + idle + non-KP', () => {
      open({ verdict: 'amber' });
      expect(fixture.componentInstance.canEditGi()).toBe(true);
    });

    it('shows the fields for red too', () => {
      open({ verdict: 'red' });
      expect(fixture.componentInstance.canEditGi()).toBe(true);
    });

    // The mutation-sensitivity row: otherwise identical to the amber happy path, but with a
    // green GI verdict AND a valid suggestion attached. Mutating the verdict condition inside
    // `canEditGi` to also accept 'green' flips this row's `canEditGi()` to `true` AND makes
    // `titleSuggestion()` non-null — either assertion below turns red on that mutation.
    it('hides the fields — and any suggestion — for a green GI verdict, even with a valid suggestion attached', () => {
      open({ verdict: 'green', suggestions: { title: 'A perfectly valid suggested title' } });
      expect(fixture.componentInstance.canEditGi()).toBe(false);
      expect(fixture.componentInstance.titleSuggestion()).toBeNull();
    });

    it('hides the fields for a grey GI verdict', () => {
      open({ verdict: 'grey' });
      expect(fixture.componentInstance.canEditGi()).toBe(false);
    });

    it('hides the fields when the assessment status is unavailable', () => {
      open({ status: 'unavailable' });
      expect(fixture.componentInstance.canEditGi()).toBe(false);
    });

    it('hides the fields when the assessment status is skipped_kp_rule', () => {
      open({ status: 'skipped_kp_rule' });
      expect(fixture.componentInstance.canEditGi()).toBe(false);
    });

    it('hides the fields when the result is not editable', () => {
      open({ editable: false });
      expect(fixture.componentInstance.canEditGi()).toBe(false);
    });

    it('hides the fields while the check is running', () => {
      open({ running: true });
      expect(fixture.componentInstance.canEditGi()).toBe(false);
    });

    it('hides the fields while a submit is in flight', () => {
      open({ submitting: true });
      expect(fixture.componentInstance.canEditGi()).toBe(false);
    });

    it('hides the fields for a Knowledge Product result', () => {
      open({ resultTypeId: 6 });
      expect(fixture.componentInstance.canEditGi()).toBe(false);
    });
  });

  describe('BIL-QTS-T-4 — Amber GI keeps the existing card content (BIL-QTS-R-1)', () => {
    it('Amber GI: renders the edit fields alongside the unchanged pill, comments, See feedback and Go to General information', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('editable', true);
      fixture.componentRef.setInput(
        'assessment',
        giView({ comments: 'Needs a stronger title.', issues: ['Say what changed.'] }),
      );
      fixture.detectChanges();

      const card = host().querySelector('.bqa-dialog__section')!;
      expect(card.querySelector('.bqa-dialog__pill')?.textContent?.trim()).toBe('amber');
      expect(card.textContent).toContain('Needs a stronger title.');
      expect(card.querySelector('.bqa-dialog__goto')?.textContent).toContain('Go to General information');
      expect(card.querySelector('.bqa-dialog__details-trigger')).toBeTruthy();
      expect(card.querySelector('[data-testid="bqa-dialog-gi-edit"]')).toBeTruthy();
    });

    it('Not flagged: no edit affordance on any section card when GI is green — including a red non-GI card', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('editable', true);
      fixture.componentRef.setInput('assessment', view({
        general_information: { verdict: 'green', comments: null, issues: [], strengths: [] },
        contributors_and_partners: { verdict: 'red', comments: null, issues: [], strengths: [] },
      }));
      fixture.detectChanges();

      expect(host().querySelector('[data-testid="bqa-dialog-gi-edit"]')).toBeNull();
      const contributorsCard = Array.from(host().querySelectorAll('.bqa-dialog__section'))
        .find((c) => c.textContent?.includes('Contributors'));
      expect(contributorsCard?.querySelector('[data-testid="bqa-dialog-gi-edit"]')).toBeFalsy();
    });
  });

  describe('BIL-QTS-T-4 — usable suggestions render with Apply (BIL-QTS-R-3)', () => {
    function open(overrides: { suggestions?: { title?: string; description?: string }; currentTitle?: string } = {}) {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('editable', true);
      fixture.componentRef.setInput('currentTitle', overrides.currentTitle ?? 'Existing title');
      fixture.componentRef.setInput('assessment', giView({ suggestions: overrides.suggestions }));
      fixture.detectChanges();
    }

    it('No suggestion: shows no suggestion block and no placeholder text for either field', () => {
      open();
      expect(host().querySelector('[data-testid="gi-suggestion-title"]')).toBeNull();
      expect(host().querySelector('[data-testid="gi-suggestion-description"]')).toBeNull();
      expect(text().toLowerCase()).not.toContain('no suggestion available');
    });

    it('Apply: sets the draft to the suggestion text and emits nothing', () => {
      open({ suggestions: { title: 'AI suggested title' } });
      let emitted = 0;
      fixture.componentInstance.giFieldSaveRequested.subscribe(() => emitted++);

      (host().querySelector('[data-testid="gi-suggestion-title-apply"]') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(fixture.componentInstance.draftTitle()).toBe('AI suggested title');
      expect(emitted).toBe(0);
    });

    it('Already applied: shows the Applied state, not the Apply action, once the draft equals the suggestion', () => {
      open({ suggestions: { title: 'AI suggested title' } });

      (host().querySelector('[data-testid="gi-suggestion-title-apply"]') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(host().querySelector('[data-testid="gi-suggestion-title-applied"]')).toBeTruthy();
      expect(host().querySelector('[data-testid="gi-suggestion-title-apply"]')).toBeNull();
    });

    it('renders a suggestion containing markup as literal text, never as an element', () => {
      open({ suggestions: { title: 'A <b>bold</b> title' } });

      const node = host().querySelector('[data-testid="gi-suggestion-title"] p')!;
      expect(node.querySelector('b')).toBeNull();
      expect(node.textContent).toContain('<b>bold</b>');
    });

    it('BIL-QTS-R-10: preserves "\\n" as-is in the rendered suggestion text (white-space: pre-line handles the visual break)', () => {
      open({ suggestions: { title: 'Line one\nLine two' } });

      const node = host().querySelector('[data-testid="gi-suggestion-title"] p')!;
      expect(node.textContent).toBe('Line one\nLine two');
    });

    // Reviewer FAIL issue 3: the block's only marker was an `aria-hidden` lightbulb, and two
    // fields each had a button named only "Apply" / only "Save" — indistinguishable to a screen
    // reader user tabbing through the drawer's controls.
    it('labels the block as an AI suggestion, and gives Apply/Save field-specific accessible names', () => {
      open({ suggestions: { title: 'AI suggested title' } });

      expect(host().querySelector('[data-testid="gi-suggestion-title"]')?.textContent).toContain('AI suggestion');

      const applyTitle = host().querySelector('[data-testid="gi-suggestion-title-apply"]') as HTMLButtonElement;
      expect(applyTitle.getAttribute('aria-label')).toBe('Apply suggested title');

      const saveTitle = host().querySelector('[data-testid="bqa-dialog-save-title"]') as HTMLButtonElement;
      expect(saveTitle.getAttribute('aria-label')).toBe('Save title');

      const saveDescription = host().querySelector('[data-testid="bqa-dialog-save-description"]') as HTMLButtonElement;
      expect(saveDescription.getAttribute('aria-label')).toBe('Save description');
    });
  });

  describe('BIL-QTS-T-4 — Save (BIL-QTS-R-2)', () => {
    function open(currentTitle = 'Saved title') {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('editable', true);
      fixture.componentRef.setInput('currentTitle', currentTitle);
      fixture.componentRef.setInput('assessment', giView());
      fixture.detectChanges();
    }

    it('Save emits giFieldSaveRequested with the field and the current draft when valid and dirty', () => {
      open();
      fixture.componentInstance.draftTitle.set('A corrected title');
      fixture.detectChanges();

      const emitted: Array<{ field: string; value: string }> = [];
      fixture.componentInstance.giFieldSaveRequested.subscribe((e) => emitted.push(e));
      (host().querySelector('[data-testid="bqa-dialog-save-title"]') as HTMLButtonElement).click();

      expect(emitted).toEqual([{ field: 'title', value: 'A corrected title' }]);
    });

    it('Invalid value: an empty/whitespace-only title disables Save and does not send the request', () => {
      open();
      fixture.componentInstance.draftTitle.set('   ');
      fixture.detectChanges();

      let emitted = 0;
      fixture.componentInstance.giFieldSaveRequested.subscribe(() => emitted++);
      (host().querySelector('[data-testid="bqa-dialog-save-title"]') as HTMLButtonElement).click();

      expect(fixture.componentInstance.canSaveTitle()).toBe(false);
      expect(emitted).toBe(0);
    });

    it('Invalid value: a title over 30 words disables Save and does not send the request', () => {
      open();
      const thirtyOneWords = Array.from({ length: 31 }, (_, i) => `word${i}`).join(' ');
      fixture.componentInstance.draftTitle.set(thirtyOneWords);
      fixture.detectChanges();

      let emitted = 0;
      fixture.componentInstance.giFieldSaveRequested.subscribe(() => emitted++);
      (host().querySelector('[data-testid="bqa-dialog-save-title"]') as HTMLButtonElement).click();

      expect(fixture.componentInstance.canSaveTitle()).toBe(false);
      expect(emitted).toBe(0);
    });

    it('Invalid value: a description over 300 words disables Save and does not send the request', () => {
      open();
      const threeHundredOneWords = Array.from({ length: 301 }, (_, i) => `word${i}`).join(' ');
      fixture.componentInstance.draftDescription.set(threeHundredOneWords);
      fixture.detectChanges();

      let emitted = 0;
      fixture.componentInstance.giFieldSaveRequested.subscribe(() => emitted++);
      (host().querySelector('[data-testid="bqa-dialog-save-description"]') as HTMLButtonElement).click();

      expect(fixture.componentInstance.canSaveDescription()).toBe(false);
      expect(emitted).toBe(0);
    });

    // Field-side half of "Save fails" — rewritten per the Reviewer's remediation (issue 1) in
    // T-5's OWN order: DD-3 has the creator write `creationService.resultTitle` (→ `currentTitle`)
    // BEFORE the flush settles, for a failed save exactly as much as for a successful one. Attempt
    // 1's version asserted the opposite ("a failed save never changes currentTitle"), which
    // contradicted T-5 and let `canSaveTitle` go permanently false the instant Save was pressed.
    // This fixture reproduces that exact order and proves `canSaveTitle()` survives it: mutating
    // `titleDirty`/`savedTitle` back to comparing against `currentTitle()` turns this red, because
    // `currentTitle` already equals the draft by the time `savingField` clears.
    it('Save fails (field-side half): Save stays enabled even though the creator already wrote the draft into currentTitle before the flush (DD-3)', () => {
      open();
      fixture.componentInstance.draftTitle.set('Retry this title');
      fixture.detectChanges();

      // T-5 step 1 (design.md §6.2 flow): the creator writes the draft into `creationService`
      // — and so into this component's `currentTitle` input — BEFORE it even starts the flush.
      fixture.componentRef.setInput('currentTitle', 'Retry this title');
      fixture.componentRef.setInput('savingField', 'title');
      fixture.detectChanges();

      // The flush fails: `savingField` clears, but no `lastSaveResult.ok` ever arrives for this
      // attempt — the saved baseline never moves, so the field stays dirty against it.
      fixture.componentRef.setInput('savingField', null);
      fixture.detectChanges();

      expect(fixture.componentInstance.draftTitle()).toBe('Retry this title');
      expect(fixture.componentInstance.canSaveTitle()).toBe(true);
    });

    // The three prefill claims the Reviewer found unproven (issue 2): deleting the seeding effect
    // leaves every OTHER spec in this file green, because they either set the draft by hand or
    // leave `currentTitle` at its default `''`. These three fail without it.
    it('R-1 prefill: the draft holds the form current value on open, and Save starts disabled', () => {
      fixture.componentRef.setInput('currentTitle', 'Existing form title');
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('editable', true);
      fixture.componentRef.setInput('assessment', giView());
      fixture.detectChanges();

      expect(fixture.componentInstance.draftTitle()).toBe('Existing form title');
      expect(fixture.componentInstance.canSaveTitle()).toBe(false);
    });

    it('reseeds the draft from the current value when the drawer is closed and reopened over a dirty, unsaved edit', () => {
      fixture.componentRef.setInput('currentTitle', 'Saved title');
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('editable', true);
      fixture.componentRef.setInput('assessment', giView());
      fixture.detectChanges();

      fixture.componentInstance.draftTitle.set('Unsaved edit, never sent');
      fixture.detectChanges();
      expect(fixture.componentInstance.canSaveTitle()).toBe(true); // sanity: it really was dirty

      fixture.componentRef.setInput('visible', false);
      fixture.detectChanges();
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      expect(fixture.componentInstance.draftTitle()).toBe('Saved title');
      expect(fixture.componentInstance.canSaveTitle()).toBe(false);
    });

    it('R-3 Apply: once the suggestion becomes the draft, Save enables', () => {
      fixture.componentRef.setInput('currentTitle', 'Existing title');
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('editable', true);
      fixture.componentRef.setInput('assessment', giView({ suggestions: { title: 'AI suggested title' } }));
      fixture.detectChanges();

      expect(fixture.componentInstance.canSaveTitle()).toBe(false);

      (host().querySelector('[data-testid="gi-suggestion-title-apply"]') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(fixture.componentInstance.canSaveTitle()).toBe(true);
    });
  });

  // Reviewer FAIL (attempt 2), issue 1: `settleSaveResult` read `draftTitle()`/`draftDescription()`
  // TRACKED inside the effect, so once `lastSaveResult` was `{ok:true}` for a field, every later
  // keystroke on that field re-ran the effect and dragged the saved baseline along with it — Save
  // could never re-enable and the unsaved-changes guard could never fire again. design.md §6.1
  // (amended 2026-09-29, T-4 attempt 3): the baseline moves only on `lastSaveResult.ok`, to the
  // value THAT SAVE EMITTED (`saveTitle()`/`saveDescription()` record it), never to whatever the
  // draft happens to hold when the effect settles.
  describe('BIL-QTS-T-4 — save-result baseline settle is insensitive to later keystrokes (Reviewer FAIL issue 1)', () => {
    function openGi() {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('editable', true);
      fixture.componentRef.setInput('currentTitle', 'Saved title');
      fixture.componentRef.setInput('currentDescription', 'Saved description');
      fixture.componentRef.setInput('assessment', giView());
      fixture.detectChanges();
    }

    it('title (a): after Save "A" settles ok, Save disables', () => {
      openGi();
      fixture.componentInstance.draftTitle.set('A');
      fixture.detectChanges();
      fixture.componentInstance.saveTitle();
      fixture.componentRef.setInput('lastSaveResult', { field: 'title', ok: true, seq: 1 });
      fixture.detectChanges();

      expect(fixture.componentInstance.canSaveTitle()).toBe(false);
    });

    it('title (b): a further edit to "B" re-enables Save and requestClose() shows the unsaved strip', () => {
      openGi();
      fixture.componentInstance.draftTitle.set('A');
      fixture.detectChanges();
      fixture.componentInstance.saveTitle();
      fixture.componentRef.setInput('lastSaveResult', { field: 'title', ok: true, seq: 1 });
      fixture.detectChanges();

      fixture.componentInstance.draftTitle.set('B');
      fixture.detectChanges();

      expect(fixture.componentInstance.canSaveTitle()).toBe(true);

      fixture.componentInstance.requestClose();
      fixture.detectChanges();
      expect(fixture.componentInstance.pendingExit()).toEqual({ kind: 'dismiss' });
    });

    it('title (c): a keystroke while the save is still in flight is not adopted as the baseline once it settles ok', () => {
      openGi();
      fixture.componentInstance.draftTitle.set('A');
      fixture.detectChanges();
      fixture.componentInstance.saveTitle(); // records the emitted value ('A') for this save
      fixture.componentRef.setInput('savingField', 'title');
      fixture.detectChanges();

      fixture.componentInstance.draftTitle.set('B'); // typed while the save is in flight
      fixture.detectChanges();

      fixture.componentRef.setInput('savingField', null);
      fixture.componentRef.setInput('lastSaveResult', { field: 'title', ok: true, seq: 2 });
      fixture.detectChanges();

      expect(fixture.componentInstance.savedTitle()).toBe('A');
      expect(fixture.componentInstance.titleDirty()).toBe(true);
      expect(fixture.componentInstance.canSaveTitle()).toBe(true);
    });

    it('title (d): a failed save leaves the baseline untouched and Save enabled', () => {
      openGi();
      fixture.componentInstance.draftTitle.set('A');
      fixture.detectChanges();
      fixture.componentInstance.saveTitle();
      fixture.componentRef.setInput('lastSaveResult', { field: 'title', ok: false, seq: 1 });
      fixture.detectChanges();

      expect(fixture.componentInstance.savedTitle()).toBe('Saved title');
      expect(fixture.componentInstance.canSaveTitle()).toBe(true);
    });

    it('description (a): after Save "A" settles ok, Save disables', () => {
      openGi();
      fixture.componentInstance.draftDescription.set('A');
      fixture.detectChanges();
      fixture.componentInstance.saveDescription();
      fixture.componentRef.setInput('lastSaveResult', { field: 'description', ok: true, seq: 1 });
      fixture.detectChanges();

      expect(fixture.componentInstance.canSaveDescription()).toBe(false);
    });

    it('description (b): a further edit to "B" re-enables Save and requestClose() shows the unsaved strip', () => {
      openGi();
      fixture.componentInstance.draftDescription.set('A');
      fixture.detectChanges();
      fixture.componentInstance.saveDescription();
      fixture.componentRef.setInput('lastSaveResult', { field: 'description', ok: true, seq: 1 });
      fixture.detectChanges();

      fixture.componentInstance.draftDescription.set('B');
      fixture.detectChanges();

      expect(fixture.componentInstance.canSaveDescription()).toBe(true);

      fixture.componentInstance.requestClose();
      fixture.detectChanges();
      expect(fixture.componentInstance.pendingExit()).toEqual({ kind: 'dismiss' });
    });

    it('description (c): a keystroke while the save is still in flight is not adopted as the baseline once it settles ok', () => {
      openGi();
      fixture.componentInstance.draftDescription.set('A');
      fixture.detectChanges();
      fixture.componentInstance.saveDescription(); // records the emitted value ('A') for this save
      fixture.componentRef.setInput('savingField', 'description');
      fixture.detectChanges();

      fixture.componentInstance.draftDescription.set('B'); // typed while the save is in flight
      fixture.detectChanges();

      fixture.componentRef.setInput('savingField', null);
      fixture.componentRef.setInput('lastSaveResult', { field: 'description', ok: true, seq: 2 });
      fixture.detectChanges();

      expect(fixture.componentInstance.savedDescription()).toBe('A');
      expect(fixture.componentInstance.descriptionDirty()).toBe(true);
      expect(fixture.componentInstance.canSaveDescription()).toBe(true);
    });

    it('description (d): a failed save leaves the baseline untouched and Save enabled', () => {
      openGi();
      fixture.componentInstance.draftDescription.set('A');
      fixture.detectChanges();
      fixture.componentInstance.saveDescription();
      fixture.componentRef.setInput('lastSaveResult', { field: 'description', ok: false, seq: 1 });
      fixture.detectChanges();

      expect(fixture.componentInstance.savedDescription()).toBe('Saved description');
      expect(fixture.componentInstance.canSaveDescription()).toBe(true);
    });
  });

  describe('BIL-QTS-T-4 — stale footer offers Check again, never Submit (BIL-QTS-R-4)', () => {
    it('After a save / Stale for another reason: renders Check again and no submit action while stale', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('assessment', giView({ isCurrent: false }));
      fixture.detectChanges();

      expect(host().querySelector('[data-testid="bqa-dialog-recheck"]')).toBeTruthy();
      const footerButtons = Array.from(host().querySelectorAll('.pr-dialog-footer button')) as HTMLButtonElement[];
      expect(footerButtons.some((b) => b.textContent?.includes('Submit for review'))).toBe(false);
    });

    it('while stale, the GI fields stay editable so the user can still edit and save the other field', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('editable', true);
      fixture.componentRef.setInput('assessment', giView({ isCurrent: false }));
      fixture.detectChanges();

      expect(fixture.componentInstance.canEditGi()).toBe(true);
      expect(host().querySelector('[data-testid="bqa-dialog-gi-edit"]')).toBeTruthy();
    });

    it('Check again emits recheckRequested — never a submission — when nothing is unsaved', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('assessment', giView({ isCurrent: false }));
      fixture.detectChanges();

      let recheckCount = 0;
      let decisionCount = 0;
      fixture.componentInstance.recheckRequested.subscribe(() => recheckCount++);
      fixture.componentInstance.decisionChosen.subscribe(() => decisionCount++);

      (host().querySelector('[data-testid="bqa-dialog-recheck"]') as HTMLButtonElement).click();

      expect(recheckCount).toBe(1);
      expect(decisionCount).toBe(0);
    });
  });

  describe('BIL-QTS-T-4 — unsaved-changes guard on every exit door (BIL-QTS-R-5)', () => {
    function openWithDirtyTitle(stale = false) {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('editable', true);
      fixture.componentRef.setInput('currentTitle', 'Saved title');
      fixture.componentRef.setInput('assessment', giView({ isCurrent: !stale }));
      fixture.detectChanges();
      fixture.componentInstance.draftTitle.set('Edited title');
      fixture.detectChanges();
    }

    it('dirty field + Make adjustments: the strip shows and dismissed is not emitted until Discard', () => {
      openWithDirtyTitle();
      let dismissedCount = 0;
      fixture.componentInstance.dismissed.subscribe(() => dismissedCount++);

      const buttons = Array.from(host().querySelectorAll('.pr-dialog-footer button')) as HTMLButtonElement[];
      buttons[0].click(); // Make adjustments
      fixture.detectChanges();

      expect(host().querySelector('[data-testid="bqa-dialog-unsaved-strip"]')).toBeTruthy();
      expect(dismissedCount).toBe(0);

      (host().querySelector('[data-testid="bqa-dialog-discard"]') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(dismissedCount).toBe(1);
    });

    it('Keep editing dismisses the strip without discarding the draft or emitting anything', () => {
      openWithDirtyTitle();
      let dismissedCount = 0;
      fixture.componentInstance.dismissed.subscribe(() => dismissedCount++);

      const buttons = Array.from(host().querySelectorAll('.pr-dialog-footer button')) as HTMLButtonElement[];
      buttons[0].click();
      fixture.detectChanges();

      (host().querySelector('[data-testid="bqa-dialog-keep-editing"]') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(host().querySelector('[data-testid="bqa-dialog-unsaved-strip"]')).toBeNull();
      expect(dismissedCount).toBe(0);
      expect(fixture.componentInstance.draftTitle()).toBe('Edited title');
    });

    it('Escape routes through the same guard as Make adjustments', () => {
      openWithDirtyTitle();
      let dismissedCount = 0;
      fixture.componentInstance.dismissed.subscribe(() => dismissedCount++);

      const panel = host().querySelector('[data-testid="bqa-dialog-panel"]') as HTMLElement;
      panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();

      expect(dismissedCount).toBe(0);
      expect(host().querySelector('[data-testid="bqa-dialog-unsaved-strip"]')).toBeTruthy();
    });

    it('Go to <section> routes through the guard too, and sectionSelected is withheld', () => {
      openWithDirtyTitle();
      const keys: string[] = [];
      fixture.componentInstance.sectionSelected.subscribe((k) => keys.push(k));

      (host().querySelector('.bqa-dialog__goto') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(keys.length).toBe(0);
      expect(host().querySelector('[data-testid="bqa-dialog-unsaved-strip"]')).toBeTruthy();
    });

    it('Check again on a stale, dirty drawer shows the strip first; recheckRequested only fires after Discard', () => {
      openWithDirtyTitle(true);
      let count = 0;
      fixture.componentInstance.recheckRequested.subscribe(() => count++);

      (host().querySelector('[data-testid="bqa-dialog-recheck"]') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(count).toBe(0);
      expect(host().querySelector('[data-testid="bqa-dialog-unsaved-strip"]')).toBeTruthy();

      (host().querySelector('[data-testid="bqa-dialog-discard"]') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(count).toBe(1);
    });
  });

  describe('BIL-QTS-T-4 — accessibility', () => {
    it('announces the drawer-initiated save state via an aria-live region', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('editable', true);
      fixture.componentRef.setInput('assessment', giView());
      fixture.componentRef.setInput('savingField', 'title');
      fixture.detectChanges();

      const region = host().querySelector('[data-testid="bqa-dialog-gi-save-status"]');
      expect(region?.getAttribute('aria-live')).toBe('polite');
      expect(region?.textContent).toContain('Saving title');
    });

    // Reviewer FAIL issue 4: save OUTCOMES (not just the busy state) were never announced — the
    // live region only ever said "Saving…". Leader adjudication: the drawer announces the outcome
    // itself, driven by `lastSaveResult` (design.md §6.1's amended input).
    it('announces a successful drawer save via the aria-live region', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('editable', true);
      fixture.componentRef.setInput('assessment', giView());
      fixture.componentRef.setInput('lastSaveResult', { field: 'title', ok: true, seq: 1 });
      fixture.detectChanges();

      const region = host().querySelector('[data-testid="bqa-dialog-gi-save-status"]');
      expect(region?.getAttribute('aria-live')).toBe('polite');
      expect(region?.textContent).toContain('Title saved');
    });

    it('announces a failed drawer save via the aria-live region', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('editable', true);
      fixture.componentRef.setInput('assessment', giView());
      fixture.componentRef.setInput('lastSaveResult', { field: 'description', ok: false, seq: 1 });
      fixture.detectChanges();

      const region = host().querySelector('[data-testid="bqa-dialog-gi-save-status"]');
      expect(region?.textContent).toContain('Description not saved');
    });

    // Reviewer advisory: pressing the same busy Save button again mid-flight should not disturb
    // the outcome the region already reported for a DIFFERENT settled attempt.
    it('a busy save takes over the region even after a prior outcome was announced', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('editable', true);
      fixture.componentRef.setInput('assessment', giView());
      fixture.componentRef.setInput('lastSaveResult', { field: 'title', ok: false, seq: 1 });
      fixture.detectChanges();

      fixture.componentRef.setInput('savingField', 'title');
      fixture.detectChanges();

      const region = host().querySelector('[data-testid="bqa-dialog-gi-save-status"]');
      expect(region?.textContent).toContain('Saving title');
    });
  });

  describe('BIL-QTS-T-4 — advisory: strip focus and re-entrancy', () => {
    function openDirty() {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('editable', true);
      fixture.componentRef.setInput('currentTitle', 'Saved title');
      fixture.componentRef.setInput('assessment', giView());
      fixture.detectChanges();
      fixture.componentInstance.draftTitle.set('Edited title');
      fixture.detectChanges();
    }

    it('moves focus onto Keep editing the moment the unsaved strip replaces the footer', async () => {
      openDirty();

      (host().querySelector('[data-testid="bqa-dialog-panel"] .pr-dialog-footer button') as HTMLButtonElement).click(); // Make adjustments
      fixture.detectChanges();
      await fixture.whenStable(); // `afterNextRender` fires on the next render, not synchronously

      expect(document.activeElement).toBe(host().querySelector('[data-testid="bqa-dialog-keep-editing"]'));
    });

    it('ignores a second exit request (Go to) while the unsaved strip is already showing', () => {
      openDirty();
      const keys: string[] = [];
      fixture.componentInstance.sectionSelected.subscribe((k) => keys.push(k));

      fixture.componentInstance.requestClose(); // shows the strip
      fixture.detectChanges();
      fixture.componentInstance.requestGoTo('general_information'); // must no-op, not overwrite it
      fixture.detectChanges();

      expect(keys.length).toBe(0);
      expect(fixture.componentInstance.pendingExit()?.kind).toBe('dismiss');
    });

    it('clears a captured exit intent when the drawer closes from the host side', () => {
      openDirty();
      fixture.componentInstance.requestClose();
      fixture.detectChanges();
      expect(fixture.componentInstance.pendingExit()).not.toBeNull();

      fixture.componentRef.setInput('visible', false);
      fixture.detectChanges();

      expect(fixture.componentInstance.pendingExit()).toBeNull();
    });
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
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
      imports: [BilateralQualityAssessmentDialogComponent],
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
});

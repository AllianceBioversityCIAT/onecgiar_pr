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
});

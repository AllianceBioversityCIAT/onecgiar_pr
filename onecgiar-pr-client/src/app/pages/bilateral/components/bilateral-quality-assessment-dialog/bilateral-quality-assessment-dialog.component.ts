import { ChangeDetectionStrategy, Component, Injector, afterNextRender, computed, effect, inject, input, output, signal } from '@angular/core';
import { HlmButton } from '@spartan/button';
import { PrDialogComponent } from '../../../../shared/components/pr-dialog/pr-dialog.component';
import { BilateralQualityAssessmentView } from '../../services/bilateral-quality-assessment-ui.service';

@Component({
  selector: 'app-bilateral-quality-assessment-dialog',
  imports: [PrDialogComponent, HlmButton],
  templateUrl: './bilateral-quality-assessment-dialog.component.html',
  styleUrl: './bilateral-quality-assessment-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BilateralQualityAssessmentDialogComponent {
  private static readonly SECTION_ORDER = [
    'general_information',
    'contributors_and_partners',
    'geographic_location',
    'evidence',
    'type_specific',
  ] as const;
  /**
   * The four meanings the user is about to read, in the ticket's own words (P2-3150 AC2). Grey is
   * not in AC2 because contract v0.2 added it after the ticket was written — but the user does see
   * it (an unreadable evidence file, a result type with no type-specific fields), so leaving it out
   * of the legend would leave the one colour nobody can guess unexplained.
   */
  static readonly VERDICT_LEGEND = [
    { verdict: 'green', label: 'Green', meaning: 'The result meets the quality criteria.' },
    { verdict: 'amber', label: 'Amber', meaning: 'The result is acceptable, but this is not its best version.' },
    { verdict: 'red', label: 'Red', meaning: 'The result does not meet the quality criteria.' },
    { verdict: 'grey', label: 'Grey', meaning: 'Not evaluated — there was nothing to assess in that section.' },
  ] as const;

  /** Rotated while the user waits. Each one answers a question the verdict window raises. */
  private static readonly TIPS = [
    'The check reads your saved draft — anything you have not saved yet is not part of it.',
    'Every section is judged on its own. The overall verdict is the AI reading them together.',
    'A red verdict never blocks you: you can still submit, and the decision is recorded.',
  ] as const;

  readonly assessment = input<BilateralQualityAssessmentView | null>(null);
  readonly visible = input(false);
  /** True while the AI call is in flight — the window opens on this, before any verdict exists. */
  readonly running = input(false);
  /** The dialog stays open through the submit PATCH, so it owns the busy state of its own buttons. */
  readonly submitting = input(false);
  readonly dismissed = output<void>();
  readonly decisionChosen = output<'submitted_anyway' | 'submitted_without_check'>();

  readonly unavailable = computed(() => this.assessment()?.status === 'unavailable');
  readonly verdict = computed(() => this.assessment()?.overall?.verdict ?? 'grey');
  readonly title = computed(() => this.unavailable() ? 'Quality check unavailable' : 'Quality assessment');
  readonly primaryLabel = computed(() => this.unavailable() ? 'Submit without quality check' : 'Submit for review');
  readonly stale = computed(() => this.assessment()?.is_current === false);
  private static readonly SECTION_LABELS: Record<string, string> = {
    general_information: 'General information',
    contributors_and_partners: 'Contributors and partners',
    geographic_location: 'Geographic location',
    evidence: 'Evidence',
    type_specific: 'Type-specific details',
  };

  /**
   * Flattened once here rather than in the template: the row needs to know whether it has anything
   * to expand (`hasFeedback`) before it renders its trigger, and the panel needs a stable id for
   * `aria-controls`. Keyed by the section key, not the label, so a copy change cannot collapse the
   * open panel.
   */
  readonly sectionEntries = computed(() => {
    const sections = this.assessment()?.sections ?? {};
    return BilateralQualityAssessmentDialogComponent.SECTION_ORDER
      .filter((key) => !!sections[key])
      .map((key) => {
        const section = sections[key];
        const issues = section.issues ?? [];
        const strengths = section.strengths ?? [];
        return {
          key,
          label: BilateralQualityAssessmentDialogComponent.SECTION_LABELS[key],
          verdict: section.verdict,
          comments: section.comments ?? null,
          issues,
          strengths,
          hasFeedback: issues.length + strengths.length > 0,
          panelId: `bqa-feedback-${key}`,
        };
      });
  });
  readonly evidence = computed(() => this.assessment()?.evidence ?? []);
  readonly expandedSection = signal<string | null>(null);

  private readonly injector = inject(Injector);

  readonly legend = BilateralQualityAssessmentDialogComponent.VERDICT_LEGEND;
  readonly tipIndex = signal(0);
  readonly tip = computed(() => BilateralQualityAssessmentDialogComponent.TIPS[this.tipIndex()]);

  private readonly rotateTips = effect((onCleanup) => {
    if (!this.running()) {
      this.tipIndex.set(0);
      return;
    }
    const id = setInterval(
      () => this.tipIndex.update((i) => (i + 1) % BilateralQualityAssessmentDialogComponent.TIPS.length),
      5000,
    );
    onCleanup(() => clearInterval(id));
  });

  toggleSection(key: string, trigger: EventTarget | null): void {
    const opening = this.expandedSection() !== key;
    this.expandedSection.set(opening ? key : null);
    if (!opening) return;

    // The panel opens below the fold of the dialog's own scroller, so without this the card grows
    // out of sight and the click looks like it did nothing. `block: 'nearest'` scrolls the minimum
    // needed — a card already fully visible does not move at all.
    const card = (trigger as HTMLElement | null)?.closest('article');
    if (!card) return;
    afterNextRender(
      () => {
        const panel = card.querySelector('.bqa-dialog__feedback-wrap');
        const reveal = () => card.scrollIntoView({ block: 'nearest', behavior: this.scrollBehavior() });
        // Scrolling on the render frame would measure the card at its COLLAPSED height — the row is
        // still 0fr — and conclude nothing needs to move. Wait for the reveal to land first.
        if (panel) panel.addEventListener('transitionend', reveal, { once: true });
        else reveal();
      },
      { injector: this.injector },
    );
  }

  /** Hard UI rule 6: every motion collapses to nothing when the user asked for less of it. */
  private scrollBehavior(): ScrollBehavior {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  }
}

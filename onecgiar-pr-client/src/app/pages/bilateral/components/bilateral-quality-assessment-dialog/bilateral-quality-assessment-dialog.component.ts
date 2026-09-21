import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Injector,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { HlmButton } from '@spartan/button';
import { BilateralQualityAssessmentView } from '../../services/bilateral-quality-assessment-ui.service';

// Shell geometry (BIL-QAD-R-7, R-9) — mirrors `bilateral-create-drawer`'s constants (DD-2: copied,
// not shared).
const DEFAULT_WIDTH = 760;
const MIN_WIDTH = 520;
const MAX_WIDTH = 900;
const MOBILE_BREAKPOINT = 640;

function initialWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_WIDTH;
  const vw = window.innerWidth;
  if (vw < MOBILE_BREAKPOINT) return vw;
  return Math.min(DEFAULT_WIDTH, vw);
}

function clampWidth(next: number): number {
  const vw = typeof window === 'undefined' ? 1440 : window.innerWidth;
  if (vw < MOBILE_BREAKPOINT) return vw;
  return Math.min(Math.max(next, MIN_WIDTH), Math.min(MAX_WIDTH, vw));
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

@Component({
  selector: 'app-bilateral-quality-assessment-dialog',
  imports: [HlmButton],
  templateUrl: './bilateral-quality-assessment-dialog.component.html',
  styleUrl: './bilateral-quality-assessment-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BilateralQualityAssessmentDialogComponent implements OnDestroy {
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
  /** The AI section key the reporter wants to go and fix. The creator owns the navigation. */
  readonly sectionSelected = output<string>();
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
          // Only where there is something to fix. Green has nothing to correct, and grey means the
          // AI could not evaluate it — sending the reporter there would be a dead end. Widening
          // this to green is a one-verdict change if it is ever wanted.
          canNavigate: section.verdict === 'amber' || section.verdict === 'red',
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

  // ── Shell mechanics (BIL-QAD-T-1 / design.md §6.3) — copied from `bilateral-create-drawer`,
  // not shared (BIL-QAD-DD-2). The component itself is never destroyed by the creator (it is
  // gated on `!isCreating()`, not on `visible()`), so open/close is a signal transition, not a
  // construction/destruction lifecycle — unlike the exemplar's `restoreFocusTarget` input, we
  // capture `document.activeElement` ourselves on open.
  readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  readonly width = signal(initialWidth());
  readonly isMobile = signal(typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT);

  private dragging = false;
  private locked = false;
  private previousBodyOverflow = '';
  private previousActiveElement: HTMLElement | null = null;

  private readonly manageOpenState = effect(() => {
    if (this.visible()) {
      this.lockOpen();
    } else {
      this.releaseOpen();
    }
  });

  ngOnDestroy(): void {
    // Safety net if the component itself is torn down while still open (e.g. a route change) —
    // does not double-restore: `releaseOpen` is a no-op once `locked` is already false.
    this.releaseOpen();
  }

  /** Scrim click, ✕ and Escape all funnel through here (BIL-QAD-R-3, R-4). */
  requestClose(): void {
    if (this.running() || this.submitting()) return;
    this.dismissed.emit();
  }

  // Angular types `$event` as the base `Event` for a dotted key filter like `keydown.tab` — cast
  // to `KeyboardEvent` internally rather than widening the public signature.
  onTabKey(domEvent: Event): void {
    const event = domEvent as KeyboardEvent;
    const root = this.panel()?.nativeElement;
    if (!root) return;
    const focusable = this.getFocusable(root);
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
    if (event.shiftKey) {
      if (active === first || !active || !focusable.includes(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !active || !focusable.includes(active)) {
      event.preventDefault();
      first.focus();
    }
  }

  startResize(event: MouseEvent): void {
    if (this.isMobile()) return;
    event.preventDefault();
    this.dragging = true;

    const move = (e: MouseEvent) => {
      if (!this.dragging) return;
      this.width.set(clampWidth(window.innerWidth - e.clientX));
    };
    const up = () => {
      this.dragging = false;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    const mobile = window.innerWidth < MOBILE_BREAKPOINT;
    this.isMobile.set(mobile);
    this.width.set(mobile ? window.innerWidth : clampWidth(this.width()));
  }

  private lockOpen(): void {
    if (this.locked) return;
    this.locked = true;
    if (typeof document !== 'undefined') {
      this.previousActiveElement = document.activeElement as HTMLElement | null;
      this.previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    afterNextRender(() => this.focusPanel(), { injector: this.injector });
  }

  /**
   * BIL-QAD-DD-3: restore the value captured on open, never blank-and-reset. `app-pr-dialog`'s
   * own lock is ref-counted for stacked dialogs — a naive `overflow = ''` here would unlock the
   * page out from under another dialog still mounted over the creator.
   */
  private releaseOpen(): void {
    if (!this.locked) return;
    this.locked = false;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = this.previousBodyOverflow;
    }
    const target = this.previousActiveElement;
    this.previousActiveElement = null;
    if (target?.focus) {
      setTimeout(() => target.focus(), 0);
    }
  }

  private focusPanel(): void {
    const root = this.panel()?.nativeElement;
    if (!root) return;
    const focusable = this.getFocusable(root);
    (focusable[0] ?? root).focus();
  }

  private getFocusable(root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  }

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

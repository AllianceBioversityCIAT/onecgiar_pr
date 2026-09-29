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
  untracked,
  viewChild,
} from '@angular/core';
import { HlmButton } from '@spartan/button';
import { BilateralQualityAssessmentView } from '../../services/bilateral-quality-assessment-ui.service';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { WordCounterService } from '../../../../shared/services/word-counter.service';

// Shell geometry (BIL-QAD-R-7, R-9) — mirrors `bilateral-create-drawer`'s constants (DD-2: copied,
// not shared).
const DEFAULT_WIDTH = 760;
const MIN_WIDTH = 520;
const MAX_WIDTH = 900;
const MOBILE_BREAKPOINT = 640;

/**
 * `ResultTypeEnum.KNOWLEDGE_PRODUCT` (server: `onecgiar-pr-server/src/shared/constants/result-type.enum.ts`).
 * The client has no shared `ResultTypeEnum` (see `section-geography.component.ts`'s own note), so
 * the id is duplicated here rather than invented as a new shared file out of this task's scope.
 */
const KNOWLEDGE_PRODUCT_RESULT_TYPE_ID = 6;

/** A pending exit the unsaved-changes guard (`BIL-QTS-R-5`, design.md §6.3) intercepted. */
type PendingGiExit = { kind: 'dismiss' } | { kind: 'goto'; sectionKey: string } | { kind: 'recheck' };

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
  imports: [HlmButton, CustomFieldsModule],
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

  // ── GI edit block (BIL-QTS-T-4 / design.md §6.1) ──────────────────────────────────────────
  /** The creator passes `!isFormReadOnly()` — the same gate the rest of the form locks on. */
  readonly editable = input(false);
  /** The form's CURRENT title/description — not necessarily the saved value (design.md §6.1
   * "Correction to requirements.md R-1"): the two differ only over unsaved form edits. */
  readonly currentTitle = input('');
  readonly currentDescription = input('');
  /** Which GI field the creator is persisting right now, if any. Drives the Save button's busy
   * state; `null` means no drawer-initiated save is in flight. */
  readonly savingField = input<'title' | 'description' | null>(null);
  /** `ResultTypeEnum` id of the result. Used only to exclude Knowledge Products (`BIL-QTS-R-1`). */
  readonly resultTypeId = input<number | null>(null);
  /** How the creator's most recent drawer-initiated save settled (design.md §6.1, execute-time
   * correction 2026-09-29). `seq` increments per save so two equal outcomes in a row still count
   * as a fresh event. Drives both the saved-baseline move (`settleSaveResult`) and the aria-live
   * announcement — never `currentTitle`/`currentDescription`, which the creator writes BEFORE the
   * flush settles (`BIL-QTS-DD-3`) and so cannot tell a failed save from a successful one. */
  readonly lastSaveResult = input<{ field: 'title' | 'description'; ok: boolean; seq: number } | null>(null);

  readonly giFieldSaveRequested = output<{ field: 'title' | 'description'; value: string }>();
  /** `BIL-QTS-DD-4`: named for what it does (re-check), not for what it reuses (`submitResult()`,
   * which never submits) — the creator wires this to that call, not to the actual submit path. */
  readonly recheckRequested = output<void>();

  private readonly wordCounter = inject(WordCounterService);

  readonly draftTitle = signal('');
  readonly draftDescription = signal('');
  /**
   * Per-field "last known good" baseline (design.md §6.1, execute-time correction 2026-09-29).
   * Seeded together with the drafts whenever the drawer opens, and moved to the draft **only**
   * when `lastSaveResult.ok` fires for that field (`settleSaveResult` below) — never merely
   * because `currentTitle()`/`currentDescription()` changed. That distinction is load-bearing:
   * the creator writes `creationService.resultTitle`/`Description` BEFORE the flush settles
   * (`BIL-QTS-DD-3`), so `currentTitle()` already equals the draft the instant Save is pressed —
   * a `dirty` computed straight off `currentTitle` goes false before the save has even settled,
   * and stays false if it then fails. That was attempt 1's reviewer-caught bug.
   */
  readonly savedTitle = signal('');
  readonly savedDescription = signal('');

  /**
   * The exact value each field's most recent drawer-initiated Save emitted (design.md §6.1,
   * amended 2026-09-29, T-4 attempt 3). `settleSaveResult` reads these — never the live draft —
   * when a save settles ok, so text typed after Save was pressed (while the save is still in
   * flight) is never mistaken for what that save actually persisted.
   */
  private readonly pendingSavedTitle = signal<string | null>(null);
  private readonly pendingSavedDescription = signal<string | null>(null);

  private wasVisible = false;

  /**
   * The GI draft/baseline lifecycle lives in one effect so its two triggers can never drift apart:
   * opening the drawer (re)seeds both the draft and the baseline from the form's current values
   * (design.md §6.1's corrected R-1 reading — the prefill is the form's CURRENT value, not
   * "saved"); closing it drops any unsaved-changes strip the host side may have left showing
   * (Reviewer advisory) instead of leaving it to reappear stale on the next open. Deliberately NOT
   * keyed on `currentTitle()`/`currentDescription()` alone — see `savedTitle`'s doc comment above.
   */
  private readonly manageGiDraftLifecycle = effect(() => {
    const isVisible = this.visible();
    if (isVisible && !this.wasVisible) {
      this.draftTitle.set(this.currentTitle());
      this.savedTitle.set(this.currentTitle());
      this.draftDescription.set(this.currentDescription());
      this.savedDescription.set(this.currentDescription());
    } else if (!isVisible && this.wasVisible) {
      this.pendingExit.set(null);
    }
    this.wasVisible = isVisible;
  });

  /**
   * Moves a field's saved baseline to the value THAT SAVE EMITTED, only once the creator reports
   * that exact save succeeded (design.md §6.1, amended 2026-09-29, T-4 attempt 3). A failed save
   * (or one still in flight) never touches it — that is what keeps `titleDirty`/`descriptionDirty`
   * correct under DD-3's write-before-flush order.
   *
   * `lastSaveResult()` is the ONLY tracked read in this effect — deliberately. Attempt 2 also read
   * `draftTitle()`/`draftDescription()` inside the effect body, which Angular then tracks: once
   * `lastSaveResult` was `{ok:true}` for a field, every later keystroke on that field re-ran the
   * effect and dragged the baseline along with the live draft, so Save could never re-enable
   * (Reviewer FAIL, attempt 2, issue 1). Reading `pendingSavedTitle`/`pendingSavedDescription`
   * through `untracked()` keeps them out of the dependency set entirely, so only a genuinely new
   * `lastSaveResult` (a fresh save settling) can move the baseline — never a keystroke.
   */
  private readonly settleSaveResult = effect(() => {
    const result = this.lastSaveResult();
    if (!result?.ok) return;
    untracked(() => {
      if (result.field === 'title') {
        const value = this.pendingSavedTitle();
        if (value !== null) this.savedTitle.set(value);
      } else {
        const value = this.pendingSavedDescription();
        if (value !== null) this.savedDescription.set(value);
      }
    });
  });

  /** Announces the drawer-initiated save lifecycle in the `aria-live` region (NFR Accessibility,
   * Reviewer issue 4): busy while a save is in flight, then the outcome once `lastSaveResult`
   * reports it. */
  readonly saveStatusAnnouncement = computed(() => {
    const saving = this.savingField();
    if (saving === 'title') return 'Saving title…';
    if (saving === 'description') return 'Saving description…';
    const result = this.lastSaveResult();
    if (!result) return '';
    const label = result.field === 'title' ? 'Title' : 'Description';
    return result.ok ? `${label} saved.` : `${label} not saved. Try again.`;
  });

  private readonly giSection = computed(() => this.assessment()?.sections?.['general_information'] ?? null);
  private readonly giVerdict = computed(() => this.giSection()?.verdict ?? null);

  /**
   * design.md §6.1: `editable && status === 'completed' && GI verdict ∈ {amber, red} && !running
   * && !submitting && resultType ≠ KP`. Every clause is load-bearing for `BIL-QTS-R-1`'s scenarios
   * (Amber GI / Not flagged / Not editable, including the KP and running/submitting halves) — see
   * the truth-table spec.
   */
  readonly canEditGi = computed(() => {
    if (!this.editable()) return false;
    if (this.assessment()?.status !== 'completed') return false;
    const verdict = this.giVerdict();
    if (verdict !== 'amber' && verdict !== 'red') return false;
    if (this.running() || this.submitting()) return false;
    if (this.resultTypeId() === KNOWLEDGE_PRODUCT_RESULT_TYPE_ID) return false;
    return true;
  });

  readonly titleDirty = computed(() => this.draftTitle() !== this.savedTitle());
  readonly descriptionDirty = computed(() => this.draftDescription() !== this.savedDescription());
  /** Names the first dirty field for the unsaved-changes copy (`BIL-QTS-R-5`). Title is checked
   * first only to pick a stable, single field name when both happen to be dirty at once — the
   * requirement's copy names one field, not a list. */
  readonly dirtyFieldLabel = computed(() => {
    if (this.titleDirty()) return 'Title';
    if (this.descriptionDirty()) return 'Description';
    return null;
  });
  readonly hasUnsavedGiEdits = computed(() => this.dirtyFieldLabel() !== null);

  /**
   * Usable suggestions (`BIL-QTS-R-3`) only ever render alongside the fields they suggest for —
   * gating on `canEditGi()` is what keeps a suggestion from appearing on a green/grey/KP/read-only
   * card. Shape validity itself is the server's job (`BIL-QTS-DD-6`); the client only reads what
   * survived sanitization.
   */
  readonly titleSuggestion = computed(() => (this.canEditGi() ? (this.giSection()?.suggestions?.title ?? null) : null));
  readonly descriptionSuggestion = computed(() => (this.canEditGi() ? (this.giSection()?.suggestions?.description ?? null) : null));
  /** "Already applied" (`BIL-QTS-R-3`): the field's CURRENT (draft) value equals the suggestion. */
  readonly titleApplied = computed(() => {
    const suggestion = this.titleSuggestion();
    return suggestion !== null && this.draftTitle() === suggestion;
  });
  readonly descriptionApplied = computed(() => {
    const suggestion = this.descriptionSuggestion();
    return suggestion !== null && this.draftDescription() === suggestion;
  });

  readonly titleWordCount = computed(() => this.wordCounter.counter(this.draftTitle()));
  readonly descriptionWordCount = computed(() => this.wordCounter.counter(this.draftDescription()));

  /** Required, not the draft placeholder, and within the form's own 30-word limit (`BIL-QTS-R-2`
   * Invalid value). Mirrors `section-general-info.component.ts`'s `isPlaceholderTitle` — duplicated
   * rather than imported: that method is private to the form section, and this dialog is a
   * separate component tree (this task's scope is this folder only). */
  readonly titleValid = computed(() => {
    const trimmed = this.draftTitle().trim();
    if (!trimmed || this.isPlaceholderTitle(trimmed)) return false;
    return this.titleWordCount() <= 30;
  });
  /** No emptiness rule for Description — `BIL-QTS-R-2`'s Invalid-value scenario lists only the
   * word limits and the Title's own required/placeholder check. */
  readonly descriptionValid = computed(() => this.descriptionWordCount() <= 300);

  readonly canSaveTitle = computed(() => this.titleDirty() && this.titleValid() && this.savingField() !== 'title');
  readonly canSaveDescription = computed(() => this.descriptionDirty() && this.descriptionValid() && this.savingField() !== 'description');

  /** The unsaved-changes guard's captured intent (`BIL-QTS-R-5` / design.md §6.3). `null` means no
   * strip is showing and every exit door acts immediately. */
  readonly pendingExit = signal<PendingGiExit | null>(null);
  /** The strip's own "Keep editing" button — the safer of its two actions, and the one the
   * Reviewer's advisory asks to receive focus the moment the strip replaces the footer. Focus
   * management itself lives further down, alongside `injector` (`focusKeepEditingOnStrip`). */
  readonly keepEditingBtn = viewChild<ElementRef<HTMLButtonElement>>('keepEditingBtn');

  private isPlaceholderTitle(title: string): boolean {
    return /^Bilateral Draft #\d+$/.test(title);
  }

  applyTitleSuggestion(): void {
    const suggestion = this.titleSuggestion();
    if (suggestion === null) return;
    this.draftTitle.set(suggestion);
  }

  applyDescriptionSuggestion(): void {
    const suggestion = this.descriptionSuggestion();
    if (suggestion === null) return;
    this.draftDescription.set(suggestion);
  }

  saveTitle(): void {
    if (!this.canSaveTitle()) return;
    const value = this.draftTitle();
    this.pendingSavedTitle.set(value);
    this.giFieldSaveRequested.emit({ field: 'title', value });
  }

  saveDescription(): void {
    if (!this.canSaveDescription()) return;
    const value = this.draftDescription();
    this.pendingSavedDescription.set(value);
    this.giFieldSaveRequested.emit({ field: 'description', value });
  }

  /** Routes the exit through the unsaved-changes guard when a GI field is dirty (`BIL-QTS-R-5`).
   * Reviewer advisory: a no-op while the strip is already showing — the body's own "Go to" links
   * stay clickable behind it, and silently swapping the captured intent out from under the user
   * would be more confusing than just ignoring the second request. */
  requestGoTo(sectionKey: string): void {
    if (this.pendingExit()) return;
    if (this.hasUnsavedGiEdits()) {
      this.pendingExit.set({ kind: 'goto', sectionKey });
      return;
    }
    this.sectionSelected.emit(sectionKey);
  }

  /** `BIL-QTS-DD-4`: reuses the rail's Submit-for-review path (guards, running state, the new
   * verdict), never the actual submit — see `recheckRequested`'s own doc comment. */
  requestRecheck(): void {
    if (this.pendingExit()) return;
    if (this.hasUnsavedGiEdits()) {
      this.pendingExit.set({ kind: 'recheck' });
      return;
    }
    this.recheckRequested.emit();
  }

  keepEditing(): void {
    this.pendingExit.set(null);
  }

  /** Discards the drafts back to the last SAVED baseline (never `currentTitle`/`currentDescription`
   * — those can already hold an in-flight, not-yet-settled save under DD-3), then carries out
   * whichever exit the guard had intercepted. */
  discardPendingExit(): void {
    const exit = this.pendingExit();
    if (!exit) return;
    this.pendingExit.set(null);
    this.draftTitle.set(this.savedTitle());
    this.draftDescription.set(this.savedDescription());
    if (exit.kind === 'dismiss') this.dismissed.emit();
    else if (exit.kind === 'goto') this.sectionSelected.emit(exit.sectionKey);
    else this.recheckRequested.emit();
  }

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

  /** Reviewer advisory: moves focus onto "Keep editing" — the safer of the strip's two actions —
   * the moment a dirty exit intercepts into the unsaved-changes strip (`BIL-QTS-R-5`). Deferred to
   * `afterNextRender` because the strip's button does not exist in the DOM until the `@if` that
   * follows `pendingExit()` turning non-null has actually rendered. */
  private readonly focusKeepEditingOnStrip = effect(() => {
    if (!this.pendingExit()) return;
    afterNextRender(() => this.keepEditingBtn()?.nativeElement.focus(), { injector: this.injector });
  });

  ngOnDestroy(): void {
    // Safety net if the component itself is torn down while still open (e.g. a route change) —
    // does not double-restore: `releaseOpen` is a no-op once `locked` is already false.
    this.releaseOpen();
  }

  /**
   * Scrim click, ✕, Escape and — since `BIL-QTS-T-4` — the "Make adjustments" footer button all
   * funnel through here (BIL-QAD-R-3, R-4). Now also the unsaved-changes guard's first stop
   * (`BIL-QTS-R-5`): a dirty GI field intercepts the exit into the confirm strip instead of closing.
   */
  requestClose(): void {
    if (this.pendingExit()) return;
    if (this.running() || this.submitting()) return;
    if (this.hasUnsavedGiEdits()) {
      this.pendingExit.set({ kind: 'dismiss' });
      return;
    }
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

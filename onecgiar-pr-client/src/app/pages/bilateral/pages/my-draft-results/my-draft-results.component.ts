import { Component, inject, OnInit, OnDestroy, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HlmButton } from '@spartan/button';
import { PrDialogComponent } from '../../../../shared/components/pr-dialog/pr-dialog.component';
import { PrFilterSelectComponent } from '../../../../shared/components/pr-filter-select/pr-filter-select.component';
import { PrTooltipDirectiveModule } from '../../../../shared/directives/pr-tooltip-directive.module';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralAiDraft } from '../../services/bilateral-ai.interfaces';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BILATERAL_STATUS } from '../../services/bilateral-creation.service';
import { BilateralPageHeaderComponent } from '../../components/bilateral-page-header/bilateral-page-header.component';
import { DraftResultCardComponent } from '../bilateral-ai-draft-detail/components/draft-result-card/draft-result-card.component';
import { DraftEvidenceListComponent } from '../bilateral-ai-draft-detail/components/draft-evidence-list/draft-evidence-list.component';
import {
  DraftProjectFilterOption,
  MyDraftResultsFilterService,
  normalizeProjectId,
} from './services/my-draft-results-filter.service';

/**
 * P2-3169 AC2 — the `result` relation the drafts endpoint returns next to every draft.
 * `GET /api/bilateral/center/ai/drafts` loads it explicitly
 * (`onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai.service.ts:192-202`,
 * `relations: { job: true, result: true }`), and the row is the one the AI pipeline stamped with
 * the level/type/status it inferred (same file, `createDraftFromCandidate` at :397-410).
 *
 * ⚠️ Declared here and read through a cast because `BilateralAiDraft`
 * (`pages/bilateral/services/bilateral-ai.interfaces.ts`) does not model this relation yet, and
 * that file is outside this feature folder. Move it there when the interface is next touched.
 * TypeORM serialises both ids as strings for `bigint`/`int` columns, hence the widened type.
 */
interface DraftResultRelation {
  result_level_id?: number | string | null;
  status_id?: number | string | null;
}

/**
 * `result.result_level_id` → the "output or outcome" wording AC2 asks for. Same catalogue the
 * sibling `bilateral-result-level-selector` offers when a user creates a result by hand
 * (`components/bilateral-result-level-selector/bilateral-result-level-selector.component.ts:3-6`)
 * and the same ids the server's `TYPE_BY_INDICATOR` map stamps onto AI drafts
 * (`onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai.service.ts:37-48`).
 * Duplicated rather than imported because that selector keeps its list private.
 */
const RESULT_LEVEL_LABELS: Record<number, string> = {
  3: 'Outcome',
  4: 'Output',
};

/**
 * `result.status_id` → label, keyed by the shared `BILATERAL_STATUS` catalogue so the wording and
 * the ids stay in step with the results list and the page header. In practice every draft in this
 * list is `Draft` (8): promoting and declining both flip `is_discarded`, which drops the draft out
 * of the endpoint's `where` clause — but the label is read from the payload rather than hardcoded
 * so a status change on the server surfaces here instead of silently reading "Draft".
 */
const DRAFT_STATUS_LABELS: Record<number, string> = {
  [BILATERAL_STATUS.Draft]: 'Draft',
  [BILATERAL_STATUS.Editing]: 'Editing',
  [BILATERAL_STATUS.PendingReview]: 'Pending review',
  [BILATERAL_STATUS.Approved]: 'Approved',
  [BILATERAL_STATUS.Rejected]: 'Rejected',
};

/** Status ids that get their own chip colour; anything else falls back to the neutral one. */
const DRAFT_STATUS_MODIFIERS: Record<number, string> = {
  [BILATERAL_STATUS.Draft]: 'mdr-status--draft',
  [BILATERAL_STATUS.Editing]: 'mdr-status--editing',
  [BILATERAL_STATUS.PendingReview]: 'mdr-status--pending',
  [BILATERAL_STATUS.Approved]: 'mdr-status--approved',
  [BILATERAL_STATUS.Rejected]: 'mdr-status--rejected',
};

@Component({
  selector: 'app-my-draft-results',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HlmButton,
    PrDialogComponent,
    PrFilterSelectComponent,
    BilateralPageHeaderComponent,
    DraftResultCardComponent,
    DraftEvidenceListComponent,
    PrTooltipDirectiveModule,
  ],
  // P2-3319 — the filter is per-visit: provided here so it resets on leaving the tab or switching
  // centre, never in root (project ids are meaningless across centres).
  providers: [MyDraftResultsFilterService],
  templateUrl: './my-draft-results.component.html',
  styleUrl: './my-draft-results.component.scss',
})
export class MyDraftResultsComponent implements OnInit, OnDestroy {
  readonly bilateralAiService = inject(BilateralAiService);
  readonly ctx = inject(BilateralContextService);
  readonly filter = inject(MyDraftResultsFilterService);

  /**
   * P2-3316: plain-language notes for the three card actions. End users could not tell
   * Review / Promote / Delete apart from the labels alone, so each one states what happens
   * to the draft after the click. Wording matches the real behaviour, not the button name:
   * Review only opens the read-only preview aside, Promote creates the actual result and
   * navigates to it, Delete removes the draft for good.
   */
  readonly reviewTooltip =
    'Preview everything the AI extracted from your files, next to the source evidence it used. Nothing is saved or created — the draft stays in this list.';
  readonly promoteTooltip =
    'Turn this draft into a real bilateral result. You will be asked to confirm first; after that the draft leaves this list and the new result opens for you to complete.';
  readonly deleteTooltip =
    'Delete this draft and everything the AI extracted from it. You will be asked to confirm first, and it cannot be undone.';

  promoteTarget = signal<BilateralAiDraft | null>(null);
  discardTarget = signal<BilateralAiDraft | null>(null);
  selectedDraft = signal<BilateralAiDraft | null>(null);

  constructor() {
    effect(() => {
      document.body.style.overflow = this.selectedDraft() ? 'hidden' : '';
    });
  }

  ngOnInit(): void {
    this.bilateralAiService.loadAllDrafts();
  }

  // ── P2-3319 · Filter by project ───────────────────────────────────────
  /**
   * Every draft the centre has, filter ignored. Kept apart from `drafts` so the page can tell
   * "this centre has no drafts" (empty state + CTA) from "the filter hid them all" (clear button).
   */
  readonly allDrafts = computed<BilateralAiDraft[]>(() => this.bilateralAiService.draftList());

  /** What the list actually renders. */
  readonly drafts = computed<BilateralAiDraft[]>(() => this.filter.filterDrafts(this.allDrafts()));

  readonly hasAnyDrafts = computed<boolean>(() => this.allDrafts().length > 0);
  readonly hasDrafts = computed<boolean>(() => this.drafts().length > 0);

  /** The centre has drafts, but none of them belong to the selected project. */
  readonly isFilteredEmpty = computed<boolean>(() => this.hasAnyDrafts() && !this.hasDrafts());

  /**
   * One option per project that actually appears in this centre's drafts — building it from the
   * loaded list rather than from the full CLARISA catalogue means the dropdown can never offer a
   * project that would empty the page. Labelled through `projectNameMap()` (the same lookup the
   * card and the promote dialog use) and falling back to the raw id while the names are still
   * loading, so the pill is never blank. Sorted by label for a stable, scannable order.
   */
  readonly projectFilterOptions = computed<DraftProjectFilterOption[]>(() => {
    const nameMap = this.bilateralAiService.projectNameMap();
    const byId = new Map<string, DraftProjectFilterOption>();

    for (const draft of this.allDrafts()) {
      const value = normalizeProjectId(draft?.job?.project_id);
      if (!value || byId.has(value)) continue;
      byId.set(value, { value, label: nameMap[Number(value)] ?? value });
    }

    return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label));
  });

  /** Label of the active project, for the chip. `''` when no project is selected. */
  readonly selectedProjectLabel = computed<string>(() => {
    const selected = normalizeProjectId(this.filter.selectedProjectId());
    if (!selected) return '';
    return this.projectFilterOptions().find(option => option.value === selected)?.label ?? selected;
  });

  /** The count line under the title — says how much of the list the filter is hiding. */
  readonly subtitle = computed<string>(() => {
    const total = this.allDrafts().length;
    if (total === 0) return 'No drafts yet';

    const shown = this.drafts().length;
    if (this.filter.hasActiveFilters()) return `Showing ${shown} of ${total} draft${total !== 1 ? 's' : ''}`;
    return `${total} draft${total !== 1 ? 's' : ''} ready for review`;
  });

  /** `app-pr-filter-select`'s empty sentinel is `'all'`; the filter service's is `null`. */
  selectValue(value: string | null): string {
    return value ?? 'all';
  }

  onProjectFilterChange(value: unknown): void {
    this.filter.selectProject(value);
  }

  clearFilters(): void {
    this.filter.clearAll();
  }

  getDraftTitle(draft: BilateralAiDraft): string {
    return draft.extracted_mds?.['title'] ?? 'Untitled Draft';
  }

  /**
   * The indicator category the AI proposed (e.g. "Innovation Development"). Used to be called
   * `getDraftType`, which read as if it returned the output/outcome level — that lives in
   * `getDraftLevel()` (P2-3169 AC2).
   */
  getDraftIndicator(draft: BilateralAiDraft): string {
    return draft.extracted_mds?.['indicator'] ?? '';
  }

  private getDraftResult(draft: BilateralAiDraft): DraftResultRelation | null {
    return (draft as BilateralAiDraft & { result?: DraftResultRelation }).result ?? null;
  }

  /** AC2 — "Output" / "Outcome", from the level the server inferred for the draft's result row. */
  getDraftLevel(draft: BilateralAiDraft): string {
    const levelId = this.getDraftResult(draft)?.result_level_id;
    return levelId == null ? '' : (RESULT_LEVEL_LABELS[Number(levelId)] ?? '');
  }

  /** AC2 — the draft status as the payload reports it, not a hardcoded word. */
  getDraftStatus(draft: BilateralAiDraft): string {
    const statusId = this.getDraftResult(draft)?.status_id;
    if (statusId == null) return DRAFT_STATUS_LABELS[BILATERAL_STATUS.Draft];
    return DRAFT_STATUS_LABELS[Number(statusId)] ?? DRAFT_STATUS_LABELS[BILATERAL_STATUS.Draft];
  }

  getDraftStatusClass(draft: BilateralAiDraft): string {
    const statusId = this.getDraftResult(draft)?.status_id;
    const modifier =
      statusId == null
        ? DRAFT_STATUS_MODIFIERS[BILATERAL_STATUS.Draft]
        : (DRAFT_STATUS_MODIFIERS[Number(statusId)] ?? DRAFT_STATUS_MODIFIERS[BILATERAL_STATUS.Draft]);
    return `mdr-status ${modifier}`;
  }

  /**
   * AC2 — which AI-Assistant run produced this draft. The run *is* the job row
   * (`bilateral_ai_jobs`), so its uuid is the session identity; the first segment is enough to
   * tell two runs apart on screen and the full id rides in the tooltip for support requests.
   */
  getSessionLabel(draft: BilateralAiDraft): string {
    const jobId = draft.job_id ?? draft.job?.job_id;
    if (!jobId) return '';
    const short = jobId.split('-')[0];
    const startedOn = draft.job?.created_date;
    return startedOn ? `#${short} · ${this.formatDate(startedOn)}` : `#${short}`;
  }

  getSessionTooltip(draft: BilateralAiDraft): string {
    const jobId = draft.job_id ?? draft.job?.job_id;
    if (!jobId) return '';
    const total = draft.job?.result_count;
    const produced = total ? ` It produced ${total} draft${total === 1 ? '' : 's'}.` : '';
    return `AI-Assistant session ${jobId}.${produced}`;
  }

  getProgramLabel(draft: BilateralAiDraft): string {
    const code = draft.job?.program_code;
    if (!code) return '';
    return this.bilateralAiService.initiativeNameMap()[code] ?? code;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  onReview(draft: BilateralAiDraft): void {
    this.selectedDraft.set(draft);
  }

  closeAside(): void {
    this.selectedDraft.set(null);
  }

  onPromoteClick(draft: BilateralAiDraft): void {
    this.promoteTarget.set(draft);
  }

  onPromoteConfirm(): void {
    const draft = this.promoteTarget();
    if (draft) {
      this.bilateralAiService.promoteDraft(draft.id);
    }
    this.promoteTarget.set(null);
    this.selectedDraft.set(null);
  }

  onPromoteCancel(): void {
    this.promoteTarget.set(null);
  }

  onDiscardClick(draft: BilateralAiDraft): void {
    this.discardTarget.set(draft);
  }

  onDiscardConfirm(): void {
    const draft = this.discardTarget();
    if (draft) {
      this.bilateralAiService.discardDraft(draft.id);
    }
    this.discardTarget.set(null);
    this.selectedDraft.set(null);
  }

  onDiscardCancel(): void {
    this.discardTarget.set(null);
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }
}

import { Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HlmButton } from '@spartan/button';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { PrDialogComponent } from '../../../../shared/components/pr-dialog/pr-dialog.component';
import { PrFilterSelectComponent } from '../../../../shared/components/pr-filter-select/pr-filter-select.component';
import { PrTooltipDirectiveModule } from '../../../../shared/directives/pr-tooltip-directive.module';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralAiDraft } from '../../services/bilateral-ai.interfaces';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BILATERAL_STATUS } from '../../services/bilateral-creation.service';
import { BilateralPageHeaderComponent } from '../../components/bilateral-page-header/bilateral-page-header.component';
// @akili-spec bilateral/center-overview-tab (COV-T-7, COV-R-15) — reads the shared query-param
// contract's `project` key; this tab only READS it, it never writes back to the URL.
import { parseBilateralQueryParams } from '../../bilateral-query-params';
import { DraftResultCardComponent } from '../bilateral-ai-draft-detail/components/draft-result-card/draft-result-card.component';
import { DraftEvidenceListComponent } from '../bilateral-ai-draft-detail/components/draft-evidence-list/draft-evidence-list.component';
import {
  DraftProjectFilterOption,
  formatDraftProjectOption,
  MyDraftResultsFilterService,
  normalizeProjectId,
} from './services/my-draft-results-filter.service';
import { ApiService } from '../../../../shared/services/api/api.service';

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

export interface DraftSessionGroup {
  sessionId: string;
  sessionShortHash: string;
  sessionTooltip: string;
  createdDate: string;
  formattedDate: string;
  projectDisplay: { code: string; title: string; full: string };
  programCode: string;
  programTooltip: string;
  userId?: number | null;
  isCurrentUser: boolean;
  creatorName: string;
  creatorTooltip: string;
  drafts: BilateralAiDraft[];
}

@Component({
  selector: 'app-my-draft-results',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    OverlayModule,
    HlmButton,
    PrDialogComponent,
    PrFilterSelectComponent,
    CustomFieldsModule,
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
  host: {
    class: 'pr-viewport-page',
  },
})
export class MyDraftResultsComponent implements OnInit, OnDestroy {
  readonly api = inject(ApiService);
  readonly bilateralAiService = inject(BilateralAiService);
  readonly ctx = inject(BilateralContextService);
  readonly filter = inject(MyDraftResultsFilterService);
  private readonly activatedRoute = inject(ActivatedRoute);

  /**
   * P2-3316: plain-language notes for the three card actions. End users could not tell
   * Review / Promote / Delete apart from the labels alone, so each one states what happens
   * to the draft after the click. The middle button was renamed Promote -> Create Result
   * (Yeck, 31-Aug-2026, on Nicoleta's request); only the visible label changed, the
   * promote* handlers and the endpoint keep their name. Review only opens the read-only
   * preview aside, Create Result creates the actual result and navigates to it, Delete
   * removes the draft for good.
   */
  readonly reviewTooltip =
    'Preview everything the AI extracted from your files, next to the source evidence it used. Nothing is saved or created — the draft stays in this list.';
  readonly promoteTooltip =
    'After your Center has reviewed and validated this AI-generated draft, turn it into a real bilateral result. You will be asked to confirm that validation first; after that the draft leaves this list and the new result opens for you to complete.';
  readonly deleteTooltip =
    'Delete this draft and everything the AI extracted from it. You will be asked to confirm first, and it cannot be undone.';

  promoteTarget = signal<BilateralAiDraft | null>(null);
  /** P2-3315: a Center user must explicitly validate an AI draft before it can become an editable result. */
  centerValidationConfirmed = signal(false);
  discardTarget = signal<BilateralAiDraft | null>(null);
  selectedDraft = signal<BilateralAiDraft | null>(null);

  readonly resolvedUserNames = signal<Record<number, string>>({});
  private readonly userLookupRequested = new Set<number>();

  constructor() {
    effect(() => {
      document.body.style.overflow = this.selectedDraft() ? 'hidden' : '';
    });

    effect(() => {
      const drafts = this.allDrafts();
      const currentUserId = this.api.authSE?.localStorageUser?.id;
      for (const draft of drafts) {
        const uid = draft.job?.user_id;
        const jobUser = draft.job?.user;
        const hasDirectName = Boolean(jobUser?.first_name || jobUser?.last_name);
        if (
          uid != null &&
          Number(uid) !== Number(currentUserId) &&
          !hasDirectName &&
          !this.resolvedUserNames()[uid] &&
          !this.userLookupRequested.has(uid)
        ) {
          this.userLookupRequested.add(uid);
          this.api.resultsSE.GET_userById(uid).subscribe({
            next: (res: any) => {
              const user = res?.response;
              if (user) {
                const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
                if (name) {
                  this.resolvedUserNames.update(map => ({ ...map, [uid]: name }));
                }
              }
            },
            error: () => {},
          });
        }
      }
    });
  }

  ngOnInit(): void {
    this.bilateralAiService.loadAllDrafts();

    // @akili-spec bilateral/center-overview-tab (COV-T-7, COV-R-15) — `?project=` (first value)
    // pre-selects this tab's existing project filter. Read-only: never written back to the URL.
    const { params } = parseBilateralQueryParams(this.activatedRoute.snapshot.queryParamMap);
    if (params.project.length) {
      this.filter.selectProject(String(params.project[0]));
    }
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
   * Drafts grouped by AI Assistant session (job_id).
   * Concentrates shared metadata (project, program, date, session hash) into one session header,
   * avoiding repetitive rows and optimizing screen space.
   */
  readonly sessionGroups = computed<DraftSessionGroup[]>(() => {
    const list = this.drafts();
    if (!list.length) return [];

    const groupMap = new Map<string, DraftSessionGroup>();
    const currentUserId = this.api.authSE?.localStorageUser?.id;
    const currentUserName = this.api.authSE?.localStorageUser?.user_name;

    for (const draft of list) {
      const sessionId = draft.job_id ?? draft.job?.job_id ?? `draft-${draft.id}`;
      let group = groupMap.get(sessionId);

      if (!group) {
        const jobId = draft.job_id ?? draft.job?.job_id ?? '';
        const short = jobId ? `#${jobId.split('-')[0]}` : `#${draft.id}`;
        const createdDate = draft.job?.created_date ?? draft.created_date ?? '';
        const formattedDate = createdDate ? this.formatDate(createdDate) : '';
        const sessionTooltip = this.getSessionTooltip(draft);
        const projectDisplay = this.getProjectDisplay(draft);
        const programCode = draft.job?.program_code ?? '';
        const programTooltip = this.getProgramTooltip(draft);

        const jobUserId = draft.job?.user_id;
        const isCurrentUser = Boolean(
          currentUserId != null && jobUserId != null && Number(currentUserId) === Number(jobUserId)
        );

        const jobUser = draft.job?.user;
        const jobUserName =
          [jobUser?.first_name, jobUser?.last_name].filter(Boolean).join(' ').trim() ||
          (jobUserId != null ? this.resolvedUserNames()[jobUserId] : '');

        let creatorName = '';
        let creatorTooltip = '';
        if (isCurrentUser) {
          creatorName = 'Created by you';
          creatorTooltip = currentUserName
            ? `AI extraction session created by you (${currentUserName})`
            : (jobUserName ? `AI extraction session created by you (${jobUserName})` : 'AI extraction session created by you');
        } else if (jobUserName) {
          creatorName = jobUserName;
          creatorTooltip = jobUser?.email
            ? `AI extraction session created by ${jobUserName} (${jobUser.email})`
            : `AI extraction session created by ${jobUserName}`;
        } else if (jobUser?.email) {
          creatorName = jobUser.email;
          creatorTooltip = `AI extraction session created by ${jobUser.email}`;
        } else if (jobUserId != null) {
          creatorName = 'Center Colleague';
          creatorTooltip = 'AI extraction session created by a Center team member';
        }

        group = {
          sessionId,
          sessionShortHash: short,
          sessionTooltip,
          createdDate,
          formattedDate,
          projectDisplay,
          programCode,
          programTooltip,
          userId: jobUserId,
          isCurrentUser,
          creatorName,
          creatorTooltip,
          drafts: [],
        };
        groupMap.set(sessionId, group);
      }

      group.drafts.push(draft);
    }

    return Array.from(groupMap.values());
  });

  readonly isProjectDropdownOpen = signal<boolean>(false);
  readonly projectSearchQuery = signal<string>('');

  readonly projectDropdownPositions: ConnectedPosition[] = [
    {
      originX: 'start',
      originY: 'bottom',
      overlayX: 'start',
      overlayY: 'top',
      offsetY: 4,
    },
    {
      originX: 'start',
      originY: 'top',
      overlayX: 'start',
      overlayY: 'bottom',
      offsetY: -4,
    },
  ];

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
      byId.set(value, formatDraftProjectOption(value, nameMap));
    }

    return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label));
  });

  readonly filteredProjectOptions = computed<DraftProjectFilterOption[]>(() => {
    const query = this.projectSearchQuery().trim().toLowerCase();
    const options = this.projectFilterOptions();
    if (!query) return options;
    return options.filter(
      option =>
        option.label.toLowerCase().includes(query) ||
        (option.code && option.code.toLowerCase().includes(query)) ||
        (option.title && option.title.toLowerCase().includes(query))
    );
  });

  toggleProjectDropdown(): void {
    this.isProjectDropdownOpen.update(open => !open);
    if (!this.isProjectDropdownOpen()) {
      this.projectSearchQuery.set('');
    }
  }

  closeProjectDropdown(): void {
    this.isProjectDropdownOpen.set(false);
    this.projectSearchQuery.set('');
  }

  selectProjectAndClose(projectId: string | null): void {
    this.filter.selectProject(projectId);
    this.closeProjectDropdown();
  }

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

  getProjectDisplay(draft: BilateralAiDraft): { code: string; title: string; full: string } {
    const rawId = draft?.job?.project_id;
    if (rawId == null) return { code: '', title: '', full: '' };
    const mapped =
      this.bilateralAiService.projectNameMap()[Number(rawId)] ??
      this.bilateralAiService.projectNameMap()[String(rawId) as any];

    if (!mapped) {
      const code = String(rawId);
      return { code, title: '', full: code };
    }

    if (mapped.includes(' — ')) {
      const parts = mapped.split(' — ');
      const code = parts[0].trim();
      const title = parts.slice(1).join(' — ').trim();
      return { code, title, full: mapped };
    }

    return { code: mapped, title: '', full: mapped };
  }

  getProgramTooltip(draft: BilateralAiDraft): string {
    const label = this.getProgramLabel(draft);
    const code = draft?.job?.program_code ?? '';
    if (label && label !== code) {
      return `${code} — ${label}`;
    }
    return label || code;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (diff <= 0 || days <= 0) return 'Today';
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
    this.centerValidationConfirmed.set(false);
    this.promoteTarget.set(draft);
  }

  onPromoteConfirm(): void {
    const draft = this.promoteTarget();
    if (draft && this.centerValidationConfirmed()) {
      this.bilateralAiService.promoteDraft(draft.id);
    }
    this.promoteTarget.set(null);
    this.selectedDraft.set(null);
    this.centerValidationConfirmed.set(false);
  }

  onPromoteCancel(): void {
    this.promoteTarget.set(null);
    this.centerValidationConfirmed.set(false);
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

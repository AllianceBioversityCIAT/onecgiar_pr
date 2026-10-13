import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HlmButton } from '@spartan/button';
import { CdkOverlayOrigin, ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { PrDialogComponent } from '../../../../shared/components/pr-dialog/pr-dialog.component';
import { PrFilterSelectComponent } from '../../../../shared/components/pr-filter-select/pr-filter-select.component';
import { PrFilterMultiselectModule } from '../../../../shared/components/pr-filter-multiselect/pr-filter-multiselect.module';
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
import { AiProvenanceNoticeComponent } from '../../components/ai-provenance-notice/ai-provenance-notice.component';
import {
  DraftProjectFilterOption,
  formatDraftProjectOption,
  MyDraftResultsFilterChip,
  MyDraftResultsFilterDimension,
  MyDraftResultsFilterService,
  normalizeProjectId,
} from './services/my-draft-results-filter.service';
import {
  buildCreatedByFilterOptions,
  MyDraftResultsFilterContext,
} from './utils/draft-filter-helpers';
import { ApiService } from '../../../../shared/services/api/api.service';
import { isCenterMember } from '../../services/bilateral-center-membership.util';

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
    PrFilterMultiselectModule,
    CustomFieldsModule,
    BilateralPageHeaderComponent,
    DraftResultCardComponent,
    DraftEvidenceListComponent,
    PrTooltipDirectiveModule,
    AiProvenanceNoticeComponent,
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

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

  /**
   * `ASC-T-5` (`ASC-R-15`): a platform admin who is not a Center User of THIS centre must not see
   * Create Result / Discard — the server (`bilateral-ai.service.ts` `assertCenterEntitlement`,
   * `mode: 'act'`) would 403 those calls for them anyway; this only keeps them from meeting that
   * 403 in the first place. Deliberately reads `getMyCenters()` directly, never `rolesSE.isAdmin` —
   * see `isCenterMember`'s own doc for why that short-circuit is the bug this exists to avoid.
   */
  readonly isCenterMember = computed(() => {
    // `RolesService.roles` is a plain property, invisible to the signal graph on its own — this
    // read is what makes the computed react to the roles payload landing after first render.
    this.api.rolesSE.rolesVersion;
    return isCenterMember(this.api.rolesSE.getMyCenters(), this.ctx.centerId(), this.ctx.centerAcronym());
  });
  selectedDraft = signal<BilateralAiDraft | null>(null);

  readonly resolvedUserNames = signal<Record<number, string>>({});
  private readonly userLookupRequested = new Set<number>();

  /** Bound to the search input; debounced into `filter.searchText` (~300ms). */
  readonly searchInput = signal('');
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly SEARCH_DEBOUNCE_MS = 300;

  /**
   * `AIQ-R-9` D / P-19: the session group carrying this job gets a scroll+highlight, once, the
   * first time it appears in `sessionGroups()` — drafts load asynchronously, so the job named by
   * `?job=` usually is not on screen yet when `ngOnInit` runs.
   *
   * `pendingHighlightJobId` is a SIGNAL (not a plain field) on purpose: the effect below must read
   * it — and `sessionGroups()` — UNCONDITIONALLY on every run, before any early return, or its very
   * first run (`pendingHighlightJobId` still null, before `ngOnInit`'s own `.set()`) registers zero
   * dependencies and Angular never schedules it to run again once a job id and a matching group
   * both show up later. `highlightApplied` stays a plain flag — it only gates behaviour inside the
   * effect, it is never itself a reason to re-run one.
   *
   * ⚠️ Post-execution bug fix (P2-3853): `ngOnInit` used to read `?job=` from
   * `activatedRoute.snapshot.queryParamMap` ONCE. Angular's default `RouteReuseStrategy` (the app's
   * own `PrmsRouteReuseStrategy` only special-cases `result-detail/:id`, not this route) reuses the
   * SAME `MyDraftResultsComponent` instance across a navigation to the SAME route that only changes
   * query params — e.g. the "AI processes" drawer's "View N drafts" clicked while the user is
   * ALREADY on this Center's Drafts tab. `ngOnInit` never runs again for that navigation, so a
   * one-time snapshot read never sees the new `?job=`; live in Chrome this reproduced as "no
   * highlight, no scroll" even though the target session group was on screen. Fixed by subscribing
   * to the LIVE `activatedRoute.queryParamMap` (see `ngOnInit`) instead of reading the snapshot once.
   */
  private readonly pendingHighlightJobId = signal<string | null>(null);
  private highlightApplied = false;
  readonly highlightedSessionId = signal<string | null>(null);
  private highlightClearTimer: ReturnType<typeof setTimeout> | null = null;
  /** Delay of the corrective second scroll pass (see the highlight effect). */
  private static readonly SCROLL_SETTLE_MS = 600;

  constructor() {
    effect(() => {
      document.body.style.overflow = this.selectedDraft() ? 'hidden' : '';
    });

    effect(() => {
      const jobId = this.pendingHighlightJobId();
      const groups = this.sessionGroups();
      if (this.highlightApplied || !jobId) return;
      const match = groups.find(group => group.sessionId === jobId);
      if (!match) return;
      this.highlightApplied = true;
      this.highlightedSessionId.set(match.sessionId);
      // `afterNextRender`, not `queueMicrotask` (post-execution bug fix, P2-3853): a microtask
      // queued from inside this effect runs BEFORE Angular renders the `@for` groups triggered by
      // this very `sessionGroups()` change — `document.getElementById` returned null and the `if
      // (el)` guard silently skipped the scroll, live in Chrome, on every load (hard reload
      // included). `afterNextRender` runs after the browser has actually painted the new DOM, so
      // the target element and its layout are real.
      //
      // The highlight no longer auto-clears (user decision, 2026-09-29): the card stays active for
      // as long as `?job=` is in the URL, so a reload or a shared link lands on the same state. It
      // is cleared when `?job=` goes away (see the `queryParamMap` subscription in `ngOnInit`).
      //
      // A second, instant pass corrects the first one: rows below the target keep rendering after
      // this first paint, and live in Chrome the first scroll stopped at 322 px with the card still
      // below the fold.
      if (this.highlightClearTimer) clearTimeout(this.highlightClearTimer);
      afterNextRender(
        () => {
          const scrollToTarget = (instant: boolean) => {
            const el = document.getElementById(`mdr-session-${match.sessionId}`);
            if (el) this.scrollWithinNearestScrollContainer(el, instant);
          };
          scrollToTarget(false);
          this.highlightClearTimer = setTimeout(() => scrollToTarget(true), MyDraftResultsComponent.SCROLL_SETTLE_MS);
        },
        { injector: this.injector },
      );
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

  /**
   * `AIQ-R-9` D / P-19 (post-execution bug fix, P2-3853) — `Element.scrollIntoView()` walks and
   * scrolls EVERY scrollable ancestor, not just the intended one. The page host carries
   * `pr-viewport-page` (`host: { class: 'pr-viewport-page' }` above), which is `overflow: hidden`
   * at ≥900px (`_viewport-page.scss`) — `scrollIntoView` still scrolled it (measured: `scrollTop`
   * became 57 in Chrome), hiding the Center header/tabs above this page with no way back short of a
   * reload. The REAL scroll container is `#workArea`
   * (`class="min-[900px]:flex-1 min-[900px]:min-h-0 min-[900px]:overflow-y-auto"` in the template) —
   * this walks up from the target to the nearest `overflow-y: auto|scroll` ancestor and scrolls
   * ONLY that element via `scrollTo`, never touching the `pr-viewport-page` host.
   */
  private findNearestScrollContainer(el: HTMLElement): HTMLElement | null {
    // An `overflow-y: auto` ancestor is not necessarily the one that scrolls: `div.mdr` is
    // `overflow-y: auto` but never overflows, so scrolling it moved nothing while `#workArea`
    // (the real scroller) stayed at 0 (measured in Chrome, 2026-09-29). Prefer the first ancestor
    // that actually overflows; fall back to the first `auto|scroll` one (jsdom has no layout, so
    // every height is 0 there).
    let firstCandidate: HTMLElement | null = null;
    let node: HTMLElement | null = el.parentElement;
    while (node) {
      const overflowY = window.getComputedStyle(node).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        if (node.scrollHeight > node.clientHeight) return node;
        firstCandidate ??= node;
      }
      node = node.parentElement;
    }
    return firstCandidate;
  }

  /** Centers `el` within its nearest scrollable ancestor (the `scrollIntoView({block:'center'})`
   * this replaces), respecting `prefers-reduced-motion` (`AIQ-R-9` D kept `behavior:'smooth'`; a
   * reduced-motion user gets the jump instead, same convention the Overview scroll used before it was removed).
   * No-ops when no scrollable ancestor is found — never falls back to
   * `scrollIntoView`, which is exactly the bug this exists to avoid. */
  private scrollWithinNearestScrollContainer(el: HTMLElement, instant = false): void {
    const container = this.findNearestScrollContainer(el);
    if (!container) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const topWithinContainer = elRect.top - containerRect.top + container.scrollTop;
    const centeredTop = topWithinContainer - (container.clientHeight / 2 - elRect.height / 2);

    container.scrollTo({ top: Math.max(0, centeredTop), behavior: reduceMotion || instant ? 'auto' : 'smooth' });
  }

  ngOnInit(): void {
    this.bilateralAiService.loadAllDrafts();

    // @akili-spec bilateral/center-overview-tab (COV-T-7, COV-R-15) — `?project=` (first value)
    // pre-selects this tab's existing project filter. Read-only: never written back to the URL.
    const { params } = parseBilateralQueryParams(this.activatedRoute.snapshot.queryParamMap);
    if (params.project.length) {
      this.filter.setProjects(params.project.map(id => String(id)));
    }

    // `AIQ-R-9` D / P-19: `?job=<id>` (not part of the shared contract above — it is the AI queue's
    // own deep link, not a filter) — the matching session group is highlighted and scrolled into
    // view once it appears (see the constructor's effect).
    //
    // ⚠️ Post-execution bug fix (P2-3853): subscribes to the LIVE `queryParamMap`, not a one-time
    // `snapshot` read — Angular's default route reuse keeps this component alive across a
    // navigation that only changes query params (e.g. the "AI processes" drawer's "View N drafts"
    // clicked while already on this Center's Drafts tab), so `ngOnInit` never runs a second time and
    // a snapshot read would never see the new `?job=`. The Observable emits the current value
    // immediately on subscribe, so this still covers the first load (hard reload / fresh
    // navigation) exactly like the old snapshot read did.
    this.activatedRoute.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(map => {
      const jobId = map.get('job');
      if (jobId === this.pendingHighlightJobId()) return;
      this.highlightApplied = false;
      this.pendingHighlightJobId.set(jobId);
      // The highlight lives exactly as long as `?job=` does.
      if (!jobId) this.highlightedSessionId.set(null);
    });
  }

  // ── P2-3319 · Filter by project ───────────────────────────────────────
  /**
   * Every draft the centre has, filter ignored. Kept apart from `drafts` so the page can tell
   * "this centre has no drafts" (empty state + CTA) from "the filter hid them all" (clear button).
   */
  readonly allDrafts = computed<BilateralAiDraft[]>(() => this.bilateralAiService.draftList());

  readonly filterContext = computed<MyDraftResultsFilterContext>(() => ({
    projectNameMap: this.bilateralAiService.projectNameMap(),
    resolvedUserNames: this.resolvedUserNames(),
    currentUserId: this.api.authSE?.localStorageUser?.id,
    currentUserName: this.api.authSE?.localStorageUser?.user_name,
  }));

  /** What the list actually renders. */
  readonly drafts = computed<BilateralAiDraft[]>(() =>
    this.filter.filterDrafts(this.allDrafts(), this.filterContext())
  );

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
  /** Matches trigger width so the panel aligns on mobile (full-width trigger → full-width panel). */
  readonly projectOverlayWidth = signal<number | undefined>(undefined);
  private readonly projectSearchInput = viewChild<ElementRef<HTMLInputElement>>('projectSearchInput');
  private readonly projectOrigin = viewChild<CdkOverlayOrigin>('projectOrigin');

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

  readonly createdBySelectOptions = computed(() => {
    const options = buildCreatedByFilterOptions(this.allDrafts(), this.filterContext());
    const selected = this.filter.selectedCreatedBy();
    const missing = selected.filter(value => !options.some(option => option.value === value));
    return missing.length
      ? [...options, ...missing.map(value => ({ value, label: value }))]
      : options;
  });

  readonly filterChips = computed<MyDraftResultsFilterChip[]>(() =>
    this.filter.filterChipGroups(
      this.filterContext(),
      id => this.projectLabelFor(id),
      this.allDrafts()
    )
  );

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
    const willOpen = !this.isProjectDropdownOpen();
    this.isProjectDropdownOpen.set(willOpen);
    if (!willOpen) {
      this.projectSearchQuery.set('');
      this.projectOverlayWidth.set(undefined);
      return;
    }
    const trigger = this.projectOrigin()?.elementRef.nativeElement;
    const width = trigger ? Math.ceil(trigger.getBoundingClientRect().width) : undefined;
    this.projectOverlayWidth.set(width && width > 0 ? width : undefined);
  }

  focusProjectSearchInput(): void {
    queueMicrotask(() => this.projectSearchInput()?.nativeElement?.focus());
  }

  closeProjectDropdown(): void {
    this.isProjectDropdownOpen.set(false);
    this.projectSearchQuery.set('');
  }

  clearProjectSearch(): void {
    this.projectSearchQuery.set('');
    queueMicrotask(() => this.projectSearchInput()?.nativeElement?.focus());
  }

  projectLabelFor(projectId: string): string {
    return this.projectFilterOptions().find(option => option.value === projectId)?.label ?? projectId;
  }

  /** Trigger label: All Projects (empty), one name, or "N projects". */
  readonly projectTriggerLabel = computed<string>(() => {
    const selected = this.filter.selectedProjectIds();
    if (!selected.length) return '';
    if (selected.length === 1) return this.projectLabelFor(selected[0]);
    return `${selected.length} projects`;
  });

  isProjectSelected(projectId: string): boolean {
    return this.filter.isProjectSelected(projectId);
  }

  toggleProjectOption(projectId: string): void {
    this.filter.toggleProject(projectId);
  }

  clearProjectSelection(): void {
    this.filter.clearProject();
  }

  /** The count line under the title — says how much of the list the filter is hiding. */
  readonly subtitle = computed<string>(() => {
    const total = this.allDrafts().length;
    if (total === 0) return 'No drafts yet';

    const shown = this.drafts().length;
    if (this.filter.hasActiveFilters()) return `Showing ${shown} of ${total} draft${total !== 1 ? 's' : ''}`;
    return `${total} draft${total !== 1 ? 's' : ''} ready for review`;
  });

  clearFilters(): void {
    this.searchInput.set('');
    this.filter.clearAll();
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchInput.set(value);
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.filter.setSearchText(value);
      this.searchDebounceTimer = null;
    }, MyDraftResultsComponent.SEARCH_DEBOUNCE_MS);
  }

  clearSearch(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    this.searchInput.set('');
    this.filter.setSearchText('');
  }

  onCreatedByFilterChange(values: string[] | null): void {
    this.filter.setCreatedBy(values ?? []);
  }

  clearFilterChip(dimension: MyDraftResultsFilterDimension, value: string): void {
    if (dimension === 'search') {
      this.clearSearch();
      return;
    }
    this.filter.clearChip(dimension, value);
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
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    if (this.highlightClearTimer) clearTimeout(this.highlightClearTimer);
  }
}

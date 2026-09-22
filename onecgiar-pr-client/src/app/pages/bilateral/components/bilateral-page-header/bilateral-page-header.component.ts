import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, computed, effect, inject, input, signal } from '@angular/core';
import { Params, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideInfo, lucideX } from '@ng-icons/lucide';
import { SmartNavigationService } from '../../../../shared/services/smart-navigation.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { AuthService } from '../../../../shared/services/api/auth.service';
import { CustomizedAlertsFeService } from '../../../../shared/services/customized-alerts-fe.service';
import { environment } from '../../../../../environments/environment';
import { BILATERAL_HEADER_INFO_COPY } from '../../../../internationalization/bilateral-header-info.copy';
import { AiProvenanceNoticeComponent } from '../ai-provenance-notice/ai-provenance-notice.component';
import { BilateralTourService } from '../../services/bilateral-tour.service';
import { resultStatusLabel, resultStatusToken } from '../../../../shared/constants/result-status-tokens';

@Component({
  selector: 'app-bilateral-page-header',
  standalone: true,
  imports: [RouterLink, AiProvenanceNoticeComponent, NgIcon],
  providers: [provideIcons({ lucideInfo, lucideX })],
  templateUrl: './bilateral-page-header.component.html',
  styleUrl: './bilateral-page-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BilateralPageHeaderComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly ctx = inject(BilateralContextService);
  readonly bilateralAiService = inject(BilateralAiService);
  readonly navSE = inject(SmartNavigationService);
  readonly dataControlSE = inject(DataControlService);
  readonly bilateralTourService = inject(BilateralTourService);

  /** `APF-R-10`: statuses that make a tracked job "alive" for the header chip. */
  private static readonly AI_JOB_ALIVE_STATUSES: ReadonlySet<string> = new Set(['pending', 'processing', 'still_running']);

  /**
   * 1 s tick driving the chip's elapsed clock. The chip reads `BilateralAiService` state only —
   * this timer just forces `aiJobChip` to re-evaluate `Date.now()` each second; it starts no
   * second poll (`design.md` §8).
   */
  private readonly nowMs = signal(Date.now());
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * `APF-R-10`: the alive-and-matching-center job, computed once and shared by the tick gate
   * (below) and `aiJobChip`. `null` unless `BilateralAiService` reports a job alive
   * (`pending`/`processing`/`still_running`) AND the record's center matches this header's center
   * — a job started for another center is not "here".
   */
  private readonly aliveJobForThisCenter = computed(() => {
    const state = this.bilateralAiService.uploadState();
    if (!state.jobId || !BilateralPageHeaderComponent.AI_JOB_ALIVE_STATUSES.has(state.status)) return null;

    const snapshot = this.bilateralAiService.getActiveJobSnapshot();
    if (!snapshot || snapshot.centerAcronym !== this.ctx.centerAcronym()) return null;

    return { jobId: state.jobId, snapshot };
  });

  constructor() {
    // Gate the 1 s tick on an alive job for this center — an unconditional interval schedules
    // app-wide change detection every second on every bilateral page even with no job to show,
    // which `APF-R-10` never asks for (rework addendum, Reviewer-advisory).
    effect(() => {
      if (this.aliveJobForThisCenter()) {
        this.startTick();
      } else {
        this.stopTick();
      }
    });
    this.destroyRef.onDestroy(() => this.stopTick());
  }

  private startTick(): void {
    if (this.tickTimer) return;
    this.tickTimer = setInterval(() => this.nowMs.set(Date.now()), 1000);
  }

  private stopTick(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  /**
   * `APF-R-10`/`APF-DD-8`: the persistent "AI job running" chip. `null` (hidden) unless
   * `aliveJobForThisCenter` is set. Elapsed time comes from the normalized job's queue-entry
   * clock once a poll has landed, else the resume record's `startedAt`.
   */
  readonly aiJobChip = computed(() => {
    this.nowMs();
    const active = this.aliveJobForThisCenter();
    if (!active) return null;

    const job = this.bilateralAiService.currentJob();
    const serverEntryMs = job && job.jobId === active.jobId ? job.queueEntryDate.getTime() : active.snapshot.startedAt;
    const startMs = serverEntryMs > Date.now() ? active.snapshot.startedAt : serverEntryMs;
    const elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const elapsedLabel = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const minuteWord = minutes === 1 ? 'minute' : 'minutes';
    const secondWord = seconds === 1 ? 'second' : 'seconds';

    return {
      jobId: active.jobId,
      elapsedLabel,
      ariaLabel: `AI job running, ${minutes} ${minuteWord} ${seconds} ${secondWord} — open the processing panel`,
    };
  });

  readonly cycleYear = computed(() => {
    this.dataControlSE.reportingPhaseVersion();
    return this.dataControlSE.reportingCurrentPhase?.phaseYear ?? null;
  });

  readonly cyclePhase = computed(() => {
    this.dataControlSE.reportingPhaseVersion();
    return this.dataControlSE.reportingCurrentPhase?.portfolioAcronym ?? '';
  });

  readonly reportingCycleLabel = computed(() => {
    const parts: string[] = [];
    const year = this.cycleYear();
    const phase = this.cyclePhase();
    if (year) parts.push(`Reporting cycle ${year}`);
    if (phase) parts.push(phase);
    return parts.join(' · ');
  });

  readonly eyebrow = computed(() => {
    const cycle = this.reportingCycleLabel();
    return cycle ? `CGIAR Center · ${cycle}` : 'CGIAR Center';
  });

  readonly copy = BILATERAL_HEADER_INFO_COPY;

  /** Info popover open state — click toggles; Escape / outside click close (mirrors SP program band). */
  readonly infoOpen = signal(false);
  private skipNextDocumentClick = false;
  private readonly authService = inject(AuthService);
  private readonly customAlertService = inject(CustomizedAlertsFeService);

  /** Which center section is active. Omit (e.g. on the create-result wizard) to hide the tab bar and CTA. */
  readonly activeTab = input<'overview' | 'reporting' | 'results' | 'drafts' | null>(null);

  /**
   * Whether the Reporting tab is active. `'overview'` used to be a legacy alias of Reporting
   * (pre-`shell-sp-alignment` naming); the alias is retired now that Overview is its own tab
   * (`COV-DD-4`) — `'overview'` activates Overview only.
   */
  readonly isReportingActive = computed(() => this.activeTab() === 'reporting');

  /** Whether the Overview (first) tab is active. */
  readonly isOverviewActive = computed(() => this.activeTab() === 'overview');

  /**
   * Query params carried by every tab link so the phase picked anywhere in the center shell
   * survives a tab switch (`COV-R-5` A, `COV-DD-2`). `null` when no phase is selected — the
   * tab links stay bare and each tab falls back to the Open phase.
   */
  readonly tabQueryParams = computed<Params | null>(() => {
    const phase = this.ctx.selectedVersionId();
    return phase == null ? null : { phase };
  });

  /**
   * Page title for the single-page variant of this header (P2-3100 AC1). When set, the
   * stacked centre block collapses into a one-line breadcrumb and the `h1` becomes this
   * title. Left unset — as the three tabbed pages do — the header renders unchanged.
   */
  readonly pageTitle = input<string | null>(null);

  /**
   * `band` is the sticky centre band the tabbed pages and the wizard use. `detail` is the in-flow
   * header of the result editor: way back, title, identity strip — the same shape the W1/W2
   * result detail draws, rebuilt here because that page's header belongs to `pages/results/`.
   */
  readonly variant = input<'band' | 'detail'>('band');

  /**
   * P2-3352: identity of the result being edited — code, type, funding tag and status.
   */
  readonly resultCode = input<string | number | null>(null);
  readonly resultTypeName = input<string | null>(null);
  readonly isW3Bilateral = input(false);
  /** `result.status_id`. Only the four the story lists render a badge; anything else is ignored. */
  readonly statusId = input<number | null>(null);

  /**
   * `APF-R-12` — the "Result detail (read-only)" provenance surface: a static badge next to the
   * status pill. The caller decides WHEN (draft-ness / `creation_method === 'AI'`, and only once the
   * result is read-only — the editable editor shows the dismissible banner instead, see
   * `bilateral-result-creator.component.ts`); this header only renders it.
   */
  readonly showAiProvenanceBadge = input(false);

  /**
   * P2-3553 · Label and colour both come from `result-status-tokens`. The private map that used to
   * sit here carried four raw hex pairs and disagreed with the Results Center on two of them: it
   * painted `Editing` grey where the table paints it amber, and `Pending review` amber where the
   * table had it grey. One enum now decides, so a status cannot mean two things one click apart.
   */
  /** Which statuses this header shows at all — unchanged from P2-3352. Colour is not WHETHER. */
  private static readonly BADGED_STATUSES: readonly number[] = [1, 5, 6, 7];

  readonly statusBadge = computed(() => {
    const id = this.statusId();
    if (id == null || !BilateralPageHeaderComponent.BADGED_STATUSES.includes(Number(id))) return null;
    return { label: resultStatusLabel(id), ...resultStatusToken(id) };
  });

  /**
   * BRRA-R-4: Secondary contextual metadata inputs for streamlined detail header.
   */
  readonly resultLevelName = input<string | null>(null);
  readonly centerName = input<string | null>(null);
  readonly areaOfWork = input<string | null>(null);

  readonly resolvedCenterName = computed(() => this.centerName() || this.ctx.centerAcronym() || this.ctx.centerName() || null);

  readonly hasDetailIdentityStrip = computed(
    () =>
      !!this.resultLevelName() ||
      this.isW3Bilateral() ||
      !!this.resolvedCenterName() ||
      !!this.areaOfWork() ||
      this.showAiProvenanceBadge(),
  );

  readonly hasIdentityStrip = computed(
    () =>
      this.resultCode() != null ||
      !!this.resultTypeName() ||
      this.isW3Bilateral() ||
      !!this.statusBadge() ||
      this.showAiProvenanceBadge(),
  );

  /** `[Full Center Name] (INITIALS)`, the trailing breadcrumb segment required by AC1. */
  readonly centerBreadcrumbLabel = computed(() => {
    const name = this.ctx.centerName();
    const acronym = this.ctx.centerAcronym();
    return name ? `${name} (${acronym})` : acronym;
  });

  readonly headerTitle = computed(() => this.ctx.centerName() || this.ctx.centerAcronym() || '');

  readonly centerOverviewDescription = computed(() => {
    const name = this.ctx.centerName() || this.ctx.centerAcronym();
    return name ? this.copy.centerOverview(name) : this.copy.fallbackCenterOverview;
  });

  readonly activeTabInfo = computed(() => {
    switch (this.activeTab()) {
      case 'overview':
        return this.copy.tabs.overview;
      case 'reporting':
        return this.copy.tabs.reporting;
      case 'results':
        return this.copy.tabs.results;
      case 'drafts':
        return this.copy.tabs.drafts;
      default:
        return this.copy.tabs.reporting;
    }
  });

  readonly centerMeta = computed(() => {
    const parts = [this.reportingCycleLabel(), this.ctx.centerAcronym()].filter(Boolean);
    return parts.join(' · ');
  });

  readonly bulkCtaLabel = computed(() => 'Bulk Results Uploader');

  /**
   * Destination of the Bulk Results Uploader CTA — the external bulk platform, opened in a new tab.
   *
   * Read off `environment` through an index signature **on purpose**. `src/environments/*.ts` is
   * gitignored and supplied per environment by CI, so this key does not travel with the merge that
   * introduces it: a typed `environment.bulkUploaderUrl` would fail the build in every environment
   * whose config predates the key. Read loosely, a missing key is an empty string.
   *
   * Empty hides the CTA (`showBulkCta`), which is also how PROD behaves until the bulk platform has
   * a destination there — no flag needed, just an absent key.
   */
  readonly bulkUploaderUrl = computed(
    () => ((environment as Record<string, unknown>)['bulkUploaderUrl'] as string | undefined)?.trim() ?? '',
  );

  readonly showBulkCta = computed(() => !!this.bulkUploaderUrl());

  /** BIL-HO-T-7: true while the handoff code is being minted — drives `[disabled]`/`aria-busy`. */
  readonly isMinting = signal(false);

  /**
   * @akili-spec bilateral/bulk-uploader-handoff (BIL-HO-T-7)
   *
   * Order of operations per `design.md` §6.2 / R-12 "order of operations": the tab MUST open
   * before the HTTP request is issued, so a popup blocker (which only allows `window.open` from
   * inside the click handler, not from inside a `subscribe` callback) does not get a stale HTTP
   * call with nowhere to send its result.
   *
   * `noopener` vs a navigable handle: `window.open(url, target, 'noopener')` returns `null` by
   * spec, but steps (4)/(5) below need a handle to navigate or close the tab on success/failure.
   * Resolved by opening plain (`window.open('', '_blank')`) and immediately severing the reverse
   * link with `tab.opener = null` — the same security property `rel="noopener"` gives an anchor
   * (the partner tab never gets a `window.opener` back to PRMS), without losing the handle.
   */
  openBulkUploader(): void {
    // (1) Open synchronously, before any HTTP call.
    const tab = window.open('', '_blank');

    // (2) Blocked popup: no handle, no HTTP call.
    if (!tab) {
      this.showBulkHandoffError();
      return;
    }

    // Sever the reverse link — the partner tab gets no handle back to this window.
    tab.opener = null;

    // (3) Mint the code.
    this.isMinting.set(true);
    this.authService
      .POST_bilateralHandoffStart({ center_code: this.ctx.centerId() || this.ctx.centerAcronym() || '' })
      .subscribe({
        next: ({ response }) => {
          // (4) Success: navigate the already-open tab.
          tab.location.href = response.redirect_url;
          this.isMinting.set(false);
        },
        error: err => {
          // (5) Failure: close the tab, never leave a blank one open, and alert.
          tab.close();
          this.showBulkHandoffError(err?.error?.message);
          this.isMinting.set(false);
        }
      });
  }

  private showBulkHandoffError(description?: string): void {
    this.customAlertService.show({
      id: 'bulkHandoffAlert',
      title: 'Oops!',
      description: description || 'The Bulk Results Uploader could not be opened. Please try again.',
      status: 'error'
    });
  }

  startBilateralTour(): void {
    this.bilateralTourService.startBilateralTour({
      centerAcronym: this.ctx.centerAcronym(),
      centerName: this.centerName(),
      cycleYear: this.cycleYear(),
      activeTab: this.activeTab() ?? undefined,
    });
  }

  /** Optional explicit override for the back button label. */
  readonly backLabelOverride = input<string>('');

  /** Dynamic context-aware back button label derived from navigation history. */
  readonly backLabel = computed(() => {
    const override = this.backLabelOverride()?.trim();
    if (override) return override;
    const url = this.router.url;
    const isCreateOrDetail = !!this.pageTitle();
    const effectiveUrl =
      isCreateOrDetail && !url.includes('/create') && !url.includes('/result/')
        ? `/bilateral/${encodeURIComponent(this.ctx.centerAcronym() || '')}/create`
        : url;
    return this.navSE.getBackTarget(effectiveUrl, this.ctx.centerAcronym() ?? undefined).label;
  });

  /** Navigates back intelligently to the previous surface or logical parent. */
  goBack(): void {
    const url = this.router.url;
    const isCreateOrDetail = !!this.pageTitle();
    const effectiveUrl =
      isCreateOrDetail && !url.includes('/create') && !url.includes('/result/')
        ? `/bilateral/${encodeURIComponent(this.ctx.centerAcronym() || '')}/create`
        : url;
    const target = this.navSE.getBackTarget(effectiveUrl, this.ctx.centerAcronym() ?? undefined);
    this.navSE.back(target.url, this.ctx.centerAcronym() ?? undefined);
  }

  toggleInfo(event: Event): void {
    event.stopPropagation();
    this.skipNextDocumentClick = true;
    this.infoOpen.update(open => !open);
  }

  closeInfo(): void {
    this.infoOpen.set(false);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.skipNextDocumentClick) {
      this.skipNextDocumentClick = false;
      return;
    }
    if (this.infoOpen()) this.infoOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.infoOpen()) this.infoOpen.set(false);
  }
}

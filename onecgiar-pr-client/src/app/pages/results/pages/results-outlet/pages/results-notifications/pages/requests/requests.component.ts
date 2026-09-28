import { Component, ElementRef, HostListener, signal, viewChild } from '@angular/core';
import { ResultsNotificationsService } from '../../results-notifications.service';
import { Router } from '@angular/router';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

/** NOTIF-T-6 (relocated by NOTIF-T-11): one removable chip in the Filter popover's active-filter
 * row. Moved here verbatim from `ResultsNotificationsComponent` — see that file's history for the
 * original rationale. */
interface ActiveFilterChip {
  type: 'program' | 'center' | 'bilateral';
  id: string;
  label: string;
}

/**
 * NOTIF-T-11 (rework attempt 3): this component does NOT implement `OnInit` / call
 * `getAllPhases()` at all — `ResultsNotificationsComponent` (the parent, above the router outlet)
 * always mounts first and stays mounted across the Requests<->Updates tab switch; its own
 * `ngOnInit()` calls `getAllPhases()` unconditionally on every entry into `results-notifications`,
 * which does the full fetch + P2-3106 default-phase logic + `onPhaseChange()` fan-out (see the
 * service). A call here would be a genuine duplicate fetch, not a safety net — removed per attempt
 * 2's Reviewer finding (the previous re-fetch guard on the service caused stale-data/deep-link
 * regressions and is removed too, see `ResultsNotificationsService.getAllPhases()`).
 *
 * Query-param hydration (`?phase=`/`init=`/`search=`) is likewise owned entirely by
 * `ResultsNotificationsComponent.ngOnInit()` (`setQueryParams()`), which completes synchronously
 * before this routed child is constructed — so `resultsNotificationsSE.phaseFilter`/
 * `initiativeIdFilter`/`searchFilter` are already hydrated from the URL by the time the parent's
 * `getAllPhases()` reads them.
 */
@Component({
  selector: 'app-requests',
  templateUrl: './requests.component.html',
  styleUrls: ['./requests.component.scss'],
  standalone: false
})
export class RequestsComponent {
  /** NOTIF-DD-7: the Filter dropdown's own open state. Was `hlm-popover`'s controlled `[state]`
   * signal (NOTIF-T-6) — now drives a plain `@if` in the template instead, no CDK overlay involved. */
  filterPopoverOpen = signal(false);

  /** NOTIF-T-9 (relocated by NOTIF-T-11), repurposed per NOTIF-DD-7: the Filter trigger button,
   * still needed to measure `getBoundingClientRect()` for the align computation below — the CDK
   * `[attachTo]` origin this ref used to feed no longer exists. */
  filterTriggerRef = viewChild<ElementRef<HTMLButtonElement>>('filterTriggerBtn');

  /** NOTIF-DD-7: the panel's own element, needed by the outside-click handler below to tell a click
   * inside the panel (a checkbox, a select, "Clear all") apart from a real outside click. Only
   * present in the DOM while `filterPopoverOpen()` is true. */
  filterPanelRef = viewChild<ElementRef<HTMLDivElement>>('filterPanel');

  /** NOTIF-T-12 (defect fix), repurposed per NOTIF-DD-7: same left/right-alignment decision as
   * before (measure the trigger vs the panel width vs the viewport), now driving the
   * `filter-popover--align-end` CSS class instead of a CDK `align` input. */
  filterPopoverAlign = signal<'start' | 'end'>('start');

  /** Matches the mockup panel width (`.notifications-filter-popover-content`, `width:280px`,
   * `requests.component.scss`) and the safety margin already used by that class's
   * `max-width: calc(100vw - 32px)` rule. */
  private static readonly FILTER_POPOVER_WIDTH = 280;
  private static readonly FILTER_POPOVER_VIEWPORT_MARGIN = 32;

  /** NOTIF-T-15: per-facet search text for the hand-built Center / Bilateral-project checkbox
   * lists (`NOTIF-T-6`) — the Program facet already gets this for free from `app-pr-select`'s own
   * built-in search (`showSearchInput`), so no signal is needed there. Deliberately separate from
   * `resultsNotificationsSE.searchFilter`, which drives the main notification-list search box. */
  centerSearchQuery = signal('');
  bilateralProjectSearchQuery = signal('');

  constructor(public resultsNotificationsSE: ResultsNotificationsService, public router: Router, public api: ApiService) {}

  /** `align='start'` sets BOTH `originX` and `overlayX` to `'start'` (`BrnPopover.getAttachPositions()`)
   * — i.e. the popover's own left edge is pinned to the trigger's left edge and the panel extends
   * rightward from there. So the correct reference point to test against the viewport's right edge
   * is `rect.left` (the trigger's left edge), not `rect.right`. */
  private computeFilterPopoverAlign(): 'start' | 'end' {
    const rect = this.filterTriggerRef()?.nativeElement.getBoundingClientRect();
    if (!rect) return 'start';

    const fitsToTheRight =
      rect.left + RequestsComponent.FILTER_POPOVER_WIDTH + RequestsComponent.FILTER_POPOVER_VIEWPORT_MARGIN <= window.innerWidth;

    return fitsToTheRight ? 'start' : 'end';
  }

  clearFiltersAndUpdateResults() {
    if (this.resultsNotificationsSE.initiativeIdFilter || this.resultsNotificationsSE.searchFilter) {
      this.resultsNotificationsSE.resetFilters();
    }
  }

  // ---------------------------------------------------------------------
  // NOTIF-T-11 (rework attempt 2) — Phase/Program state, entityLabel, filteredInitiatives,
  // getAllPhases/onPhaseChange/filterInitiativesByPhase all live on ResultsNotificationsService now
  // (single owner, shared with ResultsNotificationsComponent — see the service for the rationale).
  // This component only reads them via `this.resultsNotificationsSE.*` (template + activeFilterChips
  // below) and delegates the phase-change event straight to the service (template's ngModelChange).
  // ---------------------------------------------------------------------

  clearAllFilters() {
    this.resultsNotificationsSE.phaseFilter = null;
    this.resultsNotificationsSE.entityLabel = 'Entity';
    this.resultsNotificationsSE.filteredInitiatives = [];
    this.resultsNotificationsSE.resetFilters();
  }

  // ---------------------------------------------------------------------
  // NOTIF-T-6 — Filter popover (relocated by NOTIF-T-11: Phase + Program + Center + Bilateral project)
  // ---------------------------------------------------------------------

  toggleFilterPopover() {
    const opening = !this.filterPopoverOpen();
    // NOTIF-T-12: only recompute on the closed->open transition (avoids layout thrashing on every
    // render — measurement only happens once per open, per the task's scoped resize decision below).
    if (opening) {
      this.filterPopoverAlign.set(this.computeFilterPopoverAlign());
    }
    this.filterPopoverOpen.set(opening);
  }

  /** NOTIF-DD-7: plain document-level outside-click dismissal, replacing CDK's built-in overlay
   * dismissal. Closes only when the popover is open AND the click target is outside BOTH the
   * trigger button and the panel itself — a click on a checkbox/select/"Clear all" inside the panel
   * must NOT close it.
   *
   * Uses `event.composedPath()` rather than `event.target` (Reviewer finding, post-PASS
   * hardening): `event.target` can already be detached from the DOM by the time this document-level
   * listener runs if a click handler earlier in the same dispatch synchronously removes it (e.g.
   * `hlm-checkbox`'s own checkmark sits behind an `@if`, so unchecking it removes that exact node) —
   * `Node.contains()` on a detached target silently returns `false` even for a click that was
   * genuinely inside the panel. `composedPath()` captures the full original propagation path before
   * any such removal, so this check is correct regardless of change-detection timing (today's
   * zoneless setup happens not to trigger this, but the fix doesn't rely on that). */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.filterPopoverOpen()) return;

    const path = event.composedPath();
    const trigger = this.filterTriggerRef()?.nativeElement;
    const panel = this.filterPanelRef()?.nativeElement;

    if (trigger && path.includes(trigger)) return;
    if (panel && path.includes(panel)) return;

    this.filterPopoverOpen.set(false);
  }

  /** NOTIF-DD-7: plain Escape-key dismissal, replacing CDK's built-in overlay dismissal. */
  @HostListener('document:keydown.escape')
  onDocumentEscape() {
    if (this.filterPopoverOpen()) {
      this.filterPopoverOpen.set(false);
    }
  }

  /** Mirrors `notification-item.component.ts`'s own `isBilateralResult` getter — do not invent a
   * second detection rule (`NOTIF-T-6` brief). */
  private isBilateralRow(item: any): boolean {
    return item?.obj_result?.source_name === 'W3/Bilaterals';
  }

  /** Every currently-loaded Received + Sent row (pending and done), the same data the templates
   * already render — no separate fetch, per `NOTIF-R` NFR "Performance". */
  private allNotificationRows(): any[] {
    const received = this.resultsNotificationsSE.receivedData;
    const sent = this.resultsNotificationsSE.sentData;
    return [
      ...(received?.receivedContributionsPending ?? []),
      ...(received?.receivedContributionsDone ?? []),
      ...(sent?.sentContributionsPending ?? []),
      ...(sent?.sentContributionsDone ?? [])
    ];
  }

  /** Center facet options, derived from live bilateral rows — same `clarisa_institution.id` path
   * `filterNotificationByCenter` filters on (`NOTIF-T-3`'s Reviewer advisory: a separate catalog
   * service could use a different id-space and silently zero out the facet). */
  get centerFacetOptions(): { id: string | number; label: string }[] {
    const seen = new Map<string, { id: string | number; label: string }>();

    this.allNotificationRows()
      .filter(item => this.isBilateralRow(item))
      .forEach(item => {
        const institution = item?.obj_result?.result_center_array?.[0]?.clarisa_center_object?.clarisa_institution;
        if (institution?.id === undefined || institution?.id === null) return;
        seen.set(String(institution.id), { id: institution.id, label: institution.acronym || String(institution.id) });
      });

    return Array.from(seen.values());
  }

  /** NOTIF-T-16: Bilateral-project facet options, derived from bilateral rows ONLY. Reads the true
   * bilateral PROJECT identifier (`clarisa_projects.short_name`/`.full_name`, joined server-side via
   * `results_by_projects` → `obj_result.obj_result_by_project[].obj_clarisa_project` — see
   * `share-result-request.service.ts`'s `getRequestSelectFields()`/`getRequestRelations()`) instead
   * of the notification's own `obj_result.result_code`/`.title`, which is the RESULT's identifier,
   * not the PROJECT's, and was the root cause of this facet showing the wrong code/title.
   * `results_by_projects` is a many-to-many join, so one row iterates ALL of its linked projects —
   * a result tagged to more than one bilateral project surfaces under every one of them. */
  get bilateralProjectFacetOptions(): { code: string; label: string }[] {
    const seen = new Map<string, { code: string; label: string }>();

    this.allNotificationRows()
      .filter(item => this.isBilateralRow(item))
      .forEach(item => {
        const projectLinks = item?.obj_result?.obj_result_by_project ?? [];
        projectLinks.forEach((link: any) => {
          const project = link?.obj_clarisa_project;
          const code = project?.shortName;
          if (!code) return;
          seen.set(code, { code, label: project?.fullName ? `${code} - ${project.fullName}` : code });
        });
      });

    return Array.from(seen.values());
  }

  /** NOTIF-T-15: `centerFacetOptions` narrowed by `centerSearchQuery`, case-insensitive substring
   * match against `label`. The checked/unchecked lookups below always resolve against the id
   * (`isCenterFilterChecked`/`onCenterFilterChange`), so narrowing which rows RENDER here never
   * affects which ids are actually filtered on. */
  get filteredCenterFacetOptions(): { id: string | number; label: string }[] {
    const query = this.centerSearchQuery().trim().toLowerCase();
    if (!query) return this.centerFacetOptions;
    return this.centerFacetOptions.filter(option => option.label.toLowerCase().includes(query));
  }

  /** NOTIF-T-15: `bilateralProjectFacetOptions` narrowed by `bilateralProjectSearchQuery`, same
   * case-insensitive substring match. */
  get filteredBilateralProjectFacetOptions(): { code: string; label: string }[] {
    const query = this.bilateralProjectSearchQuery().trim().toLowerCase();
    if (!query) return this.bilateralProjectFacetOptions;
    return this.bilateralProjectFacetOptions.filter(option => option.label.toLowerCase().includes(query));
  }

  isCenterFilterChecked(id: string | number): boolean {
    return (this.resultsNotificationsSE.centerIdsFilter ?? []).some(centerId => centerId == id);
  }

  isBilateralProjectFilterChecked(code: string): boolean {
    return (this.resultsNotificationsSE.bilateralProjectIdsFilter ?? []).includes(code);
  }

  onCenterFilterChange(id: string | number, checked: boolean) {
    const current = this.resultsNotificationsSE.centerIdsFilter ?? [];
    this.resultsNotificationsSE.centerIdsFilter = checked ? [...current, id] : current.filter(centerId => centerId != id);
  }

  onBilateralProjectFilterChange(code: string, checked: boolean) {
    const current = this.resultsNotificationsSE.bilateralProjectIdsFilter ?? [];
    this.resultsNotificationsSE.bilateralProjectIdsFilter = checked ? [...current, code] : current.filter(projectCode => projectCode !== code);
  }

  /** `NOTIF-AC-3`: the Filter button's active-count badge. Phase is a prerequisite gate, not a
   * removable facet (no chip renders for it), so it is deliberately excluded from this count. */
  get activeFilterCount(): number {
    const programCount = this.resultsNotificationsSE.initiativeIdFilter ? 1 : 0;
    const centerCount = this.resultsNotificationsSE.centerIdsFilter?.length ?? 0;
    const bilateralCount = this.resultsNotificationsSE.bilateralProjectIdsFilter?.length ?? 0;
    return programCount + centerCount + bilateralCount;
  }

  /** `NOTIF-R-6`: one chip per active Program/Center/Bilateral-project facet. */
  get activeFilterChips(): ActiveFilterChip[] {
    const chips: ActiveFilterChip[] = [];

    if (this.resultsNotificationsSE.initiativeIdFilter) {
      const initiative: any = this.resultsNotificationsSE.filteredInitiatives.find(
        (init: any) => init.initiative_id == this.resultsNotificationsSE.initiativeIdFilter
      );
      chips.push({
        type: 'program',
        id: String(this.resultsNotificationsSE.initiativeIdFilter),
        label: initiative?.full_name ?? this.resultsNotificationsSE.entityLabel
      });
    }

    (this.resultsNotificationsSE.centerIdsFilter ?? []).forEach((id: string | number) => {
      const center = this.centerFacetOptions.find(option => option.id == id);
      chips.push({ type: 'center', id: String(id), label: center?.label ?? String(id) });
    });

    (this.resultsNotificationsSE.bilateralProjectIdsFilter ?? []).forEach((code: string) => {
      const project = this.bilateralProjectFacetOptions.find(option => option.code === code);
      chips.push({ type: 'bilateral', id: code, label: project?.label ?? code });
    });

    return chips;
  }

  /** Removes exactly the one facet the chip represents — `NOTIF-AC-3`'s reverse. */
  removeFilterChip(chip: ActiveFilterChip) {
    if (chip.type === 'program') {
      this.resultsNotificationsSE.initiativeIdFilter = null;
      return;
    }

    if (chip.type === 'center') {
      this.resultsNotificationsSE.centerIdsFilter = (this.resultsNotificationsSE.centerIdsFilter ?? []).filter(
        centerId => String(centerId) !== chip.id
      );
      return;
    }

    this.resultsNotificationsSE.bilateralProjectIdsFilter = (this.resultsNotificationsSE.bilateralProjectIdsFilter ?? []).filter(
      projectCode => projectCode !== chip.id
    );
  }
}

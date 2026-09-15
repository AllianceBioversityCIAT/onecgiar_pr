import { Component, HostListener, OnInit, computed, signal } from '@angular/core';
import { IpsrListFilterService } from '../../services/ipsr-list-filter.service';
import { IpsrListService } from '../../services/ipsr-list.service';
import { ExportTablesService } from '../../../../../../../../shared/services/export-tables.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { IpsrDataControlService } from '../../../../../../services/ipsr-data-control.service';

/**
 * One removable chip in the `.ip-meta-row` — mirrors RC's `filterChipGroups()` chip shape.
 * `'center'` was removed from the facet union (`IPSR-DD-3`, revised 2026-09-14) — IPSR list rows
 * carry no center field, so the "More filters" popover is Portfolio-only.
 */
interface IpsrFilterChip {
  label: string;
  filterType: 'program' | 'phase' | 'status' | 'portfolio';
  item?: any;
}

@Component({
  selector: 'app-ipsr-list-filters',
  templateUrl: './ipsr-list-filters.component.html',
  styleUrls: ['./ipsr-list-filters.component.scss'],
  standalone: false
})
export class IpsrListFiltersComponent implements OnInit {
  isLoadingReport = false;

  /** "More filters" (Portfolio) popover open state — `IPSR-T-5`, `design.md` §2.3. */
  moreFiltersOpen = signal(false);

  /**
   * One group per active facet (Submitter/Phase/Status/Portfolio) — mirrors RC's
   * `filterChipGroups` computed exactly, re-pointed at the IPSR signals. `IPSR-R-4`.
   * Center was descoped from this popover (`IPSR-DD-3`, revised 2026-09-14). The
   * "Submitter" label matches the approved mockup; the underlying signal names
   * (`programOptions`/`selectedPrograms`) are unchanged — display label only.
   */
  filterChipGroups = computed(() => {
    const groups: Array<{ category: string; chips: IpsrFilterChip[] }> = [];

    const programChips: IpsrFilterChip[] = this.ipsrListFilterSE.selectedPrograms().map(program => ({
      label: program?.displayName ?? program?.official_code ?? 'Submitter',
      filterType: 'program',
      item: program
    }));
    if (programChips.length > 0) {
      groups.push({ category: 'Submitter', chips: programChips });
    }

    const phaseChips: IpsrFilterChip[] = this.ipsrListFilterSE.selectedPhases().map(phase => ({
      label: phase?.name ?? 'Phase',
      filterType: 'phase',
      item: phase
    }));
    if (phaseChips.length > 0) {
      groups.push({ category: 'Phase', chips: phaseChips });
    }

    const statusChips: IpsrFilterChip[] = this.ipsrListFilterSE.selectedStatus().map(status => ({
      label: status,
      filterType: 'status',
      item: status
    }));
    if (statusChips.length > 0) {
      groups.push({ category: 'Package status', chips: statusChips });
    }

    const portfolioChips: IpsrFilterChip[] = this.ipsrListFilterSE.selectedPortfolios().map((portfolio: any) => ({
      label: portfolio?.name ?? portfolio?.acronym ?? 'Portfolio',
      filterType: 'portfolio',
      item: portfolio
    }));
    if (portfolioChips.length > 0) {
      groups.push({ category: 'Portfolio', chips: portfolioChips });
    }

    return groups;
  });

  constructor(
    public api: ApiService,
    public ipsrListService: IpsrListService,
    public ipsrListFilterSE: IpsrListFilterService,
    public exportTablesSE: ExportTablesService,
    public ipsrDataControlSE: IpsrDataControlService
  ) {}

  /**
   * Closes `IPSR-T-2`'s forward pointer: `loadSecondaryFacetOptions()` had no caller anywhere —
   * without this, the Portfolio facet would ship permanently empty.
   */
  ngOnInit(): void {
    this.ipsrListFilterSE.loadSecondaryFacetOptions();
  }

  /** Opens/closes the "More filters" popover — mirrors RC's `toggleMoreFilters()` verbatim. */
  toggleMoreFilters(event?: Event): void {
    event?.stopPropagation();
    if (this.moreFiltersOpen()) {
      this.cancelFilters();
      return;
    }
    this.openFiltersPopover();
  }

  /** Seeds `temp*` from the currently-applied `selected*` before the popover opens (`design.md` §2.3). */
  private openFiltersPopover(): void {
    this.ipsrListFilterSE.cancelFilters();
    this.moreFiltersOpen.set(true);
  }

  /** Apply — commits `temp*` into `selected*` and closes the popover. */
  applyFilters(): void {
    this.ipsrListFilterSE.applyFilters();
    this.moreFiltersOpen.set(false);
  }

  /**
   * Cancel — discards `temp*` edits and closes the popover. Every abort path (Cancel button,
   * outside click, `Escape`) routes through this single method, which in turn routes through
   * `IpsrListFilterService.cancelFilters()` — the forward pointer from `IPSR-T-2`'s Reviewer.
   */
  cancelFilters(): void {
    this.ipsrListFilterSE.cancelFilters();
    this.moreFiltersOpen.set(false);
  }

  /**
   * Close "More filters" when clicking outside the panel — mirrors RC's `onDocumentClick()`.
   *
   * No `skipNextDocClick` guard here: `toggleMoreFilters()` already calls `event.stopPropagation()`
   * on the trigger click, so the click that OPENS the popover never bubbles up to this
   * document-level handler in the first place. A guard flag was previously added to "consume" that
   * opening click, but since the opening click never reaches this handler, the flag was instead
   * consumed by the user's next (outside) click — the one actually meant to close the popover —
   * leaving the popover open on the first outside click and requiring a second click to close it.
   * Dropping the flag makes the first outside click close it, per `design.md` §2.3.
   */
  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.moreFiltersOpen()) this.cancelFilters();
  }

  /** `Escape` closes "More filters" — mirrors RC's `onEscape()`. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.moreFiltersOpen()) this.cancelFilters();
  }

  /** Removes only the matching value from the chip's own facet — other active filters are untouched (`IPSR-AC-4`). */
  removeFilter(chip: IpsrFilterChip): void {
    switch (chip.filterType) {
      case 'program':
        this.ipsrListFilterSE.selectedPrograms.set(this.ipsrListFilterSE.selectedPrograms().filter(p => p !== chip.item));
        break;
      case 'phase':
        this.ipsrListFilterSE.selectedPhases.set(this.ipsrListFilterSE.selectedPhases().filter(p => p !== chip.item));
        break;
      case 'status':
        this.ipsrListFilterSE.selectedStatus.set(this.ipsrListFilterSE.selectedStatus().filter(s => s !== chip.item));
        break;
      case 'portfolio':
        this.ipsrListFilterSE.selectedPortfolios.set(this.ipsrListFilterSE.selectedPortfolios().filter(p => p !== chip.item));
        break;
    }
  }

  /** Resets every facet (including Portfolio) and closes any open popover state. */
  clearAllNewFilters(): void {
    this.ipsrListFilterSE.selectedPrograms.set([]);
    this.ipsrListFilterSE.selectedPhases.set([]);
    this.ipsrListFilterSE.selectedStatus.set([]);
    this.ipsrListFilterSE.selectedPortfolios.set([]);
    this.ipsrListFilterSE.tempSelectedPortfolios.set([]);
    this.moreFiltersOpen.set(false);
  }

  /**
   * `IpsrListFilterService.selectedPrograms()` already holds only the actively-selected Program
   * options (multiselect model, `IPSR-DD-4`: empty = unfiltered) — this is a thin passthrough so
   * `onDownLoadTableAsExcel`'s call site (`GET_reportingList({ inits, phases, searchText })`) keeps
   * its existing signature. Re-pointed here from the removed `filters.general[0].options` shape
   * (`IPSR-T-1`); the deeper export re-pointing/regression pass is `IPSR-T-6`.
   */
  onFilterSelectedInits() {
    return this.ipsrListFilterSE.selectedPrograms();
  }

  /** Same passthrough as `onFilterSelectedInits()`, re-pointed at `selectedPhases()`. */
  onFilterSelectedPhases() {
    return this.ipsrListFilterSE.selectedPhases();
  }

  onDownLoadTableAsExcel(inits: any[], phases: any[], searchText: string | null) {
    this.isLoadingReport = true;

    this.api.resultsSE.GET_reportingList({ inits: inits, phases: phases, searchText: searchText }).subscribe({
      next: ({ response }) => {
        const wscols = [
          { header: 'Result code', key: 'result_code', width: 13 },
          { header: 'Reporting phase', key: 'phase_name', width: 17.5 },
          { header: 'Reporting year', key: 'reporting_year', width: 16.5 },
          { header: 'Result title', key: 'result_title', width: 115.83 },
          { header: 'Result type', key: 'result_type', width: 21 },
          { header: 'Core innovation', key: 'core_innovation', width: 65.83 },
          { header: 'Link - core innovation', key: 'link_core_innovation', width: 75.33 },
          { header: 'Geofocus', key: 'geo_focus', width: 48.33 },
          { header: 'Submitter', key: 'submitted_by', width: 15.83 },
          { header: 'Status', key: 'status', width: 10 },
          { header: 'Gender tag level', key: 'gender_tag_level', width: 17.17 },
          { header: 'Climate change tag level', key: 'climate_change_tag_level', width: 25.17 },
          { header: 'Nutrition tag level', key: 'nutrition_tag_level', width: 19.17 },
          { header: 'Environment AND/or biodiversity tag Level', key: 'environmental_biodiversity_tag_level', width: 44.83 },
          { header: 'Poverty tag level', key: 'poverty_tag_level', width: 17.5 },
          { header: 'Creation date', key: 'creation_date', width: 14.33 },
          { header: 'Lead initiative', key: 'lead_initiative', width: 92.17 },
          { header: 'Contributing initiative(s)', key: 'contributing_initiatives', width: 32.5 },
          { header: 'Scaling ambition', key: 'scaling_ambition', width: 65.67 },
          { header: 'Sustainable Development Goals (SDGs) targetted', key: 'sdg_targets', width: 50.67 },
          { header: 'Scaling Readiness score', key: 'scalability_potential_score_min', width: 23.83 },
          { header: 'Scalability potential score', key: 'scalability_potential_score_avg', width: 26.33 },
          { header: 'Link to IPSR metadata PDF report', key: 'link_to_pdf', width: 59 }
        ];

        this.exportTablesSE.exportExcelIpsr(response.response, 'IPSR_results_list', wscols, undefined, true);
        this.isLoadingReport = false;
      },
      error: err => {
        console.error(err);
        this.isLoadingReport = false;
      }
    });
  }
}

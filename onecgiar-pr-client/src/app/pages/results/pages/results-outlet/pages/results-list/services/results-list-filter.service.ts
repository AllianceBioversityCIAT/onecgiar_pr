import { computed, Injectable, signal } from '@angular/core';

/**
 * Why the full-metadata export is unavailable, or null when it is allowed.
 * Exported as a pure function so the service, the filters component and their specs all
 * derive the reason from one place.
 */
export function getFullMetadataExportBlockedReason(
  phases: { portfolio_id?: string | number }[],
  portfolios: { id?: string | number }[]
): string | null {
  if ((phases ?? []).length === 0) {
    return 'Select at least one phase to export.';
  }

  const phasePortfolioIds = Array.from(new Set((phases ?? []).map(phase => String(phase?.portfolio_id ?? '')).filter(Boolean)));
  const portfolioIds = Array.from(new Set((portfolios ?? []).map(portfolio => String(portfolio?.id ?? '')).filter(Boolean)));

  if (phasePortfolioIds.length > 1) {
    return 'Full metadata export only supports one portfolio at a time. Please select phases from a single portfolio.';
  }
  if (portfolioIds.length > 1) {
    return 'Full metadata export only supports one portfolio at a time. Please keep only one portfolio selected.';
  }
  if (phasePortfolioIds.length === 1 && portfolioIds.length === 1 && phasePortfolioIds[0] !== portfolioIds[0]) {
    return 'Selected phases and selected portfolio must belong to the same portfolio.';
  }

  return null;
}

@Injectable({
  providedIn: 'root'
})
export class ResultsListFilterService {
  /**
   * Full-metadata export state lives here, not on the filters COMPONENT, because the
   * Results Center toolbar (the parent) renders the export button. Reading it off a
   * `@ViewChild` meant the parent's template was checked before the child settled, which
   * raised NG0100 on the button's `disabled` / `title` on every load.
   */
  requestingFullExport = signal(false);

  readonly fullMetadataExportBlockedReason = computed<string | null>(() =>
    getFullMetadataExportBlockedReason(this.selectedPhases(), this.selectedClarisaPortfolios())
  );

  filters: any = {
    general: [
      {
        filter_title: 'Submitter (s)',
        attr: 'submitter',
        options: []
      },
      {
        filter_title: 'Phases',
        attr: 'phase_name',
        options: []
      }
    ],
    resultLevel: []
  };
  filterJoin: number = 0;

  phasesOptionsOld = signal([]);
  phasesOptions = signal([]);
  submittersOptionsOld = signal([]);
  submittersOptions = signal([]);
  submittersOptionsAdmin = signal([]);
  submittersOptionsAdminOld = signal([]);
  selectedClarisaPortfolios = signal([]);
  selectedFundingSource = signal([]);

  statusOptions = signal([]);
  fundingSourceOptions = signal([
    {
      id: 1,
      name: 'W1/W2'
    },
    {
      id: 2,
      name: 'W3/Bilaterals'
    }
  ]);

  selectedPhases = signal([]);
  selectedSubmitters = signal([]);
  selectedSubmittersAdmin = signal([]);

  selectedIndicatorCategories = signal([]);
  selectedStatus = signal([]);
  selectedLeadCenters = signal<any[]>([]);
  centerOptions = signal<any[]>([]);
  text_to_search = signal('');

  /** Restrict list/API to results created by the logged-in user */
  filterCreatedByMe = signal(false);
  /** Restrict list/API to results with a submission by the logged-in user */
  filterSubmittedByMe = signal(false);

  updateMyInitiatives(initiatives) {
    initiatives?.forEach(init => {
      init.selected = true;
      init.attr = init.name;
      init.id = init.initiative_id;
    });
    this.filters.general[0].options = [
      { name: 'All results', selected: false, cleanAll: true, id: 0, portfolio_id: 0 },
      ...initiatives,
      { attr: 'is_legacy', name: 'Pre-2022 results', id: 999, portfolio_id: 2 }
    ];
    this.submittersOptionsOld.set([
      { name: 'All results', selected: false, cleanAll: true, id: 0, portfolio_id: 0 },
      ...initiatives.sort((a, b) => a.initiative_id - b.initiative_id)
    ]);
  }

  onSelectChip(option: any) {
    option.selected = !option.selected;
    if (option.name != 'All results') this.filters.general[0].options[0].selected = false;
    this.filterJoin++;
  }

  cleanAllFilters(option) {
    if (!option.selected) return;
    if (option?.cleanAll !== true) return;
    this.filters.general.forEach(filter => {
      filter.options.forEach(option => {
        option.selected = false;
      });
    });
    this.filters.resultLevel.forEach(filter => {
      filter.options.forEach(option => {
        option.selected = false;
      });
    });
    this.filters.general[0].options[0].selected = true;
  }

  setFiltersByResultLevelTypes(resultLevelTypes) {
    this.filters.resultLevel = resultLevelTypes;
    this.filters.resultLevel.forEach(resultLevel => (resultLevel.options = resultLevel?.result_type));
    this.filters.resultLevel.forEach((resultLevelOption: any) => {
      resultLevelOption.options.forEach((resultTypeOption: any) => {
        resultTypeOption.resultLevelId = resultLevelOption.id;
      });
    });
  }
}

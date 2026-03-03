import { Component, OnInit, computed, signal, Input, SimpleChanges, OnChanges, afterNextRender, OnDestroy } from '@angular/core';
import { ResultsListFilterService } from '../../services/results-list-filter.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ExportTablesService } from '../../../../../../../../shared/services/export-tables.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { MultiSelectModule } from 'primeng/multiselect';
import { ModuleTypeEnum, StatusPhaseEnum } from '../../../../../../../../shared/enum/api.enum';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { BadgeModule } from 'primeng/badge';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { ReversePipe } from '../../../../../../../../shared/pipes/reverse.pipe';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-results-list-filters',
  templateUrl: './results-list-filters.component.html',
  styleUrls: ['./results-list-filters.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MultiSelectModule,
    CustomFieldsModule,
    OverlayBadgeModule,
    BadgeModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    ButtonModule,
    ChipModule,
    ReversePipe,
    TooltipModule
  ]
})
export class ResultsListFiltersComponent implements OnInit, OnChanges, OnDestroy {
  gettingReport = signal(false);
  visible = signal(false);
  clarisaPortfolios = signal([]);
  navbarHeight = signal(0);
  private resizeObserver: ResizeObserver | null = null;

  // Temporary signals for filter selections (before applying)
  tempSelectedClarisaPortfolios = signal([]);
  tempSelectedPhases = signal([]);
  tempSelectedSubmitters = signal([]);
  tempSelectedSubmittersAdmin = signal([]);
  tempSelectedIndicatorCategories = signal([]);
  tempSelectedStatus = signal([]);
  tempSelectedFundingSource = signal([]);
  tempSelectedLeadCenters = signal<any[]>([]);

  // Computed signal for filtered phases based on selected portfolios
  filteredPhasesOptions = computed(() => {
    const selectedPortfolios = this.tempSelectedClarisaPortfolios();
    if (selectedPortfolios.length === 0) {
      return this.resultsListFilterSE.phasesOptionsOld();
    }
    return this.resultsListFilterSE.phasesOptionsOld().filter(phase => selectedPortfolios.some(portfolio => portfolio.id == phase.portfolio_id));
  });

  filtersCount = computed(() => {
    let count = 0;

    if (this.resultsListFilterSE.selectedPhases().length > 0) count++;
    if (this.resultsListFilterSE.selectedSubmittersAdmin().length > 0) count++;
    if (this.resultsListFilterSE.selectedIndicatorCategories().length > 0) count++;
    if (this.resultsListFilterSE.selectedStatus().length > 0) count++;
    if (this.resultsListFilterSE.text_to_search().length > 0) count++;
    if (this.resultsListFilterSE.selectedClarisaPortfolios().length > 0) count++;
    if (this.resultsListFilterSE.selectedLeadCenters().length > 0) count++;

    return count;
  });
  filtersCountText = computed(() => {
    if (this.filtersCount() === 0) return 'Apply filters';
    return `Apply filters (${this.filtersCount()})`;
  });

  activeButtons = computed(() => {
    return this.api.dataControlSE?.myInitiativesListReportingByPortfolio?.length > 0 || this.api.rolesSE?.isAdmin;
  });

  // Computed property to generate grouped chips from applied filters
  filterChipGroups = computed(() => {
    const groups: Array<{
      category: string;
      chips: Array<{ label: string; filterType: string; item?: any }>;
    }> = [];

    // Clarisa Portfolios
    const clarisaPortfoliosChips = this.resultsListFilterSE.selectedClarisaPortfolios().map(portfolio => ({
      label: portfolio.name,
      filterType: 'clarisaPortfolio',
      item: portfolio
    }));
    if (clarisaPortfoliosChips.length > 0) {
      groups.push({
        category: 'Portfolio',
        chips: clarisaPortfoliosChips
      });
    }

    // Phases
    const phaseChips = this.resultsListFilterSE.selectedPhases().map(phase => ({
      label: phase.name,
      filterType: 'phase',
      item: phase
    }));
    if (phaseChips.length > 0) {
      groups.push({
        category: 'Phase',
        chips: phaseChips
      });
    }

    // Indicator Categories
    const indicatorCategoryChips = this.resultsListFilterSE.selectedIndicatorCategories().map(category => ({
      label: category.name,
      filterType: 'indicatorCategory',
      item: category
    }));
    if (indicatorCategoryChips.length > 0) {
      groups.push({
        category: 'Indicator category',
        chips: indicatorCategoryChips
      });
    }

    // Submitters
    const submitterChips = this.resultsListFilterSE.selectedSubmittersAdmin().map(submitter => ({
      label: submitter.official_code,
      filterType: 'submitter',
      item: submitter
    }));
    if (submitterChips.length > 0) {
      groups.push({
        category: 'Submitter',
        chips: submitterChips
      });
    }

    // Status
    const statusChips = this.resultsListFilterSE.selectedStatus().map(status => ({
      label: status.name,
      filterType: 'status',
      item: status
    }));
    if (statusChips.length > 0) {
      groups.push({
        category: 'Status',
        chips: statusChips
      });
    }

    const fundingSourceChips = this.resultsListFilterSE.selectedFundingSource().map(fundingSource => ({
      label: fundingSource.name,
      filterType: 'fundingSource',
      item: fundingSource
    }));
    if (fundingSourceChips.length > 0) {
      groups.push({
        category: 'Funding Source',
        chips: fundingSourceChips
      });
    }

    const centerChips = this.resultsListFilterSE.selectedLeadCenters().map((center: any) => ({
      label: center?.acronym ?? center?.name ?? 'Center',
      filterType: 'center',
      item: center
    }));
    if (centerChips.length > 0) {
      groups.push({
        category: 'Center',
        chips: centerChips
      });
    }

    return groups;
  });

  @Input() isAdmin = false;

  constructor(
    public resultsListFilterSE: ResultsListFilterService,
    public api: ApiService,
    private exportTablesSE: ExportTablesService
  ) {
    // Calculate navbar height after render
    afterNextRender(() => {
      this.calculateNavbarHeight();
      this.setupResizeObserver();
    });
  }

  ngOnInit(): void {
    this.getData();
    this.getResultStatus();
    this.getClarisaPortfolios();
    this.getCenters();
    this.getAllInitiatives();
  }

  getClarisaPortfolios() {
    this.api.resultsSE.GET_ClarisaPortfolios().subscribe({
      next: response => {
        this.clarisaPortfolios.set(response);
      },
      error: err => {
        console.error(err);
      }
    });
  }

  getCenters() {
    this.api.resultsSE.GET_AllCLARISACenters().subscribe({
      next: ({ response }) => {
        this.resultsListFilterSE.centerOptions.set(response ?? []);
      },
      error: err => {
        console.error(err);
      }
    });
  }
  ngOnChanges(changes: SimpleChanges): void {
    this.getAllInitiatives();
  }

  getAllInitiatives() {
    this.api.resultsSE.GET_AllInitiatives().subscribe({
      next: ({ response }) => {
        // Handle null or undefined response
        if (!response) {
          this.resultsListFilterSE.submittersOptionsAdminOld.set([]);
          return;
        }

        // Add displayName property to each submitter for use with optionLabel
        const mappedResponse = response.map(submitter => ({
          ...submitter,
          displayName: `${submitter.official_code} ${submitter.name}`
        }));
        this.resultsListFilterSE.submittersOptionsAdminOld.set(mappedResponse);
      },
      error: err => {
        console.error(err);
      }
    });
  }

  getData() {
    this.api.dataControlSE
      .getCurrentPhases()
      .pipe(switchMap(() => this.api.resultsSE.GET_versioning(StatusPhaseEnum.ALL, ModuleTypeEnum.REPORTING)))
      .subscribe({
        next: ({ response }) => this.handleVersioningResponse(response)
      });
  }

  private handleVersioningResponse(response: any[]) {
    this.resultsListFilterSE.phasesOptions.set(this.buildPhaseOptions(response));
    this.resultsListFilterSE.phasesOptionsOld.set(this.resultsListFilterSE.phasesOptions());

    this.resultsListFilterSE.selectedPhases.set(
      this.resultsListFilterSE.phasesOptions().filter(item => this.api.dataControlSE?.reportingCurrentPhase?.portfolioId == item.portfolio_id)
    );

    // Show all submitters initially (not filtered by phases)
    this.resultsListFilterSE.submittersOptionsAdmin.set(this.resultsListFilterSE.submittersOptionsAdminOld());

    // No submitters selected initially
    this.resultsListFilterSE.selectedSubmittersAdmin.set([]);
  }

  private buildPhaseOptions(response: any[]) {
    return response.map(item => ({
      ...item,
      selected: item.status,
      name: item.phase_name + (item.status ? ' (Open)' : ' (Closed)'),
      attr: item.phase_name + (item.obj_portfolio?.acronym ? ' - ' + item.obj_portfolio.acronym : '')
    }));
  }

  private filterOptionsBySelectedPhases<T extends { portfolio_id: any }>(options: T[]): T[] {
    const selected = this.resultsListFilterSE.selectedPhases();
    return options.filter(item => selected.some(phase => phase.portfolio_id == item.portfolio_id));
  }

  private filterOptionsBySelectedPortfolios<T extends { portfolio_id: any }>(options: T[]): T[] {
    const selectedPortfolios = this.resultsListFilterSE.selectedClarisaPortfolios();
    // If no portfolios selected, show all options
    if (selectedPortfolios.length === 0) {
      return options;
    }
    // Filter by selected portfolios
    return options.filter(item => selectedPortfolios.some(portfolio => portfolio.id == item.portfolio_id));
  }

  clearAllNewFilters() {
    this.resultsListFilterSE.selectedClarisaPortfolios.set([]);
    this.resultsListFilterSE.selectedFundingSource.set([]);
    this.resultsListFilterSE.selectedPhases.set([]);

    // When portfolios are cleared, show all submitters (no filtering)
    this.resultsListFilterSE.submittersOptionsAdmin.set(this.resultsListFilterSE.submittersOptionsAdminOld());

    // Clear selected submitters
    this.resultsListFilterSE.selectedSubmittersAdmin.set([]);

    this.resultsListFilterSE.selectedIndicatorCategories.set([]);
    this.resultsListFilterSE.selectedStatus.set([]);
    this.resultsListFilterSE.selectedLeadCenters.set([]);
    this.resultsListFilterSE.text_to_search.set('');

    // Also clear temp values
    this.tempSelectedClarisaPortfolios.set([]);
    this.tempSelectedPhases.set([]);
    this.tempSelectedSubmittersAdmin.set([]);
    this.tempSelectedIndicatorCategories.set([]);
    this.tempSelectedStatus.set([]);
    this.tempSelectedFundingSource.set([]);
    this.tempSelectedLeadCenters.set([]);
  }

  removeFilter(chip: { label: string; filterType: string; item?: any }) {
    switch (chip.filterType) {
      case 'clarisaPortfolio':
        this.resultsListFilterSE.selectedClarisaPortfolios.set(this.resultsListFilterSE.selectedClarisaPortfolios().filter(p => p !== chip.item));
        this.resultsListFilterSE.selectedFundingSource.set(this.resultsListFilterSE.selectedFundingSource().filter(p => p !== chip.item));
        // Update phases and submitters when portfolio changes
        this.updateOptionsAfterPortfolioChange();
        break;

      case 'phase':
        if (this.resultsListFilterSE.selectedPhases().length <= 1) return;
        this.resultsListFilterSE.selectedPhases.set(this.resultsListFilterSE.selectedPhases().filter(p => p !== chip.item));
        break;

      case 'submitter':
        this.resultsListFilterSE.selectedSubmittersAdmin.set(this.resultsListFilterSE.selectedSubmittersAdmin().filter(s => s !== chip.item));
        break;

      case 'indicatorCategory':
        this.resultsListFilterSE.selectedIndicatorCategories.set(this.resultsListFilterSE.selectedIndicatorCategories().filter(c => c !== chip.item));
        break;

      case 'status':
        this.resultsListFilterSE.selectedStatus.set(this.resultsListFilterSE.selectedStatus().filter(s => s !== chip.item));
        break;

      case 'fundingSource':
        this.resultsListFilterSE.selectedFundingSource.set(this.resultsListFilterSE.selectedFundingSource().filter(p => p !== chip.item));
        break;

      case 'center':
        this.resultsListFilterSE.selectedLeadCenters.set(this.resultsListFilterSE.selectedLeadCenters().filter(c => c !== chip.item));
        break;
    }
  }

  private updateOptionsAfterPortfolioChange() {
    // Update submitter options based on selected portfolios
    this.resultsListFilterSE.submittersOptionsAdmin.set(this.filterOptionsBySelectedPortfolios(this.resultsListFilterSE.submittersOptionsAdminOld()));

    // Remove submitters that are no longer valid
    this.resultsListFilterSE.selectedSubmittersAdmin.set(this.filterOptionsBySelectedPortfolios(this.resultsListFilterSE.selectedSubmittersAdmin()));

    // Update phases based on selected portfolios
    const filteredPhases = this.filterOptionsBySelectedPortfolios(this.resultsListFilterSE.phasesOptionsOld());
    // Remove phases that are no longer valid
    this.resultsListFilterSE.selectedPhases.set(
      this.resultsListFilterSE.selectedPhases().filter(phase => filteredPhases.some(p => p.id === phase.id))
    );
  }

  getResultStatus() {
    this.api.resultsSE.GET_allResultStatuses().subscribe(({ response }) => {
      this.resultsListFilterSE.statusOptions.set(response);
    });
  }

  onSelectPortfolios() {
    // Update phases based on selected portfolios
    const filteredPhases =
      this.tempSelectedClarisaPortfolios().length === 0
        ? this.resultsListFilterSE.phasesOptionsOld()
        : this.resultsListFilterSE
            .phasesOptionsOld()
            .filter(phase => this.tempSelectedClarisaPortfolios().some(portfolio => portfolio.id == phase.portfolio_id));

    // Reset phases if they don't match selected portfolios
    this.tempSelectedPhases.set(this.tempSelectedPhases().filter(phase => filteredPhases.some(p => p.id === phase.id)));

    // Update submitter options based on selected portfolios (not phases)
    this.resultsListFilterSE.submittersOptionsAdmin.set(
      this.tempSelectedClarisaPortfolios().length === 0
        ? this.resultsListFilterSE.submittersOptionsAdminOld()
        : this.resultsListFilterSE
            .submittersOptionsAdminOld()
            .filter(item => this.tempSelectedClarisaPortfolios().some(portfolio => portfolio.id == item.portfolio_id))
    );

    // Don't reset selected submitters - they should remain if valid for the selected portfolios
    this.tempSelectedSubmittersAdmin.set(
      this.tempSelectedSubmittersAdmin().filter(submitter =>
        this.resultsListFilterSE.submittersOptionsAdmin().some(option => option.id === submitter.id)
      )
    );
  }

  onSelectPhases() {
    // Phases selection no longer affects submitters
    // Submitters are now filtered by portfolios only
  }

  // Initialize temp values when opening the drawer
  openFiltersDrawer() {
    this.tempSelectedClarisaPortfolios.set([...this.resultsListFilterSE.selectedClarisaPortfolios()]);
    this.tempSelectedFundingSource.set([...this.resultsListFilterSE.selectedFundingSource()]);
    this.tempSelectedPhases.set([...this.resultsListFilterSE.selectedPhases()]);
    this.tempSelectedSubmittersAdmin.set([...this.resultsListFilterSE.selectedSubmittersAdmin()]);
    this.tempSelectedIndicatorCategories.set([...this.resultsListFilterSE.selectedIndicatorCategories()]);
    this.tempSelectedStatus.set([...this.resultsListFilterSE.selectedStatus()]);
    this.tempSelectedLeadCenters.set([...this.resultsListFilterSE.selectedLeadCenters()]);
    this.visible.set(true);
  }

  // Apply filters when clicking "Apply filters" button
  applyFilters() {
    this.resultsListFilterSE.selectedClarisaPortfolios.set([...this.tempSelectedClarisaPortfolios()]);
    this.resultsListFilterSE.selectedFundingSource.set([...this.tempSelectedFundingSource()]);
    this.resultsListFilterSE.selectedPhases.set([...this.tempSelectedPhases()]);
    this.resultsListFilterSE.selectedSubmittersAdmin.set([...this.tempSelectedSubmittersAdmin()]);
    this.resultsListFilterSE.selectedIndicatorCategories.set([...this.tempSelectedIndicatorCategories()]);
    this.resultsListFilterSE.selectedStatus.set([...this.tempSelectedStatus()]);
    this.resultsListFilterSE.selectedLeadCenters.set([...this.tempSelectedLeadCenters()]);
    this.visible.set(false);
  }

  // Cancel and discard changes
  cancelFilters() {
    // Reset temp values to current applied filters
    this.tempSelectedClarisaPortfolios.set([...this.resultsListFilterSE.selectedClarisaPortfolios()]);
    this.tempSelectedFundingSource.set([...this.resultsListFilterSE.selectedFundingSource()]);
    this.tempSelectedPhases.set([...this.resultsListFilterSE.selectedPhases()]);
    this.tempSelectedSubmittersAdmin.set([...this.resultsListFilterSE.selectedSubmittersAdmin()]);
    this.tempSelectedIndicatorCategories.set([...this.resultsListFilterSE.selectedIndicatorCategories()]);
    this.tempSelectedStatus.set([...this.resultsListFilterSE.selectedStatus()]);
    this.tempSelectedLeadCenters.set([...this.resultsListFilterSE.selectedLeadCenters()]);
    this.visible.set(false);
  }

  onDownLoadTableAsExcel() {
    this.gettingReport.set(true);
    this.api.resultsSE
      .GET_reportingList({
        phases: this.resultsListFilterSE.selectedPhases(),
        searchText: this.resultsListFilterSE.text_to_search(),
        inits: this.resultsListFilterSE.selectedSubmittersAdmin(),
        indicatorCategories: this.resultsListFilterSE.selectedIndicatorCategories(),
        status: this.resultsListFilterSE.selectedStatus(),
        clarisaPortfolios: this.resultsListFilterSE.selectedClarisaPortfolios(),
        fundingSource: this.resultsListFilterSE.selectedFundingSource(),
        leadCenters: this.resultsListFilterSE.selectedLeadCenters()
      })
      .subscribe({
        next: ({ response }) => {
          void this.buildAndDownloadExcelReport(response);
        },
        error: err => {
          console.error(err);
          this.gettingReport.set(false);
        }
      });
  }

  private async buildAndDownloadExcelReport(response: any[]): Promise<void> {
    const wscols = [
      { header: 'Result code', key: 'result_code', width: 13 },
      { header: 'Reporting phase', key: 'phase_name', width: 17.5 },
      { header: 'Funding source', key: 'funding_source', width: 17.5 },
      { header: 'Reporting year', key: 'reported_year_id', width: 13 },
      { header: 'Result title', key: 'title', width: 125 },
      { header: 'Description', key: 'description', width: 125 },
      { header: 'Result type', key: 'result_type', width: 45 },
      { header: 'Gender equality tag', key: 'gender_tag_level', width: 20 },
      { header: 'Gender impact areas', key: 'gender_impact_areas', width: 20 },
      { header: 'Climate tag', key: 'climate_tag_level', width: 20 },
      { header: 'Climate impact areas', key: 'climate_impact_areas', width: 20 },
      { header: 'Nutrition tag', key: 'nutrition_tag_level', width: 20 },
      { header: 'Nutrition impact areas', key: 'nutrition_impact_areas', width: 20 },
      { header: 'Environmental tag', key: 'environment_tag_level', width: 20 },
      { header: 'Environmental impact areas', key: 'environment_impact_areas', width: 20 },
      { header: 'Poverty tag', key: 'poverty_tag_level', width: 20 },
      { header: 'Poverty impact areas', key: 'poverty_impact_areas', width: 20 },
      { header: 'Submitter', key: 'official_code', width: 14 },
      { header: 'Status', key: 'status_name', width: 17 },
      { header: 'Creation date', key: 'creation_date', width: 15 },
      { header: 'Planned result', key: 'planned_result', width: 20 },
      { header: 'ToC', key: 'toc', width: 125 },
      { header: 'Center(s)', key: 'centers', width: 80 },
      { header: 'Contributing Science program', key: 'contributing_initiative', width: 26 },
      { header: 'Partners (with delivery type) for non-KP results', key: 'partners_with_delivery_type_for_non_kp_results', width: 60 },
      { header: 'Partners (with delivery type) for KP results', key: 'partners_with_delivery_type_for_kp_results', width: 60 },
      { header: 'Bilateral projects', key: 'bilateral_projects', width: 60 },
      { header: 'PDF Link', key: 'pdf_link', width: 65 }
    ];

    const groupedByResultType: Record<string, any[]> = {};
    (response || []).forEach((result: any) => {
      const resultType = result.result_type || 'Unknown';
      if (!groupedByResultType[resultType]) {
        groupedByResultType[resultType] = [];
      }
      groupedByResultType[resultType].push(result);
    });

    await this.exportTablesSE.exportExcelMultipleSheets(groupedByResultType, 'results_list', wscols, [
      { cellNumber: wscols.findIndex(col => col.key === 'pdf_link') + 1, cellKey: 'pdf_link' }
    ]);
    this.gettingReport.set(false);
  }

  private calculateNavbarHeight() {
    // Try to find the navbar/header element
    const navbar =
      document.querySelector('app-header-panel') ||
      document.querySelector('header') ||
      document.querySelector('nav') ||
      document.querySelector('.navbar') ||
      document.querySelector('.header');

    if (navbar) {
      const height = navbar.getBoundingClientRect().height;
      this.navbarHeight.set(height);
    } else {
      // Default fallback height
      this.navbarHeight.set(60);
    }
  }

  private setupResizeObserver() {
    const navbar =
      document.querySelector('app-header-panel') ||
      document.querySelector('header') ||
      document.querySelector('nav') ||
      document.querySelector('.navbar') ||
      document.querySelector('.header');

    if (navbar) {
      this.resizeObserver = new ResizeObserver(() => {
        this.calculateNavbarHeight();
      });
      this.resizeObserver.observe(navbar);
    }
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }
}

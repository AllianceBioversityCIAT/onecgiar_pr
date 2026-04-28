import {
  Component,
  OnInit,
  computed,
  signal,
  Input,
  SimpleChanges,
  OnChanges,
  afterNextRender,
  OnDestroy,
  viewChild,
  ElementRef,
} from '@angular/core';
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
import { CustomizedAlertsFeService } from '../../../../../../../../shared/services/customized-alerts-fe.service';

const P25_REQUIRED_EXPORT_COLUMNS: string[] = [
  'result_code',
  'phase_name',
  'portfolio_acronym',
  'result_level',
  'result_type',
  'submission_status',
  'title',
  'result_description',
  'primary_submitter_acronym'
];

const P25_OPTIONAL_EXPORT_SECTIONS: Array<{ section: string; columns: string[] }> = [
  {
    section: 'General information',
    columns: [
      'lead_contact_email',
      'gender_tag_score',
      'gender_tag_components',
      'climate_tag_score',
      'climate_tag_components',
      'nutrition_tag_score',
      'nutrition_tag_components',
      'environmental_tag_score',
      'environmental_tag_components',
      'poverty_tag_score',
      'poverty_tag_components'
    ]
  },
  {
    section: 'Contributors and partners',
    columns: [
      'primary_submitter_toc_mapping',
      'contributor_toc_mapping',
      'bilateral_projects',
      'contributing_centers',
      'partners',
      'authors_affiliations_kp',
      'result_lead',
    ],
  },
  {
    section: 'Geographic location',
    columns: ['geo_focus', 'regions', 'countries', 'subnational'],
  },
  {
    section: 'Evidence',
    columns: ['evidences'],
  },
  {
    section: 'Section 5',
    columns: ['section_5_metadata'],
  },
];

/** Optional columns shown in the drawer but not yet available in the export (disabled + “Coming soon”). */
const P25_OPTIONAL_COMING_SOON_COLUMNS = new Set<string>([
  'primary_submitter_toc_mapping',
  'contributor_toc_mapping',
  'section_5_metadata',
]);

const P25_COLUMN_LABEL_OVERRIDES: Record<string, string> = {
  result_code: 'Result Code',
  phase_name: 'Phase Name',
  portfolio_acronym: 'Portfolio Acronym',
  result_level: 'Result Level',
  result_type: 'Result Type',
  submission_status: 'Submission Status',
  title: 'Title',
  result_description: 'Result Description',
  primary_submitter_acronym: 'Primary Submitter Acronym',
  lead_contact_email: 'Lead Contact Person',
  gender_tag_score: 'Gender Tag Score',
  gender_tag_components: 'Gender Tag Impact Areas',
  climate_tag_score: 'Climate Tag Score',
  climate_tag_components: 'Climate Tag Impact Areas',
  nutrition_tag_score: 'Nutrition Tag Score',
  nutrition_tag_components: 'Nutrition Tag Impact Areas',
  environmental_tag_score: 'Environmental Tag Score',
  environmental_tag_components: 'Environmental Tag Impact Areas',
  poverty_tag_score: 'Poverty Tag Score',
  poverty_tag_components: 'Poverty Tag Impact Areas',
  bilateral_projects: 'Bilateral Projects',
  contributing_centers: 'Contributing Centers',
  partners: 'Partners',
  authors_affiliations_kp: 'Authors Affiliations (KP)',
  result_lead: 'Result Lead',
  primary_submitter_toc_mapping: 'Primary submitter ToC Mapping',
  contributor_toc_mapping: 'Contributor ToC Mapping',
  section_5_metadata: 'Include metadata',
  geo_focus: 'Geographic Focus',
  regions: 'Regions',
  countries: 'Countries',
  subnational: 'Subnational',
  evidences: 'Evidences'
};

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
  private static readonly P25_DRAWER_TRANSITION_MS = 340;

  gettingReport = signal(false);
  /** Full-metadata async export (email + S3 link) */
  requestingFullExport = signal(false);
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
  p25ColumnDrawerVisible = signal(false);
  /** Drives backdrop fade + panel slide; kept false one frame on open so CSS transitions run. */
  p25ColumnDrawerMotionOpen = signal(false);
  p25OptionalSelectedColumns = signal<string[]>([]);
  readonly p25DrawerPanel = viewChild<ElementRef<HTMLElement>>('p25DrawerPanel');
  private p25FocusBeforeOpen: HTMLElement | null = null;
  private p25CloseTimer: ReturnType<typeof setTimeout> | null = null;
  p25OptionalSections = P25_OPTIONAL_EXPORT_SECTIONS;
  p25RequiredColumns = P25_REQUIRED_EXPORT_COLUMNS;

  /** Accessible names for the P25 column drawer footer buttons (see visible copy in the template). */
  readonly p25DrawerCancelAriaLabel = 'Close column selection without exporting';
  readonly p25DrawerGenerateAriaLabel =
    'Generate P25 full metadata export with the selected optional columns';

  // Computed signal for filtered phases based on selected portfolios
  filteredPhasesOptions = computed(() => {
    const selectedPortfolios = this.tempSelectedClarisaPortfolios();
    if (selectedPortfolios.length === 0) {
      return this.resultsListFilterSE.phasesOptionsOld();
    }
    return this.resultsListFilterSE.phasesOptionsOld().filter(phase => selectedPortfolios.some(portfolio => portfolio.id == phase.portfolio_id));
  });
  fullMetadataExportBlockedReason = computed(() => this.getFullMetadataExportBlockedReason());

  filtersCount = computed(() => {
    let count = 0;

    if (this.resultsListFilterSE.selectedPhases().length > 0) count++;
    if (this.resultsListFilterSE.selectedSubmittersAdmin().length > 0) count++;
    if (this.resultsListFilterSE.selectedIndicatorCategories().length > 0) count++;
    if (this.resultsListFilterSE.selectedStatus().length > 0) count++;
    if (this.resultsListFilterSE.text_to_search().length > 0) count++;
    if (this.resultsListFilterSE.selectedClarisaPortfolios().length > 0) count++;
    if (this.resultsListFilterSE.selectedLeadCenters().length > 0) count++;
    if (this.resultsListFilterSE.selectedFundingSource().length > 0) count++;

    return count;
  });
  filtersCountText = computed(() => {
    if (this.filtersCount() === 0) return 'Apply filters';
    return `Apply filters (${this.filtersCount()})`;
  });

  get activeButtons() {
    return this.api.dataControlSE?.myInitiativesListReportingByPortfolio?.length > 0 || this.api.rolesSE?.isAdmin;
  }

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
  @Input() hasFilteredResults = true;

  constructor(
    public resultsListFilterSE: ResultsListFilterService,
    public api: ApiService,
    private readonly exportTablesSE: ExportTablesService,
    private readonly customAlertsSE: CustomizedAlertsFeService
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

    const initialSubmitterOptions = this.getFilteredSubmitterOptions(
      this.resultsListFilterSE.selectedPhases(),
      this.resultsListFilterSE.selectedClarisaPortfolios()
    );
    this.resultsListFilterSE.submittersOptionsAdmin.set(initialSubmitterOptions);
    this.resultsListFilterSE.selectedSubmittersAdmin.set(
      this.resultsListFilterSE.selectedSubmittersAdmin().filter(submitter => initialSubmitterOptions.some(option => option.id === submitter.id))
    );
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

  private getFilteredSubmitterOptions(selectedPhases: any[] = [], selectedPortfolios: any[] = []) {
    const sourceOptions = this.resultsListFilterSE.submittersOptionsAdminOld();
    if (selectedPhases.length > 0) {
      return sourceOptions.filter(item => selectedPhases.some(phase => phase.portfolio_id == item.portfolio_id));
    }
    if (selectedPortfolios.length > 0) {
      return sourceOptions.filter(item => selectedPortfolios.some(portfolio => portfolio.id == item.portfolio_id));
    }
    return sourceOptions;
  }

  private refreshTempSubmitterOptions() {
    const filteredOptions = this.getFilteredSubmitterOptions(this.tempSelectedPhases(), this.tempSelectedClarisaPortfolios());
    this.resultsListFilterSE.submittersOptionsAdmin.set(filteredOptions);
    this.tempSelectedSubmittersAdmin.set(
      this.tempSelectedSubmittersAdmin().filter(submitter => filteredOptions.some(option => option.id === submitter.id))
    );
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

    this.refreshTempSubmitterOptions();
  }

  onSelectPhases() {
    this.refreshTempSubmitterOptions();
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
    this.refreshTempSubmitterOptions();
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

  /** Same filter payload as GET_reportingList / server BasicReportFiltersDto */
  private buildReportingListFiltersPayload() {
    return {
      phases: this.resultsListFilterSE.selectedPhases(),
      searchText: this.resultsListFilterSE.text_to_search(),
      inits: this.resultsListFilterSE.selectedSubmittersAdmin(),
      indicatorCategories: this.resultsListFilterSE.selectedIndicatorCategories(),
      status: this.resultsListFilterSE.selectedStatus(),
      clarisaPortfolios: this.resultsListFilterSE.selectedClarisaPortfolios(),
      fundingSource: this.resultsListFilterSE.selectedFundingSource(),
      leadCenters: this.resultsListFilterSE.selectedLeadCenters()
    };
  }

  onDownLoadTableAsExcel() {
    this.gettingReport.set(true);
    this.api.resultsSE
      .GET_reportingList(this.buildReportingListFiltersPayload())
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

  /**
   * Queues server-side full metadata export (DB function per result + Excel to S3 + email).
   * Uses the same filters as the summary Excel download.
   */
  onRequestFullMetadataEmailExport() {
    this.onRequestFullMetadataEmailExportWithColumns();
  }

  onClickFullMetadataExport() {
    if (this.shouldOpenP25ColumnsDrawer()) {
      this.openP25ColumnsDrawer();
      return;
    }
    this.onRequestFullMetadataEmailExportWithColumns();
  }

  openP25ColumnsDrawer() {
    if (this.p25CloseTimer) {
      clearTimeout(this.p25CloseTimer);
      this.p25CloseTimer = null;
    }
    const optionalAll = this.p25OptionalSections.flatMap(s => s.columns);
    const selectable = optionalAll.filter(c => !P25_OPTIONAL_COMING_SOON_COLUMNS.has(c));
    this.p25OptionalSelectedColumns.set(Array.from(new Set(selectable)));
    const ae = document.activeElement;
    this.p25FocusBeforeOpen = ae instanceof HTMLElement ? ae : null;
    this.p25ColumnDrawerMotionOpen.set(false);
    this.p25ColumnDrawerVisible.set(true);
    this.setP25DrawerPageScrollLock(true);
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        this.p25ColumnDrawerMotionOpen.set(true);
        requestAnimationFrame(() => this.focusP25Drawer());
      });
    });
  }

  closeP25ColumnsDrawer() {
    if (!this.p25ColumnDrawerVisible()) return;
    if (this.p25CloseTimer) return;
    this.p25ColumnDrawerMotionOpen.set(false);
    this.p25CloseTimer = setTimeout(() => {
      this.p25CloseTimer = null;
      this.finalizeP25DrawerClosed();
    }, ResultsListFiltersComponent.P25_DRAWER_TRANSITION_MS);
  }

  private setP25DrawerPageScrollLock(locked: boolean): void {
    if (typeof document === 'undefined') return;
    const cls = 'pr-p25-drawer-scroll-lock';
    if (locked) {
      document.documentElement.classList.add(cls);
      document.body.classList.add(cls);
    } else {
      document.documentElement.classList.remove(cls);
      document.body.classList.remove(cls);
    }
  }

  private finalizeP25DrawerClosed(): void {
    this.p25ColumnDrawerVisible.set(false);
    this.setP25DrawerPageScrollLock(false);
    this.restoreP25Focus();
  }

  private focusP25Drawer(): void {
    this.p25DrawerPanel()?.nativeElement?.focus();
  }

  private restoreP25Focus(): void {
    const el = this.p25FocusBeforeOpen;
    this.p25FocusBeforeOpen = null;
    if (el && document.contains(el) && typeof el.focus === 'function') {
      el.focus();
    }
  }

  onP25DrawerKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.closeP25ColumnsDrawer();
    }
  }

  toggleP25OptionalColumn(column: string, checked: boolean) {
    if (P25_OPTIONAL_COMING_SOON_COLUMNS.has(column)) return;
    const current = this.p25OptionalSelectedColumns();
    if (checked) {
      this.p25OptionalSelectedColumns.set(Array.from(new Set([...current, column])));
      return;
    }
    this.p25OptionalSelectedColumns.set(current.filter(c => c !== column));
  }

  isP25OptionalColumnSelected(column: string): boolean {
    if (P25_OPTIONAL_COMING_SOON_COLUMNS.has(column)) return false;
    return this.p25OptionalSelectedColumns().includes(column);
  }

  isP25OptionalColumnComingSoon(column: string): boolean {
    return P25_OPTIONAL_COMING_SOON_COLUMNS.has(column);
  }

  getP25OptionalColumnLabel(column: string): string {
    const base = this.getP25ColumnLabel(column);
    return this.isP25OptionalColumnComingSoon(column) ? `${base} (Coming soon)` : base;
  }

  confirmP25ColumnsAndExport() {
    if (!this.p25ColumnDrawerVisible()) return;
    const selectedColumns = Array.from(
      new Set([...this.p25RequiredColumns, ...this.p25OptionalSelectedColumns()]),
    );
    if (this.p25CloseTimer) {
      clearTimeout(this.p25CloseTimer);
      this.p25CloseTimer = null;
    }
    this.p25ColumnDrawerMotionOpen.set(false);
    this.p25CloseTimer = setTimeout(() => {
      this.p25CloseTimer = null;
      this.finalizeP25DrawerClosed();
      this.onRequestFullMetadataEmailExportWithColumns(selectedColumns);
    }, ResultsListFiltersComponent.P25_DRAWER_TRANSITION_MS);
  }

  getP25ColumnLabel(column: string): string {
    const override = P25_COLUMN_LABEL_OVERRIDES[column];
    if (override) return override;
    return column
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private onRequestFullMetadataEmailExportWithColumns(selectedColumns?: string[]) {
    const blockedReason = this.fullMetadataExportBlockedReason();
    if (blockedReason) {
      this.customAlertsSE.show({
        id: 'results-full-export-portfolio-mismatch',
        title: 'Export blocked',
        description: blockedReason,
        status: 'warning'
      });
      return;
    }

    if (this.api.resultsSE.ipsrDataControlSE.inIpsr) {
      this.customAlertsSE.show({
        id: 'results-full-export-ipsr',
        title: 'Not available here',
        description: 'Full metadata export is only available from the Results module (not IPSR list).',
        status: 'warning'
      });
      return;
    }

    this.requestingFullExport.set(true);
    this.api.resultsSE
      .POST_reportingFullMetadataExportJob({
        ...this.buildReportingListFiltersPayload(),
        ...(selectedColumns?.length ? { selectedColumns } : {})
      })
      .subscribe({
      next: (body: { response?: { jobId?: string }; message?: string }) => {
        this.requestingFullExport.set(false);
        const jobId = body?.response?.jobId;
        this.customAlertsSE.show({
          id: 'results-full-export-queued',
          title: 'Export queued',
          description: jobId
            ? `You will receive an email with a download link when the file is ready. Reference: ${jobId}.`
            : 'You will receive an email with a download link when the file is ready.',
          status: 'success',
          closeIn: 6000
        });
      },
      error: err => {
        this.requestingFullExport.set(false);
        const msg =
          err?.error?.message ??
          err?.error?.response?.message ??
          err?.message ??
          'Could not start the export. Please try again or contact support.';
        this.customAlertsSE.show({
          id: 'results-full-export-error',
          title: 'Export could not be queued',
          description: typeof msg === 'string' ? msg : 'Could not start the export.',
          status: 'error'
        });
      }
    });
  }

  private shouldOpenP25ColumnsDrawer(): boolean {
    if (this.api.resultsSE.ipsrDataControlSE.inIpsr) return false;
    const years = this.resultsListFilterSE
      .selectedPhases()
      .map((phase: any) => this.extractPhaseYear(phase))
      .filter((year: number | null): year is number => year != null);
    if (!years.length) return false;
    return years.every(y => y >= 2025 && y <= 2030);
  }

  private extractPhaseYear(phase: any): number | null {
    const explicitYear = Number(phase?.phase_year);
    if (Number.isFinite(explicitYear)) return explicitYear;
    const text = String(phase?.phase_name ?? phase?.name ?? '');
    const match = /\b(20\d{2})\b/.exec(text);
    if (!match) return null;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private getFullMetadataExportBlockedReason(): string | null {
    const selectedPhasePortfolioIds = Array.from(
      new Set(
        this.resultsListFilterSE
          .selectedPhases()
          .map((phase: { portfolio_id?: string | number }) => String(phase?.portfolio_id ?? ''))
          .filter(Boolean)
      )
    );
    const selectedPortfolioIds = Array.from(
      new Set(
        this.resultsListFilterSE
          .selectedClarisaPortfolios()
          .map((portfolio: { id?: string | number }) => String(portfolio?.id ?? ''))
          .filter(Boolean)
      )
    );

    if (selectedPhasePortfolioIds.length > 1) {
      return 'Full metadata export only supports one portfolio at a time. Please select phases from a single portfolio.';
    }
    if (selectedPortfolioIds.length > 1) {
      return 'Full metadata export only supports one portfolio at a time. Please keep only one portfolio selected.';
    }

    if (selectedPhasePortfolioIds.length === 1 && selectedPortfolioIds.length === 1 && selectedPhasePortfolioIds[0] !== selectedPortfolioIds[0]) {
      return 'Selected phases and selected portfolio must belong to the same portfolio.';
    }

    return null;
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
    this.setP25DrawerPageScrollLock(false);
    if (this.p25CloseTimer) {
      clearTimeout(this.p25CloseTimer);
      this.p25CloseTimer = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }
}

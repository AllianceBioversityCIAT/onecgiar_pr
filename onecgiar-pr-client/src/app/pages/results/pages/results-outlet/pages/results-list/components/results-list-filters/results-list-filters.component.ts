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
import { CheckboxModule } from 'primeng/checkbox';
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
  'primary_submitter_acronym',
  'toc_planned_result',
];

/** Column slug prefix on the view for each result type id (Policy, Innovation use, CapDev, KP, Innovation dev). */
const P25_SECTION_7_PREFIX_BY_RESULT_TYPE_ID: Record<number, string> = {
  1: 's7_pc_',
  2: 's7_iu_',
  5: 's7_cd_',
  6: 's7_kp_',
  7: 's7_id_',
};

/** Flat columns added to `result_phase_2025_excel` for Section 7 indicator metadata (same semantics as reportSectionSevenByResultCode_P25). */
const P25_SECTION_7_EXPORT_COLUMNS: string[] = [
  's7_cd_capdev_term',
  's7_cd_delivery_method',
  's7_cd_female_using',
  's7_cd_is_attending_for_organization',
  's7_cd_male_using',
  's7_cd_non_binary_using',
  's7_cd_organizations',
  's7_cd_unknown_using',
  's7_id_actors',
  's7_id_innovation_collaborators',
  's7_id_innovation_developers',
  's7_id_innovation_investments',
  's7_id_innovation_nature',
  's7_id_innovation_type',
  's7_id_materials_evidence',
  's7_id_measures',
  's7_id_organization_lines',
  's7_id_pictures_evidence',
  's7_id_published_ipsr',
  's7_id_readiness_level',
  's7_id_readiness_level_justification',
  's7_id_url_readiness',
  's7_iu_actors',
  's7_iu_measures',
  's7_iu_organization_lines',
  's7_iu_readiness_level',
  's7_kp_agrovocs',
  's7_kp_altmetric_score',
  's7_kp_altmetric_url',
  's7_kp_authors',
  's7_kp_cgspace_doi',
  's7_kp_cgspace_isi',
  's7_kp_cgspace_issue_year',
  's7_kp_cgspace_online_year',
  's7_kp_cgspace_open_access',
  's7_kp_cgspace_peer_reviewed',
  's7_kp_comodity',
  's7_kp_fair_accessible',
  's7_kp_fair_findable',
  's7_kp_fair_interoperable',
  's7_kp_fair_reusable',
  's7_kp_handle',
  's7_kp_keywords',
  's7_kp_knowledge_product_type',
  's7_kp_licence',
  's7_kp_sponsors',
  's7_kp_wos_doi',
  's7_kp_wos_isi',
  's7_kp_wos_issue_year',
  's7_kp_wos_open_access',
  's7_kp_wos_peer_reviewed',
  's7_pc_implementing_organizations',
  's7_pc_policy_amount',
  's7_pc_policy_type_id',
  's7_pc_policy_type_name',
  's7_pc_result_related',
  's7_pc_result_related_engagement',
  's7_pc_stage_policy_change',
  's7_pc_status_policy_change',
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
      'toc_primary_mapping',
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
const P25_OPTIONAL_COMING_SOON_COLUMNS = new Set<string>();

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
  toc_planned_result: 'ToC planned result',
  toc_primary_mapping: 'ToC Primary',
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
  section_5_metadata: 'Indicator metadata (Section 5 fields)',
  geo_focus: 'Geographic Focus',
  regions: 'Regions',
  countries: 'Countries',
  subnational: 'Subnational',
  evidences: 'Evidences',

  s7_pc_policy_type_id: 'Policy change — type ID',
  s7_pc_policy_type_name: 'Policy change — type',
  s7_pc_policy_amount: 'Policy change — amount',
  s7_pc_status_policy_change: 'Policy change — amount status',
  s7_pc_stage_policy_change: 'Policy change — stage',
  s7_pc_implementing_organizations: 'Policy change — implementing organizations',
  s7_pc_result_related: 'Policy change — related result (questions)',
  s7_pc_result_related_engagement: 'Policy change — related result engagement',

  s7_iu_actors: 'Innovation use — actors',
  s7_iu_organization_lines: 'Innovation use — organizations',
  s7_iu_measures: 'Innovation use — measures',
  s7_iu_readiness_level: 'Innovation use — readiness level',

  s7_cd_female_using: 'Capacity sharing — female participants',
  s7_cd_male_using: 'Capacity sharing — male participants',
  s7_cd_non_binary_using: 'Capacity sharing — non-binary participants',
  s7_cd_unknown_using: 'Capacity sharing — unknown gender participants',
  s7_cd_capdev_term: 'Capacity sharing — term',
  s7_cd_delivery_method: 'Capacity sharing — delivery method',
  s7_cd_is_attending_for_organization: 'Capacity sharing — attending for organization',
  s7_cd_organizations: 'Capacity sharing — organizations',

  s7_kp_handle: 'Knowledge Product — CGSpace handle URL',
  s7_kp_knowledge_product_type: 'Knowledge Product — type',
  s7_kp_authors: 'Knowledge Product — authors',
  s7_kp_licence: 'Knowledge Product — licence',
  s7_kp_agrovocs: 'Knowledge Product — Agrovoc keywords',
  s7_kp_keywords: 'Knowledge Product — keywords',
  s7_kp_comodity: 'Knowledge Product — commodity',
  s7_kp_sponsors: 'Knowledge Product — sponsors',
  s7_kp_cgspace_isi: 'Knowledge Product — CGSpace ISI',
  s7_kp_cgspace_open_access: 'Knowledge Product — CGSpace open access',
  s7_kp_cgspace_issue_year: 'Knowledge Product — CGSpace issue year',
  s7_kp_cgspace_online_year: 'Knowledge Product — CGSpace online year',
  s7_kp_cgspace_doi: 'Knowledge Product — CGSpace DOI',
  s7_kp_cgspace_peer_reviewed: 'Knowledge Product — CGSpace peer reviewed',
  s7_kp_wos_isi: 'Knowledge Product — other source ISI',
  s7_kp_wos_open_access: 'Knowledge Product — other source open access',
  s7_kp_wos_issue_year: 'Knowledge Product — other source issue year',
  s7_kp_wos_doi: 'Knowledge Product — other source DOI',
  s7_kp_wos_peer_reviewed: 'Knowledge Product — other source peer reviewed',
  s7_kp_altmetric_url: 'Knowledge Product — Altmetric URL',
  s7_kp_altmetric_score: 'Knowledge Product — Altmetric score',
  s7_kp_fair_findable: 'Knowledge Product — FAIR findable',
  s7_kp_fair_accessible: 'Knowledge Product — FAIR accessible',
  s7_kp_fair_interoperable: 'Knowledge Product — FAIR interoperable',
  s7_kp_fair_reusable: 'Knowledge Product — FAIR reusable',

  s7_id_innovation_nature: 'Innovation development — nature',
  s7_id_innovation_type: 'Innovation development — type',
  s7_id_innovation_developers: 'Innovation development — developers',
  s7_id_innovation_collaborators: 'Innovation development — collaborators',
  s7_id_readiness_level: 'Innovation development — readiness level',
  s7_id_readiness_level_justification: 'Innovation development — readiness justification',
  s7_id_published_ipsr: 'Innovation development — published in IPSR',
  s7_id_actors: 'Innovation development — actors',
  s7_id_organization_lines: 'Innovation development — organizations',
  s7_id_measures: 'Innovation development — measures',
  s7_id_innovation_investments: 'Innovation development — investments',
  s7_id_pictures_evidence: 'Innovation development — pictures evidence',
  s7_id_materials_evidence: 'Innovation development — materials evidence',
  s7_id_url_readiness: 'Innovation development — readiness image URL',
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
    CheckboxModule,
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
  tempFilterCreatedByMe = signal(false);
  tempFilterSubmittedByMe = signal(false);
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
    if (this.resultsListFilterSE.filterCreatedByMe()) count++;
    if (this.resultsListFilterSE.filterSubmittedByMe()) count++;

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

    const myActivityChips: Array<{ label: string; filterType: string }> = [];
    if (this.resultsListFilterSE.filterCreatedByMe()) {
      myActivityChips.push({ label: 'Created by me', filterType: 'filterCreatedByMe' });
    }
    if (this.resultsListFilterSE.filterSubmittedByMe()) {
      myActivityChips.push({ label: 'Submitted by me', filterType: 'filterSubmittedByMe' });
    }
    if (myActivityChips.length > 0) {
      groups.push({
        category: 'My activity',
        chips: myActivityChips
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
    this.resultsListFilterSE.filterCreatedByMe.set(false);
    this.resultsListFilterSE.filterSubmittedByMe.set(false);

    // Also clear temp values
    this.tempSelectedClarisaPortfolios.set([]);
    this.tempSelectedPhases.set([]);
    this.tempSelectedSubmittersAdmin.set([]);
    this.tempSelectedIndicatorCategories.set([]);
    this.tempSelectedStatus.set([]);
    this.tempSelectedFundingSource.set([]);
    this.tempSelectedLeadCenters.set([]);
    this.tempFilterCreatedByMe.set(false);
    this.tempFilterSubmittedByMe.set(false);
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

      case 'filterCreatedByMe':
        this.resultsListFilterSE.filterCreatedByMe.set(false);
        break;

      case 'filterSubmittedByMe':
        this.resultsListFilterSE.filterSubmittedByMe.set(false);
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
    this.tempFilterCreatedByMe.set(this.resultsListFilterSE.filterCreatedByMe());
    this.tempFilterSubmittedByMe.set(this.resultsListFilterSE.filterSubmittedByMe());
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
    this.resultsListFilterSE.filterCreatedByMe.set(this.tempFilterCreatedByMe());
    this.resultsListFilterSE.filterSubmittedByMe.set(this.tempFilterSubmittedByMe());
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
    this.tempFilterCreatedByMe.set(this.resultsListFilterSE.filterCreatedByMe());
    this.tempFilterSubmittedByMe.set(this.resultsListFilterSE.filterSubmittedByMe());
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
      leadCenters: this.resultsListFilterSE.selectedLeadCenters(),
      ...(this.resultsListFilterSE.filterCreatedByMe() ? { filterCreatedByMe: true } : {}),
      ...(this.resultsListFilterSE.filterSubmittedByMe() ? { filterSubmittedByMe: true } : {}),
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
    const selectedColumns = this.expandP25SelectedColumnsForExport(
      Array.from(
        new Set([...this.p25RequiredColumns, ...this.p25OptionalSelectedColumns()]),
      ),
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

  /**
   * One drawer checkbox (`section_5_metadata`) expands to Section 7 view columns.
   * If the list is filtered by indicator category, only metadata columns for those result types are included;
   * with no indicator filter, all Section 7 families are included.
   */
  private expandP25SelectedColumnsForExport(selected: string[]): string[] {
    const withoutFlag = selected.filter((c) => c !== 'section_5_metadata');
    if (!selected.includes('section_5_metadata')) {
      return withoutFlag;
    }
    const section7 = this.resolveSection7ColumnsForAppliedIndicatorFilters();
    return Array.from(new Set([...withoutFlag, ...section7]));
  }

  /**
   * Uses applied indicator-category filters (`id` = result_type_id). Multiple categories union their `s7_*` groups.
   */
  private resolveSection7ColumnsForAppliedIndicatorFilters(): string[] {
    const categories = this.resultsListFilterSE.selectedIndicatorCategories() as Array<{ id?: number }>;
    const typeIds = new Set<number>();
    for (const c of categories) {
      if (typeof c?.id === 'number') typeIds.add(c.id);
    }
    if (typeIds.size === 0) {
      return [...P25_SECTION_7_EXPORT_COLUMNS];
    }
    const out = new Set<string>();
    for (const rtId of typeIds) {
      const prefix = P25_SECTION_7_PREFIX_BY_RESULT_TYPE_ID[rtId];
      if (!prefix) continue;
      for (const col of P25_SECTION_7_EXPORT_COLUMNS) {
        if (col.startsWith(prefix)) out.add(col);
      }
    }
    return Array.from(out);
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
    if (this.resultsListFilterSE.selectedPhases().length === 0) {
      return 'Select at least one phase to export.';
    }

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

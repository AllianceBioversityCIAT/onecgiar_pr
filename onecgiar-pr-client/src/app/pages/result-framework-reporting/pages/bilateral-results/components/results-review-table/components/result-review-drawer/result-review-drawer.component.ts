import { ChangeDetectionStrategy, Component, effect, model, OnDestroy, OnInit, signal } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';

export interface ResultToReview {
  code: string;
  title: string;
  indicator_category: string;
  status: string;
  toc_result: string;
  toc_result_id?: string;
  indicator: string;
  indicator_id?: string;
  submission_date: string;
  submitted_by?: string;
  entity_acronym?: string;
  entity_code?: string;
  // MDS fields
  toc_alignment?: boolean;
  result_description?: string;
  geographic_scope?: string;
  regions?: string[];
  countries?: string[];
}

export interface MdsField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'radio' | 'number';
  mandatory: boolean;
  options?: { label: string; value: string }[];
  value?: any;
  conditionalOn?: string;
}

interface SelectOption {
  label: string;
  value: string | number;
}

// MDS Field configurations by indicator category
const MDS_FIELDS_CONFIG: { [key: string]: MdsField[] } = {
  'Capacity Sharing for Development': [
    { name: 'people_trained_male', label: '# People trained (Male)', type: 'number', mandatory: true },
    { name: 'people_trained_female', label: '# People trained (Female)', type: 'number', mandatory: true },
    { name: 'people_trained_non_binary', label: '# People trained (Non-binary)', type: 'number', mandatory: false },
    { name: 'people_trained_unknown', label: '# People trained (Unknown)', type: 'number', mandatory: false },
    {
      name: 'training_term',
      label: 'Long-term or short-term',
      type: 'radio',
      mandatory: true,
      options: [
        { label: 'Long-term', value: 'long_term' },
        { label: 'Short-term', value: 'short_term' }
      ]
    },
    {
      name: 'delivery_method',
      label: 'Delivery method',
      type: 'select',
      mandatory: false,
      options: [
        { label: 'In-person', value: 'in_person' },
        { label: 'Online', value: 'online' },
        { label: 'Hybrid', value: 'hybrid' }
      ]
    },
    {
      name: 'trainees_on_behalf_org',
      label: 'Trainees attending on behalf of an organization',
      type: 'radio',
      mandatory: true,
      options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' }
      ]
    }
  ],
  'Knowledge Product': [
    {
      name: 'is_melia',
      label: 'Is it a MELIA?',
      type: 'radio',
      mandatory: true,
      options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' }
      ]
    },
    {
      name: 'melia_planned_ost',
      label: 'MELIA previously planned in the OST?',
      type: 'radio',
      mandatory: true,
      conditionalOn: 'is_melia:yes',
      options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' }
      ]
    },
    { name: 'permanent_identifier', label: 'Permanent unique Identifier (from CGSpace)', type: 'text', mandatory: false },
    { name: 'issue_date', label: 'Issue date (from CGSpace)', type: 'text', mandatory: false },
    { name: 'kp_title', label: 'Title (from CGSpace)', type: 'text', mandatory: false },
    { name: 'authors', label: 'Authors (from CGSpace)', type: 'text', mandatory: false },
    {
      name: 'kp_type',
      label: 'KP type (from CGSpace)',
      type: 'select',
      mandatory: false,
      options: [
        { label: 'Journal Article', value: 'journal_article' },
        { label: 'Book', value: 'book' },
        { label: 'Book Chapter', value: 'book_chapter' },
        { label: 'Report', value: 'report' },
        { label: 'Working Paper', value: 'working_paper' },
        { label: 'Dataset', value: 'dataset' },
        { label: 'Other', value: 'other' }
      ]
    },
    {
      name: 'peer_reviewed',
      label: 'Peer reviewed (from CGSpace)',
      type: 'radio',
      mandatory: false,
      options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' }
      ]
    },
    {
      name: 'wos_core_collection',
      label: 'Web of Science Core Collection (from CGSpace)',
      type: 'radio',
      mandatory: false,
      options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' }
      ]
    },
    {
      name: 'accessibility',
      label: 'Accessibility (from CGSpace)',
      type: 'select',
      mandatory: false,
      options: [
        { label: 'Open Access', value: 'open_access' },
        { label: 'Limited Access', value: 'limited_access' },
        { label: 'Restricted', value: 'restricted' }
      ]
    }
  ],
  'Innovation Development': [
    { name: 'short_title', label: 'Short title (10 words)', type: 'text', mandatory: true },
    { name: 'long_title', label: 'Long title', type: 'text', mandatory: false },
    {
      name: 'innovation_nature',
      label: 'Innovation nature',
      type: 'select',
      mandatory: true,
      options: [
        { label: 'Incremental', value: 'incremental' },
        { label: 'Radical/Disruptive', value: 'radical_disruptive' },
        { label: 'Other', value: 'other' }
      ]
    },
    {
      name: 'typology',
      label: 'Typology',
      type: 'select',
      mandatory: true,
      options: [
        { label: 'Technology', value: 'technology' },
        { label: 'Capacity Development', value: 'capacity_dev' },
        { label: 'Policy', value: 'policy' },
        { label: 'Other', value: 'other' }
      ]
    },
    {
      name: 'new_variety_breed',
      label: 'Are you profiling a new or improved variety or breed?',
      type: 'radio',
      mandatory: true,
      options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' }
      ]
    },
    { name: 'megatrends_contribution', label: 'Contribution to Megatrends', type: 'textarea', mandatory: true },
    { name: 'anticipated_use', label: 'Anticipated innovation use (actor, org, other)', type: 'textarea', mandatory: true },
    { name: 'gesi', label: 'Responsible innovation and scaling – GESI', type: 'textarea', mandatory: true },
    { name: 'unintended_consequences', label: 'Responsible innovation and scaling – Unintended negative consequences', type: 'textarea', mandatory: true },
    {
      name: 'ip_rights',
      label: 'Intellectual property rights',
      type: 'select',
      mandatory: true,
      options: [
        { label: 'Patent', value: 'patent' },
        { label: 'Copyright', value: 'copyright' },
        { label: 'Open Source', value: 'open_source' },
        { label: 'None', value: 'none' }
      ]
    },
    { name: 'developer', label: 'Developer', type: 'text', mandatory: false },
    { name: 'collaborators', label: 'Collaborators', type: 'text', mandatory: false },
    { name: 'team_diversity', label: 'Innovation team diversity', type: 'textarea', mandatory: true },
    {
      name: 'readiness_level',
      label: 'Innovation Readiness Level',
      type: 'select',
      mandatory: true,
      options: [
        { label: 'Level 1 - Basic research', value: '1' },
        { label: 'Level 2 - Applied research', value: '2' },
        { label: 'Level 3 - Proof of concept', value: '3' },
        { label: 'Level 4 - Pilot testing', value: '4' },
        { label: 'Level 5 - Validated in real environment', value: '5' },
        { label: 'Level 6 - Demonstrated at scale', value: '6' },
        { label: 'Level 7 - Ready for adoption', value: '7' },
        { label: 'Level 8 - Proven at scale', value: '8' },
        { label: 'Level 9 - Widely adopted', value: '9' }
      ]
    },
    { name: 'readiness_justification', label: 'Innovation Readiness Level justification', type: 'textarea', mandatory: true },
    { name: 'estimated_investment', label: 'Estimated USD investment', type: 'number', mandatory: true }
  ],
  'Policy Change': [
    {
      name: 'link_capacity_dev',
      label: 'Link to the capacity development of key actors in a policy process OR a policy change',
      type: 'textarea',
      mandatory: true
    },
    {
      name: 'link_engagement_activity',
      label: 'Link to any engagement activity or event',
      type: 'radio',
      mandatory: true,
      options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' }
      ]
    },
    {
      name: 'policy_type',
      label: 'Policy type',
      type: 'select',
      mandatory: true,
      options: [
        { label: 'Legal instrument', value: 'legal' },
        { label: 'Strategy/Policy', value: 'strategy' },
        { label: 'Budget/Investment', value: 'budget' },
        { label: 'Curriculum', value: 'curriculum' },
        { label: 'Other', value: 'other' }
      ]
    },
    { name: 'usd_amount', label: 'USD amount', type: 'number', mandatory: false },
    {
      name: 'usd_status',
      label: 'Status: Confirmed/estimated/unknown',
      type: 'select',
      mandatory: false,
      options: [
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Estimated', value: 'estimated' },
        { label: 'Unknown', value: 'unknown' }
      ]
    },
    {
      name: 'stage',
      label: 'Stage',
      type: 'select',
      mandatory: true,
      options: [
        { label: 'Stage 1 - Research taken up', value: '1' },
        { label: 'Stage 2 - Policy/Strategy formulated', value: '2' },
        { label: 'Stage 3 - Policy/Strategy implemented', value: '3' }
      ]
    },
    { name: 'policy_implementation', label: 'Policy implementation (Whose policy is this?)', type: 'textarea', mandatory: true }
  ],
  'Innovation Use': [{ name: 'current_usage_numbers', label: 'Current Innovation usage numbers + evidence', type: 'textarea', mandatory: true }]
};

@Component({
  selector: 'app-result-review-drawer',
  imports: [
    DrawerModule,
    CommonModule,
    FormsModule,
    RadioButtonModule,
    SelectModule,
    TextareaModule,
    MultiSelectModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule
  ],
  templateUrl: './result-review-drawer.component.html',
  styleUrl: './result-review-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultReviewDrawerComponent implements OnInit, OnDestroy {
  visible = model<boolean>(false);
  resultToReview = model<ResultToReview | null>(null);
  drawerFullScreen = signal<boolean>(false);

  // Common fields (always visible)
  tocAlignmentValue: boolean = true;
  selectedTocResult: string | null = null;
  selectedIndicator: string | null = null;
  resultDescription: string = '';
  geographicScope: string = 'global';
  selectedRegions: string[] = [];
  selectedCountries: string[] = [];
  updateExplanation: string = '';
  rejectJustification: string = '';

  // Dynamic MDS fields storage
  dynamicFieldValues: { [key: string]: any } = {};

  // Current indicator-specific fields
  currentIndicatorFields: MdsField[] = [];

  // Track original values
  private originalTocResult: string | null = null;
  private originalIndicator: string | null = null;
  private originalTocAlignment: boolean = true;
  private originalDescription: string = '';
  private originalGeographicScope: string = '';
  private originalRegions: string[] = [];
  private originalCountries: string[] = [];
  private originalDynamicValues: { [key: string]: any } = {};

  // Dialog state
  showConfirmApproveDialog = signal<boolean>(false);
  showConfirmRejectDialog = signal<boolean>(false);

  // Dropdown options
  tocResultOptions: SelectOption[] = [
    {
      label: 'AOW04 - Ca2030 Outcome - Small-scale producers and other actors use climate advisory services...',
      value: 'aow04'
    },
    { label: 'AOW01 - Evidence generated to support policy development in Africa and Asia', value: 'aow01' },
    { label: 'AOW02 - New wheat varieties adopted by farmers in target regions', value: 'aow02' },
    { label: 'AOW03 - Enhanced seed systems supporting wheat production', value: 'aow03' },
    { label: 'AOW05 - Climate-smart farming innovations with evidence at scale', value: 'aow05' },
    { label: 'AOW06 - Early warning systems for wheat diseases implemented', value: 'aow06' }
  ];

  indicatorOptions: SelectOption[] = [
    { label: 'Number of small-scale producers using climate services', value: 'ind01' },
    { label: 'Number of farmers adopting new learning resources', value: 'ind02' },
    { label: 'Number of policy instruments influenced by research', value: 'ind03' },
    { label: 'Number of innovations sessions delivered', value: 'ind04' }
  ];

  regionOptions: SelectOption[] = [
    { label: 'Africa', value: 'africa' },
    { label: 'Western Africa', value: 'western_africa' },
    { label: 'Eastern Africa', value: 'eastern_africa' },
    { label: 'Asia', value: 'asia' },
    { label: 'Latin America', value: 'latin_america' }
  ];

  countryOptions: SelectOption[] = [
    { label: 'Kenya', value: 'kenya' },
    { label: 'Ethiopia', value: 'ethiopia' },
    { label: 'Nigeria', value: 'nigeria' },
    { label: 'India', value: 'india' },
    { label: 'Mexico', value: 'mexico' }
  ];

  geographicScopeOptions = [
    { label: 'Global', value: 'global' },
    { label: 'Regional', value: 'regional' },
    { label: 'Country', value: 'country' },
    { label: 'Sub-national', value: 'sub_national' },
    { label: 'This is yet to be determined', value: 'tbd' }
  ];

  constructor() {
    effect(() => {
      const result = this.resultToReview();
      if (result && this.visible()) {
        this.initializeFormFromResult(result);
      }
    });
  }

  private initializeFormFromResult(result: ResultToReview): void {
    // Initialize common fields
    this.tocAlignmentValue = result.toc_alignment ?? true;
    this.selectedTocResult = result.toc_result_id ?? 'aow04';
    this.selectedIndicator = result.indicator_id ?? 'ind01';
    this.resultDescription = result.result_description ?? '';
    this.geographicScope = result.geographic_scope ?? 'global';
    this.selectedRegions = result.regions ? [...result.regions] : [];
    this.selectedCountries = result.countries ? [...result.countries] : [];
    this.updateExplanation = '';

    // Load indicator-specific fields
    this.loadIndicatorFields(result.indicator_category);

    // Store original values
    this.storeOriginalValues();
  }

  loadIndicatorFields(indicatorCategory: string): void {
    this.currentIndicatorFields = MDS_FIELDS_CONFIG[indicatorCategory] || [];
    this.dynamicFieldValues = {};

    // Initialize default values for each field
    this.currentIndicatorFields.forEach(field => {
      if (field.type === 'number') {
        this.dynamicFieldValues[field.name] = 0;
      } else if (field.type === 'radio' || field.type === 'select') {
        this.dynamicFieldValues[field.name] = field.options?.[0]?.value || null;
      } else {
        this.dynamicFieldValues[field.name] = '';
      }
    });
  }

  isFieldVisible(field: MdsField): boolean {
    if (!field.conditionalOn) return true;

    const [condField, condValue] = field.conditionalOn.split(':');
    return this.dynamicFieldValues[condField] === condValue;
  }

  private storeOriginalValues(): void {
    this.originalTocResult = this.selectedTocResult;
    this.originalIndicator = this.selectedIndicator;
    this.originalTocAlignment = this.tocAlignmentValue;
    this.originalDescription = this.resultDescription;
    this.originalGeographicScope = this.geographicScope;
    this.originalRegions = [...this.selectedRegions];
    this.originalCountries = [...this.selectedCountries];
    this.originalDynamicValues = { ...this.dynamicFieldValues };
  }

  hasModifications(): boolean {
    const commonModified =
      this.selectedTocResult !== this.originalTocResult ||
      this.selectedIndicator !== this.originalIndicator ||
      this.tocAlignmentValue !== this.originalTocAlignment ||
      this.resultDescription !== this.originalDescription ||
      this.geographicScope !== this.originalGeographicScope ||
      JSON.stringify(this.selectedRegions) !== JSON.stringify(this.originalRegions) ||
      JSON.stringify(this.selectedCountries) !== JSON.stringify(this.originalCountries);

    const dynamicModified = JSON.stringify(this.dynamicFieldValues) !== JSON.stringify(this.originalDynamicValues);

    return commonModified || dynamicModified;
  }

  canApproveOrReject(): boolean {
    if (this.hasModifications()) {
      return this.updateExplanation.trim().length > 0;
    }
    return true;
  }

  toggleFullScreen(): void {
    this.drawerFullScreen.set(!this.drawerFullScreen());
  }

  closeDrawer(): void {
    this.visible.set(false);
    this.drawerFullScreen.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.updateExplanation = '';
    this.rejectJustification = '';
    this.showConfirmApproveDialog.set(false);
    this.showConfirmRejectDialog.set(false);
  }

  removeRegion(regionValue: string): void {
    this.selectedRegions = this.selectedRegions.filter(r => r !== regionValue);
  }

  removeCountry(countryValue: string): void {
    this.selectedCountries = this.selectedCountries.filter(c => c !== countryValue);
  }

  getRegionLabel(value: string): string {
    return this.regionOptions.find(r => r.value === value)?.label || value;
  }

  getCountryLabel(value: string): string {
    return this.countryOptions.find(c => c.value === value)?.label || value;
  }

  saveTocChanges(): void {
    console.log('=== SAVE TOC CHANGES ===');
    console.log({
      toc_alignment: this.tocAlignmentValue,
      toc_result_id: this.selectedTocResult,
      indicator_id: this.selectedIndicator
    });
  }

  onApprove(): void {
    if (this.hasModifications() && !this.updateExplanation.trim()) {
      return;
    }
    this.showConfirmApproveDialog.set(true);
  }

  confirmApprove(): void {
    const result = this.resultToReview();
    const formData = {
      action: 'APPROVE',
      result_code: result?.code,
      result_title: result?.title,
      indicator_category: result?.indicator_category,
      toc_alignment: {
        is_aligned: this.tocAlignmentValue,
        toc_result_id: this.selectedTocResult,
        indicator_id: this.selectedIndicator
      },
      data_standards: {
        result_description: this.resultDescription,
        geographic_scope: this.geographicScope,
        regions: this.selectedRegions,
        countries: this.selectedCountries
      },
      indicator_specific_fields: this.dynamicFieldValues,
      has_modifications: this.hasModifications(),
      update_explanation: this.hasModifications() ? this.updateExplanation : null
    };

    console.log('=== APPROVE RESULT - FORM DATA ===');
    console.log(JSON.stringify(formData, null, 2));
    console.log('==================================');

    this.showConfirmApproveDialog.set(false);
    this.closeDrawer();
  }

  cancelApprove(): void {
    this.showConfirmApproveDialog.set(false);
  }

  onReject(): void {
    this.showConfirmRejectDialog.set(true);
  }

  confirmReject(): void {
    if (!this.rejectJustification.trim()) {
      return;
    }

    const result = this.resultToReview();
    const formData = {
      action: 'REJECT',
      result_code: result?.code,
      result_title: result?.title,
      rejection_justification: this.rejectJustification
    };

    console.log('=== REJECT RESULT - FORM DATA ===');
    console.log(JSON.stringify(formData, null, 2));
    console.log('=================================');

    this.showConfirmRejectDialog.set(false);
    this.closeDrawer();
  }

  cancelReject(): void {
    this.showConfirmRejectDialog.set(false);
    this.rejectJustification = '';
  }

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = 'auto';
  }
}

import { ChangeDetectionStrategy, Component, computed, effect, model, OnDestroy, OnInit, signal } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

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

interface SelectOption {
  label: string;
  value: string | number;
}

@Component({
  selector: 'app-result-review-drawer',
  imports: [DrawerModule, CommonModule, FormsModule, RadioButtonModule, SelectModule, TextareaModule, MultiSelectModule, ButtonModule, DialogModule],
  templateUrl: './result-review-drawer.component.html',
  styleUrl: './result-review-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultReviewDrawerComponent implements OnInit, OnDestroy {
  visible = model<boolean>(false);
  resultToReview = model<ResultToReview | null>(null);
  drawerFullScreen = signal<boolean>(false);

  // Form state signals
  tocAlignmentValue = signal<boolean>(true);
  selectedTocResult = signal<string | null>(null);
  selectedIndicator = signal<string | null>(null);
  resultDescription = signal<string>('');
  geographicScope = signal<string>('global');
  selectedRegions = signal<string[]>([]);
  selectedCountries = signal<string[]>([]);
  updateExplanation = signal<string>('');

  // Track original values to detect changes
  private readonly originalTocResult = signal<string | null>(null);
  private readonly originalIndicator = signal<string | null>(null);
  private readonly originalTocAlignment = signal<boolean>(true);
  private readonly originalDescription = signal<string>('');
  private readonly originalGeographicScope = signal<string>('');
  private readonly originalRegions = signal<string[]>([]);
  private readonly originalCountries = signal<string[]>([]);

  // Computed signal to check if any field was modified
  hasModifications = computed(() => {
    return (
      this.selectedTocResult() !== this.originalTocResult() ||
      this.selectedIndicator() !== this.originalIndicator() ||
      this.tocAlignmentValue() !== this.originalTocAlignment() ||
      this.resultDescription() !== this.originalDescription() ||
      this.geographicScope() !== this.originalGeographicScope() ||
      JSON.stringify(this.selectedRegions()) !== JSON.stringify(this.originalRegions()) ||
      JSON.stringify(this.selectedCountries()) !== JSON.stringify(this.originalCountries())
    );
  });

  // Computed signal to check if explanation is required and valid
  canApproveOrReject = computed(() => {
    if (this.hasModifications()) {
      return this.updateExplanation().trim().length > 0;
    }
    return true;
  });

  // Dialog signals
  showConfirmApproveDialog = signal<boolean>(false);
  showConfirmRejectDialog = signal<boolean>(false);
  rejectJustification = signal<string>('');

  // Dropdown options
  tocResultOptions = signal<SelectOption[]>([
    {
      label: 'AOW04 - Ca2030 Outcome - Small-scale producers and other actors use climate advisory services, early warning or adaptive...',
      value: 'aow04'
    },
    { label: 'AOW01 - Evidence generated to support policy development in Africa and Asia', value: 'aow01' },
    { label: 'AOW02 - New wheat varieties adopted by farmers in target regions', value: 'aow02' },
    { label: 'AOW03 - Enhanced seed systems supporting wheat production', value: 'aow03' },
    { label: 'AOW05 - Climate-smart farming innovations with evidence at scale', value: 'aow05' },
    { label: 'AOW06 - Early warning systems for wheat diseases implemented', value: 'aow06' },
    { label: 'AOW07 - Policies supporting sustainable rice production adopted', value: 'aow07' },
    { label: 'AOW08 - Water-efficient irrigation systems developed and tested', value: 'aow08' },
    { label: 'AOW09 - Digital tools adopted by rice farmers and traders', value: 'aow09' },
    { label: 'AOW10 - Best practices for nutrient management disseminated', value: 'aow10' }
  ]);

  indicatorOptions = signal<SelectOption[]>([
    {
      label: 'Number of small-scale producers and/or other FLW system actors using climate services, EWS, or adaptive safety nets',
      value: 'ind01'
    },
    { label: 'Number of farmers adopting new learning resources', value: 'ind02' },
    { label: 'Number of policy instruments influenced by research', value: 'ind03' },
    { label: 'Number of innovations sessions on smart practices delivered', value: 'ind04' },
    { label: 'Number of farmers adopting drought-resistant varieties', value: 'ind05' },
    { label: 'Number of seed producers trained in multiplication techniques', value: 'ind06' },
    { label: 'Number of surveillance stations operational', value: 'ind07' },
    { label: 'Number of water-saving technologies validated', value: 'ind08' },
    { label: 'Number of farmers using digital market platforms', value: 'ind09' },
    { label: 'Number of extension materials distributed to farmers', value: 'ind10' }
  ]);

  regionOptions = signal<SelectOption[]>([
    { label: 'Africa', value: 'africa' },
    { label: 'Western Africa', value: 'western_africa' },
    { label: 'Eastern Africa', value: 'eastern_africa' },
    { label: 'Northern Africa', value: 'northern_africa' },
    { label: 'Southern Africa', value: 'southern_africa' },
    { label: 'Asia', value: 'asia' },
    { label: 'Southeast Asia', value: 'southeast_asia' },
    { label: 'South Asia', value: 'south_asia' },
    { label: 'Latin America', value: 'latin_america' },
    { label: 'Central America', value: 'central_america' },
    { label: 'Europe', value: 'europe' }
  ]);

  countryOptions = signal<SelectOption[]>([
    { label: 'Kenya', value: 'kenya' },
    { label: 'Ethiopia', value: 'ethiopia' },
    { label: 'Nigeria', value: 'nigeria' },
    { label: 'Ghana', value: 'ghana' },
    { label: 'Tanzania', value: 'tanzania' },
    { label: 'Uganda', value: 'uganda' },
    { label: 'India', value: 'india' },
    { label: 'Bangladesh', value: 'bangladesh' },
    { label: 'Mexico', value: 'mexico' },
    { label: 'Colombia', value: 'colombia' },
    { label: 'Vietnam', value: 'vietnam' },
    { label: 'Philippines', value: 'philippines' },
    { label: 'Indonesia', value: 'indonesia' },
    { label: 'Thailand', value: 'thailand' }
  ]);

  geographicScopeOptions = [
    { label: 'Global', value: 'global' },
    { label: 'Regional', value: 'regional' },
    { label: 'Country', value: 'country' },
    { label: 'Sub-national', value: 'sub_national' },
    { label: 'This is yet to be determined', value: 'tbd' }
  ];

  constructor() {
    // Effect to initialize form when result changes
    effect(() => {
      const result = this.resultToReview();
      if (result && this.visible()) {
        this.initializeFormFromResult(result);
      }
    });
  }

  private initializeFormFromResult(result: ResultToReview): void {
    // Initialize form fields with result data
    this.tocAlignmentValue.set(result.toc_alignment ?? true);
    this.selectedTocResult.set(result.toc_result_id ?? 'aow04');
    this.selectedIndicator.set(result.indicator_id ?? 'ind01');
    this.resultDescription.set(result.result_description ?? '');
    this.geographicScope.set(result.geographic_scope ?? 'global');
    this.selectedRegions.set(result.regions ? [...result.regions] : []);
    this.selectedCountries.set(result.countries ? [...result.countries] : []);
    this.updateExplanation.set('');

    // Store original values for comparison
    this.storeOriginalValues();
  }

  private storeOriginalValues(): void {
    this.originalTocResult.set(this.selectedTocResult());
    this.originalIndicator.set(this.selectedIndicator());
    this.originalTocAlignment.set(this.tocAlignmentValue());
    this.originalDescription.set(this.resultDescription());
    this.originalGeographicScope.set(this.geographicScope());
    this.originalRegions.set([...this.selectedRegions()]);
    this.originalCountries.set([...this.selectedCountries()]);
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
    this.updateExplanation.set('');
    this.rejectJustification.set('');
    this.showConfirmApproveDialog.set(false);
    this.showConfirmRejectDialog.set(false);
  }

  // Remove a region chip
  removeRegion(regionValue: string): void {
    this.selectedRegions.set(this.selectedRegions().filter(r => r !== regionValue));
  }

  // Remove a country chip
  removeCountry(countryValue: string): void {
    this.selectedCountries.set(this.selectedCountries().filter(c => c !== countryValue));
  }

  // Get label for a region value
  getRegionLabel(value: string): string {
    return this.regionOptions().find(r => r.value === value)?.label || value;
  }

  // Get label for a country value
  getCountryLabel(value: string): string {
    return this.countryOptions().find(c => c.value === value)?.label || value;
  }

  // Get label for TOC result value
  getTocResultLabel(value: string | null): string {
    if (!value) return '';
    return this.tocResultOptions().find(t => t.value === value)?.label || value;
  }

  // Get label for indicator value
  getIndicatorLabel(value: string | null): string {
    if (!value) return '';
    return this.indicatorOptions().find(i => i.value === value)?.label || value;
  }

  // Save TOC changes
  saveTocChanges(): void {
    console.log('=== SAVE TOC CHANGES ===');
    console.log({
      toc_alignment: this.tocAlignmentValue(),
      toc_result_id: this.selectedTocResult(),
      toc_result_label: this.getTocResultLabel(this.selectedTocResult()),
      indicator_id: this.selectedIndicator(),
      indicator_label: this.getIndicatorLabel(this.selectedIndicator())
    });
  }

  // Approve flow
  onApprove(): void {
    if (this.hasModifications() && !this.updateExplanation().trim()) {
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
      entity_acronym: result?.entity_acronym,
      entity_code: result?.entity_code,
      toc_alignment: {
        is_aligned: this.tocAlignmentValue(),
        toc_result_id: this.selectedTocResult(),
        toc_result_label: this.getTocResultLabel(this.selectedTocResult()),
        indicator_id: this.selectedIndicator(),
        indicator_label: this.getIndicatorLabel(this.selectedIndicator())
      },
      data_standards: {
        result_description: this.resultDescription(),
        geographic_scope: this.geographicScope(),
        regions: this.selectedRegions(),
        regions_labels: this.selectedRegions().map(r => this.getRegionLabel(r)),
        countries: this.selectedCountries(),
        countries_labels: this.selectedCountries().map(c => this.getCountryLabel(c))
      },
      has_modifications: this.hasModifications(),
      update_explanation: this.hasModifications() ? this.updateExplanation() : null
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

  // Reject flow
  onReject(): void {
    this.showConfirmRejectDialog.set(true);
  }

  confirmReject(): void {
    if (!this.rejectJustification().trim()) {
      return;
    }

    const result = this.resultToReview();
    const formData = {
      action: 'REJECT',
      result_code: result?.code,
      result_title: result?.title,
      entity_acronym: result?.entity_acronym,
      entity_code: result?.entity_code,
      rejection_justification: this.rejectJustification()
    };

    console.log('=== REJECT RESULT - FORM DATA ===');
    console.log(JSON.stringify(formData, null, 2));
    console.log('=================================');

    this.showConfirmRejectDialog.set(false);
    this.closeDrawer();
  }

  cancelReject(): void {
    this.showConfirmRejectDialog.set(false);
    this.rejectJustification.set('');
  }

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = 'auto';
  }
}

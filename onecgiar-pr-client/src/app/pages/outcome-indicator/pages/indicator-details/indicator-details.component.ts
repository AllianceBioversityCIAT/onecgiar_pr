import { CommonModule, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ActivatedRoute } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { OutcomeIndicatorService } from '../../services/outcome-indicator.service';
import { IndicatorDetailsService } from './services/indicator-details.service';
import { DetailsTableComponent } from './components/details-table/details-table.component';
import { IndicatorResultsModalComponent } from './components/indicator-results-modal/indicator-results-modal.component';

@Component({
  selector: 'app-indicator-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CustomFieldsModule,
    InputNumberModule,
    TableModule,
    ButtonModule,
    ToastModule,
    DetailsTableComponent,
    IndicatorResultsModalComponent
  ],
  providers: [MessageService],
  templateUrl: './indicator-details.component.html',
  styleUrls: ['./indicator-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IndicatorDetailsComponent implements OnInit {
  indicatorInfoItems = [
    { icon: 'login', label: 'Outcome', value: 'outcome_name', iconClass: 'material-icons-round' },
    { icon: 'show_chart', label: 'Unit of measurement', value: 'unit_measurement', iconClass: 'material-icons-round' },
    { icon: '', label: 'Baseline', value: 'indicator_baseline', iconClass: 'pi pi-chart-bar' },
    { icon: '', label: 'Target', value: 'indicator_target', iconClass: 'pi pi-bullseye' }
  ];

  loading = signal<boolean>(true);

  constructor(
    public location: Location,
    public api: ApiService,
    public activatedRoute: ActivatedRoute,
    public messageService: MessageService,
    public outcomeIService: OutcomeIndicatorService,
    public indicatorDetailsService: IndicatorDetailsService
  ) {}

  ngOnInit() {
    this.getQueryParams();
    this.getIndicatorData();
  }

  goBack() {
    this.location.back();
  }

  getIndicatorData() {
    if (!this.indicatorDetailsService.indicatorId()) {
      this.goBack();
      return;
    }

    this.api.resultsSE.GET_contributionsToIndicators_indicator(this.indicatorDetailsService.indicatorId()).subscribe({
      next: response => this.handleGetIndicatorResponse(response),
      error: error => this.handleError(error)
    });
  }

  handleGetIndicatorResponse(response: any) {
    if (response?.status === 404) {
      this.api.resultsSE.POST_contributionsToIndicators(this.indicatorDetailsService.indicatorId()).subscribe({
        next: () => this.retryGetIndicatorData(),
        error: error => this.handleError(error)
      });
    } else {
      this.updateIndicatorData(response);
    }
  }

  retryGetIndicatorData() {
    this.api.resultsSE.GET_contributionsToIndicators_indicator(this.indicatorDetailsService.indicatorId()).subscribe({
      next: response => this.updateIndicatorData(response),
      error: error => this.handleError(error)
    });
  }

  updateIndicatorData(response: any) {
    this.indicatorDetailsService.indicatorData.set(response?.contributionToIndicator);
    this.indicatorDetailsService.getIndicatorDetailsResults(this.indicatorDetailsService.indicatorData().initiative_official_code);

    if (this.outcomeIService.initiativeIdFilter !== this.indicatorDetailsService.indicatorData().initiative_official_code) {
      this.outcomeIService.initiativeIdFilter = this.indicatorDetailsService.indicatorData().initiative_official_code;
      setTimeout(() => {
        this.outcomeIService.getWorkPackagesData();
        this.outcomeIService.getEOIsData();
      }, 800);
    }
    this.loading.set(false);
  }

  handleError(error: any) {
    console.error('Error loading initiatives:', error);
    this.loading.set(false);
    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'An error occurred', key: 'br' });
  }

  getQueryParams() {
    this.activatedRoute.queryParams.subscribe(params => {
      this.indicatorDetailsService.indicatorId.set(params['indicatorId']);
      this.indicatorDetailsService.platformId.set(params['platform']);
    });
  }

  handleSaveIndicatorData() {
    this.loading.set(true);

    this.api.resultsSE
      .PATCH_contributionsToIndicators(this.indicatorDetailsService.indicatorData(), this.indicatorDetailsService.indicatorId())
      .subscribe({
        next: () => {
          this.getIndicatorData();
          this.updatePlatformData();
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Indicator data saved successfully', key: 'br' });
        },
        error: error => this.handleError(error)
      });
  }

  private updatePlatformData() {
    if (this.indicatorDetailsService.platformId()) {
      if (this.indicatorDetailsService.platformId() === 'eoi') {
        this.outcomeIService.getEOIsData();
      } else if (this.indicatorDetailsService.platformId() === 'wps') {
        this.outcomeIService.getWorkPackagesData();
      }
    }
  }

  handleSubmitIndicator() {
    if (this.indicatorDetailsService.indicatorData().submission_status == '0' && this.isSubmitDisabled()) {
      return;
    }

    this.loading.set(true);

    this.api.resultsSE
      .PATCH_contributionsToIndicators(this.indicatorDetailsService.indicatorData(), this.indicatorDetailsService.indicatorId())
      .subscribe({
        next: () => this.onSubmitIndicator(),
        error: error => this.handleError(error)
      });
  }

  onSubmitIndicator(isUnsubmit = false) {
    this.api.resultsSE.POST_contributionsToIndicatorsSubmit(this.indicatorDetailsService.indicatorId()).subscribe({
      next: () => {
        this.getIndicatorData();
        this.updatePlatformData();
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Indicator ${isUnsubmit ? 'un-submitted' : 'submitted'} successfully`,
          key: 'br'
        });
      },
      error: error => this.handleError(error)
    });
  }

  handleUnsubmitIndicator() {
    this.api.alertsFe.show(
      {
        id: 'confirm-unsubmit-indicator',
        title: `Are you sure you want to un-submit?`,
        status: 'success',
        confirmText: 'Yes, un-submit'
      },
      () => {
        this.loading.set(true);
        this.onSubmitIndicator(true);
      }
    );
  }

  isSubmitDisabled() {
    return (
      this.indicatorDetailsService.indicatorData().achieved_in_2024 === null ||
      !this.indicatorDetailsService.indicatorData().narrative_achieved_in_2024 ||
      !this.indicatorDetailsService.indicatorData().contributing_results?.length
    );
  }
}

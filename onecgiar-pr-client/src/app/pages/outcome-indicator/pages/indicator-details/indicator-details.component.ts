import { CommonModule, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { IndicatorData } from './models/indicator-data.model';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ActivatedRoute } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { OutcomeIndicatorService } from '../../services/outcome-indicator.service';

@Component({
  selector: 'app-indicator-details',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomFieldsModule, InputNumberModule, TableModule, ButtonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './indicator-details.component.html',
  styleUrls: ['./indicator-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class IndicatorDetailsComponent implements OnInit {
  indicatorData = new IndicatorData();
  indicatorId: string;
  platformId: string;
  loading = true;

  indicatorInfoItems = [
    { icon: 'login', label: 'Outcome', value: 'outcome_name', iconClass: 'material-icons-round' },
    { icon: 'show_chart', label: 'Unit of measurement', value: 'unit_measurement', iconClass: 'material-icons-round' },
    { icon: '', label: 'Baseline', value: 'indicator_baseline', iconClass: 'pi pi-chart-bar' },
    { icon: '', label: 'Target', value: 'indicator_target', iconClass: 'pi pi-bullseye' }
  ];

  constructor(
    public location: Location,
    public api: ApiService,
    public activatedRoute: ActivatedRoute,
    public messageService: MessageService,
    public outcomeIService: OutcomeIndicatorService
  ) {}

  ngOnInit() {
    this.getQueryParams();
    this.getIndicatorData();
  }

  goBack() {
    this.location.back();
  }

  openInNewPage(result_code: string, version_id: string) {
    const url = `/result/result-detail/${result_code}/general-information?phase=${version_id}`;
    window.open(url, '_blank');
  }

  getIndicatorData() {
    if (!this.indicatorId) {
      this.goBack();
      return;
    }

    this.api.resultsSE.GET_contributionsToIndicators_indicator(this.indicatorId).subscribe({
      next: response => this.handleGetIndicatorResponse(response),
      error: error => this.handleError(error)
    });
  }

  handleGetIndicatorResponse(response: any) {
    if (response?.status === 404) {
      this.api.resultsSE.POST_contributionsToIndicators(this.indicatorId).subscribe({
        next: () => this.retryGetIndicatorData(),
        error: error => this.handleError(error)
      });
    } else {
      this.updateIndicatorData(response);
    }
  }

  retryGetIndicatorData() {
    this.api.resultsSE.GET_contributionsToIndicators_indicator(this.indicatorId).subscribe({
      next: response => this.updateIndicatorData(response),
      error: error => this.handleError(error)
    });
  }

  updateIndicatorData(response: any) {
    this.indicatorData = response?.contributionToIndicator;
    this.loading = false;
  }

  handleError(error: any) {
    console.error('Error loading initiatives:', error);
    this.loading = false;
    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'An error occurred', key: 'br' });
  }

  getQueryParams() {
    this.activatedRoute.queryParams.subscribe(params => {
      this.indicatorId = params['indicatorId'];
      this.platformId = params['platform'];
    });
  }

  handleSaveIndicatorData() {
    this.loading = true;
    this.api.resultsSE.PATCH_contributionsToIndicators(this.indicatorData, this.indicatorId).subscribe({
      next: () => {
        this.getIndicatorData();
        this.updatePlatformData();
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Indicator data saved successfully', key: 'br' });
      },
      error: error => this.handleError(error)
    });
  }

  handleRemoveIndicator(result, type: 'result' | 'linked') {
    if (this.indicatorData?.submission_status == '1') {
      return;
    }

    if (type === 'result' && !!result.linked_results) {
      result.linked_results.forEach(linked => (linked.is_active = false));
    }

    result.is_active = false;
  }

  private updatePlatformData() {
    if (this.platformId) {
      if (this.platformId === 'eoi') {
        this.outcomeIService.getEOIsData();
      } else if (this.platformId === 'wps') {
        this.outcomeIService.getWorkPackagesData();
      }
    }
  }

  handleSubmitIndicator() {
    if (this.indicatorData?.submission_status == '0' && this.isSubmitDisabled()) {
      return;
    }

    this.loading = true;

    this.api.resultsSE.PATCH_contributionsToIndicators(this.indicatorData, this.indicatorId).subscribe({
      next: () => this.onSubmitIndicator(),
      error: error => this.handleError(error)
    });
  }

  onSubmitIndicator(isUnsubmit = false) {
    this.api.resultsSE.POST_contributionsToIndicatorsSubmit(this.indicatorId).subscribe({
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
        this.loading = true;
        this.onSubmitIndicator(true);
      }
    );
  }

  isSubmitDisabled() {
    return (
      this.indicatorData.achieved_in_2024 === null ||
      !this.indicatorData.narrative_achieved_in_2024 ||
      !this.indicatorData.contributing_results?.length
    );
  }
}

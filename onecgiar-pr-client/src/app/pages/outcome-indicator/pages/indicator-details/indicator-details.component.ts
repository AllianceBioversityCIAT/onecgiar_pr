import { CommonModule, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { IndicatorData } from './models/indicator-data.model';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-indicator-details',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomFieldsModule, InputNumberModule, TableModule, ButtonModule],
  templateUrl: './indicator-details.component.html',
  styleUrl: './indicator-details.component.scss',
  changeDetection: ChangeDetectionStrategy.Default
})
export class IndicatorDetailsComponent implements OnInit {
  indicatorData = new IndicatorData();

  indicatorId: string;
  loading = true;

  indicatorInfoItems = [
    {
      icon: '',
      label: 'Work Package',
      value: 'workpackage_name',
      iconClass: 'pi pi-box'
    },
    {
      icon: 'login',
      label: 'Outcome',
      value: 'outcome_description',
      iconClass: 'material-icons-round'
    },
    {
      icon: 'show_chart',
      label: 'Unit of measurement',
      value: 'unit_measurement',
      iconClass: 'material-icons-round'
    },
    {
      icon: '',
      label: 'Baseline',
      value: 'indicator_baseline',
      iconClass: 'pi pi-chart-bar'
    },
    {
      icon: '',
      label: 'Target',
      value: 'indicator_target',
      iconClass: 'pi pi-bullseye'
    }
  ];

  constructor(
    private location: Location,
    public api: ApiService,
    public activatedRoute: ActivatedRoute
  ) {}

  ngOnInit() {
    this.getQueryParams();

    this.getIndicatorData();
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
  }

  getQueryParams() {
    this.activatedRoute.queryParams.subscribe(params => {
      this.indicatorId = params['indicatorId'];
    });
  }

  goBack() {
    this.location.back();
  }

  openInNewPage(result_code: string, version_id: string) {
    const url = `/result/result-detail/${result_code}/general-information?phase=${version_id}`;
    window.open(url, '_blank');
  }
}

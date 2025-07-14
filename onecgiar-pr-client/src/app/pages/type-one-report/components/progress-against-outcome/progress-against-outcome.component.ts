import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { OutcomeIndicatorService } from '../../../outcome-indicator/services/outcome-indicator.service';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
    selector: 'app-progress-against-outcome',
    imports: [SkeletonModule],
    templateUrl: './progress-against-outcome.component.html',
    styleUrl: './progress-against-outcome.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressAgainstOutcomeComponent {
  @Input() isWPS: boolean = false;
  @Input() loadingStatus: boolean = false;
  @Input() progressData = [];

  indicatorInfoItems = [
    { icon: 'show_chart', label: 'Unit of measurement', value: 'unit_of_measurement', iconClass: 'material-icons-round' },
    { icon: '', label: 'Baseline', value: 'indicator_baseline', iconClass: 'pi pi-chart-bar' },
    { icon: '', label: 'Target', value: 'indicator_target_value', iconClass: 'pi pi-bullseye' },
    { icon: 'ads_click', label: 'Target achieved', value: 'indicator_achieved_value', iconClass: 'material-icons-round' }
  ];

  constructor(public outcomeIService: OutcomeIndicatorService) {}

  generatePDFLink(result) {
    const pdfUrl = result.is_ipsr ? 'reports/ipsr-details/' : '/reports/result-details/';

    return `${pdfUrl}${result.result_code}?phase=${result.version_id}`;
  }
}

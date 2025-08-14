import { Component, Input } from '@angular/core';
import { environment } from '../../../../../../../../../../../environments/environment';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { RdTheoryOfChangesServicesService } from '../../../../rd-theory-of-changes-services.service';
import { MappedResultsModalServiceService } from '../multiple-wps/components/mapped-results-modal/mapped-results-modal-service.service';
@Component({
    selector: 'app-target-indicator',
    templateUrl: './target-indicator.component.html',
    styleUrls: ['./target-indicator.component.scss'],
    standalone: false
})
export class TargetIndicatorComponent {
  @Input() initiative: any;
  @Input() resultLevelId: any;

  constructor(public api: ApiService, public theoryOfChangesServices: RdTheoryOfChangesServicesService, public mappedResultService: MappedResultsModalServiceService) {}

  mappedResultsModal(statement, measure, overall, date, contributors: any) {
    this.mappedResultService.mappedResultsModal = true;
    this.mappedResultService.isTarget = true;

    this.mappedResultService.targetData = {
      statement: statement,
      measure: measure,
      overall: overall,
      date: date,
      contributors: contributors
    };

    this.mappedResultService.columnsOrder = [
      { title: 'Result code', attr: 'result_code' },
      { title: 'Title', attr: 'title', link: true },
      { title: 'Indicator category', attr: 'result_type_name' },
      { title: 'Phase', attr: 'phase_name' },
      { title: 'Contribution', attr: 'contributing_indicator' },
      { title: 'Progress narrative against the target', attr: 'target_progress_narrative' }
    ];
  }

  descriptionAlert() {
    return `Please ensure the planned location is reflected in section <a class='open_route alert-event' href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultCode}/geographic-location?phase=${this.api.resultsSE.currentResultPhase}" target='_blank'>4. Geographic location</a>. If you decide to change remember to update your TOC result framework. DD is working to automate the geolocation and in the near future you will not need to fill section 4 again.`;
  }

  getOverallProgress(overallContributing, contributing) {
    return Number(overallContributing) + Number(contributing);
  }

  descriptionWarning(type1: string, type2: string) {
    return `The type of result ${type1} you are reporting does not match the type ${type2} of this indicator, therefore, progress cannot be reported. Please ensure that the indicator category matches the indicator type for accurate reporting.`;
  }

  descriptionWarningYear(dateFormat: string, year: number) {
    const dateFormatYear = new Date(dateFormat).getFullYear();
    const isAlert = dateFormatYear === year;
    const description = !isAlert ? 'You are reporting against an indicator that had a target in a following year. If you feel the TOC Result Framework is outdated please edit it. If the result framework is correct and you are reporting this result in advance, please go ahead.' : '';

    return { is_alert: isAlert, description: description };
  }

  sumIndicator(item: string) {
    return Number(item) + 1;
  }

  checkAlert() {
    if (this.initiative.type_value !== 'custom' && this.initiative.number_result_type !== this.initiative?.result.result_type_id && this.initiative?.result.result_type_id != 4 && this.initiative?.result.result_type_id != 8) return true;

    return false;
  }
}

import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';
import { RdTheoryOfChangesServicesService } from '../../../rd-theory-of-changes-services.service';

@Component({
  selector: 'app-toc-initiative-out',
  templateUrl: './toc-initiative-out.component.html',
  styleUrls: ['./toc-initiative-out.component.scss']
})
export class TocInitiativeOutComponent implements OnInit {
  @Input() editable: boolean;
  @Input() isContributor: boolean = false;
  @Input() initiative: any;
  @Input() resultLevelId: number | string;
  @Input() isIpsr: boolean = false;
  fullInitiativeToc = null;

  constructor(public api: ApiService, public theoryOfChangesServices: RdTheoryOfChangesServicesService) {}

  ngOnInit(): void {
    this.get_versionDashboard();
  }

  getDescription(official_code, short_name) {
    const tocText = `<strong>${official_code} ${short_name}</strong> - Does this result match a planned result in your Theory of Change?`;
    const contributorsText = `Is this result planned in the <strong>${official_code} ${short_name}</strong> ToC?`;
    return this.isIpsr ? contributorsText : tocText;
  }

  headerDescription(allText) {
    let text = '<ul>';

    if (allText) {
      text += '<li>Specify to which Work Package or End of Initiative outcomes the scaling of the core innovation is expected to contribute to by 2024 in the specific geolocation</li>';
    } else {
      text += '<li>Which End of Initiative outcome does it link to most closely?. You will have time during the reflect moment to update your ToC</li> ';
    }

    text += '</ul>';
    return text;
  }

  clearTocResultId() {
    this.initiative.result_toc_results.forEach(element => {
      element.toc_level_id = !this.initiative.planned_result ? 3 : null;
    });
    this.initiative.result_toc_results.forEach(element => {
      element.toc_result_id = null;
    });
  }

  mapPlannedResult() {
    this.initiative.result_toc_results.forEach(element => {
      element.planned_result = this.initiative.planned_result;
      element.showOutcomeLevel = this.initiative.showOutcomeLevel;
      element.indicatorView = this.initiative.indicatorView;
    });
  }

  get_versionDashboard() {
    this.api.resultsSE.get_vesrsionDashboard(this.initiative.result_toc_results[0].toc_result_id, this.initiative.result_toc_results[0].initiative_id).subscribe({
      next: ({ response }) => {
        this.fullInitiativeToc = response?.version_id;
      },
      error: err => {
        console.error(err);
      }
    });
  }
}

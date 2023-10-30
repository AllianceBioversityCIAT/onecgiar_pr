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
  @Input() initiative: any;
  @Input() resultLevelId: number | string;
  @Input() isIpsr: boolean = false;
  @Input() indexYesorNo: number;
  fullInitiativeToc = null;

  constructor(public api: ApiService, public theoryOfChangesServices: RdTheoryOfChangesServicesService) {}

  ngOnInit(): void {
    this.theoryOfChangesServices.body.push({
      impactAreasTargets: [],
      sdgTargest: [],
      targetsIndicators: [],
      actionAreaOutcome: [],
      isSdg: null,
      isImpactArea: null,
      resultId: null,
      initiative: null,
      is_sdg_action_impact: null
    });
    this.get_versionDashboard();
    this.theoryOfChangesServices.validateEOI(this.initiative);

    console.log('Recived initiative', this.initiative);
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
    // this.initiative.forEach(element => {
    //   element.toc_level_id = !this.theoryOfChangesServices.planned_result ? 3 : null;
    // });
    // this.initiative.forEach(element => {
    //   element.toc_result_id = null;
    // });
  }

  get_versionDashboard() {
    this.api.resultsSE.get_vesrsionDashboard(this.initiative[0].toc_result_id, this.initiative[0].initiative_id).subscribe({
      next: ({ response }) => {
        this.fullInitiativeToc = response?.version_id;
      },
      error: err => {
        console.error(err);
      }
    });
  }
}

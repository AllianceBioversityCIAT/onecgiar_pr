import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';
import { RdTheoryOfChangesServicesService } from '../../../rd-theory-of-changes-services.service';

@Component({
    selector: 'app-toc-initiative-out',
    templateUrl: './toc-initiative-out.component.html',
    styleUrls: ['./toc-initiative-out.component.scss'],
    standalone: false
})
export class TocInitiativeOutComponent implements OnInit {
  @Input() editable: boolean;
  @Input() isContributor: boolean = false;
  @Input() isNotifications?: boolean = false;
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

    if (!this.initiative.result_toc_results.length && (this.isContributor || this.isIpsr)) {
      return `<strong>${official_code} ${short_name}</strong> - Pending confirmation`;
    }

    return this.isIpsr ? contributorsText : tocText;
  }

  headerDescription(init) {
    const text = `<ul>
      <li>At least 1 TOC result of ${init} should be provided.</li>
      <li>In most cases a result should be mapped to a single WP for simplicity. In some cases, however, it may be necessary to map a result to two WPs.</li> 
    </ul>`;

    return text;
  }

  clearTocResultId() {
    this.initiative.showMultipleWPsContent = false;

    let tocLevelId;
    if (!this.initiative.planned_result) {
      tocLevelId = 3;
    } else if (this.resultLevelId === 1) {
      tocLevelId = 1;
    } else {
      tocLevelId = 2;
    }

    this.initiative.result_toc_results.forEach(element => {
      element.toc_level_id = tocLevelId;
      element.planned_result = this.initiative.planned_result;
      element.toc_result_id = null;
    });

    setTimeout(() => {
      this.initiative.showMultipleWPsContent = true;
    }, 20);
  }

  get_versionDashboard() {
    if (this.isNotifications) return;

    this.api.resultsSE.get_vesrsionDashboard(this.initiative?.result_toc_results[0]?.initiative_id).subscribe({
      next: ({ response }) => {
        this.fullInitiativeToc = response?.version_id;
      },
      error: err => {
        console.error(err);
      }
    });
  }
}

import { Component, OnInit, Input } from '@angular/core';
import { ContributorsBody } from '../../model/contributorsBody';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { CentersService } from '../../../../../../../../shared/services/global/centers.service';

@Component({
    selector: 'app-ipsr-contributors-centers',
    templateUrl: './ipsr-contributors-centers.component.html',
    styleUrls: ['./ipsr-contributors-centers.component.scss'],
    standalone: false
})
export class IpsrContributorsCentersComponent {
  @Input() contributorsBody = new ContributorsBody();
  primaryText = ' - <strong>Primary</strong> ';
  constructor(public api: ApiService, public centersSE: CentersService) {}
  validatePrimarySelection() {
    if (this.contributorsBody.contributing_center.length === 1) this.contributorsBody.contributing_center[0].primary = true;
  }
  addPrimary(center) {
    this.contributorsBody.contributing_center.map((center: any) => (center.primary = false));
    center.primary = true;
  }
  deletContributingCenter(index) {
    //(index);
    this.contributorsBody?.contributing_center.splice(index, 1);
  }
}

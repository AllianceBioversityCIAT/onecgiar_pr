import { Component, Input } from '@angular/core';
import { IPSRMaterialsStep4, IpsrStep4Body } from '../../model/Ipsr-step-4-body.model';
import { RolesService } from '../../../../../../../../../../shared/services/global/roles.service';

@Component({
  selector: 'app-step-n4-reference-material-links',
  templateUrl: './step-n4-reference-material-links.component.html',
  styleUrls: ['./step-n4-reference-material-links.component.scss']
})
export class StepN4ReferenceMaterialLinksComponent {
  @Input() body: IpsrStep4Body = new IpsrStep4Body();

  constructor(public rolesSE: RolesService) {}

  addItem() {
    this.body.ipsr_materials.push(new IPSRMaterialsStep4());
  }

  deleteItem(index) {
    this.body.ipsr_materials.splice(index, 1);
  }

  addReferenceDescription() {
    return `
      <ul>
      <li>Reference materials may include (science) publications, websites, newsletters, reports, newspaper articles, videos, etc.</li>
      <li>The image(s) will be used in the final report, therefore consent to use the image(s) is needed.</li>
      </ul>
    `;
  }
}

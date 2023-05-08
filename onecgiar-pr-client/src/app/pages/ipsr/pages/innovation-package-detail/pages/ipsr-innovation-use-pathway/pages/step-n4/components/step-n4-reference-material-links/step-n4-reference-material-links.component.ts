import { Component, OnInit, Input } from '@angular/core';
import { IpsrStep4Body, IpsrpictureStep4 } from '../../model/Ipsr-step-4-body.model';
import { RolesService } from 'src/app/shared/services/global/roles.service';

@Component({
  selector: 'app-step-n4-reference-material-links',
  templateUrl: './step-n4-reference-material-links.component.html',
  styleUrls: ['./step-n4-reference-material-links.component.scss']
})
export class StepN4ReferenceMaterialLinksComponent {
  @Input() body = new IpsrStep4Body();
  constructor(public rolesSE: RolesService) {}

  addItem() {
    this.body.ipsr_materials.push(new IpsrpictureStep4());
  }
}

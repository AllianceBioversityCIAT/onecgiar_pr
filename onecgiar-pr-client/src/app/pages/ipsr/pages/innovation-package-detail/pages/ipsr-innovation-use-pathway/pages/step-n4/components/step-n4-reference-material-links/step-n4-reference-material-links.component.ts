import { Component, Input } from '@angular/core';
import {
  IpsrStep4Body,
  IpsrpictureStep4
} from '../../model/Ipsr-step-4-body.model';
import { RolesService } from 'src/app/shared/services/global/roles.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrButtonComponent } from '../../../../../../../../../../custom-fields/pr-button/pr-button.component';

@Component({
  selector: 'app-step-n4-reference-material-links',
  standalone: true,
  templateUrl: './step-n4-reference-material-links.component.html',
  styleUrls: ['./step-n4-reference-material-links.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    PrFieldHeaderComponent,
    PrButtonComponent
  ]
})
export class StepN4ReferenceMaterialLinksComponent {
  @Input() body = new IpsrStep4Body();

  constructor(public rolesSE: RolesService) {}

  addItem() {
    this.body.ipsr_materials.push(new IpsrpictureStep4());
  }

  delete(index) {
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

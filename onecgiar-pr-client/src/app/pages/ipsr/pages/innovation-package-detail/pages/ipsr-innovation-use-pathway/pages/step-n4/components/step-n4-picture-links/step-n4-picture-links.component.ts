import { Component, Input } from '@angular/core';
import {
  IpsrStep4Body,
  IpsrpictureStep4
} from '../../model/Ipsr-step-4-body.model';
import { RolesService } from '../../../../../../../../../../shared/services/global/roles.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrButtonComponent } from '../../../../../../../../../../custom-fields/pr-button/pr-button.component';

@Component({
  selector: 'app-step-n4-picture-links',
  standalone: true,
  templateUrl: './step-n4-picture-links.component.html',
  styleUrls: ['./step-n4-picture-links.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    PrFieldHeaderComponent,
    PrButtonComponent
  ]
})
export class StepN4PictureLinksComponent {
  @Input() body = new IpsrStep4Body();

  constructor(public rolesSE: RolesService) {}

  addItem() {
    this.body.ipsr_pictures.push(new IpsrpictureStep4());
  }
  delete(index) {
    this.body.ipsr_pictures.splice(index, 1);
  }

  addPictureDescription() {
    return `
      <ul>
      <li>Provide URLs to high-resolution images, photos or pictures that clearly visualize the innovation in use (e.g., how it provides a specific solution to a problem, its use in practice, etc.)</li>
      <li>The image(s) will be used in the final report, therefore consent to use the image(s) is needed.</li>
      </ul>
    `;
  }
}

import { Component, Input } from '@angular/core';
import {
  ContributorsBody,
  donorInterfaceToc
} from '../../model/contributorsBody';
import { InstitutionsService } from '../../../../../../../../shared/services/global/institutions.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { CentersService } from '../../../../../../../../shared/services/global/centers.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { AlertStatusComponent } from '../../../../../../../../custom-fields/alert-status/alert-status.component';
import { PrSelectComponent } from '../../../../../../../../custom-fields/pr-select/pr-select.component';
import { EditOrDeleteItemButtonComponent } from '../../../../../../../../custom-fields/edit-or-delete-item-button/edit-or-delete-item-button.component';
import { NoDataTextComponent } from '../../../../../../../../custom-fields/no-data-text/no-data-text.component';
import { AddButtonComponent } from '../../../../../../../../custom-fields/add-button/add-button.component';

@Component({
  selector: 'app-ipsr-non-pooled-projects',
  standalone: true,
  templateUrl: './ipsr-non-pooled-projects.component.html',
  styleUrls: ['./ipsr-non-pooled-projects.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    PrFieldHeaderComponent,
    AlertStatusComponent,
    PrSelectComponent,
    EditOrDeleteItemButtonComponent,
    NoDataTextComponent,
    AddButtonComponent
  ]
})
export class IpsrNonPooledProjectsComponent {
  @Input() contributorsBody = new ContributorsBody();

  constructor(
    public institutionsSE: InstitutionsService,
    public api: ApiService,
    public centersSE: CentersService
  ) {}

  deleteEvidence(index) {
    this.contributorsBody.contributing_np_projects.splice(index, 1);
  }

  addBilateralContribution() {
    this.contributorsBody.contributing_np_projects.push(
      new donorInterfaceToc()
    );
  }
}

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContributorsBody } from '../../model/contributorsBody';
import { RolesService } from '../../../../../../../../shared/services/global/roles.service';
import { InstitutionsService } from '../../../../../../../../shared/services/global/institutions.service';
import { AlertStatusComponent } from '../../../../../../../../custom-fields/alert-status/alert-status.component';
import { PrMultiSelectComponent } from '../../../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';

@Component({
  selector: 'app-ipsr-contributors-non-cgiar-partners',
  standalone: true,
  templateUrl: './ipsr-contributors-non-cgiar-partners.component.html',
  styleUrls: ['./ipsr-contributors-non-cgiar-partners.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    AlertStatusComponent,
    PrMultiSelectComponent,
    PrFieldHeaderComponent
  ]
})
export class IpsrContributorsNonCgiarPartnersComponent {
  @Input() contributorsBody = new ContributorsBody();
  toggle = 0;

  showInfo = false;

  constructor(
    public rolesSE: RolesService,
    public institutionsSE: InstitutionsService
  ) {}

  validateDeliverySelection(deliveries, deliveryId) {
    if (typeof deliveries != 'object') return false;
    return deliveries.indexOf(deliveryId) >= 0;
  }

  onSelectDelivery(option, deliveryId) {
    if (this.rolesSE.readOnly) return;
    if (
      option?.deliveries?.find((deliveryId: any) => deliveryId == 4) &&
      deliveryId != 4
    ) {
      const index =
        option?.deliveries?.indexOf(4) == undefined
          ? -1
          : option?.deliveries?.indexOf(4);
      option?.deliveries.splice(index, 1);
    }
    const index =
      option?.deliveries?.indexOf(deliveryId) == undefined
        ? -1
        : option?.deliveries?.indexOf(deliveryId);
    if (deliveryId == 4 && index < 0) option.deliveries = [];
    if (typeof option?.deliveries != 'object') option.deliveries = [];
    index < 0
      ? option?.deliveries.push(deliveryId)
      : option?.deliveries.splice(index, 1);
  }

  removePartner(index) {
    this.contributorsBody.institutions.splice(index, 1);
    this.toggle++;
  }
}

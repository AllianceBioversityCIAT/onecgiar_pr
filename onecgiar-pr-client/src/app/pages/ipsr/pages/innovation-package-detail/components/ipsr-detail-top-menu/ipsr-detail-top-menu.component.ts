import { Component, computed, inject } from '@angular/core';
import { IPSRDetailRouting } from '../../../router/routing-data-ipsr';
import { IpsrDataControlService } from '../../../../services/ipsr-data-control.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';

@Component({
  selector: 'app-ipsr-detail-top-menu',
  templateUrl: './ipsr-detail-top-menu.component.html',
  styleUrls: ['./ipsr-detail-top-menu.component.scss'],
  standalone: false
})
export class IpsrDetailTopMenuComponent {
  fieldsManagerSE = inject(FieldsManagerService);
  menuOptions = computed(() =>
    IPSRDetailRouting.filter(option => !(this.fieldsManagerSE.isP25() && option.path == 'link-to-results')).map(option => {
      if (option.path == 'ipsr-innovation-use-pathway') option.prName = 'Package and Assess';
      return option;
    })
  );
  constructor(public ipsrDataControlSE: IpsrDataControlService) {}
}

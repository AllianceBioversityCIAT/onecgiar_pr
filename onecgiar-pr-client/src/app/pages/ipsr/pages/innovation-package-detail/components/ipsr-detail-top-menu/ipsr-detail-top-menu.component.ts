import { Component } from '@angular/core';
import { IPSRDetailRouting } from '../../../router/routing-data-ipsr';
import { IpsrDataControlService } from '../../../../services/ipsr-data-control.service';

@Component({
    selector: 'app-ipsr-detail-top-menu',
    templateUrl: './ipsr-detail-top-menu.component.html',
    styleUrls: ['./ipsr-detail-top-menu.component.scss'],
    standalone: false
})
export class IpsrDetailTopMenuComponent {
  menuOptions = IPSRDetailRouting;
  constructor(public ipsrDataControlSE: IpsrDataControlService) {}
}

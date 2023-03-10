import { Component, OnInit } from '@angular/core';
import { IPSRDetailRouting } from '../../../router/routing-data-ipsr';

@Component({
  selector: 'app-ipsr-detail-top-menu',
  templateUrl: './ipsr-detail-top-menu.component.html',
  styleUrls: ['./ipsr-detail-top-menu.component.scss']
})
export class IpsrDetailTopMenuComponent {
  menuOptions = IPSRDetailRouting;
  constructor() {}
}

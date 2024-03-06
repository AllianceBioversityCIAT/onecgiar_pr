import { Component } from '@angular/core';
import { IPSRDetailRouting } from '../../../router/routing-data-ipsr';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IpsrGreenCheckComponent } from 'src/app/pages/ipsr/components/ipsr-green-check/ipsr-green-check.component';

@Component({
  selector: 'app-ipsr-detail-top-menu',
  standalone: true,
  templateUrl: './ipsr-detail-top-menu.component.html',
  styleUrls: ['./ipsr-detail-top-menu.component.scss'],
  imports: [CommonModule, RouterLink, RouterLinkActive, IpsrGreenCheckComponent]
})
export class IpsrDetailTopMenuComponent {
  menuOptions = IPSRDetailRouting;
}

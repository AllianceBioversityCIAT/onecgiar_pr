import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IpsrGreenCheckComponent } from '../../../pages/ipsr/components/ipsr-green-check/ipsr-green-check.component';

@Component({
  selector: 'app-steper-navigation',
  standalone: true,
  templateUrl: './steper-navigation.component.html',
  styleUrls: ['./steper-navigation.component.scss'],
  imports: [CommonModule, RouterLink, RouterLinkActive, IpsrGreenCheckComponent]
})
export class SteperNavigationComponent {
  @Input() options: any;
}

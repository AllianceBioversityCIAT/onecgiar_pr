import { CommonModule } from '@angular/common';
import { Component, OnInit, Input } from '@angular/core';
import { PrButtonComponent } from '../../../../custom-fields/pr-button/pr-button.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-tor-panel-menu',
  standalone: true,
  templateUrl: './tor-panel-menu.component.html',
  styleUrls: ['./tor-panel-menu.component.scss'],
  imports: [CommonModule, PrButtonComponent, RouterLink]
})
export class TorPanelMenuComponent {
  @Input() options: any;
  @Input() panelName: string;
  @Input() hideIndex: boolean = false;
  constructor() {}
}

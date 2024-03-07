import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-dynamic-panel-menu',
  standalone: true,
  templateUrl: './dynamic-panel-menu.component.html',
  styleUrls: ['./dynamic-panel-menu.component.scss'],
  imports: [CommonModule, RouterLink, RouterLinkActive, TooltipModule]
})
export class DynamicPanelMenuComponent {
  @Input() options: any;
  @Input() panelName: string;
  showCompletePanel = true;
  constructor() {}
  togglePanelView() {
    this.showCompletePanel = !this.showCompletePanel;
  }
}

import { Component, OnInit, Input } from '@angular/core';

@Component({
    selector: 'app-dynamic-panel-menu',
    templateUrl: './dynamic-panel-menu.component.html',
    styleUrls: ['./dynamic-panel-menu.component.scss'],
    standalone: false
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

import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-tor-panel-menu',
  templateUrl: './tor-panel-menu.component.html',
  styleUrls: ['./tor-panel-menu.component.scss']
})
export class TorPanelMenuComponent {
  @Input() options: any;
  @Input() panelName: string;
  @Input() hideIndex: boolean = false;
  constructor() {}
}

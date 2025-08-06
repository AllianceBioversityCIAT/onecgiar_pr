import { Component, Input } from '@angular/core';
import { DynamicPanelServiceService } from './dynamic-panel-service.service';

@Component({
  selector: 'app-dynamic-panel-menu',
  templateUrl: './dynamic-panel-menu.component.html',
  styleUrls: ['./dynamic-panel-menu.component.scss']
})
export class DynamicPanelMenuComponent {
  @Input() options: any;
  @Input() panelName: string;

  constructor(public dynamicPanelService: DynamicPanelServiceService) {}
}

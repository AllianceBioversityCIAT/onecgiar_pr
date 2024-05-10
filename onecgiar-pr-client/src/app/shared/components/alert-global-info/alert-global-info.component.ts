import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-alert-global-info',
  templateUrl: './alert-global-info.component.html',
  styleUrls: ['./alert-global-info.component.scss']
})
export class AlertGlobalInfoComponent {
  @Input() className?: string;
  @Input() inlineStyles?: string;

  constructor() {}
}

import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-alert-global-info',
  templateUrl: './alert-global-info.component.html',
  styleUrls: ['./alert-global-info.component.scss'],
  standalone: false
})
export class AlertGlobalInfoComponent {
  @Input() className?: string;
  @Input() inlineStyles?: string;

  constructor() {}

  getAlertStatus(): string {
    return `
    The <strong>2025 reporting cycle</strong> is now closed for all <strong>Science Programs</strong>. <strong>SGP-02</strong> remains active in the system, as it has been granted additional time to finalize its reporting until <b>March 9, 2026</b>.
    `;
  }
}

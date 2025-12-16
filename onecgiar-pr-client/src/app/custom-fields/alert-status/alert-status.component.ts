import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-alert-status',
    templateUrl: './alert-status.component.html',
    styleUrls: ['./alert-status.component.scss'],
    standalone: false
})
export class AlertStatusComponent {
  @Input() status: 'info' | 'warning' | 'error' | 'success' = 'info';
  @Input() description: string = '';
  @Input() inlineStyles?: string = '';
}

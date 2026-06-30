import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-alert-status',
    templateUrl: './alert-status.component.html',
    styleUrls: ['./alert-status.component.scss'],
    standalone: false
})
export class AlertStatusComponent {
  @Input() status: 'info' | 'warning' | 'success' | 'error' = 'info';
  @Input() description: string = '';
  @Input() inlineStyles?: string = '';

  private readonly statusIcons: Record<string, string> = {
    info: 'info',
    warning: 'warning',
    success: 'check',
    error: 'error'
  };

  get iconName(): string {
    return this.statusIcons[this.status] ?? 'info';
  }
}

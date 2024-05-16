import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-alert-status',
  templateUrl: './alert-status.component.html',
  styleUrls: ['./alert-status.component.scss']
})
export class AlertStatusComponent {
  @Input() status: 'info' | 'warning' = 'info';
  @Input() title;
  @Input() description;
  @Input() inlineStyles?: string = ' ';
}

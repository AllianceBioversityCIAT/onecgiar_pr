import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-alert-status',
  standalone: true,
  templateUrl: './alert-status.component.html',
  styleUrls: ['./alert-status.component.scss'],
  imports: [CommonModule]
})
export class AlertStatusComponent {
  @Input() status: 'info' | 'warning' = 'info';
  @Input() title;
  @Input() description;
  @Input() inlineStyles?: string = ' ';
}

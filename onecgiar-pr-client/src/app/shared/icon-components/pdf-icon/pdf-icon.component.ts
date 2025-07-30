import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-pdf-icon',
  templateUrl: './pdf-icon.component.html',
  styleUrls: ['./pdf-icon.component.scss'],
  standalone: false
})
export class PdfIconComponent {
  @Input() hexadecimalColor = 'var(--pr-color-secondary-400)';
  constructor() {}
}

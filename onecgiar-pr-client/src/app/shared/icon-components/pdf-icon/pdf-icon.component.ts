import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-pdf-icon',
  templateUrl: './pdf-icon.component.html',
  styleUrls: ['./pdf-icon.component.scss']
})
export class PdfIconComponent {
  @Input() hexadecimalColor = '#2A2E45';
  constructor() {}
}

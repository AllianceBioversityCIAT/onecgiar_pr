import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-pdf-icon',
  standalone: true,
  templateUrl: './pdf-icon.component.html',
  styleUrls: ['./pdf-icon.component.scss'],
  imports: [CommonModule]
})
export class PdfIconComponent {
  @Input() hexadecimalColor = '#2A2E45';
  constructor() {}
}

import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-section-header',
  standalone: true,
  templateUrl: './section-header.component.html',
  styleUrls: ['./section-header.component.scss'],
  imports: []
})
export class SectionHeaderComponent {
  @Input() titleText: string;
  @Input() description: string;
}

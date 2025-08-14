import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-section-header',
    templateUrl: './section-header.component.html',
    styleUrls: ['./section-header.component.scss'],
    standalone: false
})
export class SectionHeaderComponent {
  @Input() titleText: string;
  @Input() description: string;

  constructor() {}
}

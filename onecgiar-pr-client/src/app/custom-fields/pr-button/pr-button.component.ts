import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-pr-button',
  templateUrl: './pr-button.component.html',
  styleUrls: ['./pr-button.component.scss']
})
export class PrButtonComponent {
  @Input() text: string;
  @Input() icon: string;
  @Input() reverse: boolean = false;
  @Input() rotating: boolean = false;
  @Input() showBackground: boolean = true;
  @Input() colorType: 'primary' | 'danger' | 'secondary' = 'primary';
  @Input() padding: 'small' | 'medium' | 'big' = 'small';
  @Input() pulse: boolean = false;
  constructor() {}
}

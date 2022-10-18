import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-pr-field-header',
  templateUrl: './pr-field-header.component.html',
  styleUrls: ['./pr-field-header.component.scss']
})
export class PrFieldHeaderComponent {
  @Input() label: string;
  @Input() description: string;
  @Input() required: boolean = true;
  constructor() {}
}

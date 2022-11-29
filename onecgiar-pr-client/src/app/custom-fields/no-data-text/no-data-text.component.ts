import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-no-data-text',
  templateUrl: './no-data-text.component.html',
  styleUrls: ['./no-data-text.component.scss']
})
export class NoDataTextComponent {
  @Input() title: string;
  constructor() {}
}

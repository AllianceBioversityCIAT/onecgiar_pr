import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-alert-global-info',
  templateUrl: './alert-global-info.component.html',
  styleUrls: ['./alert-global-info.component.scss']
})
export class AlertGlobalInfoComponent implements OnInit {
  @Input() className?: string;
  @Input() inlineStyles?: string;

  constructor() {}

  ngOnInit(): void {}
}

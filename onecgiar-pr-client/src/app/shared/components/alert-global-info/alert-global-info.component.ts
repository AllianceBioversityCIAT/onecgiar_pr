import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { AlertStatusComponent } from '../../../custom-fields/alert-status/alert-status.component';

@Component({
  selector: 'app-alert-global-info',
  standalone: true,
  templateUrl: './alert-global-info.component.html',
  styleUrls: ['./alert-global-info.component.scss'],
  imports: [CommonModule, AlertStatusComponent]
})
export class AlertGlobalInfoComponent implements OnInit {
  @Input() className?: string;
  @Input() inlineStyles?: string;

  constructor() {}

  ngOnInit(): void {}
}

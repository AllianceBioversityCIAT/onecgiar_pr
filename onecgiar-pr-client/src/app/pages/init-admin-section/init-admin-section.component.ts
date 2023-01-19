import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-init-admin-section',
  templateUrl: './init-admin-section.component.html',
  styleUrls: ['./init-admin-section.component.scss']
})
export class InitAdminSectionComponent {
  sections = [{ name: 'Completeness status', icon: 'check_circle', path: '/init-admin-module/init-completeness-status' }];
  constructor() {}
}

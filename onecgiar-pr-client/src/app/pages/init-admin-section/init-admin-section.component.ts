import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ApiService } from 'src/app/shared/services/api/api.service';
import { DataControlService } from 'src/app/shared/services/data-control.service';

@Component({
  selector: 'app-init-admin-section',
  templateUrl: './init-admin-section.component.html',
  styleUrls: ['./init-admin-section.component.scss']
})
export class InitAdminSectionComponent {
  sections = [
    { name: 'Completeness status', icon: 'check_circle', path: '/init-admin-module/init-completeness-status' },
    { name: 'General results report', icon: 'task', path: '/init-admin-module/init-general-results-report' }
  ];
  constructor(private dataControlSE: DataControlService, public api: ApiService) {}
  ngOnInit(): void {
    this.dataControlSE.detailSectionTitle('INIT Admin Module');
  }
}

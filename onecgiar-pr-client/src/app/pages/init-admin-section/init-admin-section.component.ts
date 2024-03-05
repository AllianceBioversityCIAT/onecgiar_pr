import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../shared/services/api/api.service';
import { DataControlService } from '../../shared/services/data-control.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DynamicPanelMenuComponent } from '../../shared/components/dynamic-panel-menu/dynamic-panel-menu.component';

@Component({
  selector: 'app-init-admin-section',
  standalone: true,
  templateUrl: './init-admin-section.component.html',
  styleUrls: ['./init-admin-section.component.scss'],
  imports: [CommonModule, RouterModule, DynamicPanelMenuComponent]
})
export class InitAdminSectionComponent implements OnInit {
  sections = [
    {
      name: 'Completeness status',
      icon: 'check_circle',
      path: '/init-admin-module/init-completeness-status'
    },
    {
      name: 'General results report',
      icon: 'task',
      path: '/init-admin-module/init-general-results-report'
    }
  ];
  constructor(
    private dataControlSE: DataControlService,
    public api: ApiService
  ) {}

  ngOnInit(): void {
    this.dataControlSE.detailSectionTitle('INIT Admin Module');
  }
}

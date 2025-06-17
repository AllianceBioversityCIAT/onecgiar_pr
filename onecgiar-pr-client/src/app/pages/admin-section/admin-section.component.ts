import { Component, OnInit } from '@angular/core';
import { DataControlService } from '../../shared/services/data-control.service';

@Component({
  selector: 'app-admin-section',
  templateUrl: './admin-section.component.html',
  styleUrls: ['./admin-section.component.scss']
})
export class AdminSectionComponent implements OnInit {
  sections = [
    { name: 'Completeness status', icon: 'check_circle', path: '/admin-module/completeness-status' },
    { name: 'User roles', icon: 'people', path: '/admin-module/user-report' },
    { name: 'Phase management', icon: 'move_up', path: '/admin-module/phase-management' },
    { name: 'Knowledge Products', icon: 'auto_stories', path: '/admin-module/knowledge-products' },
    { name: 'Tickets Dashboard', icon: 'query_stats', path: '/admin-module/tickets-dashboard' }
    // { name: 'User management', icon: 'manage_accounts', path: '/admin-module/user-management' }
  ];

  constructor(private dataControlSE: DataControlService) {}

  ngOnInit(): void {
    this.dataControlSE.detailSectionTitle('Admin Module');
  }
}

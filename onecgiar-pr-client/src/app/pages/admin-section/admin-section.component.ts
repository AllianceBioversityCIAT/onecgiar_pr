import { Component } from '@angular/core';
import { DataControlService } from '../../shared/services/data-control.service';
import { CommonModule } from '@angular/common';
import { DynamicPanelMenuComponent } from '../../shared/components/dynamic-panel-menu/dynamic-panel-menu.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-section',
  standalone: true,
  templateUrl: './admin-section.component.html',
  styleUrls: ['./admin-section.component.scss'],
  imports: [CommonModule, DynamicPanelMenuComponent, RouterOutlet]
})
export class AdminSectionComponent {
  sections = [
    {
      name: 'Completeness status',
      icon: 'check_circle',
      path: '/admin-module/completeness-status'
    },
    { name: 'User roles', icon: 'people', path: '/admin-module/user-report' },
    {
      name: 'Phase management',
      icon: 'move_up',
      path: '/admin-module/phase-management'
    }
  ];
  constructor(private dataControlSE: DataControlService) {}
  ngOnInit(): void {
    this.dataControlSE.detailSectionTitle('Admin Module');
  }
}

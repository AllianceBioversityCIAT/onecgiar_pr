import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-admin-section',
  templateUrl: './admin-section.component.html',
  styleUrls: ['./admin-section.component.scss']
})
export class AdminSectionComponent {
  sections = [
    { name: 'Completeness status', icon: 'check_circle', path: 'completeness-status' },
    { name: 'Users', icon: 'people', path: 'd' }
  ];
  constructor() {}
}

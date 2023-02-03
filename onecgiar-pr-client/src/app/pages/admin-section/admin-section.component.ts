import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-admin-section',
  templateUrl: './admin-section.component.html',
  styleUrls: ['./admin-section.component.scss']
})
export class AdminSectionComponent {
  sections = [
    { name: 'Completeness status', icon: 'check_circle', path: '/admin-module/completeness-status' },
    { name: 'User roles', icon: 'people', path: '/admin-module/user-report' }
  ];
  constructor(private titleService: Title) {}
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.titleService.setTitle('Admin Module');
  }
}

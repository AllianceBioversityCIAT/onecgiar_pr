import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ApiService } from '../../shared/services/api/api.service';
import { DataControlService } from '../../shared/services/data-control.service';

@Component({
  selector: 'app-init-admin-section',
  templateUrl: './init-admin-section.component.html',
  styleUrls: ['./init-admin-section.component.scss'],
  standalone: false
})
export class InitAdminSectionComponent implements OnInit, OnDestroy {
  private readonly dataControlSE = inject(DataControlService);

  readonly sections = [
    { name: 'General results report', icon: 'task', path: '/init-admin-module/init-general-results-report' }
  ];

  constructor(public api: ApiService) {}

  ngOnInit(): void {
    this.dataControlSE.detailSectionTitle('My Admin');
    // The Spartan sidebar carries all navigation + actions here, so hide the top header.
    this.dataControlSE.hideMainNav.set(true);
    this.dataControlSE.hideHeaderChrome.set(true);
  }

  ngOnDestroy(): void {
    this.dataControlSE.hideMainNav.set(false);
    this.dataControlSE.hideHeaderChrome.set(false);
  }
}

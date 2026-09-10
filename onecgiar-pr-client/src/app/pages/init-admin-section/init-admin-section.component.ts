import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../../shared/services/api/api.service';
import { DataControlService } from '../../shared/services/data-control.service';

@Component({
  selector: 'app-init-admin-section',
  templateUrl: './init-admin-section.component.html',
  styleUrls: ['./init-admin-section.component.scss'],
  standalone: false
})
export class InitAdminSectionComponent implements OnInit {
  private readonly dataControlSE = inject(DataControlService);

  constructor(public api: ApiService) {}

  ngOnInit(): void {
    this.dataControlSE.detailSectionTitle('My Admin');
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { DataControlService } from '../../shared/services/data-control.service';

@Component({
  selector: 'app-admin-section',
  templateUrl: './admin-section.component.html',
  styleUrls: ['./admin-section.component.scss'],
  standalone: false
})
export class AdminSectionComponent implements OnInit {
  private readonly dataControlSE = inject(DataControlService);

  ngOnInit(): void {
    this.dataControlSE.detailSectionTitle('Admin Module');
  }
}

import { Component, inject, OnInit } from '@angular/core';
import { ApiService } from '../../shared/services/api/api.service';

@Component({
  selector: 'app-bilateral',
  templateUrl: './bilateral.component.html',
  standalone: false
})
export class BilateralComponent implements OnInit {
  api = inject(ApiService);

  ngOnInit(): void {
    this.api.dataControlSE.detailSectionTitle('Bilateral Results');
  }
}

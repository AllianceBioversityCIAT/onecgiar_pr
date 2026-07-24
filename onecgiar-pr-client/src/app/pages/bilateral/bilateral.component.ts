import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../../shared/services/api/api.service';

@Component({
  selector: 'app-bilateral',
  templateUrl: './bilateral.component.html',
  standalone: false
})
export class BilateralComponent implements OnInit {
  readonly api = inject(ApiService);

  ngOnInit(): void {
    this.api.dataControlSE.detailSectionTitle('Bilateral Results');
  }
}

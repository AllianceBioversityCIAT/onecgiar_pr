import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ApiService } from '../../shared/services/api/api.service';
import { DataControlService } from '../../shared/services/data-control.service';

@Component({
  selector: 'app-bilateral',
  templateUrl: './bilateral.component.html',
  standalone: false
})
export class BilateralComponent implements OnInit, OnDestroy {
  private readonly dataControlSE = inject(DataControlService);
  readonly api = inject(ApiService);

  ngOnInit(): void {
    this.api.dataControlSE.detailSectionTitle('Bilateral Results');
    // The Spartan sidebar carries all navigation + actions here, so hide the top header.
    this.dataControlSE.hideMainNav.set(true);
    this.dataControlSE.hideHeaderChrome.set(true);
  }

  ngOnDestroy(): void {
    this.dataControlSE.hideMainNav.set(false);
    this.dataControlSE.hideHeaderChrome.set(false);
  }
}

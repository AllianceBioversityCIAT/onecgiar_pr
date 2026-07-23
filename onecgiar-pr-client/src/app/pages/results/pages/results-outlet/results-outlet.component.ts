import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ResultsNotificationsService } from './pages/results-notifications/results-notifications.service';
import { Router } from '@angular/router';
import { DataControlService } from '../../../../shared/services/data-control.service';

@Component({
  selector: 'app-results-outlet',
  templateUrl: './results-outlet.component.html',
  styleUrls: ['./results-outlet.component.scss'],
  standalone: false
})
export class ResultsOutletComponent implements OnInit, OnDestroy {
  private readonly dataControlSE = inject(DataControlService);

  constructor(
    public resultsNotificationsSE: ResultsNotificationsService,
    public router: Router
  ) {}

  ngOnInit(): void {
    // Results Center hosts its own vertical navigation, so hide the top nav pill here.
    this.dataControlSE.hideMainNav.set(true);
  }

  ngOnDestroy(): void {
    this.dataControlSE.hideMainNav.set(false);
  }
}

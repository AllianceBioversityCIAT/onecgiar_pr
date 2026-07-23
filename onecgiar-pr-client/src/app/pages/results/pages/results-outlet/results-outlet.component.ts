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
    // The Spartan sidebar carries all navigation + actions here, so hide the top header.
    this.dataControlSE.hideMainNav.set(true);
    this.dataControlSE.hideHeaderChrome.set(true);
  }

  ngOnDestroy(): void {
    this.dataControlSE.hideMainNav.set(false);
    this.dataControlSE.hideHeaderChrome.set(false);
  }
}

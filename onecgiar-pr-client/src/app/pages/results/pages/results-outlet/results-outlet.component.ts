import { Component } from '@angular/core';
import { ResultsNotificationsService } from './pages/results-notifications/results-notifications.service';
import {
  RouterLink,
  RouterLinkActive,
  RouterModule,
  RouterOutlet
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { AlertGlobalInfoComponent } from '../../../../shared/components/alert-global-info/alert-global-info.component';

@Component({
  selector: 'app-results-outlet',
  standalone: true,
  templateUrl: './results-outlet.component.html',
  styleUrls: ['./results-outlet.component.scss'],
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    AlertGlobalInfoComponent
  ]
})
export class ResultsOutletComponent {
  animateBell = true;
  constructor(public resultsNotificationsSE: ResultsNotificationsService) {
    setTimeout(() => {
      this.animateBell = false;
    }, 10000);
  }
}

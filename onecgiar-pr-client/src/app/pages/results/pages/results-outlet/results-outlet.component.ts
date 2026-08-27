import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { ResultsNotificationsService } from './pages/results-notifications/results-notifications.service';

@Component({
  selector: 'app-results-outlet',
  templateUrl: './results-outlet.component.html',
  styleUrls: ['./results-outlet.component.scss'],
  standalone: false
})
export class ResultsOutletComponent {
  public resultsNotificationsSE = inject(ResultsNotificationsService);
  private readonly router = inject(Router);

  /** Results list owns CURRENT chrome (title + filters); hide the legacy page-header + card shell. */
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  readonly isResultsList = computed(() => {
    // This outlet only hosts results-list + notifications. List owns CURRENT chrome.
    return !(this.url() ?? '').includes('results-notifications');
  });
}

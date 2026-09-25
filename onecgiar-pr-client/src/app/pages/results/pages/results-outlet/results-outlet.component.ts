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

  /** Results list owns CURRENT chrome (title + filters); hides the alert banner there. Notifications
   * never got a page-header/breadcrumb of its own either — the "Results Center" one this outlet used
   * to render for it was removed per user request (2026-09-25), so this flag now only gates the
   * `<app-alert-global-info>` banner. */
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

  /**
   * NOTIF-T-17: Notifications' own content already carries its own inset padding
   * (`results-notifications.component.html`'s root `.local_container` inline
   * `padding: 20px 50px 50px 50px`), matching the mockup's own content wrapper
   * (`padding:32px` on `showNotifications`'s root div, no card chrome) — so it
   * opts out of the boxed `.section_container` card the same way `results-list`
   * does, reusing `--flush`. This outlet only ever hosts these two children, so
   * "not results-list" already means "results-notifications" — a route-specific
   * flag would be redundant with `isResultsList` (Reviewer note on NOTIF-T-17:
   * a would-be `isFlushRoute` OR of the two is a tautology, always true). If a
   * third child that SHOULD keep the boxed card is ever added to this outlet,
   * reintroduce a real condition here instead of resurrecting the OR.
   */
}

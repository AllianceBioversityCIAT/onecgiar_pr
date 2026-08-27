import { Component, OnInit } from '@angular/core';
import { NavigationStart, Router, Event as NavigationEvent } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { PusherService } from '../../services/pusher.service';
import { ApiService } from '../../services/api/api.service';
declare let gtag: (property: string, value: any, configs: any) => {};

/**
 * Result id for the Pusher presence channel ("who else is editing this result").
 * Only result-detail URLs carry one. This used to be `url.split('/')[3]`, which on any other
 * page produced garbage — `undefined` on `/result-framework-reporting/planned-toc?sp=50`, and
 * `SP01?tocView=aows` once programmes moved into the path — and a 404 against the Pusher auth
 * endpoint on every navigation.
 */
export function resultIdFromUrl(url: string): string | null {
  return /\/result\/result-detail\/([^/?#]+)/.exec(url)?.[1] ?? null;
}

@Component({
    selector: 'app-external-tools',
    templateUrl: './external-tools.component.html',
    styleUrls: ['./external-tools.component.scss'],
    standalone: false
})
export class ExternalToolsComponent implements OnInit {
  constructor(
    private readonly router: Router,
    private readonly pusherSE: PusherService,
    private readonly api: ApiService
  ) {}

  ngOnInit(): void {
    this.router.events.subscribe((event: NavigationEvent) => {
      if (event instanceof NavigationStart) {
        this.api.dataControlSE.inNotifications = event.url.indexOf('results-notifications') > 0;
        window.scrollTo(0, 0);
        this.pusherSE.start(event.url, resultIdFromUrl(event.url));
        this.pusherSE.membersList = [];
        this.pusherSE.continueEditing = false;
        this.pusherSE.firstUser = false;
        this.pusherSE.secondUser = null;
        try {
          gtag('config', environment.googleAnalyticsId, {
            page_path: event.url
          });
        } catch (error) {
          console.error(error);
        }
      }
    });
  }
}

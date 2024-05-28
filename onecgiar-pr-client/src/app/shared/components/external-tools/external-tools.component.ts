import { Component, OnInit } from '@angular/core';
import { NavigationStart, Router, Event as NavigationEvent } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { PusherService } from '../../services/pusher.service';
import { ApiService } from '../../services/api/api.service';
declare let gtag: (property: string, value: any, configs: any) => {};

@Component({
  selector: 'app-external-tools',
  templateUrl: './external-tools.component.html',
  styleUrls: ['./external-tools.component.scss']
})
export class ExternalToolsComponent implements OnInit {
  constructor(private router: Router, private pusherSE: PusherService, private api: ApiService) {}

  ngOnInit(): void {
    this.router.events.subscribe((event: NavigationEvent) => {
      if (event instanceof NavigationStart) {
        this.validateShowT1RSelectPhase(event.url);
        this.api.dataControlSE.inNotifications = event.url.indexOf('results-notifications') > 0;
        window.scrollTo(0, 0);
        this.pusherSE.start(event.url, event.url.split('/')[3]);
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

  validateShowT1RSelectPhase(url: string): void {
    const lastPath = url.split('/').pop();
    this.api.dataControlSE.showT1RSelectPhase = lastPath === 'toc-diagrams';
  }
}

import { Component, OnInit } from '@angular/core';
import { NavigationStart, Router, Event as NavigationEvent } from '@angular/router';
import { environment } from '../../../../environments/environment';
declare let gtag: (property: string, value: any, configs: any) => {};

@Component({
  selector: 'app-external-tools',
  templateUrl: './external-tools.component.html',
  styleUrls: ['./external-tools.component.scss']
})
export class ExternalToolsComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {
    this.router.events.subscribe((event: NavigationEvent) => {
      if (!(event instanceof NavigationStart)) return window.scrollTo(0, 0);
      try {
        gtag('config', environment.googleAnalyticsId, {
          page_path: event.url
        });
      } catch (error) {}
    });
  }
}

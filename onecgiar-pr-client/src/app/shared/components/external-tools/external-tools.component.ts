import { Component, OnInit } from '@angular/core';
import { NavigationStart, Router, Event as NavigationEvent } from '@angular/router';

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
    });
  }
}

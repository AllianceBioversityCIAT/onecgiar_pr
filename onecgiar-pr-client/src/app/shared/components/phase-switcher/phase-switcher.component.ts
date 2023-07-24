import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api/api.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-phase-switcher',
  templateUrl: './phase-switcher.component.html',
  styleUrls: ['./phase-switcher.component.scss']
})
export class PhaseSwitcherComponent implements OnInit {
  route = '';
  constructor(public api: ApiService, private router: Router, public activatedRoute: ActivatedRoute) {}

  ngOnInit(): void {
    this.route = this.router.url.split('?')[0];
  }

  getRouteWithQueryParams(phaseId) {
    return `${this.route}?phase=${phaseId}`;
  }

  goToresultUrl(phaseId) {
    this.router.navigate([this.route], { queryParams: { phase: phaseId } }).then(() => {
      window.location.reload();
    });
  }
}

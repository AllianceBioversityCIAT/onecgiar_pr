import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api/api.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-phase-switcher',
  standalone: true,
  templateUrl: './phase-switcher.component.html',
  styleUrls: ['./phase-switcher.component.scss'],
  imports: [CommonModule, RouterLink]
})
export class PhaseSwitcherComponent implements OnInit {
  route = '';
  constructor(
    public api: ApiService,
    private router: Router,
    public activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route = this.router.url.split('?')[0];
  }

  getRouteWithQueryParams(phaseId) {
    return `${this.route}?phase=${phaseId}`;
  }

  goToresultUrl(phaseId) {
    this.router
      .navigate([this.route], { queryParams: { phase: phaseId } })
      .then(() => {
        window.location.reload();
      });
  }
}

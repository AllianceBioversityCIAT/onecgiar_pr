import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ApiService } from '../../shared/services/api/api.service';
import { BilateralAiService } from './services/bilateral-ai.service';
import { BilateralContextService } from './services/bilateral-context.service';

@Component({
  selector: 'app-bilateral',
  standalone: false,
  templateUrl: './bilateral.component.html',
  styleUrls: ['./bilateral.component.scss'],
})
export class BilateralComponent implements OnInit, OnDestroy {
  api = inject(ApiService);
  bilateralAiService = inject(BilateralAiService);
  router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly ctx = inject(BilateralContextService);

  currentPageLabel = 'Home';
  isAtHome = true;
  private navSub?: Subscription;

  ngOnInit(): void {
    this.api.dataControlSE.detailSectionTitle('Bilateral Results');
    this.bilateralAiService.loadAllDrafts();

    const params = this.route.snapshot.queryParams;
    if (params['center']) {
      this.ctx.setCenter(params['center'], params['centerName'] ?? '', params['centerId'] ?? undefined);
    }

    this.updateBreadcrumb(this.router.url);
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(e => this.updateBreadcrumb((e as NavigationEnd).urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  private updateBreadcrumb(url: string): void {
    if (url.includes('/bilateral/create') || url.includes('/bilateral/result/')) {
      this.currentPageLabel = 'Create result';
      this.isAtHome = false;
    } else if (url.includes('/bilateral/drafts')) {
      this.currentPageLabel = 'My draft results';
      this.isAtHome = false;
    } else {
      this.currentPageLabel = 'Home';
      this.isAtHome = true;
    }
  }
}

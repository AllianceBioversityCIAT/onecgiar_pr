import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ApiService } from '../../shared/services/api/api.service';
import { BilateralAiService } from './services/bilateral-ai.service';
import { BilateralContextService } from './services/bilateral-context.service';
import { RolesService } from '../../shared/services/global/roles.service';

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
  private readonly rolesService = inject(RolesService);

  currentPageLabel = 'Home';
  isAtHome = true;
  private navSub?: Subscription;
  private paramSub?: Subscription;

  ngOnInit(): void {
    this.api.dataControlSE.detailSectionTitle('Bilateral Results');
    this.bilateralAiService.loadAllDrafts();

    this.paramSub = this.route.paramMap.subscribe(params => {
      const acronym = params.get('acronym') ?? '';
      void this.resolveCenter(acronym);
    });

    this.updateBreadcrumb(this.router.url);
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(e => this.updateBreadcrumb((e as NavigationEnd).urlAfterRedirects));
  }

  private async resolveCenter(acronym: string): Promise<void> {
    let centers = this.rolesService.getMyCenters();

    if (!centers.length) {
      await this.rolesService.updateRolesListFromLocalStorage();
      centers = this.rolesService.getMyCenters();
    }

    if (!centers.length) {
      await this.rolesService.updateRolesList().catch(() => {});
      centers = this.rolesService.getMyCenters();
    }

    const center = centers.find((c: any) => c.center_acronym === acronym);
    this.ctx.setCenter(acronym, center?.center_name ?? '', center?.center_id ?? undefined);
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
    this.paramSub?.unsubscribe();
  }

  private updateBreadcrumb(url: string): void {
    if (url.includes('/create') || url.includes('/result/')) {
      this.currentPageLabel = 'Create result';
      this.isAtHome = false;
    } else if (url.includes('/drafts')) {
      this.currentPageLabel = 'My draft results';
      this.isAtHome = false;
    } else if (url.includes('/results')) {
      this.currentPageLabel = 'Result list';
      this.isAtHome = false;
    } else {
      this.currentPageLabel = 'Home';
      this.isAtHome = true;
    }
  }
}

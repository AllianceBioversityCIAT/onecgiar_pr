import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ApiService } from '../../shared/services/api/api.service';
import { BilateralAiService } from './services/bilateral-ai.service';
import { BilateralContextService } from './services/bilateral-context.service';
import { RolesService } from '../../shared/services/global/roles.service';
import { CentersService } from '../../shared/services/global/centers.service';

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
  private readonly centersService = inject(CentersService);

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
    if (center) {
      this.ctx.setCenter(acronym, center.center_name ?? '', center.center_id ?? undefined);
      return;
    }

    // Admin users (or users without a matching center assignment): resolve via CLARISA catalog.
    const allCenters = await this.centersService.getData().catch(() => []);

    // Direct acronym match first.
    let clarisaCenter = allCenters.find((c: any) => c.acronym === acronym);

    // Fallback: known aliases for the Alliance of Bioversity and CIAT
    // (mirrors ALLIANCE_ALIASES in bilateral.service.ts on the server).
    if (!clarisaCenter) {
      const ALLIANCE_ACRONYMS = new Set(['ABC', 'CIAT-BIOVERSITY', 'CIAT (ALLIANCE)', 'BIOVERSITY (ALLIANCE)']);
      if (ALLIANCE_ACRONYMS.has(acronym.toUpperCase())) {
        clarisaCenter = allCenters.find((c: any) =>
          (c.name as string).toLowerCase().includes('alliance') &&
          (c.name as string).toLowerCase().includes('bioversity'),
        );
      }
    }

    this.ctx.setCenter(
      acronym,
      clarisaCenter?.name ?? '',
      clarisaCenter?.code ?? undefined,
    );
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

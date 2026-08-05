import { Component, OnInit, inject, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ApiService } from '../../shared/services/api/api.service';
import { BilateralAiService } from './services/bilateral-ai.service';
import { BilateralContextService } from './services/bilateral-context.service';
import { RolesService } from '../../shared/services/global/roles.service';
import { CentersService } from '../../shared/services/global/centers.service';

export interface BilateralBreadcrumbCrumb {
  label: string;
  /** null = current page (rendered as plain text, not a link). */
  link: unknown[] | null;
}

@Component({
  selector: 'app-bilateral',
  standalone: false,
  templateUrl: './bilateral.component.html',
  styleUrls: ['./bilateral.component.scss'],
})
export class BilateralComponent implements OnInit, OnDestroy {
  api = inject(ApiService);
  bilateralAiService = inject(BilateralAiService);
  private route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  readonly ctx = inject(BilateralContextService);
  private readonly rolesService = inject(RolesService);
  private readonly centersService = inject(CentersService);

  private readonly currentUrl = signal(this.router.url);
  readonly crumbs = computed<BilateralBreadcrumbCrumb[]>(() => this.computeCrumbs(this.currentUrl()));

  private paramSub?: Subscription;
  private navSub?: Subscription;

  ngOnInit(): void {
    this.api.dataControlSE.detailSectionTitle('Bilateral Results');
    this.bilateralAiService.loadAllDrafts();

    this.paramSub = this.route.paramMap.subscribe(params => {
      const acronym = params.get('acronym') ?? '';
      // Set the acronym synchronously so links built from ctx.centerAcronym()
      // (e.g. "Create result") are correct immediately, before the async
      // center/name lookup below resolves.
      this.ctx.setCenter(acronym, this.ctx.centerName(), this.ctx.centerId() ?? undefined, this.ctx.centerInstitutionId());
      void this.resolveCenter(acronym);
    });

    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(e => this.currentUrl.set((e as NavigationEnd).urlAfterRedirects));
  }

  /** Builds the breadcrumb trail for the current bilateral route. */
  private computeCrumbs(url: string): BilateralBreadcrumbCrumb[] {
    const acronym = this.ctx.centerAcronym();
    // Matches the acronym shown as the page title in bilateral-page-header
    // (ctx.centerName() is the longer institution description shown below it).
    const home: BilateralBreadcrumbCrumb = { label: acronym, link: ['/bilateral', acronym, 'home'] };

    const segments = url.split('?')[0].split('/').filter(Boolean);
    const rest = segments.slice(2); // drop 'bilateral' and the acronym segment

    if (!rest.length || rest[0] === 'home') {
      return [{ ...home, link: null }];
    }
    if (rest[0] === 'create') {
      return [home, { label: 'Create a result', link: null }];
    }
    if (rest[0] === 'result') {
      return [
        home,
        { label: 'Results', link: ['/bilateral', acronym, 'results'] },
        { label: 'Edit result', link: null }
      ];
    }
    if (rest[0] === 'results') {
      return [home, { label: 'Results', link: null }];
    }
    if (rest[0] === 'drafts') {
      if (rest.length > 1) {
        return [
          home,
          { label: 'My drafts', link: ['/bilateral', acronym, 'drafts'] },
          { label: 'Draft detail', link: null }
        ];
      }
      return [home, { label: 'My drafts', link: null }];
    }

    return [{ ...home, link: null }];
  }

  /** Jumps to the immediate parent crumb, falling back to browser history. */
  goBack(): void {
    const crumbs = this.crumbs();
    const parent = crumbs.length > 1 ? crumbs[crumbs.length - 2] : null;
    if (parent?.link) {
      void this.router.navigate(parent.link);
    } else {
      this.location.back();
    }
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

    // The role-by-user catalog only carries the CLARISA center *code* — the numeric
    // institution id (needed to scope bilateral AI drafts per center) always comes
    // from the CLARISA centers catalog, regardless of which branch below resolves
    // the acronym/name.
    const allCenters = await this.centersService.getData().catch(() => []);
    const clarisaCenter = this.findClarisaCenter(allCenters, acronym);

    const center = centers.find((c: any) => c.center_acronym === acronym);
    if (center) {
      this.ctx.setCenter(
        acronym,
        center.center_name ?? '',
        center.center_id ?? undefined,
        clarisaCenter?.institutionId ?? null,
      );
      return;
    }

    // Admin users (or users without a matching center assignment): resolve via CLARISA catalog.
    this.ctx.setCenter(
      acronym,
      clarisaCenter?.name ?? '',
      clarisaCenter?.code ?? undefined,
      clarisaCenter?.institutionId ?? null,
    );
  }

  /** Matches a bilateral acronym to its CLARISA center row, including the Alliance aliases. */
  private findClarisaCenter(allCenters: any[], acronym: string): any {
    const direct = allCenters.find((c: any) => c.acronym === acronym);
    if (direct) return direct;

    // Fallback: known aliases for the Alliance of Bioversity and CIAT
    // (mirrors ALLIANCE_ALIASES in bilateral.service.ts on the server).
    const ALLIANCE_ACRONYMS = new Set(['ABC', 'CIAT-BIOVERSITY', 'CIAT (ALLIANCE)', 'BIOVERSITY (ALLIANCE)']);
    if (!ALLIANCE_ACRONYMS.has(acronym.toUpperCase())) return undefined;

    return allCenters.find((c: any) =>
      (c.name as string).toLowerCase().includes('alliance') &&
      (c.name as string).toLowerCase().includes('bioversity'),
    );
  }

  ngOnDestroy(): void {
    this.paramSub?.unsubscribe();
    this.navSub?.unsubscribe();
  }
}

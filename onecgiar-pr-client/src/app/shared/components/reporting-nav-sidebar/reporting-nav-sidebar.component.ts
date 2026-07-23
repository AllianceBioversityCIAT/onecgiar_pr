import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideLayoutDashboard,
  lucideFileText,
  lucidePackage,
  lucideShieldCheck,
  lucideSettings,
  lucideHandshake,
  lucideChartLine,
  lucideCircleDot,
  lucideChevronDown
} from '@ng-icons/lucide';
import { HlmSidebarImports } from '@spartan/sidebar';
import { PrRoute, routingApp } from '../../routing/routing-data';
import { RolesService } from '../../services/global/roles.service';
import { DataControlService } from '../../services/data-control.service';
import { environment } from '../../../../environments/environment';
import { ResultFrameworkReportingHomeService } from '../../../pages/result-framework-reporting/pages/result-framework-reporting-home/services/result-framework-reporting-home.service';
import { SPProgress } from '../../interfaces/SP-progress.interface';

interface ProgramGroup {
  key: string;
  label: string;
  items: SPProgress[];
}

/**
 * Official Spartan sidebar used as the reporting navigation on Results Center and the
 * Result Framework home. Lists the app sections plus a lazily-loaded, collapsible tree of
 * Science Programs. Consumers wrap it in `hlmSidebarWrapper` + `hlmSidebarInset`.
 */
@Component({
  selector: 'app-reporting-nav-sidebar',
  standalone: true,
  imports: [RouterModule, NgIcon, ...HlmSidebarImports],
  templateUrl: './reporting-nav-sidebar.component.html',
  styleUrls: ['./reporting-nav-sidebar.component.scss'],
  providers: [
    provideIcons({
      lucideLayoutDashboard,
      lucideFileText,
      lucidePackage,
      lucideShieldCheck,
      lucideSettings,
      lucideHandshake,
      lucideChartLine,
      lucideCircleDot,
      lucideChevronDown
    })
  ]
})
export class ReportingNavSidebarComponent {
  public readonly rolesSE = inject(RolesService);
  public readonly dataControlSE = inject(DataControlService);
  public readonly homeSE = inject(ResultFrameworkReportingHomeService);
  public readonly router = inject(Router);

  /** Lucide icon per top-level section (matches the section `path`). */
  private readonly sectionIcons: Record<string, string> = {
    'result-framework-reporting': 'lucideLayoutDashboard',
    result: 'lucideFileText',
    ipsr: 'lucidePackage',
    'quality-assurance': 'lucideShieldCheck',
    'init-admin-module': 'lucideSettings',
    bilateral: 'lucideHandshake',
    'outcome-indicator-module': 'lucideChartLine'
  };

  /** Same visible set as the horizontal primary nav, mirrored into the sidebar. */
  readonly sections = computed<PrRoute[]>(() => routingApp.filter(o => !(o.prHide || this.validateAdminModuleAndRole(o))));

  // --- Results Framework & Reporting: lazy-expandable program tree ---
  /** Whether the RFR entry is expanded to reveal the Science Program groups. */
  readonly rfrExpanded = signal(false);
  /** Which program groups are open. "My programs" starts open, the rest collapsed. */
  readonly openGroups = signal<Set<string>>(new Set(['mine']));
  /** Ensures the (lazy) programs fetch is triggered at most once. */
  private rfrLoadTriggered = false;

  readonly programGroups = computed<ProgramGroup[]>(() => [
    { key: 'mine', label: 'My programs', items: this.homeSE.mySPsList() },
    { key: 'other', label: 'Other programs', items: this.homeSE.otherSPsList() },
    { key: 'projects', label: 'Other projects', items: this.homeSE.otherProjectsList() }
  ]);

  /** Currently selected program id from the URL `?sp=` query param (so the tree highlights it). */
  readonly activeSpId = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        const raw = this.router.parseUrl(this.router.url).queryParams['sp'];
        const id = Number(raw);
        return Number.isNaN(id) ? null : id;
      })
    ),
    { initialValue: null }
  );

  iconFor(section: PrRoute): string {
    return this.sectionIcons[section.path ?? ''] ?? 'lucideCircleDot';
  }

  /** Expand/collapse RFR. On the first expand, lazily fetch the programs (unless already cached). */
  toggleRfr(): void {
    const next = !this.rfrExpanded();
    this.rfrExpanded.set(next);
    if (next && !this.rfrLoadTriggered) {
      this.rfrLoadTriggered = true;
      const alreadyLoaded = this.homeSE.mySPsList().length || this.homeSE.otherSPsList().length || this.homeSE.otherProjectsList().length;
      if (!alreadyLoaded) this.homeSE.getScienceProgramsProgress();
    }
  }

  toggleGroup(key: string): void {
    this.openGroups.update(set => {
      const next = new Set(set);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  isGroupOpen(key: string): boolean {
    return this.openGroups().has(key);
  }

  iconSrc(sp: SPProgress): string {
    return `/assets/result-framework-reporting/SPs-Icons/${sp.initiativeCode}.png`;
  }

  /** Result count for the latest reporting version (falls back to the flat total). */
  count(sp: SPProgress): number {
    const versions = sp.versions ?? [];
    const latest = versions.length ? versions.reduce((a, b) => ((b.phaseYear ?? 0) > (a.phaseYear ?? 0) ? b : a)) : null;
    return latest?.totalResults ?? sp.totalResults ?? 0;
  }

  // Mirrors NavigationBarComponent so admin-only entries stay gated in the sidebar too.
  validateAdminModuleAndRole(option: PrRoute): boolean {
    if (option?.onlyTest && environment.production) return true;
    if (this?.rolesSE?.isAdmin) return false;
    if (option?.path === 'init-admin-module') return this.validateCoordAndLead();
    return false;
  }

  validateCoordAndLead(): boolean {
    const initiatives = this.dataControlSE?.myInitiativesList ?? [];
    const hasLeadOrCoordinator = initiatives.some(init => init?.role === 'Lead' || init?.role === 'Coordinator');
    return !hasLeadOrCoordinator;
  }
}

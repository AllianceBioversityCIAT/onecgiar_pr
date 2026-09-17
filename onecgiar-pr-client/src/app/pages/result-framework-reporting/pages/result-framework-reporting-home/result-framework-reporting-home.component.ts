import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultFrameworkReportingCardItemComponent } from './components/result-framework-reporting-card-item/result-framework-reporting-card-item.component';
import { ResultFrameworkReportingCenterCardItemComponent } from './components/result-framework-reporting-center-card-item/result-framework-reporting-center-card-item.component';
import { ResultFrameworkReportingInsightsComponent } from './components/result-framework-reporting-insights/result-framework-reporting-insights.component';
import { ResultFrameworkReportingRecentItemComponent } from './components/result-framework-reporting-recent-item/result-framework-reporting-recent-item.component';
import { ResultFrameworkReportingHomeService } from './services/result-framework-reporting-home.service';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { AlertGlobalInfoModule } from '../../../../shared/components/alert-global-info/alert-global-info.module';
import { PrTooltipDirectiveModule } from '../../../../shared/directives/pr-tooltip-directive.module';
import { RolesService } from '../../../../shared/services/global/roles.service';
import { RouterModule } from '@angular/router';
import { SPProgress } from '../../../../shared/interfaces/SP-progress.interface';
import { STATUS_META } from './status-meta';

@Component({
  selector: 'app-result-framework-reporting-home',
  imports: [
    CommonModule,
    ResultFrameworkReportingCardItemComponent,
    ResultFrameworkReportingCenterCardItemComponent,
    ResultFrameworkReportingInsightsComponent,
    ResultFrameworkReportingRecentItemComponent,
    CustomFieldsModule,
    RouterModule,
    AlertGlobalInfoModule,
    PrTooltipDirectiveModule
  ],
  templateUrl: './result-framework-reporting-home.component.html',
  styleUrl: './result-framework-reporting-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultFrameworkReportingHomeComponent {
  api = inject(ApiService);
  rolesSE = inject(RolesService);
  resultFrameworkReportingHomeService = inject(ResultFrameworkReportingHomeService);

  // reportingCurrentPhase is a plain object; depend on the version signal so the
  // hero chip renders once phases finish loading (zoneless CD)
  readonly phaseLabel = computed(() => {
    this.api.dataControlSE.reportingPhaseVersion();
    const phase = this.api.dataControlSE.reportingCurrentPhase;
    return phase?.portfolioAcronym && phase?.phaseName ? `${phase.portfolioAcronym} · ${phase.phaseName}` : '';
  });

  readonly myCentersList = computed(() => this.rolesSE.getMyCenters());

  /** Whether the "explore the whole portfolio" block is open. Closed by default: it is 12+ cards
   *  of programmes the person does not report on, and it used to be most of this page. */
  readonly exploreOpen = signal(false);

  readonly userFirstName = computed(() => (this.api.authSE.localStorageUser?.user_name ?? '').split(' ')[0] ?? '');

  /**
   * Results of the CURRENT phase across the programmes this person reports on, by status.
   *
   * `SPProgress.versions` carries one entry per phase, so summing `totalResults` straight off the
   * programme would mix 2025 into a 2026 number. The phase is matched by name against
   * `reportingCurrentPhase`; when it cannot be resolved (phases still loading), the numbers stay at
   * zero rather than silently counting every phase at once.
   */
  readonly myStatusTotals = computed(() => {
    this.api.dataControlSE.reportingPhaseVersion();
    const counts = new Map<number, number>();
    let total = 0;

    for (const sp of this.resultFrameworkReportingHomeService.mySPsList() ?? []) {
      const version = this.currentVersion(sp);
      if (!version) continue;
      total += version.totalResults ?? 0;
      for (const status of version.statuses ?? []) {
        counts.set(status.statusId, (counts.get(status.statusId) ?? 0) + (status.count ?? 0));
      }
    }

    const tiles = Object.entries(STATUS_META)
      .map(([id, meta]) => ({ id: Number(id), label: meta.label, dotClass: meta.dotClass, order: meta.order, count: counts.get(Number(id)) ?? 0 }))
      .filter(tile => tile.count > 0)
      .sort((a, b) => a.order - b.order);

    return { total, tiles };
  });

  /** Programmes and centres in one list: they are the same thing to the person — a place they
   *  report in — and two grids of cards for two and three items was most of the old page. */
  readonly myPlaces = computed(() => {
    this.api.dataControlSE.reportingPhaseVersion();

    const programmes = (this.resultFrameworkReportingHomeService.mySPsList() ?? []).map(sp => {
      const version = this.currentVersion(sp);
      const total = version?.totalResults ?? 0;
      const reported = (version?.statuses ?? [])
        .filter(status => status.statusId === 2 || status.statusId === 3)
        .reduce((sum, status) => sum + (status.count ?? 0), 0);
      return {
        kind: 'program' as const,
        code: sp.initiativeCode,
        name: sp.initiativeShortName || sp.initiativeName,
        link: ['/result-framework-reporting/entity-details', sp.initiativeCode],
        total,
        reported,
        percent: total > 0 ? Math.round((reported / total) * 100) : 0
      };
    });

    const centers = (this.myCentersList() ?? []).map((center: { center_acronym?: string; center_id?: unknown; center_name?: string }) => ({
      kind: 'center' as const,
      code: String(center?.center_acronym || center?.center_id || ''),
      name: center?.center_name ?? '',
      link: ['/bilateral', String(center?.center_acronym || center?.center_id || ''), 'home'],
      total: 0,
      reported: 0,
      percent: 0
    }));

    return [...programmes, ...centers];
  });

  /**
   * The programme's version for the phase currently open.
   *
   * 🛑 The two names are NOT the same string: `reportingCurrentPhase.phaseName` is `Reporting 2026`
   * while the version carries `Reporting 2026 - P25` — the portfolio is appended. Comparing them
   * with `===` matched nothing and every number on this page came out as zero, which reads as
   * "you have reported nothing" rather than as a bug. Measured on SP01: 142 results, shown as 0.
   *
   * So the match is `<phase>` or `<phase> - <portfolio>`, never a `startsWith`: that would let
   * `Reporting 2026 - P22` answer for a P25 phase. With nothing matching it returns null and the
   * caller shows no numbers at all, rather than summing every phase at once.
   */
  private currentVersion(sp: SPProgress) {
    this.api.dataControlSE.reportingPhaseVersion();
    const phase = this.api.dataControlSE.reportingCurrentPhase;
    const phaseName = phase?.phaseName;
    const versions = sp?.versions ?? [];
    if (!phaseName || !versions.length) return null;

    const withPortfolio = phase?.portfolioAcronym ? `${phaseName} - ${phase.portfolioAcronym}` : null;
    return versions.find(version => version.phaseName === phaseName || (withPortfolio !== null && version.phaseName === withPortfolio)) ?? null;
  }
}

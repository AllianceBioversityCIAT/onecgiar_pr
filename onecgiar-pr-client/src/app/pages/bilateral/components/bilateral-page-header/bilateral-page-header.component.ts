import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SmartNavigationService } from '../../../../shared/services/smart-navigation.service';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralContextService } from '../../services/bilateral-context.service';

@Component({
  selector: 'app-bilateral-page-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './bilateral-page-header.component.html',
  styleUrl: './bilateral-page-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BilateralPageHeaderComponent {
  private readonly router = inject(Router);
  readonly ctx = inject(BilateralContextService);
  readonly bilateralAiService = inject(BilateralAiService);
  readonly navSE = inject(SmartNavigationService);

  /** Which center section is active. Omit (e.g. on the create-result wizard) to hide the tab bar and CTA. */
  readonly activeTab = input<'overview' | 'reporting' | 'results' | 'drafts' | null>(null);

  /** Whether the Reporting (primary) tab is active — accepts both 'reporting' and legacy 'overview'. */
  readonly isReportingActive = computed(() => this.activeTab() === 'reporting' || this.activeTab() === 'overview');

  /**
   * Page title for the single-page variant of this header (P2-3100 AC1). When set, the
   * stacked centre block collapses into a one-line breadcrumb and the `h1` becomes this
   * title. Left unset — as the three tabbed pages do — the header renders unchanged.
   */
  readonly pageTitle = input<string | null>(null);

  /**
   * `band` is the sticky centre band the tabbed pages and the wizard use. `detail` is the in-flow
   * header of the result editor: way back, title, identity strip — the same shape the W1/W2
   * result detail draws, rebuilt here because that page's header belongs to `pages/results/`.
   */
  readonly variant = input<'band' | 'detail'>('band');

  /**
   * P2-3352: identity of the result being edited — code, type, funding tag and status.
   */
  readonly resultCode = input<string | number | null>(null);
  readonly resultTypeName = input<string | null>(null);
  readonly isW3Bilateral = input(false);
  /** `result.status_id`. Only the four the story lists render a badge; anything else is ignored. */
  readonly statusId = input<number | null>(null);

  private static readonly STATUS_BADGES: Record<number, { label: string; classes: string }> = {
    1: { label: 'Editing', classes: 'bg-[#F3F4F6] text-[#6B7280]' },
    5: { label: 'Pending review', classes: 'bg-[#FEF3C7] text-[#B45309]' },
    6: { label: 'Approved', classes: 'bg-[#D1FAE5] text-[#047857]' },
    7: { label: 'Rejected', classes: 'bg-[#FEE2E2] text-[#B91C1C]' },
  };

  readonly statusBadge = computed(() => {
    const id = this.statusId();
    return id == null ? null : (BilateralPageHeaderComponent.STATUS_BADGES[Number(id)] ?? null);
  });

  readonly hasIdentityStrip = computed(
    () => this.resultCode() != null || !!this.resultTypeName() || this.isW3Bilateral() || !!this.statusBadge(),
  );

  /** `[Full Center Name] (INITIALS)`, the trailing breadcrumb segment required by AC1. */
  readonly centerBreadcrumbLabel = computed(() => {
    const name = this.ctx.centerName();
    const acronym = this.ctx.centerAcronym();
    return name ? `${name} (${acronym})` : acronym;
  });

  readonly reportCtaLabel = computed(() => 'Report emerging result');

  /** Optional explicit override for the back button label. */
  readonly backLabelOverride = input<string>('');

  /** Dynamic context-aware back button label derived from navigation history. */
  readonly backLabel = computed(() => {
    const override = this.backLabelOverride()?.trim();
    if (override) return override;
    const url = this.router.url;
    const isCreateOrDetail = !!this.pageTitle();
    const effectiveUrl =
      isCreateOrDetail && !url.includes('/create') && !url.includes('/result/')
        ? `/bilateral/${encodeURIComponent(this.ctx.centerAcronym() || '')}/create`
        : url;
    return this.navSE.getBackTarget(effectiveUrl, this.ctx.centerAcronym() ?? undefined).label;
  });

  /** Navigates back intelligently to the previous surface or logical parent. */
  goBack(): void {
    const url = this.router.url;
    const isCreateOrDetail = !!this.pageTitle();
    const effectiveUrl =
      isCreateOrDetail && !url.includes('/create') && !url.includes('/result/')
        ? `/bilateral/${encodeURIComponent(this.ctx.centerAcronym() || '')}/create`
        : url;
    const target = this.navSE.getBackTarget(effectiveUrl, this.ctx.centerAcronym() ?? undefined);
    this.navSE.back(target.url, this.ctx.centerAcronym() ?? undefined);
  }
}

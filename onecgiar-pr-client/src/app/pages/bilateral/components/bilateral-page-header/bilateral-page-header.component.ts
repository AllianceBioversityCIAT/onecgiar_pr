import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralContextService } from '../../services/bilateral-context.service';

@Component({
  selector: 'app-bilateral-page-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './bilateral-page-header.component.html',
  styleUrl: './bilateral-page-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BilateralPageHeaderComponent {
  readonly ctx = inject(BilateralContextService);
  readonly bilateralAiService = inject(BilateralAiService);

  /** Which center section is active. Omit (e.g. on the create-result wizard) to hide the tab bar and CTA. */
  readonly activeTab = input<'overview' | 'results' | 'drafts' | null>(null);

  /**
   * Page title for the single-page variant of this header (P2-3100 AC1). When set, the
   * stacked centre block collapses into a one-line breadcrumb and the `h1` becomes this
   * title. Left unset — as the three tabbed pages do — the header renders unchanged.
   */
  readonly pageTitle = input<string | null>(null);

  /**
   * P2-3352: identity of the result being edited — code, type and funding tag. Passed in rather than
   * read from BilateralCreationService so this header stays usable by the three tabbed pages, which
   * have no result loaded. All three are optional; the strip renders only for the ones present.
   *
   * The status badge the story also asks for is NOT here: the bilateral result-detail response
   * (CommonFieldsDto) carries no status field, so the editor cannot know it. Blocked on backend —
   * see P2-3437.
   */
  readonly resultCode = input<string | number | null>(null);
  readonly resultTypeName = input<string | null>(null);
  readonly isW3Bilateral = input(false);

  readonly hasIdentityStrip = computed(
    () => this.resultCode() != null || !!this.resultTypeName() || this.isW3Bilateral(),
  );

  /** `[Full Center Name] (INITIALS)`, the trailing breadcrumb segment required by AC1. */
  readonly centerBreadcrumbLabel = computed(() => {
    const name = this.ctx.centerName();
    const acronym = this.ctx.centerAcronym();
    return name ? `${name} (${acronym})` : acronym;
  });

  /** Overview gets its own copy slot; the other tabs keep the shared CTA text. */
  readonly reportCtaLabel = computed(() =>
    this.activeTab() === 'overview' ? 'Report emerging result' : 'Report emerging result',
  );
}

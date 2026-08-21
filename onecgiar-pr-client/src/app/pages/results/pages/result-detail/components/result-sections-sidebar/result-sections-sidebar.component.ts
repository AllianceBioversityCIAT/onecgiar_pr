import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PrTooltipDirectiveModule } from '../../../../../../shared/directives/pr-tooltip-directive.module';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
import { ResultSectionsService } from './result-sections.service';

/** Shared geometry of a section row — only the colours differ between active and idle. */
const ROW_BASE = 'flex h-[44px] items-center gap-[10px] rounded-[8px] px-[10px] text-[14px] no-underline transition-colors';

/**
 * The result detail's second sidebar: section list, completion progress and the result-level
 * actions (AI review / Submit / Unsubmit).
 *
 * Replaces the collapsible section subtree that lived inside the dark nav sidebar. It also
 * supersedes the legacy `panel-menu` component, which had already been orphaned (declared in
 * `result-detail.module.ts` but referenced by no template) and is not revived here.
 */
@Component({
  selector: 'app-result-sections-sidebar',
  templateUrl: './result-sections-sidebar.component.html',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, PrTooltipDirectiveModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultSectionsSidebarComponent {
  readonly sectionsSE = inject(ResultSectionsService);
  private readonly fieldsManagerSE = inject(FieldsManagerService);

  readonly activeRowClass = `${ROW_BASE} bg-[var(--pr-color-primary-50)] font-semibold text-[var(--pr-color-primary-400)]`;
  readonly idleRowClass = `${ROW_BASE} font-medium text-[var(--pr-text)] hover:bg-[var(--pr-color-accents-1)]`;

  /**
   * Skeleton row count while the portfolio resolves. P25 shows fewer sections than P22, so the
   * placeholder matches the list that is about to arrive instead of jumping. Same numbers the
   * previous panel-menu skeleton used.
   */
  readonly skeletonRows = computed(() => {
    const count = this.fieldsManagerSE.isP25() ? 5 : 7;
    return Array.from({ length: count }, (_, i) => i + 1);
  });
}

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PrTooltipDirectiveModule } from '../../../../../../shared/directives/pr-tooltip-directive.module';
import { isMyResultsTab, isProgrammeResultsTab, SmartNavigationService, splitNavUrl } from '../../../../../../shared/services/smart-navigation.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
import { ResultSectionsService, ROLE_CANNOT_SUBMIT_NOTICE } from './result-sections.service';
import { CopyButtonComponent } from '../../../../../../shared/components/copy-button/copy-button.component';
import { GreenChecksService } from '../../../../../../shared/services/global/green-checks.service';

/** Shared geometry of a section row — only the colours differ between active and idle. */
// `shrink-0` reproduce el `flex:none` del mockup: el riel ahora tiene altura fija, así que sin
// esto una lista larga de secciones aplasta las filas por debajo de sus 44px en vez de scrollear.
const ROW_BASE = 'flex h-[44px] shrink-0 items-center gap-[10px] rounded-[8px] px-[10px] text-[14px] no-underline transition-colors';

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
  imports: [RouterLink, RouterLinkActive, PrTooltipDirectiveModule, CopyButtonComponent],
  styles: `
    /* A section turning green is the one moment of progress on this screen; it earns a beat.
       The element is created by the template's @if, so this runs exactly when a section becomes
       complete (and once per marker on load), never on an unrelated re-render. */
    @keyframes rs-done-pop {
      0% {
        transform: scale(0.4);
        opacity: 0;
      }
      60% {
        transform: scale(1.12);
        opacity: 1;
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }

    .rs-done {
      animation: rs-done-pop 340ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    /* A recheck is in flight — the dashed ring becomes the spinner it already resembles. */
    @keyframes rs-checking-spin {
      to {
        transform: rotate(360deg);
      }
    }

    .rs-checking {
      animation: rs-checking-spin 900ms linear infinite;
      border-color: var(--pr-color-primary-300);
    }

    @media (prefers-reduced-motion: reduce) {
      .rs-done,
      .rs-checking {
        animation: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultSectionsSidebarComponent {
  readonly sectionsSE = inject(ResultSectionsService);
  private readonly fieldsManagerSE = inject(FieldsManagerService);
  private readonly smartNav = inject(SmartNavigationService);

  readonly activeRowClass = `${ROW_BASE} bg-[var(--pr-color-primary-50)] font-semibold text-[var(--pr-color-primary-400)]`;
  readonly greenChecksSE = inject(GreenChecksService);

  readonly idleRowClass = `${ROW_BASE} font-medium text-[var(--pr-text)] hover:bg-[var(--pr-surface-subtle-hover)]`;

  /** Copy for the role notice that stands in for Submit (P2-3691). Held here so the template
   *  binds a constant instead of repeating the sentence. */
  readonly roleCannotSubmitNotice = ROLE_CANNOT_SUBMIT_NOTICE;

  /** Pending marker. Held here, not in the template: an arbitrary-value class cannot go inside
   *  a `[class.…]` binding — the brackets break Angular's template parser. */
  private static readonly PENDING_BASE = 'size-[20px] shrink-0 rounded-full border-2 border-dashed';
  readonly pendingClass = `${ResultSectionsSidebarComponent.PENDING_BASE} border-[var(--pr-border-strong)]`;
  readonly pendingActiveClass = `${ResultSectionsSidebarComponent.PENDING_BASE} border-[var(--pr-color-primary-200)]`;

  get backLink(): string {
    return splitNavUrl(this.smartNav.getResultDetailBackTarget().url).path;
  }

  get backQueryParams(): Record<string, string> {
    return splitNavUrl(this.smartNav.getResultDetailBackTarget().url).queryParams;
  }

  get backTitle(): string {
    const url = this.smartNav.getResultDetailBackTarget().url;
    if (isProgrammeResultsTab(url)) return 'Back to programme results';
    if (isMyResultsTab(url)) return 'Back to My results';
    return 'Back to all results';
  }

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

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideZap } from '@ng-icons/lucide';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { PLATFORM_GUIDE_COPY } from '../../../../../results/pages/results-outlet/pages/results-list/components/results-center-reporting-guide/platform-guide-copy';

/**
 * Informational card shown when a user opens a Science Program reporting surface without
 * membership on that program (platform Guest or no reporting role). Mirrors the W1/W2 lane
 * from Results Center "Where to report" guide-only mode.
 */
@Component({
  selector: 'app-sp-reporting-access-notice',
  standalone: true,
  imports: [RouterLink, NgIcon],
  providers: [provideIcons({ lucideZap })],
  templateUrl: './sp-reporting-access-notice.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpReportingAccessNoticeComponent {
  private readonly api = inject(ApiService);

  /** When false, hides the nested emerging-result hint block. */
  readonly showEmergingHint = input(true);

  readonly copy = PLATFORM_GUIDE_COPY;

  readonly activeYear = computed(
    () => this.api.dataControlSE?.reportingCurrentPhase?.phaseYear ?? null
  );
}

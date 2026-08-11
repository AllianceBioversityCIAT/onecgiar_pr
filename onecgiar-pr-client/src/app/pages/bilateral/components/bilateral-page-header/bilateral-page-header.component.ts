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

  /** Overview gets its own copy slot; the other tabs keep the shared CTA text. */
  readonly reportCtaLabel = computed(() =>
    this.activeTab() === 'overview' ? 'Report emerging result' : 'Report emerging result',
  );
}

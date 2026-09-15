import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Shared empty-state panel for Science Program entity tabs (Overview-adjacent surfaces). */
@Component({
  selector: 'app-sp-tab-empty-state',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sp-tab-empty-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpTabEmptyStateComponent {
  /** Material icon name — omitted in `filtered` variant. */
  readonly icon = input<string | null>(null);
  readonly title = input.required<string>();
  readonly description = input<string>('');
  /** `hero`: dashed primary border + optional icon. `filtered`: neutral dashed border, no icon. */
  readonly variant = input<'hero' | 'filtered'>('hero');
  readonly testId = input<string>('sp-tab-empty-state');

  readonly primaryLabel = input<string | null>(null);
  readonly primaryRouterLink = input<string | string[] | null>(null);
  readonly primaryAction = output<void>();

  readonly secondaryLabel = input<string | null>(null);
  readonly secondaryRouterLink = input<string | string[] | null>(null);
  readonly secondaryAction = output<void>();
}

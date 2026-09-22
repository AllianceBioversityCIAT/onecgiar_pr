// @akili-spec bilateral/review-list-source-and-reporter (BSR-T-3, BSR-R-4, BSR-R-5, BSR-R-7, BSR-R-11, design.md §6.2, §6.3)
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AiProvenanceNoticeComponent } from '../../../../../bilateral/components/ai-provenance-notice/ai-provenance-notice.component';
import { BILATERAL_REVIEW_COPY } from '../../bilateral-review.copy';
import { BilateralSourceDescriptor } from './resolve-bilateral-source';

/**
 * Presentational Source chip for the Bilateral review list (`BSR-R-4`) and, reused unchanged, the
 * review drawer header (`BSR-R-9`). Takes an already-resolved `BilateralSourceDescriptor` — the
 * caller derives it from its own payload via the pure `resolveBilateralSource` (colocated in this
 * folder) — so this component never parses `creation_method`/`external_platform_code` itself and
 * stays a plain three-way render.
 *
 * `:host { display: contents }` (matching `AiProvenanceNoticeComponent`'s own host, design.md
 * `BSR-DD-2`) — this component renders no box of its own so a cell-owned wrapper
 * (`<span class="block truncate max-w-full">`, `BSR-T-4`'s job) can clip whichever of the three
 * variants is inside, including the AI case's own `display: contents` delegate.
 */
@Component({
  selector: 'app-bilateral-review-source-chip',
  standalone: true,
  imports: [AiProvenanceNoticeComponent],
  templateUrl: './bilateral-review-source-chip.component.html',
  styleUrl: './bilateral-review-source-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BilateralReviewSourceChipComponent {
  readonly source = input.required<BilateralSourceDescriptor>();

  readonly copy = BILATERAL_REVIEW_COPY.sourceChip;

  /** Real TS narrowing (not template narrowing — `strictTemplates` narrows `@switch`/`@case`
   *  bodies inconsistently across the compiler's versions) so the `'pill'`-only fields are safe
   *  to read here regardless. Empty string for the other two kinds; the template never renders
   *  these outside the `'pill'` case. */
  pillLabel(): string {
    const source = this.source();
    return source.kind === 'pill' ? source.label : '';
  }

  pillAccessibleName(): string {
    const source = this.source();
    return source.kind === 'pill' ? source.accessibleName : '';
  }
}

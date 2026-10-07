import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { centerLogoSrc } from '../../../pages/result-framework-reporting/pages/result-framework-reporting-home/components/result-framework-reporting-center-card-item/center-logos';

/**
 * The visual identity of a CGIAR Center in the sidebar: its logo, with the coloured diamond as
 * the fallback. Mirrors `app-sp-marker` for programmes.
 *
 * Logos come from `center-logos.ts` (same map as the home card). A Center without an entry, or
 * whose PNG 404s, keeps the diamond, so nothing can ever render as a broken image.
 */
@Component({
  selector: 'app-center-marker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showIcon()) {
      <img
        [src]="src()"
        [style.width.px]="size()"
        [style.height.px]="size()"
        class="shrink-0 rounded-[5px] object-contain"
        alt=""
        aria-hidden="true"
        (error)="onError()" />
    } @else if (showFallback()) {
      <span
        class="shrink-0"
        [style.width.px]="diamondSize()"
        [style.height.px]="diamondSize()"
        [style.background]="fallbackColor()"
        style="transform: rotate(45deg)"></span>
    }
  `,
  styles: ':host { display: contents; }'
})
export class CenterMarkerComponent {
  /** CLARISA acronym, e.g. `IFPRI` or `CIAT (Alliance)`. */
  readonly acronym = input<string | null | undefined>(null);
  readonly size = input<number>(18);
  readonly diamondSize = input<number>(8);
  readonly fallbackColor = input<string>('var(--pr-color-primary-300)');
  /** False where a diamond would be noise (e.g. next to a page title): no logo → nothing. */
  readonly showFallback = input<boolean>(true);

  /** Sources that 404'd, keyed by src so a reused instance never hides a logo that does exist. */
  private readonly failed = signal<ReadonlySet<string>>(new Set<string>());

  readonly src = computed(() => centerLogoSrc(this.acronym()));
  readonly showIcon = computed(() => {
    const src = this.src();
    return Boolean(src) && !this.failed().has(src as string);
  });

  onError(): void {
    const src = this.src();
    if (!src) return;
    this.failed.update(set => new Set(set).add(src));
  }
}

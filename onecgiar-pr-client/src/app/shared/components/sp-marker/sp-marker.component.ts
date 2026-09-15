import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

/**
 * The visual identity of a science programme: its logo, with the coloured dot as the fallback.
 *
 * One component rather than a copy per surface — the sidebar and the programme band showed the
 * same programme with two different markers before this, and any later surface would have had to
 * re-derive both the asset path and the 404 handling.
 *
 * Artwork only exists for SP01–SP13 (`assets/result-framework-reporting/SPs-Icons/`). Projects and
 * any future code without a PNG fall back to the dot, so nothing can ever render as a broken image.
 */
@Component({
  selector: 'app-sp-marker',
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
    } @else {
      <span
        class="shrink-0 rounded-full"
        [style.width.px]="dotSize()"
        [style.height.px]="dotSize()"
        [style.background]="fallbackColor()"></span>
    }
  `,
  styles: ':host { display: contents; }'
})
export class SpMarkerComponent {
  /** Programme code, e.g. `SP07`. Anything without artwork renders the dot. */
  readonly code = input<string | null | undefined>(null);
  readonly size = input<number>(18);
  readonly dotSize = input<number>(8);
  readonly fallbackColor = input<string>('var(--pr-color-primary-300)');

  /**
   * Codes whose PNG 404'd — asking again would only 404 again. Keyed BY CODE, not a plain
   * boolean: the band reuses one instance across programmes, and a boolean would keep showing
   * the dot for a programme that does have artwork.
   */
  private readonly failed = signal<ReadonlySet<string>>(new Set<string>());

  readonly src = computed(() => `/assets/result-framework-reporting/SPs-Icons/${this.code()}.png`);
  readonly showIcon = computed(() => {
    const code = this.code();
    return Boolean(code) && !this.failed().has(code as string);
  });

  onError(): void {
    const code = this.code();
    if (!code) return;
    this.failed.update(set => new Set(set).add(code));
  }
}

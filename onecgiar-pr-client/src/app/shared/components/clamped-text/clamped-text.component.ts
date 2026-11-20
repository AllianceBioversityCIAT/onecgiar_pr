import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, computed, input, linkedSignal, signal, viewChild } from '@angular/core';
import { CLAMPED_TEXT_COPY } from '../../../internationalization/clamped-text.copy';

/**
 * `changes/toc-kpi-option-readability` (TKR-R-2, TKR-DD-5): shows `text` clamped to `lines` lines with
 * a "Show more" / "Show less" toggle. Whether the text overflows is a layout fact, so it is measured
 * after render (and on resize) rather than guessed from a character count. The toggle renders only
 * when the text overflows (or while expanded, so it can always be collapsed again).
 *
 * `expanded` is reset to false whenever `text` changes (TKR-S-2.3). Purely presentational: it never
 * touches form state.
 */
@Component({
  selector: 'app-clamped-text',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './clamped-text.component.html'
})
export class ClampedTextComponent {
  readonly text = input<string>('');
  readonly lines = input<number>(3);

  readonly copy = CLAMPED_TEXT_COPY;

  /** Reset to collapsed every time the text changes (TKR-S-2.3). */
  readonly expanded = linkedSignal<string, boolean>({ source: this.text, computation: () => false });
  readonly overflows = signal(false);
  readonly showToggle = computed(() => this.overflows() || this.expanded());

  private readonly body = viewChild<ElementRef<HTMLElement>>('body');

  constructor() {
    // Re-measure after render whenever the text, the line count or the collapsed state changes.
    afterRenderEffect({
      read: () => {
        this.text();
        this.lines();
        this.measure();
      }
    });
    // Re-measure when the available width changes (wrapping changes the line count).
    afterRenderEffect({
      read: onCleanup => {
        const el = this.body()?.nativeElement;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => this.measure());
        observer.observe(el);
        onCleanup(() => observer.disconnect());
      }
    });
  }

  toggle(): void {
    this.expanded.update(value => !value);
  }

  /** Only meaningful while clamped: an expanded element always has scrollHeight === clientHeight. */
  private measure(): void {
    const el = this.body()?.nativeElement;
    if (!el || this.expanded()) return;
    this.overflows.set(el.scrollHeight > el.clientHeight + 1);
  }
}

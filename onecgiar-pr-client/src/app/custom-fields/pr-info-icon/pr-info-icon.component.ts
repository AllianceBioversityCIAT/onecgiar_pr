import { Component, Input } from '@angular/core';

/**
 * Outlined "info" glyph, drawn as inline SVG.
 *
 * P2-3339: QA saw the literal text `info_outline` rendered on top of the MANDATORY badge in
 * Section 5. Every place that needs this glyph used to write `<i class="material-icons-round">
 * info_outline</i>`, which depends on the Material Icons Round webfont resolving the ligature at
 * paint time. When it doesn't — for any reason: the font request fails, the stylesheet is blocked,
 * the swap happens late — the browser paints the ligature name as plain text, and inside an 18px
 * trigger a 12-character word overflows onto whatever sits next to it.
 *
 * Inline SVG removes the dependency entirely: there is no ligature to fall back from. It inherits
 * `currentColor`, so callers keep styling it through the parent (e.g. `.sgi-dac-info`).
 */
@Component({
  selector: 'app-pr-info-icon',
  standalone: true,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false">
      <path
        d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 0;
      }
    `
  ]
})
export class PrInfoIconComponent {
  /** Edge length in px. Defaults to the 16px the shared `.sgi-dac-info` trigger expects. */
  @Input() size = 16;
}

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
 *
 * The geometry is the mockup's own: a `stroke-width: 2` ring with the stem and the dot drawn as
 * strokes, rather than Material's filled `info_outline` path, whose hairline ring reads lighter
 * than everything around it at 14-16px.
 */
@Component({
  selector: 'app-pr-info-icon',
  standalone: true,
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"></circle>
      <path d="M12 11v5.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
      <circle cx="12" cy="7.6" r="1.2" fill="currentColor"></circle>
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

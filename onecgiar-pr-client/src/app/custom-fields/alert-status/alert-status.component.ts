import { Component, Input, OnInit, WritableSignal, signal } from '@angular/core';

/**
 * Module-level counter for `panelId` (ITR-T-5): the simplest unique-id pattern for pairing the
 * collapsed trigger's `aria-controls` with the floating panel's `id`. No Angular DI needed — see
 * `design.md` §6.2.
 */
let nextAlertStatusPanelId = 0;

@Component({
    selector: 'app-alert-status',
    templateUrl: './alert-status.component.html',
    styleUrls: ['./alert-status.component.scss'],
    standalone: false
})
export class AlertStatusComponent implements OnInit {
  @Input() status: 'info' | 'warning' | 'success' | 'error' = 'info';
  @Input() description: string = '';
  @Input() inlineStyles?: string = '';
  /**
   * Overrides the glyph the status would pick. The mockup marks every AI note with the sparkle
   * (`auto_awesome`) rather than a generic ⓘ — the icon is what tells the reader, before any
   * text, that the paragraph is about the assistant. Same glyph the AI review button uses.
   */
  @Input() icon?: string;
  /**
   * Seeds the collapsed/expanded disclosure state for `status: 'info'` panels (ITR-R-20).
   * Defaults to `false` (collapsed) — every existing call site ships collapsed by default;
   * a caller may opt into `true` for a panel that must be seen immediately.
   */
  @Input() startExpanded: boolean = false;

  /**
   * Escape hatch (ITR-R-30/`ITR-DD-5`): opts a call site OUT of the icon+popover disclosure
   * entirely, regardless of `status`. `[collapsible]="false"` on a `status="info"` instance
   * routes it through the same always-visible `@else` branch used by `warning`/`error`/`success`,
   * rendering the original pre-spec `info` box treatment (see the component SCSS's `.alert_boxed`
   * rule). Used for section-level intro notes (`ITR-R-31`) that describe a whole section rather
   * than one field. Defaults to `true`, preserving `ITR-R-1`-`ITR-R-4`'s icon+popover behavior for
   * every other call site.
   */
  @Input() collapsible: boolean = true;

  /**
   * Stable per-instance id linking the collapsed trigger (`aria-controls`) to the floating panel
   * (`id`) it discloses (ITR-T-5, `design.md` §6.2). Read once per instance from a module-level
   * counter — no Angular DI needed.
   */
  readonly panelId: string = `alert-panel-${nextAlertStatusPanelId++}`;

  private readonly statusIcons: Record<string, string> = {
    info: 'info',
    warning: 'warning',
    success: 'check',
    error: 'error'
  };

  /**
   * Only `status: 'info'` panels get the collapsed/expand disclosure (ITR-R-1..R-5), and only
   * when the call site hasn't opted out via `[collapsible]="false"` (ITR-R-30). Plain getter
   * (matches the `iconName` getter's idiom below) — `status`/`collapsible` are plain `@Input()`
   * fields, not signals, so a `computed()` here would read them once and cache that result
   * forever, never reacting to a later binding change.
   */
  get isCollapsible(): boolean {
    return this.status === 'info' && this.collapsible;
  }

  /**
   * Collapsed/expanded state for the `info` disclosure, seeded from `startExpanded`.
   * Seeded here (not at field-initializer time) because `@Input()`-bound values are assigned
   * by Angular after construction but before `ngOnInit` — a field initializer would always
   * read the input's own default rather than a caller-provided value.
   */
  readonly expanded: WritableSignal<boolean> = signal(false);

  ngOnInit(): void {
    this.expanded.set(this.startExpanded);
  }

  toggle(): void {
    this.expanded.update(value => !value);
  }

  /**
   * Fixed collapsed-state label (ITR-DD-2): one static string for every `info` panel app-wide,
   * not a per-caller `@Input`, to keep the existing `@Input` contract backwards-compatible.
   */
  collapsedLabel(): string {
    return 'More info';
  }

  get iconName(): string {
    return this.icon ?? this.statusIcons[this.status] ?? 'info';
  }
}

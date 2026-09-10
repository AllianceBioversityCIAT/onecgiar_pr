import { Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pr-button',
  templateUrl: './pr-button.component.html',
  styleUrls: ['./pr-button.component.scss'],
  standalone: false
})
export class PrButtonComponent {
  @Input() text: string;
  @Input() icon: string;
  @Input() reverse: boolean = false;
  @Input() rotating: boolean = false;
  @Input() rotateRight: boolean = false;
  @Input() variant: 'outlined' | 'filled' = 'outlined';
  @Input() underConstruction: boolean = false;
  @Input() showBackground: boolean = true;
  @Input() iconsStylesClass: 'material-icons-round' | 'material-icons-outlined' | 'pi' = 'material-icons-round';
  @Input() colorType: 'primary' | 'danger' | 'secondary' | 'success' = 'primary';
  @Input() padding: 'small' | 'medium' | 'big' = 'small';
  @Input() pulse: boolean = false;
  @Input() verticalMargin: number = 10;
  @Input() disabled: boolean = false;
  @Input() tooltipText: string = '';
  @Input() tooltipTextPosition: 'right' | 'left' | 'top' | 'bottom' = 'top';
  @Input() tooltipStyleClass: string = '';

  /**
   * "This button's own request is in flight". A single binding swaps the label and icon, spins
   * it, and blocks re-entry, so every save/submit surface outside the fixed save bar is wired the
   * same way instead of re-deriving three bindings by hand.
   *
   * Deliberately NOT folded into [rotating]: 38 consumers use [rotating] as a purely decorative
   * spinner and must stay clickable (locked by pr-button.contract.cy.ts).
   */
  @Input() loading: boolean = false;
  /** Label while loading. Empty keeps `text`, so a bare [loading] is still valid. */
  @Input() loadingText: string = '';
  /** Glyph while loading — the app-wide spinner icon used by the fixed save bar. */
  @Input() loadingIcon: string = 'loop';

  @Output() clickEvent = new EventEmitter<any>();

  png_icons = ['excel_white'];

  /**
   * Kills pointer events on the HOST, not only on the inner `.pr_button`: several call sites bind
   * (click) on <app-pr-button> itself rather than (clickEvent), and a guard on the inner element
   * would never see those clicks — the browser would hit-test the host and fire anyway.
   *
   * A style binding and NOT the `.globalDisabled` class, for two measured reasons:
   *  - 15+ call sites already put `[ngClass]="{ globalDisabled: … }"` on <app-pr-button>. NgClass
   *    writes classes imperatively, so the moment that expression flips true→false mid-flight it
   *    REMOVES the class this host binding added, and Angular never re-applies it (the host value
   *    itself did not change) — the button would silently become clickable again while its own
   *    request is still running.
   *  - `.globalDisabled` also carries `opacity: .5`, which would stack with the `.5` the inner
   *    `.b-disabled` already applies while loading (0.25 — visibly fainter than the current save bar).
   */
  @HostBinding('style.pointer-events') get hostPointerEvents(): string | null {
    return this.loading ? 'none' : null;
  }

  /** True while this button's own request is in flight, i.e. while the host is pointer-blocked. */
  get blockedByLoading(): boolean {
    return this.loading;
  }

  /** Read by the template so a mid-flight icon swap (save → loop) is honoured, not frozen at init. */
  get use_png_icon(): boolean {
    return this.png_icons.includes(this.currentIcon);
  }

  get currentText(): string {
    return this.loading && this.loadingText ? this.loadingText : this.text;
  }

  get currentIcon(): string {
    return this.loading && this.loadingIcon ? this.loadingIcon : this.icon;
  }

  get spinning(): boolean {
    return this.rotating || this.loading;
  }

  get blocked(): boolean {
    return this.disabled || this.loading;
  }

  generateColor() {
    switch (this.colorType) {
      case 'primary':
        return 'var(--pr-color-primary-300)';
      case 'danger':
        return 'var(--pr-color-red-300)';
      case 'secondary':
        return 'var(--pr-color-secondary-400)';
      case 'success':
        return 'var(--pr-color-green-500)';
      default:
        return '';
    }
  }

  onClick() {
    if (!this.blocked) this.clickEvent.emit();
  }
}

import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Renderer2,
  SimpleChanges,
  inject
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FocusTrap, FocusTrapFactory, LiveAnnouncer } from '@angular/cdk/a11y';

/** Module-level counter backing each instance's unique `aria-controls`/`aria-describedby` id. */
let nextTooltipId = 0;

/**
 * Lightweight app-wide tooltip (PrimeNG `pTooltip` replacement — 0 PrimeNG, no brain directives).
 *
 * Mounts a positioned tooltip on `document.body` on hover (so it is never clipped by an
 * ancestor's `overflow: hidden`) and removes it on leave/destroy. Content is rendered as
 * HTML (covers the old `[escape]="false"` usages). Mirrors the `pTooltip` options actually
 * used in the app: text, position, style class, disabled, show delay.
 *
 * Promoted from `custom-fields/pr-button` into `shared/directives` so any module can import
 * `PrTooltipDirectiveModule` and use `[prTooltip]`.
 *
 * P2-3323 Part 2 (`docs/specs/changes/tooltip-keyboard-accessibility/`): click (or `Enter`/`Space`
 * on the trigger) always opens and pins the tooltip — no more opt-in `prTooltipPinnable`, per
 * `TIP-DD-1`/`TIP-DD-5`. The directive self-upgrades any non-natively-interactive host to be
 * keyboard-focusable (`role="button"` + `tabindex="0"` + `keydown.enter`/`keydown.space`) and wires
 * a toggletip ARIA pattern (`aria-expanded` + `aria-controls` + `aria-describedby`, no
 * `role="tooltip"` — `TIP-DD-2`) so the pinned content (which may contain links) stays reachable
 * and announced. `Tab` moves focus into the tooltip via `@angular/cdk/a11y` `FocusTrap`; focus
 * restores to the trigger on close. `position()` clamps both horizontally (existing) and
 * vertically (`TIP-R-7`), and re-runs on `window` scroll/resize while pinned (`TIP-R-8`).
 *
 * The host upgrade is re-synced (`syncHostAffordance`) whenever `text`/`prTooltipDisabled` change
 * at runtime, not just once in `ngOnInit` — a host with no tooltip content (empty/disabled) is not
 * a trigger and must not carry a dead `role="button"` tab stop (rework attempt 2, review issue 2).
 * A host that already owns its own interactivity (native `<button>`/`<a>`, an Angular `RouterLink`,
 * or its own `role`/`tabindex`) is detected once in `ngOnInit` and permanently skipped by the
 * upgrade (review issue 1 — `dynamic-panel-menu`'s `<div [routerLink]>`).
 */
@Directive({
  selector: '[prTooltip]',
  standalone: false
})
export class PrTooltipDirective implements OnInit, OnChanges, OnDestroy {
  @Input('prTooltip') text: string = '';
  @Input() prTooltipPosition: 'right' | 'left' | 'top' | 'bottom' = 'top';
  @Input() prTooltipStyleClass: string = '';
  /** When true, the tooltip never shows (mirrors PrimeNG `tooltipDisabled`). */
  @Input() prTooltipDisabled: boolean = false;
  /** Delay in ms before the tooltip appears on hover (mirrors PrimeNG `showDelay`). */
  @Input() prTooltipShowDelay: number = 0;

  private readonly focusTrapFactory = inject(FocusTrapFactory);
  private readonly liveAnnouncer = inject(LiveAnnouncer);
  /**
   * Present only when the host itself declares `[routerLink]` (e.g. `dynamic-panel-menu`'s
   * `<div [routerLink]="option.path">`). Such a host already owns its own click/navigation
   * semantics — it must never receive this directive's `role`/`tabindex`/`keydown` upgrade
   * (review issue 1): upgrading it would announce the wrong role (nav target as "button") and
   * `Enter` would open the tooltip instead of navigating, since `RouterLink` binds the host
   * `click` and no synthesized click is dispatched by this directive's keydown handler.
   */
  private readonly routerLink = inject(RouterLink, { optional: true, self: true });

  /** Unique id for the toggletip pattern (`aria-controls`/`aria-describedby` — `TIP-DD-2`). */
  private readonly tooltipId = `pr-tooltip-${nextTooltipId++}`;

  private tooltipEl: HTMLElement | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private pinned = false;
  /** Teardown callbacks for the document/window listeners registered while pinned. */
  private pinnedListeners: (() => void)[] = [];
  private focusTrap: FocusTrap | null = null;
  private previouslyFocusedEl: HTMLElement | null = null;
  /** Guards `ngOnChanges` from re-syncing the host before `ngOnInit` has computed its flags. */
  private initialized = false;

  /**
   * Computed once in `ngOnInit`. `true` when the host is a native `<button>`/`<a>`, carries its
   * own `[routerLink]`, or already declares its own `role`/`tabindex`/`type="button|submit|reset"`
   * — i.e. it is already interactive/focusable and (per the audited call sites, `design.md`
   * §2.3/DD-3) already wires its own keyboard handling. Such hosts are left untouched forever: no
   * `role`/`tabindex` upgrade, and no directive-added `keydown.enter`/`keydown.space` handler
   * (adding one would double-fire alongside the native/author-provided handling — e.g. a native
   * `<button>` already synthesizes `click` from `Enter`/`Space`).
   */
  private hostIsNativelyInteractive = false;
  /** True when the host already owns `aria-expanded` for something unrelated to this tooltip. */
  private hostOwnsAriaExpanded = false;
  /** True when the host already owns `aria-controls` for something unrelated to this tooltip. */
  private hostOwnsAriaControls = false;
  /** True when the host already owns `aria-describedby` for something unrelated to this tooltip. */
  private hostOwnsAriaDescribedby = false;
  /**
   * Tracks whether THIS directive is the one that added `role`/`tabindex`/`aria-expanded` to the
   * host, so `syncHostAffordance` only ever removes attributes it added itself — never a
   * `role`/`tabindex` the template author set deliberately (review issue 2).
   */
  private didUpgradeHost = false;

  constructor(
    private readonly host: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2
  ) {}

  ngOnInit(): void {
    const el = this.host.nativeElement;
    const tag = el.tagName;
    const type = el.getAttribute('type');

    this.hostIsNativelyInteractive =
      tag === 'BUTTON' ||
      tag === 'A' ||
      !!this.routerLink ||
      el.hasAttribute('role') ||
      el.hasAttribute('tabindex') ||
      (!!type && ['button', 'submit', 'reset'].includes(type));
    this.hostOwnsAriaExpanded = el.hasAttribute('aria-expanded');
    this.hostOwnsAriaControls = el.hasAttribute('aria-controls');
    this.hostOwnsAriaDescribedby = el.hasAttribute('aria-describedby');

    this.syncHostAffordance();
    this.initialized = true;
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Runs once before ngOnInit for the first binding pass — skip until ngOnInit has computed
    // hostIsNativelyInteractive/hostOwnsAria* (review issue 2: re-sync on every runtime flip of
    // the inputs that drive eligibility, not just on the initial one-shot decision).
    if (!this.initialized) return;
    if (changes['text'] || changes['prTooltipDisabled']) {
      this.syncHostAffordance();
    }
  }

  /**
   * Adds or removes this directive's `role="button"` + `tabindex="0"` + `aria-expanded="false"`
   * upgrade depending on whether the host is currently a valid trigger: not natively interactive,
   * not disabled, and has non-empty text. Called from `ngOnInit` and again whenever `text` /
   * `prTooltipDisabled` change, so a host bound to `[prTooltipDisabled]="!center.from_cgspace"` or
   * `[prTooltip]="cond ? '' : label"` never keeps a dead, permanently-upgraded tab stop (review
   * issue 2 — `rd-partners`/`rd-contributors-and-partners`/`ipsr-contributors` chip rows, and the
   * 7 sites binding `''` in one ternary branch, e.g. `dynamic-panel-menu`).
   */
  private syncHostAffordance(): void {
    const el = this.host.nativeElement;
    const shouldUpgrade = !this.hostIsNativelyInteractive && !this.prTooltipDisabled && !!this.text;

    if (shouldUpgrade && !this.didUpgradeHost) {
      this.renderer.setAttribute(el, 'role', 'button');
      this.renderer.setAttribute(el, 'tabindex', '0');
      if (!this.hostOwnsAriaExpanded) this.renderer.setAttribute(el, 'aria-expanded', 'false');
      this.didUpgradeHost = true;
    } else if (!shouldUpgrade && this.didUpgradeHost) {
      // Close FIRST, while still upgraded — `hide()` sets `aria-expanded="false"` on its way out,
      // which would otherwise get re-added right after this block strips the attribute below.
      // Becoming ineligible (now disabled, or text went empty) while pinned open must close it —
      // a host that just lost its focusable trigger affordance can't stay pinned.
      if (this.pinned) this.hide();
      this.renderer.removeAttribute(el, 'role');
      this.renderer.removeAttribute(el, 'tabindex');
      if (!this.hostOwnsAriaExpanded) this.renderer.removeAttribute(el, 'aria-expanded');
      this.didUpgradeHost = false;
    }
  }

  @HostListener('mouseenter')
  onEnter(): void {
    if (this.prTooltipDisabled || !this.text || this.pinned) return;
    if (this.prTooltipShowDelay > 0) {
      this.clearTimer();
      this.showTimer = setTimeout(() => this.show(), this.prTooltipShowDelay);
    } else {
      this.show();
    }
  }

  @HostListener('mouseleave')
  onLeave(): void {
    // A pinned tooltip survives the pointer leaving — that is the point of pinning.
    if (this.pinned) return;
    this.hide();
  }

  @HostListener('click')
  onClick(): void {
    // Unconditional pin-on-click (TIP-DD-1/TIP-DD-5) — including on hosts whose own `(click)`
    // action also fires: Angular allows multiple listeners on one native `click` event, so the
    // host's own handler still runs exactly once, alongside this one.
    this.activate();
  }

  @HostListener('keydown.enter', ['$event'])
  onKeydownEnter(event: Event): void {
    // Native <button>/<a>/[routerLink] hosts already synthesize (or own) `click` from Enter —
    // adding this handler there would double-fire open→close in the same keypress (TIP-AC-4's
    // negative constraint), or hijack Enter away from navigation (review issue 1).
    if (this.hostIsNativelyInteractive) return;
    // Nothing to show (disabled / empty text) — don't swallow the keypress on a host that has no
    // other reason to be focusable (review issue 2).
    if (this.prTooltipDisabled || !this.text) return;
    event.preventDefault();
    this.activate();
  }

  @HostListener('keydown.space', ['$event'])
  onKeydownSpace(event: Event): void {
    if (this.hostIsNativelyInteractive) return;
    if (this.prTooltipDisabled || !this.text) return;
    // Stop the page from scrolling on Space, mirroring native <button> behavior.
    event.preventDefault();
    this.activate();
  }

  /** Click (or Enter/Space on an upgraded host) toggles the pin — the single unified open path. */
  private activate(): void {
    if (this.pinned) {
      this.hide();
      return;
    }
    this.clearTimer();
    this.show();
    // Only pin if the tooltip actually rendered (disabled / empty text short-circuit `show`).
    if (this.tooltipEl) this.pin();
  }

  private show(): void {
    if (this.tooltipEl || this.prTooltipDisabled || !this.text) return;

    const el = this.renderer.createElement('div') as HTMLElement;
    this.renderer.addClass(el, 'pr-tooltip');
    if (this.prTooltipStyleClass) {
      this.prTooltipStyleClass.split(' ').forEach(cls => cls && this.renderer.addClass(el, cls));
    }
    this.renderer.setProperty(el, 'innerHTML', this.text);
    // Toggletip id (TIP-DD-2) — set here so it exists before pin() wires aria-controls/describedby.
    this.renderer.setAttribute(el, 'id', this.tooltipId);
    this.renderer.appendChild(document.body, el);
    this.tooltipEl = el;

    this.position(el);
  }

  private position(el: HTMLElement): void {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const tip = el.getBoundingClientRect();
    const gap = 8;
    let top = 0;
    let left = 0;

    switch (this.prTooltipPosition) {
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tip.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tip.height / 2;
        left = rect.left - tip.width - gap;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tip.height / 2;
        left = rect.right + gap;
        break;
      case 'top':
      default:
        top = rect.top - tip.height - gap;
        left = rect.left + rect.width / 2 - tip.width / 2;
        break;
    }

    // Keep inside the viewport horizontally (existing behavior).
    left = Math.max(gap, Math.min(left, window.innerWidth - tip.width - gap));
    // Keep inside the viewport vertically (TIP-R-7 — mirrors the horizontal clamp, TIP-DD-4).
    top = Math.max(gap, Math.min(top, window.innerHeight - tip.height - gap));

    this.renderer.setStyle(el, 'top', `${top + window.scrollY}px`);
    this.renderer.setStyle(el, 'left', `${left + window.scrollX}px`);
  }

  /**
   * Keeps the tooltip open and starts listening for the dismiss gestures and reposition triggers.
   * Clicks landing inside the tooltip (its links) or back on the trigger are ignored — the
   * trigger's own `click` handler already toggles it.
   */
  private pin(): void {
    this.pinned = true;
    // `.pr-tooltip` sets `pointer-events: none` so a hover tooltip never blocks the cursor.
    // A pinned one must accept the pointer, otherwise its own links are unreachable — which
    // is the whole reason pinning exists.
    if (this.tooltipEl) this.renderer.addClass(this.tooltipEl, 'pr-tooltip--pinned');

    const host = this.host.nativeElement;
    // Toggletip wiring (TIP-DD-2/TIP-R-6) — skip aria-expanded/aria-controls/aria-describedby only
    // where the host already owns that attribute for something unrelated to this tooltip
    // (design.md DD-3).
    if (!this.hostOwnsAriaExpanded) this.renderer.setAttribute(host, 'aria-expanded', 'true');
    if (!this.hostOwnsAriaControls) this.renderer.setAttribute(host, 'aria-controls', this.tooltipId);
    if (!this.hostOwnsAriaDescribedby) this.renderer.setAttribute(host, 'aria-describedby', this.tooltipId);

    this.previouslyFocusedEl = document.activeElement as HTMLElement | null;

    if (this.tooltipEl) {
      // Only stand up a focus trap when there is something tabbable to trap focus around — a
      // plain-text tooltip would otherwise get empty CDK anchor sentinels inserted for nothing.
      const hasTabbableContent = !!this.tooltipEl.querySelector('a,button,[tabindex]');
      if (hasTabbableContent) {
        this.focusTrap = this.focusTrapFactory.create(this.tooltipEl);
        this.focusTrap.focusFirstTabbableElement();
      }
    }

    // SHOULD (TIP-R-20) — best-effort; announce the rendered TEXT, not the raw HTML string that
    // `this.text` actually is (review issue 4 — `this.text` is injected via `innerHTML` and often
    // contains anchors, so announcing it verbatim reads literal markup to a screen reader). Not
    // gated further since a manual pass records any double-announcement conflict with focus-trap
    // timing per tasks.md TIP-T-1 item 8.
    const announceText = this.tooltipEl?.textContent?.trim() ?? '';
    if (announceText) this.liveAnnouncer.announce(announceText);

    const onDocumentClick = (event: Event): void => {
      const target = event.target as Node | null;
      if (!target) return;
      if (this.tooltipEl?.contains(target)) return;
      if (this.host.nativeElement.contains(target)) return;
      this.hide();
    };
    const onDocumentKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') this.hide();
    };
    const onWindowScrollOrResize = (): void => {
      if (this.tooltipEl) this.position(this.tooltipEl);
    };

    // Renderer2.listen has no capture-phase option, and reposition-on-scroll needs the capture
    // phase to observe scrolling inside ancestor-scrollable containers (tables, the review
    // drawer, dashboard panels) — register these two directly and tear them down the same way.
    window.addEventListener('scroll', onWindowScrollOrResize, true);
    window.addEventListener('resize', onWindowScrollOrResize);

    this.pinnedListeners.push(
      this.renderer.listen('document', 'click', onDocumentClick),
      this.renderer.listen('document', 'keydown', onDocumentKeydown),
      () => window.removeEventListener('scroll', onWindowScrollOrResize, true),
      () => window.removeEventListener('resize', onWindowScrollOrResize)
    );
  }

  private clearPinnedListeners(): void {
    this.pinnedListeners.forEach(unlisten => unlisten());
    this.pinnedListeners = [];
    this.pinned = false;
  }

  private clearTimer(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }

  private hide(): void {
    this.clearTimer();

    // Snapshot BEFORE tearing anything down: on an outside click the browser has already moved
    // focus to whatever the user clicked (this listener is bubble-phase), so `document.activeElement`
    // reflects the user's real target. Only restore focus when it is still logically "inside" this
    // widget (Escape, or re-click-while-pinned) — an outside click's own focus target must be left
    // alone (review issue 3: restoring unconditionally here steals focus from the field the user
    // just clicked into, right after dismissing the ⓘ tooltip next to it).
    const activeEl = document.activeElement as HTMLElement | null;
    const focusIsInWidget =
      !!activeEl && (!!this.tooltipEl?.contains(activeEl) || this.host.nativeElement.contains(activeEl));

    if (this.focusTrap) {
      this.focusTrap.destroy();
      this.focusTrap = null;
    }

    const host = this.host.nativeElement;
    if (!this.hostOwnsAriaExpanded) this.renderer.setAttribute(host, 'aria-expanded', 'false');
    if (!this.hostOwnsAriaControls) this.renderer.removeAttribute(host, 'aria-controls');
    if (!this.hostOwnsAriaDescribedby) this.renderer.removeAttribute(host, 'aria-describedby');

    this.clearPinnedListeners();

    const restoreTo = this.previouslyFocusedEl;
    this.previouslyFocusedEl = null;
    if (focusIsInWidget && restoreTo?.isConnected) restoreTo.focus();

    if (this.tooltipEl) {
      // Guard: the node may already have been detached from outside (route change, a parent
      // wiping innerHTML). `removeChild` on an orphan throws NotFoundError.
      if (this.tooltipEl.parentNode) this.renderer.removeChild(this.tooltipEl.parentNode, this.tooltipEl);
      this.tooltipEl = null;
    }
  }

  ngOnDestroy(): void {
    this.hide();
  }
}

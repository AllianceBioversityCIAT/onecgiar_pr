import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { PrTooltipDirective } from './pr-tooltip.directive';
import { PrTooltipDirectiveModule } from './pr-tooltip-directive.module';

/**
 * P2-3323 Part 2 (`docs/specs/changes/tooltip-keyboard-accessibility/`): retargeted off the dead
 * `.pr_label_tooltip` selector (`TIP-R-21`) and off the removed `prTooltipPinnable` opt-in
 * (`TIP-DD-5`) — pinning is unconditional now, so every test below mounts the directive through a
 * real Angular injection context (`TestBed.createComponent`) instead of the old bare
 * `new PrTooltipDirective(...)` constructor call, which cannot satisfy the directive's `inject()`
 * calls (`FocusTrapFactory`, `LiveAnnouncer`, `RouterLink`).
 *
 * IMPORTANT — coverage boundary (design.md §10 / TIP-AC-6's negative constraint): the
 * `aria-expanded`/`aria-controls`/`aria-describedby` assertions below prove attribute *presence*
 * only. They do NOT certify that a real screen reader announces the relationship or the content
 * correctly — that gap has no automated check in this repo and is closed by `TIP-T-6`'s manual
 * screen-reader pass, not by this file. Likewise, real Tab-order/focus-movement-into-content and
 * vertical-clamp-under-real-layout coverage lives in `TIP-T-4`'s Cypress component tests (jsdom has
 * no real focus/tab-order semantics or layout engine) — this file only proves the clamp *formula*
 * with a synthetic oversized-tooltip fixture, not real-browser layout.
 */

function tooltipEl(): HTMLElement | null {
  return document.body.querySelector('.pr-tooltip');
}

function getEl(fx: ComponentFixture<unknown>, id: string): HTMLElement {
  return fx.debugElement.query(By.css('#' + id)).nativeElement;
}

function setRect(el: HTMLElement, rect: Partial<DOMRect> = {}): void {
  const full = {
    top: 100,
    left: 100,
    right: 200,
    bottom: 140,
    width: 100,
    height: 40,
    x: 100,
    y: 100,
    toJSON: () => ({}),
    ...rect
  };
  el.getBoundingClientRect = () => full as DOMRect;
}

function click(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function hoverIn(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('mouseenter'));
}

function hoverOut(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('mouseleave'));
}

function keydown(el: HTMLElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event;
}

@Component({
  template: `
    <div id="bareTrigger" [prTooltip]="'x'"></div>
    <button id="nativeBtn" [prTooltip]="btnText()">Native trigger</button>
    <div
      id="divTrigger"
      [prTooltip]="divText()"
      [prTooltipDisabled]="divDisabled()"
      [prTooltipPosition]="divPosition()"
      [prTooltipStyleClass]="divStyleClass()"
      [prTooltipShowDelay]="divShowDelay()">
      Div trigger
    </div>
    <div id="preRoled" role="menuitem" tabindex="-1" [prTooltip]="preRoledText()">Pre-roled trigger</div>
  `,
  standalone: false
})
class HostComponent {
  readonly btnText = signal('Hello');
  readonly divText = signal('Hello');
  readonly divDisabled = signal(false);
  readonly divPosition = signal<PrTooltipDirective['prTooltipPosition']>('top');
  readonly divStyleClass = signal('');
  readonly divShowDelay = signal(0);
  readonly preRoledText = signal('Guidance');
}

@Component({
  // A `<div [routerLink]>` (NOT `<a [routerLink]>`) — the real regression this guards
  // (TIP-DD-3, review issue 1) was `dynamic-panel-menu`'s `<div [routerLink]="option.path">`, a
  // non-anchor host. On an `<a>` host, `tag === 'A'` alone already short-circuits
  // `hostIsNativelyInteractive` before `!!this.routerLink` is ever reached, so an `<a>` fixture
  // cannot isolate what this block claims to test. `plainDivHost` is an otherwise-identical
  // control with no RouterLink, used below as the falsifiable cross-check.
  //
  // `routerLinkValue` is bound to `null`, deliberately — verified against `@angular/router`'s
  // source (`_router_module-chunk.mjs`, `RouterLink.set routerLink`): a non-null value makes
  // `RouterLink` itself call `setTabIndexIfNotOnNativeEl('0')`, i.e. RouterLink writes its OWN
  // `tabindex="0"` onto a non-anchor host, independently of anything `PrTooltipDirective` does —
  // confirmed empirically (temporarily deleting `!!this.routerLink` from the directive and
  // rerunning left this suite fully green, because `el.hasAttribute('tabindex')` was already
  // `true` from RouterLink's own side effect regardless). With `null`, RouterLink's setter takes
  // its `commandsOrUrlTree == null` branch and never touches `tabindex`, while the `RouterLink`
  // directive INSTANCE still exists on the host (Angular matches `[routerLink]` by the attribute
  // being present in the template, not by its bound value) — so `!!this.routerLink` inside
  // `PrTooltipDirective` is still `true`, but nothing else on the host is. This is what actually
  // isolates the property: see the falsifiability check on the test below.
  template: `
    <div id="routerHost" [routerLink]="routerLinkValue()" [prTooltip]="text()">Nav trigger</div>
    <div id="plainDivHost" [prTooltip]="text()">Plain trigger</div>
  `,
  standalone: false
})
class RouterHostComponent {
  readonly text = signal('Hello');
  readonly routerLinkValue = signal<string[] | null>(null);
}

describe('PrTooltipDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    jest.useRealTimers();
    await TestBed.configureTestingModule({
      declarations: [HostComponent],
      imports: [PrTooltipDirectiveModule]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();

    setRect(getEl(fixture, 'nativeBtn'));
    setRect(getEl(fixture, 'divTrigger'));
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is created with the documented defaults, and prTooltipPinnable no longer exists (TIP-DD-5)', () => {
    const directive = fixture.debugElement.query(By.css('#bareTrigger')).injector.get(PrTooltipDirective);
    expect(directive.prTooltipPosition).toBe('top');
    expect(directive.prTooltipStyleClass).toBe('');
    expect(directive.prTooltipDisabled).toBe(false);
    expect(directive.prTooltipShowDelay).toBe(0);
    expect('prTooltipPinnable' in directive).toBe(false);
  });

  describe('hover (unchanged by this spec — not opt-in anymore, but still available pre-pin)', () => {
    it('shows immediately when there is no delay', () => {
      hoverIn(getEl(fixture, 'divTrigger'));
      expect(tooltipEl()).not.toBeNull();
      expect(tooltipEl()!.innerHTML).toBe('Hello');
    });

    it('does nothing when disabled', () => {
      host.divDisabled.set(true);
      fixture.detectChanges();
      hoverIn(getEl(fixture, 'divTrigger'));
      expect(tooltipEl()).toBeNull();
    });

    it('does nothing when the text is empty', () => {
      host.divText.set('');
      fixture.detectChanges();
      hoverIn(getEl(fixture, 'divTrigger'));
      expect(tooltipEl()).toBeNull();
    });

    it('defers the tooltip when a show delay is configured', () => {
      jest.useFakeTimers();
      host.divShowDelay.set(300);
      fixture.detectChanges();
      hoverIn(getEl(fixture, 'divTrigger'));
      expect(tooltipEl()).toBeNull();
      jest.advanceTimersByTime(300);
      expect(tooltipEl()).not.toBeNull();
      jest.useRealTimers();
    });

    it('removes the tooltip on mouse leave (not yet pinned)', () => {
      const div = getEl(fixture, 'divTrigger');
      hoverIn(div);
      hoverOut(div);
      expect(tooltipEl()).toBeNull();
    });

    it('does not create a second tooltip when already shown', () => {
      const div = getEl(fixture, 'divTrigger');
      hoverIn(div);
      hoverIn(div);
      expect(document.body.querySelectorAll('.pr-tooltip')).toHaveLength(1);
    });
  });

  describe('style classes', () => {
    it('applies every non-empty extra class', () => {
      host.divStyleClass.set('wide  danger');
      fixture.detectChanges();
      hoverIn(getEl(fixture, 'divTrigger'));
      const el = tooltipEl()!;
      expect(el.classList.contains('wide')).toBe(true);
      expect(el.classList.contains('danger')).toBe(true);
    });

    it('renders the text as HTML', () => {
      host.divText.set('<b>bold</b>');
      fixture.detectChanges();
      hoverIn(getEl(fixture, 'divTrigger'));
      expect(tooltipEl()!.innerHTML).toBe('<b>bold</b>');
    });
  });

  describe('position', () => {
    it('positions below the trigger for the bottom position', () => {
      const div = getEl(fixture, 'divTrigger');
      setRect(div, { top: 100, left: 100, right: 200, bottom: 140, width: 100, height: 40 });
      host.divPosition.set('bottom');
      fixture.detectChanges();
      hoverIn(div);
      // rect.bottom (140) + gap (8)
      expect(tooltipEl()!.style.top).toBe('148px');
    });

    it('falls back to the top branch for an unknown position', () => {
      host.divPosition.set('diagonal' as PrTooltipDirective['prTooltipPosition']);
      fixture.detectChanges();
      hoverIn(getEl(fixture, 'divTrigger'));
      // rect.top (100) - tip.height (0) - gap (8)
      expect(tooltipEl()!.style.top).toBe('92px');
    });

    it('clamps the tooltip to the left edge of the viewport', () => {
      const div = getEl(fixture, 'divTrigger');
      setRect(div, { left: -500, right: -400, top: 10, bottom: 40, width: 100, height: 30 });
      host.divPosition.set('left');
      fixture.detectChanges();
      hoverIn(div);
      expect(tooltipEl()!.style.left).toBe('8px');
    });

    it('clamps the tooltip to the right edge of the viewport', () => {
      const div = getEl(fixture, 'divTrigger');
      setRect(div, { left: 99999, right: 100099, top: 10, bottom: 40, width: 100, height: 30 });
      host.divPosition.set('right');
      fixture.detectChanges();
      hoverIn(div);
      expect(tooltipEl()!.style.left).toBe(`${window.innerWidth - 8}px`);
    });
  });

  describe('vertical clamp (TIP-R-7 / TIP-AC-7) — fixture is deliberately taller than the available space', () => {
    let getBoundingClientRectSpy: jest.SpyInstance;

    afterEach(() => {
      getBoundingClientRectSpy?.mockRestore();
    });

    it('clamps a tooltip taller than the available space above the trigger to the gap floor', () => {
      const original = HTMLElement.prototype.getBoundingClientRect;
      // A fixture whose tooltip already fits could not exercise the clamp (design.md §10's named
      // disqualifier) — this one is deliberately far taller than the viewport space above the trigger.
      getBoundingClientRectSpy = jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
        function (this: HTMLElement) {
          if (this.classList.contains('pr-tooltip')) {
            return { top: 0, left: 0, right: 0, bottom: 0, width: 200, height: 600, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
          }
          return original.call(this);
        }
      );

      const div = getEl(fixture, 'divTrigger');
      setRect(div, { top: 20, left: 100, right: 200, bottom: 60, width: 100, height: 40 });
      host.divPosition.set('top');
      fixture.detectChanges();

      click(div);

      expect(tooltipEl()!.style.top).toBe('8px');
    });
  });

  describe('click opens and pins unconditionally (TIP-AC-1, TIP-DD-1/DD-5 — no prTooltipPinnable opt-in anymore)', () => {
    it('opens on click and survives the pointer leaving', () => {
      const btn = getEl(fixture, 'nativeBtn');
      click(btn);
      hoverOut(btn);
      expect(tooltipEl()).not.toBeNull();
    });

    it('marks the tooltip as pinned so it can accept the pointer', () => {
      const btn = getEl(fixture, 'nativeBtn');
      click(btn);
      expect(tooltipEl()!.classList.contains('pr-tooltip--pinned')).toBe(true);
    });

    it('opens on a bare click with no prior hover', () => {
      const btn = getEl(fixture, 'nativeBtn');
      click(btn);
      expect(tooltipEl()).not.toBeNull();
    });

    it('unpins on a second click', () => {
      const btn = getEl(fixture, 'nativeBtn');
      click(btn);
      click(btn);
      expect(tooltipEl()).toBeNull();
    });

    it('ignores hover while pinned so no second tooltip is created', () => {
      const btn = getEl(fixture, 'nativeBtn');
      click(btn);
      hoverIn(btn);
      expect(document.body.querySelectorAll('.pr-tooltip')).toHaveLength(1);
    });

    it('does not pin when the tooltip never rendered (disabled trigger)', () => {
      host.divDisabled.set(true);
      fixture.detectChanges();
      const div = getEl(fixture, 'divTrigger');
      click(div);
      expect(tooltipEl()).toBeNull();
    });

    it('cleans up a pinned tooltip on destroy', () => {
      const btn = getEl(fixture, 'nativeBtn');
      click(btn);
      fixture.destroy();
      expect(tooltipEl()).toBeNull();
    });
  });

  describe('outside-click / inside-click / Escape (TIP-AC-2, TIP-AC-3, and negative constraints)', () => {
    it('closes on a click outside both the tooltip and the trigger', () => {
      const btn = getEl(fixture, 'nativeBtn');
      click(btn);
      const outside = document.createElement('div');
      document.body.appendChild(outside);
      click(outside);
      expect(tooltipEl()).toBeNull();
    });

    it('does NOT close when the click lands inside the tooltip content, e.g. on a link', () => {
      host.btnText.set('<a href="#">Glossary</a>');
      fixture.detectChanges();
      const btn = getEl(fixture, 'nativeBtn');
      click(btn);
      const link = tooltipEl()!.querySelector('a')!;
      click(link as HTMLElement);
      expect(tooltipEl()).not.toBeNull();
    });

    it('closes on Escape', () => {
      const btn = getEl(fixture, 'nativeBtn');
      click(btn);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(tooltipEl()).toBeNull();
    });

    it('ignores other keys', () => {
      const btn = getEl(fixture, 'nativeBtn');
      click(btn);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(tooltipEl()).not.toBeNull();
    });

    it('stops listening once dismissed, so a later Escape cannot throw', () => {
      const btn = getEl(fixture, 'nativeBtn');
      click(btn);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))).not.toThrow();
    });

    it('Escape closes AND restores focus to the trigger (TIP-AC-3, TIP-R-5 — attempt-2 rework)', () => {
      // Falsifiability requires focus to genuinely LEAVE the trigger before Escape fires — a
      // plain-text tooltip has nothing tabbable, so pin()'s focus-trap gate never engages and
      // nothing else would move focus, making the old version of this test pass trivially even
      // with the restore block deleted. Give the tooltip a real focusable element instead.
      host.btnText.set('<a href="#">Glossary</a>');
      fixture.detectChanges();
      const btn = getEl(fixture, 'nativeBtn') as HTMLButtonElement;
      document.body.appendChild(fixture.nativeElement);
      btn.focus();
      click(btn);

      // Move focus onto the tooltip's own link DIRECTLY — do NOT rely on CDK's
      // `FocusTrap.focusFirstTabbableElement()` to do this for us. CDK's `InteractivityChecker`
      // gates on `offsetParent`/`getClientRects()`, which jsdom never populates for elements
      // appended to `document.body` outside a real layout pass, so the trap can silently fail to
      // move focus here and give a false pass for the wrong reason (focus never having left `btn`
      // at all, same defect as the version this replaces).
      const link = tooltipEl()!.querySelector('a')!;
      (link as HTMLElement).focus();
      expect(document.activeElement).toBe(link); // confirm focus really left the trigger first

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(tooltipEl()).toBeNull();
      // Falsifiable: the link (and the tooltip it lived in) is now removed from the DOM. If the
      // restore-focus block in hide() were deleted, activeElement would fall back to
      // document.body, not btn — this assertion genuinely depends on that block running.
      expect(document.activeElement).toBe(btn);
    });

    it('regression (review issue 3): an outside click does NOT steal focus back to the trigger', () => {
      const btn = getEl(fixture, 'nativeBtn') as HTMLButtonElement;
      document.body.appendChild(fixture.nativeElement);
      btn.focus();
      click(btn);

      const input = document.createElement('input');
      document.body.appendChild(input);
      // The browser has already moved focus to the user's real click target before the bubble-phase
      // document click listener runs — simulate that ordering explicitly.
      input.focus();
      click(input);

      expect(tooltipEl()).toBeNull();
      expect(document.activeElement).toBe(input);
    });
  });

  describe('keyboard activation (TIP-AC-4)', () => {
    it('opens on Enter for a non-native (upgraded) host', () => {
      keydown(getEl(fixture, 'divTrigger'), 'Enter');
      expect(tooltipEl()).not.toBeNull();
    });

    it('opens on Space for a non-native (upgraded) host', () => {
      keydown(getEl(fixture, 'divTrigger'), ' ');
      expect(tooltipEl()).not.toBeNull();
    });

    it('does not double-fire on a native <button> host: Enter is ignored by the directive, only the (simulated) resulting click opens it', () => {
      const btn = getEl(fixture, 'nativeBtn');
      keydown(btn, 'Enter'); // the directive's own keydown handler must ignore this on a native button
      expect(tooltipEl()).toBeNull();

      click(btn); // the browser's own Enter-synthesized click, simulated explicitly
      expect(document.body.querySelectorAll('.pr-tooltip')).toHaveLength(1);
    });

    it('does not swallow the keypress on an ineligible host (disabled) — early-returns before preventDefault (TIP-T-1 attempt-2 fix)', () => {
      host.divDisabled.set(true);
      fixture.detectChanges();
      const ev = keydown(getEl(fixture, 'divTrigger'), 'Enter');
      expect(tooltipEl()).toBeNull();
      expect(ev.defaultPrevented).toBe(false);
    });
  });

  describe('RouterLink-host detection (TIP-DD-3, review issue 1)', () => {
    let routerFixture: ComponentFixture<RouterHostComponent>;

    beforeEach(async () => {
      // The outer describe's beforeEach already instantiated a TestBed (for HostComponent) — reset
      // before configuring a fresh module for this router-link fixture.
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        declarations: [RouterHostComponent],
        imports: [PrTooltipDirectiveModule, RouterTestingModule.withRoutes([])]
      }).compileComponents();
      routerFixture = TestBed.createComponent(RouterHostComponent);
      routerFixture.detectChanges();
    });

    // `routerLinkValue` is bound to `null` on this fixture specifically so RouterLink's OWN
    // `setTabIndexIfNotOnNativeEl('0')` side effect (see the `RouterHostComponent` doc comment
    // above) never fires — a non-null `[routerLink]` value would make RouterLink itself write
    // `tabindex="0"` independently of `PrTooltipDirective`, which would make BOTH assertions below
    // pass even with `!!this.routerLink` deleted from the directive (confirmed empirically:
    // deleting that term with a non-null `[routerLink]="['/foo']"` binding left this whole suite
    // green, since `el.hasAttribute('tabindex')` was already `true` from RouterLink's own effect).
    // With `null`, neither attribute is written by anything else, so both genuinely isolate the
    // directive's own `!!this.routerLink` skip.
    it('is treated as natively interactive: gets no role/tabindex upgrade', () => {
      const div = getEl(routerFixture, 'routerHost');
      expect(div.hasAttribute('role')).toBe(false);
      expect(div.hasAttribute('tabindex')).toBe(false);
    });

    // The falsifiable cross-check: an otherwise-identical div with NO RouterLink, same tooltip
    // text, in the same fixture, DOES get the upgrade. This is what actually proves the skip above
    // is caused by RouterLink detection specifically, not by some other host quirk.
    it('cross-check: an otherwise-identical div WITHOUT RouterLink DOES get the role upgrade', () => {
      const plainDiv = getEl(routerFixture, 'plainDivHost');
      expect(plainDiv.getAttribute('role')).toBe('button');
    });

    it('does not open the tooltip from a synthetic Enter keydown — no directive-added keydown handler on this host', () => {
      keydown(getEl(routerFixture, 'routerHost'), 'Enter');
      expect(tooltipEl()).toBeNull();
    });

    it('still pins on a real click, like every other trigger', () => {
      click(getEl(routerFixture, 'routerHost'));
      expect(tooltipEl()).not.toBeNull();
    });
  });

  describe('syncHostAffordance runtime re-sync (review issue 2)', () => {
    it('removes the upgrade and closes a pinned tooltip when the text goes empty at runtime', () => {
      const div = getEl(fixture, 'divTrigger');
      expect(div.getAttribute('role')).toBe('button');
      expect(div.getAttribute('tabindex')).toBe('0');

      click(div);
      expect(tooltipEl()).not.toBeNull();

      host.divText.set('');
      fixture.detectChanges();

      expect(tooltipEl()).toBeNull(); // a host that just lost its trigger affordance can't stay pinned
      expect(div.hasAttribute('role')).toBe(false);
      expect(div.hasAttribute('tabindex')).toBe(false);
    });

    it('removes the upgrade when prTooltipDisabled flips true at runtime', () => {
      const div = getEl(fixture, 'divTrigger');
      host.divDisabled.set(true);
      fixture.detectChanges();
      expect(div.hasAttribute('role')).toBe(false);
      expect(div.hasAttribute('tabindex')).toBe(false);
    });

    it('restores the upgrade when the text becomes valid again', () => {
      const div = getEl(fixture, 'divTrigger');
      host.divText.set('');
      fixture.detectChanges();
      expect(div.hasAttribute('role')).toBe(false);

      host.divText.set('Back again');
      fixture.detectChanges();
      expect(div.getAttribute('role')).toBe('button');
      expect(div.getAttribute('tabindex')).toBe('0');
    });

    // NOTE: despite the "guard" phrasing this proves a real and valuable thing — an
    // author-declared role/tabindex is never touched — but via the `hostIsNativelyInteractive`
    // SKIP path (preRoled already has `role`/`tabindex`, so it's flagged natively-interactive in
    // ngOnInit and syncHostAffordance's upgrade branch never runs for it at all). It does NOT
    // exercise the `didUpgradeHost` REMOVAL branch — that branch is proven separately by
    // 'restores the upgrade when the text becomes valid again' above (divTrigger: upgraded →
    // disabled/emptied → re-enabled), which is the guard's own add/remove/re-add cycle.
    it('never touches a role/tabindex the template author declared (hostIsNativelyInteractive skip path, not the didUpgradeHost removal path)', () => {
      const preRoled = getEl(fixture, 'preRoled');
      expect(preRoled.getAttribute('role')).toBe('menuitem');
      expect(preRoled.getAttribute('tabindex')).toBe('-1');

      host.preRoledText.set('');
      fixture.detectChanges();
      host.preRoledText.set('back');
      fixture.detectChanges();

      expect(preRoled.getAttribute('role')).toBe('menuitem');
      expect(preRoled.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('ARIA presence (TIP-AC-6 — presence only, does NOT certify screen-reader correctness; see file header and TIP-T-6)', () => {
    it('wires aria-expanded/aria-controls/aria-describedby on pin and tears down aria-controls/describedby (but keeps aria-expanded="false") on hide', () => {
      const btn = getEl(fixture, 'nativeBtn');
      click(btn);
      const tip = tooltipEl()!;
      expect(btn.getAttribute('aria-expanded')).toBe('true');
      expect(btn.getAttribute('aria-controls')).toBe(tip.id);
      expect(btn.getAttribute('aria-describedby')).toBe(tip.id);

      click(btn); // hide
      expect(btn.getAttribute('aria-expanded')).toBe('false');
      expect(btn.hasAttribute('aria-controls')).toBe(false);
      expect(btn.hasAttribute('aria-describedby')).toBe(false);
    });
  });

  describe('listener teardown', () => {
    it('adds window scroll (capture) + resize listeners on pin and removes them on hide()', () => {
      const addSpy = jest.spyOn(window, 'addEventListener');
      const removeSpy = jest.spyOn(window, 'removeEventListener');
      const btn = getEl(fixture, 'nativeBtn');

      click(btn); // pin
      expect(addSpy.mock.calls.filter(c => c[0] === 'scroll')).toHaveLength(1);
      expect(addSpy.mock.calls.filter(c => c[0] === 'resize')).toHaveLength(1);
      // The scroll listener MUST be capture-phase (`true`) so it observes scrolling inside
      // ancestor-scrollable containers (tables, the review drawer, dashboard panels) — a
      // bubble-phase listener would miss those. The test title already claimed this; now it's
      // actually checked.
      expect(addSpy.mock.calls.find(c => c[0] === 'scroll')![2]).toBe(true);

      click(btn); // hide
      expect(removeSpy.mock.calls.filter(c => c[0] === 'scroll')).toHaveLength(1);
      expect(removeSpy.mock.calls.filter(c => c[0] === 'resize')).toHaveLength(1);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it('recomputes position on a scroll event while pinned (TIP-R-8) — proves the listener actually repositions, not just that it is registered', () => {
      const div = getEl(fixture, 'divTrigger');
      setRect(div, { top: 100, left: 100, right: 200, bottom: 140, width: 100, height: 40 });
      click(div); // pin
      const topBefore = tooltipEl()!.style.top;

      setRect(div, { top: 300, left: 100, right: 200, bottom: 340, width: 100, height: 40 });
      window.dispatchEvent(new Event('scroll'));

      expect(tooltipEl()!.style.top).not.toBe(topBefore);
    });

    it('does not reposition (or throw) on a scroll dispatched after hide()', () => {
      const div = getEl(fixture, 'divTrigger');
      setRect(div, { top: 300, left: 100, right: 200, bottom: 340, width: 100, height: 40 });
      click(div);
      click(div); // hide
      expect(tooltipEl()).toBeNull();
      expect(() => window.dispatchEvent(new Event('scroll'))).not.toThrow();
      expect(tooltipEl()).toBeNull();
    });

    it('leaves no lingering listeners after ngOnDestroy while pinned', () => {
      const addSpy = jest.spyOn(window, 'addEventListener');
      const removeSpy = jest.spyOn(window, 'removeEventListener');
      const btn = getEl(fixture, 'nativeBtn');

      click(btn); // pin
      fixture.destroy();

      expect(removeSpy.mock.calls.filter(c => c[0] === 'scroll')).toHaveLength(1);
      expect(removeSpy.mock.calls.filter(c => c[0] === 'resize')).toHaveLength(1);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });

  describe('show guards', () => {
    it('ignores a delayed show that fires after the directive got disabled', () => {
      jest.useFakeTimers();
      host.divShowDelay.set(100);
      fixture.detectChanges();
      hoverIn(getEl(fixture, 'divTrigger'));
      host.divDisabled.set(true);
      fixture.detectChanges();
      jest.advanceTimersByTime(100);
      expect(tooltipEl()).toBeNull();
      jest.useRealTimers();
    });

    it('ignores a delayed show that fires after the text was cleared', () => {
      jest.useFakeTimers();
      host.divShowDelay.set(100);
      fixture.detectChanges();
      hoverIn(getEl(fixture, 'divTrigger'));
      host.divText.set('');
      fixture.detectChanges();
      jest.advanceTimersByTime(100);
      expect(tooltipEl()).toBeNull();
      jest.useRealTimers();
    });
  });
});

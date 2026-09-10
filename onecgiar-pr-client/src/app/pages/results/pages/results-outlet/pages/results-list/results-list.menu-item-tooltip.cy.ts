import { CommonModule } from '@angular/common';
import { PrTooltipDirectiveModule } from '../../../../../../shared/directives/pr-tooltip-directive.module';

/**
 * TIP-T-5 — site 3 of the 5 flagged compound-click sites (`design.md` §10.1): the row action-menu
 * item (`results-list.component.html:313-321`) where `[prTooltip]` and
 * `(click)="item.disabled ? null : item.command(); closeMenu()"` share one element.
 *
 * MOUNT DECISION: `ResultsListComponent` owns the whole results table — filters, pagination,
 * notification wiring, several injected list/filter services with real HTTP calls on init — far
 * more surface than this one menu item needs. `InnovationPackageCustomTableComponent` (the sibling
 * site `design.md` also names) renders a similar-looking menu item and pulls a much smaller DI
 * graph, but even that is unnecessary: the interaction under test is self-contained in the
 * `(click)="item.disabled ? null : item.command(); closeMenu()"` expression itself, so a harness
 * mounting that literal markup gives the same evidence without paying for either host's
 * surrounding page.
 *
 * CORRECTION (rework attempt 2, review issue 2 — the attempt-1 docstring here was factually wrong):
 * attempt 1 claimed this harness was "verbatim from both templates — they are identical" to
 * `results-list.component.html`. It was NOT: the real `results-list.component.html:313-321` menu
 * item carries `tabindex="0"`, `role="menuitem"`, and its own `(keydown.enter)` handler — none of
 * which the attempt-1 harness had. What attempt 1 actually matched was the unrelated IPSR sibling
 * `innovation-package-custom-table.component.html`, which genuinely has none of those three
 * attributes. That is not a cosmetic gap: it flips which `PrTooltipDirective` branch this test
 * exercises. With `role`/`tabindex` already on the host, `hostIsNativelyInteractive` is `true`
 * (`pr-tooltip.directive.ts`'s `ngOnInit`: `el.hasAttribute('role') || el.hasAttribute('tabindex')`)
 * — the directive leaves the host's role/tabindex/keydown alone and does NOT add its own
 * `keydown.enter`/`keydown.space` handler. The attempt-1 harness (missing both attributes) got
 * `hostIsNativelyInteractive === false` instead — the OPPOSITE branch, exercising a keyboard path
 * this real site never takes. The harness below now carries the real site's `tabindex`, `role`, and
 * `(keydown.enter)` verbatim, so it exercises the correct (already-interactive, left-alone) branch.
 *
 * TEMPLATE-DRIFT LOCK: the `before()` below reads the REAL `results-list.component.html` off disk
 * and asserts the exact `[prTooltip]`, `(click)`, `(keydown.enter)`, `tabindex`, and `role` strings
 * this harness now reproduces are still present verbatim at the real site.
 *
 * Unlike the phase-table site, `closeMenu()` sits OUTSIDE the disabled ternary — it always fires
 * regardless of `item.disabled` — so this site has a genuine "two actions, one click" collision
 * even in the disabled state: `command()` is correctly guarded off, but `closeMenu()` and the
 * tooltip pin both fire together. That is the real regression surface tested below.
 *
 * KNOWN FINDING, not fixed here (recorded for `TIP-T-6`/`TIP-DD-2` follow-up, per rework guidance —
 * fixing the directive itself is out of this test-only task's scope): because `hostIsNativelyInteractive`
 * is `true` here, `syncHostAffordance` never adds `role`/`aria-expanded` on its own — the template's
 * own `role="menuitem"` survives untouched (verified below, never overwritten to `role="button"`).
 * But `pin()` still unconditionally stamps `aria-expanded`/`aria-controls` onto the host whenever
 * it doesn't already own those attributes (it doesn't here), which lands `aria-expanded` on a
 * `role="menuitem"` element — invalid ARIA for a non-submenu menuitem (a `menuitem` may only expose
 * `aria-expanded` when it owns a submenu, which this one does not). This is a genuine, if narrow,
 * accessibility defect in the shared directive's toggletip pattern, not something this test-only
 * task is scoped to fix.
 */
describe('Result-list row menu item — command + closeMenu share a click with the tooltip trigger (TIP-T-5, site 3)', () => {
  const REAL_TEMPLATE_PATH = 'src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.html';

  before(() => {
    cy.readFile(REAL_TEMPLATE_PATH).then((html: string) => {
      expect(html, 'real tooltip binding').to.include('[prTooltip]="item.disabled ? item.tooltipText : null"');
      expect(html, 'real click binding').to.include('(click)="item.disabled ? null : item.command(); closeMenu()"');
      expect(html, 'real keydown.enter binding').to.include('(keydown.enter)="item.disabled ? null : item.command(); closeMenu()"');
      expect(html, 'real role').to.include('role="menuitem"');
      // `tabindex="0"` appears TWICE in the real template — once on a sortable `<th>` (unrelated to
      // this site), once on this menu item. A plain `.to.include('tabindex="0"')` would stay green
      // even if `tabindex="0"` were removed from the menu item specifically (the `<th>` occurrence
      // alone would still satisfy it) — false confidence. Assert both: the count stays at 2, AND the
      // menu item's own pairing (tabindex immediately followed by its role, verbatim as authored) is
      // still present as one contiguous string, so either occurrence being dropped breaks this lock.
      const tabindexMatches = html.match(/tabindex="0"/g) ?? [];
      expect(tabindexMatches, 'exactly 2 tabindex="0" occurrences (sortable <th> + this menu item)').to.have.length(2);
      expect(html, 'real tabindex immediately precedes role on the menu item').to.include('tabindex="0"\r\n          role="menuitem">');
    });
  });

  function mount(item: { disabled: boolean; tooltipText: string; command: () => void }, closeMenu: () => void) {
    return cy.mount(
      `<div
         class="table_menu_item"
         [prTooltip]="item.disabled ? item.tooltipText : null"
         prTooltipPosition="bottom"
         [ngClass]="{ itemDisabled: item.disabled }"
         (click)="item.disabled ? null : item.command(); closeMenu()"
         (keydown.enter)="item.disabled ? null : item.command(); closeMenu()"
         tabindex="0"
         role="menuitem">
         <span>{{ item.label }}</span>
       </div>`,
      {
        imports: [CommonModule, PrTooltipDirectiveModule],
        componentProperties: { item: { ...item, label: 'Map to TOC' }, closeMenu }
      }
    );
  }

  it('enabled item: command() runs once and the menu closes, no tooltip content to pin', () => {
    const command = cy.stub().as('command');
    const closeMenu = cy.stub().as('closeMenu');
    mount({ disabled: false, tooltipText: '', command }, closeMenu);

    cy.get('.table_menu_item').click();
    cy.get('@command').should('have.been.calledOnce');
    cy.get('@closeMenu').should('have.been.calledOnce');
    cy.get('.pr-tooltip').should('not.exist');
  });

  it('disabled item: command() is correctly skipped, but closeMenu() still fires AND the tooltip pins (mouse click)', () => {
    const command = cy.stub().as('command');
    const closeMenu = cy.stub().as('closeMenu');
    mount({ disabled: true, tooltipText: 'You are not allowed to perform this action.', command }, closeMenu);

    cy.get('.table_menu_item').click();
    cy.get('@command').should('not.have.been.called');
    // closeMenu() sits outside the disabled ternary in the real template — it always runs. This is
    // the actual "two actions on one click" collision this site was flagged for: the unconditional
    // action and the tooltip pin must both land from the same click, with neither swallowed.
    cy.get('@closeMenu').should('have.been.calledOnce');
    cy.get('.pr-tooltip').should('exist').and('have.class', 'pr-tooltip--pinned');
    cy.get('.table_menu_item').should('have.attr', 'aria-expanded', 'true');
    // Even while pinned via a real gesture, the template's own role is never overwritten — see the
    // KNOWN FINDING above about aria-expanded coexisting with role="menuitem".
    cy.get('.table_menu_item').should('have.attr', 'role', 'menuitem');
  });

  it('REAL BRANCH (host already interactive), ENABLED item: Enter fires command()+closeMenu() via the template\'s own handler, no tooltip to pin', () => {
    const command = cy.stub().as('command');
    const closeMenu = cy.stub().as('closeMenu');
    // This is the actual real-world keyboard path (design.md §10.1 item 3): an enabled item, a
    // keyboard user presses Enter, and command() genuinely fires. The real site is
    // hostIsNativelyInteractive === true (role + tabindex already present on the host), so
    // PrTooltipDirective adds no keydown.enter/space handler of its own here; only the template's
    // own (keydown.enter)="item.disabled ? null : item.command(); closeMenu()" can fire, and with
    // item.disabled === false it takes the command() branch, not the guarded no-op.
    mount({ disabled: false, tooltipText: '', command }, closeMenu);

    cy.get('.table_menu_item').should('have.attr', 'role', 'menuitem').and('have.attr', 'tabindex', '0');
    // .trigger('keydown', { key: 'Enter' }) is the sturdier form for a (keydown.enter) binding on a
    // non-input host — .type('{enter}') is built for typing into a focused input/textarea and is
    // not guaranteed to synthesize a bindable keydown on an arbitrary focused <div> host across
    // Cypress/Electron versions, whereas a direct keydown trigger matches exactly what Angular's
    // (keydown.enter) event binding listens for.
    cy.get('.table_menu_item').focus().trigger('keydown', { key: 'Enter' });

    // Falsifiability: with item.disabled === false, the template's ternary evaluates
    // `item.command()` (not the `null` no-op the disabled branch takes above), so this assertion
    // fails if command() is never invoked — it is not a no-op check. `calledOnce` also catches a
    // double-fire regression (e.g. Enter synthesizing an extra click on some host elements).
    cy.get('@command').should('have.been.calledOnce');
    cy.get('@closeMenu').should('have.been.calledOnce');
    // [prTooltip]="item.disabled ? item.tooltipText : null" — an enabled item always binds `null`,
    // so there is no tooltip content to pin regardless of which event drove the interaction.
    cy.get('.pr-tooltip').should('not.exist');
    cy.get('.table_menu_item').should('not.have.attr', 'aria-expanded');
    cy.get('.table_menu_item').should('have.attr', 'role', 'menuitem');
  });

  it('REAL BRANCH (host already interactive), DISABLED item + Enter: template handler runs (closeMenu fires, command stays guarded), no tooltip pin, role="menuitem" preserved', () => {
    const command = cy.stub().as('command');
    const closeMenu = cy.stub().as('closeMenu');
    // Disabled item with non-empty tooltip text — the state where a naive keyboard upgrade would
    // be most likely to leak a pin. The real site is hostIsNativelyInteractive === true (role +
    // tabindex already present), so PrTooltipDirective adds no keydown.enter/space handler of its
    // own here; only the template's own (keydown.enter) can fire, and with item.disabled === true
    // it takes the guarded `null` branch — command() must NOT run, only closeMenu() (which sits
    // outside the disabled ternary) does.
    mount({ disabled: true, tooltipText: 'You are not allowed to perform this action.', command }, closeMenu);

    cy.get('.table_menu_item').should('have.attr', 'role', 'menuitem').and('have.attr', 'tabindex', '0');
    cy.get('.table_menu_item').focus().trigger('keydown', { key: 'Enter' });

    cy.get('@command').should('not.have.been.called');
    cy.get('@closeMenu').should('have.been.calledOnce');
    // Enter is a keydown on a plain <div> — unlike a native <button>/<a>, it does NOT synthesize a
    // `click` event, so PrTooltipDirective's own (click)-driven pin path is never reached, and its
    // keydown.enter/space HostListener early-returns because hostIsNativelyInteractive is true.
    cy.get('.pr-tooltip').should('not.exist');
    cy.get('.table_menu_item').should('not.have.attr', 'aria-expanded');
    // The directive must never overwrite the template-declared role, keyboard or otherwise.
    cy.get('.table_menu_item').should('have.attr', 'role', 'menuitem');
  });
});

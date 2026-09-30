// @akili-spec bilateral/ai-processing-queue (AIQ-T-8 First step, P-18; attempt 2 a11y review)
//
// P-18 measurement — settles `AIQ-DD-7`: can `HlmDialogService.open(..., AI_PROCESSES_DRAWER_
// DIALOG_OPTIONS)` alone produce a right-anchored, full-height panel (520px at >= 640px, widened
// from 440px post-execution per user decision, testing pass — knowingly overrides `AIQ-R-12` B's
// 440px; full-screen below 640px) with a real focus trap (Tab/Shift+Tab wrap), Escape-to-close, scrim-click-
// to-close, focus restore, and a named dialog — WITHOUT a hand-rolled shell? `@spartan-ng/brain`
// (and so CDK Dialog) is globally mocked to an inert stub under Jest
// (`tests/mocks/spartanBrainMock.ts`), so this can only be answered here, in a real
// Chromium/Electron layout + CDK engine (Cypress component testing).
//
// Discovery worth recording (attempt 1 of this probe): `HlmDialogService.open()`'s TYPE signature
// accepts `ComponentType<unknown> | TemplateRef<unknown>`, but the IMPLEMENTATION always assigns
// whatever is passed to `$component` and `HlmDialogContent`'s template unconditionally renders it
// through `<ng-container [ngComponentOutlet]="component" />` when truthy — there is no branch that
// actually instantiates a `TemplateRef` via `ngTemplateOutlet`. Passing a `TemplateRef` measurably
// throws at runtime ("Component factory was provided as the first argument..."), captured live by
// this file before the fix below. And separately: `HlmDialogContent`'s `NgComponentOutlet` binds NO
// `ngComponentOutletInputs`, so even a real `ComponentType` opened this way can never receive an
// Angular `@Input()` (confirmed against every existing `HlmDialogService.open(ComponentType)` caller
// in this repo — `BulkUploaderAccessDialogComponent`, `UnsavedChangesDialogComponent` — none has an
// `input()`). `AiProcessesDrawerComponent.jobs` is `input.required`, so the REAL host
// (`ai-processes-drawer-host.component.ts`) is a small wrapper component with NO external inputs of
// its own (injects `BilateralAiService`, statically binds `[jobs]="service.jobs()"` in ITS OWN
// template) — exactly what `ProbeDrawerHostComponent` below does with a plain `[]`, to isolate the
// P-18 geometry/focus question from this separate, now-documented dialog-service limitation.
//
// Discovery worth recording (attempt 2): the first geometry pass measured the panel a few
// milliseconds into `HlmDialogContent`'s own ~100ms `data-open:zoom-in-95`/`fade-in` entry
// transition (the base classes animate scale 0.95 -> 1 regardless of `contentClass`), which reads
// as a several-pixel-off rect that has nothing to do with the sheet's resting geometry — measured
// 8-15px short of the expected edge. `openAndSettle()`'s `cy.wait` below settles that before
// measuring.
//
// Discovery worth recording (attempt 3): with the animation settled, `right`/`top`/`width` all
// measured correctly (`fixed`/`inset-y-0`/`right-0`/`sm:w-[520px]` DO win via `tailwind-merge`), but
// `bottom` measured ~511px instead of 800 — the panel was NOT full height. Cause: `h-dvh` on
// `hlm-dialog-content` is a real length, but Angular custom elements default to `display: inline`
// with no CSS of their own, so `ProbeDrawerHostComponent`'s own host element (the wrapper this file's
// header explains is required) broke the percentage-height chain down to
// `AiProcessesDrawerComponent`'s `h-full`, which resolved to `auto`/content-height. Any host wrapping
// this drawer for `HlmDialogService.open()` MUST set its own host to `display: contents` (`class:
// 'contents'` below) so height/width flow through untouched.
//
// Attempt 2 (a11y review, `AIQ-T-8` rework): attempt 1 shipped a SECOND, hand-rolled focus trap on
// `AiProcessesDrawerComponent` on top of CDK's — the exact "fifth copy" `AIQ-DD-7` said to skip once
// P-18 passed — and it visually collided with `HlmDialogContent`'s default close button
// (`showCloseButton` defaults `true`) because neither the probe nor the real launcher ever turned it
// off. Both are fixed now: the drawer owns no trap of its own, and every `.open()` call (this probe
// AND the real launcher) uses `AI_PROCESSES_DRAWER_DIALOG_OPTIONS`
// (`ai-processes-drawer-launcher.service.ts`) — `showCloseButton: false`,
// `closeOnOutsidePointerEvents: true`, `ariaLabelledBy: 'ai-processes-drawer-title'` — imported here
// so the probed configuration and the shipped configuration can never drift apart. This file now
// also proves what attempt 1's Jest trap tests wrongly stood in for: Tab/Shift+Tab wrap inside the
// REAL CDK trap, scrim-click close, and that the dialog has an accessible name.
//
// This file mounts the REAL `AiProcessesDrawerComponent` with a plain `[jobs]="[]"` binding — no
// HTTP, no login, no live `BilateralAiService`.
//
// Run ONLY for this probe (per `tasks.md` `AIQ-T-8`): `npx cypress run --component --spec
// 'src/app/pages/bilateral/components/ai-processes-drawer/ai-processes-drawer.cy.ts'`. The full CT
// suite (layout/overflow/animation assertions across every card variant) is `AIQ-T-11` — this file
// is kept as ITS seed, not extended here.
import { Component, inject } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { HlmDialogService } from '@spartan/dialog';
import { AiProcessesDrawerComponent } from './ai-processes-drawer.component';
import { AI_PROCESSES_DRAWER_DIALOG_OPTIONS } from './ai-processes-drawer-launcher.service';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The wrapper a real host would write: no external inputs, so `NgComponentOutlet` (no
 * `ngComponentOutletInputs`) can open it fine — it feeds the presentational drawer itself. */
@Component({
  standalone: true,
  imports: [AiProcessesDrawerComponent],
  template: `<app-ai-processes-drawer [jobs]="[]" />`,
  host: { class: 'contents' },
})
class ProbeDrawerHostComponent {}

@Component({
  standalone: true,
  template: `<button id="probe-trigger" type="button" (click)="open()">Open</button>`,
})
class ProbeTriggerComponent {
  private readonly dialog = inject(HlmDialogService);

  open(): void {
    // The SAME options the real launcher uses — see this file's header and that constant's own
    // doc comment (`ai-processes-drawer-launcher.service.ts`).
    this.dialog.open(ProbeDrawerHostComponent, AI_PROCESSES_DRAWER_DIALOG_OPTIONS);
  }
}

function mountProbe() {
  return cy.mount(ProbeTriggerComponent, { providers: [provideAnimationsAsync()] });
}

/** Opens the dialog and waits past `HlmDialogContent`'s own ~100ms entry transition before any
 * geometry read — see the file header's "Discovery worth recording (attempt 2)". */
function openAndSettle(): void {
  cy.get('#probe-trigger').click();
  cy.get('.cdk-dialog-container app-ai-processes-drawer', { timeout: 10000 }).should('exist');
  cy.wait(250);
}

describe('P-18 probe — AiProcessesDrawerComponent via HlmDialogService (AIQ-T-8 First step)', () => {
  it('at 1280x800: right-anchored, full height, 520px wide', () => {
    cy.viewport(1280, 800);
    mountProbe();
    openAndSettle();

    cy.get('.cdk-dialog-container app-ai-processes-drawer').then($el => {
      const rect = $el[0].getBoundingClientRect();
      cy.log(`1280px panel rect: ${JSON.stringify(rect)}`);
      expect(rect.right, 'panel right edge at viewport width').to.be.closeTo(1280, 2);
      expect(rect.top, 'panel top at 0 (full height)').to.be.closeTo(0, 2);
      expect(rect.bottom, 'panel bottom at viewport height (full height)').to.be.closeTo(800, 2);
      expect(rect.width, 'panel width 520px').to.be.closeTo(520, 2);
    });
  });

  it('at 375x800: full-screen sheet', () => {
    cy.viewport(375, 800);
    mountProbe();
    openAndSettle();

    cy.get('.cdk-dialog-container app-ai-processes-drawer').then($el => {
      const rect = $el[0].getBoundingClientRect();
      cy.log(`375px panel rect: ${JSON.stringify(rect)}`);
      expect(rect.left, 'panel left at 0 (full-screen)').to.be.closeTo(0, 2);
      expect(rect.right, 'panel right at viewport width (full-screen)').to.be.closeTo(375, 2);
      expect(rect.top, 'panel top at 0').to.be.closeTo(0, 2);
      expect(rect.bottom, 'panel bottom at viewport height').to.be.closeTo(800, 2);
    });
  });

  it('AIQ-R-12 A: no second/overlapping close button — showCloseButton: false is honored', () => {
    cy.viewport(1280, 800);
    mountProbe();
    openAndSettle();

    // Exactly one close control: the drawer's own (`ai-processes-drawer-close`), never
    // `HlmDialogContent`'s default extra "X" (attempt 1 a11y FAIL — a second, unreachable-by-Tab
    // close button overlapping the drawer's own).
    cy.get('.cdk-dialog-container button[hlmdialogclose], .cdk-dialog-container [hlmDialogClose]').should('not.exist');
    cy.get('[data-testid="ai-processes-drawer-close"]').should('exist');
  });

  it('AIQ-R-12 A: the dialog has an accessible name (aria-labelledby resolves to the drawer title)', () => {
    cy.viewport(1280, 800);
    mountProbe();
    openAndSettle();

    cy.get('.cdk-dialog-container[aria-labelledby]').then($container => {
      const id = $container.attr('aria-labelledby');
      expect(id, 'container carries aria-labelledby').to.be.a('string').and.not.be.empty;
      cy.document().then(doc => {
        const target = doc.getElementById(id as string);
        expect(target, `#${id} exists`).to.exist;
        expect(target?.textContent?.trim()).to.equal('AI processes');
      });
    });
  });

  it('traps focus, Tab/Shift+Tab wrap inside the REAL CDK trap, Esc closes, and focus returns to the trigger', () => {
    cy.viewport(1280, 800);
    mountProbe();
    openAndSettle();

    // Focus lands inside the panel on open (CDK's `autoFocus: 'first-tabbable'`).
    cy.focused().then($focused => {
      cy.get('.cdk-dialog-container app-ai-processes-drawer').then($panel => {
        expect($panel[0].contains($focused[0]), 'initial focus is inside the panel').to.be.true;
      });
    });

    cy.get('.cdk-dialog-container app-ai-processes-drawer').then($panel => {
      const focusable = Array.from($panel[0].querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      expect(focusable.length, 'at least 2 focusable elements (close button + Start with evidence)').to.be.greaterThan(1);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      // Shift+Tab from the first element wraps to the last (real CDK trap, never leaves the panel).
      cy.wrap(first).focus();
      cy.focused().should('have.attr', 'data-testid', first.getAttribute('data-testid') ?? undefined);
      cy.realPress(['Shift', 'Tab']);
      cy.focused().then($el => expect($el[0]).to.equal(last));

      // Tab from the last element wraps back to the first.
      cy.realPress('Tab');
      cy.focused().then($el => expect($el[0]).to.equal(first));
    });

    cy.get('body').type('{esc}');
    cy.get('.cdk-dialog-container').should('not.exist');
    cy.focused().should('have.id', 'probe-trigger');
  });

  it('AIQ-R-9 A: a scrim (backdrop) click closes the drawer (closeOnOutsidePointerEvents: true)', () => {
    cy.viewport(1280, 800);
    mountProbe();
    openAndSettle();

    // Click the backdrop, not the panel itself (Brain's default is `closeOnOutsidePointerEvents:
    // false`, which left the scrim inert in attempt 1 — the explicit `true` in
    // `AI_PROCESSES_DRAWER_DIALOG_OPTIONS` is what this test guards).
    cy.get('.cdk-overlay-backdrop').click('topLeft', { force: true });
    cy.get('.cdk-dialog-container').should('not.exist');
  });
});

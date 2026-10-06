// @akili-spec bugfix/cdk-overlay-root-zoom (COZ-T-1, COZ-R-1.S1, COZ-R-1.S2, COZ-R-2.S1, COZ-R-4.S1)
//
// Cypress Component Test, real Chromium layout. Regression gate for the CDK-overlay-vs-root-zoom bug:
// `styles.scss` sets `zoom: var(--pr-font-scale, 1)` on `:root` (DD-11), the CDK reads visual px from
// `getBoundingClientRect()` and writes them on a box that is zoomed AGAIN, so anchored overlays drift in
// proportion to the trigger's distance from the viewport origin (reported: dx 112 / dy 61 on Funding at 1.15).
//
// Harness facts (see the banner in `bilateral-review.cy.ts`): `styles.scss` is a CT devServer global style, so the
// root zoom lever is live, but `--pr-font-scale` stays at 1 unless something sets it. This spec sets it on
// `document.documentElement` per case and MEASURES everything in VISUAL px against that forced scale (kaizen:
// never assume zoom = 1). The trigger sits at 520 px / 360 px (CSS, pre-zoom) so a x s drift is tens of px.
//
// Measured element: `.cdk-overlay-pane`. It is the element the CDK positions and the one the fix re-zooms
// (design §8), it shrink-wraps the popover content, and a transform animation on the content (zoom-in-95) does
// not change the pane's layout rect. The measurement still waits for the content's animations to finish.
//
// dy expectation (decided here): the popover `sideOffset` (6) is written by the CDK as `offsetY` on the
// connected bounding box. After the fix that box has zoom 1, so the gap is 6 VISUAL px at every scale (it is the
// "designed offset", COZ-R-1.S1 "for example 6 px for the filter dropdowns"; the manual matrix expects dy 6 as
// well). It is NOT 6 x s. At s = 1 both readings coincide (6), which is what R-4.S1 pins; at s != 1 the
// two differ by 0.6 .. 3 px, so a flat 6 is enforced and the 1 px tolerance discriminates. The bug makes dy
// grow with (trigger.bottom x (s - 1)), far beyond that.
import { Component, signal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HlmPopoverImports } from '@spartan/popover';

const SCALES = [0.9, 1, 1.15, 1.3, 1.5] as const;
const TRIGGER_LEFT = 520; // CSS px, >= 400
const TRIGGER_TOP = 360; // CSS px, >= 300
const CONTENT_WIDTH = 260; // CSS px authored on the popover content
const SIDE_OFFSET = 6;
const POS_TOLERANCE = 1;
const WIDTH_TOLERANCE = 0.02;

@Component({
  selector: 'app-cdk-overlay-root-zoom-host',
  standalone: true,
  imports: [HlmPopoverImports],
  template: `
    <hlm-popover role="none" align="start" sideOffset="6" [autoFocus]="false" [attachTo]="trigger" [state]="open() ? 'open' : 'closed'" (stateChanged)="onState($event)">
      <button
        #trigger
        type="button"
        data-cy="coz-trigger"
        [style.position]="'absolute'"
        [style.left.px]="left"
        [style.top.px]="top"
        style="width: 120px; height: 36px"
        (click)="open.set(!open())">
        Open
      </button>
      <hlm-popover-content *hlmPopoverPortal role="dialog" aria-label="Zoom probe" data-cy="coz-content" style="width: 260px">
        <p>Overlay probe content</p>
      </hlm-popover-content>
    </hlm-popover>
  `
})
class CdkOverlayRootZoomHostComponent {
  readonly left = TRIGGER_LEFT;
  readonly top = TRIGGER_TOP;
  readonly open = signal(false);
  onState(state: 'open' | 'closed') {
    this.open.set(state === 'open');
  }
}

describe('CDK overlay anchoring under root zoom (COZ-T-1)', () => {
  beforeEach(() => {
    cy.viewport(1600, 1000);
  });

  afterEach(() => {
    document.documentElement.style.removeProperty('--pr-font-scale');
  });

  SCALES.forEach(scale => {
    it(`anchors start-aligned at the designed offset and scales the content at --pr-font-scale ${scale}`, () => {
      document.documentElement.style.setProperty('--pr-font-scale', String(scale));
      cy.mount(CdkOverlayRootZoomHostComponent, { imports: [NoopAnimationsModule] });

      // The lever must actually be live, otherwise nothing below is measured at the forced scale.
      cy.document().then(doc => {
        expect(Number(getComputedStyle(doc.documentElement).zoom), 'effective root zoom').to.eq(scale);
      });

      cy.get('[data-cy="coz-trigger"]').click();
      cy.get('[data-cy="coz-content"]').should('have.attr', 'data-state', 'open');
      // Entry animation (zoom-in-95 / fade-in) must be over before any rect is read.
      cy.get('[data-cy="coz-content"]').should($el => {
        expect($el[0].getAnimations().length, 'running animations').to.eq(0);
      });

      cy.get('[data-cy="coz-trigger"]').then($trigger => {
        const pane = Cypress.$('.cdk-overlay-pane').last()[0];
        expect(pane, '.cdk-overlay-pane').to.exist;
        const t = $trigger[0].getBoundingClientRect();
        const p = pane.getBoundingClientRect();

        // Sanity: the trigger really is far from the origin in visual px, or the drift cannot show.
        expect(t.left, 'trigger.left (visual px)').to.be.greaterThan(400 * scale - 1);
        expect(t.bottom, 'trigger.bottom (visual px)').to.be.greaterThan(300 * scale);

        const dx = p.left - t.left;
        const dy = p.top - t.bottom;
        const expectedWidth = CONTENT_WIDTH * scale;
        const widthRatio = p.width / expectedWidth;
        const summary =
          `scale=${scale} dx=${dx.toFixed(2)} (want 0 +-${POS_TOLERANCE}) ` +
          `dy=${dy.toFixed(2)} (want ${SIDE_OFFSET} +-${POS_TOLERANCE}) ` +
          `width=${p.width.toFixed(2)} (want ${expectedWidth.toFixed(2)} +-${WIDTH_TOLERANCE * 100}%) ` +
          `trigger.left=${t.left.toFixed(1)} trigger.bottom=${t.bottom.toFixed(1)} pane.left=${p.left.toFixed(1)} pane.top=${p.top.toFixed(1)}`;
        cy.log(summary);

        const failures: string[] = [];
        if (Math.abs(dx) > POS_TOLERANCE) failures.push('dx');
        if (Math.abs(dy - SIDE_OFFSET) > POS_TOLERANCE) failures.push('dy');
        if (Math.abs(widthRatio - 1) > WIDTH_TOLERANCE) failures.push('width');
        expect(failures, summary).to.deep.eq([]);
      });
    });
  });
});

import { Component } from '@angular/core';

/**
 * SAV-T-1 — Cypress CT recipe harness for the `pr-viewport-page` mixin (`src/styles/_viewport-page.scss`).
 *
 * This is a THROWAWAY component, defined inline, that reproduces the SP shell chain
 * (`app.component.html`) closely enough to measure the mixin in a real layout engine:
 *
 *   main.flex.flex-col.min-h-svh                          (mirrors `main hlmSidebarInset`)
 *   └── .app-shell-header  sticky top-0                    (mirrors `.app-shell-header`; banner
 *       │                                                   toggle changes its height, like the
 *       │                                                   real TEST banner does)
 *   └── div.relative.min-h-0.min-w-0.flex-1                (mirrors the outlet slot — the
 *       │                                                    containing block, `app.component.html:48`)
 *       └── .locked  ← @include pr-viewport-page            (the mechanism under test)
 *           ├── band stub (flex-none)
 *           └── #work-area  (the exact `min-[900px]:flex-1 min-[900px]:min-h-0
 *               │            min-[900px]:overflow-y-auto custom_scroll` wrapper from
 *               │            `design.md` §6.2), stub content ≥ 2× viewport, plus a nested
 *               │            `overflow-x-auto` wrapper around a `w-[2400px]` block (SAV-R-9)
 *   └── aside  fixed inset-y-0 left-0                       (mirrors the AOW rail, SAV-R-7)
 *
 * `bannerOn` is the only knob the spec exposes — it is what proves `SAV-R-3` is not vacuous
 * (`requirements.md` §10 disqualifier: "a green run on a harness that omits the header block
 * proves nothing" — this harness's banner toggle must actually grow the header, asserted below).
 */
@Component({
  selector: 'app-viewport-page-harness',
  standalone: true,
  styles: [
    `
      @use '../../../styles/viewport-page' as vp;

      :host {
        display: block;
      }

      .locked {
        @include vp.pr-viewport-page;
      }
    `
  ],
  template: `
    <main class="flex min-h-svh min-w-0 flex-1 flex-col" data-cy="main">
      <div class="app-shell-header sticky top-0 z-30 flex-none bg-white" data-cy="header">
        @if (bannerOn) {
          <div class="flex flex-col gap-1 bg-[#5733c4] px-4 py-2 text-[12px] leading-[1.4] text-white" data-cy="banner">
            <strong>TEST ENVIRONMENT — New look &amp; feel preview.</strong>
            <span>
              Explore and get familiar with the new design. Keep in mind this environment is still evolving and will keep changing to
              improve the user experience, so please share your feedback with the PRMS tech support team whenever something looks off or a
              flow feels harder than it used to be.
            </span>
          </div>
        }
        <div class="flex h-[56px] items-center border-b border-[#e3e3e8] px-4" data-cy="topbar">Topbar stub</div>
      </div>
      <div class="relative min-h-0 min-w-0 flex-1" data-cy="slot">
        <div class="locked" data-cy="locked">
          <div class="flex-none bg-[#ede9fe] px-4 py-3" data-cy="band">Band stub</div>
          <div
            class="work-area min-[900px]:min-h-0 min-[900px]:flex-1 min-[900px]:overflow-y-auto custom_scroll"
            data-cy="work-area">
            <div class="flex-none px-4 py-2" data-cy="controls">Controls row stub — scrolls with content, does not pin</div>
            @if (tallContent) {
              <div class="h-[2400px] px-4" data-cy="tall-content">Tall stub content — deliberately ≥ 2× any tested viewport height</div>
            } @else {
              <div class="h-[120px] px-4" data-cy="tall-content">Short stub content — deliberately shorter than any tested viewport</div>
            }
            <div class="overflow-x-auto px-4" data-cy="hscroll-wrapper">
              <div class="h-[40px] w-[2400px] bg-[#f0f0f5]" data-cy="wide-block">Wide block stub — ≥ 2× any tested viewport width</div>
            </div>
          </div>
        </div>
      </div>
      <aside class="fixed inset-y-0 left-0 w-[240px] bg-[#2b2838]" data-cy="rail"></aside>
    </main>
  `
})
class ViewportPageHarnessComponent {
  bannerOn = false;
  /** SAV-T-1 rework: swaps the tall (≥2× viewport) stub for a short (~120px) one so the "Short
   *  content" scenario (`SAV-R-1/2`, `SAV-AC-2`) has a fixture that can actually go un-scrolled. */
  tallContent = true;
}

/** `requirements.md` §10 disqualifier: assert the requested size BEFORE any geometry read. */
function assertViewportGuard(width: number, height: number) {
  cy.window().should(win => {
    expect(win.innerWidth, 'window.innerWidth (viewport guard)').to.eq(width);
    expect(win.innerHeight, 'window.innerHeight (viewport guard)').to.eq(height);
  });
}

function mountHarness(props: Partial<{ bannerOn: boolean; tallContent: boolean }> = {}) {
  return cy.mount(ViewportPageHarnessComponent, { componentProperties: props });
}

/** `SAV-R-1`/`SAV-AC-1`: no vertical or horizontal overflow on the document itself. */
function assertDocumentLocked(label: string) {
  cy.document().should(doc => {
    const de = doc.documentElement;
    expect(Math.abs(de.scrollHeight - de.clientHeight), `${label}: document scrollHeight(${de.scrollHeight}) vs clientHeight(${de.clientHeight})`).to.be.at.most(1);
    expect(Math.abs(de.scrollWidth - de.clientWidth), `${label}: document scrollWidth(${de.scrollWidth}) vs clientWidth(${de.clientWidth})`).to.be.at.most(1);
  });
}

/** `SAV-R-2`/`SAV-AC-1`: the work area is the one element that actually has something to scroll. Void
 *  per the requirements' disqualifier unless the stub content is ≥ 2× the viewport — it is (2400px). */
function assertWorkAreaIsTheScroller(label: string) {
  cy.get('[data-cy="work-area"]').should($wa => {
    const el = $wa[0] as HTMLElement;
    expect(el.scrollHeight, `${label}: work-area scrollHeight`).to.be.greaterThan(el.clientHeight);
  });
}

/** `SAV-R-9`/`SAV-AC-9`: the work area itself gains no horizontal overflow — the wide block is
 *  contained by its own nested `overflow-x-auto` wrapper instead. */
function assertWorkAreaNoHorizontalOverflow(label: string) {
  cy.get('[data-cy="work-area"]').should($wa => {
    const el = $wa[0] as HTMLElement;
    expect(Math.abs(el.scrollWidth - el.clientWidth), `${label}: work-area horizontal overflow`).to.be.at.most(1);
  });
}

describe('pr-viewport-page recipe (Cypress CT harness) — SAV-T-1', () => {
  it('1280×800 — SAV-AC-1: locked frame, work area is the only scroller, no horizontal overflow (doc or work area); AOW-rail-style fixed overlay keeps its own anchoring (SAV-R-7)', () => {
    cy.viewport(1280, 800);
    mountHarness();
    assertViewportGuard(1280, 800);

    assertDocumentLocked('1280×800');
    assertWorkAreaIsTheScroller('1280×800');
    assertWorkAreaNoHorizontalOverflow('1280×800');

    cy.get('[data-cy="rail"]').should($rail => {
      const rect = ($rail[0] as HTMLElement).getBoundingClientRect();
      expect(rect.top, '1280×800: rail top (fixed inset-y-0)').to.eq(0);
      expect(Math.abs(rect.height - 800), '1280×800: rail height === innerHeight').to.be.at.most(1);
    });
  });

  it('1280×800 short content — SAV-R-1/SAV-R-2 "Short content"/SAV-AC-2: no scrollbar anywhere and the work area still fills to the viewport bottom edge', () => {
    cy.viewport(1280, 800);
    mountHarness({ tallContent: false });
    assertViewportGuard(1280, 800);

    // (a) the viewport guard already ran above; the frame is still locked with short content.
    assertDocumentLocked('1280×800 short-content');

    // (b) nothing scrolls anywhere: the work area has no more to scroll than the tall-content
    // test has to scroll (that assertion lives there) — here the short stub must leave the work
    // area with scrollHeight === clientHeight (this reading is only valid here, per the task's
    // disqualifier, because this is the short-content fixture).
    cy.get('[data-cy="work-area"]').should($wa => {
      const el = $wa[0] as HTMLElement;
      expect(Math.abs(el.scrollHeight - el.clientHeight), '1280×800 short-content: work area has nothing to scroll').to.be.at.most(1);
    });

    // (c) the clause that actually catches a work area which stops at content height and leaves
    // a white gap below it: the work area's own bottom edge must equal the viewport's bottom edge.
    cy.window().then(win => {
      cy.get('[data-cy="work-area"]').should($wa => {
        const rect = ($wa[0] as HTMLElement).getBoundingClientRect();
        expect(Math.abs(rect.bottom - win.innerHeight), '1280×800 short-content: work area bottom edge === viewport bottom (no white gap below content)').to.be.at.most(1);
      });
    });
  });

  it('1100×800 — SAV-R-3/SAV-AC-3: band sits flush under the header with the banner OFF and with the banner WRAPPED to two lines, and the banner toggle actually grows the header (≥30px)', () => {
    cy.viewport(1100, 800);

    // -- banner OFF --
    mountHarness({ bannerOn: false });
    assertViewportGuard(1100, 800);
    assertDocumentLocked('1100×800 banner-off');
    assertWorkAreaIsTheScroller('1100×800 banner-off');

    let headerHeightOff = 0;
    cy.get('[data-cy="header"]').should($h => {
      headerHeightOff = ($h[0] as HTMLElement).getBoundingClientRect().height;
      expect(headerHeightOff, 'banner-off header height').to.be.greaterThan(0);
    });
    cy.get('[data-cy="locked"]')
      .its('0')
      .then(lockedEl => {
        const headerBottom = (document.querySelector('[data-cy="header"]') as HTMLElement).getBoundingClientRect().bottom;
        const lockedTop = (lockedEl as HTMLElement).getBoundingClientRect().top;
        expect(Math.abs(lockedTop - headerBottom), 'banner-off: locked host top === header bottom').to.be.at.most(1);
      });

    // -- banner ON, wraps at 1100px --
    mountHarness({ bannerOn: true });
    assertViewportGuard(1100, 800);
    assertDocumentLocked('1100×800 banner-on');
    assertWorkAreaIsTheScroller('1100×800 banner-on');

    cy.get('[data-cy="banner"]').should($b => {
      // Disqualifier guard (`requirements.md` §10): a banner that never wraps proves nothing about
      // SAV-R-3. Two lines of 12px/1.4 text plus the bold line comfortably clears 24px.
      expect(($b[0] as HTMLElement).getBoundingClientRect().height, '1100×800: banner wraps to ≥ 2 lines').to.be.greaterThan(24);
    });
    cy.get('[data-cy="header"]').should($h => {
      const headerHeightOn = ($h[0] as HTMLElement).getBoundingClientRect().height;
      expect(headerHeightOn - headerHeightOff, 'banner ON must grow the header by ≥ 30px vs banner OFF').to.be.at.least(30);
    });
    cy.get('[data-cy="locked"]')
      .its('0')
      .then(lockedEl => {
        const headerBottom = (document.querySelector('[data-cy="header"]') as HTMLElement).getBoundingClientRect().bottom;
        const lockedTop = (lockedEl as HTMLElement).getBoundingClientRect().top;
        expect(Math.abs(lockedTop - headerBottom), 'banner-on (wrapped): locked host top === header bottom').to.be.at.most(1);
      });
  });

  it('800×1100 — SAV-R-8/SAV-AC-8: below md the fallback holds — document scrolls, host stays static, and no work-area scrollbar (mixin emits nothing)', () => {
    cy.viewport(800, 1100);
    mountHarness();
    assertViewportGuard(800, 1100);

    cy.document().should(doc => {
      const de = doc.documentElement;
      expect(de.scrollHeight, '800×1100: document scrollHeight').to.be.greaterThan(de.clientHeight);
    });
    cy.get('[data-cy="locked"]').should($locked => {
      const position = getComputedStyle($locked[0] as HTMLElement).position;
      expect(position, '800×1100: locked host position (mixin media-gated at 900px, so no lock below it)').to.eq('static');
    });
    cy.get('[data-cy="work-area"]').should($wa => {
      const el = $wa[0] as HTMLElement;
      expect(Math.abs(el.scrollHeight - el.clientHeight), '800×1100: work area is NOT a scroller').to.be.at.most(1);
      expect(getComputedStyle(el).overflowY, '800×1100: work-area overflow-y (min-[900px]: gated)').to.eq('visible');
    });
  });

  it('1440×900 and 1600×900 — SAV-AC-1/SAV-AC-9: locked frame and horizontal containment hold at both wider laptop widths', () => {
    ([1440, 1600] as const).forEach(width => {
      cy.viewport(width, 900);
      mountHarness();
      assertViewportGuard(width, 900);

      assertDocumentLocked(`${width}×900`);
      assertWorkAreaIsTheScroller(`${width}×900`);
      assertWorkAreaNoHorizontalOverflow(`${width}×900`);
    });
  });
});

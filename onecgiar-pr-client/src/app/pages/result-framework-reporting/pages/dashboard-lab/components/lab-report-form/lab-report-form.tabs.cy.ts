// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-results-browse (PTB-T-6,
// PTB-AC-1/AC-2 layout half, defect class D-8) — Cypress CT gate that MEASURES the entry-mode tab
// strip's rendered geometry at two viewports. jsdom (Jest) lays nothing out, so a Jest spec can only
// assert which template branch rendered — never whether the three-tab strip actually fits inside the
// narrow indicator-drawer aside. This file's only job is that measurement; state-machine correctness
// (which state renders, six-state mapping, etc.) is `pt-results-browse.component.spec.ts`'s job, and
// the non-KP-default-mode regression is `lab-report-form.component.spec.ts`'s job.
//
// REWORK (attempt 2, Reviewer FAIL) — what changed and why:
//  1. The tabs are `flex-1` with the browser default `min-width: auto` and no `overflow: hidden`.
//     Under that CSS a tab can never shrink below its own content, so `tab.scrollWidth <=
//     tab.clientWidth` can never go red — it asserted something structurally guaranteed. The real
//     D-8 symptom at a narrow width is a label WRAPPING onto a second line (the strip grows
//     taller), not horizontal clipping. This file measures `rect.height` per tab and asserts the
//     three-tab strip stays SINGLE-LINE relative to the two-tab baseline (`assertSingleLine`).
//  2. The width floor compares MINIMUM tab width (not average, which is mathematically 2/3 of the
//     two-tab average regardless of overflow under equal-width flex-1 tabs — it could not fail).
//  3. Fonts are proven via `document.fonts` iteration for a `FontFace` whose family AND
//     `status === 'loaded'` match — `FontFaceSet.check()` can read `true` with no matching face.
//  4. The container stand-in reproduces `indicator-drawer.component.html:153`'s real scroll-body
//     Tailwind classes (`overflow-y-auto px-4 pb-0 pt-4 min-[640px]:px-6 min-[640px]:pt-5`) instead
//     of a hand-computed width, sized to the ASIDE width; the mounted `<form>` is moved inside it
//     and fills its content box via flex stretch. Per-tab rects are checked against that content
//     box (`assertContainment`), not the always-`w-full`-to-its-parent tablist wrapper.
//
// REWORK (attempt 3, requester decisions after attempt 2's honest red — design.md §6.3):
//  5. **D-8 fixed in the template** (the ONLY file this task is allowed to touch besides this spec):
//     below a 640px ASIDE width each tab shows a SHORT label (`Browse` / `Manual` / `Tracker`); at
//     640px and above it shows the FULL label (`Browse repositories` / `Manual entry` / `Progress
//     Tracker`). The accessible name (`aria-label`) and `title` stay the FULL label at every width.
//     Mechanism: a Tailwind 4 CONTAINER query (`@container` on the `[role=tablist]` wrapper +
//     `@min-[640px]:` on two sibling `<span>`s per tab — one `@min-[640px]:hidden`, one `hidden
//     @min-[640px]:inline`), the SAME pattern already used in `program-overview.component.html`.
//     A container query — not a viewport `min-[640px]:` breakpoint — is correct here because the
//     indicator-drawer aside is user-resizable independently of the browser viewport
//     (`indicator-drawer.component.ts`'s drag-resize): the width that starves the tabs is the
//     ASIDE's, never the window's. This file's own container-width stand-in
//     (`wrapFormInScrollBodyStandIn`) is unaffected — the `@container` still keys off the actual
//     rendered width of the `[role=tablist]` element, which the stand-in still controls correctly.
//     WCAG 2.5.3 (Label in Name): every short label is asserted to be a literal substring of its
//     own `aria-label` (`assertLabelsForWidth`) — "Browse" ⊂ "Browse repositories", "Manual" ⊂
//     "Manual entry", "Tracker" ⊂ "Progress Tracker".
//     The single-line height gate (`assertSingleLine`) is UNCHANGED from attempt 2 and is now
//     GREEN at the narrow viewport, because the short labels no longer wrap.
//  6. **Footer bleed is OUT of this gate's scope, per requester decision — recorded as follow-up
//     PTB-G-4, not fixed here and not silenced by skipping a test.** It predates this spec
//     (present on `HEAD`, unrelated to the tab strip) and would still fire on a red overflow signal
//     that has nothing to do with D-8: below 640px, the KP "browse mode" Cancel-only footer
//     (`lab-report-form.component.html`, the `@else` branch's `<div class="sticky bottom-0 -mx-6
//     ... px-6 ...">`) uses an UNCONDITIONAL `-mx-6`/`px-6` (18px at this app's 12px root), unlike
//     its sibling "ready to create" footer, which correctly narrows to `-mx-4`/`px-4` (12px) below
//     640px — it bleeds 18px past the card while the scroll body only affords 12px, a 6px
//     scroll-body overflow (measured `scrollWidth` 396 vs `clientWidth` 390 in attempt 2's run).
//     Attempt 2 added a scroll-body-level `scrollWidth <= clientWidth` check for containment
//     (Reviewer FAIL item 3) that incidentally also caught this unrelated footer bug and turned the
//     WHOLE three-tab test red for two independent reasons at once. Per the requester's decision,
//     `assertNoOverflow` below is narrowed back to the STRIP's own `scrollWidth <= clientWidth`
//     (this gate's actual job); `assertContainment` (per-tab rects vs. the scroll body's content
//     box) is UNCHANGED and still real containment coverage, independent of the footer.
//
// REWORK (attempt 4, final — narrow Reviewer FAIL): the two-tab test's `height` was only ever
// RECORDED as the D-8 baseline, never asserted to itself be single-line — if the two-tab labels
// ever wrapped, both heights would read equal (57 vs 57) and `assertSingleLine` on the three-tab
// strip would stay green for the wrong reason (no fixed anchor). `assertVisibleLabelSingleLine`
// fixes this: it reads `getClientRects().length` on whichever `<span>` (short/full) the
// `@container` query is actually showing (a `display:none` span contributes 0 rects) and asserts
// it equals exactly 1 — a wrapped label produces one rect per line. Applied as the mandatory anchor
// in the two-tab test and, per the Reviewer's advisory, also in the three-tab tests.
//
// MOUNT APPROACH (not the isolation fallback): the REAL `LabReportFormComponent` is mounted directly
// (`design.md` P-9's technique — `cy.mount(Component, { componentProperties, providers })`, no
// `HttpClientTestingModule`). `LabReportFormComponent` turned out to be mountable once every service
// its constructor chain touches is either a `useValue` stub (`ApiService`, whose `resultsSE` methods
// are called from `ResultLevelService`, `CentersService` and this component itself) or left as the
// real `providedIn: 'root'` service (`ResultLevelService`, `CentersService`, `WordCounterService`,
// `QaInnovationDevelopmentResultsService`, `ResultsListFilterService`) — those all resolve through
// the SAME stubbed `ApiService`, so one stub covers the whole chain. `ResultsApiService` is stubbed
// separately because the KP fixture's Browse-repositories panel (`app-kp-cgspace-browse`) injects it
// directly, not through `ApiService` (same two-provider shape `kp-cgspace-browse.cy.ts` uses).
// The Progress Tracker panel itself is never mounted in this file — it is `@if`-gated on
// `ptTabOpened()`, which starts `false` and is never set — so `GET_progressTrackerResults` needs no
// stub.
//
// FONTS: `document.fonts` after `document.fonts.ready` is iterated for a `FontFace` whose `family`
// (quotes stripped) matches exactly and whose `status` is `'loaded'` — proof a real `@font-face`
// resolved, not `.check()`'s permissive true/false. Both Manrope (the production text face,
// `styles/fonts.scss`) and Material Icons Round (self-hosted per `AIS-T-2`'s harness correction) are
// asserted loaded at every measurement; the actually-resolved `getComputedStyle(tab).fontFamily` is
// also recorded in the evidence file.
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { LabReportFormComponent } from './lab-report-form.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultsApiService } from 'src/app/shared/services/api/results-api.service';

// ---------------------------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------------------------

/** Minimal but crash-safe `GET_TypeByResultLevel` response: `ResultLevelService.removeResultTypes`
 *  unconditionally does `list.find(id===3).result_type.findIndex(...)` — an empty list would throw
 *  `Cannot read properties of undefined` synchronously inside the service constructor. */
const RESULT_LEVELS = [
  { id: 1, name: 'Impact', result_type: [] },
  { id: 2, name: 'Outcome', result_type: [] },
  { id: 3, name: 'Outcome', result_type: [{ id: 10, name: 'Other outcome (hidden)' }, { id: 11, name: 'Hidden' }, { id: 4, name: 'Other outcome' }] },
  { id: 4, name: 'Output', result_type: [{ id: 6, name: 'Knowledge product' }, { id: 8, name: 'Other output' }] }
];

/** Non-empty on purpose — `CentersService.getData()` treats a `[]` response as a FAILED attempt
 *  (retries 2x then rejects the promise), which would leave `preselectTocCenters()`'s `.then()`
 *  never firing and risk an unhandled rejection in the harness. */
const CENTERS_FIXTURE = [{ code: 'CIAT', acronym: 'CIAT', name: 'Alliance Bioversity-CIAT', institutionId: 1 }];

/** KP indicator -> `currentResultIsKnowledgeProduct()` true -> 3 tabs (Browse | Manual | Progress Tracker). */
const KP_INDICATOR = {
  related_node_id: 'IND-KP-1',
  result_type_id: 6, // KNOWLEDGE_PRODUCT_TYPE_ID
  indicator_description: 'Number of knowledge products published and quality-assured',
  center_acronym: 'CIAT',
  targets_by_center: { centers: [] }
};

/** Non-KP indicator (Policy change, id 1) -> 2 tabs (Manual entry | Progress Tracker). */
const NON_KP_INDICATOR = {
  related_node_id: 'IND-NONKP-1',
  result_type_id: 1,
  indicator_description: 'Number of policies influenced',
  center_acronym: 'CIAT',
  targets_by_center: { centers: [] }
};

/** Full/short label pairs, in DOM order, per switcher. The short label MUST be a literal substring
 *  of the full label (WCAG 2.5.3, Label in Name) — asserted live in `assertLabelsForWidth`, not
 *  just claimed here. */
const KP_TABS = [
  { full: 'Browse repositories', short: 'Browse' },
  { full: 'Manual entry', short: 'Manual' },
  { full: 'Progress Tracker', short: 'Tracker' }
];
const NON_KP_TABS = [
  { full: 'Manual entry', short: 'Manual' },
  { full: 'Progress Tracker', short: 'Tracker' }
];

// ---------------------------------------------------------------------------------------------
// Viewports — both stated in effective CSS px. No host zoom is applied: `cy.viewport()` sets the
// Chromium window's CSS pixel dimensions directly (browser zoom stays at its 100% default), so
// "effective CSS px" == the numbers passed to `cy.viewport()`. This is a Cypress CT Chromium
// window, not the Orca embedded browser — the project's "root zoom x1.2" note is about live
// page checks in Orca and does not apply here.
//
// `asideWidth` is `initialDrawerWidth()`'s own formula (`indicator-drawer.component.ts:729-738`)
// evaluated at each viewport — the width of the `<aside class="pr-drawer">` itself, BEFORE the
// scroll body's own padding is subtracted (that subtraction happens for real, via the CSS classes
// reproduced in `wrapFormInScrollBodyStandIn`, not a hand-computed number). `isNarrow` also gates
// which label (short/full) is expected.
//
// ⚠️ Corrected (Reviewer advisory): 640px is the `@container` query's threshold on the
// `[role=tablist]` element's OWN width, NOT the aside's. The tablist is narrower than the aside by
// the scroll-body padding + the card's own padding, and that overhead differs depending on which
// side of the VIEWPORT's own 640px breakpoint the padding classes (`min-[640px]:px-6` on the scroll
// body, `min-[640px]:p-4.5` on the card) land on — so the aside width at which the tablist itself
// crosses 640px is approximately 664–688px, not exactly 640px. `NARROW` (390) and `WIDE` (740) both
// sit comfortably on one side of that band, which is why picking exact viewports here still works;
// don't read "640px aside" as the real threshold if you change these numbers.
// ---------------------------------------------------------------------------------------------

/** `initialDrawerWidth()` @ vw=1440: min(max(740, round(1440*0.38)=547)=740, 1100, 1440-320=1120) = 740. */
const WIDE = { viewport: 1440, asideWidth: 740, label: 'wide (1440px viewport, 740px aside)', isNarrow: false };
/** `initialDrawerWidth()` @ vw=390 (< 768): full-bleed sheet, aside = vw = 390. This is the band
 *  where three `flex-1` tabs share the aside width minus the scroll body's `px-4` — narrow enough
 *  for the FULL labels to wrap (measured 57px vs the 35px baseline before the short-label fix);
 *  the short labels this file now asserts are the fix. */
const NARROW = { viewport: 390, asideWidth: 390, label: 'narrow (390px viewport, 390px aside)', isNarrow: true };

const VIEWPORTS = [WIDE, NARROW] as const;

// ---------------------------------------------------------------------------------------------
// Mount + measurement helpers
// ---------------------------------------------------------------------------------------------

function apiStub() {
  return {
    resultsSE: {
      GET_TypeByResultLevel: () => of({ response: RESULT_LEVELS }),
      GET_AllCLARISACenters: () => of({ response: CENTERS_FIXTURE }),
      GET_AllInitiatives: () => of({ response: [] }),
      GET_W3BilateralProjectsByProgram: () => of({ response: [] }),
      GET_mqapValidation: () => of({ response: {} }),
      POST_createResult: () => of({ response: {} })
    },
    dataControlSE: { reportingCurrentPhase: { phaseYear: 2026 }, myInitiativesList: [] },
    rolesSE: { isAdmin: false },
    alertsFe: { show: () => undefined }
  };
}

function resultsApiStub() {
  return {
    GET_cgspaceSearch: () => of({ response: { items: [], page: { number: 0, size: 10, totalElements: 0, totalPages: 0, hasMore: false }, sources: [] }, status: 200 }),
    GET_cgspaceFacet: () => of({ response: { values: [] } })
  };
}

function mountForm(indicator: Record<string, unknown>) {
  return cy.mount(LabReportFormComponent, {
    componentProperties: {
      indicator,
      tocNode: null,
      initiativeId: 1,
      programCode: 'SP01',
      canReport: true
    },
    providers: [provideRouter([]), { provide: ApiService, useValue: apiStub() }, { provide: ResultsApiService, useValue: resultsApiStub() }]
  });
}

const SCROLL_BODY_TESTID = 'ptb-t6-scroll-body-standin';

/**
 * Reproduces `indicator-drawer.component.html:153`'s scroll body — SAME Tailwind classes, so the
 * ACTUAL computed padding (px-4 below 640px viewport width, min-[640px]:px-6 at/above it) narrows
 * the content box, not a hand-computed pixel guess that can drift from the template. The mounted
 * `<form>` is moved inside it and stripped of any explicit width, so it fills the wrapper's content
 * box via flex stretch (`flex flex-col` on the wrapper -> `align-items: stretch` by default),
 * exactly as it does inside the real `indicator-drawer`.
 */
function wrapFormInScrollBodyStandIn(asideWidthPx: number): void {
  cy.get('form').then($form => {
    const form = $form[0] as HTMLElement;
    const parent = form.parentElement;
    if (!parent) throw new Error('wrapFormInScrollBodyStandIn: mounted form has no parent to wrap');
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-testid', SCROLL_BODY_TESTID);
    wrapper.className = 'custom_scroll flex flex-1 flex-col overflow-y-auto px-4 pb-0 pt-4 min-[640px]:px-6 min-[640px]:pt-5';
    wrapper.style.width = `${asideWidthPx}px`;
    wrapper.style.maxWidth = `${asideWidthPx}px`;
    parent.insertBefore(wrapper, form);
    wrapper.appendChild(form);
    form.style.removeProperty('width');
    form.style.removeProperty('max-width');
  });
}

interface TabMeasurement {
  /** The accessible name — the button's `aria-label` attribute, which the template keeps as the
   *  FULL label at every width. Used as the stable identity key for a tab (DOM order is also
   *  checked against `KP_TABS`/`NON_KP_TABS`, so a mismatch here is itself a finding). */
  ariaLabel: string | null;
  /** `innerText`, NOT `textContent` — `textContent` reads BOTH the short and full `<span>`s
   *  regardless of which one is CSS-hidden by the `@container` query; `innerText` respects
   *  rendering/visibility, which is what "the visible text" means. */
  visibleText: string;
  /** `getClientRects().length` of whichever `<span>` (short or full) is actually rendered — a
   *  hidden span (`display:none`) contributes 0 rects, so exactly one of the two spans is
   *  "visible" for this purpose. A wrapped label produces >1 rect (one per line); 1 is the
   *  single-line anchor Reviewer FAIL item asked for. `0` means neither span rendered anything —
   *  a harness bug, not a layout finding — and is asserted against separately. */
  visibleLabelRectCount: number;
  rect: DOMRect;
  clientWidth: number;
  scrollWidth: number;
}

interface ScrollBodyMeasurement {
  /** The wrapper's OWN rect (border box). */
  rect: DOMRect;
  /** The wrapper's CONTENT box — rect minus its own padding — what tab rects are checked against. */
  contentLeft: number;
  contentRight: number;
  scrollWidth: number;
  clientWidth: number;
}

interface StripMeasurement {
  stripRect: DOMRect;
  stripScrollWidth: number;
  stripClientWidth: number;
  scrollBody: ScrollBodyMeasurement;
  tabs: TabMeasurement[];
  fontFamily: string;
}

/** Reads geometry off the rendered DOM only — `getBoundingClientRect` / `scrollWidth` /
 *  `clientWidth`, never `have.class`. Requires `wrapFormInScrollBodyStandIn` to have run first. */
function measureStrip() {
  return cy.get(`[data-testid="${SCROLL_BODY_TESTID}"]`).then($wrapper => {
    const wrapperEl = $wrapper[0] as HTMLElement;
    const wrapperRect = wrapperEl.getBoundingClientRect();
    const cs = getComputedStyle(wrapperEl);
    const paddingLeft = parseFloat(cs.paddingLeft) || 0;
    const paddingRight = parseFloat(cs.paddingRight) || 0;

    const strip = wrapperEl.querySelector<HTMLElement>('[role="tablist"]');
    if (!strip) throw new Error('measureStrip: no [role="tablist"] found inside the scroll-body stand-in');
    const tabEls = Array.from(strip.querySelectorAll<HTMLElement>('[role="tab"]'));
    const tabs: TabMeasurement[] = tabEls.map(tab => {
      const shortSpan = tab.querySelector<HTMLElement>('[data-testid="tab-label-short"]');
      const fullSpan = tab.querySelector<HTMLElement>('[data-testid="tab-label-full"]');
      // Exactly one of the two spans should have `display` other than `none` at a time (the
      // `@container` query toggles them) — `getClientRects()` is empty for a `display:none`
      // element, so whichever span has rects IS the one a real browser is showing.
      const visibleSpan = [shortSpan, fullSpan].find(span => !!span && span.getClientRects().length > 0) ?? null;
      return {
        ariaLabel: tab.getAttribute('aria-label'),
        visibleText: (tab.innerText || '').trim(),
        visibleLabelRectCount: visibleSpan ? visibleSpan.getClientRects().length : 0,
        rect: tab.getBoundingClientRect(),
        clientWidth: tab.clientWidth,
        scrollWidth: tab.scrollWidth
      };
    });
    const measurement: StripMeasurement = {
      stripRect: strip.getBoundingClientRect(),
      stripScrollWidth: strip.scrollWidth,
      stripClientWidth: strip.clientWidth,
      scrollBody: {
        rect: wrapperRect,
        contentLeft: wrapperRect.left + paddingLeft,
        contentRight: wrapperRect.right - paddingRight,
        scrollWidth: wrapperEl.scrollWidth,
        clientWidth: wrapperEl.clientWidth
      },
      tabs,
      fontFamily: getComputedStyle(tabEls[0] ?? strip).fontFamily
    };
    return cy.wrap(measurement, { log: false });
  });
}

interface FontStatus {
  manropeLoaded: boolean;
  materialIconsRoundLoaded: boolean;
}

/** A `FontFace` with this exact family (quotes stripped) AND `status === 'loaded'` really is on
 *  screen — unlike `FontFaceSet.check()`, which can read `true` with no matching `@font-face` at
 *  all. */
function fontIsReallyLoaded(doc: Document, family: string): boolean {
  // `FontFaceSet.forEach` (a native Set-like method), not `Array.from(doc.fonts)` — this ct
  // tsconfig's DOM lib does not resolve `FontFaceSet` as `Iterable<FontFace>` (`TS2769`), the same
  // class of incomplete-DOM-lib noise as `JQuery.each`'s `void | false` return type elsewhere in
  // this repo's CT specs.
  let found = false;
  doc.fonts.forEach(face => {
    if (face.family.replace(/"/g, '') === family && face.status === 'loaded') found = true;
  });
  return found;
}

/** Checklist item "Fonts": proves (never silently assumes) that the production text/icon faces are
 *  actually on screen in THIS Chromium. Returns the reading as a Cypress-chained value — written
 *  into `MEASURED` at the call site and asserted at every measurement (see `assertFontsLoaded`). */
function readFontStatus() {
  return cy.window().then(win => {
    // Returning a native Promise from `.then()` is auto-awaited by Cypress — no need for
    // `Cypress.Promise` (a namespace-as-value reference this ct tsconfig's `tsc` cannot resolve;
    // same class of pre-existing noise as the `expect(x, msg)` overload errors below).
    return win.document.fonts.ready.then(() => {
      const status: FontStatus = {
        manropeLoaded: fontIsReallyLoaded(win.document, 'Manrope'),
        materialIconsRoundLoaded: fontIsReallyLoaded(win.document, 'Material Icons Round')
      };
      return status;
    });
  });
}

function assertFontsLoaded(fonts: FontStatus, label: string): void {
  expect(fonts.manropeLoaded, `${label}: a loaded FontFace for "Manrope" must exist in document.fonts`).to.be.true;
  expect(fonts.materialIconsRoundLoaded, `${label}: a loaded FontFace for "Material Icons Round" must exist in document.fonts`).to.be.true;
}

/** Requester decision (attempt 3): this is the STRIP's own overflow only — this gate's actual job.
 *  A scroll-body-level check is deliberately NOT here any more (see file header, item 6): it also
 *  caught the pre-existing, out-of-scope footer bleed (PTB-G-4) and turned this test red for a
 *  reason unrelated to the tab strip. `assertContainment` below still covers per-tab placement
 *  against the real scroll-body content box. */
function assertNoOverflow(m: StripMeasurement, label: string): void {
  expect(m.stripScrollWidth, `${label}: strip scrollWidth(${m.stripScrollWidth}) <= clientWidth(${m.stripClientWidth}) — no horizontal overflow`).to.be.at.most(
    m.stripClientWidth
  );
}

function assertOneRow(m: StripMeasurement, label: string): void {
  const tops = m.tabs.map(t => Math.round(t.rect.top));
  const distinct = new Set(tops);
  expect(distinct.size, `${label}: all ${m.tabs.length} tabs share one row — tops [${tops.join(', ')}]`).to.equal(1);
}

/** Every tab rect must sit within the scroll body's CONTENT box (rect minus its own padding) —
 *  the actual scrollable-aside surrogate, not the always-equal-width tablist wrapper. Unchanged
 *  from attempt 2 (Reviewer FAIL item 3) — this is real containment coverage, independent of the
 *  footer bleed the requester deferred (PTB-G-4). */
function assertContainment(m: StripMeasurement, label: string): void {
  const EPS = 1; // sub-pixel layout jitter, real Chromium
  m.tabs.forEach(tab => {
    expect(
      tab.rect.left,
      `${label}: tab "${tab.ariaLabel}" left(${tab.rect.left.toFixed(1)}) >= scroll-body content left(${m.scrollBody.contentLeft.toFixed(1)})`
    ).to.be.at.least(m.scrollBody.contentLeft - EPS);
    expect(
      tab.rect.right,
      `${label}: tab "${tab.ariaLabel}" right(${tab.rect.right.toFixed(1)}) <= scroll-body content right(${m.scrollBody.contentRight.toFixed(1)})`
    ).to.be.at.most(m.scrollBody.contentRight + EPS);
  });
}

/** Reviewer FAIL item 1 (unchanged from attempt 2): the real D-8 symptom under `flex-1` +
 *  `min-width: auto` is a label WRAPPING (the row grows taller), not horizontal clipping. Every tab
 *  in one `[role=tablist]` shares an identical height (`align-items: stretch`, the flex default) —
 *  if any one label wraps, the WHOLE row grows uniformly, so comparing any one tab's height against
 *  the two-tab baseline height is sufficient. This is now GREEN at the narrow viewport because the
 *  short labels (attempt 3) no longer wrap. */
/**
 * Reviewer FAIL (final round): the two-tab test's `height` was only ever RECORDED as the baseline,
 * never asserted — if the two-tab labels themselves wrapped, both heights would be equal (57 vs
 * 57) and `assertSingleLine` on the three-tab strip would stay green with no real anchor. This
 * proves the baseline itself is single-line, directly on the VISIBLE label span (the one CSS is
 * actually showing, per `visibleLabelRectCount` — see `TabMeasurement`), via
 * `getClientRects().length === 1`: a wrapped label produces one rect per line, so `1` means exactly
 * one line and `0` means neither span rendered (a harness bug, called out separately).
 */
function assertVisibleLabelSingleLine(m: StripMeasurement, label: string): void {
  m.tabs.forEach(tab => {
    expect(tab.visibleLabelRectCount, `${label}: tab "${tab.ariaLabel}" has a rendered label span (getClientRects().length > 0) — 0 means neither the short nor full span painted anything`).to.be.greaterThan(0);
    expect(
      tab.visibleLabelRectCount,
      `${label}: tab "${tab.ariaLabel}" visible label must render on exactly ONE line (getClientRects().length), got ${tab.visibleLabelRectCount} — a value > 1 means it wrapped`
    ).to.equal(1);
  });
}

function assertSingleLine(m: StripMeasurement, baselineHeight: number, label: string): void {
  const heights = m.tabs.map(t => Math.round(t.rect.height));
  const maxHeight = Math.max(...heights);
  expect(
    maxHeight,
    `${label}: tab row height(${maxHeight}px) must stay within 1px of the two-tab single-line baseline(${baselineHeight}px) — a taller row means a label wrapped to a second line (D-8)`
  ).to.be.at.most(baselineHeight + 1);
}

/**
 * design.md §6.3: below 640px each tab shows its SHORT label; at/above 640px, the FULL label. The
 * accessible name (`aria-label`) is the FULL label at BOTH widths. WCAG 2.5.3 (Label in Name) is
 * asserted live: the short label must be a literal substring of its own `aria-label`.
 *
 * Compares `m.tabs` against `expected` BY DOM ORDER — a mismatched order/count is itself a finding
 * this assertion surfaces (`have.length` on `[role=tab]` already guards the count upstream).
 */
function assertLabelsForWidth(m: StripMeasurement, expected: { full: string; short: string }[], isNarrow: boolean, label: string): void {
  expect(m.tabs.length, `${label}: tab count matches the expected label list`).to.equal(expected.length);
  m.tabs.forEach((tab, i) => {
    const { full, short } = expected[i];
    expect(short.length, `${label}: fixture sanity — "${short}" must be a substring of "${full}" (WCAG 2.5.3)`).to.be.greaterThan(0);
    expect(full.includes(short), `${label}: WCAG 2.5.3 — short label "${short}" must be a substring of aria-label "${full}"`).to.be.true;

    expect(tab.ariaLabel, `${label}: tab #${i} aria-label must be the FULL label at every width`).to.equal(full);

    const expectedVisible = isNarrow ? short : full;
    expect(
      tab.visibleText,
      `${label}: tab #${i} (aria-label "${tab.ariaLabel}") visible text should be "${expectedVisible}" ${isNarrow ? '(narrow -> short)' : '(wide -> full)'}, got "${tab.visibleText}"`
    ).to.equal(expectedVisible);
  });
}

// ---------------------------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------------------------

/** Every number this spec measures, written out at the end (`after()`) so the run leaves durable
 *  evidence behind — same convention as `indicator-drawer.reported-results.cy.ts`'s `MEASURED`. */
const MEASURED: Record<string, unknown> = {};

/**
 * Two-tab baseline (min width, single-line height), per viewport label — filled by the two-tab
 * `it()` and read by the three-tab `it()` (and the second falsifier) that follow it. Deliberate
 * cross-test state: Cypress (Mocha) runs `it`s within one spec file strictly in file/definition
 * order, never in parallel, so this is safe — and it is the only reliable way to get the two-tab
 * baseline and the three-tab strip measured at the SAME aside width without a double `cy.mount()`
 * inside one test, which measurably left a stale `<form>` behind on attempt 1.
 */
const baselineTwoTab: Record<string, { minWidth: number; height: number }> = {};

function toPlainTab(t: TabMeasurement) {
  return {
    ariaLabel: t.ariaLabel,
    visibleText: t.visibleText,
    visibleLabelRectCount: t.visibleLabelRectCount,
    width: Number(t.rect.width.toFixed(2)),
    height: Number(t.rect.height.toFixed(2)),
    top: Number(t.rect.top.toFixed(2)),
    clientWidth: t.clientWidth,
    scrollWidth: t.scrollWidth
  };
}

describe('LabReportFormComponent — entry-mode tab strip geometry (PTB-T-6, PTB-AC-1/AC-2 layout half)', () => {
  after(() => {
    cy.writeFile('cypress/results/ptb-t6-tab-geometry.json', JSON.stringify(MEASURED, null, 2) + '\n');
  });

  // Cypress Component Testing does NOT reload the page between `it()`s in one spec file — any
  // `<style>` injected into `document.head` by one test is STILL THERE for the next one. Measured:
  // without this cleanup, "positive control 2"'s `max-width: 90px` was silently overridden by
  // "positive control 1"'s leftover `min-width: 260px !important` (per the CSS box model, a
  // conflicting min-width wins over max-width), so nothing wrapped and that falsifier's own
  // red-line proof was itself invalid. Strip every `ptb-t6-*`-tagged style after each test.
  afterEach(() => {
    cy.document().then(doc => {
      doc.querySelectorAll('style[data-testid^="ptb-t6-"]').forEach(el => el.remove());
    });
  });

  VIEWPORTS.forEach(({ viewport, asideWidth, label, isNarrow }) => {
    describe(`@ ${label}`, () => {
      it('two-tab (non-KP): no overflow, single line, one row, contained, correct label for this width', () => {
        cy.viewport(viewport, 900);
        mountForm(NON_KP_INDICATOR);
        wrapFormInScrollBodyStandIn(asideWidth);

        cy.get('[role="tab"]').should('have.length', 2);
        readFontStatus().then(fonts => {
          measureStrip().then(m => {
            const minWidth = Math.min(...m.tabs.map(t => t.rect.width));
            const height = Math.max(...m.tabs.map(t => Math.round(t.rect.height)));
            baselineTwoTab[label] = { minWidth, height };
            MEASURED[`${label} / two-tab`] = {
              fonts,
              tabs: m.tabs.map(toPlainTab),
              minWidth: Number(minWidth.toFixed(2)),
              height,
              fontFamily: m.fontFamily,
              stripScrollWidth: m.stripScrollWidth,
              stripClientWidth: m.stripClientWidth,
              scrollBody: {
                width: Number(m.scrollBody.rect.width.toFixed(2)),
                contentLeft: Number(m.scrollBody.contentLeft.toFixed(2)),
                contentRight: Number(m.scrollBody.contentRight.toFixed(2)),
                scrollWidth: m.scrollBody.scrollWidth,
                clientWidth: m.scrollBody.clientWidth
              }
            };

            assertFontsLoaded(fonts, `${label} two-tab`);
            assertNoOverflow(m, `${label} two-tab`);
            assertOneRow(m, `${label} two-tab`);
            assertContainment(m, `${label} two-tab`);
            assertLabelsForWidth(m, NON_KP_TABS, isNarrow, `${label} two-tab`);
            // Reviewer FAIL (final round): this is the ANCHOR the three-tab `assertSingleLine`
            // baseline depends on — without it, a wrapped two-tab baseline could equal a wrapped
            // three-tab height and the D-8 gate would stay green for the wrong reason.
            assertVisibleLabelSingleLine(m, `${label} two-tab`);
          });
        });
      });

      it('three-tab (KP), measured against the two-tab baseline: no overflow, single line (no wrap), one row, contained, per-tab MIN width floor, correct label for this width', () => {
        cy.viewport(viewport, 900);
        mountForm(KP_INDICATOR);
        wrapFormInScrollBodyStandIn(asideWidth);

        cy.get('[role="tab"]').should('have.length', 3);
        readFontStatus().then(fonts => {
          measureStrip().then(m => {
            const baseline = baselineTwoTab[label];
            expect(baseline, `${label}: two-tab baseline must have measured first (mandatory checklist order)`).to.exist;

            const widths = m.tabs.map(t => t.rect.width);
            const threeTabMinWidth = Math.min(...widths);
            // Justification for the floor: both strips share the SAME scroll-body content width
            // (the tablist's own `p-1` padding is a fixed overhead independent of tab count), so
            // going from 2 equal flex-1 tabs to 3 equal flex-1 tabs is pure arithmetic — per-tab
            // width should scale by exactly 2/3. Using the MINIMUM (not the average) tab width on
            // both sides means an uneven split cannot hide behind a healthy average. A 3px
            // tolerance absorbs sub-pixel rounding across the two mounts.
            const floor = baseline.minWidth * (2 / 3) - 3;

            MEASURED[`${label} / three-tab`] = {
              fonts,
              tabs: m.tabs.map(toPlainTab),
              fontFamily: m.fontFamily,
              stripScrollWidth: m.stripScrollWidth,
              stripClientWidth: m.stripClientWidth,
              scrollBody: {
                width: Number(m.scrollBody.rect.width.toFixed(2)),
                contentLeft: Number(m.scrollBody.contentLeft.toFixed(2)),
                contentRight: Number(m.scrollBody.contentRight.toFixed(2)),
                scrollWidth: m.scrollBody.scrollWidth,
                clientWidth: m.scrollBody.clientWidth
              },
              baselineTwoTabMinWidth: Number(baseline.minWidth.toFixed(2)),
              baselineTwoTabHeight: baseline.height,
              floorMinWidth: Number(floor.toFixed(2)),
              threeTabMinWidth: Number(threeTabMinWidth.toFixed(2)),
              threeTabMaxHeight: Math.max(...m.tabs.map(t => Math.round(t.rect.height))),
              // PTB-G-4 (out of scope, recorded — see file header item 6): logged for visibility
              // only, never asserted on here.
              scrollBodyOverflowPx: Math.max(0, m.scrollBody.scrollWidth - m.scrollBody.clientWidth)
            };

            assertFontsLoaded(fonts, `${label} three-tab`);
            assertNoOverflow(m, `${label} three-tab`);
            assertOneRow(m, `${label} three-tab`);
            assertContainment(m, `${label} three-tab`);
            assertSingleLine(m, baseline.height, `${label} three-tab`);
            assertLabelsForWidth(m, KP_TABS, isNarrow, `${label} three-tab`);
            // Advisory (Reviewer, final round): same one-line anchor applied here too, per tab.
            assertVisibleLabelSingleLine(m, `${label} three-tab`);
            expect(
              threeTabMinWidth,
              `${label}: three-tab MIN width(${threeTabMinWidth.toFixed(1)}) >= floor(${floor.toFixed(1)}) derived from the two-tab baseline MIN width(${baseline.minWidth.toFixed(1)}) * 2/3`
            ).to.be.at.least(floor);
          });
        });
      });
    });
  });

  describe('falsifiers (must go red under the named mutation, or the gate/viewport pair is wrong)', () => {
    it('positive control 1 (overflow): forcing fixed-width, non-wrapping tabs overflows the strip at the narrow viewport', () => {
      cy.viewport(NARROW.viewport, 900);
      mountForm(KP_INDICATOR);
      wrapFormInScrollBodyStandIn(NARROW.asideWidth);

      // Injected into the mounted document ONLY — never edits the component. Mirrors the task's
      // named mutation: flex-wrap:nowrap + a fixed min-width per tab that flex-1 can no longer
      // shrink below.
      cy.document().then(doc => {
        const style = doc.createElement('style');
        style.setAttribute('data-testid', 'ptb-t6-falsifier-style-overflow');
        style.textContent = '[role="tablist"] { flex-wrap: nowrap !important; } [role="tab"] { min-width: 260px !important; flex: none !important; }';
        doc.head.appendChild(style);
      });

      cy.get('[role="tab"]').should('have.length', 3);
      cy.get('[role="tablist"]').should($strip => {
        const el = $strip[0] as HTMLElement;
        MEASURED['falsifier 1 (overflow) @ narrow'] = { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, asideWidth: NARROW.asideWidth };
        expect(
          el.scrollWidth,
          `forced 260px-per-tab strip: scrollWidth(${el.scrollWidth}) must exceed clientWidth(${el.clientWidth}) at ${NARROW.asideWidth}px aside`
        ).to.be.greaterThan(el.clientWidth);
      });
    });

    it('positive control 2 (wrap / single-line gate): forcing a narrow max-width per tab wraps a label and the height gate goes red', () => {
      cy.viewport(WIDE.viewport, 900);
      const baseline = baselineTwoTab[WIDE.label];
      expect(baseline, `${WIDE.label}: two-tab baseline must have measured first (mandatory checklist order)`).to.exist;

      mountForm(KP_INDICATOR);
      wrapFormInScrollBodyStandIn(WIDE.asideWidth);

      // Forces each tab to 90px regardless of `flex-1`'s natural share of a 740px-wide aside —
      // narrower than any FULL label's longest word, so at least one label MUST wrap to a second
      // line even though the FULL label renders at this (>=640px) width.
      cy.document().then(doc => {
        const style = doc.createElement('style');
        style.setAttribute('data-testid', 'ptb-t6-falsifier-style-wrap');
        style.textContent = '[role="tab"] { max-width: 90px !important; }';
        doc.head.appendChild(style);
      });

      cy.get('[role="tab"]').should('have.length', 3);
      measureStrip().then(m => {
        const maxHeight = Math.max(...m.tabs.map(t => Math.round(t.rect.height)));
        MEASURED['falsifier 2 (wrap) @ wide'] = {
          baselineHeight: baseline.height,
          mutatedMaxHeight: maxHeight,
          tabs: m.tabs.map(toPlainTab)
        };
        // Prove it actually wrapped (grew taller) BEFORE proving the gate catches it — otherwise a
        // green assertSingleLine here could mean either "the gate works" or "the mutation didn't
        // do anything", and the disqualifier is exactly that ambiguity.
        expect(maxHeight, `forced 90px-max-width tabs: row height(${maxHeight}px) must exceed the two-tab baseline(${baseline.height}px) — the mutation must actually wrap a label`).to.be.greaterThan(
          baseline.height
        );
      });

      // Now show the SAME assertion the real (unmutated) three-tab test uses goes red here — the
      // red line asked for in the task, captured rather than left to fail the suite.
      measureStrip().then(m => {
        expect(() => assertSingleLine(m, baseline.height, `${WIDE.label} three-tab (forced wrap)`)).to.throw();
      });
    });
  });
});

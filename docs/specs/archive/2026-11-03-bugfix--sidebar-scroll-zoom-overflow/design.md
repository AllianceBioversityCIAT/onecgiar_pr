# Design — Sidebar items unreachable when root zoom is active (`bugfix/sidebar-scroll-zoom-overflow`)

## 1. Document Control

| Field | Value |
|---|---|
| Depth / mode | Lite · Bug Mode |
| Requirements | [`requirements.md`](./requirements.md) |
| Approval Mode | `gated` |
| Revision | Rewritten after Judgment Day found the first pass's root-cause conclusion was inverted by a measurement defect — see [`judgment.md`](./judgment.md) |
| Budget (tripwire for `/akili-execute`) | **3 tasks** (1 regression test, 1 fix, 1 manual real-zoom check) · **~100–180 LOC** (fix itself ~20–40 LOC CSS/template; Cypress regression test ~80–120 LOC following the `cdk-overlay-root-zoom.cy.ts` pattern) · **≤ 2 review rounds** on the fix task, **1 checklist round** on the manual task |

## 2. Executive Summary

**Confirmed defect:** the sidebar's `position:fixed; h-svh` container renders taller than the real
browser window whenever root CSS `zoom` ≠ 1. This app sets that `zoom` itself, via its text-size
control (`--pr-font-scale`: Large `1.15`, Larger `1.3`, Largest `1.5`) — so any user who picks a
non-default text size triggers the defect today, independent of browser-level zoom. Scrolling the
sidebar content to its programmatic maximum does not help, because the oversized box's trailing
content sits below the real window's bottom edge, outside what `scrollTop` can bring into view.

The fix scopes the sidebar's fixed container so its rendered **height** tracks the real viewport
regardless of root `zoom`, by compensating the `h-svh` sizing directly (`height: calc(100svh /
var(--pr-font-scale, 1))` or equivalent) — **not** by reusing the `bugfix/cdk-overlay-root-zoom`
counter-zoom pattern. That pattern was tested as a first candidate and **rejected**: because `zoom`
scales isotropically, counter-zooming the container to fix height also shrinks its rendered width
by the same factor (299px → 260px at 1.15, measured), which would open a dead gap next to the
sidebar and squeeze its content — a regression no scenario in the first design pass would have
caught. This is independently corroborated by the archived `bugfix/cdk-overlay-root-zoom` spec's
own `execution.md`, which records that exact pattern **failing** to fix an analogous `position:
fixed; h-dvh` dialog's clipping (§8, §10 `SBZ-DD-2`) — it solves anchored-overlay *position* drift,
not fixed-element *size* overflow, and should never have been cited as working prior art for this
defect class. A regression test is written first, using the same deterministic method that
confirmed the defect — set `--pr-font-scale` directly in a real browser and measure the container's
height **and width** against the real window, not a self-referential container check.

Real native OS/browser Ctrl+ zoom, independent of `--pr-font-scale`, remains a separate, lower-
priority, non-blocking manual check (`SBZ-R-3`).

## 3. Architecture Overview

```
app.component.html:12-14 (global shell, every authenticated non-focus-mode route)
  └─ <app-reporting-nav-sidebar />
       └─ <hlm-sidebar collapsible="icon">                           hlm-sidebar.ts
            ├─ sidebar-container  position:fixed; inset-y:0; h-svh   (hlm-sidebar.ts:81)
            │    └─ sidebar-inner  flex size-full flex-col           (hlm-sidebar.ts:51)
            │         (also forced via !important:
            │          reporting-nav-sidebar.component.scss:67-74 —
            │          height:100% !important; min-height:0 !important)
            │         ├─ hlmSidebarHeader  (fixed ~64px, not scrolled)
            │         └─ hlmSidebarContent  flex min-h-0 flex-1 overflow-y-auto
            │              (hlm-sidebar-content.ts:16-19, also forced via
            │               reporting-nav-sidebar.component.scss:97-104)
            │              └─ … Science Programs, Platform, About (Developers, AI use,
            │                   Terms and conditions, License)   (reporting-nav-sidebar.component.html:414-470)
```

**The defect mechanism:** `:root`'s `zoom: var(--pr-font-scale, 1)` (`styles.scss:486-487`) is
inherited down this whole tree. The `sidebar-container`'s `h-svh` resolves against the real
viewport, but the box's own rendering is then magnified by the inherited `zoom` factor — so its
actual rendered bottom edge sits at `≈100svh × factor`, past the real window's bottom edge once
`factor > 1`. Everything below `hlmSidebarContent`'s flex/overflow chain works correctly in
isolation (confirmed: P-1, P-2) — the content scrolls to its own true maximum — but that maximum is
relative to an oversized box, so the tail of the content (the About section) never enters the real,
visible window.

## 4. Extended Directory Structure

| File | Change |
|---|---|
| `docs/specs/bugfix/sidebar-scroll-zoom-overflow/investigation/` | Investigation artifacts (corrected after Judgment Day): `minimal-repro.html`, `zoom-check.js`, `README.md`, this spec's `judgment.md` |
| `onecgiar-pr-client/src/app/spartan/sidebar/src/lib/hlm-sidebar.ts` or `hlm-sidebar-wrapper.ts` | The fix — compensate root-zoom inheritance on the `sidebar-container`/`sidebar-inner` sizing layer (candidate; see §8). Touching the shared Spartan primitive means every other `hlm-sidebar` consumer benefits (today, `reporting-nav-sidebar` is the only one — P-5) |
| `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.scss` | Alternative/companion fix site if the compensation is scoped at this component's own `!important` overrides instead of the shared primitive — decided empirically in `SBZ-T-2` against the rendered-measurement checklist |
| A new Cypress spec, e.g. `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/sidebar-root-zoom-reachability.cy.ts` | Regression test, following the exact pattern of `onecgiar-pr-client/src/app/shared/services/cdk-overlay-root-zoom.cy.ts` (sets `--pr-font-scale` directly, measures real geometry in a real Chromium) rather than `minimal-repro.html`'s synthetic page |

`onecgiar-pr-client/cypress/e2e/result-detail/sidebar-collapse.cy.ts` was checked (Judgment Day
F-7): it already real-browser-tests this exact `hlm-sidebar`/`reporting-nav-sidebar` chain with
`cy.viewport()`, but for collapse/expand behavior, not root-zoom reachability. It is **not**
extended by this spec — it covers a different scenario family — but `SBZ-T-1`/`SBZ-T-2` reuse its
login/viewport harness conventions rather than inventing new ones.

## 5. Data Model

None. No persisted or transmitted data is involved.

## 6. API Design

None. No endpoint is touched.

## 7. Backend Module Design

None — client-only defect.

## 8. Frontend / UX Component Architecture

**Design routing (impeccable-bridge).** Page mode: **Operate**. Environment: **ENV-2**
(`docs/ux-ui/design.md` defines tokens/components; the code has a coherent Spartan/Helm layer).
Polish: `light`. Motion: `none`.

`Design route: load impeccable-bridge → design-routing.md; playbook adapt; ENV-2; mode Operate; polish light; motion none`

**The regression test (`SBZ-T-1`), red before the fix:**

1. Follow the `cdk-overlay-root-zoom.cy.ts` pattern: mount (or visit) the real
   `app-reporting-nav-sidebar` in a real Chromium at a viewport matching the reported class
   (1280×574 effective), set `document.documentElement.style.setProperty('--pr-font-scale',
   String(factor))` for each of `[0.9, 1, 1.15, 1.3, 1.5]` — **all five shipped values**, not only
   the three ≥1 (Judgment Day round 2, B-3: at 0.9 the container under-shoots the real viewport,
   which `SBZ-R-2`'s general "height equals the real viewport" requirement also covers, even though
   nothing becomes unreachable at that end of the range).
2. Scroll `hlmSidebarContent` to `scrollTop = scrollHeight - clientHeight`.
3. Assert the "License" link's bounding rect is fully within the **real application window's**
   viewport — **never** only within the content container's own rect, per the methodology lesson in
   `requirements.md` S-1.1's `BUT` clause and `judgment.md` F-1. In Cypress, this means reading
   `innerHeight` and `elementFromPoint` off the **application-under-test's own `window`/`document`**
   (e.g. via `cy.window()` / `$el[0].ownerDocument.defaultView`), not the test runner's own frame —
   a bare `document.elementFromPoint(...)` inside a Cypress callback resolves against the wrong
   document and silently measures nothing (Judgment Day round 2, B-5).
4. Also assert the container's **width** is unchanged relative to its own natural,
   un-compensated render at that same scale (`scale-1 width × scale` — **not** the flat
   `--pr-font-scale: 1` pixel value, since root zoom scales width isotropically too; corrected
   2026-11-03 after `SBZ-T-1`'s Reviewer found the original "flat baseline" wording contradicted
   the Premise Ledger's own P-9/P-10 measurements — see `execution.md` SBZ-T-1 §3) at every other
   scale (Judgment Day round 2, B-2) — this is what catches a fix that corrects height by
   isotropically counter-zooming the whole container (see the rejected candidate below).
5. Treat an `elementFromPoint` result of `null` and a result of **some other element** (an
   occluding overlay) as two distinct failure modes to report separately — both fail the
   reachability assertion, but only the second is an occlusion bug; `null` at an off-screen
   coordinate is the expected signature of this spec's confirmed mechanism, not independent proof
   that "nothing is painted there" in every sense (Judgment Day round 2, B-5).
6. Repeat with "My Admin" / "Admin module" both expanded and collapsed (the report's own control).
7. **Additional check (info-level, Judgment Day round 1 F-9):** also verify the "License" link is
   reachable via `Tab`-key keyboard focus (a distinct path from programmatic/mouse scroll) —
   `cy.get('a[href]').last().focus()` or repeated `Tab` presses, asserting the focused element's
   rect ends up within the real viewport.
8. **Expected red, quoted from the investigation:** at `--pr-font-scale` 1.15/1.3/1.5, the height
   assertion in step 3 fails because the content container's bottom (`≈660/746/861px` at
   1.15/1.3/1.5 on a 574px viewport) and the last item's bottom both exceed the real viewport
   height (`investigation/zoom-check.js`, re-run 2026-11-03). At `--pr-font-scale` 1, the same
   assertions pass today — the test's control case, not expected to go red.

**The fix candidate (`SBZ-T-2`), empirically tested, not assumed:**

Compensate the `h-svh` **height only** on the sidebar's fixed container — e.g.
`height: calc(100svh / var(--pr-font-scale, 1))` — without touching the `zoom` property itself.
Measured on the minimal repro (`investigation/fix-candidates-check.js`) at `--pr-font-scale: 1.15`:
height corrects to the real `574px` and **width stays at its natural, zoomed value of `299px`**
(the same as the unfixed render at this scale: `260px` authored × `1.15` — **not** the scale-1
authored value of `260px` itself) — no side effect. (Wording corrected 2026-11-03: the original
"unzoomed `299px`" phrasing was backwards — 299 is the zoomed render, 260 is the unzoomed/scale-1
value — see `execution.md` SBZ-T-1 §3.)

**Rejected candidate, tested and ruled out:** counter-zooming the container (`zoom: calc(1 /
var(--pr-font-scale))`) and re-zooming its content — the pattern `bugfix/cdk-overlay-root-zoom`
shipped for CDK overlays. On the same minimal repro this also corrects height to `574px`, but
because `zoom` scales isotropically it **also shrinks the container's rendered width to `260px`**
(from `299px`) — a regression (a dead gap next to the sidebar, squeezed content) that no scenario in
this design's first pass would have caught. This is not merely a side effect found here: the
archived `bugfix/cdk-overlay-root-zoom` spec's own `execution.md` (lines 116, 205) already recorded
this exact pattern **failing** to fix clipping on an analogous `position:fixed; h-dvh` dialog — it
corrects anchored-overlay *position* drift, not fixed-element *size* overflow, and should not have
been cited as supporting prior art for this defect class in the first version of this design
(`judgment.md` round 2, B-1).

Candidate target for the height-only fix: `sidebar-container` (`hlm-sidebar.ts:81`) or the
equivalent `!important` block in `reporting-nav-sidebar.component.scss:67-74` — decided by running
`SBZ-T-1`'s test against the live component (not re-assuming the minimal repro's exact numbers
transfer, per P-6). The content inside (`hlmSidebarContent` and its descendants) is untouched and
keeps scaling with `--pr-font-scale` per DD-11's intent — this is a sizing fix, not a feature
removal.

**Out of scope, acknowledged explicitly (Judgment Day round 2, B-8):** other `position:fixed` +
viewport-unit elements already known to share this defect class — e.g. the AI-processes drawer
(`position:fixed; h-dvh`, archived `cdk-overlay-root-zoom` `execution.md:116,205`) — are **not**
fixed by this spec. That sighting is prior evidence the defect class is real and recurring, not a
component this spec touches; it remains open as a separate, already-identified defect.

**`SBZ-R-3`'s manual check (`SBZ-T-3`):** real Ctrl+ zoom at the exact percentages QA reported
(110%, 115%, 120%, 125%), first with `--pr-font-scale` at Default, then combined with
Large/Larger/Largest (DD-11: native zoom "stacks on top"). This does not block **shipping**
`SBZ-T-1`/`SBZ-T-2`'s fix, but per `requirements.md` SBZ-R-3 it **is required before this spec is
marked closed** — it is the only check that verifies the originally reported scenario itself, as
opposed to the confirmed-but-distinct `--pr-font-scale` trigger this spec fixes (Judgment Day round
2, B-6).

## 9. Shared Contracts or Package Extensions

If the fix lands in `hlm-sidebar.ts` (the shared Spartan primitive) rather than
`reporting-nav-sidebar.component.scss` (this component's own override layer), every `hlm-sidebar`
consumer benefits — and per P-5, `reporting-nav-sidebar` is currently the **only** consumer in this
client, so the blast radius is already fully accounted for; no other component needs re-checking.

## 10. Design Decisions

| ID | Decision | Rejected alternative |
|---|---|---|
| SBZ-DD-1 | Regression test first (TDD), measuring against the real window viewport (`window.innerHeight`, `elementFromPoint`) — never a container-only containment check | The first investigation pass's own container-only check — rejected because it is provably unable to detect this defect class (it is trivially true once `scrollTop` is pinned); keeping it would ship a test that always passes |
| SBZ-DD-2 | Fix compensates `h-svh` **height only** (`height: calc(100svh / var(--pr-font-scale, 1))` on the container), verified empirically on both the minimal repro and (in `SBZ-T-2`) the live component | **The `bugfix/cdk-overlay-root-zoom` counter-zoom pattern** — tested and rejected (`investigation/fix-candidates-check.js`): it also fixes height but shrinks the container's rendered width by the same factor (isotropic `zoom`), a regression no scenario would have caught; independently corroborated by that archived spec's own `execution.md` recording this pattern failing to fix an analogous `h-dvh` dialog's clipping. Citing it as working prior art, as the first version of this design did, was itself the mistake this decision corrects (`judgment.md` round 2, B-1) |
| SBZ-DD-3 | `SBZ-R-3` (real native Ctrl+ zoom) is a separate, non-blocking manual check, not a gate on the confirmed-trigger fix | Blocking the fix on a real-browser Ctrl+ check (the first pass's approach) — rejected because the primary trigger is now deterministically confirmed and reproducible without needing OS-level zoom automation at all |

No design decision here reverts previously shipped behavior in a way that removes a capability —
the fix narrows an existing sizing defect, it does not disable the text-size feature. The Step 2.3
reversion challenge does not apply.

## 11. Premise Ledger

**Count:** 10 verified · 1 `UNVERIFIED`. Every row's own Impact is Low (the single `UNVERIFIED` row,
P-8, included) — no row carries High impact, so none gates the confirmed-trigger fix.
**Blast-radius triggers:** `live-path` fires (P-5, unchanged). `consumer` fires if the fix lands in
the shared `hlm-sidebar.ts` — row P-5 already establishes `reporting-nav-sidebar` as the sole
current consumer, so this check is satisfied by that row; no additional consumer exists to miss.
`shared-state`: none apply — no state or lifecycle hook is changed, only CSS sizing.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | The sidebar's scroll column computes its scrollable height purely via CSS flexbox (`flex-1 min-h-0 overflow-y-auto`); no JS reads or caches a pixel height for it. | existence | `onecgiar-pr-client/src/app/spartan/sidebar/src/lib/hlm-sidebar-content.ts:16-19` (the `classes()` call), cross-checked with a repo-wide grep for `scrollHeight\|scrollTop\|clientHeight\|ResizeObserver` across `reporting-nav-sidebar.component.ts` and `spartan/sidebar/` (zero hits outside spec files) | `c19e6df51` | The fix target would be a JS computation instead of CSS, changing `SBZ-T-2`'s approach entirely. Impact: Low (the regression test's measurement approach is unaffected either way) | — (verified) |
| P-2 | The sidebar's outer container is `position:fixed; inset-y:0; h-svh`, with `sidebar-inner` as `flex size-full flex-col` — the content column is bounded by the viewport, not document flow. | existence / location | `onecgiar-pr-client/src/app/spartan/sidebar/src/lib/hlm-sidebar.ts:81` (container), `:51` (sidebar-inner) | `c19e6df51` | The oversized-fixed-box mechanism in §3 would be wrong, and the fix site would move. Impact: Low (still found empirically via the regression test) | — (verified) |
| P-3 | A minimal page reproducing the P-1/P-2 CSS chain, measured against the real window viewport (not its own container), reproduces the "last item unreachable" defect at root `zoom` ≥1.15. | other | `docs/specs/bugfix/sidebar-scroll-zoom-overflow/investigation/zoom-check.js`, re-run 2026-11-03 against `minimal-repro.html`: at zoom 1.15/1.3/1.5, `actuallyWithinWindowViewport: false` and `elementFromPointIsLastOrDescendant: false`; at zoom 1, both are `true`. Command reproduces as committed (`node zoom-check.js` from `investigation/`) | standalone, not commit-pinned (re-run 2026-11-03) | The confirmed-defect framing of this whole design would be wrong, and the spec would revert to the original investigate-first structure. Impact: Low (the fix would simply not be needed, not a silent wrong fix) | — (verified) |
| P-4 | This app's own text-size control is a real, already-shipped production path that sets root `zoom` to exactly the values the investigation tested (Large=1.15, Larger=1.3, Largest=1.5), via `html { zoom: var(--pr-font-scale) }`. | existence | `onecgiar-pr-client/src/app/shared/services/font-scale.service.ts:25-29` (the `FONT_SCALE_OPTIONS` factors) and `onecgiar-pr-client/src/styles.scss:486-487` (`--pr-font-scale: 1; zoom: var(--pr-font-scale, 1);` on `:root`) | `c19e6df51` | The defect would be purely theoretical (CSS-zoom-only, no real trigger), and this spec would downgrade back to a non-blocking investigation. Impact: Low (P-3 already proves the CSS mechanism is broken regardless of what sets `zoom`) | — (verified) |
| P-5 | `app-reporting-nav-sidebar` is the sole primary navigation, mounted unconditionally for every authenticated route except full-screen QA mode and focus mode, and is the only current consumer of `hlm-sidebar`. | existence / live-path, consumer | `onecgiar-pr-client/src/app/app.component.html:12-14` (mounting condition); no second `<hlm-sidebar` or `hlmSidebarContent` consumer found in a repo-wide grep | `c19e6df51` | A fix in the shared Spartan primitive would need a second consumer re-checked; a fix in `reporting-nav-sidebar.component.scss` would be unaffected either way. Impact: Low | — (verified) |
| P-6 | `reporting-nav-sidebar.component.scss` forces `[data-slot='sidebar-inner']` (`height:100% !important; min-height:0 !important`) and `[data-slot='sidebar-content']` (`flex:1 1 0 !important; min-height:0 !important; overflow-y:auto !important`) via `!important`, differing in exact padding/flex shorthand from `minimal-repro.html`'s simplified values but matching the same flex/overflow *shape*. | existence / data-env | `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.scss:67-74,97-104` | `c19e6df51` | The minimal repro's conclusion (P-3) might not transfer exactly to the live component's rendered numbers (paddings differ), though the mechanism (fixed + viewport unit + zoom) is unaffected. Impact: Low — `SBZ-T-1`'s regression test runs against the real component, not the minimal page, so this gap is closed by that task regardless | `SBZ-T-1` (runs against the live component, superseding the minimal page's exact numbers) |
| P-7 | Archived `bugfix/cdk-overlay-root-zoom`'s own `execution.md` recorded, out of its own scope, this exact pattern (counter-zoom the container, re-zoom content) **failing** to fix an analogous sighting of the same defect class: a `position:fixed; h-dvh` dialog still clipped vertically at root `zoom` 1.5, "identical" with or without the fix in place. | existence | `docs/specs/archive/2026-10-06-bugfix--cdk-overlay-root-zoom/execution.md:116,205` | `c19e6df51` | This row is now **counter-evidence against reusing that pattern**, not supporting prior art — the first version of this design cited it backwards (`judgment.md` round 2, B-1). If this citation were wrong (the dialog sighting was actually fixed elsewhere), the case against the counter-zoom candidate would rest on P-9 alone, which is sufficient on its own. Impact: Low | — (verified) |
| P-8 | Real native OS/browser Ctrl+ zoom, independent of `--pr-font-scale`, also reproduces this same unreachability. | `other` | No primary source in this repository settles this; a CDP layout-viewport-shrink emulation (approximating real zoom) did **not** show the defect, but that is an approximation of one browser engine's zoom implementation, not a real Ctrl+ keystroke test | `UNVERIFIED — confirm at source before relying on it` | If true, `SBZ-T-2`'s fix (keyed to `--pr-font-scale`, the only root-zoom signal this app's CSS can read — `SBZ-R-2`'s "Scope honesty" note) does **not** by construction cover a native-zoom-alone case, and a follow-up spec would be needed. If false, `SBZ-R-3` closes as "not reproducible with real zoom alone", matching the emulation. Impact: Low either way — it does not change what ships in `SBZ-T-2` | `SBZ-T-3` (manual real-zoom check, non-blocking for shipping but gates closing this spec per `SBZ-DD-3` and `SBZ-R-3`) |
| P-9 | The rejected `bugfix/cdk-overlay-root-zoom`-style candidate (counter-zoom the container, re-zoom its content) fixes the container's height but also shrinks its rendered width by the same factor (299px → 260px at `--pr-font-scale: 1.15`), because `zoom` scales isotropically. | other | `docs/specs/bugfix/sidebar-scroll-zoom-overflow/investigation/fix-candidates-check.js`, run 2026-11-03 against `minimal-repro.html`: `containerWidth` goes from 299 (the natural, un-compensated render at zoom 1.15 — i.e. the scale-1 width of ~260px × 1.15, **not** the scale-1 value itself) to 259.98 under this candidate at zoom 1.15 — a collapse back toward the unzoomed ~260px value (wording corrected 2026-11-03, see `execution.md` SBZ-T-1 §3) | standalone, not commit-pinned (re-run 2026-11-03) | This is the premise that drove rejecting the candidate (`SBZ-DD-2`). If false (no width regression), the candidate would still be disfavored by P-7, but could be reconsidered. Impact: Low — the decision is already made and recorded; re-opening it would only matter if `SBZ-T-2`'s chosen candidate (height-only) itself failed empirically | — (verified) |
| P-10 | Height-only compensation (`height: calc(100svh / var(--pr-font-scale, 1))` on the container, `zoom` left untouched) fixes the container's height to the real viewport without changing its width, on the minimal repro. | other | `docs/specs/bugfix/sidebar-scroll-zoom-overflow/investigation/fix-candidates-check.js`, run 2026-11-03: `containerHeight: 574`, `containerWidth: 299` (unchanged from the natural, un-compensated render at this same zoom level — **not** the scale-1 value of ~260px; wording corrected 2026-11-03, see `execution.md` SBZ-T-1 §3), `reachable: true` at zoom 1.15 | standalone, not commit-pinned (re-run 2026-11-03) | If this candidate failed on the live component (unlike the minimal repro), `SBZ-T-2` would need a different site or a variant of this approach — `SBZ-T-1`'s regression test, run against the live component, is exactly the check that would catch that. Impact: Low | `SBZ-T-1`/`SBZ-T-2` (re-verifies against the live component per P-6) |
| P-11 | `SBZ-T-1`'s CT harness must mount `app-reporting-nav-sidebar` through the same `hlmSidebarWrapper` wiring production uses (`app.component.html:11-13`) for the width-discrimination assertion (case 2) to mean anything: without it, `--sidebar-width` is unset, `hlm-sidebar.ts`'s `w-(--sidebar-width)` (no fallback) resolves to `auto`, and the container's width becomes content-driven instead of a real length — which cannot discriminate an isotropic counter-zoom regression. | existence | `onecgiar-pr-client/src/app/spartan/sidebar/src/lib/hlm-sidebar.ts:91` (`w-(--sidebar-width)`, no fallback) and `hlm-sidebar-wrapper.ts:10-11` (binds `--sidebar-width`); confirmed by actually running the Falsifier against the now-wrapped harness, with cases 1+3 (reachability) reordered to assert BEFORE case 2 (width) in the same `it()` (SBZ-T-2 attempt 3 — attempt 2's run used the old order, where Mocha/Chai's stop-at-first-failure behaviour meant case 1 never actually ran at the scales where case 2 failed, so its "case 1 stayed 5/5 green" line was an inference borrowed from the separate keyboard-focus describe block, not an observation from this `it()`): natural run (case 2 enabled) → 9/25 passing, all 16 failures carrying case 2's own width-assertion message, never a case-1/3 message, which — given the new assert order and Mocha/Chai's stop-at-first-failure behaviour — proves cases 1+3 already passed in each of those 16 tests; a diagnostic run with case 2's `expect()` temporarily disabled → 25/25 passing, directly confirming cases 1+3 pass under the candidate in isolation; case 2 re-enabled (file confirmed byte-identical to its pre-diagnostic state) → back to 9/16, confirming the split is stable | SBZ-T-2 attempt 3 (standalone, not commit-pinned at ledger write time) | If false, the harness fix in this attempt was unnecessary — but the executed Falsifier already empirically confirms case 2 only discriminates once the wrapper is present. Impact: Low | SBZ-T-2 (harness fix in `sidebar-root-zoom-reachability.cy.ts`'s `mountSidebar()` + reordered, executed Falsifier) |

**Hand-off.** P-6, P-8, P-9, P-10 and P-11 are each owned by a task per the hand-off rule: P-6, P-9
and P-10 by `SBZ-T-1`/`SBZ-T-2` (the regression test and fix run against the live component, which
settles the live numbers regardless of the minimal page's approximation), P-8 (`UNVERIFIED`) by
`SBZ-T-3`, P-11 by `SBZ-T-2` (harness correction + executed Falsifier). No row carries High impact —
the one `UNVERIFIED` row (P-8) does not gate the confirmed-trigger fix, per `SBZ-DD-3`.

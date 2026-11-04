# Requirements — Sidebar items unreachable when root zoom is active (`bugfix/sidebar-scroll-zoom-overflow`)

## 1. Document Control

| Field | Value |
|---|---|
| Module | `onecgiar-pr-client` — shared app shell (`reporting-nav-sidebar`) |
| Depth / mode | **Lite · Bug Mode** |
| Status | draft |
| Ticket | QA report, prtest.ciat.cgiar.org (TEST), no Jira id supplied |
| Proposal | none — specified directly from the QA report |
| Approval Mode | `gated` |
| Root cause | **Confirmed** (revised after Judgment Day, see §2 and `judgment.md`) — `position:fixed; h-svh` sidebar container exceeds the real browser viewport whenever root CSS `zoom` ≠ 1 |
| PRD | `AC-1` (a result can be completed and submitted) depends on the sidebar's "About" links (Terms and conditions, License) staying reachable; no numbered PRD requirement covers sidebar navigation specifically |
| ID prefix | `SBZ` |

## 2. Context

QA reported that on the Results Framework & Reporting home page, with the sidebar expanded (full
menu with labels) and browser zoom at 110% or higher on a ~574px-tall viewport, the sidebar's
internal scroll reaches its programmatic maximum before the "About" section's last items
("Terms and conditions", "License") are visible — there is no way to scroll further.

**Root-cause history (this section was rewritten once, after a Judgment Day review caught a
measurement defect in the first investigation pass — see `judgment.md` for the full record):**

1. **First pass (incorrect conclusion).** The sidebar's scroll column is plain CSS flexbox
   (`flex-1 min-h-0 overflow-y-auto`) inside a `position:fixed; inset-y:0; h-svh` container
   (`onecgiar-pr-client/src/app/spartan/sidebar/src/lib/hlm-sidebar.ts`, `hlm-sidebar-content.ts`)
   — no JS computes or caches the scroll height, so the report's own "likely cause" guess (a
   cached pixel value) was already ruled out. A minimal repro of that chain was built and checked
   under `document.documentElement.style.zoom`, but the check only tested whether the last item
   sat inside **its own container's** bounding rect — a containment test that is trivially true
   once `scrollTop` is pinned to `scrollHeight`, regardless of whether the container itself still
   fits inside the real browser window. That flaw produced a false "does not reproduce" result.
2. **Judgment Day correction.** Re-measuring the same minimal repro against `window.innerHeight`
   and `document.elementFromPoint()` (not the container's own rect) at `zoom` 1.15/1.3/1.5 on a
   1280×574 viewport shows the last item's bounding rect **exceeds the real window**
   (`actuallyWithinWindowViewport: false`) and `elementFromPoint` at its center returns `null` —
   genuinely nothing is painted there. The defect **does reproduce**. Evidence, the corrected
   script, and the original (flawed) one are in `investigation/`.
3. **The trigger is a confirmed, already-shipped production code path — not a browser-automation
   artifact.** `docs/ux-ui/design.md` DD-11 documents this app's own text-size control: `html {
   zoom: var(--pr-font-scale) }` (`onecgiar-pr-client/src/styles.scss:486-487`), driven by
   `FontScaleService`. Its "Large" option sets the factor to **1.15**
   (`onecgiar-pr-client/src/app/shared/services/font-scale.service.ts:27`) — the same number as
   QA's 115% zoom row, though nothing in the report confirms QA deliberately chose that value to
   match the feature; it is a confirmed numeric coincidence, not a proven causal link to the QA
   session's own setup. **What IS confirmed independent of that coincidence: any user who selects
   Large, Larger (1.3), or Largest (1.5) text size triggers this defect today, with zero need for
   browser-level zoom.** The QA report's framing ("browser zoom Ctrl +") named a plausible but
   still-unconfirmed secondary trigger (`SBZ-R-3`); the confirmed, reproducible-on-demand trigger is
   the app's own accessibility feature.
4. **Prior art in this exact codebase, previously undersold.** The archived
   `docs/specs/archive/2026-10-06-bugfix--cdk-overlay-root-zoom/` spec fixed CDK overlay
   *positioning* drift under root `zoom`, but its own `execution.md` separately records an
   **unfixed** sighting of the same defect class: a `position:fixed; h-dvh` dialog clipped
   vertically at `zoom` 1.5, noted as pre-existing and out of that spec's scope. This sidebar bug
   is that same defect class (`position:fixed` + a viewport unit + root `zoom`), now confirmed a
   second time.
5. **Real native OS/browser Ctrl+ zoom, independent of the app's own text-size setting, remains
   genuinely unconfirmed.** A layout-viewport-shrink emulation (approximating how real browser
   page zoom actually resolves `vh`/`svh` — by shrinking the effective CSS-px viewport before
   layout, rather than magnifying an already-laid-out box) did **not** reproduce the defect in
   this investigation. Per DD-11, native zoom "stacks on top of" the app's own `--pr-font-scale`,
   so a user combining both would compound an already-broken state. This narrower, lower-priority
   question is `SBZ-R-3` below — it does not block the fix for the confirmed trigger.

## 3. Glossary

| Term | Meaning |
|---|---|
| Root `zoom` | The CSS `zoom` property this app sets on `:root` (`zoom: var(--pr-font-scale, 1)`, `styles.scss`), driven by the user's text-size preference (`FontScaleService`: Small 0.9, Default 1, Large 1.15, Larger 1.3, Largest 1.5). Distinct from native browser page zoom (Ctrl + / −), which DD-11 says "stacks on top". |
| Real / native zoom | Browser-native page zoom (Ctrl + / Ctrl −, or the browser's zoom menu). Changes the layout viewport's effective CSS-px dimensions *before* layout, unlike root `zoom`. |
| Sidebar scroll column | The `hlmSidebarContent` element inside `app-reporting-nav-sidebar` (full/expanded state) — the single scrollable region holding Science Programs, Platform links, and the About section. |
| About section | The sidebar's last group: Developers, AI use in PRMS, Terms and conditions, License (`reporting-nav-sidebar.component.html` ~L414-470). |

## 4. Scope

| In | Out |
|---|---|
| Expanded (full-menu) sidebar reachability at every `--pr-font-scale` value the app ships (0.9, 1, 1.15, 1.3, 1.5) | Collapsed icon-rail state and its flyout (different DOM, not reported) |
| A fix for the confirmed `position:fixed` + `h-svh` + root-`zoom` sizing defect, that does not regress the container's width | Mobile sheet variant of the sidebar |
| One manual check of real native Ctrl+ zoom, independent of and combined with `--pr-font-scale` (`SBZ-R-3`, lower priority, does not block shipping the fix but gates closing this spec) | Any other screen's layout at non-default text size (separate from this component) |
| — | Other already-identified `position:fixed` + viewport-unit elements sharing this defect class (e.g. the AI-processes drawer, `docs/specs/archive/2026-10-06-bugfix--cdk-overlay-root-zoom/execution.md:116,205`) — a real, separate, already-open defect, not fixed here |

**Correction from the first pass:** `--pr-font-scale` was previously listed as Out of Scope,
reasoning it was "already covered by DD-11". That was wrong — DD-11's fix (`bugfix/cdk-overlay-
root-zoom`) covers CDK overlay *positioning* only; it never touched `position:fixed` *sizing*, which
is this defect. `--pr-font-scale` is now explicitly In Scope as the confirmed trigger.

## 5. Stakeholders

| Persona | What changes |
|---|---|
| Any authenticated user with the text-size preference set to Large, Larger, or Largest | Can reach every sidebar item, including About section links, once fixed — today they cannot |
| Low-vision users (the control's intended audience, WCAG 2.2 §1.4.4) | The accessibility feature currently breaks navigation it should support |
| Platform admin / legal | Terms and conditions / License must stay reachable at every supported text size |

## 6. Functional Requirements

### SBZ-R-1 — Confirmed defect: sidebar content exceeds the real viewport under root zoom

WHEN the root CSS `zoom` is any value other than `1` (i.e. `--pr-font-scale` ≠ 1), the sidebar's
`position:fixed; h-svh` container's rendered height SHALL NOT exceed the real browser window's
height, so that scrolling its content to the programmatic maximum (`scrollTop = scrollHeight -
clientHeight`) brings every item — including the About section's last item, "License" — within the
real, visible window.

#### Scenario S-1.1: The confirmed defect (regression, red before the fix)
- GIVEN the user's text-size preference is Large (`--pr-font-scale: 1.15`), Larger (`1.3`), or
  Largest (`1.5`)
- AND the sidebar is expanded on a viewport short enough that the full menu does not fit
  (the reported class: ~574px usable height)
- WHEN the sidebar content is scrolled to `scrollTop = scrollHeight - clientHeight`
- THEN the "License" item's bounding rect is fully inside `window.innerHeight` (not just inside
  its own container's rect)
- AND `document.elementFromPoint()` at the "License" link's center resolves to that link or a
  descendant of it, not `null` and not another element
- BUT it must NOT be judged only by containment within the sidebar's own container — that check is
  trivially true once `scrollTop` is pinned and was the exact flaw that hid this defect in the
  first investigation pass
- AND IT MUST hold whether the "My Admin" / "Admin module" submenus are expanded or collapsed (the
  original report's own control, ruling out menu length as the variable)

#### Scenario S-1.2: No regression at default text size or in the collapsed rail
- GIVEN `--pr-font-scale` is `1` (Default), or the sidebar is collapsed to the icon rail at any
  text size
- WHEN the user scrolls (expanded) or opens a flyout (collapsed)
- THEN today's behavior is unchanged

### SBZ-R-2 — The fix corrects height without regressing width or disabling the feature

The fix SHALL correct the sidebar's `position:fixed` container's rendered height to match the real
viewport, reading the app's own `--pr-font-scale` value (the only root-zoom mechanism this app's
CSS can observe) — at every value the app ships (0.9, 1, 1.15, 1.3, 1.5) — **without** changing the
container's rendered width and without disabling or special-casing the text-size feature.

**Scope honesty (Judgment Day round 2, B-4):** a fix keyed to `--pr-font-scale` corrects every
confirmed trigger (the text-size control, alone or combined with native zoom per DD-11's
"stacks on top"). It does **not** by construction fix a hypothetical case of real native Ctrl+ zoom
acting *alone* with `--pr-font-scale` at Default — native zoom sets no CSS custom property this
app's styles can read. That narrower case is `SBZ-R-3`'s job to even determine exists; if `SBZ-T-3`
finds it does, it is a follow-up, not something silently covered by this requirement.

#### Scenario S-2.1
- GIVEN any value of `--pr-font-scale` the app can produce (0.9, 1, 1.15, 1.3, 1.5)
- WHEN the sidebar renders
- THEN its `position:fixed` container's rendered height equals the real viewport height, within
  rendering tolerance
- BUT it must NOT shrink the container's rendered width relative to its own natural,
  un-compensated render at that same `--pr-font-scale` value — i.e. width must stay proportional
  to scale (`scale-1 width × scale`), not collapse back toward the flat scale-1 pixel value — the
  exact regression the rejected `bugfix/cdk-overlay-root-zoom`-style counter-zoom candidate
  produces (see `design.md` §8, §10 `SBZ-DD-2`). (Wording corrected 2026-11-03: the original
  "relative to its own width at `--pr-font-scale: 1`" phrasing was ambiguous between "flat" and
  "proportional" and, read literally as "flat," would have passed the rejected candidate and
  failed the accepted fix — see `execution.md` SBZ-T-1 §3.)
- AND it must NOT achieve the height correction by disabling or special-casing the text-size
  feature (DD-11's content-still-scales intent stays — this is a sizing fix, not a feature removal)

### SBZ-R-3 — Real native browser zoom (non-blocking for shipping, gates closing this spec)

A one-time manual check SHALL confirm whether real native Ctrl+ zoom, at the exact percentages QA
reported (110%, 115%, 120%, 125%), independent of and then combined with `--pr-font-scale` ≠ 1,
reproduces the same or a related defect.

#### Scenario S-3.1
- GIVEN real Ctrl+ zoom at 110–125%, `--pr-font-scale` at Default
- WHEN the same scroll-to-max check is performed
- THEN record whether the item is reachable (this investigation's layout-viewport-shrink emulation
  suggests yes, but is not a substitute for a real check — see the defect-class table)

#### Scenario S-3.2
- GIVEN real Ctrl+ zoom at 110–125%, `--pr-font-scale` at Large or higher
- WHEN the same check is performed
- THEN record the result; per DD-11 the two stack, so this is the worst-case combination

`SBZ-R-3`'s outcome does not gate **shipping** the `SBZ-R-1`/`SBZ-R-2` fix. It **does** gate marking
this spec closed: `SBZ-R-1`/`SBZ-R-2` fix a confirmed trigger that is real but distinct from the
originally reported one (browser zoom), and closing the spec without ever checking the original
report's own scenario would leave it formally unverified (Judgment Day round 2, B-6).

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Accessibility** | The text-size control (WCAG 2.2 §1.4.4 Resize Text) MUST NOT itself break navigation — About-section links MUST remain reachable at every supported text size. |
| **Regression safety** | No change to the collapsed icon-rail state, its flyout, or sidebar behavior at Default text size. No change to the text-size control's content-scaling intent (DD-11). |
| **Consistency with precedent, applied correctly** | The fix MUST be checked against the `bugfix/cdk-overlay-root-zoom` precedent before reuse, not assumed compatible: that spec's own counter-zoom pattern was tested here and found to regress width when applied to this sizing problem (it solves overlay *position* drift, not fixed-element *size* overflow — see `design.md` §8, §10 `SBZ-DD-2`). The fix SHALL use height-only compensation instead. |

### Defect classes and the gate that catches each

| Defect class | Gate |
|---|---|
| Guessed-cause fix shipped without measuring against the real viewport (this spec's own first-pass mistake) | **Fixed by this correction**: every scenario above measures against `window.innerHeight` / `elementFromPoint`, never a self-referential container-only containment check — `SBZ-T-1`/`SBZ-T-2` |
| `position:fixed` + viewport-unit sizing defect under root `zoom` (the confirmed mechanism) | Automated: a Cypress test setting `--pr-font-scale` directly on `document.documentElement` and measuring real geometry — same pattern as the existing `onecgiar-pr-client/src/app/shared/services/cdk-overlay-root-zoom.cy.ts` — `SBZ-T-1` (red), `SBZ-T-2` (green) |
| A fix that corrects height by isotropically counter-zooming the container, regressing its rendered width (this spec's own second near-miss, caught by Judgment Day before it reached `tasks.md`) | Automated: `SBZ-T-1`'s width-unchanged assertion (S-2.1's `BUT` clause) — `SBZ-T-1`, `SBZ-T-2` |
| An element overlapping the sidebar's bottom (ruled out as the mechanism here, but kept as a check) | Real-browser `elementFromPoint` check at the last item's center, distinguishing `null` (off-screen) from a different element (true occlusion) |
| Real native OS/browser Ctrl+ zoom, independent of `--pr-font-scale` | **No automated substitute** — the one genuinely unautomatable class in this spec, deferred to `SBZ-R-3`/`SBZ-T-3` as a manual check that gates closing the spec, not shipping the fix |

## 8. Requirement ID Index

| ID | Title | Tasks |
|---|---|---|
| SBZ-R-1 | Confirmed defect: content exceeds real viewport under root zoom (S-1.1, S-1.2) | SBZ-T-1 |
| SBZ-R-2 | Fix generalizes to root zoom, not just `--pr-font-scale` (S-2.1) | SBZ-T-2 |
| SBZ-R-3 | Real native zoom, manual, non-blocking (S-3.1, S-3.2) | SBZ-T-3 |

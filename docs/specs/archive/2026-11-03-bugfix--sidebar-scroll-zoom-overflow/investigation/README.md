# Investigation artifacts — SBZ

Supports Premise Ledger rows **P-3** and **P-4** in [`../design.md`](../design.md). Revised after
a Judgment Day review found a measurement defect in the first pass — see
[`../judgment.md`](../judgment.md) for the full finding record.

- `minimal-repro.html` — standalone page mirroring the real CSS chain for the expanded sidebar's
  scroll column: `position:fixed; inset-y:0; h-svh` (sidebar-container, `hlm-sidebar.ts`) →
  `flex flex-col h-full` (sidebar-inner) → fixed `64px` header → `flex-1 min-h-0 overflow-y-auto`
  content (`hlm-sidebar-content.ts`), with 20 stacked items so the list overflows a 574px-tall
  viewport.
- `zoom-check.js` — loads `minimal-repro.html` in a real Chromium (not jsdom) via Playwright,
  sets `document.documentElement.style.zoom` to each of this app's real `--pr-font-scale` values
  (1, 1.15, 1.3, 1.5), scrolls the content to `scrollTop = scrollHeight`, and measures the last
  item **against the real window** (`window.innerHeight`, `document.elementFromPoint()`) — not
  just against its own container's rect.

## Result (re-run 2026-11-03, after the Judgment Day correction)

At `zoom = 1` (Default text size): the last item is fully within `window.innerHeight` and
`elementFromPoint` resolves to it — reachable, as expected.

At `zoom = 1.15` (Large), `1.3` (Larger), and `1.5` (Largest) — **the real, shipped values of this
app's own text-size control** (`font-scale.service.ts`): the content container's bottom edge
(e.g. 660px at 1.15) exceeds the real 574px window, the last item's bottom (652px) is also past
the real window edge, and `elementFromPoint` at its center returns `null` — nothing is painted
there. **The defect reproduces** on this minimal but architecturally faithful page, for every
non-default text-size value this app ships.

## What changed from the first version of this investigation

The first version of this script and its conclusion were **wrong**. It only checked whether the
last item's rect sat inside the content container's own rect
(`lastItemBottom <= containerBottom`). That check is trivially true once `scrollTop` is pinned to
`scrollHeight` — the item is always "inside the container" by construction, regardless of whether
the container itself still fits inside the real browser window. Because this `position:fixed;
h-svh` container's rendered height exceeds the real viewport once root `zoom` ≠ 1, the old check
could never have caught the actual defect. A Judgment Day review (two blind judges, one of whom
built and ran the corrected check above) caught this; see `../judgment.md` finding F-1.

## How to re-run

```bash
# Requires a local Playwright-compatible Chromium (see your ms-playwright cache) and the
# `playwright` package resolvable from this folder, e.g. via @playwright/cli's bundled copy.
# Override paths via PLAYWRIGHT_PKG_PATH / CHROMIUM_PATH env vars if yours differ.
node zoom-check.js
```

## Fix-candidate comparison (round 2, after Judgment Day found the first candidate regresses width)

`fix-candidates-check.js` measures the sidebar container's rendered height AND width at
`zoom = 1.15` under three conditions:

| Variant | Container height | Container width | Last item reachable? |
|---|---|---|---|
| None (today, broken) | 660px (> 574 real) | 299px | ❌ |
| CDK-overlay-root-zoom pattern (`zoom: 1/factor` on container, `zoom: factor` on content) | 574px ✓ | **260px — shrunk** | ✅ but regresses width |
| Height-only compensation (`height: calc(100svh / factor)` on the container, `zoom` untouched) | 574px ✓ | 299px — unchanged | ✅ no regression |

The CDK-overlay pattern — the fix this spec originally proposed as a precedented candidate — fixes
height but shrinks the container's rendered width by the same factor (zoom is isotropic), which
would leave a dead gap next to the sidebar and squeeze its content. **This is also consistent with
the archived `bugfix/cdk-overlay-root-zoom` spec's own finding**: its `execution.md` (lines 116,
205) records that this exact pattern did **not** fix an analogous `position:fixed; h-dvh` dialog's
clipping — it solves anchored-overlay *position* drift, not fixed-element *size* overflow. Height-
only compensation is the design's preferred candidate (`SBZ-DD-2`), to be re-verified against the
live component in `SBZ-T-2`, not assumed to transfer unchanged from this minimal page.

## What this does and does not prove

- It proves the **confirmed, primary trigger**: this app's own `--pr-font-scale` text-size control
  (any value other than Default) breaks sidebar reachability on a short-enough viewport, via the
  `position:fixed; h-svh` sizing defect. This is a real, already-shipped production code path —
  not a browser-automation artifact.
- It does **not** by itself prove or disprove whether **real native OS/browser Ctrl+ zoom**,
  independent of `--pr-font-scale`, reproduces the same thing — a separate CDP-based
  layout-viewport-shrink emulation (approximating real zoom) did not show the defect, but that is
  an approximation, not a substitute for an actual manual check with real Ctrl+ keystrokes. That
  check is `SBZ-R-3` / `SBZ-T-3`, and it does not block fixing the confirmed trigger above.
- It does not rule out additional contributing factors from the real component's DOM (icons, real
  web-font metrics, the real `reporting-nav-sidebar.component.scss` padding values, which differ
  slightly from this minimal page's) — those are design.md Premise Ledger row P-6, not expected to
  change the conclusion but not yet independently measured against the live component.

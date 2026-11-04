# Tasks — Sidebar items unreachable when root zoom is active (`bugfix/sidebar-scroll-zoom-overflow`)

## 1. Scope

| Field | Value |
|---|---|
| Depth / mode | Lite · Bug Mode |
| Requirements / design | [`requirements.md`](./requirements.md) · [`design.md`](./design.md) · [`judgment.md`](./judgment.md) (APPROVED, 2 rounds) |
| Code tasks for `/akili-execute` | **SBZ-T-1** (regression test) → **SBZ-T-2** (fix) — sequential, T-2 depends on T-1 |
| Manual task | **SBZ-T-3** — real-browser zoom check, gates closing the spec, not shipping the fix |
| Approval Mode | `gated` |

## 2. Pre-flight

- [ ] Branch is not `master`.
- [ ] One test run at a time on the machine, `--maxWorkers=2`, scoped with a path pattern.
- [ ] `requirements.md` and `design.md` are approved; `judgment.md` reads `JUDGMENT: APPROVED ✅`.
- [ ] No DB connection needed (client-only, no migration).

## 3. Task list

### `SBZ-T-1` — Regression test: sidebar reachability at every `--pr-font-scale` value

- **Status:** `[x]` — PASS 2026-11-03, see `execution.md`
- **Type:** `tests` (client)
- **Implements:** SBZ-R-1 (S-1.1, S-1.2)
- **Files:** new spec, e.g. `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/sidebar-root-zoom-reachability.cy.ts`
- **Design refs:** `design.md` §8 "The regression test (`SBZ-T-1`)", steps 1–8
- **Depends on:** — · **Estimate:** M (~90–130 LOC) · **Review:** `full` — this spec's own history (two Judgment Day rounds) is the reason a new measurement-bearing test gets full review, not `checklist`
- **Skills:** `tdd`, `angular-developer`, `spartan` (reuse `cdk-overlay-root-zoom.cy.ts`'s pattern for setting `--pr-font-scale` and measuring real geometry)
- **Test cases** (real Chromium, not jsdom — `position:fixed`/`svh` cannot be laid out in jsdom; run
  at **two viewport heights** — 574px, the reported class, and a second, taller height (e.g. 900px)
  — so the suite proves the fix's formula generalizes across viewport sizes rather than being tuned
  to the one reported height, per the rendered-measurement checklist):
  1. For each `--pr-font-scale` in `[0.9, 1, 1.15, 1.3, 1.5]`, at each viewport height: scroll
     `hlmSidebarContent` to `scrollTop = scrollHeight - clientHeight`; assert the "License" link's
     bounding rect is fully within the real application window's viewport (read `window`/
     `elementFromPoint` off the AUT's own document — `cy.window()` / `$el[0].ownerDocument.
     defaultView` — never the test runner's own frame, the exact scoping bug Judgment Day round 2
     (B-5) flagged in the first sketch of this step).
  2. At every scale, assert the sidebar container's rendered **width** is unchanged relative to its natural, un-compensated render at that same scale (`scale-1 width × scale`, not the flat `--pr-font-scale: 1` pixel value) — this is what would have caught the rejected counter-zoom candidate (`judgment.md` round 2, B-1/B-2). (Wording corrected 2026-11-03 — as implemented and Reviewer-verified; see `execution.md` SBZ-T-1 §3 for why the original "flat baseline" phrasing was wrong.)
  3. `elementFromPoint` at the "License" link's center resolves to that link or a descendant — treat `null` (off-screen) and "resolves to a different element" (occlusion) as two distinct, separately reported failure modes.
  4. Repeat cases 1–3 with "My Admin" / "Admin module" both expanded and both collapsed (the original report's own control, ruling out menu length as the variable).
  5. Info-level (Judgment Day round 1, F-9): assert the "License" link is also reachable via `Tab`-key keyboard focus, its focused rect ending up within the real viewport.
- **Verification:**
  - `cd onecgiar-pr-client && npm run test:ct -- --spec "src/app/shared/components/reporting-nav-sidebar/sidebar-root-zoom-reachability.cy.ts"` (or the project's current CT invocation for a new spec).
  - **Falsifier:** apply the *rejected* counter-zoom candidate (`zoom: calc(1/var(--pr-font-scale))` on the container, `zoom: var(--pr-font-scale)` on its content) in place of the real fix → case 2 (width-unchanged) goes red, even though case 1 (height/reachability) goes green. A fix that only satisfies case 1 is provably the wrong one — this is the exact near-miss Judgment Day caught in this spec's own design round, written back into the gate.
  - **Red run:** before `SBZ-T-2` lands, case 1 fails at `--pr-font-scale` 1.15/1.3/1.5 — the "License" rect's bottom (`≈652/736/849px` on a 574px-tall viewport) exceeds `window.innerHeight` (`investigation/zoom-check.js`, re-run 2026-11-03: `actuallyWithinWindowViewport: false`). At `0.9` and `1`, case 1 passes today — control cases, not expected to go red.
  - **Disqualifier:** a pass is not evidence if the test harness does not load the real production icon fonts (Lucide icons via `@ng-icons`) and the real Manrope/JetBrains Mono web fonts — different font metrics shift the exact pixel numbers (per `design.md` P-6, the live component's padding differs from the minimal repro). Mask this by loading the real global styles in the CT harness, not a stub stylesheet.
  - **Consumers:** none (no shared symbol changed) — this task only adds a new spec file.
- **Done:**
  - [x] Spec written (not yet committed — pending the user's go-ahead per §7), case 1 observed red at 1.15/1.3/1.5 with the exact failure text quoted in `execution.md`, green at 0.9/1 (control).
  - [x] Lint clean.

### `SBZ-T-2` — Fix: compensate sidebar container height for root zoom, without regressing width

- **Status:** `[x]` — PASS 2026-11-03 (attempt 3 of 3), see `execution.md`
- **Type:** `client`
- **Implements:** SBZ-R-1 (closes it), SBZ-R-2 (S-2.1)
- **Files:** `onecgiar-pr-client/src/app/spartan/sidebar/src/lib/hlm-sidebar.ts` **or**
  `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.scss`
  (`!important` override block) — whichever site actually neutralizes the effect when measured
  against the **live** component; decided during this task, not pre-committed (`design.md` §8, P-6)
- **Design refs:** `design.md` §8 "The fix candidate", §10 `SBZ-DD-2`, Premise Ledger P-9/P-10
- **Depends on:** `SBZ-T-1` · **Estimate:** S (~20–40 LOC) · **Review:** `full` — this is the exact
  decision Judgment Day round 2 overturned once already (B-1, B-2); it gets full review, not
  `checklist`
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`, `impeccable-bridge`

  `Design route: load impeccable-bridge → design-routing.md; playbook adapt; ENV-2; mode Operate; polish light; motion none`

- **Scope:** apply `height: calc(100svh / var(--pr-font-scale, 1))` (or the equivalent that holds
  once measured against the live component) to the sidebar's fixed container. Do **not** touch the
  `zoom` property on this element or its ancestors — that is the rejected candidate. Content inside
  (`hlmSidebarContent` and descendants) is untouched and keeps scaling with `--pr-font-scale` per
  DD-11's intent.
- **Verification:**
  - `SBZ-T-1`'s suite, run again after this change.
  - **Falsifier:** swap in the rejected counter-zoom candidate → `SBZ-T-1` case 2 (width-unchanged)
    goes red while case 1 (reachability) stays green — proving the gate actually discriminates
    between the two candidates, not just between "broken" and "not broken".
  - **Red run:** see `SBZ-T-1`'s Red run — this task's job is to turn that exact suite green.
  - **Disqualifier:** if height-only compensation does not achieve full reachability on the live
    component (its padding differs from the minimal repro that validated the candidate, per P-6),
    re-measure and adjust the formula or the fix site — do not declare success on the minimal
    repro's numbers transferring unchanged.
  - **Consumers:** if the fix lands in `hlm-sidebar.ts` (shared Spartan primitive): `reporting-nav-
    sidebar.component.html` is the sole current consumer (`design.md` P-5, re-verify via
    `grep -rn "hlmSidebarContent\|<hlm-sidebar" onecgiar-pr-client/src` at execute time — a new
    consumer added since specify would need this task re-scoped). If the fix lands in `reporting-
    nav-sidebar.component.scss` instead: none (component-scoped).
- **Done:**
  - [x] `SBZ-T-1` green at all five `--pr-font-scale` values, both "My Admin" states (25/25).
  - [x] No regression at `--pr-font-scale: 1` or in the collapsed icon rail (S-1.2 holds — fix is a no-op at scale 1, collapsed rail manually sanity-checked).
  - [x] Lint clean; no folder `CLAUDE.md` exists under the touched paths (checked, none to update).

### `SBZ-T-3` — Manual verification: real browser Ctrl+ zoom (gates closing, not shipping)

- **Status:** `[ ]` · **Depends on:** `SBZ-T-1`, `SBZ-T-2` deployed to PRTest (`performance-refactor`)
- **Implements:** SBZ-R-3 (S-3.1, S-3.2)
- **Checks** (real Chrome, real Ctrl+/Ctrl− keystrokes — never `document.documentElement.style.zoom`):
  1. `--pr-font-scale` at Default; real zoom 110%, 115%, 120%, 125% in turn; scroll the sidebar to
     max; confirm "License" is reachable and unobstructed (the originally reported scenario).
  2. Same, with `--pr-font-scale` at Large, Larger, and Largest in turn (DD-11: native zoom "stacks
     on top" — the worst-case combination).
  3. Confirm no regression in the collapsed icon rail at any of the above.
- **Review:** `checklist` — Leader confirms the check was actually performed with real keystrokes
  (not a DevTools zoom-emulation panel, which carries the same `vh`/`svh` divergence risk as CSS
  `zoom` — `design.md` §2 point 5).
- **Verification:**
  - **Falsifier:** `n/a` — this is a manual HITL check, not a code gate; the "falsifier" is the
    check itself finding the reported scenario still broken after `SBZ-T-2` shipped.
  - **Red run:** `n/a (no test gate — manual check)`.
  - **Disqualifier:** a check performed via a browser's DevTools device-emulation zoom control, or
    via any scripted `document.documentElement.style.zoom` assignment, does not count — it is
    exactly the method this spec's own investigation showed can diverge from real zoom.
  - **Consumers:** `none (no shared symbol changed)` — this task verifies, it does not modify code.
- **Done:**
  - [ ] Both checks recorded in `execution.md` with the exact zoom percentages and font-scale values
    tested, pass/fail per combination.
  - [ ] If check 1 (native zoom alone) fails: file a follow-up — `SBZ-T-2`'s fix is keyed to
    `--pr-font-scale` and does not by construction cover a native-zoom-alone case (`design.md` P-8,
    `requirements.md` SBZ-R-2 "Scope honesty").
  - [ ] Spec marked `shipped` only after this task is done, per `SBZ-R-3`.

## 4. Dependency graph

```
SBZ-T-1 (regression test, red)
   └── SBZ-T-2 (fix, turns it green)
         └── SBZ-T-3 (manual real-zoom check on PRTest, gates closing)
```

No parallel branches — each task's falsifier depends on the previous task's artifact.

## 5. Skip-eligible tasks

**None.** Every task carries `Review: full` or `checklist` with a disqualifier tied to this spec's
own history of two Judgment Day corrections — no task is mechanical enough to skip review.

## 6. Traceability

| Clause | Task |
|---|---|
| S-1.1, S-1.2 | SBZ-T-1 |
| S-2.1 (incl. width-preservation `BUT`) | SBZ-T-1 (gate) + SBZ-T-2 (fix) |
| S-3.1, S-3.2 | SBZ-T-3 |

## 7. PR / commit

~130–170 LOC → single PR (test + fix are tightly coupled; splitting would leave either half
unverifiable alone). Commits only on the user's go-ahead, e.g.:
`🔧 fix(reporting-nav-sidebar) [SPEC:bugfix/sidebar-scroll-zoom-overflow]: keep sidebar content reachable when root zoom scales the fixed container past the viewport`

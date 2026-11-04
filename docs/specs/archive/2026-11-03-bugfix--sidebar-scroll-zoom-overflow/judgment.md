# Judgment Day — `bugfix/sidebar-scroll-zoom-overflow` design review

Target: `requirements.md` + `design.md` + `investigation/*`, reviewed before Phase 3 (`tasks.md`).
Protocol: two blind read-only judges (Judge A, Judge B), parent orchestrator settles one
single-judge finding with an independent re-run per the Hard Rules.

## Merged findings (most severe first)

| # | Severity | Judge(s) | Finding |
|---|---|---|---|
| F-1 | **severe** | B, then independently confirmed by the architect's own re-run | P-3 ("the minimal repro does not reproduce the reported symptom") is **false** when the last item is measured against the real window viewport instead of its own ever-resizing `position:fixed` container. Corrected check (`window.innerHeight`, `elementFromPoint` at the item's center) at zoom 1.15/1.3/1.5 on a 1280×574 viewport: `actuallyWithinWindowViewport: false`, `elementFromPointIsLastOrDescendant: false` (returns `null`) at every zoom ≥1.15, while the flawed original check (`item inside its own container`) stays `true` throughout — a self-referential containment check that can never fail once `scrollTop` is pinned to `scrollHeight`. The reported defect **does reproduce** on the minimal, architecturally faithful repro. |
| F-2 | **severe** | B, corroborated by A's independent source discovery | P-4's framing is inverted. CSS `zoom = 1.15` is not a mere automation proxy for real OS zoom — it is bit-for-bit this app's own shipped "Large" text-size factor (`onecgiar-pr-client/src/app/shared/services/font-scale.service.ts:27`, `factor: 1.15`), applied via `html { zoom: var(--pr-font-scale) }` (`onecgiar-pr-client/src/styles.scss:486-487`, default `1`). `requirements.md`'s Out-of-Scope line excluding `--pr-font-scale` as "already covered by DD-11" is wrong: DD-11's amendment (`bugfix/cdk-overlay-root-zoom`) fixed CDK **overlay positioning** only. That archived spec's own `execution.md` separately records an **unfixed** precedent: a `position:fixed; h-dvh` dialog clipped vertically at zoom 1.5, explicitly noted as pre-existing and out of that spec's scope — i.e. the same defect class, already seen once in this exact codebase, never closed. |
| F-3 | **severe** | A and B (both independently ran it and hit the same crash) | `investigation/zoom-check.js:5` references `repro.html`; the committed file is `minimal-repro.html`. The script does not run as committed (`net::ERR_FILE_NOT_FOUND`). Both judges had to rename/copy the file locally to get it to execute. A Bug Mode investigation artifact that cannot be re-run as committed fails its own purpose. |
| F-4 | suspect | A | Citation precision: P-1 cites `hlm-sidebar-content.ts:14-17` for the `classes()` literal; the actual string is on line ~18 (14-17 is the preceding comment). P-2 and design.md §3's Architecture Overview both cite `hlm-sidebar.ts:56` for `flex size-full flex-col`; the actual string is on line ~51. Conclusions survive ("read in full"), pinpoint lines don't. |
| F-5 | suspect | B | No Premise Ledger row covers `reporting-nav-sidebar.component.scss`'s own `[data-slot='sidebar-inner']` / `[data-slot='sidebar-content']` overrides (real padding/flex values differ from `minimal-repro.html`'s simplified values) — not load-bearing for F-1/F-2 but part of the real chain. |
| F-6 | suspect | B | No row records that the QA session's actual `pr.a11y.fontScale` text-size setting at test time is unknown; real Ctrl+ zoom stacks on top of it per DD-11, so the two could compound. |
| F-7 | suspect | A | `onecgiar-pr-client/cypress/e2e/result-detail/sidebar-collapse.cy.ts` already real-browser-tests this exact `hlm-sidebar`/`reporting-nav-sidebar` chain with `cy.viewport()`. `design.md` §4 proposes "a new Cypress spec … or a component test" without checking it first. |
| F-8 | suspect | A | `requirements.md`'s defect-class table claim "no automated substitute exists" for the CSS-zoom-vs-real-zoom class is overstated — this repo already has the pattern (`cdk-overlay-root-zoom.cy.ts`) for a Cypress test that sets `--pr-font-scale` directly and measures real geometry in a real browser, which is a much closer proxy than `minimal-repro.html` and does not require OS-level Ctrl+ automation. |
| F-9 | info | A | No scenario checks Tab-key keyboard-focus reachability to "License" (a distinct path from mouse/programmatic `scrollTop` max-scroll). Worth adding to `SBZ-T-1`'s checklist. |
| F-10 | suspect | architect (self-caught while settling F-1) | `design.md` §11 Count line reads "5 verified · 1 `UNVERIFIED`" for 5 total rows (arithmetic error; should read 4 verified · 1 UNVERIFIED). The investigation folder is also untracked in git (`git status --porcelain` confirms), so P-3's "Verified at `c19e6df51`" overstates what "added at this commit" means — nothing in `docs/specs/bugfix/sidebar-scroll-zoom-overflow/` is committed yet. |

## Round 1 verdict

**JUDGMENT: ESCALATED ⚠️**

Three severe findings (F-1, F-2, F-3), two of them confirmed independently by the architect
beyond the single reporting judge. F-1 and F-2 together overturn the spec's central conclusion:
root cause is now **substantively confirmed**, not merely "plausible, pending investigation" — the
defect is a `position:fixed` + viewport-unit (`h-svh`) element whose rendered box exceeds the real
window under CSS `zoom`, which this app already triggers today through its own "Large" / "Larger"
/ "Largest" text-size control. This is not a routine fix-and-reverify; it changes `requirements.md`
§2's conclusion, the Scope table, `SBZ-R-1`/`SBZ-R-2` scenario framing, the defect-class table, the
Design Decisions (`SBZ-DD-1`, `SBZ-DD-2`), and the task plan. Per the Decision Gate ("both judges
confirm severe finding → ask before round-one correction"), this was escalated to the user, who
selected **Fix and Re-judge**.

## Fix round 1

`requirements.md` and `design.md` were rewritten to state the confirmed defect, the confirmed
trigger (`--pr-font-scale`), and a "fix candidate, to be verified empirically" rather than an
asserted-working fix. `investigation/zoom-check.js`'s filename bug (F-3) was fixed and re-run
(matches the claimed numbers). Citation line numbers (F-4), missing Premise Ledger rows (F-5, F-6),
the Cypress-spec check (F-7), the overstated "no automated substitute" claim (F-8), the keyboard
check (F-9), and the count-line math (F-10) were all addressed.

## Round 2 re-judgment (scoped to the fix-round-1 delta)

Judge A: **approve** — independently re-ran `zoom-check.js`, independently re-checked every cited
line number against source, confirmed all 10 round-1 findings (F-1 through F-10) genuinely closed,
found two info-level nits only (ambiguous Impact-count wording; hardcoded paths in the script,
already env-var-overridable).

Judge B: **escalate** — found the proposed fix candidate (reusing the `bugfix/cdk-overlay-root-zoom`
counter-zoom pattern) was itself untested and, when empirically tested, **regresses the sidebar's
rendered width** (B-2, High impact) — because `zoom` scales isotropically, counter-zooming the
container to fix height also shrinks it horizontally. Judge B further found that citing that
archived spec as *working* prior art was backwards (B-1, severe): its own `execution.md` already
recorded that exact pattern **failing** to fix an analogous `position:fixed; h-dvh` dialog's
clipping. Five additional suspect/info findings (B-3 through B-8): Small/0.9 untested in the
matrix, the fix's "generalizes to any root zoom" framing overclaiming coverage of native-zoom-alone
cases (native zoom sets no CSS custom property this app can read), a Cypress-sketch scoping bug
(`document`/`window` inside a callback resolving to the wrong frame), an overstated reading of
`elementFromPoint: null`, the QA session's own reported scenario never being re-verified before
closing the spec, and the AI-processes-drawer precedent's scope boundary left implicit.

**Architect's independent verification of the contested findings (B-1, B-2), before deciding
between the judges:** re-ran the CDK-pattern candidate and a height-only alternative against the
minimal repro myself (`investigation/fix-candidates-check.js`, committed). Confirmed exactly what
Judge B reported: the CDK-pattern candidate corrects height (574px) but shrinks width from 299px to
260px; height-only compensation corrects height to 574px with width unchanged at 299px. Separately
confirmed the archived spec's `execution.md:116,205` records the CDK pattern failing on the AI-
processes dialog. Both of Judge B's contested findings are **confirmed by direct re-run**, not
merely "suspect, single-judge."

## Fix round 2 (final bounded fix round, per the Decision Gate: "scoped re-judgment fails before
round two → parent may launch the final bounded fix round")

- Replaced the fix candidate: height-only compensation (`height: calc(100svh / var(--pr-font-scale,
  1))`) is now the design's preferred candidate; the counter-zoom pattern is documented as a
  **rejected** candidate with the width-regression evidence and the corrected (counter-evidence)
  reading of the archived precedent (B-1, B-2 — closed).
- Added Premise Ledger rows P-9 (counter-zoom candidate regresses width, cited to
  `fix-candidates-check.js`) and P-10 (height-only candidate does not, same citation); corrected
  P-7's framing from "supporting prior art" to "counter-evidence against reuse".
- `--pr-font-scale: 0.9` (Small) added to the tested matrix (B-3 — closed).
- `SBZ-R-2` now states explicitly that a fix keyed to `--pr-font-scale` does not by construction
  cover a hypothetical native-zoom-alone case, and added a width-preservation `BUT` clause to
  S-2.1 (B-2, B-4 — closed).
- `design.md` §8's Cypress sketch corrected to read `window`/`elementFromPoint` off the
  application-under-test's own document, not the test runner's frame; added the
  null-vs-occluding-element distinction (B-5 — closed).
- `SBZ-R-3`/`SBZ-T-3` reframed: non-blocking for **shipping** the fix, but required before this
  spec is marked **closed**, since it is the only check against the originally reported scenario
  (B-6 — closed).
- Count-line wording clarified (B-7 — closed); AI-processes-drawer / other CDK `h-dvh` dialogs
  named as an explicit Out-of-Scope row with the citation (B-8 — closed).

## Final verdict

**JUDGMENT: APPROVED ✅**

Per the protocol's round cap (at most two fix rounds and two scoped re-judgments, then independent
final verification), the architect performed the final verification directly rather than spawning a
third judge pair: re-ran both investigation scripts (`zoom-check.js`, `fix-candidates-check.js`) and
confirmed every number cited in the corrected `requirements.md`/`design.md` reproduces exactly;
swept both documents for leftover stale framing (none found) and for `SBZ-R-*`/`SBZ-T-*`/`SBZ-DD-*`
cross-reference consistency (all consistent); confirmed the Scope table and Premise Ledger render
correctly after editing. Round 1's three severe findings and round 2's one severe + one High-impact
finding are all closed and independently re-verified by the architect, not merely asserted closed.
Proceed to Phase 3 (`tasks.md`).

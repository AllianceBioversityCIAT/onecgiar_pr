# Execution Log — `bugfix/field-card-save-pill-truncation`

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/field-card-save-pill-truncation` |
| Branch | qa-development-2026-mc-2 |
| Started | 2026-10-15 |
| Approval Mode | gated |

## Task Execution History

### `FCT-T-1` — attempt 1 — CHECKPOINT (names a blocker; task marked `[~]`)

- **Date:** 2026-10-15
- **Implementer:** `akili-implementer` (host wrapper)
- **Files changed:** none — measurement only, no production file touched; scratch Cypress spec used for measurement was deleted after use.
- **What was measured (real Cypress CT, not guessed):** mounted the actual production grid (`app-pr-select` Policy type [required] + `app-pr-input` USD amount + `app-pr-select` Status, each wrapping real `app-field-card`) at content widths 900px and 1100px, stepping `minmax()` from 190px to 400px, reading `getComputedStyle` on `.fch_required` (font-size) and `.fch_save span:last-child` (display) on Policy type specifically.
- **Falsifier confirmed at pre-fix 190px:** at both 900px and 1100px, `.fch_save`'s text reads `display: none` — bug reproduces (the `≤380px` pill-text rule fires; the `≤240px` badge rule does not at these two widths).
- **Geometric finding — the Disqualifier fires:** with `repeat(auto-fit, minmax(F,1fr))` and `gap-[20px]`, once 3 columns fit, each column's rendered width is `(contentWidth − 40) / 3`, **independent of `F`** for any `F` at or below that quotient. Raising `F` never widens a 3-column row — it only ever forces a step-down to fewer columns once `F` exceeds the quotient.

  | Content width | 3-col width (any `F` ≤ quotient) | vs. 380px pill threshold | `F` that forces 2-col | 2-col width |
  |---|---|---|---|---|
  | 900px | 286.66px | below — always collapses at 3-up | >286.67 (measured 300px → 440px) | 440px |
  | 1100px | 353.33px | below — always collapses at 3-up | >353.33 (measured 360px → 540px) | 540px |

  Solving generally: a natural 3-up row only clears the 380px threshold once content width ≥ `3×380 + 2×20 = 1180px`. Both task-specified representative widths (900, 1100) are below that — this is not an artifact of the two chosen widths, it holds for the whole typical desktop/laptop range.
- **Disqualifier (verbatim from `tasks.md`), triggered:** *"If no single `minmax()` value keeps both text spans visible AND still lets three columns share one row at any commonly-rendered content width ... STOP and report a checkpoint with the measured numbers."* Confirmed: no `F` gives Policy type's column ≥380px while 3 columns render at 900px or 1100px. The only lever that clears the collapse is accepting 2 columns (`F≈360px` clears both thresholds at both widths).
- **Verification command run:** none (measurement phase only; no fix to verify).
- **runtime events:** none.
- **spawns:** `akili-implementer` 46 calls, 227417 tokens, ended complete (checkpoint report, not a runtime death).
- **Requirements covered:** `FCT-R-1` (blocked — cannot be satisfied as stated at the task's representative widths), `FCT-OQ-1` (answered: no single safe value exists under the current grid mechanics).
- **Decisions made:** none yet — escalated to Leader/user per the task's own Disqualifier instruction, which explicitly withholds the choice from the Implementer.
- **Issues encountered:** `FCT-DD-1`'s "Consequences" framing ("fewer columns only at narrow viewports") is now known to be wrong — the step-down to 2 columns is required at *ordinary* desktop/laptop content widths (900-1180px), not just narrow ones. This invalidates part of the approved design's framing, not just the task's plan.
- **Checkpoint — names a blocker:** per Step 2.3 precedence, handled as a blocker regardless of status line. Task marked `[~]`. Escalated to the user — see Pivot Record below.

## Pivot Record: `FCT-T-1`

- **Date:** 2026-10-15
- **Blocker:** `FCT-T-1`'s own Disqualifier fired on attempt 1 (see entry above) — no `minmax()` value satisfies the original `FCT-R-1` (3 columns, all legible) at any content width under ~1180px. This overturns part of the approved design's framing (`FCT-DD-1`'s "Consequences" section assumed the column-count trade-off only applied to narrow viewports; measurement showed it applies at ordinary 900-1100px desktop/laptop widths too).
- **Alternatives presented to the user:**
  1. Accept 2 columns (Policy type + USD amount row 1, Status row 2) at `minmax(360px,1fr)` — confirmed collapse-free at both measured widths.
  2. Keep 3 columns, accept the icon-only pill/badge as a permanent compromise (no fix to legibility).
  3. Redesign `field-card.scss`'s header to wrap instead of collapse — larger scope, touches the shared component (benefits the other 14 call sites too), requires expanding the approved design.
- **User's decision (2026-10-15):** Option 1 — accept 2 columns.
- **Spec documents amended:** `requirements.md` (`FCT-R-1` amended, `FCT-R-2`/`FCT-AC-1`/`FCT-AC-2` reworded, `FCT-OQ-1` resolved, the refuted Assumption struck through), `design.md` (§1 Summary, `FCT-DD-1` Consequences, §6.2 Frontend Plan locked to `360px`, §6.3 responsive plan, §10 Testing Plan), `tasks.md` (`FCT-T-1` description + Falsifier/Red run/Disqualifier/Definition-of-done updated to the confirmed value and 2-column outcome).
- **Correction closure sweep:** forward grep for `three|190px|shared grid row|all three|3 columns` across all three spec documents, confirmed every surviving hit is either (a) historical root-cause narrative (correctly left as-is) or (b) now updated to the 2-column framing. Backward sweep: no other document in the repo yet references this spec's `FCT-*` IDs (freshly created this session), so no backward falsification risk exists.
- **TRD/ADR impact:** none — this is a Lite client-only spec, no architecture decision recorded in `docs/trd/trd.md` is touched.
- **Resuming:** `FCT-T-1` attempt 2 re-briefed with the amended task text below. Attempt 1's checkpoint consumed no rework attempt (per the accounting rule) and its measurement evidence is reused directly, not re-derived.

### `FCT-T-1` — attempt 2 — FAIL (rework attempt 1 of 3)

- **Date:** 2026-10-15
- **Implementer:** `akili-implementer` (host wrapper)
- **Files changed:** `type-policy-change.component.html:47` (`minmax(190px,1fr)` → `minmax(360px,1fr)`), `type-policy-change.component.spec.ts:634` (literal updated), `type-policy-change/CLAUDE.md` (re-stamped), new `type-policy-change.grid-collapse.cy.ts` (168 lines).
- **Implementer verification:** `npx ng lint --quiet` clean; `npx jest --testPathPattern="type-policy-change"` 41/41 passed; `npx cypress run --component --spec ".../type-policy-change.grid-collapse.cy.ts"` 6/6 passed.
- **Not Done / Assumptions (item 0):** 3 bullets, none naming a blocker — pre-existing unrelated Cypress TS errors elsewhere (noted, out of scope); chose targeted spec over full `test:ct` (RAM AMBER, unrelated pre-existing breakage); chose Cypress CT evidence over a manual `ng serve` check (reasoned as equivalent-or-better). Classified as judgment calls, not an owed item — carried here verbatim, no continuation requested.
- **Leader evidence re-run (non-author, independent):** `npx ng lint --quiet` → clean (match). `npx jest --testPathPattern="type-policy-change"` → 41/41 passed (match). `npx cypress run --component --spec ".../type-policy-change.grid-collapse.cy.ts"` → 6/6 passed, "All specs passed!" (match). **VERIFIED**, no MISMATCH.
- **Review intensity:** not met — `Consumers` ≠ `none` (names 14 other call sites + a spec literal), so a conformance Reviewer was owed regardless of the task's `checklist` field.
- **Reviewer verdict: `STATUS: FAIL`** — 3 issues:
  1. **The locked `360px` value does not guarantee legibility at every width.** With `repeat(auto-fit,minmax(F,1fr))`, actual column count is `N = floor((W+gap)/(F+gap))`, and the rendered column width can come arbitrarily close to `F` itself whenever `N` columns barely fit. At `W≈760px`, 2 columns render at ~370px (collapses, since <380). At `W≈1120-1180px`, 3 columns render at ~360-380px (collapses again). Design's 2-width sample (900px, 1100px) missed these squeeze zones. Violates `FCT-AC-2`/`FCT-R-1`.
  2. **The Cypress test hard-codes both grid-class literals instead of reading the production template** — a revert of `type-policy-change.component.html:47` back to `190px` would NOT be caught by this test (the `190` case is a fixture, not sourced from the file). No real red run exists for attempt 2's actual production change.
  3. **`FCT-AC-2`/`FCT-R-2` (narrow-width wrap to 1 column) has no test**, despite `tasks.md` §5 crediting `FCT-TEST-1` with covering it.
  - `ADVISORY` (readability): the `CLAUDE.md` trap's "at most 2 columns … at normal widths" overstates what `360px` actually guarantees; the template's "matches Pool Funding byte-for-byte" comment is now stale (Pool Funding stays at `190px`).
- **runtime events:** none. **spawns:** `akili-reviewer` 13 calls, 103928 tokens, ended complete.
- **Decisions made (Leader, post-FAIL):** the robust fix is simpler than "pick a value that works at 2 sampled widths" — since `auto-fit`/`minmax(F,1fr)` mathematically guarantees every rendered column is `≥ F`, any `F > 380px` guarantees the save-pill never collapses **at any content width or resulting column count**, with no need to hand-pick widths at all. `design.md`/`requirements.md`/`tasks.md` amended accordingly (locked value: `390px`, a small margin above the proven-sufficient `>380px`; column count now explicitly varies 1-3 with content width rather than being fixed at 2). This is a design **correction**, not a new Pivot — it refines the already-approved "accept variable column count" resolution with the mathematically correct value, it does not reopen the user's decision.

### `FCT-T-1` — attempt 3 — FAIL (rework attempt 2 of 3)

- **Date:** 2026-10-15
- **Implementer:** `akili-implementer` (host wrapper), effort `high`.
- **Files changed:** `type-policy-change.component.html:47` (`360px`→`390px`, plus a one-line divergence comment), `type-policy-change.component.spec.ts:634` (literal updated), `type-policy-change/CLAUDE.md` (re-stamped, trap wording corrected per attempt-2's advisory), `type-policy-change.grid-collapse.cy.ts` (fully rewritten — sources the grid class LIVE from the production template via `cy.readFile()`+regex instead of a hand-copied literal; retargeted to squeeze-zone widths 760/1150/1220/600px; added a narrow-width single-column legibility case; added a USD-amount pill check).
- **Implementer verification:** `npx ng lint --quiet` clean; `npx jest --testPathPattern="type-policy-change"` 41/41 passed; `npx cypress run --component --spec ".../type-policy-change.grid-collapse.cy.ts"` 6/6 passed. Implementer additionally reported a manual re-walk: reverting the template to `360px` failed 2/6 cases (the squeeze-zone ones), reverting to `190px` failed 3/6, restoring to `390px` passed 6/6.
- **Not Done / Assumptions (item 0):** 3 bullets (pre-existing unrelated Cypress TS errors elsewhere; skipped manual `ng serve` in favor of the stronger file-revert falsifier evidence; a DOM-selector judgment call per field type). No blocker named — carried here verbatim, no continuation requested.
- **Leader evidence re-run (non-author, independent):** `npx ng lint --quiet` clean (match); `npx jest --testPathPattern="type-policy-change"` 41/41 (match); `npx cypress run` 6/6, "All specs passed!" (match). **VERIFIED**, no MISMATCH. (The Leader did not independently re-run the Implementer's temporary-revert exercise — flagged to the Reviewer, who confirmed by independent arithmetic that it is consistent.)
- **Review intensity:** not met (`Consumers` ≠ `none`) — conformance Reviewer owed.
- **Reviewer verdict: `STATUS: FAIL`** — re-verified all 3 of its own attempt-2 issues independently (regex traced against the real file; width arithmetic redone by hand; narrow-case legibility confirmed) and found them genuinely fixed. Also independently re-checked the P-6 general premise against `app-field-card`'s actual box model (`field-card.scss:25`, no horizontal padding/border between the container and the grid track) — confirmed, no counter-example, no `FATAL_FAIL`. One **new** issue:
  1. **`minmax(390px,1fr)` with no `min()` guard forces horizontal overflow below 390px of content width.** `auto-fit` still creates one track with a fixed 390px minimum when nothing else fits; a container narrower than that (e.g. phone widths) cannot shrink the track, so the form scrolls sideways / clips instead of degrading to a smaller single column. The old `190px` floor fit phone widths; this is a genuine regression of that. No test covers `W < 390`. Violates `requirements.md` §7 (Responsive NFR) and `FCT-R-2`.
  - Remediation: `grid-cols-[repeat(auto-fit,minmax(min(390px,100%),1fr))]` — `min()` makes the floor shrink to the container's own width when narrower than 390px, so `app-field-card`'s own 380px/240px collapse rules become the intended last resort exactly as they already are everywhere else in the app. Update the Jest literal, widen the Cypress regex (the `min(...)` nests an extra paren), add a sub-390px overflow case.
  - `ADVISORY`: fix _header comment wording ("every fix-side case fails" on revert — 1220px actually still passes under `190px`); add a case at exactly the floor (W=800 or W=1210, col=390 exactly); `requirements.md` `FCT-AC-1`'s "2-column squeeze"/"3-column squeeze" labels for 760px/1150px are wrong under `F=390` (760px is 1 column, 1150px is 2 columns — a wording bug the Leader introduced in the post-attempt-2 correction, not the Implementer's); `CLAUDE.md` is near the 120-line cap, consider trimming attempt history (already in `execution.md`).
- **runtime events:** none. **spawns:** `akili-reviewer` 20 calls, 111973 tokens, ended complete.
- **Decisions made (Leader, post-FAIL):** apply the `min(390px,100%)` guard — standard, well-established CSS Grid pattern for exactly this overflow case, no new Pivot needed (still a correction of the same approved direction). Also fixing `requirements.md` `FCT-AC-1`'s mislabeled column counts in the same pass (Leader's own error, not the Implementer's).

### `FCT-T-1` — attempt 4 — PASS (rework attempt 3 of 3, the ceiling — final attempt)

- **Date:** 2026-10-15
- **Implementer:** `akili-implementer` (host wrapper), effort `max`.
- **Files changed:** `type-policy-change.component.html:55` (`minmax(390px,1fr)`→`minmax(min(390px,100%),1fr)`, comment updated to explain the overflow mechanism), `type-policy-change.component.spec.ts:634` (literal updated), `type-policy-change/CLAUDE.md` (re-stamped, trap bullet rewritten, trimmed to 114/120 lines per the prior Reviewer's line-cap note), `type-policy-change.grid-collapse.cy.ts` (regex widened to capture the whole `class="..."` attribute instead of paren-balancing; new sub-390px overflow case (300px); new exact-floor case (1210px, column = exactly 390px); corrected an overstated header comment).
- **Implementer verification:** `npx ng lint --quiet` clean; `npx jest --testPathPattern="type-policy-change"` 41/41 passed; `npx cypress run --component --spec ".../type-policy-change.grid-collapse.cy.ts"` **8/8** passed (2 new cases added). Falsifier evidence: measured `scrollWidth`/`clientWidth` directly on the grid at 300px (bare `390px` → 390/300 overflow; `min(390px,100%)` → 300/300 no overflow); temporary revert to bare `minmax(390px,1fr)` failed exactly 1/8 cases (the new 300px case), all 7 others — including every case from attempt 3 — unaffected.
- **Not Done / Assumptions (item 0):** none reported this attempt.
- **Leader evidence re-run (non-author, independent):** `npx ng lint --quiet` clean (match); `npx jest --testPathPattern="type-policy-change"` 41/41 (match); `npx cypress run` **8/8** passed, "All specs passed!" (match). **VERIFIED**, no MISMATCH.
- **Review intensity:** not met (`Consumers` ≠ `none`) — conformance Reviewer owed, as every prior attempt.
- **Reviewer verdict: `STATUS: PASS`.** Independently re-verified all 6 points the brief asked it to re-check, not trusting the report or file comments: (1) traced the widened regex against both the current and a hypothetical `190px`-reverted string — correct in both directions; (2) independently agreed with the `min()` overflow mechanism and re-derived the general column-count formula; (3) checked the width function between 300-390px for a gap — none exists (monotonic, no jump); (4) redid the column-count arithmetic by hand for 760/1150/1220/1210/600px — all match; (5) confirmed `CLAUDE.md` at 114/120 lines, trap bullet accurate; (6) re-grepped `field-card.scss` and the 14 other `minmax(190px` call sites — untouched.
  - `ADVISORY`: 2 stale sub-claims in the Cypress spec's own comments overstate that a `190px` revert fails every fix-side case (1220px/1210px actually still pass under a `190px` revert, by numeric coincidence) — contradicts the file's own correct header note; 2 test titles still say `minmax(390px,1fr)` instead of `min(390px,100%)`; the regex's reliance on "first `class="grid` in the file" is a latent fragility if a future edit adds an earlier one — a `data-testid` anchor would be more robust; `requirements.md` `FCT-OQ-1` still named the superseded `minmax(390px,1fr)` value (Leader's own doc, fixed in this pass — see below). None of these gate; recorded as follow-up polish, not actioned (Advisory Never Becomes A Task).
- **runtime events:** none. **spawns:** `akili-reviewer` 10 calls, 100333 tokens, ended complete.
- **Requirements covered:** `FCT-R-1`, `FCT-R-2`, `FCT-R-3`, `FCT-AC-1`, `FCT-AC-2`, `FCT-AC-3` — all closed.
- **Decisions made (Leader, post-PASS):** fixed `requirements.md` §10 `FCT-OQ-1`'s stale value (the one Advisory item touching a spec document, not production code) in this same pass — trivial doc correction, no new risk. Accepted the Implementer's standing judgment call (across all 4 attempts) to substitute a manual `ng serve` check with the stronger, repeatable Cypress CT evidence — the real production markup, real `app-field-card`/`app-pr-select`/`app-pr-input` components, real `@container` queries, both directions of each falsifier re-walked via temporary file reverts. This is evidence a one-off visual check cannot match.
- **Final verification result:** `ng lint` clean, `jest` 41/41, `cypress` 8/8 — all independently re-run and matched by the Leader. Task closes `[x]`.

## Summary — all tasks complete

`FCT-T-1` is the only task in this spec. It closed after 3 rework attempts past the initial measurement checkpoint (attempt 1: checkpoint/Pivot; attempt 2: FAIL on width-sampling gap; attempt 3: FAIL on overflow regression; attempt 4: PASS) — every FAIL was a genuine, Reviewer-caught correctness defect, not a false alarm, and every correction narrowed toward the final, mathematically-grounded value `minmax(min(390px,100%),1fr)`. Final state: Policy Change's Policy type/USD amount/Status grid keeps `PCP-T-1`'s grouping, degrades to 2 then 1 columns as content narrows, never overflows below 390px, and never shows the collapsed icon-only save-pill/REQUIRED badge at any width — the original reported bug.

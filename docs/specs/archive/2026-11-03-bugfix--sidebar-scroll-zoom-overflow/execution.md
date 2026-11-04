# Execution Log — `bugfix/sidebar-scroll-zoom-overflow`

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bugfix/sidebar-scroll-zoom-overflow/` |
| Approval Mode | `gated` |
| Budget (design.md §1) | 3 tasks · ~100–180 LOC · ≤2 review rounds on the fix task, 1 checklist round on the manual task |
| Running totals | tasks: 2/3 done (SBZ-T-1 PASS, SBZ-T-2 PASS on attempt 3/3; SBZ-T-3 — manual check — next) · LOC: 362 (final test file) + 13 (SBZ-T-2 fix+comment) + design.md P-11 ≈ 375, against a ~100–180 LOC budget (**over budget** — driven by the two rework attempts' evidence/harness work, not scope creep; see decisions below) · review rounds: 4 total (SBZ-T-1 PASS attempt 1; SBZ-T-2: FAIL, FAIL, PASS across attempts 1–3) against a ≤2-review-round budget **on SBZ-T-2 alone** — exceeded by 1, with explicit user sign-off recorded at the budget tripwire |
| Created | 2026-11-03 |

## 2. Task Execution History

### `SBZ-T-1` — Regression test: sidebar reachability at every `--pr-font-scale` value

- **Final status:** PASS
- **Date:** 2026-11-03
- **Implementer attempts:** 1

**Attempt 1:**
- Files changed: `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/sidebar-root-zoom-reachability.cy.ts` (new, 286 lines)
- Implementer verification: `cd onecgiar-pr-client && CT_BATCH_SIZE=2 npm run test:ct -- 'sidebar-root-zoom-reachability'` → 25 tests, 10 passing, 15 failing. Red run quoted (574px, My Admin/Admin module collapsed, scale 1.15): `AssertionError: scale=1.15 height=574 license.top=600.5 license.bottom=641.9 window.innerHeight=574 — "License" rect is NOT fully within the real window viewport: expected false to equal true`; analogous reds at 1.3 (`license.top=678.6 license.bottom=725.4`) and 1.5 (`license.top=782.9 license.bottom=836.9`), repeated identically across both viewport heights (574/900), both admin-expand states, and the keyboard-Tab-focus suite. Controls (0.9, 1) green in every describe block (10 passing = 8 combos × {0.9,1} + 2 keyboard × {0.9,1}).
- Leader evidence re-run (non-author, inline): same command, re-executed independently → 25 tests, 10 passing, 15 failing. **VERIFIED** — matches the Implementer's report exactly, no mismatch.
- Reviewer verdict: **PASS**. Summary: the test conforms to the spec's intent. The one apparent deviation — a width check that compares against `baseline × scale` (proportional) rather than literally "unchanged from the `--pr-font-scale: 1` baseline" (flat) as `design.md` §8 step 4 and `requirements.md` S-2.1's BUT clause literally read — is the *only* reading consistent with the spec's own measured Premise Ledger data (P-9/P-10): those rows were measured entirely at zoom 1.15, comparing "with candidate" vs. "without candidate, same scale" — never against a true scale-1 render. Read literally, the spec text would itself pass the *rejected* counter-zoom candidate (which lands at the scale-1 pixel value) and fail the *accepted* height-only fix (P-10, which does not). The Reviewer confirmed the Falsifier reasoning is correct (counter-zoom candidate's width ratio deviates 11–33% across all five scales, all above the 5% tolerance) and verified both documented harness deviations (1600px viewport width to avoid `HlmSidebarService`'s 1366px `compactBreakpoint`; `{force:true}` on admin-toggle clicks) against source. No spec-conformance issues found (PASS, not FAIL) — see **ADVISORY** below for the one `[advisory-grade, must-route]` finding and four lower-priority reliability/readability notes.
- runtime events: none
- checkpoints: none
- continuations: none

**Spawns:** `akili-implementer` 1 spawn, ~54 tool calls, 313,713 tokens (host-reported), ended: complete · `akili-reviewer` 1 spawn, 15 tool calls, 105,378 tokens (host-reported), ended: complete

**ADVISORY (4R lens, from Reviewer — recorded, does not gate):**
- **L-1 (routed, not left advisory-only — see §3 below):** `design.md` §8 step 4, its line ~144 ("unzoomed `299px`"), Premise Ledger rows P-9/P-10's "(baseline)"/"(unchanged from baseline)" annotations, `tasks.md` SBZ-T-1 case 2, and `requirements.md` S-2.1's BUT clause all describe the width check as "unchanged from the `--pr-font-scale: 1` baseline" (flat). The underlying investigation data (`fix-candidates-check.js`) was measured only at zoom 1.15, comparing candidates against each other at that one scale — never against a true scale-1 render — so "baseline" in those rows actually means "the natural per-scale render," not "the scale-1 value." Taken literally, the current wording would itself pass the rejected candidate and fail the accepted one. This is a direct contradiction inside the spec (not mere ambiguity) and is handled as a spec tension per the Pivot Detection rule — see §3.
- R-1: at the three red scales, `withinWindow` fails first (Mocha stops at first `expect`), so the red run never independently exercises the `elementFromPoint` null-vs-occlusion distinction. Non-gating; a future cleanup could restructure to gather all three results before asserting.
- R-2: the width baseline is relative only (a fix that uniformly narrowed the sidebar at every scale including 1 would still pass). Non-gating; consider also pinning scale-1 width to the resolved `--sidebar-width` token.
- R-3: nothing asserts the container's height against `window.innerHeight` directly (only the "License" rect's position) — the 0.9 under-shoot named in design.md §8 step 1 has no direct gate. Not required by this task; flagged for SBZ-T-2 to add or confirm.
- R-4: no `aria-expanded="true"` assertion after the forced admin-toggle clicks, to confirm the "expanded" describe blocks are actually exercising the expanded state and not silently running collapsed.
- Readability: `getComputedStyle(doc.documentElement)` uses the test runner's global `getComputedStyle` rather than `doc.defaultView!.getComputedStyle`, inconsistent with the B-5-driven convention used everywhere else in the file.

**Requirements covered:** SBZ-R-1 (S-1.1, S-1.2)

**Decisions made:** Evidence re-run performed Leader-inline (command-only re-execution, under the Delegation Thresholds inline ceiling). Full conformance Reviewer spawned (task's `Review: full`; `tasks.md` §5 lists no skip-eligible tasks in this spec, so Review intensity's skip path was never in play). See §3 for the spec-tension amendment this task's Reviewer surfaced.

**Issues encountered:** Reviewer's L-1 finding — see §3, Pending Spec Amendment.

**Final verification result:** 25 tests, 10 passing (controls, scale 0.9/1, every describe block), 15 failing (scale 1.15/1.3/1.5 reachability, every describe block including keyboard-focus) — exactly the Red run `SBZ-T-1`'s own Verification section requires before `SBZ-T-2` lands.

### `SBZ-T-2` — Fix: compensate sidebar container height for root zoom, without regressing width

- **Final status:** PASS (attempt 3 of 3)
- **Date:** 2026-11-03

**Attempt 1:**
- Files changed: `onecgiar-pr-client/src/app/spartan/sidebar/src/lib/hlm-sidebar.ts` (11 insertions, 1 deletion — `h-svh` → `h-[calc(100svh/var(--pr-font-scale,1))]` on `_sidebarContainerComputedClass`, plus an explanatory comment). Fix site chosen empirically after a dead-end SCSS candidate (`reporting-nav-sidebar.component.scss`'s `[data-slot='sidebar-container']` override) was tried, measured to have zero effect (Angular emulated view encapsulation: the compiled selector requires an `_ngcontent` attribute on the `data-slot="sidebar-container"` div that it can never carry, since that div is rendered by `hlm-sidebar`'s own template, not `reporting-nav-sidebar`'s), and reverted (zero diff left).
- Implementer verification: `cd onecgiar-pr-client && CT_BATCH_SIZE=2 npm run test:ct -- 'sidebar-root-zoom-reachability'` → 25 passing, 0 failing. Direct height-formula measurement at scale 1.15: `computedHeight=499.13px` (574/1.15), `boundingRectHeight=574px` (matches `window.innerHeight`).
- Leader evidence re-run (non-author, inline): same command, re-executed independently → 25 passing, 0 failing. **VERIFIED** — matches exactly.
- **Falsifier dry-run reported inconclusive by the Implementer, confirmed and root-caused by the Reviewer:** swapping in the rejected counter-zoom candidate did **not** produce the required red/green split (task's Falsifier: case 2 red, case 1 green) — both stayed green.
- Reviewer verdict: **FAIL**. Root cause (independently verified at the source, not taken on the Implementer's word): `reporting-nav-sidebar.component.html` mounts `<hlm-sidebar>` directly; in **production**, `app.component.html:11-13` wraps it in `<div hlmSidebarWrapper sidebarWidth="260px" sidebarWidthIcon="64px">`, which is what actually binds `--sidebar-width`. `SBZ-T-1`'s CT harness (`mountSidebar()` in `sidebar-root-zoom-reachability.cy.ts`) mounts the component **without** this wrapper, so `--sidebar-width` is unset only in the test harness, not in production. With the variable unset, `width: var(--sidebar-width)` (no fallback) resolves to `auto`, making the container's rendered width content-driven in the harness — so case 2 (width-unchanged) cannot discriminate the two candidates there, regardless of which one is shipped. In production (real 260px length), the rejected candidate would genuinely produce the predicted ratio-off regression. **Conclusion: the shipped fix is sound (independently verified via the direct height measurement and the full reachability suite, neither of which depend on `--sidebar-width`); the defect is in `SBZ-T-1`'s test harness, not in `SBZ-T-2`'s fix or in the design's premises (`SBZ-DD-2`/P-9/P-10 are not wrong — production supplies the length-valued width the minimal repro had; this is explicitly not a Pivot).** Reviewer also corrected the Implementer's secondary claim that all three `reporting-nav-sidebar.component.scss` `!important` blocks are dead code: `[data-slot='sidebar-content']` (scss:97) IS live (it sits on this component's own template, carrying its own `_ngcontent` attribute) — only `sidebar-container`/`sidebar-inner`/`[data-sidebar='sidebar']` are dead, per the Reviewer's correction.
- runtime events: none
- checkpoints: none
- continuations: none

**Spawns:** `akili-implementer` 1 spawn, ~76 tool calls, 286,378 tokens (host-reported), ended: complete · `akili-reviewer` 1 spawn (host call count not independently recorded in this entry), ended: complete

**ADVISORY (4R lens, from Reviewer — recorded, does not gate):**
- RELIABILITY: the ad hoc collapsed-rail sanity check also ran without the production wrapper, so `--sidebar-width-icon` was unset; that reading is uninformative. Once the wrapper is added to the harness, add a permanent collapsed-rail reachability case (a scope decision for a later task, not a gate on this one).
- RELIABILITY: the dead-code finding (above) should be corrected and routed to a follow-up (remove or `::ng-deep` the two genuinely-dead blocks; leave `sidebar-content` alone) — out of scope for `SBZ-T-2`.
- READABILITY: the inline comment added to `hlm-sidebar.ts` is accurate but could be trimmed to two lines plus a spec pointer.

**Requirements covered:** SBZ-R-1 (not yet closed — pending attempt 2), SBZ-R-2 S-2.1 (not yet verified — the Falsifier that would prove it is currently inconclusive, pending attempt 2)

**Decisions made:** Full conformance Reviewer spawned (task's `Review: full`). The Reviewer's remediation requires correcting `SBZ-T-1`'s test harness (`mountSidebar()` in the already-PASSed `sidebar-root-zoom-reachability.cy.ts`) to mount through `hlmSidebarWrapper` matching production's `app.component.html:11-13` wiring, then actually executing (not reasoning through) the falsifier swap and quoting the verbatim red/green split. The Leader authorizes this correction as part of `SBZ-T-2`'s attempt 2 — it is not new scope, it is fixing the task's own prescribed verification instrument (`tasks.md` SBZ-T-2's Verification section names `SBZ-T-1`'s suite and its Falsifier explicitly) so that `SBZ-T-2`'s own Falsifier requirement can actually be observed, per Review intensity condition 1. `SBZ-T-1` remains `[x]` (its core defect-reachability test is correct and unaffected) — this is a fix-forward correction to one assertion's harness fixture, documented here and cross-referenced from `SBZ-T-1`'s own entry below.

**Issues encountered:** Falsifier did not discriminate on attempt 1 — root-caused to a test-harness gap (missing production wrapper), not the fix or the design premises. See Reviewer FAIL above.

**Final verification result (attempt 1):** 25/25 passing on the real reachability/height suite (sound), but the task's own required Falsifier was not observed — task not yet closable. Proceeding to attempt 2.

**Attempt 2:**
- Files changed: `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/sidebar-root-zoom-reachability.cy.ts` (harness fix — added `SidebarRootZoomReachabilityHostComponent`, a local host wrapping `ReportingNavSidebarComponent` in `hlmSidebarWrapper sidebarWidth="260px" sidebarWidthIcon="64px"`, matching `app.component.html:11-13`; `mountSidebar()` now mounts the host instead of the bare component); `hlm-sidebar.ts` (comment-only trim per the Reviewer's attempt-1 readability note — fix logic line byte-identical); `hlm-sidebar-content.ts` (falsifier-touched during the dry-run, reverted — zero net diff); `design.md` (added Premise Ledger row P-11 + Count/Hand-off updates).
- Implementer verification: full suite re-run post-harness-fix → 25/25 passing, no tolerance changes needed. Falsifier **actually executed** this time (not reasoned): swapped in the rejected counter-zoom candidate, re-ran → 9 passing / 16 failing, with every failure on the width assertion (e.g. scale 1.15: `containerWidth=259.99 expected=299.00`, consistent with `fix-candidates-check.js`'s P-9 measurement of 259.98). Candidate swap reverted, confirmed byte-identical to backup. Final re-confirm: 25/25 passing. Lint clean (before and after comment trim).
- Leader evidence re-run (non-author, inline): `CT_BATCH_SIZE=2 npm run test:ct -- 'sidebar-root-zoom-reachability'` → 25 passing, 0 failing. `npx ng lint --quiet` → clean. **VERIFIED** — matches exactly.
- Reviewer verdict: **FAIL**. The harness fix, the fix logic, and the revert all independently verified correct (wrapper attributes confirmed character-for-character against `app.component.html:11`; `hlm-sidebar.ts`'s fix line unchanged; `hlm-sidebar-content.ts` confirmed clean via the Reviewer's own read plus the session-start git status). The 9/16 split's arithmetic independently confirmed correct (ratio `1/scale` under the candidate, failing the 5% tolerance at every scale except 1 — matches 16 red / 9 green exactly) and accepted without needing a re-run. **The gap:** the Falsifier's "case 1 (reachability) stays green" half was never actually observed — in the main `it()` blocks, case 2 (width) is asserted *before* case 1, so case 1 never executes at the failing scales (Mocha/Chai stops at the first failed `expect`). The keyboard-Tab-focus block (`SBZ-T-1` item 5, a separate info-level check) is **not** case 1 — it covers only 574px, only the default expand state, only `withinWindow`, and never exercises `elementFromPoint`'s occlusion check (which runs under nested zoom and is exactly where a coordinate-mapping bug could hide). Both the spec file's FALSIFIER banner and `design.md` P-11 present this inferred result as an *observed* "Case 1 (reachability) → GREEN" — the same "claimed but not actually observed" failure mode attempt 1 was FAILed for, now one level deeper.
- runtime events: none
- checkpoints: none
- continuations: none

**Spawns:** `akili-implementer` 1 spawn, 52 tool calls, 223,439 tokens (host-reported), ended: complete · `akili-reviewer` 1 spawn (no shell tools in this review session — Read/Grep/Glob only; did not independently re-run the Falsifier, judged the quoted arithmetic convincing without re-running), ended: complete

**ADVISORY (4R lens, from Reviewer — recorded, does not gate):**
- RELIABILITY: `--sidebar-width` is actually read from `HlmSidebarService.sidebarWidthCss()`, not directly from the `sidebarWidth` input — a `sidebar_width_px` value left in `localStorage` (`restoreWidthFromStorage`) could override 260px. The ratio check survives this (baseline and per-scale both read the same overridden value), but clearing that key in `before()` would make the harness fully deterministic regardless of prior browser state.
- READABILITY: the file's banner comment "Scope: this task only adds this spec file..." (originally SBZ-T-1's framing) now sits next to SBZ-T-2 harness-fix content — consider labelling it "(SBZ-T-1)" for clarity.

**Requirements covered:** SBZ-R-1, SBZ-R-2 S-2.1 — not yet closed (attempt 3 needed)

**Decisions made:** Reviewer's remediation is narrow and mechanical: reorder the main `it()` blocks' assertions so case 1+3 (reachability) run *before* case 2 (width), so a case-2 red under the candidate provably implies case 1 already passed in the same test; re-run and re-quote the Falsifier; correct the banner and P-11 to stop calling the keyboard-focus block "case 1" and state only what was actually observed. No production file change needed. **Per the Effort Ceiling rule** (`.agents/leader.md`): effort is already at `xhigh` (the T2 ceiling) going into attempt 3, reached via the normal bump sequence (`high` → `xhigh` after attempt 1's FAIL). Checked for a distinct, at-least-as-strong escalation model for the Reviewer (frontier pin / cross-host dispatch) — Claude Code's registry has a single T3 entry (`opus`), already in use by the Reviewer, with no second in-host candidate distinct from an escalated Implementer and no qualifying fallback (`sonnet` does not meet the floor). **Effort ceiling: held `xhigh`** — attempt 3 proceeds as a fresh T2 Implementer spawn at `xhigh`, carrying the full Attempt History, Implementer and Reviewer kept on distinct models as already configured.

**Budget Tripwire — stopped before attempt 3, per `design.md` §1:** the stated budget for this spec is "≤2 review rounds on the fix task" (`SBZ-T-2`). Two Reviewer rounds had run (attempt 1 FAIL, attempt 2 FAIL) — a third round (attempt 3) exceeds the recorded budget. Per the Loop Guardrails' Budget Tripwire, this halted for an explicit user decision before dispatching attempt 3. This is **not** a HALT (the 3-attempt rework ceiling is not yet reached — 2 of 3 consumed) and **not** a Pivot (no requirement or design premise is in question; both FAILs were precision findings about what the Falsifier evidence actually proves, not about the fix's correctness, which is independently verified and unchanged since attempt 1).

**User decision (2026-11-03): proceed with attempt 3** — the narrow, mechanical remediation (reorder assertions, re-run, correct two wording claims), accepting it will exceed the recorded `≤2 review rounds` budget by one round. Not logged `auto-approved` — this is the explicit user decision the tripwire required.

**Issues encountered:** Both FAILs so far concern the rigor of the *evidence*, not the fix. Attempt 1: harness couldn't produce the discrimination at all. Attempt 2: harness now produces it, but one half of the claimed observation was inferred, not run. The underlying height-only fix (`hlm-sidebar.ts`) has been unchanged and independently verified correct since attempt 1.

**Final verification result (attempt 2):** 25/25 passing (sound), Falsifier's width-discrimination half genuinely observed and convincing (16/16 red, arithmetic-confirmed), but its reachability-stays-green half was inferred rather than observed — task not yet closable. Budget tripwire stops here pending user decision on attempt 3.

**Attempt 3 (final, 3 of 3):**
- Files changed: `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/sidebar-root-zoom-reachability.cy.ts` (reordered the main `it()`'s assertions — cases 1+3 reachability now run *before* case 2 width; added one explicit `cy.get('[data-slot="sidebar-content"]').should('exist')` wait the reorder required, mirroring the keyboard-focus block's existing pattern; corrected the FALSIFIER banner's wording to describe only what was actually observed). `design.md` (corrected Premise Ledger row P-11's citation to the same effect). `hlm-sidebar.ts` and `hlm-sidebar-content.ts`: falsifier-touched during the dry-run, fully reverted — zero net diff vs. attempt 2's final state (confirmed by both the Implementer and, independently, the Reviewer via a repo-wide grep for `zoom` across `spartan/sidebar/src/lib/`, finding none).
- Implementer verification: real suite re-run post-reorder → 25/25. Falsifier executed three times: natural run (case 2 enabled) → 9 passing/16 failing, every failure carrying case 2's own width-assertion text, zero case-1/3 failure text found; diagnostic run (case 2's `expect()` temporarily disabled) → 25/25, directly isolating that cases 1+3 pass under the candidate independent of case 2; case 2 re-enabled → back to 9/16, confirming stability. Candidate fully reverted. Lint clean (twice).
- Leader evidence re-run (non-author, inline): `CT_BATCH_SIZE=2 npm run test:ct -- 'sidebar-root-zoom-reachability'` → 25 passing, 0 failing; `npx ng lint --quiet` → clean. **VERIFIED** — matches exactly.
- Reviewer verdict: **PASS**. Confirmed the actual code order (reachability block before the width block, with line numbers) rather than trusting the summary; reasoned through Cypress's command-queue semantics to confirm case 2's callback can only execute once both case-1/3 checks finished without throwing (no silent no-op path exists — a missing node/link throws its own named assertion, and the added `.should('exist')` retries only its own existence check, it cannot swallow a case-1/3 failure). Judged the diagnostic run (25/25 with case 2 disabled) as sufficient on its own to prove cases 1+3 pass under the candidate, with the natural run as valid corroboration. Confirmed the revert via a repo-wide grep for `zoom`/`pr-font-scale`/`h-svh` across `spartan/sidebar/src/lib/` (no shell this session — Read/Grep/Glob only) — found zero `zoom` residue, `hlm-sidebar.ts` matching the quoted diff exactly, and the two pre-existing `h-svh` hits (mobile sheet, `collapsible=none`) correctly outside the diff. Confirmed the wording corrections in the banner and P-11 are accurate and non-over-claiming, and that the 259.99-vs-299.00 figure still matches P-9's 259.98. No scope creep; the added wait judged necessary (identical pattern to the pre-existing keyboard-focus guard), not a hidden change to what's tested.
- runtime events: none
- checkpoints: none
- continuations: none

**Spawns:** `akili-implementer` 1 spawn, 50 tool calls, 206,702 tokens (host-reported), ended: complete · `akili-reviewer` 1 spawn (no shell this session; verified via Read/Grep/Glob only), ended: complete

**ADVISORY (4R lens, from Reviewer — recorded, does not gate):**
- READABILITY: the test file's header "Scope: this task only adds this spec file..." line is still `SBZ-T-1`'s original wording and is now stale (raised in a prior round too) — a cosmetic cleanup for a follow-up.
- RELIABILITY: the `localStorage` `sidebar_width_px` determinism advisory from attempt 2 remains open, non-gating.
- BOOKKEEPING: the Reviewer flagged that `execution.md`'s running totals and this task's "Final status" line still described attempt 2 at review time — addressed in this finalize pass.

**Requirements covered:** SBZ-R-1 (closed), SBZ-R-2 S-2.1 (closed)

**Decisions made:** Effort held at `xhigh` (the T2 ceiling) for attempt 3 per the Effort Ceiling rule — no qualifying distinct-and-at-least-as-strong escalation model existed in Claude Code's registry (single T3 entry, already the Reviewer's model). Budget tripwire fired before attempt 3 (design.md's "≤2 review rounds" was already spent across attempts 1–2); user explicitly approved proceeding (recorded above). Final totals: 3 Implementer attempts, 3 Reviewer rounds on this task alone (1 over the recorded budget, with explicit user sign-off).

**Issues encountered:** Resolved across the three attempts — harness gap (attempt 1→2), then evidence-ordering gap (attempt 2→3). The underlying fix was correct from attempt 1 onward and never changed.

**Final verification result:** 25/25 passing; Falsifier fully and cleanly executed, both halves (case 2 red, cases 1+3 green) independently observed in the same test run, with a clean isolation run as additional proof; revert confirmed clean; lint clean. Task closed.

---

**Cross-reference note added to `SBZ-T-1`'s entry (2026-11-03, post-hoc, via `SBZ-T-2`'s Reviewer):** `sidebar-root-zoom-reachability.cy.ts`'s `mountSidebar()` does not mount through `hlmSidebarWrapper`, so `--sidebar-width` is unset in the harness where it is always set in production (`app.component.html:11-13`). This made case 2 (width-unchanged) measure `width:auto` (content-driven) rather than a real zoom-scaled length, so it could not discriminate the accepted fix from the rejected counter-zoom candidate — the harness, not `SBZ-T-1`'s height/reachability assertions (case 1, still correct and still the task's primary gate), needs the fix. Being corrected as part of `SBZ-T-2`'s attempt 2; see that entry above. `SBZ-T-1`'s `[x]` status is not reverted.

## 3. Spec Amendment Applied (spec tension, flagged by SBZ-T-1's Reviewer — L-1)

Per the Pivot Detection rule ("a spec tension is the lightest Pivot evidence, not an advisory... present it at the next gate as a one-line amendment proposal"), this was routed to the user at the Step 5 gate rather than left as a dormant advisory. **User decision (2026-11-03): apply the correction now, then proceed to `SBZ-T-2`.**

**Amendment applied:** reworded the width-preservation check, in all locations below, from "unchanged from the `--pr-font-scale: 1` baseline" (flat) to "unchanged relative to the natural, un-compensated render at that same scale (`scale-1 width × scale`)" — matching what the Premise Ledger's own P-9/P-10 measurements actually compared (both were measured only at zoom 1.15, candidate vs. candidate — never against a true scale-1 render), and matching what `SBZ-T-1`'s implemented test already encodes and the Reviewer confirmed discriminates correctly between the rejected and accepted fix candidates (rejected candidate's width ratio deviates 11–33% across all five scales, all above the 5% tolerance; accepted candidate matches).

**Locations edited (2026-11-03):**
- `design.md` §8 step 4 (the assertion description)
- `design.md` the "unzoomed `299px`" line (~144) — corrected: 299 is the natural *zoomed* render (260 authored × 1.15), not an "unzoomed" value; 260 is the unzoomed/scale-1 value
- `design.md` Premise Ledger row P-9's citation ("299 (baseline)" → "299 (the natural, un-compensated render at zoom 1.15 ... not the scale-1 value itself)")
- `design.md` Premise Ledger row P-10's citation ("(unchanged from baseline)" → "(unchanged from the natural, un-compensated render at this same zoom level — not the scale-1 value)")
- `requirements.md` S-2.1's BUT clause
- `tasks.md` `SBZ-T-1` case 2's wording (already implemented correctly by the test; task text corrected to match, for future readers)

This is a wording correction, not a change to approved intent: the fix must still avoid the width regression the rejected counter-zoom candidate produces; only the comparison basis ("flat scale-1 pixel value" → "proportional, same-scale natural render") was corrected to match what the cited investigation data actually measured and what the already-reviewed, already-passing `SBZ-T-1` test already implements. No requirement's meaning changed; no ADR is affected.

# Execution Log — `results/intermediate-outcome-aow-visibility/target-tooltip`

## 1. Document Control

- **Spec path:** `docs/specs/results/intermediate-outcome-aow-visibility/target-tooltip/`
- **Approval mode:** not recorded in `tasks.md`/`design.md` — treated as `gated` (default) for this run.
- **Executor:** AKILI Leader (Claude Code), 2026-08-26
- **Branch:** `qa-development-2026`

## 2. Task Execution History

### `RES-T-1` — Add the "not exclusive to that AoW" tooltip to Intermediate Outcome Target cells

**Status: PIVOT (blocked, `[~]`)** — 2026-08-26

**Attempt 1:**

- **Implementer:** akili-implementer subagent. Skill loaded: `angular-developer`. Effort: medium.
- **Files changed:**
  - `onecgiar-pr-client/.../reporting-aow-table/reporting-aow-table.component.ts` — added `readonly intermediateTargetTooltip` + `isIntermediateRow(bucketKind: string): boolean`.
  - `onecgiar-pr-client/.../reporting-aow-table/reporting-aow-table.component.html` — `bucketKind: group.kind` added to the single `*ngTemplateOutlet="indicatorRow"` context; `#indicatorRow` template picks it up via `let-bucketKind="bucketKind"`; Target `<button>` bound `[prTooltip]="isIntermediateRow(bucketKind) ? intermediateTargetTooltip : ''"`. Flat-table Target cell untouched (out of scope).
  - `onecgiar-pr-client/.../reporting-aow-table/reporting-aow-table.component.spec.ts` — added `isIntermediateRow` unit assertions + a compiled-template test asserting the exact `prTooltip` string on Target vs. `''` for non-intermediate, discriminating against an `achievedTooltip` copy-paste per the tasks.md disqualifier.
  - `onecgiar-pr-client/.../reporting-aow-table/CLAUDE.md` — `Verified:` re-stamped to `2026-08-26 · branch qa-development-2026 · 971836fe8`.
- **Implementer verification:**
  - `npx ng lint --quiet` → `All files pass linting.`
  - `npx jest --silent --reporters=summary --no-coverage --testPathPattern=reporting-aow-table` → `Test Suites: 2 passed, 2 total; Tests: 82 passed, 82 total`
  - Manual browser check (`RES-TEST-2`) explicitly deferred by the Leader for this delegation, not an Implementer omission.
- **Reviewer verdict: `STATUS: FAIL`** (akili-reviewer subagent, lens-checklist mode, effort medium)
  - Verified the flagged import/path (`PrTooltipDirective` from `shared/directives/pr-tooltip.directive.ts`) resolves correctly and backs `[prTooltip]` via `@Input('prTooltip') text`; the DOM-order assumption (Target button before Achieved button) checked against the template and confirmed correct.
  - `RES-R-1`, `RES-R-2`, `RES-DD-1` conform exactly — single call site, correct helper, correct string, no scope creep, `CLAUDE.md` stamp correct.
  - **Issue 1 (blocking):** `RES-AC-1`'s keyboard-focus clause is unmet. `PrTooltipDirective` (`onecgiar-pr-client/src/app/shared/directives/pr-tooltip.directive.ts`) has exactly three host listeners — `mouseenter`, `mouseleave`, `click` — and no `focus`/`focusin`/`blur` listener, no `aria-describedby`/`aria-label` wiring. `Tab`-focusing the Target button shows nothing. The Target `<button>` being focusable makes the *element* reachable, not the *tooltip*. This is a property of the **shared directive** — `achievedTooltip` one cell over has the identical hole; the diff inherits it, it does not introduce it. **Violated rule:** `requirements.md` §8 `RES-AC-1` ("...AND it must be reachable by keyboard focus alone (not hover-only)"), and `RES-R-10` / §7 Accessibility, both of which rest on `design.md` §6.3's premise that the new tooltip matches "`achievedTooltip`'s existing keyboard-reachable pattern" — a premise verified false against source.
  - ADVISORY: none (small diff; nothing beyond the blocking issue surfaced).

**Attempts consumed: 1 of 3.** Loop stopped here — see Pivot Record below. Not consuming further rework attempts, per the "Pivot Detection" guardrail: the Reviewer's finding is evidence the *design's premise* is wrong, not that the diff mis-implements the design.

## Pivot Record: `RES-T-1`

**Trigger:** Reviewer FAIL whose root cause is a false premise in `design.md`, not an implementation defect. `design.md` §6.3 states the new Target tooltip will match "`achievedTooltip`'s existing keyboard-reachable pattern (`RES-R-10`)". Source inspection of `onecgiar-pr-client/src/app/shared/directives/pr-tooltip.directive.ts` shows `PrTooltipDirective` has never been keyboard-reachable — no focus/blur handling exists on the directive at all, only `mouseenter`/`mouseleave`/`click`. The Implementer followed `design.md §6.2` (`RES-DD-1`) to the letter and still cannot satisfy `requirements.md RES-AC-1`'s keyboard clause, because the clause was written on top of an incorrect assumption about existing behavior.

**ADR impact:** none — no TRD architecture decision is affected; this is a Lite spec with no `docs/trd/trd.md` citation (per `requirements.md` §11 / `design.md` "Required cross-references").

**Alternatives considered (from Reviewer's remediation suggestion):**

1. **Fix the shared directive.** Add `@HostListener('focusin')` → show / `@HostListener('focusout')` → hide to `pr-tooltip.directive.ts`, plus a directive spec case. Satisfies `RES-AC-1` for this tooltip AND retroactively fixes ~40 existing `[prTooltip]` call sites (including `achievedTooltip`) at once. **Cost:** an app-wide behavioral change to a shared directive, which is out of `RES-T-1`'s declared file boundary (`tasks.md` "Files (expected)" lists only the `reporting-aow-table` folder) and carries its own regression risk across every existing tooltip consumer — this is new task-sized work, not a rework of `RES-T-1`.
2. **Amend the spec.** Edit `requirements.md` §7 / `RES-AC-1` and `design.md` §6.3 to stop asserting keyboard reachability for this tooltip, downgrading `RES-AC-1`'s keyboard clause to a recorded, accepted a11y gap inherited from the shared directive (hover-only, as the directive has always behaved), and file the directive fix (`Alternative 1`) as a separate follow-up spec/task. **Cost:** the shipped tooltip stays hover-only, same as `achievedTooltip` today — no regression, but does not close the underlying a11y gap.

**Recommendation (Leader, non-binding):** Alternative 2 for this spec (unblocks `RES-T-1` today, matches the existing, already-shipped `achievedTooltip` behavior — no new regression), with Alternative 1 filed as a new, separately-scoped follow-up spec against `pr-tooltip.directive.ts` since it affects far more surface than this spec touches.

**Status:** RESOLVED 2026-08-26 — user selected "Amend spec, then archive" (Alternative 2).

**Correction applied:**

- `requirements.md`: `RES-R-10` struck through and superseded (hover-only accepted, no regression vs. `achievedTooltip`'s actual behavior); `RES-AC-1` keyboard clause removed, replaced with an explicit "not required" note citing this Pivot Record.
- `design.md` §6.3: false "matching `achievedTooltip`'s existing keyboard-reachable pattern" claim replaced with the verified fact (hover-only, checked against `pr-tooltip.directive.ts`) and a pointer to this record.
- `tasks.md`: `RES-T-1` Definition of Done's "What this proves / does not prove" note, the manual browser check step, and `RES-TEST-2`'s test-plan row all updated to drop the Tab-focus expectation — manual check is now hover-only.
- **Two-direction sweep performed:** forward grep for `keyboard` across the spec folder found the three tasks.md sites above (corrected) and one occurrence in `proposal.md` (left as-is — that file is the frozen original ask, not a live spec document; it does not assert current behavior). Backward grep found no other document citing the superseded `RES-R-10`/`RES-AC-1` keyboard clause.
- **Follow-up filed (not part of this spec):** app-wide keyboard reachability fix for `PrTooltipDirective` (`onecgiar-pr-client/src/app/shared/directives/pr-tooltip.directive.ts` — add `focusin`/`focusout` handlers) — Alternative 1 from the original pivot options. Not filed as a formal `/akili-propose` in this session; flagged to the user as a candidate for one.

**Diff status:** the Attempt 1 diff required no code change — it was always hover-only (correctly following `RES-DD-1`), so it now conforms to the amended requirements as originally written.

**Re-review (Attempt 2, docs-only — no code rework, no attempt charged against the 3-attempt ceiling):**

- **Reviewer verdict: `STATUS: FAIL`**, but explicitly on **doc consistency only** — read `pr-tooltip.directive.ts` in full independently (not trusting the amendment) and confirmed hover-only is correct: exactly three `@HostListener`s (`mouseenter`, `mouseleave`, `click`), no focus/blur handling, `keydown` only for `Escape` while pinned. Confirmed `RES-R-1`/`RES-R-2`/`RES-DD-1` still hold via fresh spot-check of the working tree (not just the diff).
  - **Issue 1:** `requirements.md` §8 "Defect classes" table still said "manual browser check (hover + `Tab`-focus)", contradicting the amended `RES-AC-1` and `tasks.md`'s own "mouse hover only" line two sections later.
  - **Issue 2:** `design.md` §2.2 still said "a hover/focus affordance", contradicting the corrected §6.3 four sections later.
  - Root cause: the correction-closure sweep above searched only for the literal word `keyboard`; neither survivor uses that word (they say "focus"/"Tab-focus" instead). Noted for future sweeps: search `focus|Tab|keyboard` together, not `keyboard` alone.
  - Also flagged: `tasks.md` Status line still said "blocked" while `execution.md` already recorded the pivot as resolved — bookkeeping only, fixed alongside.
- **Leader fix (no rework attempt charged — Reviewer explicitly said the diff itself needs no change):** `requirements.md:65` and `design.md:21` both corrected to hover-only, consistent with `RES-R-10`'s supersession; `tasks.md` Status line corrected to reflect the resolved pivot.
- **Effective status: PASS** — the Reviewer's only issues were pre-existing-doc residue from the pivot correction, now closed. No further re-review needed; the diff was never in question in Attempt 2.

**Attempts consumed: 1 of 3** (docs-only Attempt 2 not counted — no code rework occurred, per the Reviewer's own instruction).

## 3. Scope Amendment — 2026-08-26

User clarified (screenshot-confirmed) that the tooltip requirement was incomplete: Intermediate Outcome indicators that repeat transversally inside specific AoW cards' Outcomes bands must also carry the tooltip there, not just inside the standalone Intermediate Outcomes card. This was first raised via `/akili-quick`; declined as trivial (fails the "no behavior change" gate — requires cross-referencing `indicator_id` across two data sources and touching `dashboard-lab.component.ts`'s `reportingGroups()`, not just a copy/token edit) and routed back into this spec per the user's choice ("amend the current spec").

**Amendment applied:**

- `requirements.md`: `RES-R-2` narrowed to HLO/output-tier rows only; new `RES-R-3` added (cross-cutting Outcomes-band rows MUST show the tooltip, matched by `indicator_id`, with an explicit escalate-don't-improvise clause if the id doesn't actually repeat across endpoints); `RES-AC-3`/`RES-AC-4` added; §3 In Scope/Out of Scope updated.
- `design.md`: new `RES-DD-2` (row-stamping decision — reorder `reportingGroups()`, build an id `Set`, stamp `__isIntermediateCrosscut`, widen the template's `||` condition); §10 Testing Plan, §12 ADR list, §13 Open Gaps, and the Step 2.4 Budget table all updated to reflect two tasks instead of one.
- `tasks.md`: new task `RES-T-2` (depends on `RES-T-1`), dependency graph updated, `RES-TEST-3`/`RES-TEST-4` added, defect-classes table extended, rollout/rollback sections updated for two separable PRs.

**Key open risk carried into `RES-T-2`:** the `indicator_id`-matching mechanism in `RES-DD-2` was derived from source-code investigation only (confirmed the AoW's Outcomes band and the Intermediate Outcomes card come from two different endpoints, both carrying `indicator_id` on each row) — NOT verified against a live payload. `RES-T-2`'s Definition of Done makes live-data verification the **first** step, before any stamping logic is written, with an explicit instruction to escalate rather than silently substitute a different matching key if the assumption fails.

## 4. Live-Data Verification — 2026-08-26 (before `RES-T-2` code)

Per `RES-T-2`'s Definition of Done, the `RES-DD-2` matching-mechanism assumption was verified against live data BEFORE writing any implementation. User provided a JWT token in-conversation (never written to any file or command output; the token itself does not appear in this log or in any scratch file — verified via grep before proceeding).

**Method:** `curl -H "auth: <token>" https://prtest-back.ciat.cgiar.org/api/results-framework-reporting/toc-results?program=<sp>&areaOfWork=<code>` for:
- `program=SP02, areaOfWork=intermediate-outcomes` (Intermediate Outcomes bucket — 16 indicators)
- `program=SP02, areaOfWork=SP02-AOW01..04` (four AoW cards)
- `program=SP01, areaOfWork=SP01-AOW01` (second program, sanity check)

**Finding 1 (as originally planned):** compared `indicator_id` sets — every AoW's Outcomes-tier `indicator_id` set matched the Intermediate Outcomes bucket's set 1:1, in every AoW tested.

**Finding 2 (better mechanism, found while investigating Finding 1's "why"):** read `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts` (`buildTocQuery`) to understand *why* the overlap was 100%. Found the backend already computes and returns a group-level `is_aow: boolean` field on every `tocResultsOutcomes` entry — `false` for a ToC node with no work package (`tr.wp_id IS NULL`), which per the repository's own code comment "must appear under every AOW of the science program." This is the exact fact `RES-R-3` needs, already present in the payload `dashboard-lab.component.ts` already fetches via `GET_TocResultsByAowId` — no cross-referencing against the separate Intermediate Outcomes endpoint required.

**Decision:** `RES-DD-2` revised in `design.md` to use `is_aow` instead of `indicator_id`-Set matching. Simpler (one field stamp in an existing mapping, not a second data source + reorder), and more robust (backend SQL join truth, not incidental id reuse across two independently-shaped endpoints). `requirements.md RES-R-3` and `tasks.md RES-T-2` updated to match.

**Residual note (not blocking):** in the sampled test data (`SP01`, `SP02`), every outcome group observed had `is_aow: false` — i.e. no genuinely AoW-exclusive outcome exists live today to positive-test the other branch. `RES-T-2`'s unit tests must cover `is_aow: true` synthetically (mocked), since no live fixture demonstrates it. This does not weaken the design — the repository SQL clearly supports the `is_aow: true` case (`wp.toc_id IS NOT NULL` branch) — it's just unexercised by current data.

**Status:** `RES-T-2` implemented — see §5 below.

## 5. `RES-T-2` Execution — 2026-08-26

**Attempt 1 (two delegations, one attempt — the second closed a Not-Done gap from the first before Review, per the "task with an outstanding gap never reaches PASS-eligible" rule; no rework consumed since the first delegation's code was never faulted):**

- **Implementer (delegation 1):** akili-implementer subagent. Skill: `angular-developer`. Effort: medium.
  - `dashboard-lab.component.ts` — `fromTier` mapping (~line 1418) stamps `__isIntermediateCrosscut: tier === 'outcome' && g?.is_aow !== true`.
  - `reporting-aow-table.component.ts` — `__isIntermediateCrosscut?: boolean` added to `ReportingIndicator`; `isCrossCuttingIntermediate(row)` added.
  - `reporting-aow-table.component.html` — Target button binding widened to `(isIntermediateRow(bucketKind) || isCrossCuttingIntermediate(row)) ? intermediateTargetTooltip : ''`.
  - `reporting-aow-table.component.spec.ts` — new `describe('cross-cutting Intermediate Outcome tooltip (RES-T-2)')`: `isCrossCuttingIntermediate` true/false/undefined; render-level exact-string `prTooltip` assertions for a crosscutting AoW-card row vs. `''`.
  - `reporting-aow-table/CLAUDE.md`, `dashboard-lab/CLAUDE.md` — `Verified:` stamped `2026-08-26 · branch qa-development-2026 · 3194c6134` (pre-commit HEAD hash; will need re-stamping at actual commit time per Reviewer note).
  - Verification: `npx ng lint --quiet` → clean. `npx jest --testPathPattern="reporting-aow-table|dashboard-lab"` → 254/254 passed.
  - **Not Done (flagged):** no `dashboard-lab.component.spec.ts` existed anywhere, so the actual `fromTier` stamping logic was untested directly (only indirectly, via pre-built rows in the render tests).
- **Leader action:** per the "task with an outstanding gap never reaches done" rule, re-delegated to close the gap before sending to Reviewer — did not accept the gap silently, did not mark PASS-eligible with it open.
- **Implementer (delegation 2, same task, closing the gap):** akili-implementer subagent. Skill: `angular-developer`. Effort: medium.
  - Created `dashboard-lab.component.spec.ts` (first spec file for this component) — scoped narrowly to `indicatorsByAow()`'s `fromTier` stamping only, per instruction not to attempt full-component coverage. Investigated the DI graph, found `DashboardLabComponent`'s only eager service reads happen inside `effect()`/`ngOnInit()`, used `overrideComponent(... { set: { template: '' } })` (matching existing `indicator-drawer.component.spec.ts` precedent) and never calls `detectChanges()` so those effects never fire — safe, since `indicatorsByAow` is a `computed()` independent of change detection. Seeded `aowsByCode`/`tocByKey` signals directly with synthetic ToC payloads.
  - Three tests: outcome-tier `is_aow: false` → `__isIntermediateCrosscut: true`; outcome-tier `is_aow: true` (synthetic, no live fixture) → `false`; output-tier (both with `is_aow: false` and with it absent) → never `true`.
  - Verification: `npx ng lint --quiet` → clean. `npx jest --testPathPattern="dashboard-lab.component.spec"` → 3/3 passed.
- **Reviewer verdict: `STATUS: PASS`** (akili-reviewer subagent, lens-checklist mode, effort medium).
  - Verified `!== true` vs `=== false` is not a live hazard by reading the server repository directly: `Boolean(row.is_aow)` at `aow-bilateral.repository.ts:525` normalises the field, so it's always a real boolean on every group — the `undefined` edge case the spec worried about doesn't occur in practice, and would resolve to the correct (fail-open, cross-cutting) direction anyway if it ever did.
  - Confirmed no double-fire risk: the Intermediate Outcomes card is built by a completely different code path (`flattenBucketIndicators`, not `fromTier`), so `__isIntermediateCrosscut` can never even be set on that card's own rows — there's no second write path to worry about.
  - Read both spec files directly (not just the diff) and confirmed exact-value assertions throughout, including the required synthetic `is_aow: true` case.
  - Scope confirmed clean — no flat-table, no Achieved-cell, no `reportingGroups()` reorder (the superseded first-draft mechanism correctly not implemented).
  - **ADVISORY (reliability, non-blocking):** the app now has two different conventions for a *missing* `is_aow` — this diff treats it as cross-cutting (`!== true`), while the legacy `entity-aow.service.ts` treats a missing/false value as AoW-exclusive (`=== false`, pinned by its own spec). Both are correct today (the field is always present as a real boolean), but would diverge if the backend ever started omitting it. Recommended: one line in `dashboard-lab/CLAUDE.md` at re-stamp time flagging this so a future maintainer doesn't "harmonise" one side blind without checking both specs.

**Attempts consumed: 1 of 3** (the two delegations were one task's completion sequence, not two rework attempts against a Reviewer FAIL).

**Remaining before `[x]`:** commit (user has not yet been asked to approve one), `CLAUDE.md` `Verified:` re-stamp with the real post-commit hash, and the user's manual browser check (`RES-TEST-4`).

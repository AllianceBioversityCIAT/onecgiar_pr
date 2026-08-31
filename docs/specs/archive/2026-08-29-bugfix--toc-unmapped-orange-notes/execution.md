# Execution Log — Stop ToC-reference "not found" notes when unmapped

## 1. Document Control

- **Spec path:** `docs/specs/bugfix/toc-unmapped-orange-notes/`
- **Leader model:** claude-sonnet-5 (T1 tier per registry; session ran on sonnet, no downgrade needed)
- **Approval mode:** not declared in requirements.md Document Control — treated as gated (default)
- **Started:** 2026-08-28
- **Budget (design.md §Budget):** 2 expected tasks, ~15-20 LOC changed + ~60-90 LOC test, **1 expected review round**

## 2. Task Execution History

### TOC-T-1 — Suppress Centers/Science Program notes on unmapped (No) results

**Status: `[x]` PASS (attempt 3, after a user-approved pause for cross-session coordination)**

**Attempt 1** (2026-08-28-29, effort medium):
- Files changed: `rd-contributors-and-partners.component.html` (Centers gate L100, Science gate L302 — both extended with `&& planned_result !== false`), `rd-contributors-and-partners.component.spec.ts` (new describe `TOC-T-1`, 2 test cases).
- Verification: `npx jest --testPathPattern="rd-contributors-and-partners.component.spec"` → 62/62 passed. `npx ng lint --quiet` → clean.
- Reviewer verdict: **FAIL**.
  1. Discovered Issue: Science block has no outer `@else` — extending its gate the same way as Centers makes the ENTIRE Science section (note + full-catalog "Other(s)" dropdown) disappear when unmapped, not just the note. Violated TOC-R-1 / TOC-AC-1 ("dropdowns MUST NOT be empty or disabled"). The Implementer's own new test asserted the empty-render as expected, certifying the regression.
     Remediation: restructure so the Science section stays reachable — move the note-suppression to the note itself, not the outer gate.
  2. Discovered Issue: TOC-AC-1's Centers assertion checked only element presence, not that `[options]` bound to the real full catalog.
     Remediation: assert bound options equal the fixture catalog.

**Attempt 2** (2026-08-29, effort high):
- Files changed: `rd-contributors-and-partners.component.html` (Science block restructured: outer gate reverted to plain `isCP2026()`; inner "reference" branch gains `&& planned_result !== false`; the note (only) wrapped in its own `@if (planned_result !== false)`), `rd-contributors-and-partners.component.spec.ts` (TOC-AC-1 rewritten to assert options-binding equality for both Centers and Science; Science assertions flipped from "absent" to "present with full catalog").
- Verification: `npx jest --testPathPattern="rd-contributors-and-partners.component.spec"` → 62/62 passed. `npx ng lint --quiet` → clean.
- Reviewer verdict: **FAIL** — both attempt-1 issues confirmed resolved (Science section correctly stays reachable via the auto-activating "Other(s)" dropdown; TOC-AC-2/AC4 preserved; options-binding assertions sound; mapped+user-toggled-Other case unaffected). But a **new issue surfaced by making the Centers flat `@else` (L126-141) reachable in the unmapped state**: the pre-existing, separately-gated "Other(s)" auto-activation block at L163 (`@if (isCP2026() && (showOtherCenters || !hasReferenceCenters()))`) was not updated and still fires whenever `!hasReferenceCenters()` — which is now also true in the unmapped case. Its conditional label resolves to the same string, `'Contributing CGIAR Centers'`, as the newly-reachable flat dropdown — so the unmapped state now shows **two** identically-labeled Centers controls bound to two different models (`contributing_center` vs `otherCentersSelected`).
  - Violated Rule: requirements.md §3 scenario TOC-R-1 ("each show **their** plain full-catalog dropdown", singular) / TOC-AC-1; design.md TOC-DD-1 Consequences ("None negative") — the consequence analysis did not account for L163's independent gate.
  - Remediation offered: gate L163 with the same `planned_result !== false` conjunct — **but the Reviewer flagged this needs checking against `LC-DD-4`** (documented in this folder's `CLAUDE.md`): `RdContributorsAndPartnersService.onLeadCenterSelected` auto-adds a picked Lead Center into `otherCentersSelected` when the contributing-centers union is empty (exactly the unmapped case), and expects L163's dropdown/chips to render that auto-added entry. Hiding L163 in the unmapped case could make an auto-added Lead Center invisible with no way to remove it.

**Decision point:** two consecutive FAILs (design.md's Budget stated 1 expected review round; this is entering round 3) plus a fix that now requires touching logic actively being modified by a concurrent session (`onecgiar-pr-35`, spec `docs/specs/bugfix/lead-center-full-catalog`, tasks LC-T-1..T-4, which owns `LC-DD-4`/`onLeadCenterSelected` in the same files) triggered escalation per both the **Budget Tripwire** and cross-session-conflict handling in `.agents/leader.md`. Presented to the user as a 3-way choice (attempt 3 now / pause for cross-session coordination / narrow scope and file a follow-up). **User chose: pause until cross-session is sorted** (2026-08-29).

**Cross-session negotiation (2026-08-29):** relayed the L163 finding to `onecgiar-pr-35` (running `lead-center-full-catalog`, owns `LC-DD-4`/`onLeadCenterSelected` in the same file). They confirmed no live conflict (L163 unguarded today, they wouldn't touch it), proposed an escape-hatch OR-clause (`otherCentersSelected?.length > 0`) alone — which this session flagged as insufficient on its own (it only adds firing cases, never narrows the pre-existing `!hasReferenceCenters()` clause that's already true when unmapped). Combined guard negotiated and verified by both sessions:
`isCP2026() && (showOtherCenters || (!hasReferenceCenters() && planned_result !== false) || (otherCentersSelected?.length ?? 0) > 0)`.
User confirmed the other session had finished and gave the go-ahead to resume (2026-08-29).

**Attempt 3** (2026-08-29, effort max — final attempt, correctness-critical):
- Files changed: `rd-contributors-and-partners.component.html` L163 (now L168) — condition changed exactly to the negotiated combined guard, with an explanatory comment. `rd-contributors-and-partners.component.spec.ts` — `TOC-AC-1` strengthened to assert exactly one Centers control renders (via combined-selector count) in the unmapped+empty case; new case added for unmapped+`otherCentersSelected`-populated (LC-DD-4 escape hatch) asserting both controls render and the chip/remove affordance stays reachable via the direct `*ngFor` at html:184 (not `componentInstance.value`, due to an unrelated pre-existing CVA/TestBed quirk in `PrMultiSelectComponent` where `writeValue` isn't re-invoked post-render in this harness — Reviewer ruled this a legitimate behavioral proof, not a dodge); `TOC-AC-2` re-confirmed unaffected.
- Red/green evidence: reverted L163→ old condition, confirmed 2 of the 3 TOC-T-1 cases failed (duplicate `toc-other-centers` present where it should be absent); reapplied, all 3 passed.
- Verification: `npx jest --testPathPattern="rd-contributors-and-partners.component.spec"` → 63/63 passed. `npx ng lint --quiet` → clean.
- Reviewer verdict: **PASS.** Independently confirmed all four properties (exactly-one-control when unmapped+empty; escape hatch preserves LC-DD-4 chip visibility; AC4/TOC-AC-2 bit-for-bit unchanged; user-toggle `showOtherCenters` unaffected). Confirmed Science block and Centers reference/flat split untouched from attempt 2 (already-passed), and no Lead Center wiring or `service.ts` touched (concurrent session's territory).
- **ADVISORY (non-gating, recorded for follow-up, not reworked):** (1) in the escape-hatch state both Centers controls carry the same label `'Contributing CGIAR Centers'` — acceptable cost of not hiding the auto-added chip, cheaply improvable later by keying the L172-area label off which branch is flat vs auto-activated. (2) This execution.md itself needed the closing entry you're reading now before archive — noted by the Reviewer, resolved by this edit.

**Final state: `[x]` PASS.** All three TOC-T-1 sub-fixes (Centers reference/flat split, Science reachability, Centers Other(s) duplicate) verified across 3 attempts, final Reviewer PASS on 2026-08-29.

### TOC-T-2 — Suppress External Partners note on unmapped (No) results (shared component, covers IPSR)

**Status: `[x]` PASS (attempt 2)**

**Attempt 1** (2026-08-28-29, effort medium):
- Files changed: `normal-selector.component.html` (L33 gate extended with `&& result_toc_result?.planned_result !== false` — optional chaining used, deviating from design.md's literal non-optional form), new file `normal-selector.component.spec.ts` (2 test cases).
- Verification: `npx jest --testPathPattern="normal-selector.component.spec"` → 22/22 passed (incl. pre-existing `cpnormal-selector.component.spec.ts`, untouched). `npx ng lint --quiet` → clean.
- Deviation note (Implementer-reported): literal non-optional form threw `TypeError` and broke 8 pre-existing tests in `cpnormal-selector.component.spec.ts` (forbidden to touch) because those mocks omit `result_toc_result`.
- Reviewer verdict: **FAIL**, plus explicit ruling on the deviation.
  1. **`?.` deviation — ruled CORRECT, must be kept.** `partnersBody` is overwritten wholesale by the raw GET payload in both the classic flow (`rd-contributors-and-partners.service.ts:361`) and the IPSR flow (`ipsr-contributors.component.ts:212`); the service itself already optional-chains this same key elsewhere (L383/L392). Reverting to the literal form risks a template `TypeError` on the IPSR path specifically — the exact surface TOC-R-3 governs. Design.md §6.2 is stale on this point (documentation-only gap, not a blocker).
  2. Discovered Issue: the sibling "Other(s)" auto-activation block (then L132, `showOtherPartners`) was not gated — `showOtherPartners` is true whenever `!hasReferencePartners()`, which is already true when unmapped, so it kept rendering alongside the new flat `@else`, producing two competing partner controls bound to different models.
     Violated Rule: TOC-R-1 / TOC-AC-1 ("plain full-catalog dropdown"; "same full catalogs as pre-2026 legacy" — a state the pre-2026 branch can never reach since it's `isCP2026()`-gated).
     Remediation: add the same guard to that block; strengthen the test to assert exactly one partner control renders.
  - TOC-R-3 (IPSR parity) independently confirmed: `ipsr-contributors.module.ts` imports `RdContributorsAndPartnersModule` (exports the edited component), no IPSR-specific change needed.

**Attempt 2** (2026-08-29, effort high):
- Files changed: `normal-selector.component.html` (L134 "Other(s)" gate extended with the same `&& result_toc_result?.planned_result !== false` guard, plus explanatory comment), `normal-selector.component.spec.ts` (new test `TOC-TEST-3b`: asserts exactly one `PrMultiSelectComponent` renders and `[data-testid="toc-other-partners"]` is absent in the unmapped state).
- Red/green evidence: reverted only the L134 guard → `TOC-TEST-3b` failed (`Expected: 1, Received: 2`); reapplied → 23/23 passed.
- Verification: `npx jest --testPathPattern="normal-selector.component.spec"` → 23/23 passed. `npx ng lint --quiet` → clean.
- Reviewer verdict: **PASS.** Confirmed the guard is a pure conjunct that only subtracts in the `planned_result === false` branch — traced `showOtherPartners`'s definition and TOC-AC-2/mapped-and-toggled-Other cases are unaffected. TOC-R-3 re-confirmed inherited.
- **ADVISORY (non-gating):** the now-gated L134 block also holds the `otherPartnersSelected` chip list; a result that saved "Other" partners while mapped **Yes**, then switched to **No**, would keep those entries in `allSelectedPartners`'s count with no visible chip or removal path. Pre-existing state the spec doesn't address — flagged for the manual QA pass in `tasks.md` §6, not a code change.

**Not yet done:** final commit (per `[SPEC:...]` convention) and `tasks.md` status flip — both happen immediately following this entry per the evidence-before-checkbox rule below. No `Not Done / Assumptions` outstanding from the Implementer.

## 3. Summary

- **TOC-T-1: DONE.** All three sub-fixes (Centers reference/flat split, Science reachability, Centers Other(s) duplicate) verified across 3 attempts; final Reviewer PASS. Involved one genuine cross-session coordination episode with a concurrent AKILI session (`onecgiar-pr-35`, `lead-center-full-catalog`) over shared file territory — resolved by direct negotiation, recorded above.
- **TOC-T-2: DONE.** External Partners fix (+ IPSR parity) verified, reviewed, PASS on attempt 2.
- Both tasks in `tasks.md` are `[x]` with matching PASS evidence above. Spec work is complete; not yet committed (per standing "no auto-commit" instruction — awaiting explicit user go-ahead) and not yet archived.
- **Rollout checklist (tasks.md §6) still open:** PR, CI, manual QA on test env (2026-phase result answered No/Yes, IPSR spot-check) — none of that has run yet, only unit-level Jest/lint verification.

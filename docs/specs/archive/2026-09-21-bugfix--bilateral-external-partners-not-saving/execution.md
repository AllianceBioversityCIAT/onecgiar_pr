# Execution Log — Bilateral External Partners Not Saving (Lite / Bug)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `bugfix/bilateral-external-partners-not-saving` |
| Linked docs | `requirements.md`, `design.md`, `tasks.md` (same folder) |
| Approval mode | not specified in `tasks.md` Document Control — treated as `gated` (default): each gate gets a human check-in |
| Executor | AKILI Leader (Sonnet 5), via `/akili-execute` |
| Started | 2026-09-21 |

## 2. Task Execution History

### `BIL-T-1` — Surface a visible error + Retry when the centers catalogue fails to load

**Final status:** PASS
**Date:** 2026-09-21
**Implementer attempts:** 2
**Reviewer verdicts:** FAIL (attempt 1) → PASS (attempt 2)

#### Attempt 1

- **Spawned:** `akili-implementer` (Step 8E wrapper), effort `medium`.
- **Files changed:**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/section-contributors.component.ts` — added `centersLoadFailed` signal; `loadCenters()`'s `getData()?.catch(() => {})` now sets `centersLoadFailed.set(true)`; `loadedCenters` subscription resets it to `false` on success; new `retryLoadCenters()` method mirroring `retryLoadExternalPartners()`.
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/section-contributors.component.html` — new `@if (centersLoadFailed())` block, mirrors the `partnersLoadFailed` banner + Retry pattern, placed just above it.
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/section-contributors.component.spec.ts` — 7 new tests (`describe('when the centers catalogue cannot be read', ...)`): reproduces the original bug, retry-recovers, retry-then-fails-again.
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/CLAUDE.md` — dated entry + re-stamped `Verified:` line, test count 104 → 111.
- **Implementer verification:** `npx jest --testPathPattern=section-contributors.component.spec --silent` → 111/111 passed (104 pre-existing + 7 new). Red-run proof via stash: 3 new tests failed pre-fix with `centersLoadFailed is not a function` / `retryLoadCenters is not a function`. `npx ng lint --quiet` → clean.
- **Not Done / Assumptions (informational, non-blocking):** did not touch `CentersService` (disqualifier confirmed N/A); did not add unsubscribe-before-resubscribe for `centersSubscription` in `retryLoadCenters()` (pre-existing pattern, argued harmless — idempotent `mapCenters()`); folder `CLAUDE.md` already over its 120-line cap, only appended the required entry.
- **Reviewer verdict: FAIL.**
  - **Discovered Issue:** The template-rendering half of the task's Falsifier was unverified. All new tests assert only signals (`centersLoadFailed()`, `partnersHydrated()`); `section-contributors.component.spec.ts` stubs the template with `overrideTemplate('<div></div>')`, so it structurally cannot prove the `@if (centersLoadFailed())` branch actually renders — the same class of gap that let P2-3520 through in this file previously.
  - **Violated Rule:** `tasks.md` § `BIL-T-1` → Verification → Falsifier ("...and the error-banner template branch renders"); `requirements.md` `BIL-AC-1`.
  - **Remediation Suggestion:** Add DOM-rendering assertions to `section-contributors.readonly.spec.ts` (the sibling harness that renders the real template), using the existing `data-testid="centers-load-error"` / `data-testid="centers-load-retry"` hooks.
  - **ADVISORY** (non-gating, recorded only): (1) Reliability — `retryLoadCenters()` → `loadCenters()` re-subscribes `centersSubscription` without unsubscribing the prior one; newly reachable via retry, harmless today since `mapCenters()`/signal sets are idempotent. (2) Readability/UX — banner placement inside `.sc-block--partners` is exactly what design §9 prescribes; no action. (3) Test realism — retry-succeeds test emits `loadedCenters` synchronously rather than after an async flush; cosmetic.

#### Attempt 2 (rework)

- **Spawned:** `akili-implementer`, effort bumped to `high`, fed the Reviewer's FAIL report verbatim + Attempt History note (do not redo `.ts`/`.html`, already correct — only add DOM coverage) + the three ADVISORY items explicitly marked non-actionable for this pass.
- **Files changed:**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/section-contributors.readonly.spec.ts` — new `describe('centers-catalogue load failure (BIL-T-1)', ...)` (3 tests): banner + Retry button render when `centersLoadFailed()` is `true`; clicking Retry invokes `retryLoadCenters()`; both nodes absent when the signal is `false`.
  - No production (`.ts`/`.html`) changes — none required.
- **Implementer verification:** `npx jest --testPathPattern=section-contributors --silent` → 127/127 passed (124 pre-existing + 3 new) across both spec files. `npx ng lint --quiet` → clean.
- **Not Done / Assumptions:** none.
- **Reviewer verdict: PASS.**
  - **Summary:** The three new tests close exactly the gap that FAILed attempt 1 — they run in the harness that compiles the real template (no `overrideTemplate`), set the signal, `detectChanges()`, and query the actual DOM for the `data-testid` hooks; the false-case test guards against an always-rendered/mis-scoped block. Production code re-read at source and re-confirmed conformant (signal, catch handler, retry method; `CentersService` untouched; design tokens only, no hex; no new UX pattern).
  - **ADVISORY** (non-gating): folder `CLAUDE.md` § Tests still said `section-contributors.readonly.spec.ts — 13 casos` after this attempt (now 16) — stale count only, DoD dated-entry/`Verified:` requirement itself was already met.

#### Post-PASS cleanup (Leader, inline — 1-file trivial correction)

- Updated `section-contributors/CLAUDE.md` § Tests: `13 casos` → `16 casos (BIL-T-1 añadió 3: banner/Retry de centers renderizado en el DOM real)`, per the Reviewer's attempt-2 ADVISORY.

**Requirements covered:** `BIL-R-1`, `BIL-R-2`, `BIL-R-3`, `BIL-AC-1`, `BIL-AC-2`, `BIL-AC-3`.

**Decisions made:**
- Kept DD-1 (fail-visible, not fail-open) as specified — no deviation.
- Placed the DOM-rendering regression coverage in `section-contributors.readonly.spec.ts` rather than `component.spec.ts` named in `tasks.md` § 5 Test plan, because the latter is structurally incapable of DOM assertions (template stub). Reviewer explicitly confirmed this is not a scope/file-boundary violation — the file is inside the task's declared folder.

**Issues encountered:** one rework round (Reviewer FAIL → fix → PASS), on a single, narrowly-scoped gap (missing DOM-rendering proof). No spec ambiguity, no pivot, no CentersService disqualifier tripped.

**Final verification result:** `npx jest --testPathPattern=section-contributors --silent` → **127/127 passed**. `npx ng lint --quiet` → **clean**. No migration (N/A). No API/DTO surface touched.

**Commit status:** NOT committed by the Leader — per standing user instruction ("no auto-commit without explicit go-ahead"), the working tree contains the finished, reviewed, PASSing diff, awaiting the user's approval to stage and commit under the convention `🔧 fix(section-contributors): ...`.

## 3. Summary

All tasks in `tasks.md` (`BIL-T-1`, the spec's only task) are `[x]` with matching PASS evidence above. The spec's single-task dependency graph is fully satisfied. Budget (`design.md` § 12: 1 task, ~45 LOC, 1 review round) was exceeded by one extra review round (2 total) due to the DOM-rendering gap in attempt 1 — within the 3-attempt rework ceiling, not escalated as a budget tripwire since the delta is one round, not a scope blowout.

**Remaining before this spec can be marked `shipped` (per `tasks.md` § 7 Cleanup & follow-ups):**
- User approval + commit (`🔧 fix(section-contributors): ...`).
- PR opened against the appropriate branch; CI green.
- Manual QA on staging (simulate a centers-load failure, confirm banner + Retry recover) per `tasks.md` § 6.

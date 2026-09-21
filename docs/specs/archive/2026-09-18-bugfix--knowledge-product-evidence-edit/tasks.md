# Module Spec — Knowledge Product Evidence Tag-Marker Edit — `tasks.md`

**Linked spec:** `docs/specs/bugfix/knowledge-product-evidence-edit/requirements.md` + `design.md`.
**Status:** implemented — all tasks `[x]`. Awaiting commit/PR (withheld pending user go-ahead). See `execution.md` for the audit trail.

| Task | Status |
|---|---|
| `KPE-T-1` | `[x]` — Reviewer PASS (attempt 3/3) **and** manual in-browser verification passed (`execution.md` §2, §3) |
| `KPE-T-2` | `[x]` — Reviewer PASS (attempt 1/3), red-check confirms the test is not a tautology (`execution.md` §2) |

> ⚠️ **Merge constraint:** all three modified files — `rd-evidences.component.html`, `rd-evidences.component.spec.ts` and the folder `CLAUDE.md` — **must land in one commit** (`onecgiar-pr-client/docs/COMPONENT-DOCS.md` §6 is commit-scoped). See `execution.md` §4.

## 1. Scope of this task list

- **Module / feature:** `results` (client) — Knowledge Product evidence tag-marker edit.
- **Owner / driver:** santiago.sanchez@cgiar.org
- **Depth:** Lite (Bug Mode).

## 2. Pre-flight checklist

- [x] `requirements.md` approved.
- [x] `design.md` approved.
- [x] No open questions remain in `requirements.md` / `design.md`.
- [x] No conflicting in-flight spec touching `rd-evidences` (checked `docs/specs/bugfix/`: `evidence-modal-sticky-actions` and `p2-3355-kp-section-five-empty` touch the same folder but different lines/behavior — no overlap with `.ev_actions` gating).
- [x] No migration involved.

## 3. Task list

### `KPE-T-1` — Split edit/delete gating on KP evidence cards

- **Status:** `[x]` — Reviewer `PASS` on attempt 3 of 3 **and** manual in-browser verification passed, both 2026-09-08. See `execution.md` §2 and §3.
- **Type:** `client`
- **Description:** In `rd-evidences.component.html`, give the edit (pencil) button its own `*ngIf` (drop `!dataControlSE.isKnowledgeProduct`, keep `!api.rolesSE.readOnly && !api.dataControlSE?.currentResult?.status`) and give the delete button its own `*ngIf` (keep `!dataControlSE.isKnowledgeProduct` plus the existing guards), per `design.md` §4.1 / `KPE-DD-1`. Do not touch the "Add evidence" button (line 98) or any file under `evidence-item/`.
- **Implements:** `KPE-R-1`, `KPE-R-4`, `KPE-AC-1`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.html`
- **Depends on:** `—`
- **Blocks:** `KPE-T-2`
- **Estimate:** `S`
- **Tests:** `KPE-TEST-1`, `KPE-TEST-3`
- **Definition of done:**
  - [x] Edit button renders for a Knowledge Product evidence card (`isKnowledgeProduct = true`), gated only on `!readOnly && !currentResult.status`.
  - [x] Delete button still does NOT render for a Knowledge Product evidence card, under any `readOnly`/`status` combination.
  - [x] "Add evidence" button still does NOT render for a Knowledge Product result (unchanged, verify no regression).
  - [x] Non-KP evidence cards render both edit and delete exactly as before (no regression — existing spec assertions in `rd-evidences.component.spec.ts` for non-KP still pass unmodified).
  - [x] Manual in-browser check **PASSED** (2026-09-08): pencil icon appears on the KP evidence card, opens the "Edit Evidence" modal, Impact-Area tag checkboxes are checkable and correctly pre-populated, Save persists ("Section saved successfully"), no visual glitches or layout issues, delete button still absent for KP. Closes the `requirements.md` §11 accepted-risk row. See `execution.md` §3.
  - [ ] **OPEN.** Code merged via project commit convention (`🔧 fix(rd-evidences) [ticket]: ...`) — no commit made; withheld pending user go-ahead.
  - [x] Lint clean (`npx ng lint --quiet`) — `All files pass linting.`
  - [x] Client coverage thresholds (50/60/60/60) still met — additive tests only on an already-covered file; suite green at 92/92.

**Verification command:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="rd-evidences.component.spec"` — expect green, including the new/updated assertions above.

**What would make this FAIL (falsifiability check):** a test asserting the pencil icon's `*ngIf` expression still contains `!dataControlSE.isKnowledgeProduct` (i.e., checking the template source string or rendering with `isKnowledgeProduct = true` and asserting the edit button is present in the DOM) — if the exclusion is still there, the button is absent and the test fails for real, not by construction.

---

### `KPE-T-2` — Regression test: Principal-score KP evidence can be completed

- **Status:** `[x]` — Reviewer `PASS` on attempt 1 of 3 (2026-09-08). Red-check performed: reverting `KPE-T-1`'s template change turns a `KPE-T-2` test red, confirming the suite is not a tautology. See `execution.md` §2.
- **Type:** `tests`
- **Description:** Add a regression test in `rd-evidences.component.spec.ts` reproducing the exact bug from the proposal's reproduction steps: a Knowledge Product result with a Principal (`'3'`) tag level and an existing evidence row whose matching `*_related` flag is `false`. Assert `evidenceSectionComplete` is `false` before the flag is set, then simulate the modal save path (set the flag on the evidence row, as `confirmCreateEvidence()` would after the checkbox toggle) and assert `evidenceSectionComplete` becomes `true` and `validateCheckBoxes()` returns `''` (no warning). This is the regression test required by Bug Mode — it must fail against the pre-fix behavior conceptually (the underlying `validateCheckBoxes()`/`evidenceSectionComplete` logic is unchanged and already correct; what this test locks is that the KP path can actually reach the flag-setting step end-to-end via the now-visible edit trigger) and pass after `KPE-T-1` lands.
- **Implements:** `KPE-R-3`, `KPE-AC-2`, Bug Mode regression requirement
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.spec.ts`
- **Depends on:** `KPE-T-1`
- **Blocks:** `—`
- **Estimate:** `S`
- **Tests:** `KPE-TEST-2`
- **Definition of done:**
  - [x] New test named to reflect the bug — `'allows a Knowledge Product evidence tag to be edited to satisfy a Principal impact-area score'`.
  - [x] Test asserts the pre-edit state is incomplete (`evidenceSectionComplete === false`, `validateCheckBoxes()` non-empty) — Reviewer traced both getters to source and confirmed the assertions are non-vacuous.
  - [x] Test asserts the post-edit state is complete (`evidenceSectionComplete === true`, `validateCheckBoxes() === ''`).
  - [x] Test also asserts, on the same fixture, that the edit trigger's gating condition (from `KPE-T-1`) would have made the modal reachable — sibling test `'confirms the edit trigger is reachable on this exact KP fixture'` shares the `beforeEach` fixture. Reviewer ruled this satisfies "re-use **or reference**" at the task level: the suite cannot be green with `KPE-T-1` reverted.
  - [x] Runs green after `KPE-T-1` (`95 passed, 95 total`); **red-check performed** — reverting the template makes the `KPE-T-2` reachability test fail (`Tests: 2 failed, 93 passed`), confirming it is not a tautology. Template restored and independently re-verified by the Leader.
  - [x] Lint clean — `All files pass linting.`

**Verification command:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="rd-evidences.component.spec"`.

**What would make this FAIL (falsifiability check):** temporarily re-add `!dataControlSE.isKnowledgeProduct` to the edit button's `*ngIf` (i.e. revert `KPE-T-1`) — if this test still passes, it is not actually covering the reachability of the fix and must be rewritten to assert on the rendered DOM/component state that depends on `KPE-T-1`, not only on the already-correct `validateCheckBoxes()` math.

**What this test does NOT prove:** it does not prove the pencil icon is visually clickable or positioned correctly in a real browser (jsdom does not lay out CSS) — that remains the manual in-browser check under `KPE-T-1`'s definition of done.

## 4. Dependency graph

```
KPE-T-1 (template gating split)
   └── KPE-T-2 (regression test, depends on KPE-T-1's visibility fix existing to test against)
```

Both tasks touch only `onecgiar-pr-client`; no parallel branch — `KPE-T-2` is a thin, sequential follow-on to `KPE-T-1` and could reasonably be done in the same commit/PR.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `KPE-TEST-1` | unit (client) | `KPE-R-1`, `KPE-AC-1` | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.spec.ts` |
| `KPE-TEST-2` | unit (client, regression) | `KPE-R-3`, `KPE-AC-2` | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.spec.ts` |
| `KPE-TEST-3` | unit (client, regression guard) | `KPE-R-4`, `KPE-AC-1` | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.spec.ts` (assert delete/add still hidden for KP) |

Client coverage MUST stay above 50/60/60/60 (this spec only touches an already-covered file, so it should trend neutral-to-up).

## 6. Rollout & verification

- [ ] PR opened with commit message `🔧 fix(rd-evidences) [ticket]: enable KP evidence tag-marker editing`.
- [ ] CI green (lint, Jest, build).
- [ ] Manual QA on staging: reproduce Hector Tobon's exact scenario (KP result, CGSpace-synced evidence, Principal score) and confirm the warning clears after checking the matching tag.
- [ ] No bilateral/platform-report payload change — no downstream notification needed.

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged and verified on staging.
- [ ] No new cross-cutting UX pattern introduced — nothing to promote into `docs/ux-ui/design.md`.
- [ ] File a follow-up if manual QA surfaces that the icon needs visual repositioning (out of scope here per `design.md` §7).

## 8. Roll-back plan

1. Revert the PR.
2. No migration, no feature flag, no bilateral payload change — a plain revert fully restores prior (broken) behavior with no further steps.

## Required cross-references

- `docs/specs/bugfix/knowledge-product-evidence-edit/requirements.md`, `design.md`, `proposal.md` (this folder).
- `docs/prd.md` (`AC-6`).
- `onecgiar-pr-client/CLAUDE.md` §9 (browser verification rules — both localStorage keys, stale-bundle check).

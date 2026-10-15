# Module Spec — `bilateral-save-draft-footer` — `tasks.md`

- **Linked spec:** `requirements.md` + `design.md` (same folder).
- **Status:** resolved — `BSF-T-2` shipped, `BSF-T-1` superseded (Pivot), see `execution.md` and `archive-summary.md`

---

## 1. Scope of this task list

- **Module / feature:** `bilateral` (result editor footer + autosave service)
- **Owner / driver:** — (not specified)
- **Status:** not-started

---

## 2. Pre-flight checklist

- [ ] `requirements.md` is approved (status `approved`).
- [ ] `design.md` is approved.
- [ ] `BSF-OQ-1` is explicitly accepted as non-blocking follow-up (see requirements.md §10).
- [ ] No conflicting in-flight spec touching `bilateral-result-creator` or `bilateral-auto-save.service` found under `docs/specs/`.
- [ ] No migration involved — client-only change.

---

## 3. Task list

### `BSF-T-1` — Stop the footer's Save draft button from being clipped `[~]` — SUPERSEDED (Pivot resolved: wrong target; real defect moved to `bugfix/field-card-save-pill-truncation`), see `execution.md`

- **Type:** `client`
- **Description:** Add a `min-width: 0` plus an internal wrap/shrink rule to `.bcr-editor-footer__group` in `bilateral-result-creator.component.scss`, reusing the existing `@container` breakpoint already driving this file's responsive behavior, so the capsule's own content (state text + Save draft button) never overflows past the capsule's box at narrow column widths. Add a rendered-measurement regression test.
- **Implements:** `BSF-R-1`, `BSF-AC-1`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.scss`
  - A new or existing Cypress component/E2E spec for this page (Implementer's choice of location, following existing conventions in `cypress/e2e/` or a colocated `.cy.ts` if one already exists for this component)
- **Depends on:** `—`
- **Blocks:** `—` (independent of `BSF-T-2`)
- **Estimate:** `S`
- **Review:** `checklist` — pure CSS, no shared symbol/migration/auth/payload change.
- **Verification:**
  - **Falsifier:** At a column width where the right-hand capsule's content is documented to exceed available space (~720px column, per `bilateral-result-creator/CLAUDE.md`'s own 2026-10-08 note), measure the Save draft button's bounding rect in a real browser and assert it is fully contained within `.bcr-layout`'s visible bounds. Baseline (pre-fix, to be walked before writing the test): at that width, the button's bounding rect extends outside the ancestor's clipping bounds (partially or fully clipped) — this divergence is the falsifier.
  - **Red run:** The new Cypress test, run against the pre-fix SCSS, fails on the bounding-rect containment assertion. After the fix, it passes.
  - **Disqualifier:** If the fix causes the footer to wrap into two rows at widths where the 2026-10-08 fix's own tests expect a single row (check those tests specifically — do not just check the one narrow width), this re-introduces the bug that fix solved. Test at least two widths: the narrow one where clipping currently happens, and a normal/wide one where the single-row layout must be preserved.
  - **Consumers:** none (no existing test asserts on this capsule's clipping behavior — confirmed by this spec's Premise Ledger P-7's scope, which covers the service-side tests; a targeted grep for `bcr-editor-footer` in `cypress/` and `*.spec.ts` before writing the fix is still required to confirm nothing else pins the current (broken) layout).
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`🔧 fix(bilateral-result-creator): ...`).
  - [ ] Lint + format clean (`npx ng lint --quiet`).
  - [ ] New rendered-measurement test added and green at the narrow width; existing footer-wrap behavior (2026-10-08 fix) re-confirmed unaffected at a normal width.
  - [ ] No migration involved.
  - [ ] No secret or token leaked in logs or messages.
  - [ ] No API surface changed.
  - [ ] No new i18n keys needed.
  - [ ] No bilateral/platform-report payload change.
  - [ ] Manual check in a running `ng serve`: resize the browser to ~720px column width in the Bilateral editor — the Save draft button stays fully visible.

### `BSF-T-2` — Stop a stale, unrelated field error from misreporting a successful save as failed

- **Type:** `client`
- **Description:** In `triggerManualSave()` (`bilateral-result-creator.component.ts`), capture the set of fields actually included in the flush being dispatched (read before `flush()` drains `_pendingFields`, same timing discipline as the existing `hadChanges` capture at line ~1239). Use that captured set — not the section-wide `hasErrorFor(section)` scan — to decide whether to report "Save failed" and whether `waitForSectionSave`'s poll loop should exit early. Add the narrower check to `BilateralAutoSaveService` alongside (not replacing) the existing section-scoped `hasErrorFor`/`lastErrorMessageFor`, since other call sites may still need the section-wide version.
- **Implements:** `BSF-R-2`, `BSF-R-3`, `BSF-AC-2`, `BSF-AC-3`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-auto-save.service.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-auto-save.service.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.spec.ts`
- **Depends on:** `—`
- **Blocks:** `—` (independent of `BSF-T-1`)
- **Estimate:** `M`
- **Review:** `full` — this task narrows an already-delivered correctness mechanism (`hasErrorFor`'s 15s-timeout short-circuit, design.md §2.3 Reversion Challenge); per `/akili-execute` Step 2.3 override (d), a task that reverts/narrows already-delivered behavior always gets a full conformance Reviewer regardless of predicate.
- **Verification:**
  - **Falsifier:** Against the REAL `BilateralAutoSaveService` (not mocked): (1) stage and flush field A for a section, force/mock its PATCH to fail, confirming `fieldStatus()['A'] === 'error'`; (2) stage and flush field B (different field, same section's endpoints), with B's PATCH succeeding; (3) assert the save-failure determination for step (2)'s flush is `false` (not failed), even though `hasErrorFor(section)` (the old, section-wide check) would still read `true` because of A's stale status. Baseline (pre-fix, walked before writing): step (3)'s assertion against the OLD section-wide check fails — `hasErrorFor(section)` returns `true`, misreporting B's successful flush as failed. This divergence is the falsifier.
  - **Red run:** `npm run test -- --testPathPattern="bilateral-auto-save.service.spec"` (and/or the component spec, depending on where the Implementer places the new scoped-check logic) — the new test fails on the pre-fix code (old section-wide check used) and passes once the fix scopes the check to the current flush's fields.
  - **Disqualifier:** If the fix also makes a GENUINE current-flush failure go unreported (a field that fails as part of THIS flush no longer shows "Save failed"), that is a regression of `BSF-R-3` — the task must include a second assertion proving a current-flush failure is still correctly caught and still exits the poll loop promptly (not the full 15s timeout). If the Implementer cannot make both assertions pass simultaneously with a single scoping mechanism, STOP and report a checkpoint/blocker rather than picking one at the expense of the other.
  - **Consumers:** `bilateral-auto-save.service.spec.ts:57-67` ("retains failed section state for a retry") MUST still pass unmodified (confirms the same-field retry path is untouched). `bilateral-result-creator.component.spec.ts`'s existing tests that mock `hasErrorFor`/`lastErrorMessageFor` (call sites ~185-186, 926-930, 2062-2063) MUST be re-run and confirmed green — if the component now calls a *different* (new, scoped) method instead of/alongside the mocked ones, update those specific mocks to match, but do not change what they assert about user-visible behavior. Before writing the fix, re-run a grep for `fieldStatus\(\)|hasErrorFor|lastErrorMessageFor` across `src/` to confirm (per `design.md`'s Premise Ledger "Assumed, not independently re-verified" note) no other consumer of per-field error status exists that this scoping change would silently break.
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`🔧 fix(bilateral-auto-save): ...`).
  - [ ] Lint + format clean (`npx ng lint --quiet`).
  - [ ] New falsifier test (both directions: stale-error-doesn't-block, genuine-current-error-still-blocks) added and green; `bilateral-auto-save.service.spec.ts:57-67` confirmed unmodified and green; `bilateral-result-creator.component.spec.ts` re-run and green (mocks updated only if the call site changed, never the asserted behavior).
  - [ ] No migration involved.
  - [ ] No secret or token leaked in logs or messages.
  - [ ] No API surface changed — PATCH payloads unchanged.
  - [ ] No new i18n keys needed (reuses existing alert copy).
  - [ ] No bilateral/platform-report payload change.
  - [ ] Manual check in a running `ng serve` (with a way to force one field's PATCH to fail, e.g. a network-throttle/devtools override or a temporarily-invalid value): confirm that after one field fails, editing and saving a DIFFERENT field reports success, not "Save failed".

---

## 4. Dependency graph

```
BSF-T-1 (CSS — independent)
BSF-T-2 (service/state — independent)
```

Both tasks touch disjoint files (SCSS vs. TS/service) and share no code path — fully parallel-safe.

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `BSF-TEST-1` | cypress / rendered-measurement | `BSF-R-1`, `BSF-AC-1` | New/existing Cypress spec for `bilateral-result-creator` |
| `BSF-TEST-2` | unit (client, Jest) | `BSF-R-2`, `BSF-R-3`, `BSF-AC-2`, `BSF-AC-3` | `bilateral-auto-save.service.spec.ts` (and/or `bilateral-result-creator.component.spec.ts`) |

Client coverage MUST stay above 50/60/60/60. Cypress is local-only (not wired into CI) — run `npm run cypress:run` locally before considering `BSF-T-1` done.

---

## 6. Rollout & verification

- [ ] PR opened with the commit message convention, citing `P2-3962`.
- [ ] CI green (lint, tests, build).
- [ ] Manual QA on staging/test env confirming both fixes against the original QA report.
- [ ] No bilateral/platform-report consumer notification needed.

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once both tasks land and manual QA passes.
- [ ] File a follow-up ticket for `BSF-OQ-1` if the user wants it tracked (a failed-and-abandoned field's data silently never retried).

---

## 8. Roll-back plan

1. Revert the PR (both tasks, since they're expected to ship together per §6).
2. No migration, no feature flag, no payload change to verify.

---

## Required cross-references

- `docs/specs/bugfix/bilateral-save-draft-footer/requirements.md` and `design.md` (same folder).

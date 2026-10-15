# Module Spec — `field-card-save-pill-truncation` — `tasks.md`

- **Linked spec:** `requirements.md` + `design.md` (same folder).
- **Status:** done

---

## 1. Scope of this task list

- **Module / feature:** `bilateral` (Policy Change type-specific grid)
- **Owner / driver:** — (not specified)
- **Status:** done

---

## 2. Pre-flight checklist

- [ ] `requirements.md` is approved (status `approved`).
- [ ] `design.md` is approved.
- [ ] `FCT-OQ-1` is explicitly accepted as resolved-by-`FCT-T-1` (see requirements.md §10, design.md §13).
- [ ] No conflicting in-flight spec touching `type-policy-change` or `field-card.scss` found under `docs/specs/`.
- [ ] No migration involved — client-only change.

---

## 3. Task list

### `FCT-T-1` — Raise the Policy Change grid's column floor so the save pill and REQUIRED badge stay legible `[x]` — PASSed on attempt 4 (final value `minmax(min(390px,100%),1fr)`), see `execution.md`

- **Type:** `client`
- **Description:** **Corrected again, 2026-10-15** (attempt 2's `360px` FAILed on a width-sampling gap, already fixed; attempt 3's bare `390px` FAILed on a NEW issue — it forces horizontal overflow below 390px of content width, since a single-column track can't shrink below its own fixed minimum, regressing the old `190px` floor's phone-width behavior). Final value: `grid-cols-[repeat(auto-fit,minmax(min(390px,100%),1fr))]` — the `min(...,100%)` guard shrinks the floor to the container's own width once narrower than 390px, so sub-390px content legitimately falls through to `app-field-card`'s own 380px/240px collapse rules (its intended last-resort behavior) instead of overflowing. At ≥390px content, column count is unchanged from attempt 3 (1 from 390-799px, 2 from 800-1209px, 3 from 1210px up). Update the existing Cypress test (attempt 3's `type-policy-change.grid-collapse.cy.ts`): (1) widen `GRID_CLASS_PATTERN` to handle the nested `min(...)` parens (the new class string has one more closing paren before `)]` than the regex currently expects — trace it against the literal string, don't guess); (2) add a sub-390px case (e.g. 300px) asserting NO horizontal overflow (`scrollWidth <= clientWidth` or equivalent on the grid or its parent) — this is the new Falsifier; (3) optionally (Advisory, not gating): fix the header comment's "every case fails on revert" overstatement (1220px still passes under a `190px` revert), add an exactly-floor case (W=800 or W=1210, column=exactly 390px).
- **Implements:** `FCT-R-1`, `FCT-R-2`, `FCT-R-3`, `FCT-AC-1`, `FCT-AC-2`, `FCT-AC-3`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/type-policy-change.component.html`
  - A new or existing Cypress spec for this component (Implementer's choice of location, following existing conventions in `cypress/e2e/` or a colocated `.cy.ts` if one already exists for this component)
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/CLAUDE.md` (re-stamp)
- **Depends on:** `—`
- **Blocks:** `—`
- **Estimate:** `S`
- **Review:** `checklist` — pure CSS, no shared symbol/migration/auth/payload change (per `design.md` Budget).
- **Verification:**
  - **Falsifier:** At bare `minmax(390px,1fr)` (attempt 3's rejected value), mount the PRODUCTION template at a sub-390px content width (e.g. 300px) and confirm (re-walked, not assumed) that the grid overflows its container horizontally (`scrollWidth > clientWidth` on the grid or an ancestor) — this is the actual falsifier attempt 3 failed. At `minmax(min(390px,100%),1fr)`, the same read at the same width must show NO overflow (the single column shrinks to fit). All of attempt 3's prior assertions (squeeze-zone widths 760/1150/1220px, narrow 600px) must still pass unchanged — this fix must not regress what attempt 3 already proved.
  - **Red run:** The updated Cypress test, run against bare `minmax(390px,1fr)` (attempt 3's value), fails the new sub-390px overflow case. After the fix (`minmax(min(390px,100%),1fr)`), passes at every tested width, including all of attempt 3's existing cases.
  - **Disqualifier:** If `min(390px,100%)` still overflows at any sub-390px width tested, or if it introduces a NEW collapse at any of attempt 3's already-proven widths (760/1150/1220/600), STOP — do not add a third CSS trick on top of two; re-escalate to the user, since three corrections on the same task without a clean PASS suggests the approach itself (a single shared grid row for these three fields) may need the `field-card.scss` redesign alternative the user declined earlier, reconsidered.
  - **Consumers:** `grep -rn "minmax(190px" --include="*.html" src/` (already run in `design.md` P-4: 14 other hits, all independent `class` attributes on unrelated components) — confirms this is a one-line, non-shared change; none of those 14 sites are affected. `grep -n "190px\|360px\|minmax(390px,1fr)" type-policy-change.component.spec.ts` before editing — if any literal appears, update only the literal, never the asserted behavior.
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`🔧 fix(type-policy-change): ...`).
  - [ ] Lint + format clean (`npx ng lint --quiet`).
  - [ ] Cypress regression test updated with the `min(390px,100%)` guard, a new sub-390px overflow case, a widened `GRID_CLASS_PATTERN` regex (traced against the literal new class string), and all of attempt 3's prior cases still passing unchanged; existing `type-policy-change.component.spec.ts` re-run and green (literal updated, behavior unchanged).
  - [ ] No migration involved.
  - [ ] No secret or token leaked in logs or messages.
  - [ ] No API surface changed.
  - [ ] No new i18n keys needed.
  - [ ] No bilateral/platform-report payload change.
  - [ ] `type-policy-change/CLAUDE.md` re-stamped (`**Verified:** <date> · <branch> · <sha>`) in the same commit.
  - [ ] Manual check in a running `ng serve`: Policy Change section at a typical desktop/laptop width shows Policy type + USD amount on one row (full pill/badge text) and Status wrapped to the row below (full pill text); at a narrower browser width, the row wraps to a single column.

---

## 4. Dependency graph

```
FCT-T-1 (only task)
```

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `FCT-TEST-1` | cypress / rendered-measurement | `FCT-R-1`, `FCT-R-2`, `FCT-AC-1`, `FCT-AC-2` | New/existing Cypress spec for `type-policy-change` |

Client coverage MUST stay above 50/60/60/60 (unaffected — pure CSS, no Jest-covered logic changes). Cypress is local-only (not wired into CI) — run `npm run cypress:run` locally before considering `FCT-T-1` done.

---

## 6. Rollout & verification

- [ ] PR opened with the commit message convention, citing `P2-3962`.
- [ ] CI green (lint, tests, build).
- [ ] Manual QA on staging/test env confirming the fix against the original screenshots.
- [ ] No bilateral/platform-report consumer notification needed.

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once the task lands and manual QA passes.
- [ ] Re-confirm with the user whether the separately-documented "Unsaved changes doesn't clear after save" architectural gap (`SaveButtonService.savedTick` not bumped by `triggerManualSave()`) should be specified next, now that this truncation fix and the stale-error-flag fix (`BSF-T-2`) are both shipped.

---

## 8. Roll-back plan

1. Revert the PR.
2. No migration, no feature flag, no payload change to verify.

---

## Required cross-references

- `docs/specs/bugfix/field-card-save-pill-truncation/requirements.md` and `design.md` (same folder).

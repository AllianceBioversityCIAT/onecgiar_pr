# Module Spec — `bilateral-status-dropdown-overlay` — `tasks.md`

- **Linked spec:** `requirements.md` + `design.md` (same folder).
- **Status:** not-started

---

## 1. Scope of this task list

- **Module / feature:** `bilateral` (Type-Specific Detail, Policy Change)
- **Owner / driver:** — (not specified)
- **Status:** not-started

---

## 2. Pre-flight checklist

- [ ] `requirements.md` is approved.
- [ ] `design.md` is approved.
- [ ] No conflicting in-flight spec touching `type-policy-change.component.html` found under `docs/specs/` (note: this file was touched by this session's two prior, now-archived specs — confirm no THIRD spec is concurrently active on it).
- [ ] No migration involved.

---

## 3. Task list

### `BSD-T-1` — Remove the redundant space-reserving behavior from the Status dropdown `[x]` — PASS after 1 rework attempt, see `execution.md`

- **Type:** `client`
- **Description:** Remove `[expandSpaceOnOpen]="true"` from the Status `app-pr-select` in `type-policy-change.component.html`. No other attribute on that block changes. Add a regression test proving the spacer no longer renders and the overlay itself is unaffected.
- **Implements:** `BSD-R-1`, `BSD-R-2`, `BSD-R-3`, `BSD-R-4`, `BSD-AC-1`, `BSD-AC-2`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/type-policy-change.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/type-policy-change.component.spec.ts`
- **Depends on:** `—`
- **Blocks:** `—`
- **Estimate:** `S`
- **Review:** `checklist` — single-attribute removal, no shared symbol/migration/auth/payload change.
- **Verification:**
  - **Falsifier:** With the Status field's dropdown open (read the component to confirm the exact trigger/signal — likely `:focus-within` or an internal `isDropdownOpen`-equivalent state on `app-pr-select`), query the Status field's rendered host for an `.expandable-space`-class (or equivalent) element. Baseline (pre-fix, walked before writing): that element exists and its height is non-zero once open (`pr-select.component.scss:84-94`'s `.expanded { height: 300px }`). Post-fix: no such element renders for this field at all (the `*ngIf="expandSpaceOnOpen()"` guard is false by default). This divergence is the falsifier.
  - **Red run:** `npm run test -- --testPathPattern="type-policy-change.component.spec"` — the new assertion fails on current code (spacer present) and passes once the attribute is removed.
  - **Disqualifier:** If removing the attribute also changes the overlay's own open/close/positioning behavior (visible, anchored, upward-flip near a viewport edge), STOP and report a checkpoint/blocker — confirm via the Premise Ledger's P-2 citation that the overlay mechanism is independent of this flag before concluding the removal is safe, and re-verify directly against the current file rather than trusting the citation alone.
  - **Consumers:** `cypress/e2e/bilateral-policy-change-mds.cy.ts` — re-run (do not modify unless it actually breaks); its assertions are text-presence only, not order/layout-dependent, so expected to stay green. `type-policy-change.component.spec.ts`'s prior `PCL-T-2`/`PCL-T-2 control`/`PCL-AC-3`/`PCP-T-1` tests — re-run, expected to stay green unmodified (none reference `expandSpaceOnOpen`). Before removing the attribute, re-run the repo-wide grep for `expandSpaceOnOpen` across `src/` (per design.md's Premise Ledger P-4) to confirm no other current call site was added since this spec was written.
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`🔧 fix(type-policy-change): ...`), citing `P2-3962`.
  - [ ] Lint + format clean (`npx ng lint --quiet`).
  - [ ] New regression test added and green; named consumer suites re-run and confirmed green.
  - [ ] No migration involved.
  - [ ] No secret or token leaked in logs or messages.
  - [ ] No API surface changed.
  - [ ] No new i18n keys needed.
  - [ ] No bilateral/platform-report payload change.
  - [ ] Manual check in a running `ng serve`: Bilateral Policy Change, Type-Specific Detail, policy type 1 selected — clicking Status opens its options overlay without moving Stage/Implementing organizations/the footer.

---

## 4. Dependency graph

```
BSD-T-1 (single task)
```

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `BSD-TEST-1` | unit (client, Jest) | `BSD-R-1..4`, `BSD-AC-1/2` | `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/type-policy-change.component.spec.ts` |

---

## 6. Rollout & verification

- [ ] PR opened with the commit message convention, citing `P2-3962`.
- [ ] CI green (lint, tests, build).
- [ ] Manual QA on staging/test env confirming the fix against the original QA report.

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once the task lands and manual QA passes.

---

## 8. Roll-back plan

1. Revert the PR.
2. No migration, no feature flag, no payload change to verify.

---

## Required cross-references

- `docs/specs/bugfix/bilateral-status-dropdown-overlay/requirements.md` and `design.md` (same folder).

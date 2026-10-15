# Module Spec — `policy-change-usd-amount-position` — `tasks.md`

- **Linked spec:** `requirements.md` + `design.md` (same folder).
- **Status:** not-started

---

## 1. Scope of this task list

- **Module / feature:** `bilateral` (Type-Specific Detail, Policy Change)
- **Owner / driver:** — (not specified)
- **Status:** not-started

---

## 2. Pre-flight checklist

- [ ] `requirements.md` is approved (status `approved`).
- [ ] `design.md` is approved.
- [ ] No open questions.
- [ ] No conflicting in-flight spec touching `type-policy-change` found under `docs/specs/`.
- [ ] No migration involved — client-only change.

---

## 3. Task list

### `PCP-T-1` — Group Bilateral's Policy type with USD Amount/Status in one row, before Stage `[x]` — PASS, see `execution.md`

- **Type:** `client`
- **Description:** In `type-policy-change.component.html`, wrap the existing "Policy type" `app-pr-select` (currently lines 37-46) and the existing USD Amount + Status conditional grid block (currently lines 82-105) together inside one `<div class="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-[20px]">` container, in order: Policy type, USD amount, Status. Position this combined container where "Policy type" currently stands (i.e., before "Stage"). "Stage" and "Implementing organizations" keep their exact current markup and bindings, now rendering immediately after the combined container. Extend the component spec with a test asserting the new sibling order; re-run (do not modify) the two named consumer test suites.
- **Implements:** `PCP-R-1`, `PCP-R-2`, `PCP-R-3`, `PCP-R-4`, `PCP-AC-1`, `PCP-AC-2`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/type-policy-change.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/type-policy-change.component.spec.ts`
- **Depends on:** `—`
- **Blocks:** `—`
- **Estimate:** `S`
- **Review:** `checklist` — template-only reorder, no shared symbol/migration/auth/payload change; the Consumers field below names the suites to re-run (not modify).
- **Verification:**
  - **Falsifier:** With `body.policy_type_id = 1`, query the shared grid container (the first `div.grid.grid-cols-[repeat(auto-fit,minmax(190px,1fr))]` inside the `[inert]="readOnly()"` wrapper) and assert its **direct children**, in order, are: the Policy type `app-pr-select`, the USD amount `app-pr-input`, the Status `app-pr-select`. Also assert "Stage"'s `app-pr-select` is NOT a child of that container (it must be a later sibling). Baseline (pre-fix, walked before writing): currently Policy type is NOT inside that grid container at all — it is a standalone sibling before it — so a query for "Policy type as a child of the shared grid container" returns nothing pre-fix and the new field post-fix. This divergence is the falsifier.
  - **Red run:** `npm run test -- --testPathPattern="type-policy-change.component.spec"` (from `onecgiar-pr-client/`) — the new sibling-order assertion fails on current code (Policy type not inside the grid container) and passes after the move.
  - **Disqualifier:** If moving Policy type into the grid container changes its `[(ngModel)]="body.policy_type_id"` binding, its `(ngModelChange)="onPolicyTypeChange()"` handler, or takes it outside the `[inert]="readOnly()"` ancestor, STOP and report a checkpoint/blocker — read-only lock and the clearing-on-type-change contract must carry over unchanged.
  - **Consumers:**
    - `onecgiar-pr-client/cypress/e2e/bilateral-policy-change-mds.cy.ts` — re-run (do not modify unless it actually breaks): its assertions check text presence, not sibling order, so they are expected to stay green; if any fails, read why before changing it (don't assume the test is wrong).
    - `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/type-policy-change.component.spec.ts` — the prior spec's `PCL-T-2`/`PCL-AC-3` tests (added in `bugfix/policy-change-usd-amount-layout`) assert presence/absence via `queryAll`, not sibling order — re-run, expected to stay green unmodified.
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`🔧 fix(type-policy-change): ...`).
  - [ ] Lint + format clean (`npx ng lint --quiet`).
  - [ ] New sibling-order test added and green; both named consumer suites re-run and confirmed green.
  - [ ] No migration involved.
  - [ ] No secret or token leaked in logs or messages.
  - [ ] No API surface changed.
  - [ ] No new i18n keys needed.
  - [ ] No bilateral/platform-report payload change.
  - [ ] Manual check in a running `ng serve`: Bilateral Policy Change, Type-Specific Detail, "Program, budget or investment" selected — Policy type, USD amount, and Status render in one row, with Stage and Implementing organizations below it.

---

## 4. Dependency graph

```
PCP-T-1 (single task)
```

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `PCP-TEST-1` | unit (client, Jest) | `PCP-R-1`, `PCP-R-2`, `PCP-AC-1`, `PCP-AC-2` | `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/type-policy-change.component.spec.ts` |

---

## 6. Rollout & verification

- [ ] PR opened with the commit message convention (`<emoji> <type>(<scope>) [ticket]: <description>`), citing `P2-3962`.
- [ ] CI green (lint, tests, build).
- [ ] Manual QA on staging/test env confirming the visual grouping.

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once the task lands and manual QA passes.
- [ ] No new cross-cutting decision to promote.

---

## 8. Roll-back plan

1. Revert the PR.
2. No migration, no feature flag, no payload change to verify.

---

## Required cross-references

- `docs/specs/bugfix/policy-change-usd-amount-position/requirements.md` and `design.md` (same folder).
- `docs/specs/archive/2026-10-15-bugfix--policy-change-usd-amount-layout/` (prior spec, same files).

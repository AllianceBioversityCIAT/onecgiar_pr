# Module Spec — `policy-change-usd-amount-layout` — `tasks.md`

- **Linked spec:** `requirements.md` + `design.md` (same folder).
- **Status:** not-started

---

## 1. Scope of this task list

- **Module / feature:** `results` (Pool Funding Policy Change Info) + `bilateral` (Type-Specific Detail)
- **Owner / driver:** — (not specified)
- **Status:** not-started

---

## 2. Pre-flight checklist

Block execution until every box is ticked (ticked by `/akili-execute`, not by this spec).

- [ ] `requirements.md` is approved (status `approved`).
- [ ] `design.md` is approved.
- [ ] Open questions in `requirements.md` and `design.md` are all resolved or explicitly deferred (`PCL-OQ-1` is non-blocking by design).
- [ ] No CLARISA dependency changes to confirm (none in scope).
- [ ] No conflicting in-flight spec touching `policy-change-info` or `type-policy-change` (checked under `docs/specs/` at spec time — none found).
- [ ] No migration involved — `npm run migration:check` not applicable (client-only change).

---

## 3. Task list

### `PCL-T-1` — Remove the duplicated "USD amount" text in Pool Funding's Policy Change Info `[x]` — PASS, see `execution.md`

- **Type:** `client`
- **Description:** Remove the redundant `description="USD amount"` attribute from the USD-amount `app-pr-input` in `policy-change-info.component.html` (the block at lines `17-24`), keeping `label="USD amount"` and `placeholder="0"`. Extend the existing component spec with an assertion that exactly one "USD amount" text renders when `policy_type_id == 1`.
- **Implements:** `PCL-R-1`, `PCL-R-4` (regression-proof that clearing logic is untouched), `PCL-AC-1`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/policy-change-info/policy-change-info.component.html`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/policy-change-info/policy-change-info.component.spec.ts`
- **Depends on:** `—`
- **Blocks:** `—` (independent of `PCL-T-2`; may run in parallel)
- **Estimate:** `S`
- **Review:** `checklist` — single-attribute template removal plus a test extension; no shared symbol, migration, auth, or payload-contract change, but the field's rendered DOM is already asserted by an existing spec (consumer-aware checklist, not full persona audit).
- **Verification:**
  - **Falsifier:** With `innovationUseInfoBody.policy_type_id = 1` and `fixture.detectChanges()` run, a DOM scan for text matching "USD amount" (label + description boxes combined) MUST find exactly **one** match after the fix. Re-adding `description="USD amount"` (the pre-fix state) on the same fixture MUST make that same scan find **two** matches — this divergence is the falsifier. Baseline (pre-fix, walked before writing): current template has both `label="USD amount"` (`policy-change-info.component.html:18`) and `description="USD amount"` (`:20`) → 2 occurrences.
  - **Red run:** `npm run test -- --testPathPattern="policy-change-info.component.spec"` — the new/extended assertion fails on current code (2 occurrences found) and passes once the `description` attribute is removed (1 occurrence).
  - **Disqualifier:** If removing `description` also removes the field's accessible/visible label (i.e. `app-field-card` turns out to source the label text from `description` rather than `label` — contradicting `design.md` P-1's citation of `field-card.component.html:24-26` vs `:80-82` as independent boxes), STOP and re-diagnose `app-field-card`/`pr-input` before patching further; do not ship a fix that silently removes the label.
  - **Consumers:** `policy-change-info.component.spec.ts:93-108` (existing P2-3667 regression, scoped to `app-pr-select` only — MUST still pass unmodified, confirming this task does not touch the three sibling select fields) and the new assertion this task adds.
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`🔧 fix(policy-change-info): ...`).
  - [ ] Lint + format clean (`npx ng lint --quiet`).
  - [ ] Unit test added/updated and green; coverage thresholds (client 50/60/60/60) unaffected.
  - [ ] No migration involved.
  - [ ] No secret or token leaked in logs or messages.
  - [ ] No API surface changed — no Swagger/DTO update needed.
  - [ ] No new i18n keys needed (no new user-facing strings).
  - [ ] No bilateral/platform-report change — no change-log entry needed.
  - [ ] Manual check in a running `ng serve`: open a Pool Funding Policy Change result, Policy Change Info section, select "Program, budget or investment" — exactly one "USD amount" box renders, side by side with Status.

### `PCL-T-2` — Relocate Bilateral's USD Amount + Status into the always-visible Type-Specific Detail area `[x]` — PASS after 1 rework attempt, see `execution.md`

- **Type:** `client`
- **Description:** In `type-policy-change.component.html`, move the `@if (body.policy_type_id == 1) { ... }` block (lines `108-129`: the USD Amount `app-pr-input` and Status `app-pr-select`) out of the `@if (showAllFields())` region (lines `85-132`) into the always-visible `<div class="contents" [inert]="readOnly()">` block (lines `8-72`), placed after "Implementing organizations". Wrap the moved pair in the same side-by-side grid utility Pool Funding uses (`grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-[20px]`). Leave the "Is this result related to:" block (`:95-106`) as the sole remaining content inside the `showAllFields()` disclosure. Update the tests/E2E specs that assert the prior (gated) structure.
- **Implements:** `PCL-R-2`, `PCL-R-3`, `PCL-R-4` (regression-proof that clearing logic is untouched), `PCL-AC-2`, `PCL-AC-3`, `PCL-AC-4`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/type-policy-change.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/type-policy-change.component.spec.ts`
  - `onecgiar-pr-client/cypress/e2e/bilateral-policy-change-mds.cy.ts`
- **Depends on:** `—`
- **Blocks:** `—` (independent of `PCL-T-1`; may run in parallel)
- **Estimate:** `M`
- **Review:** `checklist` — template restructure within one component, no shared symbol/migration/auth/payload-contract change, but rendered DOM is asserted by multiple existing specs (Consumers field below names them; checklist review audits the diff against `Implements:` plus confirms each named consumer was actually updated or re-run).
- **Verification:**
  - **Falsifier:** With `body.policy_type_id = 1` and `showAllFields()` returning `false` (user has not clicked "Complete full metadata"): after the fix, the USD Amount `app-pr-input` and Status `app-pr-select` MUST be present in the rendered DOM. Baseline (pre-fix, walked before writing): under the identical state, current code renders **neither** (both are nested inside `@if (showAllFields())`, lines `86-131`) — this divergence is the falsifier. Control case (must hold both before and after): the "Is this result related to:" `app-pr-select` stays absent under `showAllFields() === false` in both versions — it never moves.
  - **Red run:** `npm run test -- --testPathPattern="type-policy-change.component.spec"` — a new/extended assertion ("USD amount and Status render without expanding full metadata when policy type is 1") fails on current code and passes after the move.
  - **Disqualifier:** If the moved block ends up outside the `[inert]="readOnly()"` wrapper (lines `8-72`'s ancestor), abandon this placement and re-wrap — AC17/P2-3428/P2-3520's read-only lock on submitted results must continue to cover USD Amount/Status after the move, not just before it.
  - **Consumers:**
    - `onecgiar-pr-client/cypress/e2e/bilateral-policy-change-mds.cy.ts` — `:68-76` (MDS list assertion, exactly `['policy-type','policy-stage','policy-institutions']`) MUST still pass unmodified (USD Amount/Status were never in the MDS). `:87-91` ("shows USD amount and Status for policy type 1 (AC6)", currently requires `expand()` before asserting visibility) and `:93-99` ("for policy type 2: shows the question, and still hides USD amount", currently also keyed to the expand/collapse state) MUST be rewritten to assert the new always-visible-when-type-1 behavior.
    - `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/type-policy-change.component.spec.ts` — clearing-logic tests (`onPolicyTypeChange()`, exercised directly on `component.body`) MUST still pass unmodified. `showAllFields()`/alert-ordering assertions MUST be re-run and adjusted only if they depended on USD Amount/Status being inside the toggle.
    - `onecgiar-pr-client/cypress/e2e/bilateral-type-specific-section.cy.ts` — accordion heading/count assertions MUST be re-run to confirm no change (this task does not split or rename the accordion); no edit expected, but confirm.
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`🔧 fix(type-policy-change): ...`).
  - [ ] Lint + format clean (`npx ng lint --quiet`).
  - [ ] Unit tests added/updated and green; `cypress/e2e/bilateral-policy-change-mds.cy.ts` updated and green (`npm run cypress:run` locally — Cypress is local-only, not in CI); `cypress/e2e/bilateral-type-specific-section.cy.ts` re-run and confirmed green/unaffected. Coverage thresholds (client 50/60/60/60) unaffected.
  - [ ] No migration involved.
  - [ ] No secret or token leaked in logs or messages.
  - [ ] No API surface changed — no Swagger/DTO update needed; `onPolicyTypeChange()` body shape unchanged.
  - [ ] No new i18n keys needed (no new user-facing strings — all moved text already exists).
  - [ ] No bilateral/platform-report payload change — no change-log entry needed (client rendering only; `PATCH_policyChanges` body shape unchanged).
  - [ ] Manual check in a running `ng serve`/`npm start`: open a Bilateral Policy Change result, Type-Specific Detail section, select "Program, budget or investment" — USD Amount + Status render immediately, side by side, with Policy type/Stage/Implementing organizations, with no "Complete full metadata" click; clicking "Complete full metadata" shows only "Is this result related to:"; switching Policy Type away from "Program, budget or investment" clears both fields as before.

---

## 4. Dependency graph

```
PCL-T-1 (Pool Funding — independent)
PCL-T-2 (Bilateral — independent)
```

Both tasks touch disjoint files in disjoint components and share no code path — fully parallel-safe.

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `PCL-TEST-1` | unit (client, Jest) | `PCL-R-1`, `PCL-AC-1` | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/policy-change-info/policy-change-info.component.spec.ts` |
| `PCL-TEST-2` | unit (client, Jest) | `PCL-R-2`, `PCL-R-4` | `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/type-policy-change.component.spec.ts` |
| `PCL-TEST-3` | cypress (E2E) | `PCL-R-2`, `PCL-R-3`, `PCL-AC-2`, `PCL-AC-3` | `onecgiar-pr-client/cypress/e2e/bilateral-policy-change-mds.cy.ts` |
| `PCL-TEST-4` | cypress (E2E, regression confirm) | Accordion structure unaffected | `onecgiar-pr-client/cypress/e2e/bilateral-type-specific-section.cy.ts` |

Client coverage MUST stay above 50/60/60/60 (`onecgiar-pr-client/CLAUDE.md` §3). Cypress is local-only (not wired into CI) — run `npm run cypress:run` locally before considering `PCL-T-2` done.

---

## 6. Rollout & verification

- [ ] PR opened with the commit message convention (`<emoji> <type>(<scope>) [ticket]: <description>`); since both tasks are small, independent, and touch disjoint files, they MAY ship as a single PR (recommended — total estimated LOC ~40-70, well under the ~400 LOC threshold that would otherwise suggest splitting).
- [ ] CI green (lint, tests, build). `migration:check:ci` not applicable (no server change).
- [ ] Manual QA on staging/test env per `requirements.md` §8 Acceptance Criteria (`PCL-AC-1..4`).
- [ ] No bilateral/platform-report consumer notification needed (no payload shape change).
- [ ] No admin/role/phase change — no runbook update needed.
- [ ] Telemetry: n/a (no new logs; no error-rate change expected for a presentation-only fix).

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once both tasks land and manual QA passes.
- [ ] No new cross-cutting decision to promote to `docs/ux-ui/design.md` or `docs/trd/trd.md` (this fixes an existing pattern back into consistency; it does not introduce a new one).
- [ ] File a follow-up ticket for `PCL-OQ-1` (QA review drawer `policy-change-content` consistency) if the user wants it tracked.
- [ ] No `docs/prd.md` Open Questions resolved by this spec.

---

## 8. Roll-back plan

1. Revert the PR (both tasks, since they ship together per §6).
2. No migration to revert — client-only change.
3. No feature flag to disable.
4. No bilateral/platform-report payload to verify — unaffected.
5. No downstream consumer notification needed.

---

## Required cross-references

- `docs/specs/bugfix/policy-change-usd-amount-layout/requirements.md` and `design.md` (same folder).
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`.

# Proposal — Innovation Use: require Youth instead of filling Non-youth with the total

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/innovation-use-youth-required` |
| Type | Bug |
| Deliverable | software |
| Approval Mode | gated |
| Source | Marc Schut feedback, batch 1, item 7 (ticket INC-167167, epic P2-3094). Jira child probably P2-4049 — UNVERIFIED, confirm in Jira |
| Decision | Option A chosen by Santiago on 2026-11-10 (Youth required, Non-youth stays derived) |
| Impact measured | 2026-11-10 by Santiago: PROD 2 results / 2 actor rows, all Editing (status 1); PRTest 0 |
| Date | 2026-11-10 |

## Intent

When the reporter has not entered Youth, nobody may be counted as non-youth without being asked. The section must stay incomplete until Youth has a value, and 0 is a valid value.

## Problem / Current Behavior

- In the grid, the reporter enters Women/Men and Youth. Non-youth is read-only (`innovation-use-form.component.html:180-188`, `[readOnly]="true"`) and is recalculated 1.1 s after every keystroke as `total − Youth` (`innovation-use-form.component.ts:691-693`).
- When Youth is empty, `100 − null = 100`, so the full total shows up as Non-youth (`innovation-use-form.component.ts:693`).
- Non-youth is never stored. `result-actor.entity.ts` has `women_youth`/`men_youth` and no non-youth column. Readers recompute it the same way: `summary.service.ts:394-395` (`el.men - el.men_youth`) and `innovation-use.service.ts:941-945`.
- The completeness rule only checks totals: `validation_innovation_use_P25` requires `ra.women IS NOT NULL AND ra.men IS NOT NULL` and never checks youth (`docs/specs/archive/2026-11-03-changes--innovation-use-farmer-count-nature/sql/validation_innovation_use_P25.after.sql:194-199`, section 1; `:382-387`, section 2). The live PROD body equals that file — UNVERIFIED, confirmed by the T-0 `SHOW CREATE FUNCTION` snapshot.
- Result: the section turns green and can be submitted with every user counted as non-youth.
- Works correctly, kept as is: the "Age disaggregation not available" fallback, which splits 50/50 and stamps `youth_split_applied_by_system` (`innovation-use-form.component.ts:329-350`).

## Proposed Outcome

For 2026+ W1/W2 Innovation Use results (current use and 2030 projection):

1. With Youth empty, Non-youth shows empty, never the total, and a short inline hint asks for Youth (0 if none).
2. With Women > 0 (or Men > 0) and its Youth empty, the section is incomplete and the result cannot be submitted.
3. With Women = 0 (or Men = 0), Youth is not required, because youth is implicitly 0.
4. The server never returns a Non-youth equal to the total when Youth is null. It returns `null`.

## Scope

- Client: the shared `innovation-use-form`, both grids (current use, about lines 123-250; 2030 projection, about lines 543-645). The gate reuses `isFarmerFollowUpResult()`: not IPSR, phase year ≥ 2026, not bilateral.
- DB: `validation_innovation_use_P25`, the youth checks inside the existing `phase_year >= 2026 AND source <> 'API'` gate, sections 1 and 2. Before and after snapshots go under `sql/`, following the P2-4048 pattern.
- Server: `summary.service.ts` `getInnovationUse` derives Non-youth as `null` when Youth is null.
- Regression tests: client Jest on the form, server Jest on `getInnovationUse`, and a SQL checks file for the function.

## Non-Goals

- No editable Non-youth and no new column (that was Option B).
- No changes to IPSR (item 11), bilateral W3, 2025 results, or the 50/50 fallback.
- No data backfill. The 2 PROD results stay in Editing and their owners fill Youth.
- `innovation-use.service.ts:941` (results-framework-reporting) already clamps to ≥ 0 and is not touched unless specify shows it feeds a 2026 W1/W2 screen.

## Affected Users, Systems, And Specs

| Item | Effect |
|---|---|
| W1/W2 Innovation Use submitters, 2026 | Must type Youth (0 allowed) |
| QA reviewers | Get Youth values the reporter entered, not system defaults |
| `validation_innovation_use_P25` (PROD + TEST) | Applied by hand, like P2-4048 |
| QA catalog | Probably unchanged (no new fields); confirm at specify |
| Related specs | archive `changes--innovation-use-farmer-count-nature` (same function, same gate); P2-3537 age fallback |

## Visual Reference

- Source: None. The change is a hint line under the existing grid; it reuses the existing `explanation_message` style.
- Location: n/a.
- Notes: the hint copy is set at specify. Spartan only if a new primitive is needed (not expected).

## Bug Diagnosis

### Observed Symptom
With "Age disaggregation not available" unticked, typing Women = 100 and Men = 5,000 fills Non-youth with 100 and 5,000 and leaves Youth empty (Marc, S8). The section can still be completed.

### Reproduction Steps
1. Open any 2026 W1/W2 Innovation Use result → Innovation users.
2. Add an actor and leave both "Sex and age disaggregation does not apply" and "Age disaggregation not available" unticked.
3. Type Women = 100 and leave Youth empty. After about 1 s, Non-youth = 100.
4. Save. The green check passes even though no youth figure was given.

### Root Cause (confirmed)
Two gaps that combine:
1. The derivation `total − youth` treats a missing Youth as 0, both in the client (`innovation-use-form.component.ts:693`) and on the server read (`summary.service.ts:394-395`).
2. The completeness rule never requires youth (`validation_innovation_use_P25.after.sql:194-199`, `:382-387`).

### Blast Radius

| Check | Recorded as | Result |
|---|---|---|
| **Already fixed?** | `git log --all --grep=P2-4049` → no hits; `git log --all -i --grep=youth --since=2026-10-25` → only P2-4048 commits (Farmers, unrelated); `git log --all --since=2026-10-30 -- innovation-use-form.component.ts` → 120f0e1b9, db09d3767, 123c068a5 (copy / Farmers) | Not fixed |
| **Live path?** | `innovation-use-info.component.html:48` → `<app-innovation-use-form>` → Women/Youth `(ngModelChange)="validateYouth(...)"` (`.html:168,178`) → `validateYouth` timer → `:693`; save → server → `validation_innovation_use_P25` section-1 actor block (`:184-230`) | On the path |
| **Siblings on the same state** | (a) 2030 grid, same component `.html:555-618` → in scope; (b) IPSR Step 1 uses the same component with `[isIpsr]="true"` (`step-n1.component.html:30`) → excluded by the gate; (c) IPSR Step 3 `step-n3-current-use.component.ts` → item 11; (d) bilateral `type-innovation-use.component.ts` → out of scope (W3); (e) Innovation Dev `anticipated-innovation-user.component.ts` → also derives non-youth, not reported, specify checks it | (a) in scope, the rest excluded |
| **Downstream consumers** | `summary.service.ts:394` (form read) → in scope; `innovation-use.service.ts:941` (results-framework-reporting, clamps ≥ 0) → read only; `achieved-value-derivation.ts:106` reads youth/totals only; review drawer `innovation-use-content.component.ts`; QA catalog `pending-catalog.ts` (`has_women_youth`); specs `innovation-use-form.component.spec.ts`, `.zoneless.spec.ts` | `null` non-youth must render as empty in the drawer — check at specify |

Data integrity: no stored value changes. Only the 2 PROD Editing results turn red.

### Fix Strategy
Not cosmetic (logic + DB rule) → `/akili-specify` (Lite) in Bug Mode with a regression test: red before, green after (client: Youth empty → Non-youth empty and row incomplete; server: `getInnovationUse` with youth null → non_youth null; SQL: a sample with Women > 0 and youth null → 0).

## Approach Options

| Option | What | Trade-off |
|---|---|---|
| **A (chosen)** | Youth required when total > 0; Non-youth stays derived and shows empty while Youth is empty | Small: no column, no migration. The sum always matches by construction |
| B | Editable Non-youth plus a sum validation, as Marc wrote it | New column, migration, replication and catalog changes. Same result for the user |
| C | Client only (show empty and the hint) | Does not block submission, so the silent default is still possible through the API |

## Recommended Approach

Option A, in 4 tasks: T-0 PROD/TEST function snapshot · T-1 client (both grids, gate, hint, tests) · T-2 server `getInnovationUse` null derivation (test) · T-3 DB function after.sql + checks.sql (applied by Santiago in TEST, then PROD at deploy).

## Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| R-1 | The live function may have drifted from the archived after.sql → T-0 snapshot first; stop if it differs |
| R-2 | 2 PROD results (Editing) turn red → owners are told when it ships. Santiago decides whether that needs a notice |
| R-3 | The review drawer or exports may show `null` as "0" or "null" → check at specify |
| OQ-1 | Hint copy (proposal: "Enter the number of youth (0 if none) to calculate Non-youth.") — confirm with Angel? |
| OQ-2 | Is the Jira ticket P2-4049? |
| Dep | Same function as P2-4048: never edit in parallel with another spec touching `validation_innovation_use_P25` |

## Success Criteria

- On a 2026 W1/W2 result, Women = 100 with Youth empty shows Non-youth empty and the section stays incomplete. Youth = 0 makes it complete with Non-youth = 100.
- 2025, W3 and IPSR results behave exactly as before (checks.sql categories unchanged).
- The 50/50 fallback still works.

## Next Step

```text
/akili-specify bugfix/innovation-use-youth-required
```

Bug Mode (Lite) — mandatory regression tests.

# Proposal — ToC KPI question optional vs. green check (`bugfix/toc-kpi-optional-green-check`)

## 1. Document Control

| Field | Value |
|---|---|
| Type | **Bug** |
| Ticket | [P2-4061](https://cgiarmel.atlassian.net/browse/P2-4061) (epic P2-3094) |
| Spec path | `docs/specs/bugfix/toc-kpi-optional-green-check/` |
| Approval Mode | `gated` |
| Depends on | `results/impact-results-reporting/server-foundation` (P2-3901): its migration `1792000000000-IRS-ImpactResultsFoundation` is the current definition of the function this fix rewrites |
| Parallel-safe | no — touches the same DB function as P2-3901 |
| Date | 2026-10-30 |

## 2. Intent

When the ToC KPI question is optional, the Contributors & partners green check must not fail just because it is unanswered. The bottom bar, the sidebar and Submit should agree.

## 3. Problem / Current Behavior

- **Result 953, 2026 phase:** the bottom bar says **"Section complete"**, but the sidebar shows no green check ("4 of 5 sections complete"), so Submit stays disabled.
- **Nothing in the form says what is missing.** The only gap is *"Can this result be mapped to a ToC KPI?"*, and it no longer carries an asterisk.

## 4. Proposed Outcome

On a 2026+ result, an unanswered ToC KPI question no longer blocks the Contributors & partners green check by itself. Yes and No keep today's rules, and 2025 results are unchanged.

## 5. Scope

- A new migration that redefines `validation_contributor_partner_P25` from the body P2-3901 left in place. It adds one gate: when `planned_result IS NULL` and the result's phase year is 2026 or later, skip the ToC block. The `down` restores the P2-3901 body.
- A QA catalog sync for `toc.planned_result` in `api/qa-catalog/definitions/sections/contributors-partners.ts`. It is `required: true, required_confirmed: true` today and becomes `required: false` (or `required_when` per phase), with the snapshot and catalog version updated.
- A regression test that is red before the fix and green after (see Risks R-2 for how).

## 6. Non-Goals

- No change to the Yes branch (complete ToC rows) or the No branch (narrative rule).
- No client change. The asterisk stays off, and the bottom bar is already right.
- No change to the other rules of the function (partners, delivery type, lead, innovation links), and nothing for type 9 beyond what P2-3901 already does.
- Not the "Request to be added as contributor" form (see OQ-1).

## 7. Affected Users, Systems, And Specs

| Who / what | Effect |
|---|---|
| Submitters of 2026 results | They can submit once the rest of the section is complete |
| `validation_contributor_partner_P25` (MySQL function) | Redefined through a migration |
| QA catalog `toc.planned_result` | Requiredness follows the function |
| P2-3901 server-foundation spec | Upstream of this migration; its `down` still restores its own captured body |
| Completeness dashboards / Submit gate | Read the same green check, so more 2026 results can turn green |

## 8. Visual Reference

- Source: None. This is a backend rule change; the UI already renders the right copy and markers.

## 9. Bug Diagnosis

### Observed Symptom
- On a 2026 result with the ToC KPI question unanswered, the bottom bar says "Section complete" while the sidebar green check for Contributors & partners stays off and Submit is disabled.

### Reproduction Steps
1. Open result 953 (id 32860, phase 8 / 2026, SP09, Innovation Development) on `localhost:4200`, with the local stack pointed at the prod DB. Read-only, verified 2026-10-30.
2. Go to Contributors & partners and leave *"Can this result be mapped to a ToC KPI?"* without Yes or No.
3. **Expected:** green check, or the bottom bar naming what is missing. **Actual:** the bar says "Section complete" and the sidebar shows no check.

### Root Cause (confirmed)
- **2026-08-26 (`quick/non-mandatory-toc-kpi`, commit `9135ef328`):** the client made the question optional for 2026 with `[required]="!isAvisaInitiative() && !isCP2026()"` (`rd-contributors-and-partners.component.html:41`). The bar's DOM scan no longer counts it.
- **The server rule was never changed.** `validation_contributor_partner_P25` reads `planned_result`; when it is not `FALSE` (so also when it is `NULL`), it takes the "mapped" branch. That branch requires every `results_toc_result` row to have a ToC result, an indicator and a contributing target.
  - With no row, or a row with `toc_result_id` NULL, `COUNT = SUM` evaluates NULL or FALSE, and the function returns FALSE.
  - Live body: `1792000000000-IRS-ImpactResultsFoundation.ts` `CONTRIBUTOR_PARTNER_WITH_IMPACT`, captured from prod in P2-3901 Appendix A.
- **Evidence on 32860, from `GET v2/api/contributors-partners/32860`:**
  - `result_toc_result.planned_result = null` and `result_toc_results = null`.
  - The other rules pass: `is_lead_by_partner = false`, 3 partners each with a delivery type, `has_innovation_link = true` with 5 linked results, and a lead center.

### Impact & Scope
- **Affected results:** every 2026+ result (all types except 9) whose submitter left the question unanswered. Their section stays red and they cannot submit. No data is lost.
- **Not affected:** 2025 results (the client still requires the question) and type-9 impact results (P2-3901 already bypasses the ToC block for them).

### Fix Strategy
- Server-only migration plus QA catalog sync.
- Route: `/akili-specify` (Lite, Bug Mode) with a mandatory regression test.

## 10. Approach Options

| # | Option | Trade-off |
|---|---|---|
| **A** | **Server: NULL skips the ToC block for phase year ≥ 2026** | Aligns the server with the decision already shipped in the client. Small, single-function change |
| B | Client: put the asterisk back (required again) | Reverts a released decision (P2-3480 lineage) and does not match what the product asked for |
| C | Treat NULL like No (`FALSE` branch) | Would demand the "why reported" narrative for an unanswered question, so the result stays red |

## 11. Recommended Approach

**Option A.** It is the smallest change that makes the server match the behaviour users already see. It reuses the year that `result.version_id → version.phase_year` already provides, and it leaves both answered branches and 2025 untouched.

## 12. Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| **OQ-1 (product, blocking)** | P2-3480 (Nicoleta, via Camila) asked to make the question optional in the **"Request to be added as contributor"** form, not explicitly in Contributors & partners. `quick/non-mandatory-toc-kpi` applied it to C&P. **Confirm with Nicoleta or Angel that the question is optional in C&P for 2026.** If it is not, the fix is option B instead |
| R-1 | Migration order: this migration must run after `1792000000000`. P2-3901 is on `performance-refactor` / PRTest; both have to travel together to `staging` / `master`. The `down` restores the P2-3901 body, not the older one |
| R-2 | Regression test: a function body cannot be executed in Jest. The test asserts the migration SQL (the NULL plus phase-year gate is present; the Yes/No branches are byte-identical to the P2-3901 body). Real behaviour is checked on PRTest with result 953 or an equivalent 2026 result with the question unanswered |
| R-3 | QA catalog: the `qa-catalog.required-follows-form` and snapshot specs will change; the catalog version needs a bump |
| R-4 | A result that answered Yes and later cleared its rows still goes through the Yes branch. Unchanged on purpose |

## 13. Success Criteria

- On result 953 (or an equivalent 2026 result with the question unanswered) on PRTest, the sidebar shows the Contributors & partners green check, in agreement with the bottom bar.
- A 2026 result that answered **Yes** with incomplete ToC rows stays red.
- A result that answered **No** without a valid narrative stays red, as today.
- A 2025 result with the question unanswered stays red.
- Migration `up`/`down` and `npm run migration:check` pass; the QA catalog specs are green.

## 14. Next Step

After OQ-1 is answered:

```text
/akili-specify bugfix/toc-kpi-optional-green-check
```

Run it in **Bug Mode** (Lite), with a mandatory regression test.

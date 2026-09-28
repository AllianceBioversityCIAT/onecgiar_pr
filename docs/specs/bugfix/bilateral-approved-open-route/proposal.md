# Proposal — Approved W3 bilateral opens Result Detail instead of the bilateral editor

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/bilateral-approved-open-route` |
| Slug | `bilateral-approved-open-route` — derived from free-text argument (Spanish report: "abro un bilateral approved me redirecciona a result-detail…") |
| Type | Bug (behavior contested: see Root Cause, the redirect is today's *intended* rule) |
| Approval Mode | gated |
| Source | User report with 2 screenshots, 2026-09-24 |
| Depends on | none |
| Parallel-safe | yes — client routing helper only |
| Status | **Approved by user 2026-09-24** (with the three decisions below) |
| Related | `archive/2026-09-15-bugfix--bilateral-w3-editing-route` (introduced the current three-way branch) |

## Intent

Opening an **Approved** W3/Bilateral result from Results Center should land on the bilateral center page `/bilateral/{center}/result/{code}?phase={version}`, and that URL must load.

## Problem / Current Behavior

| Step | Observed | Expected (per report) |
|---|---|---|
| Results Center → row `28728` (CIMMYT, `2025 · P25`, Approved) | `/result/result-detail/28728/general-information?phase=6` | `/bilateral/CIMMYT/result/28728?phase=…` |
| Typing `/bilateral/CIMMYT/result/28728?phase=8` by hand | "We couldn't load this result" (Try again) | Loads |

## Proposed Outcome

- Approved, non-AVISA W3 rows with a lead center open the bilateral center page, using the **row's own** `version_id` as `phase`.
- The bilateral page loads a result from a closed phase, read-only.

## Scope

- `classifyBilateralOpenRoute` in `shared/routing/bilateral-result-open-route.util.ts` (+ its spec).
- Callers: `results-list`, `programme-results`, `global-search-palette` (all share this util).
- Verify the editor renders an Approved result in a closed phase (read-only via `isEditableByCenterUser()`).

## Non-Goals

- No server or `/api/bilateral/*` change.
- No change to AVISA (`SGP-02`) handling, the review-drawer lane, or the Editing → editor rule.
- No phase rewriting/redirect between phases.

## Affected Users, Systems, And Specs

Center users and programme leads opening Approved W3 results; three client entry surfaces via the shared util. No server impact.

## Visual Reference

- Source: None
- Location: user screenshots only (Results Center row; "Bilateral result — We couldn't load this result")
- Notes: no new UI; the editor's read-only state already exists.

## Bug Diagnosis

### Observed Symptom
Approved W3 row opens Result Detail; the hand-typed bilateral URL shows the load-failed state.

### Reproduction Steps
1. Results Center (`/result/results-outlet/results-list`), open row `28728` (W3/Bilaterals, Approved, phase `2025 · P25`).
2. Lands on `result-detail/28728/general-information?phase=6`.
3. Visit `/bilateral/CIMMYT/result/28728?phase=8` → load failed.

### Root Cause (confirmed by code reading; not yet re-run in the browser)
1. **Redirect is a deliberate rule, not a regression.** `classifyBilateralOpenRoute` (`bilateral-result-open-route.util.ts:67`) returns `'result-detail'` for `statusName === 'Approved'`. The `bilateral-w3-editing-route` spec explicitly kept "Approved → Result Detail (unchanged)". The report is therefore a **requirements change**, not a bug in the code path.
2. **The forced URL fails because of the phase, not the route.** `phase` is the `version_id` lookup key: `getBilateralResultById` (`results.service.ts:3754-3777`) finds `result_code + version_id + source=API + is_active`, else 404. Row `28728` lives in version **6** (the list link says `phase=6`); no active row exists in phase 8, so the GET 404s and the editor shows `loadFailed`. The `phase=8` in the report was assumed, not taken from the row. Same URL with `phase=6` should load.

### Impact & Scope
Same util feeds Programme Results and the global search palette, so changing Approved routing changes those too. Programme-side reviewers may still prefer Result Detail for Approved.

### Fix Strategy
Smallest safe change: in the shared classifier, send Approved + non-AVISA + lead center to `center-editor` (keep `result-detail` when no lead center, matching the Editing rule). Keep `phase = version_id`. Needs `/akili-specify` Bug Mode (logic change, regression tests for the classifier and the three callers). Not `/akili-quick`.

## Approach Options

| Option | Change | Trade-off |
|---|---|---|
| A. Recommended | Approved + lead center → center editor everywhere (shared util) | Smallest; one rule. Programme reviewers also lose Result Detail for Approved |
| B | Add an `audience` input; center editor only from Results Center / center surfaces | Preserves programme behavior; more plumbing across 3 callers |
| C | Leave routing; make Result Detail link to the bilateral editor | No behavior loss; user still gets the wrong first landing |

## Recommended Approach

**Option A — approved.** One shared rule for every entry surface (Results Center, Programme Results, global search palette).

### Decisions from the user (2026-09-24)

| # | Question | Decision |
|---|---|---|
| 1 | Approved from global search / Programme Results too? | **Yes** — every surface shows the same view (bilateral center page). |
| 2 | Approved view | The normal bilateral URL `/bilateral/{center}/result/{code}?phase={phase}` (user's reference: `…/bilateral/CIMMYT/result/28728?phase=8`). |
| 3 | Phase in the URL | **Must be included**, as every bilateral URL does. Implemented as the row's own `version_id`. |

⚠️ Assumption recorded: `phase=8` in the reference URL is the pattern, not a literal. The list row for 28728 carries `version_id = 6` and the server only resolves `result_code + version_id` (see Root Cause 2), so the link built from the row is `?phase=6`. If a user wants the phase-8 copy, that copy must exist as its own active row (versioning, out of scope).

## Risks, Dependencies, And Open Questions

- ~~OQ-1~~ Resolved: all surfaces (Decision 1).
- ~~OQ-2~~ Partly verified by reading code: the `/bilateral/:acronym` shell does not gate on membership, the server GET has no role gate, and the editor is read-only via `isEditableByCenterUser()`. Browser check stays as task BAO-T-3.
- ~~OQ-3~~ Resolved with an assumption: phase comes from the row (Decision 3). The `phase=8` literal is not hard-coded.
- Risk: existing specs assert Approved → `result-detail`; they must be updated deliberately.

## Success Criteria

- Approved W3 (non-AVISA, lead center) row opens `/bilateral/{center}/result/{code}?phase={row.version_id}` and it loads read-only.
- Editing/Draft, review-drawer, AVISA and no-lead-center behavior unchanged.
- Classifier spec covers Approved with and without lead center.

## Next Step

```text
/akili-specify bugfix/bilateral-approved-open-route
```

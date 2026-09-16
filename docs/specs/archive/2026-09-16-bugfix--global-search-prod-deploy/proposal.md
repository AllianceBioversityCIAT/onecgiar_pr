# Proposal — Global Search Does Not Find Result 20694 In Production

> **Resolved 2026-09-16.** User confirmed `20694` now returns a result when searched on `reporting.cgiar.org` (production) — see screenshot evidence attached to the conversation. The fix (`27dd8f47b`) has reached production, matching the recommended Option A. No further action needed; kept for traceability.

## 1. Document Control

| Field | Value |
|---|---|
| Slug | `global-search-prod-deploy` — derived from free-text argument describing the bug |
| Spec Path | `docs/specs/bugfix/global-search-prod-deploy` |
| Type | Bug |
| Approval Mode | gated |
| Author | Santiago Sanchez Correa |
| Date | 2026-09-16 |
| Related commit | `27dd8f47b` (fix already merged to `staging`, not yet in `master`) |

## 2. Intent

Confirm why global search fails to find an existing result by code in production, and recommend the correct remediation — which, per the diagnosis below, is a **release/promotion action**, not new code.

## 3. Problem / Current Behavior

Searching `20694` in the global search palette on `reporting.cgiar.org` (production) returns **0 results**, even though result `#20694` exists. The same search, run from a local frontend build pointed at the **same production data**, correctly returns the result. Since both point at identical data, the discrepancy is in the deployed **frontend/backend code**, not the data.

## 4. Bug Diagnosis

### Observed Symptom
- Global search palette on production (`reporting.cgiar.org`) returns "No matching results" for a numeric query (`20694`) that matches an existing result's `result_code`.

### Reproduction Steps
1. On `reporting.cgiar.org` (production), open the global search palette (Ctrl+K) and type `20694`. → 0 results.
2. On a local dev frontend (`localhost:4200`) connected to the same production backend/data, open the same palette and search the equivalent result code. → 1 result found, correct result returned.
3. Expected: both environments return the same result since they query the same data.

### Root Cause (confirmed)
The global search palette originally filtered only on `r.title` (`AllResultsByRoleUserAndInitiativeFiltered` in `onecgiar-pr-server/src/api/results/result.repository.ts`), so a pure numeric `result_code` query like `20694` never matched — this is a pre-existing gap, already fixed and merged to `staging` in commit `27dd8f47b` ("fix(global-search-palette): match result_code and rank by relevance, add recent searches", 2026-09-15), which extends the query to OR-match `result_code` and adds relevance ranking. That commit is present on `staging` (and on this branch, `qa-development-2026-ss`, which branched from it) but **not yet on `master`**, which is what production deploys from. This fully explains the split: the local repro used the already-fixed local/staging code against prod data, while `reporting.cgiar.org` is still serving the pre-fix `master` build.

Verified: `git merge-base --is-ancestor 27dd8f47b master` → not an ancestor; `... origin/staging` → is an ancestor.

### Impact & Scope
- Affects any global-search query that is a bare numeric result code (or a code substring) across all science programs — not specific to result 20694.
- No data integrity or security implication; this is a read-path query bug, already corrected in code.
- Blast radius is contained to the global search palette (`global-search-palette.component.ts/html`, `global-search-palette.service.ts`) and `result.repository.ts::AllResultsByRoleUserAndInitiativeFiltered`, per the diff in `27dd8f47b`.

### Fix Strategy
No new implementation is needed — the code fix, tests, and UX polish (relevance ranking, code display, recent searches) already exist and are merged to `staging`. The remaining work is **promoting `staging` → `master`** through the project's normal release path (PR per root `CLAUDE.md` branch conventions) so production picks it up on its next deploy.

Recommended next step is **not** `/akili-specify` — there is no new requirement to draft. Recommend:
1. Open a PR from `staging` into `master` including commit `27dd8f47b` (and anything else queued for release).
2. After merge, confirm the production deploy pipeline (Jenkins, per `docs/infrastructure.md`) picks it up.
3. Re-verify on `reporting.cgiar.org` that `20694` (and a couple of other numeric-code searches) now resolve.

If the team wants a written record of the original fix for traceability (since it shipped without a spec), that can be created retroactively as a lightweight spec under `docs/specs/results/global-search-code-match/` — optional, not required to close this bug.

## 5. Proposed Outcome

Result `20694` (and any other result addressable by its numeric code) is found by the global search palette on production, matching the behavior already live on `staging`/local.

## 6. Scope

- Release/deploy action: merge `staging` → `master`, redeploy production.
- Post-deploy verification of the numeric-code search path in production.

## 7. Non-Goals

- No new search logic, UI changes, or requirements — the fix is already implemented and tested on `staging`.
- Not addressing any other pending `staging`-only commits beyond confirming they are safe to ship with this one (that's a normal release review, out of scope for this bug proposal).

## 8. Affected Users, Systems, And Specs

- **Users:** any PRMS user relying on global search by result code in production.
- **Systems:** `onecgiar-pr-client` (`global-search-palette.*`), `onecgiar-pr-server` (`result.repository.ts`), production deploy pipeline.
- **Specs:** none exist yet for global search; this proposal recommends an optional retroactive spec (§4) rather than a required one.

## 9. Visual Reference

- Source: None
- Location: n/a
- Notes: Bug is behavioral/backend-query, not a visual design change. The two screenshots supplied by the user are reproduction evidence (attached to this conversation), showing 0 results on prod vs 1 result on local-against-prod-data.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A. Promote existing fix (recommended)** | Merge `staging` → `master` via PR, redeploy production. | Fastest, zero new risk — code is already tested and running on `staging`. |
| B. Re-implement fix directly on a branch off `master` | Cherry-pick or reapply `27dd8f47b` onto a `master`-based branch. | Unnecessary duplication; risks divergence from `staging` if any follow-up commits touched the same files. |
| C. Do nothing / wait for next scheduled release | Let the normal `staging`→`master` cadence pick it up. | Leaves a known, already-fixed user-facing bug live in production longer than necessary. |

## 11. Recommended Approach

**Option A.** The fix is complete, tested, and already integration-verified on `staging`. This is a release gap, not an engineering gap — resolve it by shipping what already exists rather than writing anything new.

## 12. Risks, Dependencies, And Open Questions

- **Risk:** other commits on `staging` not yet vetted for production may ride along in the same PR — confirm release scope with whoever owns the `staging → master` cadence before merging.
- **Dependency:** production deploy pipeline (Jenkins) must pick up `master` after merge — confirm via `docs/infrastructure.md` §6 / CIAT-context Jenkins node if a manual trigger is needed.
- **Open question:** should the original fix (`27dd8f47b`) get a retroactive spec for traceability, or is the commit message sufficient? Recommend leaving it as commit-only unless the team wants formal spec coverage for this module.

## 13. Success Criteria

- Result `20694` (and other numeric-code searches) return correct matches when searched on `reporting.cgiar.org`.
- `master` contains commit `27dd8f47b` (verifiable via `git merge-base --is-ancestor 27dd8f47b master`).

## 14. Next Step

This is a **deploy/release action**, not a spec-worthy change. Recommend skipping `/akili-specify` and instead:

```text
Open a PR: staging → master (include commit 27dd8f47b), merge, redeploy, verify on reporting.cgiar.org.
```

If new engineering work is later discovered while verifying (e.g., another search gap not covered by `27dd8f47b`), reopen with `/akili-propose bugfix/<new-name>`.

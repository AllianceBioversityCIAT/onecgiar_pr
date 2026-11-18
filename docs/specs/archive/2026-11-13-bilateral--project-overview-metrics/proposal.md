# Proposal — Per-project reporting overview on the Bilateral Home (replicated / new / W1-W2 contributor counts)

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/project-overview-metrics/` |
| Slug | `project-overview-metrics` — derived from free-text argument describing Nicoleta Trifa's ticket. Placed under `bilateral/` per the domain-module taxonomy (precedent: `bilateral/qa-ai-verdict-drawer`, `bilateral/qa-ai-traffic-light`). |
| Type | **Change** |
| Approval Mode | **gated** (default) |
| Status | **draft** — awaiting owner approval |
| Owner | Santiago Sanchez |
| Date | 2026-09-22 |
| Ticket(s) | Freshdesk "Replicated innovations for w3/bilat projects" (reported by Nicoleta Trifa, CGIAR System Organization, 2026-09-22, to `prmstechsupport@cgiar.org`, `a.jarrin@cgiar.org`). No Jira ticket yet — confirm before `/akili-specify` whether one should be opened. |
| Baseline | `docs/ux-ui/design.md` (card/KPI component rules, §7 tokens, §8) · `docs/prd.md` — G3 (Bilateral / external consumer reliability), US-D1 · `docs/trd/trd.md` — bilateral module section |
| Related specs | `result-framework-reporting` home (`onecgiar-pr-client/src/app/pages/result-framework-reporting/`) — the pooled/Science-Program overview this change mirrors, read-only reference, not modified. Confirmed by JC (Juan Carlos) as the correct place to implement: the bilateral home (`reporting.cgiar.org/bilateral/{acronym}/home`). |
| Depends on | none (self-contained; metric #3 may require its own follow-up spec, see Open Questions) |
| Parallel-safe | yes — touches only `api/results/result.repository.ts` (SELECT addition), `BilateralCenterResult` interface, and `bilateral-projects-panel` component files. No migration for #1/#2. |
| Evidence | Screenshot from the ticket (`Description` image, project card mockup: title, "8 replicated / 145 new", status segments) |

**Model checkpoint:** T1 phase; continuing on the session model — flag for registry review if the tier maps elsewhere.

## Intent

Add a per-project reporting overview to the **Bilateral Home** (`/bilateral/{acronym}/home` → `BilateralProjectsPanelComponent`), mirroring the overview that already exists for pooled Science Programs, showing per W3/Bilateral project:

1. **# of innovations replicated** into the current phase.
2. **# of new results** reported for review by the P/A team.
3. **# of W1/W2 results** where the project is tagged as a contributor.

## Problem / Current Behavior

The Bilateral Home's project catalog (`bilateral-projects-panel.component.html`) already renders one card per bilateral project with a single aggregate: `getProjectResultsCount(project)` — total bilateral results reported under that project, computed client-side from `BilateralCenterResult[]` (`bilateral-projects-panel.component.ts:90-100`). It does not break this down by replicated-vs-new, and has no W1/W2 contributor signal at all.

The pooled/Science-Program equivalent (`result-framework-reporting-card-item.component.ts`) already computes and displays `totalResults` / `replicatedResults` / `newResults` server-side, via `results.service.ts` (~L1700-1900) aggregating over `Result.is_replicated` and `status_id`, keyed by `submitter_id` (initiative). Nicoleta's ask is to bring the same breakdown to the bilateral project cards — plus a third metric (W1/W2 contributor count) that has no pooled precedent.

### Data availability per metric (confirmed by investigation)

| # | Metric | Backend source today | Gap |
|---|---|---|---|
| 1 | Replicated innovations | `Result.is_replicated` column exists (`result.entity.ts:473-478`) but is **not selected** by `getResultsByBilateralCenter` (`result.repository.ts:4051`), the query behind `GET bilateral-center-results` (`results.controller.ts:831-857`) | None — additive SELECT column |
| 2 | New results for P/A review | `status_id`/`status_name` already returned (`result_status`); `PENDING_REVIEW = 5` per `result-status.enum.ts` | None — client-side derivation from existing fields, refined by #1 once available |
| 3 | W1/W2 results where project is contributor | **No such link exists.** `results_by_inititiative` (contributor mechanism, `resultByInitiatives.repository.ts:325-386`) only accepts `clarisa_initiatives` ids (Science Programs), never a bilateral `clarisa_projects` id. The bilateral module's own "contributing" mechanisms (`SaveBilateralContributorsDto.contributing_bilateral_projects` → `results_by_projects`; `contributing_programs` → `share_result_request` drafts, `api/bilateral/CLAUDE.md` §7.3.1) only link **bilateral results** to projects/programs — never a W1/W2 (pooled) result back to a bilateral project | **Confirmed data-model gap** — see Approach Options |

## Proposed Outcome

Each project card on the Bilateral Home shows, alongside the existing results-count badge:

- Replicated count (icon + number)
- New-for-review count (icon + number)
- W1/W2 contributor count (icon + number) — pending the approach chosen for the gap (see below)

Clicking a metric navigates to the Results tab pre-filtered the same way `navigateToProjectResults` already does for the aggregate count.

## Scope

**In scope:**

| File | Change |
|---|---|
| `onecgiar-pr-server/src/api/results/result.repository.ts` (`getResultsByBilateralCenter`) | Add `r.is_replicated` to the SELECT |
| `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-center-result.interface.ts` | Add `is_replicated: boolean` to `BilateralCenterResult` |
| `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/bilateral-projects-panel.component.ts` | New `computed()` aggregates per `project_id`: replicated count, new-for-review count (from `results()`, mirroring the existing `resultsCountByProject` pattern) |
| `.../bilateral-projects-panel.component.html` | Render the two (or three) new counters on each `bpp_card` and in the list-view row |
| Metric #3 backend + frontend | Scoped by the approach chosen below |

**Non-Goals (explicit, per user direction — resolve later, do not touch here):**

- Where/how a project team updates a replicated innovation ("is it under Results tab? same options as pooled?"). Today pooled editing lives in Result Detail (`rd-result-types-pages/innovation-dev-info`, `innovation-use-info`, `rd-annual-updating`); bilateral's equivalent flow is unconfirmed (today: `bilateral-review/result-review-drawer`, which is a QA/decision surface, not a continuous edit surface). Tracked as **OQ-1**, separate spec.
- Any change to `bilateral-review`, `result-review-drawer`, or the innovation edit pages.
- Any change to the pooled/Science-Program overview (`result-framework-reporting`) — read-only reference.

## Affected Users, Systems, And Specs

| | |
|---|---|
| **Users** | Center reporting teams viewing `/bilateral/{acronym}/home`; PMU/P&A reviewers who use these counts to track replication progress per project. |
| **Systems** | `onecgiar-pr-server/src/api/results/` (repository + controller, existing endpoint), `onecgiar-pr-client` bilateral module (existing component). No new endpoint required for #1/#2; metric #3 may require one, depending on the approach chosen. |
| **Specs** | None directly amended. Companion read-only reference: `result-framework-reporting` overview (pooled). |

## Visual Reference

- Source: Screenshot in the ticket (mockup embedded in the Freshdesk description)
- Location: not persisted as a file (email screenshot); described in Intent — project title at top, replicated/new counts with icons, status-segment bar below (QAed/Submitted/Editing/Discontinued)
- Notes: the reference shows the **pooled** card layout (`result-framework-reporting-card-item`). This proposal reuses its metric semantics, not its exact visual chrome — the bilateral card (`bpp_card`) already has a different, more compact layout (code pill, results badge, SP alignment chips) that `/akili-specify` should adapt rather than replace wholesale.

## Requirement Delta Preview

### ADDED Requirements

- Each bilateral project card displays a replicated-innovations count and a new-results-for-review count, computed from the same `bilateral-center-results` data already loaded for the aggregate results count.
- (Pending approach) Each bilateral project card displays a W1/W2 contributor count.

### MODIFIED Requirements

- `getResultsByBilateralCenter` SELECT gains `is_replicated`.
- `BilateralCenterResult` interface gains `is_replicated`.

### REMOVED Requirements

- None.

## Approach Options

### For metrics #1 and #2 (no open question — proceed as scoped above)

### For metric #3 (W1/W2 contributor count) — the real decision

| | Option | Trade-off |
|---|---|---|
| A | **Ship #1/#2 now, defer #3** to a follow-up spec once the data-model question is resolved with Nicoleta/product | Smallest safe path; ships two of three asks immediately with zero data-model risk. Leaves the card visually incomplete vs. the mockup (3 numbers) until #3 lands |
| B ✅ | **Ship #1/#2 now; for #3, add a new link table** (e.g. `results_by_bilateral_project_contributions` or extend `results_by_projects` with a `role` column mirroring `results_by_inititiative`'s role 1/2 pattern) so a W1/W2 result can be explicitly tagged with a contributing bilateral project, mirroring how Science Program contribution already works. Requires a migration, a new "contributing bilateral projects" field somewhere in the W1/W2 result authoring flow, and defining who sets it (author? P/A on review?) | Correct long-term shape — matches the existing Initiative-contributor pattern instead of inventing a proxy. Real effort: new entity/migration, new UI touchpoint in Result Detail (out of today's stated non-goals, so likely its own spec), and a product decision on where in the authoring flow this gets set |
| C | **Heuristic proxy**: count W1/W2 results whose contributing/primary Science Program owns this bilateral project's center as an institution (via `results_by_institutions` center-level tagging), scoped to results tagged with the project's home center | No new data model, ships fastest. But it is **not** what was asked — it approximates at center granularity, not project granularity, and will silently overcount (every W1/W2 result naming the center as a contributing institution counts, regardless of whether *this specific* bilateral project is involved). Risk of shipping a number Nicoleta cannot reconcile against her own records |

## Recommended Approach

**Option A for #1/#2, immediately.** For #3, **recommend Option B** but only after a product conversation — this is a genuine new capability (W1/W2 results explicitly tagging a bilateral project as contributor), not a reporting query. Option C is explicitly **not** recommended: it produces a number that looks precise but isn't, which is worse for a metrics widget than omitting it.

Given the user's earlier direction to "implement all 3 with the best available approximation," `/akili-specify` should present Options B and C side by side to the product owner (Nicoleta / Juan Carlos) with this trade-off explicit, rather than silently picking C.

## Risks, Dependencies, And Open Questions

| | Item | Handling |
|---|---|---|
| **R-1** | `status_id = PENDING_REVIEW` alone may not equal "new" — a replicated result could also sit in `PENDING_REVIEW` after being re-submitted | Define "new" as `is_replicated = false AND status_id = PENDING_REVIEW`; confirm against real data (per project convention: verify SQL fixes against real data before shipping) |
| **R-2** | Metric #3 has no existing data source | See Approach Options — do not ship a misleading proxy silently |
| **OQ-1** | Where should a project team go to update a replicated innovation, and should it reuse the pooled Result Detail options? | Explicit non-goal here; needs its own spec once bilateral's edit surface is confirmed |
| **OQ-2** | Is there a Jira ticket to attach this to, or does Freshdesk stay the record of intent? | Owner |
| **OQ-3** | For metric #3 Option B: who sets the "contributing bilateral project" on a W1/W2 result — the author, or P/A during review? | Product (Nicoleta) |

## Success Criteria

1. Each bilateral project card on `/bilateral/{acronym}/home` shows replicated and new-for-review counts, sourced from `bilateral-center-results` with `is_replicated` added to the SELECT.
2. Counts update on `refresh()` the same way the existing results badge does.
3. No change to `result-framework-reporting` (pooled) behavior.
4. Metric #3 is either implemented per an approved option, or explicitly deferred with a linked follow-up spec — never shipped as a silent heuristic without sign-off.
5. `npx jest --silent --reporters=summary --no-coverage --testPathPattern="bilateral-projects-panel"` green (client); relevant server repository/controller specs green.

## Next Step

```text
/akili-specify bilateral/project-overview-metrics
```

`/akili-specify` should resolve OQ-3 with the product owner before writing requirements for metric #3 — do not default to Option C without an explicit sign-off.

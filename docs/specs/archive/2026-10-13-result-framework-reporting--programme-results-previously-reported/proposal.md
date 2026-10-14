# Proposal — Previously reported tag on the Science Program Results list

> **In one line:** show the Results Center's **Previously reported** tag on the SP Results tab (`entity-details/:code/results`). The data already reaches the client; this is a client-only change. Whether replicas should also **stack** like they do in the Results Center is the one open decision, because the ticket rules it out and the request asks for it.

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `result-framework-reporting/programme-results-previously-reported` |
| Slug | `programme-results-previously-reported`, derived from the free-text argument (the Jira URL plus a description) |
| Type | **Change** (Jira issue type: Enhancement) |
| Ticket | [P2-3953](https://cgiarmel.atlassian.net/browse/P2-3953): *Innovations updated: show the "Previously reported" tag on the Science Program's results list* (BA: Angel Jarrin · assignee: Santiago Sanchez · Open · Medium) |
| Approval Mode | `gated` |
| Status | **Approved** — Santiago Sanchez, 2026-10-13 · scope = **Option A (tag only)**; OQ-1 (stacking, Option B) stays out unless the BA requests it |
| Depends on | none |
| Parallel-safe | yes. Touches only `programme-results/` plus an optional new shared badge. No migration, no API contract change |
| Date | 2026-10-13 · branch `qa-development-2026-ss` |

## 2. Intent

Someone looking at a Science Program's results should be able to tell, at a glance, which results are **carried over from an earlier phase** and which are **new this phase**. They should see this using the same tag the Results Center already shows.

## 3. Problem / Current Behavior

| Surface | What a carried-over result looks like today |
|---|---|
| Results Center (`results/.../results-list`) | `Previously reported` pill before the title (`results-list.component.html:290-295`), tooltip *"Previously reported in an earlier phase"*, class `.rc-badge-replicated` (`results-list.component.scss:809`). With `combine = true`, rows that share a `result_code` are grouped and stacked (`results-list-filter.pipe.ts:133` `combineRepeatedResults`) |
| SP Results tab (`programme-results`) | Title only. `toProgrammeResultRow()` (`services/programme-results.service.ts:281`) **drops `is_replicated`**, so the template has nothing to render. Rows are flat, one per result per phase |

Verified: both screens use the **same endpoint**, `GET get/all/roles/filter/:userId`. Its server query, `AllResultsByRoleUserAndInitiativeFiltered` (`result.repository.ts:686`), already selects `r.is_replicated` (`:738`). The code comment on `ProgrammeResultRow.updated` lists the payload keys as verified on 2026-08-21, before `is_replicated` was added, so that list is now stale.

## 4. Proposed Outcome

- On the SP Results tab, a row whose result has `is_replicated = 1` shows the **Previously reported** pill before its title. The pill has the same wording, tooltip, and look as the Results Center.
- A row with `is_replicated = 0` looks exactly as it does today.
- With a long title, the title truncates and the pill stays visible (`flex: none` on the pill, `truncate` on the text).
- *(Only if OQ-1 is approved)* When more than one phase is selected, rows that share a `result_code` appear **stacked together**, like the screenshot from the Results Center (newest phase first).

## 5. Scope

| In | Out |
|---|---|
| Map `is_replicated` → `ProgrammeResultRow.isReplicated` | A "previously reported / new only" filter (ticket: deferred) |
| Render the pill in the `title` cell (`programme-results.component.html:444-456`) | A new phase column (the optional `phase` column already exists and stays off by default) |
| Reuse the Results Center's look and tokens (`--pr-color-primary-100/700`) | Any change to the Results Center (BR5) |
| Unit tests: mapper + template (with tag, without tag, long title) | Any change to counters, filters, paging, CSV columns (BR4, AC-6/7) |
| *(OQ-1)* Stacking replicas when 2 or more phases are selected | Changes to what "replicated" means or how results move between phases |

## 6. Non-Goals

- No server change. The field is already in the payload.
- No refactor of the Results Center to share the badge. If a shared badge is created, only the SP list uses it in this spec.
- The tag does not count *how many* phases a result went through (edge case: "carries the tag, not a count").

## 7. Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| SP members / PMU | Users of the Results tab under `entity-details/:code/results` |
| `programme-results.service.ts` | `ProgrammeResultRow` + `toProgrammeResultRow()` gain one field |
| `programme-results.component.html/.scss` | Pill in the title cell |
| `my-work-board` | Shares `ProgrammeResultRow`. The field is added there but not rendered (no visible change) |
| Related specs | `programme-results-multiselect-filters` (multi-phase, the only case where stacking applies), `changes/results-aow-column-filter`, `program-full-names-labels` (archived 2026-10-13) |
| Module notes | `client-result-framework-reporting.md` already records the dependency on `client-results`. No new cross-module edges unless the badge is extracted to `shared/` |

## 8. Visual Reference

- Source: screenshot from the user (Results Center, results 9088 at 2026·P25 and 2025·P25, stacked) plus the live Results Center itself.
- Location: the Results Center's `results-list.component.html:290-295` / `.scss:809` is the visual source of truth.
- Notes: no mockup is needed. The pill must be a copy of an existing element, not a new design (BR2).

## 9. Requirement Delta Preview

### ADDED
- **R-1** A result row with `is_replicated = 1` shows `Previously reported` before the title, with tooltip `Previously reported in an earlier phase` (AC-1, AC-3).
- **R-2** It applies to every category, not only innovations (BR3, AC-5).
- **R-3** The tag never displaces the title: the title truncates and the tag does not (edge case: long title).
- **R-4** *(OQ-1)* With 2 or more phases selected, rows that share a code appear stacked, the most recent phase on top.

### MODIFIED
- `ProgrammeResultRow` gains `isReplicated: boolean`.

### REMOVED
- None.

## 10. Approach Options

| # | Option | Pros | Cons |
|---|---|---|---|
| **A** | **Tag only**: map the field, put the pill in the title cell, styles copied from `.rc-badge-replicated` | Exactly what the ticket asks for. ~2 files + specs. Zero risk to counters, sorting, or paging | Does not give the stacked look you asked for |
| **B** | **A + stacking when 2 or more phases are selected**: stable secondary sort by `code` → `phaseSort desc` inside the active sort, with no visual merging | With one phase (the default) it looks the same as A. Gives the stacked look when phases are mixed. Counters unchanged (still one row per result per phase) | **Contradicts the ticket's "Not in scope"** ("The SP list keeps showing one row per result for the phase selected"). Changes the order whenever the user sorts by another column (touches AC-6) |
| C | Full Results Center grouping (one nested group per `code`, like `combineRepeatedResults`) | Identical to the Results Center | Rewrites the grid, `app-pr-table` sorting, paging, CSV export, and the counters. Too large for a Medium ticket, and it breaks BR4 |

## 11. Recommended Approach

**Option A now. B only if the BA (Angel Jarrin) confirms it** (OQ-1).

Reason: with the default phase (`Reporting 2026 · P25`), each result appears only **once**, so stacking does nothing. Stacking only shows up when the user selects more than one phase. The value you are after (telling carried-over results from new ones) comes entirely from the tag. B can be added later without rework, because it is only a sorting rule on top of A.

Implementation detail for A: copy the pill as a local class in `programme-results.component.scss`, using the same tokens. Don't extract it to `shared/` in this spec, so the Results Center (BR5) stays untouched. Extracting it to a shared component is a separate follow-up.

## 12. Risks, Dependencies, And Open Questions

| ID | Item | Mitigation |
|---|---|---|
| **OQ-1** | **Stacking.** The ticket excludes it explicitly; your request includes it. Who decides: you or the BA? | Ask Angel. Until there is an answer, specify A and leave B as a separate optional task |
| OQ-2 | Which row gets the tag? `is_replicated` belongs to each **version**: in your screenshot the 2026 row has it and the 2025 row does not. This matches BR1 ("existed in an earlier phase") | Confirm on SP09 with a replicated innovation and a replicated KP (AC-5) |
| OQ-3 | Edge case "earlier phase under a different program". The tag follows `r.is_replicated` regardless of program, as in the Results Center. The ticket accepts this | None. Record it as expected behavior |
| R-1 | The pill duplicates CSS from the Results Center. If one copy changes, the two drift apart | Comment `/* mirrors results-list .rc-badge-replicated */`. A shared component is a follow-up |
| R-2 | Shared tests: `programme-results.component.spec.ts` (2,304 lines) and `my-work-board` use `ProgrammeResultRow` fixtures | Optional field or default `false` in the mapper. Scoped Jest (`--maxWorkers=2 --testPathPattern=programme-results`) |
| R-3 | Visual check in the browser against shared prdb | Read only. Never click write buttons |

## 13. Success Criteria

- On SP09, `Reporting 2026 · P25`: replicated results show the pill and new results do not (AC-1/2).
- Same wording, tooltip, and look as the Results Center for the same result (AC-3/4).
- Seen on at least one non-innovation result (AC-5).
- Columns, order, sorting, filters, paging, and counters are identical to before (AC-6/7). The Results Center is unchanged (AC-8).
- Scoped tests are green: mapper (`is_replicated` 1/0/missing) and template (pill present/absent, title still truncates).

## 14. Next Step

```text
/akili-specify result-framework-reporting/programme-results-previously-reported
```

(Lite depth: one spec, client only, 2–3 tasks. Resolve OQ-1 before or during specify.)

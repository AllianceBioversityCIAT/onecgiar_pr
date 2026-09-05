# Proposal: "My work" board — a 4th Science Program tab

**One line:** add a read-only, status-grouped board to the Science Program hub that shows the current user's own results with their completeness, so a submitter can see what is still theirs to finish and jump straight into it.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `docs/specs/changes/my-work-board` |
| Proposal Path | `docs/specs/changes/my-work-board/proposal.md` |
| Slug | `my-work-board` — derived from free-text argument ("My work" kanban view as a 4th SP option) |
| Type | Change |
| Approval Mode | pre-approved (Juan Cadavid, 2026-09-04, "procede con todo en yolo mode"; Phase 1 gate answered Continue explicitly) |
| Depends on | none (builds on archived `programme-results-created-by-filter`, `reporting-entry-hub`, `sp-shell-app-viewport`) |
| Parallel-safe | yes — new route + new component; server change is an additive, opt-in query flag |
| Author | Claude (AKILI T1) with Juan Cadavid |
| Date | 2026-09-04 |
| Status | Draft — awaiting HITL approval |

Constitution cited: `docs/prd.md` persona *Result submitter*, `G1` (`M1.1`, `M1.3`), `US-S1`, `US-P1` · `docs/ux-ui/design.md` §5 navigation rules, §7 status tokens, `DD-12`, `OG-4` · `docs/trd/trd.md` `W1`.

## 2. Intent

Give the person who reports results one task-oriented screen inside their Science Program: *what is mine, in which state is it, and what is missing before I can submit it*. Today every SP view is structure-oriented (by AOW, by indicator, by portfolio) and none answers that question.

## 3. Problem / Current Behavior

- The SP hub (`reporting-program-band`) has three tabs: **Overview**, **Reporting**, **Results** (routes `entity-details/:entityId/overview`, `entity-details/:entityId`, `entity-details/:entityId/results`).
- The Results tab lists all SP results in a table and, since spec `CBF`, can be filtered by *Created by* and *Status*. That is still a shared table: the user must set two filters, scan rows, open each result, and open its panel menu to learn what is incomplete.
- Completeness (green checks) is only visible **inside** a result (`results-validation/get/green-checks/:resultId`), one result at a time.
- Net effect against `G1`: results sit in *Editing* until the deadline because nobody sees, at a glance, how many are theirs and how far each one is from submittable (`M1.3`).

## 4. Proposed Outcome

A fourth tab **My work** at `entity-details/:entityId/my-work` that renders the user's results as a board with one column per status.

| Column group | Statuses | Visual weight |
|---|---|---|
| **Needs my action** | Editing | Full width, brand accent, always expanded |
| **Waiting on others** | Pending Review, Submitted | Normal width, subdued header |
| **Closed** | Approved / Quality Assessed, Discontinued | Narrow, collapsible (collapsed by default, like Jira's *Done*) |

Each card shows: result code, title, category (result type), origin (W1/W2 or W3/Bilateral), created date, and a **completeness line** (`n/m sections` + a thin bar, missing sections listed on hover). The card's single action opens the result detail; for *Editing* cards it lands on the first incomplete section.

**Explicitly not a kanban in the Jira sense:** cards are not draggable. Status transitions keep happening inside the result (submit) and in QA (`W1`). The board is a read-only lens plus a fast entry point.

The tab shows a count badge of *Needs my action* cards so the number is visible from the other three tabs.

## 5. Scope

- Client: new lazy route + standalone `my-work-board` page under `pages/result-framework-reporting/pages/`, 4th tab in `reporting-program-band`, card + column components, empty states, viewport-locked layout consistent with `sp-shell-app-viewport` (board scrolls horizontally inside the app viewport; body never scrolls sideways).
- Client: "Mine" definition toggle (see OQ-1) and phase awareness (`DD-7`, uses the SP band's phase context).
- Server: additive completeness data for the list (see §11), reusing the v2 validation the result detail already runs per result (corrected after judgment, §15).
- Tests: Jest for the view-model (grouping, ordering, completeness mapping) and a Cypress CT for the board layout; Jest for the server addition.
- Docs: `docs/ux-ui/design.md` §4 screen inventory + §5 SP tab list; `docs/trd/trd.md` §4 API surface (one row).

## 6. Non-Goals

- Drag-and-drop or any status change from the board.
- A cross-program (global) "My work"; v1 is SP-scoped (see OQ-4).
- Assigning results to people (PRMS has no assignee concept; not introduced here).
- Replacing or restyling the Results tab table.
- IPSR innovation packages (they use a different validation module; see OQ-3).
- Notifications or reminders tied to the board.

## 7. Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| Persona *Result submitter* | Primary beneficiary; PMU leads may use it to check their own items too |
| `onecgiar-pr-client` `result-framework-reporting` module | New page + tab; `routing-data.ts` gains one route with `rfrView: 'my-work'` |
| `reporting-program-band` | 4th tab, count badge |
| `onecgiar-pr-server` `results` module | `get/all/roles/filter/:userId` (already supports `filter_created_by_me`, `status_id`, `initiative`, `phase`) gains opt-in completeness; or a sibling endpoint (§10) |
| `results-validation-module` | `validateResultById` (v2 stored procedure) reused per eligible Editing item, capped (§15) |
| Related archived specs | `programme-results-created-by-filter` (createdBy row field), `sp-tab-explainer-panels` (explainer copy for the new tab), `sp-shell-app-viewport` (viewport contract), `reporting-entry-hub` |

## 8. Visual Reference

- Source: Generated mockup (`design` skill — Claude Design canvas artifact)
- Location: `docs/specs/changes/my-work-board/mockup/` (artboards + `README.md`) · canvas: https://claude.ai/code/artifact/d7a35454-ca8c-4840-94a2-fd624c38d8a0
- Notes: covers the board at desktop width with all five columns, the collapsed *Closed* group, one card in each state, the count badge on the tab, and the empty state. Mockup follows `DD-12` (violet accent, navy-carbon chrome, Poppins, material-icons-round) and the `STATUS_META` colour vocabulary.

## 9. Requirement Delta Preview

### ADDED Requirements

- A submitter can open **My work** from the SP band and see their results grouped by status, ordered by completeness ascending inside *Editing* (least complete first) and by created date elsewhere.
- Each card exposes completeness as `n/m` sections with the missing section names, without opening the result.
- A card's primary action opens `/result/result-detail/:code` in the SP context; for *Editing* results it opens on the first incomplete section (falls back to General Information per §5 nav rule 2).
- The tab badge equals the number of cards in *Needs my action*.
- The *Closed* group is collapsed by default and can be expanded per session (volatile, no persistence — same rule as the explainer panels).
- Empty state per column and a whole-board empty state ("You have no results in this program for this phase") with a link to Reporting.

### MODIFIED Requirements

- `reporting-program-band` grows from three to four tabs; the phase selector applies to the new tab exactly as it does to Results.
- `get/all/roles/filter/:userId` (or its sibling) returns an optional `completeness` object per row when asked for it; the default payload is unchanged.

### REMOVED Requirements

- None.

## 10. Approach Options

| Option | Description | Pros | Cons |
|---|---|---|---|
| **A. Client-only** | Call `roles/filter` with `filter_created_by_me`, then one `green-checks/:id` call per card | No server work | N+1 requests (a user with 20 results → 21 calls on load); for P25 `green-checks/:id` (v2) runs a stored procedure per result |
| **B. Additive flag on `roles/filter`** *(recommended)* | New query param `include_completeness=true`; the service folds the v2 validation for eligible Editing items (capped) and returns `{ complete, total, missing: string[] }` per result | One request; reuses the auth, phase, initiative and created-by-me filtering that already exists; additive contract | Touches a large shared service; bounded procedure calls per request (cap 60) |
| **C. New endpoint `results/my-work`** | Dedicated read model joining `result`, `result_status`, `validation`, filtered by user + initiative + phase | Clean, cacheable, isolated from the big filter service | Duplicates filter and role logic already in `roles/filter`; a new perimeter to test and document |

## 11. Recommended Approach

**Option B.** It is the smallest change that removes the N+1 without creating a second results-listing contract. The flag is opt-in, so the Results tab, the results-list drawer and the bilateral consumers are unaffected. If the join proves too heavy inside `roles/filter`, `/akili-specify` may fall back to Option C with the same payload shape, so the client does not change.

Client-side, the board is a pure view over the same `ProgrammeResultRow` shape the Results tab already maps (`programme-results.service.ts`), extended with `completeness`. Grouping, ordering and badge counts live in a small view-model service so they are unit-testable without the DOM.

## 12. Risks, Dependencies, And Open Questions

### Risks

| Risk | Mitigation |
|---|---|
| Users expect drag-and-drop from a board | Cards use a button affordance, not a grab cursor; explainer panel copy states the board is read-only; no DnD library added |
| Persisted `validation` row is stale or missing for old results | Server returns `completeness: null` when no row exists; card shows "Open to check" instead of a wrong number; opening the result recomputes (`green-checks/:id`) as today |
| Status vocabulary mismatch (`Quality Assessed` in DB vs `QAed`/`Approved` in different client screens) | One label map in the view-model, reusing `STATUS_META`; see OQ-2 |
| Board width on a 1280px laptop with five columns | *Closed* group collapsed by default; horizontal scroll inside the viewport-locked shell, never the body |
| `roles/filter` regression | Flag is opt-in; existing spec suites for the service stay green; a contract test pins the default payload |

### Open Questions (to close in `/akili-specify`)

| ID | Question | Current recommendation |
|---|---|---|
| **OQ-1** | What does *mine* mean? `created_by` only, `created_by` OR `last_updated_by`, or a toggle to see the whole SP? | v1: `filter_created_by_me` (exists today) plus an "All program results" toggle; add `last_updated_by` only if the server exposes it (the list payload has no `*updated*` field as of 2026-08-21) |
| **OQ-2** | Which five statuses and labels? DB has Editing(1), Quality Assessed(2), Submitted(3), Discontinued(4), Pending Review(5) and an `Approved` row added for the bilateral API. Is `Approved` the display name of status 2, or a separate state that W3 rows use? | Show one *Approved / QAed* column keyed on status 2, and map the bilateral `Approved` row into it if it is distinct; confirm with the bilateral contract doc |
| **OQ-3** | Do W3/bilateral rows and IPSR packages get completeness? | v1: completeness only for W1/W2 result types covered by `results-validation-module`; other cards show status but no bar |
| **OQ-4** | SP-scoped or cross-program? | v1 SP-scoped as a tab; design the view-model so the SP filter is one input, enabling a later global page without rewriting |
| **OQ-5** | Should the *Closed* group and column order be remembered per user? | No persistence in v1 (volatile), matching the explainer-panel decision |
| **OQ-6** | Should the tab badge count *Editing* only, or also *Pending Review* items that came back with QA comments? | Editing only; results returned by QA already land in Editing under `W1` |
| **OQ-7** | Deep link into the first incomplete section: which panel-menu ids map to `section_name` values from `validation`? | Resolve the mapping in specify; fall back to General Information when unknown |

## 13. Success Criteria

- A submitter with results in the SP reaches any of their *Editing* results in two clicks from the SP band (tab → card).
- The board loads with one results request for the SP + phase (no per-card completeness requests).
- Cards show completeness that matches the result's own panel-menu badges for the same result.
- The default `roles/filter` payload is byte-identical for existing callers (contract test).
- Client Jest + Cypress CT gates and server Jest gates stay green; `migration:check` unaffected (no migration).

## 14. Next Step

```text
/akili-specify changes/my-work-board
```

Standard depth (Change track): new client page + tab, one additive server flag, view-model tests, CT for layout, and a HITL check in the real browser at 1280px and 1440px.

## 15. Post-judgment note (2026-09-04)

Judgment Day round 1 (`./judgment.md`) corrected three premises of §7/§11: completeness comes from the v2 validation procedure (the `validation` table is unwritten since 2023), the status catalogue has eight rows (6 Approved, 7 Rejected, 8 Draft added for the bilateral API), and phase is a client-side label filter as on the Results tab. Option B survives with a capped, eligible-only fold; see `design.md` `MWB-DD-1`, `DD-1b`, `DD-11`.

# Requirements — "My work" board (4th Science Program tab)

**One line:** a submitter opens **My work** in the SP band and sees their own results for the selected phase grouped by status, each *Editing* card carrying its completeness, and reaches any of them in one click — without any status change happening from the board.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/my-work-board` · Prefix `MWB` |
| Type | **Change** · Depth **Standard** |
| Approval Mode | `pre-approved` (Juan Cadavid, 2026-09-04, "procede con todo en yolo mode") — routine gates auto-pass and are logged; escalations still stop |
| Date | 2026-09-04 · revised after Judgment Day round 1 (`./judgment.md`) |
| Status | `approved` (Phase 1: user Continue; post-judgment rewrite auto-approved, pre-approved mode) |
| Ticket(s) | none yet |
| Depends on | none · Parallel-safe: yes |
| Visual reference | `./mockup/` (Main, Card, Empty artboards) · canvas https://claude.ai/code/artifact/d7a35454-ca8c-4840-94a2-fd624c38d8a0 |

Cites: `docs/prd.md` persona *Result submitter*, `G1` (`M1.1`, `M1.3`), `US-S1`, `US-P1`, `AC-3`, `AC-5` · `docs/ux-ui/design.md` §5 navigation rules 1–2 (rule 2 waived for in-app section navigation, `design.md` `MWB-DD-10`), §7 status tokens, `DD-7` (phase awareness), `DD-12`, `OG-4` · `docs/trd/trd.md` `W1` (prose corrected by code, see §12), §4 results list (`GET get/all/roles/filter/:userId`), `results-validation-module` (v2 `calculateValidationSections`).

## 2. Context

The SP hub (`reporting-program-band`) has three sibling routes: **Overview** (`entity-details/:entityId/overview`), **Reporting** (`entity-details/:entityId`) and **Results** (`entity-details/:entityId/results`). All three are structure-oriented. A submitter who wants to know *which of my results are still mine to finish* must filter the Results table by Created by and Status, then open each row and its panel menu to learn what is incomplete.

Two building blocks exist: the results list endpoint accepts `filter_created_by_me`, `status_id`, `initiative` and `submitter_id`; and the result detail's green checks for P25 are computed per result by `results-validation-module` (v2, `validateResultById` → stored procedure `validate_sections_mapped_batch`, sections per portfolio and result type). This spec composes them into one task-oriented screen.

**Lifecycle as implemented** (`submissions.service.ts`): Editing (1) → *Submit* → Submitted (3) → QA → Quality Assessed (2) or back to Editing. The `W1` prose in `docs/trd/trd.md` states the two ids the other way round; the board follows the code.

**Status catalogue** (`result_status` migrations): 1 Editing · 2 Quality Assessed · 3 Submitted · 4 Discontinued · 5 Pending Review · 6 Approved · 7 Rejected · 8 Draft (5–8 added for the bilateral API).

## 3. In Scope / Out of Scope

### In scope

- A fourth SP tab **My work** at `entity-details/:entityId/my-work`, with a count badge.
- A read-only board: five visible columns in three groups (*Needs my action*, *Waiting on others*, *Closed*), the Closed group collapsed by default, plus an *Other* rail for unmapped statuses.
- Cards with code, category, origin, status name, created date, title, and — on *Mine* scope, *Editing* column — completeness (`n of m` + missing sections) and one entry action.
- A scope toggle **Mine / All program results** and the same phase selector as the Results tab.
- Loading, error, per-column empty and whole-board empty states.
- Server: an opt-in `include_completeness` flag on the existing results list endpoint, folding the v2 validation per eligible row, capped.

### Out of scope

- Drag-and-drop, or any status transition from the board (`W1` stays inside the result and QA).
- A cross-program / global My work page (view-model keeps rows as its only input so it can come later).
- Assignees, reminders, notifications, per-user persistence, a sort control.
- Completeness in *All program results* scope, for IPSR innovation packages, and for non-Editing columns.
- Any change to the Results tab table, its filters or CSV export.

## 4. Personas Affected

| Persona | What changes |
|---|---|
| Result submitter | One screen answers "what is mine and what is missing"; reaches an Editing result in one click. |
| PMU / programme lead | Same board with **All program results** to see the programme's open work by status (no completeness bars). |
| QA reviewer | No change (QA queue untouched). |
| Platform admin · Bilateral consumer | No change; default list payload is unchanged. |

## 5. User Stories

- **`MWB-US-1`** As a result submitter, I want to see my results for this programme and phase grouped by status, so that I know what is still mine to finish. (Refines `US-S1`, `G1`.)
- **`MWB-US-2`** As a result submitter, I want each Editing card to tell me which sections are missing, so that I open the right result first. (Refines `G1/M1.3`.)
- **`MWB-US-3`** As a programme lead, I want to switch the board to all programme results, so that I see the programme's open work without leaving the SP hub. (Refines `US-P1`.)

## 6. Functional Requirements

### Required (MUST)

- **`MWB-R-1` Fourth tab and route.** The SP band MUST show a fourth tab **My results** (renamed from *My work* on 2026-09-05 by user decision; URL segment stays `my-work`) after Results, routed to `entity-details/:entityId/my-work`, with the same tab anatomy as the existing three (icon + label, 2px brand underline when active, `queryParamsHandling: 'preserve'`). The tab MUST carry a count badge equal to the number of cards in the *Editing* column under the **Mine** scope for the selected phase; on the other three tabs the badge MUST show the same number for that programme and phase (computed by one scoped list request, cached per programme + phase). The tab MUST honour the `phase` query param exactly like Results (`DD-7`).

#### Scenario: Open the tab with phase context

- GIVEN the user is on `entity-details/SP01/results?phase=Reporting%202026`
- WHEN they click **My work**
- THEN the URL is `entity-details/SP01/my-work?phase=Reporting%202026` and the board shows SP01 rows whose phase label is *Reporting 2026*
- AND the band stays mounted with **My work** underlined
- BUT it must NOT drop or rewrite `phase`
- AND IT MUST show the badge only when the Editing count is greater than zero

- **`MWB-R-2` Status columns and groups.** Rows MUST be placed by `status_id` through this table, columns rendered in this fixed order (groups: *Needs my action* · *Waiting on others* · *Done* · *Closed*):

| Column (label) | `status_id` | Group |
|---|---|---|
| **Editing** | 1 Editing · 8 Draft | Needs my action |
| **Pending review** | 5 Pending Review | Waiting on others |
| **Submitted** | 3 Submitted | Waiting on others |
| **Quality assessed** (expanded; renamed from *Approved* and moved out of Closed on 2026-09-05, user request — `MWB-T-10`) | 2 Quality Assessed · 6 Approved | Done |
| **Discontinued** (rail, collapsible both ways) | 4 Discontinued · 7 Rejected | Closed |
| **Other** (rail, rendered only when non-empty) | any other id | Closed |

Each card MUST show the payload's `status_name` as its status chip so Draft, Approved and Rejected stay distinguishable inside a merged column. Each column header MUST show its status dot, label and card count. The *Closed* group MUST render collapsed (narrow rails with count) by default and expand on click for the current visit only.

#### Scenario: Collapsed closed group

- GIVEN a user with 3 Editing, 1 Pending review, 2 Submitted, 4 Quality Assessed and 1 Discontinued results in the phase
- WHEN the board renders
- THEN Editing, Pending review, Submitted and Quality assessed show their cards, and Discontinued shows as a rail with count 1; no *Other* rail
- AND clicking a rail expands that column with its cards, and the expanded column offers a collapse control that returns it to a rail (`MWB-T-10`)
- BUT it must NOT persist the expanded state across a reload or navigation (volatile, same rule as the tab explainer panels)
- AND IT MUST keep the five columns in place regardless of counts (an empty column still renders, with its empty state)
- AND IT MUST give every expanded non-Editing column the same width (never twice another's), keeping each at least 260px wide and scrolling the board horizontally when they do not fit (`MWB-T-10`)

#### Scenario: Merged and unmapped statuses

- GIVEN rows with `status_id` 8 (Draft), 7 (Rejected) and 42 (unknown)
- WHEN the board renders
- THEN the Draft row sits in Editing with chip *Draft*, the Rejected row in Discontinued with chip *Rejected*, and the unknown row in the *Other* rail
- AND IT MUST count all three in the scope total so the total equals the number of rows loaded

- **`MWB-R-3` Scope and phase.** The board MUST default to scope **Mine** = rows whose `created_by` is the current user (server flag `filter_created_by_me`). A second segment **All program results** MUST show every result of the SP with the same columns. Phase MUST be a client-side filter on the loaded rows' phase label, with the same query param, option list and default rule family as the Results tab (current reporting phase when present in the rows, else the newest phase). Each segment MUST show its total count for the selected phase. The tab badge MUST always reflect the **Mine** scope, whichever segment is active.

#### Scenario: Switch scope

- GIVEN scope Mine shows 11 rows in *Reporting 2026* and the programme has 124
- WHEN the user selects **All program results**
- THEN the columns re-group over the 124 rows and the segment counts read Mine 11 / All 124
- BUT it must NOT change the tab badge (still the Mine Editing count)
- AND IT MUST make exactly one list request per scope change and none per card

#### Scenario: Switch phase

- GIVEN rows loaded for all phases and the phase select showing *Reporting 2026*
- WHEN the user selects *Reporting 2025*
- THEN the board re-groups the already loaded rows without a new request and the URL `phase` param updates (`replaceUrl`, merge)
- AND IT MUST default to the current reporting phase when the URL has no `phase`

- **`MWB-R-4` Card content and completeness.** Every card MUST show: result code, category (`result_type`) chip, origin (`W1/W2` | `W3/Bilateral`), status chip (`status_name`), title, created date. In the **Mine** scope, cards in **Editing** MUST additionally show completeness as `n of m sections`, a progress bar, and the missing section labels in the order the server returns them. When `completeness` is `null` (All scope, capped rows, IPSR packages, validation failure) the card MUST show the literal *Open to check completeness* and no bar. When `n === m` the card MUST show the *ready to submit* variant (check icon, green bar, secondary button **Review and submit**).

#### Scenario: Editing card with missing sections (P25)

- GIVEN result 4712 (P25 knowledge product) whose v2 validation returns general-information ✓, geographic-location ✗, evidences ✓, contributor-partners ✗, knowledge-product-info ✗
- WHEN its card renders in Editing under Mine
- THEN it shows `2 of 5 sections`, a 40% bar, and `Missing: Geographic location · Contributing partners · Knowledge product`
- BUT it must NOT compute completeness client-side from any per-result `green-checks/:id` call
- AND IT MUST render `Open to check completeness` when `completeness` is `null`

#### Scenario: Waiting and closed cards

- GIVEN a Submitted result
- WHEN its card renders
- THEN it shows the common fields and a created-date line, a plain **Open** link, and no completeness bar
- BUT it must NOT show a primary (gradient) button outside the Editing column

- **`MWB-R-5` Ordering.** Inside **Editing** cards MUST be ordered by completeness ratio ascending (`null` first, then lowest `n/m`), ties by created date descending. Every other column MUST order by created date descending.

#### Scenario: Least complete first

- GIVEN Editing cards with completeness null, 2/5, 4/5 and 5/5
- WHEN the column renders
- THEN the order is null, 2/5, 4/5, 5/5
- AND IT MUST break ties by the newest created date first

- **`MWB-R-6` Entry action, read-only board.** The primary action of an Editing card (**Continue**) MUST navigate to `/result/result-detail/:code/<section>` where `<section>` is the first missing `section_name` mapped to a result-detail child route; when the mapping is unknown or completeness is `null` it MUST land on `general-information`. **Open** on other cards MUST land on `general-information`. The navigation MUST carry `?phase=<versionId>` like the Results tab link. The board MUST NOT offer drag-and-drop, a status menu, or any control that changes `status_id`.

#### Scenario: Continue lands on the first gap

- GIVEN card `'4712'` with first missing section `geographic-location` and `versionId` 36
- WHEN the user clicks **Continue**
- THEN the app navigates to `/result/result-detail/4712/geographic-location?phase=36`
- BUT it must NOT expose a draggable handle, `draggable="true"`, or any drop target on cards or columns
- AND IT MUST keep the whole card keyboard reachable (the action is a real `<button>` / `<a>` with a visible focus ring)

- **`MWB-R-7` UI states.** The board MUST render: a board-shaped skeleton while loading (filter row visible; group labels, five column shells with header and card placeholders (four expanded + one rail after `MWB-T-10`) — `MWB-T-8`, user request 2026-09-05); an error panel with a **Retry** action when the list request fails; a per-column empty message when a column has no cards; a whole-board empty state (*Nothing on your board yet* + **Go to Reporting** + *See all program results*) when the active scope + phase has zero rows.

#### Scenario: Whole-board empty

- GIVEN the user has no results in SP01 for the phase and scope Mine
- WHEN the board loads
- THEN the whole-board empty state replaces the columns and **Go to Reporting** links to `entity-details/SP01` preserving `phase`
- BUT it must NOT show the empty state while the request is still in flight
- AND IT MUST treat the endpoint's HTTP 404 *Results Not Found* (thrown when the list is empty) as an empty list, not as an error
- AND IT MUST show the columns (with per-column empties) as soon as **All program results** returns at least one row in the phase

- **`MWB-R-8` Server: opt-in completeness on the list.** `GET get/all/roles/filter/:userId` MUST accept `include_completeness=true`. When set, every item MUST carry `completeness: { complete: number, total: number, missing: string[] } | null`, computed for **eligible** items only — `status_id` 1 or 8, result types handled by `results-validation-module` (not IPSR packages) — by the same v2 rule the result detail uses (`validateResultById`, `Number(validation) === 1`), for at most `MWB_COMPLETENESS_CAP = 60` eligible items per request (newest created first), with bounded concurrency. Every other item, every item past the cap, and any item whose validation call fails MUST carry `completeness: null` (the request MUST NOT fail because one procedure call failed). When the flag is absent or false the response MUST be byte-identical to today.

#### Scenario: Flag absent keeps the contract

- GIVEN any existing caller of the endpoint (Results tab, results-list drawer, bilateral)
- WHEN it calls without `include_completeness`
- THEN the payload has no `completeness` key and every existing key is unchanged
- BUT it must NOT call the validation repository on the default path
- AND IT MUST return `completeness: null` for a Submitted item and for the 61st eligible item when the flag is set

- **`MWB-R-9` Viewport and overflow.** The page MUST follow the viewport-locked shell contract from `sp-shell-app-viewport`: the board fills the app viewport below the band, each column scrolls vertically inside itself, the board scrolls horizontally inside its own container at widths under its natural width, and the document body MUST never scroll horizontally.

#### Scenario: 1280px laptop

- GIVEN a 1280×720 viewport and 12 Editing cards
- WHEN the board renders
- THEN the Editing column shows a vertical scrollbar inside the column and the last card is reachable by scrolling it
- BUT it must NOT let `document.documentElement.scrollWidth` exceed the viewport width
- AND IT MUST keep the band and the board toolbar visible while a column scrolls

### Should (SHOULD)

- **`MWB-R-10` Explainer panel.** ~~The tab SHOULD reuse `<app-pr-tab-intro>` …~~ **Withdrawn 2026-09-05 by the user ("quita esto de aquí") after seeing it on the real page; the row under the tabs is the filter row (`MWB-T-8`).**
- **`MWB-R-11` Editing header hint.** The Editing column header SHOULD show `<k> ready to submit` when `k > 0` cards are at `n === m`.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | Board load = **one** list request per scope change (phase switches re-group in memory); zero per-card requests. Server: completeness computed for ≤ 60 eligible items per request, concurrency ≤ 5, so the added cost is bounded by 60 procedure calls; the default path executes zero extra queries. Measured in `MWB-T-6` when the local server is available (3 runs; a spread wider than the effect is inconclusive and is reported as such); otherwise recorded as an accepted risk with the cap as mitigation. |
| **Backwards compatibility** | Default `roles/filter` payload byte-identical (contract test). Additive query param only. No migration. |
| **Security** | Same JWT + role gate as the Results tab (`AC-3`). `filter_created_by_me` uses the authenticated user id, never a client-supplied id. |
| **Phase correctness** | Phase is filtered client-side on the rows' phase label exactly as the Results tab does (`AC-5` applies to the underlying list). |
| **Accessibility** | Columns are `role="region"` with an accessible name; card actions are native controls with visible focus; badge has `aria-label="N results in editing"`; status conveyed by text, not colour alone (WCAG 2.1 AA, `design.md` §10). |
| **Styling** | Tailwind-first (`DD-12`), tokens from `colors.scss`, `STATUS_META` colour vocabulary, `material-icons-round`, no new `.pr-*` SCSS blocks. |
| **Copy** | English literal strings in the template, matching the sibling tabs. |
| **Observability** | Server logs one warning per failed validation call (result id only). No result payload or token echoed to console (`.cursorrules`). |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `MWB-AC-1` | SP01, `?phase=Reporting%202026`, Results tab open | Click **My work** | Route `entity-details/SP01/my-work?phase=Reporting%202026`, band stays, tab underlined, badge = Mine Editing count for that phase. |
| `MWB-AC-2` | 11 Mine rows across statuses 1, 5, 3, 2, 4 | Board renders | Five columns in fixed order; Closed rails collapsed with counts; expand is volatile; Draft/Rejected/unknown rows land per the `MWB-R-2` table with their real status chip. |
| `MWB-AC-3` | Scope Mine 11 / All 124 | Select **All program results** | One request; columns re-group over 124; badge unchanged; switching phase afterwards issues no request. |
| `MWB-AC-4` | Editing P25 result with 2 of 5 sections | Card renders (Mine) | `2 of 5 sections`, 40% bar, missing labels in server order; `null` → *Open to check completeness*; 5/5 → ready variant. |
| `MWB-AC-5` | Editing cards null, 2/5, 4/5, 5/5 | Column renders | Order null, 2/5, 4/5, 5/5; ties newest first; other columns newest first. |
| `MWB-AC-6` | Card `'4712'` first missing `geographic-location`, versionId 36 | Click **Continue** | Navigates to `/result/result-detail/4712/geographic-location?phase=36`; no draggable attributes anywhere on the board. |
| `MWB-AC-7` | Request pending / failed / 404 / empty | Board renders | Skeleton / error + Retry / empty (404) / whole-board empty with **Go to Reporting** preserving phase. |
| `MWB-AC-8` | Any existing caller without the flag | `GET …/roles/filter/:userId` | Payload byte-identical to the pre-change fixture; with flag, `completeness` object for eligible items, `null` for the rest, cap 60, one failed procedure call does not fail the request. |
| `MWB-AC-9` | 1280×720, 12 Editing cards | Board renders | Column scrolls internally; `documentElement.scrollWidth <= innerWidth`; band + toolbar remain visible. |

Cross-cutting project ACs that apply without restating: `AC-3`, `AC-5`, `AC-9`.

## 9. Defect Classes and Gates

| Defect class this spec can produce | Gate that catches it | Blind spot / substitute |
|---|---|---|
| Wrong grouping, status→column mapping, ordering, counts, badge | Client Jest on the view-model with fixtures incl. ids 6/7/8/unknown (`MWB-AC-2`, `-3`, `-5`) | — |
| Wrong completeness fold / eligibility / cap / null handling | Server Jest with mocked `validateResultById` (`MWB-AC-8`); client Jest on the mapper (`MWB-AC-4`) | Whether the stored procedure itself is right is the result detail's existing gate, not this spec's |
| Default payload regression on `roles/filter` | Server Jest contract test: default call vs fixture captured from the pre-change code path, key-for-key (`MWB-AC-8`) | A fixture regenerated after the change proves nothing |
| Deep-link target wrong (P22 vs P25 names) | Client Jest on the section-route map (`MWB-AC-6`) | Whether the result detail opens that section is only proven by the HITL click-through |
| Empty list rendered as error (404) | Client Jest on the service (`MWB-AC-7`) | — |
| Layout clipping, body horizontal overflow, column not scrolling | Cypress CT at 1280 and 1440 measuring `scrollWidth` / `scrollHeight` (`MWB-AC-9`) | jsdom cannot measure layout — Jest is not a gate here |
| Visual drift from the mockup (tokens, hierarchy, chip sizes) | **No automated gate.** HITL visual check in the real browser at `MWB-T-6`, comparing against `mockup/Main.dc.html` (T6 review) | Accepted: pixel fidelity is judged by a person, not a command |
| Drag-and-drop accidentally introduced | Cypress CT asserts no `[draggable]`; Reviewer diff check for DnD libraries | — |
| A11y structure (regions, names, focus) | Structural check in Cypress CT (named regions, named buttons, rails `aria-expanded`) — **`axe` did not run: `cypress-axe` is not installed and this spec may not touch `package.json` (TEST_GAP, `MWB-T-5`)** | ARIA validity, duplicate ids, focus order and contrast uncovered by an automated gate; contrast tokens AA-checked at source; accepted risk, follow-up = install `cypress-axe` in an infra change |
| Added server latency | `MWB-T-6` timing when the local server runs; else accepted risk bounded by the cap | Stated in §7 |

## 10. Dependencies & Assumptions

### Upstream

- `results` module: `GET get/all/roles/filter/:userId` (`results.service.ts` filter path; `filter_created_by_me`; 404 on empty).
- `results-validation-module`: `validateResultById` (v2, P22/P25 sections, `NewValidationsDto { section_name, validation }`).
- `reporting-program-band`, `routing-data.ts` (SP routes), `sp-shell-app-viewport` contract, `STATUS_META`, `<app-pr-tab-intro>`.
- Archived specs: `programme-results-created-by-filter` (row mapping), `sp-tab-explainer-panels`, `reporting-entry-hub`, `sp-shell-app-viewport`.

### Downstream

- None. No consumer reads the new flag unless it asks for it.

### Assumptions (locked; overruled only by the user)

| Proposal OQ | Decision |
|---|---|
| OQ-1 *mine* | `created_by` = current user via `filter_created_by_me`; **All program results** toggle; no `last_updated_by` (not in payload). |
| OQ-2 vocabulary | The `MWB-R-2` table (1+8, 5, 3, 2+6, 4+7, Other). Card chip shows the real `status_name`. |
| OQ-3 completeness | Mine scope, Editing column only, v2 validation, cap 60; everything else `null`. |
| OQ-4 scope | SP-level tab; view-model takes rows only. |
| OQ-5 persistence | None (volatile). |
| OQ-6 badge | Editing column count (ids 1 + 8), Mine scope, selected phase. |
| OQ-7 section mapping | Static map covering P22 and P25 `section_name` values → result-detail child routes; fallback `general-information` (`design.md` §5). |

## 11. Open Questions

None blocking. `MWB-OQ-1` (Approved rail colour) → resolved by `MWB-DD-7` (green approved tokens).

## 12. Out-of-Band Notes

- `docs/trd/trd.md` `W1` prose inverts ids 2 and 3 relative to `submissions.service.ts`; correction recorded as a pending archive sync (shared-file discipline).
- `docs/ux-ui/design.md` §5 rule 2 needs a clarification that it governs external deep links; in-app section navigation (panel menu, this board) is exempt — pending archive sync (`MWB-DD-10`).
- The Results tab maps HTTP 404 to its error state; this spec does not change that (out of scope), it only handles 404 for the board.

## Required cross-references

`docs/prd.md` (`G1`, `US-S1`, `US-P1`, `AC-3`, `AC-5`) · `docs/ux-ui/design.md` (§5, §7, `DD-7`, `DD-12`, `OG-4`) · `docs/trd/trd.md` (`W1`, §4) · `./design.md` · `./tasks.md` · `./proposal.md` · `./judgment.md`.

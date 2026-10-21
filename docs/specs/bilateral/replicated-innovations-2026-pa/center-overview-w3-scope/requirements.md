# Requirements — Center Overview counts W3/bilateral reporting only

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/replicated-innovations-2026-pa/center-overview-w3-scope/` |
| Parent Spec | `docs/specs/bilateral/replicated-innovations-2026-pa/` (`family.md`, child #3) |
| Module / sub-feature | `bilateral` · center Overview tab + Results tab scope |
| Type | Change |
| Depth | **Standard** (server query + 2 client pages + the shared query-param contract) |
| Approval Mode | `gated` |
| Owner | Santiago Sanchez |
| Status | approved 2026-10-21 (owner) |
| Date | 2026-10-21 |
| Ticket | Freshdesk **INC-165171** |
| Source | `proposal.md` (approved 2026-10-21). Nicoleta Trifa's red comments of 21-Oct and 15-Oct-2026. Prod check of 2026-10-21 (CIP, Reporting 2026) |
| Requirement prefix | `CWS` |
| Branch | from `staging` |

## 2. Executive Summary

The center Overview (`/bilateral/:acronym/overview`) SHALL count only three groups:

| Group | `overview_category` | CIP, Reporting 2026 (2026-10-21) |
|---|---|---|
| Replicated W3/bilateral innovations of the center | `replicated_w3` | 63 (54 on a CIP project, 5 with no project, 4 on another center's project) |
| New W3/bilateral results of the phase | `new_w3` | 0 |
| W1/W2 results that tag a bilateral project of the center | `w1w2_tagging` | 0 |
| ~~Replicated W1/W2 innovations with the center~~ | `replicated_w1w2` | 200, **removed** |
| ~~W1/W2 results with the center, no center project~~ | `w1w2_center_only` | 6, **removed** |

The server returns that row set on request, and every Overview card reads it. Every deep link carries a scope, so the Results tab opens on the same rows. Without the scope, the Results tab and the Portfolio Centers block behave exactly as today.

Expected CIP: Total **269 → 63**, Projects covered **5 → 0 of 57**.

## 3. Glossary

| Term | Meaning |
|---|---|
| Overview scope | The rows the Overview counts: `replicated_w3` ∪ `new_w3` ∪ `w1w2_tagging` for one center and one phase |
| `overview_category` | Per-row bucket resolved in SQL since `1dd94a46c` (INC-165171, 19-Oct). The five values and their precedence are in `proposal.md` §3 |
| Center project | A CLARISA bilateral project owned by the center: `organization_code` = the center's institution, or `organization_code` NULL plus the center's W3 alias (`BilateralProjectsService.getProjectsByCenter`) |
| Replicated | `result.is_replicated = 1`: a 2025 result copied into 2026 by the bulk replication |
| New | A result of the phase that is not replicated |
| Unscoped | A request or Results-tab view without the scope. Its behavior is the current one |
| Reconciliation | An Overview figure equals the visible row count of the tab its link opens (`COV-R-13`) |

## 4. System Context & Scope

| | |
|---|---|
| PRD | `docs/prd.md` §Scope "Bilateral result reporting" (first-party `pages/bilateral` UI), G3 / M3.1 (no breaking change to existing consumers) |
| UX | `docs/ux-ui/design.md`: bilateral center shell, Overview tab (archived spec `2026-09-14-bilateral--center-overview-tab`) |
| TRD | `docs/trd/trd.md`: `api/results` module, `GET /api/results/bilateral-center-results` |
| Extends | archive `2026-09-14-bilateral--center-overview-tab` (`COV-R-6`, `-7`, `-8`, `-9`, `-13`, `-16`); commit `1dd94a46c` |

### In scope

- An opt-in scope on `bilateral-center-results` that keeps the three categories, filtered in SQL.
- Every Overview card reads the scoped rows.
- The Total card breakdown has 3 lines. Projects covered counts only new rows.
- A `scope` key in the shared query-param contract, read by the Results tab, and shown as a chip the user can remove.
- Overview deep links carry the scope.

### Out of scope

- Results tab unscoped default (W3 + Lead), Portfolio Overview Centers block, Bilateral Home project cards, Reporting tab, Draft Results tab.
- Any data change to replicated rows. The unused `bilateral-center-overview-totals` endpoint.
- Child #2's "Updated 2025 innovations with no 2026 project" label (it rebases on this spec).
- Strict project ownership for `replicated_w3` (`CWS-OQ-1`; the default is "center on the result").

## 5. Stakeholders / Personas

| Persona | What changes for them |
|---|---|
| Center user / Center lead (Result submitter) | The Overview shows only their bilateral reporting. Their W1/W2 contributions are still listed on the Results tab (unscoped) |
| CGIAR SO (Nicoleta) | The Overview figures match her definition, and Projects covered tracks only new reporting |
| PMU lead | No change (Portfolio Overview untouched) |

User story — **`CWS-US-1`**: As a Center user, I want the Overview to count only my center's W3/bilateral reporting, so that its figures measure bilateral progress and are not inflated by pooled results. Refines the Center-reporting flow of `COV-US-*` (archive).

## 6. Functional Requirements

### `CWS-R-1` — Scoped row set on the server (MUST)

`bilateral-center-results` SHALL accept an opt-in scope. With the scope, the response SHALL contain only rows whose `overview_category` is `replicated_w3`, `new_w3` or `w1w2_tagging`, filtered by the query itself.

- **Scenario A — CIP scoped**
  - GIVEN CIP (`CENTER-06`) in Reporting 2026 with the 2026-10-21 data
  - WHEN the scoped request is made
  - THEN it returns 63 `replicated_w3` rows, plus the `new_w3` and `w1w2_tagging` rows that exist at the time
  - AND every row keeps the fields it carries today (`overview_category`, `project_id`, `project_name`, `is_leading_result`, …)
  - BUT it must NOT return any `replicated_w1w2` or `w1w2_center_only` row.
- **Scenario B — tagging rows included**
  - GIVEN a W1/W2 result that tags a project of the center and does not have the center in `results_center`
  - WHEN the scoped request is made
  - THEN the result is returned as `w1w2_tagging`. The scope includes the tagging rows without a separate flag.
- **Scenario C — unscoped request unchanged**
  - GIVEN a request without the scope, with or without `includeProjectTagging`
  - WHEN it runs
  - THEN it returns exactly the rows and fields it returns today
  - AND IT MUST stay that way for the Results tab and the Portfolio Centers block, which do not send the scope (G3 / M3.1).
- **Rules**
  - AND IT MUST keep `replicated_w3` = "replicated, W3, center on the result", regardless of which project it is on (`CWS-OQ-1` default).
  - AND IT MUST keep the current category precedence (replicated first). The prod check showed 0 replicated W1/W2 rows on a CIP project. `CWS-T-1` re-checks this for all centers before any code (`CWS-OQ-2`).
  - BUT an unknown scope value must NOT widen or narrow the response. It is treated as no scope.

### `CWS-R-2` — Every Overview card reads the scoped rows (MUST)

The Overview SHALL build every figure from the scoped row set, after the page filters. That covers the Total card and its breakdown, the four status tiles and the meter, Needs attention, Results by project, Projects covered, Science Program contribution, Results by result type and Reporting pace.

- GIVEN CIP in Reporting 2026
- WHEN the Overview loads
- THEN no card counts a `replicated_w1w2` or `w1w2_center_only` row
- AND the Overview receives those rows from no request (the server does not send them)
- BUT the AI-drafts figures must NOT change (they do not come from these rows).

### `CWS-R-3` — Total results card (MUST)

The Total card SHALL show the scoped row count and a breakdown of exactly three lines, in this order: replicated W3/bilateral, new W3/bilateral, W1/W2 tagging a Center project. The three lines SHALL add up to the headline.

- GIVEN CIP with 63 / 0 / 0
- WHEN the card renders
- THEN the headline reads 63, and the lines read 63, 0 and 0, using the same zero-value rendering the card uses today
- AND its accessible label lists the same three lines and no others
- BUT it must NOT show a line, label or aria text for the two removed groups.

### `CWS-R-4` — Status tiles, Needs attention and the Total identity (MUST)

The status tiles and Needs attention SHALL count the scoped rows. Each tile's `replicated · new` split SHALL count `replicated_w3` as replicated and `new_w3` + `w1w2_tagging` as new.

- GIVEN any center and phase, with any filters
- WHEN the Overview renders
- THEN Total = Editing + Pending review + Approved + Rejected + QA/Submitted (2 + 3) + Discontinued (4). The last two are counted, not tiled (`COV-R-7`, P2-3863)
- AND on each tile, replicated + new = the tile count
- AND Needs attention rows (Editing, Rejected, Pending > 14 days) equal the matching tile figures.

### `CWS-R-5` — Projects covered (MUST)

"X of N" SHALL count as X the projects of the center that have at least one **new** scoped row (`new_w3` or `w1w2_tagging`). Replicated rows SHALL NOT make a project covered. N remains the center's project count for the phase.

- **Scenario A — CIP**
  - GIVEN CIP with 5 projects that have only replicated rows and no new rows
  - WHEN the card renders
  - THEN it reads "0 of 57"
  - AND an informative line states how many projects have only replicated updates (5) and makes clear that they are not counted in X (`CWS-OQ-3` default: keep).
- **Scenario B — consistency with Results by project**
  - GIVEN the same rows
  - WHEN Results by project renders its "Not started yet" strip (retitled "No new results yet", `CWS-DD-7`)
  - THEN the strip lists N − X projects, i.e. the projects with no new result, including the replicated-only ones
  - AND IT MUST use the same calculation as Projects covered, so the strip and the card always agree.

### `CWS-R-6` — Results by project (MUST)

The project bars SHALL keep the stacked replicated vs new display, using scoped rows only. The no-project line under the chart SHALL list only W3 rows: `replicated_w3` and `new_w3` with no project.

- GIVEN CIP (5 replicated W3 rows with no project, 4 on another center's project)
- WHEN the card renders
- THEN the no-project line reads 5, with at most two category entries
- AND the "on other centers' projects" line reads 4
- AND the bars, no-project line and other-centers line add up to the Total
- BUT the no-project line must NOT offer the `source=w1w2` link branch of `COV-R-9` Scenario C. That branch can no longer apply. Its link is described in `CWS-R-8`.

### `CWS-R-7` — `scope` key in the query-param contract (MUST)

The shared contract (`COV-R-13`) SHALL get a `scope` key whose only value means the Overview scope. A missing or unknown value means unscoped.

- **Scenario A — Results tab, scoped**
  - GIVEN the Results tab is opened with `scope` set
  - WHEN it loads
  - THEN it fetches the scoped row set for each selected phase
  - AND it shows a chip for the scope that the user can remove
  - AND removing the chip drops the key from the URL and reloads the unscoped rows.
- **Scenario B — Results tab, unscoped**
  - GIVEN the Results tab without `scope` (tab click, bookmark, any other deep link)
  - WHEN it loads
  - THEN it behaves exactly as today, including its W3 + Lead default
  - BUT it must NOT keep the scope after the user removes it, or after navigating away and back without it.
- **Rules**
  - AND IT MUST parse and serialize `scope` in the same module as the other contract keys. The Overview and the Results tab share one definition.
  - BUT the scope must NOT be applied by hiding rows on the client. Both tabs SHALL receive the same rows from the server (`COV-R-13`: "the same filter function to the same rows").

### `CWS-R-8` — Overview deep links reconcile (MUST)

Every Overview link into the Results tab SHALL carry `scope`, next to `phase` and the explicit defaults (`COV-DD-3`).

- GIVEN any Overview figure that links to Results (Total card, a status tile or meter segment, a Needs attention row, a project bar)
- WHEN the user follows it
- THEN the Results tab's visible row count equals the figure
- AND IT MUST hold on a center that has `w1w2_tagging` rows. On such a center, the tagging rows do not reconcile today (known `INC-165171` gap); this requirement closes it
- AND the no-project line also carries `scope` (and `source=w3`). It is **not** a reconciling figure: the Results tab has no "no project" filter, so its link opens all scoped W3 rows, as it does today. The exact link for that line belongs to child #2 (`CNP-R-2`)
- BUT links to the Reporting and Draft Results tabs must NOT carry `scope`. Those tabs do not read it and stay unchanged.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Backwards compatibility | Additive query param. Unscoped responses identical (`CWS-R-1` C). No change to `/api/bilateral/*` payloads, so `bilateral-result-summaries.en.md` is not touched |
| Performance | The scoped CIP response is ≤ the current Overview response (≈63 vs 269 rows). No extra requests: the Overview still makes one results call per phase (`COV-R-21`) |
| Security | Same guard as today on the endpoint. No secrets in logs (`.cursorrules`) |
| Accessibility | Changed lines and the new chip keep WCAG 2.1 AA (`COV-R-18`). aria labels match the visible lines |
| i18n / copy | New and changed labels are English, in the same copy constants the Overview already uses |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `CWS-AC-1` | Scoped request, rows of all 5 categories | Repository query runs | Only the 3 kept categories are returned (`CWS-R-1` A, B) |
| `CWS-AC-2` | Unscoped request | Repository query runs | SQL and parameters identical to today's (`CWS-R-1` C) |
| `CWS-AC-3` | Scoped fixture 63 / 0 / 0 | Overview model built | Total 63, 3 lines, tiles + QA/Submitted + Discontinued = 63 (`CWS-R-3`, `-4`) |
| `CWS-AC-4` | 5 projects with only replicated rows, N = 57 | Model built | Projects covered 0 of 57, 5 only-replicated, Not started = 57 (`CWS-R-5`) |
| `CWS-AC-5` | No-project and other-centers rows | Model built | No-project line W3-only; bars + no-project + other-centers = Total (`CWS-R-6`) |
| `CWS-AC-6` | `?scope=…` / no scope / unknown value | Params parsed and serialized | Round-trips. Unknown value means unscoped (`CWS-R-7`) |
| `CWS-AC-7` | Results tab with / without scope, chip removed | Tab loads | Scoped vs unscoped request; chip removal reloads unscoped (`CWS-R-7` A, B) |
| `CWS-AC-8` | Any Overview link to Results | Link built | Carries `scope` + `phase` + explicit defaults; Reporting / Draft links do not (`CWS-R-8`) |
| `CWS-AC-9` | PRTest, CIP + one center with tagging rows | A human follows each linked figure | Results visible count = figure (`CWS-R-8`, HITL) |

Project ACs that apply: `AC-4` (no break for existing consumers), `AC-5` (phase correctness).

## 9. Defect Classes and Gates

| Defect class this spec can produce | Gate that catches it |
|---|---|
| The SQL scope keeps or drops the wrong category | `result.repository.spec.ts`: asserts the scope condition and its parameters (`CWS-AC-1`). Prod-shaped numbers checked by one SQL query, run by the user (`CWS-T-1` baseline, `CWS-T-6` live check) |
| An unscoped consumer changes (Results tab, Centers block) | Repository spec asserts the unscoped SQL and parameters are unchanged (`CWS-AC-2`). Client specs of `centers-block` / `bilateral-results-list` via `--findRelatedTests` |
| A card still counts a removed group (a hard-coded 5-category list, a stale fixture) | Aggregate + component Jest with a 5-category fixture passed through the scoped path (`CWS-AC-3..5`) |
| Totals do not add up (Total ≠ tiles; X + Not started ≠ N) | Aggregate Jest identity assertions (`CWS-AC-3`, `-4`, `-5`) |
| A deep link misses `scope`, or the Results tab ignores it | Query-param + component Jest (`CWS-AC-6..8`) |
| **The figure and the destination count differ with real data** (row shape, string ids, phase) | **No automated check can catch it**: a fixture proves the logic, not the real rows (`KZ-EVM-1` in `bilateral-overview/CLAUDE.md`). Covered by `CWS-AC-9`, a human check on PRTest at the HITL pause |
| Visual: the Total card or chip looks broken | No automated check. Covered by a human check during `CWS-AC-9` (copy-only change, layout unchanged) |

## 10. Dependencies & Assumptions

- **Upstream:** `results_center`, `results_by_projects`, `clarisa_projects`, the W3 alias map (`W3_CENTER_ACRONYM_TO_CLARISA_CENTER_CODE`). No CLARISA call.
- **Downstream:** the Overview, the Results tab (scoped only), child #2 of this family.
- **A-1:** a deep link opens the Results tab for one phase. CRK's multi-phase version grouping (`CRK-R-1`) does not apply to a single-phase view.
- **A-2:** `1dd94a46c` is in `staging` (verified 2026-10-21).
- **A-3:** CRK (`changes/center-results-kpi-chips`) also edits `bilateral-results-list.component.ts`. This spec branches from `staging` once CRK is there, or rebases onto it.

## 11. Open Questions

| ID | Question | Default used by this spec | Blocks tasks? |
|---|---|---|---|
| `CWS-OQ-1` | "Belonging to Center projects": 63 (center on the result) or 54 (CIP project only)? | 63. The 5 + 4 are shown on their own lines (`CWS-R-6`) | No. Ask Nicoleta in the INC-165171 reply |
| `CWS-OQ-2` | Replicated W1/W2 tagging a center project | Keep precedence (CIP: 0 rows). Re-count for all centers before execution | No |
| `CWS-OQ-3` | Keep the "only replicated" line under Projects covered? | Keep, as informative | No. Copy confirmation with Nicoleta |
| `CWS-OQ-4` | Fold `includeProjectTagging` into the scope? | Design decides; the flag stays accepted | No |

## 12. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| `CWS-R-1` | Scoped row set on the server | MUST |
| `CWS-R-2` | Every Overview card reads the scoped rows | MUST |
| `CWS-R-3` | Total results card | MUST |
| `CWS-R-4` | Status tiles, Needs attention, Total identity | MUST |
| `CWS-R-5` | Projects covered | MUST |
| `CWS-R-6` | Results by project | MUST |
| `CWS-R-7` | `scope` key in the query-param contract | MUST |
| `CWS-R-8` | Overview deep links reconcile | MUST |
| `CWS-US-1` | User story | — |
| `CWS-AC-1..9` | Acceptance criteria | — |

Modified archived requirements: `COV-R-6` (Total sub-lines, Projects covered), `COV-R-7`, `COV-R-8` (row set), `COV-R-9` Scenario C (no-project link branch removed), `COV-R-13` (new key), `COV-R-16` (Overview row set).

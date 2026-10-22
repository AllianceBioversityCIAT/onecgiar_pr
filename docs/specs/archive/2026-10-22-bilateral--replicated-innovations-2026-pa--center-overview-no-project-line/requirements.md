# Requirements — "Updated 2025 innovations with no 2026 project" line in the Center Overview

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/replicated-innovations-2026-pa/center-overview-no-project-line/` |
| Parent Spec | `docs/specs/bilateral/replicated-innovations-2026-pa/` (`family.md`, child #2) |
| Module / sub-feature | `bilateral` · center Overview, "Results by bilateral project" card + Results tab deep link |
| Type | Change |
| Depth | **Standard** (client only: one aggregate bucket, one card line, one new key in the shared query-param contract) |
| Approval Mode | `gated` |
| Owner | Santiago Sanchez |
| Status | approved 2026-10-21 (owner) |
| Date | 2026-10-21 |
| Ticket | Freshdesk **INC-164073** (no Jira) |
| Source | `proposal.md` (2026-10-16, premise note 2026-10-21). Nicoleta Trifa, red comment of 15-Oct-2026. Rebased on child #3 `center-overview-w3-scope` (archived 2026-10-21) |
| Depends on | `center-overview-w3-scope` (#3) — **done** |
| Requirement prefix | `CNP` |

## 2. Executive Summary

The "Results by bilateral project" card of the center Overview SHALL show a line of its own, **"Updated 2025 innovations with no 2026 project"**, for the replicated W3 innovations (types 7 and 2) that have no bilateral project. The line is computed live from the same rows as every other card. Its link opens the Results tab on exactly those results, so the figure and the destination reconcile. The generic no-project line stops counting them.

**What changed vs the proposal (discovery during specify):**

| Proposal said | Spec says | Why |
|---|---|---|
| The line mixes W1/W2 + W3 | The generic line is already **W3-only** | Child #3 shipped `scope=bilateral` |
| "No 2026 project" = no **lead** project row | = the row has **no project at all** (`project_id` null) | The bars group by `project_id`, which is any active project (center-owned first, then lead). A lead-only rule would count a result on a bar **and** on this line (`CNP-OQ-3`) |
| Deep link option (a) `replicated` key, or (b) `project=[]` + `type` + `source` | **One new contract key**, `group`, applied by the shared filter with the same predicate the card uses | (b) cannot reconcile: `project=[]` means "no project filter", so it opens every W3 row (design `P-5` of child #3). (a) still lacks a "no project" filter |

## 3. Glossary

| Term | Meaning |
|---|---|
| Updated-no-project row | A row that is replicated (`is_replicated = 1`), W3 (`source = 'API'`), an innovation (`result_type_id` 7 or 2), and has no `project_id` |
| Updated-no-project line | The new line in the "Results by bilateral project" card |
| Generic no-project line | The existing line "N results not linked to a bilateral project" (`by-project-no-project`) |
| Overview scope | The rows the Overview reads since child #3: `replicated_w3` ∪ `new_w3` ∪ `w1w2_tagging` (`scope=bilateral`) |
| Reconciliation | An Overview figure equals the visible row count of the tab its link opens (`COV-R-13`) |
| Replicated | A previous-phase result copied into the current phase by the bulk replication (`is_replicated = 1`) |

## 4. System Context & Scope

| | |
|---|---|
| PRD | `docs/prd.md` §Scope "Bilateral result reporting" (first-party `pages/bilateral` UI); G3 / M3.1 (no break for existing consumers) |
| UX | `docs/ux-ui/design.md`: bilateral center shell, Overview tab (archive `2026-09-14-bilateral--center-overview-tab`, `COV-R-9`, `COV-R-13`) |
| TRD | `docs/trd/trd.md`: client `pages/bilateral`; no server change |
| Extends | archive `…center-overview-tab` (`COV-R-9`, `COV-R-13`, `COV-R-18`), archive `…center-overview-w3-scope` (`CWS-R-6`, `CWS-R-7`, `CWS-R-8`) |

### In scope

- A new bucket in the Overview model, subtracted from the generic no-project line.
- A new line with count, category-free copy and a reconciling link to Results.
- A `group` key in the shared query-param contract, applied by `filterCenterResults`, read by the Results tab as a removable chip.

### Out of scope

- Any server or SQL change, any `/api/bilateral/*` payload change.
- KPI cards, status tiles, other Overview cards, Portfolio Overview, Bilateral Home project cards.
- Making the **generic** no-project line reconcile (pre-existing gap, `CNP-OQ-4`).
- Freezing the 13-Oct snapshot (the count is live).

## 5. Stakeholders / Personas

| Persona | What changes for them |
|---|---|
| Center user / Center lead | Sees how many of their updated innovations still lack a project, and can open exactly that list |
| CGIAR SO (Nicoleta, P/A) | The Overview states the "updated 2025 innovations with no 2026 project" group she asked for |
| PMU lead | No change |

User story — **`CNP-US-1`**: As a Center user, I want the Overview to show my updated innovations that have no project of this phase as their own group, so that they are not mistaken for missing data and I can find them in one click. Refines `COV-US-*` and `CWS-US-1`.

## 6. Functional Requirements

### `CNP-R-1` — Updated-no-project bucket (MUST)

The Overview model SHALL count, among the rows that remain after the page filters, the updated-no-project rows (Glossary). Every other row keeps its current bucket.

- **Scenario A — main case**
  - GIVEN a center in an open phase whose filtered rows include 24 updated-no-project rows, 3 new W3 rows with no project, and 2 replicated W3 rows of type 1 with no project
  - WHEN the Overview model is built
  - THEN the updated-no-project count is 24
  - AND the generic no-project line counts 5 (3 + 2)
  - AND bars + generic no-project + updated-no-project + other-centers line = Total
  - BUT a row must NOT be counted in both lines.
- **Scenario B — live**
  - GIVEN one of the 24 rows gets a project (child #1 flow) and the Overview is reloaded
  - THEN the count is 23 and the result appears on its project's bar.
- **Scenario C — filters**
  - GIVEN the Overview filter `type = [1]` (or any filter that excludes those rows)
  - THEN the count is 0.
- **Rules**
  - AND IT MUST use the same `project_id` the bars use. A row with any project (lead or contributing, center-owned or not) is not in the bucket.
  - AND IT MUST treat `is_replicated` and `result_type_id` as possibly delivered as strings or booleans (`Number()` comparison, as elsewhere in the aggregate).

### `CNP-R-2` — The line and its link (MUST)

When the count is above 0, the "Results by bilateral project" card SHALL show the updated-no-project line, with its count, next to the generic no-project line and in the same visual pattern. Its link SHALL open the Results tab showing exactly those rows.

- **Scenario A — reconciliation**
  - GIVEN the line reads 24
  - WHEN the user follows it
  - THEN the Results tab opens on the same phase, scoped (`scope=bilateral`), with a chip for the group
  - AND its visible row count is 24
  - AND the other Overview filters active at the time are carried, as on every other Results link (`COV-DD-3`).
- **Scenario B — removing the chip**
  - GIVEN the Results tab opened from the line
  - WHEN the user removes the group chip
  - THEN the key leaves the URL and the tab shows the unfiltered scoped rows
  - BUT the group must NOT come back after navigating away and back without it.
- **Rules**
  - AND IT MUST apply the group through the shared filter (`filterCenterResults`), with the same predicate the bucket uses, so the figure and the destination cannot drift (`COV-R-13`).
  - AND IT MUST have an accessible name that states the label, the count and that it opens Results (`COV-R-18`).
  - BUT the link must NOT be emitted on links to the Reporting and Draft Results tabs, and those tabs must NOT apply the key.
  - BUT the Overview itself must NOT narrow its own cards when its URL carries the key.

### `CNP-R-3` — Hidden at zero (MUST)

- GIVEN the count is 0 (e.g. Reporting 2025, where nothing was replicated by this flow, or every row already has a project)
- WHEN the card renders
- THEN the line is not rendered and no empty placeholder takes its place
- AND the card's empty state ("No project has reported a result in this phase yet") still appears only when there are no bars, no generic no-project rows, no updated-no-project rows and no other-centers rows.

### `CNP-R-4` — Generic no-project line (MUST, modifies `CWS-R-6`)

The generic no-project line SHALL exclude the updated-no-project rows. Its count and its per-category entries SHALL be reduced by them. When nothing is left, it is not rendered (current behavior). Its link is unchanged.

- GIVEN a center whose only no-project rows are 5 updated-no-project rows (the shape expected for CIP, Reporting 2026; checked live in `CNP-AC-9`)
- WHEN the card renders
- THEN the updated-no-project line reads 5 and the generic no-project line is not rendered.

### `CNP-R-5` — Label and accessible chart summary (SHOULD)

- The label SHOULD name the years from the selected phase: "Updated {Y−1} innovations with no {Y} project", where Y is the phase year (2026 → "Updated 2025 innovations with no 2026 project"). When the phase year is unknown, it falls back to "Updated innovations with no project in this phase".
- The chart's accessible text summary SHOULD state the updated-no-project count next to the existing "not linked to a bilateral project" sentence, with the same numbers the lines show.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Backwards compatibility | Additive query key. A URL without `group` behaves exactly as today on every tab. No server change |
| Performance | One extra pass over the already-filtered rows; no new request (`COV-R-21`) |
| Accessibility | WCAG 2.1 AA, same as the generic line (`COV-R-18`). The new chip is removable by keyboard like the others |
| i18n / copy | English, in the copy constants the Overview and the Results tab already use (as child #3 did) |
| Security | No new input reaches the server. Unknown `group` values are dropped and reported in `stripped` |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `CNP-AC-1` | Fixture: 24 updated-no-project, 3 new W3 no project, 2 replicated type-1 no project, bars, 1 other-center row | Model built | Updated 24, generic 5, identity = Total, no double count (`CNP-R-1` A, `CNP-R-4`) |
| `CNP-AC-2` | Same rows with string ids/flags (`'1'`, `'7'`, `true`) | Model built | Same counts (`CNP-R-1` rule) |
| `CNP-AC-3` | Filter `type=[1]` / phase with no replicated rows | Model built and card rendered | Count 0, line absent (`CNP-R-1` C, `CNP-R-3`) |
| `CNP-AC-4` | `?group=…` valid / absent / unknown | Params parsed and serialized | Round-trips; unknown → `null` + `stripped` (`CNP-R-2`) |
| `CNP-AC-5` | Rows of every kind + `group` set | `filterCenterResults` runs | Returns exactly the rows the bucket counts (`CNP-R-2` rule) |
| `CNP-AC-6` | Overview with count > 0 | Line link built | Results link carries `group`, `scope`, `phase`, explicit defaults; Reporting/Draft links do not carry `group`; the Overview ignores `group` in its own URL (`CNP-R-2`) |
| `CNP-AC-7` | Results tab with / without `group`, chip removed | Tab renders | Chip shown; rows filtered; removal clears URL key and rows (`CNP-R-2` B) |
| `CNP-AC-8` | Phase year 2026 / unknown | Card rendered | Label text per `CNP-R-5`; aria label names label + count |
| `CNP-AC-9` | PRTest, one center with updated-no-project rows (ILRI or CIP), Reporting 2026 | A human follows the line | Results visible count = line count; generic line + bars + line + other-centers = Total (HITL) |

Project ACs that apply: `AC-4` (no break for existing consumers), `AC-5` (phase correctness).

## 9. Defect Classes and Gates

| Defect class this spec can produce | Gate that catches it |
|---|---|
| A row counted in both lines, or in neither (identity breaks) | Aggregate Jest identity assertion (`CNP-AC-1`) |
| Bucket predicate wrong on real wire shapes (string `'1'`, boolean `true`, `'7'`) | Aggregate + filter Jest with string/boolean fixtures (`CNP-AC-2`, `CNP-AC-5`) |
| Figure and destination use different predicates | Filter Jest asserts `filterCenterResults` with `group` returns the bucket's rows from the same fixture (`CNP-AC-5`); one exported predicate |
| Link misses `group`/`scope`, or `group` leaks to Reporting/Draft links or narrows the Overview | Component Jest (`CNP-AC-6`) |
| Results tab ignores `group`, chip not removable, key sticky | Results tab Jest (`CNP-AC-7`) |
| An existing consumer of the contract changes (Reporting panel, Drafts) | `--findRelatedTests` on `bilateral-query-params.ts` and `bilateral-result-filter.ts` |
| **Count ≠ destination with real data** (row shapes, project links, phase) | **No automated check can prove it** — fixtures prove the logic, not the rows (`KZ-EVM-1` note in `bilateral-overview/CLAUDE.md`). Covered by `CNP-AC-9`, human check on PRTest at the HITL pause |
| Visual: the new line looks broken or crowds the card at mobile width | No automated check (jsdom cannot lay out). Human check during `CNP-AC-9` at desktop and ≤ 899 px widths |
| The count disagrees with Nicoleta's 13-Oct sheet beyond what child #1 linked | Not a code defect; recorded in `CNP-AC-9` notes and reported to the owner, not gated |

## 10. Dependencies & Assumptions

- **Upstream:** child #3 `scope=bilateral` row set (shipped on PRTest via `performance-refactor`); `project_id` as resolved by `getResultsByBilateralCenter`.
- **Downstream:** Results tab; consumers of the contract (`bilateral-projects-panel`, `my-draft-results`) must stay unchanged.
- **A-1:** replication copies innovations only, so in practice every replicated W3 row with no project is in the bucket. The spec does not depend on it: the type condition is explicit.
- **A-2:** server and client of child #3 ship together (its design §11). If the client ran against an old server, the Overview would still count W1/W2 rows, but those never meet the W3 condition of the bucket.

## 11. Open Questions

| ID | Question | Default used by this spec | Blocks tasks? |
|---|---|---|---|
| `CNP-OQ-1` | Exact label | "Updated 2025 innovations with no 2026 project" (years from the phase, `CNP-R-5`) | No. Confirm with Nicoleta in the INC-164073 reply |
| `CNP-OQ-2` | Innovations only (7, 2) or every replicated W3 type? | Innovations only | No |
| `CNP-OQ-3` | "No 2026 project" = no project at all (row `project_id` null) vs no **lead** project (`family.md` §3) | No project at all, so the line never overlaps a bar. A replicated innovation with only a contributing project stays on that project's bar | No. Note in the INC-164073 reply; `family.md` §3 keeps its own definition for child #1 |
| `CNP-OQ-4` | Make the generic no-project line reconcile too (needs a "no project, not in group" filter) | Not in scope; its link stays as child #3 left it | No |

## 12. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| `CNP-R-1` | Updated-no-project bucket | MUST |
| `CNP-R-2` | The line and its link | MUST |
| `CNP-R-3` | Hidden at zero | MUST |
| `CNP-R-4` | Generic no-project line excludes the bucket | MUST |
| `CNP-R-5` | Label from the phase year; accessible chart summary | SHOULD |
| `CNP-US-1` | User story | — |
| `CNP-AC-1..9` | Acceptance criteria | — |

Modified archived requirements: `CWS-R-6` (no-project line now excludes the bucket; the bar identity gains one term), `COV-R-13` (new `group` key), `COV-R-9` (new line in the card).

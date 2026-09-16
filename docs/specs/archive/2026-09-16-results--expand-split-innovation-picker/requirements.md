# Module Spec — `requirements.md`

## 1. Module / Feature

- **Module:** `results`
- **Sub-feature:** `expand-split-innovation-picker`
- **Owner:** Santiago Sanchez (PRMS)
- **Status:** draft
- **Ticket(s):** none yet (relates in spirit to P2-3292 Step 3, which originally set the current rule)
- **Depth:** Standard

---

## 2. Context

In Annual Updating, a submitter can mark a pooled innovation as inactive because it is **"Discontinued: splitting into multiple innovations."** They must then pick which innovation(s) absorbed the split (`rd-annual-updating.component`, "Which innovations did this one split into?"). Today that picker only offers innovations already `QualityAssessed`(2) or `Approved`(6) — see `docs/specs/results/expand-split-innovation-picker/proposal.md` for the full background. The user wants the pool widened to **any active, non-discontinued Innovation Development result**, because the replacement can legitimately be a brand-new, not-yet-QA'ed innovation, and wants the picker's UI to adopt the search+scrollable-list pattern already used for the "linked or bundled result" field (`rd-contributors-and-partners`).

Relates to `docs/prd.md` **G2** (data quality) and **US-S2** (type-specific sections without forcing the wrong shape). Touches `docs/trd/trd.md` §"Results" module and the Innovation Development sub-flows under `api/results-framework-reporting/innovation_dev/` at the code level (the actual query lives in `result.repository.ts`, part of the `results` mega-module).

**⚠️ Load-bearing prior decision, now superseded:** the current status filter is not incidental — it was the codified outcome of ticket **P2-3292 Step 3**, documented in `result.repository.ts` (lines ~59–85) as a deliberate business rule ("Not discontinued", QAed+Approved only, explicitly **not** the same set as the sibling `QA_LINKABLE_INNOVATION_STATUS_IDS` constant, on purpose). **Confirmed 2026-09-16 (user sign-off in this spec's approval flow): that rule is superseded.** Eligibility drops the status gate entirely (any `status_id`), for both merge and split targets — see `SIP-R-1` and the resolved `SIP-OQ-1`/`SIP-OQ-2` below. `design.md` must record this as a superseding decision against the original P2-3292 rationale, per the project's DD convention for reverting prior decisions.

---

## 3. In Scope / Out of Scope

### In scope

- Broadening `getMergeSplitTargetInnovations()`'s eligibility filter from `status_id IN (QualityAssessed, Approved)` to "no status restriction" (any `status_id`), keeping `is_active = TRUE`, `is_discontinued IS NULL OR FALSE`, self-exclusion, and the `INNOVATION_DEVELOPMENT` type constraint unchanged. Applies to **both merge and split** targets (single shared filter — confirmed, `SIP-OQ-2`).
- Updating the info text on **both** the merge and split pickers to drop the "quality-assessed" wording (they stay textually identical, as today).
- Upgrading the `app-pr-multi-select` UI for **both** the merge and split pickers to a searchable/filterable experience visually aligned with `rd-contributors-and-partners`'s linked-result picker (search bar + scrollable checkbox rows), scoped only to filter dimensions relevant here. **Scope decision (resolved in `design.md` `RES-DD-2`, judgment-day round 1):** this is delivered by extending the existing shared `pr-multi-select` component with an opt-in server-search mode, not by building a new picker component — `pr-multi-select` already renders the search+scroll+checkbox shape this needs, and forking/duplicating it was assessed as the higher-risk, higher-LOC path. This supersedes the "new... component" wording an earlier draft of this scope line used.
- Wiring the new/upgraded picker to the existing `GET /v2/api/results/get/merge-split-target-innovations/:resultId` endpoint, including using its already-defined but currently unused `search` query param for server-side search.

### Out of scope

- Changing the `rd-contributors-and-partners` linked-result picker itself.
- Relaxing the `result_type_id = INNOVATION_DEVELOPMENT` constraint.
- Changing the QA'd-innovation-link single-select noted in `rd-contributors-and-partners.component.ts`.
- Building a fully generic, reusable cross-feature "result picker" component library (a narrow, purpose-built component is in scope; a shared library is not, unless design finds it is materially cheaper).

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Sees more candidates (including non-QA'ed active innovations) in the split-target picker, and a new search/filter UI to find them. |
| QA reviewer | No direct change, but may now review split relationships that point at a non-QA'ed innovation (see `SIP-OQ-1` risk). |
| PMU lead | No direct change. |
| Platform admin | No direct change. |

---

## 5. User Stories

- **`SIP-US-1`** — As a result submitter discontinuing a pooled innovation via "splitting into multiple innovations" (or "merging into another innovation"), I want to select any active, non-discontinued Innovation Development innovation as a target — not only QA'ed ones — so that a newly reported innovation can be recorded as the true successor.
- **`SIP-US-2`** — As a result submitter, I want the merge/split-target picker to have a search box and a scannable, scrollable list (like the linked-result field) instead of a bare checkbox list, so that I can find the right innovation quickly among many candidates.

Refines `US-S2` (type-specific sections without forcing the wrong shape).

---

## 6. Functional Requirements

### Required (MUST)

- **`SIP-R-1`** The system MUST list, as merge- and split-target candidates alike, every Innovation Development result where `is_active = TRUE` AND (`is_discontinued IS NULL` OR `is_discontinued = FALSE`) AND the result is not the one being edited — regardless of `status_id`. One shared filter serves both `transition_type` values.
- **`SIP-R-2`** The system MUST continue to exclude the innovation currently being discontinued from its own merge/split-target list (self-exclusion, unchanged from today).
- **`SIP-R-3`** The system MUST continue to de-duplicate to the latest version per `result_code` among eligible candidates (unchanged de-dup subquery behavior, now evaluated without the status restriction).
- **`SIP-R-4`** Both the merge and split pickers' info text MUST NOT reference "quality-assessed" as an eligibility condition.
- **`SIP-R-5`** The merge- and split-target picker UI MUST provide a text search control that narrows the candidate list by innovation ID or title.
- **`SIP-R-6`** The merge- and split-target picker UI MUST present candidates as a scrollable list of checkable rows (multi-select), consistent with the existing merge/split multi-select data contract (`merge_split_targets` with `transition_type = 'merge' | 'split'`).

### Should (SHOULD)

- **`SIP-R-10`** The picker SHOULD use the endpoint's existing `search` query parameter to filter server-side rather than fetching the full candidate list and filtering in the browser, to preserve scale as the Innovation Development catalogue grows.

### Could / Nice-to-have (MAY)

- **`SIP-R-20`** The picker MAY offer an additional lightweight filter (e.g., portfolio/phase) if `design.md` finds one meaningfully narrows results for this single-typology candidate set. Typology and funding-source chips from the `rd-contributors-and-partners` reference are explicitly not carried over (`SIP-R-1` candidates are always Innovation Development; typology/funding chips would always resolve to one value).

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | `GET /v2/api/results/get/merge-split-target-innovations/:resultId` MUST stay responsive as the eligible pool grows (no QA filter removed means a larger candidate set); server-side `search`/`limit` usage (`SIP-R-10`) exists specifically to bound this. |
| **Backwards compatibility** | The endpoint's shape (fields returned per candidate) is unchanged; only the `WHERE` clause and (optionally) the `search` wiring change. No client type change required beyond the picker component itself. |
| **Accessibility** | New picker UI MUST meet WCAG 2.1 AA per `docs/ux-ui/design.md` §10 (focus order, labelled search input, checkable rows announced correctly). |
| **Internationalization** | All new/changed strings (info text, search placeholder) MUST go through `src/app/internationalization/`. |
| **Data integrity** | No new persistence — `merge_split_targets` already stores arbitrary target result ids; broadening the source list does not require a migration. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `SIP-AC-1` | An active, non-discontinued Innovation Development result in status `Editing` or `Submitted` | The submitter opens the split-target or merge-target picker for a different, active innovation | The Editing/Submitted result appears as a selectable candidate in both pickers. |
| `SIP-AC-2` | An active, non-discontinued Innovation Development result in status `QualityAssessed` or `Approved` | The submitter opens either picker | The result still appears (no regression). |
| `SIP-AC-3` | A discontinued innovation, an inactive innovation, or the innovation currently being edited | The submitter opens either picker | None of these three appear as candidates. |
| `SIP-AC-4` | Either picker is rendered | The submitter reads the helper text | It does not mention "quality-assessed," and both pickers' texts stay identical to each other. |
| `SIP-AC-5` | The submitter types into either picker's search box | The list updates | Only candidates matching the search text (by ID or title) remain visible. |

Cross-cutting project ACs that already apply (do NOT restate, do refer): `AC-1` (typed result integrity), `AC-3` (authorization — endpoint stays JWT-gated, unchanged), `AC-9` (security and secrets — no change to logging).

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- `result.repository.ts` → `getMergeSplitTargetInnovations()` and the `MERGE_SPLIT_TARGET_STATUS_IDS` constant.
- `results.service.ts` → `getMergeSplitTargetInnovations(resultId, search, limit)`.
- `results.controller.ts` → `GET /v2/api/results/get/merge-split-target-innovations/:resultId`.
- `results-api.service.ts` → `GET_mergeSplitTargetInnovations` (client).
- `rd-annual-updating.component.ts/html`.

### Downstream consumers

- None outside this flow — `merge_split_targets` is not currently read by bilateral/platform-report payloads (to be confirmed in `design.md`; if it is read downstream, broadening the source pool has no shape impact since the field only stores selected target ids).

### Assumptions

- The result-type constraint (`INNOVATION_DEVELOPMENT`) and the de-dup-to-latest-version behavior stay correct once the status filter is removed — no other part of the query depended on the status list beyond gating and the de-dup subquery (which reuses the same list and will be updated symmetrically).

---

## 10. Open Questions

- **`SIP-OQ-1`** — **RESOLVED 2026-09-16.** The prior P2-3292 Step 3 business rule (QAed/Approved only) is confirmed superseded by the user. Eligibility drops the status gate entirely. `design.md` records this as a superseding decision (see DD convention in root `CLAUDE.md`).
- **`SIP-OQ-2`** — **RESOLVED 2026-09-16.** Both merge and split targets get the same broadened filter and the same (updated) info text — no `transition_type`-aware branching needed.
- **`SIP-OQ-3`** — Is any additional filter (portfolio/phase) actually useful for this single-typology candidate list, or is search-only sufficient? Resolve during `design.md`. Non-blocking — defaults to search-only if undecided.

All blocking open questions are resolved; `design.md` may proceed.

---

## 11. Out-of-Band Notes

None.

---

## Requirement ID Index

| ID | Statement (short) |
|---|---|
| SIP-R-1 | Broaden eligibility to any active, non-discontinued Innovation Development result |
| SIP-R-2 | Keep self-exclusion |
| SIP-R-3 | Keep latest-version de-dup |
| SIP-R-4 | Remove "quality-assessed" from info text |
| SIP-R-5 | Add search control |
| SIP-R-6 | Keep scrollable checkable multi-select contract |
| SIP-R-10 | Prefer server-side search over client-side filtering |
| SIP-R-20 | Optional additional filter, TBD in design |

## Required cross-references

- `docs/prd.md` — `G2`, `US-S2`.
- `docs/ux-ui/design.md` — §10 (a11y); no existing screen/flow id documents this picker yet (new pattern to promote per `/akili-specify` step 6 once shipped).
- `docs/trd/trd.md` — `api/results/` module (mega-module), Innovation Development sub-flows.
- `docs/specs/results/expand-split-innovation-picker/proposal.md`.

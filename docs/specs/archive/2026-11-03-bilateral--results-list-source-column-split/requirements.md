# Requirements — Split "Source" column on the bilateral Results list

## Document Control

| Field | Value |
|---|---|
| Module | `bilateral` |
| Sub-feature | `results-list-source-column-split` |
| Owner | Santiago Sanchez |
| Status | draft |
| Depth | **Lite** |
| Proposal | `./proposal.md` (approved — Option A selected 2026-09-28) |

## 1. Context

The centre-facing bilateral Results list (`onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/`) renders a `Source` column that today stacks two unrelated badges in one cell: funding source (`W3` / `W1/W2`) and result origin (`AI Result`). A centre reviewer (Pascale Sabbagh, IFPRI) flagged this as confusing — one header answering two questions. This spec makes `Source` mean exactly one thing (result origin) and gives funding source its own column, per the approved proposal's Option A.

No server or API change (`docs/trd/trd.md` ADR-004 additive-only doesn't apply — nothing is added to any payload; `result.source` and the AI-origin flag are already on the row).

## 2. In Scope / Out of Scope

### In scope

- Remove the `W3`/`W1/W2` badge from the `Source` column cell.
- Add a new `Funding source` column (or equivalent label) showing that badge, adjacent to `Source`, using the existing `BILATERAL_COLUMNS` column-picker/resize/visibility infrastructure.
- Bump `BILATERAL_COLUMN_STORAGE_KEY` (`v4` → `v5`) so the new column is not hidden by a stale stored preference.
- Update any test that pins this table's column count/header set.

### Out of scope

- Filter/toggle logic for W3 vs W1/W2 (`showW3`, `showW1W2`) — unchanged.
- `isAiResult()` detection logic — unchanged, only its display location.
- The SP-reviewer `bilateral-review` list (`result-framework-reporting/pages/bilateral-review/`) — separate component, not affected.
- The unrelated "common W3 information" copy fix (routed to `/akili-quick` per the proposal).

## 3. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter (Center staff) — bilateral centre dashboard user | Sees funding source and result origin as two distinct, unambiguous columns instead of one mixed cell. Can independently show/hide either via the existing column picker. |

## 4. User Stories

- **`BSC-US-1`** — As a centre reporting focal point reviewing the bilateral Results list, I want the `Source` column to show only how a result was created (manual vs AI), so that I don't confuse it with funding source.
- **`BSC-US-2`** — As the same user, I want funding source (W3 vs W1/W2) to remain visible per-row, so that I don't lose the at-a-glance information the mixed column used to give me.

## 5. Functional Requirements

### Required (MUST)

- **`BSC-R-1`** The `Source` column cell MUST render only the result-origin indicator (`AI Result` badge when `isAiResult(result)` is true; nothing/a neutral state otherwise) and MUST NOT render the `W3`/`W1/W2` badge.
- **`BSC-R-2`** The table MUST render a new column showing the `W3`/`W1/W2` badge (currently `result.source === 'API'` → `W3`, else `W1/W2`), independent of the `Source` column.
- **`BSC-R-3`** The new column MUST be a first-class entry in `BILATERAL_COLUMNS`, inheriting existing show/hide, resize, and persisted-width behavior — no bespoke column mechanism.
- **`BSC-R-4`** `BILATERAL_COLUMN_STORAGE_KEY` MUST be bumped (`v4` → `v5`) so users with a stored `defaultOn: true` column hidden by prior preference still see the new column by default.

### Should (SHOULD)

- **`BSC-R-10`** The new column SHOULD sit immediately adjacent to `Source` (before or after, per design.md), since both were previously rendered in the same cell and reviewers scan them together.

## 6. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Backwards compatibility** | Additive UI change only; no API/payload change. Existing filter chips (`Source: W3 Bilateral`, etc.) and toggles (`showW3`/`showW1W2`) keep working unchanged. |
| **Internationalization** | New/changed column header strings follow the same pattern as existing `BILATERAL_COLUMNS` titles (plain English labels, no i18n pipeline currently used in this table — consistent with existing columns). |
| **Accessibility** | The relocated `W3`/`W1/W2` badge keeps its existing text-based (not color-only) distinction; no new accessibility surface introduced. |

## 7. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `BSC-AC-1` | A W3 (API) bilateral result, manually created | The Results list renders that row | The `Source` column shows no `W3` badge; the new funding-source column shows `W3`. |
| `BSC-AC-2` | A W1/W2 bilateral result created via AI | The Results list renders that row | The `Source` column shows the `AI Result` badge only; the new funding-source column shows `W1/W2`. |
| `BSC-AC-3` | A user with a previously stored column-visibility preference (pre-`v5`) | They load the Results list | The new funding-source column is visible (not silently hidden by the stale preference). |
| `BSC-AC-4` | The column picker | A user opens it | Both `Source` and the new funding-source column are listed as independently toggleable entries. |

Cross-cutting project ACs that already apply: `AC-4` Bilateral / platform-report stability (no payload touched, so trivially satisfied).

## 8. Dependencies & Assumptions

### Upstream dependencies

- None beyond the existing `result.source` and AI-origin fields already present on `BilateralCenterResult`.

### Downstream consumers

- None — this table is not consumed by other modules.

### Assumptions

- `result.source === 'API'` continues to be the correct proxy for "W3" per the existing code (`bilateral-results-list.component.html:411`); this spec does not re-derive that mapping.

## 9. Open Questions

- **`BSC-OQ-1`** — Final label for the `Source` column now that it means one thing only: keep `Source`, or rename to `Origin`? Resolve in `design.md`.
- **`BSC-OQ-2`** — Label and exact position for the new funding-source column (`Funding source` working title; immediately before or after `Source`). Resolve in `design.md`.

## 10. Defect Classes & Gates

| Defect class | Gate |
|---|---|
| Wrong badge rendered in wrong column (funding vs origin logic swapped) | Jest component spec asserting cell content per `BSC-AC-1`/`BSC-AC-2` fixture rows |
| New column not shown by default for existing users (stale stored preference) | Jest spec seeding a pre-`v5` `localStorage` value and asserting the new column still renders (`BSC-AC-3`) |
| Column-picker regression (new entry missing/mis-wired) | Jest spec asserting the picker's option list includes the new column key (`BSC-AC-4`) |
| Visual column width/overflow at narrow viewports | **No automated gate in this repo for layout at exact breakpoints** (jsdom does not measure real layout). Substituted by a human check at the `/akili-validate` HITL pause — recorded as an accepted, substituted risk, not a silent gap. |

## Required cross-references

`docs/prd.md` (persona: Result submitter / Center staff, §3) · `docs/trd/trd.md` (ADR-004 additive-only, not applicable — no payload change) · `./proposal.md`

# Proposal — Split "Source" column on the bilateral Results list

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/results-list-source-column-split/` |
| Slug | `results-list-source-column-split` — derived from user free-text describing the change |
| Type | **Change** |
| Approval Mode | **gated** (default — no explicit pre-approval mandate given) |
| Requested by | Pascale Sabbagh (IFPRI), via centre-user review feedback, relayed by Santiago Sanchez |
| Author | Santiago Sanchez |
| Date | 2026-09-28 |

---

## Intent

Split the `Source` column on the centre-facing bilateral Results list so it stops rendering two unrelated concepts — funding source (W3 / W1-W2) and result origin (AI-generated / manual) — under one ambiguous header.

## Problem / Current Behavior

`bilateral-results-list.component.html:409-420` renders, inside the single `source` column cell:

```html
@if (result.source === 'API') {
  <span class="brl_source_badge brl_source_badge--w3">W3</span>
} @else {
  <span class="brl_source_badge brl_source_badge--w1w2">W1/W2</span>
}
@if (isAiResult(result)) {
  <span class="brl_ai_badge" title="AI Result" aria-label="AI Result">…AI Result</span>
}
```

One header, "Source", but up to two badges stacked in the same cell answering two different questions: *where did the funding come from* (W3 vs W1/W2) and *how was the result created* (AI vs manual). A reviewer reading the column has no way to tell, from the header alone, which question it answers — confirmed directly by Pascale Sabbagh's review comment: *"The column titled Source seems to include both the source of funding (e.g. W3) and the origin of the results (e.g. AI result). This is confusing."*

The funding-source value is **not exclusive to this column** — it is already independently surfaced as filter chips (`bilateral-results-list.component.ts:588-595`, e.g. `Source: W3 Bilateral`) and as toggle controls (`showW3` / `showW1W2`, `:429-436`). The AI-origin value has no other surface in this list.

## Proposed Outcome

The `Source` column shows **only the origin of the result** (AI-generated vs manual). Funding source (W3 / W1-W2) moves to its own new column — **Approach Option A**, confirmed by the user (Santiago Sanchez) on 2026-09-28 after re-reading Pascale's comment: she means both concepts are *already* stacked in one cell today (not that one is missing), and wants "Source" reserved for the origin of the result only.

## Scope

- `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.html` — column cell markup (lines ~409-420)
- `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.ts` — `BILATERAL_COLUMNS` definition (line 135-145), `BILATERAL_COLUMN_STORAGE_KEY` version bump if a column is added/removed
- `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.scss` — badge classes (`brl_source_badge`, `brl_ai_badge`) if reused across two columns
- `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.spec.ts` — any pinned column count/header assertions

## Non-Goals

- No change to the **filter/toggle** logic for W3 vs W1/W2 (`showW3`, `showW1W2`, `currentContractParams`) — those already work correctly and are out of scope.
- No change to how AI-generated results are detected (`isAiResult()`), only to where/how that fact is displayed.
- Does not touch the unrelated SP-reviewer "bilateral review" list (`result-framework-reporting/pages/bilateral-review/`), which already has its own, single-badge `Source` column shipped by the archived spec `docs/specs/archive/2026-09-21-bilateral--review-list-source-and-reporter/` — that list does not have this bug; its "Source" already means one thing (a single derived provenance label), never two badges stacked.
- The second, unrelated feedback item from the same review batch — replacing the confusing phrase "common W3 information" with "information common across result types" in `section-general-info.component.html:15` and `bilateral-change-result-type-dialog.component.html:2` — is a copy-only, zero-logic text change. It does not belong in this proposal; run `/akili-quick w3-info-copy-fix` (or similar) for it separately.

## Affected Users, Systems, And Specs

- **Users:** centre reporting focal points and reviewers using the bilateral centre dashboard Results list (e.g. IFPRI's Pascale Sabbagh, who raised this).
- **Systems:** `onecgiar-pr-client` only — no server/API change; `result.source` and `is_ai_generated`/equivalent are already on the payload.
- **Related specs:** `docs/specs/archive/2026-09-21-bilateral--review-list-source-and-reporter/` (prior art for a similarly-named "Source" column in a sibling list — reuse its naming lesson: keep provenance and funding-origin conceptually separate) — no direct dependency, informative only.

## Visual Reference

- Source: None
- Location: —
- Notes: Change is a small column-content/header split inside an existing, already-styled table (badge classes already exist in `.scss`). No new visual pattern is introduced regardless of which Approach Option is picked, so a mockup was not requested. If the reviewer wants to see the two-column layout before committing, `/akili-specify` can attach a quick self-contained HTML mockup at that stage.

## Requirement Delta Preview

### ADDED Requirements

- A new `Funding source` column showing the `W3` / `W1/W2` badge, independent of `Source`.

### MODIFIED Requirements

- The `Source` column's cell template no longer renders the `W3`/`W1/W2` badge; it renders only the AI/manual origin indicator.
- `BILATERAL_COLUMNS` (and its storage-key version, currently `v4`) updated to reflect the new column set/labels.

### REMOVED Requirements

- None. No information is dropped — funding source moves to its own column rather than being removed.

## Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — Split into two columns (selected)** | Add a new `Funding source` column (reusing `brl_source_badge`), keep `Source` for AI/manual origin only. Both are user-toggleable via the existing column picker (`BILATERAL_COLUMNS`), so a user who doesn't care about funding source can hide it. | +1 column width to budget for (table already supports resizing/hiding); slightly more surface area to maintain, but zero ambiguity and no information loss. |
| B — Drop funding source from the table, keep filters | Remove the `W3`/`W1/W2` badge from the row entirely, rely on the existing filter chips/toggles. | Not selected — loses a per-row glance at funding source. |
| C — Rename only, no split | Keep both badges in one cell, just rename the header. | Not selected — does not resolve Pascale's complaint, the two concepts still share one column. |

## Recommended Approach

**Option A — split into two columns.** Confirmed by the user on 2026-09-28. It fully resolves the ambiguity Pascale flagged (each column answers exactly one question), costs nothing in terms of removed information, and the table already has the infrastructure for an extra toggleable/resizable column (`BILATERAL_COLUMNS`, column picker, persisted visibility map).

**Naming decision, still open for `/akili-specify`:** with funding source in its own column, should `Source` keep its current label (now unambiguous — it only ever means origin) or be renamed to `Origin` for extra clarity? Either is defensible; `/akili-specify` should pick one and record it as a design decision rather than leaving it implicit.

## Risks, Dependencies, And Open Questions

- **Open question (for `/akili-specify`'s design.md):** does the existing `Source` column keep its label or get renamed to `Origin` now that it only carries one meaning? New column's label: `Funding source` (working title) — confirm wording.
- **Open question:** column order — does `Funding source` go immediately before or after the renamed/kept `Source` column, or elsewhere in `BILATERAL_COLUMNS`? Recommend keeping them adjacent since they were previously the same cell.
- **Risk:** any Jest spec pinning the current column count/header set for this table (pattern seen on the sibling `bilateral-review` list, `docs/specs/archive/2026-09-21-.../design.md` §1B) must be swept and updated — `bilateral-results-list.component.spec.ts` needs checking for the same pinned-consumer pattern before `/akili-execute`.
- **Risk:** `BILATERAL_COLUMN_STORAGE_KEY` is versioned (`v4`) specifically so a newly-required column is never left hidden by an old stored preference (`bilateral-results-list.component.ts:129-131`) — this change requires bumping it to `v5`.
- **Dependency:** none on other in-flight specs.

## Success Criteria

- The `Source` column (or its renamed equivalent) never displays a funding-source badge.
- Funding source (W3/W1-W2) remains discoverable somewhere in the UI (either a dedicated column or the existing filters), with no information loss versus today.
- No regression in existing column-picker, resize, or persisted-visibility behavior for this table.
- Pascale Sabbagh's underlying complaint — one column, one meaning — is resolved.

## Next Step

```text
/akili-specify bilateral/results-list-source-column-split
```

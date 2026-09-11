# Requirements — Hide indicator-only UI in emerging-result creation (Lite)

## 1. Module / Feature
- **Module:** `result-framework-reporting` (dashboard-lab)
- **Sub-feature:** `lab-report-form` — emerging-result creation
- **Status:** approved (user confirmed live in-app via screenshot)

## 2. Context
`lab-report-form.component.html`'s Card 2 ("Target Contribution", `contribution_to_indicator_target` field) and the `@else` branch of Card 3's ToC-attribution note ("No ToC-mapped collaborators for this indicator") both assume an indicator-tied context. In the emerging-result creation flow (`isEmerging()` true — no `tocNode`/`indicator`), these read as nonsensical: there is no indicator target to contribute toward, and no indicator to be "not mapped" to. `bugfix/emerging-contribution-not-required` (ECN-T-1) already fixed the field's *requiredness*; this spec fixes its *visibility*, which was explicitly out of scope there.

## 3. In Scope / Out of Scope

### In scope
- Hide Card 2 ("Target Contribution", `data-testid="card-target-contribution"`) entirely when `isEmerging()` is `true`.
- Hide the ToC-attribution note block (`data-testid="toc-attribution-note"`) entirely when `isEmerging()` is `true`. The Contributing Centers/Science Programs selects below it (unrelated markup, same Card 3) are untouched and stay visible.

### Out of scope
- Any change to `missingFields()`/`canSave()` requiredness logic (already correct per ECN-T-1) — this is visibility only.
- The non-emerging (indicator-tied) flow — must render pixel-identical to today.
- The legacy `aow-hlo-create-modal` (not the live emerging entry point).
- Replacing the hidden note with new emerging-specific copy — full removal, no substitute text (confirmed: nothing accurate to say there without an indicator).

## 4. Functional Requirements

### Required (MUST)
- **EHU-R-1** WHEN `isEmerging()` is `true`, the system MUST NOT render Card 2 ("Target Contribution").
- **EHU-R-2** WHEN `isEmerging()` is `true`, the system MUST NOT render the ToC-attribution note block, but MUST still render the Contributing CGIAR Centers / Science Programs selects in Card 3.
- **EHU-R-3** WHEN `isEmerging()` is `false`, both elements MUST render exactly as they do today (no regression).

## 5. Scenarios

#### Scenario: Emerging creation hides indicator-only UI
- GIVEN `emergingMode` is `true` (`indicator: null`, `tocNode: null`)
- WHEN the form renders
- THEN `[data-testid="card-target-contribution"]` is not in the DOM
- AND `[data-testid="toc-attribution-note"]` is not in the DOM
- AND the Contributing CGIAR Centers / Science Programs selects (Card 3) ARE still in the DOM

#### Scenario: Non-emerging (indicator-tied) — unchanged
- GIVEN a normal indicator-tied result (`isEmerging()` is `false`)
- WHEN the form renders
- THEN `[data-testid="card-target-contribution"]` IS in the DOM
- AND `[data-testid="toc-attribution-note"]` IS in the DOM (in whichever of its two internal branches — pre-filled or "No ToC-mapped" — already applied)

## 6. Non-Functional Requirements
Not applicable — pure template visibility, no performance/security/a11y surface beyond "hidden elements are not focusable/announced", which `@if` removal already satisfies (no DOM node, nothing for AT to reach).

## 7. Defect Classes & Verification Mapping

| Defect class | Catching command |
|---|---|
| Card 2 / note still render for emerging (fix not applied) | New Jest test asserting both `data-testid`s are absent when `emergingMode: true` |
| Card 2 / note wrongly hidden for non-emerging (over-broad fix) | Existing Jest tests exercising the non-emerging setup must stay green (both cards already asserted present implicitly by existing contribution-field tests) |
| Contributing Centers/Programs selects accidentally hidden along with the note (whole Card 3 gated instead of just the note) | New Jest test asserting the centers/science multi-selects remain in the DOM when `emergingMode: true` |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| EHU-AC-1 | `emergingMode: true` | form renders | `card-target-contribution` and `toc-attribution-note` both absent from DOM |
| EHU-AC-2 | `emergingMode: true` | form renders | Contributing Centers / Science Programs selects still present |
| EHU-AC-3 | Non-emerging indicator | form renders | Both elements still present, unchanged |

## 9. Dependencies & Assumptions
- Depends on existing `isEmerging()` computed (`lab-report-form.component.ts:225`) — no new signal needed.
- Depends on `bugfix/emerging-contribution-not-required` (ECN-T-1, already shipped) for the requiredness half of this behavior — not modified here.

## 10. Open Questions
None — scope confirmed live by user (screenshot) in this session; "omit entirely, no substitute copy" was the reasonable default given no indicator context exists to describe.

## Required cross-references
- `bugfix/emerging-contribution-not-required` (this repo) — the requiredness fix this spec's visibility fix complements.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/CLAUDE.md` — to be updated on completion.

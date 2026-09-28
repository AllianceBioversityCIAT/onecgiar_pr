# IPSR · General information — Impact Area scores parity with Results

## 1. Module / Feature

- **Module:** `ipsr` (client only)
- **Sub-feature:** Impact Area scores block of `ipsr-general-information`
- **Depth:** Lite
- **Status:** draft
- **Origin:** `/akili-quick` escalated (block ≈60 LOC + a new counter → fails the triviality gate), 2026-09-28
- **Ticket(s):** —

## 2. Context

The Impact Area scores block in IPSR General information still uses the old layout: a plain `h1` heading, an inline guidance box above each of the 5 tags, and list-style radios. Results General information already shows the approved layout: a tinted group header with an "N of 5 scored" ring, one row per tag (`label + ⓘ` on the left, a segmented `0 / 1 / 2` track on the right), and the guidance inside the ⓘ. This spec brings IPSR in line with Results. Nothing changes in behaviour or validation.

Refs: `docs/prd.md` G1 (data quality at reporting time) · `docs/ux-ui/design.md` §8 (reuse the shared components, don't re-implement them) · `docs/trd/trd.md` client module `pages/ipsr`. The reference implementation is `rd-general-information.component.html` L77–369.

## 3. Scope

**In:** the Impact Area block only: the group header, the 5 tag rows, and the wrapper for the P25 component checkboxes.
**Out:** Title/Description/Lead contact, the section skeleton, the save button, green checks (DB procedures, left for last), the evidence fields, `showAlerts()`, and any change to validation.

## 4. Functional Requirements

### IPSR-GIS-R-1 — Group header with scored counter (P25)

For P25, the block SHALL open with the shared group header "Impact Area scores". The header SHALL show how many of the 5 tags have a score, counted by **presence** (a score of `0 — Not targeted` counts).

#### Scenario: counter counts a zero score
- GIVEN a P25 innovation package with the gender tag = `0 Not Targeted` and the other 4 tags empty
- WHEN General information renders
- THEN the header reads `1 of 5 scored`
- BUT it must NOT read `0 of 5` (a truthiness count would do that)

#### Scenario: guidance placement
- GIVEN the 2026 reporting-guidance flag is on
- THEN the IA scoring guidance is in the header's ⓘ and no inline box is rendered
- AND IT MUST still render the inline box when the flag is off (Results parity)

### IPSR-GIS-R-2 — Segmented tag rows with guidance in the ⓘ

Each of the 5 tags SHALL render as a segmented `0 / 1 / 2` track. The tag guidance SHALL be in that row's ⓘ tooltip instead of a separate box above the row.

#### Scenario: no orphan guidance boxes
- GIVEN any IPSR General information
- WHEN it renders
- THEN there are exactly 5 segmented tracks and 0 per-tag `app-alert-status` boxes in the block
- AND the P25 labels match Results (e.g. "Gender equality, youth and social inclusion tag")
- BUT the P22 labels must NOT change

### IPSR-GIS-R-3 — P25 component checkboxes inside a field card

When a P25 tag is `2 Principal`, its component checkboxes SHALL render inside the shared field card. The card SHALL show the done state exactly when `isImpactAreaComplete(field)` is true.

### IPSR-GIS-R-4 — No behaviour change (negative constraint)

- The 5 `appFeedbackValidation` entries, their `isComplete` expressions, the `#*_tag_alert` anchors used by `showAlerts()`, `showImpactAreaEvidenceField()`, the save payload and the ngModel bindings MUST stay identical.
- BUT the inner checkbox `.pr-field` MUST NOT gain a `mandatory` class (that would double-count the field in the missing-fields scan).

## 5. Non-Functional

| Dimension | Target |
|---|---|
| A11y | ⓘ triggers stay keyboard-focusable (they are inherited from the shared components) |
| Tokens | No new hex values or SCSS classes; shared components only |

## 6. Defect classes → gate

| Defect class | Caught by |
|---|---|
| Counter wrong at score 0 / null / '' | Jest: `ipsr-general-information.component.spec.ts` (new cases) |
| Template compile error (bad input / binding) | `npm run build` (tsc does not typecheck templates) |
| A validation hook lost or duplicated | Jest DOM count of `[appFeedbackValidation]` = 5 in the block, plus the `#*_tag_alert` ids present |
| Visual mismatch with the screenshot | **No automated check.** Substitute: real-browser side-by-side IPSR vs Results at the HITL pause |

## 7. Open Questions

- `IPSR-GIS-OQ-1` — P22 IPSR shows no group header today. Proposed: keep the header P25-only (today's gate) and apply only the segmented rows + tooltips to P22, which is what Results does for its rows. *Assumed unless you say otherwise.*

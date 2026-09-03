# Module Spec — Requirements: Innovation Geo Focus, "other geographic areas" question

## 1. Module / Feature

- **Module:** `results` (Result Detail → Geographic location section)
- **Sub-feature:** Innovation "other geographic areas" question (`has_extra_geo_scope`)
- **Owner:** Result submitter-facing bug
- **Status:** draft
- **Ticket(s):** none provided
- **Depth:** Lite · **Mode:** Bug

---

## 2. Context

Gap: the mandatory Yes/No question *"Are there any other geographic areas where the innovation could be impactful (beyond current development and use)?"* — shown on the Geographic Location section (`docs/ux-ui/design.md` §4 Result Detail) for Innovation Development / Innovation Use results (P25, non-P22) — can render **pre-answered as "No"** instead of blank, letting a submitter unknowingly skip a mandatory answer. This violates `docs/prd.md` **AC-6** (submission MUST NOT silently bypass a required field) in spirit: the field is flagged `required: true` in `FieldsManagerService`, yet the completeness scan (`docs/prd.md`-aligned client pattern in `onecgiar-pr-client/src/CLAUDE.md` §21.5) never sees it as missing.

Entities/API touched (`docs/trd/trd.md` §2): `Result.has_extra_geo_scope` (client read-side only; server DTO `CreateGeographicLocationDto.has_extra_geo_scope` already nullable-boolean and unaffected).

See `proposal.md` in this folder for the full Bug Diagnosis (confirmed root cause, reproduction).

---

## 3. In Scope / Out of Scope

### In scope
- Client-side fix so an unanswered (`null`) server value renders with no radio selected.
- Client-side fix so the completeness/missing-fields check correctly flags an unanswered value as incomplete.

### Out of scope
- The `geo_scope_id` (Global / "yet to be determined") visibility gate — confirmed intentional, not touched (see proposal Decision Log).
- Backend, DTO, or migration changes — server already round-trips `null`/`true`/`false` correctly.
- Innovation Package (IPSR) or any other result-type section.
- Question copy/description text — already correct.

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Sees the "other geographic areas" question blank (not pre-answered) until they consciously pick Yes or No, on Innovation results with a non-Global, non-"to be determined" main focus. |
| QA reviewer | N/A — no change to reviewer-facing surfaces. |

---

## 5. User Stories

- **`GEO-US-1`** — As a result submitter, I want the "other geographic areas" question to start unanswered when I've never answered it, so that I make a deliberate choice instead of silently inheriting "No". *(Refines US-S1, US-S5.)*

---

## 6. Functional Requirements

### Required (MUST)

- **`GEO-R-1`** When the server's stored value for `has_extra_geo_scope` is `null` (never answered) and the question is visible (Innovation result, non-P22, main geo focus not Global/"to be determined"), the system MUST render the Yes/No radio group with **no option selected**.
- **`GEO-R-2`** When the server's stored value for `has_extra_geo_scope` is `true` or `false` (an actual prior answer), the system MUST render the matching radio option selected — unchanged from current behavior.
- **`GEO-R-3`** While the question is visible and unanswered, the system MUST count it toward the section's "fields missing" list, exactly as any other unanswered required field.

### Should (SHOULD)

- **`GEO-R-10`** The fix SHOULD apply the same null-vs-boolean distinction pattern used elsewhere in this component (`geographicLocationBody`) rather than introducing a new local convention.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Backwards compatibility** | MUST NOT change the shape or values `PATCH /v2/api/geographic-location/update/geographic/<id>` sends for an *already-answered* question — only the unanswered case changes. |
| **Regression safety** | MUST NOT alter the Global/"to be determined" visibility gate, the nested "Yes" follow-up geoscope picker, or P22 behavior. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `GEO-AC-1` | An Innovation result (P25, non-P22) with main geo focus = Regional, and `has_extra_geo_scope` is `null` server-side | The Geographic Location section loads | The "other geographic areas" question shows no option selected, and appears in the "fields missing" list. |
| `GEO-AC-2` | Same result, but `has_extra_geo_scope` was previously saved as `false` ("No") | The Geographic Location section loads | The question shows "No" selected and does NOT appear in "fields missing". |
| `GEO-AC-3` | Same result, main geo focus = Global | The Geographic Location section loads | The "other geographic areas" question does not render at all (gate unchanged). |

Cross-cutting project ACs that already apply (not restated): `AC-1`, `AC-6` (evidence/required-field integrity at submit), `AC-9`.

---

## 9. Dependencies & Assumptions

### Upstream dependencies
- `FieldsManagerService` field metadata for `[geoscope-management]-has_extra_geo_scope` (unchanged, already correct).

### Downstream consumers
- None beyond this section — `has_extra_geo_scope` is not exposed in bilateral/platform-report payloads for this question.

### Assumptions
- Server GET already returns the raw `null`/`true`/`false` (confirmed in `geographic-location.service.ts:180`, `result?.has_extra_geo_scope`) — no server change needed.

---

## 10. Open Questions

None — scope confirmed with reporter (see `proposal.md` Decision Log).

---

## 11. Defect Classes & Verification Mapping

| Defect class | Catching command/check |
|---|---|
| Null coerced to `false` on load (the bug itself) | Unit test (Jest) on `RdGeographicLocationComponent.fillExtraGeographicLocationBody()` asserting `null` input → `has_extra_geo_scope` stays `null`/`undefined`, not `false`. |
| Completeness check still misses a `null` value | Unit test asserting the `[isComplete]` expression (or its extracted predicate) returns `false` for `null`. |
| Regression on the answered path (`true`/`false`) | Same unit test file, additional cases for `true` and `false` inputs — must still render/flag as before. |
| Visual/DOM rendering of "no selection" | Not covered by Jest (jsdom radio-check limitations per `onecgiar-pr-client/CLAUDE.md` §9 known trap) — accepted as a **manual browser check** during PR review (load a fresh Innovation result, confirm no radio pre-checked), recorded as an accepted gap rather than an automated gate. |

---

## Required cross-references

- `docs/prd.md` — `AC-6` (required-field integrity).
- `docs/ux-ui/design.md` §4 (Result Detail screen inventory).
- `docs/trd/trd.md` §2 (Domain modules) — `results` module.
- `proposal.md` (this folder) — confirmed root cause and Decision Log.

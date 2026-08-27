# Requirements — Partner typology / role visual separation (Lite)

| Field | Value |
|---|---|
| Spec path | `changes/partner-role-separator` · Module code `PRS` · Depth **Lite** · Type Change (UI) |
| Status | draft · Approval Mode gated |
| Baseline | `docs/ux-ui/design.md` §7/§8/§10 · proposal.md (approved) |
| Scope file | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/normal-selector/` — **both** selected-partner blocks (ToC partners `.component.html:76-122`, Other(s) `:144-190`) |
| Exemplar | `rd-partners/components/normal-selector` ("Partner role" field header) and the KP selectors ("Partner role:" + pills) — already compliant, do not touch |

## Requirements

- **`PRS-R-1`** Each selected-partner row MUST render the four role pills under/beside a visible **"Partner role"** label and separated from the "Institution type" line by a visible divider (vertical hairline in the wide layout; horizontal when the row stacks), in **both** partner blocks.
- **`PRS-R-2`** The typology line MUST read as read-only metadata (muted style), and behavior MUST NOT change: same click handlers, tooltips, active state, read-only collapse (only selected pills in QA mode) and delete icon; payload and completeness validation untouched.
- **`PRS-R-3`** The pills group MUST expose `role="group"` with `aria-label="Partner role in delivering the result"`, and each pill `aria-pressed` reflecting its active state.

### Scenario — main (PRS-R-1/2)
- GIVEN a partner selected in "Other(s) External Partners" (edit mode)
- WHEN the row renders
- THEN the "Partner role" label and a divider separate the pills from "Institution type: …"
- AND clicking "Scaling" still calls `onSelectDeliveryPartners(option, 1)` and toggles `active`
- BUT it must NOT alter what is emitted/persisted (delivery ids 1–4) nor the `appFeedbackValidation` completeness rule
- AND IT MUST render identically in the ToC-partners block.

### Scenario — read-only (PRS-R-2)
- GIVEN QA read-only mode with one selected role
- WHEN the row renders
- THEN only the selected pill shows, under the same label, with no orphan divider artifacts.

## Defect classes → gates
| Class | Gate |
|---|---|
| Handler/behavior regression | Scoped Jest `rd-contributors-and-partners` (existing suite) + new DOM tests |
| Label/divider missing in one of the 2 blocks | New DOM test iterating both blocks |
| Visual quality (spacing, divider contrast, wrap) | **No automated gate** — HITL screenshot check vs `mockup/` (accepted) |

## Open questions — none (OQ-1/OQ-2 resolved in proposal).

# Requirements — Decouple Lead Center From The External-Partner Toggle

## 1. Module / Feature

- **Module:** `results` (Result Detail → Contributors and Partners, P25)
- **Sub-feature:** `lead-center-decouple`
- **Owner:** Santiago Sánchez
- **Status:** draft
- **Depth:** Lite — narrow UI/logic split confined to one page module, no new module/entity/endpoint.
- **Ticket(s):** none provided

---

## 2. Context

`rd-contributors-and-partners` (P25-only, `/result/result-detail/:id/contributor-partners`) gates
Lead Center and Lead Partner behind one Yes/No toggle ("Is this result being led by an external
partner?"): Yes shows the partner dropdown, No shows the center dropdown — never both. This means
a result can be saved with **no lead center of record** whenever the toggle is "Yes", even though
the project's own baseline treats a lead contributing center as load-bearing (`docs/prd.md` AC-6:
submission MUST validate "at least one contributing center with `is_lead=true`").

The requested change: split the two into independent questions. Lead Center becomes always-visible
and always-required, relocated directly under "Contributing CGIAR Centers". Lead Partner keeps its
current position and its existing Yes/No gate unchanged. See
`docs/specs/changes/lead-center-decouple/proposal.md` for the full options analysis (Option A
chosen).

Confirmed with the requester (2026-08-31): once Lead Center is always required, existing P25
results saved via the old "Yes" (partner) path will show as incomplete until a Lead Center is
picked on next edit — **this is intended, no backfill/migration is in scope.** Field labels/copy
stay as they already are — "Lead center" as its own field, "Is this result being led by an
external partner?" as its own separate question — no wording change requested.

---

## 3. In Scope / Out of Scope

### In scope

- Relocate the Lead Center field to directly below "Contributing CGIAR Centers", always rendered,
  always `required`.
- Remove the mutual exclusivity between Lead Center and Lead Partner in both the template and
  `onSaveSection()`.
- Keep the Lead Partner Yes/No toggle and dropdown in their current position and behavior.
- Split the shared `getMessageLead()` alert text into two independent, field-specific messages;
  drop the stale "already added in this section" claim from the Lead Center message (false since
  `LC-DD-1` — the dropdown is the full CLARISA catalog).
- P25 only (component is already portfolio-exclusive to P25 by routing — no gating code needed).

### Out of scope

- The P22 `rd-partners` component/flow (untouched).
- Sourcing of `possibleLeadCenters` (still the full CLARISA catalog, `LC-DD-1`).
- The Contributing CGIAR Centers minimum-count guard (`toc-center-guard`, archived).
- The auto-add-to-Contributing-Centers side effect on Lead Center selection (`onLeadCenterSelected`,
  `LC-DD-5`) — must keep working, not being redesigned.
- Any backend/API contract change — no new fields identified; payload fields already support both
  a lead center and a lead partner being set independently.
- Backfilling or migrating existing results left without a lead center.

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter (P25) | Sees Lead Center as its own always-required field under Contributing CGIAR Centers; can also independently mark an external partner as lead via the unchanged Yes/No toggle. Cannot submit without picking a Lead Center. |
| QA reviewer | Reviews results that may now show both a lead center and a lead partner. |

---

## 5. User Stories

- **`LCD-US-1`** — As a result submitter, I want Lead Center to always be visible and required
  under Contributing CGIAR Centers, so that every P25 result always records the CG Center leading
  it, independent of whether it is also led by an external partner.
- **`LCD-US-2`** — As a result submitter, I want the "led by an external partner" Yes/No question
  and its Lead Partner dropdown to keep working exactly as they do today, so that nothing I already
  rely on changes.

Refines `docs/prd.md` AC-6 (contributing-center-lead invariant at submission).

---

## 6. Functional Requirements

### Required (MUST)

- **`LCD-R-1`** The system MUST render the Lead Center field (`app-pr-select`, `leadCenterCode`,
  `possibleLeadCenters`) unconditionally — not gated by `is_lead_by_partner` — directly below the
  Contributing CGIAR Centers block and above the P2-3171 external-partners note.
- **`LCD-R-2`** The Lead Center field MUST always be `required`, independent of `is_lead_by_partner`.
- **`LCD-R-3`** The "Is this result being led by an external partner?" toggle and its Lead Partner
  dropdown (`leadPartnerId`, `possibleLeadPartners`) MUST keep their current screen position and
  their current Yes/No visibility/required behavior unchanged.
- **`LCD-R-4`** On save, `contributing_center[].is_leading_result` MUST be set from `leadCenterCode`
  unconditionally (no longer forced `false` when `is_lead_by_partner` is `true`).
- **`LCD-R-5`** On save, `institutions[]`/`mqap_institutions[].is_leading_result` MUST be set from
  `leadPartnerId` only when `is_lead_by_partner` is `true`, and forced `false` otherwise — same
  behavior as today, just no longer coupled to Lead Center's own state.
- **`LCD-R-6`** A result MUST be saveable with both a Lead Center and a Lead Partner set
  simultaneously.
- **`LCD-R-7`** The Lead Center alert message MUST NOT claim the dropdown is limited to centers
  "already added in this section" (stale since `LC-DD-1`).

### Should (SHOULD)

- **`LCD-R-10`** The existing `LC-DD-5` auto-add-to-Contributing-Centers side effect on Lead Center
  selection SHOULD continue to fire identically now that the field renders unconditionally.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Backwards compatibility** | Existing PATCH payload shape is unchanged (same fields, same arrays) — only which combinations of `is_leading_result` flags are reachable changes. No API/DTO change identified. |
| **Accessibility** | Relocated field keeps its existing `app-pr-select` labeling/`aria` wiring — no regression. |
| **Internationalization** | No new hardcoded English introduced beyond what already exists in `getMessageLead()`'s split messages (matches existing precedent of plain hardcoded alert strings in this file, e.g. `noScienceProgramsNote`). |
| **Test coverage** | `rd-contributors-and-partners/` is excluded from the Jest coverage threshold (project convention) — Jest specs + the existing Cypress E2E suite are the actual gate, not the coverage percentage. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `LCD-AC-1` | A P25 result on Contributors and Partners, any state of `is_lead_by_partner` | The user opens the section | The Lead Center field renders directly below Contributing CGIAR Centers, unconditionally, marked required. |
| `LCD-AC-2` | A P25 result with `is_lead_by_partner = true` and a Lead Partner already selected | The user also selects a Lead Center and saves | The PATCH payload has the selected center's `is_leading_result = true` AND the selected partner's `is_leading_result = true` — both, not mutually exclusive. |
| `LCD-AC-3` | A P25 result with `is_lead_by_partner = false` (default) | The user saves without selecting a Lead Center | The required-field validation blocks save (Lead Center is mandatory regardless of the toggle). |
| `LCD-AC-4` | A P25 result with `is_lead_by_partner = false` | The user toggles to "No" (or leaves default) | The Lead Partner dropdown stays hidden and unset, exactly as today — BUT the Lead Center field remains visible/required regardless of this toggle's value. |
| `LCD-AC-5` | A P25 result, Lead Center dropdown open | The user reads the field's alert message | The message no longer states centers are limited to ones "already added in this section". |
| `LCD-AC-6` | A P25 result with no prior Contributing Centers, user picks a Lead Center not yet in that list | The user selects it | `LC-DD-5`'s auto-add-to-Contributing-Centers behavior still fires (center appears as a Contributing Center chip). |

Cross-cutting: `AC-6` (Typed result / contributing-center-lead invariant) — this spec makes that
invariant enforceable at the UI layer for every P25 result, not only when `is_lead_by_partner` is
`false`.

**Defect classes this spec can produce, and their gate:**

| Defect class | Gate |
|---|---|
| Lead Center not always required / visible | `LCD-AC-1`, `LCD-AC-3` — Jest render assertions on `[required]` + template presence (no `*ngIf`) |
| Save payload still mutually-exclusive | `LCD-AC-2` — Jest unit test on `onSaveSection()` asserting both flags land `true` in the same call |
| Lead Partner toggle regression | `LCD-AC-4` — existing Cypress `contributors-and-partners.cy.ts` / `save-validation.cy.ts` flows re-run unchanged |
| Auto-add side effect broken by unconditional rendering | `LCD-AC-6` — existing `LC-T-4` Jest describe extended for the new render path |
| Stale alert copy | `LCD-AC-5` — Jest string assertion; no automated check can judge "is this good copy," so acceptance is a human read at the requirements/design HITL pause (already covered by this review) |

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- `docs/specs/bugfix/lead-center-full-catalog` (`LC-DD-1..5`) — full-catalog sourcing and
  auto-add wiring for Lead Center; this spec builds on it without modifying it.
- `docs/specs/archive/2026-08-29-changes--toc-center-guard/` — Contributing CGIAR Centers
  minimum-count guard; unaffected (different arrays, no coupling).

### Downstream consumers

- None identified — no other module reads `is_lead_by_partner` combined with center/partner
  `is_leading_result` in a way that assumes mutual exclusivity (not found via grep across
  `onecgiar-pr-server/` or other client pages).

### Assumptions

- The backend PATCH endpoint already accepts a payload where both a center row and a
  partner/institution row carry `is_leading_result: true` in the same request — this spec does not
  add new payload fields, only stops the frontend from force-zeroing one side. To be confirmed
  during design/implementation against the actual server DTO validation (not just the current
  frontend behavior).
- No backfill/migration for existing results left without a lead center — confirmed out of scope
  by the requester.

---

## 10. Open Questions

None outstanding — the two open items from `proposal.md` §12 were resolved by the requester
(2026-08-31): no backfill needed; field/question copy stays as-is (no wording change requested).

---

## 11. Out-of-Band Notes

- This folder's `CLAUDE.md` (`onecgiar-pr-client/.../rd-contributors-and-partners/CLAUDE.md`) MUST
  be updated and re-stamped with the landed commit hash in the same commit as the implementation,
  per `docs/COMPONENT-DOCS.md` convention — it currently documents the mutually-exclusive Lead
  Center/Partner behavior this spec removes.

---

## Required cross-references

- `docs/prd.md` — AC-6 (contributing-center-lead invariant).
- `docs/ux-ui/design.md` — no specific screen/flow entry found for this field; the relocation
  follows the existing page's field-ordering convention (no token/pattern change).
- `docs/trd/trd.md` — §6 Frontend Architecture (`onecgiar-pr-client/src/app/pages/results/...`);
  no data-model/API section changes.
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md`
  — in-tree component doc, source of the `is_lead_by_partner` mutual-exclusivity history this
  spec supersedes.

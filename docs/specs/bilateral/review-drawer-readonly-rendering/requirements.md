# Requirements — `bilateral/review-drawer-readonly-rendering`

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/review-drawer-readonly-rendering/` |
| Depth | **Lite** |
| Type | Enhancement (UX completion of a deliberately deferred half of P2-3154) |
| Status | approved |
| Approval Mode | `pre-approved` |
| Proposal | none — specified directly from the user request of 2026-09-21 |
| Parent work | `docs/specs/archive/2026-09-08-changes--sp-bilateral-review-tab/` (P2-3154) |
| Baseline | `docs/trd/trd.md`, `docs/ux-ui/design.md` |
| Verified at | `ecff181aa` |

## 2. Executive Summary

The bilateral Review drawer already **enforces** that a Science Program reviewer may only edit
Theory of Change Alignment — cards 2–4 (Data Standards, Collaboration & Evidence, result-type
content) are functionally locked and carry a `🔒 Center-reported (Read-only)` badge.

What is missing is that the locked fields **still look like form controls**. They are passed
`[disabled]`, which makes them inert but leaves them rendered as greyed inputs, textareas and
selects. The `pr-*` controls have a real read-only rendering mode, but it is keyed on `readOnly`,
never on `disabled` — so the drawer never reaches it.

This spec closes only that gap: locked fields must **render as read-only text**. No permission,
role, or policy changes. The Platform Admin bypass stays exactly as P2-3154 defined it.

## 3. Glossary

| Term | Meaning |
|---|---|
| Drawer | `result-review-drawer` — the panel opened by the `Review` row action |
| Card 1 | Theory of Change Alignment — the Program's exclusive responsibility, stays editable |
| Cards 2–4 | Data Standards & Geographic Scope · Collaboration & Evidence · result-type content |
| SP reviewer | Science Program member for the entity, `canEditInDrawer()` true, `isAdmin` false |
| Read-only rendering | The `pr-*` branch that paints the value as text instead of a form control |
| Inert control | A control that blocks input but still renders as a form field |

## 4. System Context & Scope

**Current behavior** (each claim carries its evidence; premises the design depends on are rows of
the Premise Ledger in `design.md` §11):

- `canEditDataStandards()` returns true for Platform Admin only —
  `result-review-drawer.component.ts:231`. For an SP reviewer, cards 2–4 are already locked at the
  UI *and* at the method level (`startEditingTitle():453`, `onSaveDataStandardChanges():548`).
- `pr-textarea`, `pr-input` and `pr-select` choose their read-only branch from
  `(readOnly() || rolesSE.readOnly) && !isStatic()` — `disabled()` is not consulted
  (`pr-textarea.component.html:14`, `pr-input.component.html:27`, `pr-select.component.html:19`).
- The drawer forces `rolesSE.readOnly = false` while open for anyone who passes `canEditInDrawer()`
  (`result-review-drawer.component.ts:1003`), so the global fallback cannot supply the read-only
  branch either.
- `pr-multi-select` and `geoscope-management` in cards 2–4 are **already** passed `[readOnly]` and
  are out of scope.
- `pr-radio-button` already paints `block-field` from `disabled`
  (`pr-radio-button.component.html:52`) and `pr-range-level` already paints `prl--disabled`
  (`pr-range-level.component.html:3`); both are out of scope.

**In scope:** adding the read-only rendering signal to the `pr-input` / `pr-textarea` / `pr-select`
instances in cards 2–4 of the drawer and its four result-type content children.

**Out of scope:** role logic, `canEditInDrawer()`, `canEditDataStandards()`, the admin bypass, the
`rolesSE.readOnly` flip, card 1, the footer, the save/approve/reject flows, server behavior.

## 5. Stakeholders / Personas

| Persona | Interest |
|---|---|
| Science Program reviewer | Must see at a glance which fields are theirs to change. Today every locked field invites an edit that silently does nothing |
| Platform Admin | Must keep full editing of Data Standards — unchanged by this spec |
| Center submitter | Their reported data must remain visibly attributed to them and unchanged |

## 6. Functional Requirements

### RDR-R-1 — Locked fields render as read-only text

The drawer SHALL render every locked `pr-input`, `pr-textarea` and `pr-select` in cards 2–4 in its
read-only text branch, not as an inert form control.

#### Scenario: SP reviewer opens a pending result

- GIVEN a user who is a Science Program member for the entity and is **not** a Platform Admin
- AND a bilateral result with `status_id == 5` open in the Review drawer
- WHEN cards 2–4 have finished loading
- THEN every `pr-input`, `pr-textarea` and `pr-select` in those cards paints its value as text
- AND no `<input>`, `<textarea>` or `a.field` select trigger is rendered for those fields
- BUT it must NOT change what card 1 (Theory of Change Alignment) renders — its controls stay
  operable
- AND IT MUST leave the existing `🔒 Center-reported (Read-only)` badges in place

#### Scenario: field with no value

- GIVEN the same reviewer
- WHEN a locked field has no value
- THEN the read-only branch shows the control's own absent-value text (`Not applicable`, or
  `Not provided` when the field is required)
- BUT it must NOT render an empty editable control instead

### RDR-R-2 — Platform Admin editing is unchanged

The drawer SHALL continue to render cards 2–4 as fully editable for a Platform Admin.

#### Scenario: admin opens the same result

- GIVEN a Platform Admin
- WHEN the drawer opens on any result
- THEN the title pencil, every card 2–4 control and the `Save Data Standards` button behave exactly
  as they do today
- AND IT MUST be true that no role predicate, gate or method guard was modified by this spec

### RDR-R-3 — The sweep is complete

Every in-scope control SHALL carry the read-only signal; a missed one is a defect.

#### Scenario: invariant holds across all five templates

- GIVEN the drawer template and the four `*-content` templates
- WHEN each `pr-input` / `pr-textarea` / `pr-select` element that carries a lock-driven `[disabled]`
  binding is inspected
- THEN each also carries a `[readOnly]` binding driven by the same predicate
- BUT it must NOT add `[readOnly]` to card 1 controls, to buttons, or to dialog controls
- AND IT MUST leave the existing `[disabled]` bindings in place, so the functional block is never
  weakened by this change

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| RDR-NFR-1 | No change to any network call, payload or save path |
| RDR-NFR-2 | No new design token. The read-only appearance is the one `pr-*` already ships |
| RDR-NFR-3 | Client lint and `tsc --noEmit` stay clean |
| RDR-NFR-4 | No regression in the existing bilateral-review Jest and Cypress CT suites |

## 8. Defect classes this spec can produce → gate

| # | Defect class | Gate | Automated? |
|---|---|---|---|
| D1 | A control is missed by the sweep and still renders editable | `RDR-T-1` static invariant test over the five real template files | Yes |
| D2 | `[readOnly]` is added but the control still renders a form field (wrong input name, `editable` override, `isStatic`) | `RDR-T-2` Cypress CT mounting the real child component and asserting zero operable controls | Yes |
| D3 | The sweep over-reaches and locks a card 1 control or a button | `RDR-T-1` asserts card 1 and button bindings are untouched; `git diff` line count | Yes |
| D4 | A read-only branch renders the wrong value (number formatting, async option list not yet loaded so a `pr-select` shows `Not provided`) | **No automated gate.** jsdom does not render these templates (both specs use `overrideComponent({ template: '' })`) and the CT uses static fixtures, not the live option catalogs. **Substitute: the HITL browser check in `tasks.md` §4, on a real SP-reviewer session.** |
| D5 | Existing suites regress | Targeted Jest + module CT + `tsc --noEmit` + `ng lint` | Yes |

**D4 is the accepted blind spot of this spec.** The `pr-select` read-only branch resolves its label
through `optionsIntance() | labelName`, so a value whose option catalog has not loaded paints
`Not provided` rather than the stored label. No harness in this repo loads those catalogs, so this
class is verified by a human at the HITL pause and by nothing else. It is recorded here rather than
left implicit.

## 9. Requirement ID Index

| ID | Title | Covered by |
|---|---|---|
| RDR-R-1 | Locked fields render as read-only text | `RDR-T-1` (sweep), `RDR-T-2` (rendered proof) |
| RDR-R-1 sc.1 | SP reviewer opens a pending result | `RDR-T-2` |
| RDR-R-1 sc.1 `BUT` | card 1 untouched | `RDR-T-1` |
| RDR-R-1 sc.1 `AND IT MUST` | badges stay | `RDR-T-1` |
| RDR-R-1 sc.2 | field with no value | `RDR-T-2` |
| RDR-R-1 sc.2 `BUT` | no empty editable control | `RDR-T-2` |
| RDR-R-2 | Admin editing unchanged | `RDR-T-1` (no `.ts` in diff), HITL |
| RDR-R-2 `AND IT MUST` | no gate modified | `RDR-T-1` Disqualifier |
| RDR-R-3 | Sweep is complete | `RDR-T-1` |
| RDR-R-3 `BUT` | no over-reach | `RDR-T-1` |
| RDR-R-3 `AND IT MUST` | `[disabled]` retained | `RDR-T-1` |
| RDR-NFR-1..4 | — | `RDR-T-1` / `RDR-T-2` verification commands |

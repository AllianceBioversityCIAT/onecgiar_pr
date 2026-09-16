# Requirements — ToC HLO/Outcome selector must stay editable (Bug, Lite)

## 1. Module / Feature

- **Module:** `results` (Contributors & Partners section)
- **Sub-feature:** ToC Level / HLO / Outcome / Output selectors in `rd-contributors-and-partners`
- **Owner:** santiago.sanchez@cgiar.org (reported by Angel Jarrin, result #28923)
- **Status:** draft
- **Ticket(s):** none yet — originates from `bugfix/toc-hlo-outcome-locked/proposal.md`

## 2. Context

`CPMultipleWPsContentComponent.tocAlignmentReadOnly()` (P2-3235) locks the "Level" and node
(HLO/Intermediate Outcome/2030 Outcome/Output) selects as read-only once a 2026-phase, planned,
ToC-mapped tab already has both `toc_level_id` and `toc_result_id` set. The user (PO) has now
explicitly decided this must revert: these fields must remain an always-editable dropdown, same as
before P2-3235. Confirmed root cause: see `proposal.md` §4.

## 3. In Scope / Out of Scope

### In scope
- Remove the `tocAlignmentReadOnly()` gate from the Level select and all three per-level node
  selects (`multiple-wps-content.component.html`).
- Keep every other `editable`/role-based read-only rule on these controls untouched (i.e. a
  read-only user, or `editable=false` from the parent, must still see them non-editable — only the
  ToC-alignment-specific lock goes away).

### Out of scope
- Any change to how the Results Framework/AOW module writes `toc_level_id`/`toc_result_id` at
  result creation.
- Re-introducing any UI difference for "unplanned" tabs (already always editable, untouched).
- The `family.md`/parent-spec split — this is a single, bounded fix.

## 4. Functional Requirements

### Required (MUST)

- **BUG-R-1** The system MUST allow a user with `editable=true` and normal (non-read-only) role to
  change the "Level" select and the corresponding node select (HLO/Output, Intermediate Outcome,
  2030 Outcome) at any time, including when the tab already has both `toc_level_id` and
  `toc_result_id` set on a 2026-phase, planned result.

#### Scenario: Re-selecting an already-mapped HLO on a 2026 planned result

- GIVEN a 2026-phase, planned result whose Contributors & Partners tab already has
  `toc_level_id` and `toc_result_id` set (e.g. result 28923, phase 8)
- AND the current user is not read-only and the section is `editable`
- WHEN they open the "Level" or the node ("High Level Output"/Outcome/Output) dropdown
- THEN the dropdown opens and accepts a different selection
- AND the new selection is reflected in `activeTab.toc_level_id` / `activeTab.toc_result_id`
  exactly as it was before P2-3235
- BUT a read-only user, or a section rendered with `editable=false`, MUST still see these fields
  as non-editable (unrelated existing rule, unaffected by this fix)

- **BUG-R-2** The system MUST NOT reintroduce any other behavior change from P2-3235's removal —
  i.e., `tocAlignmentReadOnly()` (or its removal) MUST NOT affect any other field, tab, or
  computed value in this component (`hloStatementValue`, `syncTocReferenceIds`, indicator
  selection, etc. keep working exactly as today).

## 5. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Backwards compatibility | No change to the PATCH payload shape or any other field's contract. |
| Regression safety | The Level/node selects must not silently desync `syncTocReferenceIds`'s reference sets — those already recompute on `selectionVersion`/list changes, unaffected by this fix. |

## 6. Defect Classes This Spec Can Produce → Gate

| Defect class | Caught by |
|---|---|
| Lock not actually removed (fields still disabled in the described state) | Regression test (Jest) asserting `tocAlignmentReadOnly()`-driven bindings no longer disable the controls in that state |
| Removing the lock breaks an unrelated computed/effect in the same file (`syncTocReferenceIds`, `hloStatementValue`) | Existing component spec suite for `multiple-wps-content.component.spec.ts` — must stay green, no new failures |
| Read-only role / `editable=false` accidentally stops gating these fields (over-fix) | Regression test asserting these two existing gates still disable the controls independent of `tocAlignmentReadOnly` |

## 7. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| BUG-AC-1 | 2026-phase, planned, ToC-mapped tab (`toc_level_id` + `toc_result_id` set), editable, non-read-only | User opens Level or node dropdown | Dropdown is enabled and a new selection is accepted |
| BUG-AC-2 | Same tab state, but `editable=false` (parent gate) | User looks at the fields | Fields remain non-editable (existing rule, unaffected) |

## 8. Dependencies & Assumptions

- No upstream/downstream module change — purely `multiple-wps-content.component.ts`/`.html`.
- Assumes the PO's decision (recorded in `proposal.md` §11) stands as final; no further
  confirmation needed before implementing.

## 9. Open Questions

None — the user's answer to the fix-strategy question closed the only open question from
`proposal.md` (Option A vs B).

## Required cross-references

- `proposal.md` (this spec path) — Bug Diagnosis, confirmed root cause, and the user's explicit
  decision to revert the P2-3235 lock.
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md` — P2-3235 history section (context on why the lock existed).

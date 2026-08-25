## Why

**Frontend-only change. No backend work is required.** Jira: **P2-3358** (epic P2-3243 — SIDS Forms Update W1/W2).

Section 2 (Contributors and Partners) asks whether the result is linked or bundled with another CGIAR-reported result. Today that question is **not the same for every result typology**: Innovation use and Innovation development read one wording, Policy change has its own separate question, and the remaining typologies read a third copy of the first one. The sentence lives in two different source files, which is exactly how the wordings drifted apart.

Business (Nicoleta Trifa, CGIAR System Organization, 3–17 Aug 2026) confirmed the wording must be broad enough to cover all result categories, and the PO (Andres Jarrin) decided there will be **one single question for all typologies, Policy change included**. The Policy-change-specific wording is retired, not kept as a variant.

## What Changes

- The linked/bundled question reads the same approved sentence for **all nine result typologies**: _"Is this result linked or bundled with another CGIAR-reported result (such as innovation, KP, policy, etc.)?"_
- **BREAKING (copy only):** the Policy-change-specific question _"Have other reported results contributed to this policy change?…"_ is removed. No typology keeps a variant.
- The change is `innovation` → `result` **plus** the new parenthetical — not only the parenthetical. An earlier version of the ticket recorded the current text incorrectly; the code says "Is this **innovation** linked or bundled…".
- The header rendered above the question on `performance-refactor` (introduced by P2-3201, never released to production) is **removed** by PO decision: it nearly duplicates the new question, and its "(for innovations)" qualifier contradicts the purpose of making the question general.
- The helpers that existed only to branch on Policy change (`isPolicyChangeResult()`, `POLICY_CHANGE_RESULT_TYPE_ID`, `showLinkedResultHeader()`) lose all their usages and are removed rather than left orphaned.
- No change to stored data, to the YES/NO behaviour, or to the linked-results dropdown.

## Capabilities

### New Capabilities
- `linked-bundled-result-question`: the single linked/bundled question shown in Section 2 for every result typology — its wording, the absence of a per-typology variant, and the absence of a header above it.

### Modified Capabilities
<!-- None. `results-toc-reporting-adjustments` covers other Contributors & Partners copy (the ToC info note); this change does not alter any of its requirements. -->

## Impact

**Code (client only):**
- `src/app/shared/services/fields-manager.service.ts:182` — key `[innovation-use-form]-has-innovation-link`; serves result types 2 (Innovation use) and 7 (Innovation development).
- `src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.ts:227, 229-230, 241-242, 248-249` — the Policy-change branch, the label computed and the header.
- `…/rd-contributors-and-partners.component.html:443` — the `app-pr-field-header` being removed.
- `…/rd-contributors-and-partners.component.spec.ts:454-475` — three assertions on the old strings.

**Backend:** none. The sentence has no occurrence in `onecgiar-pr-server`. The stored contract (`has_innovation_link` boolean + `linked_results`) is untouched, so there is no endpoint, entity or migration in scope.

**Phase scope:** documented exception to the epic's governing rule (2026-onwards only, previous phases untouched). The label is a pure presentation string: the fields-manager entry carries `hide: this.isP22()` and the other branch renders under `isCP2026()`, so the question is already 2026-only on every surface. There is no previous-phase rendering to preserve.

**Verification that code inspection cannot settle:** the PDF and Excel exports. The sentence does not exist anywhere in the server code, so both must be generated from a 2026 result and read.

**SDD baseline:** `docs/system-design/design.md` (UI copy and section layout), `docs/detailed-design/detailed-design.md` (client state and the Contributors & Partners module). No module spec under `docs/specs/` currently covers this question.

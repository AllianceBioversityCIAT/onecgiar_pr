# Evidence Modal Sticky Actions — `requirements.md` (Lite · Bug Mode)

## 1. Module / Feature

- **Module:** `results` → `result-detail/rd-evidences`
- **Sub-feature:** Evidence create/edit popup (`app-pr-dialog` + `.evidence_modal`)
- **Owner:** —
- **Status:** draft
- **Ticket(s):** — (user-reported, no ticket)
- **Type:** Bug

## 2. Context

The "Add/Edit Evidence" popup on Result Detail → Evidences puts its title/close (`.modal_header`), the embedded evidence form, and its Cancel/Add-evidence footer (`.buttons`) inside **one** scrolling container (`rd-evidences.component.scss:210-216`, `.evidence_modal { max-height: 85vh; overflow-y: auto }`), itself nested inside the generic dialog shell's own scroll cap (`pr-dialog.component.scss:17-27`, `.pr-dialog { max-height: 90vh; overflow: auto }`). Neither the header nor the footer is pinned. On a laptop-class viewport with reduced effective height (reported: ~1350px wide, Lenovo T14s), the form content exceeds `85vh`, so scrolling to the fields carries the title/close and Cancel/Add-evidence buttons out of view — see `docs/specs/bugfix/evidence-modal-sticky-actions/proposal.md` for the full diagnosis, screenshot reference, and root cause.

This violates the app's own documented rule (`onecgiar-pr-client/CLAUDE.md`, hard UI rule #3): *"One vertical scroll per view. The drawer's header and footer are sticky; only its body scrolls."*

## 3. In Scope / Out of Scope

### In scope
- Keep `.modal_header` (title + close ✕) and `.buttons` (Cancel / Add evidence / Save changes) visible at all times inside the evidence create/edit popup, regardless of viewport height.
- Only the form fields (the embedded `<app-evidence-item>`) scroll when they don't fit.

### Out of scope
- Any change to the evidence form fields' content, validation, or the `evidence-item` component itself.
- The shared `pr-dialog.component.ts/scss` primitive's contract for its other consumers — the fix stays scoped to `rd-evidences.component.scss` (Option A from the proposal). If a broader `pr-dialog` fix is later warranted, that is a separate follow-up spec.
- The unrelated `bugfix/reporting-table-actions-clipped` clipping issue in the Reporting tab table.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Can always see and reach the evidence popup's title/close and Save/Cancel actions on a laptop-class screen, without needing to discover an inner scroll first. |

## 5. User Stories

- **`EVM-US-1`** — As a result submitter on a laptop-class screen, I want the evidence popup's header and action buttons to stay visible while I scroll the form, so that I can always find "Cancel" or "Add evidence" without hunting for them.

## 6. Functional Requirements

### Required (MUST)

- **`EVM-R-1`** The evidence create/edit popup (`app-pr-dialog` + `.evidence_modal` in `rd-evidences.component.html`) MUST keep `.modal_header` (title + close ✕) visible and reachable at all times while the popup is open, at any viewport height that forces the form body to scroll.
- **`EVM-R-2`** The evidence create/edit popup MUST keep `.buttons` (Cancel and Add evidence / Save changes) visible and clickable at all times while the popup is open, at any viewport height that forces the form body to scroll.
- **`EVM-R-3`** Only the embedded evidence form (`<app-evidence-item>`) MAY scroll internally when its content exceeds the space available between the fixed header and footer; the popup MUST NOT introduce a second, independently-scrolling outer region that also hides the header or footer (per the "one vertical scroll per view" rule).

### Scenario: Constrained popup height — header and footer stay put

- **`EVM-R-1`, `EVM-R-2`, `EVM-R-3`**
- GIVEN a result's Evidences section is open and the "Add evidence" popup is triggered
- AND the browser viewport is constrained enough that the popup's full content (header + form fields + footer) exceeds the available height (e.g. ~1350px wide × ~800px tall, or shorter)
- WHEN the user scrolls within the popup to reach a field further down the form
- THEN `.modal_header` (title text and the close ✕ button) remains visible and in the viewport at all times
- AND `.buttons` (Cancel and Add evidence / Save changes) remains visible and clickable at all times
- BUT the header and footer MUST NOT scroll out of view together with the form fields
- AND IT MUST be true for both the "Add New Evidence" flow and the "Edit Evidence" flow (same modal, same `showCreateModal` binding)

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Accessibility** | The sticky header's close ✕ and the sticky footer's buttons MUST remain keyboard-reachable (tab order unaffected) and have a fully opaque background so scrolling content never bleeds through and reduces contrast below WCAG AA. |
| **Responsive** | Fix MUST hold at common laptop widths/heights (~1350×800 and shorter) and MUST NOT regress the existing wider/taller-viewport rendering of the same popup. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `EVM-AC-1` | The evidence popup is open at a constrained viewport height that forces the form to scroll | The user scrolls the form to a lower field | `.modal_header` and `.buttons` remain in the viewport with a non-zero, fully-opaque bounding box |
| `EVM-AC-2` | The evidence popup is open at the pre-fix baseline size (no scrolling needed) | The popup renders | Visual layout is unchanged from before the fix (no regression at the common case) |

## 9. Dependencies & Assumptions

### Upstream dependencies
- `onecgiar-pr-client/src/app/shared/components/pr-dialog/` — the generic dialog shell this popup is built on (not modified by this fix; see Out of Scope).

### Downstream consumers
- None beyond `rd-evidences.component.html`/`.scss`.

### Assumptions
- Root cause was confirmed via static code analysis (see proposal's caveat: `prtest.ciat.cgiar.org` was unreachable from the diagnosing session's sandboxed browser). One live check at the target viewport during task verification is expected to close this gap.

## 10. Open Questions

- `EVM-OQ-1` — Does the same header/footer-not-sticky pattern exist in other `app-pr-dialog` consumers across the app? Out of scope for this fix (see In Scope/Out of Scope); flagged for a possible follow-up spec, not blocking here.

## 11. Out-of-Band Notes

None.

## Required cross-references

- `docs/specs/bugfix/evidence-modal-sticky-actions/proposal.md` (Bug Diagnosis, root cause, screenshot reference).
- `onecgiar-pr-client/CLAUDE.md` — Hard UI rules (redesign surfaces) §Structure rule 3 (sticky header/footer, one scroll per view).
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/CLAUDE.md`.

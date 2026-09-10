# Evidence Modal Sticky Actions — `design.md` (Lite · Bug Mode)

Links: `docs/specs/bugfix/evidence-modal-sticky-actions/requirements.md`, `docs/specs/bugfix/evidence-modal-sticky-actions/proposal.md`, `onecgiar-pr-client/CLAUDE.md` (hard UI rule #3).

## 1. Summary

Split `.evidence_modal`'s single scrolling flex column into a fixed header, a scrolling body, and a fixed footer using `position: sticky`, entirely inside `rd-evidences.component.scss`. No change to `pr-dialog.component.ts/scss` or to the evidence form fields. Biggest constraint accepted: the outer `.pr-dialog` still has its own `max-height: 90vh; overflow: auto` cap (Option A from the proposal keeps this — see DD-1), so the fix relies on `.evidence_modal` remaining the effective scrolling ancestor in practice.

## 2. Architecture Overview

- **Client modules touched:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/` only (`rd-evidences.component.scss`, and `rd-evidences.component.html` if the sticky footer needs a wrapping element the current markup doesn't provide).
- **No server, no data model, no API changes.**

### Flow (CSS-only, no interaction sequence needed)

```
app-pr-dialog (.pr-dialog, max-height:90vh, overflow:auto)
  └── .pr-dialog__body
        └── .evidence_modal (flex column)
              ├── .modal_header      ← becomes position: sticky; top: 0; z-index above body; opaque bg
              ├── app-evidence-item  ← the ONLY element that scrolls (new: wrapped or itself capped + overflow-y:auto)
              └── .buttons           ← becomes position: sticky; bottom: 0; z-index above body; opaque bg
```

## 3. Data Model Changes

None.

## 4. API Surface

None.

## 5. Server Workflow / Business Rules

None — client-only CSS/markup fix.

## 6. Frontend Plan

### 6.1 Routes / modules
No routing change. Existing route: `result/result-detail/:id/evidences`.

### 6.2 Components & services
- `rd-evidences.component.scss` — restructure `.evidence_modal` (see DD-1).
- `rd-evidences.component.html` — no structural change expected if a CSS-only sticky approach works cleanly on the existing three direct children (`.modal_header`, `<app-evidence-item>`, `.buttons`); if the evidence-item's own root element resists being the scroll container cleanly, wrap it in a new `.modal_body` `<div>` in the template (see DD-2 fallback).

### 6.3 Design system usage
- No new tokens. Reuse `var(--pr-color-white)` (already used elsewhere in this file) for the sticky header/footer backgrounds so nothing renders transparent.
- No new Tailwind utilities needed — this file is legacy SCSS (component predates the Tailwind-first rule); keep the fix in the same SCSS file rather than migrating unrelated code, per "don't add to legacy SCSS beyond what's needed."
- A11y: `.modal_header`'s close ✕ and `.buttons`' Cancel/Add-evidence stay in the same DOM order (sticky positioning doesn't reorder the DOM or tab order).

### 6.4 Real-time / notification UX
None.

## 7. Security & Authorization

None — no auth/data surface touched.

## 8. Performance & Capacity

Negligible — `position: sticky` is a compositor-cheap CSS property; no new JS, no new reflows beyond the existing scroll.

## 9. Observability

None needed for a CSS layout fix.

## 10. Testing Plan (forward-looking)

- **Unit/component (Jest or Cypress CT, per what `rd-evidences.component.spec.ts` already uses):** assert `.modal_header` and `.buttons` have `position: sticky` (or, better, assert their computed bounding box stays within the popup's visible viewport bounds) when the popup's container is constrained to a height shorter than the form's natural content height.
- This is the **regression test required by Bug Mode**: it must fail against the current code (header/footer scroll away) and pass after the fix.
- Manual/visual check at ~1350×800 in a real browser is still recommended (per the proposal's caveat that root cause was confirmed by static analysis, not live reproduction) — flagged as a task, not a blocking automated gate, since jsdom/Jest cannot fully evaluate real sticky-scroll rendering.

## 11. Backwards Compatibility & Migration Plan

Not applicable — no schema, no API, no flag. Pure CSS/markup change, immediately effective on deploy.

## 12. Design Decisions (ADRs)

### `EVM-DD-1` — Sticky header/footer scoped to `rd-evidences.component.scss`, not `pr-dialog`

- **Context:** The header/footer-not-sticky defect could be fixed at the shared `pr-dialog` level (affecting every dialog in the app) or scoped to this one popup's override file.
- **Decision:** Fix scoped entirely to `.evidence_modal` in `rd-evidences.component.scss`. Give `.modal_header` `position: sticky; top: 0` and `.buttons` `position: sticky; bottom: 0`, both with an opaque `background: var(--pr-color-white)` and a `z-index` above the form content, while `.evidence_modal` keeps its existing `overflow-y: auto` (so it remains the scrolling ancestor `position: sticky` anchors against).
- **Alternatives considered:**
  1. Restructure `pr-dialog.component.scss` itself to natively support a sticky header/footer contract for all consumers — rejected for this fix: wider blast radius (every `app-pr-dialog` consumer across the app), and the proposal's Option A already chose the scoped path to keep risk low. Left as a follow-up (`EVM-OQ-1` in requirements.md) if other dialogs are found to share the defect.
  2. Split into a literal header/scrollable-body/footer with the body as its own flex child (instead of `position: sticky` on the header/footer) — functionally equivalent end state, but requires wrapping `<app-evidence-item>` in a new `.modal_body` div in the template. Kept as a fallback (see DD-2) only if the sticky-only approach turns out not to isolate cleanly against `.evidence_modal`'s own `overflow-y: auto`.
- **Consequences:** The double scroll-cap nesting (`.pr-dialog`'s `max-height:90vh; overflow:auto` still wrapping `.evidence_modal`'s `85vh`) remains in place — accepted as pre-existing, harmless redundancy since `.evidence_modal` is expected to hit its own cap first in practice. If a future audit finds `.pr-dialog`'s outer scroll actually activates and hides the sticky elements (sticky only pins within its *own* nearest scrolling ancestor, which is `.evidence_modal`, not `.pr-dialog`), that would require DD-1 revisited into the broader Alternative 1.

### `EVM-DD-2` — Fallback: explicit `.modal_body` wrapper if sticky-only proves insufficient

- **Context:** `position: sticky` requires the sticky element's nearest scrolling ancestor to be `.evidence_modal` itself, and requires the sticky elements to be direct-enough flex/block children without an intervening `overflow` or `transform` on `<app-evidence-item>`'s host that would create a new containing block.
- **Decision:** If, during implementation, `<app-evidence-item>`'s component host (a custom element) turns out to interfere with sticky positioning (e.g. because Angular wraps it in an element with its own stacking/overflow context), wrap it in a plain `<div class="modal_body">` in `rd-evidences.component.html` and move the `overflow-y: auto` from `.evidence_modal` onto that new `.modal_body`, leaving `.evidence_modal` itself as a non-scrolling flex column.
- **Alternatives considered:** Do nothing and accept whatever partial breakage occurs — rejected, defeats the requirement.
- **Consequences:** One extra template edit and one extra CSS class, still fully scoped to this component; no behavior change beyond what DD-1 already commits to.

**Budget (Step 2.4):** Expected 1 task, ~20-40 LOC (SCSS restructure + possibly one wrapping `<div>` in the template + one regression test file), 1 review round. This confirms **Lite** depth is correctly sized — no upgrade needed.

## 13. Open Gaps & Follow-ups

- `EVM-OQ-1` (from requirements.md): whether other `app-pr-dialog` consumers share this same non-sticky-header/footer pattern — deferred, not blocking.
- Live browser verification at ~1350×800 remains recommended (task-level manual check, not an automated gate — see §10).

## Required cross-references

- `docs/specs/bugfix/evidence-modal-sticky-actions/requirements.md` (same folder).
- `docs/specs/bugfix/evidence-modal-sticky-actions/proposal.md` (root cause, screenshot).
- `onecgiar-pr-client/CLAUDE.md` (hard UI rule #3: sticky header/footer, one scroll per view).
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/CLAUDE.md` (must be re-stamped in the same commit per `docs/COMPONENT-DOCS.md`).

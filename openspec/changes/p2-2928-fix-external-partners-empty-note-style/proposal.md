## Why

In Contributors & Partners (P25), the empty-state note **"No External Partners related to the established HLO/Outcomes were found"** renders as a bare orange icon + plain text, with none of the peach message-box styling that the sibling Centers and Science Programs empty-state notes have. The three notes share the same `<div class="pr-message">` markup, but `.pr-message` is styled only in `rd-contributors-and-partners.component.scss`. The External Partners note lives in a **different** component (`normal-selector`), and Angular's emulated view encapsulation scopes styles per component — so the peach box is not applied there. Result: a visually broken/inconsistent alert.

**Scope:** frontend-only, CSS-only. No backend, no template logic change.

**Jira:** P2-2928 (TOC Improvements epic) — regression from the empty-state work (P2-2929 / P2-2998 AC4).

## What Changes

- Add the `.pr-message` style block to `normal-selector.component.scss` (mirroring the parent component's definition) so the External Partners empty-state note renders with the same peach box, spacing, and icon alignment as the Centers and Science Programs notes.
- No markup change; no shared/global style change (avoid side effects on other `.pr-message` users).

## Capabilities

### New Capabilities
<!-- None — pure visual consistency fix, no new spec-level behavior. -->

### Modified Capabilities
<!-- None — no requirement changes; implementation-detail (scoped SCSS) fix only. -->

## Impact

- **Code:** `onecgiar-pr-client/.../rd-contributors-and-partners/components/multiple-wps/components/normal-selector/normal-selector.component.scss`.
- **APIs / backend:** none.
- **Risk:** minimal — scoped SCSS addition to a single component; no other component's `.pr-message` is touched.

# Spec — Topbar: Release notes left of the notification bell

## 1. Document Control

- **Module:** `changes` (shell chrome, cross-cutting — not a domain module)
- **Sub-feature:** `topbar-release-notes-bell-position`
- **Owner:** M. Giraldo
- **Status:** draft
- **Ticket(s):** none supplied
- **Depth:** **Lite** — single-file, DOM-order-only template change, no logic/data/API impact
- **Type:** Enhancement (not a bug)
- **Approval Mode:** standard (HITL at each phase gate)

## 2. Executive Summary

Today the shell topbar renders `[Help] · [🔔 Bell] · [🚀 Release notes] · [User menu]`
(`shell-topbar.component.html:54-87`). The user wants **Release notes to the left of the bell**:
`[Help] · [🚀 Release notes] · [🔔 Bell] · [User menu]`. Pure DOM-order swap — no new markup,
no new styling, no state change. The component's own folder doc already *describes* this order
("Support menu → Release notes → notifications bell → user menu",
`shell-topbar/CLAUDE.md:5`) even though the shipped template does not match it — this spec makes
the code agree with the doc.

## 3. In Scope / Out of Scope

### In scope
- Reordering the two existing DOM blocks (bell button, Release notes link) inside
  `.pr-topbar-right` in `shell-topbar.component.html`.
- Updating the one existing unit test that inspects this region's raw markup order
  (`shell-topbar.component.spec.ts:562-578`) if it does not already tolerate the swap, plus adding
  an assertion that pins Release notes' index strictly before the bell's.
- Re-stamping `shell-topbar/CLAUDE.md` per the folder-doc convention (`docs/COMPONENT-DOCS.md`).

### Out of scope
- Any visual restyle of either element (icon, spacing, badge behavior unchanged).
- Any change to `.pr-topbar-actions` / `.pr-topbar-sep` CSS (scss:116-122, 469-481) — no `order`,
  `flex-direction`, or layout property changes; this is a template-only reorder (confirmed no
  reordering CSS exists today).
- Mobile/responsive topbar behavior (none exists specifically for this pair; not introduced here).
- The sidebar EXTRAS group (Release notes was already removed from there per P2-3682; unaffected).

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| All authenticated users (every persona reaches the shell topbar) | Tab/visual order of two icon buttons swaps; no behavior change to either. |

## 5. User Stories

- **`TRN-US-1`** — As any authenticated user, I want the Release notes button positioned to the
  left of the notifications bell, so that the topbar's icon order matches the order I expect
  (help → what's new → alerts → me).

## 6. Functional Requirements

### Required (MUST)

- **`TRN-R-1`** The topbar MUST render the Release notes icon button (`routerLink="/whats-new"`)
  immediately before (to the left of, in DOM/visual order) the notifications bell button, within
  `.pr-topbar-right`.
- **`TRN-R-2`** The reorder MUST NOT change either element's markup, classes, `aria-label`,
  `title`, click handler, active-state binding (`isInWhatsNewRoute()` / `notificationsOpen()` /
  `isInNotificationsRoute()`), or icon (`lucideRocket` / `lucideBell`) — only their sibling order
  changes.
- **`TRN-R-3`** The existing separator count and grouping structure the shell-chrome test asserts
  (`shell-topbar.component.spec.ts:562-578`: exactly 2 `.pr-topbar-sep`, `.pr-topbar-actions`
  index after the first separator, `.pr-topbar-user` index after `.pr-topbar-actions`) MUST still
  hold after the reorder.

#### Scenario: Topbar renders with Release notes left of the bell

- GIVEN an authenticated user viewing any page with the shell topbar visible (not QA full-screen,
  not focus mode)
- WHEN the topbar's right cluster renders
- THEN the Release notes icon (`aria-label="Release notes"`) appears before the notifications
  bell (`aria-label="Notifications"`) in DOM order
- AND both remain clickable and keep their current behavior (`/whats-new` navigation; bell opens
  the notifications popover)
- BUT it must NOT introduce a third separator or remove either of the two existing ones
- AND IT MUST NOT change the badge behavior on the bell (unread count still renders when
  `unreadNotifications.length > 0`)

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Accessibility** | Tab order follows the new DOM order; both controls keep their existing `aria-label`/`title` — no new a11y regression (WCAG 2.1 AA per `docs/ux-ui/design.md` §10). |
| **Backwards compatibility** | No API, data, or route change. Additive-safe by construction. |
| **Observability** | N/A — no logging/telemetry touches this pair. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `TRN-AC-1` | The shell topbar's right cluster, any route with the shell visible | The topbar renders | Release notes' DOM index < notifications bell's DOM index inside `.pr-topbar-right` |
| `TRN-AC-2` | The existing `shell-topbar.component.spec.ts:562-578` grouping test | Run after the reorder | Still passes unmodified in its counts/index-ordering assertions (or is updated to keep the same guarantees if strictly needed) |

Cross-cutting project ACs that already apply (not restated): `AC-3` Authorization (unaffected —
both controls are already visible to all authenticated users), `AC-9` Security and secrets
(unaffected).

## 9. Dependencies & Assumptions

### Upstream dependencies
- None — pure client-side template change in `shared/components/shell-topbar/`.

### Downstream consumers
- None found. No Cypress e2e/component spec references `shell-topbar`/`pr-topbar`
  (`grep -rliE "shell-topbar|pr-topbar" cypress/` → no matches, confirmed by exploration).
  `reporting-nav-sidebar.component.spec.ts:777-803` only asserts Release notes is *absent* from
  the sidebar, unrelated to topbar ordering.

### Assumptions
- `docs/ux-ui/design.md` §7-8 (PrimeNG-era tokens) does not apply to this component — confirmed
  stale for this stack; the component's own `.scss` and `CLAUDE.md` are the live source of truth
  (see `onecgiar-pr-client/CLAUDE.md` migration note).

## 10. Open Questions

- `TRN-OQ-1` — Should the separator between the two icon-button groups move with Release notes
  (i.e., does the visual grouping change from `[Help]|[Bell]|[ReleaseNotes]` to
  `[Help]|[ReleaseNotes][Bell]` with no separator between the last two, matching the CLAUDE.md
  prose "placed between Support and the notifications bell"), or stay fixed in its current
  position (both separators keep their slot, only the two blocks between/after them swap)? Default
  assumed in this spec: **separators stay in their current two slots**, only the two content
  blocks swap — this is the minimal-diff reading and keeps `TRN-AC-2` trivially true. Confirm
  before `design.md` if the other reading is intended. **Resolved for this spec: minimal-diff
  reading — see `design.md` Premise Ledger row `TRN-P-1`.**

## 11. Out-of-Band Notes

None.

## Required cross-references

- `docs/ux-ui/design.md` — §7-8 confirmed stale for this component (Tailwind/Spartan stack, no
  PrimeNG tokens apply); no other UX flow touched.
- `docs/trd/trd.md` — no architecture/data/API section applies; pure presentational client change.
- `onecgiar-pr-client/CLAUDE.md`, `onecgiar-pr-client/src/CLAUDE.md` — folder-doc re-stamp
  convention (`docs/COMPONENT-DOCS.md`) applies to `shell-topbar/CLAUDE.md`.

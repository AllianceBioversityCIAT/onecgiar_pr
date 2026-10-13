# Design — Topbar: Release notes left of the notification bell

## 1. Summary

Swap the sibling order of two already-existing DOM blocks inside
`onecgiar-pr-client/src/app/shared/components/shell-topbar/shell-topbar.component.html`'s
`.pr-topbar-right` cluster: the Release notes `<a>` (currently html:80-87) moves before the
`.pr-topbar-actions` bell wrapper (currently html:54-74). No new markup, no CSS change (confirmed
no `order`/`flex-direction` rule exists — visual order is pure DOM order), no TS logic change.
Biggest constraint: the one existing test touching this region
(`shell-topbar.component.spec.ts:562-578`) checks group-level structure, not this specific pair's
relative order — so the task adds a narrow assertion rather than relying on that test alone.

Requirements: `docs/specs/changes/topbar-release-notes-bell-position/requirements.md`
(`TRN-R-1..3`, `TRN-AC-1..2`). Project docs: `docs/ux-ui/design.md` (confirmed §7-8 stale for this
component, no tokens apply), `docs/trd/trd.md` (no section applies — presentational-only change).

## 1A. Premise Ledger

**Count:** 4 verified, 0 UNVERIFIED (0 High / 0 Low).
**Blast-radius triggers:** `live-path` applies (row `TRN-P-4`) — shell-topbar is reachable on
every authenticated route. `shared-state` does not apply — no state, service, base class or
lifecycle hook is touched; the change is local template markup. `consumer` applies (row `TRN-P-3`)
precautionarily, since the two blocks are DOM hooks a test *could* select by position.

| # | Premise | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| `TRN-P-1` | No `order`, `flex-direction`, or other reordering CSS exists for `.pr-topbar-right` / `.pr-topbar-actions` / `.pr-topbar-sep` — visual order is pure DOM order | `existence` | Read `shell-topbar.component.scss:116-122` (`.pr-topbar-right`: `display:flex; align-items:center; gap:4px`) and `:469-481` (`.pr-topbar-actions`, `.pr-topbar-sep` — no `order`/`flex-direction` property in either) | qa-development-2026-mc @ current HEAD | A template-only swap would not visually reorder the icons; the design would need a CSS `order` change instead — `TRN-T-1` grows a scss step | — |
| `TRN-P-2` | The component's own folder doc already documents the target order ("Support menu → Release notes → notifications bell → user menu"), so this change brings the code in line with existing documentation, not a new decision | `data-env` | `shell-topbar/CLAUDE.md:5` vs. actual DOM order in `shell-topbar.component.html:54-87` (bell before Release notes today — doc and code disagree) | qa-development-2026-mc @ current HEAD | None — informational; does not change scope, Impact Low | — |
| `TRN-P-3` | No Cypress e2e/component spec, and no source file outside `shell-topbar/` itself, selects the bell or Release notes elements by DOM position (`nth-child`) or otherwise depends on their relative order | `consumer` | `grep -riE "shell-topbar\|pr-topbar-actions\|pr-topbar-sep\|lucideRocket\|aria-label=.Release notes." .` from repo root → 31 files; non-doc/non-spec hits limited to `shell-topbar.component.{ts,html,scss,spec.ts}`, `reporting-nav-sidebar.component.spec.ts` (asserts *absence* from the sidebar, unrelated to topbar order), `app.module.ts`/`app.component.html` (mount points only) | qa-development-2026-mc @ current HEAD | A hidden positional dependency would need identifying and updating alongside the swap — re-run the same grep at execute time before merging | `TRN-T-1` (re-run grep as its first verification step) |
| `TRN-P-4` | `<app-shell-topbar>` renders on every authenticated route except when `dataControlSE.show_qa_full_screen` or `focusMode()` is true (QA full-screen / focus mode) | `live-path` | `app.component.html:38` mounts the component; `shell-topbar/CLAUDE.md:6-8` documents the two suppressing conditions | qa-development-2026-mc @ current HEAD | N/A — this only confirms the change is broadly visible, does not change scope | — |

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client module touched:** `onecgiar-pr-client/src/app/shared/components/shell-topbar/` only
  (`shell-topbar.component.html`, and its co-located `.spec.ts`; `CLAUDE.md` re-stamped in the
  same commit per convention).
- **No server, data, or external-integration surface touched.**

### 2.2 Sequence / interaction

Purely presentational — no new interaction. Existing flow unchanged:

```
[Any authenticated route]
  └── app.component.html renders <app-shell-topbar> (unless QA full-screen / focus mode)
        └── .pr-topbar-right renders, in order (NEW):
              Help button → separator → Release notes link → separator → bell button (wrapped
              in .pr-topbar-actions) → user menu button
```

## 3. Data Model Changes

None. No entity, migration, or CLARISA implication.

## 4. API Surface

None. No endpoint added, changed, or removed.

## 5. Server Workflow / Business Rules

Not applicable — client-only, no server code touched.

## 6. Frontend Plan

### 6.1 Routes / modules

No route or module change. `shell-topbar` is a shared shell component, not a routed page.

### 6.2 Components & services

- **`ShellTopbarComponent`** (`shell-topbar.component.html`) — template-only edit: swap the sibling
  position of the Release notes `<a>` block (html:80-87) and the `.pr-topbar-actions` bell wrapper
  (html:54-74). The two separators (html:52, html:76) **stay in their current two slots** — per
  `requirements.md` `TRN-OQ-1`, resolved to the minimal-diff reading: only the two content blocks
  between/after the separators swap, separator count and position in the sibling list are
  unchanged. Concretely: what currently renders as
  `[sep] [bell-wrapper] [sep] [release-notes-link]` becomes
  `[sep] [release-notes-link] [sep] [bell-wrapper]`.
- No `.ts` change: `isInWhatsNewRoute()`, `notificationsOpen()`, `isInNotificationsRoute()`,
  `unreadNotifications`, `notificationBadgeLength()` all stay exactly as they are — only their
  call sites' position in the template moves with their respective blocks.
- No new component, no new service.

### 6.3 Design system usage

- No new token, no new class. Both elements keep `.pr-topbar-icon-btn` (32×32px,
  `border-radius:8px`) and their existing `.pr-topbar-icon-btn--active` state binding.
- A11y: both elements retain their current `aria-label` (`"Notifications"` / `"Release notes"`),
  `title` (Release notes only), and `aria-haspopup`/`aria-expanded` (bell only) — DOM reorder
  changes tab order to match the new visual order, which is the expected/correct a11y behavior
  for a visual reorder (tab order should follow visual order per WCAG 2.4.3).
- No i18n key touched (`aria-label`/`title` strings are unchanged, not newly introduced).

### 6.4 Real-time / notification UX

Unchanged — the bell's unread-badge logic (`unreadNotifications.length`) is untouched.

## 7. Security & Authorization

No change. Both controls remain visible to all authenticated users, same as today (no role gate
on either).

## 8. Performance & Capacity

None — zero bytes of new markup, no new binding, no new watcher.

## 9. Observability

None — no logging/telemetry touches this pair.

## 10. Testing Plan (forward-looking)

- **Unit (Jest):** extend `shell-topbar.component.spec.ts` with an assertion that pins Release
  notes' index strictly before the bell's index in the rendered `.pr-topbar-right` markup — the
  existing `describe('the shell chrome is grouped (P2-3682)')` block (spec:562-578) checks group
  counts/positions but not this specific pair, so it would pass even on the *old* order; a
  dedicated assertion is the only thing that actually falsifies a wrong swap.
- No integration, Cypress, or payload test applies (`TRN-P-3` — no such coverage exists for this
  component).

## 11. Backwards Compatibility & Migration Plan

Purely additive/cosmetic reorder. No API contract, no migration, no feature flag, no data
backfill, no downstream-consumer communication needed (`TRN-P-3`).

## 12. Design Decisions (ADRs)

### `TRN-DD-1` — Keep separators fixed in their current two slots; swap only the two content blocks

- **Context:** `requirements.md` `TRN-OQ-1` asked whether the separator moves with Release notes
  (visually grouping it tight against the bell with no separator between them) or stays put.
- **Decision:** Separators stay in their current two DOM slots; only the bell-wrapper and
  Release-notes-link blocks swap sibling position between them. Result:
  `[Help] | [Release notes] | [Bell] [User menu]` (visually, Release notes sits between the two
  separators, same as the bell does today).
- **Alternatives considered:**
  1. Move the separator with Release notes so it groups tightly against the bell
     (`[Help] | [Release notes][Bell] [User menu]`) — rejected: bigger diff, no stated reason to
     change the grouping/spacing, and the component's own `CLAUDE.md:11` already describes
     Release notes as "placed between Support and the notifications bell", which the minimal-diff
     order already satisfies.
  2. Reorder via CSS `order` instead of template order — rejected: `TRN-P-1` confirms no
     reordering CSS exists today; introducing one would be a bigger, less obvious diff for a
     template-only feature, and would leave DOM (tab) order out of sync with visual order (a11y
     regression) unless duplicated in both places.
- **Consequences:** Smallest possible diff (two blocks swap position, nothing else). The existing
  separator-count assertion in `shell-topbar.component.spec.ts:562-578` needs no change; only a
  new, narrower assertion is added alongside it (§10).

**Reversion challenge (Step 2.3):** N/A — this design adds/reorders, it does not remove, disable,
or invert any already-delivered behavior. Both controls keep 100% of their current behavior.

## 13. Open Gaps & Follow-ups

- None. `TRN-OQ-1` is resolved by `TRN-DD-1`.

## Budget (Step 2.4)

- **Expected tasks:** 1
- **Expected LOC:** ~15-25 (template block swap + one new test assertion + `CLAUDE.md` re-stamp)
- **Expected review rounds:** 1 (`checklist` depth — mechanical, no shared symbol, no payload,
  no migration, no auth)

This is at the floor of Lite depth. Recommendation carried into `tasks.md`'s presentation: this
change is small enough that `/akili-quick` would have been sufficient — noted for the user's
awareness, not a blocker to continuing at this depth since the requirements/design are already
written.

## Required cross-references

- `docs/specs/changes/topbar-release-notes-bell-position/requirements.md` (same folder).
- `docs/ux-ui/design.md`, `docs/trd/trd.md` — confirmed no applicable section (§1A `TRN-P-2`
  covers the only relevant doc, the component's own `CLAUDE.md`).
- `onecgiar-pr-client/CLAUDE.md`, `onecgiar-pr-client/src/CLAUDE.md` — folder-doc re-stamp
  convention (`docs/COMPONENT-DOCS.md`) applies to `shell-topbar/CLAUDE.md` in the same commit.

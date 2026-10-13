# Tasks — Topbar: Release notes left of the notification bell

## 1. Scope of this task list

- **Module / feature:** `changes/topbar-release-notes-bell-position`
- **Linked spec:** `requirements.md` + `design.md` (same folder)
- **Sprint / target phase:** n/a
- **Owner / driver:** M. Giraldo
- **Status:** complete

## 2. Pre-flight checklist

- [x] `requirements.md` is approved (user selected Continue).
- [x] `design.md` is approved (user selected Continue).
- [x] Open questions in `requirements.md` and `design.md` are all resolved (`TRN-OQ-1` → `TRN-DD-1`).
- [x] No CLARISA dependency (none — pure client template change).
- [x] No conflicting in-flight spec touching `shell-topbar/` found (`docs/specs/` search: only this
      folder and unrelated archived specs mention `shell-topbar`/`pr-topbar`).
- [x] No migration involved — n/a for this task list.

## 3. Task list

### `TRN-T-1` — Swap Release notes and notification bell order in the shell topbar `[x]`

- **Type:** `client`
- **Description:** In `shell-topbar.component.html`, swap the sibling position of the Release
  notes `<a>` block (currently html:80-87) and the `.pr-topbar-actions` bell-wrapper block
  (currently html:54-74), per `design.md` `TRN-DD-1` (separators stay in their current two slots;
  only the two content blocks swap). No `.ts`, `.scss`, class, `aria-label`, `title`, or binding
  changes. Add a Jest assertion pinning the new relative order. Re-stamp `shell-topbar/CLAUDE.md`
  per the folder-doc convention (update its described order at `CLAUDE.md:5,10-14` to match the
  new DOM order, and bump the `**Verified:**` line).
- **Implements:** `TRN-R-1`, `TRN-R-2`, `TRN-R-3`, `TRN-AC-1`, `TRN-AC-2`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/shared/components/shell-topbar/shell-topbar.component.html`
  - `onecgiar-pr-client/src/app/shared/components/shell-topbar/shell-topbar.component.spec.ts`
  - `onecgiar-pr-client/src/app/shared/components/shell-topbar/CLAUDE.md`
- **Depends on:** —
- **Blocks:** —
- **Estimate:** `S`
- **Review:** `checklist` — standard scoped task; not `skip-eligible` because it reorders shared
  shell chrome visible on every route and the Reviewer should confirm the swap against
  `TRN-DD-1`'s exact block boundaries (html:54-74 / html:80-87) rather than a looser rewrite.
- **Verification:**
  - **Falsifier:** Render `ShellTopbarComponent` (or read its compiled template fixture) and read
    `.pr-topbar-right`'s `innerHTML`. Before the change:
    `indexOf('aria-label="Release notes"') > indexOf('aria-label="Notifications"')` (bell comes
    first). After the change: `indexOf('aria-label="Release notes"') <
    indexOf('aria-label="Notifications"')` (Release notes comes first). A diff that reorders
    unrelated blocks, or that edits `aria-label`/class strings instead of block position, does not
    move these indices in the expected direction and is disproven by this check.
  - **Red run:** `npx jest --silent --no-coverage --testPathPattern="shell-topbar.component.spec"`
    — the new order-pinning assertion added to `shell-topbar.component.spec.ts` fails against the
    pre-change template (bell-before-Release-notes) and passes after the swap. Run once before the
    template edit to confirm red, then again after to confirm green.
  - **Disqualifier:** If re-running `TRN-P-3`'s grep
    (`grep -riE "shell-topbar|pr-topbar-actions|pr-topbar-sep|lucideRocket|aria-label=.Release notes." .`
    from repo root) turns up a new Cypress spec or another consumer added since this spec was
    written that depends on the *old* relative order (not just presence/absence), stop and
    re-specify rather than patching around it — the swap would then have a real behavioral
    consumer this spec did not account for.
  - **Consumers:** `shell-topbar.component.spec.ts` (updated in this task, including the existing
    `describe('the shell chrome is grouped (P2-3682)')` block at spec:562-578, which must still
    pass — it does not pin this specific pair's order today, so it needs no logic change, only
    re-verification). `reporting-nav-sidebar.component.spec.ts:777-803` is a consumer of the
    *absence* of Release notes from the sidebar (unrelated assertion) — re-run to confirm
    untouched, no edit expected. No Cypress e2e/component spec references this component
    (`TRN-P-3`).
- **Definition of done:**
  - [x] Code merged via the project commit convention (`🎨 style(shell-topbar): move Release
        notes left of the notifications bell`).
  - [x] Lint clean: `npx ng lint --quiet` (client).
  - [x] `shell-topbar.component.spec.ts` updated with the new order-pinning assertion; full file
        green: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="shell-topbar.component.spec"`.
  - [x] `reporting-nav-sidebar.component.spec.ts` re-run and still green (no edit expected).
  - [x] No migration involved.
  - [x] No secret or token touched.
  - [x] No API/DTO/Swagger surface — n/a.
  - [x] UX changed (visual order only) — no new i18n key needed (no new/changed string); no
        PrimeNG involved (removed from this stack).
  - [x] No bilateral / platform-report surface touched — n/a.
  - [x] `shell-topbar/CLAUDE.md` updated and its `**Verified:**` line re-stamped in the same
        commit, per `docs/COMPONENT-DOCS.md`.

## 4. Dependency graph

```
TRN-T-1  (only task — no dependents, no dependencies)
```

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `TRN-TEST-1` | unit (client, Jest) | `TRN-R-1`, `TRN-R-3`, `TRN-AC-1`, `TRN-AC-2` | `onecgiar-pr-client/src/app/shared/components/shell-topbar/shell-topbar.component.spec.ts` |

Client coverage stays above 50/60/60/60 (no new logic added, coverage floor unaffected).

## 6. Rollout & verification

- [ ] PR opened with the commit message convention.
- [ ] CI green (lint, tests, build). No `migration:check:ci` relevance (no migration).
- [ ] Manual QA: open the app, confirm Release notes icon renders to the left of the bell icon in
      the topbar, both still clickable and behave as before (`/whats-new` navigation; bell opens
      notifications popover with badge when unread items exist).
- [ ] No bilateral/platform-report downstream consumer to notify.
- [ ] No telemetry to verify post-deploy — presentational-only change.

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged.
- [ ] No new cross-cutting UX pattern to promote to `docs/ux-ui/design.md` (a two-icon reorder is
      not a new pattern).
- [ ] No deferred work from `design.md` §13 (empty).
- [ ] No `docs/prd.md` Open Question resolved by this spec.

## 8. Roll-back plan

1. Revert the merge PR.
2. No migration to revert — n/a.
3. No feature flag introduced — n/a.
4. No bilateral/platform-report payload involved — n/a.
5. No downstream consumer to notify.

## Required cross-references

- `docs/specs/changes/topbar-release-notes-bell-position/requirements.md` and `design.md` (same
  folder).
- No `docs/prd.md` / `docs/ux-ui/design.md` / `docs/trd/trd.md` section directly applicable beyond
  what `design.md` §1A already cites.

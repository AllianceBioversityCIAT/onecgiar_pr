# Tasks — ToC HLO/Outcome selector must stay editable (Lite, Bug Mode)

Linked spec: `requirements.md` + `design.md` (same folder). Status: `not-started`.

## Pre-flight checklist

- [x] `requirements.md` approved (user confirmed "Continuar a design.md")
- [x] `design.md` approved (user confirmed "Continuar a tasks.md")
- [x] Open questions resolved (none remain — see `requirements.md` §9)
- [x] No conflicting in-flight spec on this file (checked: no other `docs/specs/*` folder touches `multiple-wps-content.component.*`)
- [x] No migration involved (client-only change)

## Task list

### `BUG-T-1` — Remove `tocAlignmentReadOnly()` lock, add regression test `[x]`

- **Type:** `client` + `tests`
- **Description:** In `multiple-wps-content.component.html`, remove `tocAlignmentReadOnly()` from
  the `[editable]`/`[readOnly]`/`[disabled]` bindings on the Level select and the 3 per-level node
  selects (also drop the dead `(resultLevelId === 1 && false)` clause on the Output select's
  `[disabled]`). In `multiple-wps-content.component.ts`, delete the `tocAlignmentReadOnly` computed
  and its `isFilled()` helper if unused elsewhere, and the now-stale doc comment above it
  (`.ts:179-198`). Add a regression test proving the fields are enabled in the exact state that
  used to lock them.
- **Implements:** `BUG-R-1`, `BUG-R-2`, `BUG-AC-1`, `BUG-AC-2`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/multiple-wps-content/multiple-wps-content.component.html`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/multiple-wps-content/multiple-wps-content.component.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/multiple-wps-content/multiple-wps-content.component.spec.ts`
- **Depends on:** `—`
- **Blocks:** `—`
- **Estimate:** `S`
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`🔧 fix(multiple-wps-content): ...`) — not
        committed yet, no commit made per standing "no auto-commit" convention; pending user action.
  - [x] Lint clean (`npx ng lint --quiet`).
  - [x] `BUG-TEST-1` (below) exists, is **red on the pre-fix code** (confirms it reproduces the bug)
        and **green after the fix** — both states verified locally before merging.
  - [x] Existing `cpmultiple-wps-content.component.spec.ts` suite stays green — no regression to
        `syncTocReferenceIds`, `hloStatementValue`/`hloStatementLabel`, `tocResultListFiltered`.
  - [x] Manual check: `editable=false` still disables the fields — proven via `BUG-TEST-2`
        (behavioral regression test, real DOM assertion). A live-browser read-only-role check was
        not performed in this environment.
  - [x] No secret/token logged (n/a here, listed per convention).

## Dependency graph

```
BUG-T-1  (only task — fix + regression test, single file group)
```

## Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `BUG-TEST-1` | unit (client, Jest) | `BUG-R-1`, `BUG-AC-1` — reproduces the bug (red before fix, green after): given a tab with `toc_level_id`+`toc_result_id` already set on a 2026/planned result, the Level and node selects' `disabled`/`readOnly`/`editable` bindings must NOT be gated by the removed computed | `multiple-wps-content.component.spec.ts` |
| `BUG-TEST-2` | unit (client, Jest) | `BUG-R-2`, `BUG-AC-2` — an `editable=false` input (or read-only role, if mockable in this suite) still disables the same fields, independent of the removed computed | `multiple-wps-content.component.spec.ts` |

Client coverage must stay ≥ 50/60/60/60 (`package.json`); this folder is excluded from
`collectCoverageFrom` per `rd-contributors-and-partners/../CLAUDE.md` §"Coverage gotcha" — tests
still run and must pass, just don't count toward the threshold.

**No-pass clause:** `BUG-TEST-1` is worthless if it only asserts the computed is gone from the
`.ts` file (a presence-assertion) — it must render/inspect the component's actual bound
`disabled`/`readOnly` state in the locked scenario and assert it is `false`/falsy. If the harness
cannot render the real `app-pr-select` bindings, fall back to asserting the component-level
boolean expression the template binds to, not just its absence from source.

## Rollout & verification

- [ ] PR opened with commit convention.
- [ ] `npx jest --silent --reporters=summary --no-coverage -- --testPathPattern="multiple-wps-content"` green.
- [ ] `npx ng lint --quiet` green.
- [ ] Manual verification in a real browser (per client `CLAUDE.md` §9 two traps: inject `token` +
      `user` in localStorage, confirm served bundle isn't stale) on a 2026-phase, planned,
      ToC-mapped result — confirm Level/HLO dropdown now opens and accepts a new value.

## Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged and verified.
- [ ] File a follow-up ticket if the accepted risk in `design.md` §5 (Section 2 / Results
      Framework desync) ever becomes a real support issue.

## Roll-back plan

1. Revert the single PR for `BUG-T-1`.
2. No migration, no feature flag, no downstream consumer to notify — a straight template/computed
   revert restores the P2-3235 lock exactly as it was.

## Required cross-references

- `requirements.md`, `design.md` (same folder).
- `proposal.md` (same folder) — root cause + user's explicit decision to revert P2-3235.
- `onecgiar-pr-client/.../rd-contributors-and-partners/CLAUDE.md` — P2-3235 history (must be
  updated in the same commit per client `CLAUDE.md`'s folder-doc convention, since this task edits
  a file inside a folder tree that guide documents — see `.agents`/root convention on touching a
  folder with its own `CLAUDE.md`).

# `bugfix/bilateral-section-autosave-on-navigate` — Tasks

## 1. Scope of this task list

- **Module / feature:** `bilateral` — `BilateralResultCreatorComponent` section navigation
- **Linked spec:** `docs/specs/bugfix/bilateral-section-autosave-on-navigate/requirements.md` + `design.md`
- **Sprint / target phase:** next available
- **Owner / driver:** Frontend (onecgiar-pr-client)
- **Status:** not-started

## 2. Pre-flight checklist

- [x] `requirements.md` reviewed (Bug Mode, Lite depth).
- [x] `design.md` reviewed — budget: 2 tasks, ~35–55 LOC, 1 review round.
- [x] Open questions resolved: `BIL-OQ-1` resolved by design choice (reuse Save-draft error copy verbatim); `BIL-OQ-2` resolved by inspection (`triggerManualSave()` already calls `flush(getEndpointKeys(activeSection))` uniformly for every section including `'evidence'` — no divergent path exists to create a new gap).
- [x] No conflicting in-flight spec found touching `bilateral-result-creator.component.ts` under `docs/specs/`.
- [x] No migration involved — client-only change.

## 3. Task list

### [x] `BIL-T-1` — Write the regression tests first (red on current code)

- **Type:** `tests`
- **Description:** Extend `bilateral-result-creator.component.spec.ts` with the Bug Mode regression cases before touching `selectSection()`, so they demonstrably fail against today's `window.confirm(...)` behavior:
  1. Spy on `window.confirm`. Set up the fixture so `autoSaveService.hasPendingFor(current)` returns `true` for the active section. Call `component.selectSection(otherSection)` (or trigger via `moveSection(1)`). Assert `window.confirm` is **never** called, and assert `autoSaveService.flush` **is** called with `autoSaveService.getEndpointKeys(current)`. **Must fail today** (current code calls `window.confirm`, never `flush`, from this call site).
  2. With the flush spy resolving and `autoSaveService.hasErrorFor(current)` returning `true` after settlement: assert `component.openSectionName()` is unchanged (still the original section) and that the existing failure alert path is invoked (spy on `api.alertsFe.show` or the component's internal call, matching what `triggerManualSave()`'s failure branch already does). **Must fail today** (no such error-aware branch exists in `selectSection()`).
  3. With `autoSaveService.hasPendingFor(current)` returning `false`: assert `component.openSectionName()` switches to the target section and `autoSaveService.flush` is **not** called. (Passes today by coincidence via the existing early-exit path — keep as a non-regression guard, not a red case.)
  4. With `isFormReadOnly()`/the component's read-only computed set to `true`: assert `autoSaveService.flush` is not called on `moveSection`/`selectSection`. (Passes today since read-only sessions have nothing pending — keep as a non-regression guard.)
- **Implements:** `BIL-R-1`, `BIL-R-2`, `BIL-R-3`, `BIL-R-4`, `BIL-AC-1`, `BIL-AC-2`, `BIL-AC-3`, `BIL-AC-4`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.spec.ts`
- **Depends on:** `—`
- **Blocks:** `BIL-T-2`
- **Estimate:** `S`
- **Skills:** `tdd` (red-before-green discipline), `angular-developer` (Jest + Angular component test conventions)
- **Definition of done:**
  - [x] New test cases added, named to make the confirmed root cause traceable (e.g. `it('flushes pending edits instead of showing a confirm dialog on Next')`).
  - [x] Running `npx jest --silent --reporters=summary --no-coverage --testPathPattern=bilateral-result-creator.component.spec` shows cases 1 and 2 **failing** against current code (captured as evidence of red in `execution.md`).
  - [x] Cases 3 and 4 pass on current code (non-regression guards, not red cases) — confirmed and noted as such, not miscounted as red.
  - [x] No production code changed in this task — tests only.
  - [x] Lint clean (`npx ng lint --quiet`, scoped to the changed file if supported, else full run reviewed for only this file's findings).

### [x] `BIL-T-2` — Replace the confirm-popup gate with flush-then-navigate

- **Type:** `client`
- **Description:** In `BilateralResultCreatorComponent` (`bilateral-result-creator.component.ts:627-643`):
  1. Make `selectSection(section: BilateralEditorSection)` `async`, returning `Promise<void>`.
  2. Keep the `current === section` early return unchanged.
  3. Replace the `window.confirm(...)` branch: when `autoSaveService.hasPendingFor(current)` is true, `await this.autoSaveService.flush(this.autoSaveService.getEndpointKeys(current))`, then `await this.waitForSectionSave(current)` (reuse the existing private helper as-is, no signature change).
  4. If `this.autoSaveService.hasErrorFor(current)` after settlement: build and show the same failure alert `triggerManualSave()`'s error branch builds (`lastErrorMessageFor(current)` + `missingFieldsFor(current)`, same `alertsFe.show(...)` shape/id semantics) and `return` without switching sections.
  5. Otherwise (no pending edits, or flush succeeded): `this.pendingOpen.set(false); this.openSectionName.set(section);` — unchanged from today.
  6. Update `moveSection(direction: -1 | 1)` to be `async` and `return`/`await` the call to `selectSection(target.name)` so the promise chain is observable by tests and by any future caller, even though template bindings don't need to await it themselves.
  7. Confirm no other call site of `selectSection`/`moveSection` assumes a synchronous return (grep the component and its template) — Angular template `(click)` bindings tolerate an async handler unchanged.
- **Implements:** `BIL-R-1`, `BIL-R-2`, `BIL-R-3`, `BIL-R-4`, `BIL-AC-1`, `BIL-AC-2`, `BIL-AC-3`, `BIL-AC-4`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.ts`
- **Depends on:** `BIL-T-1`
- **Blocks:** `BIL-T-3`
- **Estimate:** `S`
- **Skills:** `angular-developer` (signals/async component patterns), `systematic-debugging` (re-apply if `BIL-T-1`'s tests don't turn green on the first pass)
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`<emoji> <type>(<scope>) [ticket]: <description>` per root `CLAUDE.md`) — scope `bilateral-result-creator`. **Do not commit until the user gives explicit go-ahead** — leave the change in the working tree per standing project instruction.
  - [ ] Lint + format clean (`npx ng lint --quiet`).
  - [ ] All `BIL-T-1` tests now pass (green), including the two red cases turning green and the two non-regression guards staying green.
  - [ ] No secret or token leaked in logs or messages (`.cursorrules`) — no new logging added.
  - [ ] No migration needed (confirmed — no entity/schema touched).
  - [x] Manual smoke check in a running `npm start` session (per `onecgiar-pr-client/CLAUDE.md` §9 "Verifying in a REAL browser" — inject both `token` and `user` in localStorage): edit a field in a Bilateral section, click Next, confirm no browser popup appears and the field survives a page reload (i.e. was actually persisted). Performed directly by the user, 2026-09-18 — confirmed working.

### [x] `BIL-T-3` — Update the folder's `CLAUDE.md` contract line

- **Type:** `docs`
- **Description:** In `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/CLAUDE.md`, correct the line *"navegar o destruir el editor nunca escribe"* to reflect that Next/Back/side-rail navigation now flushes the active section's pending edits (destroying the editor without navigating via Next/Back — e.g. closing the tab — still does not write, since that path is unaffected). Re-stamp the `Verified:` line with today's date and this change's context, per the "Folder docs" convention (`onecgiar-pr-client/CLAUDE.md` §10).
- **Implements:** `BIL-R-10`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/CLAUDE.md`
- **Depends on:** `BIL-T-2`
- **Blocks:** `—`
- **Estimate:** `S`
- **Skills:** none beyond standard editing — no code skill needed.
- **Definition of done:**
  - [x] `CLAUDE.md` line corrected and `Verified:` re-stamped in the same commit as `BIL-T-2` (per convention — same-commit requirement; nothing committed yet, both changes sit uncommitted together in the working tree, so this holds once committed).
  - [x] No other claim in the file contradicts the corrected line (quick re-read of the "Contrato" section for consistency).

## 4. Dependency graph

```
BIL-T-1 (regression tests, red on cases 1–2)
   └── BIL-T-2 (flush-then-navigate fix, tests turn green)
         └── BIL-T-3 (CLAUDE.md doc correction, same commit as BIL-T-2)
```

No parallel branches — small, sequential fix by design (TDD red→green, then the doc update that the code change obliges).

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `BIL-TEST-1` | unit (client, component) | `BIL-R-1`, `BIL-AC-1` | `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.spec.ts` — no-confirm / flush-called case |
| `BIL-TEST-2` | unit (client, component) | `BIL-R-2`, `BIL-AC-2` | same file — flush-error keeps section open + shows failure alert |
| `BIL-TEST-3` | unit (client, component) | `BIL-R-3`, `BIL-AC-3` | same file — clean-section fast path, no flush call |
| `BIL-TEST-4` | unit (client, component) | `BIL-R-4` (read-only), `BIL-AC-4` | same file — read-only mode, no flush call |

Client coverage MUST stay above 50/60/60/60 (`onecgiar-pr-client/CLAUDE.md` §3) — this change adds tests to an already-covered file, so coverage trends up or stays flat, never down.

## 6. Rollout & verification

- [ ] PR opened with the commit message convention — scope `bilateral-result-creator`, type `fix`.
- [ ] CI green: `npx jest --silent --reporters=summary --no-coverage --testPathPattern=bilateral-result-creator.component.spec` and `npx ng lint --quiet` (scoped per `onecgiar-pr-client/CLAUDE.md` §10 rule 25 — never the full suite).
- [ ] Manual QA per the reproduction in `proposal.md` §3: edit a field in any Bilateral section, click Next — no popup, edit persists across reload. Repeat for Back and a side-rail section click. Repeat once with a deliberately-broken save (e.g. emptied required title) to confirm the section stays open with the existing error message.
- [ ] No telemetry change expected — no new endpoint, no new error class.

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged and verified.
- [ ] If `BIL-T-2`'s manual smoke check surfaces a section where `getEndpointKeys()` resolves incorrectly (contradicting the `BIL-OQ-2` resolution), file a follow-up bug rather than expanding this fix's scope.
- [ ] No `docs/prd.md` Open Questions to update (this spec introduced none there).

## 8. Roll-back plan

1. Revert the single PR covering `BIL-T-1`–`BIL-T-3` (small enough to land as one PR).
2. No migration to revert — client-only change.
3. No feature flag was introduced — nothing to disable.
4. Not a bilateral/platform-report **payload** surface (no `/api/bilateral/*` contract change) — no payload fixture comparison needed.
5. A rollback restores the prior `window.confirm()` popup behavior (the known bug) until a corrected fix ships — communicate this to the reporter if rollback is ever needed.

## Required cross-references

- `docs/specs/bugfix/bilateral-section-autosave-on-navigate/requirements.md`, `design.md` (same folder).
- `docs/prd.md` `US-S5`; `docs/trd/trd.md` Bilateral module.
- `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/CLAUDE.md` (updated by `BIL-T-3`).

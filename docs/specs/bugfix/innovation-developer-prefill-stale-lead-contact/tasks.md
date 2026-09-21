# Tasks — Innovation Developer prefill reads a stale Lead contact person

| Field | Value |
|---|---|
| Spec path | `bugfix/innovation-developer-prefill-stale-lead-contact` |
| Depth | Lite · Bug Mode |
| Budget | 3 tasks · ~40 LOC · 1 review round · **exceeded — pivot on 2026-09-18, see `execution.md`** |
| Order | `T-1` → `T-4` (`T-2` + `T-3` merged by the pivot; both superseded) |

Shared verification, from `onecgiar-pr-client/`:

```bash
npx jest --silent --no-coverage --testPathPattern="section-general-info|type-innovation-dev"
npx ng lint --quiet
npx ng build --configuration development   # the only thing that typechecks templates
```

---

## `BIL-IDP-T-1` — Regression test: red before the fix

- **Status:** `[x]`
- **Size:** S · **Depends on:** none
- **Requirements:** `R-1` (both scenarios), `R-2` (both scenarios + the reload clause), `R-3` (scenario + both clauses)
- **Design:** `DD-1` (executed against it; later superseded by `DD-4`), `DD-2`, `DD-3`
- **Skills:** `tdd`, `angular-developer`

### Scope

Add specs to the two existing files. No production code in this task.

`type-innovation-dev.component.spec.ts`:

1. **The reported failure** (`R-1` sc1) — mount with an empty `resultLeadContact`, let the section GET resolve with a body that has no `innovation_developers` key, *then* set `resultLeadContact`. Assert the body picks it up. **This must fail on current code.**
2. **Load path unchanged** (`R-1` sc2) — contact already set before the GET resolves → prefilled, as today.
3. **Typed value survives** (`R-2` sc1) — body carries a typed string; change the contact; assert unchanged.
4. **Cleared stays cleared** (`R-2` sc2) — body carries `innovation_developers: null` (the shape `InnovationDevExists` returns once a row exists); change the contact; assert it stays `null`. Distinct from case 3: `null` is falsy, which is exactly what the `T-12` rework was about.

`section-general-info.component.spec.ts`:

5. **Pre-hydration does not clobber** (`R-3`) — service signal holds a stored contact; mount; before the hydration effect runs, assert the signal is unchanged **and** `autoSaveService.updateFieldsBatch` was not called.
6. **Post-hydration publishes** (`R-1`) — select a contact; assert the signal carries it.

### Done

- Cases 1 and 6 **fail** on current `HEAD` — capture the failure output in `execution.md`. A green suite here means the test does not reproduce the bug and the task is not done.
- Cases 2–5 pass on current `HEAD` (they guard behaviour that already works).

### What disqualifies this evidence

- If case 1 passes before any production change, it is not reproducing the reported bug — most likely it set the contact before the GET resolved. Rewrite it; do not proceed.
- A test that asserts the *rendered* textarea value instead of `component.body.innovation_developers` is not evidence here — see `D5`. jsdom cannot lay out `custom-fields` components; that assertion would be a presence-assertion, not proof.

### Input that would make this check fail

Reverting either fix must turn **the suite** red again — each fix has its own case:

| Revert | Turns red |
|---|---|
| the publish (`DD-4`, was `DD-1`) | case 6 |
| the re-evaluable prefill (`DD-2`) | case 1 |

**Corrected 2026-09-18.** This clause previously read *"reverting **either** fix must turn **case 1** red"*. That is unsatisfiable: case 1 lives in `type-innovation-dev.component.spec.ts`, where the creation service is a stub and General information is never mounted, so case 1 is structurally sensitive to `DD-2` only. Case 6 is the one that covers the publish. Left as written, an auditor reverting the publish would find case 1 green and wrongly conclude the test was broken.

---

## ~~`BIL-IDP-T-2` — Publish the settled contact~~ — SUPERSEDED

- **Status:** `[~]` → **superseded by `T-4`** (pivot, 2026-09-18)
- Implemented once, rejected at review: publishing on every contact commit re-entered the hydration effect and blanked the Lead contact field mid-typing. Reverted. Full record in `execution.md` → `## Pivot Record: BIL-IDP-T-2`.

---

## ~~`BIL-IDP-T-3` — Make the prefill re-evaluable~~ — FOLDED INTO `T-4`

- **Status:** `[ ]` → **folded into `T-4`** (pivot, 2026-09-18)
- The prefill change itself is unchanged from `DD-2`; it merged into `T-4` because the pivot coupled it to the publish trigger.

---

## `BIL-IDP-T-4` — Publish on save, and make the prefill re-evaluable

- **Status:** `[x]` — code PASS 2026-09-18; the `D5` manual browser check remains open at the HITL pause
- **Size:** S · **Depends on:** `T-1`
- **Requirements:** `R-1` (both scenarios + the type-7 clause), `R-2` (both scenarios + the reload clause), `R-3` (+ both clauses), `N-1`, `N-2`, `N-3`
- **Design:** `DD-4` (supersedes `DD-1`), `DD-2`, `DD-3`
- **Skills:** `angular-developer`

### Scope

1. **Revert `DD-1`.** `updateGeneralInfoMdsFields()` returns to its state at `9297c4eab` — no publish inside it.
2. **Publish on save.** In `section-general-info.component.ts`, subscribe to `autoSave.manualSave$`, filter on `'general-info'`, and publish the settled contact to `creationService.resultLeadContact` (`?? ''`) / `resultLeadContactData`. Follow the existing pattern in `section-evidence.component.ts:142-146`, including the `ngOnDestroy` unsubscribe.
3. **Re-evaluable prefill** (`DD-2`, unchanged). In `type-innovation-dev.component.ts`, replace the single `loadData()`-path call to `applyInnovationDevelopersPrefill()` with an `effect()` reading `loaded()` and `resultLeadContact()`. **The body of `applyInnovationDevelopersPrefill()` does not change** — the key-presence guard is the whole correctness argument (`DD-3`).
4. **Retarget `T-1` case 6** to assert on the save event rather than on the commit, and add the case named below.
5. Update `type-innovation-dev/CLAUDE.md` and re-stamp `Verified:` in the same commit.

`updateMds()` and `buildPayload()` untouched (`N-1`, `N-2`).

### Done

- `T-1` cases 1–5 pass; case 6 passes against the save event.
- **New case — the mid-typing null is never published:** hydrate a stored free-text contact (`'Arouna Dissa'`, data `null`), `detectChanges()`, simulate the keystroke commit (`body.lead_contact_person = null; body.lead_contact_person_data = null`), `detectChanges()`, assert `resultLeadContact()` is **still** `'Arouna Dissa'`. This is the regression gate for the defect that caused the pivot.
- `npx ng build --configuration development` passes (the only template type-check; carried forward as an advisory from `T-1`).
- `CLAUDE.md` updated and re-stamped.
- **Manual browser check** (`D5` substitute, at the HITL pause): open an Innovation development bilateral result with both fields empty, set the Lead contact person, press **Save draft**, and confirm the Innovation Developer textarea repaints. Record the outcome in `execution.md`.

### The type-7 clause

Unchanged from `T-3`: `app-type-innovation-dev` is mounted by `@case (7)` in `section-type-specific.component.html:21`, so the effect cannot exist for another type. Covered by construction. Grep for a second usage before closing.

### What disqualifies this evidence

- Green specs with a still-blank textarea in the browser. The specs prove the model; only the manual check proves the render (`D5`).
- A publish that still fires from `updateGeneralInfoMdsFields()`. Read the placement — the whole pivot is that it does not.
- If the effect writes when `loaded()` is `null`/`false`, the GET will overwrite it and the test may pass by luck of ordering. Read the guard.

### Input that would make this check fail

- Deleting the `'innovation_developers' in this.body` guard must turn `T-1` case 4 red.
- Moving the publish back into `updateGeneralInfoMdsFields()` must turn the new mid-typing case red.
- Reverting the `effect()` must turn case 1 red.

# Tasks — Innovation Developer prefill reads a stale Lead contact person

| Field | Value |
|---|---|
| Spec path | `bugfix/innovation-developer-prefill-stale-lead-contact` |
| Depth | Lite · Bug Mode |
| Budget | 3 tasks · ~40 LOC · 1 review round |
| Order | `T-1` → (`T-2` ∥ `T-3`) — `T-1` must be red before either fix lands |

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
- **Design:** `DD-1`, `DD-2`, `DD-3`
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

Reverting either fix must turn case 1 red again. If the suite stays green with `DD-1` reverted, the test is reading the signal it set itself rather than the path through General information.

---

## `BIL-IDP-T-2` — Publish the settled contact

- **Status:** `[ ]`
- **Size:** XS · **Depends on:** `T-1`
- **Requirements:** `R-1`, `R-3` (+ both clauses), `N-1`, `N-3`
- **Design:** `DD-1`
- **Skills:** `angular-developer`

### Scope

In `section-general-info.component.ts` → `updateGeneralInfoMdsFields()`, **below** `if (!this.leadContactHydrated) return;`, publish the current name and directory match to `creationService.resultLeadContact` / `resultLeadContactData`.

Nothing above the guard. Nothing in `buildPayload()` or any save path (`N-1`).

### Done

- `T-1` cases 5 and 6 pass.
- `updateFieldsBatch` call count is unchanged from before the task (`R-3` clause 2) — the publish is a signal write, not a new save.

### What disqualifies this evidence

A passing suite with the publish placed **above** the hydration guard: cases 5 and 6 could both pass while the stored contact is destroyed on a path the specs do not mount. Verify by reading the placement, not only the green.

### Input that would make this check fail

Moving the publish above the guard must turn case 5 red. If it does not, case 5 is not asserting the pre-hydration window.

---

## `BIL-IDP-T-3` — Make the prefill re-evaluable

- **Status:** `[ ]`
- **Size:** S · **Depends on:** `T-1`
- **Requirements:** `R-1` (+ the type-7 clause), `R-2` (+ the reload clause), `N-1`, `N-2`
- **Design:** `DD-2`, `DD-3`
- **Skills:** `angular-developer`

### Scope

In `type-innovation-dev.component.ts`, replace the single `loadData()`-path call to `applyInnovationDevelopersPrefill()` with an `effect()` reading `loaded()` and `creationService.resultLeadContact()`.

**The body of `applyInnovationDevelopersPrefill()` does not change** — the key-presence guard is the whole correctness argument (`DD-3`).

Then update `type-innovation-dev/CLAUDE.md`: add the in-session behaviour under "Innovation developers — removed, then restored", and re-stamp `Verified:` in the same commit.

`updateMds()` is untouched (`N-2`).

### Done

- `T-1` cases 1–4 pass.
- `CLAUDE.md` updated and re-stamped.
- **Manual browser check** (the `D5` substitute, done at the HITL pause, not by the implementer alone): open an Innovation development bilateral result with both fields empty, set the Lead contact person, scroll to Type-specific and confirm the textarea **repaints** with the value. Record the outcome in `execution.md`.

### The type-7 clause

`R-1`'s "MUST apply only to `result_type_id` 7" is **structural, not asserted**: `app-type-innovation-dev` is mounted by `@case (7)` in `section-type-specific.component.html:21`, so the effect cannot exist for another type. Recorded as covered-by-construction. What would falsify it: mounting this component from anywhere other than that `@switch`. Grep for a second usage before closing the task.

### What disqualifies this evidence

- Green specs with a still-blank textarea in the browser. The specs prove the model; only the manual check proves the render (`D5`).
- If the effect writes when `loaded()` is `null`/`false`, the GET will overwrite it and the test may still pass by luck of ordering. Read the guard; do not infer it from green.

### Input that would make this check fail

Deleting the `'innovation_developers' in this.body` guard must turn case 4 red. If case 4 stays green without the guard, it is not exercising the stored-`null` shape and the `T-12` regression is unguarded.

# Tasks — Bilateral ToC: no justification field when the answer is "No"

## Scope

- **Module / feature:** bilateral → `section-toc`
- **Linked spec:** `requirements.md` + `design.md` (this folder)
- **Depth:** Lite — one task
- **Status:** in-progress

## Pre-flight

- [ ] `requirements.md` and `design.md` approved
- [ ] Branch is not `staging`/`master`; confirm the branch again right before committing
- [ ] `onecgiar-pr-client/src/environments/environment.ts` present in this worktree (gitignored; the client suite dies with `Cannot find module` without it)

## BIL-TOC-WR-T-1 — Remove the justification field from the bilateral ToC block

| Field | Value |
|---|---|
| **Status** | `[~]` — code PASS (Reviewer, attempt 1); manual browser check outstanding |
| **Size** | S |
| **Depends on** | — |
| **Requirements** | `BIL-TOC-WR-R-1`, `R-2`, `R-3`, `N-1`, `N-2` |
| **Design** | `design.md` → Architecture Overview, DD-1, DD-2 |
| **Skills** | `angular-developer` |

### Scope

1. `section-toc.component.html` — delete the `@if (showWhyReported()) { … }` block (`:33-45`).
2. `section-toc.component.ts` — delete `showWhyReported` (`:93`), `onWhyReportedInput` and `_whyReportedTimer` (`:582-588`) plus its branch in `clearTocDebouncers` (`:393-396`), and the `toc-why-reported` item in `publishTocMds` (`:617-625`).
3. `section-toc.component.ts` — **keep** `whyReported`, its hydration (`:279-280`, `:320-327`), its reset in `clearTocSelection` and its payload branch (`:448-449`), with an inline comment stating that the value is hidden but still sent because `_handleUnplannedSpecialCase` (`results-toc-results.service.ts:2674`) re-inserts the row and would write `null` if the key were dropped (`N-2`).
4. `section-toc.component.spec.ts` — rewrite the `whyReported (unplanned justification)` block (`:694+`): drop the assertions that the field is editable and mandatory, keep/raise a **data-preservation** test, and delete the stale comment claiming it "gates Submit".

### Tests

| Covers | Check |
|---|---|
| `R-1` (no field on "No") | Render the fixture with `isPlanned=false` and assert no element carries the label *"Why is this result being reported?"*. **If the child controls do not render in this harness**, record that and fall back to asserting the component no longer exposes `showWhyReported`/`onWhyReportedInput` — noting explicitly that this proves member removal, **not** that the DOM is clean |
| `R-1` (Yes branch untouched) | The rest of `section-toc.component.spec.ts` stays green, unmodified |
| `R-2` (no data loss) | Hydrate `loadTocState` with `planned_result: false` + a non-empty `toc_progressive_narrative`, trigger a ToC autosave, assert `saveTocMapping` was called with that **same string** — not `undefined`, not `''` |
| `R-3` (checklist) | Assert `publishTocMds` emits no `toc-why-reported` key when `isPlanned=false`, and that the remaining items keep `optional: true` |
| `N-1` (client-only) | `git diff --name-only` touches only files under `.../section-toc/` |

**Commands:** `npx jest --testPathPattern="section-toc" --silent --reporters=summary --no-coverage` and `npx ng lint --quiet`, both from `onecgiar-pr-client`.

### What would make these checks FAIL (falsifiability)

- The `R-2` test fails if the payload key is dropped or reduced to `undefined` — which is exactly the tempting "simpler" implementation. If no edit can make this test red, it is asserting the wrong thing.
- The `R-1` DOM assertion fails if the `@if` block is left in place, or re-added.
- The `R-3` assertion fails if the item is merely set to `filled: true` instead of removed.

### What disqualifies the evidence

- A **green suite with zero modified assertions** is not evidence: the current spec asserts the *old* behavior, so if nothing in `section-toc.component.spec.ts` changed, the run proves the change was not made.
- A member-removal assertion standing alone does not satisfy `R-1` — it proves the members are gone, not that the screen is clean. When it is the only available check, the task is **not** done until the manual check below is performed.

### Manual check (substitutes the gap named in `requirements.md`)

On `/bilateral/<centre>/result/<id>?phase=<n>` → **Contributors & partners**: answer **No** → nothing renders below the question; answer **Yes** → level/node/indicator/contribution/pathway narrative behave as before; tick the P/A checkbox → question hides as before.

### Done criteria

- [x] Textarea gone from the template; the three members removed; `whyReported` kept **with** the explanatory comment
- [x] `npx jest --testPathPattern="section-toc"` green **with** the updated assertions
- [x] `npx ng lint --quiet` clean
- [x] Diff confined to `section-toc/`; no server, DTO or migration file touched
- [ ] Manual check performed and reported ← **outstanding**

## Estimated LOC

~40 net. **Single PR** — no split warranted.

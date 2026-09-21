# Design — Bilateral Capacity Sharing: Long-term must reveal the Degree sub-radio

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-3382-bilateral-long-term-degree` |
| Type | Bug · **Bug Mode** · Depth **Lite** |
| Approval Mode | `gated` |
| Linked | `proposal.md`, `requirements.md` (this folder) |
| Delegation | None — every question was answered by CodeGraph-scoped reads of the two components, their specs and their `CLAUDE.md`/`AGENTS.md`. No scout spawned; below the 4-file threshold for new exploration |
| ADRs affected | None. No TRD ADR is touched or superseded |

## 2. Executive Summary

Two changes, both client-side, both inside components that already do everything required:

1. **Editor** (`type-capacity-sharing`) — move the existing sub-term radio out of the `@if (showAllFields())` full-metadata block to sit directly between *Length of training* and *Delivery Method*, and give it `label="Degree"`. **No TypeScript change**: the cascade handlers, hydration, sync and the MDS tracker are already correct and already tested.
2. **Drawer** (`cap-sharing-content`) — add the cascade that was never modelled there: split the catalogue into sub-terms and parent terms, resolve a stored `capdev_term_id` of 1/2 into *Long-term* + degree for display, and reconcile the reviewer's choice back into the same single key.

The whole spec is one relocation plus one port of an existing pattern. The risk is not in the logic — it is in two places where a careless implementation turns a green gate into a lie (§7 DD-4, DD-6).

## 3. Architecture Overview

Unchanged. Both components are leaf Angular components inside existing modules; neither owns state beyond its own view.

| Layer | Editor path | Drawer path |
|---|---|---|
| View | `app-type-capacity-sharing` → `app-pr-radio-button` → `app-field-card` | `app-cap-sharing-content` → same controls |
| Local UI state | `capdevTermId1` / `capdevTermId2`, reconciled by `syncCapdevTermId()` | **new**, same shape |
| Persisted key | `body.capdev_term_id` | `resultDetail.resultTypeResponse[0].capdev_term_id` (mutated in place, per `result-review-drawer/AGENTS.md` §8) |
| Write path | `queueTypeSave()` → `BilateralAutoSaveService.schedulePayload` (gated on `loaded() === true`) | The drawer's own Data Standards save, with justification dialog |
| Catalogue | `GET_capdevsTerms` — rows 1-2 are sub-terms, rows 3-4 are parent terms | same endpoint, currently only rows 3-4 read |

**The cascade contract, stated once** (it is the thing both components must agree on):

- `capdev_term_id` stores **one** integer. `3` = Short-term, standalone. `4` = Long-term with no degree chosen. `1`/`2` = Long-term **disambiguated by** PhD/Master — the parent `4` is not stored alongside them.
- Display decomposes: `1`/`2` → parent `4` + degree `1`/`2`; `4` → parent `4`, no degree; `3` → parent `3`.
- Write recomposes: degree if chosen, otherwise the parent.

## 4. Extended Directory Structure

No new files, no new folders. Touched:

```
onecgiar-pr-client/src/app/pages/
├── bilateral/components/section-type-specific/type-capacity-sharing/
│   ├── type-capacity-sharing.component.html        ← the fix (relocation + label)
│   ├── type-capacity-sharing.component.spec.ts     ← DOM regression tests
│   └── CLAUDE.md                                   ← trap entry appended
└── result-framework-reporting/pages/bilateral-review/components/result-review-drawer/
    └── components/cap-sharing-content/
        ├── cap-sharing-content.component.ts        ← cascade added
        ├── cap-sharing-content.component.html      ← Degree control added
        └── cap-sharing-content.component.spec.ts   ← cascade + snapshot tests

onecgiar-pr-client/cypress/e2e/
└── bilateral-capacity-sharing-mds.cy.ts            ← one browser case
```

## 5. Data Model

**Unchanged.** `results_capacity_developments.capdev_term_id` → FK to `capdevs_term`. Catalogue rows are seeded by migrations `1668784095214` (PhD, Master, Short-term) and `1668806452093` (Long-term), read back by `capdevs-terms.service.ts` with a plain `find()` — no `ORDER BY`, so the positional split both components rely on is an assumption, recorded as `A1` / `CSD-OQ-1` and deliberately not changed here.

## 6. API Design · Backend Module Design · Shared Contracts

**None.** No endpoint, DTO, payload shape, validation function or shared package changes. `GET /capdevs-terms` and `PATCH …/capacity-developent/create/result/:id` are consumed exactly as they are today; the PATCH body keeps `capdev_term_id` as a single integer. This satisfies the backwards-compatibility NFR without a server-side review.

## 7. Frontend / UX Component Architecture & Design Decisions

### DD-1 — Relocate the control; never move the toggle *(`CSD-R-1`)*

The Degree radio moves out of `@if (showAllFields())` and lands between *Length of training* and *Delivery Method*, carrying its guard condition unchanged. The rejected alternative — forcing `showAllFields` open when Long-term is selected — was rejected because the toggle is a **persisted user preference** (`BilateralExpandableStateService` writes `bp_extra_<resultId>_type-specific` to `localStorage`); flipping it programmatically would drag the organization fields on screen unasked and overwrite a choice the user made. Fixing where a node lives is cheaper and more honest than automating around where it does not.

`.tsf-fields` already supplies the `18px` column gap (`section-type-shared.scss:1-5`), so nothing is needed from SCSS. The `flex flex-col gap-[18px]` wrapper the control leaves behind still has the attendance question and the organizations multi-select, so it is not emptied.

> **Reversion challenge (Step 2.3):** *what does removing the Degree control from the full-metadata block break?*
> **Nothing.** The control's only consumers are `capdevTermId2` and `syncCapdevTermId()`, neither of which knows where it renders. No unit test asserts its position, and the Cypress suite's only toggle assertion is about the **attendance question**, not the degree (`bilateral-capacity-sharing-mds.cy.ts:67-73`) — verified by reading the file, not assumed. No covering test, no visible surface lost.

### DD-2 — `label="Degree"` is a behavioural change, not decoration *(`CSD-R-5`)*

`app-field-card` computes `isBare = !hasLabel && !(showDescription && !!description)` (`field-card.component.ts:268`) and skips the entire `field_card` class when it is true. The bilateral control has **neither** label nor description today, so it renders bare — the exact defect P2-3385 fixed on the W1/W2 side. Adding the label is what restores the frame.

Consequence for verification: the gate asserts the **rendered `field_card` class**, not the presence of the `label` input. Asserting the input would be a presence-assertion that proves nothing about the frame; asserting the class exercises `isBare` and therefore the effect. *(Resolves the proposal’s OQ-1; the ticket's "unlabelled" wording predates P2-3385 and is stale.)*

~~`[required]` stays **false**, matching `cap-dev-info.component.html:55`. Flipping it would make the section uncompletable for long-term training that is neither PhD nor Master.~~ ⚠️ **SUPERSEDED by the Pivot of 2026-09-18** — `[required]="true"`, and the degree now gates the green check. The PO accepted that long-term training with no degree reads as incomplete; W1/W2 keeps the old rule, so the two screens knowingly diverge on optionality (`CSD-R-10`).

### DD-3 — The MDS tracker is not touched *(`CSD-R-4`)* — ⚠️ **SUPERSEDED 2026-09-18**

> **Superseded by the Pivot recorded in `execution.md` (`CSD-T-6`).** The PO decided the Degree gates the green check. The reasoning below still holds for *why no fourth item may be registered* — that part is unchanged and load-bearing. What changed is only the `length-of-training` **predicate**: a bare `4` no longer counts as filled. The three-key contract survives.

No `degree` item is registered. Per the component's own `CLAUDE.md`: *"Nothing outside the MDS may enter `setSectionFields` with `filled: false`"* — the tracker computes `complete` as `filledFields === totalFields`, so a fourth never-filled item leaves the section amber forever and **disables Submit** (`overallStatus() === 'complete'`). That is precisely what the attendance field did in P2-3382 and what the three separate gender counts did in P2-3348. `length-of-training` stays keyed on `capdev_term_id != null`, which `4` alone satisfies.

### DD-4 — The drawer hydrates read-only; it never writes back on load *(`CSD-R-6`)*

The drawer tracks unsaved edits by serializing a normalized snapshot of `resultTypeResponse[0]` and comparing it to a baseline captured at load (`result-review-drawer.component.ts:390-402`). `hasDataStandardUnsavedChanges()` feeds `canApprove()` — so **any write into `capdev_term_id` during hydration would mark a freshly opened drawer dirty and block Approve with a change the reviewer never made.**

Therefore: hydration derives the two local ids *from* `capdev_term_id` and stops. The persisted key is written only from a user-initiated change handler. Hydration lives in the existing `set resultDetail(value)` setter, after the current null-backfill, and is idempotent — re-running it on the same object yields the same pair, so a parent re-emit cannot corrupt an in-progress selection.

This is the single highest-risk line in the spec, which is why §9 of `requirements.md` gives it its own defect class (**D**) with a named falsifying input.

### DD-5 — The drawer's catalogue split changes shape *(`CSD-R-6`)*

`loadCapdevsTerms()` currently keeps `response.slice(2, 4)` — parent terms only. It must additionally keep `response.slice(0, 2)` as sub-terms. The parent list keeps the same contents, so the *Length of training* options are unchanged; the component simply gains a second list.

> **Reversion challenge (Step 2.3):** *what does changing this break?*
> **One existing test, deliberately.** `cap-sharing-content.component.spec.ts:42-47` asserts `capdevsTerms()` equals `[{id:3},{id:4}]`. That assertion stays true and must be **kept**, not rewritten — the change is additive. What must be added is the sub-term expectation. Rewriting the existing assertion instead of extending it would hide a real regression in the parent split. Named here so the Implementer does not "fix" a passing test.

### DD-6 — Where each regression test can actually live, and where it cannot

| Target | Home | Why |
|---|---|---|
| Editor DOM (**class A**, **B**) | `type-capacity-sharing.component.spec.ts` → existing `rendered template` describe block (`:525`) | It is the **only** block in that file that renders the real template; every other block overrides the template away. Renders with `loaded() === true` via the default GET mock |
| Editor browser (**class A**) | `bilateral-capacity-sharing-mds.cy.ts`, one new case | The bug is a rendering decision, which is the stated reason that suite exists in a real browser |
| Drawer cascade + snapshot (**class D**) | `cap-sharing-content.component.spec.ts`, state-level | ⚠️ **Named gap:** that spec calls `overrideComponent(… { set: { template: '' … } })` — it has **no DOM at all**. So `CSD-R-6`'s *rendering* is not automatically covered; only the resolved state and the snapshot invariant are. Restoring the template would pull `CustomFieldsModule` into a spec that has never compiled it, which is a larger change than this bugfix should make |
| Drawer rendering (the gap above) | **Human check at the Phase-3 HITL pause**, recorded in `execution.md` | Consistent with class **B′**: an acknowledged blind spot, not a green gate that cannot see |

**Cypress precondition, stated explicitly.** `showAllFields` persists to `localStorage`, and a sibling case in the same file clicks the toggle open for the same result id (`9999`). Cypress 14 isolates tests and clears `localStorage` between them, but the new case must **not rely on that**: it asserts the collapsed precondition first (the attendance question is absent) and only then asserts the Degree group is present. If isolation ever regressed, the test fails loudly on its precondition instead of passing for the wrong reason.

### UI/UX

The target rendering already exists and ships — `/result/result-detail/9448/cap-dev-info?phase=36`. No new tokens, no new component, no new copy beyond the word "Degree". Option order follows the catalogue: PhD, then Master.

## 8. Risks

| # | Risk | Mitigation |
|---|---|---|
| R-1 | Drawer hydration blocks Approve (DD-4) | Defect class **D** with a snapshot-equality test and a named falsifying input |
| R-2 | An Implementer "simplifies" the existing drawer term assertion (DD-5) | Called out as keep-not-rewrite, in the design and again in the task |
| R-3 | A fourth MDS item creeps in (DD-3) | Existing three-keys test added by `6de8274b0` fails on it |
| R-4 | Client suite reports `Tests: 0` and is read as green | `src/environments/*.ts` is gitignored and per-environment; copy it into the worktree before running. `Tests: 0` is an explicit non-pass in `requirements.md` §9 |
| R-5 | Touching another module's code unannounced | `CSD-OQ-2` — DM the `result-framework-reporting` owner before the drawer task; it gates that task only |

## 9. Budget (Step 2.4 — tripwire for `/akili-execute`)

| Metric | Expected |
|---|---|
| Tasks | **5** |
| LOC | **~190** total, of which **~130 are tests** (~60 production) |
| Review rounds | **1** |

**Depth re-check:** `Lite` still fits, but it is at the top of its range — two components in two modules is more than the single-file bugfixes `Lite` usually covers. It stays `Lite` because the production change is ~60 lines with no server, no data and no architectural surface, and because `Standard`'s alternatives/rollout/observability sections would all read "none". If execution exceeds ~190 LOC or needs a second review round, that is the tripwire: **stop and escalate**, do not absorb it.

**Not `/akili-quick`:** the change alters conditional rendering and ports a cascade into a second component. A relocation that changes what a user can see is not a cosmetic one-liner, and Bug Mode requires a red-before/green-after regression test either way.

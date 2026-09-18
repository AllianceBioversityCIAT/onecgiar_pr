# Tasks — Bilateral Capacity Sharing: Long-term must reveal the Degree sub-radio

## 1. Scope of this task list

| Field | Value |
|---|---|
| Module / feature | `bilateral` · Capacity Sharing → *Length of training* term cascade (+ `result-framework-reporting` review drawer) |
| Linked spec | `requirements.md` + `design.md` (this folder) |
| Type / Depth | Bug · **Bug Mode** · **Lite** |
| Owner | Juan David Delgado |
| Ticket | P2-3382 — closes its own AC5 / AC6 |
| Status | `not-started` |
| Budget (tripwire) | ~~5~~ **6** tasks (Pivot 2026-09-18 added `CSD-T-6`) · ~190 LOC (~60 production) · 1 review round. Exceeding it → **stop and escalate**, do not absorb |

## 2. Pre-flight checklist

- [x] `requirements.md` approved — 2026-09-18
- [x] `design.md` approved — 2026-09-18
- [x] `CSD-OQ-1` (hardcoded term ids) accepted as out of scope → note on P2-3382, not folded in
- [~] **`CSD-OQ-2` — Slack DM sent to the `result-framework-reporting` owner** (epic, activity, components touched). **Gates `CSD-T-3`/`CSD-T-4` only**; the editor tasks are not blocked by it. → **DM still owed**: dispatched by explicit user decision 2026-09-18 (see `execution.md` §2), user sends it
- [x] `src/environments/*.ts` copied into this worktree (gitignored, per-environment) — without it every client suite dies with `Cannot find module` and reports `Tests: 0`, which is **not** a pass
- [x] No other in-flight spec touches these two components (`grep -rl type-capacity-sharing docs/specs`)
- [x] Migrations: **n/a** — no schema change in this spec

## 3. Task list

### `CSD-T-1` — Write the editor regression tests, red  `[x]`

- **Type:** `tests`
- **Description:** Add the DOM-level assertions that the current code fails. In `type-capacity-sharing.component.spec.ts`, inside the existing `rendered template` describe block (`:525`) — the only block in that file that renders the real template — assert that with `showAllFields()` **false** and `capdevTermId1 = 4`, the Degree group is in the DOM below *Length of training*, that its host carries the `field_card` class, that it is absent when `capdevTermId1` is null or `3`, and that a load of `capdev_term_id = 2` hydrates to Long-term + Master **with the toggle still collapsed**. Add one Cypress case to `bilateral-capacity-sharing-mds.cy.ts` that asserts the collapsed precondition first, then the Degree group.
- **Implements:** `CSD-R-1` (all clauses), `CSD-R-3`, `CSD-R-5`, `CSD-AC-1`, `CSD-AC-3`, `CSD-AC-5`
- **Files:** `…/type-capacity-sharing/type-capacity-sharing.component.spec.ts`, `onecgiar-pr-client/cypress/e2e/bilateral-capacity-sharing-mds.cy.ts`
- **Depends on:** — · **Blocks:** `CSD-T-2`
- **Estimate:** `S`
- **Skills:** `angular-developer`, `tdd`
- **Scope notes:**
  - Assert the **rendered `field_card` class**, never the `label` input (design DD-2). A `label` assertion is a presence-assertion and proves nothing about the frame.
  - The Cypress case MUST assert the collapsed precondition (`should('not.contain.text', ATTENDANCE_Q)`) **before** asserting the Degree group. `showAllFields` persists to `localStorage` (`bp_extra_9999_type-specific`) and a sibling case in the same file clicks the toggle open for the same result id. Cypress 14 isolates tests, but this case must not depend on that — if isolation regressed it must fail on its precondition, not pass for the wrong reason.
  - The same Cypress case MUST also assert that after selecting Long-term the toggle is **still** collapsed — button label unchanged at "Complete full metadata" and the attendance question still absent. That is the `CSD-R-1` BUT clause ("must NOT alter the toggle state"), and it is the only check that separates this fix from the rejected auto-expand approach (design DD-1).
  - Do **not** modify the component in this task. Red is the deliverable.
- **Definition of done:**
  - [ ] The new jest cases **fail** against current `master`-state code, and the failure message names the missing Degree group (not a generic null deref)
  - [ ] The new Cypress case fails for the same reason
  - [ ] No production file touched in this task's diff
- **Verification:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="type-capacity-sharing"` → expected **FAIL** on exactly the new cases.
  - **Falsifying input:** if the suite passes here, the test is not exercising the bug — most likely it toggled `showAllFields` or asserted on component state instead of the DOM. A green run at this step is a **failed task**, not a shortcut.
  - **Disqualifier:** `Tests: 0`, a module-resolution error, or a failure in a pre-existing case means the run is **inconclusive** — fix the harness and re-run; do not record it as red.

### `CSD-T-2` — Relocate the Degree control and label it *(the fix)*  `[x]`

- **Type:** `client`
- **Description:** In `type-capacity-sharing.component.html`, move the `@if (capdevTermId1 === 4 || capdevTermId1 === 1 || capdevTermId1 === 2) { … }` block out of `@if (showAllFields())` and place it between the *Length of training* and *Delivery Method* radios, carrying its guard condition unchanged. Add `label="Degree"`; keep `[required]="false"`. No TypeScript change, no SCSS change.
- **Implements:** `CSD-R-1`, `CSD-R-2`, `CSD-R-3`, `CSD-R-5`, `CSD-R-10`, `CSD-AC-1`, `CSD-AC-2`, `CSD-AC-3`, `CSD-AC-5`
- **Files:** `…/type-capacity-sharing/type-capacity-sharing.component.html`
- **Depends on:** `CSD-T-1` · **Blocks:** `CSD-T-5`
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Scope notes (negative constraints, from the scenarios):**
  - **Must NOT alter the toggle state** (`CSD-R-1` BUT clause). No programmatic `showAllFields.set(...)`, no auto-expand. Fixing where the node lives, not automating around it (DD-1).
  - **Must NOT add a checklist item** (`CSD-R-4` BUT clause). `setSectionFields` stays at three keys — a fourth never-filled item leaves the section amber and **disables Submit** (DD-3, and the component's own `CLAUDE.md`).
  - **Must NOT touch `queueTypeSave` or the `loaded() === true` gate** (`CSD-R-2` AND-IT-MUST clause) — an empty capacity-sharing payload is read by the server as a deletion (P2-3556).
  - Leave the `flex flex-col gap-[18px]` wrapper in place; it still holds the attendance question and the organizations multi-select.
- **Definition of done:**
  - [ ] All `CSD-T-1` cases now pass, with **no edit to those tests**
  - [ ] The three-MDS-keys test (added by `6de8274b0`) still passes
  - [ ] Existing cascade tests (`:372-419`) still pass untouched
  - [ ] Lint clean; commit follows `<emoji> <type>(<scope>) [ticket]: <description>`
- **Verification:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="type-capacity-sharing"` → **PASS**, then `npx ng lint --quiet`.
  - **Falsifying input:** move the block back inside `@if (showAllFields())` → `CSD-T-1`'s cases fail again. If they do not, they were never testing the placement.
  - **Disqualifier:** a pass obtained by editing a `CSD-T-1` assertion is not a pass. If a test had to change to go green, stop and report why.

### `CSD-T-3` — Write the drawer cascade tests, red  `[x]`

- **Type:** `tests`
- **Description:** In `cap-sharing-content.component.spec.ts`, add cases asserting that a `resultDetail` carrying `capdev_term_id = 1` resolves to parent `4` + degree `1`; that `4` resolves to parent `4` with no degree; that `3` resolves to parent `3`; that choosing a degree recomposes `capdev_term_id` to that degree and clearing back to Short-term writes `3`; and — the important one — that **hydration leaves the drawer's normalized data-standard snapshot byte-identical**. **Extend** the existing `capdevsTerms()` assertion (`:42-47`) with the new sub-term expectation; do **not** rewrite it.
- **Implements:** `CSD-R-6` (all clauses), `CSD-AC-6`
- **Files:** `…/cap-sharing-content/cap-sharing-content.component.spec.ts`
- **Depends on:** `CSD-OQ-2` (owner notified) · **Blocks:** `CSD-T-4`
- **Estimate:** `S`
- **Skills:** `angular-developer`, `tdd`
- **Scope notes:**
  - ⚠️ **Keep, do not rewrite, `it('loads the third and fourth capdev terms …')`.** Its `[{id:3},{id:4}]` expectation stays true — the change is additive. Rewriting it would hide a real regression in the parent split (design DD-5).
  - The snapshot test must reproduce the drawer's own comparison shape (`structuredClone` of `resultTypeResponse[0]` → `JSON.stringify`), because that is what `hasDataStandardUnsavedChanges()` feeds into `canApprove()`.
  - ⚠️ **This spec overrides the template to `''` — it has no DOM.** These cases cover resolved state and the snapshot invariant only. The drawer's *rendering* is covered by `CSD-T-5`, not here. Do not attempt to restore the template: it would pull `CustomFieldsModule` into a spec that has never compiled it (design DD-6).
- **Definition of done:**
  - [ ] New cases **fail** against current code
  - [ ] The existing terms assertion still passes, unmodified
  - [ ] No production file touched
- **Verification:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="cap-sharing-content"` → expected **FAIL** on the new cases only.
  - **Falsifying input:** if the snapshot case passes before the cascade exists, it is not comparing what the drawer compares — re-derive it from `normalizeDataStandardForComparison`.
  - **Disqualifier:** any failure in a pre-existing case means the harness changed; that run is inconclusive.

### `CSD-T-4` — Add the term cascade to the review drawer  `[x]`

- **Type:** `client`
- **Description:** In `cap-sharing-content`, keep `response.slice(0, 2)` as sub-terms alongside the existing `slice(2, 4)` parents; add the two local ids and the decompose/recompose pair described in `design.md` §3; hydrate inside the existing `set resultDetail(value)` setter, after the null-backfill. Render the Degree control in the template below *Length of training*, labelled, optional, honouring `[disabled]` exactly as its siblings do.
- **Implements:** `CSD-R-6`, `CSD-AC-6`
- **Files:** `…/cap-sharing-content/cap-sharing-content.component.ts`, `…/cap-sharing-content.component.html`
- **Depends on:** `CSD-T-3` · **Blocks:** `CSD-T-5`
- **Estimate:** `M`
- **Skills:** `angular-developer`
- **Scope notes (the one that matters):**
  - 🛑 **Hydration is read-only.** It derives the two local ids *from* `capdev_term_id` and writes nothing back. Any write during load marks a freshly opened drawer dirty via `hasDataStandardUnsavedChanges()` and **blocks Approve** with a change the reviewer never made (design DD-4, `CSD-R-6` BUT clause).
  - Hydration must be **idempotent** — the setter can fire more than once on the same object, and re-running it must not clobber an in-progress selection.
  - `capdev_term_id` is written **only** from a user-initiated change handler, mutating `resultTypeResponse[0]` in place per `result-review-drawer/AGENTS.md` §8. Do not introduce a second source of truth.
  - `OnPush` — the component already calls `cdr.markForCheck()` in the setter; keep signal/`markForCheck` discipline consistent with what is there.
- **Definition of done:**
  - [ ] All `CSD-T-3` cases pass, with no edit to those tests
  - [ ] The pre-existing drawer spec passes untouched
  - [ ] Lint clean
- **Verification:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="(cap-sharing-content|result-review-drawer)"` → **PASS**, then `npx ng lint --quiet`.
  - **Falsifying input:** hydrate by assigning `capdev_term_id = capdevTermId1` → the snapshot case fails. If it still passes, the snapshot test is not wired to the drawer's real comparison.
  - **Disqualifier:** running only `cap-sharing-content` and not `result-review-drawer` leaves the Approve path unexercised — the pattern above must include both, and a `Tests: 0` on either half is inconclusive.

### `CSD-T-5` — Visual verification against W1/W2, and record the traps

- **Type:** `docs`
- **Description:** The blind-spot closer. On prtest, open `/bilateral/AfricaRice/result/9460?phase=36` side by side with `/result/result-detail/9448/cap-dev-info?phase=36` and confirm by eye that the Degree card matches the reference (frame, position under *Length of training*, option order PhD → Master, spacing). Open the review drawer on a result saved with a degree and confirm it renders the resolved value **and that Approve is not blocked on open**. Then append a trap entry to `…/type-capacity-sharing/CLAUDE.md` recording why the Degree control must stay outside the full-metadata block, and record the drawer's DOM-coverage gap.
- **Implements:** defect classes **B′** and the DD-6 drawer-rendering gap; confirms `CSD-R-5`, `CSD-R-6`
- **Files:** `…/type-capacity-sharing/CLAUDE.md`, `execution.md` (this folder)
- **Depends on:** `CSD-T-2`, `CSD-T-4` · **Blocks:** —
- **Estimate:** `S`
- **Skills:** — (manual verification + doc)
- **Definition of done:**
  - [ ] Both screenshots captured and referenced in `execution.md`
  - [ ] Drawer confirmed to open **without** `hasDataStandardUnsavedChanges()` blocking Approve
  - [ ] `CLAUDE.md` trap entry appended
  - [ ] The DOM-coverage gap for the drawer is recorded as an accepted risk, not silently closed
- **Verification:** human, at the HITL pause. **There is no command for this** — jsdom cannot measure layout and the `field_card` assertion proves the frame exists, not that it matches the reference.
  - **Disqualifier:** "looks fine" is not a record. If a screenshot was not taken, the check did not happen, and `execution.md` must say so rather than claim a pass.

### `CSD-T-6` — Make the Degree mandatory for Long-term *(added by Pivot, 2026-09-18)*  `[x]`

- **Type:** `client`
- **Description:** Tighten the existing `length-of-training` MDS predicate so a bare `capdev_term_id = 4` is **not** filled (`1`/`2`/`3` are), and set `[required]="true"` on the Degree control. Update P2-3771's template-text case that pins `[required]="false"`.
- **Implements:** `CSD-R-4` **as reversed** by the Pivot (see `execution.md` → *Pivot Record: `CSD-T-6`*)
- **Files:** `…/type-capacity-sharing.component.ts`, `…/type-capacity-sharing.component.html`, `…/type-capacity-sharing.component.spec.ts`
- **Depends on:** `CSD-T-2` · **Blocks:** `CSD-T-5`
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Scope notes:**
  - 🛑 **No fourth checklist item.** `complete` is `filledFields === totalFields`, so a fourth never-filled entry leaves the section amber forever and disables Submit unconditionally (P2-3348). Change one predicate; keep exactly three keys.
  - The P2-3771 block scans the template as **TEXT** (`indexOf`/regex) — no comment may place a literal control string ahead of the real markup, or its placement case fails falsely.
  - Editing P2-3771's optionality assertion is **authorized by the Pivot** and must be renamed, not deleted. **Yecksin to be notified** (module-ownership rule).
- **Definition of done:**
  - [ ] Bare `4` → `length-of-training` unfilled, section not complete; `1`/`2`/`3` → filled
  - [ ] Checklist still exactly three keys
  - [ ] P2-3771's placement case untouched and passing
  - [ ] Lint clean
- **Verification:** `npx jest … --testPathPattern="type-capacity-sharing"` → PASS, then `npx ng lint --quiet`.
  - **Falsifying input:** revert the predicate to `capdev_term_id != null` → the bare-`4` case must fail.
  - **Accepted consequence:** every existing long-term result goes amber until a degree is picked. Signed off by the PO, 2026-09-18.

## 4. Dependency graph

```
CSD-T-1 (editor tests, red)
   └── CSD-T-2 (editor fix → green)
                                  ├── CSD-T-5 (visual + docs)
CSD-OQ-2 (DM owner) ─┐            │
CSD-T-3 (drawer tests, red) ──────┤
   └── CSD-T-4 (drawer cascade) ──┘
```

**Parallel-safe:** the `CSD-T-1 → CSD-T-2` chain and the `CSD-T-3 → CSD-T-4` chain touch disjoint files and can run concurrently. `CSD-T-5` joins them.

## 5. Coverage map — every scenario clause owned by a task

| Requirement | Scenario clause | Owning task | Gate |
|---|---|---|---|
| `CSD-R-1` | THEN Degree group rendered below *Length of training* | `CSD-T-1`/`T-2` | jest DOM + Cypress |
| `CSD-R-1` | AND selectable without clicking *Complete full metadata* | `CSD-T-1`/`T-2` | Cypress, collapsed precondition asserted first |
| `CSD-R-1` | BUT must NOT alter the toggle state | `CSD-T-1`/`T-2` | Cypress asserts the toggle label is still "Complete full metadata" and the attendance question still absent, after selecting Long-term |
| `CSD-R-1` | AND IT MUST NOT render with no selection | `CSD-T-1` | jest: `capdevTermId1 = null` → absent |
| `CSD-R-2` | THEN group disappears | `CSD-T-1`/`T-2` | jest: `capdevTermId1 = 3` → absent |
| `CSD-R-2` | AND payload carries `capdev_term_id = 3` | `CSD-T-2` | existing cascade test `:372-419` |
| `CSD-R-2` | BUT must NOT leave a stale degree | `CSD-T-2` | existing test asserting `capdevTermId2 === null` after Short-term |
| `CSD-R-2` | AND IT MUST NOT save before `loaded() === true` | `CSD-T-2` | existing P2-3556 save-gate tests (`:229`, `:276`) |
| `CSD-R-3` | THEN Long-term shown after reload | `CSD-T-1` | jest hydration case, `capdev_term_id = 2` |
| `CSD-R-3` | AND degree selected with toggle collapsed | `CSD-T-1` | same case, `showAllFields()` asserted false |
| `CSD-R-3` | AND IT MUST need no interaction | `CSD-T-1` | assertion made on first render, no events dispatched |
| `CSD-R-4` | THEN 3/3 green | `CSD-T-2` | existing three-keys test (`6de8274b0`) |
| `CSD-R-4` | BUT must NOT add a fourth item | `CSD-T-2` | same test — it pins the key list exactly |
| `CSD-R-4` | AND IT MUST keep `overallStatus()` reachable as complete | `CSD-T-2` | same test + `updateMds` block (`:301`) |
| `CSD-R-5` | THEN host carries `field_card` | `CSD-T-1`/`T-2` | jest class assertion |
| `CSD-R-5` | AND IT MUST be verified by the class, not the `label` input | `CSD-T-1` | stated as a scope rule; a `label`-based assertion fails review |
| `CSD-R-5` | (visual fidelity vs the reference screen) | `CSD-T-5` | ❗ human check — **no automated gate**, accepted risk |
| `CSD-R-6` | THEN Long-term + PhD shown | `CSD-T-3`/`T-4` | jest state-level (spec has no DOM) |
| `CSD-R-6` | BUT must NOT dirty the snapshot | `CSD-T-3`/`T-4` | jest snapshot-equality case — the Approve-blocking risk |
| `CSD-R-6` | AND IT MUST honour `[disabled]` | `CSD-T-4` + `CSD-T-5` | binding mirrors siblings; confirmed by eye |
| `CSD-R-6` | (drawer rendering) | `CSD-T-5` | ❗ **declared gap** — that spec overrides the template away |
| `CSD-R-10` | Parity with the W1/W2 control | `CSD-T-2`, `CSD-T-5` | class assertion + visual check |

## 6. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `CSD-TEST-1` | unit (client, DOM) | `CSD-R-1`, `CSD-R-5`, `CSD-AC-1`, `CSD-AC-5` | `…/type-capacity-sharing.component.spec.ts` → `rendered template` block |
| `CSD-TEST-2` | unit (client) | `CSD-R-3`, `CSD-AC-3` | same file, hydration case |
| `CSD-TEST-3` | cypress | `CSD-R-1`, `CSD-AC-1` | `cypress/e2e/bilateral-capacity-sharing-mds.cy.ts` |
| `CSD-TEST-4` | unit (client) | `CSD-R-6`, `CSD-AC-6` | `…/cap-sharing-content.component.spec.ts` |
| `CSD-TEST-5` | unit (client) | `CSD-R-6` BUT clause (snapshot / Approve) | same file |
| `CSD-TEST-6` | manual | `CSD-R-5` visual, `CSD-R-6` rendering | `CSD-T-5`, recorded in `execution.md` |

Client coverage must stay above 50/60/60/60. These are additive test files against unchanged-or-smaller production surface, so coverage moves up, not down.

## 7. Rollout & verification

- [ ] Single PR (~190 LOC, well under the ~400 threshold) against `performance-refactor`
- [ ] CI green: lint, client jest, build
- [ ] Manual QA on prtest per `CSD-T-5`
- [ ] **Not** a bilateral payload change → no entry in `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`
- [ ] Migration check: **n/a**
- [ ] P2-3382 comment records what shipped, plus the two deviations: the label reads "Degree" (ticket text says "unlabelled" and predates P2-3385) and the review-drawer cascade was folded in because the editor fix is what makes PhD/Master reachable
- [ ] `CSD-OQ-1` (hardcoded term ids) noted on the ticket as a separate, pre-existing smell

## 8. Roll-back plan

Revert the single PR. No migration, no feature flag, no payload change — `capdev_term_id` keeps the same shape before and after, so reverting restores the previous rendering with zero data consequence. Results saved as PhD/Master while the fix was live remain valid rows; they would simply display as before in the editor.

## Required cross-references

- `requirements.md`, `design.md`, `proposal.md` (this folder)
- `docs/prd.md` (`AC-1`), `docs/ux-ui/design.md` §8, `docs/trd/trd.md` (no ADR affected)
- `…/type-capacity-sharing/CLAUDE.md` — section contract and traps
- `…/result-review-drawer/AGENTS.md` §8 — sub-content mutation contract for `result_type_id = 5`

# Execution Log — Bilateral Capacity Sharing: Long-term must reveal the Degree sub-radio

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-3382-bilateral-long-term-degree` |
| Type / Depth | Bug · **Bug Mode** · **Lite** |
| Approval Mode | `gated` |
| Ticket | P2-3382 — closes its own AC5 / AC6 |
| Branch | `JuanGuzman-io/akili-propose-p2-3382` (contained in `performance-refactor` — verified via `git branch --contains HEAD`) |
| Worktree | `/Users/jguzman/orca/workspaces/onecgiar_pr/pinfish` |
| Budget (tripwire) | 5 tasks · ~190 LOC (~60 production) · 1 review round |
| Triad | Leader (this session) → `akili-implementer` → `akili-reviewer`, author ≠ auditor enforced by the Step 8E wrappers |
| Started | 2026-09-18 |

## 2. Pre-flight Record — 2026-09-18

Run before any task was spawned. Three of the six checklist items needed work; the results are recorded here because two of them invalidate a naive green.

| Item | Result |
|---|---|
| Branch base | ✅ HEAD (`2d4da5a0b`) is contained in `performance-refactor`. Both target components exist on this branch — checked by path, not assumed |
| `src/environments/*.ts` | ⚠️ **Absent** (gitignored, per-environment; a fresh worktree never has them). Copied `environment.ts` + `environment.prod.ts` from `/Users/jguzman/GitHub/CGIAR/onecgiar_pr` |
| Client dependencies | ⚠️ **Absent** — this worktree had no `onecgiar-pr-client/node_modules`. Ran `npm ci` (exit 0) |
| Jest harness sanity | ⚠️ **Initially broken**: `Tests: 0` / `Test suite failed to run — Cannot find module '../build/Release/canvas.node'`. `canvas` is an optional `jsdom` dependency that installed here without its native binding; the main checkout does not have the package at all, which is why it runs there. Removed `node_modules/canvas` so jsdom takes its no-canvas path |
| **Baseline after the fix** | ✅ Editor `type-capacity-sharing`: **51/51 PASS**. Drawer `(cap-sharing-content\|result-review-drawer)`: **272/272 PASS**. From this point a red is a real red, per `requirements.md` §9 |
| Other in-flight specs on these components | ✅ None — `grep -rl` over `docs/specs` returns only this spec |
| Migrations | n/a — no schema change in this spec |

### `CSD-OQ-1` — hardcoded term ids

Accepted as out of scope, to be noted on P2-3382 rather than folded in. Unchanged from the spec's disposition.

### `CSD-OQ-2` — notify the `result-framework-reporting` owner

**Dispatched with the DM pending, by explicit user decision (Juan David Delgado, 2026-09-18).** Asked at the pre-flight gate; the user chose to run all four implementation tasks now and send the Slack DM afterwards. Recorded here because the repo's module-ownership rule makes the notification an obligation this log must not silently drop — it is owed on `CSD-T-4`'s surface (`cap-sharing-content`), and it is the user's to send.

## 3. Task Execution History

### `CSD-T-3` — Write the drawer cascade tests, red — **PASS** (2026-09-18)

| Field | Value |
|---|---|
| Implementer attempts | **1** |
| Reviewer verdict | `STATUS: PASS` (lens-checklist mode, effort `medium`) |
| Files changed | `…/result-review-drawer/components/cap-sharing-content/cap-sharing-content.component.spec.ts` — **+97, 0 deletions** |
| Verification | `npx jest --silent --reporters=summary --no-coverage --testPathPattern="cap-sharing-content"` → `Tests: 7 failed, 10 passed, 17 total` |
| Requirements covered | `CSD-R-6` (all clauses), `CSD-AC-6`; defect class **D** |

**Attempt 1 — Implementer.** Six new cases in a `term cascade` describe (decompose `1 → (4,1)`, `4 → (4,null)`, `3 → (3,null)`; recompose on degree pick; clear-to-Short-term writes `3`; the class-**D** snapshot invariant), plus **one added line** extending the existing `capdevsTerms()` assertion with the sub-term expectation. Verbatim new-case failures:

```
● ngOnInit › loads the third and fourth capdev terms plus the delivery methods
  TypeError: component.capdevsSubTerms is not a function
● term cascade › resolves a stored PhD (1) into the Long-term parent plus the PhD degree
  Expected: 4   Received: undefined
● term cascade › resolves a stored Long-term (4) into the parent term with no degree
  Expected: 4   Received: undefined
● term cascade › resolves a stored Short-term (3) into the standalone parent term
  Expected: 3   Received: undefined
● term cascade › recomposes capdev_term_id from the degree the reviewer picks
  TypeError: component.onCapdevTermId2Change is not a function
● term cascade › clears the degree and writes the standalone term when the reviewer switches back to Short-term
  TypeError: component.onCapdevTermId1Change is not a function
● term cascade › resolves a stored degree without dirtying the drawer data-standard snapshot
  Expected: 4   Received: undefined
```

Red is valid, not inconclusive: no `Tests: 0`, no module-resolution error, no pre-existing case broken (11 pre-existing + 6 new = 17; the 7th failure is the *extended* case, whose original `[{id:3},{id:4}]` expectation runs and passes before the added line).

**Attempt 1 — Reviewer (PASS).** Verified at source rather than taken on trust:

- **DD-5 keep-not-rewrite honoured** — `+1` line, zero deletions, the `[{id:3},{id:4}]` guard intact on disk at `:44`.
- **Test-only** — read the production component and confirmed it still has only `capdevsTerms`/`deliveryMethodOptions` and `slice(2, 4)`.
- **DD-6 honoured** — the `template: ''` override untouched, no DOM query, no `CustomFieldsModule`.
- **The one high-risk substitution checks out.** The Implementer replaced `structuredClone` with a JSON round-trip in the snapshot helper. The Reviewer confirmed both the cited docstring (`section-dirty-tracker.service.ts:20`) *and* found stronger corroboration the Implementer had not cited: the sibling drawer spec polyfills `structuredClone` to the **identical** expression (`result-review-drawer.component.spec.ts:14-16`), so the 272-green baseline for `normalizeDataStandardForComparison` was itself measured through a JSON round-trip. The helper reproduces the comparison the drawer's own green tests run.
- **Folding hydration assertions into the snapshot case: justified, effectively required.** A bare snapshot comparison passes today (nothing writes), which would have violated the DoD and the task's own Falsifying-input clause.

**Leader adjudication of the Implementer's `Not Done / Assumptions`.** The report carried five items. Two are deviations with cause, recorded and accepted; three are *forward pointers*, carried into the `CSD-T-4` brief rather than left in the log to rot:

1. `structuredClone` substitution — **accepted**, independently verified by the Reviewer (above).
2. **API names are pinned by these red tests** — `capdevsSubTerms()`, `capdevTermId1/2`, `onCapdevTermId1Change()`, `onCapdevTermId2Change()`, taken from the editor exemplar. → **carried into `CSD-T-4`'s brief as a hard constraint**; exposing the reconciler under another name would force an edit to a red test, which the DoD forbids.
3. **Idempotent re-hydration has no gate.** Design DD-4 asserts it and `CSD-T-4`'s scope note requires it, but `CSD-T-3`'s enumerated case list does not include it and `CSD-R-6` has no scenario pinning a re-emit mid-selection. The Implementer flagged it instead of inventing a value — correct. The Reviewer raised the same point independently as an advisory. → **Not scope owed by `CSD-T-3`**; carried into `CSD-T-4`, which owns the property, as an instruction to implement it *and* add the covering case. Recorded here so the gap is not closed silently.
4. **The error branch (`:48-56`) leaves `capdevsSubTerms` ungated** — it asserts `capdevsTerms()` resets to `[]` but says nothing about the new list. Extending it would have modified a pre-existing case beyond the single authorized extension. → carried into `CSD-T-4` (reset both lists, by symmetry).
5. No lint run — correct: `CSD-T-3`'s Verification names only the jest command; lint is `CSD-T-4`'s gate.

None of these is unfinished `CSD-T-3` scope, so the task closes; items 2-4 are owed by `CSD-T-4` and appear in its brief.

**ADVISORY (4R lenses — recorded, never gating, and explicitly not a licence to mint new tasks):**

- *Reliability:* the clear-to-Short-term case hydrates `bodyWith(2)` but never asserts `capdevTermId2 === 2` before flipping the parent, so the "clear" assertion would also pass against an implementation whose hydration never set the degree. One added `expect(component.capdevTermId2).toBe(2)` would make it prove it cleared something.
- *Reliability:* the DD-4 idempotency clause will land in `CSD-T-4` with no red test in front of it (same as adjudication item 3).
- *Readability:* the snapshot helper's docstring calls itself "the drawer's own comparison shape" while projecting 1 of the 9 keys the real normalizer emits — adequate here (hydration can only reach `resultTypeResponse[0]`) but over-trustable by a future reader.
- *Readability:* `bodyWith(capdev_term_id: number | null)` is never called with `null`.
- *Risk:* the cases pin the public handler names — restated in the `CSD-T-4` brief (adjudication item 2).

**Interpretive note carried from the Reviewer.** `CSD-T-3`'s DoD line *"The existing terms assertion still passes, unmodified"* and its Description's order to **extend** that assertion pull against each other in the red state: the assertion is unmodified and passes, but the enclosing `it` now fails on the added line. The Description plus DD-5's "the change is additive" resolve it — the failure is in the extension, not in the guard.

### `CSD-T-1` — Write the editor regression tests, red — **PASS** (2026-09-18)

| Field | Value |
|---|---|
| Implementer attempts | **1** |
| Reviewer verdict | `STATUS: PASS` (lens-checklist mode, effort `medium`) |
| Files changed | `…/type-capacity-sharing.component.spec.ts` (+136/−2) · `onecgiar-pr-client/cypress/e2e/bilateral-capacity-sharing-mds.cy.ts` (+38) |
| Verification | `npx jest --silent --reporters=summary --no-coverage --testPathPattern="type-capacity-sharing"` → `Tests: 4 failed, 54 passed, 58 total` |
| Requirements covered | `CSD-R-1` (all clauses), `CSD-R-3`, `CSD-R-5`, `CSD-AC-1`, `CSD-AC-3`, `CSD-AC-5`; defect classes **A**, **B** |

**Attempt 1 — Implementer.** Seven jest cases in a `the Degree sub-term group (P2-3382)` describe, inside the existing `rendered template` block (the only one that renders the real template), plus one Cypress case. Four fail on the unfixed template; the failures name the missing group rather than null-dereferencing:

```
● … › renders the Degree group between Length of training and Delivery Method, with full metadata collapsed
      Array [ "Length of training", -   "Degree (PhD / Master)", "Delivery Method" ]
● … › offers PhD and Master as its options
      Expected value: "Degree (PhD / Master)"  Received array: ["Length of training", "Delivery Method"]
● … › frames the Degree group in a field card, as its siblings are
      Expected value: "Degree (PhD / Master)"  Received array: ["Length of training", "Delivery Method"]
● … › hydrates a stored Master (capdev_term_id = 2) to Long-term + Master with the toggle still collapsed
      Array [ "Length of training", -   "Degree (PhD / Master)", "Delivery Method" ]
```

**Falsifying input, actually run.** The Implementer applied the `CSD-T-2` relocation + `label="Degree"` to the template, re-ran → **58/58 PASS**, then `git checkout --` the html. So the red is the bug, and the `field_card` / PhD-Master assertions are reachable rather than permanently red for a harness reason. The Reviewer independently confirmed the template is back in its unfixed state (`:99-120`, still nested, still unlabelled).

**Attempt 1 — Reviewer (PASS).** Six gates, each verified at source:

- **No production file touched** — confirmed by reading the template, not by trusting the diff.
- **Defect class B satisfied, and this is the subtle one.** Group identity is resolved by **catalogue array reference** (`d.componentInstance.options === component.capdevsSubTerms`), never by label — `options` is a plain `@Input()`, so the reference match is real and the four catalogues are distinct references. `DEGREE = 'Degree (PhD / Master)'` is a *diagnostic token*, not an expected UI string; the only label read is an unasserted fallback. The frame assertion targets `app-field-card > div`, which `field-card.component.html:14` gates with `[class.field_card]="!isBare"` — so it exercises `isBare`, exactly as DD-2 demands.
- **Cypress ordering correct** — collapsed precondition asserted at `:89-90` *before* any Degree assertion; the toggle re-asserted unchanged at `:105-107` after selecting Long-term (the `CSD-R-1` BUT clause and the `localStorage` isolation guard, both as written).
- **The red is honest, and the 3 green cases are not padding.** 51 baseline + 7 new = 58. The two absence cases and the toggle-untouched case *cannot* be red today by construction — an absence assertion on a node that does not exist — and `tasks.md` §5 assigns exactly those clauses to this task. They are negative controls that acquire teeth after `CSD-T-2`; their non-vacuity is proven by the same `radioGroups()` helper flipping four sibling cases green under the falsifying input. The Implementer reported them as forward guards rather than as reds, which is the honest framing.
- **`TERMS_CATALOG` rename in scope** — `'Long-term (sub A)/(sub B)'` → `'PhD'/'Master'`, the real seed values (`1668784095214`), pinned by `requirements.md` §10. No pre-existing assertion depended on the old strings (the others compare by object reference).
- **The DOM-click workaround does not weaken the class-A gate.** `RolesService.readOnly` is `signal(true)` (`roles.service.ts:22`) and `pr-radio-button` binds `[disabled]` off it, so a click is genuinely inert in this fixture; selection therefore goes through `onCapdevTermId1Change()` — precisely what `(ngModelChange)` would invoke. The *input* is state, but the *observation* stays rendered DOM in document order plus a rendered class, with `showAllFields()` false throughout. The wrong-ancestor guard is still what decides the outcome.

**Not run, and recorded as such — not as a pass.** The Cypress case is **authored but never executed** (no stack running). `CSD-T-1`'s DoD line *"The new Cypress case fails for the same reason"* is therefore **unverified**, per `requirements.md` §9 ("do not read a skipped spec as a pass"). It carries forward to `CSD-T-5`/rollout, and the task closes on its jest gate alone.

**ADVISORY (recorded, never gating):**

- *Reliability:* this is the suite's first case to click a radio option. While `RolesService.readOnly` is true every option renders `[disabled]`, and clicking a disabled input's `<label>` silently does nothing — so an unresolved role fetch would make the case fail at the Degree assertion: a **false red, not a false green**. Cheap hardening when it is first run: assert the Long-term radio is enabled or `checked` right after the click, so a permissions artifact is distinguishable from the placement defect.
- *Readability:* `selectLongTerm()`'s docstring justifies `markForCheck()` by "`tick()` skips the view", but there is no `tick()`/`fakeAsync` in the block and the component uses default change detection — the call is likely inert and the comment names a mechanism the file does not use.
- *Readability:* `DEGREE = 'Degree (PhD / Master)'` reads like an expected UI string though it is purely diagnostic; a visibly non-UI token would foreclose the exact misreading the `CSD-R-5` coverage row exists to prevent.
- *Risk:* the working tree also carries `package-lock.json` (dirty before this session) and the `CSD-T-3` drawer changes. Keep both out of this task's commit so the "no production file touched" DoD stays verifiable from git history.

### `CSD-T-2` — Relocate the Degree control and label it *(the fix)* — **PASS** (2026-09-18)

| Field | Value |
|---|---|
| Implementer attempts | **1** |
| Reviewer verdict | `STATUS: PASS` (checklist mode — ~28 lines, one file) |
| Files changed | `…/type-capacity-sharing/type-capacity-sharing.component.html` (+26/−11; 14 of the insertions are the decision comment). **No TS, no SCSS** |
| Verification | `npx jest … --testPathPattern="type-capacity-sharing"` → **58 passed / 58 total** · `npx ng lint --quiet` → "All files pass linting." |
| Requirements covered | `CSD-R-1`, `CSD-R-2`, `CSD-R-3`, `CSD-R-5`, `CSD-R-10`, `CSD-AC-1`, `CSD-AC-2`, `CSD-AC-3`, `CSD-AC-5` |

**Attempt 1 — Implementer.** The `@if (capdevTermId1 === 4 || 1 || 2)` block moved out of `@if (showAllFields())` to sit between *Length of training* and *Delivery Method*, guard carried over unchanged, `label="Degree"` added, `[required]="false"` kept. 58/58 (51 pre-existing + all 7 `CSD-T-1` cases).

**Falsifying input, actually run.** The block was moved back inside `@if (showAllFields())` — **with the label deliberately retained, so position was the only variable** — and the same 4 cases went red while the 3 negative controls stayed green. That is the cleanest possible demonstration that the tests measure *placement*, not presence. Revert confirmed byte-identical against a pre-probe copy; the 58/58 above is the post-revert run.

**Attempt 1 — Reviewer (PASS).** Verified at source:

- **Placement** — block now at `:90-100`, between *Length of training* (`:65-74`) and *Delivery Method* (`:102-111`); `@if (showAllFields())` does not open until `:125`. Guard byte-identical.
- **All four negative constraints hold.** No `showAllFields.set(...)` anywhere — the only writes remain `toggleShowAll()` behind the button; jest `:711-719` and Cypress `:105-107` both pin it. `setSectionFields`, `queueTypeSave` and the `loaded() === true` gate all live in the `.ts`, which is **not** in the modification set at all — DD-3 and P2-3556 are satisfied structurally, not by inspection. The `flex flex-col gap-[18px]` wrapper survives at `:126-150`, still holding the attendance radio and the organizations multi-select.
- **`CSD-R-10` parity confirmed against the real exemplar** (`…/rd-result-types-pages/cap-dev-info/cap-dev-info.component.html:49-57`): same label, same `[required]="false"`, same `optionLabel`/`optionValue`, same catalogue order PhD → Master. The only differences are the bilateral component's pre-existing idiom (`@if`/`===` vs `*ngIf`/`==`).
- **The green cannot have been bought with the label — and this is the load-bearing finding.** `CSD-T-1`'s cases identify groups by **catalogue object identity** (`options === component.capdevsSubTerms`), explicitly not by label, so it is *structurally impossible* for the label this task added to have relaxed them. The order assertion is still strict `toEqual([LENGTH, DEGREE, DELIVERY])`, the frame assertion still on the rendered `field_card` class. The Disqualifier does not fire.
- **The 14-line comment is proportionate**, not bloat: it is the dominant idiom of this exact template (P2-3556 header at `:2-10`, P2-3346/3348 note at `:15-24`) and the W1/W2 exemplar carries a comment on the *same control* for the same reason. It encodes the three decisions a future editor would otherwise undo by moving the node back.

**Two disclosures, adjudicated by the Reviewer:**

1. **`…/type-capacity-sharing/CLAUDE.md` deferred to `CSD-T-5` — correct, with a condition.** `CSD-T-5`'s `Files` names that guide and its DoD requires the trap entry; `CSD-T-2`'s `Files` names only the HTML, so writing it here would have been an out-of-boundary side-effect write and a collision with an unstarted task. The client guide's folder-doc convention says "same commit", but the root `CLAUDE.md` shared-file rule **exempts files an approved `tasks.md` names as the spec's own deliverable** — which is exactly this file. **Condition carried to `CSD-T-5`:** it is the only thing that discharges the convention, so it must land before the PR merges, and it must re-stamp the guide's `**Verified:**` line (currently `2026-09-02 · performance-refactor · 2de8884cd`).
2. **`CSD-R-5` visual fidelity is correctly outside this gate** — defect class **B′**, "❗ No automated gate", owned by `CSD-T-5`. The jest case proves the `field_card` class renders (a real behavioural effect, since it exercises `isBare`), but it does not prove likeness to the reference, and nobody claimed it did.

### `CSD-T-4` — Add the term cascade to the review drawer — **PASS** (2026-09-18)

| Field | Value |
|---|---|
| Implementer attempts | **1** |
| Reviewer verdict | `STATUS: PASS` (lens-checklist mode, effort `high` — the failure mode here is blocking Approve for every reviewer) |
| Files changed | `…/cap-sharing-content.component.ts` (+77/−3) · `…/cap-sharing-content.component.html` (+19/−1) · `…/cap-sharing-content.component.spec.ts` (+27, the two authorized additions only) |
| Verification | `npx jest … --testPathPattern="(cap-sharing-content\|result-review-drawer)"` → **279 passed / 279 total, 7 suites** · `npx ng lint --quiet` → clean · `npx ng build --configuration development` → success |
| Requirements covered | `CSD-R-6` (all clauses), `CSD-AC-6`; defect class **D** |

**Attempt 1 — Implementer.** Sub-terms added beside the parents (DD-5), read-only hydration in the existing setter after the null-backfill, a user-only recompose path through `syncCapdevTermId()`, and the Degree control rendered under *Length of training*. Public names verbatim as pinned by `CSD-T-3`. 272 baseline + 6 (`CSD-T-3`) + 1 (idempotency) = 279.

**Falsifying input, actually run.** Appending `capdev_term_id = this.capdevTermId1` to `hydrateTermCascade()` broke the class-**D** case on the right axis — `Expected …"capdev_term_id":1}} / Received …"capdev_term_id":4}}` — proving the snapshot test is wired to the drawer's real comparison and not a re-invented one. Revert confirmed byte-identical; a `grep` for the probe over the whole `result-review-drawer/` tree found nothing.

**The build was run deliberately.** Because DD-6's `template: ''` override means jest never typechecks this template, the Implementer ran `ng build` to cover the template changes. Correct instinct: it is the only automated signal this template has.

**Attempt 1 — Reviewer (PASS), six gates.** The Leader flagged the template rebind as the widest-blast-radius change, since `CSD-T-4`'s Description does not literally name it. The finding reverses the concern:

- **The rebind is necessary, and it *removes* a class-D path rather than opening one.** With the old binding the control's value was the persisted key while `[options]` offers only ids 3 and 4 — so a stored `1`/`2` matched nothing and *Length of training* rendered **blank**, which is exactly the defect `CSD-US-2`/`CSD-R-6` exists to remove. It is the "display decomposes" half of the §3 contract, which `design.md`'s architecture table already names for the drawer path. More importantly, the Reviewer walked every before/after write path and found the old binding had a **destructive one**: `pr-radio-button.onSelect` deselects on re-click, so re-clicking the selected option wrote `capdev_term_id = null` — destroying the stored term, dirtying the snapshot and **blocking Approve**. After the rebind that same gesture composes back to the held value and writes nothing.
- **Hydration cannot fire a write at all**, structurally: `PrRadioButtonComponent.writeValue()` sets `_value` directly and never calls `onChange`, so no programmatic assignment can reach `ngModelChange`. And nothing `hydrateTermCascade()` touches is in the projection of `normalizeDataStandardForComparison`, so it is incapable of moving `canApprove()`.
- **Single source of truth intact** — `syncCapdevTermId()` writes the same object reference the payload builder and the normalizer read; `capdevTermId1/2` are never serialized. `AGENTS.md` §8's row for `result_type_id = 5` stays literally true, so **no doc sync is owed**.
- **Idempotency guard sound across every reachable state** the Reviewer could enumerate (fresh, `stored === null`, off-catalogue, re-emit after a pick, re-emit of a different result). Its load-bearing invariant: every local pick is synchronously mirrored into `capdev_term_id`, so "composed equals stored" can never mean "there is unflushed user intent".
- **DD-5** — `slice` is non-mutating, so the reordered statements are order-independent (unlike the editor's load-bearing double `splice`); the `[{id:3},{id:4}]` assertion gained a line and lost nothing.
- **Only the two authorized test additions**, corroborated independently of provenance comments by arithmetic: the `term cascade` describe holds exactly `CSD-T-3`'s six enumerated cases plus the idempotency one, so nothing was dropped, swapped or renamed under cover of the `+1`. *Reviewer's own stated caveat: its tool set is read-only with no `git`, so this gate rests on file contents plus test-count arithmetic, not a byte-level diff.*

**ADVISORY (recorded, never gating — and explicitly not converted into a task):**

- *Reliability — the one worth knowing about.* The `pr-radio-button` deselect-on-re-click quirk lets a **platform admin** re-clicking the already-selected *Long-term* on a PhD/Master result reach `(capdevTermId1 = null, capdevTermId2 = 1)`. That composes back to the unchanged stored `1`, so **nothing is written and Approve is unaffected** — but the idempotency guard then makes the display inconsistency **non-self-healing**: every later setter fire short-circuits on `stored === composed`, leaving *Length of training* blank and the Degree control hidden while the data still says PhD. The editor exemplar has the same quirk but self-heals precisely because it lacks the early return. Cheapest fix if ever wanted: gate the early return on the pair also being the canonical decomposition (`stored === composed && (capdevTermId2 == null || capdevTermId1 === 4)`) — **not** delete the guard, which DD-4 requires. Per the Advisory rule this is recorded and dies here; it is a candidate for a separate proposal, not scope for this spec.
- *Risk:* `package-lock.json` shows modified but predates this session and belongs to no task — keep it out of the commit.
- *Readability:* a line in `AGENTS.md` §8 noting that `capdev_term_id` is now written through a decompose/recompose pair would save the next reader a trip into the component. Not owed — the row stays accurate.

## Pivot Record: `CSD-T-6` — the Degree becomes mandatory (2026-09-18)

**Approved by Juan David Delgado, 2026-09-18**, after seeing the fix working on screen: selecting Long-term without a degree must no longer satisfy the `type-specific` green check.

### What this overturns

`CSD-R-4` (approved) states the Degree MUST remain optional and that selecting Long-term without one MUST still satisfy the length-of-training item. `design.md` DD-3 backs it, and `requirements.md` §3 lists "Making the Degree selection mandatory" as explicitly **out of scope**. P2-3771 (`56de75c7d`, Yecksin) recorded the same decision independently: *"Making the sub-category mandatory is a business rule, not a layout fix, and it would block Submit for results already saved as plain 'Long-term'."* Two people reached that conclusion separately; the PO has now decided against it with the consequence stated.

### The consequence, stated before the decision and accepted

Because the placement bug meant **no reporter could ever select a degree**, every existing bilateral long-term result is stored as `capdev_term_id = 4`. Tightening the predicate therefore turns the `type-specific` check amber for **all** of them at once, and Submit stays blocked until someone opens each result and picks PhD or Master. The user was shown this and chose "obligatorio, y asumimos el retroactivo" over two alternatives (grandfather historical `4`s; measure the affected row count first).

### Technical direction

Tighten the **existing** `length-of-training` predicate — filled when `capdev_term_id` is `1`, `2` or `3`, not filled when it is a bare `4` — and set `[required]="true"` on the control. **No fourth checklist item**: the tracker computes `complete` as `filledFields === totalFields`, so a fourth never-filled entry would leave the section amber permanently and disable Submit unconditionally (the P2-3348 failure recorded in the component's `CLAUDE.md`). The three-key contract survives; only one key's predicate changes.

### Cross-module consequence — owed to another developer

P2-3771's spec block pins the old rule in the template text: `it('is still gated on the long-term buckets and stays optional')` asserts `[required]="false"`. This pivot requires editing **another developer's test**, which encodes a decision they documented deliberately. Authorized here, renamed rather than deleted, and recorded so it is visible in review. **Juan David to notify Yecksin** — per the repo's module-ownership rule, the same obligation already outstanding for `CSD-OQ-2`.

### Spec documents updated

`requirements.md` (`CSD-R-4`, §3 scope), `design.md` (DD-3), `tasks.md` (new `CSD-T-6`). No ADR is affected — this is a business rule, not an architecture decision.

### `CSD-T-6` — Make the Degree mandatory for Long-term — **PASS** (2026-09-18)

| Field | Value |
|---|---|
| Implementer attempts | **1** |
| Reviewer verdict | `STATUS: PASS` (full 4R sweep) |
| Files changed | `…/type-capacity-sharing.component.ts` · `.html` · `.spec.ts` |
| Verification | `npx jest … --testPathPattern="type-capacity-sharing"` → **64 passed / 64 total** (60 baseline + 4 new) · `npx ng lint --quiet` → clean |
| Implements | `CSD-R-4` **as reversed** by the Pivot above |

**The change.** One predicate moved — `length-of-training` is filled when `capdev_term_id` is present and is **not** the bare parent `4`:

```ts
get lengthOfTrainingFilled(): boolean {
  const termId = this.body.capdev_term_id;
  return termId != null && termId !== 4;
}
```

plus `[required]="true"` on the control. **The checklist still publishes exactly three keys** — no fourth entry, which would have left the section amber forever and disabled Submit unconditionally.

**Falsifying input, run.** Reverting the predicate to `termId != null` failed **exactly** the new bare-`4` case and nothing else — the test is tied to the rule, not to incidental state. Probe reverted; 64/64 is the post-revert run.

**The denylist choice, and why the Reviewer rated it better than the Implementer argued it.** `!== 4` rather than an allowlist `1|2|3` was deliberate. The Implementer justified it by future catalogue growth; the Reviewer identified the sharper reason: the live risk on this codebase is **catalogue ids differing between environments**, already recorded as `CSD-OQ-1`. Under id drift an allowlist fails **closed** — every result reads unfilled and Submit dies platform-wide (the P2-3348 failure mode). The denylist fails **open** — a drifted id reads as answered, i.e. the pre-pivot behaviour. Since `complete === (filledFields === totalFields)` gates Submit, fail-open is the only tolerable direction.

**The authorized cross-developer edit.** P2-3771's second case was **renamed** (`…and is now required`) with its assertion flipped to `[required]="true"`, guard regex kept verbatim, both tickets named in a comment. Its first case (placement) untouched.

**Leader adjudication — one pre-existing test edited beyond authorization, accepted.** `it('counts a fully answered form as filled')` used `capdev_term_id: 4` with `filled: true`, which the new rule makes false by construction. The Implementer moved the **fixture** (`4` → `2`) rather than the expectation. Reviewer concurred, on three grounds: the case's contract is "a fully answered form ⇒ all three filled", and under the new rule a bare `4` *is not* a fully answered form, so keeping `4` would have made the test name assert its own opposite; nothing was lost, because the `4 → filled: false` path now has a dedicated case asserting more than the old one did; and the change is documented in place. Flipping the expectation instead would have produced a duplicate of the new case under a lying name. **No other pre-existing case was touched** — verified by enumerating every `capdev_term_id` occurrence in the spec file.

**Blast radius checked:** `length-of-training` appears nowhere in `onecgiar-pr-client/src` outside this component's four files, so no unrun sibling suite asserts on the changed key and 64/64 is sufficient.

**Leader error, found by the Reviewer and now closed.** The pivot's spec sync was **partial**: `CSD-R-4`'s prose was reversed but five other sites still stated the old rule — the *"Green check does not regress"* scenario, `CSD-AC-4`, the `CSD-R-4` index row, the persona table, and `CSD-R-10`'s optionality-parity clause, plus `design.md` DD-2's "`[required]` stays **false**". `CSD-AC-4` in particular said the opposite of what shipped and is exactly the line a future auditor would cite to revert this code. All six are now amended with the Correction Closure two-direction sweep the Pivot Protocol requires. **`CSD-R-10` is now a recorded deviation, not a silent one:** bilateral is `[required]="true"` and gates its check while W1/W2 stays `[required]="false"` — the two screens knowingly diverge on optionality, because the PO asked for the bilateral rule and W1/W2 is out of scope.

**ADVISORY (non-gating):** if `capdev_term_id` ever arrived as a tinyint-as-string (the trap this component's `CLAUDE.md` records for `is_attending_for_organization`), `'4' !== 4` would read the bare parent as filled. Not new — `hydrateTermCascade` already strict-compares the same field, so a string would break the radio visibly first — and it fails in the safe direction.

**Not run:** Cypress was not extended, so browser-level coverage of the new gate is *not run*, not passed. Carried to `CSD-T-5`.

### ⚠️ Collision & repair — `CSD-T-6` superseded by P2-3771 (2026-09-18)

**What happened.** While `CSD-T-6` was in review, Yecksin shipped `9f002ad95` — *"P2-3771: make the long-term degree mandatory on the client side"* — implementing the **same rule**, from the same QA request (María Camila, 18-Sep-2026). This is the **second** time this spec and P2-3771 independently produced the same change; the first was the editor relocation, united in `a0ebd2fc7`.

**How it went wrong.** This worktree had been switched to `performance-refactor` at the user's request so they could test locally. That branch was **also checked out in the `seal` worktree**, so both share one branch ref. Yecksin's commit moved the ref underneath this session: the working tree still held files based on `fa9f78440`, but the commit `37d96167e` was written with `9f002ad95` as its parent. The result was a **silent clobber** — it reverted his `lengthOfTrainingFilled` implementation and deleted all seven of his new test cases, while every gate stayed green, because the suite only ever measured this session's own version.

Nothing was pushed. The collision was caught by inspecting the commit's parent before pushing, not by any test — no suite can see work that a commit removed.

**Repair.** `git checkout 9f002ad95 -- <the three component files>` restored his implementation and his tests verbatim. `CSD-T-6`'s own implementation is **withdrawn, not merged**: his covers the same rule with broader cases (Short-term standalone, a stored degree read back from the server, nothing picked at all), so uniting the code would have meant two getters for one rule.

**Which implementation now stands** — his, reading the cascade rather than the persisted key:

```ts
get lengthOfTrainingFilled(): boolean {
  if (this.capdevTermId1 == null) return false;
  if (this.capdevTermId1 === 3) return true;
  return this.capdevTermId2 != null;
}
```

Functionally equivalent to `CSD-T-6`'s `termId != null && termId !== 4` across every reachable state, since `syncCapdevTermId()` keeps the two in step. His reasoning is the stronger one and is recorded in his docstring: `syncCapdevTermId()` stores the parent id `4` when no degree is chosen, which is **indistinguishable from a resolved answer** once it reaches `body.capdev_term_id` — so the cascade is the more honest source.

**What `CSD-T-6` still contributes.** Its Pivot Record, the `CSD-R-4` reversal and the six-site Correction Closure sweep across `requirements.md`/`design.md` stand — P2-3771 changed the code but no spec document. Without them `CSD-AC-4` would still assert that a bare Long-term shows the green check, which is the line a future auditor would cite to revert this behaviour.

**Also preserved from `CSD-T-6`'s review, since the code it described is gone:** the denylist-vs-allowlist analysis. Under the id drift recorded as `CSD-OQ-1`, an allowlist fails **closed** (everything unfilled, Submit disabled platform-wide). Both surviving implementations hardcode `3` and `4`, so `CSD-OQ-1` remains open and is now load-bearing for **Submit**, not just for display.

**Owed:** Juan David to tell Yecksin that this spec twice duplicated P2-3771's work, so the two tickets stop racing.

**Final state:** 345 passing across both modules, lint clean — every test from both authors coexisting.

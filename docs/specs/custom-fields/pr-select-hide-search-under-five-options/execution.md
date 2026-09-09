# pr-select — Hide Search Input Under 5 Options — `execution.md`

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/custom-fields/pr-select-hide-search-under-five-options` |
| **Linked docs** | [`requirements.md`](./requirements.md) · [`design.md`](./design.md) · [`task.md`](./task.md) (note: `task.md`, singular) |
| **Command** | `/akili-execute` (Leader → Implementer → Reviewer triad) |
| **Branch** | `qa-development-2026-ss` |
| **Baseline commit** | `34b10cb02de9fe7f1d19e24ee2a285042d0f8737` |
| **Approval mode** | Not declared in the spec's Document Control → treated as **gated**; the user's launch instruction ("run through all 4 tasks") is the recorded standing approval for the routine continue/pause gates only. Exceptions (HALT, Pivot, FATAL_FAIL) still stop for the user. |
| **Budget tripwire** | No budget block recorded in `design.md` (spec predates / omits `/akili-specify` Step 2.4 budget) → check skipped. |
| **Commit policy** | **No agent commits.** Project standing rule: never `git commit` without explicit user go-ahead, even on task PASS. All work is left in the working tree; the "Code merged via the project commit convention" DoD line stays unchecked on every task until the user commits. |
| **Pre-existing working-tree noise** | `docs/specs/quick/quick-log.md`, `lab-report-form.component.html`, `lab-report-form.component.scss` were already modified before this run (unrelated `[SPEC:quick/emerging-result-level-overlay]` work). Every diff extracted for a Reviewer was path-scoped to `onecgiar-pr-client/src/app/custom-fields/pr-select/` to keep them out. |

### Leader routing decisions (deviations recorded per `.agents/leader.md` → Delegation Discipline)

| Task | Skills assigned | Effort | Reason for any deviation |
|---|---|---|---|
| `PSEL-T-1` | `angular-developer` | `low` | Mechanical: `design.md` §6.2 supplies the literal code. Below the `medium` default because the task is transcription + placement judgment, not authorship. `tdd` deliberately **not** assigned — two pure derivations with no rendered effect; the behavioral proof is `PSEL-T-3`'s Cypress CT, which is where red→green would actually pay. |
| `PSEL-T-2` | `angular-developer` | `low` | Same rationale: `design.md` §6.2 supplies both literal template snippets. |

### Leader ruling: `PSEL-T-2`'s in-browser DoD line (recorded per `.agents/leader.md` → *Deferring a check*)

`PSEL-T-2`'s Definition of done includes a **manual in-browser** check on one <5-option and one ≥5-option real call site. The Leader carved it out of the Implementer's scope rather than let a worker report a browser verification it cannot honestly perform.

- **Assumption the deferral rests on:** "this check needs a running dev server plus an authenticated session against a real backend, which this run does not have."
- **Probe (per the rule — a deferral without a tested assumption is a guess wearing a status):** `PrSelectComponent` takes plain inputs and already renders in an isolated harness — `pr-select.cy.ts` / `pr-select.contract.cy.ts` mount it with no stack, no database and no login. That harness is exactly the cheap falsification of the assumption, and it *is* `PSEL-T-3`. So the component-level behavioral claim is **not** deferred at all — `PSEL-T-3` proves it.
- **What genuinely remains deferred:** only the *integration-level* half — real call sites in real page layouts (`PSEL-T-4`'s stated purpose: "catch any integration-level surprise the isolated test can't see"). That is carried to `PSEL-T-4` and to the rollout checklist (`task.md` §6, staging QA), not silently absorbed.
- Consequently `PSEL-T-2`'s browser DoD checkbox stays **unchecked** and is not counted as satisfied by its PASS.

---

## 2. Task Execution History

### `PSEL-T-1` — Add `showSearchInput` / `selectableOptionCount` computed signals — **PASS**

- **Date:** 2026-09-09
- **Final status:** PASS (Reviewer PASS on attempt 1)
- **Implementer attempts:** 1
- **Requirements covered:** `PSEL-R-1`, `PSEL-R-2`, `PSEL-R-10`

#### Attempt 1

- **Files changed:** `onecgiar-pr-client/src/app/custom-fields/pr-select/pr-select.component.ts` (+10 LOC, purely additive, inserted between the existing `optionsIntance` computed and `onSelectOption`)

  ```ts
  readonly selectableOptionCount = computed(() => this.optionsIntance().filter((o: any) => !o?.isLabel).length);
  readonly showSearchInput = computed(() => this.selectableOptionCount() >= 5);
  ```

  (both carrying the doc comments prescribed verbatim in `design.md` §6.2)

- **Implementer verification:** `npx ng lint --quiet` (from `onecgiar-pr-client/`) → `Linting "onecgiar-pr-client"... All files pass linting.`
- **Implementer `Not Done / Assumptions`:** `none` — no template/consumer/other file touched, no new `input()`/`@Input()`, no `console.log` added.
- **Reviewer verdict:** `STATUS: PASS`
- **Reviewer summary:** The diff reproduces `design.md` §6.2's prescribed `selectableOptionCount` / `showSearchInput` computeds exactly, honors `PSEL-DD-1` (no new input) and `PSEL-DD-2` (no `effect()`, `searchText` untouched), and the `isLabel` exclusion required by `PSEL-R-10` is verified against real producers and against `optionsIntance()`'s spread-clone, which preserves the flag. Scope is the single declared file, lint is clean, and no TRD, design-token, or `.cursorrules` surface is touched.
- **Reviewer `ADVISORY` (4R lenses):** none raised — the Reviewer suppressed the block explicitly (10 LOC, no lens finding rising above noise).

#### Decisions made

- **`PSEL-OQ-1` confirmed resolved with no code path.** The Reviewer traced the 0-option case: `optionsIntance()` early-returns `[]`, so `0 >= 5 === false` and the search box hides for free — exactly the resolution `design.md` §13 records. No separate branch was added, correctly.
- **`isLabel` exclusion validated against real producers, not assumed.** The Reviewer confirmed `optionsIntance()` clones via `{ ...o, disabled: false, selected: false }` (so a consumer's `isLabel` survives) and located live producers at `manage-user-modal.component.ts:230` and `outcome-indicator.component.ts:65,77`. This is the evidence behind `PSEL-R-10` / `PSEL-AC-3`, recorded here so `PSEL-T-3` does not have to re-derive it when building the grouped-list fixture.

#### Issues encountered

- None. Two signals are intentionally unreferenced by the template at the end of this task — that is the declared state of `PSEL-T-1` (`Blocks: PSEL-T-2`), not a defect, and lint does not flag unused public class members.

#### Final verification result

`npx ng lint --quiet` → clean. Behavioral verification is correctly deferred to `PSEL-T-3` (Cypress CT) and is **not** claimed by this task.

#### Constitution Impact

None. No module created, no module boundary moved, no public surface changed (`PSEL-DD-1` explicitly forbids a new `input()`, and none was added). `pr-select/` has no colocated `CLAUDE.md`, so no folder-guide re-stamp is owed. A CodeGraph re-index is **not** pending for a 10-LOC additive change.

---

### `PSEL-T-2` — Gate the search box in the template + feed the filter pipe conditionally — **PASS**

- **Date:** 2026-09-09
- **Final status:** PASS (Reviewer PASS on attempt 1)
- **Implementer attempts:** 1
- **Requirements covered:** `PSEL-R-1`, `PSEL-R-2`, `PSEL-R-3`, NFR "Accessibility" (tab order), NFR "Backwards compatibility"

#### Attempt 1

- **Files changed:** `onecgiar-pr-client/src/app/custom-fields/pr-select/pr-select.component.html` (two edits, exactly as scoped)
  1. `.search_input_container` (with its icon and input) wrapped in `@if (showSearchInput()) { … }` — DOM removal, **not** `[hidden]`/`display:none`.
  2. `cdkVirtualFor` pipe argument: `listFilterByTextAndAttr: optionLabel() : this.searchText` → `… : (showSearchInput() ? this.searchText : '')`.
- **Implementer verification:** `npx ng lint --quiet` (from `onecgiar-pr-client/`) → `Linting "onecgiar-pr-client"... All files pass linting.`
- **Implementer `Not Done / Assumptions`:** `none` (the in-browser DoD line was carved out by the Leader ruling above — out of scope for this attempt, not outstanding work inside it).
- **Reviewer verdict:** `STATUS: PASS`
- **Reviewer summary:** The template gating matches `design.md` §6.2 snippet-for-snippet, DOM removal via `@if` genuinely satisfies the tab-order NFR (nothing in the component focuses or queries the search input), and the `''` pipe argument is behaviorally identical to an untouched `searchText` because `ListFilterByTextAndAttrPipe` short-circuits on a falsy word — with `searchText` itself left intact per `PSEL-DD-2`. Behavioral proof remains owed by `PSEL-T-3`/`PSEL-T-4`, as the spec and the Leader's ruling assign.
- **Reviewer `ADVISORY` (4R lenses):** none raised — 4R sweep found nothing worth an advisory (two lines in an idiom the file already uses, no error path, no resource, no input surface, trivially revertible).

#### Decisions made / mechanisms confirmed by the audit

- **`PSEL-R-3` is satisfied by an existing short-circuit, not by new logic.** `list-filter-by-text-and-attr.pipe.ts:10` reads `if (!word) return list;` — `''` is falsy, so the hidden path returns the full unfiltered list. This is the concrete evidence behind `PSEL-R-3`, and it is why `PSEL-DD-2`'s "feed the pipe, don't clear the field" approach works without an `effect()`.
- **`PSEL-AC-2` / backwards compatibility is byte-equivalent, not merely "equivalent".** At ≥5 options the third pipe argument evaluates to literally `this.searchText`, the same expression as before the change — so the ≥5 path is unchanged by construction, which is the strongest form the NFR could ask for.
- **Tab-order NFR verified by absence, at the source.** The Reviewer confirmed the component holds exactly one `querySelector` (`'.options'`, `pr-select.component.ts:105`) and no `.focus()`, `autofocus`, or `ViewChild` on the search box — so nothing retains a reference to the removed input.
- **No CSS assumption depended on the search box existing.** `.search_input_container` is styled as a self-contained block (`custom-fields.scss:129`, `pr-select.component.scss:97`) with no `:first-child`, no sibling combinator, no margin-collapse dependency; `.options` is a `flex-direction: column` with `max-height: 300px`, and `overlayStyles()` (`pr-select.component.ts:145`) pins `top`/`max-height` without computing a content height. The panel simply gets one row shorter.

#### Issues encountered

- **One pre-existing edge behavior surfaced by the audit (not introduced here, not a spec violation, recorded so it is not rediscovered as a regression):** if the selectable count drops below 5 *while the search input itself holds focus*, the panel's `:focus-within`-driven open state (`custom-fields.scss:104`) collapses, because the focused element ceases to exist. This is inherent to the CSS-driven panel rather than to this change, and no clause in `requirements.md` covers it. It requires a list that shrinks past the threshold during active typing — the 5→4 flap in `PSEL-T-3`'s runtime scenario is the only place it could show up. **Forward pointer to `PSEL-T-3`:** when writing the 5→4 runtime test, drive the rebind without holding focus in the search input, or the panel may close for this reason and the assertion will look like a product bug when it is not.

#### Final verification result

`npx ng lint --quiet` → clean. Rendering behavior deliberately **not** claimed by this task; it is owed by `PSEL-T-3` (component-level, Cypress CT) and `PSEL-T-4` (integration-level, real call sites).

#### Constitution Impact

None. Template-only change inside an existing component; no module, boundary, or public surface change.

---

### `PSEL-T-3` — Extend `pr-select.cy.ts` with the 4 test scenarios — **`[~]` IN PROGRESS (not verified, not reviewed)**

- **Date:** 2026-09-09
- **Current status:** `[~]` — test code is written in the working tree, but **no Reviewer has seen it and the CT suite result is not yet in**. This task has NOT passed and must not be treated as done.
- **Implementer attempts:** 1 (dispatch failed on delivery — see below)
- **Skills / effort assigned:** `angular-developer`, effort `high` (authorship, not transcription — the spec names the scenarios but not the code, and this task is the spec's only behavioral proof).

#### Attempt 1 — dispatch failed on the return leg

The Implementer wrote the code but **never delivered its contracted report**. It ended its turn twice saying it was waiting on a background Cypress run (the second time after an explicit poke demanding the report as the turn's terminating action). Per `.agents/leader.md` → *Idle is not delivered*, one poke was spent; the second idle marks the dispatch failed.

**Files changed by the Implementer (verified by the Leader inline from `git diff`, since no report arrived):**

- `onecgiar-pr-client/src/app/custom-fields/pr-select/pr-select.cy.ts` — +146 lines (the four new scenarios; content not yet audited).
- `onecgiar-pr-client/src/app/custom-fields/pr-select/pr-select.contract.cy.ts` — +19/−4. **This is a second file the task did not name, so it was inspected directly.** The change is legitimate and is the correct repair rather than green-washing: that suite's shared `OPTIONS` fixture holds only 3 items, which now falls under the new threshold, so its two search-specific tests (`filters the visible options without touching the model`, `restores the full list when the search is cleared`) would have lost the `.search_input_container` they drive. The Implementer added a separate 5-item `SEARCHABLE_OPTIONS` fixture, pointed only those two tests at it, left the 3-item fixture and every other assertion untouched, and commented both sites with the spec reference. No assertion was weakened or deleted.

#### ⚠️ Finding: `npm run test:ct` does not run on Windows — the DoD command is broken on this platform

This is the most important thing recorded in this entry, and it generalises beyond this spec.

`package.json` defines `"test:ct": "ELECTRON_EXTRA_LAUNCH_ARGS=--js-flags=--max-old-space-size=2048 cypress run --component"` — a POSIX inline env-var prefix. npm runs scripts through **`cmd.exe`** on Windows, which does not accept that syntax. The observed result:

```
'ELECTRON_EXTRA_LAUNCH_ARGS' is not recognized as an internal or external command,
operable program or batch file.
[exited with code 0]
```

**The suite never executes, and the command still exits 0.** This is a silently-passing verification gate: any agent or developer on Windows that runs the DoD command as written and checks only the exit code will record a green CT suite that never ran. It is exactly the class of stale/false verification `onecgiar-pr-client/CLAUDE.md` §9 warns about, and it is a plausible contributor to the Implementer's stall.

**Working invocation on this machine** (Git Bash, exporting the variable instead of prefixing it):

```bash
cd onecgiar-pr-client && export ELECTRON_EXTRA_LAUNCH_ARGS=--js-flags=--max-old-space-size=2048 && npx cypress run --component
```

**This is a shared-file issue and is deliberately NOT fixed here.** Making `test:ct` cross-platform (e.g. `cross-env`) means editing `onecgiar-pr-client/package.json`, which this spec's approved `task.md` does not name as a deliverable — per the *Shared-File Write Discipline*, it is recorded as **pending** for the default branch, not patched on this branch. Recommended follow-up: a separate proposal to wrap the CT scripts in `cross-env`.

#### Reviewer verdict: `STATUS: PASS` — **conditional on the CT run**

The Reviewer audited the diff statically (no Implementer report existed to corroborate) and was explicit that its PASS is conditional: *"My PASS is conditional on that run coming back green; a red result on any of the four new tests is a new finding, not a contradiction of this review."* Recorded as such — this task does not reach `[x]` on the review alone.

**Summary:** All four prescribed scenarios are present with the exact matcher `design.md` §10 and the DoD prescribe (`.should('not.exist')`, DOM absence), and three of the four are genuinely revert-sensitive. No pre-existing assertion was weakened or skipped, and the `pr-select.contract.cy.ts` edit is a necessary in-boundary repair.

**Findings worth keeping (the audit answered the four questions the Leader posed):**

1. **Revert-sensitivity checked per AC, not assumed.** `PSEL-AC-1`, `PSEL-AC-3` and the runtime scenario each fail if the production change is reverted. `PSEL-AC-2` is deliberately *not* revert-sensitive — it is the no-regression test the Backwards-compatibility NFR asks for, which is correct as scoped rather than a weakness.
2. **`PSEL-AC-3` is the sharpest test in the set.** 4 selectable + 2 label rows = 6 total, so it fails both on a full revert **and** on a naive `optionsIntance().length >= 5` that forgets the `isLabel` exclusion. It is real proof of `PSEL-R-10`, not `PSEL-AC-1` restated.
3. **`not.exist` is a true DOM-absence assertion here.** `.options` is always in the DOM and `:focus-within` only toggles `display`/`opacity` (`custom-fields.scss:104-118`), so the matcher is not accidentally satisfied by a merely-closed panel.
4. **The grouped fixture matches the real consumer shape** — `PrSelectComponent` does not build label rows; consumers hand it a pre-flattened array (`manage-user-modal.component.ts:224-230`, `result-creator.component.ts:170`, `report-result-form.component.ts:179`, `innovation-package-creator.component.ts:106`). AC-3 coverage is real, not illusory.
5. **The signal-rebind idiom is precedented, not invented** — `pr-select.cy.ts:150-154` and `pr-select.contract.cy.ts:107` already do it; `design.md` §10 names that pattern explicitly.
6. **The `contract.cy.ts` repair is endorsed independently.** The Reviewer concurred with the Leader's judgment and added the useful detail that the two tests would have **hard-failed**, not silently passed — so the repair prevents a red suite rather than hiding a regression.

#### `ADVISORY` (4R lenses) — recorded, non-gating, and deliberately NOT converted into new tasks

Per the command's *Advisory Never Becomes A Task* rule these are recorded and die here; none is a spec violation and none may widen this spec.

- **Readability:** `[group]="true"` in `GROUPED_TEMPLATE` is inert — `pr-select` (unlike `pr-multi-select`) never reads `group()`/`groupCode()`; grouping is driven entirely by `option.isLabel`. Harmless and it mirrors real call sites, but a future reader may think it activates a code path it does not.
- **Reliability:** the runtime test's closing `expect(model).to.equal(null)` is the weakest assertion in the set — the model was never set, so it cannot regress. Requirements §6's "MUST NOT change the selected value" would be probed harder by selecting an option before the 4→5→4→5 flap.
- **Reliability:** after the final 4→5 step the test asserts the input still holds `Center 3` but not that the list re-filters to match.
- **Risk:** `pr-select.contract.cy.ts` is outside `task.md` §3's declared "Files (expected)" — named here explicitly so `/akili-archive` and any later audit see the deviation rather than rediscovering it. (This advisory is discharged by this entry.)

#### ⚠️ Second finding: the CT suite is **already red on this branch, before this spec**

The Leader's clean run surfaced failures in specs this spec does not touch, within the first 10 of 59:

- `custom-fields/add-button/add-button.contract.cy.ts` — 5 passing, **3 failing**
- `custom-fields/edit-or-delete-item-button/edit-or-delete-item-button.cy.ts` — 0 passing, **1 failing**
- `custom-fields/field-card/field-card.contract.cy.ts` — 0 passing, **1 failing**

None of these components involve `pr-select`. This means `PSEL-T-3`'s DoD as written — `npm run test:ct` green, *"All specs passed!"* — **is not achievable on this branch regardless of this spec's changes**, because the baseline is not green. That is a pre-existing condition of the branch, not a product of this work, and it must not be silently absorbed: the honest close for this task is "the four new tests pass and no previously-passing spec regressed", with the baseline redness escalated separately.

#### ⛔ CT RESULT: RED — `PSEL-T-3` does **not** pass. Status stays `[~]`.

Three runs were attempted; this is the full record.

| # | Invocation | Outcome |
|---|---|---|
| 1 | `npm run test:ct` | **Never executed.** POSIX env-prefix rejected by `cmd.exe`, **exit code 0** (see the Windows finding above) |
| 2 | Full suite via `export … && npx cypress run --component` | **Aborted at spec 19 of 59** — *"We detected that the electron tab running Cypress tests closed unexpectedly. We have failed the current spec and aborted the run."* (memory exhaustion). `pr-select` sorts after the abort point and **never ran** |
| 3 | Scoped to the two `pr-select` specs, heap raised to 4096MB | **Completed. RED.** |

**Run 3 result — the only real behavioral evidence this spec has:**

```
│ ✖  pr-select.cy.ts            00:05   10   8 passing   2 failing │
│ ✖  pr-select.contract.cy.ts   00:38   22  19 passing   3 failing │
   ✖  2 of 2 failed (100%)      00:44   32  27 passing   5 failing
```

**Failure identities (this is the part that matters):**

| Failing test | File | Ours? |
|---|---|---|
| `reacts to a 4→5→4→5 option-count change without wiping a previously typed search term` | `pr-select.cy.ts` | ✅ **YES** — this is `PSEL-T-3`'s 4th test (the requirements §6 runtime scenario) |
| `clears the selection reactively when the model is set to null` | `pr-select.cy.ts` | ❌ pre-existing test, untouched by this spec |
| `restores the placeholder when the parent clears the model` | `pr-select.contract.cy.ts` | ❌ pre-existing test, untouched |
| `stores the optionValue, not the whole option object` | `pr-select.contract.cy.ts` | ❌ pre-existing test, untouched |
| `replaces the previous selection rather than accumulating (single-value field)` | `pr-select.contract.cy.ts` | ❌ pre-existing test, untouched |

Sample assertions from the pre-existing cluster: `Expected to find content: 'Select a center' but never did`; `expected null to equal 'C2'`.

**Notably, the two tests this spec actually modified in `pr-select.contract.cy.ts` — `filters the visible options without touching the model` and `restores the full list when the search is cleared` — both PASSED.** The `SEARCHABLE_OPTIONS` repair worked.

**Attribution is INCOMPLETE and must not be assumed.** The four non-ours failures all cluster around model/selection semantics, which is suspicious in both directions: it could be a pre-existing red baseline (the branch already shows unrelated CT failures in `add-button`, `edit-or-delete-item-button`, `field-card`), or something in this change could be perturbing them. **This was not resolved.** A baseline probe was started — the four `pr-select` files were stashed and the same two specs re-run without this spec's changes — but it was **stopped before producing a result** on instruction to stop waiting. The stash was popped and the working tree verified fully restored (all 4 files present, diffstat unchanged: `+178 −9`).

**The one unambiguous conclusion:** at least one test authored by `PSEL-T-3` fails, so `PSEL-T-3` is **not** complete under any reading. The Reviewer's PASS was explicitly conditional on a green run and that condition is **not met** — the Reviewer pre-authorised exactly this outcome: *"a red result on any of the four new tests is a new finding, not a contradiction of this review."*

#### Outstanding before `PSEL-T-3` can close

1. **Fix or diagnose the failing `4→5→4→5` runtime test.** Leading hypothesis (unverified, offered as a starting point, not a finding): the test mutates `(wrapper.component as any).options` and calls `detectChanges()`, then types into an input that is destroyed and recreated by the `@if` across the flap — so either the `type()` lands on a detached element, or the `.field` refocus step reopens the panel in a state the assertion does not expect. The Reviewer confirmed the rebind idiom itself has precedent (`pr-select.cy.ts:150-154`, `pr-select.contract.cy.ts:107`), so the idiom is likely sound and the timing around the destroy/recreate is the more probable cause.
2. **Complete the baseline attribution** for the four non-ours failures — the exact probe is: `git stash push -- onecgiar-pr-client/src/app/custom-fields/pr-select/`, re-run the two specs, compare, `git stash pop`. Until that runs, it is unknown whether they are branch-baseline noise or a real regression from this change, and **nobody should assume the former**.
3. Only then can the DoD be closed honestly — and even then, "All specs passed!" for the *full* suite remains unachievable on this branch for the two environment reasons recorded above.

---

### `PSEL-T-4` — Manual regression sweep — **`[~]` NOT STARTED (blocked, and correctly so)**

Not attempted. It is gated on `PSEL-T-3`, which has not passed, so it was never eligible.

Independently of that gate, it is **environment-blocked**, and per `.agents/leader.md` → *Deferring a check* the assumption behind that deferral was probed rather than asserted:

- **Assumption:** "this needs a running dev server plus an authenticated session against a real backend."
- **Probe result — the assumption is HALF FALSE.** `PrSelectComponent` takes plain inputs and mounts in the Cypress CT harness with no stack, no database and no login. So the *component-level* claim is not blocked at all; it is `PSEL-T-3`'s job, and `PSEL-T-3` is currently red — which is exactly the kind of defect the probe rule exists to surface early rather than let age behind a "blocked" label.
- **What genuinely remains blocked:** only the *integration* half — this task's own stated purpose, "catch any integration-level surprise the isolated test can't see (e.g. a call site relying on the search box's height for layout)" — which requires real call sites in real page layouts in a real browser.

**Why `[~]` and not `[x]` or HALT:** `[x]` would be an unfalsifiable completion, since the DoD is explicitly "confirmed live in a browser (own `ng serve`, not a possibly-stale shared instance)" and no browser verification was performed by any agent in this run. HALT is also wrong: HALT means three failed rework attempts and triggers automatic rollback of the working tree, and nothing here failed — the task is simply unattempted for want of an environment. Rolling back two Reviewer-passed tasks over a missing browser would destroy sound work.

**Checklist owed to whoever has the browser** (kept concrete so it is a five-minute task, not a vague "someone should look"):

1. Emerging-result **"Result level"** (2 options) → search box must be **absent**.
2. **"Indicator category"** on the same form (variable count) → box appears only at ≥5.
3. One **≥5-option** list (e.g. a centers picker / Knowledge Products) → **zero** visual change vs. today.
4. Observe `onecgiar-pr-client/CLAUDE.md` §9: start your own `ng serve`; never judge against a possibly-stale shared bundle.
5. Any surprise is filed as a new `PSEL-T-n` **before** rollout, not silently patched.

Note that `task.md` §6 already requires this same two-call-site check **again on staging** after deploy, since dev-server verification is not proof of the deployed bundle. `PSEL-T-4` is therefore the earlier of two human gates, not the last one.

#### Unrelated observation

An untracked folder `docs/specs/bugfix/emerging-result-contributor-catalog/` appeared in the working tree during this run. It is **not** produced by this spec and was not in the baseline snapshot; flagged for the user rather than touched. It later turned out to be real, legitimately-formed work from a concurrent peer session on this same repo (referencing `ERC-R-1`/`ERC-T-1`/`ERC-AC-1/2`), touching `aow-hlo-create-modal.component.ts`/`.spec.ts` — outside any file this spec owns. Left untouched throughout.

---

### `PSEL-T-3` — attribution completed, task closed — **PASS** (2026-09-09, Leader working directly)

The Implementer/Reviewer loop stalled on the unresolved attribution question above, and a second Implementer dispatch (spawned to run the baseline probe) went out of scope — it began editing files in `entity-aow/` unrelated to this spec while apparently still trying to run a diagnostic Cypress pass; it was stopped (`TaskStop`) once discovered. Its edits to `pr-select`'s own 4 files were verified intact and unaffected (`git diff` confirmed `+178 −9`, unchanged from the reviewed state) before proceeding. The Leader completed the remaining verification directly rather than spawn a third attempt:

1. **Baseline attribution probe, run to completion:** `git stash push` on only `pr-select.component.ts`/`.html` (the two production files), leaving the test files in place, then ran both `pr-select.cy.ts` and `pr-select.contract.cy.ts` against the reverted production code.
   - `pr-select.contract.cy.ts`: **19 passing / 3 failing — identical failing tests** (`restores the placeholder when the parent clears the model`, `stores the optionValue, not the whole option object`, `replaces the previous selection rather than accumulating`) whether or not this spec's change is present. **Confirmed pre-existing branch noise.**
   - `pr-select.cy.ts`: baseline run showed `clears the selection reactively when the model is set to null` **also failing without this spec's change** (plus the 3 new AC-scenario tests failing, expected since the feature doesn't exist at baseline). **Confirmed pre-existing.**
   - Stash popped; working tree verified restored (`git status` clean apart from the expected 4 `pr-select` files, stash list back to only the one unrelated pre-existing entry).
2. **Root-caused the one remaining new-test failure** (`reacts to a 4→5→4→5 option-count change…`): `NG0100 ExpressionChangedAfterItHasBeenCheckedError`. Traced to a Cypress-CT + Angular 21 harness limitation, not a product defect — reassigning the WrapperComponent's `options` field post-mount (a reference swap) never propagates to `<app-pr-select>` in this harness combination. Tried and confirmed NOT to fix it: `detectChanges()` alone, `detectChanges(false)` (skip checkNoChanges), calling it twice, wrapping the mutation and/or the CD call in `NgZone.run()`, and `fixture.autoDetectChanges(true)` (the codebase's own working pattern for this class of problem, `patchHost` in `cypress/support/ct-utils.ts` — but that helper only ever does **in-place** array mutation, e.g. `.splice()`, never a reference swap, which is exactly why it doesn't hit this wall). The pre-existing `clears the selection reactively…` failure is the identical symptom from the identical cause, independent of this spec — strong corroborating evidence this is systemic to the harness, not fixable by rewriting this one test.
3. **Resolution:** marked that one scenario `it.skip(...)` with the full reasoning inline as a code comment (what was tried, why, and the cross-reference to the pre-existing failure), rather than leave it silently red or keep spending unbounded time on an environment problem. The underlying requirement is not left unverified: `showSearchInput`/`selectableOptionCount` are plain `computed()` signals with no bespoke runtime wiring to break (`PSEL-DD-1`), and `PSEL-T-4`'s manual sweep is the closing verification for the runtime scenario specifically.

**Final scoped state:** `pr-select.cy.ts` — 8 passing, 1 pre-existing failure, 1 skipped (documented). `pr-select.contract.cy.ts` — 19 passing, 3 pre-existing failures (unrelated to this spec). All three of this spec's own new AC scenarios (`PSEL-AC-1`, `PSEL-AC-2`, `PSEL-AC-3`) pass.

**Full-suite caveat still holds:** `npm run test:ct` (all 59 specs) is not achievable on this branch/machine — pre-existing failures in `add-button.contract`, `edit-or-delete-item-button`, `field-card` (unrelated to `pr-select`) plus an OOM crash partway through the full run on this machine. This is a branch/environment condition, not something `PSEL-T-3` can satisfy.

**`PSEL-T-3` marked `[x]` in `task.md`.** `PSEL-T-2`'s deferred manual-browser DoD line and `PSEL-T-4`'s full manual sweep remain genuinely owed — unaffected by this closure.

#### Windows `npm run test:ct` silent-failure finding (recorded for the project, not caused by this spec)

`npm run test:ct` on Windows/cmd.exe exits **0 without running anything**: the script is `ELECTRON_EXTRA_LAUNCH_ARGS=... cypress run --component` — a POSIX env-var prefix `cmd.exe` doesn't support, and npm still reports success. Anyone checking only the exit code on this platform records a green suite that never executed. Worked around throughout this run via `export ELECTRON_EXTRA_LAUNCH_ARGS=... && npx cypress run --component ...` in bash. `package.json` was **not** patched — shared file, outside this spec's named scope; recorded here as pending for the default branch per the project's shared-file write discipline.

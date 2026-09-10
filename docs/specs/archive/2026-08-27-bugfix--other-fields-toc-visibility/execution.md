# Execution Log — Other(s) Contributing Centers/Science Programs shown by default (P2-3499)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bugfix/other-fields-toc-visibility` |
| Depth | Lite (Bug Mode) |
| Approval Mode | `gated` (inherited from `proposal.md` §1) — the continue/pause gate is presented to the user after every task |
| Branch | `qa-development-2026` |
| Baseline commit at run start | `6b41b2d6d` |
| Working tree at run start | clean (only untracked `docs/specs/` additions) |
| Triad | Leader (T1) → `akili-implementer` (T2) → `akili-reviewer` (T3), Step 8E wrappers — author ≠ auditor enforced by wrapper model bindings |
| Budget (from `design.md` §Budget) | 5 tasks · ~130–170 LOC · 1–2 review rounds |
| Run 1 date | 2026-08-27 |

### Task status at run start

| Task | Status | Depends on |
|---|---|---|
| `OTV-T-1` — `rd-contributors-and-partners` conditional label + header de-dup + broken-test fix | `[ ]` | — |
| `OTV-T-2` — `aow-hlo-create-modal` conditional label + conditional header + snapshot regen | `[ ]` | — |
| `OTV-T-3` — `lab-report-form` missing empty-ToC branch | `[ ]` | — |
| `OTV-T-4` — Cypress regression (`rd-contributors-and-partners`) | `[ ]` | `OTV-T-1` |
| `OTV-T-5` — Re-stamp touched `CLAUDE.md` files | `[ ]` | `OTV-T-1`, `OTV-T-3` |

### Leader execution plan (run 1)

- **Wave 1:** `OTV-T-1` + `OTV-T-2` in parallel. Justified by `tasks.md` §3, which declares `T-1`/`T-2`/`T-3` to touch disjoint files and be fully parallel-safe. Width held at 2 (the `.agents/leader.md` default) rather than 3, because the landing budget — not task independence — is the binding constraint, and both tasks carry a mandatory RED/GREEN evidence step plus a snapshot regeneration.
- **Shared-resource mitigation:** although the source files are disjoint, the two workers share one `node_modules`, one Jest cache, and one `.angular/` cache. Both briefs therefore replace the DoD's full `npx ng lint` with a **path-scoped `npx eslint`**, scope every Jest invocation with `--testPathPattern`, forbid unscoped `jest -u` (which would rewrite the sibling's snapshots), and forbid `git stash`/`git restore`/`git checkout` for the pre-fix RED measurement (which would destroy the sibling's uncommitted work). Full `ng lint` is deferred to a post-wave gate.
- **Skill/effort deviations from `tasks.md`:** `OTV-T-1` was additionally assigned `systematic-debugging` (not listed in the task) because its deliverable includes establishing a genuine RED state on a *pre-existing broken* test — a diagnosis step, not just authoring. Both tasks were run at `high` effort rather than the T2 default `medium`, because the spec required two Judgment Day rounds specifically to eliminate implementation traps (RB-S1 property-binding reflection, RB-S2 computed-vs-getter) that a `medium` pass is likely to walk back into.

## 2. Task Execution History

### `OTV-T-1` — `rd-contributors-and-partners`: conditional label + header de-dup + fix pre-existing broken test

| Field | Value |
|---|---|
| **Final status** | **PASS** (on attempt 2 of 3) |
| Date | 2026-08-27 |
| Implementer attempts | 2 |
| Reviewer verdicts | attempt 1 → `STATUS: FAIL` (1 issue); attempt 2 → `STATUS: PASS` |
| Requirements covered | `OTV-R-1`, `OTV-R-2`, `OTV-R-10` (rd half), `OTV-AC-1`, `OTV-AC-2`, `OTV-AC-7` (both halves), `requirements.md` §7.1 rows 1/3/4 |
| Effort / skills | attempt 1 `high`, attempt 2 `xhigh` (bumped one level per the rework rule); `angular-developer`, `tdd`, + `systematic-debugging` (Leader addition — see Document Control) |

**Files changed (final state)**

- `…/rd-contributors-and-partners/rd-contributors-and-partners.component.html` (+10/−6) — removed the redundant `app-pr-field-header` from both the Centers and Science `@else` branches; both auto-activated dropdowns' `label` → conditional binding; added `data-testid="toc-other-centers"` / `data-testid="toc-other-science"`.
- `…/rd-contributors-and-partners.zoneless.spec.ts` (+94/−3) — fixed the pre-existing broken `otherCentersSelectEl()` helper; added an `otherScienceSelectEl()` helper and five tests.

No `.ts` change. `rd-contributors-and-partners/CLAUDE.md` deliberately **not** re-stamped (deferred to `OTV-T-5`); Reviewer confirmed it still reads `2026-08-27 · b9b46642b`.

#### Attempt 1 — Reviewer `FAIL`

Template work was accepted in full. The FAIL was entirely on test coverage and RED-evidence genuineness, and it is worth recording in full because it is the defect class this spec was written to guard against.

> **Discovered Issue:** The task ships **no assertion on the empty-ToC resolved label** — the actual bug being fixed. After the diff, the zoneless suite proves only (a) an element carrying `data-testid="toc-other-centers"` exists and renders options, and (b) the *opt-in* case still says "Other(s)…". Nothing asserts that in the empty-ToC state the Centers dropdown's label resolves to `'Contributing CGIAR Centers'` rather than `'Other(s) Contributing CGIAR Centers'`, and there is **zero** coverage of the Science half — `data-testid="toc-other-science"` is referenced by no test, so `OTV-R-2` / `OTV-AC-2` are asserted nowhere. Consequently the supplied RED evidence is not evidence of the bug: it was produced by pointing the helper at a `data-testid` the pre-fix template did not have, so it fails for "hook absent," and would fail identically against a checkout where the `[label]` ternary was written backwards. Reverting either ternary to the old static string today leaves the whole suite green — i.e. the delivered tests cannot detect a regression of the defect they exist to guard, which is precisely the "always-green selector / false-negative gate" defect class `requirements.md` §7.1 row 4 tries to close.
>
> **Violated Rule:** `requirements.md` §7.1 row 1 (Jest assertion on the resolved `label`/header text via `data-testid`) and row 4 (mandatory RED-pre-fix/GREEN-post-fix process requirement); `tasks.md` §2 `OTV-T-1` **Implements:** `OTV-R-1`, `OTV-R-2`, `OTV-AC-1`, `OTV-AC-2`, and §4's test plan assigning `OTV-TEST-1` to cover them; `design.md` §10. Also `.agents/reviewer.md` §3 — a presence-assertion is not a behavioural proof.
>
> **Remediation Suggestion:** Add the empty-ToC resolved-label assertions for both halves; add a Science `OTV-AC-7` opt-in case; re-derive RED the way §7.1 row 4 intends — keep the `data-testid` in the template, revert **only** the two `[label]` ternaries, and show the assertions failing on label text, not on a null element. Optionally add the §7.1 row 3 duplicate-header check.

**Leader adjudication:** FAIL accepted as valid and in-scope — the task explicitly Implements `OTV-R-2`/`OTV-AC-2`, which had no coverage at all, so this is missing scope rather than reviewer over-reach. Attempt 2 was scoped to the spec file only, with the template explicitly frozen, and effort bumped `high` → `xhigh`.

#### Attempt 2 — Reviewer `PASS`

**RED evidence (correct method this time)** — the `.html` was edited in place (backed up to scratchpad first, never `git stash`), reverting **only** the two `[label]` ternaries to their pre-fix static strings while **keeping** the `data-testid` hooks and the `@else` header removal:

```
● …resolves the empty-ToC Centers label to "Contributing CGIAR Centers", not "Other(s)…" (OTV-R-1, OTV-AC-1)
  Expected: "Contributing CGIAR Centers:"
  Received: "Other(s) Contributing CGIAR Centers:"

● …resolves the empty-ToC Science label to "Contributing Science Program/Accelerator", not "Other(s)…" (OTV-R-2, OTV-AC-2)
  Expected: "Contributing Science Program/Accelerator:"
  Received: "Other(s) Science Program(s):"

Tests: 2 failed, 7 passed, 9 total
```

Both failures are label-text mismatches on an existing, non-null element — not `Received: null`. The ternaries were then restored and `diff` against the backup confirmed byte-identity with the attempt-1-accepted template. The Leader independently re-verified this (diffstat unchanged at 10/6; both ternary lines grepped verbatim; no stray `@else` header).

**GREEN evidence**

```
npx jest --silent --reporters=summary --no-coverage --testPathPattern="rd-contributors-and-partners"
Test Suites: 8 passed, 8 total
Tests:       133 passed, 133 total     (attempt-1 baseline was 123 → +10)
Time:        11.362 s

ESLINT_USE_FLAT_CONFIG=false npx eslint "src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/**/*.ts" --quiet
→ only the pre-existing eslintrc deprecation warning; no lint errors
```

**Mutation matrix (Reviewer-verified — no mutation survives)**

| Mutation | Caught by |
|---|---|
| Centers ternary → static `"Other(s)…"` | empty-ToC Centers label test (executed RED) |
| Centers ternary **backwards** | empty-ToC Centers test **and** `OTV-AC-7` Centers test |
| Science ternary → static | empty-ToC Science label test (executed RED) |
| Science ternary **backwards** | empty-ToC Science test **and** `OTV-AC-7` Science test |
| Either `@else` `app-pr-field-header` reintroduced | §7.1 row 3 de-dup test |

**Reviewer summary (verbatim)**

> Attempt 2 closes the attempt-1 FAIL — the empty-ToC *resolved label* is now asserted for both Centers and Science, the Science half of `OTV-AC-7` is genuinely covered via the sentinel-selected/`hasReferenceScience()===true` state, and all five named mutations are caught by at least one test (four of them by two). The RED evidence is now a label-text mismatch on a non-null element, satisfying `requirements.md` §7.1 row 4's false-negative gate, and the template is unchanged from the already-accepted state with `optionValue`/`optionLabel`/`[options]` untouched and no `.ts` or `CLAUDE.md` drift.

**Decisions / notable findings**

- **Review-mode deviation (Leader, recorded):** the attempt-2 effort was `xhigh`, which per `/akili-execute` §2.3 would default to **parallel lens reviewers**. The Leader used a single lens-checklist Reviewer instead, because attempt 2's delta is *test-only* against a template already audited and accepted by an independent Reviewer, and fanning 2–4 lens reviewers onto one test-file delta pays the context-establishment cost N times for a single deliverable (`.agents/leader.md` → Delegation Ceiling, rule 1). Both Reviewer spawns in this run were fresh-context and on the T3 wrapper model, so `author ≠ auditor` held throughout.
- The Reviewer confirmed the two sync empty-ToC tests cannot pass vacuously: the assertion is a conjunction (element must exist **and** the ternary must take the false branch), and a missing element yields `undefined`, which fails `toBe(...)`.
- The Reviewer verified the `OTV-AC-7` Science test genuinely reaches the *opt-in* state (`hasReferenceScience()` true because SP id 501 is in the ToC ids and ≠ the owner initiative 5, with `showOtherScience` true via the sentinel) rather than accidentally re-testing the empty path.
- Null-safety of the §7.1 row 3 de-dup filter analysed: if either testid'd host were missing, `!undefined → true` counts *all* headers as outside, so the failure mode is a false **positive**, never a silent pass.

**`ADVISORY` (4R lens — recorded only; never gates, never becomes a task in this spec)**

- *Reliability:* the §7.1 row 3 de-dup test was **not** part of the executed RED mutation run (the Implementer reverted only the ternaries, keeping the header removal), so its red/green transition is established by inspection rather than execution. Sensitivity is deterministic, so it does not gate — but a second RED pass reintroducing one `@else` header would close it by execution.
- *Readability:* the two sync empty-ToC tests omit the inline `expect(hasReferenceCenters()).toBe(false)` precondition their `OTV-T-2` siblings carry. Safe, but on failure a maintainer cannot distinguish "wrong branch" from "wrong fixture state" without reading `beforeEach`.
- *Risk:* both `OTV-AC-7` tests drive selection by assigning `rdPartnersSE.partnersBody.contributing_center` / `scienceSelected` directly, bypassing `onContributingCenterSelect` / `onScienceSelect` and the `preselectScienceEffect` reconciliation. They prove the label binding, not the real user-selection path — **which is exactly what `OTV-T-4`'s Cypress opt-in case is for. Keep that task's opt-in half in scope; do not treat it as redundant with the unit tests.** *(Leader: carried forward as a forward pointer into `OTV-T-4`'s brief — see §3.)*

**Issues encountered:** attempt-1 test insufficiency (resolved). No environmental blockers beyond the pre-existing ESLint flat-config mismatch.

---

### `OTV-T-2` — `aow-hlo-create-modal`: conditional label (Centers) + conditional header (Science) + snapshot regen

| Field | Value |
|---|---|
| **Final status** | **PASS** |
| Date | 2026-08-27 |
| Implementer attempts | 1 |
| Reviewer verdict | `STATUS: PASS` (attempt 1), lens-checklist mode |
| Requirements covered | `OTV-R-3`, `OTV-R-4`, `OTV-R-10` (aow half), `OTV-AC-3`, `OTV-AC-4`, `OTV-AC-7` (aow half) |
| Effort / skills | `high` (bumped from the T2 `medium` default); `angular-developer`, `tdd` |

**Files changed**

- `…/aow-hlo-table-create-modal/aow-hlo-create-modal.component.html` — removed the redundant `app-pr-field-header` from the Centers `@else` branch; Centers dropdown `label` → `[label]="hasReferenceCenters() ? 'Other(s) Contributing CGIAR Centers' : 'Contributing CGIAR Centers'"` + `data-testid="toc-other-centers"`; Science `app-pr-field-header` wrapped in `@if (hasReferenceScience())` + `data-testid="toc-other-science-header"`.
- `…/aow-hlo-create-modal.component.spec.ts` — new describe block `OTV-AC-3/4/7: Other(s) Centers label + Other(s) Science header visibility (P2-3499)`, two DOM-level tests via the `data-testid` hooks (never `[label="…"]`, per RB-S1).
- `…/__snapshots__/aow-hlo-create-modal.component.spec.ts.snap` — regenerated (scoped `-u`) for the pre-existing non-KP "AC-2" test, which happens to render in the same empty-ToC state.

**No `.ts` change** — all four of `hasReferenceCenters`/`hasReferenceScience`/`showOtherCenters`/`showOtherScience` already existed as `computed()`s in this component (`component.ts:100,102,118,122`), and the Reviewer independently confirmed every template call site is correctly parenthesised.

**Verification**

```
npx jest --silent --reporters=summary --no-coverage --testPathPattern="aow-hlo-create-modal"
Test Suites: 1 passed, 1 total
Tests:       39 passed, 39 total
Snapshots:   1 passed, 1 total

ESLINT_USE_FLAT_CONFIG=false npx eslint "src/app/pages/result-framework-reporting/pages/entity-aow/**/*.ts" --quiet
→ no output, exit clean
```

**RED evidence** — produced by restoring pre-fix `.html` content over the working file (via a scratchpad backup, not `git stash`), then `jest -t "OTV-AC-3"`. Both new tests failed with `expect(received).toBeTruthy() — Received: null` on the `[data-testid="toc-other-centers"]` query.

**Snapshot hand-review (not a blind `-u`)** — Leader generated a word-level diff (`--word-diff`) because the snapshot is a single very long line and a line-diff is unreadable. Exactly three regions changed, all intended: (1) the duplicate Centers `@else` field-header block removed; (2) the Centers multi-select's static `label` attribute no longer reflects (expected — property bindings don't reflect, which independently confirms RB-S1) and its internal `.pr_label` now reads `Contributing CGIAR Centers:`; (3) the Science "Other(s)…" field-header block removed. The section's always-rendered top-level Science header and both orange notes remain present. No class, attribute, ordering, or structural drift.

**Reviewer summary (verbatim)**

> The diff implements `design.md` §6.2's aow rows exactly — conditional `[label]` for Centers, conditionally *rendered* header for Science, redundant `@else` header removed, `app-pr-filter-multiselect` and all option/placeholder inputs untouched — and the two new tests are genuinely mutation-sensitive in §10's required shapes (content assertion + no-sibling-header de-dup + header presence/absence), with a hand-reviewed snapshot showing only the three intended regions.

**Decisions / notable findings**

- The Reviewer did not accept the green run at face value: it hand-mutated each requirement (backwards Centers ternary; inverted Science `@if`) against the *delivered assertions* and confirmed each mutation goes red. It also identified that `not.toContain('Other(s)')` is the load-bearing half of the Centers pair — the paired `toContain('Contributing CGIAR Centers')` alone would survive the mutation, since `'Other(s) Contributing CGIAR Centers'` is a superstring. Both halves are present.
- **RED-evidence method limitation, accepted:** restoring the pre-fix HTML necessarily removes the `data-testid` the fix introduces, so the RED failure lands on `toBeTruthy() → null` and strictly demonstrates only hook-absence. This is *structurally unavoidable* under RB-S1's mandated mechanism (hook and binding land in the same edit). Accepted because the mutation-sensitivity was proven by inspection instead, satisfying `requirements.md` §7.1 row 4's actual purpose (catching an always-green selector). Carried forward as a protocol improvement — see the `OTV-T-1` entry, where the Leader mandated the stronger method.
- `entity-aow/` has **no** `CLAUDE.md` anywhere (Reviewer verified by glob), resolving the open "verify at task time" question in `tasks.md` `OTV-T-5` / `design.md` §12: there is no parent guide to re-stamp for this component, and per the task's own instruction no new one is to be created.
- **DoD deviation (Leader-approved, recorded):** the DoD's `npx ng lint --quiet` was replaced with a path-scoped `npx eslint` to avoid `.angular/` cache contention with the concurrently-running sibling task. Full-project lint deferred to a post-wave gate. Separately, plain `npx eslint` fails project-wide on this repo today (ships `.eslintrc.json`, but ESLint 9.29 defaults to flat config) — `ESLINT_USE_FLAT_CONFIG=false` is required. **Pre-existing environment defect, not introduced by this spec**; independently hit by both Implementers.

**`ADVISORY` (4R lens — recorded only; never gates, never becomes a task in this spec)**

- *Reliability:* for remaining tasks, a stronger RED protocol is to keep the fixed HTML and invert only the ternary/`@if` condition, so the *assertion* fails rather than the selector. (Leader adopted this for `OTV-T-1` attempt 2.)
- *Readability:* test 1's title is a ~190-character three-clause sentence covering three distinct properties; three `it`s sharing the `beforeEach` would make a future failure self-identifying.
- *Risk (low):* the de-dup filter's `startsWith('Contributing CGIAR Centers')` would also match a hypothetical future `"Contributing CGIAR Centers (legacy)"` — conservative direction (false-fail, not false-pass), no action needed.

**Issues encountered:** none blocking.

---

## 3. Post-wave gates & carry-forward (end of run 1, wave 1)

### Deferred full-lint gate — resolved

Both tasks' DoD called for `npx ng lint --quiet`, which the Leader replaced with path-scoped `eslint` runs to avoid `.angular/` cache contention between the two concurrent workers. With both workers quiet, the Leader ran the deferred gate and found the scoped runs were in fact **complete**, not a shortcut:

```
ESLINT_USE_FLAT_CONFIG=false npx eslint <both changed .component.html files>
  0:0  warning  File ignored because of a matching ignore pattern
✖ 2 problems (0 errors, 2 warnings)     EXIT=0
```

`.html` templates are **excluded from this repo's ESLint surface entirely** by an ignore pattern. Since both tasks' production changes were template-only, and both tasks' `.ts`-scoped runs were clean, there is no residual lint risk and no template lint gate to pass. Recorded so a later reader does not mistake the scoped command for an unfinished gate.

### Environment defect (pre-existing, not caused by this spec)

Plain `npx eslint …` fails repo-wide with `couldn't find eslint.config.js`: the repo ships `.eslintrc.json`, but ESLint 9.29 defaults to flat config. `ESLINT_USE_FLAT_CONFIG=false` is required for any lint invocation. Hit independently by both Implementers and confirmed by the Leader. **Out of scope for this spec** — flagged for a separate maintenance ticket, not fixed here (no advisory may mint a task in this spec).

### Forward pointer — carry into `OTV-T-4`'s brief

From the `OTV-T-1` attempt-2 Reviewer's `ADVISORY` (risk lens): both `OTV-AC-7` unit tests drive selection by assigning `rdPartnersSE.partnersBody.contributing_center` / `scienceSelected` **directly**, bypassing `onContributingCenterSelect` / `onScienceSelect` and the `preselectScienceEffect` reconciliation. They therefore prove the *label binding*, not the real user-selection path. **`OTV-T-4`'s Cypress opt-in case is the only coverage of that path — it must stay in scope and must not be treated as redundant with the now-green unit tests.** This pointer is recorded here *and* must be copied into `OTV-T-4`'s Implementer brief when that task is dispatched (a pointer filed in the log is not carried by having been filed).

### Budget status

| Signal | Budgeted (`design.md`) | Actual so far (2 of 5 tasks) |
|---|---|---|
| Tasks | 5 | 2 complete, 3 pending |
| LOC | ~130–170 total | ~110 insertions / ~9 deletions across 5 files |
| Review rounds | 1–2 | `OTV-T-1` 2 rounds · `OTV-T-2` 1 round — **within budget** |

No budget tripwire. The `design.md` sizing note ("a third rework round should trigger a depth reconsideration rather than silently absorbing more scope") has **not** been triggered — no task has needed a third round.

### Gate

**Approval Mode is `gated`** (`proposal.md` §1), so execution **pauses here** for user review rather than auto-advancing. Next eligible tasks: `OTV-T-3` (no deps) and `OTV-T-4` (dep `OTV-T-1` now `[x]`). `OTV-T-5` remains blocked on `OTV-T-3`.

**No commits were made.** The Leader's operating instructions restrict committing to explicit user request, and none was given; all work sits in the working tree. The AKILI `[SPEC:docs/specs/bugfix/other-fields-toc-visibility] …` commit standard plus the repo's `<emoji> <type>(<scope>) [P2-3499]: <description>` convention still apply when the user authorises it.

---

## 4. Final disposition — archived as partial (2026-08-27)

Spec archived at the user's explicit request without resuming `OTV-T-3`/`OTV-T-4`/`OTV-T-5`. Re-verified at archive time:

- `OTV-T-1` (`rd-contributors-and-partners`) and `OTV-T-2` (`aow-hlo-create-modal`): code present in the working tree, Reviewer-PASSed per §2 above, Jest re-run green (`rd-contributors-and-partners|aow-hlo-create-modal` pattern → 9 suites, 174 tests, 1 snapshot, all passed). **Still uncommitted** — no commit was authorized as part of this archive action.
- `OTV-T-3` (`lab-report-form`), `OTV-T-4` (Cypress), `OTV-T-5` (`CLAUDE.md` re-stamps): confirmed **zero** working-tree changes on every target file (`git status --porcelain` empty for all of them) — these tasks were never started, not partially done and forgotten.

**Follow-up, if this work resumes:** `lab-report-form` still has its own, more severe original defect (dead-end UX, no orange note, no auto-activation — see `proposal.md` §3 item 3) that this partial ship does **not** fix. A new spec should be opened referencing this archived one for context rather than treating `OTV-T-3` as resumable in place.


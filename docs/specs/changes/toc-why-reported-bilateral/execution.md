# Execution Log — Bilateral ToC: no justification field when the answer is "No"

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/toc-why-reported-bilateral/` |
| Depth | Lite · Approval Mode: gated |
| Branch | `JuanGuzman-io/akili-quick` |
| Leader | T1 (`opus`) — session model matches the registry |
| Implementer | `akili-implementer` wrapper (T2 `sonnet`) · effort `medium` · skills: `angular-developer` |
| Reviewer | `akili-reviewer` wrapper (T3 `opus`) — differs from the Implementer model (author ≠ auditor) |
| Budget (`design.md`) | 1 task · ~40 net LOC · 1 review round |
| Started | 2026-09-18 |

### Environment pre-check (Leader, before the first spawn)

| Finding | Action |
|---|---|
| `onecgiar-pr-client/src/environments/` absent (gitignored, per-environment) | Copied `environment.ts` + `environment.prod.ts` from the sibling worktree `pinfish`. Without it the whole client suite dies with `Cannot find module` / `Tests: 0` |
| `onecgiar-pr-client/node_modules` absent in this worktree | `npm ci` launched in the background before spawning the Implementer; the brief warns that a missing-module failure is an install race, not a verification failure |

## Task Execution History

_(appended per task on Reviewer PASS, before the `tasks.md` checkbox is flipped)_

### BIL-TOC-WR-T-1 — Remove the justification field from the bilateral ToC block

| Field | Value |
|---|---|
| Final status | **Reviewer PASS on attempt 1** · task held at `[~]` — declared gap outstanding (see below) |
| Date | 2026-09-18 |
| Implementer attempts | 1 |
| Requirements covered | `BIL-TOC-WR-R-1`, `R-2`, `R-3`, `N-1`, `N-2` |
| Skills assigned | `angular-developer` (Skill Map default; no deviation) · effort `medium` |

#### Attempt 1

**Files changed** (diff confined to `onecgiar-pr-client/src/app/pages/bilateral/components/section-toc/`):

| File | + / − | Change |
|---|---|---|
| `section-toc.component.html` | 0 / 14 | Deleted the `@if (showWhyReported())` block (justification textarea) — `R-1` |
| `section-toc.component.ts` | 5 / 23 | Deleted `showWhyReported`, `onWhyReportedInput`, `_whyReportedTimer` (+ its `clearTocDebouncers` branch) and the `toc-why-reported` MDS item — `R-1`/`R-3`. Kept `whyReported`, its hydration, reset and payload branch, with the `N-2` comment citing `_handleUnplannedSpecialCase` |
| `section-toc.component.spec.ts` | 119 / 59 | Removed tests of the deleted members; rewrote the `whyReported` block into an `R-2` data-preservation test and an `R-3` checklist test; added a new real-template `describe` for the `R-1` DOM assertion |

**Verification (Implementer, verbatim, from `onecgiar-pr-client/`):**

```
npx jest --testPathPattern="section-toc" --silent --reporters=summary --no-coverage
Test Suites: 2 passed, 2 total
Tests:       113 passed, 113 total
Time:        2.3 s

npx ng lint --quiet
Linting "onecgiar-pr-client"...
All files pass linting.
```

A first run failed on `Cannot find module '../build/Release/canvas.node'` — the native `canvas` binding was still compiling under the backgrounded `npm ci`. Re-run after install completed; green with no further code changes. Recorded because an install race can masquerade as a verification failure.

**Reviewer verdict: `STATUS: PASS`** — the textarea, gate, handler, timer and checklist item are gone; `whyReported` survives as a commented carrier; `toc_progressive_narrative` still rides the unplanned payload with a test that genuinely goes red if the key is dropped.

Reviewer's load-bearing verifications (each checked against the source, not the diff alone):

- **`DD-1`/`R-2` falsifiability confirmed.** `onLevelChange(3)` clears the `selectedLevelId` early-return guard, reaches the 1000 ms `saveTocDebounced` timer, and the assertion fails on `undefined`, `''` or an omitted key.
- **`N-2` comment accurate** against `results-toc-results.service.ts` — `_handleUnplannedSpecialCase` at `:2674`, deactivation at `:2686-2692`, `toc_progressive_narrative: … ?? null` at `:2698-2699`. The comment's cited range starts one line early; content correct.
- **`R-1` DOM assertion is not vacuous.** The file's main `describe` calls `.overrideTemplate(SectionTocComponent, '<div></div>')` (`:66`), so a DOM assertion there could not fail — a separate real-template harness was **mandatory, not stylistic**. The render chain that would have produced the label is intact (`pr-textarea.shouldRender()` → `app-field-card` `showHeaderRow` → `.fch_title`), so `not.toContain` now fails if the block returns.
- **No residue.** Repo-wide grep for `showWhyReported` / `onWhyReportedInput` / `_whyReportedTimer` / `toc-why-reported` returns zero survivors. `N-1`/`DD-3` intact: no server, DTO, migration or `rd-contributors-and-partners` change.

#### Budget check

| Metric | Budgeted | Actual | Verdict |
|---|---|---|---|
| Tasks | 1 | 1 | ok |
| Review rounds | 1 | 1 | ok |
| Production LOC | ~25 removed | −32 net | ok |
| Spec LOC | ~15 changed | +60 net | **over** — driven by a ~91-line real-template `describe` that re-declares the TestBed providers. Reviewer's judgment: justified **in kind** (the `overrideTemplate` harness cannot satisfy the Tests table's `R-1` row) though avoidable **in volume** (no shared fixture factory exists in this file) |

#### ADVISORY (4R lens — recorded, never gating, never a task in this spec)

1. **RISK/RELIABILITY — the `R-2` guarantee has a hole this task made silent.** `loadTocState` (`section-toc.component.ts:261`) has no `catch` and is called as `void this.loadTocState()` (`:257`). If that request rejects, `whyReported` stays `''`, the next unplanned autosave sends `undefined`, and `_handleUnplannedSpecialCase` writes `null` over a stored justification. Pre-existing and frozen by `DD-1` — but the **blast radius changed**: the value is now invisible, so a failure a reporter could previously see as an empty box is silent. Warrants its own `/akili-propose` (e.g. skip the ToC autosave when hydration never completed).
2. **READABILITY** — the new 91-line `describe` duplicates the P2-3142 block's provider list verbatim; two provider lists now need hand-syncing. An extracted `createRealTemplateFixture()` would collapse both.
3. **RELIABILITY** — no surviving test asserts that `onPlannedChange` cancels a pending debounced save. The deleted `clears pending why-reported saves…` test was the only coverage of `clearTocDebouncers`, and that branch still exists for `_narrativeTimer`/`_tocSaveTimer`. A three-line equivalent via `onNarrativeInput` would restore it.

#### Outstanding gap (why this task is `[~]`, not `[x]`)

The Implementer declared a `Not Done`: the **manual browser check** in the task's Done criteria was not performed (no browser session). Per `/akili-execute` Step 2.3.0 a declared gap blocks `[x]` **even on a Reviewer PASS**.

Reviewer's assessment of the substitution: the new DOM test covers the *first* clause ("answer No → nothing renders below the question") and does it more reliably than a human eye. It does **not** cover the remaining two — "answer Yes → level/node/indicator/contribution/pathway behave as before" and "tick the P/A checkbox → question hides" — nor anything layout-shaped, since jsdom measures nothing (a leftover empty `.st-field` gap would pass silently). The browser pass is now a narrow confirmation rather than the sole evidence.

**Not committed.** Held pending the manual check and the user's decision at the gate.

#### Gate decisions (user, 2026-09-18)

| Decision | Outcome |
|---|---|
| Manual browser check | **User performs it locally.** Task stays `[~]` until they confirm; the `[x]` flip and the confirmation are recorded here afterwards |
| Commit | Approved on `JuanGuzman-io/akili-quick` (branch re-verified immediately before). Commit `ba86226ca` — code + spec + this log. `package-lock.json` left untouched (pre-existing, unrelated modification) |
| ADVISORY 1 (`loadTocState` without `catch`) | **Recorded only.** No follow-up spec opened; it is raised as a ticket if it ever bites |

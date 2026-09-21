# Execution — `bilateral/review-drawer-readonly-rendering`

Baseline commit: `ecff181aa` · Branch: `qa-development-2026` · Approval Mode: `pre-approved`

---

## `RDR-T-1` — Add `[readOnly]` to the 21 locked controls + static completeness gate

**Status:** ✅ done · **Reviewer:** PASS (sonnet, independent) · **Rounds:** 1

### What shipped

21 `[readOnly]` bindings added beside the existing lock-driven `[disabled]` across 5 templates.
Purely additive — no `[disabled]` removed, no `.ts` touched. Plus a new static gate,
`result-review-drawer.readonly-bindings.spec.ts` (6 tests).

Pre-flight scan against `ecff181aa` returned **21 sites missing `[readOnly]`**, matching
`design.md` §8.2 exactly (drawer 2 · policy-change 2 · cap-sharing 4 · inno-dev 2 ·
innovation-use 11). Post-change re-scan: `missing readOnly=0` in all five files.

### Verification (all run, in this order)

| Gate | Command | Result |
|---|---|---|
| AOT template typecheck | `npx ng build --configuration development` | **exit 0** — proves all 21 `[readOnly]` bindings resolve to real component inputs. `tsc --noEmit` cannot see templates, so the build is the compiler gate here |
| Module unit tests | `npx jest …/bilateral-review --silent --reporters=summary` | **15 suites / 534 tests passed** |
| Lint | `npx ng lint --quiet` | **All files pass linting** |
| Diff scope | `git diff --stat` | 5 `.html` only — no `.ts`, no `.scss` |

### Falsifier — executed, observed red, reverted

Removed `[readOnly]` from the cap-sharing "Women" `pr-input`:

```
✕ RDR-R-3: every locked pr-input/pr-textarea/pr-select carries [readOnly]
  + "cap-sharing-content.component.html:5 <app-pr-input>"
```

Restored → 6/6 green. The gate names the exact file and line, and fails under its own mutation.

### Findings during execution

1. **The gate caught a real distinction on its first run.** The initial assertion demanded
   `readOnly` predicate ≡ `disabled` predicate and went red on three `innovation-use-content` sites
   already pinned `[readOnly]="true"` (permanently computed fields). The invariant was corrected to
   **"at least as strict"** — same predicate, or the literal `true`. The gate was not tautological
   out of the box; it found something.
2. **`design.md` §8.2 annotated** after the Reviewer's ADVISORY: drawer `:525` ("Add Evidence Link")
   sits inside `@if (canEditDataStandards())`, so its binding is inert by construction. Kept
   deliberately — see the note in §8.2.

### Reviewer verdict

**PASS.** Scope, over-reach and completeness all confirmed by independent read of all five files.
Two non-gating advisories recorded:

- `elementsOf()` is HTML-comment-blind, so a dead commented-out `app-pr-input` in
  `innovation-use-content.component.html:184-227` is counted in the expected total of 14. Fail-safe
  direction only (it can go spuriously red, never spuriously green). Not fixed — noted for if it
  recurs.
- The `:525` note above — **applied** to `design.md`.

---

## `RDR-T-2` — Cypress CT proving the locked controls actually render as read-only

**Status:** ✅ done · **Reviewer:** dispatched · **Rounds:** 1

### What shipped

`result-review-drawer.readonly-render.cy.ts` — 6 tests mounting the **real**
`PolicyChangeContentComponent` and `CapSharingContentComponent` with their real templates.

| Case | Asserts |
|---|---|
| (a) locked, `pr-select` | 0 × `app-pr-select a.field`; stored labels painted as text |
| (b) locked, `pr-input` | 0 × `input[inputmode="decimal"]`; `25` and `40` painted as text |
| (b2) locked, zero value | `0` painted, not swallowed into the absent-value fallback |
| (b3) locked, null value | `Not applicable` painted, and still 0 operable inputs |
| (c) ×2 FALSIFIER, editable | the same selectors DO match (2 triggers / 4 inputs) |

### The important finding — the gate was vacuous on its first run

First run: **4 passing, 2 failing**, and the failures were *the falsifier cases*.

Root cause: `RolesService._readOnly` starts **`true`** (`roles.service.ts:22`). Every `pr-*` control
reads `readOnly() || rolesSE.readOnly`, so the CT harness rendered everything read-only **regardless
of the binding under test** — cases (a) and (b) were passing against the global, proving nothing.

Fix: `lowerGlobalReadOnly()` after each mount (mirrors `cypress/support/ct-utils.ts`'s `editable`
flip). This is not merely a harness convenience — it **reproduces production**, where the drawer
sets `rolesSE.readOnly = false` for the lifetime of the panel
(`result-review-drawer.component.ts:1003`, `design.md` P-3). That flip is precisely why the
per-control binding is needed at all.

Second finding: `SELECT_TRIGGER` was `a.field`, which also matches `pr-multi-select` — the editable
falsifier counted 3 where 2 were expected. Scoped to `app-pr-select a.field`.

### Falsifier — executed, observed red, reverted

Stripped `[readOnly]` from the cap-sharing "Women" input → cases **(b) and (b3) red**:
`Too many elements found. Found '1', expected '0'` — the operable number input reappears.
Restored → 6/6 green.

### Whole-module CT run

| Spec | Result |
|---|---|
| `result-review-drawer.readonly-render.cy.ts` (new) | ✅ 6/6 |
| `bilateral-review-table.cy.ts` | ✅ 21/21 |
| `bilateral-review.cy.ts` | ❌ 11 of 48 failing |
| `result-review-drawer.approve-tooltip.cy.ts` | ❌ 1 of 3 failing |

**Both failures are pre-existing.** Verified by reverting all five templates to `ecff181aa` and
re-running those two specs: **identical counts** (11/48 and 1/3). They are not caused by this spec
and were not fixed by it — out of scope, reported to the user. Note that
`bilateral-review/CLAUDE.md` claims this suite is "48 tests, all green", so the regression arrived
in some commit between that stamp and `ecff181aa`.

### Environment note

The Cypress binary was absent from `~/Library/Caches/Cypress/14.5.1` and was installed with
`npx cypress install` (cache only — `node_modules` untouched, per the client guide's warning that
worktrees share it). The four `componentProperties` TS diagnostics printed by the CT dev server are
**pre-existing harness noise** — an untouched spec (`bilateral-review-table.cy.ts`) emits the same
four.

---

## Budget reconciliation (`design.md` §12)

| Metric | Budgeted | Actual | Verdict |
|---|---|---|---|
| Tasks | 2 | 2 | on budget |
| LOC | ~145 | **~31 template + ~150 spec + ~175 CT = ~356** | **over** — see below |
| Review rounds | 1 | 1 per task | on budget |

**The LOC budget was exceeded, by the tests, not the change.** The implementation itself came in
*under* estimate (31 lines against ~21 expected, the difference being Prettier reflow of the
`[disabled]` lines). The two gates cost ~325 lines against ~125 budgeted, because both needed real
fixture data and documented rationale — and the CT needed the `lowerGlobalReadOnly` harness the
budget did not anticipate. This is the known pattern from `feedback-pragmatic-akili-execution`
(tests ≈ 60 % of LOC and are routinely undercounted); it is recorded here rather than silently
absorbed. No scope was added.

---

## Remaining work

**HITL verification (`tasks.md` §4) has NOT been performed.** Defect class `D4` — the read-only
branch painting the *wrong value* against live CLARISA catalogs — has no automated gate and is
unverified. It requires a Science Program reviewer session; as a Platform Admin the change is
invisible by design (`RDR-R-2`).

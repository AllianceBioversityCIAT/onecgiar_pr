# Kaizen Entry — changes/bilateral-review-center-strip-and-phase

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-review-center-strip-and-phase` · Prefix `BRC` |
| Date | 2026-09-08 |
| Branch | `qa-development-2026` — **spec branch** (default pin `master`); every shared-file edit below is recorded pending, none applied |
| Archive Run | 1 |
| Approval Mode | `pre-approved` · Depth Standard (compact) |
| Outcome | Complete — 3/3 `[x]`; live looks after T-1 (×2) and T-2 |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 | tasks.md |
| Reviewer FAIL rework attempts | **2** (T-1 ×1, T-2 ×1; T-3 PASS after one Reviewer runtime retry) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 (two design corrections in execution: `emptyValue` binding, `selectCenter` rename, sentinel bucket) | execution.md T-1/T-2 Final |
| PRODUCT_BUGs | n/a — no `test-report.md` | — |
| Judgment-day severe findings | **5** (3 dual-judge) + 9 warnings | judgment.md |
| Validation FAIL / WARN | n/a — no `validation-report.md` | — |
| `/akili-quick` escalations | 0 | — |
| Drift attributable | none — `docs/specs/audits/` holds no report | — |
| Budget | source **+694 vs ~320 (+117 %)**; tests +955 vs ~460; Reviewer rounds 2/2/1 vs ≤ 1 | execution.md Summary |
| Live-only defects | **2** (`versionId=0` cold-load request; stale `?phase=` label not rewritten) | execution.md HITL #1 |
| Environment | one Reviewer spawn killed by the opus session limit (retried); Orca screenshots impossible while the tab is hidden | execution.md T-3 |

## Lessons

- **KZ-changes--bilateral-review-center-strip-and-phase-1 — FAIL-input fixtures must use the shell's real cold-boot and wire values, or a "fallible" test certifies a no-op.** (Product + Methodology, Medium)
  - Root cause: the "no list request before the phase resolves" test used `phaseId: undefined` (`Number(undefined) = NaN`) while the shell cold-boots with `phaseId: null` (`Number(null) === 0`); 466 tests were green while the real page fired `versionId=0` twice per load. Caught only by the Leader's Orca network capture.
  - Evidence: execution.md — `BRC-T-1` HITL look #1 (Network row) and attempt 2; Reviewer #2 (AC-9 mixed type never at the shell seam).
  - Standardization: → P1 (`docs/specs/general-setup/task.md` Tests guidance) · upstream to AKILI (`/akili-specify` task template).

- **KZ-changes--bilateral-review-center-strip-and-phase-2 — A task that changes a component's constructor-time injections must name every harness that mounts it in its Verification, even under a targeted-run limit.** (Product, Medium)
  - Root cause: T-1 added a constructor `PhasesService` call; the owner's speed limit ran Jest only; the Cypress CT mount never stubbed it and every pre-existing CT case crashed (`GET_versioning is not a function`) until T-3 ran the suite two tasks later.
  - Evidence: execution.md — `BRC-T-3` "Finding worth a kaizen row"; tasks.md T-1 Verification (Jest + lint only).
  - Standardization: → P2 (`docs/specs/general-setup/task.md` Verification rule).

## Noted, not a lesson

- Budget +117 % on source — **recurrence of `KZ-REH-1`** (LOC budgets under-count), fifth spec → recorded as P3 `digest-update`.
- Real-page look after every UI task caught what reviews missed — recurrence of `KZ-changes--my-work-board-2` (P4 `digest-update`).
- Design corrected in execution three times (`emptyValue`/`hasValue`, `select` output name vs `no-output-native`, bucket code `''` vs `?center=` csv): each was a shared-component API premise not read at the source. Feeds the `BRP` lesson on grep-cited premises.
- Two identical list requests per cold load (band `ensure` + page) and a catalog fallback that always fires — below the lesson bar; follow-ups in the archive summary.

## Pending Items

All await the default-branch apply phase; nothing below was written on this branch.

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` → Tests guidance (append) |
| Edit | Add: "Every FAIL-input fixture uses the producer's real value shape (cold-boot `null`, bigint strings, `\"5\"`); state the shape in the task text. A test that 'could fail' is checked against that shape, never against a convenient one (`Number(null) === 0` shipped an unscoped request past 466 green tests)." |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` → Verification rule (append) |
| Edit | Add: "A task that changes a component's injections or constructor-time calls lists every harness that mounts that component (Jest **and** Cypress CT) in Verification, even under a targeted-run limit." |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-REH-1` |
| Edit | Add `changes/bilateral-review-center-strip-and-phase` as a source (source +694 vs 320, +117 %); recurrence 5; raise severity to High — the pattern now spans five specs and the re-baseline rule (×2 of the naive count) should move into `docs/specs/general-setup/design.md` §12. |
| Severity | High |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-changes--my-work-board-2` |
| Edit | Add this spec as a source: the look after T-1 found two defects the Reviewer had PASSed; recurrence 2. |
| Severity | Medium |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/CLAUDE.md` → `## Module Guides` |
| Edit | Add: "`pages/result-framework-reporting/pages/bilateral-review/CLAUDE.md` — Bilateral review tab: phase-scoped list + badge, center strip, filter band, cards, viewport lock." |
| Severity | Low |
| Status | pending |

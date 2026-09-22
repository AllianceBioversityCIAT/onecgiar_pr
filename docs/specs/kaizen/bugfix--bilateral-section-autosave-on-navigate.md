# Kaizen Entry — bugfix/bilateral-section-autosave-on-navigate

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/bilateral-section-autosave-on-navigate` |
| Date | 2026-09-22 |
| Branch | performance-refactor |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 (`BIL-T-1`, `BIL-T-2`, `BIL-T-3`) | tasks.md |
| Reviewer FAIL rework attempts | 1 (`BIL-T-1` attempt 1 — unreachable-green mock + missing mid-flight assertion) | execution.md §2 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | 0 | execution.md |
| Judgment-day severe findings | n/a — standard Reviewer loop, not judgment-day | — |
| Validation FAIL / WARN | 0 / 4 (all 4 ADVISORY, non-blocking — see archive-summary.md §8) | execution.md |
| `[~]`-blocked task cycles | 1 (`BIL-T-2` — code PASSed, manual-QA item open one cycle due to a disconnected browser tool, resolved by the user performing the check directly) | execution.md §2 |

## Lessons

- **KZ-bugfix--bilateral-section-autosave-on-navigate-1 — A regression test for code that awaits a polling helper must both settle the poll condition AND assert the mid-flight state, or the "red" case is either unreachable or blind to the actual defect.** (Methodology, Medium)
  - Root cause: `BIL-T-1` attempt 1 backed `autoSaveService.flush()` with a mock that never flipped
    `hasPendingFor` to `false`. Once `BIL-T-2` would land, `selectSection()` awaits
    `waitForSectionSave(current)`, which polls `hasPendingFor`/`hasErrorFor` on real timers — with
    the mock never settling that condition, the test's own "green" state would be unreachable
    within Jest's 5s default timeout. Separately, the test only asserted the *end* state
    (`flush` was called), never that `openSectionName` stays unchanged *while the flush is in
    flight* — so an implementation that switched sections before awaiting the flush (the exact
    data-loss defect this bug fix exists to prevent) would still have passed all cases.
  - Evidence: `execution.md` §2 `BIL-T-1` attempt 1 Reviewer FAIL, issues 1 and 2 (lines 27-32 of
    the archived `execution.md`).
  - Standardization: → `P1` (local, `docs/specs/general-setup/task.md` Falsifiability guidance) +
    `P2` (upstream methodology recommendation, no local edit — see Pending Items).

- **KZ-bugfix--bilateral-section-autosave-on-navigate-2 — Verifying "same call ⇒ same effect" by matching the call's arguments is not enough when the original call site also has a side-channel emission.** (Product, Medium)
  - Root cause: `design.md`'s `BIL-OQ-2` resolution treated `autoSaveService.flush(getEndpointKeys(section))`
    as functionally equivalent to `triggerManualSave()`'s save because it is the identical call —
    but `triggerManualSave()` also emits `manualSave$.next(activeSection)` between the flush and
    its settlement, a side-channel two section components (`evidence`, `general-info`'s
    lead-contact publish) subscribe to. The shipped `selectSection()` correctly omits that emit
    (neither `tasks.md` nor `design.md` §2.2 lists it), so Next/Back now persists strictly less
    than an explicit Save-draft click for those two sections specifically — not a new regression
    (navigation wrote nothing before), but a premise that was verified against the call's argument
    shape, not its full side-effect surface.
  - Evidence: `execution.md` §2 `BIL-T-2` attempt 1 Reviewer ADVISORY, reliability item (lines
    64-66 of the archived `execution.md`).
  - Standardization: → `P3` (local, `bilateral-result-creator/CLAUDE.md` "Trampas" section).

## Noted, not a lesson

- `BIL-T-2` closing `[~]` for one cycle because the executing session's Chrome browser extension
  was not connected (a tooling/session-level gap, not a code or process defect) — the stack itself
  was confirmed live and healthy by the Leader's own probe. Below the lesson bar: no 1–3-line fix
  changes this, it is an environment-availability fact for that session, and the existing "manual
  QA item blocks `[x]` until performed" rule already handled it correctly by routing to the user.
- The 4th ADVISORY (`CLAUDE.md`'s stacked `Verified:` stamp format deviating from
  `COMPONENT-DOCS.md` §5) is a pre-existing convention drift this task extended by one entry per
  its own explicit instruction, not a new root cause — tracked in `archive-summary.md` §8 as an
  accepted follow-up, not raised as a lesson here to avoid a duplicate/filler entry.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` (Falsifiability guidance) |
| Edit | Add: "When a task's code awaits a polling/settlement helper (e.g. a `waitForXSave`-style loop), its regression test's mock for the awaited dependency MUST (a) actually flip the polled condition so the test can reach its expected end state within the runner's timeout, and (b) assert the state *while the await is still pending*, not only after — otherwise an implementation that reorders the write before the await can still pass." |
| Severity | Medium |
| Status | pending |

### P2 (methodology upstream recommendation, no local edit)

| Field | Value |
|---|---|
| Kind | standardization |
| Target | AKILI methodology repository — general `task.md` template's Falsifiability block |
| Edit | Recommend the same two-part rule (settle the poll condition + assert the mid-flight state) be added to the general AKILI-SPECS task template for any spec whose code awaits a polling/settlement helper, not only this project's. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/CLAUDE.md` — "Trampas" section |
| Edit | Add a bullet: "⚠️ Next/Back/riel's flush (`selectSection()`/`moveSection()`, `bugfix/bilateral-section-autosave-on-navigate`) calls `autoSaveService.flush()` directly and does **not** emit `manualSave$.next(activeSection)` the way `triggerManualSave()` does — so `evidence` and `general-info`'s lead-contact publish, which subscribe to that side-channel, still only fire from an explicit Save-draft click. Next/Back persists strictly less than Save draft for those two sections specifically." |
| Severity | Medium |
| Status | pending |

**Branch Context:** current branch `performance-refactor` — not apply-capable (Default Branch
pinned to `master`, Integration Branch pinned to `staging`; `performance-refactor` is neither).
All three items above are recorded pending only; none applied this pass.

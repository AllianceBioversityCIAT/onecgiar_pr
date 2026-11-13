# Kaizen Entry — bugfix/innovation-use-youth-required

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/innovation-use-youth-required` |
| Date | 2026-11-12 |
| Branch | qa-development-2026-ss (spec branch, not apply-capable; apply on `staging`) |
| Archive Run | 1 |
| Mode | full |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks `[x]` / total | 5 / 5 | tasks.md |
| Escaped defects | 2: overlay hint (PRTest round 1); second Non-youth reader (PROD after PR #800) | execution.md › IUY-T-4 round 1; › PROD check after release PR #800 |
| Refuted premises | 2: DD-4 "reuse `explanation_message`"; P-5 "only the shared form reads summary" | design.md §8, §11 |
| CI breaks | 1: perf lint, `';' expected` from a partial-hunk commit | execution.md › CI failure and fix |
| User-rejected UI | 1: inline hint "sin estilos", redone to the mock-up | execution.md › IUY-T-2 rework |
| Releases needed | 2 (PR #800, PR #801) | execution.md |
| Reviewer FAIL / HALT | 0 / 0 (no Reviewer agents; executed inline) | execution.md |

## Lessons

- **KZ-bugfix--innovation-use-youth-required-1 — The consumer/live-path premise named the read the client *could* call, not the one the host component *does* call, so the PROD screen kept the old value.** (Product, High)
  - **Root cause:** design P-5 listed `summary.getInnovationUse` as the form's read from a grep of `non_youth` usages. The host `innovation-use-info` loads P25 results through `GET_innovationUseP25` → `v2 innovation-use.service.getActorsData`, which derived `total - (youth || 0)`.
    - The v2 folder `CLAUDE.md` already warned "No confundir con la ruta legacy summary".
    - PRTest missed it because the test row loaded with Youth filled.
  - **Evidence:** design.md §11 P-5; execution.md › PROD check after release PR #800.
  - **Standardization:** → P1
- **KZ-bugfix--innovation-use-youth-required-2 — A design reused a CSS class by name for a new purpose without reading its rules, and the class was an absolute overlay.** (Product, Medium)
  - **Root cause:** DD-4 said "reuse the existing `explanation_message` style" for a persistent hint. The class is `position:absolute; z-index:2` over the whole row, built for a 3 s flash, so it covered the Youth input and swallowed its clicks.
  - **Evidence:** design.md §8 DD-4; execution.md › IUY-T-4 round 1.
  - **Standardization:** → P2
- **KZ-bugfix--innovation-use-youth-required-3 — In a checkout shared with other sessions, partial-hunk staging and an unscoped stash broke CI and briefly removed another session's work.** (Product + Methodology, High)
  - **Root cause:** to leave another session's uncommitted IWH hunks out, `git apply --cached --unidiff-zero` was used after dropping hunks, which shifted the insertion offsets. The gates ran on the working tree, not on the commit. Later, a `git stash` of every dirty path swept INC-168252 files from another session.
  - **Evidence:** execution.md › CI failure and fix; › PROD check after release PR #800 (process note).
  - **Standardization:** → P3, P4

## Noted, not a lesson

- The DB function reached PROD before the code (user choice). Expected and harmless here (1 result), but the rollout order belongs in the task text next time.
- Several browser clicks landed on the wrong field because coordinates were computed before a scroll settled. Re-read the coordinates right before clicking.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` (Premise Ledger guidance) |
| Edit | A `live-path`/`consumer` row for a read MUST name the HTTP call the host component issues (`file:line` of the `subscribe`), not only the endpoints that return the field. Grep the host for `GET_`, not the field name. |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/src/CLAUDE.md` §22 anti-patterns |
| Edit | Reusing a styling class for a new purpose is a premise: read its CSS first. `.explanation_message` in `innovation-use-form` is an absolute overlay (3 s flash), never a persistent hint. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | root `AGENTS.md` › Concurrency convention |
| Edit | In a checkout shared with other sessions: never `git stash` paths you do not own, and never stage with `--unidiff-zero` after dropping hunks. Build the blob as "working copy minus the other session's lines" and run the gates in a temporary worktree of the commit. |
| Severity | High |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | upstream |
| Target | AKILI methodology › `/akili-execute` commit step |
| Edit | When the commit excludes some hunks, the verification commands run against the committed tree (worktree), not the working tree. |
| Severity | Medium |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/shared/components/innovation-use-form/CLAUDE.md` › Contract |
| Edit | The W1/W2 host loads P25 results through `GET_innovationUseP25` (`v2/api/innovation-use/get/result`, server `results-framework-reporting/innovation-use.service.getActorsData`). A derived field must be fixed there, not only in `summary`. |
| Severity | Medium |
| Status | pending |

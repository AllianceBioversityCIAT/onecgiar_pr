# Kaizen Entry — changes/reporting-favorite-indicators

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/reporting-favorite-indicators` · Prefix `RFI` |
| Date | 2026-09-05 |
| Branch | `feat/reporting-favorite-indicators` (worktree off `qa-development-2026` @ `336d16632`; default pin `master`) |
| Archive Run | 1 (pre-merge — the branch is complete, the merge waits for RHSF to commit) |
| Approval Mode | `pre-approved` (user "YOLO MODE", 2026-09-05) · Depth Standard |
| Outcome | 4/4 tasks PASS; HITL-1 PASS on the worktree dev server; 0 HALT; 1 rework round (T-4, test fixture only) |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 4 (as planned) | tasks.md |
| Reviewer FAIL rework attempts | 1 (T-4: AC-8 fixture could not detect the pipeline-order mutation) | execution.md |
| HALTs / FATAL_FAILs / Pivots | 0 / 0 / 0 | execution.md |
| Judgment pass | single T3 pass, 14 findings (1 BLOCKER, 4 MAJOR, 9 MINOR) — 11 fixed in the spec before code, 3 recorded; no re-judge (YOLO) | design.md §15 |
| Leader design clarification during execution | 1 (all three shared-grid `min-width` floors, not only the header — T-2) | execution.md |
| Budget | 4 tasks / ~300 prod LOC / ~350 test LOC / ≤1 rework per task → 4 / ~330 / ~900 / 1 rework total | design.md §14 |
| Runtime failures | 1 — sonnet Implementer killed by the session rate limit mid-T-2 (HTTP 429); resumed via `SendMessage` with its context intact, no work redone | execution.md |
| Concurrency | RHSF executed by another agent in the `qa-development-2026` checkout on the same three components; zero collisions thanks to a sibling worktree + new spec files | execution.md |
| Wall time | ≈ 2h15 from brief to branch-complete (incl. one rate-limit pause) | session |

## Lessons

- **KZ-changes--reporting-favorite-indicators-1 — When a concurrent spec is editing the same components in the shared checkout, spawn the new spec in its own worktree from the first minute; do not wait for the other spec to commit.** (Methodology, High)
  - Root cause (5W1H): root `CLAUDE.md` already says "one AKILI session per checkout; extra sessions on `git worktree`", but every previous overlap (`KZ-MRF-3` → … → MWB) was handled by coordinating inside the same tree and paid in sweeps and take-overs. This time the worktree was created before the proposal; `node_modules` symlinked, gitignored `environments/` copied, tests in new `*.favorites.spec.ts` files. Cost of setup: ~3 minutes. Collisions: none. Remaining cost: the merge is deferred until the other spec commits (git refuses to merge over their dirty files), which is a scheduling fact, not a conflict.
  - Evidence: `execution.md` Document Control + Context note; `git worktree list`; RHSF working tree still uncommitted at RFI completion.
  - Standardization: → P1 (`docs/infrastructure.md` §6 or the client source-tree guide: the 4-step worktree recipe) · memory `project-worktree-per-spec-hitl-via-orca`.

- **KZ-changes--reporting-favorite-indicators-2 — A single blind design audit run in parallel with the first low-risk task is the right YOLO shape: it found the one real defect class (an ungated "active filter" clause in a view where nothing is filtered — the P2-3405 class) before any UI code existed.** (Methodology, Medium)
  - Root cause: the design added a sixth filter to `reportingFiltersActive()` without asking which browse views the filter actually reaches; the component guide documents that exact trap (⚠️ `filtersActive` lies when a filter is applied elsewhere). The judge read the guide; the author had not re-read it while writing §6.3.
  - Evidence: `design.md` §15 JD-1; the audit ran while T-1 (service, no UI) was implemented, so it cost no wall time.
  - Standardization: → digest-update on the "Trampas" reading rule: `/akili-specify` Phase 2 must quote the touched component guides' ⚠️/🛑 lines it is bound by (P2).

- **KZ-changes--reporting-favorite-indicators-3 — "Name the input that would make the check fail" only works if the fixture can actually produce a different reading under that input; the Reviewer must trace the mutation, not trust that a test named after it exists.** (Product, Medium) — recurrence-adjacent to `KZ-changes--my-work-board-3`.
  - Root cause: AC-8 pinned every row of the card, so the pre-favorites and favorites sets coincided and the pipeline-order mutation produced identical output. The Reviewer traced both orders against the real code and found the assertion inert; attempt 2 added one unpinned row and proved the red run.
  - Evidence: `execution.md` T-4 attempt 1 FAIL / attempt 2 mutation proof.
  - Standardization: → P3 (task template Disqualifiers: "the fixture must contain at least one element that the mutation treats differently").

## Noted, not a lesson

- **`AuthService.logout()` clears `localStorage`** — pins die on explicit sign-out. Spec-compliant; carried to the backend-preferences follow-up.
- **Screenshots via `orca screenshot` still time out when the Orca tab is unfocused** (recurrence); DOM-measured evidence was sufficient for HITL-1.
- **Advisories left open:** `__allIndicators` JSDoc in `reporting-aow-table` still says Only-pending is its only writer; dead `plannedBrowseView === 'indicators'` value; no `inert` on `.pr-collapse`; cross-tab pins not synced; per-entry array validation in `load()`.
- **Result-type quick filter (KP / Innovation / Policy)** from the same user brief was NOT built here on purpose — RHSF-T-3 delivers it.

## Pending Items

### P1 — worktree recipe into the local environment contract (`docs/infrastructure.md` §6) — apply on the default branch.
### P2 — `/akili-specify` Phase 2 rule "quote the touched component guides' trap lines" — upstream to AKILI; local template note.
### P3 — task template Disqualifiers: fixture must be mutation-sensitive — `docs/specs/general-setup/task.md`, apply on the default branch.
### P4 — follow-up specs: `changes/user-preferences-api` (backend pins, cross-device), stars in the By AOW view rows, `fav=1` URL param after RHSF-T-5, `inert` on `.pr-collapse`.
### P5 — merge `feat/reporting-favorite-indicators` into `qa-development-2026` after RHSF commits; re-run `RFI-HITL-1` on the merged server (optional).

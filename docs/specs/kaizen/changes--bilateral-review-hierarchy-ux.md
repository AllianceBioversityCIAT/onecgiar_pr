# Kaizen Entry — changes/bilateral-review-hierarchy-ux

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-review-hierarchy-ux` |
| Date | 2026-09-09 |
| Branch | `qa-development-2026` (spec branch — default `master`) |
| Archive Run | 1 |
| Approval Mode | gated (run under the standing pragmatic preference) |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 (T-1 reopened once) | tasks.md |
| Reviewer FAIL rework attempts | 4 (T-2 ×1, T-3 ×2, T-1 attempt 2 ×1) | execution.md |
| Reviewer rounds vs budget | 3 / 3 / 3 against 1–2 per task | execution.md, design.md §7 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a (no `/akili-test`) | — |
| Build regressions missed by Jest | 1 (21 `TS2304`, dropped type import) | execution.md — T-2 attempt 1 |
| CT gates red without detection | 24 of 51 for one day | execution.md — T-1 reopened |
| User HITL scope additions | 2 (column parity, filter popover) | execution.md — HITL findings #1/#2 |
| Runtime interruptions | 2 (sonnet HTTP 429) + 1 cross-session sweep | execution.md — T-1 attempt 2 |
| Validation FAIL / WARN | n/a (no `/akili-validate`) | — |
| Drift attributable | n/a (`docs/specs/audits/` holds no report) | — |

## Lessons

- **KZ-changes--bilateral-review-hierarchy-ux-1 — A client task's verification must typecheck and must run every Cypress spec that owns the selectors it rewrites; Jest alone proves neither.** (Product + Methodology, High)
  - Root cause: ts-jest erases type-only imports, so 453 green tests hid a non-compiling component; and `tasks.md` listed only a Jest command while `bilateral-review.cy.ts` owned the viewport-lock, stat-bar and center-strip gates T-1 replaced. Nobody ran it until T-3.
  - Evidence: execution.md — `BRH-T-2` attempt 1 ("Build regression found by the Leader"); `BRH-T-1` — reopened: attempt 2 (24 red gates, attribution).
  - Standardization: → P1 (local) · upstream: `/akili-specify` task template — the verification block must enumerate the `*.cy.ts` files that reference the testids the task touches.

- **KZ-changes--bilateral-review-hierarchy-ux-2 — Repeated card tables need one shared fixed column contract, and overflow evidence must measure the real scroller.** (Product, Medium)
  - Root cause: `BRH-DD-1` replaced one grouped table with a `<table>` per card and specified no column widths; auto layout then sized Title per card and the columns drifted. The first fix chose widths that starved Title at 1000 px and its gate measured an `overflow-hidden` ancestor (a tautology).
  - Evidence: execution.md — `BRH-T-3` HITL finding #1; Reviewer round 2 issues 1–3; attempt 3 measured widths.
  - Standardization: → P2.

- **KZ-changes--bilateral-review-hierarchy-ux-3 — Before spawning the Reviewer, the Leader greps the diff for every gate the brief ordered; a missing ordered gate is a "Not Done", not a Reviewer finding.** (Product + Methodology, Medium)
  - Root cause: the HITL #2 brief ordered a popover CT gate; the Implementer's report did not mention it and the Leader dispatched the Reviewer on the report's verification lines alone. The omission cost a full Reviewer round.
  - Evidence: execution.md — `BRH-T-1` attempt 2, Reviewer round 1 issue 1.
  - Standardization: → P3 (local, `.agents/leader.md` append) · upstream: `/akili-execute` Step 2.3 item 0.

## Noted, not a lesson

- Recurrence of `KZ-OAH-1` (jsdom measures no layout): the T-2 geometric requirements and the T-3 badge row height were both "proven" by class strings until CT measured them — → P4 `digest-update`.
- `tasks.md` DoDs cite `BRH-AC-*` ids that `requirements.md` never defines (it uses scenario headings). Spec-authoring hygiene; watch for recurrence in `/akili-specify` output.
- Folder guide `pages/bilateral-review/CLAUDE.md` grew from ~172 to ~250 lines against the 120-line cap — second spec in a row to deepen it (kin of `KZ-changes--bilateral-review-viewport-and-table-polish-3`'s "gotcha in the same spec" rule pulling the other way). Compaction belongs on the default branch.
- A sonnet Implementer cut by the session limit resumed cleanly on the opus tier with an on-disk inventory; another session swept the half-done files into its own commit. Already captured in project memory (`project-shared-worktree-commit-sweeps`); no new rule.
- Budget overage (3 rounds per task vs 1–2) was driven by two user scope additions landing mid-task; the design.md budget did not model HITL-driven scope growth. Feeds `KZ-REH-1`'s "budgets under-count" row if it recurs.
- Latent `canReview` reactivity gap (late membership stays on `See`) predates this spec; recorded as a follow-up proposal, not a lesson.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | root `CLAUDE.md` → "Agent-lean verification" table |
| Edit | Add a row: `onecgiar-pr-client` typecheck + layout gates — `npx tsc --noEmit -p tsconfig.app.json` and `CT_DEV_SERVER_PORT=<free port> npx cypress run --component --spec "<module>/**/*.cy.ts"` are mandatory for every client task; Jest does not typecheck template/type-only imports and does not lay out. |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/ux-ui/design.md` §8 Components (tables) |
| Edit | Repeated card tables share one `<colgroup>` under `table-layout: fixed` with the primary column taking the remainder and staying the widest at the narrowest desktop width; overflow evidence measures the `overflow-x-auto` scroller and per-cell `scrollWidth <= clientWidth`, never an `overflow-hidden` ancestor. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `.agents/leader.md` → Primary Instructions §4 (append) |
| Edit | Before spawning the Reviewer, grep the diff for every gate the brief named (testids, test titles, commands); an ordered gate missing from the diff is a `Not Done` — re-spawn the Implementer, do not spend a Reviewer round on it. |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-OAH-1` |
| Severity | High (raised from Medium — third recurrence: aow-identity-column-starvation, bilateral-review-viewport-and-table-polish, this spec) |
| Edit | Add `changes/bilateral-review-hierarchy-ux` as a source; note that class-string Jest assertions passed on 52 px headers, chip containment and badge row height until CT measured them. |
| Status | pending |

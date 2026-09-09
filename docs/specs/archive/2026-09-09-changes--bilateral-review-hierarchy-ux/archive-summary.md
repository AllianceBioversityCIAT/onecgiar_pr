# Archive Summary — changes/bilateral-review-hierarchy-ux

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/bilateral-review-hierarchy-ux/` |
| Archive Path | `docs/specs/archive/2026-09-09-changes--bilateral-review-hierarchy-ux/` |
| Archive Date | 2026-09-09 |
| Branch | `qa-development-2026` (spec branch; default `master`) |
| Prefix | `BRH` |
| Final Status | **Complete — 3/3 tasks PASS**, archived without `/akili-test` and `/akili-validate` by user decision |

## Final Status

All three tasks reached `[x]` with Reviewer PASS evidence in `execution.md`. The user chose to archive directly after execution; the absence of `test-report.md` and `validation-report.md` is **explicitly accepted**. Test evidence was produced inside the tasks themselves (Jest + Cypress component tests, see below).

## Requirements Delivered

| Requirement | Delivered by | Evidence |
|---|---|---|
| `BRH-R-1` container cards | T-2 | CT: `border-radius` 12 px, shadow, `overflow: hidden`, no horizontal overflow at 1280/1000 |
| `BRH-R-2` 52 px header, monospace code badge | T-2 | CT: toggle `offsetHeight` 52, `font-family` JetBrains Mono, weight 700 |
| `BRH-R-3` contributing-center chips | T-2 | CT: chips inside card bounds, ≤ 3 + `+N` on narrow |
| `BRH-R-4` smart default collapse + manual memory | T-2 | Jest: zero-pending collapsed, pending expanded, manual expand survives re-render |
| `BRH-R-5` text selection + hover copy | T-3 | Jest: clipboard spy, 2000 ms revert, `stopPropagation`, rejected-write path |
| `BRH-R-6` in-card quick filter | T-2 | Jest: local filter leaves global signals untouched |
| `BRH-R-7` semantic result-type badges | T-3 | Mapped on the real `indicator_category` catalog incl. the `Innovation Developmen` migration typo |
| `BRH-R-8` status tokens + 3 px row accent | T-3 | CT: `borderLeftWidth` 3 px, colour equals pill colour |
| `BRH-R-9` Review primary / See ghost | T-3 | Jest |
| `BRH-R-10` two-row pinned band ≤ 110 px | T-1 | CT: 87 px at 1536 CSS px — **132 px at 1280/840, open decision** |
| `BRH-R-11` no horizontal scroll, 44 px targets | T-1 / T-3 | CT: 375/840/1024/1536 document never scrolls; every narrow button ≥ 44×44 |

Added by the user's live-page findings during execution: cross-card column alignment (`table-layout: fixed` + shared `<colgroup>`, Title widest down to 1000 px) and the token-styled Filter popover (pill grid + checkbox lists, no legacy `pr-filter-*` controls).

## Files Changed Summary

| Area | Files |
|---|---|
| Page component | `bilateral-review.component.{html,ts,spec.ts}`, `bilateral-review.copy.ts`, `bilateral-review.cy.ts` |
| Table component | `components/bilateral-review-table/bilateral-review-table.component.{html,ts,spec.ts}`, new `bilateral-review-table.cy.ts` |
| Module guide | `pages/bilateral-review/CLAUDE.md` (re-stamped 2026-09-09, now ~250 lines) |
| Spec | `proposal.md`, `requirements.md`, `design.md`, `tasks.md`, `execution.md` |

Commits on `qa-development-2026`: `3a50810f8` (T-1), `f103f7ae6` (T-2), `0300ef9c0` (T-3), `6df99fe87` (T-1 attempt-2 snapshot, swept by another session), `9b239a1a3` (T-1 attempt-2 close).

## Test Evidence Summary

| Gate | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | clean |
| Jest `pages/bilateral-review/` | 14 suites, 499 tests, all passing |
| `npx ng lint --quiet` | clean |
| Cypress CT `bilateral-review.cy.ts` | 48/48 (re-based from the three parent specs) |
| Cypress CT `bilateral-review-table.cy.ts` | 21/21 (new geometry gates) |
| Cypress CT `result-review-drawer.approve-tooltip.cy.ts` | 3/3 |

No `/akili-test` report. Live authenticated HITL was probe-confirmed blocked (no PRMS session in any reachable browser); the user supplied two live-page findings from their own session, both closed with CT gates.

## Validation Summary

No `/akili-validate` report (accepted). Reviewer rounds: T-1 1 + 2 (reopened), T-2 3, T-3 3 — against a `design.md` budget of 1–2 per task. Overage causes: two user scope additions landing mid-task, and CT gates that the Jest-only verification commands had never run.

## Accepted Warnings Or Follow-Ups

| # | Item | Owner |
|---|---|---|
| 1 | `BRH-R-10` pinned band measures 132 px between ~840 and ~1290 CSS px (cap 110); fixing it conflicts with design.md §4.4's literal 240 px search width | User decision |
| 2 | Phase switch still forces *Expand all*, overriding the `BRH-R-4` smart default for that render | User decision |
| 3 | Late-resolving membership leaves the action on `See` until the next interaction; real fix is a reactive `myInitiativesList` on `DataControlService` (shared file) | New proposal |
| 4 | `pages/bilateral-review/CLAUDE.md` exceeds the 120-line cap of `docs/COMPONENT-DOCS.md` | Default-branch compaction |
| 5 | `tasks.md` DoDs cite `BRH-AC-*` ids that `requirements.md` never defines | Recorded (kaizen, noted) |
| 6 | Archived `BRP-AC-8` row-height cap reads 64 px; live cap is 68 px (measured 66.5) | Recorded here |
| 7 | Popover CT width gate can pass vacuously on a hidden popover (`[class.hidden]`) — add `width > 0` next touch | Recorded |

## Historical Notes

- T-1 attempt 1 PASSed on Jest + lint; the dev build failed on a dropped type-only import (ts-jest erases them), found only when the Leader started the dev server. `tsc --noEmit` became a mandatory gate from T-2 on.
- The page-level CT was red (24/51) from T-1 until T-3 because no task's verification command listed it; T-1 was reopened and the gates re-based rather than deleted.
- Two worker interruptions by the account session limit (HTTP 429) on the sonnet tier; the remainder ran on the opus tier. Another session swept half-finished files into `6df99fe87`; the Leader re-verified HEAD and continued from it.
- `PrGroupTableComponent` / `app-pr-group-table` are no longer used by this module — CodeGraph re-index recommended.

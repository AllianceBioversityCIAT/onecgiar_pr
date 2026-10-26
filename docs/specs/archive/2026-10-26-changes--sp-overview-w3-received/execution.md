# Execution — SP Overview: W3/Bilateral "received" row + "awaiting review" card

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/sp-overview-w3-received` |
| Depth | Lite |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` |
| Leader | Claude Code session (Opus 5.5) |
| Implementer | `akili-implementer` wrapper |
| Reviewer | `akili-reviewer` wrapper |
| Started | 2026-10-26 |
| Budget | 3 tasks · ~70 prod + ~90 spec LOC · 1 review round |

## Task Execution History

### SWR-T-1 — Host counts + click handling — PASS (2026-10-26)

| Field | Value |
|---|---|
| Attempts | 1 |
| Effort | medium |
| Skills | `angular-developer`, `tdd` |
| Requirements | SWR-R-1 (S-1.1), SWR-R-2 (S-2.1), SWR-R-3 (S-3.1 destination) |

**Attempt 1**
- Files: `dashboard-lab.component.ts` (`BILATERAL_RECEIVED_STATUS_IDS`, `received` in `overviewTotalBreakdown`, `onTotalSegment('received')` → `overviewSection.set('bilateral')`), `dashboard-lab.component.spec.ts` (STG literals + 6 SWR tests), `components/program-overview/program-overview.component.ts` (types only: `received` in `OverviewTotalBreakdown`, `TotalSegmentKind`, input default).
- Verification: `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --findRelatedTests dashboard-lab.component.ts program-overview.component.ts` → `Test Suites: 37 passed, 37 total · Tests: 1513 passed, 1513 total` (worker-exit warning only). `npx eslint` unusable (no flat config, ESLint 9) → `npx ng lint --quiet --lint-file-patterns <3 files>` → "All files pass linting." No red-first evidence recorded.
- Reviewer: **PASS** — count uses unscoped `bilateralRows()` with {5,6,7}; `received` is a set (not toggle) and returns before navigation; `pendingReview` unchanged; every "Fails if" mutation caught; fixture math verified.

**ADVISORY (4R)**
- READABILITY: `BILATERAL_RECEIVED_STATUS_IDS` equals `BILATERAL_REVIEW_STATUS_IDS` ({5,6,7}); alias one to the other if they must never drift.

**Decisions**
- Leader authorized a types-only edit in `program-overview.component.ts` (design assigns the file to T-2) because the host cannot compile without `received` in the shared types.
- `received` branch placed before the `initiativeCode` guard: it needs no code and does not navigate.

**Issues**
- Free RAM ~0.93 GB at start (< 4 GB rule); run completed at `--maxWorkers=2`.
- Working tree holds unrelated `replicated-innovation-reminders` changes from another session — excluded from review and from this spec.
- Implementer left `CLAUDE.md` folder docs (`dashboard-lab/`, `program-overview/`) for T-2 / archive.

**Gate:** user asked (2026-10-26) to continue through to the end and verify on `localhost:4200/.../SP01/overview`; gate auto-passed on that instruction.

### SWR-T-2 — Total General row + Awaiting review card — PASS (2026-10-26)

| Field | Value |
|---|---|
| Attempts | 1 |
| Effort | medium |
| Skills | `angular-developer`, `tailwind-design-system`, `spartan` |
| Requirements | SWR-R-1 (S-1.1, S-1.2), SWR-R-2 (row/segment emit), SWR-R-3 (S-3.1–S-3.3; S-3.4 classes only) |

**Attempt 1**
- Files: `program-overview.component.ts` (headline = replicated + new + received; segment kind `received`, amber), `program-overview.component.html` (grid `xl:grid-cols-4`, Total General `sm:col-span-2 xl:col-span-2`, W3 row → `received` with new label/tooltip/testids, new `<button data-testid="overview-kpi-pending-review">` card), `program-overview.component.spec.ts` (STD blocks updated + 7 SWR tests; card-list test now expects total, pending-review, aow), `program-overview/CLAUDE.md`, `dashboard-lab/CLAUDE.md` (`overviewTotalBreakdown` bullet — documents T-1's change).
- Verification (free RAM 1.2 GB → `--maxWorkers=1`): `npx jest --maxWorkers=1 --silent --reporters=summary --no-coverage --findRelatedTests program-overview.component.ts program-overview.component.spec.ts` → first run 1 failure (old card-list test, fixed) → final `Test Suites: 37 passed, 37 total · Tests: 1520 passed, 1520 total`. `npx ng lint --quiet --lint-file-patterns <2 files>` → "All files pass linting." Cypress `row-layout.cy.ts` not run (grep: no impact; machine rule).
- Reviewer: **PASS** — headline/segment/row use `received`; card is a real button with spec aria-label, emits `pendingReview`, renders at 0; skeleton path confirmed (`programResultsLoading = meterLoading || bilateralLoading`); AoW shell + amber badge, no new tokens; focus ring uses the `shadow-[var(--pr-focus-ring)]` pattern; grid classes per §4.4.
- Diff handed to the Reviewer as a frozen file snapshot (`scratchpad/t2.diff`, 427 lines) instead of inline — Leader decision to avoid re-emitting a large diff; the Reviewer read it in full.

**ADVISORY (4R)**
- READABILITY: `dashboard-lab/CLAUDE.md` `onTotalSegment` bullet (~L155) does not mention `received` → `overviewSection.set('bilateral')`. → carry to archive guide sync.
- READABILITY: the literal phrase "W3/Bilateral results awaiting review" is only in the aria-label; on screen the card reads "Awaiting review" + "W3/Bilateral" badge + N "results" (design §4.3 composition). Confirm wording with the user at SWR-T-3.
- RELIABILITY: footer "Open Bilateral review →" uses a literal arrow vs the Lucide arrow on rows (no a11y impact; aria-label overrides).

**Gate:** auto-passed on the user's 2026-10-26 instruction to continue to the end.

### SWR-T-3 — Visual + parity check (HITL) — [~] awaiting user decision (2026-10-26)

Run by the Leader inline (read-only browser check; no code). Target moved by the user from PRTest SP11 to `http://localhost:4200/result-framework-reporting/entity-details/SP01/overview` (Reporting 2026, phase 36). Local stack hits shared prdb → only GETs and in-page clicks; no write buttons.

| Check | Result |
|---|---|
| Served bundle is new | ✅ row testid `overview-kpi-total-breakdown-received` present, old `-pending-review` row absent |
| Headline = replicated + new + received | ✅ 8 + 161 + 50 = **219** |
| Awaiting review card | ✅ **32**, aria-label "View 32 W3/Bilateral results awaiting review" |
| Card order | ✅ total → pending-review → aow |
| Row click | ✅ URL `?section=bilateral`, chip "Section: W3/Bilateral", W3/Bilateral cards render, no tab change |
| Second row click | ✅ stays `section=bilateral` (no toggle) |
| **Row = W3/Bilateral Reporting Status donut total** | ❌ row **50** vs donut **52** = Pending 32 + Approved 11 + Rejected 7 + **Discontinued 1 + Submitted 1** |
| Card click | ✅ Bilateral review opens on "Pending review (32)"; URL `?phase=36` (page consumes `status`). Bilateral review "All" tab = **50** = row |
| xl (2560 viewport) | ✅ one row: Total (2 cols) · Awaiting review · AoW |
| md (900 iframe) | ✅ Total full width (755px); card + AoW side by side (368px each, same y) |
| 375 (iframe) | ✅ stacked in order, KPI grid scrollWidth 280 = clientWidth 280. ⚠️ Page-level horizontal scroll (doc 497 > 358) comes from pre-existing cards "W3/Bilateral results by center and category" (sw 416) and "Theory of Change map" (sw 341) — not touched by this spec |

Screenshots: `C:\Users\santiagosanchez\AppData\Local\Temp\claude-chrome-screenshots-1YXuun\screenshot-1793039249188-2.jpg` (xl), `...-1793039387760-3.jpg` (section=bilateral, donut 52), `...-1793039589281-4.jpg` (375 iframe), `...-1793039695155-5.jpg` (Bilateral review Pending).

**Spec gap (not an implementation defect):** requirements §3 glossary and S-2.1 state the W3/Bilateral Reporting Status donut "already counts 5 + 6 + 7". Live data shows it also counts Discontinued (4) and Submitted (3). The implemented row follows the approved rule (5/6/7, Discontinued excluded — S-1.1 BUT) and matches Bilateral review "All" (50). Per T-3 "Fails if: row ≠ donut total", the parity check fails as written. Escalated to the user (Pivot-type decision); T-3 stays `[~]`.

## Pivot Record: SWR-T-3 (2026-10-26)

- **Blocker:** the spec assumed the W3/Bilateral Reporting Status donut counts 5 + 6 + 7. In fact it counts every non-Editing status, including Discontinued (4) and Submitted (3). SP01: donut 52 vs row 50.
- **Alternatives offered:** (A) accept 50 and validate parity against Bilateral review "All"; (B) narrow the donut to 5/6/7, which would be new scope; (C) count 3/4 in received, which contradicts the 2026-10-26 decision.
- **User decision:** **A** — no code change.
- **Spec amended:**
  - `requirements.md`: §3 glossary "W3/Bilateral section"; S-2.1 AND clause; §7 defect-class row.
  - `tasks.md`: SWR-T-3 step 1 and Fails if.
- **Sweep:**
  - forward: grep `5 + 6 + 7|donut|parity` across the spec folder; no superseded claim remains outside `execution.md` history.
  - backward: the coverage row "S-2.1 … T-3 (parity)" still holds, because parity now means equality with Bilateral review "All".
- **ADR:** none affected.

### SWR-T-3 — closed — PASS (2026-10-26)

- Every check passes under the amended parity rule: row 50 = Bilateral review "All" 50.
- Closed by the user's explicit choice of option A ("Aceptar 50 … Cierro T-3"), which stands as the HITL approval. No Reviewer spawn: this is a HITL task with no diff, and the user is the judge.
- Residual (out of scope, recorded only): at 375px the page scrolls horizontally because of the pre-existing "W3/Bilateral results by center and category" and "Theory of Change map" cards. The KPI row does not overflow.

## Summary

| Task | Result | Attempts |
|---|---|---|
| SWR-T-1 Host counts + click | PASS | 1 |
| SWR-T-2 Row + Awaiting review card | PASS | 1 |
| SWR-T-3 Visual + parity (local SP01) | PASS after pivot A | — |

**Budget:**
- Tasks: 3 of 3 expected.
- Review rounds: 1 per code task, as budgeted.
- LOC: roughly ~75 prod / ~170 spec. Spec LOC ran above the ~90 estimate because existing STD/STG literals had to be updated.
- No tripwire was raised.

**Open for `/akili-archive`:**
- ADVISORY T-1: alias `BILATERAL_RECEIVED_STATUS_IDS` to `BILATERAL_REVIEW_STATUS_IDS`.
- ADVISORY T-2: the `dashboard-lab/CLAUDE.md` `onTotalSegment` bullet does not mention `received`.
- ADVISORY T-2: the footer uses a literal arrow.
- Confirm the card wording ("Awaiting review" + badge) with Nicoleta.
- Overflow at 375px from pre-existing cards.
- PRTest SP11 check is still pending after deploy to `performance-refactor`.
- Nothing has been committed.

# Kaizen Entry — changes/sp-bilateral-review-tab

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/sp-bilateral-review-tab` · Prefix `BRT` |
| Date | 2026-09-08 (execution closed 2026-09-07) |
| Branch | `qa-development-2026` — **spec branch** (default pin `master`); every shared-file edit below is recorded pending, none applied |
| Archive Run | 1 |
| Approval Mode | `pre-approved` · Depth Standard |
| Outcome | Complete — 8/8 `[x]`; owner sign-off via the three follow-up specs commissioned on the live tab |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 8 | tasks.md |
| Reviewer FAIL rework attempts | **11** extra rounds (rounds 2/1/2/3/4/3/2/2; T-5 reached 4 incl. a reverted wrong-hypothesis fix) | execution.md Summary |
| HALTs / FATAL_FAILs | 0 (one Reviewer runtime re-spawn on T-7) | execution.md |
| Pivots | 0 (`BRT-DD-7` later superseded by `BRC-DD-1`) | execution.md, BRC |
| PRODUCT_BUGs | n/a — no `test-report.md` | — |
| Judgment-day severe findings | **9** (7 dual-judge) + 11 warnings | judgment.md |
| Validation FAIL / WARN | n/a | — |
| `/akili-quick` escalations | 0 | — |
| Drift attributable | none — `docs/specs/audits/` holds no report | — |
| Budget | added source **1,775 vs 1,500 tripwire (+18 %)**; tests 2,102 vs 1,900; rounds over the ≤ 1 limit on 6/8 tasks | execution.md Summary |
| Live-only defects | **3** (H2-1 off-screen column, H3-1 unstyled relocated drawer, H4-1 always-mounted overlay) + 1 latent (viewport lock never engaged, found 2026-09-08 by the owner) | execution.md HITL; BRV requirements §2 |

## Lessons

- **KZ-changes--sp-bilateral-review-tab-1 — A relocated component's stylesheet is proven compiled by a computed style, not by a green build: a wrong `@use` depth fails silently and ships the component unstyled.** (Product, High)
  - Root cause: the review drawer moved 2 folders shallower; its SCSS kept the legacy 9-level `@use '../../…/styles/fonts.scss'`; Sass failed to resolve it without an error the build surfaced, the overlay rendered `position: static` in normal flow, and Jest/Reviewer saw the element "exist". Found only by `getComputedStyle(overlayRoot).position` in the live look (H3-1).
  - Evidence: execution.md — `BRT-T-5` attempt 2 (H3-1), HITL #3/#3b; memory `project-relocation-scss-use-depth`.
  - Standardization: → P1 (`docs/specs/general-setup/task.md` — relocation tasks add a computed-style gate).

- **KZ-changes--sp-bilateral-review-tab-2 — A "parity with siblings" claim must name the sibling's mechanism and be proven by the same measurement; a comment is not a contract.** (Product + Methodology, High)
  - Root cause: the page template asserted "same viewport-lock contract as the siblings" while the host never received the `pr-viewport-page` class + SCSS mixin that engages the lock; two later specs and every Reviewer read the comment as fact until the owner's screenshot showed the hero scrolling away (fixed by `BRV`).
  - Evidence: `bilateral-review.component.html:18-19` (pre-`BRV`); `BRV` requirements §2 row 1; `BRV` execution T-1 HITL #1.
  - Standardization: → P2 (`docs/specs/general-setup/design.md` premises rule) · upstream to AKILI (`/akili-audit` parity check) — same root cause as `KZ-changes--bilateral-review-viewport-and-table-polish-1`, recorded here as its origin.

## Noted, not a lesson

- Real-page look after every UI task caught three PASSed defects — recurrence of `KZ-changes--my-work-board-2` (P3 `digest-update`); this spec is the one that made the rule project memory.
- A fixed overlay template rendering unconditionally depends on every host remembering `@if` — the durable fix (guard inside the drawer template) is a follow-up, not a lesson yet.
- Budget +18 % over the tripwire — recurrence of `KZ-REH-1` (P4 `digest-update`), though the smallest overrun of the week.
- Six of eight tasks exceeded the "≤ 1 Reviewer round" limit; the extra rounds were narrower each time — the scoped re-review protocol was born here and declared formally in `BRV`.
- `BRT-DD-7` (not phase-scoped, parity with legacy) was overturned the next day by the owner — a product decision, not a process defect.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` → Verification guidance (append) |
| Edit | Add: "A task that relocates a component with its own stylesheet adds a computed-style gate (e.g. `getComputedStyle(root).position` or a font/colour the sheet sets) in CT or the live look — a build that compiles is not proof the sheet resolved (`@use` depth fails silently)." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` → §2 premises rule (append) |
| Edit | Add: "A claim of parity with a sibling ('same X contract as …') names the sibling's mechanism (class, mixin, input) at file:line and the measurement that proves it engages; a template comment is not evidence." |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-changes--my-work-board-2` |
| Edit | Add `changes/sp-bilateral-review-tab` as a source (three PASSed defects found only live: H2-1, H3-1, H4-1); raise severity to High. |
| Severity | High |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-REH-1` |
| Edit | Add `changes/sp-bilateral-review-tab` as a source (+18 % over the tripwire on 1,500 added source). |
| Severity | High |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/CLAUDE.md` → `## Module Guides` |
| Edit | Same edit as `changes--bilateral-review-center-strip-and-phase.md` P5 (pointer to `pages/bilateral-review/CLAUDE.md`) — apply once, dedupe at apply time. |
| Severity | Low |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/CLAUDE.md` → routing / pages section |
| Edit | Where the guide lists the legacy `bilateral-results` page or the `results-review` route as live, replace with: "`entity-details/:entityId/bilateral-review` (fifth SP tab); `results-review` is a `redirectTo` that preserves query params; the legacy `pages/bilateral/pages/bilateral-results-list` page was deleted in `BRT-T-6`." (sweep the guide for the old names at apply time). |
| Severity | Low |
| Status | pending |

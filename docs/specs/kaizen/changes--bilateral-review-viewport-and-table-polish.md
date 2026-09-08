# Kaizen Entry — changes/bilateral-review-viewport-and-table-polish

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-review-viewport-and-table-polish` · Prefix `BRV` |
| Date | 2026-09-08 |
| Branch | `qa-development-2026` — **spec branch** (default pin `master`); every shared-file edit below is recorded pending, none applied |
| Archive Run | 1 |
| Approval Mode | `pre-approved` · Depth Standard (compact) |
| Outcome | Complete — 3/3 `[x]`; live looks after T-1 and T-2; owner visual sign-off pending at archive |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 | tasks.md |
| Reviewer FAIL rework attempts | **3** (one per task) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a | — |
| Judgment-day severe findings | **9 families** (4 dual-judge) + 16 warnings | judgment.md |
| Validation FAIL / WARN | n/a | — |
| `/akili-quick` escalations | 0 | — |
| Drift attributable | none | — |
| Budget | source **+272 vs ~650 (−58 %)**; tests +893 vs ~800 (+12 %); rounds 2/2/2 | execution.md Summary |
| Live-only defects | 1 (`scroll-margin-top` no-op — also the Reviewer's #1) | execution.md T-1 HITL #1 |
| Owner-reported shipped defect | **1** — the viewport lock had never engaged since `sp-bilateral-review-tab` | requirements.md §2 |

## Lessons

- **KZ-changes--bilateral-review-viewport-and-table-polish-1 — A scroll-model claim is proven by the page host's computed `position` and document scrollability, never by grepping for `overflow-y-auto`.** (Product + Methodology, High)
  - Root cause: `sp-bilateral-review-tab` wrote "same viewport-lock contract as the siblings" in a template comment and gave `#workArea` the right classes, but never added the `pr-viewport-page` host class + SCSS mixin that makes the lock engage; two later specs and every Reviewer accepted the comment; the `BRP` single-scroller gate could not see that the *first* scroller was the document. The owner's screenshot (hero scrolled away) exposed it.
  - Evidence: requirements.md §2 row 1; execution.md `BRV-T-1` HITL #1 (`hostPos: absolute`, `docScrollable: false` after the fix vs `static`/`true` before in the `BRP` log 02:20).
  - Standardization: → P1 (`onecgiar-pr-client/src/CLAUDE.md` result-framework-reporting rule) · upstream to AKILI (`/akili-audit` drift check: "claims of parity with a sibling are verified by the sibling's mechanism, not its comment").

- **KZ-changes--bilateral-review-viewport-and-table-polish-2 — PRMS `--pr-color-*-100` shades are saturated mid-tones, not tints; status colours come only from the fixed `--pr-status-*` fg/bg pairs (rule 9).** (Product, Medium)
  - Root cause: the design prescribed `yellow-100/900/300` pills from Tailwind habit; both judges caught it (`yellow-100 = #fdc82f`, `green-100 = #37de54`) before execution; the `BRP` group badge had already shipped with `yellow-100`. The design system doc does not warn about the ramp.
  - Evidence: judgment.md L-1 (JA-6, JB-1); `colors.scss:87-113, 236-245`.
  - Standardization: → P2 (`docs/ux-ui/design.md` §7 note).

- **KZ-changes--bilateral-review-viewport-and-table-polish-3 — A trap a Reviewer names becomes a module-guide gotcha in the same spec, not the next one.** (Methodology, Medium)
  - Root cause: `#workArea` (a template reference, not an id) was flagged by a `BRP` Reviewer in a CT comment, then reused as a CSS id in a `BRP` probe and again in `BRV`'s SCSS `scroll-margin-top` rule — three artifacts in one day — before `BRV-T-3` wrote the gotcha.
  - Evidence: `BRP` execution.md T-3 advisory; `BRV` execution.md T-1 Reviewer issue 1 + HITL #1.
  - Standardization: no local edit (methodology) — upstream to AKILI (`/akili-execute` Step 3: "an ADVISORY that names a reusable trap is written to the owning module guide in the task that closes the spec").

## Noted, not a lesson

- Budget −58 % on source: the ×2 re-baseline learned from `KZ-REH-1` over-corrected for a "small code, large proof" spec; the ratio to watch is proof LOC per requirement, not source. Feeds `KZ-REH-1`'s digest row (P3).
- Vacuous fixture: a 7-row CT fixture cannot exercise scroll gates (judges L-4) — kin of `KZ-changes--my-work-board-3` (a CT must be run against its FAIL input); recorded as P4 `digest-update`.
- The pinned cap (130) and the one-line row cap were estimates without arithmetic; both recalibrated from measurement (150; 50/44/64). Pattern: state the derivation or measure first.
- Sibling tabs pin only the band; this tab pins toolbar + filters — recorded in `DESIGN-DEVIATIONS.md` #16 with a follow-up to align or accept.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/src/CLAUDE.md` → result-framework-reporting section (append) |
| Edit | Add: "Every tab page under `result-framework-reporting/pages/` is a viewport-lock adopter: `host: { class: 'pr-viewport-page' }` + `:host { display: block; @include vp.pr-viewport-page }` in its own SCSS. Prove it in CT by computed `position: absolute` on the host and `documentElement.scrollHeight <= clientHeight` — a comment or an `overflow-y-auto` class on `#workArea` proves nothing." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/ux-ui/design.md` §7 (tokens, append near the yellow/green/red rows) |
| Edit | Add: "`--pr-color-{yellow,green,red}-100` are **saturated mid-tones** (`#fdc82f`, `#37de54`, `#fc7c7c`), not tints — never use them as fills. Status surfaces use only the fixed pairs `--pr-status-*-{fg,bg}` / `--pr-danger`+`--pr-danger-bg` (rule 9)." |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-REH-1` |
| Edit | Add `changes/bilateral-review-viewport-and-table-polish` as a counter-example (−58 % source after a ×2 re-baseline): the lesson should read "budget proof LOC per requirement; source estimates swing both ways once tests dominate". |
| Severity | High |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-changes--my-work-board-3` |
| Edit | Add this spec as a source: a 7-row fixture made the lock/pin gates and both RED probes vacuous until judges required a ≥ 80-row fixture with an asserted pre-condition; recurrence 2. |
| Severity | Medium |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `docs/ux-ui/design.md` §10 (responsive / shell viewport) |
| Edit | Add: "Viewport-lock adopters: `dashboard-lab`, `programme-results`, `my-work-board`, `bilateral-review` (since `BRV`, 2026-09-08). `bilateral-review` additionally pins toolbar + filter band inside the work area (`DESIGN-DEVIATIONS.md` #16)." |
| Severity | Low |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | trd-adr |
| Target | `docs/trd/trd.md` — Architecture Overview & Decisions (supersedes no numbered ADR; extends `SAV-DD-1` from `changes/sp-shell-app-viewport`) |
| Edit | Decision: "Bilateral review adopts the shell viewport lock and additionally pins its toolbar + filter band inside `#workArea` (`position: sticky`, `z-[15]`, ≤ 150 px), diverging from sibling tabs that pin only the program band. Issue: owner request 2026-09-08; the lock had been missing since `BRT`. Consequences: the work area is the only scroller ≥ 900 px; focus safety via `scroll-margin-top`; siblings to be aligned or the split accepted." No ADR number allocated on this branch. |
| Severity | Medium |
| Status | pending |

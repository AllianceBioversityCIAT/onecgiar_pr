# Judgment Day — `changes/bilateral-review-viewport-and-table-polish`

| Attribute | Value |
|---|---|
| **Target** | `requirements.md`, `design.md`, `tasks.md` (snapshot 2026-09-08 02:10) |
| **Mode** | judgment_day · pre-approved → one pass, fix-only, no re-judgment |
| **Judges** | judge A, judge B — `akili-reviewer` wrappers (opus, ≠ author), blind, read-only, identical prompts |
| **Raw totals** | A: SEVERE 7 · WARNING 7 · INFO 8 — B: SEVERE 3 · WARNING 12 · INFO 5 |
| **Merged** | 9 severe families (4 confirmed by both) · 16 warnings applied · 8 info (6 applied, 2 recorded) · 0 contradictions |
| **Correction** | 1 fix pass by the Leader (02:30–02:50) |
| **Terminal** | **JUDGMENT: APPROVED ✅** |

## Severe (fixed)

| L | Judges | Finding | Verified at | Fix |
|---|---|---|---|---|
| L-1 | JA-6, JB-1 | Token shades wrong: PRMS `-100` are saturated mid-tones; audited fixed pairs `--pr-status-*` exist and rule 9 forbids inventing status colours | `colors.scss:87-113, 236-245`; client `CLAUDE.md` rule 9 | R-5 → `--pr-status-in-progress/approved/not-started-{fg,bg}`, rejected `--pr-danger`/`--pr-danger-bg`; group badge migrated; `BRV-DD-4` rewritten |
| L-2 | JA-1 | Lock RED probe "remove host class" is a no-op (mixin on bare `:host`) | `programme-results.component.scss:8-16` | RED probe = inject `app-bilateral-review { position: static !important; overflow: visible !important }`; host class labeled discoverability-only (JA-21) |
| L-3 | JA-2 | Pin AC asserted toolbar and band both at `workArea.top` | AC-2 | `pinned.top === workArea.top`, `filterBand.bottom === pinned.bottom`; hero clause = documentation (JB-17) |
| L-4 | JA-3, JB-2 | 7-row CT fixture cannot scroll at 1536 × 900 → lock/pin gates and both RED probes vacuous | `cy.ts:214-277` | `FIXTURE_ROWS_TALL` ≥ 80 rows; pre-condition `scrollHeight > clientHeight + 600` and `scrollTop === 600` asserted first |
| L-5 | JA-4 | R-9 (b) "unaffected" false: the 1024 DETECTOR case's overflow gets absorbed by the locked host | `cy.ts:775-810` | R-9 (b) names it; injection extended to the host (T-1) |
| L-6 | JA-5 | `max-w`/`truncate` on a `td` inert under `table-layout: auto` — the opposite of R-3's goal | `table.html:54-56` (H2-1 note) | Truncation on inner block spans; `th`+`td` carry `min-w` only; disqualifier added |
| L-7 | JA-7, JB-3 | Folder-wide raw-palette ban unpassable (drawer out of scope, match-count badge) | drawer scss; `.html:55` | Gate scoped to `bilateral-review-table.component.{ts,html}`; follow-ups recorded |
| L-8 | JA-9, JB-5 | Four `colspan="8"` sites, spec named one | `table.html:262, 309, 327` + cards bar | `columnCount()` at all four; test asserts all |
| L-9 | JB-11 | Action tone keyed on `isPending` while the label keys on `canReviewRow` → non-members get an emphasised "See" | `table.ts:304-314` | Tone on `canReviewRow`; AC-10 gains the non-member case |

## Warnings (applied)

JA-8 footer makes `documentElement` scroll live → CT-only assertion, live uses `scrollY === 0` · JA-10 popover/multiselect clipped by the new scroller → AC-3b · JA-11 focus hidden under pinned chrome → `scroll-margin-top` var + HITL · JA-12/JB-12 budget → 650/800, tripwire 1000, scoped re-review protocol declared · JA-13/JB-4 hide center column only when grouped → AC-7b · JA-14 header-order spec load-bearing → insert `alignment` in position, two cases · JB-6 z-index collision with the band → `z-[15]` · JB-7 one-line row cap breaks → per-line Alignment rendering + R-11 re-based caps (≤ 50 with caption) · JB-8 mixed Alignment cases → AC-4b · JB-9 testids for alignment/center cells · JB-10 fixed label width overflows → `min-w-[84px] shrink-0`, `scrollWidth` gate, counts 6/12 · JB-13 pinned chrome unbounded → ≤ 130 px cap + AC-13 row count · JA-19/JB-14 sibling divergence → `DESIGN-DEVIATIONS.md` entry (T-3) + follow-up · JB-15 `!border-l-[3px]` + width assertion · JA-15 widths on `th`+`td` · JA-22 violet hover fill → text-only emphasis (`BRV-DD-5`).

## Info

JA-16/JB-16 no positioned ancestor needed in CT (premise corrected; `mountPage()` unchanged) · JA-17/JB-18 "below 900 nothing changes" → `display:block` wording · JA-18 header ≤ 40 unmeasured → measured live at 61 (wrapping) → R-6 single-line label + measured cap · JA-20 T-1 Done-when gains the screenshot fallback · JA-21 host-class Jest = discoverability · JB-19 R-10 reuses the gate's exclusion list · JB-20 scroll the work area explicitly · JB-17 hero clause documentation.

## Kaizen signal

Judges caught a **token-semantics** trap (`-100` ≠ tint in this design system) and a **vacuous-fixture** trap (a 7-row fixture cannot exercise scroll gates). Candidates: the premises table cites the resolved hex of every token it names, and every scroll/overflow gate states the fixture size that makes it fallible.

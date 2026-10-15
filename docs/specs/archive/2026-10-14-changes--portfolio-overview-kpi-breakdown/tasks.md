# Tasks — Portfolio Overview KPI Cards: New vs Replicated Breakdown

## 0. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-kpi-breakdown/` |
| Requirements / Design | `requirements.md` (POVKB-R-1..6) · `design.md` (DD-1..7, budget §10) |
| Depth | Standard |
| Approval Mode | gated |
| Budget | 3 tasks · ~220 LOC · 1 review round. Tripwire: > 5 tasks or > 350 LOC → stop and escalate |

## 1. Scope

Client only: `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/`. No server, no SQL, no migration.

## 2. Pre-flight

- [ ] Branch `qa-development-2026-ss`, clean tree for the folder (an untracked `onecgiar-pr-server/src/a.py` is unrelated: do not touch it).
- [ ] Test runs use `--maxWorkers=2`, scoped `--testPathPattern=portfolio-overview`, one run at a time on the machine. Never the full suite.
- [ ] No `git commit` without the user's go-ahead.

## 3. Task list

### [x] POVKB-T-1 — Add new/replicated × submitted/editing tallies to `kpiTotals()`

- **Type:** client
- **Description:** Add optional `is_replicated` to `RawResult`; add the 8 fields of design §3 to `PortfolioKpis`; compute them in `kpiTotals()` in one pass over `rows()`, using a local `isReplicated` predicate (`1 | '1' | true`, DD-2) and Editing = `Number(status_id) === 1` (DD-3). Existing fields stay as they are (DD-4). Write the unit tests first (`tdd`).
- **Implements:** POVKB-R-1 (both scenarios, incl. "MUST sum to total" and "BUT must NOT filter by status"), R-2 / R-3 (the count math and the "MUST hold Submitted + Editing + Replicated = count" clauses, and R-2's "BUT must NOT split replicated by status"), R-6 (the "same rows" clause, the closed-phase fallback scenario, and the zero-buckets scenario at the data level).
- **Files (expected):** `services/portfolio-overview.service.ts`, `services/portfolio-overview.service.spec.ts`
- **Depends on:** —
- **Blocks:** POVKB-T-2
- **Estimate:** S
- **Review:** checklist
- **Tests (service spec):**
  1. An encoding matrix: rows with `is_replicated` = `1`, `'1'`, `true`, `0`, `'0'`, `null`, absent. Expect exactly 3 replicated and 4 new.
  2. Fixtures for R-2 (W1/W2 7 → New 4 = Submitted 2 + Editing 2, Replicated 3, with one replicated row Quality Assessed) and R-3 (W3 4 → New 2 = 1 + 1, Replicated 2).
  3. Reconciliation assertions on mixed data, covering all three invariants plus the 4-part total.
  4. No W3 rows at all: every bilateral field is `0` (not `NaN` or `undefined`).
  5. Closed-phase fallback: rows from two versions, none open. Only the newest version's rows are tallied.
  6. Existing `kpiTotals` assertions stay unchanged and green.
- **Verification:**
  - **Falsifier:** a row with `is_replicated: '1'` counted as New, or a replicated Editing row counted in `w1w2NewEditing`, makes tests 1 and 2 fail. If any row lands in two buckets or in none, test 3 fails.
  - **Red run:** `npx jest --maxWorkers=2 --testPathPattern=portfolio-overview.service --silent --reporters=summary --no-coverage`. The new tests must fail before the implementation (the fields are `undefined`) and pass after.
  - **Disqualifier:** if the real payload turns out not to carry `is_replicated` (premise P-1 refuted in the browser network tab), stop. That is a server change and the spec must be re-specified. Do not fake the flag client-side.
  - **Consumers:** `PortfolioKpis` / `kpiTotals` have no consumer outside `portfolio-overview/` (P-6). The change is additive.
- **Definition of done:**
  - [ ] Tests 1–6 green. Lint is clean on the 2 files (`npx eslint <files> --quiet`).
  - [ ] No existing field changed or removed.

### [x] POVKB-T-2 — Render the 3-card deck with breakdowns; remove card 4

- **Type:** client
- **Description:** In `portfolio-overview.component.html`:
  - Change the KPI grid and the skeleton grid to `lg:grid-cols-3`, and the skeleton loop to 3 items.
  - Replace card 1's "N W1/W2 · N W3/Bilateral" line with the 4 breakdown rows.
  - Replace the subtitles of cards 2 and 3 with: a "New" row, a "Submitted N · Editing N" sub-line, an `hlm-separator`, and the replicated row. Labels: "Replicated from previous years" on card 2, "Innovations replicated from 2025" on card 3.
  - Delete card 4.

  In `.component.ts`, delete `scrollToMatrixSection()` and import the Spartan separator. Keep the chips, footers and `(click)` handlers unchanged. Use only existing tokens (design §6). Copy stays inline, matching the existing cards.
- **Implements:** POVKB-R-1 / R-2 / R-3 (the rendering of each figure and label), R-4 (both the deck and the skeleton, incl. "BUT 'Science programs' and '% portfolio progress' must NOT appear"), R-5 (chips and navigation unchanged), R-6 (the "zero-buckets" scenario at render level: shows `0`, not blank).
- **Files (expected):** `portfolio-overview.component.html`, `portfolio-overview.component.ts`, `portfolio-overview.component.spec.ts`
- **Depends on:** POVKB-T-1
- **Blocks:** POVKB-T-3
- **Estimate:** S
- **Review:** checklist
- **Tests (component spec):**
  - Rewrite "renders 4 KPI cards…" (`spec.ts:148-163`) as "renders 3 KPI cards…". Assert the three titles; assert that "Science programs" and "% portfolio progress" are absent; assert the breakdown labels and the figures from the `OPEN_PHASE` fixture (with `is_replicated` added to some rows).
  - Skeleton: in the loading state, `[data-testid="portfolio-overview-skeleton"]` holds 3 card placeholders.
  - Zero W3 fixture: card 3 renders "0" for New, Submitted, Editing and Replicated.
  - The existing tests for `navigateToResultsCenter` and the chip percentages stay green, without being edited.
- **Verification:**
  - **Falsifier:** if card 4 is still in the DOM, or the skeleton renders 4 placeholders, the absence assertions fail. If a breakdown is bound to the wrong field (e.g. `w1w2Replicated` shown as New), the figure assertions on asymmetric fixture values fail. The fixture must use distinct numbers per bucket so a swap is detectable.
  - **Red run:** `npx jest --maxWorkers=2 --testPathPattern=portfolio-overview.component --silent --reporters=summary --no-coverage`. The rewritten tests fail before the template change and pass after.
  - **Disqualifier:** if 3 cards plus the breakdown cannot fit at 1280 px without the hero card overflowing or clipping text (visual check), stop and return to design. Do not shrink type below 11 px to force a fit.
  - **What the spec cannot prove:** layout, wrapping and contrast on the gradient. jsdom cannot measure them. That gap is covered by the visual check in T-3.
  - **Consumers:** `scrollToMatrixSection` has one caller, the deleted card (P-5). No other shared symbol changes.
- **Definition of done:**
  - [ ] Component and service specs green (one scoped run with `--testPathPattern=portfolio-overview`).
  - [ ] Lint is clean on the touched files.
  - [ ] No new colour token, and no `aria-label` that contradicts the visible text.

### [x] POVKB-T-3 — Visual check and folder docs

- **Type:** docs (with a manual verification)
- **Description:**
  - Update `portfolio-overview/CLAUDE.md`: Contract (8 new KPI fields, the replicated/Editing rules), a new section on the KPI deck (3 cards, card 4 removed, dated 2026-10-14), and a gotcha that "Replicated" is `is_replicated` and not "innovation", noting the card-3 label assumption P-3.
  - Then run the visual check: open `/portfolio-overview` on the local client at 375 / 768 / 1280 / 1440 px. Read-only: no clicks on write buttons. Confirm the served bundle is the new one first.
- **Implements:** POVKB-R-4 (the `sm`/`lg` layout scenario, which only a browser can prove); requirements §8 rows for layout and contrast.
- **Files (expected):** `portfolio-overview/CLAUDE.md`
- **Depends on:** POVKB-T-2
- **Blocks:** —
- **Estimate:** S
- **Review:** skip-eligible
- **Verification:**
  - **Falsifier:** any of these at any of the 4 widths: a card whose text overflows or is clipped, the footer arrow overlapping a breakdown row, or a label that is unreadable on the purple gradient.
  - **Red run:** n/a (no test gate). This is a manual check, presented at the HITL pause with screenshots.
  - **Disqualifier:** if the local stack cannot load figures (empty or error state), the check is **inconclusive**. Report it as such; do not mark it passed.
  - **Consumers:** none (no shared symbol changed).
- **Definition of done:**
  - [ ] `CLAUDE.md` updated in the same change as the code.
  - [ ] Screenshots or notes for the 4 widths given to the user.

## 4. Dependency graph

```
POVKB-T-1 (service) → POVKB-T-2 (template) → POVKB-T-3 (docs + visual)
```

The graph is linear and has no cycles.

## 5. Coverage closure (scenario / clause → task)

| Requirement clause | Owner |
|---|---|
| R-1 "four parts sum to total", "MUST sum for any input" | T-1 (test 3) + T-2 (render) |
| R-1 "BUT must NOT filter by status" | T-1 (tests 2 and 3, mixed statuses) |
| R-1 "flag in any encoding" | T-1 (test 1) |
| R-2 scenario, "MUST hold sum", "BUT must NOT split replicated by status" | T-1 (test 2) + T-2 (labels) |
| R-3 scenario, "MUST hold sum" | T-1 (test 2) + T-2 (labels) |
| R-4 3 cards + 3 skeletons; "BUT Science programs / % portfolio progress must NOT appear" | T-2 |
| R-4 responsive `lg` / `sm` / mobile layout | T-3 (visual; jsdom cannot prove it) |
| R-5 chips + navigation unchanged | T-2 (the existing tests kept green) |
| R-6 same rows / no extra request | T-1 (computed off `rows()`; no new HTTP call in the diff) |
| R-6 closed-phase fallback | T-1 (test 5) |
| R-6 zero buckets, no `NaN` | T-1 (test 4) + T-2 (zero-W3 render test) |

## 6. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| POVKB-TEST-1 | unit (client service) | R-1, R-2, R-3, R-6 | `services/portfolio-overview.service.spec.ts` |
| POVKB-TEST-2 | unit (client component) | R-1..R-6 render | `portfolio-overview.component.spec.ts` |
| POVKB-TEST-3 | manual visual | R-4 layout, contrast | local `/portfolio-overview`, 4 widths |

## 7. Rollout & roll-back

The change ships with the normal client deploy, with no flag and no data change. To roll back, revert the commit; nothing persists.

## 8. Follow-ups

- Prune the unrendered `PortfolioKpis` fields (design DD-4).
- Re-check card 3's label if replicated W3 ever includes non-innovations.

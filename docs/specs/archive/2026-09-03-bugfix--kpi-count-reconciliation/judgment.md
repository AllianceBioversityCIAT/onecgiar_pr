# Judgment-day ledger — `bugfix/kpi-count-reconciliation`

| Field | Value |
|---|---|
| Target | `proposal.md`, `requirements.md`, `design.md`, `tasks.md`, `evidence/sp01-reconcile.json` (frozen 2026-09-03 after Phase 3) |
| Mode | judgment_day · round 1 · two blind read-only judges (`akili-reviewer`, model ≠ author) |
| Result | **JUDGMENT: APPROVED ✅** — 6 severe confirmed by both, all corrected in one fix round; no scoped re-judgment (standing feedback: one pass, apply fixes) |
| Counts | confirmed severe 6 · suspect severe 0 · contradictions 0 · info (warnings + suggestions) 12 |

## Confirmed severe (both judges) → fixed

| Ledger | Judge IDs | Finding | Fix applied |
|---|---|---|---|
| L-1 | JA-1 / JB-1 | Over-count formula `(AoWs − 1) × IOs` contradicts `+35` | `AoWs × IOs` (5 × 7 = 35); proposal §9 Impact |
| L-2 | JA-6 (W) / JB-2 (S) | "table rows sum to 382" mixes scope with 449/352 | like-for-like figures everywhere: hero 352 (+7+5 = 364), table 382 across AoW cards (388 with buckets); proposal §1/§9, requirements §Answer |
| L-3 | JA-2 / JB-3 | AC-5 header `3 KPIs · x of 3` contradicts R-10 / design `count = own.length` | `4 KPIs · 0 of 3`; requirements AC-5 and scenario |
| L-4 | JA-3 / JB-4 | T-5 expects rail `2 of 363`; rail sums AoW rows only | rail = Σ rows (`357`); identity `band = rail + chips` added to KCR-R-3; AC-7 and T-5 updated |
| L-5 | JA-4 / JB-5 (+JB-10) | T-2's "green except titles" unreachable without T-3's `ratioBase` | `ratioBase` moved into T-2 (files + implements); T-3 now titles + DOM tests only |
| L-6 | JA-5 / JB-6 | KCR-R-2.1 `title` orphaned for hub rows / ToC-map nodes | hub rows gain `title` (T-3, design §6.3); ToC-map nodes + card 4 exempted as accepted gap (KCR-R-2.2, defect-class table) |

## Info (warnings / suggestions) — author-applied where cheap

| Judge IDs | Finding | Disposition |
|---|---|---|
| JA-7 | R-10 identity holds only unfiltered | R-10 qualified (Type = all, Category = all) |
| JA-8 / JB-8 | partition lacks bucket `loading` flags | buckets are `{ indicators, loading }` (design §6.1/6.2) |
| JA-9 / JB-12 | thin rows also move KPI card 4 (`aowStats`), OAH DD-4 unsuperseded, burndown docblock stale | card 4 added to R-2/R-3/R-5; DD-4 in supersession list; docblock + comment rewrite in T-2 |
| JA-10 | ToC map double-counts IOs (Program-level branch + IO branch) | KCR-R-5.1 + KCR-DD-7 with reversion challenge; T-2/T-4 |
| JA-11 / JB-16 / JA-14 | both `AowProgressRow` types need `zeroTarget`; `aows[code]` indexes an array | both types named; `aowByCode` map |
| JA-12 | T-3 counter-fixture ambiguous | targets raised to 1 → `11 planned`; singular case added |
| JA-13 / JB-14 | `'3.3%'` vs `'1500%'` | `'1500%'` (observed live) in proposal |
| JB-7 | `KPI(s)` literal vs exact-text assertions | pluralised like `countLabel`; exact strings in R-2.1 |
| JB-9 | hero B `1/3` depends on the reported KPI's tier | fixture pins B's reported KPI as an output |
| JB-11 | proposal claimed `ratioOf` is unfiltered | corrected: only Only-pending is pinned |
| JB-13 | T-4 `added ≥ removed expect(` gameable; revert check not runnable | Reviewer derives each literal by hand; unrunnable check removed |
| JB-15 | leaf `indicators` vs `total` | documented as planned vs counted (design §6.3) |

## Skill resolution
`judgment-day` (contract only — reference files not packaged); judges given identical scope and criteria; no `review-refuter`.

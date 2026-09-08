# Judgment Day — `changes/bilateral-review-ux-polish`

| Attribute | Value |
|---|---|
| **Target** | `requirements.md`, `design.md`, `tasks.md` (snapshot after drafting, 2026-09-07 21:05) |
| **Mode** | judgment_day · pre-approved → one pass, fix-only, no re-judgment |
| **Judges** | judge A, judge B — `akili-reviewer` wrappers (opus, ≠ author), blind, read-only, identical prompts |
| **Raw totals** | A: SEVERE 8 · WARNING 7 · INFO 3 — B: SEVERE 6 · WARNING 10 · INFO 4 |
| **Merged** | 8 severe families (5 confirmed by both) · 12 warnings applied · 6 info (4 applied, 2 recorded) · 0 contradictions |
| **Correction** | 1 fix pass by the Leader over the three documents (21:20–21:35) |
| **Terminal** | **JUDGMENT: APPROVED ✅** (all severe and warning findings applied; info recorded) |

## Severe (fixed)

| L | Judges | Finding | Verified at | Fix |
|---|---|---|---|---|
| L-1 | JA-3, JB-1 | False premise: "Clear filters only inside the popover" — a toolbar-level clear already exists | `bilateral-review.component.html:216-224` | R-5 **replaces** that button; AC-5 asserts exactly one control; T-1 disqualifier "two clear controls" |
| L-2 | JA-4, JB-2 | Filter-count arithmetic contradictory (8 vs 7 dimensions; only-pending double-counted; phase clearing refetches) | page `.ts:304` | **Five** filter dimensions (search, status, centers, projects, categories); phase/group/view excluded; no request on clear; tests 5 + 3 negative |
| L-3 | JA-9, JB-3 | Storage key/value contradiction (`pr.bilateralReview…`/`'true'` vs `pr.bilateral…`/`'1'`) | `dashboard-lab.component.ts:3649-3683` | One key `pr.bilateral.centersExpanded`, `'1'|'0'` everywhere |
| L-4 | JA-5, JB-4 | `setGroup` nonce bump clears `userCollapsedKeys` — destroys the memory R-11 requires | `bilateral-review-table.component.ts:106-117` | No nonce bump; table `groupMode` input; component-owned `expandedKeys` (also fixes JA-10: cards branch had no expansion source) |
| L-5 | JA-6, JA-7, JB-5 | Parent CT assertions break (KPI grid, table scroll at 840, focus order, strip wrap) while `bilateral-review.cy.ts` was only in T-4's Files | `bilateral-review.cy.ts:336, 368, 434, 494` | R-14 names (a)–(f) and assigns each to the breaking task; `bilateral-review.cy.ts` added to T-1 and T-3 Files (scoped) |
| L-6 | JB-6 | Collapsed row renders no chip when the popover holds several centers | strip `.ts:62-69` | "K centers ✕" summary chip; AC-3b; strip test for the three states |
| L-7 | JA-1, JB-8 | Row height ≤ 56 px unreachable with the mandated content | table `.html:22-30` | Arithmetic restated: ≤ 64 px two-line + caption (`leading-[17px]`/`[14px]`, `py-[6px]`), ≤ 44 px one-line |
| L-8 | JA-2, JB-9 | Chrome gates "first row < 560 px from `#workArea`" cannot fail (band excluded, stub band in CT) | `bilateral-review.component.html:20`; `cy.ts:56` | CT gates restated as `firstRow.top − workArea.top ≤ 210` / `firstCard ≤ 270` + band + stat bar ≤ 140 with a RED probe; HITL keeps the viewport-top number (< 420) |
| L-9 | JA-8, JB-11 | Icon rule contradicted the baseline (`design.md:230`) and itself | `docs/ux-ui/design.md:230` | Per-region rule adopted in both docs, recorded as a deviation (T-4 → `DESIGN-DEVIATIONS.md`) |

## Warnings (applied)

| ID | Finding | Action |
|---|---|---|
| JA-13 / JB-7 | Budget not credible vs the parent's +117 % overrun | Re-baselined: ~850 source / ~900 tests, tripwire 1200 |
| JA-14 / JB-13 | Dead sticky clauses in R-15/§8; R-15/R-10/R-20 without gates | Sticky clauses struck; §10 gates "second scroll container" (CT) and "motion / reduced motion" (Jest) added |
| JA-11 / JB-17 | `collapsed` vs the existing `maxVisible`/"+N more" undefined | Collapsed suppresses the tail; expanded keeps the 12-cap (R-3, AC-2/3) |
| JA-12 / JB-15 | KPI `data-testid` inventory incomplete (six, not four) | All six kept |
| JA-15 | Warning badge in raw Tailwind in new markup | Token-based `--pr-color-yellow-*`; disqualifier added |
| JA-16 | Blank-bucket ordering ambiguous | "Always last"; fixture gives it 2 pending |
| JA-17 / JB-20 | Clearing `?phase=` refetches | Phase excluded from Clear filters |
| JA-18 | Contrast gate only over badges | HITL matrix over every new ≤ 12 px text; captions use `--pr-text-secondary` |
| JB-10 | 840 CT gate walks into the scrollbar trap | `cy.viewport(w, 1600)` pinned in T-4 and AC-11/12 |
| JB-12 | Stale "Programme results pins its header" | Corrected in §2 |
| JB-14 | `aria-label` on a bare span not exposed | `aria-hidden` dash + `sr-only` text (R-9, AC-9) |
| JB-16 | Stat bar measured node undefined (wrapper padding) | Host `data-testid="bilateral-review-statbar"`, wrapper padding removed |

## Info (recorded)

JB-18 pending figure duplication — kept (the stat is the Pending toggle, `BRT-R-6`), §2 row reworded · JB-19 `dataKey`/`groupRowsBy`/`onToggleGroup` edits named in T-2 (applied) · JA-10 folded into L-4 · JA-16/JB-20 applied above · JA/JB budget INFO rows folded into JA-13.

## Kaizen signal

Third spec in a row where the judge caught a **false "only here" premise** (a control that already existed elsewhere) and a **self-contradictory count** across the three documents. Candidate for the Phase-1 premises table: an "already exists at" column for every new control, and a rule that any number stated in requirements must be grepped in design and tasks before judgment.

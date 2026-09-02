# Execution Log — Overview ToC-Scope Filter

## 1. Document Control

| Attribute | Value |
|---|---|
| **Spec path** | `docs/specs/changes/overview-aow-cross-filter/` |
| **Tasks ref** | [`tasks.md`](./tasks.md) · **Design** [`design.md`](./design.md) · **Requirements** [`requirements.md`](./requirements.md) |
| **Status** | In progress — layout bugs closed (`OSF-T-2`, `OSF-T-2c`); server buckets landed (`OSF-T-3`); client feature next |
| **Started** | 2026-09-01 |
| **Approval Mode** | `gated` → **`pre-approved`** (owner, 2026-09-01 — "adelante"): no routine pauses, ≤1 Reviewer round per task, scoped jest only |
| **Environment** | Client `:4200` (pre-existing, this worktree) · API `:3400` · Orca embedded browser, authenticated session · Node v22.12.0 |

---

## 2. Task Execution History

### `OSF-T-1` — Reproduce and measure, before anything is built

- **Status:** `[~]` — measurement complete and decisive; task held open because its findings triggered a Pivot before a Reviewer pass.
- **Date:** 2026-09-01 · **Implementer attempts:** 0 (Leader-inline: read-only measurement in the Orca browser, no file writes, no production code — within the `.agents/leader.md` inline threshold)
- **Method:** `orca eval` against the live authenticated Overview (`SP01`). Every DOM mutation was a controlled experiment restored in the same expression; `restored: true` asserted on each.

#### Environment pre-check

| Check | Result |
|---|---|
| Client `:4200` | Running, **owned by this worktree** (`lsof -a -p <pid> -d cwd`) — not started, not restarted, not killed |
| API target | `http://localhost:3400/` → HTTP 200 |
| Auth | `token` **and** `user` both present (the two-key trap, `onecgiar-pr-client/CLAUDE.md` §9) — session real, 10 AoW rows rendered |
| Node | **v22.12.0**, but `docs/infrastructure.md` §6 pre-check states 20.x. Stack runs fine — the contract line is stale (kaizen item, not a blocker) |

#### Measurements at 1138px viewport

| Signal | Value |
|---|---|
| `clientWidth` | 1138 |
| `scrollWidth` | **2608** |
| **Horizontal overflow** | **1470px** |
| `scrollHeight` | 5142 · `innerHeight` 1137 |
| **Dead space below the last card** | **914px** |
| Last card | *Theory of Change map*, bottom at 4228 |

#### Root cause — one defect produces both bugs

The widest element on the page is a **`<table class="sr-only">` at 2297 × 936px**, rendered by `app-pr-viz-chart` as its accessibility table (`pr-viz-chart.component.html`). There are **seven** on this page.

`.sr-only` is defined correctly in the stylesheet (`position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%)`) — and it **cannot constrain a `<table>`**. Under `table-layout: auto` a specified width is a *minimum*, not a cap (CSS 2.1 §17.5.2), so the table lays out at its full content size. `clip-path` hides it visually, which is why nobody ever saw it — but an absolutely-positioned descendant still expands its ancestor's scrollable overflow when no ancestor clips. **An invisible element is producing a visible scrollbar.**

#### Controlled experiments

| Experiment | Overflow-X | `scrollHeight` |
|---|---|---|
| Baseline | 1470px | 5142 |
| 7 `sr-only` tables `display:none` | **3px** | **4260** |
| Candidate fix (`max-width/max-height:1px; overflow:hidden`) | **3px** | **4260** |
| Restored | 1470px ✅ | 5142 ✅ |

**99.8% of the horizontal overflow and 882 of the 914px of dead space come from these tables.**

#### Secondary findings

- **`min-h-screen` is NOT a cause.** Shell computed `min-height: 1137.6px`, actual height 4134px — the floor is never reached. `OSF-DD-11` step 2 is **not needed**; `OSF-OQ-4` is answered by measurement.
- **The ToC map renders no `<canvas>`.** Its `app-pr-viz-chart` box reserves 460px with nothing drawn in it. A real but *second-order* contributor (460px reserved vs 936px of table).
- The AoW row grid was **not** among the overflow contributors at this width.

#### Reconciliation measurement (owner-approved, 2026-09-01 — read-only queries, dev DB)

Safety first: connection keys verified present, target confirmed **not** production, credentials never printed (`.cursorrules`). `SP01` = *Breeding for Tomorrow*, initiative id 50. Counts are **all phases** unless stated.

**The `r.source` predicate (FIND-01) — quantified**

| Population | W1/W2 results |
|---|---|
| `source IN ('Result')` | **365** |
| no source filter | **556** |

Without the predicate the buckets would be computed over a population **52% larger** than the total they are subtracted from. FIND-01 was not theoretical.

**Bucket partition as `OSF-DD-2` currently specifies it**

| Bucket | Count |
|---|---|
| AOW01 | 87 · AOW02 24 · AOW03 16 · AOW05 12 · AOW04 6 |
| `EOI_2030` | 3 |
| `INTERMEDIATE` | 2 |
| **Sum of buckets** | **150** |
| Program total | **365** |
| **Residual → `UNTAGGED`** | **215 (59%)** |

**What the residual actually is — and why it breaks the design as written**

Splitting the 365 by how far each result gets down the ToC chain:

| Stage | Count | Has an AoW? |
|---|---|---|
| `A` no ToC link at all | **82** | ❌ genuinely untagged |
| `B` ToC link, no active indicator row | **132** | ✅ **yes** |
| `C` indicator, no contributing target | **18** | ✅ **yes** |
| `D` counted in the buckets today | **148** | ✅ |

**150 of the ~215 residual results DO have a ToC area.** Labelling them `Not tagged to a ToC area` would be **factually false for 70% of the bucket** — the lying-filter failure this spec is organised against, arriving through a label instead of a number.

Cause: `getResultsCountByUnitAndStatus` reaches an AoW through **INNER JOINs** on `results_toc_result_indicators` + `result_indicators_targets`, so it counts only results *contributing to an indicator target*. That is the right basis for the existing `resultsCount.editing/submitted` — it is the wrong basis for a scope filter, where "show me AOW02's results" means all of them.

**Phase dimension.** Bucket counts above are all-phases; the card is phase-filtered. `v36 Reporting 2026` (status=1, the open phase) holds **93** W1/W2 results — consistent with the 89 on screen. `OSF-T-3`'s expected values must be computed per `versionId`, not globally.

**`OSF-A-1` — multi-AoW results:** 211 results touch 1 AoW, **5 touch 2, 3 touch 3** → **8 of 219 (3.7%)** are silently collapsed by `MAX(twp.acronym)`. Small but non-zero, so the rule must be stated rather than inherited.

#### Not done

- The five-width sweep (1600/1280/1100/900/768) belongs to `OSF-T-8` — the layout root cause proved width-independent.

---

## 3. Pivot Record: `OSF-T-2` (and the design behind it)

**Trigger.** `OSF-T-1` was written to *reproduce or refute* the design's root-cause analysis. It refuted it.

### What is invalidated

| Artefact | Claim | Measured reality |
|---|---|---|
| `proposal.md` §3.2 | Overflow caused by the AoW row's rigid `max-content` tracks; failure band 1025–1200px | The AoW row is not a contributor at 1138px. Cause is width-independent |
| `proposal.md` §3.3 | Dead space from the 460px chart box and/or `min-h-screen` | `min-h-screen` never reached; the chart box is second-order behind a 936px table |
| `design.md` `OSF-DD-8` | Per-breakpoint column-removal ladder | Addresses ≤3px of a 1470px defect |
| `design.md` `OSF-DD-10` | "The ladder is the horizontal fix" | False |
| `design.md` `OSF-DD-11` | Staged vertical fix, shell conditional | Step 2 provably unnecessary; step 1 is minor |
| `tasks.md` `OSF-T-2` | ~90 LOC of responsive grid work | Wrong target entirely |
| `requirements.md` §9 | "Accepted risk — not reproduced" | Now measured; the risk is discharged |

### Blast radius — this is bigger than the Overview

`pr-viz-chart.component.html` is a **shared component** (`src/app/shared/components/`). Every page rendering a chart with a `tableModel` carries the same defect. The Overview is where it was noticed, not where it lives.

### Proposed direction

| Item | Change |
|---|---|
| **The fix** | Wrap the accessibility table in a `<div class="sr-only">` instead of putting `sr-only` on the `<table>` itself. A `div` honours `width:1px`; the table keeps its semantics for assistive tech. **The DOM test used `display:block`, which proves the mechanism but must NOT ship** — it strips table semantics from screen readers, breaking the very users the table exists for |
| **Scope** | `OSF-T-2` is rewritten: ~15 LOC in one shared component, plus a regression test asserting the wrapper clips |
| **`OSF-R-8`/`OSF-R-9`** | Unchanged as requirements — they were always stated as observable behaviour, and that is why they survived a wrong root cause |
| **`OSF-DD-8`** | Demoted from *the fix* to a **latent** hardening: the rigid `max-content` tracks are real and will bite at some width, but they are not this bug. Split into a follow-up, or keep as a narrow hardening task with `OSF-T-8` measuring whether it is needed at all |
| **`OSF-DD-11`** | Step 2 deleted (measured unnecessary). Step 1 kept as a minor cleanup — the ToC map reserving 460px for a chart that renders no canvas is its own small defect |
| **Budget** | ~1020 → **~880 LOC**; `OSF-T-2` drops from ~90 to ~15 |
| **Ticket** | The shared-component fix likely deserves its own ticket, since it fixes every charted page in the app |

### What this does not change

The scope-filter feature (`OSF-T-3`..`OSF-T-7`) is untouched. Its requirements, design and tasks stand as written.

**No TRD ADR is overturned** — this is a component-level defect, not an architecture decision.

---

### `OSF-T-2` — Stop `sr-only` from inflating the page

- **Status:** `[x]` **PASS** on attempt 1 · **Date:** 2026-09-01 · **Implementer attempts:** 1
- **Implements:** `OSF-R-8`, `OSF-R-9`; `OSF-AC-11` (`OSF-AC-9` partially — see the residual below)
- **Design ref:** `OSF-DD-14`, `OSF-DD-11` step 1
- **Skills assigned:** `angular-developer`, `systematic-debugging` · **Effort:** high (shared component, accessibility-sensitive)

**Files changed**

| File | Change |
|---|---|
| `shared/components/pr-viz-chart/pr-viz-chart.component.html` | `<table class="sr-only">` → `<div class="sr-only"><table …>`; `sr-only` removed from the table |
| `…/program-overview/program-overview.component.html` | ToC map: `height="460px"` → `min-h-[460px] flex flex-col` wrapper + `flex-1` + `height="100%"` |
| `shared/components/pr-viz-chart/pr-viz-chart.component.spec.ts` | 4 selectors loosened `table.sr-only` → `table`; new regression test for the wrapper |

`dashboard-lab.component.html` **untouched**, as required.

**Leader adjudication before the Reviewer spawn.** The Implementer's report carried a `Not Done / Assumptions` field, so it was adjudicated first (`KZ-OAH-2`). Two items, neither owed scope: (1) the correct refusal to claim layout evidence from a jsdom run — the task assigns that measurement to the Leader; (2) a design deviation on the ToC-map mechanism, using a flex-fill wrapper rather than widening scope into `pr-viz-chart.component.ts`. Accepted: it satisfies `OSF-DD-11` step 1's wording and is scope-conservative — and because it is a *layout* claim that jsdom cannot judge, it was routed to the browser measurement rather than the Reviewer.

**Implementer verification**

- `npx jest … pr-viz-chart` → 1 suite, **14 passed**
- `npx jest … program-overview` → 3 suites, **156 passed**
- `npx ng lint --quiet` → clean

**Leader browser measurement — the effect evidence jsdom cannot produce**

Live authenticated Overview, 1138px viewport. Bundle freshness asserted first (8 `div.sr-only` wrappers present, **0** tables still carrying `sr-only`) — the `onecgiar-pr-client/CLAUDE.md` §9 stale-bundle trap.

| Signal | Before | After | Target |
|---|---|---|---|
| `scrollWidth − clientWidth` | 1470px | **16px** | ≤3px — **not met** |
| `scrollHeight` | 5142 | **4132** | ≈4260 — **beaten** |
| Dead space below last card | 914px | **~0** | 0 |

The ToC-map table still measures 2297px: the wrapper **clips** it rather than shrinking it, which is the design — the table keeps its box and its semantics and stops inflating the document's scroll area.

**Reviewer verdict:** `STATUS: PASS`. Audited all six DoD clauses individually; confirmed no forbidden clipping technique, table semantics intact, `dashboard-lab.component.html` untouched, and that the four loosened selectors weakened no assertion (none of them tested `sr-only` placement; that assertion was extracted into the new dedicated test). Judged the flex-fill mechanism CSS-sound — `flex: 1 1 0%` in a `min-height`-constrained column flex container resolves to a definite non-zero height, corroborated empirically by the measured `scrollHeight`.

**ADVISORY (readability, 4R — recorded, not gating):** the `min-h-[460px] flex flex-col` + `flex-1` + `height="100%"` combination is a non-obvious technique for simulating a min-height floor without touching the shared component's contract. Already commented with its rationale; flagged so a future maintainer knows that comment is load-bearing, not decorative.

---

## 4. Open Finding: 16px residual overflow — `OSF-AC-9` not yet satisfied

`OSF-T-2` met its own Definition of Done and its Reviewer gate, but **`OSF-R-8` is not fully satisfied**: 16px of horizontal page scroll remain, and 16px of horizontal scroll is still horizontal scroll.

**Traced, then traced again — the first attribution was imprecise.** Initially recorded as "a `w-[220px]` popover escaping its container". A second measurement corrected it: the popover is `absolute right-0` **inside** the button, so it shares the button's right edge and extends leftward — it contributes nothing. The real cause is the collapsed band's action group (`reporting-program-band.component.html:195`), which **is allowed to shrink** while both its children carry **`shrink-0`**; their ~400px of content overflows the 356px the group is squeezed to. Ancestors from `<nav>` up all end correctly at 1139. Full analysis: `OSF-DD-15`. Confirmed pre-existing — `git diff --name-only` shows this change never touched that component; it was **masked** by the 1470px table overflow until now.

**Worth noting for the kaizen:** the band's tooltip computes to `opacity: 0` — invisible, fully laid out, expanding the scroll area. That is the **same failure class** as `OSF-DD-14`'s `sr-only` table. Two independent instances inside one spec is a pattern.

**Not absorbed into `OSF-T-2`, and no task minted for it.** Widening an approved task, or creating one the user never approved, is precisely what the execute protocol forbids — the finding goes to the owner as a decision. Two facts shape it:

1. `reporting-program-band` is **shared with the Reporting tab**, so the defect is unlikely to be Overview-only.
2. It is a different mechanism from `OSF-DD-14` — an absolutely-positioned popover escaping its container, not a table that cannot be constrained.

**Owner decision 2026-09-01: amend this spec.** Added as **`OSF-T-2c`** with `OSF-DD-15` behind it. Not absorbed into `OSF-T-2` (which met its DoD and its Reviewer gate) and not minted unilaterally — the protocol reserves that call for the owner, who made it.

`OSF-AC-9` therefore remains **open**, now owned by `OSF-T-2c` and proved by `OSF-T-8`.

---

## 5. `OSF-T-2c` — Close the residual 16px in the program band

- **Status:** `[x]` **PASS** · **Date:** 2026-09-01 · **Implementer attempts:** 1 · **Reviewer rounds:** 1 FAIL (Leader-side) → closed
- **Implements:** `OSF-R-8`, `OSF-R-10`; completes `OSF-AC-9`
- **Design ref:** `OSF-DD-15` · **Skills:** `angular-developer`, `ui-ux-pro-max` · **Effort:** medium

**Files changed:** `reporting-program-band.component.html` (collapsed CTA, ~:206-224) · `reporting-program-band.component.spec.ts` (+4 structural tests). The expanded band's CTA, the Back button and the tooltip are untouched.

### Option chosen — and why the preferred one was rejected

**`OSF-DD-15` option 2: let the CTA label truncate.** The CTA loses `shrink-0`, gains `min-w-0`; its label moves into `<span class="min-w-0 truncate">`; the icon gains `shrink-0` so it is never squeezed.

**Option 1 (`shrink-0` on the action group) was attempted first and rejected on evidence.** It only works if the nav's *other* children can absorb the squeeze, and they cannot: the collapsed identity block's programme-name span (`:146`) is `whitespace-nowrap` with no `truncate`, and the three tab labels are single unbreakable words with no truncation of their own. For all of them min-content width equals rendered width, so there is no space to free. Forcing `shrink-0` onto the group would have **relocated** the shortfall into the same row rather than closing it — still horizontal page scroll, just from a different element.

### Leader browser measurement — the effect evidence

Live authenticated app, band scrolled into its collapsed state, bundle freshness asserted (`span.truncate` present in the served DOM). The Orca pane measured 1705px, where the defect does not occur, so the cramped condition was **reproduced** by constraining the nav's holder to the width measured at the original 1138px viewport, then restored.

| nav width | action group | CTA | overflows its parent | label |
|---|---|---|---|---|
| **879px** — the 1138px viewport where the defect appeared | 356 | **154** | **0px** | truncating |
| 760px | 308 | 106 | **0px** | truncating |
| 640px | 308 | 106 | **0px** | truncating |

Before the fix at nav 879px: the CTA overflowed its parent by **48px** and the page by 17px.

**Reporting tab — the check the shared component makes mandatory:** identical probe, identical result (`overflowsParent: 0` at both widths), page `scrollWidth − clientWidth = 0`. DOM restored cleanly on both surfaces.

> Measuring at the 1705px pane and calling it green would have been a false pass. The width that matters is the one where the defect exists.

### Reviewer verdict

Round 1 **`STATUS: FAIL`** — one issue, and it was a **Leader deliverable, not the Implementer's**: this `execution.md` entry did not exist, which `OSF-T-2c`'s DoD names explicitly ("record which option was used and why in `execution.md`"). The Reviewer also caught §5 still reading *"Awaiting owner approval of the pivot"* after the pivot had been approved and applied.

**Leader adjudication:** the finding is valid and mine to close. It consumed **no Implementer rework attempt** — the Reviewer's own report states everything else "checked out clean": no `overflow-x:hidden` added, neither button removed or hidden, tooltip and `w-[220px]` untouched, the `min-w-0` / `truncate` / `shrink-0` chain correctly composed (Tailwind's `truncate` bundles its own `overflow:hidden`, so no missing link), `reportEmerging.emit()` and hit area unchanged, no hardcoded hex or new SCSS. Writing this section is the remediation; no source file was re-touched.

### Advisories (recorded, non-gating)

- **Accessibility.** The Leader flagged the truncated CTA label against `OSF-R-10` ("truncates with an accessible full value") as the clause most likely to be missed. The Reviewer investigated and **did not** raise it to a FAIL: CSS truncation does not affect screen-reader accessible-name computation, and the same file's pre-existing `programName()` heading (`:55`) uses the identical `truncate`-without-`title` pattern — so this diff follows an established local convention rather than introducing a defect. **Kaizen item:** that convention is debatable and worth revisiting codebase-wide — a sighted keyboard-only user gets no full value for either.
- **Verification method.** The synthetic nav-width constraint is a proxy for real viewport resizing, used because the Orca browser exposes no viewport control and Playwright's Chromium binary is not installed. It isolates the flex mechanism correctly but is not the real thing. **`OSF-T-8` must re-confirm this CTA across the full five-width matrix** and not treat this entry as covering it.

---

## 7. `OSF-T-3` — Server: scope bucket query and additive payload

- **Status:** `[x]` **PASS** · **Date:** 2026-09-01 · **Implementer attempts:** 1 (+1 Leader-adjudicated remainder) · **Reviewer rounds:** 1 PASS
- **Implements:** `OSF-R-2`, `OSF-R-4`; `OSF-AC-3`, `OSF-AC-5`, `OSF-AC-12`
- **Design ref:** `OSF-DD-1`, `OSF-DD-2`, `OSF-DD-2b`, `OSF-DD-2c`, `OSF-DD-2d`, `OSF-DD-3`
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd` · **Effort:** high

**Files:** `results-framework-reporting.service.{ts,spec.ts}` · `results/results.service.ts` (2 lines) · `results/result.spec.ts` · **new** `shared/constants/w1-w2-result-source-filter.constant.ts`

### Leader adjudication — owed scope returned before the Reviewer

The first report's `Not Done` named the single-homing as half-finished: the constant existed but `results.service.ts` still held its own inline `['Result']`. That is a DoD clause (*"AND IT MUST be impossible to change one population without the other"*), so it was **owed scope, returned before spawning the Reviewer** (`KZ-OAH-2`) rather than spending the review round on it. The file-list gap was the Leader's briefing error and was recorded as such.

**The Implementer then deviated from the Leader's literal instruction — correctly.** Importing the constant from the feature service created a genuine circular dependency (`results.service` → `results-framework-reporting.service` → `create-result-from-framework.handler` → `create-framework-result-entity.service` → `results.service`), leaving a DI constructor param `undefined` and failing 7 tests. It isolated the cause (revert → pass, re-apply → fail), then moved the constant to `shared/constants/` per `src/CLAUDE.md` §7.10. **The Leader's instruction was wrong and the evidence corrected it** — the outcome is stronger than what was asked for: neither feature module now imports the other at all.

### Leader SQL verification against the real dev DB

Fixtures prove JS assembly, never that the JOINs select the right rows. The new `getScopeBuckets` SQL was run verbatim against dev — `SP01` (initiative 50), version 36 (`Reporting 2026`, open phase), `phaseUuid`/`reportingYear` resolved from the `version` row:

| | |
|---|---|
| Named buckets | AOW01 27 · AOW03 4 · AOW02 2 · AOW04 2 · AOW05 1 · `INTERMEDIATE` 4 → **40** |
| Program total (residual base) | **95** |
| Residual → `UNTAGGED` | **55** |

**Per-status reconciliation — the keystone `OSF-AC-3`:** status 1 → 86 − 36 = 50 · status 2 → 2 − 2 = 0 · status 3 → 7 − 2 = 5. **No negative residual at any status; the partition closes on real data.**

**Residual composition, diagnosed:** 38 results whose `results_toc_result` row points at a missing/inactive `toc_results` (a broken link — no resolvable area) + 17 with no `results_toc_result` row at all.

**A suspected third cause was investigated and ruled out.** 36 results appeared to be dropped by a `wp.year` mismatch. They were not: `toc_work_packages` carries one row per (wp, year), so those 36 are the same 36 already resolved, seen through their 2025 row. Checked rather than reported.

> **Data-quality signal worth surfacing later:** 38 broken ToC links in one program's open phase. The query handles them correctly, but once that bucket is on screen someone will ask what they are. Not this spec's scope.

### Reviewer verdict

`STATUS: PASS`. Confirmed clause by clause: the INNER chain untouched so `resultsCount.editing`/`submitted` keep their values (AC-12), the LEFT basis correctly confined to `getScopeBuckets` (`OSF-DD-2b`), AoW-first CASE ordering with `MIN(UPPER(wp.acronym))` as the deterministic tie-break (`OSF-DD-2d`), `versionId` pinned on both sides (`OSF-DD-2c`), residual-only `UNTAGGED` with clamp and a log naming `bucket=UNTAGGED status=<n>` and leaking nothing sensitive, and the circular dependency independently re-confirmed by grep. The identity test asserts `Object.is`, so a re-inlined literal fails it even though its value would still match.

**Reviewer interpretation, resolved in the Implementer's favour and recorded rather than passed silently:** `getScopeBuckets` issues **two** statements (bucket + program total) via `Promise.all`, where the DoD said "one query, one round trip". They cannot collapse without a UNION because `OSF-DD-3` compares against a structurally different population. `OSF-NFR Performance` binds `getResultsCountByUnitAndStatus`, which is still one query, and no new HTTP request is added. **`OSF-DD-2`'s now-false "still one query" sentence was corrected in `design.md`** rather than left standing.

### Advisory (recorded, non-gating)

The single-homing spec test asserts `arrayContaining(['Result'])` on both query param lists — it catches the predicate being **deleted** but not being **widened** to admit a bilateral source. Minor: the `Object.is` identity test covers the drift case FIND-01 actually targets, and the executed dev-DB query covers selection.

---

## 8. `OSF-T-4` — Host: scope state, W1/W2 partition, URL sync

- **Status:** `[x]` **PASS** on attempt 1 · **Date:** 2026-09-01 · **Reviewer rounds:** 1 PASS, no advisories
- **Implements:** `OSF-R-1`, `OSF-R-2`, `OSF-R-4`, `OSF-R-7`, `OSF-R-11`; `OSF-AC-1`, `OSF-AC-3`, `OSF-AC-8`
- **Design ref:** `OSF-DD-4`, `OSF-DD-5`, `OSF-DD-6`, `OSF-DD-12` · **Skills:** `angular-developer`, `tdd`

**Files:** `dashboard-lab.component.ts` · **new** `overview-scope-filter.ts` (the single-homed pure rule) · **new** `dashboard-lab.scope.spec.ts` (18 tests) · `entity-details.interface.ts` (typed the new payload)

`program-overview.component.*` was **not touched at all**, so `OSF-DD-4`'s no-derivation constraint holds trivially. `dashboard-lab.component.html` needed no change — the existing bindings pick up the filtering because only the computeds' internals moved.

### Reviewer verdict

`STATUS: PASS`, no FAIL issues, no advisories. Each clause weighted heaviest checked out: **`OSF-AC-1` byte-identity** of the unfiltered path across the `buildOverviewStatusSegments` refactor, `OSF-DD-4` no-derivation, `OSF-DD-6` single-homed helper, `OSF-DD-5` reset placement beside the Reporting filters, `OSF-DD-12`'s URL guard (the test explicitly asserts no `scope` key in either `OverviewLink` or `PROGRAMME_RESULTS_QUERY_PARAM_MAP`), the absent-AoW fallback to "All", and the interface addition's justification.

**Tautology sweep — the check that mattered most.** All 18 tests were audited for the trap of deriving the expected value by calling the same production helper the subject uses. The reconciliation test and both `overviewStatusSegments` tests assert **hand-computed literal values**, so none can pass on a broken implementation.

### Accepted expansion

`entity-details.interface.ts` was outside the brief's file list. Accepted: `onecgiar-pr-client/CLAUDE.md` §16 requires updating the matching interface in the same PR, and the alternative was an `as any` cast. The added fields match what `OSF-T-3` actually sends — `key`, `kind`, `byStatus`, `total`, and **no `label`**.

### ⚠️ Forward pointer — carried, not filed

`OVERVIEW_SCOPE_FIXED_LABEL` (the `Intermediate outcomes` / `2030 outcomes` / `Not tagged to a ToC area` strings) is a local `Record` rather than a `TermKey`. Accepted for `OSF-T-4`, which builds options and renders nothing. **Resolved in `OSF-T-6`: they correctly stay hardcoded** — and the spec's own NFR, not the code, turned out to be wrong. See §11 of this log.

**This is owed by `OSF-T-6`, the task that renders them, and it is written into `OSF-T-6`'s brief — not merely recorded here.** A pointer filed in an execution log is not carried by having been filed; the brief carries it or nobody does.

---

## 9. `OSF-T-5` — W3/Bilateral partition and card filtering

- **Status:** `[x]` **PASS** · **Date:** 2026-09-01 · **Implementer attempts:** 1 (+1 Leader-adjudicated extension) · **Reviewer rounds:** 1 PASS, no advisories
- **Implements:** `OSF-R-3`; `OSF-AC-4` · **Design ref:** `OSF-DD-3b`, `OSF-DD-6` · **Skills:** `angular-developer`, `tdd`
- **Files:** `dashboard-lab.component.ts` · `dashboard-lab.scope.spec.ts`

### Leader adjudication — a requirement enumeration was incomplete

The first delivery filtered three cards and left `overviewBilateralHeatmap` alone, correctly reading its brief's file list. **Returned as owed scope.** The heatmap reads the same `bilateralRows()` and renders on the same surface (`dashboard-lab.component.html:1230`), so shipping it unfiltered beside three filtered siblings would have shown whole-program figures with **no declaration** — the exact failure `OSF-R-5` forbids.

**The rule this settled, now written into `OSF-R-3` so it does not have to be re-derived:** *a card that **can** filter, filters; the `Program-wide` declaration is only for cards that structurally cannot* (the W1/W2 category matrix, which has no ToC join at all).

`OSF-R-3`, `OSF-AC-4`, this task's DoD and `proposal.md`'s success criterion were all amended from "three cards" to four. A forward sweep caught the stale enumeration in all three secondary sites; the one hit left untouched (`OSF-US-1`'s "cross-referencing three cards by eye") refers to the three *sections* of today's page, not the W3 cards.

### Reviewer verdict

`STATUS: PASS`, no advisories. Confirmed `scopedBilateralRows` calls the single-homed `filterRowsByScope` with `r => r.acronym` (`OSF-DD-6`), and that **all four** cards read it — then **grepped for remaining `bilateralRows()` consumers** and judged each: only cache/loading plumbing (`loadingBilateral`, `loadBilateralRows` de-dup) remains unscoped. **No leak.** It also checked the template bindings actually consume the scoped computeds rather than merely that they exist.

Two checks worth recording:

- **The null-acronym row is *counted*, not merely non-crashing** — asserted present under `UNTAGGED` on every card, matching the helper's `keyOf(row) || UNTAGGED` fallback.
- **The reconciliation test is a real cross-check, not four independent assertions.** Its literal heatmap value (2 for CenterX/Cat A) only passes if the heatmap agrees with the centers card's literal — a heatmap reading unscoped rows or the wrong population fails it.

The string-typed wire trap (`initiative_role_id` as `'1'`) was verified untouched: the pre-existing `String(...)` comparison stands, and no new numeric comparison was introduced.

---

## 10. `OSF-T-6` — The scope control (Spartan listbox + ARIA)

- **Status:** `[x]` **PASS** after 1 rework · **Date:** 2026-09-01/02 · **Implementer attempts:** 2 (+1 runtime abort, not a work FAIL) · **Reviewer rounds:** 1 FAIL → remediated → Leader-verified
- **Implements:** `OSF-R-1`, `OSF-R-10`, `OSF-R-12`, `OSF-R-14`; `OSF-AC-2` · **Design ref:** `OSF-DD-7`, `OSF-DD-13`
- **Files:** `program-overview.component.{ts,html}` · **new** `program-overview.scope.spec.ts` (13 tests) · `dashboard-lab.component.html` (3 bindings) · `program-overview/CLAUDE.md`
- **Final:** `23 suites / 691 tests passed` (baseline 22/678) · `ng lint` clean

### Runtime abort and informed relay

The first Implementer was killed mid-edit by a session limit — a **runtime failure, not rejected work**. It left the tree with **221 failures against a 678 baseline**, which looked catastrophic and was not: every one traced to a single unterminated `[class]` binding on the option `<button>`, breaking JIT compilation of the whole component.

That diagnosis decided the recovery. With 221 independent failures the right move is revert-and-restart; with **one half-written tag** it would have thrown away a sound component surface, the control markup and the host bindings. The retry was briefed with the exact cause and told **not to assume further breakage until the compile error was gone** — a derived failure list is a trap for chasing ghosts.

### A second defect the retry found on its own

With the tag repaired, 2 tests still failed — and they were right to. `scopeGroups()` preserved whatever order the host passed, so `EOI_2030` could render before `INTERMEDIATE`. Fixed with an `OUTCOME_KEY_ORDER` sort applied **only** to the outcome group; the `aow` group keeps the ToC's own order. That is `OSF-AC-2`, and it would have shipped had the retry stopped at "compiles and passes".

### The i18n question — closed, and the spec was the thing that was wrong

Deferred once in `OSF-T-4`, carried into this task's brief rather than merely logged. The Implementer went to `terminology.config.ts` and found the entire dictionary is **7 keys on one axis** (`Initiative` ↔ `Science Program/Accelerator`); `src/CLAUDE.md` §11's MUST is scoped to *copy that differs between P22 and P25*. The three ToC-vocabulary labels do not differ, so they stay hardcoded and single-homed.

**Verified independently by the Leader and by the Reviewer.** This spec's own Internationalization NFR had been written **stricter than the repo's rule** ("all new user-facing strings MUST go through `src/app/internationalization/`") and would have forced indirection with no behaviour change. **The NFR was corrected**, and the change propagated to `design.md` §5, `tasks.md` and this log.

### Reviewer verdict — FAIL, then closed

`STATUS: FAIL`, two issues, both valid:

1. **`aria-controls` missing** — the one row of `OSF-DD-13`'s own ARIA table the diff dropped. The trigger had `role="combobox"`, `aria-haspopup` and `aria-expanded`, but no `aria-controls`, and the panel had no `id` to point at. The Reviewer checked `node_modules/@spartan-ng` and confirmed the library does **not** wire it — not free from the framework.
2. **Folder doc stale** — `program-overview/CLAUDE.md` still claimed "computes almost nothing — one exception (`richStats`)" after six new computeds, violating `onecgiar-pr-client/CLAUDE.md` §10's same-commit rule. `design.md` §4 names that file as a spec deliverable, so the spec-branch shared-file restriction does not exempt it.

**Remediated and Leader-verified rather than spending a second review round** (the run's ≤1-round budget): `scopeListboxId` now backs both `[attr.aria-controls]` (`:277`) and the panel `[id]` (`:301`) — one constant, so the link cannot half-exist — with a test asserting **both sides**; the folder doc gained an invariant bullet explaining why the new computeds are presentation-shaping, with its `Verified:` stamp bumped to current HEAD.

### What the Reviewer confirmed on substance

`OSF-DD-4` **holds** — the invariant most at risk in this diff. It read every new computed: they group, flatten and look up; none sums or produces a figure. Proven by the tests, not asserted: the `aow` group keeps input order (`AOW02` before `AOW01`, not alphabetical) while only the outcome group is reordered. The keyboard tests dispatch real `KeyboardEvent`s and the `Escape` refocus awaits a microtask against a `focus` spy — behaviour, not presence. `OSF-DD-7`'s ladder is px-only, never rem.

### Advisory (recorded, deliberately NOT actioned)

A defensive `scopeFlatKeys().includes(key) ? key : null` guard in `openScopePopover()` against a stale `aria-activedescendant`. Non-gating, and `OSF-DD-5`'s host reset makes the case unreachable. **The Implementer was explicitly instructed not to implement it** — an advisory becoming code is scope the user never approved.

---

## 11. `OSF-T-7` — Overview states: program-wide, no-plan, breakdown

- **Status:** `[x]` **PASS** on attempt 1 · **Date:** 2026-09-02 · **Reviewer rounds:** 1 PASS
- **Implements:** `OSF-R-5`, `OSF-R-6`, `OSF-R-13`; `OSF-AC-6` (presence), `OSF-AC-7` · **Design ref:** `OSF-DD-9`, `OSF-DD-3`
- **Files:** `program-overview.component.{ts,html}` · `program-overview.scope.spec.ts` · `dashboard-lab.component.html` (the `[scopeBreakdown]` binding the host computed in `OSF-T-4` but never bound) · `program-overview/CLAUDE.md`
- **Final:** `23 suites / 701 tests` (baseline 691) · `ng lint` clean · **`ng build` also run** — deliberately, because lint and `tsc --noEmit` do **not** typecheck Angular templates. That is the gate that would have caught `OSF-T-6`'s unterminated tag before it cost 221 failures.

### Reviewer verdict — the two checks that mattered

`STATUS: PASS`, all eight audit points clean.

**`OSF-AC-7` verified structurally, not just visually.** The Reviewer traced the template control flow rather than trusting the claim: in both the hero rail (`:401` before `:412`) and the row area (`:515` before `:535`), the no-plan branch is evaluated before any branch that could paint `0%` / `0 of 0`. And the finding that settles it — **the no-plan branch renders no `<svg>` at all**, so an empty ring is *structurally impossible*, not merely hidden. `heroNoPlan = isFiltered() && richStats().total === 0` covers both the "no AoW row matches an outcome/untagged key" case and the "matched AoW's own total is 0" edge.

**The `Program-wide` pill appears exactly once**, on the W1/W2 category×status card — grepped across the whole template. That card qualifies because `getIndicatorContributionSummaryByProgram` joins no ToC data. Every other card filters. The rule `OSF-T-5` settled into `OSF-R-3` held under audit.

`OSF-DD-4` also held: `isFiltered`/`heroNoPlan` are boolean reads, `groupScopeOptions` is a pure group-by shared with `scopeGroups` so the control and the breakdown cannot drift on order, and `breakdownGroups` **prints `aowSubtotal`/`total` verbatim from the host** — nothing summed in the component.

### Judgment calls, both accepted

- **`heroNoPlan` before `richRows()`** so a matched-AoW-with-zero-total reads as "no plan" rather than a bare `0/0`. Not spelled out in the DoD; consistent with `OSF-AC-7`'s prohibition and with the mockup's own `total > 0` row filtering. Verified in the template by the Reviewer.
- **Breakdown gated on `scopeBreakdown().rows.length`** as well as `!isFiltered()`, so an unloaded breakdown never flashes "All scopes 0". Matches the file's existing empty-state idiom (`w12Heatmap()?.rows?.length`).

### Deliberate omission — recorded, owner's call

The mockup's `Showing {code} · {name}` scope banner was **not** built: it appears in no DoD bullet, and the Implementer correctly stayed in scope and flagged it rather than adding unrequested UI. A real gap between the approved mockup and the requirements.

**Leader position:** the control's own trigger (`scopeTriggerLabel()`) visibly shows the active scope, so the page is never silently filtered — the banner would be redundant. The Reviewer independently reached the same read. **Deferred to `OSF-T-8`'s visual check**, which is better placed to judge whether the page communicates its scope clearly, and to the owner if it does not.

---

## 12. Awaiting

**Owner decision on `OSF-DD-2`/`OSF-DD-3`** before `OSF-T-3` is built on the wrong basis — see §2's reconciliation measurement. The residual would label 150 results with a ToC area as `Not tagged to a ToC area`. Proposed: keep the INNER-JOIN basis for `resultsCount.editing/submitted` (protects `OSF-AC-12`) and compute the scope buckets on a LEFT-JOIN basis, dropping the residual from 59% to ~22% and making the label true.

**Open (corrected — this line was stale):** `OSF-T-3` through `OSF-T-7` are all `[x]` PASS (§7–§11). `OSF-T-8` (§13) is measurement-complete. What remains open is:

- ~~**`OSF-T-2b`**~~ — **CLOSED 2026-09-02**, see §14. Gate had resolved to **YES, needed** by `OSF-T-8`'s §13 `OSF-AC-10` measurements (identity column collapses to 0px at 1100px/768px, 1–4 visible characters at 900px). Scoped decision owed: build `OSF-DD-8`'s ladder, drop a column (`OSF-DD-10`'s alternative), or accept a card-level scroller. §13 notes `tasks.md`'s gate wording ("exceeding its container") doesn't literally match the mechanism (a starved `minmax(0,1fr)` track, not overflow) — read the gate as intent, not literal wording.
- ~~**The scope trigger's focus-ring fix**~~ — **CLOSED 2026-09-02** as part of `OSF-T-9`, see §15. `program-overview.component.html:280`, `focus-visible:ring-[var(--pr-focus-ring)]` → `focus-visible:shadow-[var(--pr-focus-ring)]` (matching the correct precedent at `:944`). One-word source change, confirmed root-caused, not yet applied — outside `OSF-T-8`'s write authority.
- ~~**Two new-control contrast failures**~~ — **CLOSED 2026-09-02** as part of `OSF-T-9`, see §15 (1.09:1 → 5.78:1 via a border; 3.04:1 → 5.53:1 via token reuse). Originally measured in `OSF-T-8`'s rework: the keyboard-active-listbox-option highlight (`--pr-surface-band` on white, 1.09:1, needs ≥3:1 per WCAG 1.4.11) and the listbox group headers (`--pr-text-subtle` on white, 3.04:1, needs ≥4.5:1 per WCAG 1.4.3). Owner decides remedy (darken `--pr-surface-band` for this context, or an added border/indicator for the active option; a less-subtle token for group headers).
- **The 768px overflow — RECHARACTERISED 2026-09-02, now `OSF-T-10`.** `OSF-T-8` recorded this as a one-frame transient after scope selection, root-caused to the `pr-viz-chart` `sr-only` clip. **That characterisation was wrong.** The Leader reproduced it during `OSF-T-2b`: it is **stable, not transient**, its trigger is the **program band collapsing** (not a scope toggle), and its offender is `reporting-program-band`'s action group at `:195`, not `pr-viz-chart`. Measured 47px at 768px on both the Overview and the Reporting tab, with the band collapsed; clean at `scrollY 0`.

  **Why two passes missed it, which is the durable lesson:** `OSF-T-2c` and `OSF-T-8` both measured `overflowsParent` and both correctly got **0** — the group does not overflow its *parent* (`ml-auto` lets the parent match its content), it overflows the *page*. And `OSF-T-8`'s page-level readings were taken with the band **expanded**. Neither pass ran page-level-while-collapsed, the only combination that sees it. A true measurement of the wrong quantity is more dangerous than no measurement, because it closes the question.

  Promoted to **`OSF-T-10`** by owner decision, 2026-09-02.

---

## 13. `OSF-T-8` — Browser verification pass

- **Status:** measurement complete, **rework attempt 2 (Reviewer FAIL → remediated)** — **four FAIL findings** (`OSF-AC-10` row collapse; D6 focus ring on the trigger; D6 contrast on the active-option highlight, 1.09:1; D6 contrast on group headers, 3.04:1), everything else **PASS**, one transient noted with an owner.
- **Date:** 2026-09-02 · **Method:** `orca eval`/`orca exec` against the live authenticated Overview (`SP01`), real `set viewport` resizes (not a synthetic proxy), five widths × filter on/off, screenshots reviewed on this (multimodal) model. Rework pass added: `getComputedStyle`-sampled contrast ratios on the new control's own surfaces, a collapse-asserted re-measure of the band CTA at all 10 cells (fixing a synchronous-check race that could read the wrong CTA), and 3-run re-reads of the two `OSF-AC-10` cells that decide the `OSF-T-2b` gate.
- **Implements verification of:** `OSF-AC-6`, `OSF-AC-9`, `OSF-AC-10`, `OSF-AC-11`; `OSF-R-10`. Also re-confirms `OSF-T-2c`'s collapsed-band CTA across the real five-width matrix (owed per that entry's own advisory).
- **Scope selected for all filtered measurements:** `AOW01` — *Market Intelligence*, 28 results. A real, mid-sized AoW (not the largest or smallest), picked for representative truncation behaviour.

### Environment / freshness re-assertion

Bundle freshness re-asserted independently at session start, 1513px viewport (not trusting the Leader's earlier assertion): `role=combobox` present, `"Not tagged to a ToC area"` present, `"All scopes"` present, URL matched the assigned tab. Client `:4200` / server `:3400` were not re-resolved — the brief's environment block said not to, and freshness re-assertion is the substitute it names.

**The viewport gotcha, verified independently:** requesting `917×800` produced `innerWidth 1100`, `clientWidth 1082` — matches the brief's table exactly. All five requests below were individually verified against actual `innerWidth`, not trusted from the table.

| Target | Request (W×H) | Actual innerWidth | Actual clientWidth |
|---|---|---|---|
| 1600 | 1333×900 | 1599 | 1581 |
| 1280 | 1067×900 | 1280 | 1262 |
| 1100 | 917×900 | 1100 | 1082 |
| 900 | 750×900 | 900 | 882 |
| 768 | 640×900 | 768 | 750 |

### Sidebar state, every width (disqualifier check)

| Width | Sidebar |
|---|---|
| 1600 / 1280 / 1100 / 900 | `data-state="collapsed"` — icon rail, 64px, unchanged by the filter |
| 768 | **Not present at all** — `hidden md:block`, Tailwind hides it below `md`. Pre-existing shell behaviour, not part of this spec; recorded, not chased. |

### `OSF-AC-9` — `scrollWidth === clientWidth`, 3 runs each, filter on/off

**Run count: 3 independent reads per cell, every cell in this table** (unlike `OSF-AC-10`/`OSF-AC-11` below, whose run counts differ per table and are now stated explicitly there). All values in px. Three runs are shown as one number where all three agreed exactly (they did, at every width except the 768 transient below).

| Width | Filter OFF (3 runs) | Filter ON (3 runs) |
|---|---|---|
| 1600 | 1581/1581 ×3 → **diff 0** | 1581/1581 ×3 → **diff 0** |
| 1280 | 1262/1262 ×3 → **diff 0** | 1262/1262 ×3 → **diff 0** |
| 1100 | 1082/1082 ×3 → **diff 0** | 1082/1082 ×3 → **diff 0** |
| 900 | 882/882 ×3 → **diff 0** | 882/882 ×3 → **diff 0** |
| 768 | 750/750 ×3 → **diff 0** (steady-state) | 750/750 ×3 → **diff 0** (steady-state) |

**`OSF-AC-9` verdict: PASS steady-state at every width, both filter states; QUALIFIED at 768px** by the reproducible transient below — no criterion clause covers "immediately after interaction," so the steady-state reading is the one that answers the AC, but the transient is real and is carried into §12 Awaiting as an owner item rather than left to float here with no owner.

**Transient, 768px only — reproduced 4/4, not a steady-state fail.** Reading `scrollWidth`/`clientWidth` **immediately** (same eval, no intervening round-trip) after clicking a scope option at 768px returns `797/750` (**diff 47**) every time (reproduced going unfiltered→AOW01 and AOW01→unfiltered, twice each). A **second, separate** read one tool round-trip later (~200–500ms) is `750/750` every time. Root-caused via the same controlled-experiment method `OSF-T-1` used: the culprit is the `W3/Bilateral results by center and category` `pr-viz-chart` accessibility table. Its `div.sr-only` wrapper measured correctly in the *settled* state (`overflow: hidden`, `width: 0.99px`, `position: absolute`, `clip-path: inset(50%)` — `OSF-DD-14`'s fix, present and correct), but for one render frame after the scope-triggered re-mount, the table's `getBoundingClientRect()` (785px wide) is not yet clipped by that wrapper. This is **not** a steady-state `OSF-AC-9` violation — nothing a user acts on can observe the settled DOM in that state — but it is a real, reproducible one-frame flash of a horizontal scrollbar at the narrowest supported width, specifically on the scope-toggle interaction this spec adds. **Not independently reproduced at the other four widths** (see Not Done).

### `OSF-AC-10` — AoW identity column width + truncation. **FAIL at 3 of 5 widths.**

| Width | Filter | Row width | Identity col width | name `scrollWidth`/`clientWidth` | Truncated? | Verdict |
|---|---|---|---|---|---|---|
| 1600 | OFF | 1112.4 | 481.9 | 151/151 | No | readable, full name |
| 1600 | ON | 1112.4 | 500.8 | 135/135 | No | readable, full name |
| 1280 | OFF | 793.2 | 162.7 | 151/103 | Yes | readable with ellipsis |
| 1280 | ON | 793.2 | 181.6 | 135/121 | Yes | readable with ellipsis |
| **1100** | OFF | 613.2 | **0** | 151/**0** | Yes | **COLLAPSED — name fully invisible** |
| **1100** | ON | 613.2 | **1.6** | 135/**0** | Yes | **COLLAPSED — name fully invisible** |
| 900 | OFF | 712.8 | 82.3 | 151/22 | Yes | **severely truncated (~1–2 chars)** |
| 900 | ON | 712.8 | 101.2 | 135/41 | Yes | **severely truncated (~3–4 chars)** |
| **768** | OFF | 644.8 | **14.3** | 151/**0** | Yes | **COLLAPSED — name fully invisible** |
| **768** | ON | 644.8 | **33.2** | 135/**0** | Yes | **COLLAPSED — name fully invisible** |

**Run count, stated explicitly per cell (this table was uneven on attempt 1 and is not any more):**

| Width | Runs | Result |
|---|---|---|
| 1600 OFF/ON | 1 read each | not re-run this pass — no `OSF-T-2b` consequence rides on these two cells, both already read `0`/near-`0` truncation with no collapse |
| 1280 OFF/ON | 1 read each | same — readable-with-ellipsis, not gate-relevant |
| 1100 OFF/ON | **3× each** (attempt 1) | `identityWidth 0` all three times, both filter states — stable |
| **900 OFF/ON** | **3× each (this rework)** | OFF: `82.34/82.34/82.34`, `nameClientWidth 22/22/22` — **0 spread**. ON: `101.19/101.19/101.19`, `nameClientWidth 41/41/41` — **0 spread** |
| **768 OFF/ON** | **3× each (this rework)** | OFF: `14.33/14.33/14.33`, `nameClientWidth 0/0/0` — **0 spread**. ON: `33.19/33.19/33.19`, `nameClientWidth 0/0/0` — **0 spread** |

All four re-read cells reproduced their attempt-1 single reading exactly — the gate-deciding numbers (900 and 768, both filter states) are now real 3-run measurements, not single reads carried forward. Screenshots confirm visually: at 1100px and 768px the AoW code chip and the achievement figures visually collide because the name column has nothing to render into (`w1100_aowrow_zoom.png`, `w768_aowrow_zoom2.png`). At 900px names render as one character + ellipsis (`w900_aowrow_zoom2.png`: `"A…"`, `"Inclus…"`).

**Root cause, measured (`getComputedStyle`):** at 1100px, `grid-template-columns` resolves to `0px 222.741px 54px 127.303px 112.013px`. The bar track (`minmax(120px,240px)`) sits near its own ceiling and the three `max-content` tracks (figures/achievement/actions, ≈293px combined) are rigid by definition — together they consume the entire row, leaving `minmax(0,1fr)` nothing. This is precisely the OAH-T-6 regression `OSF-AC-10` forbids, and it fires at **three** of the five measured widths, not only the 1100px `OSF-DD-10` flagged as "most likely."

**`OSF-DD-10` fallback: fires.** Per its own text — *"if the measured row minimum at any ladder step still exceeds its container, the breakpoints move... the decision returns to the user as a scoped choice."* That decision is now owed.

### `OSF-T-2b` gate: **YES — needed.** (explicit answer, per the task's own instruction)

The AoW row identity column measurably collapses to 0px (or a functionally-zero single-digit px) at **1100px and 768px**, and truncates to 1–4 visible characters at **900px**. Only ≥1280px renders the name adequately. `OSF-DD-8`'s ladder is not "latent hardening gated on a maybe" — the gate is open. Building it (or `OSF-DD-10`'s alternative: dropping a column, or accepting a card-level scroller) is now a scoped decision for the owner, not this task's to make.

**One wording note for the owner, not a dispute of the gate itself.** `tasks.md`'s gate condition is literally *"measures the AoW row **exceeding** its container"* — but the row never exceeds anything; `minmax(0,1fr)` is starved to zero/near-zero by its rigid `max-content` neighbours while the row itself stays exactly at its container's width (`rowWidth` above always equals the container, e.g. `644.8` at 768px both filter states). Opening the gate is still substantively correct — `OSF-AC-10` forbids collapse-to-zero regardless of the mechanism — but the owner should read this as "the identity track starved to zero," not "the row overflowed," so the fix (ladder / column drop / scroller) targets the right mechanism.

### `OSF-AC-11` — dead space below the last card. **PASS, clean, all 10 combinations.**

| Width | Filter | Last section bottom | `scrollHeight` | Dead space |
|---|---|---|---|---|
| 1600 | OFF | 4225.7 | 4257 | 31.3px |
| 1600 | ON | 3713.8 | 3746 | 32.2px |
| 1280 | OFF | 4248.1 | 4280 | 31.9px |
| 1280 | ON | 3754.9 | 3787 | 32.1px |
| 1100 | OFF | 4729.5 | 4761 | 31.5px |
| 1100 | ON | 4145.3 | 4177 | 31.7px |
| 900 | OFF | 5641.6 | 5673 | 31.4px |
| 900 | ON | 4710.1 | 4742 | 31.9px |
| 768 | OFF | 5795.5 | 5827 | 31.5px |
| 768 | ON | 4812.3 | 4844 | 31.7px |

**Run count: 1 read per cell** (not re-run this rework — the stability argument below is offered instead, per the Reviewer's own preferred remediation). Consistently ~31–32px at every width and filter state — nowhere near the 914px pre-fix defect `OSF-T-1` measured. No filter-dependent regression.

**Not merely "assumed ordinary padding" — measured against the actual container.** `getComputedStyle` on the last card's ancestor chain finds exactly one non-zero contributor: the page's outer grid wrapper (`div.grid.grid-cols-12...p-[32px]`, `program-overview.component.html:28`), `padding-bottom: 32px`. Every one of the 10 measured dead-space values (31.3–32.2px) sits within 0.7px of that number — the residual is `getBoundingClientRect()` sub-pixel rounding, not unaccounted space. This is a genuine comparison (measured dead-space vs. measured padding-bottom), not an inference from the number's size.

**Why 10 single reads stand without a 3-run repeat on any one of them:** the ten cells are not ten copies of the same measurement — they are five different widths crossed with two different filter states, each changing which cards render and how tall the page is (`scrollHeight` ranges from 3746 to 5827 across the table, a ~55% spread). All ten independently land in a 0.9px-wide band that matches a single fixed CSS value. That is replication across a *stronger* dimension (five layouts, not one) than three reads of one layout would have been, and it is why the Reviewer's fallback — state the argument rather than re-run — applies cleanly here, unlike `OSF-AC-10`'s 768/900 cells, which carried a gate decision and were re-run for that reason.

### `OSF-AC-6` — proved by effect, not presence. **PASS, decisively.**

The `W1/W2 results by category and status` card (the one card carrying the `Program-wide` pill, per `OSF-R-3`'s amendment) was read **out of the DOM** via its own accessibility table (`table[aria-label*="category and status"]`, the `OSF-DD-14` `sr-only` table) at every width, filter on and off. All 10 reads are **byte-identical**:

```
["", "Editing", "Quality Assessed", "Submitted", "Other"]
["Capacity sharing for development", "12", "0", "1", "0"]
["Innovation development", "44", "2", "0", "0"]
["Knowledge product", "22", "0", "0", "0"]
["Other output", "0", "0", "1", "0"]
["Innovation use", "4", "0", "0", "0"]
["Other outcome", "0", "0", "2", "0"]
["Policy change", "2", "0", "2", "0"]
```

This is the effect proof the DoD demands: the pill's claim — *"these figures cover the whole Science Program"* — is **true**, not merely displayed. `OSF-T-7`'s presence assertion is now backed by a measurement that could have caught a lying label and didn't find one.

**Contrast, visible in the same screenshots:** the OTHER stat tiles on the same screen genuinely filter — `W1/W2 RESULTS` 92→28 results, `W3 / BILATERAL` 45→11 results, `CONTRIBUTING CENTERS` 7→5 institutes (`w1600_unfiltered.png` vs `w1600_filtered.png`). Seeing three siblings change and the fourth hold steady is itself evidence the `Program-wide` pill is meaningful, not decorative.

### `OSF-T-2c` re-confirmation — real viewport resize, both tabs, all five widths. **PASS, clean — every cell's band state now asserted, not assumed.**

Per that entry's own advisory ("the synthetic nav-width constraint... is not the real thing... `OSF-T-8` must re-confirm this CTA across the full five-width matrix"). **Rework correction:** attempt 1 asserted collapse via the `[data-testid=program-band-back-btn-collapsed]` presence at exactly one of ten cells (768 Overview) and reported `overflowsParent` for the other nine without knowing whether the collapsed markup — the thing `OSF-T-2c` actually changed — was even in the DOM. A synchronous `scrollTo(0,300)` immediately followed by a query is provably too early: `window.scrollTo` does not dispatch the `scroll` event synchronously, so an immediate check can (and once did, at 1600px, see below) read the **expanded** band's CTA instead. Fixed by polling for the collapsed testid (150ms interval, up to 8 attempts) before measuring, and now asserting it at **every** cell:

| Width | Overview: collapse asserted? | Overview `overflowsParent` | Reporting: collapse asserted? | Reporting `overflowsParent` |
|---|---|---|---|---|
| 1600 | ✅ (confirmed after fixing the race — an unfixed synchronous check read the expanded CTA here, `overflowsParent 0` on that too, but the state was unknown) | 0 | ✅ | 0 |
| 1280 | ✅ (took up to 7 poll attempts across 3 repeated checks — some jitter settling, always converged to collapsed) | 0 | ✅ | 0 |
| 1100 | ✅ | 0 | ✅ | 0 |
| 900 | ✅ | 0 | ✅ | 0 |
| 768 | ✅ | 0 | ✅ | 0 |

Clean on both surfaces at every width, **now with the band's own state confirmed present, not inferred from an overflow number that would have meant nothing had the band been expanded.** The shared-component blast radius `OSF-DD-15` flagged is closed.

### D6 — screenshots, reviewed on this (multimodal) model

**Contrast — corrected scope (rework).** Attempt 1's "no issues found" covered only page-level surfaces that predate this spec (the purple stat tile, card borders, status colours) and named no surface of the new scope control itself. That was the gap the Reviewer caught. This pass measures the control's own pairs — trigger, open listbox, group headers, active-option highlight — the same way the focus ring was measured: `getComputedStyle` on the live control, ratios computed with the standard WCAG relative-luminance formula, at 1513px with the listbox open (`listbox_open_1513.png`) and a hovered/keyboard-active option forced via a `mouseenter` dispatch on the `AOW01` row to reach the same highlighted state a real keyboard user lands on (`listbox_active_option_highlight.png`).

| Pair | Sampled colours | Ratio | Threshold | Verdict |
|---|---|---|---|---|
| **Active-option highlight `--pr-surface-band` vs. popover surface** | `rgb(247,244,253)` vs `rgb(255,255,255)` | **1.09:1** | ≥3:1 (WCAG 1.4.11, non-text UI component) | **FAIL** |
| Group header (10px, `--pr-text-subtle`) vs. popover surface | `rgb(150,145,168)` vs `rgb(255,255,255)` | **3.04:1** | ≥4.5:1 (WCAG 1.4.3, normal text — 10px bold does not qualify as "large text") | **FAIL** |
| Option text (`--pr-text`) vs. popover surface | `rgb(43,40,56)` vs `rgb(255,255,255)` | 14.35:1 | ≥4.5:1 | PASS |
| Option text vs. active-option highlight | `rgb(43,40,56)` vs `rgb(247,244,253)` | 13.2:1 | ≥4.5:1 | PASS |
| Option count (`--pr-text-muted`) vs. popover surface | `rgb(107,101,128)` vs `rgb(255,255,255)` | 5.53:1 | ≥4.5:1 | PASS |
| Option code chip vs. popover surface | `rgb(93,88,114)` vs `rgb(255,255,255)` | 6.76:1 | ≥4.5:1 | PASS |
| Trigger label (`--pr-text-heading`) vs. trigger surface (`--pr-surface-card`) | `rgb(25,21,36)` vs `rgb(255,255,255)` | 17.89:1 | ≥4.5:1 | PASS |

**Two real, measured findings, both on the exact surface `OSF-DD-13` introduces:**

1. **The keyboard-active-option highlight fails WCAG 1.4.11 by a wide margin (1.09:1 vs. the required 3:1).** `--pr-surface-band` (`#f7f4fd`) against the popover's white background is barely distinguishable — confirmed visually in `listbox_active_option_highlight.png`, where the highlighted `AOW01` row is essentially imperceptible at a glance and only recoverable on close inspection. `aria-selected`/`aria-activedescendant` still carry the state to assistive tech correctly (this is a *visual* contrast gap, not a screen-reader gap), but a sighted keyboard user has no reliable visual cue for which option is active.
2. **Group headers ("AREAS OF WORK", "STRATEGIC OUTCOMES", "OUTSIDE THE THEORY OF CHANGE") fail WCAG 1.4.3 (3.04:1 vs. the required 4.5:1)** — also visible as noticeably faint text in the same screenshot.

Everything else sampled — option text, option count, option code chip, trigger label — clears its threshold comfortably (5.5:1–17.9:1). Page-level surfaces from attempt 1 (purple stat tile, card borders, status colours, hard rule 7's violet containment) were reviewed visually only, not re-measured this pass — narrowing that claim to what it actually is: reviewed at rest, listbox closed, not measured. No new issue found there, but "no issues found" is now qualified rather than blanket.

**Focus visibility: FAIL, confirmed by measurement — not just eyeballed.** Focused the scope control's trigger (`role="combobox"`) via script-triggered focus that genuinely matches `:focus-visible` (`el.matches(':focus-visible')` → `true`, confirming this isn't a `:focus`-vs-`:focus-visible` false negative). Computed styles at that moment: `outline: ... none ...`, `boxShadow: none`. **The control renders zero visible focus indicator when it receives keyboard focus** (`focus_ring_check.png` — no ring visible around "All areas and outcomes").

**Root cause, measured:** the trigger's class list (`program-overview.component.html:280`) is `... outline-none ... focus-visible:ring-2 focus-visible:ring-[var(--pr-focus-ring)]`. `getComputedStyle` confirms `--pr-focus-ring` is defined as a **full box-shadow expression** — `0 0 0 3px rgb(107 70 229 / 0.28)` — not a bare color. Tailwind's `ring-[...]` utility assigns its argument to `--tw-ring-color`, which expects a **color**; feeding it a box-shadow expression invalidates the ring's `box-shadow` computation silently. **Correction (rework):** attempt 1 said the correct pattern sits "three lines away in the same file" — verified by `grep` this pass, and that is wrong. The nearest correct usage, `focus-visible:shadow-[var(--pr-focus-ring)]` on the view-mode toggle buttons, is at `program-overview.component.html:944` — **664 lines away**, not three. `shadow-[...]` assigns directly to `box-shadow`, which is what `--pr-focus-ring`'s value is shaped for. This is still a one-utility-word slip (`ring-` vs `shadow-`) with a correct precedent elsewhere in the same file, not a missing design decision — only the distance was wrong.

This violates `OSF-NFR Accessibility`'s explicit MUST (*"carry a visible focus ring (`--pr-focus-ring`)"*) and WCAG 2.1 AA SC 2.4.7. **Reporting only — this is source-file scope, not `execution.md`, and outside this task's write authority.**

### Scope banner judgment (`OSF-T-7`'s deferred question)

**The mockup's `Showing {code} · {name}` banner is not needed** — confirmed across all five widths. The trigger's own label is always on-screen (full label at ≥1280px and <900px; code + truncated name at 1100–1280px, matching `OSF-DD-7`'s table exactly — spot-checked at 1100/1280, not paged pixel-by-pixel through the whole band). Independently, 3–4 other regions visibly change under the filter in the same viewport (stat tiles, AoW row count, card contents) — multiple redundant signals, not one fragile label carrying the whole disclosure.

**One caveat, non-blocking, recorded for the owner:** at 768px the trigger sits above a long, un-stickied AoW row list; a user scrolled deep into that list has no on-screen reminder of the active scope until they scroll back up. Not a new requirement — the trigger label itself is unambiguous, this is a "would a sticky mini-indicator be nice" observation, not a gap in what `OSF-AC-6`/`OSF-R-5` ask for.

### Not Done / Assumptions

- The 768px transient overflow (above) was root-caused and reproduced 4/4 at 768px, but **not** independently re-tested at 900/1100/1280/1600px with the same out-of-band (separate-round-trip) method — my captured 3-run sweeps at those widths read `diff 0` immediately after the click, but I cannot rule out the same one-frame flash occurring there too and simply not exceeding `clientWidth` because of more slack. Named gap, not smoothed over. **Now has an owner — carried into §12 Awaiting.**
- **Contrast** now covers the new control's own surfaces (trigger, listbox, group headers, active-option highlight, option text/count/code) — this rework's fix for issue 1. **Focus-visible** (a different WCAG criterion, 2.4.7 vs. 1.4.3/1.4.11) still covers the scope control's **trigger only**, not its listbox options, group headers, or the AoW row / `Report` button focus states. These are two different measurements; closing the contrast gap did not close the focus-visible one, and that narrower scope was accepted, not re-litigated, this pass.
- Client/server process ownership was not re-resolved (per the brief's explicit instruction); bundle freshness re-assertion at session start is the substitute, as instructed.
- Scope-label degradation at the exact 1100–1280px boundary steps (e.g. 1150px, 1200px) was not swept pixel-by-pixel; only the five DoD widths were measured, matching `OSF-DD-7`'s own table at the two spot-checked points (1100, 1280).
- The `OSF-AC-11` ten-cell table (see its section) was **not** re-run 3× per cell — the Reviewer's own stated fallback (a disclosed stability argument across five widths × two filter states, converted into a real comparison against the container's measured `padding-bottom: 32px`) was used instead, per the remediation instructions.

### Verification

The recorded numbers above **are** the verification, per the task's own instruction — there is no command to run. Browser restored to a sane unfiltered viewport (1261×900, ~1513px effective) at the end of this pass, and again after this rework pass (fresh page load, scope cleared, same viewport). No source file, test file, or other spec doc was touched in either pass — `execution.md` only, per the task's file boundary.

### Reviewer verdict — round 1 `FAIL`, remediated in attempt 2, Leader-verified

- **Status:** `[x]` **PASS** · **Date:** 2026-09-02 · **Implementer attempts:** 2 · **Reviewer rounds:** 1 `FAIL` → remediated → Leader-verified (no second round, per the run's ≤1-round budget)
- **Implements:** verification of `OSF-AC-6`, `OSF-AC-9`, `OSF-AC-10`, `OSF-AC-11`; `OSF-R-10` · **Design ref:** §12 Testing Strategy · **Skills:** `orca-cli` · **Effort:** high → **xhigh** on rework

**Attempt 1** produced the full measurement matrix and both RED findings, but the Reviewer returned `STATUS: FAIL` on three issues that were **one species: undisclosed unevenness, not wrong numbers.** The measurements were sound; the record claimed uniform rigour it had not uniformly spent. That is the failure mode most likely to survive review — nothing in it is false, and it misleads by what it leaves unsaid.

| # | Reviewer finding | Violated rule | Outcome in attempt 2 |
|---|---|---|---|
| 1 | "Contrast: no issues found" enumerated only surfaces that **predate this spec**; named no surface of the new scope control. No ratio, no sampled colour, no screenshot of the **open** listbox. `Not Done` disclosed the focus-coverage limit but was silent on the contrast one | `tasks.md` `OSF-T-8` DoD bullet 5 · `requirements.md` §9 D6 ("of the **new control**") · §7 Accessibility | **Found two real, previously hidden failures** — active-option highlight **1.09:1** (needs ≥3:1, WCAG 1.4.11) and group headers **3.04:1** (needs ≥4.5:1, WCAG 1.4.3) |
| 2 | The `OSF-T-2c` re-confirmation recorded **band state at 1 of 10 cells**. §5 is explicit the fix touched only the **collapsed** CTA, so an `overflowsParent` read on the expanded band proves nothing — and 1100/1280 bracket the 1138px where the defect lived | `execution.md` §5 advisory ("re-confirm **this CTA**") | Implementer **found a real race in its own method** (`window.scrollTo` does not dispatch `scroll` synchronously; the 1600px check had in fact read the *expanded* band). Fixed by polling for the collapsed testid; all 10 cells re-measured with state asserted — all clean |
| 3 | 3-run discipline applied to `OSF-AC-9` only and silently dropped elsewhere; the **768/900 `OSF-AC-10` cells carrying the `OSF-T-2b` gate answer were single reads** | `tasks.md` `OSF-T-8` Verification ("do not commit a single reading") | Run counts disclosed per table; 768/900 re-read 3× (zero spread); `OSF-AC-11` converted from an *assumed* padding claim into a measured comparison against `padding-bottom: 32px` |

**The Reviewer earned its round on issue 1.** "No issues found" was not merely under-evidenced — it was concealing two genuine WCAG failures on the exact element `OSF-DD-13` introduces. The diagnostic that found it was the *asymmetry*: focus was proved by `getComputedStyle` with values while contrast beside it rested on adjectives, with the same technique in hand and unspent.

**Leader verification (why no second Reviewer round).** The findings were closed-form, so remediation was verified directly rather than re-delegated:

- Both new contrast ratios **recomputed independently** from the sampled colours via the WCAG relative-luminance formula: `rgb(247,244,253)`→**1.087:1**, `rgb(150,145,168)`→**3.038:1**. Match.
- Sampled colours confirmed to be the **real tokens**, not eyedropped: `--pr-surface-band: #f7f4fd` and `--pr-text-subtle: #9691a8` (`colors.scss:183`/`:209`).
- Focus-ring root cause confirmed from source: `--pr-focus-ring` (`colors.scss:311`) is a **box-shadow value**, so `ring-[…]` feeds an invalid `--tw-ring-color` and paints nothing; `:944` et al. correctly use `shadow-[…]`. The "three lines away" error was corrected in place to **664 lines**.
- Scope held: `git status` unchanged from the pre-task baseline — `execution.md` only, no source file.

**One `Not Done` item adjudicated as NOT owed scope.** The record notes focus-visible was measured on the trigger only, not on listbox options. Structurally inapplicable: the listbox is an **`aria-activedescendant`** pattern (`program-overview.component.html:302` `tabindex="0"`, `:305` `aria-activedescendant`, options at `:310`/`:329` never take DOM focus), so `:focus-visible` cannot apply to an option. The active-option **highlight** *is* the whole keyboard indicator there — and that is exactly the surface measured at 1.09:1 and failed. The substantive question was answered; only the label was misleading.

**Kaizen signal — `KZ-OAH-1` recurred, in a spec that had already been warned.** The `OSF-AC-10` collapse is the same defect as the previous spec's row-grid starvation: rigid tracks (here three `max-content` neighbours) eating a `minmax(0,1fr)` identity column, invisible to every automated gate because jsdom measures nothing. `KZ-OAH-1`'s standardization is still `pending` on the default branch. The lesson was correct, was recorded, and did not reach the code — that gap, not the CSS, is the finding.

---

## 14. `OSF-T-2b` — AoW row hardening (`OSF-DD-8` ladder)

- **Status:** `[x]` **PASS** · **Date:** 2026-09-02 · **Implementer attempts:** 2 · **Reviewer rounds:** 1 `FAIL` → remediated → Leader-verified
- **Implements:** `OSF-R-10`, `OSF-R-11`; `OSF-AC-10` · **Design ref:** `OSF-DD-8` §8.2 · **Skills:** `angular-developer`, `ui-ux-pro-max` · **Effort:** high → **xhigh** on rework
- **Files:** `program-overview.component.html` · `program-overview.component.ts` (`achievementTooltip`) · `program-overview.scope.spec.ts` · `program-overview/CLAUDE.md`

### The ladder works — measured, both filter states, 3 runs at every gate width (zero spread)

| Width | Identity column before → after | AoW name before → after |
|---|---|---|
| 1100 | **0px** → **136.8px** | invisible → ellipsised |
| 900 | 82.3px → **236.4px** | 1–2 chars → near-full |
| 768 | 14.3px → **483.6px** | invisible → **full** |

`OSF-AC-9` held throughout: `scrollWidth === clientWidth` at all seven measured widths. The identity track was left `minmax(0,1fr)` at both sites and no scroller was added — both forbidden fixes avoided.

### Reviewer round 1 `FAIL` — two issues, both valid, both confirmed by the Leader

**Issue 1 — the task fixed one accessibility defect and introduced another at the same three widths.** Shedding the achievement column ≤1100px is correct per §8.2, and §8.2 *requires* a fallback — but the fallback was reachable by **mouse hover only**:

- `PrTooltipDirective` listens on `mouseenter` / `mouseleave` / `click`(→`hide`). **No `focus` listener.**
- The glyph was a bare `<span>` with no `tabindex` — not keyboard-reachable.
- `aria-label` on a **roleless span** wrapping an `aria-hidden` `<ng-icon>` — nothing reaches AT. This same file already knew better: `role="img"` was added to the bar ~10 lines below for exactly this reason.
- `prTooltipPinnable` unset, so on touch (768px is "tablet portrait" in `OSF-NFR-Responsive`) a tap fired `hide()` **and** bubbled to the row's `(click)="openAow.emit(row.code)"` — it navigated away.

Net: at 1100/900/768 the QA and Preliminary figures were unavailable to keyboard, screen-reader and touch users. **Every automated gate was green through this** — jest, `ng lint`, `ng build` — and the browser sweep confirmed the *name* was visible without ever asking whether the content moved *out* of the row was still reachable. Remediated to a `<button type="button">` with `[prTooltipPinnable]="true"`, `(click)="$event.stopPropagation()"`, `[attr.aria-label]="achievementTooltip(row.achievement)"` carrying the real figures, and `focus-visible:shadow-[var(--pr-focus-ring)]` (**not** `ring-[…]` — that is the live `OSF-T-9` bug and was deliberately not reproduced).

**Issue 2 — two of three boundaries were off by one; the bands did not tile.** The Implementer discovered that Tailwind v4 compiles `max-[Npx]` to `@media (width < Npx)` — **exclusive**, not `<=` — applied the fix to `max-[1101px]`, and did not apply it to the other two. Consequence: `max-[899px]` = ≤898 and `min-[900px]:max-[1101px]` = [900,1100], so **899px matched neither** and fell through to the base 5-track template at a width the spec says must stack.

**Leader decision:** use the design's own breakpoint values. Because `max-` is exclusive and `min-` is inclusive, `max-[N]` and `min-[N]` tile *exactly* at N — so `max-[900px]` / `max-[1280px]` are both correct and readable. `max-[1101px]` was kept for the ≤1100 rung (the defect occurs **at** 1100, so inclusive is right even though the DoD says "below 1100") with a comment recording that deliberate deviation.

**Leader verification of the boundary fix (in-browser, this session):**

| target | tracks | `grid-template-columns` | identity |
|---|---|---|---|
| **899** | **2** (stacked) | `550.425px 112.013px` | 550.43 |
| **900** | 4 (achievement dropped) | `225.638px 240px 54px 112.013px` | 225.64 |
| 1100 | 4 | `126.038px 240px 54px 112.013px` | 126.04 |

899 stacks, 900 takes the 4-track rung, no gap. Also verified: the `<button>` remediation is present with all five required attributes; the ladder's own boundaries are fully converted, and every remaining `max-[899px]`/`max-[1279px]` occurrence is either pre-existing `OSF-DD-7` code or prose inside the ladder comment.

### The transferable finding

**`max-[Npx]:` is `width < N`, not `<= N`.** This is the most valuable thing the task produced and it was promoted out of this log into `program-overview/CLAUDE.md`'s Invariants, alongside the rule that the two row sites must move in lockstep. A fact that lives only in an audit trail does not reach the next person editing the file.

### Pending items (for `/akili-archive`, default branch)

Five pre-existing sites carry the same exclusive-boundary property and were **deliberately not touched** (out of `OSF-T-2b`'s scope). Note the Implementer reported only the first two; the `max-[1279px]` trio was added by Leader review of the boundary inventory:

| Site | Class | Origin |
|---|---|---|
| `program-overview.component.html:267` | `max-[899px]:order-3` / `:w-full` / `:basis-full` | `OSF-DD-7` / `OSF-T-6` |
| `:352` | `max-[899px]:order-2` | `OSF-DD-7` / `OSF-T-6` |
| `:282` | `min-[900px]:max-[1279px]:hidden` | `OSF-DD-7` / `OSF-T-6` |
| `:285` | `min-[1100px]:max-[1279px]:flex` | `OSF-DD-7` / `OSF-T-6` |
| `:293` | `min-[900px]:max-[1279px]:block` | `OSF-DD-7` / `OSF-T-6` |

### Verification

`npx jest … dashboard-lab` → **707 passed** (701 baseline + 6 net new) · `npx ng lint --quiet` clean · `npx ng build` clean · browser sweep at 7 widths. Not committed.

### `OSF-AC-9` note — the 768px overflow is NOT this task's

The Implementer flagged a 47–48px page overflow at 768px unfiltered. The Leader reproduced it and traced it to `reporting-program-band`'s collapsed action group — a file this task never touched. It is recorded separately in §12 and is **not** attributable to this diff. See the `OSF-T-2c` correction note below.

---

## 15. `OSF-T-9` — Accessibility conformance of the scope control

- **Files:** `program-overview.component.html` · `program-overview.scope.spec.ts` · `execution.md` (this section, the DoD's own instruction — no other spec doc touched)
- **`colors.scss` NOT touched.** `--pr-surface-band` is unchanged — the hard constraint held. All three fixes are token/utility substitutions in the control itself.

### Before / after — measured, `OSF-T-8`'s own method (`getComputedStyle`, WCAG relative-luminance formula)

| Defect | Before | After | Threshold | Verdict |
|---|---|---|---|---|
| Focus ring (`:280`) | `boxShadow: none` (`--tw-ring-color` fed a box-shadow expression, invalid) | `boxShadow: rgba(107, 70, 229, 0.28) 0px 0px 0px 3px` — the real `--pr-focus-ring` value, `isFocusVisible: true` at capture | Visible indicator, WCAG 2.4.7 | **PASS** |
| Active-option highlight | `--pr-surface-band` `#f7f4fd` vs. popover white → **1.09:1** | `--pr-color-primary-300` `#6b46e5` border vs. popover white → **5.78:1** (recomputed: `rgb(107,70,229)` vs `rgb(255,255,255)`) | ≥3:1, WCAG 1.4.11 (non-text UI) | **PASS** |
| Group headers | `--pr-text-subtle` `#9691a8` vs. popover white → **3.04:1** | `--pr-text-muted` `#6b6580` vs. popover white → **5.53:1** (recomputed: `rgb(107,101,128)` vs `rgb(255,255,255)`) | ≥4.5:1, WCAG 1.4.3 (normal text) | **PASS** |

### What changed and why this approach over the alternatives

1. **Focus ring** — `focus-visible:ring-2 focus-visible:ring-[var(--pr-focus-ring)]` → `focus-visible:shadow-[var(--pr-focus-ring)]` at `:280`, matching the working precedent at `:944`/`:956`/`:968`/`:1152`/`:1164`/`:1176` exactly. `ring-2` dropped (redundant once `ring-[...]` is gone). No alternative considered — this is the one-utility-word fix the task specified, and the precedent already exists five other places in the same file.
2. **Active-option highlight** — added `border-2` to the option row (both the `null`/"All" row at `:308-319` and the grouped-option row at `:326-340`), colored `border-[var(--pr-color-primary-300)]` when active and `border-transparent` when not (so the border occupies the same box space in both states — no layout jump between hover/keyboard-move). `--pr-surface-band` tint is **kept** on the active row (`bg-[var(--pr-surface-band)]` still applies) — the border alone carries the required 3:1, so the soft fill stays exactly as designed. `--pr-color-primary-300` was chosen over the neutral `--pr-border`/`--pr-border-strong` tokens because those measure 1.27:1/1.46:1 against white — nowhere near 3:1 — and `colors.scss:15-16`'s own comment reserves `-300` for exactly this: *"Focus indicators come from `--pr-focus-ring` (built on -300); content borders are neutral (`--pr-border`)"*. This active-option highlight **is** a focus/keyboard indicator (the brief's own framing — `aria-activedescendant`, no DOM focus on options), not a content border, so the `-300` precedent applies rather than being overridden. An inset box-shadow was considered and rejected only because a border reads identically here and needs no extra utility. Rejected outright: repainting `--pr-surface-band` — the hard constraint.
3. **Group headers** — `text-[var(--pr-text-subtle)]` → `text-[var(--pr-text-muted)]` at `:323`. No new token minted; `--pr-text-muted` was already measured at 5.53:1 on this exact surface by `OSF-T-8` and is already in use elsewhere in this same listbox (the option-count span at `:339`), so this is a substitution, not a new decision.

### Visual judgment (screenshot, this multimodal model)

Listbox opened at 1513px effective (viewport 1261×900, dPR 0.8333), `AOW01` forced active via `mouseenter` (same method as `OSF-T-8`). **The active row is now obvious at a glance** — a clean violet outline box around "AOW01 Market Intelligence" that reads immediately as "this is the one," which is exactly what 1.09:1 failed to do (`OSF-T-8`'s own screenshot described the old highlight as "essentially imperceptible... only recoverable on close inspection"). The group headers ("AREAS OF WORK", "STRATEGIC OUTCOMES", "OUTSIDE THE THEORY OF CHANGE") read as legible, deliberate section labels rather than the faint grey noted in `OSF-T-8`. Trigger focus ring: a clearly visible violet glow around the "All areas and outcomes" trigger when tabbed to (real keyboard `Tab` via CDP input, not a synthetic `.focus()` — `:focus-visible` matched `true` at capture).

### `aria-selected` / `aria-activedescendant` — untouched (re-confirmed)

With `AOW01` forced active: `aria-activedescendant` on the listbox = `program-overview-scope-option-AOW01`; `AOW01`'s own `aria-selected` = `"false"` (it is the keyboard cursor, not the selection); `"All areas and outcomes"` keeps `aria-selected="true"` (the actual selection, untouched). No ARIA attribute was edited by this task — confirmed by diff, not just by intent.

### Verification

- `npx jest --silent --reporters=summary --no-coverage src/app/pages/result-framework-reporting/pages/dashboard-lab` → **712 passed** (707 baseline + 5 net new, all in the new `OSF-T-9` describe block in `program-overview.scope.spec.ts`).
- `npx ng lint --quiet` → clean.
- `npx ng build` → clean (pre-existing unrelated warnings only: `@let` unused in two other files, two unused imports in `dashboard-lab.component.ts`, initial bundle budget, two CommonJS deps — none touched by this task).
- Browser re-measurement: table above. Bundle freshness re-asserted before measuring (live `button[role="combobox"]` class list matched disk before any interaction).

### Not Done / Assumptions

- The jest regression guards (per the DoD's own instruction) assert **class presence/absence only** — jsdom cannot compute `box-shadow` from a class or evaluate a rendered contrast ratio, so the actual effect is proved only by the browser re-measurement above, not by the green jest run.
- `border-2` adds 2px on all four sides of every option row (active or not — the transparent-border state occupies the same space, so there is no jump between states), a small uniform increase in row height/available label width versus the pre-fix rows, which had no border at all. Judged acceptable: `truncate` + `title` already handle overflow on the name span, and the change is disclosed here rather than smoothed over.
- Icon/decorative elements in the listbox (the chevron at `:295`, the `aria-hidden` code/count spans) were left untouched — the DoD's three defects are text/background/focus-ring only; nothing else was measured or found failing by `OSF-T-8`.

### Reviewer verdict — `STATUS: PASS`, round 1, no rework

- **Status:** `[x]` **PASS** · **Date:** 2026-09-02 · **Implementer attempts:** 1 · **Reviewer rounds:** 1 PASS
- **Effort:** high · **Skills:** `angular-developer`, `ui-ux-pro-max`

**The check that decided it — 1.4.11 in the real adjacency.** The Leader flagged before review that measuring the new border against *white* could be an artefact: the border sits between the option's own `--pr-surface-band` fill and the popover surface, and 1.4.11 is about distinguishing **states**, not about a border being dark. A correct number can sit on an unmet criterion. The Reviewer measured **both** adjacencies:

| Indicator adjacency | Ratio | Threshold |
|---|---|---|
| Border `#6b46e5` vs the option's own fill `#f7f4fd` | **5.32:1** | ≥3:1 |
| Border `#6b46e5` vs popover white | **5.78:1** | ≥3:1 |

Both clear. And inactive rows carry `border-transparent` — no visible boundary at all — so the violet outline is the **sole** differentiator and the 1.09:1 fill is no longer load-bearing. The criterion is met, not just the number.

**Layout stability — the failure mode that would have been worse than the bug.** A `border-2` that appeared only on the active row would shift every option as the user arrows through the list. Verified by Leader grep: `border-2 border-[var(--pr-color-primary-300)]` ×2 and `border-2 border-transparent` ×2 — both branches of both ternaries (`:317` All row, `:336` grouped rows) carry the width. Nothing shifts.

**The guards have teeth.** The DoD demanded the negative half, and it exists: `not.toContain('ring-[var(--pr-focus-ring)]')` plus `not.toContain('ring-2')`. The Reviewer sanity-checked that positive and negative can both hold (`focus-visible:shadow-[var(--pr-focus-ring)]` does not contain the substring `ring-[var(`), and that pre-fix markup would have failed the negative. Leader-confirmed: **zero** `ring-[var(--pr-focus-ring)]` occurrences survive in the file.

**No regression across three stacked tasks in one uncommitted file.** `OSF-T-2b`'s ladder boundaries (`max-[900px]`/`min-[900px]`/`max-[1101px]`/`max-[1280px]`, 12 hits) intact; its fallback `<button>` keeps the correct focus token; the six precedent usages intact; no `aria-*` in any edited spot. The surviving `focus-visible:ring-2 ring-[var(--pr-color-primary-300)]` usages are **correct** — that token IS a colour, so `ring-[…]` is valid there. The bug was never "`ring-` is wrong", it was "`ring-` fed a box-shadow value".

**Hard constraint held.** `colors.scss` untouched (`git status` clean); `--pr-surface-band` still `#f7f4fd`. No new token minted — `--pr-text-muted` was reused and is semantically the muted *text* token already used for the option count in this same listbox, so this is not a "clears the bar but means something else" swap.

**Advisory, recorded not actioned:** on the fixed `!w-[300px]` popover the 2px border removes 4px of inner width, so labels truncate marginally earlier. Mitigated by the existing `truncate` + `title`.

### Verification

`npx jest … dashboard-lab` → **712 passed** (707 baseline + 5 guards) · `npx ng lint --quiet` clean · `npx ng build` clean · browser re-measurement on a genuine `:focus-visible` (real keyboard Tab via CDP, not a scripted `.focus()`). Not committed.

---

## 16. `OSF-T-10` — Close the 768px collapsed-band overflow

- **Status:** `[x]` **PASS** · **Date:** 2026-09-02 · **Implementer attempts:** 1 · **Reviewer rounds:** 1 PASS (conditioned on this section existing)
- **Implements:** `OSF-R-8`, `OSF-R-10` · **Design ref:** `OSF-DD-15` · **Files:** `reporting-program-band.component.html` (+`.spec.ts`)

### The fix — one utility, and it is the opposite of what was rejected before

`min-w-0` on the collapsed action group. The group is a flex item in the same axis as its `<nav>` parent, so it kept an automatic minimum equal to the sum of its children — meaning `OSF-T-2c`'s `min-w-0` + `truncate` on the CTA **could never engage**, because the group itself refused to shrink below ~400px.

**This is not a re-run of `OSF-DD-15` option 1, which `OSF-T-2c` rejected on evidence.** Option 1 was `shrink-0` — make the group *rigid* and let the nav's other children absorb the squeeze; §5 refuted that by measuring that those children (a `whitespace-nowrap` programme name, three unbreakable tab labels) have min-content == rendered width and could absorb nothing. `min-w-0` is the **opposite operation**: it removes the group's automatic floor so the group absorbs the squeeze *itself*, via truncation that was already built. It asks nothing of the siblings, so §5's rejection stands undisturbed — independently confirmed by the Reviewer against `design.md:366` and `execution.md:230`.

### Measured — band collapsed, testid asserted, 3 runs/cell, zero spread

| Width | Overview before | Overview after |
|---|---|---|
| **768** | **797/750 — 47px over** | **750/750 clean** |
| 900 / 1100 / 1280 / 1600 | clean | clean, unchanged |

**Leader-verified independently:** Overview @768 collapsed reads `{cw:750, sw:750, diff:0, collapsed:true}`. No regression at 1600 — and per the Reviewer's mechanism argument, none is possible: `min-w-0` removes a *minimum*, it applies no shrinkage of its own, and flex-shrink engages only when the line overflows, which it does not above the failure band. The full-label observation at 1600px is what the mechanism **predicts**, not a lucky sample.

### ⚠️ The Reporting tab at 768px is NOT clean — recorded honestly, not smoothed

`OSF-T-10`'s DoD requires `scrollWidth === clientWidth` on **both** tabs at 768px. **Reporting still reads 798/750 (48px over) after the fix.** That clause is **unmet**, and this section says so rather than claiming "both tabs clean".

It is unmet because the task's **measured premise was refuted**, not because the fix fell short. `tasks.md` attributed both surfaces' overflow to the band group at `:195` — one offender, two surfaces. That was wrong.

**Leader's own measurement on the Reporting tab, @768, band collapsed:**

| Signal | Value |
|---|---|
| `clientWidth` / `scrollWidth` | 750 / **798** (48px over) |
| `collapsed` | `true` |
| **Band action group `right`** | **718** — *inside* the 750 viewport |
| Offender found | `span.inline-flex.h-[30px].shrink-0.cursor-pointer…` at `right: 796`, width 93 |

718 < 750 is decisive: the band is fully contained and cannot be the cause. The offender resolves to **`reporting-aow-table.component.html`** (grep on the class signature), a different component outside this task's declared file boundary. The Implementer reached the same conclusion independently via a hide/restore experiment (798 → 750 → 798) — the same controlled-experiment method `OSF-T-1` and `OSF-T-2c` used.

**Why nobody separated these two defects before:** they were nearly the same magnitude — 47px (band) and 48px (table). Any page-level reading saw one number and attributed it to one cause. The larger masked the smaller, and fixing the larger is what finally exposed it.

**Disposition (Leader, on the Reviewer's independent recommendation):** close `OSF-T-10` against its **file boundary** with the 798/750 recorded as a refuted premise; **do not** amend the DoD text to say "Overview only". The Reviewer put the distinction sharply and it is worth preserving:

> Amending "both tabs" → "Overview only" *because the fix only got Overview* = smoothing. Recording that the measured premise was refuted, and re-partitioning accordingly = evidence-driven.

The residual is promoted to **`OSF-T-12`**.

### Advisory (recorded, deliberately NOT actioned)

The Implementer's second test duplicates three assertions that already exist verbatim in the `OSF-T-2c` describe block (`:266`, `:267`, `:287`). Not a tautology — it would fail if `OSF-T-2c` were reverted — but it guards nothing that was unguarded. Harmless, and not worth a rework round on a ~10-line diff.

### Verification

`npx jest … reporting-program-band` → **56 passed** · `npx ng lint --quiet` clean · `npx ng build` clean · browser numbers above, both tabs. Constraints held: no `overflow-x:hidden` added (Reviewer confirmed only two pre-existing `overflow` tokens in the file, neither on the band container), neither button removed or hidden, `OSF-T-2c`'s CTA chain preserved verbatim, tooltip untouched. Not committed.

---

## 17. `OSF-T-11` — Breakdown code column collides with long keys

- **Status:** `[x]` **PASS** on attempt 1 · **Date:** 2026-09-02 · **Reviewer rounds:** 1 PASS
- **Implements:** `OSF-R-13`, `OSF-R-10` · **Design ref:** `OSF-DD-9`, `OSF-DD-1` · **Files:** `program-overview.component.html`, `program-overview.scope.spec.ts`
- **Provenance:** owner-reported from the live app with a screenshot; root-caused by the Leader statically before any agent was spawned.

### The defect and the fix

The breakdown row's code column is a **fixed 62px** track and the code span had no `truncate`/`min-w-0`, so `INTERMEDIATE` (12 chars monospace ≈ 86px) overflowed its own track onto the name column. Measured before/after by the Implementer, which temporarily reverted the template, waited for the live rebuild, confirmed the bug in the served DOM, measured, then restored — a real before/after, not an asserted one:

| | `INTERMEDIATE` glyph right | name span left | Overlap |
|---|---|---|---|
| Before (1600 and 1100) | **206.98** | 196.58 | **true** (`codeScrollWidth` 86 vs `clientWidth` 62) |
| After | no glyph — `.pr-code` empty, `scrollWidth === clientWidth === 62` | 196.58 | **false** |

Owner's chosen fix: non-AoW rows render **no code chip**, because `INTERMEDIATE`/`EOI_2030`/`UNTAGGED` are internal enum keys, not user-facing codes like `AOW01`. Rejected alternatives are recorded in `tasks.md`; one is worth restating — **widening the track to `max-content` would have stolen width from the name column, the exact mechanism `OSF-T-2b` had fixed hours earlier in this same component.** It would have reintroduced the previous defect one card away.

### The check that mattered — the cell, not the span

The `@if` gates the **text inside** `<span class="pr-code">`, never the span itself. This is a CSS Grid row: an omitted grid item shifts every later column into the wrong track. Reviewer-verified at `:976-978`, following the achievement cell's documented precedent at `:683-691`. The new test also fails if someone later `@if`s the span away — it queries `.pr-code`, so a missing element throws. That is the strongest form the guard can take in jsdom.

Display-only confirmed: `selectScope(row.key)` untouched, and the Implementer round-tripped it live — clicking "Intermediate outcomes" (no visible code) produced `&scope=INTERMEDIATE` in the URL and filtered the page.

### Verification

`npx jest … dashboard-lab` → **715 passed** (712 baseline + 3, including the negative half) · `npx ng lint --quiet` clean · `npx ng build` clean · browser before/after + screenshots at 1600 and 1100.

### Advisory — investigated by the Leader, half refuted and half real

The Reviewer flagged that `scopeTriggerCode()` (`program-overview.component.ts:850`) returns `selectedScopeOption()?.key`, so the same enum key still paints in the scope **trigger** chip — a possible fourth `KZ-OAH-1` sighting, likely unmeasured by `OSF-T-8` because it sampled with "All" selected. **Leader measured it** at 999px with `?scope=INTERMEDIATE` active:

| Signal | Value |
|---|---|
| Visible chip | `INTERMEDIATE`, `scrollWidth` 98 === `clientWidth` 98 | 
| Overflows its box | **No** |
| Trigger right / viewport | 754 / 981 |
| Page | 981/981 — **no overflow** |

**The overflow half is refuted:** the trigger is a flex container, not a fixed track, so the chip takes its natural width. Not a `KZ-OAH-1` occurrence.

**The other half is real and is NOT a layout bug:** in the 900–1099px band the trigger displays `INTERMEDIATE` as the user-facing label — the very string this task just decided is an internal key users do not recognise. That is an inconsistency with `OSF-T-11`'s own owner decision, not a defect against any existing clause. **Recorded and escalated to the owner; deliberately NOT actioned** — turning an advisory into code is scope nobody approved, and this one needs a decision (extend the "no raw key" rule to the trigger, or accept that the trigger's code chip is a different affordance) rather than an implementation.

---

## 18. `OSF-T-12` — Reporting AoW table row-action overflow at 768px

- **Status:** `[x]` **PASS** · **Date:** 2026-09-02 · **Implementer attempts:** 1 + a 2-item rework · **Reviewer rounds:** 1 `FAIL` (folder-doc obligation) → remediated → Leader-verified
- **Implements:** completes `OSF-AC-9` on the Reporting tab at 768px · **Design ref:** `OSF-DD-14`, `OSF-DD-15`
- **Files:** `reporting-aow-table.component.html` · `.spec.ts` · `reporting-aow-table/CLAUDE.md`

### The hypothesis was REFUTED — and that is the finding

`tasks.md` proposed the `OSF-T-10` remedy: a missing `min-w-0` on the shrinking ancestor chain. The Implementer walked 8 ancestor levels with computed styles and **refuted it by measurement**. Reviewer-verified against the markup:

- Every header sibling really is `shrink-0`: chevron `:304`, code chip `:308`, ⓘ `:318`, count `:375`, ratio group `:386` and each of its children.
- The only shrinkable children — the AoW name (`:313`, `min-w-0 truncate`) and the `flex-1` spacer (`:379`) — were **already at 0px**.
- With both maxed out, the remaining fixed children still ran **~54px over** the 684.8px budget.
- **No un-`min-w-0`'d ancestor was missed:** the `<section>` at `:295` is a flex item of a **column** container (`:283`), so `min-width:auto` applies only on the vertical main axis. `OSF-T-10`'s remedy was **structurally unavailable**, not merely unchosen.

So this is a genuinely different mechanism from its sibling: in `OSF-T-10` the truncation machinery existed and could not engage; here it was fully engaged and insufficient.

### Fix and measurement

Below 900px the "By AOW" jump control collapses to a 30×30 icon-only square (`max-[900px]:w-[30px]`, `:justify-center`, `:px-0`, label `max-[900px]:hidden`); `aria-label` stays unconditional. Isolated by a live hide/restore experiment **before any code was written** — forcing the span to 30px closed 798→750 exactly, restoring brought it back.

| | Before | After |
|---|---|---|
| "By AOW" `right` (5 instances) | 795.08–798.82 | **731.82–735.55** |
| width | 93.26px | **30px** |
| Reporting @768 collapsed | **750/798 — 48px over** | **750/750** |

**Leader-verified independently:** `{cw:750, sw:750, diff:0, collapsed:true}`, five controls at 30px wide, `right` 732–736, all retaining `aria-label`. Full matrix clean at 900/1100/1280/1600 on both tabs — `OSF-T-10`'s result survives.

**The instruction that mattered:** this task forbade closing on an aggregate page number, because two co-located offenders of similar size (47px and 48px) are exactly what an aggregate cannot separate. The Implementer complied — a naive `rect.right > viewport` sweep returned thousands of hits (nearly all inside `.pr-collapse-inner`, which clips by design), so it wrote an **ancestor-clip-aware** sweep and reported **0 true offenders** in both band states across 3 runs.

### The judgment call — adjudicated, not waved through

The Implementer flagged that it hid a control's **visible label**, a move this spec has refused three times. The Reviewer judged it legitimate, narrowly, and the reasoning is worth keeping:

- `OSF-T-2c`/`OSF-T-10` refused to remove or hide **a reachable action** — this control stays present, operable, focusable, accessibly named, and 30×30 (above WCAG 2.5.8's 24×24 floor).
- `OSF-DD-15` forbids clipping — no `overflow` was added.
- `design.md` §9's "nothing is hidden silently" was the clause it **grazed**: the AT fallback was complete, the *sighted* fallback absent.

Decisive: **`OSF-DD-8`'s own ladder would have shed the achievement block first** (`:409-434`, ~181px, already tooltipped) to save 63px — shedding real QA%/Prel% data. Shedding a redundant label of a control whose icon and accessible name both survive is **more conservative than the spec's own sanctioned move**.

### Reviewer round 1 `FAIL` + one accepted recommendation

**FAIL:** the folder doc `.../reporting-aow-table/CLAUDE.md` gained no entry (`onecgiar-pr-client/CLAUDE.md` §10, same-commit). Remediated: a `Trampas` entry recording the collapse and its cause, that `aria-label` is unconditional **by design** and must stay so, and the Tailwind v4 boundary fact. `Verified:` correctly not re-stamped (nothing committed, no hash to stamp against).

**Recommendation, accepted — and it corrected a Leader error.** The original brief told the Implementer this file's convention was "icon-only with `aria-label` and no tooltip." **That was wrong.** The Leader had grepped only for `prTooltip` and missed the `title` attribute: `Copy link` (`:207`, `:922`) carries **both** `aria-label` and `title="Copy link"`. The real convention is that an icon-only control needing a name carries a hover affordance; only the universally-read `⋯` menu (`:224`, `:942`) goes bare — and `folder_open` does not self-describe "jump to the By-AOW view". `title="By AOW"` added at `:446`, matching `:207` verbatim, with the test extended to assert it alongside the unconditional `aria-label`. That single attribute converts the §9 grazing into full compliance — the `OSF-T-2b` shape (a fallback carrying the content) at one attribute instead of a fallback element.

### Verification

`npx jest … reporting-aow-table` → **103 passed** · `npx ng lint --quiet` clean · `npx ng build` clean · element-level browser numbers above. Leader-confirmed post-rework: `title="By AOW"` present, `aria-label` byte-identical and unconditional, 3 files touched. Not committed.

---

## 19. `OSF-T-13` + `OSF-T-14` — mockup drift: the missing bar column and the short codes

- **Status:** both `[x]` **PASS** · **Date:** 2026-09-02 · Executed in **one spawn** (same markup block, one verification pass — splitting them would have made the second re-touch the first's lines) · **Reviewer rounds:** 1 `FAIL` (on `T-14` only; `T-13` clean) → remediated → Leader-verified
- **Files:** `program-overview.component.{html,ts}` · `program-overview.scope.spec.ts` · `dashboard-lab.component.ts` + `dashboard-lab.scope.spec.ts` (accepted expansion, below)

### How this drift survived a full spec — the finding that outlives both fixes

Both defects were **visible in the approved mockup** the whole time. They shipped because **`OSF-DD-9` describes the breakdown without enumerating its columns**, and no task DoD ever said "match the mockup's column set". The pre-flight checklist records *Mockup approved*, but the mockup was never made a **gate**.

So `OSF-T-7` built the breakdown row with **three** columns where the mockup has **four**, and its Reviewer passed it — **correctly**. The Reviewer audited the DD text, and the diff satisfied the DD text. An approved mockup that no DoD references cannot fail anything.

**Leader error, recorded plainly:** when the owner first asked where the progress bar was, the Leader diagnosed statically against the template and answered that the breakdown "has no bar by design — it would be new functionality." That was false; the mockup was in the spec folder and was never opened. The subsequent `OSF-T-11` decision was then put to the owner as a four-option choice **none of which was the approved design's own answer** (short codes). `OSF-T-11` is annotated *approach superseded* rather than deleted — the record must show a decision was made and why it was reversed.

### `OSF-T-13` — the status bar column · PASS, clean on round 1

All three row shapes now carry `62px minmax(0,1fr) 150px 46px`, matching `mockup/Main.dc.html` exactly, with the subtotal and `All scopes` rows keeping an **empty but present** bar cell (mockup `:426`/`:436`) so the grid stays aligned. Segment widths computed in TS (`OAH-R-3` "honest at 1%" — never template arithmetic, no minimum-visible rounding), zero-denominator guarded by the file's own `row.count ? … : 0` precedent, denominator = all statuses so the three painted segments correctly need not sum to 100% — identical to the mockup's own `bucketTotal(r)`. `role="img"` + a real `aria-label` (`OAH-N-1`). Colours via `--pr-status-*-fg` tokens matching the mockup's raw hex, not hardcoded.

**The `KZ-OAH-1` risk was the reason this task was rated `high`** — adding a 150px **fixed** track to a row whose name column is `minmax(0,1fr)` is the exact starvation mechanism this spec hit three times. Measured, name column across the five widths: **908 / 589 / 409 / 209 / 337px**. No starvation, so no responsive fallback was needed. (768 measuring wider than 900 is not an anomaly: below `md` the scope control drops to its own row, freeing width — the same reason 900 is the squeeze band for the program band, see `OSF-T-15`.)

### `OSF-T-14` — short display codes · Reviewer `FAIL` round 1, remediated

`overviewScopeDisplayCode` — one exported pure function (`INTERMEDIATE`→`INT`, `EOI_2030`→`2030`, `UNTAGGED`→`—`, AoW passthrough), single-homed and called from **three** display sites: the breakdown cell, `scopeTriggerCode()` (closing §17's trigger inconsistency), and the popover's option list. Display-only: `row.key`, `selectScope(row.key)`, `PROGRAMME_RESULTS_QUERY_PARAM_MAP`, `OverviewLink` and `?scope=` all unchanged, verified by a live round-trip.

**The FAIL — and its shape is the point.** `scopeTriggerCode()` returning `—` for `UNTAGGED` meant that in the **900–1099px** band, where the trigger renders *only* the code chip (the label spans are `display:none` there, and `display:none` content is excluded from accessible-name computation) and the `<button role="combobox">` carries no `aria-label`, `title` or `sr-only`, **the combobox's accessible name became a bare em-dash.** Before this task it was `UNTAGGED` — unhelpful, but non-empty. Leader-confirmed: the button has only `aria-controls`/`aria-expanded`/`aria-haspopup`, and at 999px exactly one span is visible.

**This is the second time in this spec a task fixed an accessibility defect and introduced another at the same widths** — §14 records the first (`OSF-T-2b`'s hover-only fallback). Both times the pattern was identical: **the correct treatment was applied at one site and not carried to the site the task itself added.** The breakdown row was right all along (code `aria-hidden`, name carries the meaning); the trigger — which `OSF-T-14` had just routed through the same mapping — was not.

Remediated by applying that same treatment: `aria-hidden="true"` on both trigger code chips, plus an unconditional `sr-only` span carrying `scopeTriggerLabel()`. **`sr-only` was chosen over `aria-label` deliberately:** `aria-label` replaces the accessible name outright, risking WCAG 2.5.3 (label-in-name) for voice-control users at widths where the visible text is not contained in it. An `sr-only` span composes, so the visible text is always a *subset* of the accessible name, never absent from it.

**Leader-verified live at 999px with `?scope=UNTAGGED`:**

| | Accessible name | Visible chip | Page |
|---|---|---|---|
| Before | **`—`** | `—` | — |
| After | **`Not tagged to a ToC area`** | `—` (unchanged) | 981/981, no pixel moved |

The new test asserts the `sr-only` span exists, is not `aria-hidden`, carries the full label, and that both trigger chips **are** `aria-hidden` — it fails against the pre-rework markup, where no `sr-only` span existed. The prior `scopeTriggerCode() === '—'` assertion could not see the defect at all.

### Accepted file-scope expansion

`dashboard-lab.component.ts` (+ its spec) was outside the declared file list: `OverviewScopeOption` had no `byStatus`, so the counts could not reach `program-overview`. **Accepted.** `OSF-T-13`'s DoD required the data come from the existing payload and mandated a STOP only if the counts were *not* in it — they are (`ScopeBucket.byStatus`, shipped by `OSF-T-3`); only the client plumbing was missing, so the STOP condition never triggered. Zero new fetch, zero server change. Same precedent as `OSF-T-4`'s accepted `entity-details.interface.ts` expansion (§8). The Implementer flagged it for sign-off rather than burying it — the correct behaviour.

### Verification

`npx jest … dashboard-lab` → **725 passed** (715 baseline + 10) · `npx ng lint --quiet` clean · `npx ng build` clean · browser: five-width name-column sweep, `INT`/`2030`/`—` fitting the 62px track, live `selectScope` round-trip, accessible-name reading above, screenshots compared against `Main.dc.html`. Not committed.

---

## 20. `OSF-T-15` — Complete `OSF-T-10` at 900px

- **Status:** `[x]` **PASS** on attempt 1 · **Date:** 2026-09-02 · **Reviewer rounds:** 1 PASS
- **Implements:** completes `OSF-AC-9` at 900px on the Overview · **Design ref:** `OSF-DD-15` · **Files:** `reporting-program-band.component.{html,spec.ts}`

### The fix, and why it is not a re-run of what `OSF-T-2c` refused

The Back button now mirrors the CTA's `OSF-DD-15` chain: `min-w-0` on the button (`:212`), `shrink-0` on the icon (`:216`), label in `<span class="min-w-0 truncate">` (`:217`).

**The distinction the Reviewer drew, and it is the one that matters:** §5 rejected exactly one thing — `OSF-DD-15` **option 1**, `shrink-0` on the group so the nav's *other* items absorb the squeeze — refuted by measuring that the collapsed programme name (`:146`, `whitespace-nowrap`, no `truncate`) and the three tab labels are unbreakable tokens whose min-content equals rendered width. It then **chose option 2** (let the label truncate) and kept Back `shrink-0` because at nav-879px the CTA still had ~154px of label to give.

This task asks the siblings for **nothing**. It applies §5's *own chosen option 2* to the group's **second** child, once the first hit its floor — `OSF-T-15` measured the CTA at **24px, icon-only**, at 900 collapsed. An extension of the surviving decision, not a revival of the refuted one, and the first-ranked candidate in this task's own Leading Hypothesis, so spec-authorised rather than improvised.

| Overview @900, collapsed | Before | After |
|---|---|---|
| Back button | `right 944, width 193` | `right 794.56, width 43.9` |
| CTA | `right 976, width 24` (already at floor) | `right 850, width 47.45` |
| **Page** | **882/980 — 98px over** | **882/882 clean** |

**Leader-verified on a fresh page load:** `{cw:882, sw:882, diff:0, collapsed:true}`. Post-fix ancestor-clip-aware sweep returned zero offenders. All five widths × both band states clean on the Overview; Reporting clean at 768/1100/1280/1600.

### Tests: the assertion was inverted, not dropped

The Implementer removed `OSF-T-2c`'s "Back stays `shrink-0`" assertion. **That is legitimate here and the Reviewer verified why:** it pinned *the allocation itself*, which was deliberately superseded, and it was **inverted in place** at `:339-340` rather than deleted. Per `KZ-OAH-3` ("a dead-code removal that drops a test must name the surviving assertion that carries each invariant"), every collateral invariant has a named guard: icon never squeezed `:358`; label carries the **full** value `:350` (`toBe(component.backLabel())`); handler fires `:361-369`; presence + click while collapsed `:671-676`; `backLabelOverride` `:678-683`. The two `OSF-T-10`-block assertions now guard precisely the two things this task's DoD requires be preserved.

### `OSF-R-10` satisfied — and this is NOT the §14/§19 pattern

The Back label now truncates, and `[attr.aria-label]="backLabel()"` carries the identical full string, so the accessible full value is present and WCAG 2.5.3 is safe (name ≡ visible text). **Twice this spec saw a task fix one accessibility defect and introduce another** (§14, §19), both by applying the treatment at one site and not the site the task touched. Here the treatment is present at the changed site. §5's standing kaizen item (this file's `truncate`-without-`title` convention) is not worsened in kind — CSS truncation never alters the accessible name — only in count.

### ⚠️ Reporting @900 does NOT close — recorded honestly, promoted to `OSF-T-16`

`OSF-T-15`'s DoD requires both tabs clean at 900. **Reporting reads 882/1059 — 177px over.** That clause is unmet, and this section says so rather than claiming otherwise.

It is unmet because the residual is **not the band**. Leader-measured on fresh loads: **177px with the band expanded AND collapsed** — identical, which rules the band out — while `OSF-T-15` left the band's own elements fully contained (`Back right 794.56`, `CTA right 850`, both inside `cw 882`). Offenders are a **444px `shrink-0` ratio/achievement group** and a 168px achievement block in `reporting-aow-table.component.html`, a file this task was explicitly forbidden to touch.

Same disposition as `OSF-T-10` (§16): closed against its **file boundary**, with the 177px recorded, and the residual promoted to **`OSF-T-16`**.

### The pattern — FIFTH instance, and the one lesson to carry out of this spec

`OSF-T-2c`, `OSF-T-8`, `OSF-T-10`, `OSF-T-12`, and now `OSF-T-12` again via this task: **a width fix verified at 768 and inferred for the rest.** Every single time, 900 was the width that failed.

On this surface the inference is invalid: at 768 the sidebar is `hidden md:block` and the identity block drops; at 900 the 64px rail renders, so the row has **less** room despite the wider viewport. **900 is the squeeze band** — the worst case sits between "things hide" and "there is room", not at the narrowest viewport.

### Methodology ruling — and it applies to the Leader

`OSF-T-15` found that **several `set viewport` calls in sequence on one page load** produced a non-reproducible false positive (768 Reporting briefly reading 245px over) which did not reproduce across four fresh isolated loads. It excluded that reading and re-measured every width via fresh loads. The Reviewer ruled this **correct practice, not signal-discarding**.

**Consequence for this spec's record:** several Leader spot-checks used the sequential-resize method. The decisive readings were re-taken on fresh loads (including Overview @900 and Reporting @900 above), but any loop-taken reading in this log should be treated as **indicative, not record**. Written into `OSF-T-16`'s DoD so the next measurement does not inherit the flaw.

### Verification

`npx jest … reporting-program-band` → **59 passed** (56 baseline, one assertion inverted, four added) · `npx ng lint --quiet` clean · `npx ng build` clean · element-level browser numbers above, fresh loads, 3 runs at 900 with zero spread. Not committed.

---

## 21. `OSF-T-16` — Complete `OSF-T-12` at 900px

- **Status:** `[x]` **PASS** on attempt 1 · **Date:** 2026-09-02 · **Reviewer rounds:** 1 PASS
- **Implements:** completes `OSF-AC-9` at 900px on the Reporting tab · **Design ref:** `OSF-DD-8` §8.2 · **Files:** `reporting-aow-table.component.{html,ts,spec.ts}` + folder `CLAUDE.md`

### The fix — and the first time in this spec that shedding content got the treatment right on attempt 1

The achievement block (`w-[168px] shrink-0`) gets **`max-[1100px]:sr-only`**, deliberately **not** `hidden`. `display:none` would have removed the QA / Prel / coverage figures from the accessibility tree with nothing else in the row naming them — `OSF-R-8`, and §14 all over again. `sr-only` drops the block out of the flex row's width while keeping it AT-readable.

The sighted-hover fallback (§8.2's own "available in the row tooltip") moved to a new `rowTitle(group)` composing `ratioTitle` + `achievementTooltip` onto the **group** span's `title` — the 1px `sr-only` span is pointer-unreachable, so the treatment had to be carried to an element that stays reachable. Exactly `OSF-T-12`'s "By AOW" pattern.

**Boundary chosen on evidence, not convenience:** `max-[1100px]`, not `900`. `max-[Npx]` compiles to `width < N` — **exclusive** — so `max-[900px]` would not fire at exactly 900, the failing width. This spec had already paid for that in §14 (the 899px gap). And 1100 is what `design.md:243` states verbatim: *"900–1100 | achievement column leaves the grid entirely — available in the row tooltip."* Bands tile cleanly: ≥1100 none · 900–1099 `sr-only` · <900 both.

| Reporting @900 | Before | After |
|---|---|---|
| Page | **882/1059 — 177px over** | **882/882** |
| Ancestor-clip-aware sweep | offenders present | **0 offenders** |

**Leader-verified on the correct page with real data** (`pulse:0`, 5 AoW groups rendered): `{cw:882, sw:882, diff:0, offenders:0}`; achievement block `width 0.99px`, `position:absolute`, text `"QA 3.3% Prel. 2.1% 24 of 30 indicators"` still in the DOM, **`aria-hidden` null**, group `title` 185 chars. Full 20-cell matrix (5 widths × 2 band states × 2 tabs, fresh loads) clean; `OSF-T-10`, `OSF-T-12` and `OSF-T-15` all survive.

**Leader error, recorded:** the first verification attempt measured `/overview`, where `reporting-aow-table` does not render at all — a clean `882/882` that proved nothing. Caught because the selectors found no achievement block, and re-measured on the Reporting tab. **The same failure this whole spec is about: the right number in the wrong condition.**

### Advisory — recorded, NOT actioned

`PrTooltipDirective` has `mouseenter`/`mouseleave`/`click` and **no `focus` listener**, and the `title` sits on a `<span>` with no `tabindex` — native `title` is hover-only. So below 1100px a **sighted keyboard-only or touch** user sees the shed figures nowhere. The Reviewer recommended rather than gated, correctly: §8.2 sanctions the shed and names the row tooltip as its fallback, and — unlike §14 — nothing left the accessibility tree.

This is the **same standing kaizen item §5 already raised** about this file's `truncate`-without-`title` convention leaving exactly that user unserved. It is a codebase-wide convention question, not this task's defect; it belongs in the archive's Kaizen, not in a new task minted from an advisory.

### Pending item

The folder `CLAUDE.md` is now **133 lines against a 120-line cap** — it was already 125 before this task. The Implementer added its entry and declined to trim other tasks' content. Correct restraint; the trim belongs on the default branch as a pending item.

### Verification

`npx jest … reporting-aow-table` → **108 passed** (103 baseline + 5, including the negative half asserting `hidden` is *absent*, which is what catches a later swap) · `npx ng lint --quiet` clean · `npx ng build` clean · 20-cell browser matrix on fresh loads. Not committed.

---

## 22. Spec complete — 18/18

Every `OSF-T-*` is `[x]`. `OSF-AC-9` is green at **5 widths × 2 band states × 2 tabs**, verified on fresh page loads with a readiness gate.

### The measurement family — six distinct ways to get a true number that answers the wrong question

Not one of these was visible to `jest`, `ng lint` or `ng build`. Every one produced a confident, defensible "clean".

| # | The trap | Where it bit |
|---|---|---|
| 1 | `overflowsParent` instead of page level — true, and irrelevant | `OSF-T-2c`, `OSF-T-8` |
| 2 | Page level with the band **expanded** — the wrong condition | `OSF-T-8`, `OSF-T-10` |
| 3 | Verified at 768, **inferred** for 900 — the squeeze band | `OSF-T-10`, `OSF-T-12` |
| 4 | Two offenders of **similar size** masking each other (47px / 48px) | `OSF-T-2c` → `OSF-T-12` |
| 5 | `set viewport` in **sequence** without reload — irreproducible readings | `OSF-T-15` |
| 6 | Reading during the **loading skeleton** — no data, nothing overflows | `OSF-T-16` |

**The squeeze band is the single most transferable fact:** 900px is *more* constrained than 768px, because at 768 the sidebar is `hidden md:block` and the identity block drops, while at 900 the 64px rail renders. "If the narrowest passes, the wider ones pass" is **invalid on this surface** — and that one inference caused traps 2, 3 and 4.

### The other recurring shape

**Twice a task fixed an accessibility defect and introduced another at the same widths** — §14 (`OSF-T-2b`'s hover-only fallback) and §19 (`OSF-T-14`'s bare em-dash accessible name). Both times the correct treatment already existed at one site and was not carried to the site the task itself added. `OSF-T-16` broke the streak by carrying it on the first attempt.

### And the structural gap that let two defects ship

`OSF-DD-9` describes the breakdown without enumerating its columns, and no DoD said "match the mockup's column set". The pre-flight records *Mockup approved*, but the mockup was never a **gate** — so `OSF-T-7` shipped three columns where the mockup has four, and its Reviewer passed it correctly, auditing the DD text the diff satisfied. **An approved mockup that no DoD references cannot fail anything.**

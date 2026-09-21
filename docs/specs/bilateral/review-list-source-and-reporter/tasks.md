# Tasks — Source and Reporter on the Bilateral review list

## 1. Scope of this task list

- **Module / feature:** `bilateral` — Source & Reporter on the Bilateral review result list (`BSR`)
- **Linked spec:** `./requirements.md` + `./design.md`
- **Depth:** Lite · **Approval Mode:** pre-approved (Juan Carlos Cadavid, 2026-09-21)
- **Owner:** Juan Carlos Cadavid
- **Status:** executed (all 6 tasks `[x]`; `/akili-test` and `/akili-validate` still ahead of `shipped`)
- **Budget (design.md §12A):** 6 tasks · ~680 LOC · 2 review rounds. **Tripwire:** stop and escalate above ~750 LOC or 8 tasks.

## 2. Pre-flight checklist

- [x] `requirements.md` approved
- [x] `design.md` approved
- [x] Open questions resolved or explicitly deferred (`BSR-OQ-1`, `BSR-OQ-2` — both non-blocking, recorded in `design.md` §13)
- [x] CLARISA dependencies confirmed — none; `external_platform_code` is stored on `result`
- [x] No conflicting in-flight spec on the same entities — `bilateral/bulk-uploader-handoff` touches `api/bilateral` but not this query or this table
- [x] **No migration** in this spec (`design.md` §3.2) — `migration:check` must still be green and unchanged

---

## 3. Task list

### `BSR-T-1` — List payload: three additive fields `[x]`

- **Type:** `server`
- **Description:** Extend `getResultsByProgramAndCenters` to select `r.creation_method`, `r.external_platform_code` and a resolved `reporter_name` (two `LEFT JOIN users`: `external_submitter` first, `created_by` as fallback), add the two per-result columns to the `GROUP BY`, and add all three keys to the service's closed-allowlist mapper.
- **Implements:** `BSR-R-1`, `BSR-R-2`, `BSR-AC-1`, `BSR-AC-2`
- **Files (expected):** `onecgiar-pr-server/src/api/results/result.repository.ts` (~3226-3380) · `results.service.ts` (~3646-3662) · `result.spec.ts` · `result.repository.spec.ts`
- **Depends on:** `—` · **Blocks:** `BSR-T-3`, `BSR-T-4`
- **Estimate:** `M` · **Review:** `full` — payload contract change (AC-4) + SQL aggregation
- **First step (settles `P-11`):** run the new query against a TEST-environment program and record the non-null `reporter_name` ratio in `execution.md`. If the ratio is ~0, stop and report before building the UI on it.
- **Verification:**
  - **Falsifier:** feed the mapper a raw row `{creation_method:'EXTERNAL', external_platform_code:'STAR', reporter_name:'Ana Pérez', …}` and assert all three keys **and** the 14 pre-existing keys survive. Mutation that must turn it red: drop one key from the mapper's object literal → the assertion for that key fails. A fixture with only the three new keys would be inert — the pre-existing 14 must be asserted in the same test.
  - **Red run:** `npx jest src/api/results/result.spec.ts src/api/results/result.repository.spec.ts --silent --reporters=summary --forceExit` — red before (keys absent), green after.
  - **Disqualifier:** if the `users` joins change the row count for a fixed `(programId, versionId)` — measured on TEST data, not asserted from the SQL text — the join design is wrong; re-specify rather than patch with `DISTINCT`. Also: a SQL-string spec is a **presence assertion** — it proves the alias is in the string, never that MySQL returns it. That gap is closed by `BSR-T-6`'s HITL check, not by this task.
  - **Consumers:** `bilateral-review.component.ts:1112` · `bilateral-review-count.service.ts:95` · `bilateral-results.service.ts` · `results-center-reporting-guide.component.ts:161` · `dashboard-lab.component.ts:2032`,`:2600` · `where-to-report-modal.component.ts:105` · `programme-results.component.ts` · `results-list.component.ts` · `notification-item.component.ts` + their spec files (31 files reference `ResultToReview`). All read named fields; none asserts an exact shape (`design.md` P-8). Server side: `result.spec.ts:1520-1560` is the only spec over this mapper.
- **Definition of done:**
  - [x] `P-11` settled and recorded in `execution.md` — 215/215 non-null `reporter_name` (100 %), row count 215 → 215 unchanged
  - [x] Repo spec asserts: the three new aliases present · **every previously selected alias still present** · `?` count === params length · both `users` joins are `LEFT` · the two new per-result columns are in the `GROUP BY` — all SELECT-scoped after the attempt-1 FAIL, proven with four red mutations
  - [x] Server Jest green; coverage thresholds held
  - [x] Lint clean · no secret logged

### `BSR-T-2` — Stamp `creation_method = EXTERNAL` on API ingestion `[x]`

- **Type:** `server`
- **Description:** Add `creation_method: ResultCreationMethod.EXTERNAL` to the bilateral ingestion header save **and** to the knowledge-product type handler's own header, so no API-ingested result falls through to the `UNKNOWN` DB default.
- **Implements:** `BSR-R-3`, `BSR-AC-3`
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts` (~4161-4181) · `onecgiar-pr-server/src/api/bilateral/handlers/knowledge-product.handler.ts` (~58) · their specs
- **Depends on:** `—` · **Blocks:** `—` (parallel-safe with T-1)
- **Estimate:** `S` · **Review:** `full` — writes a persisted provenance column
- **Verification:**
  - **Falsifier:** a spec that ingests a DTO through each of the two header paths and asserts the saved payload carries `creation_method: 'EXTERNAL'`. Mutation that must turn it red: remove the key from either save → that path's assertion fails. **Both paths need their own case** — a single-path test is inert against the KP handler, which builds its own header.
  - **Red run:** `npx jest src/api/bilateral --silent --reporters=summary --forceExit` — red before, green after.
  - **Disqualifier:** if any reader of `creation_method` branches in a way that changes behavior when the value moves `UNKNOWN → EXTERNAL`, stop. Known readers swept at `da132347c`: `bilateral-center.service.ts:556` (gates on `!== 'AI'` — unaffected) and the two repository SELECTs (`:3406`, `:4126`, display only).
  - **Consumers:** `grep -rn "creation_method" onecgiar-pr-server/src --include="*.ts"` → 24 matching lines; the only behavioral reader is `bilateral-center.service.ts:556`.
- **Definition of done:**
  - [x] Both header paths stamped; specs cover both
  - [x] No migration added (`design.md` DD-5)
  - [x] Server Jest + lint green

### `BSR-T-3` — Source chip component + the derivation function `[x]`

- **Type:** `client`
- **Description:** Add a pure exported `resolveBilateralSource({ method, platformCode })` returning a discriminated descriptor, and a presentational `bilateral-review-source-chip` (`OnPush`) that renders the AI case through `AiProvenanceNoticeComponent variant="badge"`, the three neutral cases as a pill, and the absent case as the module's placeholder pair. Copy in `bilateral-review.copy.ts`.
- **Implements:** `BSR-R-4`, `BSR-R-5`, `BSR-R-7`, `BSR-R-10`, `BSR-R-11`, `BSR-AC-4`, `BSR-AC-5`, `BSR-AC-6`
- **Files (expected):** `…/bilateral-review/components/bilateral-review-source-chip/*` (new) · `bilateral-review.copy.ts`
- **Depends on:** `—` · **Blocks:** `BSR-T-4`, `BSR-T-5`
- **Estimate:** `M` · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** a table-driven unit test over **all seven rows** of the `BSR-R-4` matrix, including the two that a naive implementation gets wrong: `('UNKNOWN','MEL') → "Via API · MEL"` and `('UNKNOWN', null) → placeholder`. Mutation that must turn it red: make the `UNKNOWN` branch fall to the placeholder unconditionally → the `'MEL'` row fails. A matrix missing the `UNKNOWN`+code row is an **inert fixture** — the naive and correct implementations agree on every other row.
  - **Red run:** `npx jest src/app/pages/result-framework-reporting/pages/bilateral-review/components/bilateral-review-source-chip --silent --reporters=summary --no-coverage` — red before (no component), green after. Plus `npx tsc --noEmit` (D6).
  - **Disqualifier:** if rendering the APF badge inside a table cell forces a layout change to that shared component, stop — the chip must adapt, never the APF component (APF-R-12 owns it).
  - **Consumers:** `none (new component; no shared symbol changed)`. The APF component is **imported, not modified** — verify with `git diff --stat` that nothing under `pages/bilateral/components/ai-provenance-notice/` is touched.
- **Definition of done:**
  - [x] Seven-row matrix green, including both `UNKNOWN` branches — plus the named mutation proven red
  - [x] `grep -rn "Generated with AI assistance" onecgiar-pr-client/src` returns **7** hits, **unchanged** from the pre-spec baseline, with **no new occurrence introduced by this task** (D7, corrected at execute time — see `requirements.md` §8)
  - [x] Chip carries an accessible name; placeholder carries its `sr-only` string
  - [x] Only `--pr-*` tokens; no new hex; no `--pr-color-*-100` fill; no status-pair recombination
  - [x] All strings via `bilateral-review.copy.ts`

### `BSR-T-4` — SOURCE column, colgroup rebalance, SUBMITTED cell, narrow card `[x]`

- **Type:** `client`
- **Description:** Insert the SOURCE column after Lead Center in all wide table variants; **edit `columnWidths()` as the conditional builder it is** (`design.md` P-7 / DD-2) — lead center `110→88` inside the `showCenterColumn()` branch, `'116px'` pushed **outside** it, alignment `220→192` **(re-tuned to `184` at execute time on measurement — see `design.md` DD-2)** — so project mode emits 8 entries and center-grouped mode 7; bump `columnCount()` 7/6 → 8/7; give the SOURCE `<td>` `whitespace-nowrap` and wrap the chip in a cell-owned `<span class="block truncate max-w-full">` (the delegated AI badge has no nowrap of its own and its host is `display: contents`); turn the date cell into the two-line SUBMITTED cell at the pinned `leading-[15px]` / `leading-[13px]`; update the Alignment `td`'s `min-w-[220px]` → `min-w-[184px]` (as re-tuned); add the chip and the reporter to the narrow cards branch; update **all twelve** pinned consumers in `design.md` §1B, including inserting the `source` copy key **between `center` and `status`**.
- **Implements:** `BSR-R-4`, `BSR-R-6`, `BSR-R-7`, `BSR-R-8`, `BSR-AC-7`, `BSR-AC-8`, `BSR-AC-9`, `BSR-AC-11`, `BSR-AC-13`, and the layout NFRs
- **Files (expected):** `…/components/bilateral-review-table/bilateral-review-table.component.{ts,html}` · `bilateral-review.copy.ts` · `bilateral-review-table.component.spec.ts` · `bilateral-review.cy.ts`
- **Depends on:** `BSR-T-1`, `BSR-T-3` · **Blocks:** `BSR-T-6`
- **Estimate:** `L` · **Review:** `full` — shared `<colgroup>` + the design-token surface
- **Verification (rendered-measurement checklist applies — this gate asserts size, overflow and position):**
  - **Baseline first:** re-measure Title's width at 1280 and 1000 **before** the change and record both numbers in `execution.md`. The design's `530.5 / 250.5` is a carried-over figure; a gate built on an unre-measured baseline cannot tell a regression from a pre-existing state.
  - **Two viewports that differ on the dimension under test:** **1280** and **1000** — 1000 is the squeeze band where Title starves. Plus **375** for the narrow branch. Effective CSS px; CT root zoom is 1 (module CLAUDE.md), and each gate asserts its effective width rather than assuming it.
  - **Geometry, not classes:** read `getBoundingClientRect()` / `scrollWidth` / `clientWidth`. Measure the **real `.overflow-x-auto` scroller** inside the group card, never the `overflow-hidden` `<section>` (that comparison is a tautology — BRH-T-3 attempt 3 Reviewer FAIL) and skip-but-count collapsed cards so the gate cannot pass vacuously.
  - **Fonts:** the CT harness must have the production text and icon faces loaded, or a missing glyph produces a false red (the `changes--aow-identity-column-starvation` lesson).
  - **Falsifier:** set the SOURCE `<col>` to `300px` → Title must stop being the widest column at 1280 and the gate must go red. If it stays green under that mutation, the gate measures nothing. Second falsifier: an 8-character lead-centre acronym row must not wrap its `th` at 1000px (the DD-2 reversion-challenge risk). **Third falsifier (chip fit, Reviewer round 1):** the gate must include a `creation_method: 'AI'` row and a `('EXTERNAL','STAR')` row and assert each chip renders on **one line** (`offsetHeight` of the chip ≤ its single-line height) and is not ellipsized below its full label; remove the SOURCE cell's `whitespace-nowrap` → the AI badge (≈88px, no nowrap of its own) must wrap and the gate go red.
  - **Center-grouped mode is its own case, not a variant of project mode:** mount with `groupMode: 'center', view: 'grouped'` and assert **7** `<col>` over **7** `<th>`, left-edges aligned. A flat-literal widths array passes project mode and fails only here — which is why this case is named explicitly.
  - **Red run:** `npx cypress run --component --spec "src/app/pages/result-framework-reporting/pages/bilateral-review/components/bilateral-review-table/bilateral-review-table.cy.ts"` — Gate 7 (column-left parity across 4 cards at 1280 and 1000) is the existing gate and must stay green with 8 columns. Then `npx jest …/bilateral-review-table.component.spec --silent --reporters=summary --no-coverage`. Then `npx tsc --noEmit` **and** `npm run build` (templates are only typechecked by the build — client `src/CLAUDE.md` §21.7).
  - **Disqualifier:** if any of the three row-height caps (46 / 50 / 68 at `bilateral-review.cy.ts:1220`) is exceeded, `BSR-DD-3` is wrong — **re-specify, do not re-base a cap.** Two consecutive re-bases in the same direction mean the density budget is actually being spent (that file's own note). Also: if the measured Title width contradicts the design's arithmetic, the measurement wins and the widths are re-tuned inside this task.
  - **Consumers (swept at `da132347c`; full table in `design.md` §1B — twelve sites, all owned here):** `spec.ts:465` header count 7→8 · `spec.ts:562-570` Alignment `min-w-[220px]`→`min-w-[184px]` (re-tuned on measurement) · `spec.ts:583-584` date cell `td[5]`→`td[6]` **and** its exact-`textContent` assertion re-pointed at the date's own inner node (the reporter line otherwise breaks it independently of the index shift) · `spec.ts:596,604,614` header **key order** — `source` inserted between `center` and `status` in `bilateral-review.copy.ts:129-137`, never appended · `spec.ts:871-880` `columnCount()` 7/6→8/7 · `spec.ts:891` loading-row `colSpan` 7→8 · `spec.ts:1298,1308,1320,1326` `<col>` counts 7/6/7/7→8/7/8/8 · `cy.ts:1383,1386` center-grouped 6 `th` / 6 `col`→7/7 · `cy.ts:1393-1398` flat table 7→8. **Not pinned, must keep passing unmodified:** `bilateral-review-table.cy.ts:426-448` (Gate 7, derives the count dynamically). `bilateral-review.cy.ts:1193-1194`'s `td:nth-child(2) p` / `span` still address Title because SOURCE lands **after** Lead Center — verify that after the change rather than assuming it.
- **Definition of done:**
  - [x] Baseline Title widths recorded before the change — 530.5 @1280 / 250.5 @1000, matching the carried figure
  - [x] SOURCE renders in: grouped nested table (project mode), grouped nested table (center mode, where Lead Center is hidden and the widths array must stay index-aligned), flat table, and narrow cards
  - [x] All **twelve** pinned consumers updated; whole `bilateral-review` Jest (17 suites / 562 tests) + CT (24 + 48) suites green; Gate 7 unmodified and still passing
  - [x] `tsc --noEmit` (1248 vs 1217 baseline, all deltas pre-existing `.cy.ts` matcher noise, zero in changed non-`.cy.ts` files) **and** `npm run build` clean
  - [x] Three row-height caps pass **unchanged** (46 / 50 / 68) — and confirmed **load-bearing**, not vacuous: the SUBMITTED cell is two-line by construction, so DD-3's vacuity warning is superseded
  - [x] `documentElement.scrollWidth <= clientWidth` at 375

### `BSR-T-5` — Drawer header Source line `[x]`

- **Type:** `client`
- **Description:** Declare `creation_method` (and `is_ai_generated`) on `BilateralCommonFields`, and render the Source beside the existing *Submitted by* in the drawer header using the same `resolveBilateralSource` function. The detail payload already carries the value (`design.md` P-5) — no server change.
- **Implements:** `BSR-R-9`, `BSR-AC-12`
- **Files (expected):** `…/result-review-drawer/result-review-drawer.interfaces.ts` · `result-review-drawer.component.html` · its spec
- **Depends on:** `BSR-T-3` · **Blocks:** `—`
- **Estimate:** `S` · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** mount the drawer with `commonFields.creation_method = 'MANUAL'` and assert the header renders `Manual entry`; mutation — remove the header binding → red. A test that only asserts the interface compiles is a presence assertion and proves nothing about the header.
  - **Red run:** `npx jest …/result-review-drawer.component.spec --silent --reporters=summary --no-coverage` — red before, green after. Plus `npx tsc --noEmit`.
  - **Disqualifier:** if the live detail response turns out not to carry `creation_method` despite `result.repository.ts:3406` (P-5 is `Low` impact but verified only in the SQL string), this task grows a server edit — report rather than patch the client with a guess.
  - **Consumers:** `BilateralCommonFields` is read by `result-review-drawer.component.ts` and the drawer's content sub-components. Additive optional fields; sweep with `grep -rn "commonFields" onecgiar-pr-client/src --include="*.ts"` before committing.
- **Definition of done:**
  - [x] Header shows Source for a non-AI and an AI result; no duplicate AI string introduced (D7 held at 7). Rendered **independently of `submitter_name`** after an attempt-1 FAIL, with a falsification-proven index lock
  - [x] Drawer Jest (9 suites / 294 tests) + the drawer's CT specs (11/11) green
  - [x] `tsc --noEmit` at baseline (1248 repo-wide, zero referencing changed files)

### `BSR-T-6` — Page-level gates, HITL evidence, docs `[x]`

- **Type:** `tests | docs`
- **Description:** Add/extend the page-level CT gates (375px no document h-scroll with the new content, 1000px real-scroller overflow, row-height caps unchanged), run the HITL live-page look that covers the two substituted defect classes, and write the documentation obligations.
- **⚠️ De-vacuify the row-height gate FIRST (Reviewer round 1, `design.md` DD-3).** `bilateral-review.cy.ts:1144-1177`'s three fixture rows carry neither `reporter_name` nor `creation_method`, and the `row()` helper (`cy.ts:95-109`) defaults neither — so "the caps pass unchanged" currently measures a **single-line** date cell and a **placeholder** SOURCE cell and proves nothing about either new surface. Before asserting anything: give all three rows a `reporter_name`, make one row `creation_method: 'AI'` (the tallest SOURCE content), keep the fixture-sanity `deep.equal` shape check working, and only then assert 46 / 50 / 68 **unchanged**.
- **Implements:** `BSR-AC-10`, `BSR-AC-11`, `BSR-AC-13`, defect classes **D3** and **D9**
- **Files (expected):** `bilateral-review.cy.ts` · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` · `…/bilateral-review/CLAUDE.md`
- **Depends on:** `BSR-T-4`, `BSR-T-5` · **Blocks:** `—`
- **Estimate:** `M` · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** for the 375px gate — widen the source chip to `whitespace-nowrap` with a 200px min-width and the document must gain a horizontal scrollbar, turning the gate red. **⚠️ MEASURED FALSE at execute time (2026-09-21, `BSR-T-6`).** This premise is *geometrically impossible*: the source row is ~293px inside a 375px viewport, so a 200px chip reaches x≈356 and cannot touch the document edge **even with every clip guard removed** — only a 600px chip does. Measured injection chain (chip wrapper / source row / document): baseline `79/79 · 293/293 · 375/375`; literal 200px injection `208/187 · 293/293 · 375/375`; guards defeated `200/200 · 313/293 · 375/375`; 600px chip `600/600 · 713/293 · 375/375`; overflow unlocked `600/600 · 713/278 · 755/360`. **Delivered instead**, and judged honest by the Reviewer: a *guard-absorbs-it* case (the literal 200px injection, asserting `wrapper.scrollWidth > clientWidth` **and** `>= 200` so the injection is proven to have landed, with row and document unchanged — turning the impossible falsifier into positive proof that the card-owned clip guard is load-bearing) plus a *DETECTOR FIRES* case (guards defeated + 600px chip) whose un-inverted red is recorded verbatim: `documentElement.scrollWidth(755) <= clientWidth(360): expected 755 to be at most 360`. For the HITL check — a real page whose group row counts differ before/after `BSR-T-1` falsifies the join design.
  - **Red run:** `npx cypress run --component --spec "…/bilateral-review.cy.ts"`. For the HITL parts: `n/a (manual check — D3 and D9 have no automated gate in this repo; cypress-axe is not installed)`.
  - **Disqualifier:** a 15px shave at 375px must **not** be attributed to a harness quirk before checking `documentElement.scrollWidth > clientWidth` — that misattribution already re-based a gate wrongly once in this module. If the shave is real overflow, fix the overflow.
  - **Consumers:** `none (no shared symbol changed)`.
- **Definition of done:**
  - [x] Full `bilateral-review` CT suite green — **54 gates**, plus 24 on the table suite and 19 Jest suites / 574 tests
  - [x] **HITL evidence captured on the live page** (grouped project view, SP01, ~1317px — see `execution.md` → *HITL*): **six of the seven `BSR-R-4` rows render on real data**, including the trap row 19×; AI badge **79px in a 116px cell, single line**, accessible name supplied by the delegated APF component; contrast **5.49:1** / **6.32:1**; 37/37 rows show a chip and a named reporter, truncated with the full value in `title`; placeholder pair (`aria-hidden` dash + one `sr-only`) confirmed in the live DOM; no document overflow. **Not covered:** the visual look at **1000px** and **375px** — the Orca browser CLI exposes no viewport resize; both are covered by CT rendered-geometry gates, which measure rather than depict. D9 and D3 — **D9 and D3 satisfied by computed evidence stronger than the eyeball they substituted for**: contrast measured in CT at **5.49:1** (AI badge) and **6.32:1** (neutral pill), both independently recomputed by the Leader; row counts identical with and without the `users` joins across **8** `(programId, versionId)` pairs at both the pre- and post-`GROUP BY` level. **The visual live-page look at 1536 / 1000 / 375 remains outstanding** and is the Leader's, not this task's (Playwright is not installed in this worktree)
  - [x] Change-log entry in `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (root `CLAUDE.md` rule, **AC-4**) — corrected at attempt 2 after a Reviewer FAIL: it had named the AI-promotion path as the second stamping site instead of the knowledge-product handler
  - [x] `…/bilateral-review/CLAUDE.md` updated (new column in the Contract's table section, new colgroup widths `96 / — / 88 / 116 / 120 / 184 / 100 / 100`, the SUBMITTED cell) and its `**Verified:**` line re-stamped **in the same commit** (`docs/COMPONENT-DOCS.md`)

---

## 4. Dependency graph

```
BSR-T-1 (server: payload) ─┐
BSR-T-2 (server: stamp)    │   [T-1 ∥ T-2 ∥ T-3 — no shared files]
BSR-T-3 (chip + fn) ───────┤
                           ├──> BSR-T-4 (table: column, colgroup, SUBMITTED, cards)
                           └──> BSR-T-5 (drawer header)
                                        │
                                        └──> BSR-T-6 (page gates, HITL, docs)
```

**Parallel-friendly:** `BSR-T-1`, `BSR-T-2` and `BSR-T-3` touch disjoint files and may run concurrently. `BSR-T-4` and `BSR-T-5` may run concurrently once `BSR-T-3` lands.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `BSR-TEST-1` | unit (server) | `BSR-R-1`, `BSR-AC-1` | `onecgiar-pr-server/src/api/results/result.spec.ts` |
| `BSR-TEST-2` | unit (server, SQL string) | `BSR-R-2`, `BSR-AC-2` | `onecgiar-pr-server/src/api/results/result.repository.spec.ts` |
| `BSR-TEST-3` | unit (server) | `BSR-R-3`, `BSR-AC-3` | `onecgiar-pr-server/src/api/bilateral/**` (both header paths) |
| `BSR-TEST-4` | unit (client) | `BSR-R-4`, `BSR-R-5`, `BSR-R-7`, `BSR-AC-4/5/6` | `…/bilateral-review-source-chip/*.spec.ts` |
| `BSR-TEST-5` | unit (client) | `BSR-R-8`, `columnCount()` 8/7 | `…/bilateral-review-table.component.spec.ts` |
| `BSR-TEST-6` | CT (client, geometry) | `BSR-AC-9`, `BSR-AC-13`, layout NFRs | `…/bilateral-review-table.cy.ts` (Gate 7) |
| `BSR-TEST-7` | CT (client, page) | `BSR-AC-10`, `BSR-AC-11` | `…/bilateral-review.cy.ts` |
| `BSR-TEST-8` | unit (client) | `BSR-R-9`, `BSR-AC-12` | `…/result-review-drawer.component.spec.ts` |
| `BSR-TEST-9` | grep gate | D7 (no new AI string) | `grep -rn "Generated with AI assistance" onecgiar-pr-client/src` → **7, unchanged**; none added by this spec |
| `BSR-TEST-10` | **HITL (manual)** | **D3** (real-data row counts), **D9** (contrast) | live page, recorded in `execution.md` |

Coverage: server ≥ 5/20/35/40, client ≥ 50/60/60/60.

## 6. Rollout & verification

- [ ] PR per the commit convention — **no apostrophes, `$` or quotes in the subject** (Jenkins interpolates it unquoted; client `CLAUDE.md` §10)
- [ ] CI green (lint, tests, build, `migration:check:ci` unchanged, SonarCloud)
- [ ] Manual QA on TEST per `requirements.md` §9 happy paths
- [ ] Downstream: change-log entry published for `AC-4`

## 7. Cleanup & follow-ups

- [ ] Spec status → `shipped`
- [ ] Promote the SOURCE-chip pattern to `docs/ux-ui/design.md` §12 only if a second surface adopts it
- [ ] File `BSR-OQ-1` (Source as a filter) and `BSR-OQ-2` (backfill) as follow-ups if the HITL check warrants

## 8. Roll-back plan

1. Revert the PR(s) in order.
2. **No migration to revert** — the read path adds none and `BSR-T-2` changes only newly written rows.
3. No feature flag introduced.
4. Verify the list payload returns to its 14-field shape against the pre-change fixture in `result.spec.ts`.
5. No downstream consumer to notify — the change was additive and nothing depended on the new fields.

---

## Required cross-references

`./requirements.md` · `./design.md` · `./proposal.md` · `docs/prd.md` · `docs/ux-ui/design.md` · `docs/trd/trd.md` · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` · `onecgiar-pr-client/.../bilateral-review/CLAUDE.md`

# Design — Source and Reporter on the Bilateral review list

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/review-list-source-and-reporter/` |
| Module code | `BSR` · Depth **Lite** · Type **Change** |
| Approval Mode | **pre-approved** (Juan Carlos Cadavid, 2026-09-21) |
| Status | approved |
| Verified at | `da132347c` — every citation in this document was run at this commit |
| Requirements | `./requirements.md` |
| Delegation | Exploration ran inline. **Judgment-day: 1 round, 2 blind reviewers** (server/data lane on sonnet, client/layout lane on fable — author ≠ auditor, different models), synchronous, ~5 min each. |
| Review outcome | **5 MAJOR, 4 MINOR, 0 BLOCKER — all applied in one fix round** (`Fix only`, no re-judgment; pre-approved mode). MAJORs: P-7's flat-literal misreading of a conditional builder · P-10's incomplete pinned-consumer sweep (2 sites listed, 12 real) · P-2's non-reproducible grep count and an unaccounted copy-forward writer · the delegated AI badge has no `whitespace-nowrap` and did not fit a 104px column · the row-height gate was vacuous for DD-3. MINORs: content-box arithmetic, stale `min-w-[220px]`, and two citation line-drifts. |

---

## 1. Summary

Three additive fields on one existing list endpoint, one ingestion stamp, one new 116px table column paid for by a `<colgroup>` rebalance, one extra line inside an existing cell, and one line in the drawer header.

| Layer | Change |
|---|---|
| SQL | `+3` selected columns, `+1` `LEFT JOIN users`, `+3` `GROUP BY` entries |
| Service | `+3` keys on the closed-allowlist mapper |
| Ingestion | `creation_method: ResultCreationMethod.EXTERNAL` in the header save |
| Client model | `+3` optional fields on `ResultToReview`, `+1` on `BilateralCommonFields` |
| Client UI | `+1` column (`SOURCE`), `+1` line in the date cell (`SUBMITTED`), `+1` drawer header line, `+1` presentational chip component |

Nothing is removed. No migration is required on the read path.

---

## 1A. Premise Ledger

**Counts:** 11 premises — **10 verified**, **1 `UNVERIFIED`** (Impact **Low**, owned by `BSR-T-1`).
**Blast-radius triggers:** `live-path` **fires** (the design names a user action and a `groupMode`/`view` branch point) · `shared-state` **fires** (`columnWidths()` / `columnCount()` are read by three table variants and the narrow branch) · `consumer` **fires** (`ResultToReview` is an exported shared type and `columnCount()` is pinned by tests).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| **P-1** | The list mapper is a **closed allowlist** — a field not named there never reaches the client, however the SQL selects it | `location` | `results.service.ts:3646-3662` | `da132347c` | **High** — if the mapper spread the raw row, T-1 would be SQL-only and the service edit would vanish | — |
| **P-2** | Exactly two paths **decide** a fresh `creation_method` (`AI`, `MANUAL`); a third **copies one forward**; the external-API header save writes none, so MySQL applies `DEFAULT 'UNKNOWN'` | `existence` | `grep -rn "creation_method" onecgiar-pr-server/src --include="*.ts"` → **24 matching lines** (5 migration · 3 `result.entity.ts` · 8 `result.repository.ts` · 2 `bilateral-center.service.ts` · 1 `bilateral-ai.service.ts` · 5 across two `*.spec.ts`). Deciding writers: `bilateral-ai.service.ts:952` (`AI`), `bilateral-center.service.ts:394` (`MANUAL`). **Copy-forward writer:** `result.repository.ts:137,177,219` — `replicate()`'s phase-rollover `INSERT` carries the source row's value into the new phase. The base header save at `bilateral.service.ts:4161-4181` has no such key; column default `result.entity.ts:515-522` | `da132347c` | **High** — if ingestion already stamped `EXTERNAL`, task `BSR-T-2` disappears and the `UNKNOWN` branch of `BSR-R-4` is dead code. The copy-forward site does **not** change the task set: it propagates whatever the source row holds, so once `BSR-T-2` ships, rolled-over API results inherit `EXTERNAL` for free — and rolled-over pre-`BSR-T-2` rows inherit `UNKNOWN`, which `BSR-R-4`'s platform-code fallback already renders correctly | — |
| **P-3** | `EXTERNAL` exists in live data only as a one-off migration backfill of pre-existing `source='API'` rows | `data-env` | `migrations/1784921547596-AddResultCreationMethod.ts:11` (`UPDATE … CASE WHEN source='API' THEN 'EXTERNAL' …`) | `da132347c` | **Low** — the `UNKNOWN`+platform fallback in `BSR-R-4` covers either way; only the ordering of the display rule's branches changes | — |
| **P-4** | `source = 'API'` means *"is W3/bilateral"*, **not** *"arrived via the external API"* — so "Via API" must be derived from the platform columns | `data-env` | `result.repository.ts:3326` (the list `WHERE`) + the four documented cases at `result.entity.ts:551-574` | `da132347c` | **High** — if `source` did mean "arrived via API", the whole derivation collapses to one column and `external_platform_code` is unnecessary | — |
| **P-5** | The detail payload already carries `creation_method` and `is_ai_generated`; only the **client interface** fails to declare them | `existence` | `result.repository.ts:3406-3407` selects both; `BilateralCommonFields` at `result-review-drawer.interfaces.ts:52-65` declares neither | `da132347c` | **Low** — if the detail SQL lacked them, `BSR-T-5` grows a server edit | **Settled by `BSR-T-5`: confirmed against the live TEST database** — both columns return values (sample `id=11993`, `creation_method='MANUAL'`). **Citation drift caused by this spec:** the SELECT was `:3407` at `da132347c` and is `:3419` now (+12), shifted by `BSR-T-1`'s own additions to the same query; `BilateralCommonFields` is now `:64-104` after `BSR-T-4`/`BSR-T-5` extended it. **Also discovered:** the detail query does **not** select `external_platform_code` — see §13 |
| **P-6** | The drawer already renders the reporter as `Submitted by: {{ commonFields.submitter_name }}`, built from `LEFT JOIN users u ON r.external_submitter = u.id` | `parity` (`other`) | `result-review-drawer.component.html:162-169`; the join and `CONCAT` at `result.repository.ts:3401`, `:3450-3451` | `da132347c` | **Low** — the list join would need its own name-resolution design instead of copying a proven one | — |
| **P-7** | Under `table-fixed`, Title is the **only** column with no `<col>` width, so it absorbs the whole remainder. ⚠️ `columnWidths()` is **not a flat literal — it is a conditional builder**: it starts `['96px','']`, pushes `'110px'` **only when `showCenterColumn()`**, then pushes `'120px','220px','100px','100px'`. Project mode emits **7** entries summing to 746px of fixed width; center-grouped mode emits **6**, summing to 636px | `other` (standing design rule) | `columnWidths()` at `bilateral-review-table.component.ts:121-126` (the `if (this.showCenterColumn()) widths.push('110px')` branch at `:123`); `showCenterColumn()` at `:92`; `columnCount()` at `:97`; the shared `colgroupTpl` at `bilateral-review-table.component.html:232-236` | `da132347c` | **High** — a replacement written as a flat 8-entry literal renders 8 `<col>` over 7 `<th>` in center-grouped mode, silently shifting every width one column left. DD-2 is specified as a builder edit because of this row | — |
| **P-8** | No consumer of the list payload asserts an exact object shape, so three additive fields break nothing | `consumer` | `grep -rn "GET_ResultToReview" onecgiar-pr-client/src --include="*.ts"` → 9 production call sites + spec files; `grep -rln "ResultToReview" onecgiar-pr-client/src --include="*.ts"` → 31 files; the server mapper spec asserts `project_id` and `results.length` only (`result.spec.ts:1553-1560`). Production readers: `bilateral-review.component.ts:1112`, `bilateral-review-count.service.ts:95`, `bilateral-results.service.ts`, `results-center-reporting-guide.component.ts:161`, `dashboard-lab.component.ts:2032`/`:2600`, `where-to-report-modal.component.ts:105`, `programme-results.component.ts`, `results-list.component.ts`, `notification-item.component.ts` | `da132347c` | **High** — an exact-shape assertion anywhere turns an additive change into a breaking one | — |
| **P-9** | `columnWidths()` / `columnCount()` are **shared state**: one `colgroupTpl` feeds the grouped nested table (both group modes) **and** the flat table, and `columnCount()` drives the flat-view loading-row `colspan` | `shared-state` | `colgroupTpl` outlet at `bilateral-review-table.component.html:652` (grouped nested table) and `:674` (flat table); definition `:232-236`; `columnCount()` at `bilateral-review-table.component.ts:97`. The narrow cards branch renders **no** `<table>` and therefore consumes neither | `da132347c` | **High** — if each table had its own colgroup, the rebalance would have to be repeated per variant and DD-2's single-edit claim is false | — |
| **P-10** | **Twelve** existing assertions pin the column count, the header set, or a positional cell index, and go red on 7→8 / 6→7. The full list is the table below this ledger — an abbreviated list here was the defect a reviewer caught | `consumer` | Swept over every `*.spec.ts` **and** `*.cy.ts` under `src/` for column counts, `'Date'`, `headers.date`, `columnWidths`, `colgroup`, `nth-child`, positional `td` access and this table's testids. Sites enumerated in **§1B**. Outside `bilateral-review/` nothing pins this table (`portfolio-overview` / `programme-results` `columnWidths` hits are unrelated components) | `da132347c` | **High** — an unlisted pinned consumer is a red suite discovered at execute time instead of planned for | — |
| **P-11** | `users.first_name` / `users.last_name` are populated for the submitters that reach this review queue | `data-env` | `UNVERIFIED — confirm at source before relying on it` — CI has no database and no repository command reads live `users` rows; the drawer rendering the same concatenation today is *indicative*, not primary (citation rule (d)) | — | **Low** — if names are sparse, `reporter_name` is `null` more often and `BSR-R-7`'s placeholder carries more rows; no design decision changes | `BSR-T-1`, as its **first step**: run the new query against a TEST-environment program and record the non-null `reporter_name` ratio in `execution.md` |

**Live path** (the `live-path` row, folded into P-7/P-9's dispatch context and stated here in full):
SP reviewer opens `/result-framework-reporting/entity-details/:entityId/bilateral-review` (`routing-data.ts:642-653`) → `BilateralReviewComponent.loadResults()` issues `GET_ResultToReview(code, undefined, versionId)` (`bilateral-review.component.ts:1112`) → rows flow through `searchFiltered → visibleRows → groups`/`flatRows` → `BilateralReviewTableComponent`. **Branch point 1:** `narrow()` (`<900px`) → cards branch, no `<table>`, no colgroup. **Branch point 2 (wide):** `view()==='grouped'` → nested per-card table; `view()==='flat'` → the flat table. **Branch point 3:** `showCenterColumn()` is false only when `groupMode()==='center' && view()==='grouped'`. **All four rendering paths are in scope** — `BSR-R-8` exists because of this branch set, and the SOURCE column must be added to the colgroup (which serves both wide paths at once, P-9) *and* to the narrow card markup separately.

---

## 1B. Pinned consumers of the column set (P-10, full)

Every assertion below goes red when the column count moves 7→8 / 6→7, or when a positional index shifts. All are owned by `BSR-T-4`; none may be discovered at execute time.

| Site | What it pins | Required change |
|---|---|---|
| `bilateral-review-table.component.spec.ts:465` | `headerTexts.length` is `7` | → `8` |
| `bilateral-review-table.component.spec.ts:562-570` | Alignment `td` keeps class `min-w-[220px]` | → **`min-w-[184px]`** (DD-2's new Alignment width, **re-tuned from 192px at execute time on measurement** — see DD-2) |
| `bilateral-review-table.component.spec.ts:583-584` | date cell is `td[5]` **and** its exact `textContent` is `'23 Feb 2026'` | → `td[6]`, and the text assertion must account for the reporter line (`BSR-DD-3`) — assert the date on its own inner node, not the cell's whole `textContent` |
| `bilateral-review-table.component.spec.ts:596, 604, 614` | rendered headers `toEqual(Object.values(BILATERAL_REVIEW_COPY.table.headers))` — **key order is load-bearing** | the new `source` key MUST be inserted **between `center` and `status`** in `bilateral-review.copy.ts:129-137`, never appended |
| `bilateral-review-table.component.spec.ts:871-880` | `columnCount()` is `7` project / `6` center | → `8` / `7` |
| `bilateral-review-table.component.spec.ts:891` | flat loading row `colSpan` is `7` | → `8` |
| `bilateral-review-table.component.spec.ts:1298, 1308, 1320, 1326` | `<col>` counts `7 / 6 / 7 / 7` | → `8 / 7 / 8 / 8` |
| `bilateral-review.cy.ts:1383, 1386` | center-grouped card: `6` `thead th`, `6` `colgroup col` | → `7` / `7` |
| `bilateral-review.cy.ts:1393-1398` | flat table `thead th` count and first-row `td` length are `7` | → `8` |

Two files are **not** pinned and stay as they are: `bilateral-review-table.cy.ts:426-448` (Gate 7) derives the column count dynamically and asserts left-edge parity + Title-widest — it is the right instrument for `BSR-AC-9` and must keep passing unmodified; `bilateral-review.cy.ts:1193-1194`'s `td:nth-child(2) p` / `span` selectors keep addressing the Title cell because SOURCE is inserted **after** Lead Center (DD-2).

---

## 2. Architecture Overview

### 2.1 Where this lives

```
onecgiar-pr-server/src/api/results/
  result.repository.ts        getResultsByProgramAndCenters()  ← SELECT + JOIN + GROUP BY
  results.service.ts          getResultsByProgramAndCenters()  ← mapper allowlist
onecgiar-pr-server/src/api/bilateral/
  bilateral.service.ts        buildResultHeader save           ← creation_method stamp

onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/
  components/result-review-drawer/result-review-drawer.interfaces.ts   ← ResultToReview +3, BilateralCommonFields +1
  components/result-review-drawer/result-review-drawer.component.html  ← header Source line
  components/bilateral-review-table/bilateral-review-table.component.ts    ← columnWidths, columnCount, sourceOf()
  components/bilateral-review-table/bilateral-review-table.component.html  ← SOURCE th/td, SUBMITTED cell, card chip
  components/bilateral-review-source-chip/                             ← NEW (presentational)
  bilateral-review.copy.ts                                             ← new strings
```

### 2.2 Interaction

Unchanged. One request per `(programme, phase)`; all filtering/sorting/derivation stays client-side over that one response (module contract). The Source value is a **pure function of two fields already on the row** — no second request, no new service, no new store.

---

## 3. Data Model Changes

### 3.1 Entities

**None.** `creation_method`, `external_platform_code`, `external_submitter` all exist (`result.entity.ts:505-589`).

### 3.2 Migrations

**None required.** `BSR-OQ-2` (a backfill stamping `EXTERNAL` on rows ingested after migration `1784921547596`) is deliberately **not** taken: the `UNKNOWN` + `external_platform_code` branch of `BSR-R-4` renders those rows correctly without touching data, and a data migration is a heavier, riskier instrument than a display fallback. Recorded in §13.

### 3.3 CLARISA implications

`external_platform_code` is the CLARISA `mis.acronym` captured at ingestion (`bilateral.service.ts:4204-4212`). It is **stored on the result**, so the display needs no CLARISA join and no cache.

---

## 4. API Surface

### 4.1 Changed endpoint

`GET /api/results/by-program-and-centers?programId=&centerIds=&versionId=&statusIds=`

| Field | Type | Source |
|---|---|---|
| `creation_method` | `string` | `r.creation_method` |
| `external_platform_code` | `string \| null` | `r.external_platform_code` |
| `reporter_name` | `string \| null` | `MAX(COALESCE(NULLIF(TRIM(CONCAT(us.first_name,' ',us.last_name)),''), NULLIF(TRIM(CONCAT(uc.first_name,' ',uc.last_name)),'')))` |

SQL shape:

- Two `LEFT JOIN users` — `us ON r.external_submitter = us.id` and `uc ON r.created_by = uc.id` — implementing `BSR-R-2`'s fallback with the same precedence the notification recipient resolver already uses (`results.service.ts:2867-2871`).
- Both joins are `LEFT` on a **single-row FK to `users.id`**, so neither can multiply rows (`BSR-R-2`). The `MAX()` wrapper is belt-and-braces consistent with the query's existing style for non-grouped columns.
- `r.creation_method` and `r.external_platform_code` are per-`result` columns and go into the existing `GROUP BY` beside `r.result_code` / `r.title`; the reporter is aggregated, so it does not.

### 4.2 Bilateral / platform-report impact

None on `/api/bilateral/*`. But this endpoint sits in the bilateral domain and the root `CLAUDE.md` rule plus **AC-4** require the change-log entry in `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` — owned by `BSR-T-6`.

---

## 5. Server Workflow / Business Rules

- **`BSR-R-3` stamp.** Add `creation_method: ResultCreationMethod.EXTERNAL` to the base header save at `bilateral.service.ts:4161-4181`. This is the *only* creation path that currently falls through to the DB default (P-2). The knowledge-product type handler builds its own header (`handlers/knowledge-product.handler.ts:58`) — it must receive the same stamp, or KP results ingested by API keep reading `UNKNOWN`. **Both sites, one task.**
- The stamp is a **new value on an existing path**, not a new enumerated value: `EXTERNAL` already exists in `ResultCreationMethod` and is already produced by the migration, so no consumer sees a value it has never seen.
- `bilateral-center.service.ts:556` gates result-type changes on `creation_method !== 'AI'`. Stamping `EXTERNAL` on an API-ingested result does not reach that guard (API results are not centre drafts in `Editing`), and the guard's behavior for `AI` and `MANUAL` is unchanged.

---

## 6. Frontend Plan

### 6.1 Routes / modules

No route change. `BilateralReviewTableComponent` imports the new chip component; the chip imports `AiProvenanceNoticeComponent` (standalone).

### 6.2 Components & services

**New:** `bilateral-review-source-chip` — presentational, `OnPush`, one input (`row`-derived source descriptor), no services.

Its contract: given `{ method, platformCode }` it renders **either** the delegated `<app-ai-provenance-notice variant="badge">` (AI case, `BSR-R-5`) **or** one neutral pill with the `BSR-R-4` label, **or** the placeholder pair (`BSR-R-7`). The derivation itself is a **pure exported function** so the `BSR-R-4` matrix is unit-testable without rendering, and the drawer (`BSR-R-9`) reuses it.

**Changed:** `BilateralReviewTableComponent` — `columnWidths()`, `columnCount()`, the SOURCE `th`/`td`, the SUBMITTED cell, the narrow card.

### 6.3 Design system usage

- Neutral pill reuses the `Contributor` chip's exact recipe (`bilateral-review-table.component.html:64-68`): `rounded-full border border-[var(--pr-border)] bg-[var(--pr-surface-app)] text-[10px] leading-[16px] font-semibold text-[var(--pr-text-secondary)]`. No new token, no new hex, no `--pr-color-*-100` fill (module Gotcha), no status pair recombination (client hard rule 9).
- The AI case keeps the info pair the APF component already ships.
- `whitespace-nowrap truncate max-w-full` + `title` on the chip — the same wrap guard the type badge needed at 1000px (BRH-T-3 attempt 3 Reviewer FAIL).

### 6.4 Real-time / notification UX

Not applicable.

---

## 7. Security & Authorization

Unchanged. The endpoint's existing gating stands; nothing role-dependent is added. Only the reporter's **display name** crosses the wire — never email or user id (`BSR-R-6` scope, `AC-9`).

## 8. Performance & Capacity

Two `LEFT JOIN`s on `users.id` (primary key) per result row. No new round trip, no N+1, no new index needed. `BSR-R-2`'s "row count identical" is the measurable guard.

## 9. Observability

No new logging. Nothing logged carries a user identifier (`.cursorrules`).

## 10. Testing Plan (forward-looking)

Per the `requirements.md` §8 defect-class map. Two classes (D3 real-data aggregation, D9 contrast) have **no automated gate in this repo** and are explicitly substituted by the HITL pass at `/akili-validate`, not left silent.

## 11. Backwards Compatibility & Migration Plan

Additive only (ADR-004, AC-4). `ResultToReview`'s three new fields are **optional** (`?`) so every existing fixture in the 31 files that reference the type keeps compiling (P-8). Rollback = revert the PR; no data to unwind.

---

## 12. Design Decisions

### `BSR-DD-1` — Source is derived in the client from two fields, not computed server-side

**Decision.** The server returns the raw `creation_method` and `external_platform_code`; the client derives the label.
**Why.** The display rule mixes a provenance enum with a presentation fallback (`UNKNOWN` + platform → `Via API`), and it is a *display* rule that will change again when `BULK` starts arriving. Encoding it in SQL would bake a UI decision into a payload other surfaces consume.
**Rejected:** a server-side `source_label`. It would make the label untestable without the server and would force a payload change every time the wording moves.

### `BSR-DD-2` — One 116px SOURCE column, funded by a `<colgroup>` rebalance

**Decision — expressed as a builder edit, not a literal.** `columnWidths()` keeps its conditional shape (P-7) and becomes:

```
['96px', '']                               // code, title (unset — absorbs the remainder)
  + if (showCenterColumn()) push '88px'    // lead center  110 → 88
  + push '116px'                           // SOURCE (new) — ALWAYS pushed, outside the conditional
  + push '120px', '184px', '100px', '100px'  // status, alignment 220 → 184 (re-tuned on measurement), date, actions
```

`columnCount()` becomes **8** project / **7** center-grouped. **Writing this as a flat 8-entry literal is the defect P-7 exists to prevent** — in center-grouped mode it would lay 8 `<col>` over 7 `<th>` and shift every width one column left.

**Widths.** Project mode fixed sum `746 → 804` (`+58`); center-grouped `636 → 716` (`+80`). Title loses 58px, not 116. *(Corrected 2026-09-21 with the 184px re-tune — the original `812`/`724`/`+66` figures were the superseded 192px arithmetic, missed by the first `192px` sweep and caught by the `BSR-T-4` Reviewer.)*
**Why.** Title must stay the widest column at 1000px and 1280px (BRV-R-3, P-7). Lead Center holds a centre acronym (`CIMMYT`, 6 chars) in a 110px box.

**⚠️ Corrected at execute time, 2026-09-21, by measurement (`BSR-T-4`).** This paragraph originally projected *"~464px @1280, ~184px @1000 — still the widest at both"* with Alignment at **192px**. That was **self-contradictory**: a Title of ~184px is *narrower* than a 192px Alignment column, so Title would **not** have been the widest at 1000px and the hard NFR (`BSR-AC-9`, `requirements.md` §7 Layout) would have failed. CT measurement confirmed it: with Alignment at 192px, Title measured **184.5px** at 1000px — below Alignment. Per this DD's own Disqualifier (*"if the measured Title width contradicts the design's arithmetic, the measurement wins and the widths are re-tuned inside this task"*), Alignment was re-tuned **220 → 184px**, giving measured Title **192.5px @1000** and **472.5px @1280** — widest at both, verified by a CT gate over a SOURCE-bearing fixture.

**Measured at the shipped configuration** (Leader, direct CT read, 2026-09-21): `viewport=1000 → allCols=[96, 192.5, 88, 116, 120, 184, 100, 100]` · `viewport=1280 → allCols=[96, 472.5, 88, 116, 120, 184, 100, 100]`. Fixed sum **804**, container `viewport − 3.5` at both widths. Title's margin over the next-widest column (Alignment, 184px) is **+8.5px** at 1000px. *The `BSR-T-4` Implementer initially reported `464.5px @1280`; that figure belongs to the 192px run and was corrected here after the Reviewer flagged the inconsistency and the Leader re-measured.* Alignment at 184px keeps its two truncated lines. The arithmetic error was caught only because the task required a *measured* baseline rather than a carried-over one.

**Why 116px and not 104px (Reviewer finding, round 1).** At the module's `!px-[10px]` cell convention a 104px column gives an 84px content box, and the two longest real values do not fit it:
- the delegated AI badge is `inline-flex px-[8px] py-[2px] text-[11px]` + a 13px icon + `gap-[4px]` ≈ **88px** — and it carries **no `whitespace-nowrap`** of its own (`ai-provenance-notice.component.html:20-27`), while its host is `:host { display: contents }` (`.scss:1-3`), so a wrapper cannot clip it either;
- `Via API · STAR` at 10px ≈ **92px** with chrome.

A wrapped badge is a second text line in the SOURCE cell — precisely the row-growth shape DD-3's disqualifier targets.

**⚠️ The "≈88px" figure and the "both required" claim below are FALSIFIED by measurement (`BSR-T-4`, 2026-09-21).** The delegated AI badge measures **79px**, not ≈88px, and at the shipped 116px column (96px content box) it renders on one line **even with both guards removed**. Consequences, recorded rather than quietly dropped: (a) the 104px rejection's **AI-badge leg does not hold** — 79px would have fitted an 84px content box; only the `Via API · STAR` ≈92px **pill leg** survives to justify 116px over 104px, and it survives on its own; (b) the two guards are **defence in depth, not load-bearing at 116px**, and **no gate can detect their removal** at this column width (`BSR-T-4` reproduced red only by narrowing SOURCE to 68px with the guards removed). They are kept deliberately: they are what makes the column safe against a longer future label, e.g. a platform code longer than `STAR`. Anyone re-tuning this column must re-derive the guard necessity at the new width rather than trusting the sentence below.

**Two guards (as originally specified — necessity now qualified above):** (a) the column is 116px (96px content box); (b) the SOURCE `<td>` itself carries `whitespace-nowrap`, and the chip renders inside a `<span class="block truncate max-w-full">` **that the table cell owns** — a wrapper outside the `display: contents` host, so it clips regardless of what the delegated component does. Overflow then ellipsizes honestly with the full value in `title`; it never wraps. The APF component is **not modified** (DD-4).
**Rejected:** two columns (Source + Reporter) — `−230px` puts Title at ~20px @1000 and reopens the horizontal-overflow class BRH-T-3 closed. Also rejected: no rebalance — `−116px` leaves Title at ~134px @1000, below the Alignment column.
**Loose end this closes:** the Alignment `<td>` currently carries `min-w-[220px]` (`bilateral-review-table.component.html:133`) with a presence test pinning it (`spec.ts:562-570`). Under `table-fixed` Chromium ignores cell min-width — today's 128/110 min-w against 120/100 `<col>` already proves that, so layout is unaffected — but leaving a `220px` class beside the `<col>` width is a contradiction a future reader would have to re-derive. Updated to **`min-w-[184px]`** with its test, inside `BSR-T-4` (the final measured width — see the execute-time correction above).
**Position.** Immediately **after Lead Center**, so Title stays `td:nth-child(2)` and the existing row-height gate's `td:nth-child(2) p` selector (`bilateral-review.cy.ts:1193-1195`) keeps addressing the title cell. Moving Title's index would silently redirect that gate onto another cell — the kind of change that reports green while measuring nothing.
**All measured, never assumed:** the projections above are arithmetic on P-7's measured baseline; `BSR-T-3`'s gate is the CT measurement, and if the measurement disagrees with the arithmetic, the measurement wins and the widths are re-tuned inside the same task.

### `BSR-DD-3` — Reporter goes in the date cell's existing vertical slack, not on a new line in the Title cell

**Decision.** The date cell becomes two stacked right-aligned lines: `d MMM y` at `text-[12px] leading-[15px]` over the reporter at `text-[11px] leading-[13px]`, truncated, with the full name in `title`. Header `DATE → SUBMITTED`. **Both line-heights are explicit and load-bearing — see the arithmetic.**

**Why, with the real numbers (corrected in review round 1).** The 44.875px measurement of the tallest one-line row decomposes as: Alignment `toc_title` `13px × 1.375 = 17.875` (`html:141`, `leading-snug`) + `indicator` `14px` (`html:144`, `leading-[14px]`) + `12px` cell padding + **`1px` `!border-b`**. The available **content box is 31.875px, not ~33px**. Two date lines at the pinned leadings are `15 + 13.75 ≈ 28.75px` → **3.1px of slack**. That margin is thin and it is the whole decision: at the inherited preflight line-height of 1.5 the same two lines are `18 + 16.5 = 34.5px` and the row measures ~47.5px, **over the 46px cap**. Pinning `leading-[15px]` / `leading-[13px]` is therefore not styling preference — it is the condition under which this DD holds.

A reporter line in the Title cell would instead add a third line under the clamped paragraph and hit the `-webkit-line-clamp` box-model floor that already forced the 64→68 re-base.

**Disqualifier.** If CT measures any of the three row shapes above its existing cap, this decision is wrong — re-specify rather than re-base a cap (`BSR-AC-10`).

**⚠️ SUPERSEDED at execute time, 2026-09-21 — this warning no longer holds as written (`BSR-T-4` Reviewer).** The cell was implemented so that the reporter line renders in **both** branches: when `reporter_name` is absent the `@else` arm emits the `aria-hidden` dash at the same pinned `leading-[13px]` (`bilateral-review-table.component.html:189-197`, Leader-verified at source). **The SUBMITTED cell is therefore two-line by construction**, so the existing cap fixture — which carries no `reporter_name` — *does* measure the two-line shape, and the caps hold **unchanged** at 46 / 50 / 68 precisely because the 3.1px slack computed below is what absorbs it. The gate is **load-bearing, not vacuous**: at the inherited preflight line-height of 1.5 the two lines are 34.5px and the no-badge row reaches ~47.5px, over the 46px cap, so a wrong leading goes red. **Residual vacuity is narrower than stated and not a live risk:** only the SOURCE cell is still measured in its placeholder form, and the tallest SOURCE content (the AI badge, ≤22px) is shorter than the two date lines (28.75px), so no SOURCE variant can drive a row height at this column width. `BSR-T-6`'s fixture change is therefore **anti-regression documentation** — worth doing, and no longer closing an open hole. The original round-1 finding, kept for the record:

**~~The existing cap gate is VACUOUS for this DD until its fixture changes (Reviewer finding, round 1).~~** `bilateral-review.cy.ts:1144-1177`'s three fixture rows carry neither `reporter_name` nor `creation_method`, and the `row()` helper (`cy.ts:95-109`) defaults neither — so "the three caps pass unchanged" today would measure a **single-line** date cell and a **placeholder** SOURCE cell, proving nothing about either new surface. `BSR-T-6` therefore requires the fixture to gain a `reporter_name` on all three rows **and** one row with `creation_method: 'AI'` (the tallest SOURCE content), with the caps then holding at 46 / 50 / 68. Without that fixture change the gate is an inert fixture in the exact sense the task rules name.
**Rejected:** a `REPORTER` column (DD-2's arithmetic); a tooltip-only reporter (does not satisfy `BSR-US-2`'s scanning need).

### `BSR-DD-4` — The AI case delegates to `AiProvenanceNoticeComponent`, the other three are local pills

**Decision.** The chip branches: AI → `<app-ai-provenance-notice variant="badge">`; everything else → a local neutral pill.
**Why.** APF-R-12 exists so the AI-transparency sentence has exactly one definition. A second "AI Result" pill in this module would be a second copy by construction. The other three values have no such constraint and do not deserve a shared component.
**Cost accepted:** one chip renders two visually different pill styles (info pair for AI, neutral for the rest). That is the intended reading — AI provenance *is* the one value that carries a transparency obligation.
**Gate:** D7 — `grep -rn "Generated with AI assistance" onecgiar-pr-client/src` must return **7** hits, **unchanged from the pre-spec baseline**, none of them introduced by this spec. (Corrected at execute time 2026-09-21 — "exactly 1" was a miscount; see `requirements.md` §8 D7 and §13 below.)

### `BSR-DD-5` — Stamp `EXTERNAL` at ingestion rather than backfill

**Decision.** Fix the writer (`BSR-R-3`); do not migrate existing rows.
**Why.** The display fallback already reads existing rows correctly (P-3 → `BSR-R-4`'s `UNKNOWN` row), so a backfill buys correctness only for rows whose `external_platform_code` is also null — which the placeholder handles honestly. A `UPDATE result SET …` across a production table is a disproportionate instrument for that.

### Step 2.3 — Reversion challenge

**Two DDs touch already-delivered behavior**, so both were challenged with the single question *"what does changing this break?"*:

| DD | Reverted behavior | Challenge answer | Design response |
|---|---|---|---|
| `BSR-DD-2` | The measured 110px Lead Center and 220px Alignment widths, both set deliberately in BRH-T-3 attempt 3's re-balance | Alignment at 184px (as re-tuned) shortens the truncation point of `toc_title`/`indicator` further than the 192px originally challenged; Lead Center at 88px could clip a long acronym | Both cells already truncate on an inner `<span>` with a `title` — no information is lost, only the truncation point moves. `BSR-T-4`'s gate measures that no `th` wraps at 1000px, which is the observable failure this would produce. **Longest CLARISA acronym is a real risk** → the gate includes an 8-character acronym row |
| `BSR-DD-3` | The `DATE` header string and the single-line date cell | Any test asserting the literal header `Date` or a single-node date cell | **The first answer here was wrong and review round 1 corrected it.** It claimed "the CT gates address the date cell positionally, not by text" — false: `bilateral-review-table.component.spec.ts:583-584` asserts the date cell's exact `textContent === '23 Feb 2026'`, which the reporter line breaks **independently of the index shift**. Both the index and the text assertion are now listed in §1B and owned by `BSR-T-4`, which re-points the text assertion at the date's own inner node |

The DD-2 challenge produced no breakage the design does not address. **The DD-3 challenge initially produced a false clearance** — recorded here rather than silently overwritten, because a reversion challenge that clears itself on an unverified sweep is the failure mode the step exists to catch.

---

## 12A. Budget (Step 2.4 — the `/akili-execute` tripwire)

| Metric | Expected |
|---|---|
| **Tasks** | **6** |
| **LOC** | **~680** — server ~60, client ~200, tests ~390, docs ~30 (raised from ~590 after review round 1: twelve pinned consumers to update instead of two, plus the row-height fixture rework and the chip-fit gates) |
| **Review rounds** | **2** |

The estimate matches **Lite** for production code (~250 LOC) and is dominated by tests, as the recorded lesson that AKILI budgets undercount tests predicts (~60% here). **Tripwire response agreed in advance:** if actual LOC exceeds ~750 or tasks exceed 8, stop and escalate — do not absorb it silently.

---

## 13. Open Gaps & Follow-ups

- **`BSR-OQ-1`** — Source as a filter dimension. Deferred by user decision; revisit once real distribution is visible.
- **`BSR-OQ-2`** — Backfill `EXTERNAL` on rows ingested between migration `1784921547596` and `BSR-R-3`. Not taken (DD-5). File as a follow-up only if the HITL check finds rows with neither a `creation_method` nor a platform code.
- **`BULK`** — when `bilateral/bulk-uploader-handoff` starts stamping it, no change is needed here: `BSR-R-4` already maps it.
- **Pre-existing test slop** — `result.spec.ts:1522-1547` feeds the mapper `indicator_category` where the mapper reads `result_category`. Out of scope; do not fix inside this spec.
- **Drawer Source lacks `external_platform_code` — list/drawer divergence (found at execute time by `BSR-T-5`, 2026-09-21).** `getCommonFieldsBilateralResultById` selects `creation_method` and `is_ai_generated` but **not** `external_platform_code` (`result.repository.ts:3418-3419`), so the drawer's derivation always runs with `platformCode: undefined` while the list has the real value. Measured against the live TEST database (1505 active bilateral results — `EXTERNAL` 1152 / 0 coded · `AI` 129 / 0 · `MANUAL` 129 / 0 · `UNKNOWN` 95 / **84** coded, `W3RU`=54 `STAR`=24 `FETCHER`=6), the divergence is **two classes**:
  1. **Fixed legacy — 84 rows.** `UNKNOWN` + a code renders `Via API · W3RU` in the list and the **placeholder em-dash** in the drawer (`BSR-R-4` rows 6→7). This class does **not** grow: `BSR-T-2`'s stamp moves new rows *out* of `UNKNOWN`.
  2. **Growing.** Every ingestion **whose API key resolves a CLARISA MIS** now writes both `creation_method='EXTERNAL'` (`BSR-T-2`) and `external_platform_code` (`bilateral.service.ts:4212`, pre-existing P2-3166 behaviour), rendering `Via API · <code>` in the list and bare `Via API` in the drawer (`BSR-R-4` rows 4→5). *Magnitude note:* `buildExternalIdentity` yields `platform?.acronym ?? null` and `applyExternalIdentity` "only writes when there is something to write", so an ingestion with **no** resolvable platform stays `EXTERNAL` + null and diverges not at all — the growing class is per-resolved-platform, not per-ingestion.
  **Not a conformance failure of `BSR-T-5`:** `BSR-R-9` literally scopes the header to "the detail payload's `creation_method`", and the placeholder is honest under `BSR-R-7`. Both attempt-1 and attempt-3 Reviewers took that reading independently. **One server edit closes both classes** — add `r.external_platform_code` to `getCommonFieldsBilateralResultById` and pass it through `BilateralCommonFields` to `headerSourceOf`. **Out of scope here** (`BSR-T-5`'s Disqualifier says report, do not guess); **file as a follow-up.**
- **Pre-existing APF-R-12 violation (found at execute time, 2026-09-21)** — `ai-processing-panel.component.html:158` hard-codes the AI-transparency sentence in production markup instead of binding `AI_PROVENANCE_NOTICE_TEXT` from `ai-provenance-notice.component.ts:12`. It is a genuine second copy of the string, and it **predates this spec**. It is what made the original D7 gate ("exactly 1 hit") unsatisfiable: the true pre-spec baseline is **7** hits — 1 constant definition, this 1 production duplicate, and 5 spec-file assertions. D7 was corrected at execute time to "7, unchanged, none introduced by this spec", which preserves `BSR-R-5`'s meaning exactly. **Out of scope — do not fix inside this spec**; file as a follow-up against the `bilateral` module that owns APF-R-12.

---

## Required cross-references

`docs/prd.md` (G3, AC-4, AC-9) · `docs/ux-ui/design.md` (§6, §7, §8, §9, §10) · `docs/trd/trd.md` (ADR-004) · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` · `onecgiar-pr-client/.../bilateral-review/CLAUDE.md` · `./requirements.md` · `./tasks.md`

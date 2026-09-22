# Proposal — Source and Reporter on the Bilateral review list

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/review-list-source-and-reporter/` |
| Slug | `review-list-source-and-reporter` — derived from the free-text argument ("mostrar Source y Reporter en la lista de bilateral review"). Placed under `bilateral/` per the domain-module taxonomy (precedent: `bilateral/webhook-external-platforms`, archived `bilateral/review-drawer-readonly-rendering`) even though the page lives in the `result-framework-reporting` client module — the payload and the provenance columns are bilateral-domain. |
| Type | **Change** |
| Approval Mode | **gated** — the user's instruction was explicit: *"No implementes aún. Solo propose + revisión… recomienda y espera luz verde."* The standing pragmatic/pre-approved mandate is not applied here. |
| Status | draft — awaiting approval |
| Owner | Juan Carlos Cadavid |
| Date | 2026-09-21 |
| Ticket(s) | none yet. Create under the Bilateral Center epic before `/akili-execute`. |
| Baseline | `docs/prd.md` — G3 (bilateral consumer reliability), **AC-4** (bilateral payload changes documented) · `docs/ux-ui/design.md` — §6 *Listing screens*, §6 *Empty / error / loading*, §7 tokens, §8 *Component rules*, **§9 Responsive** ("Tables allow horizontal scroll below `md`; **never hide columns silently**"), §10 a11y · `docs/trd/trd.md` — ADR-004 (bilateral additive-only) |
| Related specs | archived `bilateral/ai-processing-feedback` (**APF-R-12** — the single AI-transparency copy constant and `AiProvenanceNoticeComponent`, which this must reuse rather than duplicate) · `bilateral/bulk-uploader-handoff` (the partner tool that will produce the `BULK` provenance value) · `bilateral/webhook-external-platforms` (P2-3166 — the `external_platform_id/_code` columns this reads) · `changes/bilateral-review-hierarchy-ux` (BRH-T-3 — the `table-fixed` + shared `<colgroup>` contract any new column must respect) |
| Depends on | none |
| Parallel-safe | **no** — touches `result.repository.ts` / `results.service.ts` (shared with other bilateral work) and the `bilateral-review-table` colgroup, which several open UI specs also measure. |

---

## Intent

Show, on each row of the **Bilateral review** list (`entity-details/:entityId/bilateral-review`), **where the result came from** (AI-assisted · Manual entry · Bulk · Via API + originating platform) and **who reported it**, so an SP reviewer can triage and prioritise the pending queue without opening each result.

## Problem / Current Behavior

- The list renders 7 columns — Code, Title, Lead Center, Status, Alignment, Date, Actions — plus a result-type badge under the title and a `Contributor` chip under the code (`bilateral-review-table.component.html:40-200`; `columnWidths()` at `bilateral-review-table.component.ts:121-126`). Neither provenance nor reporter appears anywhere on the row.
- The list payload does not carry them. `results.service.ts:3646-3662` maps a **closed allowlist** of 14 fields from the raw row; `creation_method`, `external_platform_code` and any submitter name are not among them, and the SQL (`result.repository.ts:3253-3277`) never selects them.
- The **drawer already shows the reporter**: `result-review-drawer.component.html:162-169` renders `Submitted by: {{ commonFields.submitter_name }}`, built server-side from `CONCAT(u.first_name,' ',u.last_name)` over `LEFT JOIN users u ON r.external_submitter = u.id` (`result.repository.ts:3401`, `:3450-3451`). The drawer does **not** show Source.
- The detail payload **already carries provenance** — `result.repository.ts:3406-3407` selects `r.creation_method` and `CASE WHEN r.creation_method = 'AI' THEN 1 ELSE 0 END AS is_ai_generated` — but the client interface `BilateralCommonFields` (`result-review-drawer.interfaces.ts:47-61`) never declares them, so the drawer drops them on the floor.
- ⚠️ The list is already scoped to bilateral: the query hard-filters `WHERE r.source = 'API'` (`result.repository.ts:3326`). `source` here means *"is W3/bilateral"*, **not** *"arrived through the external API"* — the entity comment at `result.entity.ts:551-574` says so explicitly and names the four cases where a bilateral result has no external platform behind it. **So "Via API" cannot be derived from `source`; it must be derived from `external_platform_id != null`.**

## Proposed Outcome

An SP reviewer scanning the pending queue sees, per row, a compact **Source** chip (`AI-assisted` / `Manual entry` / `Bulk` / `Via API · STAR`) and the **reporter's name** under the submission date — without the table growing taller, scrolling horizontally, or losing Title width below its current floor. The same provenance appears in the review drawer header beside the existing *Submitted by*.

## Scope

| In | Out |
|---|---|
| List payload: add `creation_method`, `external_platform_code`, `reporter_name` to `getResultsByProgramAndCenters` (SQL + mapper + `ResultToReview`) | Filtering or sorting **by** Source / Reporter (a follow-up once the values are visible and their distribution is known) |
| A derived, single display rule for Source (see *Approach Options → the derivation*) | Any change to `source` / `SourceEnum` semantics |
| Close the write gap: stamp `creation_method = EXTERNAL` on API ingestion (see Risk R-1) | `BULK` stamping — belongs to `bilateral/bulk-uploader-handoff`, which owns that ingest path |
| Client: Source chip column + reporter line in the Date cell + the narrow (`<900px`) cards branch | Reporter contact actions (mailto, profile link) |
| Drawer header: Source line beside the existing *Submitted by* (payload already carries it) | A new provenance column anywhere outside Bilateral review |
| `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` change-log entry (root `CLAUDE.md` hard rule, PRD **AC-4**) | |

## Non-Goals

- Not a redesign of the row. The 7→8 column change is the *only* structural change proposed; everything else reuses existing cells.
- Not backfilling historic provenance beyond what the existing migration already wrote.
- Not exposing the reporter's email or any identifier beyond the display name already shown in the drawer.

## Affected Users, Systems, And Specs

| Area | Files |
|---|---|
| SP reviewer (primary) | — |
| Server payload | `onecgiar-pr-server/src/api/results/result.repository.ts:3226-3380` · `results.service.ts:3604-3694` |
| Server write gap | `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts:4159-4180` |
| Client list | `bilateral-review-table.component.{ts,html}` · `bilateral-review.copy.ts` · `result-review-drawer.interfaces.ts` |
| Client drawer | `result-review-drawer.component.{html,ts}` |
| Tests | `bilateral-review-table.component.spec.ts` · `bilateral-review-table.cy.ts` · `bilateral-review.cy.ts` (geometry gates) · `result.repository` spec |
| Docs | `…/bilateral-review/CLAUDE.md` (Verified stamp, same commit) · `bilateral-result-summaries.en.md` |

## Visual Reference

- Source: **User-supplied screenshot of the current UI** (no mockup for the target state yet).
- Location: `.tmp-hitl/bilateral-review-source-reporter-req.png` — 1536-wide desktop, project-grouped view, pending filter, one expanded card with 5 rows.
- Notes: covers the desktop grouped table only. The narrow (`<900px`) cards branch and the drawer header are **not** covered. If the recommendation is approved I suggest generating a lightweight mockup of the new row (desktop + 375px card) under `docs/specs/bilateral/review-list-source-and-reporter/mockup/` during `/akili-specify`, so the colgroup rebalance is agreed before it is measured in CT.

---

## Requirement Delta Preview

### ADDED

- The list row shows a **Source** chip derived from `creation_method` + `external_platform_code`.
- The list row shows the **reporter name** under the submission date.
- The drawer header shows a **Source** line.
- Unknown/absent provenance renders the module's placeholder convention (`—` + `sr-only` explanation), never an invented label.

### MODIFIED

- `GET /api/results/by-program-and-centers` gains 3 additive response fields (`AC-4` change-log entry required).
- `columnWidths()` is rebalanced; the Date column header is relabeled **Submitted**.
- API-ingested results are stamped `creation_method = EXTERNAL` instead of falling to the DB default.

### REMOVED

- Nothing.

---

## Diagnosis — what the data already supports

**Answer to Q1: the columns exist in the database; the list contract does not carry them; and one value is not being written at all.**

| Concept | Column | Status today | Citation as run |
|---|---|---|---|
| Source | `result.creation_method` `varchar(20) NOT NULL DEFAULT 'UNKNOWN'`, indexed `idx_result_creation_method` | Exists. Enum `MANUAL · AI · BULK · EXTERNAL · UNKNOWN` | `result.entity.ts:515-522`, `:57` · `shared/constants/result-creation-method.enum.ts` · `migrations/1784921547596-AddResultCreationMethod.ts:8-14` |
| Platform (for Via API) | `result.external_platform_id` (= CLARISA `mis.id`), `result.external_platform_code` (= `mis.acronym`, e.g. STAR/MEL) | Exists, authenticated from the API key — **not** from the caller-declared `tenant` | `result.entity.ts:576-589` · `bilateral.service.ts:4204-4212` · `interfaces/external-platform-identity.interface.ts` |
| Reporter | `result.external_submitter` → FK `users.id`; `created_by` is the documented fallback | Exists, already rendered as `submitter_name` in the **drawer** | `result.entity.ts:525-535` · `result.repository.ts:3401`, `:3450-3451` · `results.service.ts:2864-2871` |
| List payload | — | **Missing all three.** Closed allowlist mapper | `results.service.ts:3646-3662` |
| Detail payload | — | **Carries `creation_method` + `is_ai_generated` + `submitter_name`**; the client interface just never declared them | `result.repository.ts:3400-3407` vs `result-review-drawer.interfaces.ts:47-61` |

### The write gap (this is the finding that changes the shape of the work)

Only **two** code paths ever write `creation_method` (verified: `grep -rn "creation_method" onecgiar-pr-server/src --include="*.ts"`, 2026-09-21):

| Path | Value written | Citation |
|---|---|---|
| Bilateral AI draft promotion | `AI` | `bilateral-ai.service.ts:952` |
| Centre manual create (drawer) | `MANUAL` | `bilateral-center.service.ts:394` |
| **External API ingestion** | **nothing** — the `save({…})` omits the column, so MySQL applies `DEFAULT 'UNKNOWN'` | `bilateral.service.ts:4159-4180` |
| `BULK` | never written by any path | — |

`EXTERNAL` exists only as a **one-off migration backfill** (`… CASE WHEN source = 'API' THEN 'EXTERNAL' …`, `migrations/1784921547596:11`). Consequence: **every bilateral result ingested through the API after that migration ran reads `UNKNOWN`, not `EXTERNAL`.** A Source column built naively on `creation_method` alone would therefore show "Unknown" on exactly the rows the reviewer most wants to identify. Two things follow, and both are in scope:

1. **Display derivation must not trust `creation_method` alone** (rule below).
2. **Stamp `creation_method = EXTERNAL` at ingestion** so the column becomes trustworthy going forward. Additive, no migration, one line in the header save.

### The derivation rule (answers Q3 and Q5)

```
AI                                        → "AI-assisted"     (violet/info pair, auto_awesome)
MANUAL                                    → "Manual entry"    (neutral, edit)
BULK                                      → "Bulk upload"     (neutral, upload_file)
EXTERNAL                                  → "Via API" + platform if known
UNKNOWN && external_platform_code != null → "Via API · STAR"  (neutral, api)   ← today's real API rows
UNKNOWN && external_platform_code == null → "—" + sr-only "Source not recorded"
```

**Via API is ONE composite chip, not two pieces**: `Via API · STAR`, with the full sentence in `title`/`aria-label` (*"Received through the STAR platform API"*). Two separate chips would need ~180px in a column the layout cannot afford (see Option 1), and the platform is meaningless without the "Via API" qualifier. When `external_platform_code` is null the chip degrades to plain `Via API` — never an invented platform name (module rule: *"never invent a display value the server didn't send"*, `bilateral-review/CLAUDE.md` Gotchas).

**Empty states (Q5)** follow the module's existing `isPlaceholder` / `notSpecified` convention already used by Alignment and Lead center (`bilateral-review-table.component.ts:441`, `:469-473`; `bilateral-review.copy.ts:139`): `—` visible, `aria-hidden`, plus one `sr-only` string naming the field. Reporter null → same treatment; the server falls back `external_submitter ?? created_by` before deciding it is genuinely absent (the precedent at `results.service.ts:2867-2871`).

### Consistency with existing patterns (Q6)

- The AI value **must render through `AiProvenanceNoticeComponent variant="badge"`** (`pages/bilateral/components/ai-provenance-notice/`), not a new pill. **APF-R-12** exists precisely so the AI-transparency sentence cannot drift surface to surface, and it already normalises `'0'`/`0`/`null` so truthiness never misreads. The other three values are ordinary neutral pills in a new `bilateral-review-source-chip`.
- Pills reuse the design system's **fixed fg/bg pairs**; no recombination (client hard rule 9), no `--pr-color-*-100` shades as fills (module Gotcha: those are saturated mid-tones, not tints).
- Icons from `@ng-icons/lucide` / the existing `material-icons-round` set already in this template — no inline SVG.

---

## The width problem (this is what decides the UX)

Every option is constrained by one measured fact: since BRH-T-3 attempt 3 the table is **`table-fixed` with one shared `<colgroup>`**, and **Title is the only column with no width**, so it absorbs the entire remainder (`bilateral-review-table.component.ts:121-126`; `bilateral-review/CLAUDE.md`, Gotchas).

| | Fixed columns | Title @1280 | Title @1000 |
|---|---|---|---|
| Today | 96+110+120+220+100+100 = **746px** | **530.5px** (measured, CT) | **250.5px** (measured, CT) |
| +2 columns (Option 1) | 976px | ~300px | **~20px — broken** |
| +1 column, no rebalance | 850px | ~426px | ~146px |
| **+1 column, with rebalance (Option 2)** | **808px** | **~468px** | **~188px** |

BRV-R-3 requires Title to stay the widest column at both widths. Option 1 fails that at 1280 and fails outright at 1000; it also reopens the horizontal-overflow defect class that BRH-T-3 needed three attempts and a live-page HITL finding to close.

---

## Approach Options

### Option 1 — Two dedicated columns: `SOURCE` + `REPORTER`

```
CODE   TITLE                              LEAD CTR  SOURCE        REPORTER      STATUS   ALIGNMENT  DATE    ACTIONS
8594   National seed policy reform…       CIMMYT    Via API·STAR  A. Pérez      Pending  HLO1.AOW…  6 Jul   Review
       [Policy change]
```

| Pros | Cons |
|---|---|
| Maximum scannability; both dimensions are first-class and trivially sortable/filterable later | **−230px from Title** → ~20px at 1000px. Fails BRV-R-3 and reopens the `table-fixed` overflow defect |
| No row-height change | Reporter names are long, low-scan text occupying prime horizontal space on every row |
| | The narrow branch must grow two more meta lines per card |

**Verdict: reject** on the measurement, not on taste.

### Option 2 — One `SOURCE` column + reporter in the Date cell's vertical slack **(recommended)**

```
CODE   TITLE                                       LEAD CTR  SOURCE          STATUS   ALIGNMENT   SUBMITTED   ACTIONS
8594   National seed policy reform…                CIMMYT    ⚡ Via API·STAR  Pending  HLO1.AOW1…  6 Jul 2026  ✎ Review
       [Policy change]                                                                             A. Pérez
```

One new 104px chip-only column after Lead Center, paid for by a colgroup rebalance (Lead Center 110→88 — it holds a 6-char acronym; Alignment 220→200). The reporter goes on a **second line inside the existing Date cell**, relabeled **SUBMITTED**.

| Pros | Cons |
|---|---|
| **No row grows.** The date cell is today one 12px right-aligned line in a ≥44px row (`bilateral-review-table.component.html:163-165`) — ~18px of unused vertical space. A 11px reporter line lands in slack that already exists | Requires touching `columnWidths()`, the one thing three CT geometry gates measure |
| Title stays the widest column at both measured widths (~468 / ~188) | Reporter is truncated at ~100px — first-initial + surname for long names |
| Source stays scannable as a chip, which is what a 4-value categorical deserves | Two cells change, not one |
| Semantically right: *submitted on / submitted by* belong together, and it matches the drawer's own "Submitted by" | |

### Option 3 — Zero new columns: Source chip on the existing badge line, Reporter drawer-only

Append the Source chip beside the result-type badge in the Title cell; leave Reporter where it already works (drawer header) and put it in the Source chip's tooltip.

| Pros | Cons |
|---|---|
| Cheapest and lowest risk — no colgroup change, no CT geometry gate touched | Two pills on one line need `flex-wrap`; at 1000px Title is 250px and a long category (*"Capacity Sharing for Development"*) + a source chip **will** wrap → +13px on many rows, straight into the row-height cap that BRH-T-3 already re-based twice |
| Ships in a day | **Does not deliver Reporter in the list**, which is half the request |
| Keeps all AI provenance in one place | A tooltip is not scannable; the reviewer still opens rows to triage |

---

## Recommended Approach

> **Superseded in places by `design.md` (2026-09-21, after judgment-day round 1) — kept as the approved-intent record.**
> Changed: the SOURCE column is **116px**, not 104px (the delegated AI badge is ~88px and carries no `whitespace-nowrap`), Alignment goes to **192px**, not 200px *(superseded: re-tuned to **184px** at execute time on CT measurement — `design.md` DD-2 is authoritative)*, and `columnWidths()` is edited as a **conditional builder**, not a flat literal. Corrected citations: the ingestion header save is `bilateral.service.ts:4161-4181` and `BilateralCommonFields` is `result-review-drawer.interfaces.ts:52-65`. `design.md` is authoritative on all of these.

**Option 2**, scoped as **UI + API**.

Why:

1. It is the only option that puts **both** requested facts on the row while keeping Title the widest column at 1000px and 1280px — the constraint the module has already paid three attempts and a live-page HITL round to establish.
2. It adds **zero row height**, by spending vertical slack that measurably exists in the Date cell rather than adding a line to the Title cell. Density is this page's recurring failure mode (the pinned band is still 132px over budget at 1280 — `bilateral-review/CLAUDE.md`, Contract), so an option that grows every row is the wrong one.
3. The backend work is genuinely small and additive — three fields on an existing SELECT/mapper plus one ingestion stamp — and it also **fixes a real data defect** (`UNKNOWN` on every API-ingested result) that any Source display would otherwise expose to users as "Unknown".
4. The drawer half is nearly free: the payload already carries `creation_method`; it needs an interface declaration and one line of template.

**Responsive (Q4).** Below 900px the page already switches to a cards branch (no `<table>`) — design.md §9's *"never hide columns silently"* is satisfied by that documented divergence, not by horizontal scroll. Priority in the card:

| Priority | Card placement |
|---|---|
| 1 Status, Title, Code | unchanged |
| 2 **Source chip** | on the existing caption line, after the type badge — a 4-value chip is short enough to sit there without wrapping |
| 3 Date + **Reporter** | same stacked pair as the wide branch, in the card's meta row |
| 4 Alignment, Lead center | unchanged (already capped/truncated) |

Nothing is dropped; the chip and the reporter both travel to the card. ⚠️ The narrow group header is **two stacked rows** (BRH-T-2 attempt 2) — do not collapse it to make room; that was a Reviewer FAIL once already.

### Suggested AKILI scope: **Lite**

| Task | Where |
|---|---|
| T-1 | Server: extend `getResultsByProgramAndCenters` SQL (`r.creation_method`, `r.external_platform_code`, `MAX(CONCAT(u.first_name,' ',u.last_name)) AS reporter_name` over a `LEFT JOIN users u ON r.external_submitter = u.id`) + GROUP BY + the mapper allowlist + repo spec (`?` count === params length) |
| T-2 | Server: stamp `creation_method = ResultCreationMethod.EXTERNAL` in the ingestion header save; optional backfill migration for rows written between the 1784921547596 migration and this fix |
| T-3 | Client: `bilateral-review-source-chip` (delegating the AI case to `AiProvenanceNoticeComponent`), the new column + colgroup rebalance, the SUBMITTED cell, the cards branch, copy keys |
| T-4 | Client: `BilateralCommonFields.creation_method` + drawer header Source line |
| T-5 | Tests: component spec, `bilateral-review-table.cy.ts` + `bilateral-review.cy.ts` geometry re-base, HITL live-page look |
| T-6 | Docs: `bilateral-result-summaries.en.md` change log (**AC-4**) + `bilateral-review/CLAUDE.md` Verified stamp |

**Budget note:** per the recorded lesson that AKILI budgets undercount tests (~60% of LOC), T-5 is the largest task here, not T-3. Pre-agree the tripwire response at `/akili-specify`.

---

## Risks, Dependencies, And Open Questions

| # | Risk | Mitigation |
|---|---|---|
| **R-1** | **`UNKNOWN` on live API rows.** Without T-2 the new column shows "—" for most of the real queue and the feature reads as broken | T-2 stamps `EXTERNAL` at ingestion; the display rule already falls back to `external_platform_code != null` so existing rows still read "Via API" without a backfill |
| **R-2** | **`columnWidths()` is load-bearing.** Three CT geometry gates and the BRH-R-1 contract measure it; the last rebalance took three attempts plus a live-page HITL finding (drifting per-card column widths) | Measure in CT at 1000/1280/1536 **before** declaring done; re-run `bilateral-review-table.cy.ts` Gate 1 and Gate 7 against the real `.overflow-x-auto` scroller (a `<section overflow-hidden>` measuring itself is a tautology) |
| **R-3** | **Row-height caps.** `bilateral-review.cy.ts` caps three row shapes (44 / 49.5 / 68px). A second line in the Date cell must stay inside existing slack | Gate it: assert the three caps are unchanged, not re-based. If a cap must move, that is the signal Option 2 is wrong |
| **R-4** | **Payload contract.** `/api/results/by-program-and-centers` is consumed by `results-center-reporting-guide` and the count service too | Additive-only (ADR-004); the mapper allowlist means nothing is removed. Change-log entry required (**AC-4**) |
| **R-5** | **`status_id` loose-`==` family.** The module warns the wire sometimes sends strings; `creation_method` is a string but `external_platform_id` is numeric | Compare `external_platform_code` (string) for display; never `Number()` a possibly-null id — `Number(null) === 0` already shipped a defect on this page (BRC-T-1) |
| **R-6** | **Diff review will not catch this one.** Three prior defects on this exact page (off-screen column, unstyled drawer, always-mounted overlay) were found only in a live browser | HITL live-page look is mandatory in `/akili-validate`, at 1000px and 375px, not only 1536 |
| **R-7** | Shared-worktree concurrency: `result.repository.ts` and the table colgroup are hot files | One AKILI session per checkout; explicit-path diffs |

### Open questions for the user

| # | Question | My recommendation if you don't want to decide |
|---|---|---|
| **OQ-1** | Reporter display: full name (`Ana Pérez`), or initial+surname (`A. Pérez`) to survive the ~100px cell? | Full name with `truncate` + `title` — the cell truncates gracefully and the tooltip always carries the full name |
| **OQ-2** | Should `BULK` be stamped now, or left to `bilateral/bulk-uploader-handoff`? | Leave it there — that spec owns the ingest path. The display rule already handles `BULK` the day it starts arriving |
| **OQ-3** | Filter by Source? (A 5th chip dimension in the Filter popover) | **Not in this spec.** Ship the column first; decide once the real value distribution is visible |
| **OQ-4** | Header label — `SOURCE` or `ORIGIN`? | `SOURCE`, matching the user's own wording and the column name |

## Success Criteria

1. Every row in the desktop table and every narrow card shows a Source chip and a reporter name, or the module's placeholder when the data is genuinely absent.
2. A result ingested through the external API after T-2 reads `Via API · <platform>`, not `Unknown`.
3. Title remains the widest column at 1000px and 1280px, measured in CT.
4. The three row-height caps in `bilateral-review.cy.ts` pass **unchanged**.
5. No horizontal scrollbar on `documentElement` at 375px; the real `.overflow-x-auto` scroller shows no table overflow at 1000px.
6. The AI value renders the APF-R-12 sentence — no second copy of that string exists in the repo.
7. `bilateral-result-summaries.en.md` carries the change-log entry.

## Next Step

```text
/akili-specify bilateral/review-list-source-and-reporter
```

Lite depth, Change track. Before that, answer **OQ-1** and confirm **Option 2** (or pick Option 1/3) — and say whether you want a mockup of the new row generated into `mockup/` first.

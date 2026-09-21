# Requirements — Source and Reporter on the Bilateral review list

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/review-list-source-and-reporter/` |
| Module code | **`BSR`** (Bilateral review — Source & Reporter) |
| Depth | **Lite** (Change track) |
| Type | Change |
| Approval Mode | **pre-approved** (Juan Carlos Cadavid, 2026-09-21) — *"Tras el specify, si no hay HITL bloqueante, puedes seguir a /akili-execute."* Routine gates auto-pass and are logged; escalations (judgment-day severe findings, budget tripwire, Pivot, destructive actions) still stop. |
| Status | approved |
| Owner | Juan Carlos Cadavid |
| Date | 2026-09-21 |
| Verified at | `da132347c` |
| Proposal | `./proposal.md` — **Option 2** approved verbatim; OQ-1 full name + truncate/`title`, OQ-2 `BULK` out of scope, OQ-3 no Source filter, OQ-4 header reads `SOURCE`, no mockup. |
| Ticket(s) | none yet |

---

## 1. Module / Feature

- **Module:** `bilateral`
- **Sub-feature:** Source & Reporter on the Bilateral review result list
- **Owner:** Juan Carlos Cadavid
- **Status:** approved

## 2. Context

The **Bilateral review** tab (`entity-details/:entityId/bilateral-review`) is where an SP reviewer approves or rejects the W3/Bilateral results centres reported to their program. The row shows Code, Title, Lead Center, Status, Alignment, Date and the Review action — but nothing about **how the result got into PRMS** or **who put it there**. Both are triage signals: an AI-assisted draft and a result pushed by STAR through the API deserve different reading attention, and knowing the reporter is what turns a doubt into a message.

Both facts already exist in the database and one of them already reaches the drawer.

**Claims about current behavior** (each cited as run at `da132347c`, or marked):

- The list renders 7 columns and no provenance — `bilateral-review-table.component.html:40-200`; `columnWidths()` returns `['96px','','110px','120px','220px','100px','100px']` at `bilateral-review-table.component.ts:121-126`.
- The list payload maps a closed allowlist of 14 fields and carries neither provenance nor reporter — `results.service.ts:3646-3662`.
- The drawer already renders `Submitted by: {{ commonFields.submitter_name }}` — `result-review-drawer.component.html:162-169`.
- The detail SQL already selects `r.creation_method` and `is_ai_generated`; the client interface never declares them — `result.repository.ts:3406-3407` vs `BilateralCommonFields` at `result-review-drawer.interfaces.ts:52-65`.
- Exactly two code paths **decide** a fresh `creation_method` (`AI` at `bilateral-ai.service.ts:952`, `MANUAL` at `bilateral-center.service.ts:394`); a third **copies one forward** (`result.repository.ts:137,177,219`, the phase-rollover `replicate()` `INSERT`). The API-ingestion header save writes none, so MySQL applies `DEFAULT 'UNKNOWN'` — `bilateral.service.ts:4161-4181`, column default at `result.entity.ts:515-522`. Verified by `grep -rn "creation_method" onecgiar-pr-server/src --include="*.ts"` → **24 matching lines**. See `design.md` P-2 for why the copy-forward site changes nothing here.
- The list is already scoped by `WHERE r.source = 'API'`, which means *"is W3/bilateral"*, not *"arrived through the external API"* — `result.repository.ts:3326`, semantics documented at `result.entity.ts:551-574`.

Flows and screens: `docs/ux-ui/design.md` §6 *Listing screens* · §6 *Empty / error / loading* · §7 Design tokens · §8 Component rules · §9 Responsive · §10 Accessibility.
Baseline: `docs/prd.md` G3, **AC-4** · `docs/trd/trd.md` ADR-004 (bilateral additive-only).
Module contract: `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/CLAUDE.md` (the `table-fixed` + shared `<colgroup>` rule, the status fg/bg pair rule, the `isPlaceholder` convention).

## 3. In Scope / Out of Scope

### In scope

- Three additive fields on `GET /api/results/by-program-and-centers`: `creation_method`, `external_platform_code`, `reporter_name`.
- Stamping `creation_method = EXTERNAL` on external-API ingestion so the column stops defaulting to `UNKNOWN`.
- A **SOURCE** column in the wide table and the equivalent chip in the narrow cards branch.
- The reporter name as a second line in the submission-date cell, whose header becomes **SUBMITTED**.
- A Source line in the review drawer header.
- The `bilateral-result-summaries.en.md` change-log entry.

### Out of scope

- Filtering or sorting by Source or Reporter (`BSR-OQ-1`, deferred by user decision).
- Writing `BULK` — owned by `bilateral/bulk-uploader-handoff`.
- Any reporter contact affordance (mailto, profile link), email, or identifier beyond the display name.
- Changing `source` / `SourceEnum` semantics.
- Backfilling provenance beyond what migration `1784921547596` already wrote.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| **SP reviewer** (primary) | Sees origin and reporter per row; triages the pending queue without opening each result |
| Result submitter / centre reporter | No change to their flows; their name becomes visible to the reviewing program (it already was, inside the drawer) |
| Bilateral consumer (downstream) | No change — this endpoint is PRMS-internal; the bilateral payload contract is untouched except for its change log |

## 5. User Stories

- **`BSR-US-1`** — As an **SP reviewer**, I want to see where each pending result came from, so that I can give an AI-assisted draft and a platform-pushed result the reading attention each deserves. *(Refines `US-Q2`-class review work; supports `G3`.)*
- **`BSR-US-2`** — As an **SP reviewer**, I want to see who reported each result, so that I can reach the right person before rejecting.
- **`BSR-US-3`** — As an **SP reviewer** on a narrow screen, I want the same two facts on the card, so that nothing is silently dropped below 900px (`docs/ux-ui/design.md` §9).

## 6. Functional Requirements

### Required (MUST)

- **`BSR-R-1`** — `GET /api/results/by-program-and-centers` MUST return, per result, `creation_method` (string), `external_platform_code` (string or `null`) and `reporter_name` (string or `null`), **additively** — every field it returns today MUST still be returned with the same name and value.
- **`BSR-R-2`** — `reporter_name` MUST resolve as `external_submitter`'s display name, falling back to `created_by`'s when `external_submitter` is null, and `null` when neither resolves. The join MUST NOT change the number of rows the query returns.
- **`BSR-R-3`** — A result created through the external bilateral API MUST be stamped `creation_method = 'EXTERNAL'` at creation. Results created by the AI promotion path (`AI`) and the centre manual-create path (`MANUAL`) MUST keep the value they already write.
- **`BSR-R-4`** — The list row MUST display exactly one Source value, derived as:

  | `creation_method` | `external_platform_code` | Displayed |
  |---|---|---|
  | `AI` | any | `AI Result` badge (the APF-R-12 component) |
  | `MANUAL` | any | `Manual entry` |
  | `BULK` | any | `Bulk upload` |
  | `EXTERNAL` | `"STAR"` | `Via API · STAR` |
  | `EXTERNAL` | `null` / blank | `Via API` |
  | `UNKNOWN` / anything unmapped | non-blank | `Via API · <code>` |
  | `UNKNOWN` / anything unmapped | `null` / blank | placeholder (see `BSR-R-7`) |

- **`BSR-R-5`** — The AI value MUST render through the existing `AiProvenanceNoticeComponent` (`variant="badge"`). The repository MUST NOT gain a second copy of the `AI_PROVENANCE_NOTICE_TEXT` string (APF-R-12).
- **`BSR-R-6`** — The row MUST display the reporter's **full name**, visually truncated to the cell with the full name available via the `title` attribute.
- **`BSR-R-7`** — Absent Source and absent reporter MUST render the module's existing placeholder convention: an `aria-hidden` `—` plus one `sr-only` string naming the field. The UI MUST NOT invent a display value the server did not send.
- **`BSR-R-8`** — The Source chip and the reporter line MUST appear in **both** rendering branches: the ≥900px table and the `narrow()` cards branch.
- **`BSR-R-9`** — The review drawer header MUST show the Source alongside the existing *Submitted by*, using the same derivation as `BSR-R-4` over the detail payload's `creation_method`.
- **`BSR-R-10`** — All new user-facing strings MUST live in `bilateral-review.copy.ts` (and the shared AI constant for the AI case). No hard-coded English in the templates.

### Should (SHOULD)

- **`BSR-R-11`** — The Source chip SHOULD carry a descriptive accessible name (e.g. *"Received through the STAR platform API"*), not only the visible short label.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Layout (hard)** | Under `table-fixed`, Title MUST remain the widest column at **1000px and 1280px** viewport width, measured in CT. Current measured baseline: 530.5px @1280, 250.5px @1000 |
| **Layout (hard)** | The three row-height caps in `bilateral-review.cy.ts` (one-line-no-badge, one-line-with-badge, two-line-with-badge) MUST pass **unchanged** — no cap may be re-based by this spec |
| **Layout (hard)** | `documentElement.scrollWidth <= clientWidth` at 375px; the real `.overflow-x-auto` scroller inside a group card MUST show no table overflow at 1000px |
| **Performance** | The list query MUST NOT gain a row-multiplying join; result count for a given `(programId, versionId)` MUST be identical before and after |
| **Backwards compatibility** | Additive only on the payload (`AC-4`, ADR-004). No field renamed or removed. Change-log entry required in `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` |
| **Accessibility** | WCAG 2.1 AA (`docs/ux-ui/design.md` §10). Chip contrast ≥ 4.5:1; every placeholder has an `sr-only` explanation; the chip has an accessible name |
| **Internationalization** | All strings via `bilateral-review.copy.ts` |
| **Security / privacy** | Only the display name is exposed — never email, id, or any other user field. No secrets in logs (`.cursorrules`) |
| **Design system** | Fixed `--pr-*` fg/bg pairs only; never a `--pr-color-*-100` shade as a pill fill (module Gotcha); no new hex |

## 8. Defect classes this spec can produce → the gate that catches each

| # | Defect class | Gate |
|---|---|---|
| D1 | Mapper drops/misnames a field | `npx jest src/api/results/result.spec.ts` — assert all three new keys present with the raw row's values |
| D2 | SQL breaks: bad alias, `?`/param mismatch, row multiplication from the `users` join | `npx jest src/api/results/result.repository.spec.ts` — SQL-string spec: new aliases present, every previously selected alias still present, `?` count === params length, join is `LEFT`, new non-aggregated columns are in the `GROUP BY` |
| D3 | **Real-data aggregation** — the join actually duplicates rows against production-shaped data | **No automated gate.** CI has no database. → **Substituted:** HITL check on the live page at `/akili-validate` — row count per group before/after. Recorded here as a deliberate substitution, not a gap |
| D4 | Derivation logic wrong (esp. `UNKNOWN` + platform ≠ `Via API`) | `npx jest …/bilateral-review-table.component.spec.ts` — table-driven over all 7 rows of the `BSR-R-4` matrix |
| D5 | **Layout/geometry** — Title starves, table overflows, row grows | `npx cypress run --component --spec …/bilateral-review-table.cy.ts,…/bilateral-review.cy.ts` — rendered measurements at 1000/1280/1536 + 375; row-height caps unchanged; the real `.overflow-x-auto` scroller measured, never the `overflow-hidden` section |
| D6 | **Compiler-only** — typed contract or template expression | `npx tsc --noEmit` **and** `npm run build` (tsc does **not** typecheck Angular templates — client `src/CLAUDE.md` §21.7) |
| D7 | Copy drift — a second AI-transparency string | `grep -rn "Generated with AI assistance" onecgiar-pr-client/src` MUST return exactly 1 hit (the constant's definition) |
| D8 | A11y — chip without accessible name, placeholder without `sr-only` | Structural CT assertions on `aria-label` / `sr-only` presence |
| D9 | **Contrast** of the new chip | **No automated gate** — `cypress-axe` is not installed in this repo (module CLAUDE.md). → **Substituted:** HITL pre-audit ≥ 4.5:1 at `/akili-validate`, same convention the module's existing pills use |

No defect class is left unmeasured **and** unsubstituted.

## 9. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `BSR-AC-1` | A raw row with `creation_method='EXTERNAL'`, `external_platform_code='STAR'`, `reporter_name='Ana Pérez'` | The service maps the list response | The mapped result carries all three fields **and** the 14 pre-existing fields unchanged |
| `BSR-AC-2` | The repository SQL | It is built for any parameter combination | The new aliases are present, every previously selected alias survives, `?` count === params length, and the `users` join is `LEFT` |
| `BSR-AC-3` | A `CreateBilateralDto` ingested through the external API | The result header is saved | The persisted row has `creation_method = 'EXTERNAL'` |
| `BSR-AC-4` | A row with `creation_method='UNKNOWN'` and `external_platform_code='MEL'` | The table renders | The Source cell reads `Via API · MEL` — **not** a placeholder, **not** "Unknown" |
| `BSR-AC-5` | A row with `creation_method='AI'` | The table renders | The Source cell contains the `AiProvenanceNoticeComponent` badge, and `AI_PROVENANCE_NOTICE_TEXT` appears exactly once in the repository |
| `BSR-AC-6` | A row with `creation_method='UNKNOWN'` and `external_platform_code=null` | The table renders | The Source cell shows an `aria-hidden` `—` plus one `sr-only` string naming Source; no invented label |
| `BSR-AC-7` | A row with `reporter_name=null` | The table renders | The SUBMITTED cell shows the date and the placeholder treatment for the reporter; the date is unaffected |
| `BSR-AC-8` | A row with a long reporter name | The table renders at 1280px | The name is truncated with the full value in `title`; the row does not grow |
| `BSR-AC-9` | The grouped table | Rendered at 1000px and 1280px | The Title column is the widest column at both widths |
| `BSR-AC-10` | The three row shapes the CT measures | Rendered after this change | All three existing height caps pass **unchanged** |
| `BSR-AC-11` | The page at 375px | Rendered | `documentElement.scrollWidth <= clientWidth`; the card shows the Source chip and the reporter |
| `BSR-AC-12` | A result with `creation_method='MANUAL'` | The review drawer opens | The header shows `Manual entry` beside the existing *Submitted by* |
| `BSR-AC-13` | The grouped table at 1000px with the real `.overflow-x-auto` scroller | Measured | The nested `<table>`'s `scrollWidth` does not exceed that scroller's `clientWidth` |

Cross-cutting ACs that already apply (referenced, not restated): `AC-3` (authorization — unchanged, the endpoint's existing gating stands), `AC-4` (bilateral stability), `AC-9` (secrets).

## 10. Dependencies & Assumptions

### Upstream

- `result.creation_method`, `result.external_platform_code`, `result.external_submitter`, `users` — all existing columns, no migration required for the read path.
- `AiProvenanceNoticeComponent` (`pages/bilateral/components/ai-provenance-notice/`) — standalone, importable from this module.

### Downstream consumers of the changed contract

`GET_ResultToReview` / `ResultToReview` readers, swept at `da132347c` (`grep -rn "GET_ResultToReview" onecgiar-pr-client/src --include="*.ts"` and `grep -rln "ResultToReview" …`): `bilateral-review.component.ts`, `bilateral-review-count.service.ts`, `bilateral-results.service.ts`, `results-center-reporting-guide.component.ts`, `dashboard-lab.component.ts`, `where-to-report-modal.component.ts`, `programme-results.component.ts`, `results-list.component.ts`, `notification-item.component.ts`, plus their spec files. All read named fields; none asserts an exact object shape (`result.spec.ts:1553-1560` asserts `project_id` and length only). **Additive fields are therefore non-breaking** — recorded as premise `P-8`.

### Assumptions

- `users.first_name` / `users.last_name` are populated for the submitters that reach this queue (the drawer already renders the same concatenation, so this holds wherever the drawer shows a name today).
- No production backfill is required: the display derivation reads `external_platform_code` for `UNKNOWN` rows, so existing API-ingested rows read correctly without touching data.

## 11. Open Questions

- `BSR-OQ-1` — Should Source become a filter dimension in the Filter popover? **Deferred by user decision (proposal OQ-3)**; revisit once the real value distribution is visible. Not blocking.
- `BSR-OQ-2` — Should a one-off backfill stamp `EXTERNAL` on rows ingested between migration `1784921547596` and `BSR-R-3`? **Not blocking** — the `UNKNOWN` + platform-code branch of `BSR-R-4` already renders them correctly. Recorded as a follow-up in `design.md` §13.

## 12. Out-of-Band Notes

- `result.spec.ts:1522-1547` feeds the mapper a fixture keyed `indicator_category` while the mapper reads `row.result_category` — pre-existing test slop, out of scope, do not "fix" it inside this spec.
- Concurrency: `result.repository.ts` and the table `<colgroup>` are hot files shared with other in-flight bilateral work. One AKILI session per checkout; explicit-path diffs on commit.

---

## Required cross-references

- `docs/prd.md` — G3, **AC-4**, AC-3, AC-9
- `docs/ux-ui/design.md` — §6 Listing screens · §6 Empty/error/loading · §7 Tokens · §8 Component rules · §9 Responsive · §10 Accessibility
- `docs/trd/trd.md` — ADR-004 (bilateral additive-only)
- `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` — change log entry required
- `onecgiar-pr-client/.../bilateral-review/CLAUDE.md` — the `table-fixed` colgroup contract, status pair rule, `isPlaceholder` convention
- `./proposal.md` · `./design.md` · `./tasks.md`

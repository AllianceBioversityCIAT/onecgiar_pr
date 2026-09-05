# Pending archive syncs — `changes/my-work-board`

Baseline-document edits this spec identified but **must not make on the spec branch**
(root `CLAUDE.md` → *Shared-file write discipline*). Apply them on the **default branch
(`master`)** during `/akili-archive`, then tick the boxes here.

| Field | Value |
|---|---|
| Spec | `docs/specs/changes/my-work-board` · prefix `MWB` |
| Recorded by | `MWB-T-6` (Implementer), 2026-09-05 |
| Branch when recorded | `qa-development-2026` |
| Sources | `requirements.md` §12 *Out-of-Band Notes* · `design.md` §13 · `MWB-DD-10` · `MWB-DD-1`/`DD-2` |

---

## `MWB-PA-1` — `docs/trd/trd.md` `W1`: `status_id` 2 and 3 are inverted

- [ ] Applied on `master`

**File / anchor:** `docs/trd/trd.md` → `## 5. Backend Workflows & Business Rules` → `### W1. Result lifecycle (Editing → QA → Submitted)`, third bullet (line 322 at time of recording).

**Current text (verbatim):**

> - Submit transitions to `status_id=2` (Quality Assessed) or directly to QA queue depending on the configured cycle. QA reviewer transitions to `status_id=3` (Submitted) or back to `1` with comments.

**Proposed text:**

> - Submit transitions to `status_id=3` (Submitted) — the result enters the QA queue. The QA reviewer transitions to `status_id=2` (Quality Assessed) or sends it back to `1` (Editing) with comments.

**Evidence (code is the authority):**

| Claim | Source |
|---|---|
| Submit writes `status_id: 3` | `onecgiar-pr-server/src/api/results/submissions/submissions.service.ts:84`, `:148`, `:153`, `:351` (`this._resultRepository.update(result.id, { status: 1, status_id: 3 })`) |
| Un-submit / send-back writes `status_id: 1` | same file, `:214`, `:219`, `:271`, `:276` |
| `submissions.service.ts` **never writes** `status_id: 2` | `grep -rn "status_id: 2\|status_id = 2" onecgiar-pr-server/src/api` → only read filters (`result.repository.ts:1667`, `:1906`, `ipsr.repository.ts:221`) |
| Label vocabulary: `1 Editing · 2 QAed · 3 Submitted · 4 Discontinued · 5 Pending` | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/result-framework-reporting-home/status-meta.ts` |

**Why it matters:** this spec's `STATUS_COLUMN_MAP` (`MWB-DD-1b`) maps 3 → *Submitted* and 2 → *Approved*. A reader following the TRD prose would call the board's grouping a defect.

---

## `MWB-PA-2` — `docs/ux-ui/design.md` §5 rule 2: scope it to external deep links (`MWB-DD-10`)

- [ ] Applied on `master`

**File / anchor:** `docs/ux-ui/design.md` → `## 5. Navigation Model` → `### Navigation rules`, rule **2** (line 152 at time of recording).

**Current text (verbatim):**

> 2. Deep links to a result (`/results/result-detail/:id`) MUST land directly on General Information; query params (`?phase=`) preserve phase context as in `pdf_link`/`prms_link`.

**Proposed text:**

> 2. **External** deep links to a result (`/results/result-detail/:id` — `pdf_link`, `prms_link`, notification and e-mail links) MUST land directly on General Information; query params (`?phase=`) preserve phase context. **In-app** section navigation is exempt: the result detail's own panel menu and the Science Program *My work* board's **Continue** action navigate straight to a named section route (`MWB-DD-10`). Every fallback and every *Open* affordance still lands on `general-information`.

**Why it matters:** `MWB-R-6` requires **Continue** to land on the card's first missing section. Read literally, rule 2 forbids that. `MWB-DD-10` records the decision; the baseline still carries the unqualified rule.

---

## `MWB-PA-3` — `docs/ux-ui/design.md` §4 screen inventory: add the *My work* board

- [ ] Applied on `master`

**File / anchor:** `docs/ux-ui/design.md` → `## 4. Screen Inventory`, the screen table (lines 124–139 at time of recording). The table has no row for any Science Program tab beyond the generic **Result Framework Reporting** entry.

**Proposed row (insert after *Result Framework Reporting*):**

| Screen | Module path | Personas | Purpose |
|---|---|---|---|
| **My work (SP board)** | `pages/result-framework-reporting/pages/my-work-board` | Submitter | 4th Science Program tab. The submitter's own results for one programme + phase, grouped by status in five fixed columns; read-only, with completeness and a *Continue* deep link into the first missing section. |

---

## `MWB-PA-4` — `docs/ux-ui/design.md` §5: the SP tab strip is not enumerated anywhere

- [ ] Applied on `master`

**Finding, recorded honestly so the archive step does not chase a missing anchor:** `design.md` §5 *Navigation Model* contains **no enumeration of the Science Program tab strip**. `grep -n "Overview.*Reporting.*Results" docs/ux-ui/design.md` returns nothing; the only tab-strip mention in the file is §6 line 308 (`Panel menu` collapsing below `md`), which is the result detail, not the SP band.

So `MWB-PA-4` is an **add**, not an edit. Suggested bullet under `## 5. Navigation Model`:

> - **Science Program shell** (`result-framework-reporting/entity-details/:entityId`) exposes a four-tab strip in the programme band — **Overview** · **Reporting** · **Results** · **My work**. Tabs preserve `?phase=` (`queryParamsHandling="preserve"`). *My work* carries a count badge (the submitter's Editing-column total for the selected phase) that is hidden at 0.

**Source of truth for the four tabs:** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band/reporting-program-band.component.html` (the `my-work` anchor at lines 237–263).

> ⚠️ The design's own reserved fourth slot, `Drafts`, is a **center-view** tab behind `sc-if="centerMode"` — it is deliberately *not* the programme-view tab (`MWB-DD-12`). Do not merge the two when writing this bullet.

---

## `MWB-PA-5` — `docs/trd/trd.md` §4: document the `include_completeness` query flag

- [ ] Applied on `master`

**File / anchor:** `docs/trd/trd.md` → `## 4. API Surface & Contracts` → `### Conventions` (after the *Swagger* bullet, line ~295 at time of recording).

**Proposed addition:**

> **Opt-in response enrichment.** `GET /api/results/get/all/roles/filter/:userId` accepts `include_completeness=true` (`MWB-DD-1`, `MWB-DD-2`). The default payload is unchanged and **byte-identical** — the key is absent and the validation repository is never called. With the flag, each eligible item (`status_id` ∈ {1, 8}, non-IPSR-package `result_type_id`) gains `completeness: { complete, total, missing[] }`; every other item, and any item past the newest-first cap `MWB_COMPLETENESS_CAP = 60`, gains `completeness: null`. Per-item validation failures degrade to `null` with one id-only `logger.warn`; the request still returns 200. Concurrency is chunked at 5.
>
> This is the pattern for additive enrichment generally: **the flag pays for itself only when asked for**, the default path issues zero extra queries, and the enriched key is nullable so a partial failure never fails the list.

**Evidence:** live Swagger on the local server exposes the parameter — `curl -s http://localhost:3400/api-json | grep -o include_completeness` → 1 hit (2026-09-05). Implementation: `onecgiar-pr-server/src/api/results/results.service.ts` (filter path), `results-validation-module/completeness.ts`, `results.controller.ts` (`@ApiQuery`).

---

## Not recorded here

- `design.md` §13 *Open Gaps & Follow-ups* (cross-program My work page, `last_updated_by` in the list payload, a sort control, retiring the legacy v1 green-checks path) are **product follow-ups**, not baseline-doc drift. They belong in the kaizen entry / a new proposal, not in this file.

## Follow-ups surfaced by `MWB-T-6` timing (not doc syncs)

- Completeness fold cost ≈ 100–200 ms per eligible item (v2 procedure); worst case at cap 60 / concurrency 5 ≈ 2–3 s. Candidate changes for a separate proposal: cap 30, concurrency 10, or a batch procedure `validate_sections_mapped_batch` over many ids.
- `cypress-axe` is not installed → `MWB-T-5` a11y gate is structural only (see `requirements.md` §9).
- `MWB-T-7` accepted partial: rail ↔ column width animation not delivered (both states `width: auto` under flex); expanded-column fade delivered. Follow-up only if the user wants an explicit-width slide.
- `MWB-T-11` follow-ups (advisory, not gating): breakpoint predicates `899.98px` on both CSS and `matchMedia`; cancel the pending rAF on destroy + early-return `onStripScroll` when not narrow; band to publish its height as a CSS variable for the jumper's sticky `top`; card owner to apply `max-[899px]:min-h-[44px]` (buttons) / `max-[899px]:inline-flex max-[899px]:min-h-[44px] max-[899px]:items-center max-[899px]:px-[8px]` (Open anchor) and delete the parent `::ng-deep` hit-target block; Jest cases for `isNarrow` teardown and the reduced-motion `jumpToColumn` branch. Product note: with the nav sidebar open the collapsed board still scrolls horizontally at 1280 (needs 1212 px vs 1020 available) — fitting would require 176 px columns; decide with the user whether a narrower Editing column or a hidden-by-default Discontinued rail is preferable.
- `MWB-T-12` follow-ups: encode multi-value URL params per element (comma inside a CLARISA label breaks `a,b`); `withSelectedOptions` should dedupe with `normalize()`; fix the `sameList` doc comment. Superseded when `MWB-T-13` moves the three dimensions into the shared filter service.
- `MWB-T-14` follow-ups: correct the `.mwb-chip-hidden` `!important` comment (specificity, not layering, is what wins); `min-w` on the `+N more` button so pass-2 measurement is label-independent; floor `visibleChipLimit` at 1 + a narrow (390 px) many-chip CT case; CT determinism for the `MWB-T-11` 390×844 jumper landing (force `scroll-behavior: auto` in the mount or await `scrollend`) — ~1-in-6 flake today.

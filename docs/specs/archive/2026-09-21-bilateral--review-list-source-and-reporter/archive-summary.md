# Archive Summary — Source and Reporter on the Bilateral review list

**Outcome:** shipped to branch. All 6 tasks closed with an independent Reviewer `PASS`, 7 commits, every automated gate green, and a live-page HITL pass that confirmed the feature on real data. Archived **without** `/akili-test` and `/akili-validate` — an absence the owner explicitly accepted (see §9).

## 1. Document Control

| Field | Value |
|---|---|
| Spec path (original) | `docs/specs/bilateral/review-list-source-and-reporter/` |
| Module code | **`BSR`** |
| Depth | **Lite** (Change track) |
| Approval Mode | pre-approved (Juan Carlos Cadavid, 2026-09-21) |
| Owner | Juan Carlos Cadavid |
| Archive date | **2026-09-21** |
| Branch | `qa-development-2026` (spec branch — not the `staging` integration pin) |
| Verified at (spec authoring) | `da132347c` |
| Final commit | `92045e76e` |

## 2. Original Spec Path

`docs/specs/bilateral/review-list-source-and-reporter/` → `docs/specs/archive/2026-09-21-bilateral--review-list-source-and-reporter/`

## 3. Final Status

**Executed.** 6 / 6 tasks `[x]`. Not yet `shipped` — `/akili-test` and `/akili-validate` were skipped by owner decision, and the PR/CI/QA rollout steps in `tasks.md` §6 remain open.

## 4. Requirements Delivered

| Requirement | Delivered by | Evidence |
|---|---|---|
| `BSR-R-1`, `BSR-R-2` — three additive list fields, reporter resolved with fallback | `BSR-T-1` | mapper falsifier over all 15 pre-existing + 3 new keys; SQL-string spec, SELECT-scoped |
| `BSR-R-3` — `EXTERNAL` stamped at ingestion | `BSR-T-2` | both header paths, each with its own red-proven spec |
| `BSR-R-4`, `R-5`, `R-7`, `R-10`, `R-11` — the derivation matrix, AI delegation, placeholder, copy, a11y name | `BSR-T-3` | 7-row table-driven matrix incl. both trap rows; mutation proven red |
| `BSR-R-6`, `R-8` — reporter full name truncated; both rendering branches | `BSR-T-4` | live: 37/37 rows truncate with full value in `title`; cards branch covered |
| `BSR-R-9` — drawer header Source | `BSR-T-5` | rendered assertion + index-comparison lock, both falsification-proven |
| `BSR-AC-1`–`AC-13` | across T-1…T-6 | see §7 |

**Deferred by design, not missed:** `BSR-OQ-1` (Source as a filter) and `BSR-OQ-2` (backfill) — both recorded in `design.md` §13; `BULK` is mapped but unwritten, owned by `bilateral/bulk-uploader-handoff`.

## 5. Files Changed Summary

From `execution.md`. **1804 insertions / 64 deletions** across `*/src` — production **464**, tests **1340** (74 %).

| Area | Files | Change |
|---|---|---|
| Server — results | `result.repository.ts`, `results.service.ts` (+2 specs) | 3 selected columns, two `LEFT JOIN users`, `GROUP BY` +2, mapper +3 keys |
| Server — bilateral | `bilateral.service.ts`, `handlers/knowledge-product.handler.ts` (+2 specs) | `creation_method = EXTERNAL` on both header-creation paths |
| Client — new component | `components/bilateral-review-source-chip/*` (6 files) | pure `resolveBilateralSource` + presentational `OnPush` chip |
| Client — table | `bilateral-review-table.component.{ts,html}` (+spec, +cy) | SOURCE column, colgroup rebalance, two-line SUBMITTED cell, narrow card |
| Client — drawer | `result-review-drawer.{interfaces,component}.{ts,html}` (+2 specs) | `BilateralCommonFields` +2, header Source line |
| Client — copy & page gates | `bilateral-review.copy.ts`, `bilateral-review.cy.ts` | `source` key inserted between `center` and `status`; page suite → 54 gates |
| Docs | `bilateral-result-summaries.en.md`, `bilateral-review/CLAUDE.md` | `AC-4` change-log entry; module contract + `**Verified:**` re-stamp |

**No migration.** `migration:check` green and `src/migrations/` untouched, as `design.md` §3.2 / `BSR-DD-5` require.

## 6. Commits

| Commit | Task |
|---|---|
| `2f62d98ff` | `BSR-T-2` — stamp `EXTERNAL` on both ingestion header paths |
| `9660f76a1` | `BSR-T-1` — three additive list fields |
| `a06a40939` | `BSR-T-3` — derivation function + Source chip |
| `01cfd9c17` | `BSR-T-4` — SOURCE column, colgroup rebalance, SUBMITTED cell |
| `e27bb6476` | `BSR-T-5` — drawer header Source line |
| `28fc520cb` | `BSR-T-6` — page gates, computed D9/D3 evidence, payload change log |
| `92045e76e` | HITL record + execution log closure |

## 7. Test Evidence Summary

No `test-report.md` (see §9). Evidence comes from the execute-phase gates, each re-run by a non-author before its task closed:

| Gate | Result |
|---|---|
| Server Jest (full) | **253 suites / 3102 tests** green |
| Client Jest (`bilateral-review`) | **19 suites / 574 tests** green |
| Page CT `bilateral-review.cy.ts` | **54 / 54** |
| Table CT `bilateral-review-table.cy.ts` | **24 / 24** (Gate 7 unmodified, still passing with 8 columns) |
| `npm run build` | clean |
| `npm run migration:check` | 0 pending, `src/migrations/` untouched |
| D7 copy-drift grep | **7**, unchanged, none introduced |
| Row-height caps | **46 / 50 / 68 unchanged**, zero growth vs pre-spec |

**Substituted defect classes, both upgraded to computed evidence:**

- **D9 (contrast)** — `requirements.md` §8 substituted a manual pre-audit because `cypress-axe` is absent. Measured instead in CT *and* on the live page: **AI badge 5.49:1**, **neutral pill 6.32:1**, both independently recomputed by the Leader. Three concordant paths.
- **D3 (real-data aggregation)** — substituted gate was a live row-count eyeball. Settled in SQL across **8 `(programId, versionId)` pairs** at both the post- and pre-`GROUP BY` level (the only level at which multiplication is detectable). Zero multiplication.

**HITL live-page pass** (grouped project view, SP01, ~1317px): **six of the seven `BSR-R-4` rows render on real data**, the trap row 19×; 37/37 rows show chip + named reporter; AI badge 79px single-line in a 116px cell with the delegated transparency sentence as its accessible name; placeholder `aria-hidden` + `sr-only` pair confirmed in the live DOM; no document overflow. **Not covered:** the visual look at 1000px and 375px — the Orca browser CLI exposes no viewport resize; both are covered by CT rendered-geometry gates, which measure rather than depict.

## 8. Validation Summary

No `validation-report.md` (see §9). The two defect classes `requirements.md` §8 explicitly routed to `/akili-validate` — **D3** and **D9** — were both discharged during execution with stronger evidence than the manual substitutions they replaced (§7). No FAIL findings exist to resolve, because no validation pass was run.

## 9. Accepted Warnings & Follow-Ups

**Accepted absence (owner decision, 2026-09-21):** archived without `/akili-test` and `/akili-validate`. The owner was asked directly, shown the gap and its consequences, and chose *"archive now, absence accepted"*. Recorded as an explicit acceptance, not an oversight.

**Open follow-ups — none blocking:**

| # | Item | Home |
|---|---|---|
| 1 | **Drawer/list Source divergence.** The detail query omits `external_platform_code`, so the drawer shows `Via API`/placeholder where the list shows `Via API · W3RU`. **84 legacy rows today, plus every future ingestion whose API key resolves a CLARISA platform.** One server edit (`r.external_platform_code` into `getCommonFieldsBilateralResultById`) closes both classes. Not a conformance failure — two independent Reviewers took the literal reading of `BSR-R-9`. | `design.md` §13 |
| 2 | **Pre-existing APF-R-12 violation** — `ai-processing-panel.component.html:158` hard-codes the AI-transparency sentence instead of binding the constant. Predates this spec; caused D7's miscount. | `design.md` §13 |
| 3 | **Pre-existing test slop** — `result.spec.ts:1522-1547` feeds `indicator_category` where the mapper reads `result_category`. | `design.md` §13 |
| 4 | **`BSR-OQ-1` / `BSR-OQ-2`** — Source as a filter; backfill. Both deferred by decision. | `design.md` §13 |
| 5 | **Module guide length** — `bilateral-review/CLAUDE.md` is 403 lines against `docs/COMPONENT-DOCS.md`'s 120-line cap (358 before this spec). Pre-existing; trim is a separate ticket. | kaizen entry, *Noted* |
| 6 | **Change-log imprecision, knowingly left** — *"Rows ingested before this change keep `UNKNOWN`"* is over-broad but errs conservatively. Exact replacement recorded for the next edit of that row. | kaizen entry, *Noted* |
| 7 | **Rollout still open** — `tasks.md` §6: PR, CI, manual QA on TEST, downstream change-log publication. | `tasks.md` §6 |

## 10. Historical Notes

**Five spec-document defects were found at execute time, each by running something rather than reading it** — the spec's central lesson (`KZ-bilateral--review-list-source-and-reporter-1`):

1. **D7's gate was unsatisfiable** — demanded 1 grep hit; the baseline is 7. `BSR-T-3` would have failed its own DoD however well implemented.
2. **DD-2's widths were self-contradictory** — Alignment at 192px while projecting Title at ~184px, i.e. Title *not* widest, failing hard NFR `BSR-AC-9`. Measured at 184.5px; Alignment re-tuned to 184px, giving Title 472.5 @1280 / 192.5 @1000.
3. **DD-2's "≈88px" AI badge is 79px** — its "two guards, both required" necessity claim is false at 116px, and the 104px rejection's AI-badge leg does not hold.
4. **DD-3's slack arithmetic** used a computed line-height instead of the pinned one (3.1px → 3.875px; conservative, no gate affected).
5. **`BSR-T-6`'s falsifier is geometrically impossible** — a 200px chip cannot overflow a 375px document from a ~293px row. Replaced with a guard-absorbs/detector pair rather than a manufactured red.

All five are corrected in place with two-direction sweeps; `design.md` carries the superseded text struck through rather than erased.

**Three vacuous gates traced to one root cause** — a `:host { display: contents }` component has no box, so `offsetHeight` reads 0 and `backgroundColor` reads transparent black. Two gates measured nothing (one returning a plausible-looking `1.46:1` contrast); the third use of the same property was *correct*, because it lets the cell's own wrapper clip the chip. Recorded as `KZ-…-2`.

**Two Leader-brief errors reached Implementer work** — a single-program sample generalised into a population claim, and an inverted statement about which row class `BSR-T-2`'s stamp grows. The second cost one of `BSR-T-5`'s three attempts. Recorded as `KZ-…-3` (Methodology): the brief contract requires sourcing for *third-party* facts but not for the Leader's own derived ones.

**One runtime event, recovered without loss** — a provider session limit killed the `BSR-T-6` Implementer mid-edit. The tree probe recovered 250 lines, rungs 2–3 were correctly skipped as futile, and rung 4 continued on a different model, keeping `opus` free so the Reviewer stayed at tier. No attempt consumed. The inherited work then ran 51/53 — two of the dead worker's own gates were red — which is why the successor was told to verify rather than trust it.

**Budget tripwire fired and was escalated, not absorbed** — 1804 LOC against ~680 estimated. Production landed at 464 (near estimate); the overrun is entirely in gates (74 % test share vs 60 % predicted). The owner was shown the delta and cause and chose to continue. `design.md` §12A was deliberately **left unedited** — the gap between estimate and actual is the measurement the kaizen re-baseline needs.

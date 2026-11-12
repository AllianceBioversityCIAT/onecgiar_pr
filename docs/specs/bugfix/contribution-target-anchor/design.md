# Design — `bugfix/contribution-target-anchor`

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/contribution-target-anchor` |
| Type / Depth | Bug · Lite |
| Approval Mode | gated |
| Requirements | `requirements.md` (CTA-R-1…R-4), approved 2026-11-12 |
| Verified at | `5d9ba6729` (qa-development-2026-ss) |
| Skills | `nestjs-expert`, `tdd`, `systematic-debugging` |

## Executive Summary

One function changes: `resolveTargetIdentity` in `results-toc-results.repository.ts`. It gains (a) a catalog-membership check on the payload's own id and (b) a last-step fallback to the phase year's single catalog meta. Both call sites already pass the catalog list and the phase year, so no query, API, migration or client change. The PROD backfill is a hand-off SQL script using the same "exactly one meta per year" rule.

## Architecture Overview

```text
PATCH v2/api/contributors-partners/:resultId          (also IPSR + share-request callers)
  → ResultsTocResultsService.createTocMappingV2 / saveMapToToc
    → ResultsTocResultRepository.saveIndicatorsPrimarySubmitter | saveIndicatorsContributors
      → saveInditicatorsContributing (:1806)
          getIndicatorTargetCatalog(node, phaseYear)   ← unchanged, 1 read / indicator / save
          resolveTargetIdentity(target, metas, year)   ← CHANGED (CTA-DD-1, CTA-DD-2)
          resolveExistingTargetRow(...)                ← unchanged
          update | save result_indicators_targets      ← unchanged (anchor = existing ?? resolved)
Read side (aow-bilateral.repository.ts sumContributionsForCenters) ← unchanged; benefits automatically
```

## Extended Directory Structure

| Path | Change |
|---|---|
| `onecgiar-pr-server/src/api/results/results-toc-results/repositories/results-toc-results.repository.ts` | `resolveTargetIdentity` only |
| `onecgiar-pr-server/src/api/results/results-toc-results/repositories/results-toc-results.repository.spec.ts` | New `describe` block CTA-TEST-1…4 |
| `docs/specs/bugfix/contribution-target-anchor/backfill-prod.md` | Hand-off SQL (S-4); not executed by agents |

## Data Model

No schema change. `result_indicators_targets.toc_indicator_target_id` (existing nullable column) gets filled where it is NULL today.

## API Design

No endpoint, request or response change (CTA-NFR-2).

## Backend Module Design

### Resolution order (after the change)

| Step | Source | Accept when | New? |
|---|---|---|---|
| 1 | Payload `toc_indicator_target_id` | it is in the catalog metas — or the catalog is empty (nothing to validate against) | **membership check new** (CTA-DD-2) |
| 2 | Payload `indicators_targets` | it names a catalog meta | unchanged |
| 3 | Payload `number_target` + year | a catalog meta matches | unchanged |
| 4 | Catalog only | exactly **one** meta whose `target_date` equals the phase year | **new** (CTA-DD-1) |
| — | none | — | NULL, as today; `warn` log when step 4 saw ≥ 2 candidates |

### Backend route

`Backend route: nestjs-expert (repository logic) · test-first (tdd)`

## Frontend / UX Component Architecture

None. The form cannot supply a target id (P-6); no client change.

## Shared Contracts or Package Extensions

None.

## Design Decisions

| ID | Decision | Requirement | Rationale / rejected alternatives |
|---|---|---|---|
| CTA-DD-1 | Step 4 fallback returns the single phase-year meta's id with **`identityResolved: false`** | CTA-R-1, CTA-S-1/S-2 | Keeping `identityResolved` false preserves TTD's skip rule (`:1948-1951`, `:2089-2092`) exactly — the fallback only fills the anchor, it never changes which metas are skipped or inserted. Rejected: marking it resolved — a payload with two identity-less targets in one single-meta year would then bypass the skip and insert a second anchored row |
| CTA-DD-2 | Own id outside a non-empty catalog list falls through to steps 2–4 instead of returning | CTA-R-2, CTA-S-4 | Smallest guard; the catalog list is already in hand. Empty catalog keeps today's trust (no evidence either way). Rejected: validating against all years (extra query, violates CTA-NFR-1) |
| CTA-DD-3 | Step 4 counts metas by `target_date === phaseYear`, not by list length | CTA-R-1 | `getIndicatorTargetCatalog` falls back to **all years** when the phase year has none (`:2684-2701`); length alone would anchor a 2026 contribution to a 2027 target |
| CTA-DD-4 | Step 4 requires `phaseYear != null` | CTA-R-1 | No year → no basis for "the year's target"; NULL as today |
| CTA-DD-5 | Existing anchor wins over a newly resolved one | CTA-S-3 | Unchanged payload expression `targetInfo?.toc_indicator_target_id ?? tocTargetId` (`:1982-1983`, `:2117-2118`) — no edit |
| CTA-DD-6 | Warn log: result id, indicator node, candidate count — no payload body | CTA-S-2 | Follows the existing warn at `:1953-1957`; no secrets/PII (`.cursorrules`) |
| CTA-DD-7 | Backfill SQL lives in `backfill-prod.md` and is pasted inline to the user | CTA-R-3 | Memory: queries inline + environment label; DB steps are handed off |

### Reversion challenge (Step 2.3)

CTA-DD-2 takes away unconditional trust of a payload id. **What does removing it break?** A caller that legitimately sends an id from **another year** of the same indicator would now fall through. The Contributors & partners GET backfills ids from a same-year catalog (`toc-results.repository.ts:1223-1224` `AND trit.target_date = ?`), so the form round-trips phase-year ids → unaffected. IPSR and share-request callers are open → P-8 (UNVERIFIED, owner T-1). If T-1 finds an other-year sender, Pivot (scope of DD-2 narrows to "id not in any meta of the indicator").

## Budget (Step 2.4)

| Expected tasks | Expected LOC | Expected review rounds |
|---|---|---|
| 2 (T-1 server + regression tests, T-2 backfill SQL) | ~40 code + ~160 tests + ~80 SQL | 1–2 per task |

Matches Lite + Bug.

## Premise Ledger

Count: 10 verified · 2 UNVERIFIED (1 High: P-8 · 1 Low: P-12).
Blast-radius triggers: `live-path` (user action: save Contributors & partners), `shared-state` (`saveInditicatorsContributing` has several callers), `consumer` (stored field `toc_indicator_target_id` changes value).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | Identity resolution is own id → PK → number+year, else null | location | `results-toc-results.repository.ts:2783-2823` | 5d9ba6729 | DD-1/DD-2 redesign (High) | — |
| P-2 | Both writer branches call `resolveTargetIdentity(target, catalogMetas, phaseYear)` and store `existing ?? resolved` | location | `:1916-1917`, `:1982-1983`; `:2066-2067`, `:2117-2118` | 5d9ba6729 | T-1 scope grows (Low) | — |
| P-3 | The catalog read falls back to all years when the phase year has no rows | data-env | `:2669-2701` | 5d9ba6729 | DD-3 unnecessary (Low) | — |
| P-4 | TTD skip rule keys on `!identityResolved` | location | `:1948-1951`, `:2089-2092` | 5d9ba6729 | DD-1 flag choice changes (High) | — |
| P-5 | Live path: save → `createTocMappingV2` → `saveIndicatorsPrimarySubmitter` → `saveInditicatorsContributing` → `resolveTargetIdentity` | live-path | `contributors-partners.controller.ts:48` → `contributors-partners.service.ts:233` → `results-toc-results.service.ts:2104` → `repository.ts:3067` → `:1806` → `:2066`; PROD row 25057 created 2026-11-12 07:04:46 with NULL anchor (user SELECT) | 5d9ba6729 | Fix misses the user path (High) | — |
| P-6 | The form has no target id to send: the level list returns `targets: [{target_value}]` only | data-env | PROD `GET /v2/toc/result/33767/initiative/50/level/1?planned=true` → indicator `4549a001-…` targets `[{"target_value":"5"}]` (run 2026-11-12) | PROD 2026-11-12 | Client fix becomes viable (Low) | — |
| P-7 | Siblings sharing the writer: results-toc service (`:214`, `:219`, `:1248`, `:2104`, `:2111`, `:2927`), IPSR (`results-package-toc-result.service.ts:299,304`), share-request (`share-result-request.service.ts:2199`), contributor recursion (`repository.ts:3176,3212`) | shared-state | `grep -rn "saveInditicatorsContributing(\|saveIndicatorsPrimarySubmitter(\|saveIndicatorsContributors(" --include=*.ts onecgiar-pr-server/src` excluding `.spec.ts` and declarations → 12 call sites (run 2026-11-12) | 5d9ba6729 | Behaviour change reaches unseen callers (High) | — |
| P-8 | No caller sends an own `toc_indicator_target_id` of a different year than the result's phase year | other | UNVERIFIED — confirm at source before relying on it | — | DD-2 must widen to all-year membership (High) | T-1 first step: trace payload sources of IPSR (`results-package-toc-result.service.ts:299`) and share-request (`:2199`) |
| P-9 | Readers of `toc_indicator_target_id`: `aow-bilateral.repository.ts`, `existing-result-contributors-loader.service.ts`, `bilateral-center.service.ts`, `results-framework-reporting.service.ts`/`.controller.ts`, `results-toc-results.service.ts`, `qa-catalog/definitions/not-for-qa.ts`, `qa-catalog/values/lookup-sources.ts`; `pt-porb.repository.ts` and `toc-results.repository.ts` read the ToC-side column (trit), not rit | consumer | `grep -rln "toc_indicator_target_id" onecgiar-pr-server/src --include=*.ts` minus `.spec.ts`/migrations → 15 files (run 2026-11-12); client: no writer of rit anchor in Contributors & partners (`grep -rn "toc_indicator_target_id" …/rd-contributors-and-partners` → 0) | 5d9ba6729 | Unknown reader breaks on non-NULL anchors (Low — column already non-NULL on framework-created rows) | — |
| P-10 | Spec file already mocks the catalog read and the target repository (TTD-TEST-1…4) | location | `results-toc-results.repository.spec.ts:744-1170`, 28 `it(` | 5d9ba6729 | T-1 needs new harness (Low) | — |
| P-11 | The 2026 catalog for node `4549a001-…` has exactly one meta (333606) | data-env | user PROD SELECT on `Integration_information.toc_result_indicator_target` 2026-11-12 → 11 rows, one per year 2020-2030 | PROD 2026-11-12 | CTA-S-1 fixture invalid (Low) | — |
| P-12 | Share of the 58 PROD rows whose indicator has a single phase-year meta | data-env | UNVERIFIED — confirm at source before relying on it | — | Backfill reach smaller than hoped (Low) | T-2 preview SELECT, user at HITL |

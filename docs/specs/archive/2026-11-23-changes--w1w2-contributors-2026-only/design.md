# Design — "Contributing to W1/W2" counts 2026 P/A results only (WCO)

> **In one line:** add one literal predicate `(r.is_replicated IS NULL OR r.is_replicated = 0)` to the `has_w1w2` `EXISTS` in `ClarisaProjectsRepository.getPortfolioProjectFacts`. Nothing else changes: binds, DTO, service, and client stay the same.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/w1w2-contributors-2026-only` |
| Depth | Lite |
| Requirements | `requirements.md` (approved 2026-11-23) |
| Base commit | `origin/qa-development-2026-ss` = `04aec7e57` (the local branch is 3 behind; pull first) |
| Backend route | lead `nestjs-expert`. Repository SQL only; `backend-routing.md` not consulted for a one-predicate change |
| Status | approved (2026-11-23) |

## 2. Executive Summary

The `has_w1w2` flag is the single source of every "Contributing to W1/W2" number (tile, P/A bars, Center bars, table). Excluding replicated rows there fixes all of them at once. The replicated marker `result.is_replicated` is the one the Center Overview already uses for `replicated_w1w2`.

## 3. Architecture Overview

`GET api/results-framework-reporting/portfolio/bilateral-projects` (controller `:372`) → `getPortfolioBilateralProjects` (service `:1105`) → `getPortfolioProjectFacts` (repository `:86`), whose `has_w1w2` probe ends at `:124` → `hasW1w2` (`:189`) → `addProject` (service `:1146`, `:1178`, `:1182`, `:1210`). Only the probe changes.

## 4. Extended Directory Structure

| File | Change |
|---|---|
| `onecgiar-pr-server/src/clarisa/clarisa-projects/clarisa-projects.repository.ts` | predicate in `has_w1w2`, doc comment line |
| `onecgiar-pr-server/src/clarisa/clarisa-projects/clarisa-projects.repository.spec.ts` | new assertion; the `r.is_active` / `status_id` counts are unchanged |
| `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/CLAUDE.md` | one line under the projects block: the W1/W2 rule excludes replicated results |

## 5. Data Model

None. `result.is_replicated` already exists (`result.entity.ts:472-478`, boolean, nullable, default false).

## 6. API Design

Shape unchanged (`BilateralProjectCountsDto.w1w2Contributors`); only its value drops. Not `/api/bilateral/*`, so there is no contract change-log entry and no Fetcher impact.

## 7. Backend Module Design

- **DD-1: filter on `is_replicated`, not on "no older `result_code`".** The flag is the marker the code already relies on (parity, P-2), it costs nothing, and it works for any phase. Rejected: a `NOT EXISTS` on an older version (heavier, and it changes meaning for re-created results); a filter on innovation types only (the ticket says "only 2026 P/A results").
- **DD-2: literal predicate, NULL-safe.** Written as `(r.is_replicated IS NULL OR r.is_replicated = 0)`, so the 12 binds and their order stay the same (WCO-S-3) and NULL rows count as new (WCO-S-2).
- **DD-3: no status filter added.** Discontinued pooled results keep counting, as they do today. That is OQ-2 for Nicoleta, not part of this change.

No DD reverts delivered behaviour in the sense of Step 2.3 (it narrows a count at the requester's ask; no guard, fallback or cache removed). Reversion challenge: n/a.

## 8. Frontend / UX

None. The client renders `w1w2Contributors` as received.

## 9. Shared Contracts

None changed.

## 10. Budget (tripwire)

| Measure | Expected |
|---|---|
| Tasks | 2 (1 code, 1 manual data check) |
| LOC | ~15 (1 SQL line + comment + ~10 spec lines + 1 guide line) |
| Review rounds | 1 |

## 11. Premise Ledger

**Count:** 5 verified · 1 `UNVERIFIED` (High 1, Low 0).
**Blast-radius triggers:** `live-path` (the design names the Portfolio Overview load) and `consumer` (stored-field meaning of `hasW1w2` changes) fired; `shared-state`: none apply. The probe is a private subquery that only `has_w1w2` reads.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | `has_w1w2` filters only link/result active + `source` + `version_id`; no replicated or status filter | location | `git show origin/qa-development-2026-ss:…/clarisa-projects.repository.ts`, probe ending `:124` `) AS has_w1w2,`; spec `applies no status filter to the W1/W2 probe` | `04aec7e57` | DD-1 targets the wrong place. **High** | — |
| P-2 | `is_replicated = 1` already means "replicated from an earlier phase" in code | other | `git grep -n "is_replicated = 1" origin/qa-development-2026-ss -- onecgiar-pr-server/src/api/results/result.repository.ts` → `:4240` (`replicated_w1w2`), `:4530`; `pending-innovation.repository.ts:91` | `04aec7e57` | DD-1 picks the wrong marker. **High** | — |
| P-3 | Replication sets `is_replicated = 1` on every replicated pooled row in PROD (no NULL/0 replicated rows) | data-env | `UNVERIFIED — confirm at source before relying on it`. `git grep -nE "is_replicated\s*(=\|:)\s*(1\|true)"` over `onecgiar-pr-server/src/*.ts` (non-spec) finds only reads, no TS writer, so the flag is written outside the app (DB replication procedure) | — | The count keeps some 2025 innovations; DD-1 needs B. **High** | WCO-T-2, PROD read-only pre-check (`proposal.md` §11, `rows_flag_null`), run by the user |
| P-4 | Live path: Portfolio Overview projects block → `GET …/portfolio/bilateral-projects` → controller `:372` → service `getPortfolioBilateralProjects` `:1105` → repository `getPortfolioProjectFacts` `:1127` call | live-path | `git grep -n getPortfolioBilateralProjects origin/qa-development-2026-ss`; client `results-api.service.ts:1739`; guide `portfolio-overview/CLAUDE.md:67` | `04aec7e57` | The change is not what the user sees. **High** | — |
| P-5 | `hasW1w2` readers: service `:1142/1146/1178/1182/1210`; specs `results-framework-reporting.service.spec.ts:1792/1802/1931/2566`, `clarisa-projects.repository.spec.ts:189/198`; no client reader (client reads `w1w2Contributors`) | consumer | `git grep -n hasW1w2 origin/qa-development-2026-ss -- onecgiar-pr-server/src onecgiar-pr-client/src` | `04aec7e57` | More files to touch. Low (the service specs mock rows, so their meaning holds) | — |
| P-6 | Spec counts that a new `r.` predicate could break: `r\.is_active = 1` → 4, `r\.status_id` → 4, `?` → 12 | data-env | spec on origin, tests `requires active links…`, `applies no status filter…`, `uses no string interpolation` | `04aec7e57` | T-1 must update a count. Low (`is_replicated` matches none of these patterns) | — |

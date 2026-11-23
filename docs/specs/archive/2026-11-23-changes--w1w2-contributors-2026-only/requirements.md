# Requirements — "Contributing to W1/W2" counts 2026 P/A results only (WCO)

> **In one line:** a mapped project counts as "Contributing to W1/W2" only when it is linked to a pooled result **created in the page's phase**. Results replicated from an earlier phase (2025 innovations carried into 2026) no longer count.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/w1w2-contributors-2026-only` |
| Prefix | `WCO` |
| Type | Change |
| Deliverable | software |
| Depth | Lite |
| Approval Mode | gated |
| Source | `proposal.md` (approved by the user 2026-11-23); Freshservice INC-169059 |
| Extends | archived WPS spec `archive/2026-10-16-changes--portfolio-overview-revamp--w3-projects-section/requirements.md:29` |
| Builds on | `changes/portfolio-graphs-clarity` (`f965ca5f3`, on `origin/qa-development-2026-ss`) |
| Status | approved (2026-11-23) |

## 2. Executive Summary

Nicoleta (INC-169059): contributions to pooled results should only count for **2026 P/A results**, not for 2025 innovations. Today the KPI counts any pooled result in the 2026 version, replicated ones included. The figure in the ticket screenshot is 147, but that number comes from an image, so it is context only and not a value this spec checks against.

## 3. Glossary

| Term | Meaning |
|---|---|
| Pooled result | A result with `source = 'Result'` (W1/W2), as opposed to `'API'` (W3/Bilateral) |
| Replicated result | A result row in the current version carried over from an earlier phase. Marked by `result.is_replicated = 1` |
| Page version | The reporting version that Portfolio Overview resolves (`resolveReportingVersion`) |

## 4. System Context & Scope

- **Today**, `has_w1w2` checks only for an active link to an active pooled result of the page version (`clarisa-projects.repository.ts:107-116` locally; the same probe sits before `AS has_w1w2` in `origin/qa-development-2026-ss`). It does not filter on `is_replicated` or on status.
- **In scope:** that probe; the tile, the By P/A and By Center bars, and the table all read its flag (`results-framework-reporting.service.ts:1125-1168`).
- **Out of scope:** "Mapped projects", "With W3/Bilateral results", Center Overview `replicated_w1w2`, `/api/bilateral/*`, copy, and colours.

## 5. Stakeholders

PMU / portfolio leads reading Portfolio Overview; Nicoleta (requester).

## 6. Functional Requirements

### WCO-R-1 — Replicated pooled results do not count as W1/W2 contribution

**MODIFIED.** Before: mapped projects linked to ≥ 1 pooled result of the page version. After: mapped projects linked to ≥ 1 active pooled result of the page version **whose `is_replicated` is 0 or NULL**.

#### Scenario WCO-S-1: project linked only to a replicated 2025 innovation

- GIVEN a mapped project whose only active pooled link in the 2026 version is to a result with `is_replicated = 1`
- WHEN Portfolio Overview loads the W3/Bilateral projects block
- THEN the project is not counted in "Contributing to W1/W2" (tile, P/A bars, Center bars, table)
- BUT it must NOT stop counting in "Mapped projects" or "With W3/Bilateral results"

#### Scenario WCO-S-2: project linked to a new 2026 pooled result

- GIVEN a mapped project linked to a pooled result of the 2026 version with `is_replicated` 0 or NULL (it may also be linked to replicated results)
- WHEN the block loads
- THEN the project counts in "Contributing to W1/W2"
- AND IT MUST treat `is_replicated IS NULL` as not replicated

#### Scenario WCO-S-3: other probes untouched

- GIVEN the same query
- THEN `has_bilateral` and the named-P/A probe carry no `is_replicated` condition
- AND IT MUST keep the existing bind order and placeholder count (the predicate is a literal, not a new bind)

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| WCO-NFR-1 | Read-only SQL with no string interpolation (existing spec test `uses no string interpolation` stays green) |
| WCO-NFR-2 | Response shape unchanged (`BilateralProjectCountsDto`); no client change |

### Defect classes → gate

| Defect class | Gate |
|---|---|
| Predicate missing or in the wrong probe | Repository spec: slice the `has_w1w2` block and assert the predicate there and nowhere else |
| Bind order or placeholder count broken | Existing `binds … in order` and `?` count tests |
| Type or compile break | `npx tsc --noEmit -p tsconfig.json` (server) on the touched file, through the build |
| Wrong real-world count (flag not set on replicated rows) | No automated check. Substitute: the PROD read-only pre-check from `proposal.md` §11 (`rows_flag_null`), run by the user at the HITL pause, plus a PRTest/PROD look after deploy |

## 8. Requirement ID Index

| ID | Covered by |
|---|---|
| WCO-R-1 / S-1, S-2, S-3 | WCO-T-1 |
| WCO-NFR-1, NFR-2 | WCO-T-1 |
| Real-count check | WCO-T-2 (manual) |

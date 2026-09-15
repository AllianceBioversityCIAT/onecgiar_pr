# Requirements — Portfolio Overview: partial-results banner and open-cycle detection

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/portfolio-overview-partial-counts` |
| Type | Bug |
| Depth | **Lite** (single query fix + one client display fix; root cause fully confirmed, no design exploration needed) |
| Approval Mode | `gated` |
| Source | `proposal.md` (this folder) — root cause confirmed via code read + live prod-vs-test validation in Chrome, 2026-09-14 |

## 2. Executive Summary

Portfolio Overview's server query fetches results with `LIMIT 20000 OFFSET 0` and **no `ORDER BY`**, over **all historical phases combined**. In production, where historical row volume is large, this arbitrary page can end up excluding every row from the currently open reporting phase. When that happens, Portfolio Overview wrongly reports the newest phase it *can* see (2025) as the open one, flags it "closed," and shows a drastically undercounted, stale total (1262) — while Results Center, querying the same backend, proves the real open phase is 2026 with 8252+ results. This spec fixes the query so open-phase rows are never excluded by the `LIMIT`, and fixes the banner to report real fetched-vs-total counts instead of a post-filter number mislabeled as a total.

## 3. Glossary

| Term | Meaning |
|---|---|
| Open phase | The `version` row with `phase_status = 1` — the reporting cycle currently accepting submissions |
| Closed phase | Any `version` row with `phase_status` ≠ 1 — historical, finalized |
| `meta.total` | Server-computed `COUNT(1)` over the same (unfiltered, all-phase) WHERE clause as the paginated query |
| Partial-results banner | The amber warning shown when `meta.total` exceeds the number of rows actually fetched |

## 4. System Context & Scope

**In scope:**
- `onecgiar-pr-server/src/api/results/result.repository.ts` → `AllResultsByRoleUserAndInitiativeFiltered` (query ordering)
- `onecgiar-pr-client/.../portfolio-overview/services/portfolio-overview.service.ts` (banner counts)
- `onecgiar-pr-client/.../portfolio-overview/portfolio-overview.component.html` (banner copy)

**Out of scope:** restructuring the shared repository method's filtering contract for other callers; phase-management tooling; the "drill-down" pending item already logged in the component's `CLAUDE.md`.

## 5. Stakeholders / Personas

| Persona | Stake |
|---|---|
| Platform admin | Reads Portfolio Overview to judge whole-portfolio reporting progress; currently sees stale, wrong-cycle, ~16x-undercounted figures in prod with no indication anything is wrong beyond a generic "partial" note |

## 6. Functional Requirements

### Requirement: Open-phase rows survive the results page fetch regardless of historical volume

The system SHALL guarantee that when `AllResultsByRoleUserAndInitiativeFiltered` is called with a `LIMIT` smaller than the all-phase historical row count, rows belonging to the currently open phase (`phase_status = 1`) are never excluded from the returned page.

#### Scenario: Historical volume exceeds the page limit (prod-like)

- GIVEN the `results` table holds more rows across all historical phases than the requested `LIMIT`
- AND some of those rows belong to the currently open phase (`phase_status = 1`)
- WHEN `AllResultsByRoleUserAndInitiativeFiltered` is called with that `LIMIT`
- THEN every open-phase row that satisfies the existing WHERE clause is present in the returned page
- BUT it must NOT rely on MySQL's default (unordered) `LIMIT` row selection to achieve this
- AND IT MUST remain correct across repeated calls / pagination (deterministic ordering, not incidentally correct once)

#### Scenario: Historical volume is within the page limit (test/local-like — must not regress)

- GIVEN total historical rows are fewer than the requested `LIMIT`
- WHEN the same method is called
- THEN behavior is unchanged from today (all matching rows returned, existing callers unaffected)

### Requirement: Portfolio Overview reports the correct open reporting cycle

The system SHALL display the reporting cycle currently open for submissions (`phase_status = 1`), not a stale/closed fallback, whenever an open phase exists in the data.

#### Scenario: An open phase exists but was previously missed by an unordered, volume-limited fetch

- GIVEN a `version` row exists with `phase_status = 1` (e.g. "2026 · P25")
- AND a separate, older `version` row is closed (e.g. "2025 · P25")
- WHEN an admin opens Portfolio Overview
- THEN the eyebrow shows the open cycle ("Reporting Cycle 2026 · P25")
- AND no "Viewing a closed phase" banner is shown
- BUT it must NOT fall back to the newest visible-but-wrong version and silently label it as closed when an open phase actually exists

### Requirement: Partial-results banner states real, verifiable counts

The system SHALL, when the partial-results banner is shown, state the actual number of rows fetched from the server and the actual server-reported total — not a client-side post-filter count relabeled as either.

#### Scenario: Banner shown because server total exceeds the fetched page

- GIVEN the server's `meta.total` (all-phase `COUNT(1)`) exceeds the number of rows actually returned by the paginated fetch
- WHEN Portfolio Overview renders the partial-results banner
- THEN the number displayed for "showing the first N" equals the count of rows actually fetched from the server (not the post-open-phase-filter count)
- AND the banner's implied "of M" total is consistent with `meta.total`
- BUT it must NOT bind the sentence to `rows().length` (the open-phase-filtered count) while claiming it describes "the first N of a bigger total"

## 7. Non-Functional Requirements

| Attribute | Requirement |
|---|---|
| Correctness under scale | Fix must be verified against a data volume where historical rows exceed the `LIMIT` — sparse test fixtures alone do not exercise the defect (per proposal §12 risk) |
| No regression for other callers | `AllResultsByRoleUserAndInitiativeFiltered` is used elsewhere in the `results` module; adding `ORDER BY` must not change the *set* of rows any existing caller receives within its own `LIMIT`, only the order |

## 8. Defect Classes And Verification Mapping

| Defect class | Catching mechanism |
|---|---|
| Open-phase rows dropped by unordered `LIMIT` once historical volume grows | Repository/service test with a fixture where historical row count > `LIMIT`, asserting all open-phase rows are present (automated) |
| Banner shows wrong count (post-filter number mislabeled as fetched/total) | Component/service unit test asserting the banner's bound value equals fetched-row count, not `rows().length` after phase filtering (automated) |
| Real prod-scale confirmation that the fix resolves the actual observed symptom (2025 shown as open when 2026 should be) | **No automated check reaches real prod data.** Accepted as a manual verification step: re-run the Chrome comparison (prod vs test) from this spec's diagnosis after deploy, or verify against a staging copy with prod-like row volume. Recorded here as a required manual check, not an accepted risk to skip. |

## 9. Requirement ID Index

| ID | Requirement | Scenario(s) |
|---|---|---|
| REQ-1 | Open-phase rows survive the fetch | REQ-1-S1 (volume exceeds limit), REQ-1-S2 (volume within limit, no regression) |
| REQ-2 | Portfolio Overview reports correct open cycle | REQ-2-S1 |
| REQ-3 | Banner states real counts | REQ-3-S1 |

# Design — ToC KPI question optional vs. green check (`bugfix/toc-kpi-optional-green-check`)

## 1. Document Control

| Field | Value |
|---|---|
| Depth / mode | Lite · Bug Mode |
| Requirements | [`requirements.md`](./requirements.md) |
| Approval Mode | `gated` |
| Budget (tripwire for `/akili-execute`) | **3 tasks** (2 code + 1 manual) · **~200 LOC** (migration ~170, mostly the two function bodies; spec ~40; catalog ~5 plus snapshot) · **≤ 2 review rounds** per task |

## 2. Executive Summary

A new migration redefines `validation_contributor_partner_P25`, adding one gate in front of the ToC block: NULL answer + phase year ≥ 2026 → skip. The QA catalog marks the question optional.

## 3. Architecture Overview

```
validation_contributor_partner_P25(resultId)       (body from 1792000000000, P2-3901)
  ├─ load result_type_id                            (unchanged)
  ├─ if type <> 9:
  │     read planned_result (+ narrative)           (unchanged)
  │     NEW: planned_result IS NULL AND phase_year >= 2026 → skip ToC block
  │     planned_result = FALSE → narrative rule     (unchanged)
  │     else → complete ToC rows rule               (unchanged)
  └─ partners / delivery / lead / innovation links  (unchanged)
```

## 4. Extended Directory Structure

| File | Change |
|---|---|
| `onecgiar-pr-server/src/migrations/1792100000000-TKG-TocKpiOptionalGreenCheck.ts` | NEW: `up` = drop + create with the gate; `down` = drop + create with the P2-3901 body |
| `onecgiar-pr-server/src/api/results-framework-reporting/contributors-partners/contributor-partner-green-check.migration.spec.ts` | NEW regression spec (migrations are ignored by Jest, so the spec lives next to the module, following `progress-tracker-*.entity.spec.ts`) |
| `onecgiar-pr-server/src/api/qa-catalog/definitions/sections/contributors-partners.ts` | `toc.planned_result`: `required: false` |
| `onecgiar-pr-server/src/api/qa-catalog/definitions/versions.ts` | 2026 revision 30 → 31 |
| `onecgiar-pr-server/src/api/qa-catalog/__snapshots__/qa-catalog.snapshot.json` (+ catalog specs, only where they assert the old value) | Regenerated or updated |

## 5. Data Model

No schema change. The function reads `version.phase_year` through `result.version_id`, which the body does not join today; one extra scalar lookup.

## 6. API Design

No endpoint change. Green checks and the QA catalog response carry the new values.

## 7. Backend Module Design

- **Base body:** `CONTRIBUTOR_PARTNER_WITH_IMPACT` from `1792000000000-IRS-ImpactResultsFoundation.ts`. That is the live prod body captured in P2-3901 Appendix A plus the type-9 gate. Copy it as-is and add only:
  - a `phase_year` declaration;
  - one scalar select of the phase year next to the existing result-type lookup;
  - an `IF planned_result IS NULL AND COALESCE(phase_year, 0) >= 2026 THEN` no-op branch ahead of the existing `IF planned_result = FALSE` (it becomes `ELSEIF`).
- **`down`:** restores `CONTRIBUTOR_PARTNER_WITH_IMPACT` verbatim. Import it, or copy it with a comment naming the source, so the two cannot drift. Prefer exporting the constant from the IRS migration only if that does not change its `up`/`down` behaviour.
- **The NULL case covers both shapes:** no `results_toc_result` row at all (the `SELECT … INTO` leaves `planned_result` NULL), and a row with `planned_result` NULL. Result 953 is one of the two; both pass.
- **Regression spec:**
  - It loads every migration file under `src/migrations` that issues `CREATE FUNCTION \`validation_contributor_partner_P25\``, picks the newest by timestamp, runs its `up()` against a recording `queryRunner`, and asserts on the body:
    - it contains the NULL + phase-year ≥ 2026 gate before the `planned_result = FALSE` branch;
    - with the gate lines removed and whitespace normalised, it equals `CONTRIBUTOR_PARTNER_WITH_IMPACT`;
    - `down()` issues `CONTRIBUTOR_PARTNER_WITH_IMPACT`.
  - **Red on current code:** the newest such migration is `1792000000000`, which has no gate. It also guards future redefinitions that drop the gate.

## 8. Frontend / UX Component Architecture

None. The client already treats the question as optional for 2026 (`rd-contributors-and-partners.component.html:41`).

## 9. Shared Contracts

QA catalog `catalog_version` 2026.30 → 2026.31.

## 10. Design Decisions

| ID | Decision | Rejected alternative |
|---|---|---|
| TKG-DD-1 | Gate by **phase year**, read inside the function | Gate by portfolio (P25 contains 2025, which must stay required); or a parameter from the caller (every caller would change) |
| TKG-DD-2 | NULL = skip the ToC block, not "treat as No" | Treat as No, which would demand a narrative for an unanswered question and leave the section red |
| TKG-DD-3 | Base on the P2-3901 body, not the older `1762866499786` body | Older body: it would silently revert the type-9 gate and the live prod edits captured in P2-3901 Appendix A |
| TKG-DD-4 | Static SQL assertions plus PRTest behaviour check | A MySQL-backed integration test, which has no harness in this repo; disproportionate for a Lite bug |

**Reversion challenge (Step 2.3):** TKG-DD-2 removes a requirement the server enforced. *What does removing it break?*
- Submit gating for unanswered 2026 results, which is the intent.
- Dashboards that count "complete" sections now count these results. That is consistent with what the form shows.
- Downstream ToC progress reads `results_toc_result` rows, and a NULL answer has none, so nothing there changes.

No breakage outside the intent. Accepted.

**Sizing (Step 2.4):** 3 tasks, ~200 LOC (two copied function bodies dominate), ≤ 2 rounds. This matches Lite.

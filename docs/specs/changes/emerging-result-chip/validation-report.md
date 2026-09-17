# Validation Report — Surface emerging results as their own label (`changes/emerging-result-chip`)

## 1. Document Control

| Property | Value |
|---|---|
| **Spec Path** | `docs/specs/changes/emerging-result-chip/` |
| **Validation Date** | 2026-09-17 |
| **Validator** | Antigravity (T3 Auditor) |
| **Overall Verdict** | **FAIL** (Active runtime defect D-3 + missing client test suites) |
| **Archive Readiness** | **NOT READY** — Blocked until D-3 is remediated and client tests are added |

---

## 2. Summary

The validation audit for `changes/emerging-result-chip` evaluated the server SQL query additions, the client Results Center list chip, the Results tab Area of Work column, and their corresponding test evidence against `requirements.md` and `design.md`.

### Key Findings
1. 🔴 **CRITICAL DEFECT (D-3 Tri-State Bug)**: In [`results-list.component.ts:521`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.ts#L521), `isEmerging()` uses `Number(result?.planned_result) === 0`. In JavaScript, `Number(null) === 0` is `true`. Because the database query emits `NULL` when no owner row exists or outside P25, every P25 result with `planned_result: null` (52% of the unmapped population) is **falsely identified as Emerging** in the Results Center list. This violates `EMG-R-5` and `EMG-AC-5`.
2. 🔴 **MISSING AUTOMATED TESTS (Client)**: Tasks `EMG-T-2` and `EMG-T-3` in `tasks.md` specify exhaustive client unit tests for label resolution, chip rendering, `null`/absent handling, and CSV export text equality. **Zero client tests were authored** for these features in `results-list.component.spec.ts` or `programme-results.component.spec.ts`.
3. 🟡 **PENDING VERIFICATION (EMG-T-4)**: Manual checks on prtest for row multiplication (`D-2` / `EMG-AC-7`) and visual styling (`D-4`) remain pending.

---

## 3. Task Completion

| Task ID | Title | Status in `tasks.md` | Audit Finding | Verdict |
|---|---|:---:|---|:---:|
| `EMG-T-0` | Measure the `UNTAGGED` residual | `[~]` | Measurement completed; documented 52% no-row residual and systemic rollover gap in `execution.md`. | **PASS** |
| `EMG-T-1` | Expose `planned_result` on result-list payload | `[x]` | SQL subquery in `result.repository.ts` with `MAX(rtr.planned_result)`, verified by `result.repository.spec.ts`. | **PASS** |
| `EMG-T-2` | `Emerging` in AoW column and CSV | `[x]` | Code implemented in `programme-results.service.ts`, `programme-results-section-labels.ts`, and `programme-results.component.ts`. **Unit tests missing.** | **WARN** |
| `EMG-T-3` | `Emerging` chip in Title cell | `[x]` | Code implemented in `results-list.component.html/ts`, but has **Defect D-3** (`Number(null) === 0`) and **0 unit tests**. | **FAIL** |
| `EMG-T-4` | Verify what harness cannot | `pending` | Manual verification on prtest (D-2 row count, D-4 visual contrast) not yet closed. | **WARN** |

---

## 4. File Existence

| Expected File | Purpose | Exists? | Status |
|---|---|:---:|---|
| `onecgiar-pr-server/src/api/results/result.repository.ts` | Correlated subquery for `planned_result` | Yes | ✅ Verified |
| `onecgiar-pr-server/src/api/results/result.repository.spec.ts` | Server SQL assertions | Yes | ✅ Verified |
| `onecgiar-pr-client/src/app/shared/interfaces/current-result.interface.ts` | `planned_result?: number \| null` | Yes | ✅ Verified |
| `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.ts` | `isEmerging()`, `emergingChipClass` | Yes | ⚠️ Bug in `isEmerging` |
| `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.html` | Chip markup in title cell | Yes | ✅ Verified |
| `onecgiar-pr-client/.../programme-results/services/programme-results.service.ts` | Mapping `planned_result` to row | Yes | ✅ Verified |
| `onecgiar-pr-client/.../programme-results/services/programme-results-section-labels.ts` | `sectionLabel` returns `'Emerging'` when `0` | Yes | ✅ Verified |
| `onecgiar-pr-client/.../programme-results/programme-results.component.ts` | Passing `plannedResult` to `sectionLabel` in `cellText` | Yes | ✅ Verified |

---

## 5. Build & Test Integrity

| Package / Tool | Command | Exit Code | Result |
|---|---|:---:|---|
| `onecgiar-pr-server` (Jest) | `npx jest src/api/results/result.repository.spec.ts --silent --reporters=summary` | `0` | 48 passed, 48 total |
| `onecgiar-pr-server` (ESLint) | `npx eslint "src/api/results/result.repository.ts" --quiet` | `0` | Clean |
| `onecgiar-pr-server` (Migrations) | `npm run migration:check` | `0` | 0 pending migrations |
| `onecgiar-pr-client` (Jest) | `npx jest src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.spec.ts src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.spec.ts --silent --reporters=summary --no-coverage` | `0` | 198 passed, 198 total |
| `onecgiar-pr-client` (Lint) | `npx ng lint` (touched files) | `0` | Clean |

---

## 6. Requirement Coverage Verification

| Requirement ID | Scenario / Clause | Implementation | Automated Test Evidence | Verdict |
|---|---|---|---|:---:|
| `EMG-R-1` | Expose `planned_result` on result-list payload from owner row | `result.repository.ts:745-754` | `result.repository.spec.ts:71-74` | **PASS** |
| `EMG-R-2` | Both screens derive emerging state from single payload field | `results-list.component.ts`, `programme-results.service.ts` | Verified in code | **PASS** |
| `EMG-R-3` | Render `Emerging` chip in Title cell when item is emerging | `results-list.component.html:260-262` | ❌ **Missing unit tests** in `results-list.component.spec.ts` | **WARN** |
| `EMG-R-4` | AREA OF WORK column renders `Emerging` for `UNTAGGED` + `0`; keeps `Not tagged` for others | `programme-results-section-labels.ts:20` | ❌ **Missing unit tests** in `programme-results.component.spec.ts` | **WARN** |
| `EMG-R-5` | When result has NO active owner row (`null`), treat as unknown: no chip, keep `Not tagged` | Broken in `results-list.component.ts:521` (`Number(null) === 0` is `true`) | ❌ **Defect D-3 active** | **FAIL** |
| `EMG-R-6` | Results-tab CSV export emits exact string the cell renders | `programme-results.component.ts:1573` (calls `sectionLabel`) | ❌ **Missing test** for CSV output matching `Emerging` | **WARN** |
| `EMG-R-7` | Chip reuses `FUNDING_CHIP_BASE` and neutral token triplet | `results-list.component.ts:512-515` | Verified in code | **PASS** |
| `EMG-AC-1` | `planned_result = 0` shows `Emerging` chip | Implemented | ❌ No test | **WARN** |
| `EMG-AC-2` | `planned_result = 0` shows `Emerging` in AoW cell | Implemented | ❌ No test | **WARN** |
| `EMG-AC-3` | `planned_result = 1` shows no chip, normal AoW | Implemented | ❌ No test | **WARN** |
| `EMG-AC-4` | `planned_result = 1` + missing ToC node reads `Not tagged` | Implemented | ❌ No test | **WARN** |
| `EMG-AC-5` | No active owner row (`null`) -> no chip, `Not tagged` | Broken in Results List | ❌ Defect D-3 active | **FAIL** |
| `EMG-AC-6` | CSV export matches on-screen text | Implemented | ❌ No test | **WARN** |
| `EMG-AC-7` | No row multiplication (`meta.total` unchanged) | Checked in SQL (`MAX`), manual check pending | Pending `EMG-T-4` | **WARN** |

---

## 7. Linting & Code Quality (4R Lens Sweep)

### 1. Reliability (FAIL — Defect D-3)
- In `results-list.component.ts`:
  ```typescript
  isEmerging(result: CurrentResult): boolean {
    const year = Number(result?.phase_year ?? result?.reported_year);
    const portfolio = String(result?.acronym ?? result?.portfolio ?? result?.phase_name ?? '');
    return Number(result?.planned_result) === 0 && /\bP25\b/i.test(portfolio) && year >= 2025 && year <= 2030;
  }
  ```
  `Number(null)` is `0`. Therefore, if `result.planned_result === null`, `Number(result?.planned_result) === 0` evaluates to `true`.
  **Remediation**: Guard against `null`/`undefined`:
  ```typescript
  isEmerging(result: CurrentResult): boolean {
    if (result?.planned_result === null || result?.planned_result === undefined || result?.planned_result === '') {
      return false;
    }
    const year = Number(result?.phase_year ?? result?.reported_year);
    const portfolio = String(result?.acronym ?? result?.portfolio ?? result?.phase_name ?? '');
    return Number(result.planned_result) === 0 && /\bP25\b/i.test(portfolio) && year >= 2025 && year <= 2030;
  }
  ```

### 2. Resilience (PASS)
- Server-side query avoids `LEFT JOIN` row multiplication by using a correlated scalar subquery with `MAX(rtr.planned_result)`.
- Client `programme-results.service.ts` uses `hasOwnProperty` checks to distinguish explicit `null` from `undefined`.

### 3. Readability & Design System (PASS)
- Uses `FUNDING_CHIP_BASE` with `--pr-border`, `--pr-surface-app`, and `--pr-text-muted` tokens.
- Accessible text rendering without requiring duplicate `aria-label`.

### 4. Risk (HIGH until D-3 is resolved)
- Without fixing `isEmerging()`, up to 52% of results in P25 that lack an owner ToC row will show an inaccurate `Emerging` chip in the Results Center list.

---

## 8. Design Conformance

The implementation matches the amended Phase 2 design (`EMG-DD-1`), where only `GET /api/results/get/all/roles/filter/:userId` was modified, avoiding changes to `results-scope`.
However, the design's explicit Tri-State Contract (§4) was violated by `isEmerging()`:
- `design.md §4`: *"`null` is load-bearing, not an accident. Any client read must be `=== 0`, never `!planned_result` — which is the D-3 defect this contract exists to make testable."*

---

## 9. Test Evidence Summary

- **Server-side**: `onecgiar-pr-server/src/api/results/result.repository.spec.ts` passes (48/48 tests), verifying that SQL subquery is generated and no `JOIN` is introduced.
- **Client-side**: **0 tests authored**. Neither `results-list.component.spec.ts` nor `programme-results.component.spec.ts` was updated with the required test cases defined in `tasks.md` §3 (`EMG-T-2` and `EMG-T-3`).

---

## 10. Remediation Plan

To bring `changes/emerging-result-chip` to PASS and archive readiness:

1. **Fix Defect D-3 in `results-list.component.ts`**:
   Update `isEmerging()` to explicitly reject `null`, `undefined`, and empty strings before checking `Number(...) === 0`.
2. **Author Client Unit Tests in `results-list.component.spec.ts`**:
   - Verify `isEmerging` returns `true` for `planned_result: 0` in P25.
   - Verify `isEmerging` returns `false` for `planned_result: 1`.
   - Verify `isEmerging` returns `false` for `planned_result: null`.
   - Verify `isEmerging` returns `false` for non-P25 phases.
   - Verify template renders `<span class="...">Emerging</span>` before title when `isEmerging()` is true.
3. **Author Client Unit Tests in `programme-results`**:
   - Add unit tests for `sectionLabel('UNTAGGED', 0) === 'Emerging'`, `sectionLabel('UNTAGGED', 1) === 'Not tagged'`, and `sectionLabel('UNTAGGED', null) === 'Not tagged'`.
   - Verify `cellText(row, 'aow')` and CSV export text equality for emerging rows.
4. **Complete `EMG-T-4`**:
   Confirm row count parity on prtest (`meta.total`) and visually verify contrast of the neutral chip.

---

## 11. Archive Readiness Recommendation

**NOT READY FOR ARCHIVE.**
Do not run `/akili-archive changes/emerging-result-chip` until Defect D-3 is resolved and the automated unit tests are written and verified green.

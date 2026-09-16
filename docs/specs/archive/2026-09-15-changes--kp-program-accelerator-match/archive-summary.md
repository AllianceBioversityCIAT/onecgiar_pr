# Archive Summary — `changes/kp-program-accelerator-match`

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/kp-program-accelerator-match/` |
| Short Code | `KPAM` |
| Archive Date | 2026-09-15 |
| Final Status | `completed` |
| Author / Driver | Results & Science Program Reporting |
| Branch | `qa-development-2026` (spec branch, default pin `master`) |

---

## 2. Requirements Delivered

| Requirement / AC | Description | Status |
|---|---|:---:|
| `KPAM-R-1` / `KPAM-AC-1` | Extract `cg.contributor.programAccelerator` metadata in server DSpace proxy | Delivered |
| `KPAM-R-2` / `KPAM-AC-2` | Propagate active Science Program context (`programCode`, `programName`) | Delivered |
| `KPAM-R-3` / `KPAM-AC-4` | Resilient string matching with case and punctuation normalisation | Delivered |
| `KPAM-R-4` | Visual indicator badge `[✨ Matches <ProgramName>]` and left card border | Delivered |
| `KPAM-R-5` | Non-restrictive default view (all repository publications remain accessible) | Delivered |
| `KPAM-R-6` / `KPAM-AC-3` | Soft-boost sort order prioritizing matched publications at top of list | Delivered |
| `KPAM-R-7` / `KPAM-AC-5,6` | Match counter and 1-click filter toggle chip ("All results" vs "Matches only") | Delivered |
| `KPAM-AC-7` / `Gate D1` | Graceful fallback to empty array when metadata tag is absent | Delivered |
| `Gate D1..D6` | Complete defect gate enforcement across server proxy, client UI, dedup, and types | Delivered |

---

## 3. Files Changed Summary

### Server (`onecgiar-pr-server`)
- `src/api/results/results-knowledge-products/cgspace-discovery/dto/cgspace-item.dto.ts`: Added optional `programAccelerators?: string[]`.
- `src/api/results/results-knowledge-products/cgspace-discovery/cgspace-discovery.mapper.ts`: Mapped `cg.contributor.programAccelerator` to `programAccelerators` array with truthy filtering and `[]` fallback.
- `src/api/results/results-knowledge-products/cgspace-discovery/cgspace-discovery.mapper.spec.ts`: Unit tests for present, empty, and missing metadata scenarios.
- `src/api/results/results-knowledge-products/cgspace-discovery/merge.ts`: Enhanced `dedupe()` to union and deduplicate `programAccelerators` across duplicate group items.
- `src/api/results/results-knowledge-products/cgspace-discovery/merge.spec.ts`: Unit tests verifying multi-source accelerator tag union during deduplication.

### Client (`onecgiar-pr-client`)
- `src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/components/kp-cgspace-browse/kp-cgspace-browse.component.ts`: Added `programCode`, `programName` inputs, `matchesProgram()` normalizer, `displayItems` computed signal for soft-boost sort, and `onlyMatches` toggle signal.
- `src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/components/kp-cgspace-browse/kp-cgspace-browse.component.html`: Rendered badge with violet tokens, card border accent, match counter, and 1-click toggle chip.
- `src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/components/kp-cgspace-browse/kp-cgspace-browse.component.spec.ts`: Comprehensive unit tests covering normalizer variations, soft boost, non-restriction, badge rendering, and toggle chip.
- `src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.ts`: Added `SCIENCE_PROGRAM_NAMES` dictionary, `resolvedProgramName` waterfall resolution signal.
- `src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.html`: Bound `programCode` and `programName` to `<app-kp-cgspace-browse>`.
- `src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.spec.ts`: Unit tests verifying input forwarding and template binding assertions.
- `src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/aow-hlo-create-modal.component.html`: Bound typed `officialCode` and `shortName` / `name` to `<app-kp-cgspace-browse>`.

---

## 4. Test & Verification Evidence

1. **Server Tests (`cgspace-discovery`):** 5 suites passed, 88/88 tests passed.
2. **Server Linter:** 0 ESLint errors.
3. **Client Tests:** 2 suites passed, 165/165 tests passed (`kp-cgspace-browse` & `lab-report-form`).
4. **Client Linter:** 0 errors across all modified files.
5. **Angular Build (`ng build`):** Exit code 0, 100% clean bundle compilation.
6. **Migrations Status:** No migrations required for this feature.

---

## 5. Accepted Warnings & Follow-ups

- None. All 4 planned tasks completed with PASS verdicts.

---

## 6. Historical Notes

- **Multi-Source Deduplication Tag Loss (T-4 Catch):** During multi-source deduplication (`merge.ts`), survivors could drop `programAccelerators` if the chosen canonical record originated from a repository lacking that metadata tag. Remediated by unioning tags across all grouped duplicate items into a `Set`.
- **Angular Template Strict Type Checking:** `entityDetails()` returns an `Initiative` model that uses camelCase (`shortName`, `officialCode`). Snake_case was corrected to ensure strict template type checking passes cleanly.

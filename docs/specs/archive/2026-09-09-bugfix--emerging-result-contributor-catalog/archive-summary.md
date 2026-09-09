# Archive Summary — Emerging Result: full CGIAR Center / Science Program catalogue

## 1. Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/bugfix/emerging-result-contributor-catalog/` |
| Archive date | 2026-09-09 |
| Final status | **Shipped** — both tasks `[x]`, manually verified in browser by the user |
| Depth | Lite — 2 tasks (revised mid-execution by pivot; see §10) |
| Branch | `qa-development-2026-ss` (not the default branch — constitution/TRD sync recorded as pending items, not applied; see §10 and the Kaizen entry) |

## 2. Original Spec Path

`docs/specs/bugfix/emerging-result-contributor-catalog/` (`requirements.md`, `design.md`, `tasks.md`, `execution.md`, `proposal.md`).

## 3. Archive Date

2026-09-09.

## 4. Final Status

**Shipped, both tasks complete:**
- `ERC-T-1` — fix applied to `aow-hlo-create-modal.component.ts` (correct, but confirmed inert for the live "Report emerging result" flow — see §10).
- `ERC-T-2` — the actually-live fix, applied to `lab-report-form.component.ts`/`.html`, manually verified by the user in the browser.

## 5. Requirements Delivered

| ID | Delivered by | Status |
|---|---|---|
| `ERC-R-1` (no ToC preselection when no indicator) | `ERC-T-1` + `ERC-T-2` | ✅ |
| `ERC-R-2` (full-catalogue dropdown renders directly) | `ERC-T-2` (the live-reachable delivery) | ✅ manually verified |
| `ERC-R-3` (indicator/ToC flow unchanged) | `ERC-T-1` + `ERC-T-2` regression tests | ✅ |
| `ERC-R-10` (fix stays inside the preselect methods, no new state) | `ERC-T-1` | ✅ |
| `ERC-AC-1` / `ERC-AC-2` | Both tasks' Jest suites | ✅ |

## 6. Files Changed Summary (from `execution.md`)

**`ERC-T-1`:**
- `onecgiar-pr-client/.../aow-hlo-create-modal.component.ts` — indicator-presence guard in `preselectTocCenters()` / `preselectTocSciencePrograms()`.
- `onecgiar-pr-client/.../aow-hlo-create-modal.component.spec.ts` — 2 new regression cases.

**`ERC-T-2`:**
- `onecgiar-pr-client/.../dashboard-lab/components/lab-report-form/lab-report-form.component.ts` — added `hasReferenceCenters`/`hasReferenceScience` computed signals.
- `.../lab-report-form.component.html` — branched Centers/Science-Programs blocks (full catalogue direct vs. ToC+Other(s) split).
- `.../lab-report-form.component.spec.ts` — 3 new regression/DOM cases.
- `.../lab-report-form/CLAUDE.md` — re-stamped, new trap entry.

## 7. Test Evidence Summary

| Task | Command | Result |
|---|---|---|
| `ERC-T-1` | `npx jest --testPathPattern="aow-hlo-create-modal"` | 59/59 passed (2 rework attempts; attempt 2 fixed a vacuous async assertion, PASS) |
| `ERC-T-1` | `npx ng build --configuration development` | Success |
| `ERC-T-2` | `npx jest --testPathPattern="lab-report-form"` | 86/86 passed (1 attempt, PASS on first try) |
| `ERC-T-2` | `npx ng build --configuration development` | Success |

No `test-report.md` was produced — verification evidence lives entirely in `execution.md`'s per-attempt Implementer/Reviewer records (accepted; this is a Lite-depth bugfix executed inline via `/akili-execute`, not routed through `/akili-test`).

## 8. Validation Summary

No `/akili-validate` pass was run — accepted. Validation-equivalent evidence: two independent Reviewer PASS verdicts (one per task, `execution.md`) plus user-performed manual browser verification of the live "Report emerging result" flow (both Contributing CGIAR Centers and Contributing Science Programs rendering the full catalogue directly, Science Program names displaying correctly).

## 9. Accepted Warnings Or Follow-Ups

- `ERC-T-1`'s Reviewer ADVISORY (non-gating): `preselectTocSciencePrograms()`'s emerging branch clears `entityAowService.selectedEntities` (service-level state) — init-time only today, no regression, worth remembering if a second caller ever invokes this method post-init. **Accepted, no follow-up task.**
- `ERC-T-1`'s Reviewer ADVISORY: the `ERC-` id prefix is shared with an unrelated spec (`changes/emerging-result-cta-placement`). **Accepted, no follow-up task** — in-code comments already disambiguate by folder name.
- `ERC-OQ-1` (requirements.md §10): closed by explicit user instruction — `rd-contributors-and-partners` is out of scope and was not touched. No follow-up spec implied.

## 10. Historical Notes

**Mid-execution pivot (2026-09-09):** `ERC-T-1` was implemented and PASSed review against `aow-hlo-create-modal.component.ts`, based on a requirements.md-documented, user-confirmed assumption that this was the only component opening the "emerging result" flow. That assumption had gone stale: since spec `changes/emerging-result-cta-placement` (2026-09-05), "Report emerging result" opens a different component, `dashboard-lab/components/lab-report-form/lab-report-form.component.ts`, via the `indicator-drawer` aside. The user manually verified in the browser that the bug still reproduced after `ERC-T-1` shipped, which surfaced the stale assumption. A new task, `ERC-T-2`, was added mid-spec (full Pivot Record in `execution.md`) targeting the actually-live component. `ERC-T-1`'s code remains in place — correct and harmless for the legacy `entity-aow` entry points it still serves — it was not reverted.

**Branch-gated constitution sync:** this archive ran on `qa-development-2026-ss`, not the default branch (`master`). Per the AKILI branch gate, guide-sync / factual-sweep / TRD-ADR writes were not applied — they are recorded as pending items in this spec's Kaizen entry file for application on the default branch.

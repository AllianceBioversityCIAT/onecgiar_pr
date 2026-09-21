# Archive Summary — Bilateral External Partners Not Saving (Lite / Bug)

## 1. Document Control

| Field | Value |
|---|---|
| Original spec path | `bugfix/bilateral-external-partners-not-saving` |
| Depth | Lite |
| Archive date | 2026-09-21 |
| Branch at archive time | `qa-development-2026-ss` (spec branch — not `master`/`staging`) |
| Commit | `064f5135a` — `fix(section-contributors): surface visible error and Retry when the centers catalogue fails to load` |

## 2. Final Status

**Shipped to branch, pending PR/CI/staging QA.** `BIL-T-1` (the spec's only task) is `[x]` with a Reviewer PASS on rework attempt 2. Code is committed to `qa-development-2026-ss`. No `test-report.md` / `validation-report.md` were produced — this Lite bug spec did not run `/akili-test` or `/akili-validate` as separate steps; verification evidence lives inline in `execution.md` (Implementer's Jest/lint runs + the Reviewer's independent re-read of the diff). Accepted as sufficient for a single-component, additive, Lite-depth fix.

## 3. Requirements Delivered

| ID | Description | Status |
|---|---|---|
| `BIL-R-1` | `centersLoadFailed` signal reflects a failed `CentersService.getData()` call | ✅ Delivered |
| `BIL-R-2` | `retryLoadCenters()` lets the user recover without a full page reload | ✅ Delivered |
| `BIL-R-3` | Existing happy-path behavior (partners save when centers load fine) unaffected | ✅ Delivered (regression-guarded) |
| `BIL-AC-1` | A visible error banner with Retry appears on centers-load failure | ✅ Delivered, DOM-rendering proven (attempt 2) |
| `BIL-AC-2` | Retry recovers the section without reload | ✅ Delivered |
| `BIL-AC-3` | No regression to the existing 104-case suite | ✅ Delivered (127/127 final, both spec files) |

## 4. Files Changed Summary (from `execution.md`)

- `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/section-contributors.component.ts` — `centersLoadFailed` signal, error handling in `loadCenters()`, `retryLoadCenters()`.
- `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/section-contributors.component.html` — error banner + Retry button, mirrors the sibling `partnersLoadFailed` block.
- `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/section-contributors.component.spec.ts` — 7 new signal-level regression tests.
- `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/section-contributors.readonly.spec.ts` — 3 new DOM-rendering tests (added in rework, attempt 2 — the harness that renders the real template).
- `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/CLAUDE.md` — dated entry + re-stamped `Verified:` line, test counts corrected (104→111 main spec, 13→16 readonly spec).

No backend, DTO, migration, or shared-service (`CentersService`) changes — scope held exactly to the approved design.

## 5. Test Evidence Summary

- `npx jest --testPathPattern=section-contributors --silent` → **127/127 passed** (final, both spec files combined).
- Red-run proof (attempt 1): stashing only the `.ts` fix reproduced 3 failures (`centersLoadFailed is not a function` / `retryLoadCenters is not a function`), confirming the regression tests are genuine falsifiers.
- `npx ng lint --quiet` → clean, both attempts.

## 6. Validation Summary

No separate `/akili-validate` run. Spec-conformance validation was performed by the AKILI Reviewer inline in the Leader→Implementer→Reviewer loop (see `execution.md` § 2), covering: design token compliance, DD-1 (fail-visible over fail-open) honored, `CentersService` untouched (disqualifier avoided), no API/DTO surface change, folder `CLAUDE.md` convention followed.

## 7. Accepted Warnings Or Follow-Ups

| Item | Status | Notes |
|---|---|---|
| PR opened, CI green | ⏳ Pending | Not yet opened as of archive time — commit `064f5135a` is on `qa-development-2026-ss` only. |
| Manual QA on staging (simulate centers-load failure via DevTools) | ⏳ Pending | Per `tasks.md` § 6 — to be done once deployed to a shared environment. |
| `retryLoadCenters()` re-subscribe leak (ADVISORY, attempt 1) | Accepted, not fixed | Newly reachable via retry but harmless (`mapCenters()`/signal sets are idempotent). Not a spec violation; left as-is per Leader's Advisory-Never-Gates rule. |
| Test-realism note on synchronous mock emission (ADVISORY, attempt 1) | Accepted, not fixed | Cosmetic; does not affect assertion validity. |
| `loadProjects()`'s silent fail-open behavior | Out of scope | Flagged in `design.md` § 13 Open Gaps as a candidate for a future, separate investigation — not actioned here. |

## 8. Historical Notes

- One rework round: Reviewer FAILed attempt 1 because the regression tests only asserted the `centersLoadFailed` signal, while the main spec file (`section-contributors.component.spec.ts`) stubs the template with `overrideTemplate('<div></div>')` and structurally cannot prove the error banner renders in the DOM — the same gap class that let a prior bug (P2-3520) through in this same file. Attempt 2 added 3 DOM-rendering tests to the sibling `*.readonly.spec.ts` harness (which renders the real template), closing the gap with no production-code changes needed.
- Separately during manual review (post-archive-readiness, same session), a user-reported "External partners not saving" case (Innovation Development result, `result_innovation_dev_id: 2207`) was investigated and found to be **unrelated to this fix** — the reporting user had selected "FAO" entries under the "Contributing W3/bilateral projects" search instead of the separate "External partners" (institutions) selector in the Contributors & Partners section. Confirmed via code trace (`innovation-dev-info/components/estimates/estimates.component.html`); no code change made, no new task opened under this spec (out of scope — different component, likely user-training/UX-clarity issue).

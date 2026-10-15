# Archive Summary — `bugfix/stale-bundle-refresh-prompt`

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/stale-bundle-refresh-prompt` (`SBR`) |
| Depth | Lite |
| Mode | Bug Mode (no prior `proposal.md`) |
| Owner | M. Giraldo (QA) |
| Approval Mode | interactive |

## 2. Original Spec Path

`docs/specs/bugfix/stale-bundle-refresh-prompt/`

## 3. Archive Date

2026-10-14

## 4. Final Status

**Shipped to code, pending one human verification step.** `SBR-T-1` (the spec's only task) PASSed on attempt 2 after a mid-loop Pivot. Merged to `qa-development-2026-mc-2` and `performance-refactor` (both pushed to origin). The one outstanding item — a manual TEST smoke check — is a human-only gate that nothing in CI can substitute for; it does not block archiving per the user's explicit readiness decision (see §9).

## 5. Requirements Delivered

| ID | Summary | Status |
|---|---|---|
| `SBR-R-1` | Detect stale-bundle `NavigationError`, no silent dead click | ✅ Delivered |
| `SBR-R-2` | Show sticky "new version available" banner | ✅ Delivered (required the Pivot fix — see §10) |
| `SBR-R-3` | One-click reload action | ✅ Delivered |
| `SBR-R-4` | Global wiring (app-root level); test scope ≥ `/bilateral/**` | ✅ Delivered |
| `SBR-R-10` | No duplicate/stacked banners | ✅ Delivered |

All 5 requirement IDs and all 4 `requirements.md` §6 scenarios are conformant per the attempt-2 Reviewer `STATUS: PASS`.

## 6. Files Changed Summary (from `execution.md`)

| File | Change |
|---|---|
| `onecgiar-pr-client/src/app/app.component.ts` | `NavigationError` subscription, `isStaleBundleError`/`extractErrorMessage`/`showStaleBundleBanner` methods, logger call |
| `onecgiar-pr-client/src/app/app.component.html` | Second `<app-pr-toast key="stale-bundle-refresh" />` host (added in the Pivot) |
| `onecgiar-pr-client/src/app/app.component.spec.ts` | 5 new tests: main case, reload action, negative control, dedup, DOM-render proof (the last added in the Pivot) |
| `onecgiar-pr-client/src/app/internationalization/stale-bundle-refresh.copy.ts` | New — banner copy, `as const`, not a `TermKey` |

Commits: `00a85e029` (attempt 2 implementation), `5ccf10525` (bookkeeping), both on `qa-development-2026-mc-2`; merged into `performance-refactor` and `qa-development-2026-mc-2` at `4ed4f6520` (pushed to `origin`).

## 7. Test Evidence Summary

No separate `/akili-test` run or `test-report.md` — this Lite-depth bugfix embedded its regression tests directly in the task (TDD-assigned skill) per the spec's own Testing Plan.

| Check | Result |
|---|---|
| `npx jest src/app/app.component.spec.ts` | 10/10 passed; red-before/green-after independently observed and Leader-reverified for both the detection logic (attempt 1) and the DOM-render assertion (attempt 2, the row the Pivot added) |
| `npx ng lint --quiet` | Clean, Leader-reverified |
| `npm run build` | Clean, Leader-reverified |
| Full-suite coverage | 83.05%/75.64%/80.34%/83.92% (statements/branches/functions/lines) on attempt 1's full run — well above the 50/60/60/60 gate; attempt 2 was additive-only and accepted without a second full-suite run (Reviewer-accepted reasoning) |

## 8. Validation Summary

No separate `/akili-validate` run or `validation-report.md`. Conformance was established entirely through the Implementer → Reviewer gate: attempt 1 Reviewer `STATUS: FAIL` (the Pivot trigger), attempt 2 Reviewer `STATUS: PASS` with 3 non-gating `ADVISORY` findings (toast-host visual stacking — deferred to the manual check; a test-only duplicate-`ngOnInit` reliability note; a minor assertion-tightening suggestion).

## 9. Accepted Warnings Or Follow-Ups

| Item | Status | Owner |
|---|---|---|
| Manual TEST smoke check (`tasks.md` §6) — deploy a change, keep a stale tab open, click a Bilateral link / W3 row, confirm banner + reload | **Pending** — explicitly accepted as a post-archive follow-up by the user at the `/akili-archive` readiness gate (2026-10-14) | M. Giraldo |
| Move spec status to `shipped` (`tasks.md` §7) | Pending the above | M. Giraldo |
| No `test-report.md`/`validation-report.md` | Explicitly accepted — Lite depth, evidence embedded in `execution.md` instead | User decision, 2026-10-14 |
| 3 Reviewer `ADVISORY` findings (attempt 2) | Recorded, non-gating, not actioned | — |
| `onecgiar-pr-client/src/CLAUDE.md` §2.1's stale "Toast = `MessageService`/`ToastModule`" row (pre-existing drift, not caused by this spec) | Flagged for `/akili-audit`; not actioned here (shared-file write discipline) | — |
| Future browser-wording change could slip past the regex match (`design.md` §13) | Accepted risk for this Lite fix | — |
| Promote the per-caller de-dup check (`SBR-DD-3`) into `PrToastService` if a second caller needs it | Deferred follow-up, not in scope | — |

## 10. Historical Notes

- **Pivot:** attempt 1's implementation was behaviorally correct (detection, dedup, reload all worked) but the toast was added under a key with no matching `<app-pr-toast>` render host — invisible to the user, reproducing the exact bug the spec targeted. The Leader and user ran the Pivot Protocol: the user chose to add a dedicated host (over reusing the existing `globalUserNotification` host); `design.md`/`tasks.md` were amended accordingly, and attempt 2 passed. Full record: `execution.md` → `## Pivot Record: SBR-T-1`.
- **Attempt accounting:** per Pivot Detection, attempt 1's FAIL did not consume a rework attempt — attempt 2 was the task's first attempt counted against the 3-attempt ceiling, and it PASSed.
- **Kaizen:** this Pivot's root cause (a Premise Ledger claim about an existing component "already does X" not verified against that component's actual render path) is the **third** recorded occurrence of the same pattern in this project — see `docs/specs/kaizen/bugfix--stale-bundle-refresh-prompt.md` for the full retrospective, including a `digest-update` pending item against the existing high-severity lesson.
- **Branch work:** this spec's commits were merged into both `qa-development-2026-mc-2` and `origin/performance-refactor` (direct push, by explicit user instruction, no PR) on 2026-10-14.

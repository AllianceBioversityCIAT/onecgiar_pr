# Archive Summary — "Other(s) External Partners" shown by default

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/bugfix/external-partners-toc-visibility/` |
| Archive Date | 2026-08-27 |
| Final Status | **Shipped — PASS** |
| Owner | Current user (santiago.sanchez@cgiar.org) |

## 2. Original Spec Path

`docs/specs/bugfix/external-partners-toc-visibility/`

## 3. Archive Date

2026-08-27

## 4. Final Status

PASS on attempt 1/3. Reviewer verdict: `STATUS: PASS`. No HALT, no Pivot, no PRODUCT_BUG.

## 5. Requirements Delivered

| ID | Delivered |
|---|---|
| `EPT-R-1` | ✅ Empty-ToC dropdown no longer labeled "Other(s) External Partners" |
| `EPT-R-2` | ✅ Orange advisory note unchanged |
| `EPT-R-3` | ✅ Full unfiltered catalog unchanged |
| `EPT-R-4` | ✅ Opt-in case still labeled "Other(s) External Partners" (regression guard) |
| `EPT-R-10` | ✅ Reused primary field's own label ("External partners") |
| `EPT-AC-1` | ✅ Verified via `EPT-TEST-1a` |
| `EPT-AC-2` | ✅ Verified via `EPT-TEST-1b` |

## 6. Files Changed Summary

From `execution.md`:

- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/normal-selector/normal-selector.component.html` — conditional `[labelText]`/`[label]` binding on `hasReferencePartners()`, `data-testid="toc-other-partners"` added.
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/normal-selector/cpnormal-selector.component.spec.ts` — new `describe` block, `EPT-TEST-1a`/`EPT-TEST-1b`.
- No `.ts` change to `normal-selector.component.ts` (existing computeds reused unchanged).

## 7. Test Evidence Summary

- `npx jest --testPathPattern="cpnormal-selector.component.spec"` → 13/13 passed.
- `npx ng lint --quiet` → clean.
- Broader sanity (`normal-selector` pattern) → 20/20 passed.
- RED→GREEN confirmed: pre-fix run failed (missing `data-testid` hook / static label), post-fix run green.

## 8. Validation Summary

No `validation-report.md` was produced — this is a Lite, single-file, label-only Bug Mode fix; the Implementer/Reviewer PASS cycle plus RED→GREEN regression tests stand in as the validation evidence, per the spec's own Lite-depth budget (1 task, ~15–25 LOC, 1 review round — `design.md` §2.4). No FAIL findings exist to resolve.

## 9. Accepted Warnings Or Follow-Ups

- **ADVISORY (non-gating, Readability):** the `hasReferencePartners() ? ... : ...` ternary is duplicated across two bindings. Extracting a `computed()` was out of scope for this Lite task (design mandates no `.ts` change) — deferred to the future shared-component consolidation noted in `design.md` §13.
- **ADVISORY (non-gating, Reliability):** `tasks.md` §5's coverage table is slightly broader than the actual test assertions (doesn't independently assert the orange note or catalog non-emptiness) — accepted, since neither surface is touched by this diff and `EPT-R-3` was already a recorded accepted gap.
- **Not Done:** manual/browser spot-check on staging — deferred to `tasks.md` §6 Rollout & verification (human/QA step), not a blocking Implementer deliverable per Leader disposition in `execution.md`.

## 10. Historical Notes

- Sibling fix to `docs/specs/bugfix/other-fields-toc-visibility/` (P2-3499) — same defect class (static "Other(s)" label shown in an empty-ToC auto-activated state), same fix mechanism (`OTV-DD-1`/`EPT-DD-1`: conditional label binding, not a static relabel), applied here to a different component (`normal-selector` / External Partners) not covered by that spec's scope.
- Smaller than the sibling spec: 1 task vs. 5, ~15–25 LOC vs. ~130–170 LOC, since only one component/file needed the fix (External Partners has no `aow-hlo-create-modal`/`lab-report-form` equivalent).
- Follow-up recorded (not filed as a separate ticket): if the sibling spec's "extract a shared ToC-split + Other(s) section component" idea is ever pursued, this component's External Partners pattern is a natural fourth consumer.

# Archive Summary — Default Every System Table To 100 Rows Per Page

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/table-pagination-default-100-rows` |
| Archive Date | 2026-10-08 |
| Branch (at archive time) | `qa-development-2026-mc` (spec branch — neither `Default Branch: master` nor `Integration Branch: staging`) |
| Depth | Standard |
| Approval Mode | gated (each phase gate confirmed with the user) |

## 2. Final Status

**Shipped.** All 4 tasks (`PTR-T-1`..`PTR-T-4`) closed. The 3 code tasks PASSed on first Implementer attempt with a Reviewer `PASS` each (no rework); `PTR-T-4` (manual verification) closed by the user's own browser check. Committed in 2 commits (`6b209f28b` the fix + docs, `61969e4de` the verification record), pushed, and merged forward into `performance-refactor` (commit `92faed3c0`) at the user's explicit direction.

## 3. Requirements Delivered

| ID | Description | Status |
|---|---|---|
| `PTR-R-1` | 12 "default-only" tables render `[rows]="100"` | ✅ Delivered (`PTR-T-1`) |
| `PTR-R-2` | 6 "needs options update" tables render `[rows]="100"` with `100` added to `rowsPerPageOptions` | ✅ Delivered (`PTR-T-2`, `PTR-T-3`) |
| `PTR-R-3` | The 6 out-of-scope (no-pagination) tables remain untouched | ✅ Delivered — verified via scope-confined diffs on every task |
| `PTR-R-4` | Both `mapped-results-modal` copies stay byte-identical | ✅ Delivered, confirmed via identical post-change git blob hash |
| `PTR-R-5` | No pre-existing `.spec.ts` assertion broken | ✅ Delivered — 702 + 161 + 5 Jest tests green across all touched suites |
| `PTR-R-10` | Manual performance/scroll check on `results-list`, `programme-results`, `wp-home` | ✅ Delivered (`PTR-T-4`) |

## 4. Files Changed Summary

(From `execution.md`.)

**17 consumer template files** (one-line or two-line edits, per `design.md` §6.2 Task groups A/B/C) across `admin-section`, `ipsr`, `outcome-indicator`, `result-framework-reporting`, `results`, `shared/components`, `shared/sections-components` — full per-file list in `execution.md`. No `.ts` logic changes anywhere; no consumer `.spec.ts` changes required (none asserted a hardcoded default `rows` value, confirmed by design-time citation sweep).

## 5. Test Evidence Summary

No standalone `test-report.md` was produced — **absence accepted**, equivalent rigor captured inline per task:

- `PTR-T-1`: `npx jest ... → 25 suites / 702 tests` green, `ng lint` clean. Reviewer independently re-ran the Falsifier as a repo-wide grep (not just the 12 named files) to additionally confirm no out-of-scope file was touched.
- `PTR-T-2`: `npx jest ... → 6 suites / 161 tests` green, `ng lint` clean, `diff` between the 2 `mapped-results-modal` copies confirmed byte-identical pre- and post-change.
- `PTR-T-3`: `npx jest ... → 1 suite / 5 tests` green, `ng lint` clean. `Review: full` — Reviewer independently read the entire 145-line `wp-home.component.html` file (not only the diff) to confirm the grouping/expansion markup was untouched.
- `PTR-T-4`: manual browser check by the user, TEST environment, authenticated session — all 3 flagged tables (`results-list`, `programme-results`, `wp-home`) confirmed showing 100 rows with no layout break, `wp-home`'s group expand/collapse still functioning.

## 6. Validation Summary

No standalone `validation-report.md` was produced — **absence accepted**. Equivalent evidence: 3 independent Reviewer `PASS` verdicts (one `full`, two `checklist`) plus `PTR-T-4`'s recorded manual verification, which directly substitutes for the one defect class (`render/performance regression`) this repo has no automated gate for — exactly as `requirements.md` §8 planned.

## 7. Accepted Warnings Or Follow-Ups

None raised by any Reviewer — all 3 code-task diffs were small enough (`<50 LOC` each) that `ADVISORY` was deliberately suppressed per the reviewer's own scale rule, and the sweeps found nothing gate-worthy regardless.

**One real incident during verification, resolved, not a defect:** `PTR-T-4`'s first observation on `programme-results` showed the dropdown and row count still at "10" after the code was already correct on disk and committed. Investigated before being recorded as a FAIL (per `.agents/leader.md` → *Deferring a check* — probe the assumption first): confirmed via direct disk read that `[rows]="100"` was already present at the cited line, and the same symptom appearing identically across every table (per the user's own observation) pointed to a shared cause rather than 3 independent code defects. Root cause: a **stale `ng serve` bundle** — the running dev server was serving a pre-edit compiled build, the exact trap already documented in `onecgiar-pr-client/CLAUDE.md` §9 ("Never trust a dev server you did not start"). Resolved by the user restarting the dev server; no code change was needed. Recorded in the Kaizen entry's `## Noted, not a lesson` section — this is a known trap re-confirmed, not a new root cause.

**Known, pre-existing tech debt (not this spec's job, explicitly out of scope):**

- `aow-hlo-table` and `reporting-aow-table` already render fully unpaginated, uncapped lists today — unrelated to this spec, flagged for a possible future look (`design.md` §13).
- The paginator remains a bare native `<select>` (see the prerequisite bugfix's own archive summary) — tracked separately.

## 8. Historical Notes

- This spec is the direct follow-on to `bugfix/pr-table-paginator-dropdown-select` (archived in the same pass): that fix made the dropdown correctly *display* whatever default a table has; this spec is what actually *changed* 17 tables' defaults to 100, relying on the prerequisite fix to guarantee the dropdown shows it correctly everywhere.
- Scope was arrived at through a full-repo audit (25 real consumers of the shared `pr-table`/`pr-group-table` components found, 1 already matching, 18 in scope, 6 explicitly excluded for having no pagination UI at all) — not guessed, and all scope boundary decisions (include the 2 small `mapped-results-modal` picker modals; proceed on the 3 performance-flagged tables with a manual check rather than excluding them) were confirmed with the user during `/akili-propose`.
- Branch state at archive time (`qa-development-2026-mc`, a spec branch) is not this project's designated apply-capable branch (`staging`). The user explicitly directed a direct-merge integration path instead of a PR: `qa-development-2026-mc` was merged forward into `performance-refactor` and pushed (commit `92faed3c0`), after re-validating `ng lint` + the full touched-suite Jest run on both branches — `performance-refactor`, not `staging`, continues to be the actual integration branch for this redesign line of work (same factual note as the prerequisite bugfix's archive summary and the `changes--topbar-release-notes-bell-position` precedent). Recorded here for the constitution factual-claims sweep, not acted on from this branch.

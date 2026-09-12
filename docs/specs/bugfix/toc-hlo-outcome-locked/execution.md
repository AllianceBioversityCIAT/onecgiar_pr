# Execution Log — ToC HLO/Outcome selector must stay editable (Bug, Lite)

## 1. Document Control

- Spec path: `docs/specs/bugfix/toc-hlo-outcome-locked/`
- Approval mode: not specified in `design.md`/`tasks.md` (treat as `gated` — pause at each Step 5 gate)
- Branch: `qa-development-2026-ss`
- Leader model: T1 (session model at time of run)
- Started: 2026-09-11

## 2. Task Execution History

### `BUG-T-1` — Remove `tocAlignmentReadOnly()` lock, add regression test

**Attempt 1 — FAIL**

Files changed:
- `onecgiar-pr-client/.../multiple-wps-content/multiple-wps-content.component.html`
- `onecgiar-pr-client/.../multiple-wps-content/multiple-wps-content.component.ts`
- `onecgiar-pr-client/.../multiple-wps-content/cpmultiple-wps-content.component.spec.ts`

Implementer verification: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="multiple-wps-content"` → 3 suites / 85 tests passed; broader `--testPathPattern="multiple-wps"` → 10 suites / 168 tests passed; `npx ng lint --quiet` → clean. TDD red→green confirmed (BUG-TEST-1 failed pre-fix with `disabled`/`readOnly` both `true`, passed post-fix).

Reviewer verdict: **FAIL**

- **Discovered Issue:** `rd-contributors-and-partners/CLAUDE.md` (folder-doc for the touched tree) was not updated/re-stamped in the same change.
- **Violated Rule:** `tasks.md` § "Required cross-references" (P2-3235 history must be updated in the same commit); `onecgiar-pr-client/CLAUDE.md` §10 "Folder docs" row; `onecgiar-pr-client/src/CLAUDE.md` §22 anti-pattern. Not blocked by root `CLAUDE.md`'s shared-file write discipline — `tasks.md` names this file as the spec's own deliverable, so it's exempt from that restriction.
- **Remediation Suggestion:** prepend a new `**Verified:**` chain entry in `rd-contributors-and-partners/CLAUDE.md` recording the P2-3235 lock removal, the new gating (`editable` + role read-only only), and the accepted risk from `design.md` §5. Respect the 120-line cap (`docs/COMPONENT-DOCS.md`) — chain onto one line like the existing entries.

ADVISORY (non-gating):
- RELIABILITY: BUG-TEST-1 renders/asserts only the Level select, not the 3 node selects (tasks.md wording says "Level and node"); acceptable since the compiler enforces the absence of the removed computed and all 4 bindings are now static/identical.
- READABILITY: `[readOnly]="false"` is a static no-op binding kept to match `design.md` §3.1's literal target shape; a comment or later cleanup could clarify why it's kept rather than omitted.

Requirements covered: `BUG-R-1`, `BUG-R-2` (code correct, but doc cross-reference gate not satisfied).
Next: attempt 2, effort bumped medium → high, feedback passed verbatim to Implementer, adding the `CLAUDE.md` folder-doc update to scope.

**Attempt 2 — PASS**

Files changed (this attempt only; attempt 1's 3 code/test files carried forward unchanged):
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md`

Change: prepended a new `**Verified:**` chain entry (`2026-09-11 · branch qa-development-2026-ss · bugfix/toc-hlo-outcome-locked BUG-T-1`) recording the P2-3235 lock removal as an explicit PO override (not a defect fix), the new gating (`editable` + role read-only inside `app-pr-select`), and the accepted, unmitigated `design.md` §5 risk (Section 2 / Results Framework double-writer). Chained via `; prior:` onto the existing history, nothing else in the file touched.

Implementer verification: `git diff --stat` confirmed only this one file/hunk changed; code files unmodified from attempt 1 (already green).

Reviewer verdict: **PASS**
- Confirmed attempt 1's substance intact (bindings, computed/helper deletion, both behavioral regression tests still present and correct).
- Confirmed the folder-doc gap closed: dated, spec-referenced, correctly chained `Verified:` entry; content below it unchanged.
- The file's pre-existing 120-line-cap overflow (620 lines, 614 before this task) was judged correctly out of scope — accumulated from unrelated prior specs, not something BUG-T-1 is obligated to fix; flagged as advisory only.

ADVISORY (non-gating, carried from both attempts):
- RELIABILITY: BUG-TEST-1 renders/asserts only the Level select, not the 3 node selects individually (tasks.md wording says "Level and node") — acceptable since the compiler enforces absence of the deleted computed and all 4 bindings are now identical/static.
- READABILITY: `[readOnly]="false"` kept as a static no-op binding to match `design.md` §3.1's literal target shape.
- RISK (folder-doc cap): `rd-contributors-and-partners/CLAUDE.md` is now 620 lines against a documented 120-line cap — pre-existing, recommend a future dedicated cleanup spec to collapse superseded history.

Requirements covered: `BUG-R-1`, `BUG-R-2`, `BUG-AC-1`, `BUG-AC-2`.
Decisions made: effort bumped medium → high for the rework attempt per the Leader's Effort dial rule (bump one level on every rework retry).
Issues encountered: attempt 1 omitted the required same-commit folder-doc update; closed in attempt 2 with no code changes needed.
Final verification result: Jest 85/85 (component) / 168/168 (broader `multiple-wps` folder) green, `ng lint` clean (attempt 1, unchanged); folder-doc gap closed and re-confirmed (attempt 2). Task **PASS** — ready to mark `[x]`.

## 3. Summary

All tasks in this spec (`BUG-T-1`, the only task) are complete. `tocAlignmentReadOnly()` and its 4 template gates were removed from `multiple-wps-content.component.{html,ts}` per the PO's explicit reversal of P2-3235; the Level/HLO/Outcome/Output selects are once again gated only by `editable` (and the role-based read-only handling already inside `app-pr-select`). Two behavioral regression tests (`BUG-TEST-1`/`BUG-TEST-2`) render the real template and assert the bound `disabled`/`readOnly` DOM state, closing the tasks.md No-pass clause. The folder-doc convention was satisfied in a rework round. No server/API/data-model change; no commit made (per user's standing "no auto-commit" preference — hand off to the user for commit/PR).


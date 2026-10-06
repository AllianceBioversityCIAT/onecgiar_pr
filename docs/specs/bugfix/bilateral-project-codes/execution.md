# Execution — Bilateral project codes (`bugfix/bilateral-project-codes`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/bugfix/bilateral-project-codes/` (Lite · Bug Mode) |
| Approval Mode | `gated` |
| Leader | main session (onecgiar-pr-eb) |
| Implementer / Reviewer | `akili-implementer` / `akili-reviewer` wrappers (author ≠ auditor) |
| Scope of this run | **BPC-T-1 only.** BPC-T-2 is a manual data task executed by Santiago outside `/akili-execute` |
| Budget (design §11) | 1 code task · ~45 LOC · 1 review round |

## 2. Task Execution History

### BPC-T-1 — Emit `external_code` on `bilateral_projects[]` items — **PASS** (2026-10-06)

| Field | Value |
|---|---|
| Attempts | 1 |
| Requirements covered | BPC-R-1 (S-1.1, S-1.2, S-1.3), BPC-R-2 (S-2.1), BPC-NFR-1, BPC-NFR-2 |
| Skills / effort | `tdd`, `nestjs-expert` (as listed) · effort `medium` |
| Files changed | `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts` (+10/−6) · `onecgiar-pr-server/src/api/bilateral/bilateral.service.spec.ts` (+74) · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (+2/−1) |
| Budget actuals | 1 task · ~86 inserted lines (74 of them tests; service +5 net) · 1 review round. **Within the tripwire** (<~100 LOC, ≤2 rounds) |

**Attempt 1**

- **Implementer:** it added `external_code: p.externalCode ?? null` to the single builder and widened the return type and JSDoc. It added a new `describe('buildBilateralProjectsSummary — external_code (BPC-T-1)')` with 3 cases, and updated the contract row (L119) plus a change-log row dated 2026-10-06. It did not run Jest, per the brief: the machine allows one test run at a time, and the slot was coordinated with sessions onecgiar-pr-31 and onecgiar-pr-52. Lint on both `.ts` files exited 0; `prettier --fix` reflowed only the method signature. Its `Not Done` field said only that Jest had not run, which the Leader ran next.
- **Leader verification** (after onecgiar-pr-31 released the Jest slot; free RAM 6.3 GB):
  - **RED.** The service change was stashed with `git stash push -- bilateral.service.ts` and then popped. `npx jest src/api/bilateral/bilateral.service.spec.ts -t "BPC-T-1" --maxWorkers=2` gave **3 failed** and 131 skipped:
    - S-1.1 failed on the missing `"external_code": "A1701"`.
    - S-1.2 failed with `Received array: ["short_name","organization_code"]`.
    - S-1.3 also failed, although tasks.md predicted it would pass. Its `toEqual` asserts all three keys, so this is a stronger red, not a defect.
    - The falsifier holds: case 1 failed before the fix.
  - **GREEN.** The whole spec file passed: **134/134**, 1 suite.
  - **Single builder.** `organization_code: org` appears only at `bilateral.service.ts:2151` outside specs. It is reached through `enrichBilateralResultResponse` from L619, 831, 857, 1043 and 1139.
- **Reviewer:** `STATUS: PASS`. Every clause owned by T-1 is met: one builder (grep found no other), `null` is never omitted, the query and relations are unchanged (NFR-1), the doc row and change-log row are complete (R-2), the change is additive (AC-4), there are no secrets (NFR-2), and only the 3 expected files were touched.
  - **ADVISORY, RISK lens (recorded only; not a task):** `quality-assessment/mappers/contributors-and-partners.mapper.ts:95-98` reads `detail.bilateral_projects` and will now also receive `external_code`. It is read-only and additive, so this is likely harmless, but nobody has run that mapper's specs against the new shape. One optional scoped Jest run would confirm it.

**Decisions:** the tasks.md prediction that case 3 is green before the fix was wrong; the red is stronger than planned, which is accepted. No deviation from the skills listed in the task.
**Issues:** none blocking. Test runs were serialized with peer sessions.
**Final verification:** green, 134/134. Lint is clean.
**Commit:** pending the user's explicit go-ahead. Planned subject: `🔧 fix(bilateral.service) INC-164536: expose external_code in bilateral_projects`, with the `[SPEC:bugfix/bilateral-project-codes]` reference in the body.

### BPC-T-2 — Data runbook (manual, Santiago) — **in progress**

- 2026-10-06: the pre-check confirmed `source = 'API'` = 0 rows, and the CLARISA columns were confirmed.
- **Step 3 done in CLARISA:** 12 rows set from 1353 to 49, and `COUNT(*) WHERE organization_code = 1353` returns 0.
- **Step 4 done in CLARISA (2026-10-06 09:33):**
  - 4a pre-check: 31 rows, all `organization_code = 49`, `phase = 2025`, `external_code` NULL.
  - 4b: 31 guarded UPDATEs, **31 rows updated**.
  - 4c: 31 rows with a non-empty `external_code`.
  - Project 233 is not in the mapping file and stays NULL.
- **Pending:**
  - Sync to PRMS: a manual `GET /api/clarisa/execute-task` or the 8-hourly cron.
  - Step 5 checks after two syncs.
  - Step 4, waiting for the Alliance mapping file.
  - Reply to the reporter.

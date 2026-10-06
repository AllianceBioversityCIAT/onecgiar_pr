# Tasks — Bilateral project codes (`bugfix/bilateral-project-codes`)

## 1. Scope

| Field | Value |
|---|---|
| Depth / mode | Lite · Bug Mode |
| Requirements | [`requirements.md`](./requirements.md) · Design: [`design.md`](./design.md) |
| Code tasks for `/akili-execute` | **BPC-T-1** only |
| Manual task (Santiago, outside execute) | **BPC-T-2** data runbook |
| Approval Mode | `gated` |

## 2. Pre-flight

- [ ] Branch is not `master`. Work on the current integration line per root `CLAUDE.md`.
- [ ] **Test coordination:** before running Jest, check with sibling sessions (onecgiar-pr-52 had Cypress CT running; onecgiar-pr-31 had Jest queued). Only one test run on the machine at a time, always `--maxWorkers=2`.
- [ ] No secrets: the ticket screenshot's `x-api-key` is never copied anywhere (BPC-NFR-2).

## 3. Task list

### `BPC-T-1` — Emit `external_code` on `bilateral_projects[]` items (regression test first)

- **Status:** `[x]` (2026-10-06 — Reviewer PASS, attempt 1; evidence in `execution.md`. Commit pending the user's go-ahead.)

- **Type:** server + tests + docs
- **Description:** Add a red regression test for the builder, then add `external_code` to each item of `buildBilateralProjectsSummary` and widen its return type. Finally, document the field and add a change-log row in the payload contract.
- **Implements:** BPC-R-1 (S-1.1, S-1.2, S-1.3), BPC-R-2 (S-2.1), BPC-NFR-1, BPC-NFR-2
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts` (~L2119-2151) · `onecgiar-pr-server/src/api/bilateral/bilateral.service.spec.ts` · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`
- **Design refs:** design §6, §7, BPC-DD-1, DD-2, DD-4
- **Depends on:** — · **Blocks:** —
- **Estimate:** S · **Review:** `full` (payload contract change)
- **Skills:** `tdd`, `nestjs-expert`
- **Test cases (in a new `describe('buildBilateralProjectsSummary — external_code (BPC-T-1)')`, using `makeService` with a `_resultsByProjectsRepository.find` mock):**
  1. **S-1.1:** a row with `obj_clarisa_project = { shortName: 'CSICAP', externalCode: 'A1701', obj_organization: { acronym: 'Bioversity (Alliance)' } }` → `toEqual([{ short_name: 'CSICAP', organization_code: 'Bioversity (Alliance)', external_code: 'A1701' }])`.
  2. **S-1.2:** `externalCode: null` → item has `external_code: null`. Also assert `Object.keys(item)` contains `'external_code'`, so an omitted key fails.
  3. **S-1.3:** a row without `obj_organization` → `organization_code: null` and `short_name` unchanged. A row with `obj_clarisa_project` null stays filtered out. The `find` call keeps the active-link and active-relation `where`, and adds no new relation (BPC-NFR-1).
- **Verification:**
  - **Red run:** `cd onecgiar-pr-server && npx jest src/api/bilateral/bilateral.service.spec.ts -t "BPC-T-1" --maxWorkers=2 --silent --reporters=summary --forceExit`. Cases 1 and 2 **fail on current code** (`external_code` missing); case 3 passes. All pass after the fix.
  - **Falsifier:** an item missing `external_code`, carrying `undefined`, or with a changed `short_name`/`organization_code` makes the `toEqual` fail. If case 1 passes *before* the fix, the test is not reaching the builder: the evidence is void, so fix the test first.
  - **Disqualifier:** if implementing needs a new relation, query, migration or a change outside the builder, stop and re-specify (budget tripwire: >~100 LOC or >2 review rounds).
  - **Consumers:** `enrichBilateralResultResponse` (the only caller; reached from 5 read paths: lines 619, 831, 857, 1043, 1139). The Reviewer greps for any other place that builds `organization_code` items for bilateral output (none known: the `quality-assessment` fixtures are separate inputs).
  - **Lint:** `npx eslint src/api/bilateral/bilateral.service.ts src/api/bilateral/bilateral.service.spec.ts --quiet`.
- **Definition of done:**
  - [ ] Red, then green, as described; the rest of `bilateral.service.spec.ts` stays green in the same scoped run.
  - [ ] Payload doc: the `bilateral_projects[]` row lists the three keys, with `organization_code` = acronym. A change-log row dated 2026-10-06 says: additive, `null` when unknown, all phases, ticket `#INC-164536`. *(No automated gate; Reviewer checks.)*
  - [ ] Lint clean; no secret in code, doc, or commit.
  - [ ] Commit only on the user's go-ahead: `🔧 fix(bilateral.service) INC-164536: expose external_code in bilateral_projects` (no apostrophes, per Jenkins).

### `BPC-T-2` — Data runbook: owner 1353 → 49 and Alliance external codes (manual, Santiago)

- **Mapping file received 2026-10-06** (`clarisa_projects_202610051600.xlsx`): 31 rows, no duplicate ids or codes. It covers the 20 projects already on institution 49 plus 11 of the 12 moved from 1353. **Project 233 is not mapped**, so it stays NULL until Alliance confirms its code. The guarded UPDATEs were handed over in chat.
- **Step 4 done in CLARISA 2026-10-06** (31 of 31 updated and verified).
- **Status:** `[~]` (steps 3 and 4 done in CLARISA 2026-10-06. Still pending: the sync, step 5, step 4, and **step 5b, the OpenSearch re-index**. Owner and mechanism are unknown; Santiago is confirming with Juan David. See design §9)

- **Type:** rollout / data (executed by Santiago; not run by agents)
- **Implements:** BPC-R-3 (S-3.1), BPC-R-4 (S-4.1), BPC-NFR-2
- **Design refs:** design §9, BPC-DD-3
- **Depends on:** — (independent of T-1; the field shows the codes once both are live) · **Blocked partially by:** the Alliance mapping file (steps 4–5 only)
- **Steps:** the step-by-step guide is in design §9. The concrete SQL is handed over in chat, not stored as files (team rule).
- **Verification:**
  - **Falsifier:** after **sync 2**, `COUNT(*) FROM clarisa_projects WHERE organization_code = 1353` > 0, or any of the 12 ids ≠ 49, or any mapped id's `external_code` ≠ the file value. A green after sync 1 only is not evidence: the overwrite risk is per sync.
  - **Disqualifier:** if a PRMS sync reverts a CLARISA-side change, stop. That means CLARISA serves the value from somewhere else (for example, a registry re-derivation). Re-open the proposal instead of patching PRMS.
  - **Consumers:** CENTER-02 picker (phase 2025), owner-centre derivation (only `source = 'API'` results, on save), tagging notifications (on new tag), QA mapper, AoW repo. See proposal §12.
- **Definition of done:**
  - [x] Pre-check `source = 'API'` run; result recorded (2026-10-06: 0 rows, all `source = 'Result'`; see proposal §12).
  - [x] CLARISA columns confirmed: `clarisadb8.project.organization_code` / `.external_code`.
  - [ ] 12 rows corrected in CLARISA, previous values snapshotted.
  - [ ] Codes loaded for mapped ids only.
  - [ ] Post-checks green after two syncs.
  - [ ] Reporter reply sent: field live, `"ABC"` → `"Bioversity (Alliance)"`, rotate the exposed key.

## 4. Dependency graph

`BPC-T-1` and `BPC-T-2` are independent and can run in parallel. No cycles.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| BPC-TEST-1 | unit (server), regression | S-1.1, S-1.2, S-1.3, NFR-1 | `onecgiar-pr-server/src/api/bilateral/bilateral.service.spec.ts` |
| BPC-CHECK-1 | manual SQL after 2 syncs | S-3.1, S-4.1 | runbook (design §9) |
| BPC-CHECK-2 | Reviewer checklist | S-2.1 | payload doc |

## 6. Coverage closure (scenario / clause → owner)

| Clause | Owner |
|---|---|
| S-1.1 exact item · "AND IT MUST … one builder" | T-1 case 1 · consumers check |
| S-1.2 `null` · "BUT must NOT omit / undefined" | T-1 case 2 |
| S-1.3 unchanged fields · "BUT must NOT rename/remove" · "AND inactive excluded" | T-1 case 3 |
| S-2.1 change-log row | T-1 DoD (Reviewer) |
| S-3.1 49 after sync · "AND IT MUST second sync" · "BUT must NOT PRMS-only UPDATE" | T-2 steps 2 and 5 · falsifier · disqualifier |
| S-4.1 file values · "BUT must NOT other institutions" · "AND IT MUST blocked if unmapped" | T-2 step 4 |
| NFR-1 no extra query | T-1 case 3 |
| NFR-2 no secrets | T-1 DoD, T-2, pre-flight |

## 7. Rollout & roll-back

- **T-1:** normal deploy (no migration). Roll back by reverting the commit; the field disappears, which is additive in reverse and low risk.
- **T-2:** roll back by restoring the CLARISA snapshot; the next sync carries it into PRMS.

# Validation Report — Evidence privacy tag (bilateral)

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/bilateral/evidence-privacy-tag` (P2-4110) |
| Date | 2026-11-20 |
| Branch / HEAD | `qa-development-2026-ss` @ `da09e8fdf` (also on `performance-refactor` @ `68ceefccb`; Fetcher `dev-fetcher` @ `3882e8d`) |
| Auditor | T3. Requirement coverage was audited by an independent `akili-reviewer` (read-only). The Leader ran build integrity. |
| test-report.md | Absent: `/akili-test` was not run. Coverage evidence comes from `execution.md` and direct reading. |

## 2. Summary

> **Update 2026-11-20, after remediation (user chose "fix all", "amend R-12" and "withhold in AI context").**
>
> - **Resolved:** F-1, F-2, F-3, W-1, W-2 and W-3. See §13.
> - **Still open:** B-1…B-5 (DB / CI / browser / PO), W-5 (the Fetcher `dev-fetcher` → `dev` merge after the PRMS deploy) and W-6 (D9 decides drawer pixel identity).
> - **Verdict: still NOT archive-ready.** No FAIL remains; the archive waits on the BLOCKED human, CI and DB gates.

**Original verdict: NOT archive-ready.** The code conforms: all 14 requirements have an owning task and code, and no requirement clause fails because of the code. What blocked the archive at first run:

| # | Level | Finding |
|---|---|---|
| F-1 | **FAIL** | Three committed files fail Prettier. The `staging` CI backend lint step (`eslint "{src,apps,libs,test}/**/*.ts"`) will go red. |
| F-2 | **FAIL (spec)** | EVP-R-12 says "no change in any pool response other than the new column appearing as null". `GET /v2/api/results/ai/context` now returns `is_public: true/false` for pool file items (EVP-DD-8). The requirement was never amended. |
| F-3 | **WARN (PO)** | NFR Security says a private link "MUST NOT be added to any … AI payload". `getAIContext` now carries private storage links, which did not exist before this change (EVP-DD-8 explicitly does not withhold). This needs a PO ruling. |
| B-1…B-5 | **BLOCKED** | DB migration, P-17 row count, T-6 real-DB row check, D9 visual check and contrast, P-16 Results Dashboard. Each needs a DB, a browser or the PO. |
| W-1…W-6 | WARN | Documentation drift: Swagger text, proposal S9, stale DoD boxes, the AI mapper's SharePoint-row choice, the Fetcher check is record-only, and the drawer markup changed for every row. |

## 3. Task Completion

| Task | Status | Evidence | Result |
|---|---|---|---|
| T-1 Migration and column | `[x]` (DB items OPEN GAP) | execution T-1, attempt 3 | WARN (B-1) |
| T-2 Resolver | `[x]`, but the DoD boxes are unticked | execution T-2: 11 tests, mutations red | WARN (W-3: stale boxes) |
| T-3 Shared endpoint | `[x]`, "type-check" box unticked | execution T-3: tsc exit 0 | WARN (W-3) |
| T-4 API input | `[x]` | 30-case DTO spec, B-1 13/13 unedited | PASS |
| T-5 Bilateral reads and AI context | `[x]` | five-row fixture, 2 mutations red | PASS (F-2/F-3 are spec-level) |
| T-6 Review detail | `[x]` | `MIN` fail-closed, attempt 2 | WARN (B-3) |
| T-7 AI quality payload | `[x]` | builder spec EVP-R-10 | PASS |
| T-8 Centre form | `[x]` | 74 tests; pool set 15 suites / 404 tests | PASS |
| T-9 Review drawer | `[x]` | 240 tests; presence only | WARN (B-4) |
| T-10 Contract doc | `[x]` | claim-to-test map | PASS |
| T-11 Fetcher | `[x]` | `npm test` 91/91 (record) | WARN (W-5) |

## 4. File Existence

Every file in `tasks.md` "Files (expected)" exists and was changed. The commits also touched files the spec did not list; each was recorded and approved in `execution.md`:
- `evidences.repository.ts` `createQueries` (T-1, phase copy);
- the `findAllV2` normalisation (T-3);
- `exposedEvidenceIsPublic` (T-5);
- `result-review-drawer.interfaces.ts` (T-9).

The old `IsNotCloudStorageLink` decorator now has no consumers. It is kept on purpose (design §5). **PASS.**

## 5. Build Integrity

| Check | Command | Result |
|---|---|---|
| Server type-check | `npx tsc --noEmit -p tsconfig.json` | **PASS**, exit 0 |
| Server lint (changed files) | `npx eslint <changed> --quiet` | **FAIL (F-1).** On the committed (LF) content, `prettier --check` fails for `api/bilateral/dto/evidence-is-public.dto.spec.ts`, `api/bilateral/services/quality-assessment/bilateral-quality-payload.builder.spec.ts` and `api/results/evidences/utils/evidence-visibility.ts`. The other `␍` errors exist only in the local Windows working copy. |
| Client lint (changed folders) | `npx ng lint --lint-file-patterns <section-evidence, result-review-drawer *.ts/*.html>` | **PASS**, "All files pass linting." |
| Client build | `npx ng build --configuration development` | **PASS** (after the merge, 71.8 s) |
| Server unit (full) | `npx jest` | 7,235 passed. The 23 failed suites are environmental: 22 come from `@nestjs/jwt` on Node v26, and 1 is the qa-catalog snapshot, which differs only in line endings (same `content_hash`). |
| Client unit (full) | `npx jest` | 15,282 passed. The 5 suites that failed were pre-existing (identical at base `cfc18d03e`). They are now fixed by `da09e8fdf`, and 164/164 pass with the CI environment file. |
| Migrations | `npm run migration:check:ci` | **BLOCKED** (B-1): no local DB |

## 6. Requirement Coverage

Coverage was checked at scenario and clause granularity by the independent auditor. Paths are shortened: `svr` = `onecgiar-pr-server/src`, `cli` = `onecgiar-pr-client/src/app/pages`.

| ID | Clause | Owner | Code | Test | Result |
|---|---|---|---|---|---|
| R-1 | Mixed visibilities, "must NOT change any other item" | T-2, T-5 | `evidence-visibility.ts:47-60` | resolver spec (11); `bilateral.service.spec.ts:591` | PASS |
| R-1 | Legacy item "MUST render exactly as today" | T-2, T-7, T-9 | resolver link/NULL → public | builder spec; drawer spec :2883 | WARN (W-6): the drawer row is now a flex column, and pixel identity is left to D9 |
| R-2 | No answer → disabled; answer → enabled | T-8 (i) | `section-evidence.component.ts:337-347` | spec :883 | PASS |
| R-2 | Source switch "must NOT carry a file-only answer" | T-8 (iii) | `:351-357` | spec :906, :915 | PASS |
| R-2 | Legacy untagged link on edit "MUST require one" | T-8 | `fromWire` :181-184 | spec :883, :967 | PASS |
| R-3 | Round trip, lock, untagged shows no lock | T-3, T-8 | svc :159-163, repo :445, html :41-49 | evp spec; section spec :955/:967/:973 | PASS (unit; no real-stack reload) |
| R-4 | API: private storage link accepted; untagged refused before the first write | T-4 | validator :46-86, dto :955 | DTO spec (6 hosts × 4 states) | PASS |
| R-4 | Form: "No MUST clear and enable" | T-8 (ii) | :322-328; html :169-177 | spec :892, :926 (refusal text verbatim) | PASS |
| R-5 | Untagged accepted unchanged; a wrong type gives 400 | T-4 | `bilateral.service.ts:6288`; dto :974-976 | `bilateral.service.spec.ts:5713`; DTO spec :50 | PASS |
| R-6 | Returned per item, untagged distinguishable, additive | T-5 | :2148-2157 | key-superset assertion :591 | PASS |
| R-7 | Private tag beside URL; must NOT hide, disable or rewrite the link | T-9 | drawer html :603-623 | drawer spec :2883, :2901 | PASS (presence) / **BLOCKED (B-4)** |
| R-7 | Private file item | T-6, T-9 | `result.repository.ts:3933-3956` (`MIN`, LEFT JOIN, GROUP BY) | `result.spec.ts:2109`; repo spec :965/:988 | PASS / **BLOCKED (B-3)** |
| R-8 | Description shown, no empty line | T-6, T-9 | html :625-629 | drawer spec | PASS |
| R-9 | Tooltip and accessible text | T-9 | ts :227-229 | drawer spec :2892 | PASS |
| R-10 | Private link withheld, description still sent | T-7 | `evidence.mapper.ts:62-77` | builder spec EVP-R-10 (4) | PASS |
| R-11 | Rewrite untagged and documented; all copy paths keep the tag | T-1, T-4, T-8, T-10 | `:6288`; `evidences.repository.ts:67/99/131`; `toWire` | spec :5713; G1 parity guard; drawer save probe | PASS |
| R-12 | Pool save untagged; pool UI unchanged | T-3, T-8 | guard `evidences.service.ts:159` | evp spec (b); pool regression 15 suites / 404 tests | PASS |
| R-12 | "no change in any pool response other than … null" | T-5 | `results.service.ts:3714` | `results.service.spec.ts:1045` | **FAIL (F-2)** |
| R-13 | Contract doc and dated change-log entry | T-10 | doc :109-138, :685, :767 | claim-to-test map | PASS (Swagger drift W-1) |
| R-14 | The Fetcher must NOT strip the tag; output carries it | T-11 | On `dev-fetcher`, not on the local `main` | record: 91/91, red run, mutation | WARN (W-5) |
| NFR Data | Reversible migration, `migration:check:ci` | T-1 | migration :26-38 | — | **BLOCKED (B-1, B-2)** |
| NFR A11y | Text plus AA contrast | T-9 | "Private" text and aria-label | contrast not measured | **BLOCKED (B-4)** |
| NFR Security | A private link "MUST NOT be added to any … AI payload" | T-7, T-5 | `getAIContext` carries private links | — | **WARN (F-3)** |
| P-16 | Results Dashboard | HITL | — | — | **BLOCKED (B-5)** |

## 7. Linting & Code Quality

- **F-1** is the only lint finding (see §5).
- **Security:** the bilateral-only write guard is sound. `is_public` is written only when `result.source === 'API'`. The IPSR and supplementary paths pass no result, so a pool result can never be tagged through the shared endpoint.

**4R advisories (advisory only; they do not drive the verdict):**

| Lens | Advisory |
|---|---|
| Risk | Pre-existing: `POST evidences/create/:resultId` checks the JWT only. Any authenticated user can rewrite the evidence of a bilateral result, including flipping private to public. |
| Reliability | The AI mapper reads `evidenceSharepointArray[0]` without filtering for active rows. The other readers use active rows and fail closed. Reuse `exposedEvidenceIsPublic`'s selection. |
| Reliability | `is_public` has no runtime boolean check on the shared endpoint. A truthy non-boolean is stored as 0, which fails closed but is surprising. Use `typeof v === 'boolean' ? v : null`. |
| Resilience | The drawer save is safe only while `updateEvidencesPartial` never updates rows by id. |
| Readability | Stale comment `cloud-storage-link.constant.ts:14-16`; duplicate import `results.service.ts:162/166`; the `findAll`/`findAllV2` normalisation is duplicated; the two validator constraints repeat each other. |

**Carried from `execution.md`:**
- T-2: pin `is_sharepoint: null` as a link.
- T-6: add public file and link rows and a multi-SP `[1,0]` test.
- T-8: the lock needs `role="img"` and an aria-label; the `@if` is duplicated at html :169/176; there is no DOM test of the radio.
- T-9: the pill uses hard-coded English and `material-icons-round` (client rules 21 and i18n; this follows the existing row pattern).
- T-11: tighten the instancePath assertion and the guide's "Publicly accessible link" wording.
- T-1: `down` drops every tag.

## 8. Design Conformance

| # | Drift | Result |
|---|---|---|
| D-1 | EVP-DD-8 narrows EVP-R-12 without a requirements edit. The execute-time clarification is only in the T-5 log, not in the Execute-time spec edits table. | FAIL (F-2) |
| D-2 | DD-2 "one rule, every reader" holds for the resolver, but the SharePoint-row selection differs by reader: helper (any active 0), SQL `MIN`, AI mapper `[0]`. | WARN |
| D-3 | Changes recorded and approved during execution: the optional entity property, the `createQueries` phase copy, the `findAllV2` normalisation, `MIN`, the new helper, and T-4 reviewed by a single reviewer. | PASS |
| W-1 | `create-bilateral.dto.ts:946` Swagger text for `link` still says storage links "are not accepted". It contradicts EVP-R-4 and the contract doc. | WARN |

**Cross-document figure check:**

| Item | Result |
|---|---|
| `proposal.md` S9 calls the Fetcher "EVP-T-10"; `tasks.md` has the Fetcher as T-11 and T-10 as the contract doc | WARN (W-2) |
| Budget arithmetic (780 LOC, 15 rounds) is internally consistent; actuals of ~1,400 LOC were accepted by the user at the tripwire | PASS |
| Premises count "19 · 17 verified · 2 UNVERIFIED" is consistent | PASS |

## 9. Test Evidence Summary

| Kind | Evidence |
|---|---|
| Red runs and mutations | Quoted per task in `execution.md`, for every logic task (T-1…T-9, T-11) |
| Server, this spec's suites | evidences, bilateral, results, ipsr: 2,292 tests passed on `performance-refactor` |
| Client | section-evidence 74, drawer 240, pool regression 404 |
| Fetcher | 91/91 (record) |
| Not run | real-DB migration and queries; browser (D9); Results Dashboard. No `test-report.md`. |

## 10. Agent Guide / Constitution Impact

- No new module or boundary, so `## Constitution Impact` is not required.
- The touched folder guides were re-stamped in `da09e8fdf` (dashboard-lab, shell-topbar).
- Pending for `/akili-archive`:
  - `akili doctor --agents --fix` on `staging`;
  - the `cloud-storage-link.constant.ts` comment.

## 11. Remediation

| ID | Action | Owner | Effort |
|---|---|---|---|
| F-1 | `npx eslint --fix` on the 3 files; commit; push to both branches | agent | XS |
| F-2 | Choose one: (a) amend EVP-R-12 to exempt the additive `is_public` key on `ai/context` and log it in the Execute-time spec edits table; or (b) gate `results.service.ts:3714` on `result.source === 'API'` | user decides, then agent | XS |
| F-3 | PO ruling: may `getAIContext` carry private links? If not, withhold them there as T-7 does | PO, then agent | S |
| W-1 | Update the Swagger text at dto :946 | agent | XS |
| W-2 | `proposal.md` S9: change T-10 to T-11 | agent | XS |
| W-3 | Tick the T-2 and T-3 DoD boxes, citing their execution entries | agent | XS |
| B-1/B-2 | Run up/down/up and `migration:check:ci` in CI or on TEST; P-17 row count | user / CI | S |
| B-3 | Real-DB check: two SP rows give one row with `is_public_file = 0` | user | XS |
| B-4 | D9 visual check at desktop and ≤640px; measure the pill contrast | user | S |
| B-5 | P-16 Results Dashboard sign-off with the PO/BA | PO | S |
| W-5 | Merge Fetcher `dev-fetcher` → `dev` after PRMS is deployed | user | XS |

## 12. Archive Readiness Recommendation

**Not ready.** Close F-1, F-2 and W-1…W-3 first; these are agent work once F-2 is decided. Then close F-3 and B-1…B-5, which need the PO, CI, a DB or a browser. After that, re-run `/akili-validate bilateral/evidence-privacy-tag` and then `/akili-archive bilateral/evidence-privacy-tag`.

## 13. Remediation applied (2026-11-20)

| ID | What changed | Evidence | Result |
|---|---|---|---|
| F-1 | `eslint --fix`, formatting only, in `evidence-is-public.dto.spec.ts`, `bilateral-quality-payload.builder.spec.ts` and `evidence-visibility.ts` | `prettier --check` on the LF-normalised content is clean on all 6 changed server files | RESOLVED |
| F-2 | EVP-R-12 amended: the additive `is_public` key on `ai/context` items is exempt for pool. Pool link items carry `null`; pool file items carry fail-closed `true`/`false`. Logged in the execution.md Execute-time spec edits table | `requirements.md:265` | RESOLVED |
| F-3 | `getAIContext`: on a **bilateral** result, a private item (link or file) is sent with `link: null`, keeping its description and flags. **Pool is unchanged.** The filter runs on the raw row, so a private item without a description is kept. Spec synced: design §4.5 and EVP-DD-8, tasks T-5 and §7, NFR Security, plus an execution.md edits row | Red before the fix: `Tests: 2 failed … 35 total`. Mutation "drop the source check" turned both pool tests red. Leader re-run: `Test Suites: 12 passed · Tests: 360 passed` | RESOLVED |
| W-1 | `create-bilateral.dto.ts:946`: the Swagger text for `link` now matches EVP-R-4 | Reviewer read | RESOLVED |
| W-2 | `proposal.md` S9: EVP-T-10 → EVP-T-11 | — | RESOLVED |
| W-3 | T-2, T-3 and §2 DoD boxes ticked, matching the recorded evidence | — | RESOLVED |

- **Correction closure:** I grepped the spec folder and the contract doc for "No link withholding", "not withholding" and "never withheld". Zero stale sites remain, and the contract doc does not describe `ai/context`.
- **Independent review:** the first round was FAIL: four spec sites still described the old DD-8, and the R-12 wording was imprecise. Both were fixed by the edits above.
- **Consumer check:** the client `ai-review.service.ts` forwards the context without reading `evidence[].link` (grep finds 0 reads), so `link: null` is safe. The bilateral AI quality payload already sends `null` for the same case (T-7).
- **Advisory still open:** the duplicate import at `results.service.ts:162/166`.

**Remaining before `/akili-archive`:**
- B-1/B-2: `migration:check:ci` and up/down/up in CI or on TEST, plus the P-17 row count.
- B-3: a real-DB check of one row per evidence.
- B-4: D9 visual check at desktop and ≤640px, with the pill contrast measured.
- B-5: P-16 Results Dashboard sign-off.
- W-5: merge the Fetcher `dev-fetcher` → `dev` after the PRMS deploy.

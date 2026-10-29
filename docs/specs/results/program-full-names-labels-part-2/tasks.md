# Module Spec — `tasks.md`

## 1. Scope

- **Module / feature:** `results` / `program-full-names-labels-part-2`
- **Linked spec:** `requirements.md` + `design.md` (same folder)
- **Depth:** Standard · **Status:** `approved` (2026-10-13) · **Approval Mode:** gated

## 2. Pre-flight

- [x] `requirements.md` approved (2026-10-13)
- [x] `design.md` approved (2026-10-13)

**Rules that apply to every task:**

- **Jest:** always `--maxWorkers=2` plus a scoped `--testPathPattern`; client runs also take `--no-coverage`, server runs `--forceExit`. Never the full suite. Only one test run on the machine at a time, so parallel tasks share the scratchpad `jest.lock`.
- **Lint, client:** `ESLINT_USE_FLAT_CONFIG=false npx eslint <touched files> --quiet` (`KZ-results--program-full-names-labels-1`).
- **Lint, server:** `npx eslint <touched files> --quiet`.
- **Folder `CLAUDE.md` files:** where a touched folder has one, update it and re-stamp `Verified:` (client CLAUDE.md §10).
- **Selection and filter tests** drive the real control, not a hand-set model (`KZ-results--program-full-names-labels-3`).

**Skills:**

- server tasks: `nestjs-expert`;
- client tasks: `angular-developer`;
- T-3 also loads `api-design-principles`.

## 3. Tasks

### [x] `PF2-T-1` — Server: IPSR queries return the P/A name (M1, S1)

- **Type:** `server` · **Estimate:** M · **Review:** `checklist`
- **Description:** In `S:ipsr/ipsr.repository.ts`, add the names listed in design §4/§6:
  - `getAllInnovationPackages`: add `submitter_name` and `submitter_short_name`.
  - `getResultsInnovation`: add `initiative_name`, chosen by the same `IF(role=2, …)` branch as the code.
  - `getResultInnovationById`, `getInnovationCoreStepOne` and `getStepTwoOne`: add `initiative_name`.
  - **Grouped queries:** if a query is grouped, follow design §7 (`ANY_VALUE()` if needed).
- **Implements:** PF2-R-1, both scenarios (additive; existing fields, rows and order unchanged; `null` and never `"null"`) for M1 and S1
- **Design refs:** §4, §6, §7, DD-1, DD-2
- **Files:** `ipsr.repository.ts`, plus its spec, or the spec of the service that calls each method
- **Depends on:** — · **Parallel-safe:** with T-2, T-3, T-6
- **Verification:**
  - **Falsifier:** each touched method's SQL, captured from the mocked `query()` call, must contain the name alias next to the code, and the mocked rows must surface `submitter_name` / `initiative_name`. Fails if any existing alias disappears from the captured SQL, or if the `getResultsInnovation` name comes from a different branch than the code.
  - **Run** (from `onecgiar-pr-server`): `npx jest --maxWorkers=2 --forceExit --testPathPattern="ipsr.repository|ipsr.service|innovation-pathway-step-one|ipsr_general_information.service"`
  - **Disqualifier:** an edited existing assertion on rows or fields means the change was not additive. Stop.
  - **Not provable in Jest:** whether the SQL executes against MySQL, since the mocks never run SQL. Covered by the HITL smoke test (§6).

### [x] `PF2-T-2` — Server: completeness, outcome-indicator, review history (M2, M3, M4)

- **Type:** `server` · **Estimate:** M · **Review:** `checklist`
- **Description:**
  - `admin-panel.repository.ts` `reportResultCompleteness`: add `initiative_name`. Add **no** new interpolated input.
  - `contribution-to-indicator-result.repository.ts` `getContributingResultsQuery`: add `result_submitter_name` in **both** UNION branches. `_flattenedResultsQuery` stays unchanged (DD-3).
  - `result-review-history.repository.ts` `getReviewHistoryByResultId`: add `initiative_name`.
- **Implements:**
  - PF2-R-1 additive scenario (M2, M3, M4);
  - PF2-R-1 shared-callers scenario: the export (`_flattenedResultsQuery`) and the webhook caller keep their output;
  - the BUT clause: the outcome-indicator export columns do not change.
- **Design refs:** §4, §6, §7, DD-3
- **Files:** the 3 repositories and their specs; `contribution-to-indicators.repository` spec (the export twin)
- **Depends on:** — · **Parallel-safe:** with T-1, T-3, T-6
- **Verification:**
  - **Falsifier:**
    - the captured UNION SQL must contain `result_submitter_name` **twice**, once per branch;
    - the `_flattenedResultsQuery` json_object must **not** contain it;
    - the completeness and review-history SQL must contain `initiative_name`;
    - the webhook-dispatch spec still passes unchanged.
  - **Run:** `npx jest --maxWorkers=2 --forceExit --testPathPattern="admin-panel|contribution-to-indicator|result-review-history|webhook-dispatch"`
  - **Disqualifier:** a change to an existing export, webhook or row assertion. Stop.

### [x] `PF2-T-3` — Server: IPSR notifications + AI jobs + bilateral contract (S2, S3)

- **Type:** `server` · **Estimate:** M · **Review:** `checklist`
- **Description:**
  - `share-result-request.repository.ts`: `getRequestByUser` and `getPendingByUser` add `requester_name` / `approving_name`.
  - `bilateral-ai.service.ts`: `listJobs` and the single-job projection add `program_name`. It comes from one batched `ClarisaInitiative` lookup over `In(codes)`, preferring the active initiative, with `null` on ambiguity or a miss (DD-4). It mirrors `projectNameById`.
  - Update `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`: add the field to the job list and a dated change-log row.
- **Implements:**
  - PF2-R-1 additive and shared-callers scenarios (the results notifications flow);
  - PF2-R-4, including its BUT clause (existing job fields unchanged);
  - NFR "no per-row query".
- **Design refs:** §4, §6, §7, DD-4
- **Files:** the repository, the service, their specs, the contract doc
- **Depends on:** — · **Parallel-safe:** with T-1, T-2, T-6
- **Verification:**
  - **Falsifier:**
    - jobs `[{program_code:'SP01'},{program_code:'SP01'},{program_code:'XX9'}]` must issue **one** lookup call and yield `program_name` `Breeding…`, `Breeding…`, `null`;
    - two initiatives sharing `SP01` with neither active must give `null`;
    - the existing job fixture fields must be deep-equal to before, plus `program_name` only;
    - the share-request SQL must contain both name aliases, and the existing notification specs stay green.
  - **Run:** `npx jest --maxWorkers=2 --forceExit --testPathPattern="share-result-request|bilateral-ai"`
  - **Disqualifier:** more than one lookup per response, a removed or retyped job field, or a contract doc with no change-log row. Stop.

### [x] `PF2-T-4` — Client: IPSR surfaces (M1, M5, M6, S1, S2)

- **Type:** `client` · **Estimate:** M · **Review:** `checklist`
- **Description:**
  - **M1:** the Innovation Package list Submitter column and the update-IPSR modal render the label, with ellipsis and `title`.
  - **M5:** the package detail header binds the label built from `initiative_official_code` + `initiative_name` (fixes the blank header).
  - **M6:** the step-2 `table-innovation` Lead column renders the label, and the searchable `full_name` includes the name.
  - **S1:** the creator picker Lead column, the selected-core chip, the step-1 core chip and the step-2 selected chips render the label.
  - **S2:** `notification-item-innovation` requester and approver mentions use the label.
  - Interfaces gain only optional fields.
- **Implements:**
  - PF2-R-2: table scenario (M1, M6, S1 picker), including one line + ellipsis + `title`, and the BUT that sort/filter are unchanged while search adds the name;
  - PF2-R-2: chip scenario (S1, S2), including the BUT that routing keys and ids are unchanged;
  - PF2-R-2: M5 "no longer blank" scenario;
  - PF2-R-3 fallback (the `INIT-0<id>` local rows show the code).
- **Design refs:** §4, §8, DD-7
- **Files:** the IPSR components listed in design §4 (M1, M5, M6, S1, S2) and their specs
- **Depends on:** T-1 (M1, S1), T-3 (S2)
- **Verification:**
  - **Falsifier:**
    - a package row `{official_code:'SP05', submitter_name:'Better Diets'}` must render `SP05 - Better Diets` with `title` equal to it;
    - the detail header with `{initiative_official_code:'SP05', initiative_name:'Better Diets'}` must render that label and **not** an empty string, which is the current behavior, so the test is red first;
    - a locally created row `{initiative_official_code:'INIT-012'}` must render `INIT-012`;
    - existing navigation and route assertions stay green.
  - **Run** (from `onecgiar-pr-client`): `npx jest --maxWorkers=2 --no-coverage --testPathPattern="innovation-package-custom-table|update-ipsr-result-modal|innovation-package-detail|table-innovation|complementary-innovation|results-innovation-output-list|innovation-package-creator|step-n1|selected-innovations|notification-item-innovation"`
  - **Disqualifier:** a changed id, route or selected-value assertion. Stop.
  - **Not provable in jsdom:** width, ellipsis and wrapping. Covered by HITL (§6).

### [x] `PF2-T-5` — Client: completeness, outcome-indicator, review history, AI jobs (M2, M3, M4, S3)

- **Type:** `client` · **Estimate:** M · **Review:** `checklist`
- **Description:**
  - **M2:** the `global-completeness-status` Submitter column renders the label. The search `full_name` (`results-api.service.ts:963`) includes the name, and the Excel builder stays on the code (DD-5).
  - **M3:** the `details-table` Submitter renders the label from `result_submitter` + `result_submitter_name`. Rows added from the results modal map `submitter_name` (and IPSR rows map `submitter_name` from T-1) into `result_submitter_name`.
  - **M4:** the review-history interface gains `initiative_name`; `bilateral-results-list` and `bilateral-rejection-notice` render the label.
  - **S3:** `bilateral-ai-job.model.ts` maps `program_name`; `ai-job-card` and `ai-processes-drawer` use the label.
- **Implements:**
  - PF2-R-2: table scenario (M2, M3);
  - PF2-R-2: chip and inline scenario (M4, S3);
  - PF2-R-1 BUT clause on the client side: exports unchanged;
  - PF2-R-3 fallback.
- **Design refs:** §4, §8, DD-3, DD-5
- **Files:** listed in design §4 for M2, M3, M4 and S3, plus their specs
- **Depends on:** T-2 (M2, M3, M4), T-3 (S3), T-1 (M3 IPSR rows)
- **Verification:**
  - **Falsifier:**
    - a completeness row `{official_code:'SP10', initiative_name:'Gender'}` must render `SP10 - Gender`, and the Excel row must still read `SP10`;
    - a details-table row with `result_submitter:'SP01', result_submitter_name:'Breeding'` must render `SP01 - Breeding`;
    - a row added from the modal with `submitter_name` must render the same;
    - a review-history entry with no name must render the code only;
    - an AI job `{programCode:'SP01', programName:null}` must render `SP01`.
  - **Run:** `npx jest --maxWorkers=2 --no-coverage --testPathPattern="global-completeness-status|details-table|indicator-results-modal|indicator-details.service|bilateral-results-list|bilateral-rejection-notice|bilateral-ai-job|ai-job-card|ai-processes-drawer"`
  - **Disqualifier:** a changed Excel column or value assertion. Stop.

### [x] `PF2-T-6` — Client-only leftovers (S4)

- **Type:** `client` · **Estimate:** M · **Review:** `checklist`
- **Description:**
  1. shell-topbar + header-panel role menu render the label from `myInitiativesList` (it already carries `initiative_name`).
  2. `rd-contributors-and-partners` SP chips (≈459, 501).
  3. `update-notification`: first confirm that `obj_initiative` carries `name` in the payload; if not, the fallback shows the code, and record it.
  4. `manage-user-modal` `display_label`: first grep its consumers; if any uses it as a value or key, leave it and record it (reversion challenge).
  5. `phase-detail` open/close toast.
  6. `section-zero-dashboard` + `section-contributors` banners: name resolved from the bilateral context SP list by code (DD-5), with the code on a miss.
  7. `ipsr-list-filter.service.ts`: `buildIpsrProgramOptions` `displayName` goes through the rule, and the stale header comment is fixed.
  8. `lab-report-form` ToC-branch select: `optionLabel="sp_label"`, plus an `sp_label` on the "Other(s)" sentinel.
- **Implements:**
  - PF2-R-2: dropdown scenario (items 4, 7, 8), including the BUT that the value is unchanged and search matches code or name;
  - PF2-R-2: chip and inline scenario (items 1, 2, 3, 5, 6);
  - PF2-R-3 (single rule; fallback).
- **Design refs:** §4, §8, DD-5, DD-6 and its reversion challenges
- **Files:** listed in design §4 for S4, plus their specs
- **Depends on:** — · **Parallel-safe:** with T-1, T-2, T-3
- **Verification:**
  - **Falsifier:**
    - IPSR filter options built from `[{id:1, official_code:'SP01', name:'Breeding'}]` must expose `SP01 - Breeding` with `id` untouched, and a selection made through the real control must keep sending `id`;
    - a banner for code `SP03` with the context SP list `[{code:'SP03', name:'Animal'}]` must read `SP03 - Animal`, and with an empty list it must read `SP03`;
    - the role-menu item for `{official_code:'SP12', initiative_name:'Digital'}` must render `SP12 - Digital`.
  - **Run:** `npx jest --maxWorkers=2 --no-coverage --testPathPattern="shell-topbar|header-panel.component|rd-contributors-and-partners|update-notification|manage-user-modal|phase-detail|section-zero-dashboard|section-contributors|ipsr-list-filter|lab-report-form"`
  - **Disqualifier:** a changed filter value, query param or `display_label` consumer. Stop.
  - **Notes:** `rd-contributors-and-partners` is excluded from coverage, but its spec still runs. Old-format string assertions may be updated (DD-6).

## 4. Dependency graph

```
PF2-T-1 ─┬────────────▶ PF2-T-4 ◀── PF2-T-3
         └──▶ PF2-T-5 ◀── PF2-T-2
                  ▲
PF2-T-3 ──────────┘
PF2-T-6 (independent)
```

**Execution waves (at most 2 in parallel, one test run at a time):**

1. {T-1, T-2}
2. {T-3, T-6}
3. {T-4, T-5}

## 5. Coverage closure

| Clause | Task |
|---|---|
| R-1 name added additively (M1, S1) | T-1 |
| R-1 name added additively (M2–M4) | T-2 |
| R-1 name added additively (S2, S3) | T-3 |
| R-1 BUT: no rename/retype/remove, no row/order/paging change | T-1, T-2, T-3 (captured SQL + existing assertions) |
| R-1 AND IT MUST: `null`, never `"null"` | T-1, T-2, T-3 (mapper/fixture cases) |
| R-1 shared callers intact (export, notifications, webhook) | T-2 (export, webhook), T-3 (notifications) |
| R-1 BUT: outcome-indicator export columns unchanged | T-2 (server), T-5 (client Excel) |
| R-2 table: label + one line + ellipsis + `title` | T-4 (M1, M6, S1), T-5 (M2, M3); layout via HITL |
| R-2 table BUT: sort/filter unchanged, search adds name | T-4 (M6 `full_name`), T-5 (M2 search) |
| R-2 chip/header/inline: label | T-4 (S1, S2), T-5 (M4, S3), T-6 (items 1, 2, 3, 5, 6) |
| R-2 chip BUT: routing keys, ids, params, values unchanged | T-4, T-5, T-6 |
| R-2 dropdown: options + chip `CODE - Name`, search code or name, value unchanged | T-6 (items 4, 7, 8) |
| R-2 M5 header not blank | T-4 |
| R-3 single rule; fallback; never `SP10 - `/`undefined`/`null`; placeholder kept | T-4, T-5, T-6 (each fallback case) |
| R-4 contract doc + change-log; job fields unchanged | T-3 |
| NFR no per-row query | T-3 (one lookup), T-1/T-2 (join only) |
| NFR no new interpolated SQL input | T-2 |

## 6. Definition of done (spec)

- [x] T-1..T-6 green on their scoped runs; lint clean
- [ ] **HITL smoke** on the local stack (read-only pages; never click write buttons, because the stack shares the database). Load M1, M2, M3, M4, an IPSR creator/step page and the AI queue: no SQL error, names visible, columns on one line.
- [ ] `git diff --stat` touches only the files in design §4, plus the spec docs and folder `CLAUDE.md` files
- [x] Contract doc change-log row present (if S3 shipped)
- [ ] Commit only on user go-ahead: `✨ feat(program-labels) [SPEC:results/program-full-names-labels-part-2]: show program full name on IPSR, completeness, indicators, review history and AI jobs`

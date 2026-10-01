# Tasks — `changes/bilateral-create-upsert-by-code`

- **Status:** `in-progress` (T-1, T-2 done · T-3, T-4 on hold pending STAR (2026-10-01) · T-5 final pass and T-6 pending)
- **Budget (`design.md` §9):** 6 tasks · ~1,000 LOC · 1–2 review rounds per task
- **Branch:** `feat/bilateral-create-upsert-by-code` from `performance-refactor` @ `35e58fd87`
- **PR strategy:**
  - **PR 1** (T-1, T-2, T-5): version with data.
  - ~~**PR 2** (T-3, T-4): update in place.~~ On hold pending STAR (2026-10-01).
  - **T-6**: the Fetcher and the live run.
- **Server verification (always scoped, never the full suite):** from `onecgiar-pr-server/`:
  - `npx jest --silent --reporters=summary --forceExit --testPathPattern="api/bilateral"`
  - `npx eslint <touched files> --quiet`
  - `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "api/bilateral"` must return 0

---

### [x] `UBC-T-1` — Accept `result_code`, resolve it before any write, reject what is ineligible, and return per-result outcomes

- **Type:** `server` · **Size:** `M` · **Depends on:** `—`
- **Implements:** `UBC-R-1`, `R-4`, `R-5`, `R-6`, `R-8`, `R-10`; the resolution half of `R-2` / `R-3`
- **Design:** `DD-1` (resolution + ordering), `DD-5`, `DD-6`; `P-1`, `P-2`, `P-4`, `P-5`, `P-11`, `P-13`, `P-14`
- **Files (expected):**
  - `bilateral/dto/create-bilateral.dto.ts`
  - `bilateral/bilateral.service.ts` + spec
  - `bilateral/versioning-rules/bilateral-versioning-rules.service.ts` + spec
  - `bilateral/services/bilateral-versioning.service.ts` + spec (the extraction)
- **Scope:**
  - Add an optional `result_code` to `CreateBilateralDto`, digits-only.
  - Add a per-result **resolve** step, placed after the shape checks and before any user, contact or header write. It works as follows:
    1. Run `findInPhase(open)`. A hit means the target is `update`.
    2. On a miss, run `resolveVersionableResult`. A hit means the target is `versioned`.
    3. Apply the shared ownership rule, moved from `bvs` into `rules`, then the KP guard, then the `R-5` status guard for `update`.
  - Every miss rejects with a 4xx and nothing is written.
  - Until T-2 and T-3 land, an eligible `update` target returns 409 `"Updating an existing result through create is not available yet."` and an eligible `versioned` target is wired in T-2. PR 1 ships with this 409 in place.
  - Return `response.outcomes[]` with one row per result: `{ result_code, operation, status_id, status, external_reference }`, where `operation` is `created` for the unchanged path.
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`
- **Review:** `full` — this is a public contract, an ownership (security) check, and an extraction from a shared service (overrides b, f)
- **Verification:**
  - **Falsifier:** fixtures are code `99999` (not found), a code that belongs to another platform, a KP code, and an open-phase code in Approved. Each one must reject (404 / 403 / 409 / 409) **and** leave `_resultRepository.save`/`insert`, `findOrCreateUser` and the writers uncalled. Four mutations, each red on its case:
    - (a) create when the code is not found: the 404 case goes red, because `save` is called.
    - (b) skip the ownership check: the 403 case goes red.
    - (c) place the resolution after `findOrCreateUser`: the no-write assertion goes red.
    - (d) return the old response without `outcomes`: the `R-10` case goes red.
  - **Red run:** `npx jest --forceExit --testPathPattern="bilateral.service"`. The not-found case fails on current code because a new result gets created: `save` is called and no 404 is thrown.
  - **Disqualifier:**
    - A case that mocks the resolve step itself proves nothing. Stub the repositories and the rules service, then call `create()`.
    - Asserting only the thrown status, without asserting that no write happened, does not cover `R-8` (D1).
  - **Consumers:**
    - `bilateral.controller.ts:49-65`
    - `bilateral.controller.spec.ts`
    - `bilateral.service.spec.ts` (the create describes at `:2179`, `:774`)
    - `services/bilateral-versioning.service.spec.ts`
    - `versioning-rules/bilateral-versioning-rules.service.spec.ts` (the extraction must keep `/version` green)
    - Fetcher `external-api.mjs:139-157` (reads `response`; `outcomes` must not be named `results`)
- **Definition of done:**
  - [x] `R-1`: a no-code create is unchanged, and an explicit case asserts it
  - [x] `R-8`: each ineligible code returns its 4xx and triggers zero writes
  - [x] `R-4`: ownership is enforced through the extracted shared rule, and the `/version` specs stay green
  - [x] `R-10`: `outcomes[]` is present and additive, and `response` is unchanged
  - [x] All four mutations were run and observed **red**
  - [x] Scoped jest, eslint and tsc are green

---

### [x] `UBC-T-2` — Version with data: a fresh create in the open phase that keeps the prior `result_code`

- **Type:** `server` · **Size:** `M` · **Depends on:** `UBC-T-1`
- **Implements:** `UBC-R-3`, `R-7`, `R-20`; the version half of `R-10`
- **Design:** `DD-2`; `P-9`, `P-10`
- **Files (expected):** `bilateral/bilateral.service.ts` + spec
- **Scope:**
  - For an eligible `versioned` target, run the **normal create path** with the payload.
  - Immediately after the header insert, set `result_code` back to the source's code, following the pattern in `vs:300-306`.
  - The status follows `keep_editing` (`R-7`).
  - `outcome.operation` is `versioned`.
  - The source row is never saved, updated or deactivated.
- **Skills:** `nestjs-expert`, `tdd`
- **Review:** `full` — it writes a stored field (`result_code`) and it is on the data-integrity surface (override b)
- **Verification:**
  - **Falsifier:** a source row (phase 35, Approved, code `28565`) and an open phase (36). After `create` with `result_code: "28565"`:
    - a new row exists with `version_id` 36 and `result_code` 28565;
    - the source row's repository mock received no `save` / `update`.
  - Mutations, each red on its case:
    - (a) skip the code restore: red, because `result_code` is the trigger value.
    - (b) call `versionProcessV2` instead: red, because the source is touched and copied rows appear.
    - (c) ignore `keep_editing`: red on the status case.
  - **Red run:** on current code, T-1's 409 or "not wired" behaviour is observed where `operation: versioned` is expected.
  - **Disqualifier:** a test that does not assert the source row stayed untouched does not cover `R-3` (D3).
  - **Consumers:** `bilateral.service.spec.ts` · `vs:300-306` (the pattern, not modified)
- **Definition of done:**
  - [x] `R-3`: new row in the open phase with the same code, source untouched
  - [x] `R-7`: status follows `keep_editing`
  - [x] Mutations run and observed **red**
  - [x] Scoped jest, eslint and tsc are green

---

### `UBC-T-3` — ⏸ ON HOLD (2026-09-30, pending STAR confirmation on 2026-10-01; see `execution.md` → Pivot Record: UBC-T-3) — Update in place: header, immutable type, title rule, and a preflight of the post-header checks

- **Type:** `server` · **Size:** `M` · **Depends on:** `UBC-T-1`
- **Precondition (settled 2026-09-30):** `P-16` / `OQ-1`: Manuel confirmed that STAR sends the full result. Replace semantics stand. If a producer later sends partial data, that is a new change, not this task.
- **Implements:** `UBC-R-2`, `R-7`, `R-9`, `R-20`; the update half of `R-10`
- **Design:** `DD-1` (preflight hoist), `DD-3` (header part), `DD-4`, `DD-7`; `P-5`, `P-12`
- **Files (expected):** `bilateral/bilateral.service.ts` + spec; handler files only if a check is hoisted
- **Scope:**
  - Replace T-1's 409 placeholder with the update path:
    - update the header fields that create sets from the payload, on the existing row, keeping its `id` and `result_code`;
    - the status follows `keep_editing`;
    - a changed `result_type_id` returns 409 (`DD-4`);
    - `ensureUniqueTitle` gains an optional exclude-id, and update passes the target id (`DD-7`).
  - Hoist `geo_focus` and each handler `afterCreate` check into a preflight on the code path. List any check that cannot be hoisted, as an accepted risk.
  - Sections are T-4.
- **Skills:** `nestjs-expert`, `tdd`
- **Review:** `full` — data-integrity surface, and it changes a shared validator (override b)
- **Verification:**
  - **Falsifier:** an open-phase target in Pending Review with title "X". After an update with the same title "X" and a new description:
    - the same `id`;
    - the new description;
    - no 400.
  - A second fixture has another open-phase result titled "Y". An update to "Y" must be rejected.
  - Mutations, each red on its case:
    - (a) drop the exclude-id: red on the same-title case.
    - (b) exclude every title: red on the "Y" case.
    - (c) allow a type change: red on the `DD-4` case.
    - (d) run a hoisted check after the header write: red on the "rejected update wrote nothing" case.
  - **Red run:** on current code the update path is still the T-1 409 placeholder, so the same-title case fails there.
  - **Disqualifier:** a case that asserts a new row with the same code instead of the same `id` is testing versioning, not update.
  - **Consumers:**
    - every existing caller of `ensureUniqueTitle` (`svc:404`), which must keep its behaviour
    - `bilateral.service.spec.ts`
    - the handler specs of any hoisted check
- **Definition of done:**
  - [x] `P-16` settled (Manuel, 2026-09-30); record it in `execution.md` when T-3 runs
  - [ ] `R-2` (header): same `id` and code, new data
  - [ ] `R-9`: own title allowed, another result's title rejected
  - [ ] `DD-4`: a type change returns 409
  - [ ] Preflight: a rejected update writes nothing; any unhoistable checks are listed as accepted risk
  - [ ] Mutations run and observed **red**
  - [ ] Scoped jest, eslint and tsc are green

---

### `UBC-T-4` — ⏸ ON HOLD (with T-3, pending STAR) — Section reset so the create writers replace instead of duplicating, plus the lead-centre correction

- **Type:** `server` · **Size:** `M` · **Depends on:** `UBC-T-3`
- **Implements:** `UBC-R-2` (sections)
- **Design:** `DD-3` (reset + `persistLeadCenter`); `P-6`, `P-7`, `P-8`
- **Files (expected):** `bilateral/bilateral.service.ts` + spec; `results/results-centers/results-centers.repository.ts` only if the lead query needs it
- **Scope:**
  - Before the writers run on an update, deactivate the add-only sections:
    - evidence
    - contributing projects
    - non-lead contributing centres
    - ToC (via `resetTocData`)
    - subnationals of existing countries
    - partner-role institutions, including when the incoming list is empty
  - Correct `persistLeadCenter` so it reactivates the existing row and demotes the previous lead.
  - Leave the sections that already replace untouched (`P-7`).
- **Skills:** `nestjs-expert`, `tdd`
- **Review:** `lenses` — this changes writers shared with the create of every new result (data-loss surface, override f)
- **Verification:**
  - **Falsifier:** a target holding 2 evidences, 2 projects, 2 contributing centres and 1 ToC mapping. After an update carrying 1 evidence, 1 project, 1 centre and a different ToC mapping, exactly 1 active row remains per section, and the old ones are inactive.
  - Mutations, each red on its section's case:
    - (a) skip the evidence reset: red, because 3 are active.
    - (b) skip the ToC reset: red, because both mappings are active.
    - (c) revert the `persistLeadCenter` fix: red, because two leads are active.
  - **Regression:** a create of a **new** result with a lead centre behaves exactly as before. This is the case for the reversion-challenge row in `design.md` §8.
  - **Red run:** on T-3's code, the evidence case shows 3 active rows.
  - **Disqualifier:**
    - Counting mock calls instead of the resulting active rows proves plumbing, not replace.
    - DB-level duplication (D4) is also checked at the HITL pause on TEST, in T-6.
  - **Consumers:**
    - `svc` writers `:5186-5213`, `:4032-4037`, `:4811`, `:1496-1515`, `:5534-5611`, `:4605-4628`, `:5223`
    - `results-centers.repository.ts:180-197`
    - every spec that pins `persistLeadCenter` or `handleEvidence` (run `grep` over `*.spec.ts` at the start of the task and list the hits)
- **Definition of done:**
  - [ ] Each add-only section is replaced, not duplicated (per-section cases)
  - [ ] `persistLeadCenter` is corrected, with the new-result regression green
  - [ ] Mutations run and observed **red**
  - [ ] Scoped jest, eslint and tsc are green

---

### [~] `UBC-T-5` — Contract doc and the Notion versioning section

- **Type:** `docs` · **Size:** `S` · **Depends on:** `UBC-T-2` (PR 1); final pass after the Pivot of 2026-09-30: the update is not offered, so the doc says a code in the open phase is a 409, permanently (no "not yet")
- **Implements:** `UBC-R-12` (PRMS side); settles `P-15` as far as the docs go
- **Design:** `DD-8`
- **Files (expected):** `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`
- **Scope:**
  - A section on `data.result_code` on create, covering:
    - the three operations;
    - the eligibility rules and the 4xx table;
    - `outcomes[]`;
    - what a version-with-data does **not** carry.
  - A change-log row.
  - A markdown block ready for the Notion "Versioning" page, delivered in the task report.
- **Skills:** `cognitive-doc-design`
- **Review:** `checklist` — documentation, checked against the shipped behaviour
- **Verification:**
  - **Falsifier:** every rule and error the doc states is cross-checked against a test name from T-1..T-2 (T-3 and T-4 on hold; add their tests if they resume). A statement with no backing test is a defect.
  - **Red run:** n/a (docs)
  - **Disqualifier:** a doc written from the design instead of the shipped code, which ignores differences found at execute time.
  - **Consumers:** producers reading the contract (STAR, MEL, TIP, the bulk uploader), `P-15`
- **Definition of done:**
  - [ ] The section and the change-log row are present
  - [ ] Every stated rule maps to a test
  - [ ] The Notion markdown is delivered

---

### `UBC-T-6` — Fetcher `op` doc and a live run through the Fetcher on TEST

- **Type:** cross-repo + manual · **Size:** `S` · **Depends on:** `UBC-T-2` (the update run is on hold with T-4)
- **Implements:** `UBC-R-11`, `R-12` (Fetcher side); gates `D4`, `D7`
- **Design:** `DD-8`; `P-3`
- **Files (expected):** `onecgiar_result_functions/services/fetcher/src/docs/openapi.json` (the `op` description), on its own branch and PR in that repo
- **Scope:**
  - Mark `op: update|delete` as not implemented in the Fetcher's OpenAPI.
  - On TEST, send one result through the Fetcher `/ingest` with `data.result_code` in each of three cases:
    1. version (an approved result from a prior phase);
    2. ~~update (after PR 2)~~ → a code already in the open phase: 409 (Pivot 2026-09-30);
    3. not found.
  - Record the server log line and the `outcomes[]` row for each.
- **Skills:** `systematic-debugging`
- **Review:** `checklist` — a manual gate plus a one-line doc edit
- **Verification:**
  - **Falsifier:** the not-found run must return 404, and the DB must show no new result with that title. A 201 or a new row means `R-8` failed end to end.
  - **Red run:** n/a (manual)
  - **Disqualifier:** a run that bypasses the Fetcher (a direct `curl` to PRMS) proves PRMS, not `R-11`.
  - **Consumers:** `none` (no shared symbol changes in this repo)
- **Definition of done:**
  - [ ] The Fetcher `op` doc is corrected, with a PR in `onecgiar_result_functions`
  - [ ] Version, open-phase-409 and not-found runs recorded through the Fetcher on TEST

---

## Coverage closure

| Requirement / clause | Owner |
|---|---|
| `R-1` no code, no change | T-1 |
| `R-2` update: same id and code, replaced data | ⏸ on hold (T-3 + T-4); meanwhile the open-phase 409 is T-1's |
| `R-2` *AND IT MUST NOT create a second row* | T-1 (the open-phase code is rejected with 409, nothing is written) |
| `R-3` version with data; the earlier row stays identical | T-2 |
| `R-4` ownership | T-1 |
| `R-5` editable statuses | T-1 (guard) |
| `R-6` KP excluded | T-1 |
| `R-7` status follows `keep_editing` | T-2 (version) |
| `R-8` reject with a 4xx; *AND IT MUST NOT write any row* | T-1 (unit) + T-6 (end to end) |
| `R-9` title excludes itself; another result's title is still rejected | ⏸ on hold with `R-2` (T-3) |
| `R-10` outcomes, additive | T-1 (`created`) + T-2 (`versioned`); `updated` is never emitted |
| `R-11` the code reaches PRMS through the Fetcher | T-1 (DTO) + T-6 (live) |
| `R-12` honest docs | T-5 (PRMS) + T-6 (Fetcher) |
| `R-20` same validation as create | T-2 (it runs the create path) |
| `A-1` / `P-16` full payload | T-2 (settled 2026-09-30) |
| Scenario "Reject instead of creating" *AND IT MUST NOT write any row, no header included* | T-1 |
| Scenario "Version" *BUT the 2025 row must NOT change* | T-2 |
| Scenario "Update" *BUT must NOT fail on the duplicate-title rule because of its own title* | ⏸ on hold (T-3) |

**No task is `skip-eligible`.**

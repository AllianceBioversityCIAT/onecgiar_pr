# Tasks — Bilateral evidence: public / private tag per piece of evidence

## 1. Scope of this task list

| Field | Value |
|---|---|
| Module / feature | `bilateral` · evidence visibility (P2-4110) |
| Linked spec | `requirements.md` (EVP-R-1…14) · `design.md` (EVP-DD-1…9, Premise Ledger P-1…P-19) |
| Repos | `onecgiar_pr` (EVP-T-1…T-10) · `onecgiar_result_functions` (EVP-T-11) |
| Approval Mode | gated |
| Status | approved (Santiago Sanchez, 2026-11-19), not-started. The Red-run deviation for T-3/T-5/T-6/T-8/T-9 (§2 note) was accepted at the tasks gate |
| Budget (from `design.md` §11) | 11 tasks · ~780 LOC · ~15 review rounds. A tripwire for `/akili-execute` |

## 2. Pre-flight checklist

- [x] `requirements.md` approved (2026-11-19).
- [x] `design.md` approved (2026-11-19, "sigue con phase 3"). Review Design not run.
- [x] All open questions closed (EVP-OQ-1…4).
- [x] No in-flight spec touching `evidence` / `section-evidence` / `result-review-drawer`. **First Leader step**: `grep -rln "section-evidence\|result-review-drawer\|evidence.entity" docs/specs --include=tasks.md`, then read the status of each hit.
- [ ] P-17 settled by EVP-T-1, first step.
- [ ] P-16 (Results Dashboard) is owned by the `/akili-validate` HITL. It does not block execution.

### Baseline observations (quoted, at `cfc18d03e` / Fetcher `314f3f2`, 2026-11-19)

| ID | Command / probe | Observed |
|---|---|---|
| B-1 | `npx jest src/api/bilateral/dto/evidence.dto.spec.ts --silent --reporters=summary` (server) | `Tests: 13 passed, 13 total` |
| B-2 | ts-node probe (scratchpad `evp-probe.ts`): `validate(plainToInstance(EvidenceDto,{link:'https://cgiar.sharepoint.com/sites/x',description:'Contract',is_public:false}),{whitelist:true,forbidNonWhitelisted:false})` | `[{"p":"link","c":["isNotCloudStorageLink"]}] kept is_public: false` |
| B-3 | same probe, `is_public:"no"` | `[{"p":"link","c":["isNotCloudStorageLink"]}] kept is_public: false`, so no `is_public` error is raised |
| B-4 | same probe: `mapEvidence({evidence_array:[{is_sharepoint:0,is_public:0,link:'https://example.org/contract.pdf',description:'Contract'}]})` | `[{"description":"Contract","link":"https://example.org/contract.pdf","source":"url","visibility":"public","tags":[]}]` |
| B-5 | Node probe (scratchpad `fetcher-probe.cjs`): Fetcher options `{allErrors:true,removeAdditional:true,strict:false}` on AJV 8.18.0 (Fetcher pins `^8.17.1`), schema `common_fields.json` `properties.evidence`, data `[{link,description,is_public:false}]` | `valid: true after: [{"link":"https://cgiar.sharepoint.com/x","description":"Contract"}]` |

**Red-run note.** B-1…B-5 are executed reds or baselines. The tasks with no executable probe at specify time are T-3, T-5, T-6, T-8 and T-9. Their targets exist, but they can only be exercised through a Nest or Angular test module, and writing that test is the task itself. For those, the **Red run** field quotes the static reading at `file:line`. The Done criteria require the assertion-level red to be **observed and quoted in `execution.md` before the fix** (tests first). This is a declared deviation from Falsifiability item 8, recorded at the tasks gate.

## 3. Task list

### EVP-T-1 — Migration + entity column `evidence.is_public`

- **Type:** db
- **Description:** Add the nullable `is_public` column to `evidence` and to the `Evidence` entity, with no default and no backfill. **First step:** settle P-17 by recording the `evidence` row count on TEST in `execution.md`. More than ~5M rows means flagging an off-hours window to the user.
- **Implements:** EVP-R-1 (storage), NFR Data
- **Files (expected):**
  - `onecgiar-pr-server/src/migrations/<ts>-EVP-AddEvidenceIsPublic.ts` (ts > `1793400000000`, `// @akili-spec bilateral/evidence-privacy-tag` header, "four futures" doc block per design §3.2)
  - `onecgiar-pr-server/src/api/results/evidences/entities/evidence.entity.ts`
  - `onecgiar-pr-server/src/api/qa-catalog/definitions/not-for-qa.ts`: a new `nfq('evidence', …, 'is_public')` entry beside `:267-284`, with the reason *"bilateral link visibility (P2-4110); written only for bilateral link items, never by the W1/W2 (P25) form"*
- **Depends on:** — · **Blocks:** T-3, T-4, T-5, T-6
- **Estimate:** S
- **Review:** full — migration on a shared table
- **Skills:** `nestjs-expert`
- **Scope:** `Backend route: stack NestJS; module-design lead existing design support nestjs-expert; implement lead nestjs-expert support none — project conventions`
- **Verification:**
  - **Falsifier:** add the entity column but omit the migration → `npm run migration:check` reports a pending schema change. Up then down then up on a local DB leaves the same schema (`SHOW COLUMNS FROM evidence LIKE 'is_public'` → 1 row, `Null: YES`, `Default: NULL`).
  - **Red run:** `predicted — greenfield artifact (observed in EVP-T-1)`: `npm run migration:check` with the entity column added and no migration file reports drift. Quote it verbatim in `execution.md`.
  - **Disqualifier:** `migration:check` cannot reach a database locally. Then the gate is not evidence: report "inconclusive" and run `migration:check:ci` in CI before T-1 is marked done.
  - **Execute-time amendment (2026-11-19, user-approved):** `migration:check` only compares migration files against the migrations table (`scripts/check-pending-migrations.ts:66-80`); it does **not** detect an entity column without a migration, so the first falsifier above cannot go red as written. No DB is reachable locally (no `.env`, Docker off). T-1 therefore closes on: the QA-catalog red→green, server `tsc`, and a static review of `up`/`down` (idempotent guard, nullable, no default). Up/down/up on a real DB, the P-17 row count and `migration:check:ci` are recorded as an **open gap** owned by CI / the `/akili-validate` HITL, never as passed.
  - **Second falsifier (QA catalog, QAC-R-7):** with the entity column added and **no** `not-for-qa.ts` entry, `npx jest src/api/qa-catalog/qa-catalog.completeness.spec.ts` fails naming `evidence.is_public` (the guard "fails naming <table>.<column> for an uncatalogued own column", spec `:145`). With the entry it passes. `predicted — greenfield artifact (observed in EVP-T-1)`; quote the red.
  - **Consumers:**
    - every reader of the `Evidence` entity (new nullable property, so additive);
    - raw-SQL readers that list columns: `evidences.repository.ts:420-450` (T-3), `result.repository.ts:3933-3946` (T-6);
    - **`onecgiar-pr-server/src/api/qa-catalog/qa-catalog.completeness.spec.ts`**, which polices every own column of `evidence` (`definitions/completeness.ts`, `definitions/not-for-qa.ts:267-284`);
    - `qa-catalog/definitions/sections/evidence.ts`, which maps `evidence` columns explicitly and needs no binding for `is_public` (pool QA form, AC 10).
- **Definition of done:**
  - [ ] Migration up/down verified locally. `npm run migration:check` green. **OPEN GAP (amendment 2026-11-19): CI / validate.**
  - [x] `qa-catalog.completeness.spec.ts` red without the `not-for-qa.ts` entry (quoted), green with it.
  - [ ] P-17 row count quoted in `execution.md`. **OPEN GAP: no DB reachable; validate HITL.**
  - [x] Server type-check `npx tsc --noEmit -p tsconfig.json` green.

### EVP-T-2 — Pure visibility resolver

- **Type:** server
- **Description:** A pure function implementing design §3.1. Input: one evidence row (`is_sharepoint`, `is_public`, and the first SP row's `is_public_file`). Output: `{ visibility: 'public'|'private', exposed: true|false|null }`. No I/O, no Nest DI.
- **Implements:** EVP-R-1 (both scenarios), EVP-DD-2
- **Files (expected):** `onecgiar-pr-server/src/api/results/evidences/utils/evidence-visibility.ts` (+ `.spec.ts`)
- **Depends on:** — · **Blocks:** T-5, T-6, T-7
- **Estimate:** S
- **Review:** checklist — new pure function, no shared consumer yet
- **Skills:** `nestjs-expert`, `tdd`
- **Scope:** `Backend route: stack NestJS; implement lead nestjs-expert support none — project conventions; test-first lead tdd support nestjs-expert`
- **Verification:**
  - **Falsifier:** a fixture with **all six** §3.1 rows. In particular the link/NULL row (expected `public`, `exposed: null`) and the file/`is_public_file` NULL row (expected `private`, `false`). The mutation "treat NULL as private" flips the first; "files follow `is_public`" flips a file row whose `is_public` is 1 and `is_public_file` is 0. Include that row: a file with `is_public = 1`, `is_public_file = 0` → `private`.
  - **Red run:** `predicted — greenfield artifact (observed in EVP-T-2)`: the spec fails on import before the file exists. Then observe the assertion-level red with a stub returning `{visibility:'public', exposed:null}`, and quote it.
  - **Disqualifier:** any row's expected value disagrees with design §3.1. Stop and re-specify; do not edit the table to fit the code.
  - **Consumers:** none (new symbol).
- **Definition of done:**
  - [x] All §3.1 rows (six, plus the file `is_public`=1 / `is_public_file`=0 row) asserted.
  - [x] Both mutations above executed and observed red, then reverted. Quoted in `execution.md`.

### EVP-T-3 — Shared evidence endpoint: bilateral-only write + load column

- **Type:** server
- **Description:**
  - **Write:** `_applyEvidenceInputFields` writes `is_public` only when `result.source === SourceEnum.Bilateral` and the item is not SharePoint (`input ?? null`). A bilateral file item gets null. A pool result never has the property touched (EVP-DD-3).
  - **Plumbing:** pass `result` into the helper from `_upsertEvidenceItemV1`, and add `is_public?: boolean | null` to `EvidencesCreateInterface`.
  - **Load:** `getEvidencesByResultId` SQL selects `e.is_public`, and `findAll` normalizes it to `true/false/null` (never `Boolean(null)`).
- **Implements:** EVP-R-3 (persistence half), EVP-R-12 (scenario "Pool link save" and NFR), EVP-DD-3
- **Files (expected):** `onecgiar-pr-server/src/api/results/evidences/evidences.service.ts` (`:131-151`, `:218-251`, `findAll` `:812-870`) · `evidences.repository.ts` (`:420-450`) · `dto/create-evidence.dto.ts` · new `evidences.service.evp.spec.ts`
- **Depends on:** T-1 · **Blocks:** T-8
- **Estimate:** M
- **Review:** full — shared writer used by pool (AC 10)
- **Skills:** `nestjs-expert`, `tdd`
- **Scope:** `Backend route: stack NestJS; implement lead nestjs-expert support none — project conventions; test-first lead tdd support nestjs-expert`
- **Verification:**
  - **Falsifier:** a fixture with three saves through `create`:
    - (a) `source: 'API'`, link item, `is_public: false` → saved row `is_public === false`;
    - (b) `source: 'Result'` (pool), link item, `is_public: false` sent anyway → saved row has **no** `is_public` set (property `undefined` on the entity passed to `save`);
    - (c) `source: 'API'`, SharePoint item → `is_public === null`.
    - Mutation "drop the source check" turns (b) red. Mutation "write `input` for files" turns (c) red.
  - **Red run:** static reading: `evidences.service.ts:131-151` assigns no `is_public`. Case (a) must fail at the assertion (`expected false, received undefined`), observed and quoted in `execution.md` before the fix.
  - **Disqualifier:** the existing pool suites listed under Consumers need an assertion **changed** (not just a fixture field added) to stay green. That means pool behaviour moved, which violates AC 10. Stop and escalate.
  - **Consumers:** `onecgiar-pr-server/src/api/results/evidences/evidences.service.spec.ts`, `evidences.service.confidentiality.spec.ts`, `evidences.service.p2-3601.spec.ts`, `evidences.service.p2-3692.spec.ts`, `api/versioning/versioning.service.spec.ts` (all pin `getEvidencesByResultId`). Grep: `grep -rl "getEvidencesByResultId" onecgiar-pr-server/src onecgiar-pr-server/test --include=*.spec.ts --include=*.e2e-spec.ts`. `_applyEvidenceInputFields` has 0 spec pins (same grep). Pool UI readers of `is_public_file` stay unchanged: `rd-evidences`, `evidence-item`, `user-evidence`, `ipsr-step3-evidence-list`.
- **Definition of done:**
  - [x] (a)(b)(c) green; both mutations observed red; reds quoted.
  - [x] All five consumer suites green, with no assertion edited.
  - [x] Server type-check green.

### EVP-T-4 — Bilateral API input: `is_public` + conditional storage-link rule + writer

- **Type:** server
- **Description:**
  - **DTO:** `EvidenceDto.is_public?: boolean | null` (`@IsOptional() @IsBoolean()`, Swagger per design §4.1).
  - **Storage-link rule:** a conditional variant of the storage-link constraint, skipped only when the sibling `is_public === false`. The original `IsNotCloudStorageLink` keeps its exact behaviour.
  - **Writer:** `handleEvidence` stores `is_public ?? null`. Resubmission and upsert inherit it (P-6, EVP-DD-9).
- **Implements:** EVP-R-4 (API scenarios), EVP-R-5 (all scenarios), EVP-R-11, EVP-DD-4, EVP-DD-9
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral/dto/create-bilateral.dto.ts` (`:943-963`) · `shared/validators/is-not-cloud-storage-link.validator.ts` · `api/bilateral/bilateral.service.ts` (`:6259-6302`) · `dto/evidence.dto.spec.ts` · `bilateral.service.spec.ts`
- **Depends on:** T-1 · **Blocks:** T-10, T-11
- **Estimate:** M
- **Review:** lenses — reverses part of a documented breaking change on an external contract (correctness-critical)
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`
- **Scope:** `Backend route: stack NestJS; api-contract lead api-design-principles support nestjs-expert; implement lead nestjs-expert support none — project conventions; test-first lead tdd support nestjs-expert`
- **Verification:**
  - **Falsifier:** the DTO spec over **every** host in the existing storage-link list (the 6 URLs of `evidence.dto.spec.ts`) × `is_public ∈ {false, true, null, absent}`:
    - only `false` is accepted; the other three keep `file storage platforms`;
    - `is_public: "no"` → an error on property `is_public`.
    - Mutation "skip the rule when `is_public` is falsy" accepts `null` → red on the null column.
  - **Writer falsifier:** `handleEvidence` with items `false`/`true`/absent saves `false`/`true`/`null`.
  - **Resubmission (EVP-R-11):** a previously private link re-sent without the field is saved `null`.
  - **Red run:** observed **B-2** (private storage link refused with `isNotCloudStorageLink`, `is_public` stripped) and **B-3** (`"no"` raises no `is_public` error). B-1 is the green baseline that must remain 13/13 after the change.
  - **Disqualifier:** any of the 13 B-1 tests needs editing to pass. Today's refusal semantics moved beyond EVP-R-4. Stop.
  - **Consumers:** `onecgiar-pr-server/src/api/bilateral/dto/evidence.dto.spec.ts` (pins the storage-link message), `api/bilateral/bilateral.service.spec.ts` (pins `handleEvidence`). Grep: `grep -rl "handleEvidence\|file storage platforms" onecgiar-pr-server/src --include=*.spec.ts`. Fetcher (T-11) forwards the field.
- **Definition of done:**
  - [x] 6 hosts × 4 states asserted. B-2/B-3 cases now green. B-1 still 13/13 with no edits.
  - [x] Mutation observed red and quoted.
  - [x] Swagger text updated. Server type-check green.

### EVP-T-5 — Bilateral reads expose `is_public` per item (+ AI context flag)

- **Type:** server
- **Description:**
  - **Bilateral reads:** `filterActiveRelations` overwrites each `evidence_array[]` row's `is_public` with the resolver's exposed value (links `true/false/null`, files `true/false`) and leaves `evidenceSharepointArray` untouched.
  - **AI context:** `getAIContext` items gain `is_public` from the resolver. On bilateral results, private items are sent with `link: null`; pool links are unchanged (EVP-DD-8, amended at validate 2026-11-20).
- **Implements:** EVP-R-6, EVP-R-1 ("Mixed visibilities"), EVP-DD-5, EVP-DD-8
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts` (`:2122-2152`) · `api/results/results.service.ts` (`:3700-3712`) · `bilateral.service.spec.ts` · `results.service.spec.ts`
- **Depends on:** T-1, T-2 · **Blocks:** T-10, T-11
- **Estimate:** S
- **Review:** full — response shape of `/api/bilateral/*`
- **Skills:** `nestjs-expert`
- **Scope:** `Backend route: stack NestJS; implement lead nestjs-expert support none — project conventions; test-suite lead the spec's scenarios support nestjs-expert`
- **Verification:**
  - **Falsifier:** a fixture with one result and five items: link/0, link/1, link/NULL, file with SP `is_public_file` 0, file with SP 1. Expected exposed values: `false, true, null, false, true`.
    - Mutation "expose the raw column": file rows read `null` → red.
    - Mutation "coerce with `Boolean()`": link/NULL reads `false` → red.
    - Plus: the set of keys on each row is a superset of the pre-change set.
  - **Red run:** static reading: `bilateral.service.ts:2147-2152` filters by type only and sets no `is_public`. The file/SP-0 row asserts `false` and today reads `undefined`; observe and quote.
  - **Disqualifier:** an existing assertion on `evidence_array` row keys needs removing. The change is not additive. Stop.
  - **Consumers:** `onecgiar-pr-server/src/api/bilateral/bilateral.service.spec.ts` (pins `filterActiveRelations`). `getAIContext`/`ai/context`: 0 spec pins (grep `getAIContext\|ai/context` over specs). Client reader `onecgiar-pr-client/src/app/shared/services/api/ai-review.service.ts:193` ignores unknown keys. Fetcher `EvidencesMapper` (T-11).
- **Definition of done:**
  - [x] Five-row fixture green; both mutations observed red; quoted.
  - [x] Server type-check green.

### EVP-T-6 — Review detail returns description + `is_public`

- **Type:** server
- **Description:**
  - **Query:** `getEvidenceBilateralResult` selects `e.description` and `e.is_public`, plus the active SP row's `is_public_file`, aggregated to **one row per evidence** (LEFT JOIN on `esp.evidence_id = e.id AND esp.is_active = 1`, grouped by `e.id`).
  - **Service:** `getBilateralResultById` maps each item to `{ id, link, is_sharepoint, description, is_public }` via the resolver.
- **Implements:** EVP-R-7 (data), EVP-R-8 (data), NFR Performance, EVP-DD-6
- **Files (expected):** `onecgiar-pr-server/src/api/results/result.repository.ts` (`:3933-3946`) · `api/results/results.service.ts` (`:4188-4255`) · `results.service.spec.ts` · `result.spec.ts`
- **Depends on:** T-1, T-2 · **Blocks:** T-9
- **Estimate:** S
- **Review:** full — SQL change, review data path
- **Skills:** `nestjs-expert`
- **Scope:** `Backend route: stack NestJS; implement lead nestjs-expert support none — project conventions; test-suite lead the spec's scenarios support nestjs-expert`
- **Verification:**
  - **Falsifier:**
    - A service test with repository rows for a private link and a file with `is_public_file` 0 → both `is_public: false`; the description string is passed through.
    - A SQL assertion that the query text contains `e.description` and `GROUP BY` (or an equivalent single-row guarantee) and still runs **one** query per call.
    - Mutation "INNER JOIN on SP": link rows disappear → red. Assert that the link row is present.
    - **Real-DB check:** on a local DB with an evidence that has two SP rows, one active and one inactive, the query returns 1 row for it.
  - **Red run:** static reading: `result.repository.ts:3936-3938` selects only `id, link, is_sharepoint`. The description assertion must fail (`expected 'Signed contract…', received undefined`); observe and quote.
  - **Disqualifier:** the real-DB check can't run locally. The duplicate-row guarantee is then unproven: report it as a gap and add it to the `/akili-validate` checklist, never "pass".
  - **Consumers:** `onecgiar-pr-server/src/api/results/results.service.spec.ts`, `api/results/result.spec.ts` (pin `getEvidenceBilateralResult`). Client `result-review-drawer.component.ts` reads `fields.evidence` (T-9).
- **Definition of done:**
  - [x] Tests green; mutation red observed; quoted.
  - [x] Real-DB single-row check quoted, or recorded as a gap. **Recorded as a GAP (validate).**

### EVP-T-7 — AI quality payload honours link visibility

- **Type:** server
- **Description:** `mapEvidence` takes `visibility` from the resolver instead of `is_sharepoint ? … : 'public'`. A private link → `link: null`, and the description is still sent.
- **Implements:** EVP-R-10, EVP-R-1 ("Legacy item")
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral/services/quality-assessment/mappers/evidence.mapper.ts` (`:52-79`) · `bilateral-quality-payload.builder.spec.ts`
- **Depends on:** T-2 · **Blocks:** —
- **Estimate:** S
- **Review:** checklist — one function, behaviour fixed by B-4
- **Skills:** `nestjs-expert`, `tdd`
- **Scope:** `Backend route: stack NestJS; implement lead nestjs-expert support none — project conventions; test-first lead tdd support nestjs-expert`
- **Verification:**
  - **Falsifier:** link with `is_public` 0 → `visibility:'private', link:null, description:'Contract'`. Link with `is_public` NULL → `public` with the normalized link (unchanged from B-4's shape). File rows unchanged. The mutation "NULL ⇒ private" breaks the second.
  - **Red run:** observed **B-4**: `{"link":"https://example.org/contract.pdf","source":"url","visibility":"public"}` for a link with `is_public: 0`.
  - **Disqualifier:** any existing builder-spec expectation for file rows changes.
  - **Consumers:** `onecgiar-pr-server/src/api/bilateral/services/quality-assessment/bilateral-quality-payload.builder.spec.ts` (pins `mapEvidence` and `evidence_array`). Grep: `grep -rl "mapEvidence\|evidence_array" onecgiar-pr-server/src --include=*.spec.ts` (also hits `ipsr/innovation-pathway/innovation-pathway-step-four.service.spec.ts`, which is unrelated: IPSR's own `evidence_array`, untouched).
- **Definition of done:**
  - [x] B-4 case now private/null; builder spec green otherwise unchanged.

### EVP-T-8 — Centre form: question for links, storage rule, mapping, lock

- **Type:** client
- **Description:** In `section-evidence`, per design §6.2:
  - render the public question for both sources; switching source clears it;
  - `isDraftValid` requires an answer for links;
  - `draftLinkError` and `hasValidLink` allow a storage link only when the answer is No;
  - body mapping: link → `is_public`; load mapping: link `is_public` → draft `is_public_file` slot;
  - card lock for link items with a non-null answer, hidden when untagged;
  - the No-answer note copy for links.
- **Implements:** EVP-R-2 (all scenarios), EVP-R-3, EVP-R-4 (form scenario), EVP-DD-7
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/components/section-evidence/section-evidence.component.{ts,html,scss,spec.ts}` · `section-evidence.model.ts`
- **Depends on:** T-3 · **Blocks:** —
- **Estimate:** M
- **Review:** full — reporting UI, storage-link reversal on the form
- **Skills:** `angular-developer`, `impeccable-bridge`
- **Scope:** `Design route: load impeccable-bridge → design-routing.md; playbook refine; ENV-2; mode Operate; polish light; motion none`
- **Verification:**
  - **Falsifier:** a component spec over the real template:
    - (i) source Link + valid URL + no answer → confirm disabled; answer Yes → enabled;
    - (ii) SharePoint URL + Yes → the storage error is shown and confirm is disabled; + No → no error, confirm enabled;
    - (iii) Upload "No" → switch to Link → answer `null`;
    - (iv) save body: link item carries `is_public: false`, file item still carries `is_public_file`;
    - (v) load `[{link, is_public:null}]` → card has **no** lock; `[{link, is_public:false}]` → lock `lock` with title `Private`.
    - Mutation "allow storage links regardless of answer" → (ii) Yes case red.
  - **Red run:** static reading: `section-evidence.component.ts:296-307` refuses every storage link, and `:317-319` nulls the answer in Link mode. Case (ii)-No and (i) must fail at the assertion; observe and quote before the fix.
  - **Disqualifier:** an existing spec case asserting the storage-link refusal needs deleting instead of extending with the answer. Re-check against EVP-R-4.
  - **Consumers:** `onecgiar-pr-client/src/app/pages/bilateral/components/section-evidence/section-evidence.component.spec.ts` (pins `is_public_file`, `isCloudLink`, `draftLinkError`, `isDraftValid`, `hasValidLink`). Grep: `grep -rl "is_public_file\|isCloudLink\|draftLinkError\|isDraftValid\|hasValidLink" onecgiar-pr-client/src onecgiar-pr-client/cypress --include=*.spec.ts --include=*.cy.ts`. Pool hits (`user-evidence.component.spec.ts`, `user-evidence.zoneless.spec.ts`, `rd-evidences`, `evidence-item`, `ipsr-step3`) are **not** touched, and they must stay green as the AC 10 regression set.
- **Definition of done:**
  - [x] (i)–(v) green; mutation red observed; quoted.
  - [x] Client build/type-check `npx ng build --configuration development` green.
  - [x] Completion report names the playbook (`refine`), polish `light` and its result, and `finish review: not run (AKILI execute)`.

### EVP-T-9 — Review drawer: Private tag + description

- **Type:** client
- **Description:** In card 3 of `result-review-drawer`, per design §6.3:
  - **Line 1:** URL anchor unchanged, plus a Private pill when `is_public === false`. The pill has a lock icon and the text "Private", is built from tokens, carries the EVP-R-9 tooltip via `prTooltip`, and has an `aria-label` and `data-testid="evidence-private-tag"`.
  - **Line 2:** the description, when non-blank (`data-testid="evidence-description"`).
  - The admin add-link input is untouched.
- **Implements:** EVP-R-7, EVP-R-8, EVP-R-9, NFR Accessibility
- **Files (expected):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/result-review-drawer/result-review-drawer.component.{html,ts,spec.ts}`
- **Depends on:** T-6 · **Blocks:** —
- **Estimate:** S
- **Review:** checklist — additive markup. Layout is covered by the HITL check (D9)
- **Skills:** `angular-developer`, `impeccable-bridge`, `tailwind-design-system`
- **Scope:** `Design route: load impeccable-bridge → design-routing.md; playbook refine; ENV-2; mode Operate; polish light; motion none`
- **Verification:**
  - **Falsifier:** render three items: private link with a description, public file with no description, untagged link.
    - Exactly one `evidence-private-tag`, on row 1.
    - Every row's anchor keeps `href`, `target="_blank"` and `rel`.
    - Exactly one `evidence-description` (row 1, text equal).
    - Mutation "tag when `!is_public`" also tags the untagged row → red. Assert the count is exactly 1.
  - **Red run:** static reading: `result-review-drawer.component.html:598-611` has no tag or description markup. The count-1 assertion fails with 0 found; observe and quote.
  - **Disqualifier:** jsdom can't prove the pill is visible or unclipped. That is a **presence** assertion only. Layout (D9) is a gap routed to the `/akili-validate` HITL visual check at desktop and ≤640px. Never report it as covered by this test.
  - **Consumers:** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/result-review-drawer/result-review-drawer.component.spec.ts`. Grep `fields.evidence\|Evidence Links` over client specs and cypress → 0 other pins. New `data-testid`s have no existing readers.
- **Definition of done:**
  - [x] Tests green; mutation red observed; quoted.
  - [x] Client build green.
  - [x] The completion report names the playbook (`refine`), polish `light` and its result, and `finish review: not run (AKILI execute)`. The D9 gap is carried to validate.

### EVP-T-10 — Contract doc + change log

- **Type:** docs
- **Description:** Update `bilateral-result-summaries.en.md`:
  - the core-fields evidence row (`:109-113`), which also corrects the stale slim `evidences[]` wording (P-9; the slim list is the Fetcher's output);
  - the `POST /create` input `is_public` and its storage-link exception;
  - the rewrite rule (EVP-R-11);
  - a dated change-log entry for P2-4110, which states the partial reversal of the 2026-08-26 entry and the PRMS-first deploy order relative to the Fetcher.
- **Implements:** EVP-R-13
- **Files (expected):** `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`
- **Depends on:** T-4, T-5 · **Blocks:** —
- **Estimate:** S
- **Review:** checklist — doc against the shipped behaviour of T-4/T-5
- **Skills:** `api-design-principles`, `cognitive-doc-design`
- **Scope:** `Backend route: stack NestJS; api-contract lead api-design-principles support none — project conventions`
- **Verification:**
  - **Falsifier:** every behaviour claim in the new entry is checked against a T-4/T-5 test name. A claim with no test is a defect. Grep `2026-08-26` in the doc: the new entry references it.
  - **Red run:** n/a (no test gate).
  - **Disqualifier:** a claim needs to describe behaviour no test asserts. Add the test in T-4/T-5 or drop the claim.
  - **Consumers:** external producers and readers of the contract; the Fetcher maintainers (T-11).
- **Definition of done:**
  - [x] Entry dated, cites P2-4110 and the spec path, and is additive in wording.

### EVP-T-11 — Fetcher: accept, forward and return `is_public` *(repo `onecgiar_result_functions`)*

- **Type:** server (other repo)
- **Description:**
  - **Ingest:** in `services/fetcher/src/validator/schemas/common_fields.json`, the evidence item adds `is_public: { type: ["boolean","null"] }`, not required, with `additionalProperties: false` kept.
  - **Output:** `EvidencesMapper` (`mappers/response-result.mjs:428-443`) copies `is_public` (`?? null`).
  - **Docs:** update `docs/openapi.json` evidence examples and the `evidences` schema (`:2321`), and `services/api-docs/app/lib/types.ts:89`.
  - **Delivery:** a separate PR in that repo, deployed after the PRMS server PR.
- **Implements:** EVP-R-14 (both scenarios)
- **Files (expected):** the four files above, plus a new `services/fetcher/test/evidence-is-public.test.mjs` (pattern: `test/keep-editing.test.mjs`)
- **Depends on:** T-4, T-5 (deploy order) · **Blocks:** —
- **Estimate:** S
- **Review:** full — contract change in the ingestion gateway
- **Skills:** none mapped in this repo's Skill Map. Project conventions of `onecgiar_result_functions` (Node ESM, `node --test`)
- **Scope:** `Backend route: stack other; implement lead existing design support none — project conventions; test-suite lead the spec's scenarios support none — project conventions`
- **Verification:**
  - **Falsifier:**
    - Validate `[{link, description, is_public:false}]` → the object after validation still has `is_public: false`.
    - `is_public:"no"` → invalid with an error on `/0/is_public`.
    - An item without `is_public` → valid and unchanged.
    - Mapper over rows `false/true/null` → the same three values.
    - Mutation "drop the schema key" → the first assertion red (the value is stripped).
  - **Red run:** observed **B-5**: `valid: true after: [{"link":"https://cgiar.sharepoint.com/x","description":"Contract"}]`. The value is stripped.
  - **Disqualifier:** `npm ci` isn't possible in `services/fetcher` (deps absent locally today). Then the suite is not evidence: report inconclusive and rely on that repo's CI run on the PR, quoting it.
  - **Consumers:** `services/fetcher/test/openapi-docs.test.mjs` (pins `openapi.json`); `services/api-docs` (`types.ts:89`). Grep in that repo: `grep -rln "evidence" services/fetcher/test services/api-docs --include=*.mjs --include=*.ts`.
- **Definition of done:**
  - [ ] `npm test` in `services/fetcher` green, or the CI run is quoted; mutation red observed.
  - [ ] PR description states the deploy order and links P2-4110 and this spec.

## 4. Dependency graph

```
EVP-T-1 (migration) ─┬─ EVP-T-3 (shared endpoint) ── EVP-T-8 (centre form)
                     ├─ EVP-T-4 (API input) ───────┬─ EVP-T-10 (contract doc)
                     ├─ EVP-T-5 (bilateral reads) ─┤
                     └─ EVP-T-6 (review detail) ── EVP-T-9 (review drawer)
EVP-T-2 (resolver) ──┬─ EVP-T-5
                     ├─ EVP-T-6
                     └─ EVP-T-7 (AI mapper)
EVP-T-4 + EVP-T-5 ───── EVP-T-11 (Fetcher, other repo, deploys after PRMS)
```

Parallel-friendly branches: T-1 ∥ T-2. Then T-3 ∥ T-4 ∥ T-5 ∥ T-6 ∥ T-7. Then T-8 ∥ T-9 ∥ T-10 ∥ T-11.

## 5. Coverage closure (scenario and clause level)

| Requirement · scenario / clause | Owner |
|---|---|
| R-1 Mixed visibilities · "BUT must NOT change any other item" | T-2 (resolver per row), T-5 (five-row fixture) |
| R-1 Legacy item · "AND MUST render exactly as today" | T-2 (link/NULL row), T-7 (NULL link unchanged), T-9 (untagged: no tag) |
| R-2 Link without answer · disabled then enabled | T-8 (i) |
| R-2 Switching source · "BUT must NOT carry a file-only answer silently" | T-8 (iii) |
| R-2 Editing legacy untagged · "MUST require one" | T-8 (v) load + (i) validity |
| R-3 Round trip · lock + clickable | T-3 (persist), T-8 (v) |
| R-4 API private storage accepted | T-4 |
| R-4 API untagged storage refused · "MUST be refused before the first write" | T-4 (DTO-level refusal precedes `create`, B-1 ordering kept) |
| R-4 Form Yes/No · "BUT when No MUST clear and enable" | T-8 (ii) |
| R-5 Untagged accepted · same status and stored evidence | T-4 (writer `null`; B-1 green unchanged) |
| R-5 Wrong type | T-4 (`"no"` case) |
| R-6 Query after create · additive | T-5 |
| R-7 Private item · "BUT must NOT hide/disable/proxy/rewrite" | T-9 (anchor attributes on every row) |
| R-7 Private file item | T-6 (file `is_public_file` 0 → false), T-9 |
| R-8 Description shown; no empty line | T-6 (data), T-9 (exactly one description element) |
| R-9 Tooltip/accessible text | T-9 |
| R-10 Private link withheld · "AND description still sent" | T-7 |
| R-11 Resubmission untagged · "AND MUST be documented" | T-4 (writer), T-10 (doc) |
| R-12 Pool link save · "AND pool UI renders as before" | T-3 (b), T-8 (pool suites listed as regression set) |
| R-13 Contract doc · "MUST state partial reversal" | T-10 |
| R-14 Through the Fetcher · "BUT must NOT strip it" | T-11 |
| R-14 Fetcher output | T-11 |
| NFR Security: no private link in new log lines | T-3, T-4 Reviewer check (diff adds no logger call carrying `link`) |
| NFR Performance: one query | T-6 |
| NFR Accessibility: text, not icon alone | T-9 |
| NFR Data: nullable, reversible | T-1 |

## 6. Rollout & verification

- **Two PRs in `onecgiar_pr`:** **PR 1 server** (T-1…T-7, T-10, ~430 LOC incl. tests) → **PR 2 client** (T-8, T-9, ~300 LOC). Then **PR 3** in `onecgiar_result_functions` (T-11, ~50 LOC).
- **Deploy order:** PR 1 → PR 2 and PR 3 (any order after PR 1).
- CI green: lint, Jest, build, `migration:check:ci`, SonarCloud.
- `/akili-validate` HITL:
  - D9 visual check of the drawer pill at desktop and ≤640px;
  - settle P-16 (Results Dashboard) with the PO/BA;
  - manual round trip on TEST with a private SharePoint link through the API and through the form.
- Notify bilateral producers and consumers with a pointer to the change-log entry.

## 7. Cleanup & follow-ups

- Follow-up candidate: stop logging evidence links in `evidences.service.ts:312`.
- Follow-up candidate: the visibility question for admin-added drawer links (OQ-3).
- ~~Follow-up candidate: link withholding on `getAIContext` (EVP-DD-8).~~ Done at validate 2026-11-20 for bilateral results (F-3).

## 8. Roll-back plan

1. Revert PR 3 (Fetcher) first, so `is_public` is stripped again before PRMS.
2. Revert PR 2, then PR 1.
3. `npm run migration:revert` for `EVP-AddEvidenceIsPublic`. Tags are lost and every link reads public, which is pre-change behaviour.
4. Verify that `GET /api/bilateral/results` rows match the pre-change key set.
5. Notify producers: storage links are refused again whatever the tag.

## Cross-references

`requirements.md` · `design.md` · `docs/prd.md` (AC-4, AC-6) · `docs/ux-ui/design.md` §7 · `docs/trd/trd.md` (`results/evidences`, `bilateral`) · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`

# Tasks — Discard several AI draft results at once (`ABD`)

## 1. Scope

| Field | Value |
|---|---|
| Linked spec | `requirements.md` + `design.md` (this folder) |
| Depth | Standard |
| Approval Mode | gated |
| Status | draft — awaiting owner review |
| Budget | 4 tasks · ~520 LOC · ≤ 2 review rounds per task (design.md §1) |
| Branch | from `staging` |
| PR strategy | ~520 LOC > 400 → **2 PRs**: PR 1 server (T-1), PR 2 client (T-2, T-3, T-4). PR 2 description: review the component selection effect first, then the template; server out of scope |

## 2. Pre-flight

- [ ] Owner reviewed requirements / design / tasks (2026-10-27 parallel run collapsed the phase pauses).
- [ ] ABD-OQ-1..3 defaults accepted or changed (requirements §9).
- [x] ABD-OQ-3 SQL check run by the owner (max drafts per job) — query in the specify report, not in a file. Result 2026-10-27 (prod): max 36, avg 9.6, 8 jobs → cap 100 kept.
- [ ] No in-flight spec touching `my-draft-results` or `bilateral-ai` service.

## 3. Tasks

### ABD-T-1 — Bulk discard endpoint + transactional single discard (server)

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | M (~80 prod + ~140 spec LOC) |
| Depends on | — |
| Tier / effort | T2 Coder · `high` (auth + data writes) |
| Requirements | ABD-R-5 (S-5.1 … S-5.5), ABD-R-8 (S-8.1), ABD-NFR-4, NFR-5 |
| Design | §5, §6, §7, DD-1 … DD-4, DD-8 |
| Skills | `nestjs-expert`, `api-design-principles`, `error-handling-patterns`, `tdd` |
| Files | `onecgiar-pr-server/src/api/bilateral-ai/{bilateral-ai.controller.ts, bilateral-ai.controller.spec.ts, services/bilateral-ai.service.ts, services/bilateral-ai.service.spec.ts, dto/discard-bilateral-ai-drafts.dto.ts, dto/discard-bilateral-ai-drafts.dto.spec.ts}` |

**Scope**
1. DTO with `class-validator` rules (design §6).
2. Private `discardOne` with `getDraftRaw(…,'act')` + one transaction for both writes.
3. `discardDraft` delegates to `discardOne`; response unchanged.
4. `discardDrafts`: dedupe, sequential loop, per-id try/catch, error → reason mapping, one summary log line.
5. Controller `@Post('drafts/discard')` + Swagger.

**Clause ownership**

| Clause | Test |
|---|---|
| S-5.1 all succeed, both writes | service spec: 3 ids → 3 in `discarded`, transactional manager `update` called for draft and result per id |
| S-5.2 partial; **MUST NOT roll back successes**; **MUST NOT change other center** | ids: 2 ok, 1 `getDraftRaw` throws NotFound, 1 throws Forbidden → `discarded` 2, `failed` with reasons; no update call for the failing ids |
| S-5.3 atomic per draft | spec: result update rejects inside the transaction → that id in `failed` with `error`, and the draft update was issued on the **transactional** manager (not the root repository), so the rollback covers it |
| S-5.4 empty / non-int / >100 → 400; duplicates once | DTO spec (validation errors) + service spec (`[5,5]` → one `discardOne`) |
| S-5.5 admin not entitled | entitlement mock rejects → all `forbidden` |
| S-8.1 single discard contract unchanged, atomic | existing single-discard spec still green unchanged except asserting the transactional path |

**Verification**
```bash
cd onecgiar-pr-server
npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --findRelatedTests src/api/bilateral-ai/services/bilateral-ai.service.ts src/api/bilateral-ai/bilateral-ai.controller.ts src/api/bilateral-ai/dto/discard-bilateral-ai-drafts.dto.ts
npx eslint src/api/bilateral-ai --quiet
```

**What would make the check fail**
- Using `this.draftRepository.update` outside the transaction → S-5.3 spec (asserts the transactional manager) red.
- `Promise.all` with one throw aborting the batch, or a batch-wide transaction → S-5.2 red.
- Missing `ArrayMaxSize` → 101-id DTO spec red.

**Disqualifiers**
- A mock-only spec cannot prove MySQL actually rolls back; it proves both writes go through one transactional manager. Real atomicity is verified once on PRTest/local with a forced failure only if the owner asks — otherwise recorded as accepted gap.
- If any existing `bilateral-ai` spec has to change beyond the transactional mock for `discardDraft`, stop and report (behavior change outside scope).

**Done when** all clause tests green, related specs green, lint clean, no migration, diff limited to the listed files. No commit without explicit user go-ahead.

### ABD-T-2 — Client API + `BilateralAiService.discardDrafts`

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | S (~45 prod + ~80 spec LOC) |
| Depends on | ABD-T-1 (contract) — can be written in parallel against the design §6 contract |
| Tier / effort | T2 · `medium` |
| Requirements | ABD-R-6 (S-6.1 … S-6.3 service side), ABD-NFR-1 |
| Design | §8.3, §9, DD-1 |
| Skills | `angular-developer`, `error-handling-patterns`, `tdd` |
| Files | `onecgiar-pr-client/src/app/shared/services/api/bilateral-api.service{,.spec}.ts`, `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-ai.service{,.spec}.ts`, `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-ai.interfaces.ts` |

**Clause ownership**

| Clause | Test |
|---|---|
| NFR-1 one request | API spec: one `POST` to `…/center/ai/drafts/discard` with body `{ draftIds }` |
| S-6.1 success removes, **MUST NOT navigate** | service spec: `draftList()` loses ids; `router.navigate*` not called |
| S-6.2 partial → failed restored | service spec: response `failed:[{id:7}]` → id 7 back in `draftList()` |
| S-6.3 request error → snapshot restored, one error toast | service spec with `throwError` |
| `currentDraft` cleared only if discarded | service spec |

**Verification**
```bash
cd onecgiar-pr-client
npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --findRelatedTests src/app/shared/services/api/bilateral-api.service.ts src/app/pages/bilateral/services/bilateral-ai.service.ts
npx eslint src/app/shared/services/api/bilateral-api.service.ts src/app/pages/bilateral/services --quiet
```

**What would make the check fail**: reusing `discardDraft` in a loop (N requests) → NFR-1 red; navigating after success → S-6.1 red; ignoring `failed` → S-6.2 red.
**Disqualifier**: `--findRelatedTests` must include consumers of `BilateralAiService` (draft detail, upload, page header). Any of them red = not done.
**Done when** clause tests + consumers green, lint clean.

### ABD-T-3 — Selection UI, action bar and bulk dialog on `my-draft-results`

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | M (~95 prod + ~140 spec LOC) |
| Depends on | ABD-T-2 |
| Tier / effort | T2 · `medium` |
| Requirements | ABD-R-1 (S-1.1 … 1.3), R-2 (S-2.1 … 2.3), R-3 (S-3.1, 3.2), R-4 (S-4.1, 4.2), R-6 (S-6.1 … 6.4 component side), R-7 (S-7.1), NFR-2, NFR-3, NFR-6 |
| Design | §8.1, §8.2, DD-5 … DD-7 |
| Skills | `angular-developer`, `spartan` (consult Spartan MCP for `hlm-checkbox` indeterminate), `tailwind-design-system`, `tdd` |
| Files | `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.{ts,html,spec.ts}` |

**Clause ownership**

| Clause | Test (DOM-driven: click the rendered checkbox / buttons, not component methods) |
|---|---|
| S-1.1 tick rows → count | 3 clicks → bar "3 selected" |
| S-1.2 non-member: no checkbox/bar; **Review MUST keep working** | `isCenterMember` false → no `hlm-checkbox`, Review button present and opens panel |
| S-1.3 accessible name with title | `aria-label` contains draft title (presence only; keyboard → manual) |
| S-2.1 card select-all; **MUST NOT select other cards** | two-card fixture |
| S-2.2 indeterminate; toggles only that card | 12/14 fixture |
| S-2.3 filtered; **hidden MUST NOT be selected** | project filter fixture hiding 4 |
| S-3.1 bar appears / Clear empties | DOM |
| S-3.2 **MUST NOT add a brand button** | count of brand-variant buttons unchanged when bar shows |
| S-4.1 one confirm → one call with ids | spy on `discardDrafts` called once with exact ids |
| S-4.2 cancel → no call, selection kept | DOM |
| S-6.1/6.2 selection after result (empty / failed kept) | service mock returns partial |
| S-6.4 **MUST disable** while in flight | pending observable → confirm disabled, second click no call |
| S-7.1 filter change clears; **MUST NOT include hidden** | select 5, change filter → bar gone; confirm path unreachable |
| NFR-6 `?job=` highlight still works | existing spec green unchanged |

**Verification**
```bash
cd onecgiar-pr-client
npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --findRelatedTests src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.ts
npx eslint src/app/pages/bilateral/pages/my-draft-results --quiet
```

**What would make the check fail**: select-all over `allDrafts()` instead of visible → S-2.3 red; selection not cleared on filter change → S-7.1 red; missing in-flight guard → S-6.4 red; clearing effect reading signals after an early return → S-7.1 red on second filter change.

**Disqualifiers**
- Tests that call `toggleRow()` / `toggleCard()` directly do not prove S-1/S-2; they must click the rendered checkbox.
- `aria-*` presence does not prove layout or keyboard use → manual check in T-4.
- If any existing `my-draft-results` spec had to change (other than adding the checkbox column to row-count assertions), stop and report.

**Done when** all clause tests green, existing specs green, lint clean, diff limited to the 3 files.

### ABD-T-4 — Folder docs + manual HITL check

| Field | Value |
|---|---|
| Status | `[~]` |
| Size | XS (~40 doc lines) |
| Depends on | ABD-T-3 |
| Tier / effort | T5 for docs (`low`); manual check by owner (T6 optional for screenshots) |
| Requirements | NFR-2, NFR-3 (manual layer), layout defect class (requirements §8) |
| Design | §8.2, §11 |
| Skills | `cognitive-doc-design` |
| Files | `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/CLAUDE.md` (contract: selection + bulk endpoint; close the "select several drafts" pending line; re-stamp `Verified:`), server `bilateral-ai` guide only if it lists endpoints |

**Manual check (HITL — no automated gate for layout)**
Local stack or PRTest, a center with ≥ 2 uploads: checkbox column does not squeeze the title column; header indeterminate visible; action bar sticky and not overlapping the last row; Tab/Space operate checkboxes and bar; focus ring visible. **Never confirm a discard on real drafts locally (shared prdb + prod mailer).** Confirm a bulk discard only on PRTest with throwaway drafts.

**What would make it fail**: horizontal scroll on the card table at 1280 px; bar covering rows; checkbox unreachable by Tab.
**Done when** CLAUDE.md updated in the same commit as T-3's files and the manual check is reported (pass, or screenshot of the issue).

## 4. Coverage closure (requirement → task)

| Requirement / clause | Task |
|---|---|
| R-1 S-1.1 … 1.3 | T-3 (T-4 manual for keyboard) |
| R-2 S-2.1 … 2.3 | T-3 |
| R-3 S-3.1, 3.2 | T-3 |
| R-4 S-4.1, 4.2 | T-3 |
| R-5 S-5.1 … 5.5 | T-1 |
| R-6 S-6.1 … 6.3 | T-2 (service) + T-3 (selection result) |
| R-6 S-6.4 | T-3 |
| R-7 S-7.1 | T-3 |
| R-8 S-8.1 | T-1 |
| NFR-1 | T-2 · NFR-2 T-3 + T-4 · NFR-3 T-3 + T-4 · NFR-4, NFR-5 T-1 · NFR-6 T-3 |

Graph: T-1 → T-2 → T-3 → T-4 (T-2 may start against the design contract in parallel with T-1). No cycles.

## 5. Estimated LOC & PR

~520 LOC (≈220 prod, ≈300 spec/doc). 2 PRs to `staging`: PR 1 server (T-1), PR 2 client + docs (T-2 … T-4), PR 2 linking PR 1.

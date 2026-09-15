# Tasks: Bilateral W3 Manual Create Drawer

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/manual-create-drawer/tasks.md` |
| **Requirements Reference** | [`requirements.md`](./requirements.md) |
| **Design Reference** | [`design.md`](./design.md) |
| **Judgment Reference** | [`judgment.md`](./judgment.md) |
| **Module / Sub-feature** | `bilateral` / `manual-create-drawer` |
| **Prefix** | `BIL-MCD` |
| **Status** | complete |
| **Budget** | 7 tasks · ~550 LOC production / ~650 LOC test · ≤ 2 review rounds |
| **Date** | 2026-09-14 |

---

## 1. Scope of this Task List

Deliver the W3 bilateral **Manual Entry** create flow as a right-side drawer with repository browse, title validation, RFUX footer, and additive `title` on `create-header`. AI-Assisted path on the same page must not regress. Bulk has no UI in v1.

---

## 2. Pre-Flight Checklist

- [ ] `requirements.md` approved (status `approved`).
- [ ] `design.md` approved (post–Judgment Day fixes applied).
- [ ] Open questions resolved: OQ-1 → **Set up result manually**; OQ-2 → close without confirm when pristine; OQ-3 → title after type selected.
- [ ] No conflicting in-flight spec editing `bilateral-result-creator` create path.
- [ ] Coordinate with AI workstream before merging `bilateral-result-creator.html`.

---

## 3. Task List

### `BIL-MCD-T-1` — Add optional `title` to `create-header` (server) [x]

- **Type:** server
- **Description:** Extend `CreateCenterResultDto` with optional `title`. Update `BilateralCenterService.createResultHeader` to persist trimmed client title on insert and skip `Bilateral Draft #${id}` rename when provided. Preserve draft-title behavior when `title` omitted. Add unit tests. Add change-log entry to `bilateral-result-summaries.en.md` (request shape only).
- **Implements:**
  - `BIL-MCD-R-6` — Scenario *Successful manual create* (THEN stored title MUST match validated drawer title; THEN client sends `title`)
  - `BIL-MCD-R-6` — Scenario *Non-KP create without handle* (THEN no handle; summaries unchanged)
  - `BIL-MCD-AC-3` (server half — title persisted)
  - DC-4
- **Design References:** `design.md` §5, §6, `BIL-MCD-DD-3`
- **Files (expected):**
  - `onecgiar-pr-server/src/api/bilateral/dto/create-center-result.dto.ts`
  - `onecgiar-pr-server/src/api/bilateral/services/bilateral-center.service.ts`
  - `onecgiar-pr-server/src/api/bilateral/services/bilateral-center.service.spec.ts`
  - `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`
- **Depends on:** —
- **Blocks:** `BIL-MCD-T-6`
- **Estimate:** S
- **Skills:** `nestjs-expert`, `api-design-principles`
- **Verification:**
  ```bash
  cd onecgiar-pr-server && npm run test -- --testPathPattern="bilateral-center.service.spec"
  ```
  - **Pass when:** new specs assert `title` persisted when sent; draft title when omitted; KP path still calls `populateKPFromCGSpace`.
  - **Disqualifier:** test passes only because mock never asserts `save` payload `title` field.
  - **Falsifier input:** POST body `{ title: 'My Result', result_level_id: 4, result_type_id: 8, ... }` without title in saved entity → must FAIL test.

---

### `BIL-MCD-T-2` — Create `bilateral-create-drawer` shell [x]

- **Type:** client
- **Description:** New standalone drawer component copying `indicator-drawer` chrome: scrim, top bar (title + close), context header (project + SP inputs), scrollable body slot, Escape/scrim close, body overflow lock, responsive width (100vw below 640px; default 760px; resize drag ≥640px), focus return via host-provided trigger ref.
- **Implements:**
  - `BIL-MCD-R-2` — Scenario *Drawer opens with context* (THEN top bar + close + Escape; AND context header; AND body scroll; AND scrim click closes)
  - `BIL-MCD-R-2` — Scenario *Responsive drawer width* (THEN full viewport below 640px; AND resize on desktop; AND IT MUST sticky footer reachable — verified via form in T-3)
  - `BIL-MCD-R-8` — Scenario *Keyboard and screen reader* (THEN Escape closes; AND focus returns; AND role/aria-label on drawer)
  - `BIL-MCD-AC-7` (class-level: `max-w-[100vw]` / width binding — layout fidelity at 375px remains HITL)
  - DC-1 (structure), DC-6 (partial), DC-7 (partial)
- **Design References:** `design.md` §7.1, `BIL-MCD-DD-1`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-create-drawer/*`
- **Depends on:** —
- **Blocks:** `BIL-MCD-T-6`
- **Estimate:** M
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npm run test -- --testPathPattern="bilateral-create-drawer.component.spec"
  ```
  - **Pass when:** specs cover open/close, Escape, scrim click, `document.body.style.overflow`, aria attributes, width at mobile breakpoint class.
  - **Disqualifier:** presence-only test for CSS class without asserting drawer host renders scrim + aside.
  - **Falsifier input:** remove `(keydown.escape)` handler → Escape test must FAIL.

---

### `BIL-MCD-T-3` — Create `bilateral-manual-create-form` (level, type, title, RFUX footer) [x]

- **Type:** client
- **Description:** Form component with `BilateralResultLevelSelectorComponent`, type dropdown from shared `RESULT_TYPES_BY_LEVEL` constant (extract to bilateral util), title textarea + 30-word gauge (`WordCounterService`), sticky RFUX footer (`missingFields`, disabled Create and continue). Title field shown after type selected (OQ-3). Level change resets type/KP state. Emit `create` payload when valid.
- **Implements:**
  - `BIL-MCD-R-3` — Scenario *Level and type selection* (THEN valid types per level; AND level change resets type/KP)
  - `BIL-MCD-R-3` — Scenario *Title required with word limit* (THEN required; AND 30-word gauge; AND create blocked when empty or >30 words)
  - `BIL-MCD-R-7` — Scenario *Missing fields chip* (THEN count + expandable list; AND primary disabled when `missingFields().length > 0`)
  - `BIL-MCD-R-7` — Scenario *Focus missing field* (THEN focus/scroll to title, level, type controls)
  - `BIL-MCD-AC-6`
  - DC-3 (partial — title/level/type)
- **Design References:** `design.md` §7.2 (level/type/title/footer), `BIL-MCD-DD-4` (partial)
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-manual-create-form/*`
  - `onecgiar-pr-client/src/app/pages/bilateral/shared/result-types-by-level.ts` (or equivalent util)
- **Depends on:** —
- **Blocks:** `BIL-MCD-T-4`, `BIL-MCD-T-5`, `BIL-MCD-T-6`
- **Estimate:** M
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npm run test -- --testPathPattern="bilateral-manual-create-form.component.spec"
  ```
  - **Pass when:** `missingFields` includes `Result title` / `Result title exceeds 30 words`; level 4 shows Output types only; footer disables create when missing.
  - **Disqualifier:** asserting `missingFields` array exists without checking label strings.
  - **Falsifier input:** 31-word title with `canCreate === true` → must FAIL.

---

### `BIL-MCD-T-4` — Wire title uniqueness gate and similar-results list [x]

- **Type:** client
- **Description:** Add debounced (500ms) `GET_checkTitleUniqueness` + `GET_depthSearch` to `bilateral-manual-create-form` using legacy-type mapping table from design §7.2. Signals: `blockingExactTitleFound`, `titleCheckFailed`, `loadingTitleCheck`, `depthSearchList`. Extend `missingFields` with `Result title already exists` and `Title check failed — retry`. Block create while check in flight. Surface non-blocking similar titles list.
- **Implements:**
  - `BIL-MCD-R-4` — Scenario *Exact duplicate blocks create* (THEN blocked; AND explicit error; AND missing-fields includes duplicate)
  - `BIL-MCD-R-4` — Scenario *Similar titles surfaced* (THEN list shown; AND create allowed when only similar)
  - `BIL-MCD-R-4` — Scenario *Title check in flight* (THEN blocked until complete; AND failed check MUST NOT silently pass)
  - `BIL-MCD-R-3` — Scenario *KP title from repository* (AND uniqueness gates apply to populated title — wired when title set from T-5)
  - `BIL-MCD-AC-4`
  - DC-3
- **Design References:** `design.md` §7.2 legacy mapping, `BIL-MCD-DD-4`, judgment JD-001/JD-006
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-manual-create-form/bilateral-manual-create-form.component.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-manual-create-form/bilateral-manual-create-form.component.spec.ts`
- **Depends on:** `BIL-MCD-T-3`
- **Blocks:** `BIL-MCD-T-6`
- **Estimate:** M
- **Skills:** `angular-developer`, `tdd`, `error-handling-patterns`
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npm run test -- --testPathPattern="bilateral-manual-create-form.component.spec"
  ```
  - **Pass when:** mock `GET_checkTitleUniqueness` → `isUnique: false` blocks create; gate error sets `titleCheckFailed`; depth search populates list without blocking; Policy Change maps to `Policy` legacy type in depth search call.
  - **Disqualifier:** test mocks uniqueness but never asserts `canCreate` false.
  - **Falsifier input:** `blockingExactTitleFound=true` with create emitted → must FAIL.

---

### `BIL-MCD-T-5` — Add KP Browse / Manual entry tabs to manual create form [x]

- **Type:** client
- **Description:** When `result_type_id === 6`, render Browse repositories / Manual entry tabs. Embed `KpCgspaceBrowseComponent` (CGSpace, MELSpace, WorldFish). Manual tab: handle input + Sync via `validateKpHandle` + `GET_mqapValidation`. On success: set handle, populate read-only title, trigger title uniqueness check. Remove bilateral-only `KP_HANDLE_REGEX` from creator (already deleted in T-6). Assert browse component wired with same inputs as `lab-report-form`.
- **Implements:**
  - `BIL-MCD-R-5` — Scenario *Browse repositories parity* (THEN `kp-cgspace-browse`; AND selection sets handle + title; AND stale-query behavior inherited)
  - `BIL-MCD-R-5` — Scenario *Manual handle entry* (THEN shared validator; AND sync populates title; AND create requires validated handle)
  - `BIL-MCD-R-3` — Scenario *KP title from repository* (THEN populate from metadata; AND read-only title field)
  - `BIL-MCD-AC-2`
  - DC-2
- **Design References:** `design.md` §7.2 KP block, `BIL-MCD-DD-6`, kaizen `changes/kp-cgspace-search-retry`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-manual-create-form/*`
- **Depends on:** `BIL-MCD-T-3`
- **Blocks:** `BIL-MCD-T-6`
- **Estimate:** M
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npm run test -- --testPathPattern="bilateral-manual-create-form.component.spec"
  ```
  - **Pass when:** template contains `app-kp-cgspace-browse`; item selection calls MQAP and sets title; invalid handle surfaces validator error; `missingFields` includes handle when KP unsynced.
  - **Disqualifier:** `toContain('app-kp-cgspace-browse')` as sole evidence — must also assert selection handler updates title signal.
  - **Falsifier input:** KP type with empty handle and create allowed → must FAIL.

---

### `BIL-MCD-T-6` — Integrate drawer into `bilateral-result-creator` + client create payload [x]

- **Type:** client
- **Description:** Remove inline `#bcr-level-section`. Add `#bcr-manual-cta` button **Set up result manually** (drawer stays closed on way select). Host drawer + form. On form `create`: seed `creationService.resultLevelId/resultTypeId`, call `createResult(..., title)`, preserve navigation/alerts. Close drawer on way change / success. Extend `BilateralCreationService.createResult` with `title?`. Rewrite creator specs (remove inline KP tests; add CTA/drawer/AI regression).
- **Implements:**
  - `BIL-MCD-R-1` — Scenario *Manual way selected* (THEN card selected; AND way cards visible; AND drawer closed until CTA; BUT NOT inline `#bcr-level-section`)
  - `BIL-MCD-R-1` — Scenario *Switch away from manual* (THEN drawer closes; AND state discarded)
  - `BIL-MCD-R-6` — Scenario *Successful manual create* (THEN `create-header` with title; AND navigation unchanged)
  - `BIL-MCD-R-6` — Scenario *Non-KP create without handle* (THEN no handle in body)
  - `BIL-MCD-R-8` — focus return to `#manualCta` (via drawer host wiring)
  - `BIL-MCD-R-9` — Scenario *AI path unchanged* (THEN `app-bilateral-ai-upload`; AND no manual drawer)
  - `BIL-MCD-R-9` — Scenario *Parallel merge safety* (manual in isolated `@if` + child components)
  - `BIL-MCD-AC-1`, `BIL-MCD-AC-3`, `BIL-MCD-AC-5`
  - DC-1, DC-5
- **Design References:** `design.md` §7.3, §7.4, `BIL-MCD-DD-2`, `BIL-MCD-DD-5`, judgment JD-002
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/*`
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-creation.service.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-creation.service.spec.ts` (if exists; else creator spec covers payload)
- **Depends on:** `BIL-MCD-T-1`, `BIL-MCD-T-2`, `BIL-MCD-T-4`, `BIL-MCD-T-5`
- **Blocks:** `BIL-MCD-T-7`
- **Estimate:** M
- **Skills:** `angular-developer`
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npm run test -- --testPathPattern="bilateral-result-creator.component.spec|bilateral-creation.service.spec"
  ```
  - **Pass when:** manual select does not open drawer until CTA click; AI branch still renders upload; create POST includes `title`; `#bcr-level-section` absent from template; way switch closes drawer.
  - **Disqualifier:** AI test passes because manual drawer never mounted in test — must explicitly select AI and assert upload visible.
  - **Falsifier input:** select Manual → drawer open without CTA click → must FAIL.

---

### `BIL-MCD-T-7` — i18n, module docs, and HITL verification checklist [x]

- **Type:** docs + client
- **Description:** Add i18n keys for CTA, drawer title, footer strings. Add/update `CLAUDE.md` for new components and creator wizard section. Execute HITL checklist for DC-6/DC-7 at 375px / 768px / 1280px and axe on drawer (record in task completion notes — not automated).
- **Implements:**
  - NFR i18n row
  - DC-6 (HITL substitute), DC-7 (axe HITL)
  - `BIL-MCD-AC-7` (human confirmation)
- **Design References:** `design.md` §8, §11 harness gaps, §13
- **Files (expected):**
  - `onecgiar-pr-client/src/app/internationalization/*`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-create-drawer/CLAUDE.md`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-manual-create-form/CLAUDE.md`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/CLAUDE.md` (wizard section)
- **Depends on:** `BIL-MCD-T-6`
- **Blocks:** —
- **Estimate:** S
- **Skills:** `angular-developer`, `cognitive-doc-design`
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npx ng lint --quiet
  ```
  - **Pass when:** lint green; i18n keys referenced in templates exist; HITL checklist attached to PR description or execution notes (responsive + axe).
  - **Disqualifier:** marking HITL done without recorded viewport checks.
  - **Falsifier input:** hardcoded English string in new footer without i18n key → lint/review must catch.

---

## 4. Dependency Graph

```text
BIL-MCD-T-1 (server title)
BIL-MCD-T-2 (drawer shell)     ─┐
BIL-MCD-T-3 (form core)        ─┼─► BIL-MCD-T-4 (title gate)
                                 ├─► BIL-MCD-T-5 (KP browse)
                                 └─► BIL-MCD-T-6 (creator integration) ──► BIL-MCD-T-7 (i18n + HITL)
```

**Parallel-safe after T-3:** `T-4` and `T-5` may run in parallel. `T-1` and `T-2` may start in parallel.

---

## 5. Test Plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| BIL-MCD-TEST-1 | unit (server) | R-6, AC-3, DC-4 | `bilateral-center.service.spec.ts` |
| BIL-MCD-TEST-2 | unit (client) | R-2, R-8, AC-7 partial | `bilateral-create-drawer.component.spec.ts` |
| BIL-MCD-TEST-3 | unit (client) | R-3, R-7, AC-6 | `bilateral-manual-create-form.component.spec.ts` |
| BIL-MCD-TEST-4 | unit (client) | R-4, AC-4 | `bilateral-manual-create-form.component.spec.ts` |
| BIL-MCD-TEST-5 | unit (client) | R-5, AC-2, DC-2 | `bilateral-manual-create-form.component.spec.ts` |
| BIL-MCD-TEST-6 | unit (client) | R-1, R-6, R-9, AC-1, AC-3, AC-5, DC-5 | `bilateral-result-creator.component.spec.ts` |
| BIL-MCD-TEST-7 | HITL (manual) | R-2 responsive, AC-7, DC-6, DC-7 | PR test plan / staging |

---

## 6. Scenario → Task Coverage Matrix

| Requirement / clause | Task |
|---|---|
| R-1 manual select, drawer closed, no inline | T-6 |
| R-1 switch way closes drawer | T-6 |
| R-2 drawer chrome + context | T-2, T-6 |
| R-2 responsive width | T-2 (+ HITL T-7) |
| R-3 level/type reset | T-3 |
| R-3 title required / 30 words | T-3 |
| R-3 KP title read-only | T-5 |
| R-4 duplicate blocks | T-4 |
| R-4 similar list non-blocking | T-4 |
| R-4 in-flight / fail-closed | T-4 |
| R-5 browse parity | T-5 |
| R-5 manual handle | T-5 |
| R-6 create + title persist | T-1, T-6 |
| R-6 non-KP no handle | T-6 |
| R-7 missing fields chip | T-3, T-4 |
| R-7 focus missing field | T-3 |
| R-8 Escape + focus return + aria | T-2, T-6 |
| R-9 AI unchanged + merge safety | T-6 |

---

## 7. PR Strategy Recommendation

**Two PRs** (~550 LOC crosses comfortable single-review size):

| PR | Tasks | Review first |
|---|---|---|
| **PR 1 — API** | T-1 | DTO + service spec + change log |
| **PR 2 — UI** | T-2 → T-3 → T-4 ∥ T-5 → T-6 → T-7 | Creator integration diff last; confirm AI branch untouched |

Chain PR 2 on PR 1. PR descriptions: lead with manual drawer happy path; call out AI coexistence and HITL responsive checklist.

---

## 8. Rollout & Verification

- [ ] Scoped tests green (commands in each task).
- [ ] `cd onecgiar-pr-server && npx eslint "{src,apps,libs,test}/**/*.ts" --quiet`
- [ ] `cd onecgiar-pr-client && npx ng lint --quiet`
- [ ] Manual QA: `/bilateral/:center/create` — Manual CTA → drawer → KP browse → create → editor title correct.
- [ ] Manual QA: AI-Assisted path still uploads.
- [ ] HITL: 375px / 768px / 1280px drawer usable (T-7).

---

## 9. Rollback Plan

1. Revert PR 2 (client), then PR 1 (server) if title field causes issues.
2. Omitted `title` in requests restores draft-title behavior (backwards compatible).
3. No migration to revert.

---

## 10. Recommended First Task

**`BIL-MCD-T-1`** — unblocks client title persistence and can merge independently while UI tasks proceed on T-2/T-3.

---

## 11. Estimated LOC

| Area | Production | Tests |
|---|---|---|
| Server (T-1) | ~40 | ~60 |
| Drawer shell (T-2) | ~150 | ~120 |
| Form core (T-3) | ~120 | ~150 |
| Title gate (T-4) | ~80 | ~100 |
| KP browse (T-5) | ~90 | ~110 |
| Creator integration (T-6) | ~70 | ~180 |
| i18n/docs (T-7) | ~20 | — |
| **Total** | **~570** | **~720** |

Slightly above design budget — acceptable tripwire; split T-4/T-5 if execution exceeds one session each.

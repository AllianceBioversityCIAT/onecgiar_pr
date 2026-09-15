# Design: Bilateral W3 Manual Create Drawer

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/manual-create-drawer/design.md` |
| **Requirements Reference** | [`requirements.md`](./requirements.md) |
| **Module / Sub-feature** | `bilateral` / `manual-create-drawer` |
| **Prefix** | `BIL-MCD` |
| **Status** | draft |
| **Budget** | **7 tasks · ~550 LOC production / ~650 LOC test · ≤ 2 review rounds** |
| **Date** | 2026-09-14 |

---

## 1. Executive Summary

Manual bilateral creation moves from an inline wizard block into a **bilateral-specific right drawer** that copies the `indicator-drawer` interaction model (scrim, resize, sticky footer, Escape) while hosting a new **`bilateral-manual-create-form`** for level, type, title, and KP browse/manual entry. The create page keeps project, SP, and reporting-way cards visible; opening the drawer requires an explicit CTA. **`POST api/bilateral/center/create-header`** gains an optional additive **`title`** field so validated titles persist at create time. Title uniqueness reuses the existing Results API pair (`GET_checkTitleUniqueness`, `GET_depthSearch`) with the same debounce/gating semantics as `report-result-form`. AI-Assisted remains a sibling `@if` branch in `bilateral-result-creator` with no functional change.

---

## 2. Architecture Overview

### 2.1 Where this lives

| Layer | Touchpoints |
|---|---|
| **Server** | `api/bilateral/dto/create-center-result.dto.ts`, `services/bilateral-center.service.ts` (`createResultHeader`), `bilateral-center.service.spec.ts`; change-log note in `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (request only — response/summary shapes unchanged). |
| **Client — new** | `pages/bilateral/components/bilateral-create-drawer/`, `pages/bilateral/components/bilateral-manual-create-form/` |
| **Client — modified** | `pages/bilateral/pages/bilateral-result-creator/`, `pages/bilateral/services/bilateral-creation.service.ts` |
| **Client — reused (import allowed)** | `kp-cgspace-browse`, `kp-handle.validator`, `kp-repositories.constants`, `WordCounterService`, `ResultsApiService` title/MQAP methods |
| **Client — reference only (no import)** | `indicator-drawer`, `lab-report-form`, `report-result-form` |

**Module boundary:** Do not import `pages/results/*`. Shared KP primitives under `pages/result-framework-reporting/shared/` and the AoW-hosted `kp-cgspace-browse` component (same import path as `lab-report-form`) are allowed.

### 2.2 Primary sequence — manual create

```text
[Center user on /bilateral/:acronym/create]
  │
  ├─ Select reporting project          (unchanged — page)
  ├─ Select primary Science Program    (unchanged — page)
  ├─ Select "Complete the Form Manually" card (unchanged — page; drawer stays closed)
  ├─ Click "Set up result manually"    (new CTA below cards)
  │
  └─ [bilateral-create-drawer opens]
        │
        ├─ Context header: project name + SP code (read-only from BilateralCreationService)
        ├─ [bilateral-manual-create-form body]
        │     ├─ Result level cards
        │     ├─ Result type dropdown
        │     ├─ Result title (+ word gauge; KP: read-only after sync)
        │     ├─ Title uniqueness gate + similar-results list
        │     └─ (if type=KP) Browse | Manual tabs → kp-cgspace-browse + handle sync
        │
        └─ Footer: missing-fields chip + "Create and continue"
              │
              └─ BilateralCreationService.createResult(level, type, handle?, title)
                    └─ POST api/bilateral/center/create-header
                          ├─ non-KP: title from DTO stored on Result row
                          ├─ KP: handle → populateKPFromCGSpace (title from repository; client title gate already ran)
                          └─ navigate to /bilateral/:center/result/:id (unchanged)
```

### 2.3 Secondary sequence — AI path (unchanged)

```text
Select "AI-Assisted" → app-bilateral-ai-upload renders → manual drawer never mounts
```

---

## 3. Extended Directory Structure

```text
onecgiar-pr-client/src/app/pages/bilateral/
├── components/
│   ├── bilateral-create-drawer/          # NEW — shell (scrim, header, resize, footer slot)
│   │   ├── bilateral-create-drawer.component.ts|html|scss|spec.ts
│   │   └── CLAUDE.md
│   └── bilateral-manual-create-form/     # NEW — identity fields + validation
│       ├── bilateral-manual-create-form.component.ts|html|scss|spec.ts
│       └── CLAUDE.md
├── pages/bilateral-result-creator/       # MOD — CTA, drawer host, remove inline block
└── services/bilateral-creation.service.ts # MOD — createResult(..., title?)

onecgiar-pr-server/src/api/bilateral/
├── dto/create-center-result.dto.ts       # MOD — optional title
└── services/bilateral-center.service.ts  # MOD — use dto.title when present
```

---

## 4. Data Model Changes

**No migration.** The `Result.title` column already exists. This spec only changes which value is written at `create-header` time.

| Entity | Change |
|---|---|
| `Result` | No schema change. Non-KP: `title = dto.title` (trimmed). KP: initial insert may use `dto.title` briefly; `populateKPFromCGSpace` overwrites with repository metadata (existing behavior). |

---

## 5. API Design

### 5.1 Changed endpoint

| Field | Value |
|---|---|
| **Method + path** | `POST /api/bilateral/center/create-header` |
| **Auth** | JWT required (unchanged) |
| **Change type** | **Additive** request field |

**Request DTO — new optional field**

| Field | Type | Rules |
|---|---|---|
| `title` | `string` | Optional. When present: `@IsString()`, `@IsNotEmpty()` after trim, max length aligned with platform title rules (server trims; word count enforced client-side). |

**Server behavior (`createResultHeader`)**

- When `dto.title?.trim()` is provided: use it for the initial `save` and skip the `Bilateral Draft #${id}` rename update (or set both steps to the provided title).
- When omitted: preserve current draft-title behavior for backwards compatibility.
- KP path unchanged: after insert, `populateKPFromCGSpace` still runs and sets title/description from MQAP/CGSpace.

**Response** — unchanged (`id`, `result_code`, `lead_center_resolved`, etc.).

**Bilateral summaries contract** — unchanged (`AC-4`). Document additive request field in change log only.

---

## 6. Backend Module Design

### 6.1 `CreateCenterResultDto`

Add optional `title` with Swagger `@ApiPropertyOptional` and `class-validator` decorators.

### 6.2 `BilateralCenterService.createResultHeader`

- After validation, derive `resolvedTitle = dto.title?.trim() || \`Bilateral Draft ${Date.now()}\``.
- On `resultRepository.save`, set `title: resolvedTitle`.
- If no client title: keep existing post-save update to `Bilateral Draft #${id}` for traceability.
- If client title provided: omit the draft rename (final title is user-facing immediately).

### 6.3 Tests

- Unit test: create with `title` → persisted title matches input.
- Unit test: create without `title` → draft title behavior unchanged.
- Unit test: KP create with title + handle → `populateKPFromCGSpace` still invoked.

---

## 7. Frontend / UX Component Architecture

### 7.1 `bilateral-create-drawer` (shell)

**Responsibility:** Presentation chrome only — no business rules.

| Concern | Approach |
|---|---|
| Layout | Copy `indicator-drawer` structure: fixed right `aside`, scrim, top bar (icon + "Set up bilateral result" + close), context header slot, scrollable body wrapping the form (form owns its own sticky footer inside the scroll column — same as `lab-report-form` inside `indicator-drawer`) |
| Width | Default **760px** desktop; min **520px**; max **min(900px, 100vw)**; full width below **640px** (`width: 100vw`) |
| Resize | Left-edge drag handle (optional v1: fixed width on mobile, resize on ≥640px) — mirror `indicator-drawer` mousedown/move/up handlers |
| Scroll lock | Toggle `document.body.style.overflow = 'hidden'` while open; restore on destroy |
| A11y | `role="complementary"`, `aria-label`, Escape → `closed` output, return focus to CTA trigger element |
| Inputs | `projectLabel`, `programCode`, `programName`, `open` (or host uses `@if`) |
| Outputs | `closed`, optional `widthChange` |
| Focus return | Host passes `#manualCta` `TemplateRef` or `ElementRef` to drawer; on close, restore focus to CTA button (BIL-MCD-R-8) |

**Design tokens:** `var(--pr-border)`, `var(--pr-surface-card)`, `var(--pr-color-primary-300)` — no new hex literals (kaizen `KZ-BOR-1`).

### 7.2 `bilateral-manual-create-form` (body)

**Responsibility:** All manual identity state, validation, and create payload assembly.

| Section | Behavior |
|---|---|
| **Level** | Reuse `BilateralResultLevelSelectorComponent` or inline the same two-card pattern inside the form (prefer **import existing selector** to avoid duplication) |
| **Type** | Dropdown with `RESULT_TYPES_BY_LEVEL` map (move constant to shared bilateral util or import from creator — single source in `bilateral-manual-create-form`; creator drops local duplicate) |
| **Title** | Textarea with word gauge via `WordCounterService`; max 30 words; required for all types |
| **Title gate** | Copy `report-result-form` pattern: `titleSearch$` + 500ms debounce + `merge(gate$, similar$)`; signals: `blockingExactTitleFound`, `titleCheckFailed`, `loadingTitleCheck`, `depthSearchList` |
| **Legacy type for depth search** | `GET_depthSearch(title, legacyType)` expects a **legacy string**, not an ID. Derive labels from `RESULT_TYPES_BY_LEVEL` + level cards (`Outcome` / `Output`), then call a local `getLegacyType(typeLabel, levelLabel)` copied from `report-result-form`. See mapping table below (JD-001). |
| **KP block** | When `result_type_id === 6`: tabs **Browse repositories** / **Manual entry**; `kpBrowseEnabled = true`; repositories CGSpace, MELSpace, WorldFish |
| **Browse selection** | `onCgspaceItemSelected` flow from `lab-report-form`: validate handle → MQAP → set handle + title signals |
| **Manual entry** | Text input + Sync button; `validateKpHandle` from shared validator; MQAP for title preview |
| **Footer contract** | `missingFields()` computed (RFUX labels), `canCreate()` computed, `showValidationErrors` signal on submit attempt. **Footer markup lives inside this component** (not the drawer shell — JD-004). Required missing-field labels include: `Result title`, `Result title exceeds 30 words`, `Result title already exists` (when `blockingExactTitleFound`), `Title check failed — retry` (when `titleCheckFailed`), `Result level`, `Result type`, `Repository link/handle` (KP), plus KP sync-not-complete when handle unset |
| **Outputs** | `create` emits `{ levelId, typeId, title, handle? }` when valid |

**KP title read-only:** After successful MQAP sync, title field disabled with populated value; uniqueness check runs on that value.

**Legacy type mapping (JD-001)**

| `result_type_id` | Type label (from map) | Level label | `legacyType` for `GET_depthSearch` |
|---|---|---|---|
| 1 | Policy Change | Outcome | `Policy` |
| 2 | Innovation Use | Outcome | `''` (empty — no legacy bucket) |
| 4 | Other Outcome | Outcome | `OICR` |
| 5 | Capacity Sharing for Development | Output | `OICR` |
| 6 | Knowledge Product | Output | `''` |
| 7 | Innovation Development | Output | `Innovation` |
| 8 | Other Output | Output | `OICR` |

Level `Impact` is unreachable in the bilateral wizard (only levels 3/4).

### 7.3 `bilateral-result-creator` integration

| Change | Detail |
|---|---|
| Remove | Entire `#bcr-level-section` inline block (level, type, KP handle, Next button) |
| Add | `#bcr-manual-cta` — visible when `selectedReportingWay() === 'manual'` && drawer closed; primary button **Set up result manually** |
| Add | `@if (manualDrawerOpen()) { <app-bilateral-create-drawer … /> }` |
| State | `manualDrawerOpen = signal(false)`; open on CTA; close on drawer `closed`, way change, or successful create |
| Way change | `onReportingWaySelected`: if not manual → `manualDrawerOpen.set(false)`; scroll to `#bcr-manual-cta` or `#bcr-ai-upload` instead of `#bcr-level-section` |
| Create handler | On form `create` event: (1) `creationService.resultLevelId.set(levelId)` and `creationService.resultTypeId.set(typeId)` **before** navigation — same obligation as today's `onLevelSelected` / `onTypeSelected` (JD-002); (2) call `creationService.createResult(level, type, handle?, title)`; (3) preserve existing navigation/alerts |
| Cleanup | Remove creator-local `kpHandle`, `kpSyncedTitle`, `KP_HANDLE_REGEX`, `syncKpHandle`, `canCreate` (live in form) |
| AI branch | `#bcr-ai-upload` block untouched |

**Merge coordination (AI workstream):** Manual UI confined to `@if (selectedReportingWay() === 'manual')` block + new drawer components. AI edits should touch `#bcr-ai-upload` and shared header only.

### 7.4 `BilateralCreationService.createResult`

Extend signature: `createResult(resultLevelId, resultTypeId, handle?: string, title?: string)`.

When `title?.trim()`, include in POST body.

---

## 8. Shared Contracts & Package Extensions

| Contract | Action |
|---|---|
| `CreateCenterResultDto` | +optional `title` |
| `BilateralCreationService.createResult` | +optional `title` param |
| `bilateral-result-summaries.en.md` | Change-log entry: create-header accepts optional `title` |
| i18n | New strings under `src/app/internationalization/` for drawer title, CTA, footer labels |

No changes to bilateral **export** payloads or platform-report surfaces.

---

## 9. Design Decisions

### BIL-MCD-DD-1 — Bilateral drawer shell instead of reusing `indicator-drawer`

- **Context:** `indicator-drawer` is indicator/ToC-centric (tabs, reported-results table, `LabReportFormComponent` host).
- **Decision:** New `bilateral-create-drawer` copying shell patterns only.
- **Alternatives:** (A) Extend `indicator-drawer` with a `mode='bilateral'` flag — rejected: high coupling, wrong tab model. (B) Inline browse on page without drawer — rejected: user requirement.
- **Consequences:** ~150 LOC shell duplication; future extraction to `shared/components/pr-drawer` is optional follow-up.

### BIL-MCD-DD-2 — Explicit CTA; no auto-open

- **Context:** User confirmed reporting-way cards must stay selectable without forcing drawer open.
- **Decision:** Show **Set up result manually** button after manual card selection; drawer opens only on click.
- **Alternatives:** Auto-open on manual select — rejected per UX confirmation.
- **Consequences:** One extra click; clearer mental model when switching AI ↔ Manual.

### BIL-MCD-DD-3 — Additive `title` on create-header (not post-create PATCH)

- **Context:** Requirements demand persisted title at create; current server writes `Bilateral Draft #id`.
- **Decision:** Optional `title` on DTO; server writes it on insert.
- **Alternatives:** PATCH `general-info` immediately after create — rejected: two round trips, race with navigation/hydration, harder to test atomically.
- **Consequences:** Minimal server change; backwards compatible; kaizen: any future create flows should send title here.

### BIL-MCD-DD-4 — Title uniqueness logic copied into bilateral form (no shared service v1)

- **Context:** `report-result-form` has complete gate + similar-results merge logic; `lab-report-form` lacks uniqueness checks.
- **Decision:** Copy the private `searchResultsWithTitleUniqueness` / debounce pattern into `bilateral-manual-create-form` (same API calls, same fail-closed on gate error).
- **Alternatives:** Extract `TitleUniquenessService` to `shared/` — deferred: cross-feature refactor out of scope.
- **Consequences:** ~80 LOC duplication; follow-up spec can DRY if a third consumer appears.

### BIL-MCD-DD-5 — Remove inline manual block (reversion challenge)

- **Context:** `#bcr-level-section` is the shipped manual path today.
- **Reversion challenge — what does removing it break?**
  - Jest specs targeting `#bcr-level-section`, `syncKpHandle`, inline `canCreate` — **must rewrite** against drawer/form.
  - `onReportingWaySelected('manual')` scroll target `#bcr-level-section` — **must retarget** `#bcr-manual-cta`.
  - Users mid-flow on old URL without refresh — none (deploy-time swap; no persisted wizard state).
  - Deep links — none exist to inline section.
- **Mitigation:** Keep `BilateralResultLevelSelectorComponent`; preserve `createResult()` navigation/alerts verbatim in creator host handler.

### BIL-MCD-DD-6 — Import `kp-cgspace-browse` from AoW path (same as lab-report-form)

- **Context:** Component lives under `entity-aow/.../kp-cgspace-browse`, not under `pages/results/`.
- **Decision:** Same import path as `lab-report-form.component.ts`.
- **Alternatives:** Move component to `shared/` — rejected: out of scope, large diff.
- **Consequences:** Deep import path; acceptable per existing precedent.

---

## 10. Security, Performance, Observability

| Dimension | Plan |
|---|---|
| **Security** | JWT unchanged; no new secrets; title/handle not logged (`.cursorrules`). |
| **Performance** | Title debounce 500ms; drawer CSS transitions only; no new backend queries except existing title APIs. |
| **Observability** | No new metrics; existing create-header logging sufficient. |

---

## 11. Testing Strategy (forward-looking)

| Area | Tests |
|---|---|
| Server | `bilateral-center.service.spec.ts` — title persisted / omitted |
| Drawer shell | Open/close, Escape, body overflow lock, responsive width class |
| Manual form | `missingFields`, title word limit, blocking duplicate, KP browse selection, handle validation |
| Creator integration | Manual CTA visible, drawer not auto-open, AI branch regression, successful create navigation |
| Kaizen | Stale-query cancellation inherited from `kp-cgspace-browse` — smoke assertion that component is wired with same inputs as lab-report-form |

**Harness gaps:** Layout at 375px — manual HITL per `BIL-MCD-R-2` / DC-6.

---

## 12. Backwards Compatibility & Rollout

- **API:** Additive request field only; old clients unaffected.
- **Feature flag:** None — manual path replaces inline UX on deploy.
- **Rollback:** Revert client + server together if title field causes issues; draft titles remain fallback when `title` omitted.

---

## 13. Open Gaps & Follow-ups

| Item | Disposition |
|---|---|
| Drawer close with dirty fields — confirm dialog | v1: close without confirm (OQ-2 default) |
| Extract `pr-drawer` / `TitleUniquenessService` | Deferred follow-up |
| Bulk import card | Out of scope; `selectedReportingWay` type allows `'bulk'` but UI selector only emits `ai` \| `manual` — no drawer interaction in v1 (JD-005) |
| Server title word-count | Accepted risk: 30-word limit enforced client-side only; direct API callers could bypass — same as W1/W2 create flows (JD-007) |
| Cypress E2E | Deferred unless requested in tasks |

---

## 14. Requirement Traceability

| Requirement | Design section |
|---|---|
| BIL-MCD-R-1 | §7.3 CTA, no auto-open |
| BIL-MCD-R-2 | §7.1 drawer shell + context header |
| BIL-MCD-R-3 | §7.2 level/type/title |
| BIL-MCD-R-4 | §7.2 title gate |
| BIL-MCD-R-5 | §7.2 KP browse/manual |
| BIL-MCD-R-6 | §5 API + §7.4 service |
| BIL-MCD-R-7 | §7.2 missingFields footer |
| BIL-MCD-R-8 | §7.1 a11y |
| BIL-MCD-R-9 | §2.2 secondary sequence + §7.3 AI branch |

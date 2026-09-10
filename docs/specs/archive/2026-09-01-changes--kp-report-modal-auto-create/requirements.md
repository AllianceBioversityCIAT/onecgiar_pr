# Requirements — KP Report Modal Auto-Create

**Depth:** Standard (Change Mode). Bounded Angular client-only change; no server changes, no database migration, no new API endpoints.

**Revised after Judgment Day 2026-08-31** (`judgment.md`): primary surface is the Reporting-tab **aside** (`LabReportFormComponent`), not the legacy `AowHloCreateModalComponent`.

## 1. Module / Feature

- **Module:** `changes/kp-report-modal-auto-create` (client-only — `dashboard-lab/lab-report-form` + `shared/report-result`)
- **Sub-feature:** Knowledge Product selection auto-creation & fixed contribution value in the Report aside
- **Owner:** Results & Reporting Team
- **Status:** approved
- **Ticket(s):** Chat requirement (2026-08-31); Judgment Day Option A
- **Module Code Prefix:** `KPAC`

---

## 2. Context

On `/result-framework-reporting/entity-details/:code?tocView=aows`, the Reporting-tab **Report** button opens the indicator drawer and mounts `LabReportFormComponent` (`onReportingRowReport` → `manageIndicator(..., 'report')`). It does **not** open `AowHloCreateModalComponent`.

**Current friction (screenshots, 2026-08-31):** after a KP item is selected and MQAP metadata retrieved:

1. `contribution_to_indicator_target` is `null`. The number field’s placeholder is `"0"`, so it *looks* like 0.
2. `missingFields()` still lists “Contribution to indicator target”.
3. The sticky footer shows **“1 field left before you can create”**.
4. The user must type `1` and click **Create and continue**.

For Knowledge Products, one KP equals exactly one unit. This change removes both interactions.

**References:** `docs/prd.md` G1 (submission friction), G2 (data quality). `docs/ux-ui/design.md` §1 “Structure beats freedom”.

---

## 3. In Scope / Out of Scope

### In scope

- **`lab-report-form.component.ts`**: After `resetForm()`, when `currentResultIsKnowledgeProduct()` is true, set `contribution_to_indicator_target` to `1`. On MQAP success in `onCgspaceItemSelected()` and `validateHandle()`, if KP: await the stored `preselectTocCenters()` promise, then call `createResult()`. `createResult()` remains gated by `canSave()` — contribution `1` + title + `mqapJson` must already be set so the call is not a silent no-op.
- **`lab-report-form.component.html`**: Disable the existing contribution `app-pr-input` when KP (`[disabled]="creatingResult() || currentResultIsKnowledgeProduct()"`). Field stays visible with value `1`. Do **not** add `[readonly]` — it is inert on `app-pr-input` when `[isStatic]="true"`.
- **`create-result-payload.util.ts`**: `contributing_indicator: resultTypeId === 6 ? 1 : options.body.contribution_to_indicator_target`.
- **Unit tests** in `lab-report-form.component.spec.ts` and `create-result-payload.util.spec.ts`.

### Out of scope

- Server-side changes (no NestJS, no schema migration, no DTO update).
- **`aow-hlo-create-modal`** (legacy `openLegacyReportModal` / entity-aow table). Other entry points keep today’s modal.
- **`guided-creation`** (third create surface; no MQAP / contribution field on the screenshot journey).
- Non-KP reporting flows.
- `pages/results/pages/result-creator/`.
- ToC preselection *internals* (only the return/await of `preselectTocCenters()`).
- MQAP regex / `kp-handle.validator` rules.

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| **Result Submitter (AoW Lead / PI)** | Reporting-tab KP: selecting a publication (browse or Sync) creates the result without typing contribution or clicking Create. |
| **QA Reviewer / PMU Coordinator** | KP results from this aside always carry `contributing_indicator = 1`. |

---

## 5. User Stories

- **`KPAC-US-1`** — As an AoW result submitter, when I press Report on a Knowledge Product KPI in the Reporting table, I want the result created as soon as I select a CGSpace item or sync a handle, so I do not fill a field that is always 1 or click Create and continue.
- **`KPAC-US-2`** — As a PMU coordinator, I want those KP results to record contribution target exactly 1, so portfolio KPI aggregations stay accurate.

---

## 6. Functional Requirements

### Required (MUST)

- **`KPAC-R-1` (Contribution auto-set to 1):** When `currentResultIsKnowledgeProduct()` is true or `resultTypeId === 6`, the aside MUST set `createResultBody.contribution_to_indicator_target` to `1` after every `resetForm()` / indicator arming. `buildCreateResultPayload()` MUST output `contributing_indicator: 1` for `resultTypeId === 6` regardless of the body value.

  #### Scenario: KP contribution is always 1

  - GIVEN the report aside opened for a "Number of knowledge products" KPI
  - WHEN the form arms (`resetForm` + effect)
  - THEN `createResultBody().contribution_to_indicator_target` equals `1`
  - AND `missingFields()` does **not** include “Contribution to indicator target”
  - AND the POST body field `contributing_indicator` equals `1`

- **`KPAC-R-2` (Field non-editable display):** The contribution `app-pr-input` MUST be `[disabled]` whenever `currentResultIsKnowledgeProduct()` is true. Visible value MUST be `1`. The field MUST remain in the DOM (not hidden).

  #### Scenario: Input is non-editable for KP

  - GIVEN a KP indicator is active in the aside
  - WHEN the user attempts to change the contribution input
  - THEN the field does not accept edits
  - AND displays value `1`

- **`KPAC-R-3` (Auto-create on CGSpace browse selection):** When the user selects a publication in Browse CGSpace and MQAP succeeds, if KP, the system MUST invoke `createResult()` only after contribution is `1`, title is set, `mqapJson` is set, and `preselectTocCenters()` has resolved — so `canSave()` is true.

  #### Scenario: Browse selection triggers auto-create

  - GIVEN the aside is open for a KP indicator on Browse CGSpace
  - WHEN the user selects a publication card
  - AND MQAP returns 200
  - THEN `POST_createResult` is dispatched with `contributing_indicator: 1`
  - AND the drawer closes and navigates to result detail
  - BUT `createResult()` MUST NOT be called while `canSave()` is false

- **`KPAC-R-4` (Auto-create on Manual Entry Sync success):** Same as R-3 on the Manual path. The hook is `validateHandle()` (not the modal’s `GET_mqapValidation()`).

  #### Scenario: Manual Sync triggers auto-create

  - GIVEN the aside is open for a KP indicator on Manual entry
  - WHEN the user enters a valid handle and clicks Sync
  - AND MQAP returns 200
  - THEN `POST_createResult` is dispatched with `contributing_indicator: 1`
  - BUT an invalid handle MUST NOT trigger creation (`validateKpHandle` already returns)

- **`KPAC-R-5` (Preselection timing gate):** Auto-create MUST await the `preselectTocCenters()` Promise started when the form armed, so `contributingCenters` is populated before POST.

  #### Scenario: Centers are in the payload on auto-create

  - GIVEN a KP item is selected while `centersSE.getData()` is still resolving
  - WHEN auto-create fires
  - THEN the POST payload `contributing_center` includes the ToC-derived centres
  - AND NOT an empty array caused by racing the Promise

- **`KPAC-R-6` (Non-KP isolation):** For `resultTypeId !== 6`, the aside MUST NOT auto-create, and MUST leave `contribution_to_indicator_target` user-editable (including `null` until the user types).

  #### Scenario: Non-KP flow is unaffected

  - GIVEN the aside is open for Innovation Development or Capacity Sharing
  - WHEN the user fills the form
  - THEN contribution is editable
  - AND no auto-create fires
  - AND the user MUST click “Create and continue”

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Backwards compatibility** | Non-KP workflows unchanged. Legacy modal unchanged. |
| **Data integrity** | `buildCreateResultPayload` forces `contributing_indicator: 1` for type 6 (aside POST path). |
| **Accessibility** | Disabled `app-pr-input` keeps its visible label (`docs/ux-ui/design.md` §10). Do not add a native extra control. |
| **UX feedback** | In-flight create uses the existing footer **Creating…** spinner (`creatingResult`). Selected-item card may also show `creatingResult` (same signal). Do not invent a second loading flag. |

### 7.1 Defect Classes & Verification Gates

| Defect Class | Catching Gate |
|---|---|
| `contributing_indicator !== 1` in KP POST body | `create-result-payload.util.spec.ts` (`KPAC-TEST-1`) |
| Auto-create fires before `preselectTocCenters` resolves | `lab-report-form.component.spec.ts` (`KPAC-TEST-2`) — deferred `getData`, not a pre-resolved mock |
| Browse selection fails to auto-create / silent `canSave` no-op | component spec (`KPAC-TEST-3`) — assert `POST_createResult` was called |
| Manual Sync fails to auto-create | component spec (`KPAC-TEST-4`) — same, via `validateHandle` |
| Non-KP flows accidentally auto-create | `KPAC-TEST-5` |
| Contribution still missing in `missingFields` for KP | `KPAC-TEST-6` |
| Visual disabled rendering of `app-pr-input` | **Human check at HITL** |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `KPAC-AC-1` | KP indicator in the Reporting aside | Form arms | `contribution_to_indicator_target = 1`; `missingFields` omits contribution; input disabled. |
| `KPAC-AC-2` | Non-KP indicator in the aside | Form arms | contribution is `null`; input editable; footer may still count it. |
| `KPAC-AC-3` | KP, Browse CGSpace | User selects a publication; MQAP succeeds | Result auto-created; navigate to result detail. |
| `KPAC-AC-4` | KP, Manual entry | Valid handle + Sync; MQAP succeeds | Result auto-created; navigate to result detail. |
| `KPAC-AC-5` | KP selected while `getData` in-flight | Auto-create fires | POST includes resolved ToC centres. |
| `KPAC-AC-6` (regression) | Non-KP form in progress | User fills form | No auto-create; user clicks Create and continue. |

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- `ApiService.resultsSE.GET_mqapValidation()` / `POST_createResult()`.
- `CentersService.getData()` — Promise; cached when `centersList` is already filled.
- `validateKpHandle()` — Manual + browse URL gate.
- Host passes `canReport` true (Reporting-tab already does via `canReportResults()`).

### Assumptions

- Science-program preselect runs inside `GET_AllInitiatives` subscribe and is not awaited (accepted risk; same as today on a slow network).
- `showsInnovationLink()` is false for type 6.
- `kpBrowseEnabled` is `true` in the working tree (browse path is live).

---

## 10. Open Questions (all closed)

- **`KPAC-OQ-1`** Hide or read-only? → **Visible + disabled**, value 1.
- **`KPAC-OQ-2`** Both tabs? → **Yes** (`onCgspaceItemSelected` and `validateHandle`).
- **`KPAC-OQ-3`** Redirect? → **Yes**, existing `/result/result-detail/:code/general-information?phase=:versionId`.
- **`KPAC-OQ-4`** Which surface? → **Aside only** (Judgment Day Option A, 2026-08-31).

---

## 11. Out-of-Band Notes

- Client-only. Judgment ledger: `judgment.md`.
- Cross-references: `docs/prd.md` (G1, G2), `docs/ux-ui/design.md` §1 §10, `docs/trd/trd.md`.

# Kaizen Entry — changes/kp-report-modal-auto-create

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/kp-report-modal-auto-create` |
| Date | 2026-09-01 |
| Branch | `qa-development-2026` (spec branch; pin `master`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 4 (`KPAC-T-1`..`T-4`) all PASS attempt 1 | `tasks.md`, `execution.md` |
| Reviewer FAIL rework attempts | 0 | `execution.md` |
| HALTs / FATAL_FAILs | 0 | `execution.md` |
| Pivots | 1 (pre-T-1 — surface targeting: modal → aside) | `execution.md` — Pivot Record: pre-T-1 |
| PRODUCT_BUGs | 0 (no `test-report.md`) | — |
| Judgment-day severe findings | 2 confirmed (C-1, C-2); both fixed pre-execute | `judgment.md` |
| Validation FAIL / WARN | n/a (no `validation-report.md`) | accepted at archive |
| Runtime usage-limit aborts | 2 on T-1 (Gemini Flash Implementer, Sonnet Reviewer); replacements, not rework | `execution.md` |

## Lessons

- **KZ-changes--kp-report-modal-auto-create-1 — Name the live create surface by tracing the user click, not the sibling component with the same fields.** (Product, High)
  - Root cause: `/akili-specify` listed `AowHloCreateModalComponent` because it is the older create form with matching fields. The named URL + screenshot footer mount `LabReportFormComponent` via `onReportingRowReport` → `manageIndicator(..., 'report')`. That mismatch forced a pre-T-1 pivot and the C-1/C-2 rewrite (`canSave` / `missingFields` / `[disabled]` vs `[readonly]`).
  - Evidence: `execution.md` — Pivot Record: pre-T-1 (surface targeting); `judgment.md` — C-1, C-2.
  - Standardization: → P1

## Noted, not a lesson

- Provider usage-limit worker deaths (T-1 Implementer + Reviewer) — 3rd spec in this line (CGSpace browse noted it; MRF lost 3 and already queued a digest-update). Replacements kept author≠auditor. Recurrence only — → P2, not a new lesson.
- Post-completion UX (Creating overlay, CGSpace Retrieving overlay, title click = Report, By-AOW Report → `openReportAside`) was owner-driven polish after execute-complete, not rework of T-1..T-4.
- HITL visual lock of the disabled contribution field remains an accepted R-2 follow-up, not a defect.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` §2.1 |
| Edit | After the client-modules bullet, add: "Name the live create surface by tracing the user click (URL + screenshot footer) to the mounted component. A sibling modal with the same fields is out of scope unless that click actually opens it." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | MRF P4 / provider-limit resume-pattern row (no `KZ-id` yet — digest absent until apply on `master`) |
| Edit | Recurrence: KPAC +2 runtime aborts (T-1). Keep Medium. Union source specs: reporting-entry-hub, mass-reporting-flow, kp-report-modal-auto-create. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/CLAUDE.md` (Contrato / Trampas) |
| Edit | Add: "KP (`result_type_id === 6`): after `resetForm`, set `contribution_to_indicator_target = 1` via `createResultBody.update` (not `patch`); contribution `app-pr-input` is `[disabled]`; after MQAP (`onCgspaceItemSelected` / `validateHandle`) call `autoCreateIfKnowledgeProduct()` only if `canSave()` and after `preselectCentersP`." |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/CLAUDE.md` (Añadidos / Alineación de vistas) |
| Edit | Add: "Reporting title click and By-AOW / planned Indicators Report open the aside (`onReportingRowReport` / `openReportAside`), not `openLegacyReportModal`. The legacy modal API remains for tests." |
| Severity | Medium |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `lab-report-form/CLAUDE.md` ¶Qué es: "El modal sigue sirviendo todas las demás entradas." |
| Edit | Replace with: "The modal remains for surfaces that still call `openLegacyReportModal`. Reporting-tab Report, title click, and By-AOW / planned Indicators Report use the aside (`lab-report-form`)." |
| Severity | Medium |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | trd-adr |
| Target | — |
| Edit | No TRD ADR overturned (client-only UX; no architecture decision flipped). |
| Severity | — |
| Status | n/a |

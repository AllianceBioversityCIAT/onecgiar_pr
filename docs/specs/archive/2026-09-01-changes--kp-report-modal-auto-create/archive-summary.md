# Archive Summary — `changes/kp-report-modal-auto-create`

The Reporting-tab Report aside (`LabReportFormComponent`) auto-creates a Knowledge Product result after MQAP succeeds, with contribution fixed at **1**. The legacy modal was never the live surface.

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/kp-report-modal-auto-create/` |
| Archive date | 2026-09-01 |
| Final status | **Done** — `KPAC-T-1`..`T-4` `[x]` PASS; post-completion UX addenda shipped on the same branch |
| Approval mode | gated (`proposal.md`); owner waived continue/pause after refine (`refina el diseño y despues procedes con la ejecucion`) |
| Branch | `qa-development-2026` (spec branch; pin `master`) |
| Judgment Day | 1 pass, fix-only — **APPROVED** after C-1 / C-2 (`judgment.md`) |

## Original Spec Path

`docs/specs/changes/kp-report-modal-auto-create/`

## Archive Date

2026-09-01

## Final Status

**Shipped on `qa-development-2026`.** All required tasks complete. `test-report.md` and `validation-report.md` absent — **accepted**: execute evidence is in `execution.md` (scoped Jest **68 passed**); no `/akili-validate` run (owner archived after execute-complete + live UX addenda).

## Requirements Delivered

| ID | Outcome |
|---|---|
| `KPAC-R-1` / AC-1 | KP arm sets `contribution_to_indicator_target = 1`; util forces `contributing_indicator: 1` for type 6 |
| `KPAC-R-2` / AC-2 | Contribution `app-pr-input` is `[disabled]` for KP (never `[readonly]`) |
| `KPAC-R-3` / AC-3 | Browse CGSpace + MQAP 200 → `autoCreateIfKnowledgeProduct()` after `preselectCentersP` |
| `KPAC-R-4` / AC-4 | Manual `validateHandle` + MQAP → same helper |
| `KPAC-R-5` / AC-5 | `createResult()` only when `canSave()` |
| `KPAC-R-6` / AC-6 | Aside only — modal / guided-creation out of scope |

## Files Changed Summary

From `execution.md` (T-1..T-4):

| Area | Files |
|---|---|
| Production | `lab-report-form.component.ts`, `.html`; `create-result-payload.util.ts` |
| Tests | `lab-report-form.component.spec.ts`, `create-result-payload.util.spec.ts` |

Post-completion addenda (same session, after execute-complete):

| Addendum | Files |
|---|---|
| Creating… overlay on the aside | `lab-report-form.component.{ts,html,spec.ts}` |
| CGSpace “Retrieving…” overlay | `kp-cgspace-browse.component.{html,spec.ts}` |
| Reporting title click = Report aside | `reporting-entry-hub.component.{ts,spec.ts}` |
| By-AOW / planned Indicators Report → aside | `dashboard-lab.component.{ts,html}`; `dashboard-lab.mrf-burndown-session.spec.ts` |

No server, no migration.

## Test Evidence Summary

- Scoped Jest (T-4 close-out): `lab-report-form.component.spec` + `create-result-payload.util.spec` → **2 suites / 68 passed**.
- Title-click and By-AOW addenda covered in their co-located specs (`reporting-entry-hub.component.spec.ts`; `dashboard-lab.mrf-burndown-session.spec.ts` 16 passed).
- Full client Jest **not** run (repo rule).

## Validation Summary

No `validation-report.md`. No unresolved FAIL findings. Conformance evidence: Judgment Day C-1/C-2 rewrite + four Reviewer **PASS** verdicts in `execution.md`.

## Accepted Warnings Or Follow-Ups

- HITL visual check of the disabled contribution `app-pr-input` (R-2) — recorded in `execution.md` Close-out; not a task.
- Modal / guided-creation remain out of scope.
- `lab-report-form/CLAUDE.md` still says the modal serves “todas las demás entradas”; By-AOW Report now uses `openReportAside` — recorded as a `factual-sweep` pending item (apply on `master`).
- No commit requested at archive time.

## Historical Notes

- **Pivot (pre-T-1, closed):** first specify targeted `aow-hlo-create-modal`. Named journey is `onReportingRowReport` → aside. Owner Option A; trio rewritten before any production task.
- `proposal.md` is historical; `requirements.md` + `design.md` supersede it.
- T-1 Reviewer/Implementer usage-limit aborts were runtime replacements, not rework.
- Folder slug kept `kp-report-modal-auto-create` after the surface retarget so archive history stays findable.

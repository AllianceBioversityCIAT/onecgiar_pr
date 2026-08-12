## Why

In **Contributors & Partners** (section 2 of the result form, 2026 phase only), the read-only field **"Indicator Tipology"** shows the literal string `custom` instead of the KPI type name that users see in the ToC. Nicoleta Trifa raised it; Santiago Sanchez escalated it on 2026-07-28.

The ToC already sends the correct text — the frontend is reading the wrong field. Two further defects sit behind the same mistake:

1. When the ToC sends an empty type sentinel, **the whole field disappears from the screen** even though the ToC does have a type loaded. Unreported.
2. **The same wrong value is shown in a second screen** — the ToC contribution review panel in notifications (P2-3085) renders the identical sentinel and will read `custom` too. Unreported.

**Scope: frontend-only.** No backend work is required. Both endpoints already carry the correct text:
- ToC levels (section 2) → `type_value` + `type_name` + the `indicator_typology` alias (`toc-results.service.ts:398-399, 615`).
- Contribution review (notifications) → `tri.type_name AS statement` and `tri.type_value AS indicator_typology` (`results-toc-results.repository.ts:469-470`). The `statement` field already reaches the client and is currently discarded — it is not declared in `TocContributionReview` and never rendered.

**Jira ticket: pending.** No P2 issue exists for this yet (P2-3171, the original Nicoleta-feedback ticket, is already closed / Ready For UAT). Santiago was asked on Slack whether he creates the activity or we do. **The branch and commits MUST carry the ticket id once it exists** — do not start implementation without it.

## What Changes

- **"Indicator Tipology" shows both values, sentinel first.** The field renders `<type_value> — <type_name>` (e.g. `custom — # partners supporting changes to more gender-equitable norms`), so the ToC marker stays visible without losing the descriptive text users read in the ToC's **Type** column. The two are joined **only when they differ**: they are identical in 43 of the 59 KPIs surveyed, where `Innovation Use — Innovation Use` would be pure noise.
- **The field stops disappearing.** Its visibility no longer depends on the sentinel being non-empty. When the ToC has a type, the field is shown; when it genuinely has none, a `Not specified` placeholder is rendered, consistent with the neighbouring "Unit of measurement" and "Target" fields.
- **Resolution becomes explicit**: both parts are trimmed; when only one is present it is shown alone; when neither is, the field shows `Not specified`. The current `indicator_typology ?? type_value` fallback is misleading, since both sides of the `??` resolve to the same value.
- **Label typo fixed**: `Indicator Tipology` → `Indicator Typology`, matching the label already used in Results Framework & Reporting.
- **Same fix applied to the ToC contribution review panel** (notifications): the panel joins the already-delivered `statement` field (the ToC `type_name`) with `indicator_typology` under the same rule, so both screens agree.
- No change to what is saved. The field is read-only ToC metadata; **no payload, DTO, or persistence is touched**.

### Evidence

Census of 59 ToC KPIs in prtest (SP01–SP07, `2030-outcomes` endpoint, which reads the same `toc_results_indicators` table):

- 43 — `type_value` equals `type_name` (e.g. `Innovation Use`). Renders correctly today.
- 7 — `type_value` = `custom`, `type_name` = the real name (e.g. `# partners supporting changes to more gender-equitable norms`). **Reported defect.**
- 6 — `type_value` empty, `type_name` populated (e.g. `Number of food producers using CGIAR innovations.`). **Field silently hidden — unreported defect.**
- 3 — both empty. No type in the ToC; placeholder is the correct outcome.
- 1 — `type_value` carries a dirty prefix (`_n_Realized genetic gains…`) while `type_name` is clean. Confirms `type_name` is the presentation-grade field.

**Out of scope:** sanitising dirty ToC values (the `_n_` prefix). `type_name` is already clean in that record; adding a sanitiser would be unrequested logic that breaks on the next malformed value.

## Capabilities

### New Capabilities
- `toc-indicator-typology-display`: how the read-only ToC indicator typology is resolved and rendered in the Contributors & Partners ToC-mapping block, including empty and missing-value behaviour.

### Modified Capabilities
<!-- None. No existing spec under openspec/specs/ covers the Contributors & Partners ToC mapping block. -->

## Impact

**Affected code (frontend only)**
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/multiple-wps-content/multiple-wps-content.component.ts` — `indicatorTypologyValue` computed (lines 113–118).
- `…/multiple-wps-content.component.html` — the `@if` guard and label at lines 95–103.
- `…/multiple-wps-content.component.spec.ts` — new cases for the four data patterns.
- `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-notifications/components/notification-item/notification-item.component.ts` — add `statement?: string` to the `TocContributionReview` interface (lines 12–24).
- `…/notification-item.component.html` — the "Indicator Typology" row at line 87.

**Not affected**
- Backend: no controller, service, repository, DTO, entity or migration changes.
- API contract: `type_value`, `type_name` and `indicator_typology` are already returned by `GET v2 …/result/:resultId/initiative/:initiativeId/level/:levelId`; `statement` and `indicator_typology` are already returned by the contribution review query.
- 2025 phase: the field is gated behind `isCP2026()` and does not exist in P25.

**Branch constraint (blocking)**
The field only exists in the `P2-2928-TOC-Improvements` epic (introduced by P2-3063) and in `dev`. It is **absent from `staging` and `master`**, whose PR #719 is still OPEN. Therefore:
- The working branch MUST be created from `P2-2928-TOC-Improvements`, not from `staging`.
- It MUST NOT be created from `dev` (project rule: `dev` is a destination, never a source).
- Precedent: `P2-2928-TOC-Improvements-statement-fix` (P2-3202) followed this exact path and is already merged into the epic.

**SDD baseline**
- `docs/system-design/design.md` — read-only field presentation and labelling in the result form.
- `docs/detailed-design/detailed-design.md` — frontend state and ToC integration for Contributors & Partners.
- Related delivered work: P2-3063 (introduced the field), P2-3036 AC7 (grouped Unit of measurement + Target beneath it).

**Consistency note**
`onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/aow-hlo-table.component.ts:102` already renders `type_name` under the column title *"Indicator typology"*. Today the same label shows two different values in two screens; this change removes that contradiction.

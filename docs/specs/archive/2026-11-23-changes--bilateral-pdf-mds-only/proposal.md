# Proposal — Bilateral (W3) result PDF shows MDS data only

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-pdf-mds-only` |
| Slug | `bilateral-pdf-mds-only` — derived from free-text argument |
| Type | Change (product rule: the W3/bilateral PDF must show MDS data only) |
| Deliverable | software |
| Approval Mode | gated — proposal approved by Santiago Sanchez 2026-11-12 |
| Ticket | **INC-168048** |
| Requirement source | Ticket "Changes to result PDF" (Nicoleta Trifa, 10-Nov-2026, via email to prmstechsupport); example result `reporting.cgiar.org/reports/result-details/27926?phase=6` |
| Visual source | Ticket screenshot (no Figma) + current PDF `PRMS-Result-27926_P25_20261112_1359.pdf` (header "Bilateral Project" → `results_bilaterals_p25`; page 2 shows "Current readiness of this innovation: Level 0 - No use" + scale under Innovation Use) |
| Hard boundary | **Only the W3/bilateral PDF structure changes** (`results_bilaterals_p25`). `results_p25` (W1/W2, incl. SGP-02 bilaterals) and `ipsr_p25` must render byte-identical output — confirmed by the user 2026-11-12 |
| PDF service deploy | Cristian Gamboa |
| Repos touched | **`D:\PRMS\alliance-ibd-pdf-viewer`** (code) · `onecgiar_pr` (spec only, server change not expected) |
| Depends on | none · Parallel-safe: yes |
| Date | 2026-11-12 |

## Intent

Nicoleta opened a W3/bilateral result PDF and found "Current readiness of this innovation: Level 0 – No use" plus the 0–9 scale image under **Innovation Use**. She asks to remove it and to make sure W3/bilateral PDFs only contain MDS data.

## Problem / Current Behavior

| # | Fact | Citation |
|---|---|---|
| 1 | Bilateral results (`source = 'API'`) not submitted by SGP-02 render with template `results_bilaterals_p25` | `platform-report.service.ts:458-468`, `result.entity.ts:53`, `platform-report.constants.ts:31-35` |
| 2 | That template reuses the **shared** W1/W2 type sections (`InnovationUseSections`, `InnovationDevelopmentSections`, `PolicyChangeSection`, `CapacitySharingSections`, `KPDetailsSection`) | `alliance-ibd-pdf-viewer/app/templates/reportingtool/results_bilaterals_p25/template.tsx:17-22,58-62` |
| 3 | `InnovationUseSections` renders `data.readiness_level` as "Current readiness of this innovation" + `/assets/prms/current_readiness_scale.svg` | `shared/components/innovation-use.tsx:183-200` |
| 4 | For innovation use that value is the **use level** (scale 0–9, "Level 0 – No use"), which is **not** bilateral MDS since P2-3785 AC1 (Nicoleta, INC-163204 pt 4a, 21-Sep-2026) | `type-innovation-use.component.html:203-228` (comment + `required=false`); `updateMds()` lists Actors / measures / organizations only — `type-innovation-use.component.ts:896-925` |
| 5 | The other shared sections also print non-MDS fields for bilateral results, e.g. Innovation Development prints developers, collaborators, investments, anticipated users, measures, materials evidence; bilateral MDS for that type is only typology (nature) + readiness level | `innovation-development.tsx` (fields `innovation_developers`, `innovation_collaborators`, `innovation_investments`, …); `type-innovation-dev.component.ts:376-401` |
| 6 | Policy MDS = type, stage, implementing orgs; CapSharing MDS = people trained, delivery method, length of training | `type-policy-change.component.ts:227-238`; `type-capacity-sharing.component.ts:269-277` |
| 7 | No existing fix on any branch of the PDF repo (`git log --all -S current_readiness_scale` → only the original commits 48ad5ea / f94fb2a / f7274cf) | run 2026-11-12 |

## Proposed Outcome

- A W3/bilateral PDF never shows the innovation-use **use level** text or scale.
- Every type-specific section of the bilateral PDF shows **only the MDS fields** of that type (as defined by each bilateral form's `updateMds()`), even if the submitter filled optional "full metadata" fields.
- W1/W2 PDFs (`results_p25`) and IPSR PDFs are unchanged.

## Scope

- `alliance-ibd-pdf-viewer`: bilateral-only variants (or an `mdsOnly` prop) of the shared type sections used by `results_bilaterals_p25`, starting with Innovation Use.
- Field-by-field MDS mapping per type (Innovation Use, Innovation Development, Policy Change, Capacity Sharing, Knowledge Product) — done in `/akili-specify`.
- Quick check of the bilateral-own `common-sections.tsx` (details, contributors, geo, evidence) against the common MDS.
- Update `template.demo.json` of the bilateral template so `?demo=true` proves the hidden blocks.

## Non-Goals

- No change to the DB function that builds the payload (shared with W1/W2; the template filters).
- No change to `results_p25` / `ipsr_p25`, nor to the bilateral form or MDS definitions.
- SGP-02 bilateral results keep using `results_p25` (existing rule, not touched).

## Affected Users, Systems, And Specs

| Who / what | Impact |
|---|---|
| Center/W3 submitters, PMU (Nicoleta) | Cleaner bilateral PDF |
| `alliance-ibd-pdf-viewer` (Next.js + Gotenberg, deployed separately) | Code change + deploy |
| `onecgiar-pr-server` platform-report | None expected |
| Related specs | `changes/innovation-use-w3-hide-2030` (INC-168060, same MDS line for the form), P2-3785 |

## Visual Reference

- Source: ticket screenshot (Innovation Use block, readiness line circled, scale crossed out).
- Location: Jira/email ticket; no mockup needed (removal only).

## Requirement Delta Preview

### MODIFIED Requirements
- Bilateral PDF, Innovation Use: shows Actors, Organizations and Other quantitative measures only; no "Current readiness" line nor scale.
- Bilateral PDF, other result types: each type section shows only its MDS fields.

### REMOVED Requirements
- Use-level / readiness block in the bilateral Innovation Use section.

## Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| A — Minimal | Remove the readiness block from bilateral Innovation Use only (prop `showUseLevel={false}`) | 10-min fix, matches the screenshot exactly | Does not cover "ensure only MDS"; Nicoleta likely finds the next one (e.g. ID investments) |
| **B — MDS-only bilateral sections (recommended)** | Add an `mdsOnly` flag to the shared sections (or bilateral-only light components) and pass it from `results_bilaterals_p25`; field list per type from `updateMds()` | Answers the full ticket; W1/W2 untouched; one place per type | Needs the per-type mapping and a product check on borderline fields |
| C — Server filter | Strip non-MDS keys in the DB function / server for `source='API'` | Data never reaches the template | Touches a shared SQL function + a correctness-critical payload; heavier, needs DB deploy |

## Recommended Approach

**Option B.** Template-only, scoped to `results_bilaterals_p25`, driven by the same MDS lists the bilateral form already uses. Ship Innovation Use first in the same change since that is the reported case.

## Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| OQ-1 | ~~Ticket ID~~ → **resolved: INC-168048** |
| OQ-2 | ~~Borderline fields~~ → **resolved (user, 2026-11-12): anything not in the type's bilateral `updateMds()` is removed** — that is Nicoleta's request. Mapping listed in `/akili-specify` |
| OQ-3 | PDF repo branch flow (feature → staging → main) to confirm in specify; deploy owner **Cristian Gamboa** |
| R-1 | Shared components: a flag default must keep W1/W2 identical — cover with a render test / demo diff of `results_p25` |
| R-2 | The bilateral form calls the use level "use level", the PDF called it "readiness" — no wording change needed since it is removed |

## Success Criteria

- Result 27926 (phase 6) PDF: Innovation Use shows no readiness line and no scale.
- One bilateral PDF per type shows only MDS fields; the same results' W1/W2-template PDFs (`?demo=true` on `results_p25`) are unchanged.

## Next Step

```text
/akili-specify changes/bilateral-pdf-mds-only
```

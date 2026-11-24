# Tasks — INC-168459 Portfolio Overview feedback (`POD`)

**Answer first:** 3 tasks.
- T-1 (server) and T-2 (chart) are independent and can run in parallel.
- T-3 (copy and guide) is a small follow-on.
- The rollout is an admin action, done after deploy.
- Total ≈ 260 LOC. One PR.

## 1. Scope

| Field | Value |
|---|---|
| Linked spec | `requirements.md` (approved) · `design.md` (approved, Phase 2, user "2", 2026-11-19) |
| Ticket | INC-168459 |
| Status | in-progress (/akili-execute 2026-11-19) · tasks approved (Phase 3, user "1", 2026-11-19) |
| Cross-refs | `docs/prd.md` §3 (PMU) · `docs/ux-ui/design.md` §10 (a11y) · `docs/trd/trd.md` (`results-framework-reporting`) · no bilateral contract touched |

## 2. Pre-flight

- [x] Requirements and design approved
- [x] POD-OQ-1 resolved (SGP-02 id 41, no 2026 switch row)
- [x] No migration
- [ ] Working tree: the unrelated `docs/specs/bugfix/reporting-memory-runners/*` changes stay out of this spec's commits

## 3. Task list

### [x] POD-T-1 — Hide switched-off initiatives from the three P/A seeds
- **Type:** server
- **Description:**
  - Register `PhaseInitiativeReportingAccess` in the `results-framework-reporting` module's `TypeOrmModule.forFeature` and inject its repository.
  - Add the private helper `loadPortfolioProgramSeed(versionId)` (design §5): existing seed minus the initiatives with a `version_id = versionId AND reporting_enabled = false` row, with ids compared as numbers.
  - Use it in `getPortfolioTocCoverage`, `getPortfolioBilateralProjects` and `getPortfolioContributionRequests`, each passing its own `resolvedVersionId`.
  - Update the three `byProgram` / `programs` Swagger descriptions (design §4).
- **Implements:**
  - POD-R-2: Scenario 2.1, Scenario 2.2 (both THEN, the BUT, and the AND on ToC `portfolio`), Scenario 2.3 (THEN + AND IT MUST NOT require a row per enabled initiative).
  - NFR backwards compatibility (same shapes).
- **Files:** `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.{module,service}.ts`, `…/dto/portfolio-bilateral-projects.dto.ts`, `…/dto/portfolio-contribution-requests.dto.ts`, the ToC coverage DTO, `results-framework-reporting.service.spec.ts`
- **Depends on:** — · **Blocks:** rollout
- **Estimate:** S
- **Review:** `full`, because it changes the shared seed used by three endpoints and the totals semantics (P-6)
- **Backend route:** lead `nestjs-expert` · stack support `nestjs-expert` (Skill Map) · test-first (tdd)
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:** fixture seed = SP01 (id 1) + SGP-02 (id 41), with a switch row `{version_id: V, initiative_id: 41, reporting_enabled: false}`.
    - Correct: every method's rows exclude SGP-02. Projects and requests `totals` are unchanged. ToC `portfolio` excludes SGP-02's counts.
    - Mutation A, filtering on `reporting_enabled = true` (inverted): **SP01 disappears**.
    - Mutation B, ignoring `version_id`: a row for **another** version still hides SGP-02, and the "other version" case goes red.
    - Mutation C, filtering the facts as well as the seed: the projects/requests totals drop, and the totals assertion goes red.
    - The fixture must give SGP-02 non-zero facts (a mapped project, a pending request and ToC rows), or mutation C is inert.
  - **Red run:** predicted — greenfield artifact (observed in POD-T-1). The new spec cases fail against current code because SGP-02 is still listed. Quote the red in `execution.md`.
  - **Disqualifier:** if the methods' resolved version id is not the phase the page shows (e.g. ToC resolves a different version), stop and Pivot instead of patching (P-7). A green run under a mocked repository that never receives `version_id` in its `where` is not evidence; assert the call arguments.
  - **Consumers:** `results-framework-reporting.service.spec.ts` (seed asserted at `:2183`). Client `toc-kpi-block`, `projects-block` and `contribution-requests-block` read fewer rows with an unchanged shape (P-9, P-10).
- **Definition of done:**
  - [ ] `npx jest src/api/results-framework-reporting --silent --reporters=summary --forceExit` green. The red was observed first and quoted.
  - [ ] Mutations A, B and C each applied once and seen red, then reverted.
  - [ ] `npx eslint "src/api/results-framework-reporting/**/*.ts" --quiet` clean. `npm run build` compiles.
  - [ ] `npm run migration:check` reports nothing pending (no entity change).

### [x] POD-T-2 — Horizontal projects chart with full names
- **Type:** client
- **Description:**
  - In `projects.format.ts`: add `fullLabel` to `ProjectsViewRow`. P/A label = `code · shortName` (fallback `code`), fullLabel = `code · name` (fallback label). Center fullLabel = label.
  - In `projects.charts.ts`: horizontal option (category `yAxis` with `inverse`, value `xAxis`, labels `right`, label width cap with wrapping, never rotated), an axis tooltip showing `fullLabel` and the three values, table first column = `fullLabel`, and an exported `projectsChartHeight(rowCount)`.
  - In `projects-block.component.{ts,html}`: bind `height` to the computed height.
- **Implements:**
  - POD-R-1: Scenario 1.1 (THEN, AND tooltip, BUT not rotated / not code-only), Scenario 1.3, the By Center orientation clause.
  - Scenario 1.2 is **partly** covered here (the height grows, `axisLabel.rotate` is absent). Its layout THEN / AND IT MUST NOT is owned by the manual check in §6.
- **Files:** `…/portfolio-overview/components/projects-block/projects.format.ts`, `projects.charts.ts`, `projects-block.component.{ts,html}` + their specs
- **Depends on:** — · **Blocks:** POD-T-3
- **Estimate:** S
- **Review:** `checklist`
- **Design route:** lead `angular-developer` · no Impeccable direction (design §6.3: orientation change on an existing surface, tokens unchanged) · evidence: the 390 / 1280 px screenshots of §6
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:** rows `[SP09 {shortName: 'Scaling for Impact', name: 'Scaling for Impact Program …'}, SP10 {shortName: ''}]`.
    - Expect `yAxis.type === 'category'` with data `['SP09 · Scaling for Impact', 'SP10']`, `xAxis.type === 'value'`, and `yAxis.inverse === true`.
    - The tooltip formatter output for dataIndex 0 contains the full name.
    - Table row 0 col 0 = `SP09 · Scaling for Impact Program …`.
    - `projectsChartHeight(13) > projectsChartHeight(1) ≥ 320`.
    - Mutation: keep the old vertical option, and the category-axis assertion goes red. Drop the shortName fallback, and SP10 reads `'SP10 · '` and goes red.
  - **Red run:** predicted — greenfield artifact (observed in POD-T-2). The new assertions fail against the vertical builder. Quote the red.
  - **Disqualifier:** jsdom cannot measure the ECharts canvas, so a green Jest run says nothing about label clipping or page scroll. Never mark Scenario 1.2 done from Jest.
  - **Consumers:** `projects.charts.spec.ts`, `projects.format.spec.ts`, `projects-block.component.spec.ts`, `portfolio-overview.component.spec.ts` (P-9). No Cypress or `tests/` hits.
- **Definition of done:**
  - [ ] `npx jest src/app/pages/result-framework-reporting/pages/portfolio-overview --silent --reporters=summary --no-coverage` green. The red was observed first and quoted.
  - [ ] `npx ngc -p tsconfig.app.json --noEmit` exit 0. `npx ng lint --quiet` (or `--lint-file-patterns` on the touched folder) clean.
  - [ ] **Owns POD-R-1 Scenario 1.2:** the manual browser check of §6 (390 and 1280 px, both tabs, screenshots in `execution.md`) is done before this task is marked `[x]`. It is a HITL step; Jest never substitutes for it.

### [x] POD-T-3 — Contribution requests explainer and guide note
- **Type:** client · docs
- **Description:**
  - Replace `contributionRequests.subtitle` in `portfolio-overview.copy.ts` with the POD-R-3 text, verbatim.
  - Add one line each to `portfolio-overview/CLAUDE.md`: the projects chart is horizontal, and P/A rows drop initiatives switched off for the phase.
- **Implements:** POD-R-3: Scenario 3.1 (THEN, BUT counts/ordering/filters unchanged). NFR i18n.
- **Files:** `onecgiar-pr-client/src/app/internationalization/portfolio-overview.copy.ts`, `contribution-requests-block.component.spec.ts`, `…/portfolio-overview/CLAUDE.md`
- **Depends on:** POD-T-2 (same guide file, so the edits run in sequence)
- **Estimate:** S
- **Review:** `skip-eligible`. Claim to prove at execute time: a copy-string change plus one guide line, with a green red-run on the subtitle assertion and no shared consumer (P-9: only `portfolio-overview.copy.ts` holds the string).
- **Skills:** `angular-developer`
- **Verification:**
  - **Falsifier:** the block spec asserts that `[data-testid="contributions-subtitle"]` text equals the exact POD-R-3 string. With the old copy it reads "…Pending = not answered yet." without the new sentence, and the test goes red.
  - **Red run:** predicted — greenfield artifact (observed in POD-T-3).
  - **Disqualifier:** if the string is also used as a fixture elsewhere, re-sweep before closing (P-9 found none).
  - **Consumers:** none beyond `portfolio-overview.copy.ts` (P-9).
- **Definition of done:**
  - [ ] Block spec green. Red quoted.
  - [ ] Existing count/ordering specs in the block unchanged and green.

## 4. Dependency graph

```
POD-T-1 (server)        POD-T-2 (chart)
                            └── POD-T-3 (copy + guide)
        └──────────┬──────────┘
               Rollout (§6)
```

T-1 ∥ T-2 are parallel-safe: no shared files.

## 5. Test plan

| Test | Type | Covers | Location |
|---|---|---|---|
| POD-TEST-1 | unit server | R-2 S2.1–2.3 | `results-framework-reporting.service.spec.ts` |
| POD-TEST-2 | unit client | R-1 S1.1, S1.3, Center orientation | `projects.charts.spec.ts`, `projects.format.spec.ts`, `projects-block.component.spec.ts` |
| POD-TEST-3 | unit client | R-3 S3.1 | `contribution-requests-block.component.spec.ts` |
| POD-TEST-4 | manual browser | R-1 S1.2 (no clipping, no page scroll) | §6, HITL |

## 6. Rollout & verification

- [ ] PR to `staging`. Commit format, e.g. `✨ feat(portfolio-overview) [INC-168459]: …`.
- [ ] **Manual browser check (owns POD-R-1 Scenario 1.2):**
  - Open `/portfolio-overview` (2026) at 390 and 1280 px.
  - No label clipped, no page-level horizontal scroll, 13 rows readable. Repeat on the By Center tab.
  - Screenshots go in `execution.md`.
- [ ] **Admin rollout:** switch SGP-02 off for the 2026 phase (Admin → Phase management → 2026). Re-run the P-3 query and expect a row `41 · version(2026) · 0`.
- [ ] Confirm on PRPROD that the three blocks show no SGP-02 row.
- [ ] Reply to the INC-168459 reporter (text drafted in the session).

## 7. Follow-ups

- Sibling spec: apply the switch to every 2026 listing (`/akili-propose`).
- Ask IITA or the mapping owners to fill Funding Source for `T-PJ-004108` and `T-PJ-004312` (P1).

## 8. Roll-back

1. Revert the PR (no migration).
2. Optionally switch SGP-02 back on for 2026 in the admin panel. This is independent of the code.

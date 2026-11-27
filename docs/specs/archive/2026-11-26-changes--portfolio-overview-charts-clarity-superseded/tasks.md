# Tasks — Portfolio Overview charts clarity (`POC`)

**Answer first:** five tasks.
- Two server tasks in sequence: the pairs query, then the aggregation.
- Three client tasks: the Typology note, then the palette, then the projects caption. These run in parallel with the server tasks.
- One HITL stop: the staging SQL check in POC-T-2.

About 440 LOC with tests. One PR.

## 1. Scope

- **Linked spec:** `requirements.md`, `design.md` (this folder); `docs/prd.md` (PMU persona, portfolio consolidation), `docs/ux-ui/design.md` §7, `docs/trd/trd.md` (`results-framework-reporting`).
- **Owner:** Santiago Sanchez · **Status:** not-started
- **Routing note:** `software-architect/references/backend-routing.md` and `impeccable-bridge/references/design-routing.md` are not installed in this repo (`find .claude .agents -path "*backend-routing.md"` and the same for `design-routing.md` → no hit). The route lines below use project conventions and the `## Skill Map`.

## 2. Pre-flight

- [x] `requirements.md` approved (2026-11-20, "1")
- [x] `design.md` approved (2026-11-20, "2", no judgment-day)
- [x] `tasks.md` approved (2026-11-20, "1")
- [x] **POD (`bugfix/inc-168459-portfolio-overview-data`) closed or merged.** It is `[~]` on `projects-block.*`, `portfolio-overview.copy.ts` and `results-framework-reporting.service.ts` (G-3). **Waived by the user 2026-11-20:** POD code is committed (`cfc18d03e`); only its HITL browser check remains (see `execution.md`)
- [x] No migration: `migration:check` n/a

## 3. Task list

### [x] POC-T-1 — By Center note copy + Typology key guard for the By Center tab

- **Type:** client
- **Description:**
  - Replace `centerNote` with the POC-DD-5 text.
  - Add a spec that switches to the By Center tab and asserts:
    - the note shows the new text;
    - the two-bar key renders there with the same `copy.barKey` entries.
- **Implements:** POC-R-1 (Scenario 1.1, "BUT … only in one tab"), POC-R-2 (Scenario 2.1, all clauses)
- **Files:** `onecgiar-pr-client/src/app/internationalization/portfolio-overview.copy.ts`, `…/typology-block/typology-block.component.spec.ts`
- **Design route:** existing Typology block, copy only. Lead: project conventions (`docs/ux-ui/design.md`)
- **Depends on:** — · **Blocks:** — · **Estimate:** S
- **Review:** `skip-eligible`. It must prove: only `centerNote` changed in the copy file (`git diff` shows one key), and the spec diff adds tests without editing the existing ones.
- **Skills:** `angular-developer`
- **Verification:**
  - **Falsifier:** remove the `copy.centerNote` binding from `typology-block.component.html:81` → the new note test fails. Move the key `<ul>` out of `hlmTabsContent` and render it only when `dimension() === 'program'` → the By Center key test fails.
  - **Red run:**
    - Note test, baseline observed: `grep -n "centerNote" onecgiar-pr-client/src/app/internationalization/portfolio-overview.copy.ts` → `55: centerNote: 'Counts the lead Center; the Center filter also matches contributing Centers.'`, which contains "matches". So the new assertions (no "matches", ≤ 2 sentences, names "No lead Center") fail on the current string.
    - Key test: n/a (guard). It is green on current code by design, because POC-R-1 is already built (P-10). Its evidence is the falsifier above, run and quoted in `execution.md`.
  - **Disqualifier:** if the key does **not** render under the By Center tab on current code, POC-R-1 is not built. Stop and re-specify; do not patch it here.
  - **Consumers:** `typology-block.component.spec.ts:289,301` read `copy.centerNote` (P-9). They stay valid because they compare against `copy.*`.
- **Definition of done:**
  - [x] Note text = POC-DD-5, verbatim
  - [x] Both falsifiers executed and their red quoted in `execution.md`
  - [x] `npx jest --silent --reporters=summary --no-coverage src/app/pages/result-framework-reporting/pages/portfolio-overview/components/typology-block` green
  - [x] `npx ng lint --quiet` clean

### [~] POC-T-2 — Repository: `getW3ResultProgramPairs(versionId)`

- **Type:** server
- **Description:** New read-only method on `ClarisaProjectsRepository` per design §5 and POC-DD-1/DD-2.
  - Returns `{ projectId: number; programCode: string }[]`, distinct and trimmed.
  - Two `UNION` branches, each restricted to the version.
  - Same error wrapping as `getPortfolioProjectFacts`.
- **Implements:** POC-R-4 (Glossary "named on", Scenarios 4.2 status set, 4.5 filters)
- **Files:** `onecgiar-pr-server/src/clarisa/clarisa-projects/clarisa-projects.repository.ts`, `…/clarisa-projects.repository.spec.ts`
- **Backend route:** `nestjs-expert` (TypeORM raw query, project conventions); `tdd` recommended
- **Depends on:** — · **Blocks:** POC-T-3 · **Estimate:** M
- **Review:** `full` (new SQL that a business count rests on)
- **Skills:** `nestjs-expert`, `tdd`
- **First step (settles P-12):**
  - Write the SQL, then pause for the HITL.
  - The user runs `EXPLAIN` and the query read-only on staging, with a real version id, and reports the row count and the time.
  - If the plan shows a full scan over `share_result_request` or `results_by_inititiative` without the version bound, or the run takes more than ~2 s, go to the Pivot Protocol before T-3 builds on it.
- **Verification:**
  - **Falsifier:** each mutation below must turn the spec red.
    - drop `request_status_id IN (?)`
    - add 3 or 2 to the status bind
    - drop `is_active = 1` on any of the four joined tables
    - drop `r.version_id = ?` in either branch
    - change roles `(1, 2)` to `(1)`
    - drop `r.source = ?`
    - drop the Discontinued filter
  - **Red run:** `predicted — greenfield artifact (observed in POC-T-2)`. The method does not exist (`grep -n "getW3ResultProgramPairs" -r onecgiar-pr-server/src` → 0 hits). The first spec run, before the method exists, must be quoted verbatim in `execution.md`.
  - **Disqualifier:**
    - If the staging run (first step) returns pairs for results the facts query does not count as W3, the two filters disagree. Stop and re-specify.
    - If no staging access is available, the task closes `[~]` with P-12 open; it is never marked done on unit tests alone.
  - **Consumers:** none (new symbol). `getPortfolioProjectFacts` and its spec pins (`:117,118,127,133`) must stay byte-identical.
- **Definition of done:**
  - [ ] Spec pins: each branch's clauses, the status set `[1, 4]`, the type set `['contribution','primary']`, roles `[1, 2]`, the bind order and `?` count, the row mapping (string ids → numbers, trimmed codes), error wrapping
  - [ ] Every falsifier mutation executed once and its red quoted
  - [ ] P-12 settled: staging `EXPLAIN`, row count and time recorded in `execution.md` (user-run)
  - [ ] `npx jest --silent --reporters=summary --forceExit src/clarisa/clarisa-projects` green; `npx eslint "src/clarisa/**/*.ts" --quiet` clean; `npx tsc --noEmit -p tsconfig.json` clean

### POC-T-3 — Service: per-P/A W3 count from the pairs + Swagger text

- **Type:** server
- **Description:** Implements design §5 steps 1–4.
  - `getPortfolioBilateralProjects` loads the facts and the pairs in parallel.
  - It builds `projectId → Set<code>` and increments `byProgram[X].withBilateralResults` once per named seed code, for mapped projects only.
  - All other counts keep their code path.
  - Update the controller `@ApiOperation.description` (`controller.ts:359`) to the new rule (POC-R-6).
- **Implements:** POC-R-4 (Scenarios 4.1–4.6, every BUT/MUST), POC-R-5 (Scenario 5.1), POC-R-6 (Swagger half)
- **Files:** `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.service.ts`, `….service.spec.ts`, `….controller.ts`
- **Backend route:** `nestjs-expert`, `api-design-principles` (same contract, documented meaning); `tdd` recommended
- **Depends on:** POC-T-2 · **Blocks:** — · **Estimate:** M
- **Review:** `full` (changes a reported business figure)
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`
- **Verification:**
  - **Falsifier:**
    - (a) Keep incrementing `withBilateralResults` through the mapped codes. Scenario 4.1 then goes red: P counts under SP01, not SP03.
    - (b) Increment once per pair instead of once per code. Scenario 4.3 goes red: SP01 = 3.
    - (c) Drop the `codes.size === 0` guard for the new increment. Scenario 4.4 goes red: Q counts under SP01.
    - (d) Increment `totals.withBilateralResults` from the pairs. Scenario 5.1 goes red.
    - The fixtures must make each pair of readings diverge: P mapped to SP01 only with a pair to SP03; three pairs from three results collapsed to one `(P, SP01)` pair plus a second project with the same code; Q with no mapping but a pair; a pair to a non-seed code (`SP99`) for 4.6.
  - **Red run:** baseline observed: `results-framework-reporting.service.ts:1179-1182` increments `withBilateralResults` through `codes` (the mapping) via `addProject`. The 4.1 assertion (SP03 = 1, SP01 = 0) is therefore false on the current code. Quote the first run verbatim in `execution.md`.
  - **Disqualifier:** if a WPS/POD assertion on a field **other than** `byProgram[].withBilateralResults` must change to pass, the rule has leaked (POC-R-5). Stop, do not edit that assertion.
  - **Consumers:**
    - server: `results-framework-reporting.service.spec.ts` (shared mock at `:203` gains `getW3ResultProgramPairs`, default `[]`; WPS block `:1825-2030`; POD block `:2458+`), controller spec (unchanged, mocks the service);
    - client readers of the meaning (P-7): `projects-block.component.{ts,html}`, `projects.charts.ts`, `projects.format.ts`, the interface. No code change there; the caption is POC-T-5.
- **Definition of done:**
  - [ ] Scenarios 4.1–4.6 and 5.1 each have a named test
  - [ ] Every changed `withBilateralResults` assertion is listed in `execution.md`, with old → new value and the pairs fixture that drives it
  - [ ] All four falsifiers executed, red quoted
  - [ ] Swagger description states: the P/As named on the result, primary or contributing (Pending, Draft or Accepted), mapped projects only, once per P/A
  - [ ] `npx jest --silent --reporters=summary --forceExit src/api/results-framework-reporting` green; eslint quiet; `tsc --noEmit` clean

### POC-T-4 — Projects chart palette + KPI tile swatches

- **Type:** client
- **Description:**
  - Add `ProjectsSeriesColours` and the new `buildProjectsOption` argument; series read it (POC-DD-4).
  - Export `PROJECT_SERIES_TOKEN` from the component; resolve it like Typology does (`var()` fallback, no hex).
  - Add `aria-hidden` swatches to the three KPI tiles; the W1/W2 swatch is striped.
  - Add a palette spec that reads `src/styles/colors.scss` and checks the three tokens: hue families differ; contrast ≥ 3 against `--pr-surface-card`; simulated protan/deutan pairwise ΔE2000 ≥ 15 (pure helpers inside the spec).
- **Implements:** POC-R-3 (Scenario 3.1, every MUST/BUT; Scenario 3.2)
- **Files:** `…/projects-block/projects.charts.ts`, `projects.charts.spec.ts`, `projects-block.component.ts`, `.html`, `.spec.ts`
- **Design route:** existing dashboard block, token swap within `docs/ux-ui/design.md` §7. Lead: project conventions (Impeccable references absent). Evidence: the visual check at the HITL pause.
- **Depends on:** — · **Blocks:** POC-T-5 (same template) · **Estimate:** M
- **Review:** `full` (design-token change)
- **Skills:** `angular-developer`, `tailwind-design-system`, `dataviz`
- **Verification:**
  - **Falsifier:**
    - Set `PROJECT_SERIES_TOKEN.withBilateral = '--pr-chart-3'` → the palette spec fails (same hue family as Mapped; deutan ΔE under 15).
    - Set W1/W2 to `--pr-color-green-600` → the deutan ΔE check fails (10.5).
    - Drop the decal from W1/W2 → the stripe assertion fails.
    - Put a literal `#c2410c` in `projects.charts.ts` → the no-hex assertion fails.
  - **Red run:** baseline observed: `projects.charts.ts:76-78` paints `tokens.ramp[0]`, `ramp[2]`, `ramp[1]`, i.e. `--pr-chart-1/3/2` (`colors.scss:299-301`), one violet family. The new spec's "different hue families" assertion is false on current code. Quote the first run.
  - **Disqualifier:** if the palette spec cannot read `colors.scss` under the Jest environment (path or fs blocked), the check is not evidence. Record the gap and route the contrast/ΔE check to the HITL; never assert on hard-coded hexes copied into the spec.
  - **Consumers:**
    - `projects.charts.spec.ts:24-26` pins `['c1','c3','c2']` and is updated to the colours argument; `:74` gets the new argument.
    - `projects-block.component.ts:96` is the only production caller (P-8).
    - `projects-block.component.spec.ts` tile test ids (`projects-kpi-*`) are kept.
- **Definition of done:**
  - [ ] Tokens = design §6.2; no hex in TS or markup
  - [ ] Every falsifier executed, red quoted
  - [ ] HITL visual check of the chart and tiles at 1280 px and 390 px widths (light theme), recorded in `execution.md`
  - [ ] Client Jest for `projects-block` green; `npx ng lint --quiet`; `npx ng build` clean (compile gate for the new argument)

### POC-T-5 — By P/A caption states the new rule

- **Type:** client
- **Description:** Replace `projects.multiProgramCaption` with the POC-DD-6 text. Keep `data-testid="projects-multi-caption"` and its visibility: By P/A only, in Chart and Table views. Add a test for the Table view and for the By Center absence, if missing.
- **Implements:** POC-R-6 (Scenario 6.1, every MUST/BUT; caption half)
- **Files:** `portfolio-overview.copy.ts`, `projects-block.component.spec.ts`
- **Design route:** copy only, project conventions
- **Depends on:** POC-T-4 · **Blocks:** — · **Estimate:** S
- **Review:** `skip-eligible`. It must prove: one copy key changed; the spec adds tests only.
- **Skills:** `angular-developer`
- **Verification:**
  - **Falsifier:** move the caption `@if` to `dimension() === 'center'` → the By P/A visible and By Center absent tests fail. Restore the old text → the text test (contains "primary or contributing") fails.
  - **Red run:** baseline observed: `portfolio-overview.copy.ts` `multiProgramCaption` = "A project mapped to several P/As counts under each, so the bars add up to more than the total." It lacks "primary or contributing", so the new text assertion fails. Quote the first run.
  - **Disqualifier:** if the caption does not show in Table view on current code, the visibility rule differs from P-9's reading. Re-specify, do not move markup here.
  - **Consumers:** `projects-block.component.spec.ts:157,207,218` (compare against `copy.*`, stay valid).
- **Definition of done:**
  - [ ] Text = POC-DD-6, verbatim
  - [ ] Falsifiers executed, red quoted
  - [ ] Release note for PMU drafted in `execution.md`: the W3-by-P/A figure now follows the P/As on the result, so the earlier numbers may change
  - [ ] `projects-block` Jest green; lint clean

## 4. Dependency graph

```
POC-T-2 (repo SQL, HITL staging) ──► POC-T-3 (service + Swagger)
POC-T-1 (Typology note + key guard)            ┐ parallel with the server branch
POC-T-4 (palette + swatches) ──► POC-T-5 (caption)┘
```

## 5. Coverage (scenario and clause level)

| Clause | Task |
|---|---|
| 1.1 key in each tab; BUT not only one tab | T-1 |
| 2.1 points 1–3; MUST copy; BUT no "matches", ≤ 2 sentences | T-1 |
| 3.1 hue families; MUST contrast; MUST CVD ΔE; stripe; BUT no ramp steps / status / hex | T-4 |
| 3.2 tile swatches | T-4 |
| 4.1 SP03 counts; BUT not SP01; mapped unchanged | T-3 |
| 4.2 role 2, Pending, Draft count; BUT not Declined; MUST NOT inactive | T-2 (SQL), T-3 (aggregation) |
| 4.3 once per P/A | T-3 |
| 4.4 unmapped excluded, footnote unchanged | T-3 |
| 4.5 W1/W2, Discontinued, inactive, other version, inactive link excluded | T-2 |
| 4.6 non-seed names ignored, no failure | T-3 |
| 5.1 other fields unchanged; MUST change only `withBilateralResults` assertions | T-3 |
| 6.1 caption both views; MUST copy; BUT not under By Center | T-5 |
| 6 Swagger states the rule | T-3 |
| A-1 primary requests named | T-2 (type set includes `primary`) |

## 6. Rollout

- [ ] One PR into `staging`: `✨ feat(portfolio-overview) [<ticket>]: …` `[SPEC:changes/portfolio-overview-charts-clarity]`
- [ ] Staging QA as PMU: two bars and key; By Center note; three colors; a P/A whose W3 count exceeds Mapped reads correctly with the caption
- [ ] Reply to the ticket with the release note (T-5)

## 7. Roll-back

Revert the PR. No migration, no flag, no payload shape change, so clients need nothing.

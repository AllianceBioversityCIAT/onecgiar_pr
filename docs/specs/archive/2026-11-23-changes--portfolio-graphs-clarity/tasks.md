# Tasks — Portfolio Overview graphs clarity (PGC)

## 1. Scope of this task list

- **Module / feature:** results-framework-reporting / Portfolio Overview (INC-168764)
- **Linked spec:** `requirements.md` + `design.md` (same folder)
- **Owner / driver:** Santiago Sanchez
- **Status:** done, archived 2026-11-23
- **Budget (design §11):** 3 tasks · ~260 LOC · 4 review rounds

## 2. Pre-flight checklist

- [ ] Local branch updated: `git pull` on `qa-development-2026-ss` (local lacks `cfc18d03e`, INC-168459). The working tree has other sessions' changes in `results-framework-reporting.service(.spec).ts` and `portfolio-overview` files: **stage explicit paths only**.
- [ ] Jest: always `--maxWorkers=2`, scoped (`--findRelatedTests` on the changed files). One test run at a time.
- [ ] No DB locally: SQL checks are owner-run, read-only (P-10, P-11).

## 3. Task list

### [x] PGC-T-1 — Count per-P/A "With W3/Bilateral results" by the P/As the results name

- **Type:** server
- **Description:** Add `named_program_codes` to `getPortfolioProjectFacts` and `namedProgramCodes` to `PortfolioProjectFactsRow` (design §7, DD-1, DD-4). In `getPortfolioBilateralProjects`, take each P/A row's `withBilateralResults` from the named codes; keep `mapped`, `w1w2Contributors`, totals, by Center and unmapped exactly as today (DD-2, DD-3). Update the DTO description and the bind-order comment.
- **Implements:** PGC-R-4 (Scenarios 4.1–4.6), PGC-R-5 (5.1), PGC-NFR-1, PGC-NFR-2
- **Files:** `clarisa-projects.repository.ts` (+spec), `results-framework-reporting.service.ts` (+spec), `dto/portfolio-bilateral-projects.dto.ts`
- **Depends on:** — · **Blocks:** PGC-T-2 (copy describes this rule)
- **Estimate:** M · **Skills:** `nestjs-expert`, `tdd`
- **Backend route:** lead `nestjs-expert`; test-first (`tdd`); stack support from Skill Map
- **Review:** `full` — counting rule shown to the PMU; SQL cannot be run locally
- **Scope clauses owned:** 4.1 primary · 4.2 contributing 1/2/4 + role 2 **BUT** declined (3) / inactive excluded · 4.3 mapped-not-named excluded **AND** still in `mapped` · 4.4 W1/W2, inactive, Discontinued, other version, inactive rbp excluded · 4.5 unmapped stays out **AND** still in unmapped count · 4.6 distinct per P/A · 5.1 every other field identical **BUT** only `byProgram[*].withBilateralResults` differs
- **Verification:**
  - Service spec: one fixture with ≥ 5 projects where old and new rules diverge: project mapped to SP05 whose results name SP01 + SP09 (draft); project with a declined SP02 request; unmapped project naming SP01; project naming SP01 via three results; project with only W1/W2. Assert per-P/A `withBilateralResults`, and assert `totals`, `byCenter`, `unmappedWithBilateralResults`, `mapped`, `w1w2Contributors` equal the values the **old** loop gives on the same fixture.
  - Repository spec: `named_program_codes` split/trim/blank-drop like `approved_program_codes`; the params array has the new values in placeholder text order, and the SQL contains the role filter `(1, 2)` and status filter `(1, 2, 4)` as bound values.
  - `npx jest --maxWorkers=2 --findRelatedTests <changed server files> --silent --reporters=summary --forceExit`; `npx eslint <changed files> --quiet`.
  - **HITL (P-10, P-11):** the agent gives the owner a read-only SQL in chat (environment named) that reproduces, per P/A, old vs new `withBilateralResults` and the unchanged totals, plus a count of W3 results with role-2 links. The owner runs it on PRTest; the task records the numbers.
- **Falsifier:** swap the service back to reading `approvedProgramCodes` for `withBilateralResults` → the 4.1/4.2/4.3 assertions go red; remove the status filter → the declined-SP02 assertion goes red; drop `DISTINCT`/the Set → 4.6 goes red (SP01 = 3).
- **Red run:** predicted — greenfield artifact (`namedProgramCodes` does not exist yet; observed in PGC-T-1). The red must be quoted verbatim in `execution.md` and be an assertion failure on a count, not a TypeScript/undefined error.
- **Disqualifier:** a fixture where the old and new rules give the same per-P/A number for every project is no evidence (inert fixture). If the HITL query shows totals or `mapped` moved, the task fails regardless of green Jest.
- **Consumers:** server — `results-framework-reporting.service.spec.ts`, `clarisa-projects.repository.spec.ts`, `results-framework-reporting.controller.spec.ts` (shape only), `approved-mapping-statuses.constants.ts` (comment). Client reads the field only through `projects-block` (PGC-T-2).
- **Definition of done:** all Scenario 4.x/5.1 assertions green; red quoted; lint clean; HITL numbers recorded in `execution.md` (or the task marked `[~]` waiting for them).

### [x] PGC-T-2 — Projects chart: distinct colours and rule copy

- **Type:** client
- **Description:** `buildProjectsOption` takes a `ProjectsSeriesColours` argument (`mapped`, `withBilateral`, `w1w2`) and stops reading `tokens.ramp` for series (DD-5). `projects-block.component.ts` resolves `--pr-chart-1`, `--pr-color-green-600`, `--pr-color-orange-700` like `typology-block.component.ts:42-51`. W1/W2 keeps its decal. New `projects.subtitle` and `projects.multiProgramCaption` text (design §8).
- **Implements:** PGC-R-3 (3.1), PGC-R-6 (6.1), PGC-NFR-3, PGC-NFR-4
- **Files:** `projects.charts.ts` (+spec), `projects-block.component.ts` (+spec), `portfolio-overview.copy.ts`
- **Depends on:** PGC-T-1 · **Blocks:** —
- **Estimate:** S · **Skills:** `angular-developer`, `impeccable-bridge`
- **Design route:** no new surface; colour mapping only, tokens from `colors.scss` (design DD-6); evidence = computed contrast table + browser look
- **Review:** `checklist` — copy + colour wiring, no logic
- **Scope clauses owned:** 3.1 different hue per series **AND IT MUST** ≥ 3:1 **BUT** not three purples; legend matches bars · 6.1 subtitle names primary or contributing **AND** caption says a P/A can exceed mapped
- **Verification:**
  - `projects.charts.spec.ts`: series `itemStyle.color` equals the three colour inputs in order; the W1/W2 series keeps `decal`; no series colour equals any `tokens.ramp[1..3]` value.
  - `projects-block.component.spec.ts`: rendered subtitle and caption equal the copy functions; the component passes the three resolved token values.
  - Compile gate: `npx tsc -p tsconfig.app.json --noEmit` (the signature change must compile in every caller).
  - `npx jest --maxWorkers=2 --findRelatedTests <changed client files> --silent --reporters=summary --no-coverage`; `npx eslint <changed files> --quiet`.
  - Contrast: not measurable in jsdom → design DD-6 ratios stand; visual look in the browser at the HITL pause (both tabs).
- **Falsifier:** pass `tokens.ramp[0..2]` again → the "no ramp colour" assertion goes red; call `buildProjectsOption` without the colours argument → `tsc` red.
- **Red run:** baseline walked at `e4f090b05`: `projects.charts.ts` builds the series with `tokens.ramp[0]`, `tokens.ramp[2]`, `tokens.ramp[1]` (`series(labels.mapped, tokens.ramp[0], …)` etc.), so the "no series colour equals a ramp value" assertion fails on all three series. The executed red is quoted in `execution.md`.
- **Disqualifier:** a test that builds its own fragment instead of calling the real `buildProjectsOption`/component is no evidence.
- **Consumers:** `projects.charts.spec.ts`, `projects-block.component.spec.ts`, `projects-block.component.html` (caption/subtitle bindings), portfolio-overview `CLAUDE.md`. No Cypress/E2E hits (design P-6).
- **Definition of done:** specs + `tsc` green; red quoted; browser look done or listed as open HITL item.

### [x] PGC-T-3 — Typology key single-bar line, Center footnote, guide

- **Type:** client + docs
- **Description:** Add `barKey.singleBar` and a third `<li data-testid="typology-bar-key-single">` in `typology-bar-key`; replace `centerNote` with the PGC-R-2 text. Update `portfolio-overview/CLAUDE.md` (W3/Bilateral projects: new per-P/A rule + colours; Typology: key line) and re-stamp `Verified:`.
- **Implements:** PGC-R-1 (1.1), PGC-R-2 (2.1)
- **Files:** `portfolio-overview.copy.ts`, `typology-block.component.html` (+spec), `portfolio-overview/CLAUDE.md`
- **Depends on:** — (shares `portfolio-overview.copy.ts` with PGC-T-2: run after it, not in parallel) · **Blocks:** —
- **Estimate:** S · **Skills:** `angular-developer`
- **Review:** `skip-eligible` — copy and one static `<li>`; must prove at execute: diff touches only the copy keys, the template line, its spec and the guide
- **Scope clauses owned:** 1.1 key line on both tabs **BUT** bars/counts unchanged · 2.1 exact footnote text **AND IT MUST** stay hidden on the P/A tab
- **Verification:** `typology-block.component.spec.ts`: `typology-bar-key-single` text equals `copy.barKey.singleBar` on both tabs; `typology-center-note` equals the new text on the Center tab and is absent on the P/A tab (existing assertion kept). Same Jest/eslint commands as T-2.
- **Falsifier:** remove the `<li>` → key test red; render the note outside the `@if` → P/A-tab absence test red.
- **Red run:** predicted — greenfield artifact (`barKey.singleBar` and its test id do not exist; observed in PGC-T-3).
- **Disqualifier:** asserting the copy constant against itself (without rendering) is no evidence.
- **Consumers:** `typology-block.component.spec.ts` (`centerNote` assertion at line ~301), portfolio-overview `CLAUDE.md`.
- **Definition of done:** specs green; guide updated; red quoted.

### [x] PGC-T-4 — Projects subtitle per tab (amendment 2026-11-23)

- **Type:** client
- **Origin:** PRTest check 2026-11-23 showed the per-P/A rule sentence also on the By Center tab. Owner approved the Center text and doing it inside this spec (a `/akili-quick` was refused by its gate: it adds a template conditional).
- **Description:** add `projects.centerSubtitle(year)` with the Scenario 6.2 text; the projects-block header renders `subtitle(year)` on the By P/A tab and `centerSubtitle(year)` on the By Center tab.
- **Implements:** PGC-R-6 (6.1, 6.2), PGC-NFR-3
- **Files:** `portfolio-overview.copy.ts`, `projects-block.component.html` (+ `projects-block.component.spec.ts`; `.ts` only if the active-tab signal is not reachable from the template)
- **Depends on:** PGC-T-2 · **Estimate:** XS · **Skills:** `angular-developer`
- **Review:** `full` (template conditional; changes what a user sees per tab)
- **Scope clauses owned:** 6.1 P/A tab keeps the rule subtitle · 6.2 Center tab shows the Center text **BUT** not the rule sentence
- **Verification:** component spec renders the block, asserts the subtitle equals `copy.subtitle(year)` on the By P/A tab and `copy.centerSubtitle(year)` (and the literal string) after switching to By Center, and that the Center subtitle does not contain "Per Program/Accelerator". Same Jest/eslint commands as T-2; `npx tsc -p tsconfig.app.json --noEmit`.
- **Falsifier:** render `subtitle` unconditionally → the Center-tab assertion goes red.
- **Red run:** predicted greenfield (`centerSubtitle` does not exist); the executed red is quoted.
- **Disqualifier:** asserting the copy function against itself without rendering is no evidence.
- **Consumers:** `projects-block.component.spec.ts`; portfolio-overview `CLAUDE.md` (one line, if it describes the subtitle).
- **Definition of done:** spec green, red quoted, PRTest look on both tabs.

## 4. Dependency graph

PGC-T-1 → PGC-T-2 → PGC-T-3 (T-3 only waits on T-2 because both edit the same copy file).

## 5. Test plan

Server: service + repository specs (T-1). Client: charts + two component specs (T-2, T-3). Compile: `tsc --noEmit` (T-2). Manual: PRTest SQL (T-1), browser look of both graphs (T-2/T-3 HITL).

## 6. Rollout & verification

Normal path: qa-dev → performance-refactor (PRTest ~30 min) → staging → master (Cristian). After PRTest: compare per-P/A "With W3/Bilateral results" against the T-1 SQL for 2 P/As (one with draft contributors). Then reply on INC-168764.

## 7. Cleanup & follow-ups

- Reply to Nicoleta with the four points and the rule change (after PROD).
- `codegraph sync` after merge.

## 8. Roll-back plan

Revert the T-1 commit alone to return to the mapping-based count (client copy then over-explains but stays harmless); revert T-2/T-3 for copy and colours. No data to undo.

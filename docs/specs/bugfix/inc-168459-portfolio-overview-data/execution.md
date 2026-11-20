# Execution Log — INC-168459 Portfolio Overview feedback (`POD`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/inc-168459-portfolio-overview-data` |
| Approval Mode | gated (requirements.md §1) |
| Branch | `qa-development-2026-ss` · base `b82d39d26` |
| Leader | Claude Code, `opus` (T1) |
| Implementer | `akili-implementer` wrapper → `sonnet` (T2) |
| Reviewer | `akili-reviewer` wrapper → `opus` (T3) — differs from the Implementer |
| Budget (design §11) | 3 tasks · ≈ 260 LOC · 4 review rounds |
| Persona check | `akili doctor --agents`: implementer/reviewer CURRENT; `leader.md` `primary-instructions` OUTDATED (Leader playbook only; the command text is canonical) — reported to the user, not fixed in this run |
| Kaizen | `docs/specs/kaizen-log.md` absent — no Active Lessons |
| Start | 2026-11-19 |

**Parallelism:** POD-T-1 (server) ∥ POD-T-2 (client) — disjoint packages, separate `node_modules` and Jest trees. POD-T-3 waits on POD-T-2.

## 2. Task Execution History

### POD-T-2 — Horizontal projects chart with full names

| Field | Value |
|---|---|
| Final status | **`[~]` — Reviewer PASS (attempt 1); held open on the HITL-owned Scenario 1.2 browser check (tasks.md POD-T-2 DoD item 3)** |
| Date | 2026-11-19 |
| Attempts | 1 |
| Skills / effort | `angular-developer`, `tdd` · medium (as listed in tasks.md, no deviation) |
| Requirements covered | POD-R-1 Scenario 1.1 (THEN, AND tooltip, BUT not rotated / not code-only), Scenario 1.3, By Center orientation clause; Scenario 1.2 partly (height grows, no `axisLabel.rotate`) |

**Attempt 1**
- Files changed (all under `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/components/projects-block/`): `projects.format.ts`, `projects.format.spec.ts`, `projects.charts.ts`, `projects.charts.spec.ts`, `projects-block.component.ts`, `projects-block.component.html`, `projects-block.component.spec.ts` (+138 / −31).
- Red (before code, 12 failed / 40 passed): `rows[0].fullLabel` — `Expected: "SP11 · Eleven"`, `Received: undefined`; `option.yAxis.type` — `Expected: "category"`, `Received: "value"`; series label position `'right'` red; table rows `['SP01 · One Program', …]` red. The `projectsChartHeight` and tooltip reds were a TypeError (missing export), which the Implementer did not count as behavioural evidence.
- Mutations: M1 (shortName fallback dropped) → `- "SP10"` / `+ "SP10 · "` red. M2 (yAxis `category`→`value`, a proxy for "keep the old vertical option") → `Expected: "category"`, `Received: "value"` red. Both reverted.
- Implementer verification: `npx jest src/app/pages/result-framework-reporting/pages/portfolio-overview --silent --reporters=summary --no-coverage` → 23 suites / 665 tests passed · `npx ngc -p tsconfig.app.json --noEmit` exit 0 (warnings only in untouched files) · `npx ng lint --quiet` → "All files pass linting."
- Evidence re-run (Leader inline, non-author): **VERIFIED**. The same Jest command gave 23 / 665 passed, and `ng lint --quiet` was clean.
- Reviewer (`akili-reviewer`, opus): **PASS**. The diff meets every in-scope POD-R-1 obligation and design §6.1/6.2/6.3/§10. The HTML-table change (`row.fullLabel`, separate name span dropped) is in scope per Scenario 1.3, with no information lost. The M2 proxy is a strict subset of "restore the vertical option" and hits the named assertion. The tooltip escapes `fullLabel`, `seriesName` and `value` and shows all three series. By Center ordering is preserved via `inverse: true`. The totals row is unchanged (`['Total', 31, 18, 2]`). The PASS does not cover Scenario 1.2 layout.
- ADVISORY (4R, non-gating):
  - Reliability: the tooltip and `projectsChartHeight` reds came from a TypeError; the behavioural reds suffice.
  - Readability: the tooltip test checks values but names only 2 of the 3 series.
  - Risk: `width: 150` plus `containLabel` at 390 px leaves the bars about half the plot width; check this first in the HITL.
  - Readability: label vs fullLabel split is documented.
- Runtime events: none · checkpoints: none · continuations: none.
- spawns: implementer 37 calls, 120483 tokens, ended partial (Not Done = Scenario 1.2 HITL) · reviewer 6 calls, 45917 tokens, ended complete.

**Not Done / Assumptions (Implementer, verbatim)**
> - Scenario 1.2 is Not Done. jsdom cannot measure the ECharts canvas, so a green Jest run says nothing about label clipping or page scroll. Only `axisLabel.rotate` being absent and the height growing are asserted. The 390 px and 1280 px checks are manual HITL.
> - The `width:150` cap and `overflow:'break'` wrap are my reading of the design's "fixed width with wrapping". They are untested visually.

**Issues encountered:** the POD-T-1 Implementer ran a repo-wide `git stash` / `git stash pop` while diagnosing (about 1 min). Leader check afterwards: `git diff -- onecgiar-pr-client` is byte-identical to the diff captured for review, and `git stash list` is empty. The Leader's T-2 re-run produced the post-change test count (665, matching the Implementer), so it did not run during the stash window.

**Open before `[x]`:** the manual browser check at 390 and 1280 px, on both tabs, with screenshots in this file (tasks.md §6). This is a user (HITL) step.

**Running totals (budget tripwire):** tasks 1 of 3 in flight · LOC +138/−31 client · review rounds 1 of 4.

### POD-T-1 — Hide switched-off initiatives from the three P/A seeds

| Field | Value |
|---|---|
| Final status | **`[~]` — Reviewer PASS (attempt 1); one DoD item unobserved: `npm run migration:check` (no DB, probe-confirmed) — closure awaits the user's decision** |
| Date | 2026-11-19 |
| Attempts | 1 |
| Skills / effort | `nestjs-expert`, `tdd` · medium (as listed in tasks.md, no deviation) |
| Requirements covered | POD-R-2 Scenario 2.1, 2.2 (both THEN, the BUT, the AND on ToC `portfolio`), 2.3 (THEN + AND MUST NOT require a row per enabled initiative); NFR backwards compatibility |

**Attempt 1**
- Files changed (all under `onecgiar-pr-server/src/api/results-framework-reporting/`): `results-framework-reporting.module.ts`, `results-framework-reporting.service.ts`, `results-framework-reporting.service.spec.ts`, `dto/portfolio-bilateral-projects.dto.ts`, `dto/portfolio-contribution-requests.dto.ts`, `dto/portfolio-toc-coverage.dto.ts` (+220 / −24).
- Change summary:
  - The private helper `loadPortfolioProgramSeed(versionId)` (tagged `@akili-spec`) keeps the existing seed query.
  - It adds one `find({ where: { version_id, reporting_enabled: false } })` and filters out the off-rows' initiatives, comparing ids with `Number(...)` on both sides.
  - The three methods each call it with their own resolved version id. ToC passes `Number(tocContext.versionId)` from `resolveTocContextForRequest`; projects and requests pass `Number(version.id)` from `resolveReportingVersion`.
  - The entity is registered in `forFeature` and injected.
  - The three Swagger descriptions gain "except those switched off for the phase".
  - Aggregation is untouched.
- New spec describe "Portfolio P/A seed honours the per-phase switch (POD-T-1)":
  - The switch repository is in-memory and honours `where`.
  - The fixture is SP01 (id 1) plus SGP-02 (id `'41'`, a string), with non-zero SGP-02 facts in all three blocks.
  - The exact call arguments `{version_id: 42, reporting_enabled: false}` are asserted on all 3 calls.
  - Cases: switched off, no row, enabled row, off-row for another version.
  - The existing seed `where` assertion (now `:2199`) was kept unchanged and still passes. The Reviewer judged this correct: the helper sends that query unchanged.
- Red (before code): "reads only off-rows…" `Expected number of calls: 3`, `Received number of calls: 0`. The projects, requests and ToC "SGP-02 leaves…" cases failed with `Expected - 0 / Received + 1` (the extra SGP-02 row).
- Mutations (each applied once, red, reverted; diff vs backup identical):
  - A (`reporting_enabled: true`): 5 red.
  - B (no `version_id`): 2 red, including "off-row that belongs to another version".
  - C (facts filtered too): projects `totals.mapped` `Expected: 2, Received: 1`; requests `totals.pending` `Expected: 1, Received: 0`. ToC has no separate C, because its `portfolio` is by definition the sum of the visible rows.
- Disqualifier (P-7) checked: each method passes the version it already uses for its own repository, so no Pivot.
- Implementer verification:
  - `npx jest src/api/results-framework-reporting --silent --reporters=summary --forceExit` → Suites 3 failed / 40 passed; Tests 628 passed / 628.
  - `npx eslint "src/api/results-framework-reporting/**/*.ts" --quiet` clean.
  - `npm run build` compiles.
  - `npm run migration:check` → ECONNREFUSED (not run).
- Evidence re-run (Leader inline, non-author): **VERIFIED**. The same 628 passed and the same 3 suites failed to load: `contributors-partners.module.spec.ts`, `results-framework-reporting.module.spec.ts`, `create-result-from-framework.provenance.spec.ts`, each with `TypeError: Cannot read properties of undefined (reading 'prototype')` via the `@nestjs/jwt` import chain.
- **Pre-existing check (Leader):** I ran the 3 suites on a clean `HEAD` (`b82d39d26`) worktree, sharing `node_modules` through a junction. All 3 fail identically (`Test Suites: 3 failed, 3 total`, `Tests: 0 total`), so this diff did not cause them. The worktree was removed afterwards, and the junction was deleted before removal.
- Reviewer (`akili-reviewer`, opus): **PASS**. The diff meets POD-R-2 S2.1–2.3, design §4/§5 and POD-DD-1; shapes are unchanged.
  - Totals per P-6 are verified at `:1178` (projects), `:1305` (requests) and `:1048` (ToC).
  - Id types are verified (`initiative_id` int, `version_id` bigint as number, string fixture).
  - DTO wording matches §4.
  - Mutations A/B/C are traced through the fixture.
  - The `migration:check` gap is non-blocking by construction (no entity or schema-metadata change, and the entity already exists from P2-2821), but it must be recorded as unobserved.
- ADVISORY (4R, non-gating):
  - Readability: the "another version" case uses `offRow(41)`, so version 41 is the same number as SGP-02's id; prefer an unrelated id.
  - Readability: the new entity import sits outside the file's import grouping.
  - Reliability/perf: the helper's two queries could run in `Promise.all`.
  - Risk: `results-framework-reporting` now depends on an `admin-panel` entity (accepted by POD-DD-1). A shared read helper could own the switch semantics later, together with the P-8 siblings (sibling spec).
  - Process: record the `migration:check` gap explicitly (done below).
- Runtime events: none · checkpoints: none · continuations: none.
- spawns: implementer 32 calls, 158298 tokens, ended partial (Not Done = `migration:check` unobserved) · reviewer 10 calls, 90390 tokens, ended complete.

**Not Done / Assumptions (Implementer, verbatim)**
> - While diagnosing the module spec I ran `git stash` and `git stash pop` on the whole repo. That briefly (about 1 minute) reverted the other Implementer's client edits. The pop succeeded, the stash list is empty, and `git status` shows the client files modified again, but the client Implementer should re-check that its files are intact.
> - Other-version rows are covered by a fake repository that filters on `where`, plus the exact-arguments assertion. There is no real DB test.
> - Disqualifier checked: ToC resolves `versionId` through `resolveTocContextForRequest` and the helper receives that same `resolvedVersionId`, so no Pivot flag.

**Deferred check — `npm run migration:check`:**
- Assumption: it cannot run because no MySQL is reachable.
- Probe (Leader, 2026-11-19): `docker` is not installed in this shell, and `Test-NetConnection localhost -Port 3306` returned False. The Implementer's run got ECONNREFUSED.
- The blocker is probe-confirmed. CI's `migration:check:ci` gate would close it.

**Issues encountered:**
- The repo-wide `git stash` / `pop` above. The Leader confirmed the client diff byte-identical and the stash list empty. Workers must not stash a shared tree; this is noted for kaizen.
- The 3 pre-existing suite load failures in `results-framework-reporting`, out of scope here. They may relate to the `bugfix/reporting-memory-runners` work; not investigated.

**Running totals (budget tripwire):** tasks 2 of 3 in flight · LOC +358/−55 (≈ 413 changed; 220 server + 138 client added, vs ≈ 260 estimated) · review rounds 2 of 4.

### Gate decision — 2026-11-19 (user: "accept budget, defer migration check to CI, continue with T-3")

- **Budget tripwire:** the user accepted the LOC overrun (+358 vs ≈ 260, mostly mutation-proof test fixtures). The run continues. The tripwire was stopped on, not auto-approved.
- **POD-T-1 `migration:check`:** deferred to the CI `migration:check:ci` gate by the user. The probe-confirmed blocker is recorded above. POD-T-1 closes on its Reviewer PASS, so `[~]` → `[x]`.
- **POD-T-3 vs POD-T-2:** the user authorized starting POD-T-3 while POD-T-2 stays `[~]`. The dependency was only file sequencing (`portfolio-overview/CLAUDE.md`), and POD-T-2 does not touch that file. POD-T-2 stays open on the HITL browser check.
- **Commit:** the user has not decided yet. Nothing committed.

### POD-T-3 — Contribution requests explainer and guide note

| Field | Value |
|---|---|
| Final status | **PASS (attempt 3)** |
| Date | 2026-11-19 |
| Attempts | 3 |
| Skills / effort | `angular-developer` · low → medium (attempt 2) → high (attempt 3); effort was bumped one level per rework; no `tdd` (copy and docs task), but a red-first falsifier was still required |
| Requirements covered | POD-R-3 Scenario 3.1 (THEN, BUT counts/ordering/filters unchanged); NFR i18n |
| Review intensity | Task claimed `skip-eligible`. **Not earned.** Override (a) applies, because the task edits `portfolio-overview/CLAUDE.md`, an agent guide other readers execute. Override (e) applies from attempt 2 (rework). Reported at the continue gate per Step 2.3 |

**Attempt 1:**
- Files changed:
  - `onecgiar-pr-client/src/app/internationalization/portfolio-overview.copy.ts` (`contributions.subtitle` set to the POD-R-3 text, verbatim)
  - `…/components/contribution-requests-block/contribution-requests-block.component.spec.ts` (new test "subtitle explains who sends and answers requests (POD-R-3)")
  - `…/portfolio-overview/CLAUDE.md` (a new `## INC-168459 data fixes` section)
- Red (test first, old copy): `Expected: "...Only Programs/Accelerators send and answer them; W3/Bilateral projects and Centers do not receive requests and need no action. Pending = not answered yet."` / `Received: "Requests between Programs/Accelerators to contribute to a result. Pending = not answered yet."` · Tests: 1 failed.
- Disqualifier grep: `grep -rn "Pending = not answered" onecgiar-pr-client/src` returned 2 hits, the copy file and the new assertion.
- Verification: portfolio-overview Jest 23/23 suites, 666/666 tests; `ng lint --quiet` clean. Leader re-run **VERIFIED** (666 passed; lint "All files pass linting.", exit 0).
- Reviewer: **FAIL**
  - Copy verbatim and conformant; guide lines factually accurate; BUT clause holds.
  - Issue 1: `Verified:` stamp not re-stamped (`onecgiar-pr-client/CLAUDE.md` §10; COMPONENT-DOCS §5).
  - Issue 2: a new `##` section instead of "one line each" (`tasks.md` POD-T-3), and the guide went over the COMPONENT-DOCS §4 hard cap of 120 lines. The Reviewer's claim that the guide was "already 122 lines" before this task was wrong; see attempt 2.

**Attempt 2** (feedback: the attempt-1 FAIL report, verbatim):
- Files changed: the guide only. The new section was removed. The two bullets moved into existing sections ("W3/Bilateral projects" and "Gotchas"), and `Verified:` was re-stamped.
- Verification: Jest 23/666 green.
- Leader re-run **VERIFIED** (Jest 666 passed). The Leader also measured `git show HEAD:<guide> | wc -l` = **120**, against **122** now.
- The Leader's attempt-2 brief had carried the Reviewer's wrong premise ("pre-existing overage — do not shrink"). This is a Leader brief error; the correction was passed to the Reviewer.
- Reviewer: **FAIL**
  - Issues 1 and 2 (structure) are resolved.
  - New issue: the guide is 122 lines, over the COMPONENT-DOCS §4 hard cap of 120.
  - Not a spec tension: fixable in scope by joining wrapped bullets word for word (91–93, 117–118).

**Attempt 3** (feedback: the attempt-2 FAIL report, verbatim, plus the corrected premise):
- Files changed: the guide only. The `spartanBrainMock` bullet (91–93) and the "No ranking" bullet (117–118) were joined word for word; CRLF was kept.
- Verification: `wc -l` = 119. `git diff --word-diff` shows no word changes in the joined hunks. Jest 23/666 green.
- Leader re-run **VERIFIED**: `wc -l` 119; `git diff --numstat` +5/−6; whitespace-normalized HEAD-vs-working diff shows only the stamp and the two bullets; Jest 23/23 suites, 666/666 tests.
- Reviewer: **PASS**
  - Cap resolved (119 ≤ 120).
  - Joins word for word, nothing lost.
  - The two bullets sit one line each in existing sections (lines 70 and 82).
  - The stamp names POD-T-2 and POD-T-3 and keeps the prior entries.
  - Issues: none.

- Runtime events: none · checkpoints: none · continuations: none.
- spawns:
  - implementer: attempt 1, 8 calls, 74604 tokens, ended complete · attempt 2, 8 calls, 124356 tokens, ended complete · attempt 3, 5 calls, 123708 tokens, ended complete
  - reviewer: attempt 1, 9 calls, 89734 tokens, ended fail · attempt 2, 3 calls, 82170 tokens, ended fail · attempt 3, 4 calls, 83145 tokens, ended complete
- ADVISORY: none (the Reviewer used checklist mode on a diff under 50 LOC).
- Decisions:
  - The guide-line placement follows the Reviewer's attempt-2 remediation (existing sections, no spec-named heading).
  - The COMPONENT-DOCS §5 stamp position and short-sha gaps are pre-existing across the whole file, so the Reviewer did not count them against this task.
- Issues encountered:
  - The Reviewer's attempt-1 line-count baseline was wrong (122 vs the measured 120), and the Leader passed that error into the attempt-2 brief without measuring. That cost one review round.
  - Kaizen candidate: the Leader measures any numeric premise before putting it in a brief.

**Running totals (budget tripwire):**

| Measure | Actual | Budget (design §11) | Status |
|---|---|---|---|
| Tasks | 3 of 3 executed (POD-T-1 `[x]`, POD-T-3 `[x]`, POD-T-2 `[~]` on HITL) | 3 | within budget |
| LOC | ≈ +363 / −60, mostly tests | ≈ 260 | over budget; accepted by the user 2026-11-19 |
| Review rounds | **5** (T-1: 1, T-2: 1, T-3: 3) | 4 | **over budget — tripwire, stop and escalate** |

### Gate decision — 2026-11-19 (user: "accept rounds, commit now, I'll do the browser check")

- **Budget tripwire (review rounds 5 vs 4):** accepted by the user. The run stopped here; this was not auto-approved.
- **Commit:** authorized. One commit with the spec docs, the server changes (POD-T-1) and the client changes (POD-T-2, POD-T-3). The unrelated `docs/specs/bugfix/reporting-memory-runners/*` changes stay out.
- **POD-T-2:** stays `[~]`. The user will run the HITL browser check (390 and 1280 px, both tabs, screenshots into this file). The Reviewer flagged the 150 px label width at 390 px as the first thing to inspect.
- **Pending items for archive:** `migration:check` deferred to CI (POD-T-1). Kaizen candidates: (1) workers must never `git stash` a shared tree; (2) the Leader measures numeric premises before putting them in a brief.

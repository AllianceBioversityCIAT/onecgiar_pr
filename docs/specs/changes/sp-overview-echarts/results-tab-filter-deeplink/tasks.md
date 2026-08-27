# `changes/sp-overview-echarts/results-tab-filter-deeplink` — Tasks

## 1. Scope of this task list

- **Module / feature:** `programme-results` — URL ↔ filter bridge + center filter (client only)
- **Linked spec:** `requirements.md` (RFD-R-1..3) + `design.md` (RFD-DD-1..5)
- **Owner / driver:** j.cadavid@cgiar.org
- **Status:** approved — ready for /akili-execute (2026-08-27)
- **Depth:** Lite · **Budget:** 2 tasks / ~150 LOC / 1 review round (design.md §1)
- **Family:** `../family.md` row #1 · `Parallel-safe: yes` · may run in a worktree concurrently with #2

## 2. Pre-flight checklist

- [x] `requirements.md` approved (Phase 1 gate 2026-08-27)
- [x] `design.md` approved (Phase 2 gate 2026-08-27)
- [x] No open questions blocking (`origin` values confirmed `W1/W2` · `W3/Bilaterals`)
- [x] No migrations, no backend
- [ ] No conflicting in-flight spec touching `programme-results/**` (check `docs/specs/` at execution start)
- [ ] **Do not touch `package.json` / `package-lock.json`** (reserved to sibling #2 — `../family.md` §3)

## 3. Task list

### `RFD-T-1` — URL ↔ filter bridge (hydrate + mirror) with param constants

- **Type:** `client`
- **Description:** Create `services/programme-results-query-params.ts` exporting the four param names (`status`, `category`, `origin`, `center`) and a `dimension → param` map (RFD-DD-3). In `programme-results.component.ts` add `queryParams = toSignal(route.queryParamMap)` and two effects per design §2.2: **hydrate** (params → the four filter signals, write only when the value differs; `null` when absent) and **mirror** (signals → `router.navigate([], { relativeTo, queryParams, queryParamsHandling: 'merge', replaceUrl: true })`, skipped when the URL already matches — RFD-DD-4/5). Extend `programme-results.component.spec.ts` with an `ActivatedRoute` stub (`BehaviorSubject<ParamMap>` + `snapshot`) and a `Router` spy.
- **Implements:**
  - `RFD-R-1` — *Deep link with several filters* (THEN list filtered + 3 chips + dropdowns show values; AND identical to manual; **BUT NOT** alter `reviewResult`/`reviewResultId`/`phase` → `merge`; **AND IT MUST** match case-insensitively → relies on existing `normalize`, asserted by a mixed-case param test) · *Value matches nothing* (chip + "No results match these filters." + Clear all; **BUT NOT** throw / hide toolbar / drop param) · *No params* (no chips, no filters, **no URL rewrite** → `navigate` not called)
  - `RFD-R-2` — *Copy link reproduces the view* (dropdown + pill → URL contains both; chip × removes only its key; Clear all nulls all four; **BUT NOT** push history → `replaceUrl:true`; **BUT NOT** drop unrelated params → `merge`; **AND IT MUST NOT** loop → `navigate` call count after hydration = 0)
- **Files (expected):** `programme-results.component.ts`, `programme-results.component.spec.ts`, `services/programme-results-query-params.ts` (new)
- **Depends on:** — · **Blocks:** — (RFD-T-2 is independent; center param hydration is wired here but only meaningful after T-2)
- **Estimate:** S (~90 LOC incl. spec)
- **Skills:** `angular-developer`
- **Definition of done:**
  - [ ] Spec cases (a)–(f) from design §10 green: hydration 3-param, unknown value, no params, mirror on change (`replaceUrl:true`, `merge`), clear-all nulls, param change via subject.
  - [ ] **Anti-loop evidence:** after emitting params through the stub, `router.navigate` call count is `0`. **FAIL input:** remove the equality guard in the mirror effect → count becomes ≥1 → red. **Disqualifier:** a spec that never emits params through the subject (only `snapshot`) cannot exercise the loop and is not evidence for this clause.
  - [ ] `merge`/`replaceUrl` asserted on the **actual `navigate` args** (not on a wrapper). **FAIL input:** drop `replaceUrl` → assertion fails.
  - [ ] Full client suite: `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage` green; `npx ng lint --quiet` clean. **Disqualifier:** a green run via `--testPathPattern` narrowing is not evidence — full suite only.
  - [ ] `git diff --stat` shows no `package.json` / `package-lock.json` (RFD-AC-4). **FAIL input:** any dependency edit.

### `RFD-T-2` — Center filter dimension (service, options, toolbar select, chip)

- **Type:** `client`
- **Description:** In `programme-results-filter.service.ts` add `selectedCenter` signal, `'center'` to `ProgrammeResultsFilterDimension` and `ProgrammeResultsFilterState`, the predicate clause on `row.center` (same `normalize` compare), chip `Center: X` after Origin, `clearCenter`, `clearChip('center')`, `clearAll`. In `programme-results.service.ts` add `centerOptions = optionsOf(rows, row => row.center)`. In the component add `centerSelectOptions`, `onCenterChange`; in the template add one `app-pr-filter-select` (`w-[150px]`, placeholder "Center", `aria-label="Filter by center"`) after Origin. Extend the three specs.
- **Implements:**
  - `RFD-R-3` — *Filter by center* (only IITA rows remain; chip `Center: IITA`; status pills recount over center-filtered rows → existing `{ignoreStatus:true}` path; **BUT NOT** offer blank option → `optionsOf` `!!value` filter asserted with empty-center fixtures; **AND IT MUST** use `app-pr-filter-select` → human diff check at HITL, recorded in `execution.md`)
- **Files (expected):** `services/programme-results-filter.service.ts` (+spec), `services/programme-results.service.ts` (+spec), `programme-results.component.ts/.html` (+spec)
- **Depends on:** — · **Blocks:** —
- **Estimate:** S (~60 LOC incl. spec)
- **Skills:** `angular-developer`
- **Definition of done:**
  - [ ] Filter-service spec: predicate match / no-match / empty-center row; chip label; `clearChip` and `clearAll` reset center. **FAIL input:** comparing against `row.origin` instead of `row.center` → match test red.
  - [ ] Data-service spec: `centerOptions` deduped, sorted, **no blanks** with fixtures containing `''`/`null` centers. **FAIL input:** remove the `!!value` filter → red.
  - [ ] Component spec: `onCenterChange('IITA')` sets the signal; rendered chip text `Center: IITA`; status pill counts recomputed (fixture with two centers, two statuses).
  - [ ] HITL diff check: the new select is `app-pr-filter-select` (presence-assertion only — what it cannot prove: that `DataControlService` stays quiet at runtime; covered by the manual RFD-AC-3 pass on the running app: no false "mandatory field incomplete" state).
  - [ ] Full suite + lint green (same disqualifier as T-1).

## 4. Dependency graph

```
RFD-T-1 (bridge)      RFD-T-2 (center)
      └──────── independent; either order; T-1's center param becomes effective once T-2 lands
```

No cycles.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `RFD-TEST-1` | unit (component, route/router stubs) | RFD-R-1 all three scenarios · RFD-R-2 incl. anti-loop | `programme-results.component.spec.ts` |
| `RFD-TEST-2` | unit (pure service) | RFD-R-3 predicate/chip/clear | `programme-results-filter.service.spec.ts` |
| `RFD-TEST-3` | unit (data service) | RFD-R-3 BUT NOT blank option | `programme-results.service.spec.ts` |
| `RFD-TEST-4` | manual (running app) | RFD-AC-3: deep link → chips; dropdown → address bar updates; Back leaves the tab; toolbar fits at 1280px; no mandatory-field false positive | HITL pause |

Client coverage thresholds (50/60/60/60) unaffected.

## 6. Rollout & verification

- [ ] Single PR against `qa-development-2026` — ~150 LOC, well under the ~400 LOC split threshold. PR description: review `programme-results-query-params.ts` first (it is the contract #3 consumes), then the two effects; out of scope: charts, overview clicks.
- [ ] CI green (lint, tests, build, SonarCloud).
- [ ] Manual spot-check on the test env: `…/entity-details/SP02/results?category=Innovation%20development&status=Submitted&center=IITA`.

## 7. Cleanup & follow-ups

- Flip `../family.md` row #1 to `done` at archive; record the query-param contract in `programme-results/CLAUDE.md` (pending item — spec branch).
- `q`/`section` params: only when a consumer needs them.

## 8. Roll-back plan

Revert the single PR; no persisted state, no API, no dependency change.

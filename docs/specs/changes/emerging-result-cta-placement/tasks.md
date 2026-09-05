# Tasks — Persistent emerging-result CTA that opens the Reporting aside

## 1. Scope of this task list

- **Module / feature:** `changes/emerging-result-cta-placement` (client only)
- **Linked spec:** `./requirements.md` (`ERC-R-1`…`R-7`, `R-10`…`R-12`, `R-20`, `ERC-AC-1`…`AC-9`) · `./design.md` (`ERC-DD-1`…`DD-7`, §2.3, §6) · `./judgment.md` (round 1 FAIL; owner fix-only, re-judge skipped)
- **Owner / driver:** session Leader (`/akili-execute`)
- **Status:** `approved` (Phase 3 HITL, 2026-09-05)
- **Depth:** Standard · **Budget:** 5 tasks / ~700 LOC (product ~440, tests ~240, docs ~20) / ≤ 1 Reviewer round per task (`design.md` §1). Execute stops and escalates past any of these.
- **Skills (all tasks):** `angular-developer` · `tdd`. T-1 also `ui-ux-pro-max` (tokens / one brand button).
- **Branch:** current checkout. Do not commit unless the user asks.
- **Verification rule:** scoped Jest only (`--testPathPattern` of the files this task touches). Never `npm run test` without a path. No Cypress required.

---

## 2. Pre-flight checklist

Block execution until every box is ticked.

- [ ] `requirements.md` is approved (Phase 1 Continue already given; stamp Status `approved` at execute start if still `draft`)
- [ ] `design.md` is accepted (Judgment Day C1–C4 patched; owner skipped re-judge — treat as execute-ready unless owner re-opens)
- [ ] Open questions: `ERC-OQ-1` none · `ERC-OQ-2` label **Report emerging result** · `ERC-OQ-3` locked as **hop** (`ERC-DD-2`)
- [ ] No CLARISA / migration work
- [ ] No conflicting in-flight spec editing `reporting-program-band/**`, `indicator-drawer/**`, `lab-report-form/**`, dashboard-lab hub/emerging handlers (re-check `docs/specs/` + `git status` at execute start)
- [ ] Do not touch `package.json` / `package-lock.json`
- [ ] Do not delete `app-report-result-form` or the leftover `showReportModal` host

---

## 3. Task list

### `ERC-T-1` — Band CTA, split emits, fail-closed `canReportEmerging` `[x]`

- **Type:** `client`
- **Description:** Add a distinct outline **Report emerging result** control to `reporting-program-band` in the expanded cluster and the collapsed 48px bar. Split `onWhereToReportClick` so it emits **only** `whereToReport`. New `onReportEmergingClick` emits **only** `reportEmerging`. New `canReportEmerging` input **defaults `false`**. Chrome: Tour outline (32/36px), icon `add_circle`, label **Report emerging result**, `aria-label` when text hides, tab order Tour → Emerging → Where to report. Do **not** bind hosts in this task — unset input must hide the button so a forgotten host cannot leak create chrome.
- **Implements:**
  - `ERC-R-1` *Visible on all four tabs* (control half): THEN the cluster **can** show the labelled control in expanded **and** collapsed chrome when the input is true; **BUT** it MUST NOT replace or hide Tour or *Where to report*; **AND IT MUST** use outline / secondary (not a second filled brand button). Host presence on four tabs is T-4 / T-5.
  - `ERC-R-1` *Narrow viewport*: visible label MAY collapse; **AND IT MUST** keep accessible name **Report emerging result**; overflow of the 48px bar is HITL (jsdom-blind) — do not claim Jest proved layout.
  - `ERC-R-2` *Where to report does not start emerging*: **AND IT MUST NOT** emit `reportEmerging` as a side effect of a *Where to report* click.
  - `ERC-R-2` *Emerging does not open the hub*: emerging click emits `reportEmerging` only (no `whereToReport`).
  - `ERC-R-5` *AVISA* (input half): when `canReportEmerging` is false **or unset**, the control is absent; *Where to report* / Tour stay. **AND IT MUST NOT** use native `[disabled]` (KZ-REH-2).
  - `ERC-R-11` tab order Tour → Emerging → Where to report; focus-visible ring kept.
  - `ERC-R-20` MAY shorter collapsed visible text (**Emerging**) if needed; accessible name stays full.
  - `ERC-AC-1` (control exists) · `ERC-AC-2` / `ERC-AC-3` (emit isolation)
- **Design:** `ERC-DD-3`, §2.3 row 1, §6.2 band row, §6.3
- **Files (expected):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band/reporting-program-band.component.{ts,html,scss,spec.ts}`
- **Depends on:** — · **Blocks:** `ERC-T-4`, `ERC-T-5`
- **Estimate:** M (~160 LOC incl. spec)
- **Skills:** `angular-developer` · `tdd` · `ui-ux-pro-max`
- **Tests:** `reporting-program-band.component.spec.ts`:
  - unset `canReportEmerging` → **no** emerging button (expanded and collapsed fixtures)
  - `canReportEmerging=false` → absent; Tour + *Where to report* still present
  - `canReportEmerging=true` → one labelled control in expanded fixture **and** one in collapsed fixture; outline classes (not the brand-fill class of *Where to report*)
  - *Where to report* click → `whereToReport` emitted once, `reportEmerging` **not** emitted
  - emerging click → `reportEmerging` emitted once, `whereToReport` **not** emitted
  - accessible name **Report emerging result** on the emerging control (text or `aria-label`)
  - DOM order: Tour, then emerging, then *Where to report*
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npm run test -- --testPathPattern="reporting-program-band.component.spec" --silent --reporters=summary --no-coverage
  ```
  - **Pass:** new cases green; existing band specs still green.
  - **FAIL input:** default `true` → unset-input case fails; `onWhereToReportClick` still emits both → isolation case fails; second brand-fill button → outline assertion fails.
  - **Disqualifier:** a test that only checks `canReportEmerging=true` cannot prove `ERC-R-5`. Collapsed overflow is not this command’s job.
- **Definition of done:**
  - [ ] Scoped Jest green; no new `--pr-*` tokens (KZ-MRF-2)
  - [ ] No host wiring in this commit (dashboard-lab still compiling: existing `(reportEmerging)` alias remains until T-4)
  - [ ] Commit only if the user asks: `✨ feat(reporting-program-band) [SPEC:changes/emerging-result-cta-placement]: outline emerging CTA and split band emits`

---

### `ERC-T-2` — `lab-report-form` emerging mode + Output/Outcome chooser `[x]`

- **Type:** `client`
- **Description:** Make emerging create implementable. Add `emergingMode` input (boolean, **default false**). `isEmerging` becomes `emergingMode() || !!emergingCategory()`. Arming effect runs when `indicator` **or** `emergingCategory` **or** `emergingMode` is set. When `emergingMode` and no preselected category: show an Output/Outcome chooser sourced from the same `ResultLevelService` levels the legacy `app-result-level-cards` lists; write local `chosenResultLevelId`; `resultLevelId` = indicator ?? tocNode ?? emergingCategory.levelId ?? chosenResultLevelId. Existing category picker then has options. Do **not** preselect a type. Planned Report (`emergingMode` false) must not show the chooser and must keep today’s arming. No second phase picker — keep `dataControlSE.reportingCurrentPhase`. Emerging payload still goes through `buildCreateResultPayload` with no ToC indicator id. Update folder `CLAUDE.md` in the same commit.
- **Implements:**
  - `ERC-R-3` *Hub no longer opens the legacy dialog* (form half): **AND IT MUST NOT** preselect an indicator category — user chooses Output/Outcome + category.
  - `ERC-R-3` *Band opens the same aside* (form half): AND the form is the planned-Report create form with category choice instead of a locked KPI.
  - `ERC-R-7` *Phase follows the shell*: THEN create uses the shell phase; **BUT** the aside MUST NOT introduce a second phase control; **AND IT MUST NOT** attach a planned ToC indicator id.
  - `ERC-AC-5` (category choice, no KPI) · `ERC-AC-9` (emerging payload, current phase)
- **Design:** `ERC-DD-7`, `ERC-DD-5` (innovation-link lights up only after Innovation use is picked), §6.2 form row
- **Files (expected):** `…/lab-report-form/lab-report-form.component.{ts,html,spec.ts}`, `…/lab-report-form/CLAUDE.md`
- **Depends on:** — · **Blocks:** `ERC-T-3`
- **Estimate:** M (~180 LOC incl. spec + folder doc)
- **Skills:** `angular-developer` · `tdd`
- **Tests:** `lab-report-form.component.spec.ts`:
  - `emergingMode=true`, `emergingCategory=null`, no indicator → form **arms** (initiatives / reset run; not the early-return path)
  - `isEmerging` true; no type preselected (`createResultBody.result_type_id` null)
  - before level choice: category picker not silently empty-as-available (`categoryUnavailable` or equivalent until a level is chosen)
  - after choosing Output (or Outcome): `resultTypes().length > 0`; user can set a category
  - `buildCreateResultPayload` / submit body: no ToC indicator id; phase year from `reportingCurrentPhase`
  - template has **no** extra phase control in emerging mode
  - planned path (`emergingMode` unset/false + indicator): **no** Output/Outcome chooser; existing category / KPI tests stay green
  - `showsInnovationLink` still false until the picked category is Innovation use + phase year ≥ 2026 (do not regress P2-3421)
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npm run test -- --testPathPattern="lab-report-form.component.spec" --silent --reporters=summary --no-coverage
  ```
  - **Pass:** new emergingMode cases + existing planned cases green.
  - **FAIL input:** only `emergingCategory=null` without `emergingMode` treated as emerging → planned empty-host case / `isEmerging` assertion fails; dummy category object to “arm” → preselect test fails.
  - **Disqualifier:** a test that sets `emergingCategory` to a concrete type cannot prove `ERC-R-3`’s no-preselect clause.
- **Definition of done:**
  - [ ] Scoped Jest green; `CLAUDE.md` contract lists `emergingMode` and the chooser
  - [ ] Commit only if asked: `✨ feat(lab-report-form) [SPEC:changes/emerging-result-cta-placement]: emergingMode and Output/Outcome chooser`

---

### `ERC-T-3` — `indicator-drawer` emerging mode `[x]`

- **Type:** `client`
- **Description:** Optional emerging mode on the existing drawer (`emerging` input or `managed.emerging`). When true: `indicator` / `tocNode` may be null; **do not** call `GET_ExistingResultsContributors`; hide `info` and `results` tabs (starting view is `report`); header copy **Report emerging result**; pass `[emergingMode]="true"` and `[emergingCategory]="null"` into `app-lab-report-form`. Planned Report still requires an indicator and still fetches contributors. Escape + dirty-confirm stay the existing drawer behaviour. Update folder `CLAUDE.md` in the same commit.
- **Implements:**
  - `ERC-R-3` *Band opens the same aside* (drawer half): **BUT** planned-KPI tabs `info` / reported-results MUST NOT be offered as the starting view.
  - `ERC-R-6` *Planned row Report* (drawer half): when `emerging` is false and an indicator is set, tabs and contributor GET behave as today; **BUT** it MUST NOT open in emerging mode.
  - `ERC-R-12` Escape + dirty-confirm still fire in emerging mode (reuse existing guards; add one emerging fixture).
  - NFR Performance: no extra “existing contributors” list fetch when there is no indicator.
  - `ERC-AC-5` (emerging chrome) · `ERC-AC-8` (planned not emerging)
- **Design:** `ERC-DD-1`, §6.2 drawer row, §8
- **Files (expected):** `…/indicator-drawer/indicator-drawer.component.{ts,html,spec.ts}`, `…/indicator-drawer/CLAUDE.md`
- **Depends on:** `ERC-T-2` · **Blocks:** `ERC-T-4`
- **Estimate:** M (~120 LOC incl. spec + folder doc)
- **Skills:** `angular-developer` · `tdd`
- **Tests:** `indicator-drawer.component.spec.ts`:
  - emerging + null indicator: `GET_ExistingResultsContributors` **not** called (`http`/`resultsSE` spy)
  - emerging: `info` / `results` tab triggers absent; `manageTab` / starting tab is `report`
  - header contains **Report emerging result**
  - form bindings: `emergingMode` true, `emergingCategory` null
  - planned fixture (indicator set, emerging false): contributor GET still called; `info`/`results` still offered; form `emergingMode` false
  - emerging + dirty + Escape: existing confirm path still invoked (one fixture; do not rewrite the dirty machine)
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npm run test -- --testPathPattern="indicator-drawer.component.spec" --silent --reporters=summary --no-coverage
  ```
  - **Pass:** emerging + planned fixtures green; existing contributor-shape tests untouched.
  - **FAIL input:** emerging still calls `GET_ExistingResultsContributors` → spy `not.toHaveBeenCalled` fails; hiding tabs only with CSS while triggers stay in the tablist → “not offered” test fails.
  - **Disqualifier:** a snapshot of the whole drawer HTML is not evidence that the GET was skipped.
- **Definition of done:**
  - [ ] Scoped Jest green; folder `CLAUDE.md` states `indicator` optional when emerging
  - [ ] Commit only if asked: `✨ feat(indicator-drawer) [SPEC:changes/emerging-result-cta-placement]: emerging mode without contributor GET`

---

### `ERC-T-4` — dashboard-lab open path, hub unhook, query consume, planned unchanged `[x]`

- **Type:** `client`
- **Description:** Add `openEmergingReport()`: refuse when `!canReportEmerging()`; `primeEntityAowContext()`; set `managed` emerging sentinel (`emerging: true`, no KPI); open the drawer on `report`. Bind **both** dashboard-lab band instances: `[canReportEmerging]="canReportEmerging()"` and `(reportEmerging)="openEmergingReport()"` — stop the `(reportEmerging)="openWhereToReportModal()"` alias. `onHubReportEmerging` closes the hub and calls `openEmergingReport()` — **not** `openReportModal()`. Consume `?reportEmerging=true` once (do **not** reuse `whereToReport`). `closeManage` / cancel: if this session was an emerging hop, navigate to `returnTab` (`results` | `my-work`) and drop the two hop keys. After create, **do not** call `rememberResultDetailOrigin()` with the dashboard-lab URL (hop origin from T-5 stays). Planned row `manageIndicator` stays non-emerging. Leave `showReportModal` / `app-report-result-form` in the tree, unused from hub/band. Rewrite `dashboard-lab.hub.spec.ts`. Update `dashboard-lab/CLAUDE.md` (“six entries keep the modal” is now wrong for hub + band).
- **Implements:**
  - `ERC-R-2` *Emerging does not open the hub* (host): THEN the aside opens; **BUT** the hub MUST NOT open as a prerequisite.
  - `ERC-R-2` *Where to report does not start emerging* (host): *Where to report* still opens the hub only.
  - `ERC-R-3` *Hub no longer opens the legacy dialog*: THEN the hub closes **and** the aside opens in emerging mode; **BUT** `showReportModal` MUST stay false / legacy dialog MUST NOT appear.
  - `ERC-R-3` *Band opens the same aside*: Overview / Reporting band emerging click opens emerging `managed` on the current tab.
  - `ERC-R-4` cancel half (consume): **AND IT MUST** restore Results / My results when the aside closes without a create after a hop (`returnTab`).
  - `ERC-R-4` create Smart Back half (host): **AND IT MUST NOT** overwrite a hop-persisted origin with the dashboard-lab URL.
  - `ERC-R-5` *AVISA* (hub + Overview/Reporting): helper false → `openEmergingReport` no-ops; hub emerging MUST NOT open aside or legacy dialog; **AND IT MUST NOT** create a result. *Where to report* MAY still open.
  - `ERC-R-6` *Planned row Report*: THEN aside opens with that indicator; **BUT** `managed.emerging` is false; **AND IT MUST NOT** open the legacy emerging dialog.
  - `ERC-AC-2`, `ERC-AC-3`, `ERC-AC-4`, `ERC-AC-5`, `ERC-AC-7` (Overview/Reporting + hub), `ERC-AC-8`
- **Design:** `ERC-DD-2` (consume + no overwrite), `ERC-DD-4`, `ERC-DD-6`, §2.2 hub + Overview sequences, §2.3 rows 1–2
- **Files (expected):** `…/dashboard-lab/dashboard-lab.component.{ts,html}`, `…/dashboard-lab/dashboard-lab.hub.spec.ts`, `…/dashboard-lab/dashboard-lab.component.spec.ts` (or the existing manage/planned specs), `…/dashboard-lab/CLAUDE.md`
- **Depends on:** `ERC-T-1`, `ERC-T-3` · **Blocks:** `ERC-T-5`
- **Estimate:** M (~160 LOC incl. spec + folder doc)
- **Skills:** `angular-developer` · `tdd`
- **Tests:** `dashboard-lab.hub.spec.ts` + targeted dashboard-lab specs:
  - `onHubReportEmerging`: `showReportModal` stays false; hub closed; `managed.emerging` true; `openReportModal` not called
  - AVISA / `canReportEmerging()===false`: `onHubReportEmerging` and `openEmergingReport` do not set emerging `managed` and do not set `showReportModal`
  - band `(reportEmerging)` (both Overview and Reporting instances) calls `openEmergingReport`, not `openWhereToReportModal`
  - band `(whereToReport)` still opens the hub only
  - `?reportEmerging=true` consumes once and opens emerging; `?whereToReport=true` still opens the hub only
  - `closeManage` after hop `returnTab=results|my-work` navigates back and drops `reportEmerging` + `returnTab`
  - create path does **not** call `rememberResultDetailOrigin` with the dashboard-lab URL
  - planned `manageIndicator`: emerging flag false; `showReportModal` false
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npm run test -- --testPathPattern="dashboard-lab.hub.spec|dashboard-lab.component.spec" --silent --reporters=summary --no-coverage
  ```
  - **Pass:** rewritten hub cases green; planned-report specs still assert non-emerging.
  - **FAIL input:** hub still sets `showReportModal` → AC-4 fails; only one of the two band instances rebound → alias test on the other instance fails.
  - **Disqualifier:** deleting the leftover `app-report-result-form` tag in this task is out of scope and reopens P2-3569 (T-5 owns the lock rewrite).
- **Definition of done:**
  - [ ] Scoped Jest green; both band instances rebound; `CLAUDE.md` hub/band destination updated
  - [ ] Commit only if asked: `✨ feat(dashboard-lab) [SPEC:changes/emerging-result-cta-placement]: hub and band open emerging aside`

---

### `ERC-T-5` — Results / My results hop, Smart Back origin, P2-3569 lock `[x]`

- **Type:** `client`
- **Description:** On `programme-results` and `my-work-board`, bind `[canReportEmerging]` from `isAvisaInitiative` (shared util — do **not** fork a third AVISA helper) plus “programme selected”. Bind `(reportEmerging)` to a hop helper: **first** `rememberResultDetailOrigin(currentUrl)` (path + query), **then** navigate to `entity-details/:code?reportEmerging=true&returnTab=results|my-work`. AVISA / no programme: no CTA, helper does not navigate. Retarget `innovation-link-surfaces.spec.ts`: do **not** treat dashboard-lab’s leftover `app-report-result-form` as the live emerging path; lock the live path to `lab-report-form` `showsInnovationLink` (already unit-tested there). If the static file walk still mentions dashboard-lab’s modal tag, rewrite or delete that example so a dead tag cannot stay green.
- **Implements:**
  - `ERC-R-1` *Visible on all four tabs* (host half): Results and My results bind the input true for a non-AVISA selected programme — **AND** collapsed/expanded come from T-1.
  - `ERC-R-4` *Start from Results or My results*: THEN the emerging aside becomes available after the hop; **BUT** *Where to report* MUST NOT be required (do not set `whereToReport`); **AND IT MUST** restore that tab on cancel (T-4 `returnTab`); **AND IT MUST**, after create, keep Smart Back origin equal to the start tab **including query params** (persist before navigate).
  - `ERC-R-5` *AVISA* (Results / My results): CTA absent; hop not issued; **AND IT MUST NOT** create a result. *Where to report* MAY still open (in-place hub stays).
  - `ERC-R-10` implemented as the documented hop degradation (`ERC-DD-2`), not in-place drawer hosts.
  - `ERC-AC-1` (Results / My results hosts) · `ERC-AC-6` · `ERC-AC-7` (those two tabs)
  - `ERC-DD-5` / P2-3569 lock retarget (defect class “wrong surface” + leftover-tag false green)
- **Design:** `ERC-DD-2`, `ERC-DD-5`, `ERC-DD-6`, §2.2 Results sequence, §6.1, §10 P2-3569 row
- **Files (expected):** `…/programme-results/programme-results.component.{ts,html,spec.ts}`, `…/my-work-board/my-work-board.component.{ts,html,spec.ts}`, `onecgiar-pr-client/src/app/pages/results/pages/result-creator/components/report-result-form/innovation-link-surfaces.spec.ts`
- **Depends on:** `ERC-T-4` · **Blocks:** —
- **Estimate:** M (~80 LOC product + ~60 spec)
- **Skills:** `angular-developer` · `tdd`
- **Tests:**
  - programme-results + my-work-board: non-AVISA → emerging click calls `rememberResultDetailOrigin` with the **current** router URL (include a fixture query, e.g. `?phase=2026`) **before** `navigate`; navigate URL contains `reportEmerging=true` and the matching `returnTab`, **not** `whereToReport`
  - AVISA `SGP-02` / no programme → emerging control absent (input false); hop helper not called
  - *Where to report* click still opens the in-place hub only
  - `innovation-link-surfaces.spec.ts`: does **not** require dashboard-lab HTML to contain a live `[showInnovationLinkQuestion]="true"` on `app-report-result-form` as the emerging path; asserts the live aside form (`lab-report-form`) owns `showsInnovationLink`
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npm run test -- --testPathPattern="programme-results.component.spec|my-work-board.component.spec|innovation-link-surfaces.spec" --silent --reporters=summary --no-coverage
  ```
  - **Pass:** hop-order and lock rewrite green; existing Results / My results specs still green.
  - **FAIL input:** `rememberResultDetailOrigin()` called with no arg **after** navigate → origin is dashboard-lab and the query-param fixture fails; lock left asserting the leftover modal tag → P2-3569 class still green on a dead host.
  - **Disqualifier:** a hop test that only checks `returnTab` and never spies `rememberResultDetailOrigin` cannot prove `ERC-R-4`’s Smart Back clause.
- **Definition of done:**
  - [ ] Scoped Jest green; both hosts bind fail-closed input from `isAvisaInitiative`
  - [ ] P2-3569 lock no longer greens a leftover dashboard-lab modal tag
  - [ ] Commit only if asked: `✨ feat(programme-results) [SPEC:changes/emerging-result-cta-placement]: emerging hop with Smart Back origin`

---

## 4. Dependency graph

```
ERC-T-1 (band chrome + split emit + default-false)
ERC-T-2 (lab-report-form emergingMode + chooser)
   └── ERC-T-3 (indicator-drawer emerging)
         └── ERC-T-4 (dashboard-lab open / hub unhook / query / planned)
               └── ERC-T-5 (Results + My results hop + lock)

Parallel: T-1 ∥ T-2. Do not start T-4 until T-1 and T-3 are done (band API + drawer contract).
```

---

## 5. Test plan

Every acceptance criterion and every MUST scenario clause has a test or an explicit visual substitute.

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `ERC-TEST-1` | unit (client) | `ERC-R-1` chrome, `ERC-R-2` emits, `ERC-R-5` unset/false, `ERC-R-11`, `ERC-AC-1`/`AC-2`/`AC-3` (emit) | `reporting-program-band.component.spec.ts` |
| `ERC-TEST-2` | unit (client) | `ERC-R-3` no preselect + chooser, `ERC-R-7` phase/payload, `ERC-AC-5`/`AC-9` | `lab-report-form.component.spec.ts` |
| `ERC-TEST-3` | unit (client) | `ERC-R-3` no info/results start, `ERC-R-6` planned drawer, `ERC-R-12`, NFR no contributor GET | `indicator-drawer.component.spec.ts` |
| `ERC-TEST-4` | unit (client) | `ERC-R-2` host, `ERC-R-3` hub/band surface, `ERC-R-4` cancel `returnTab` + no origin overwrite, `ERC-R-5` hub refuse, `ERC-R-6` planned row, `ERC-AC-2`…`AC-5`, `AC-7`, `AC-8` | `dashboard-lab.hub.spec.ts` (+ dashboard-lab component spec) |
| `ERC-TEST-5` | unit (client) | `ERC-R-1` Results/My results hosts, `ERC-R-4` hop + Smart Back query, `ERC-R-5` AVISA no hop, `ERC-R-10` hop, `ERC-AC-6`/`AC-7` | `programme-results.component.spec.ts`, `my-work-board.component.spec.ts` |
| `ERC-TEST-6` | unit (client) | P2-3569 live path = `lab-report-form` (`ERC-DD-5`) | `innovation-link-surfaces.spec.ts` |
| `ERC-TEST-7` | HITL / T6 | `ERC-R-1` collapsed-bar overflow, contrast / focus (jsdom-blind) | 375px + ≥900px visual; not Jest |

Client coverage MUST stay above 50/60/60/60. No Cypress. No full-suite run.

### Scenario → task close-out

| Requirement scenario | THEN / BUT / AND IT MUST | Task |
|---|---|---|
| `ERC-R-1` Visible on all four tabs | control in both chrome states; outline; Tour/WTR remain | T-1 (control) + T-4/T-5 (four hosts) |
| `ERC-R-1` Narrow viewport | `aria-label`; no 48px overflow | T-1 + `ERC-TEST-7` |
| `ERC-R-2` WTR does not start emerging | no `reportEmerging` emit / no aside | T-1 + T-4 |
| `ERC-R-2` Emerging does not open hub | aside without hub prerequisite | T-1 + T-4 |
| `ERC-R-3` Hub no legacy dialog | hub closes; aside; no modal; no category preselect | T-4 + T-2 |
| `ERC-R-3` Band same aside | emerging on current tab; no info/results start | T-4 + T-3 + T-2 |
| `ERC-R-4` Start from Results / My results | hop without hub; cancel `returnTab`; Smart Back = start URL+query | T-5 + T-4 |
| `ERC-R-5` AVISA | CTA absent; hub/band refuse; no create; WTR MAY stay | T-1 + T-4 + T-5 |
| `ERC-R-6` Planned row Report | indicator context; not emerging; not legacy dialog | T-3 + T-4 |
| `ERC-R-7` Phase follows the shell | shell phase; no second picker; no ToC indicator id | T-2 |
| `ERC-R-10` | hop degradation (not in-place) | T-5 |
| `ERC-R-11` | DOM/tab order | T-1 |
| `ERC-R-12` | Escape + dirty | T-3 |
| `ERC-R-20` | optional shorter collapsed label | T-1 |

---

## 6. Rollout & verification

- [ ] PR with commit convention `<emoji> <type>(<scope>) [ticket]: <description>` when the user asks to commit / open a PR
- [ ] CI green (lint, scoped tests already run per task, build, `migration:check:ci` unchanged — no migration)
- [ ] Manual QA: four tabs, hub card, AVISA, planned row Report, hop cancel, create Smart Back from My results with a phase query
- [ ] HITL 375px + ≥900px collapsed bar (`ERC-TEST-7`)
- [ ] No bilateral / platform-report change — no consumer ping

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` on archive
- [ ] Optional: promote the three-button band cluster to `docs/ux-ui/design.md` §12 (design §13 — not required to execute)
- [ ] Do **not** expand into a server AVISA refuse (Judgment Day J2-S3, suspect, out of scope)
- [ ] Owner may still flip `ERC-OQ-3` to in-place before execute (~+180 LOC, +1 task → ~880 / 6) — overrules `ERC-DD-2` and replaces T-5 hop with in-place drawer hosts

---

## 8. Roll-back plan

1. Revert the implementation PR(s) in reverse task order (T-5 → T-1).
2. No migration to revert.
3. No feature flag.
4. Hub / band return to `openReportModal()` / dual-emit alias; P2-3569 lock returns to the leftover `app-report-result-form` tag — restore that spec file from the revert.
5. Bilateral / platform-report payloads unchanged — nothing to notify.

---

## Required cross-references

- `./requirements.md` · `./design.md` · `./proposal.md` · `./judgment.md`
- `docs/prd.md` `G1`, `US-S1`, `AC-3`, `AC-9`
- `docs/ux-ui/design.md` §7, §10
- `docs/trd/trd.md` `W1`
- P2-3569 / `innovation-link-surfaces.spec.ts`
- Archived `reporting-entry-hub` (hub card; destination owned here)

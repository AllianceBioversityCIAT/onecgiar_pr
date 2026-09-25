# Tasks — Off-screen ToC gaps reach the section bottom bar

## 1. Scope of this task list

- **Module / feature:** `results` (Result Detail) → `section-bottom-bar` · `rd-contributors-and-partners/multiple-wps`; secondary `ipsr`
- **Linked spec:** [`requirements.md`](./requirements.md) + [`design.md`](./design.md)
- **Ticket:** **P2-3542** under epic **P2-3512**
- **Owner / driver:** Juan David Delgado
- **Branch base:** `performance-refactor` @ `9354317d4`
- **Status:** in-progress — `SBT-T-1` [x] (2026-09-25); `SBT-T-2`, `SBT-T-3` pending
- **Budget (`design.md` §12):** 3 tasks · ~150 LOC · 1 review round. `/akili-execute` escalates rather than continuing if any is exceeded.

---

## 2. Pre-flight checklist

- [x] `requirements.md` approved — user, 2026-09-25
- [x] `design.md` approved — user, 2026-09-25, including `DD-3`'s wider-than-P25 consequence
- [x] Open questions resolved — `SBT-OQ-1` closed by `DD-2` (the modal's own `[isNotifications]="true"` excludes it); `SBT-OQ-2` resolved as **accept** (`D8`, the ring denominator, is a recorded accepted risk); `P-6` moot under the accepted `DD-3`
- [x] CLARISA dependencies — **n/a**, no catalogue call added
- [x] No conflicting in-flight spec on these files — `docs/specs/archive/2026-09-08-changes--realtime-section-completion` is archived, not in flight
- [x] Migration — **n/a**, client-only, no migration
- [ ] 🛑 `git stash@{0}` ("P2-3542 exploratory fix (NOT requested)") holds an earlier sketch of this change. It is **reference only** and predates `DD-2`'s two corrections — **it gates on `isIpsr`, which this design forbids.** Do not `stash pop` it into the working tree

---

## 3. Task list

### `SBT-T-1` — Fold a section's off-screen gaps into the mandatory-field scan [x]

- **Type:** `client`
- **Description:** Add a gap-source registry to `DataControlService` (`registerOffscreenFeedback` / `unregisterOffscreenFeedback`) and fold what the sources return into `fieldFeedbackList` and `mandatoryFieldsTotal` inside `someMandatoryFieldIncompleteResultDetail`, after the DOM pass and outside its `try`/`catch`. The return value must report incomplete when only an off-screen gap exists. `fieldFeedbackList` stays a **writable** signal.
- **Implements:** `SBT-R-1`, `SBT-R-4` (service half), `SBT-AC-10`, `SBT-AC-11`; NFR *Correctness*, *Backwards compatibility*, *Observability*
- **Design:** §8.1, `SBT-DD-1`
- **Files (expected):** `onecgiar-pr-client/src/app/shared/services/data-control.service.ts` · `…/data-control.service.spec.ts`
- **Depends on:** `—`
- **Blocks:** `SBT-T-2`
- **Estimate:** `S`
- **Skills:** `angular-developer` (signals, root service), `tdd` (logic-heavy: the fold and its edge cases)
- **Review:** `full` — changes an exported service surface and widens the semantics of a signal seven production readers and one un-CI'd E2E suite depend on (`P-7`, `P-8`, `P-9`)
- **Verification:**
  - **Falsifier:** on a fixture holding **one complete** `.pr-field.mandatory` **and one registered source returning `['Outcome N~2: Level']`**, the scan must return `true` and `fieldFeedbackList()` must equal `['Outcome N~2: Level']`. Mutation: delete the `feedback.push(...offscreen)` line → that assertion goes red. 🛑 The fixture **must** carry a registered source; with zero sources the mutation is inert and the gate asserts nothing.
  - **Red run:** `cd onecgiar-pr-client && npx jest --no-coverage --testPathPattern="data-control.service"` — the four new cases fail on `9354317d4` on their behavioral assertion (`fieldFeedbackList` does not contain the off-screen label), not on setup. Plus `npx tsc --noEmit` for `D6`.
  - **Disqualifier:** if the only way to build the union is to turn `fieldFeedbackList` into a `computed`, **stop and re-specify** — `P-8` shows four CT assertions call `.set()` on it and no CI job would catch the break.
  - **Consumers:** `section-bottom-bar.component.ts:126,133,220,339` · `save-button.component.html:29,36,47` · scan drivers `result-detail.component.ts:297`, `innovation-package-detail.component.ts:99`, `innovation-package-creator.component.ts:211`, `result-creator.component.ts:423`, `report-result-form.component.ts:494` · tests `data-control.service.spec.ts`, `section-bottom-bar.component.spec.ts`, `rd-contributors-and-partners.zoneless.spec.ts:456`, `cap-dev-info.component.spec.ts:612` · **E2E/CT, neither on CI:** `cypress/e2e/result-detail/save-validation.cy.ts`, `save-button.contract.cy.ts:190-211`, `pr-input.contract.cy.ts:147`, `pr-textarea.contract.cy.ts:142`
- **Definition of done:**
  - [x] A source returning labels is folded into `fieldFeedbackList` and counted in `mandatoryFieldsTotal`; the scan returns `true` when only an off-screen gap exists (`SBT-AC-10`'s sibling case)
  - [x] An unregistered source stops contributing (service half of `SBT-R-4`)
  - [x] A **throwing** source is caught, and the on-screen gaps are still reported (`SBT-AC-10`)
  - [x] `typeof fieldFeedbackList.set === 'function'` asserted in the spec (`SBT-AC-11`, gate for `D5`)
  - [x] Falsifier executed against the post-change code: the named mutation observed **red**
  - [x] `npx jest --testPathPattern="data-control.service"` green · `npx tsc --noEmit` clean · `npx ng lint --quiet` clean
  - [x] Commit per convention, no apostrophe / `$` / quote in the subject (Jenkins, client `CLAUDE.md` §10)

---

### `SBT-T-2` — Publish the gaps of the ToC tabs that are not rendered (regression test)

- **Type:** `client`
- **Description:** `CPMultipleWPsComponent` registers a gap source on init and drops it on destroy. It reports every tab except the rendered one — and the rendered one too while `showMultipleWPsContent` is `false` — using `completnessStatusValidation(tab)` unchanged as the per-tab truth. Gate: `!isContributor && !isNotifications && !hidden && !isUnplanned`. Labels: `<tab title> N~<n>: <first missing field>`. **This task carries the mandatory Bug Mode regression test.**
- **Implements:** `SBT-R-1`, `SBT-R-2`, `SBT-R-3`, `SBT-R-4`, `SBT-R-5`, `SBT-R-6`, `SBT-R-7`, `SBT-R-20`; `SBT-AC-1`..`SBT-AC-9`
- **Design:** §8.2, `SBT-DD-2`, `SBT-DD-3`, `SBT-DD-4`
- **Files (expected):** `…/rd-contributors-and-partners/components/multiple-wps/multiple-wps.component.ts` · `…/cpmultiple-wps.component.spec.ts`
- **Depends on:** `SBT-T-1`
- **Blocks:** `SBT-T-3`
- **Estimate:** `M`
- **Skills:** `angular-developer` (zoneless `TestBed`, signal-backed inputs, lifecycle hooks), `tdd` (the regression test is the deliverable), `systematic-debugging` (the confirmed root cause carries into the fixture design)
- **Review:** `full` — one component with **six** mount sites across four features; `DD-2`'s gate is the only thing keeping five of them silent
- **Verification:**
  - **Falsifier:** on a fixture with **two** tabs — tab 1 complete (`toc_level_id:2, toc_result_id:77, indicators[0].related_node_id:9, targets[0].contributing_indicator:5`), tab 2 identical but `contributing_indicator: null` — with `activeTabIndex` 0, the published list must be exactly `['Outcome N~2: Contribution to indicator target']`. Two mutations, each going red on a named case: (a) drop the registration → `SBT-AC-1` red; (b) remove the `index !== activeTabIndex` skip → `SBT-AC-2` red on a double-count. 🛑 The fixture **must** hold two tabs of differing completeness; on a one-tab fixture, or two identical tabs, both mutations read the same as the correct code and the gate asserts nothing (`SBT-AC-5` is the one-tab case and is a *separate* assertion, not the falsifier).
  - **Red run:** `cd onecgiar-pr-client && npx jest --no-coverage --testPathPattern="cpmultiple-wps"` — `SBT-AC-1` fails on `9354317d4` on its behavioral assertion (the published list is empty), not on a missing method. 🛑 The existing `ApiService` mock in that suite has no `registerOffscreenFeedback`; add it to the mock **first**, so the red is the assertion and not a `TypeError`. `isCP2026` is a dependency-less `computed` — flip the `FieldsManagerService` stub **before** `TestBed.createComponent`, or the instance caches the first answer.
  - **Disqualifier:** if `completnessStatusValidation(tab)` turns out to disagree with the tab's own check icon for any fixture (`P-4` false), **stop** — the publisher has no trustworthy source and `DD-3` collapses. Re-specify rather than adding a second completeness rule.
  - **Consumers:** the six `app-cp-multiple-wps` mount sites, each exercised by the gate: `rd-contributors-and-partners.component.html:69,493` · `ipsr-contributors.component.html:21,196` · `share-request-modal.component.html:64` · `notification-item.component.html:353` · `result-review-drawer.component.html:265,539`. Plus `rd-contributors-and-partners.zoneless.spec.ts` (runs the real scan over the real template) and `cypress/e2e/result-detail/save-validation.cy.ts` (**not on CI** — `P-9`; re-read `:70-88` if the row label shape changes)
- **Definition of done:**
  - [ ] `SBT-AC-1` — two tabs, tab 2 empty, standing on tab 1 → the gap is published and named
  - [ ] `SBT-AC-2` — the rendered tab is **not** published (no double count) · `SBT-AC-3` — both complete → nothing published
  - [ ] `SBT-AC-4` — the active tab **is** published while `showMultipleWPsContent` is `false`
  - [ ] `SBT-AC-5` — a single tab publishes nothing · `SBT-AC-7` — `isContributor` publishes nothing · `SBT-AC-8` — `isUnplanned` publishes nothing
  - [ ] `SBT-AC-6` — the source is gone after `fixture.destroy()`
  - [ ] `SBT-AC-9` — `rd-contributors-and-partners.zoneless.spec.ts` and `data-control.service.spec.ts` still green: no regression for sections with no ToC tabs
  - [ ] Both falsifier mutations executed against the post-change code and observed **red**
  - [ ] Labels resolve in form order: `Level` → `Outcome`/`Output` → `Contribution to indicator target`
  - [ ] `npx jest --testPathPattern="(cpmultiple-wps|data-control.service|rd-contributors-and-partners)"` green · `npx tsc --noEmit` clean · `npx ng lint --quiet` clean

---

### `SBT-T-3` — Confirm in a real browser and re-stamp the folder guides

- **Type:** `docs` + manual verification
- **Description:** The gate for `D9` — the class with no automated check. Walk the reproduction on TEST against result 8954 and confirm the bar and the rail agree; check `D8`'s ring reading by eye while there. Then update the two folder guides that describe this bar and re-stamp their `Verified:` lines in the **same commit**, per the folder-doc convention.
- **Implements:** `SBT-AC-1` end to end; `D8` and `D9` from `requirements.md` §9
- **Design:** §11 (`P-1`, `P-2` re-confirmed live)
- **Files (expected):** `…/result-detail/CLAUDE.md` · `…/rd-contributors-and-partners/CLAUDE.md`
- **Depends on:** `SBT-T-2`
- **Blocks:** `—`
- **Estimate:** `S`
- **Skills:** `systematic-debugging` (the browser walk is the last confirmation of the diagnosis); `playwright-cli` **only if installed locally** — otherwise a manual walk in Chrome
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** on TEST, result 8954, tab 1 complete and tab 2's contribution empty and saved, **after a full page reload**: the bar reads red and names `Outcome N~2: Contribution to indicator target`, and `SELECT validation_contributor_partner_P25(11422)` returns `0` while the bar is **not** green. A green bar against a `0` is the failure.
  - **Red run:** `n/a (manual gate — this is `D9`'s substitute, a human check at the HITL pause)`. 🛑 Two traps from the client guide §9, both of which produce a convincing false negative: inject **`token` AND `user`** in localStorage (`token` alone leaves `readOnly: true` and the controls missing), and confirm the served bundle is not stale via `window.ng.getComponent(...)` before concluding anything. Do not restart a dev server another session owns.
  - **Disqualifier:** if the browser disagrees with the green Jest suites, **stop and reopen the diagnosis** — do not patch the component until the disagreement is explained. A green unit suite over a wrong wiring is exactly what this ticket already cost once.
  - **Consumers:** `none (no shared symbol changed)`
- **Definition of done:**
  - [ ] The reproduction walked on TEST; bar and rail agree on tabs 1 and 2, before and after a reload
  - [ ] `SELECT validation_contributor_partner_P25(11422)` run and its value recorded against what the screen showed
  - [ ] `D8` confirmed by eye: the ring may under-count its denominator but never reads full while something is missing — recorded as the accepted risk it is
  - [ ] Both folder `CLAUDE.md` files updated and `Verified:` re-stamped in the same commit
  - [ ] The Jira comment states what shipped, and corrects QA's `ResultSectionsService` attribution (`requirements.md` §12) — decisions and deviations only, never a checklist of what is pending

---

## 4. Coverage closure

Every requirement, scenario clause and acceptance criterion is owned by a named task. No row is discharged by citing a different requirement.

| Requirement / clause | Owner |
|---|---|
| `SBT-R-1` (never complete while any tab is incomplete) | `T-1` (service) + `T-2` (publisher) + `T-3` (browser) |
| `SBT-R-2` (names tab + field) | `T-2` |
| `SBT-R-3` (no save round-trip) | `T-2` `SBT-AC-3`; confirmed live in `T-3` |
| `SBT-R-4` (stops on destroy) | `T-1` (unregister) + `T-2` (`SBT-AC-6`) |
| `SBT-R-5` (mirrors stay silent) | `T-2` (`SBT-AC-7`) |
| `SBT-R-6` (IPSR) | `T-2` — the gate omits `isIpsr`, which is what lets IPSR speak (`DD-2`) |
| `SBT-R-7` (one tab / no tabs unchanged) | `T-2` (`SBT-AC-5`, `SBT-AC-9`) |
| `SBT-R-10` ("Section incomplete" kept) | `T-2` — no change required; asserted by the existing `section-bottom-bar.component.spec.ts` |
| `SBT-R-20` (no jump button) | `T-2` — existing `canGoToField` degradation, asserted not changed |
| **Scenario 1** *BUT must NOT ask the server* | `T-2` — the suite mocks no HTTP; a request would fail the suite |
| **Scenario 1** *AND IT MUST turn green without a save* | `T-2` (`SBT-AC-3`) + `T-3` |
| **Scenario 2** *BUT must NOT wait for Save draft* | `T-3` (live typing on the rendered tab) |
| **Scenario 2** *AND IT MUST turn red again as fast* | `T-3` |
| **Scenario 3** *BUT must NOT carry the gap over* | `T-2` (`SBT-AC-6`) |
| **Scenario 3** *AND IT MUST ignore mirrors on both sections* | `T-2` (`SBT-AC-7`, both the Result Detail and IPSR mirror bindings) |
| `SBT-AC-10`, `SBT-AC-11` | `T-1` |

---

## 5. Dependency graph

```
SBT-T-1  ──▶  SBT-T-2  ──▶  SBT-T-3
(service)     (publisher     (browser +
              + regression)   docs)
```

Linear, no cycle. `T-2` cannot be written before `T-1` exists because its publisher calls the registry `T-1` adds.

---

## 6. PR strategy

**One PR.** ~150 LOC across four files in one package, one ticket, one reviewable idea. Splitting would leave `T-1`'s registry in `main` with nothing registering into it.

- Suggested subject: `🔧 fix(section-bottom-bar) P2-3542: report the gaps of the ToC tabs that are not on screen`
- 🛑 No apostrophe, `$` or quote in the commit subject — Jenkins interpolates it into an unquoted `sh` and the build dies with the tests green (client `CLAUDE.md` §10, build #2286).

---

## 7. Review intensity

| Task | `Review` | Why |
|---|---|---|
| `SBT-T-1` | `full` | Exported service surface; a signal seven production readers and one un-CI'd E2E suite depend on |
| `SBT-T-2` | `full` | Six mount sites; `DD-2`'s gate is the only thing keeping five silent |
| `SBT-T-3` | `checklist` | Docs and a manual walk |

**No task is `skip-eligible`.** The two code tasks both touch shared surfaces, and the third is the substitute gate for a defect class with no automated check — none of the three qualifies for a mechanical skip.

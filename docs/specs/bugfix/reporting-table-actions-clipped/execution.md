# Execution Log — Reporting Table Actions Clipped (Bug, Lite)

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/bugfix/reporting-table-actions-clipped/` |
| Type | Bug |
| Depth | Lite |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` |
| Log created | 2026-09-01 |
| Command | `/akili-execute docs/specs/bugfix/reporting-table-actions-clipped` |

**Agent routing this run:** Leader T1 (opus) · Implementer T2 (sonnet) · Reviewer T3 (opus). `author ≠ auditor` held on every attempt — the Reviewer never ran on the Implementer's model.

---

## 2. Task Execution History

### `RTA-T-1` — Add horizontal scroll to HLO-level row collapse

| Field | Value |
|---|---|
| **Final status** | **PARTIAL — code PASS (Reviewer, attempt 3), behavioural DoD outstanding → `[~]`** |
| Date | 2026-09-01 |
| Implementer attempts | 3 |
| Reviewer verdicts | FAIL → FAIL → **PASS** |
| Requirements covered (structurally) | RTA-R-1, RTA-R-2, RTA-R-3, RTA-R-10; RTA-AC-1, RTA-AC-2, RTA-AC-3 |
| Skills assigned | `angular-developer` |
| Effort | attempt 1 `medium` → attempt 2 `high` → attempt 3 `xhigh` (bumped one level per retry, per the rework loop) |

**Leader skill deviation (recorded per Delegation Discipline):** `tdd` was deliberately *not* assigned despite being available in the Skill Map. Red→green earns its cost on algorithms and business rules; on a CSS/markup change with no `.ts` logic it is pure overhead. `angular-developer` alone was assigned.

**Leader lens-mode deviation:** the effort dial reached `xhigh` on attempt 3, which nominally selects *parallel lens reviewers*. Leader adjudicated to keep **lens checklist** mode: the attempt-3 diff was a three-line Spanish prose compression in a markdown doc, touching no security, migration, or data-loss surface. Recorded rather than silently applied.

#### Attempt 1 — Reviewer FAIL

- **Files changed:** `reporting-aow-table.component.html` (+2/-1), `reporting-aow-table.component.scss` (+11), `reporting-aow-table/CLAUDE.md` (+6/-1).
- **Changes:** added `pr-collapse--rows` modifier to the HLO-level collapse wrapper; added `.pr-collapse--rows > .pr-collapse-inner { overflow-x: auto; overflow-y: hidden; }` with an RTA-DD-1 rationale comment; added `min-width: 1048px` to `.pr-hlo-head` and `.pr-reporting-row`; re-stamped the component `CLAUDE.md`.
- **Verification:** `cd onecgiar-pr-client && npx ng lint --quiet` → `Linting "onecgiar-pr-client"... / All files pass linting.`
- **Reviewer verdict:** `STATUS: FAIL`. Six code checks explicitly **passed**: (1) cascade — `.pr-collapse--rows > .pr-collapse-inner` (0,2,0) at line 47 beats the base `.pr-collapse > .pr-collapse-inner` (0,2,0) at lines 28–31 on source order, with Angular's emulated encapsulation adding equal attribute weight to both, and nothing after line 47 re-clips; (2) `overflow-y: hidden` survives, so the 0fr→1fr collapse animation is intact and `pr-collapse--card` untouched; (3) `min-width: 1048px` matches design.md §6.2's derivation exactly (604 fixed tracks + 280 title floor + 7×16 gaps + 52 padding), is inert above ~1350px, and both classes live inside the new scroller so no non-scrolling ancestor can overflow; (4) `.pr-flat-scroll` / `.pr-flat-row` untouched (RTA-R-3); (5) no nested second x-scroller — the only x-scrolling relative is in the mutually exclusive `flat` view branch; (6) both `grid-template-columns` lines byte-identical (P2-3296 / MRF-R-3.1/R-5 pins intact), aria unchanged, and header/rows are siblings in one scroll box so RTA-R-2 alignment is structural rather than synced.
- **FAIL issue 1:** the `CLAUDE.md` `Verified:` stamp was rewritten without a commit sha. Violated `onecgiar-pr-client/docs/COMPONENT-DOCS.md` §5 — the sha is the exact field the staleness check reads. Remediation: restore the three-field form.

#### Attempt 2 — Reviewer FAIL

- **Files changed:** `reporting-aow-table/CLAUDE.md` only, one line. Code files locked out of scope by the Leader's brief.
- **Change:** stamp restored to `**Verified:** 2026-09-01 · branch qa-development-2026-ss · 36549123f`.
- **Verification:** `cd onecgiar-pr-client && npx ng lint --quiet` → `All files pass linting.`
- **Reviewer verdict:** `STATUS: FAIL`. The stamp remediation itself was accepted on all four judged points — field form satisfies §5; the HEAD-vs-folder-scoped sha choice is defensible (§5 defines the stamped value as "the short sha the content was checked against", which the folder-scoped `853c606b0` would misstate since it predates the uncommitted changes); the dropped parenthetical is annotation beyond §5's three fields and its content survives elsewhere in the file; the Trampas bullet's substance is adequate per §3.
- **FAIL issue 1 (new finding, self-flagged as missed in attempt 1):** the file was **121 lines** against `COMPONENT-DOCS.md` §4's **hard cap of 120** — the 4-line RTA-T-1 bullet took it from 117 to 121. Remediation: compress the bullet inside this spec's own footprint, keeping all four facts.
- **ADVISORY (non-gating, recorded):**
  - *Readability:* the Implementer's rationale quoted a §5 sentence that does not exist; the conclusion is right but rests on §5's definition plus §6's same-commit rule.
  - *Risk:* the stamp is deliberately ahead of the folder-scoped sha, so §5's staleness check reads the doc as unverified until RTA-T-1 is committed. **Per §6, `36549123f` must be amended to the fix commit's own sha in the commit that lands the `.html`/`.scss` hunks, or the doc ships permanently self-flagged as stale.**

#### Attempt 3 — Reviewer PASS

- **Files changed:** `reporting-aow-table/CLAUDE.md` only — the RTA-T-1 Trampas bullet compressed from 4 lines to 3.
- **Verification (Implementer):** `wc -l` → `120`; `npx ng lint --quiet` → `All files pass linting.`
- **Verification (Leader, inline):** independently confirmed `wc -l` = 120; `grep -n "TEMP\|-->"` → no matches, exit 1 (the Implementer self-reported a transient stray `-->TEMP` marker during editing — the final tree is confirmed clean of it); `git diff --stat` on the component folder → CLAUDE.md 5 +/-, `.html` 2 +/-, `.scss` 11 + and no other file touched.
- **Reviewer verdict:** `STATUS: PASS`. Independently recounted the file to line 120, confirmed all four required facts survive the compression verbatim (the `.pr-collapse--rows > .pr-collapse-inner` horizontal scroll, the `overflow-y: hidden` animation contract, `min-width: 1048px` on both grid elements, `pr-collapse--card` explicitly untouched), confirmed §3 house style intact and no adjacent bullet or section disturbed, and confirmed the absence of the stray marker by reading all 120 lines rather than trusting grep. ADVISORY block suppressed under the sub-50-LOC diff-scale rule.

#### Final state of the diff (all three attempts)

| File | Change |
|---|---|
| `reporting-aow-table.component.html` | `class="pr-collapse"` → `class="pr-collapse pr-collapse--rows"` on the HLO-level wrapper (line 672) |
| `reporting-aow-table.component.scss` | +11: the `.pr-collapse--rows > .pr-collapse-inner { overflow-x: auto; overflow-y: hidden; }` rule with its RTA-DD-1 comment, plus `min-width: 1048px` on `.pr-hlo-head` and `.pr-reporting-row` |
| `reporting-aow-table/CLAUDE.md` | +5/-1: re-stamped `Verified:` line, 3-line RTA-T-1 Trampas bullet; file at exactly 120 lines |

No `grid-template-columns` track list altered. No DOM node added. No aria attribute changed. No `@media` breakpoint introduced.

#### Why this task is `[~]` and not `[x]`

The Reviewer PASS covers **the diff**. It does not cover the task's Definition of done, which is explicitly worded as a *presence-of-behavior* check, not a code-presence check. Outstanding and unperformed:

- Manual browser check at **1920px / 1440px** — no visual change vs. current layout (RTA-AC-3's negative constraint).
- Manual browser check at **1350px / 1024px / 768px** — the "···" button, Report/Continue button, and Copy-link icon actually **clickable** after horizontal scroll, with `.pr-hlo-head` staying aligned (RTA-R-1, RTA-R-2).
- Card-level collapse open/close animation smoke check (confirms the `pr-collapse--card` path was untouched in practice, not only in the diff).

Both the Reviewer and the Leader stated this independently: the evidence so far is **structural** (CSS declarations present, cascade proven on paper, lint green), and a static proof cannot demonstrate that a button is reachable. Per `/akili-execute` Step 2.3.0 — *a task with an outstanding gap never reaches `[x]`, even on a Reviewer PASS* — the task is parked at `[~]`.

**Deferral probe (per `.agents/leader.md` → Deferring a check):** the assumption tested was *"this cannot be verified without a running stack and an authenticated session."* The probe found `onecgiar-pr-client/cypress/e2e/` already contains an authenticated-flow pattern (`login-simplified.cy.ts`, `results-list.cy.ts`, `result-detail/`), so a real-browser check **is** reachable in this repo — which is precisely what `RTA-T-2` exists to build. The deferral is therefore routed to `RTA-T-2`, not accepted as a blocker. No dev server was started during this run (concurrency rule: never measure while a delegated agent is active).

#### Decisions made

1. `tdd` withheld (CSS/markup task) — recorded above.
2. Lens-checklist mode retained at `xhigh` — recorded above.
3. Code files locked out of scope on attempts 2 and 3 once the Reviewer had signed off on them, so the rework loop could not churn a passing diff while chasing a documentation-convention finding.
4. **No commit made.** Gated approval mode, and the project's standing instruction is never to commit without an explicit user go-ahead. The working tree carries the change unstaged.

#### Issues encountered

- Two rework rounds were spent entirely on `COMPONENT-DOCS.md` conventions (§5 stamp fields, §4 line cap) rather than on the fix itself. The design.md budget predicted **1** review round; actual was **3**. See the budget note below.
- The Reviewer surfaced the §4 line-cap breach only on attempt 2, having missed it on attempt 1, and said so explicitly rather than letting it ship.

#### Budget tripwire (design.md §Budget)

| Signal | Budgeted | Actual |
|---|---|---|
| Expected tasks | 2 | 2 (unchanged) |
| Expected LOC | ~25–35 | 16 insertions / 2 deletions — **under** budget |
| Expected review rounds | 1 | **3** — over budget |

**Cause:** not spec drift and not a mis-sized fix — the production change landed correct on attempt 1 and was never revised. Both extra rounds were `reporting-aow-table/CLAUDE.md` convention compliance (a missing sha field, then a one-line overflow of the 120-line cap). The spec's sizing of the *fix* was accurate; what it did not price was the component-doc re-stamp obligation it carries in its own Files-expected list. Escalated to the user at the gate rather than absorbed, per the tripwire rule.

---

---

## Pivot Record: `RTA-T-2`

**Date:** 2026-09-01 · **Raised by:** Leader, during the Step 2.1 environment pre-check — **before** any Implementer was spawned. No rework attempt was consumed.

**Status:** ✅ **APPROVED by the user 2026-09-01 — Option B (Cypress component testing).** Spec amendments applied and closed with the mandated two-direction sweep (see *Amendment closure* at the end of this record).

### Blocker

`design.md` §10 and `tasks.md` `RTA-T-2` pin the regression harness to **Cypress E2E** at `cypress/e2e/reporting-aow-table-actions-scroll.cy.ts`. That harness cannot produce evidence in this checkout:

- `onecgiar-pr-client/cypress.env.js` **does not exist** (only `cypress.env.js.example` is present; the real file is gitignored, per-developer).
- `cypress.config.js` therefore computes `hasCredentials: false` and `hasToken: false`, and its own comment states the specs "skip gracefully on machines without secrets".
- An E2E run would consequently **skip rather than assert** — which trips `RTA-T-2`'s own **no-pass clause**: a test that cannot distinguish its states "is not evidence". It would also require the full stack (client `:4200` + server `:3000` + a dev MySQL populated with Reporting-tab data for a Science Program with at least one AoW/HLO group carrying indicator rows).

This is a defect in the approved **design**, not in an implementation attempt: the spec selected a harness whose preconditions this repo does not satisfy by default.

### Probe that produced the alternative

Per `.agents/leader.md` → *Deferring a check*, the assumption *"real-browser verification requires a running stack and an authenticated session"* was tested rather than accepted. It is **false**:

| Evidence | Finding |
|---|---|
| `find src -name "*.cy.ts"` | **47 existing Cypress component specs**, with an established `.contract.cy.ts` convention — CT is a proven, heavily-used path in this repo, not aspirational |
| `cypress.config.js` → `component` block | A fully configured Angular CT dev-server (curated `projectConfig`, `tsconfig.ct.json`, global SCSS incl. `src/styles.scss` loaded via `cypress/support/component.ts`), port overridable with `CT_DEV_SERVER_PORT` |
| `reporting-aow-table.component.ts` | Nine `input<>()` signals (`search`, `statusFilter`, `filtersActive`, `viewMode`, `canReport`, `expandAll`, `scopeKey`, `expandAllNonce`, `lastReported`); no `inject(` in the file. Its own `CLAUDE.md`: *"Presentación pura — no hace fetch, no inyecta ningún servicio"* |

The component mounts on plain inputs. A component test runs it **in a real browser** — real CSS Grid track sizing, real `scrollWidth`/`clientWidth`, real `getBoundingClientRect`, a real click on the "···" button — with **no login, no backend, and no database**.

### Alternatives considered

| # | Option | Assessment |
|---|---|---|
| **A** | Keep E2E as specced | Viable **only** if the user supplies `cypress.env.js` (from `cypress.env.js.example`) and runs the full stack against a dev DB with populated Reporting data. No spec amendment needed. Cost: environment setup + a data precondition the spec never named; the test stays sensitive to dev-data drift |
| **B** | Pivot the harness to a Cypress **component** test | No credentials, no backend, no seed data. Hermetic and deterministic. Proven in-repo (47 precedents). Gives strictly the same *class* of evidence the spec wanted — real-browser layout measurement — for the defect actually under test, which `design.md` §6.3 itself calls **intrinsic** (content-driven overflow, not a `@media` rule). Cost: amends `design.md` §10 + `tasks.md` `RTA-T-2` |
| C | Jest/jsdom | **Rejected — already rejected by `design.md` §10** for the right reason: jsdom implements neither CSS Grid track sizing nor `overflow`/scroll geometry, so it can only produce the presence-assertion false-positive this spec exists to avoid. Not reopened |

### Recommended direction (Option B)

Replace the E2E spec with `…/reporting-aow-table/reporting-aow-table.actions-scroll.cy.ts` (colocated, matching the repo's CT `specPattern` and naming convention), mounting the component with fixture rows inside a width-constrained container and asserting, at container widths standing in for 1350 / 1024 / 768px:

1. `.pr-collapse--rows > .pr-collapse-inner` has `scrollWidth > clientWidth` (the scroller is live);
2. after `cy.scrollTo('right')`, `[aria-label="More actions"]` is `visible` and `click()`able, opening the row menu (`role="menu"`) — the presence-of-**behavior** assertion, not a class-presence assertion;
3. at a wide container (≥1440px) `scrollWidth === clientWidth` — no scrollbar, satisfying RTA-AC-3's negative constraint;
4. `.pr-hlo-head` and `.pr-reporting-row` share one scroll container, so RTA-R-2 alignment is structural (asserted by their common `offsetParent`, not by pixel diffing — the pixel-alignment gap stays out of scope per `design.md` §10).

**Honest caveat, and its resolution:** a CT mount lacks the real ancestor chain (page shell + ~280px reporting nav sidebar), so it cannot reproduce the user's *viewport* width literally — it constrains the component's container instead. This is faithful for this defect precisely because `design.md` §6.3 established the fix is intrinsic and activates "whenever available width drops below ~1048px, at any width, not just at a hardcoded 1350px" — the 1350px figure being "a symptom of this user's sidebar+viewport combination, not a value to hardcode". The CT harness tests the real trigger (available width) rather than the incidental symptom. What CT does **not** cover is the integration question of whether the real shell actually produces a sub-1048px container at 1350px viewport — that remains a human visual check, and should be stated as such rather than assumed covered.

### Deviation from the protocol's step order (recorded)

The Pivot Protocol sequences: document → amend `requirements.md`/`design.md`/`tasks.md` → obtain approval. The amendment step is **held** pending approval because (a) this spec is `Approval Mode: gated`, and (b) rewriting three already-approved documents is itself the change under consideration — doing it first would present the user with a decision already taken. A concrete, reviewable proposal is given above in place of the edit. On approval, the amendment proceeds with the mandated **two-direction sweep** (forward: grep `cypress/e2e` and the old spec filename across the spec folder; backward: grep references *to* `design.md` §10 and the `RTA-TEST-1` row in `tasks.md` §5).

### Affected ADRs

None. `RTA-DD-1` governs the CSS fix and is untouched by this pivot — only the harness choice in `design.md` §10 / `tasks.md` `RTA-T-2` is in question. No TRD architecture decision is overturned.

### Amendment closure (applied 2026-09-01 on approval)

| Document | Amendments |
|---|---|
| `requirements.md` | §7 defect-class table: harness rows rewritten to CT; **new row** for the uncovered shell-integration class. **New `RTA-GAP-CT` block** stating the accepted gap in full. §9 harness assumption updated with the pivot reason; the ~280px-sidebar assumption now names RTA-GAP-CT as what leaves it unverified |
| `design.md` | §10 rewritten: CT as chosen harness + a `> **Superseded:**` block preserving why E2E was dropped; four numbered assertions; RED-state requirement; **two** explicit gaps (pixel alignment, and the new RTA-GAP-CT). §13 gains an RTA-GAP-CT follow-up. Budget gains a *Budget actuals* note recording the fired tripwire and its cause |
| `tasks.md` | `RTA-T-2` retitled and rewritten (CT harness, colocated file path, CT verification command with `CT_DEV_SERVER_PORT` note, an explicit **RED-confirmed-pre-fix** DoD item, RTA-GAP-CT in the gap clause). §4 dep graph, §5 test plan (RTA-TEST-1 retargeted; **new RTA-TEST-3** row for the manual RTA-GAP-CT check), and §6 rollout all updated |

**Two-direction sweep — run and closed.**
- *Forward* (grep `E2E` / `cypress/e2e` / `cypress:run` / the old spec filename across the spec folder): every surviving occurrence in the three normative documents is an intentional **"superseded"** marker, retained so a future reader learns why E2E was rejected rather than re-proposing it. No stale normative reference remains.
- *Backward* (grep references **to** `design.md` §10 and the `RTA-TEST-1` row): all located and updated — `requirements.md` §7 and §9, `tasks.md` `RTA-T-2` DoD, §5 test plan, §6 rollout.
- `proposal.md` retains its original Cypress/Jest wording and was **deliberately left unedited**: it is the historical bug-diagnosis record of what was proposed at the time, not a normative document. Editing it would falsify the audit trail.
- `RTA-GAP-CT` verified present in all three normative documents (3 / 2 / 3 occurrences).

---

### `RTA-T-2` — Add Cypress component regression test for row-action reachability

| Field | Value |
|---|---|
| **Final status** | **PASS** (Reviewer, attempt 1) → `[x]` |
| Date | 2026-09-01 |
| Implementer attempts | 1 |
| Reviewer verdicts | **PASS** |
| Requirements covered | RTA-R-1 (regression proof), RTA-R-2 (structural alignment); RTA-AC-1, RTA-AC-3 |
| Skills assigned | `angular-developer`, **`tdd`** |
| Effort | `xhigh` |

**Leader skill deviation (recorded):** `tdd` **was** assigned here, reversing the call made on `RTA-T-1`. Not an inconsistency — `RTA-T-2` carries a mandatory red→green step (a regression test must be observed failing against the pre-fix CSS), which is precisely what `tdd` is for, whereas `RTA-T-1` was a CSS change where it would have been overhead.

**Leader lens-mode deviation (recorded):** effort `xhigh` nominally selects *parallel lens reviewers*. Leader adjudicated to keep **lens checklist** mode: the deliverable is a single test file touching no security, migration, or data-loss surface, and the decisive question was one focused spec-conformance adjudication (the width deviation) rather than four independent lenses. The Reviewer ran a full four-lens sweep itself under the 50–200 LOC band.

#### Attempt 1 — Reviewer PASS

- **File created (only one, 176 lines):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.actions-scroll.cy.ts`
- **Assertions (all four of `design.md` §10):** (1) `.pr-collapse--rows > .pr-collapse-inner` has `scrollWidth > clientWidth`; (2) after `cy.scrollTo('right')`, `[aria-label="More actions"]` is visible + `click()`able and opens `[role="menu"]` — the presence-of-behavior chain; (3) at a 1500px container, `scrollWidth === clientWidth` (RTA-AC-3 negative); (4) `.pr-hlo-head` and `.pr-reporting-row` share an `offsetParent` (RTA-R-2).

##### RED evidence (Bug Mode requirement — satisfied)

Run against the pre-fix CSS with only the `.pr-collapse--rows > .pr-collapse-inner` override commented out:

```
7 passing, 3 failing
1) "More actions" ... at ~1350px viewport (1000px) ...
2) "More actions" ... at ~1024px viewport (820px) ...
3) "More actions" ... at ~768px viewport (tablet floor) (620px) ...
CypressError: Timed out retrying after 10000ms: `cy.scrollTo()` failed because this element is not scrollable:
`<div class="pr-collapse-inner">...</div>`
```

The Reviewer confirmed the RED is **sound**: all three failures land on exactly the assertion-#2 scroll-reachability tests, at all three widths, with no unrelated error — and the 7 passing reconcile exactly as 3 (assertion 1) + 3 (assertion 4) + 1 (negative), proving nothing else moved and no test was skipped.

##### GREEN evidence

```
10 passing (2s)
✔ All specs passed!
```

Confirmed twice — before and after the RED experiment. Lint: `All files pass linting.`

**Leader inline verification:** `git diff --stat` on the component folder → CLAUDE.md 5, `.html` 2, `.scss` 11, identical to the `RTA-T-1` state (the temporary RED comment-out was fully reverted, counted directly); `git status --porcelain` → the `.cy.ts` is the only new file.

##### Central adjudication — container widths 1000/820/620 instead of literal 1350/1024/768

The Implementer deviated from the brief's literal numbers and the Reviewer **upheld it as spec-conformant**, on grounds worth preserving:

- Both governing texts hedge identically — `design.md` §10 and `tasks.md` `RTA-T-2` say *"a width-constrained container … at widths **standing in for** 1350px, 1024px and 768px"*. Neither mandates literal viewport pixels.
- `design.md` §6.3 supplies the reason: the fix is *intrinsic*, activating "whenever available width drops below ~1048px … not just at a hardcoded 1350px", the 1350 figure being "a symptom of this user's sidebar+viewport combination, not a value to hardcode".
- **Empirical proof the literal reading is unviable:** setting the CT wrapper to 1350px measures `clientWidth: 1348px` with **no overflow at all** (no sidebar in a CT mount), so a literal-1350 test would pass in both RED and GREEN states — a certified no-op gate. The Reviewer noted its own contract forbids accepting evidence from a harness that structurally cannot evaluate the property.
- The chosen values sit below the 1048px threshold with margins of 48 / 228 / 428px, preserve RTA-R-1's tiering down to 768px, and are *conservative* relative to a literal sidebar subtraction (1350−280 ≈ 1070), i.e. they constrain less than production would — the safe direction for a "still reachable" claim.
- **This deviation independently corroborates `RTA-GAP-CT`**: the measurement is direct evidence that a CT container width is not a viewport width. The spec predicted the gap; the implementation measured it.

Documentation of the deviation was judged "unusually well" done — a `⚠️` header block quoting §6.3 and naming RTA-GAP-CT, plus every test title self-labelling (`at a container standing in for ~1350px viewport (1000px)`), so the caveat survives into terminal output and a reader of a green run cannot be misled.

##### ADVISORY (4R lens — recorded, non-gating, and per the protocol these die here rather than becoming tasks)

- **Reliability:** assertion #1 (`scrollWidth > clientWidth`) is **non-discriminating** — an `overflow: hidden` element still reports content overflow, which is why it passed in the RED run too. It is exactly what §10.1 asked for, but it means **assertion #2 carries the entire regression gate alone**. Recorded here so a future maintainer does not "simplify" the suite down to #1.
- **Reliability:** assertion #4's `offsetParent` identity would still hold under a hypothetical two-scroller regression if no intermediate is positioned; a `closest('.pr-collapse-inner')` identity or a post-scroll `scrollLeft` comparison would lock RTA-R-2 harder.
- **Reliability:** the 1500px negative case is ~450px above the threshold, so it cannot catch a `min-width` regression (raising the row floor to 1400px would keep it green). A second boundary case near ~1100px would make assertion #3 a real guard on the 1048 figure.
- **Readability:** RTA-AC-1 names three controls; only "More actions" is asserted (per §10.2). It is the rightmost cell so the others follow, but a `should('be.visible')` on the copy-link glyph would close the AC verbatim.

##### Leader follow-up applied from the Reviewer's process advisory

The Reviewer flagged that `tasks.md`'s DoD parenthetical "(1350/1024/768)" would read as a literal-width claim once ticked. Corrected as part of the pivot's amendment closure — this is wording alignment within the already-approved harness amendment, **not** a new task minted from an advisory.

---

## Pivot Record: `RTA-T-1` (second pivot — UX direction)

**Date:** 2026-09-01 · **Raised by:** the **user**, after reviewing the shipped-but-uncommitted scroll fix. **Status:** ✅ **APPROVED** (user-directed; this is the user's own design decision, not an agent discovery).

**This pivot supersedes the implementation of `RTA-T-1`, which had already earned a Reviewer PASS.** That is unusual and worth stating plainly: nothing was wrong with the code. It satisfied the letter of RTA-R-1 and passed an independent audit. The user's judgement is that it satisfies the requirement badly.

### Blocker

The scroll-to-reach fix makes the user horizontally scroll **every row** to reach its Report/Continue button, Copy-link icon, and "···" menu. Those controls are the row's primary interaction — the reason the table exists — and burying them behind a scroll gesture per row is poor UX even though RTA-R-1's letter is met.

RTA-R-1 already ranks the two outcomes: *"visible directly, or via horizontal scroll within the row"*. The scroll fix took the fallback. The requirement's own preference ordering was available and unused.

### Alternatives considered

| # | Option | Assessment |
|---|---|---|
| A | Keep scroll-to-reach (status quo) | Passes review, ships today. **Rejected by the user on UX grounds** — the actions are the row's primary affordance and must not require a gesture to reach |
| **B** | **Sticky action cells inside the existing scroll container** | **Chosen.** The action cell and the "···" cell become `position: sticky; right: …` within the scroller already built for `RTA-T-1`. Only the data columns (Target / Achieved / Status / Progress) scroll; the actions stay pinned and visible at all times. Strictly better against RTA-R-1's stated preference, and it **keeps** the whole RTA-DD-1 mechanism (the axis-split scroller, the 1048px floor) rather than replacing it |
| C | Responsive column compression at a breakpoint | Still rejected, for the reason `RTA-DD-1` gave originally: it reopens fixed track widths that P2-3296 and MRF-R-5 pinned after real regressions |
| D | Move the actions into the "···" menu at narrow widths | Rejected — hides the primary CTA (Report/Continue) behind a second click and changes information architecture, far beyond a Lite bug fix |

### Revised direction (Option B)

Sticky-actions **layered on top of** the existing scroller, not replacing it. `RTA-DD-1` is *amended, not discarded*: `min-width: 1048px` and the `overflow-x: auto / overflow-y: hidden` axis split all remain load-bearing — the data columns still need somewhere to go. What changes is that the two rightmost cells stop travelling with them.

**Known hazards, recorded now so they are not discovered late** (the spec states the *contract*; exact pixel values are the Implementer's to solve):

1. **Two adjacent sticky cells, not one.** Track 7 (136px action cell) and track 8 (36px "···" cell) must both pin, at different right offsets, with the menu cell outermost. The 16px grid `gap` and the row's `20px` right padding both enter the offset arithmetic.
2. **Opaque background is mandatory, and it must track `:hover`.** `.pr-reporting-row` changes background on hover (`--pr-surface-card` → `--pr-surface-ground`). A sticky cell with a static background will show scrolled data bleeding underneath it the moment the row is hovered. Both states must be handled.
3. **`.pr-hlo-head` needs the identical treatment** on its Action and trailing cells — with its own `--pr-surface-subtle` background — or the header labels drift out of alignment with the pinned columns the moment the row scrolls. This is RTA-R-2 re-expressed for sticky.
4. **Affordance separator:** a left-edge `box-shadow` on the leftmost sticky cell, so the pinned region reads as pinned rather than as overlapping content.
5. **Verify the `.pr-row-menu` popover still escapes correctly.** It is a child of the sticky "···" cell and the scroller is `overflow-y: hidden`. This works today (RTA-T-2 asserts `role="menu"` visible and it passes), but sticky changes the stacking/containing-block situation and it must be **re-verified, not assumed**.
6. **Do not touch `grid-template-columns`** — the P2-3296 / MRF-R-3.1/R-5 pins stand, as they have through every round of this spec.

### Affected decisions

`RTA-DD-1` is **superseded in part** by a new `RTA-DD-2` in `design.md` §12. Per the protocol decisions are never edited in place: `RTA-DD-1` stays in the document with a superseded marker, and `RTA-DD-2` records what changed and why. No TRD ADR is affected (this remains a single-component client CSS decision).

### Knock-on: `RTA-T-2` is reopened to `[~]`

Its committed CT spec asserts **scroll-then-reveal** for the "···" button — behaviour the amended requirement now forbids as the primary path. That assertion must invert to *visible without scrolling, and still visible after the data columns are scrolled*. The data-column scroll assertions (#1) and the alignment assertion (#4) survive.

**Leader scope judgement (per the user's instruction to flag rather than absorb):** this is an **in-scope amendment to the same task**, not new scope — same file, same harness, same stated purpose ("regression test for row-action reachability"); only the definition of *reachable* changed, which is precisely what the requirement amendment did. It does require a fresh RED→GREEN cycle. Flagged to the user rather than performed silently; `RTA-T-2` is moved back to `[~]` so the audit trail never shows a `[x]` against assertions the spec no longer endorses.

### Carried forward, NOT absorbed by this pivot

The **card-collapse animation manual smoke check** owed by `RTA-T-1` remains open and unaffected. This pivot does not touch `pr-collapse--card`, and a design change is not a substitute for an unperformed check. Explicitly re-listed in the Summary's open items.

---

### `RTA-T-1` re-implementation attempt under `RTA-DD-2` — BLOCKED (no rework attempt consumed)

**Date:** 2026-09-01 · **Implementer attempts:** 1 · **Reviewer: not spawned** — per `/akili-execute`'s *Pivot Detection* rule, evidence that the **design** is unviable stops the loop immediately rather than consuming rework attempts. This is a blocker against `RTA-DD-2`, not a failed implementation.

#### What was delivered and works

Sticky pinning itself is implemented and behaves. Layered on the retained `RTA-DD-1` scroller (`pr-collapse--rows`, the axis split, and both `min-width: 1048px` floors all untouched):

- Classes added: `pr-pin-actions` (track 7) and `pr-pin-menu` (track 8) on the row; `pr-hlo-pin-actions` / `pr-hlo-pin-menu` on the matching `.pr-hlo-head` spans.
- **Derived offsets:** track 8 → `right: 20px` (flush with the row's own right padding, matching its resting position); track 7 → `right: 20px + 36px + 16px = 72px` (padding + track-8 width + grid gap). Arithmetic checks out against the declared grid.
- Opaque `--pr-surface-card` backgrounds on both pinned cells, `--pr-surface-subtle` for the header's, `--pr-surface-ground` on `.pr-reporting-row:hover` — RTA-R-4 addressed in all three states.
- `box-shadow: 1px 0 0 var(--pr-border-divider) inset` left-edge separator (RTA-R-11).
- `grid-template-columns` byte-identical on both selectors. Lint clean. Component `CLAUDE.md` re-stamped, three-field form kept, file held at exactly 120 lines.

CT suite: **7 passing / 3 failing** — assertions #1 (scroller live, ×3 widths), #3 (no scrollbar ≥1440px) and #4 (shared scroll container, ×3) all pass.

#### The blocker — `RTA-DD-2` Implementation contract item 5

The contract required re-verifying the `.pr-row-menu` popover rather than assuming it survives. **It does not.** Making the "···" wrapper `position: sticky` (replacing `position: relative`) causes the dropdown to disappear entirely — the Cypress screenshot shows the button clicked and highlighted with **no dropdown rendered anywhere on screen**, not a partial clip. The same one-row fixture passed this exact assertion under `RTA-DD-1` (the recorded `10 passing` run), so this is a regression introduced by the sticky change specifically.

The Implementer correctly **did not attempt a fix**, declining to weaken the load-bearing `overflow-y: hidden` or to add a `z-index`/`overflow: visible` patch that would not address the underlying clip. Its recommendation: a CDK/Angular overlay portaled to `<body>`.

#### ✅ Diagnostic spike (user-approved Option C, 2026-09-01) — question RESOLVED

A throwaway CT probe was run against the current sticky tree, with the menu open at a 1000px container, then deleted (clean `git status` confirmed). Findings:

| # | Probe | Result |
|---|---|---|
| 1 | `getComputedStyle(menu).position` | **`absolute`** — no `fixed` anywhere at runtime |
| 2 | `menu.offsetParent` | `<div class="pr-pin-menu …">` — **not `null`**; the sticky cell is correctly the containing block, exactly as `position: relative` was |
| 3 | Ancestor chain → `<body>` | **Zero** containing-block triggers: no `transform`, `will-change`, `contain`, `filter`, `perspective`, `backdrop-filter` anywhere. Only `.pr-pin-menu` is positioned |
| 4 | Ancestor overflow | `.pr-collapse--rows > .pr-collapse-inner` → `overflow-x: auto`, **`overflow-y: hidden`** ← the clipping ancestor. Everything between it and the menu is `visible` |
| 5 | Rects | Menu `top 234.8 / bottom 392.8`, height 158. Scroller `top 145 / bottom 275.3`, `clientHeight 113`. The menu's bottom extends **117.5px past the scroller's bottom edge** — only a ~40px top sliver of a 158px menu falls inside the clip rectangle |
| 6 | display / visibility / opacity | `flex` / `visible` / 0.42 (mid `prPop` fade — a probe timing artefact, not a defect) |

**(a) The `position: fixed` report was wrong.** The menu is `absolute` at runtime. No code path or ancestor state produces `fixed`. The earlier Cypress-message-derived diagnosis is stale and should not be treated as evidence of a second code path. **The Leader's stylesheet-vs-report discrepancy check was correct to withhold the portal recommendation pending this probe** — the recommendation was resting on a false premise.

**(b) The mechanism is mundane vertical clipping, not a containing-block trap.** Switching `relative` → `sticky` changed *nothing* about where the menu is positioned; the containing block is identical in both. What clips it is the pre-existing, load-bearing `overflow-y: hidden` on the row scroller. That scroller's height is driven only by in-flow content (header + rows); an absolutely-positioned 158px dropdown contributes nothing to it, so any row without roughly 160–200px of following in-flow content in the same scroller has most of its dropdown rendered past the clipped edge.

**(c) No CSS-only fix is available within the constraints.** `overflow-y: hidden` is load-bearing for the collapse animation and must not be touched, and the clipping ancestor sits between the menu and any point where "escape the clip" could be expressed locally. A real fix requires the menu to render **outside that DOM subtree** — a CDK Overlay / portal positioned from the trigger's `getBoundingClientRect()`. That is `.ts` work, beyond this Lite spec.

#### ⚠️ This reframes the blocker — it is likely NOT a regression the pivot caused

The clipping mechanism **pre-dates the sticky change** and even pre-dates `RTA-DD-1` in part (the base `.pr-collapse > .pr-collapse-inner { overflow: hidden }` already clipped both axes). If so, `RTA-DD-2` did not break the menu — it **revealed** a defect that was already shipping.

**Unresolved tension, stated rather than smoothed over:** the CT suite's menu assertion *passed* under `RTA-DD-1` (the recorded `10 passing` run) and *fails* under sticky. If the clipping were purely pre-existing, that assertion should have been failing before too. Something changed the observable outcome even though the probe shows the positioning inputs are identical — plausibly the menu was already mostly clipped but retained enough of a visible sliver to satisfy Cypress's visibility heuristic, and the sticky cell's own offset shifted it past that margin. **Not confirmed.** The cheap experiment that would settle it: stash the sticky hunk, re-run the existing suite, and measure the menu's rect the same way. Recorded as the open diagnostic, not asserted as fact.

**Consequence for the options:** Option A (revert to `RTA-DD-1`) can no longer be assumed to deliver a working "···" menu. It would restore a *passing test*, which — if the analysis above holds — was passing on a margin rather than on correctness. That distinction is exactly what this spec has been rejecting all along (a green check that guards nothing), so it must not be traded away silently.

#### ✅ Confirmation run (user-approved, 2026-09-01) — pre-existence CONFIRMED, and a false-positive gate found

Layer 2 (sticky) was surgically removed, leaving `RTA-DD-1` exactly, and the same measurements were taken at the same 1000px container width. The Leader took a full safety net first (`git diff` patch + file copies + md5 checksums to the scratchpad) and performed the restoration itself afterward — **checksums verified OK on all three files**, sticky work intact.

| Measurement | `RTA-DD-1` only (no sticky) | With sticky | Delta |
|---|---|---|---|
| Menu `position` | `absolute` | `absolute` | — |
| Menu height | 158px | 158px | 0 |
| Menu bottom | 395.1 | 392.8 | 2.3px (layout jitter) |
| Scroller bottom | 275.3 | 275.3 | **identical** |
| **Menu overflows scroller by** | **119.9px** | **117.5px** | **~2px — the same defect** |
| Existing CT suite | **10 passing / 0 failing** | 7 passing / 3 failing | — |

**Answer: the menu is clipped WITHOUT sticky too.** `RTA-DD-2` did not cause this. The clipping comes from `overflow-y: hidden` on the row scroller, and structurally predates even `RTA-DD-1` (the base `.pr-collapse > .pr-collapse-inner { overflow: hidden }` already clipped both axes). **This defect ships in production today, independent of this spec.**

#### 🚨 The more important finding: `RTA-T-2`'s menu assertion is a false positive

Under `RTA-DD-1` the suite reports **10 passing** — including `cy.get('[role="menu"]').should('be.visible')` — while the DOM measurement proves only a ~38px sliver of a 158px menu is inside the clip rectangle. The probe captured Cypress's verdict explicitly: **`be.visible` → `true` on a menu that is ~76% clipped.**

Cypress's visibility heuristic checks `opacity` / `display` / detachment / basic occlusion — **not clip-region containment by an ancestor's `overflow`**. So the assertion cannot see this defect, and never could.

This is exactly the false-positive class the spec was written to avoid (`requirements.md` §7; `design.md` §10's "a presence-assertion would prove the class was added, not that the button is reachable"), and it slipped in anyway — through a `be.visible` check that reads as behavioural. `RTA-T-2`'s **no-pass clause** already governs this case: *"if the test cannot reliably distinguish [the states] … the test is not evidence."* Strengthening it to compare the menu's rect against the scroller's clip rect is in-scope for the `RTA-T-2` amendment already pending.

**Why the verdict flipped under sticky** (7 passing / 3 failing) while the geometry stayed the same: the sticky cell changed the stacking/hit-testing enough that Cypress's occlusion check newly tripped. The underlying defect was constant; only the test's *ability to notice it* changed — and it noticed for a reason unrelated to the actual clipping. Recorded as an observation, not as a designed benefit of sticky.

#### Production severity (inference, not measured)

The CT fixture has a **single row**, which is the worst case: nothing in-flow follows it, so the scroller is only 113px tall. In production an HLO group with several rows gives a menu opened on an upper row ~160–200px of following in-flow content to render into, and it will not clip. The defect should therefore bite mainly on the **last row(s) of each group** — which plausibly explains why it went unnoticed. Flagged as reasoning from the measurements, not an observation; the follow-up ticket should confirm it against real data.

#### Superseded note (retained for the audit trail)

*The block below was written before the spike and rested on the `position: fixed` report. It is retained unedited; item (a) above corrects it.*

#### ⚠️ Unresolved diagnostic detail (Leader investigation — do not treat the mechanism as settled)

The Implementer's diagnosis quotes Cypress reporting the menu has `position: fixed`. **That does not match the stylesheet.** Leader verified inline: there is exactly **one** `.pr-row-menu` rule repo-wide (`reporting-aow-table.component.scss:256`) and it declares:

```
position: absolute;  top: 36px;  right: 0;  z-index: 30;
```

No global override exists. So either Cypress's message was about a different element, or the quote is imprecise. **This matters for the decision**, because the two cases have different cheapest fixes: a genuinely `absolute` menu clipped by an ancestor's `overflow` may have a CSS-only escape, whereas the portal rewrite the Implementer recommends assumes the harder case. **Not resolved here** — resolving it means running the CT suite and inspecting computed styles, which is scout/test work, and the run would be spent before a scope decision the user has not yet made.

A related observation worth recording: `.pr-collapse-inner` has had `overflow-y: hidden` since before this spec, and `.pr-row-menu` is `position: absolute` **inside** it — so the menu's vertical escape was always dependent on subtle containing-block behaviour. `RTA-DD-1`'s own *Step 2.3 reversion challenge* asked "what does removing the horizontal clip break?" and answered only for the ⓘ popover and the title clamps; **it did not consider this row menu**. The challenge's answer was incomplete, and that gap is what this pivot surfaced.

#### ⚠️ Working-tree state

The tree currently holds the **sticky implementation with the popover regression**. It is uncommitted and not reverted, so the work survives for whichever direction is chosen — but it must not be committed or shipped as-is: the "···" menu does not open. Stated plainly so nobody mistakes "Reviewer never ran" for "nothing is wrong."

#### Still owed, independent of this blocker

The **card-collapse animation manual smoke check** remains outstanding. This pivot does not touch `pr-collapse--card`, and neither the pivot nor this blocker absorbs it.

---

### `RTA-T-1` sticky rework — attempt 2 FAIL, attempt 3 INTERRUPTED (no HALT)

**Date:** 2026-09-01 / 2026-09-02 · **Status: `[~]`, one rework attempt still available. NOT a HALT — no rollback is warranted or performed.**

#### ⚠️ Correction of record

A mid-run instruction to this session asserted a *"Reviewer FAIL on attempt 3 of 3"* and asked for a HALT block. **No such verdict exists.** The Leader received no attempt-3 Implementer report and never spawned an attempt-3 Reviewer; the session was interrupted immediately after dispatching the attempt-3 Implementer. Writing a HALT around a verdict that was never produced would have been a fabricated failure — the inverse of the unfalsifiable-completion the evidence-before-checkbox rule guards against — and would have triggered a destructive rollback of ~2 sessions of diagnostic work on a false premise. Recorded here because the near-miss is itself worth auditing.

**Tree state verified by inspection, not assumption:**

| Check | Result |
|---|---|
| Attempt-3 fix (`.pr-pin-menu .pr-row-menu` re-anchor) present? | **No** — absent from the SCSS. Attempt 3 never landed |
| Attempt-2 markers (`align-self: stretch`, `margin-right: -16px`/`-20px`, `pr-row-highlighted`) | **Present** (6 matches) |
| Component `CLAUDE.md` | 120 lines (at the §4 cap) |
| Working tree | 3 modified files + the untracked `reporting-aow-table.actions-scroll.cy.ts`; no stray probe files |

So the tree holds **attempt 2**, whose single remaining defect has an exact one-line remediation. The 3-attempt ceiling is **not** exhausted.

**Backup taken before any further action** (the earlier backup predated attempt 2 and was stale): patch + file copies + md5 checksums at `…/scratchpad/attempt2-backup/`, **including the untracked `.cy.ts`** that a `git diff` patch alone would not capture.

#### Attempt 2 — Reviewer FAIL (verbatim findings)

Both attempt-1 defects were verified **closed**: `align-self: stretch` genuinely fixes the vertical-coverage and zero-height-empty-cell case (the residual 1px is the row's own `border-top`, which grid items never paint into), and the `padding-right` + negative `margin-right` gutter absorption tiles correctly (152px + 56px = 208px contiguous, no seam, no overlap into track 8). Backgrounds, specificity, the separator, header layout, track list and aria all verified fine.

**The one remaining issue:**

> **Discovered Issue:** `.pr-pin-menu`'s new `padding-right: 20px` silently relocates the row overflow popover by 20px at **every** viewport width. `.pr-row-menu` is `position: absolute; top: 36px; right: 0`, and its containing block is `.pr-pin-menu` (sticky ⇒ positioned; attempt 1 deliberately dropped the `relative` wrapper). An absolutely positioned box resolves `right: 0` against the containing block's **padding box**, whose right edge has now moved from the track-8 edge to the row's border-box edge. Production and attempt 1 placed the menu's right edge 20px inboard, respecting the row's own right gutter; attempt 2 places it flush against the card's inner edge. This is a change caused by *this* rework — not the pre-existing clipping ticket — and no evidence in the attempt-2 package covers it: the CT probe measured only the two pinned cells' rects, and the 3 red specs were shown to be *unchanged* by the rework, which is precisely why they cannot catch a shift the rework introduced.
>
> **Violated Rule:** `requirements.md` §8 `RTA-AC-3` — "Viewport >1350px … **No visual change from current production behavior**"; `design.md` §12 `RTA-DD-2` *Implementation contract* item 5 — "Re-verify the `.pr-row-menu` popover … **Re-verify, do not assume**."
>
> **Remediation Suggestion:** neutralise the absorbed gutter for the popover only — `.pr-pin-menu .pr-row-menu { right: 20px; }` next to the pin rules, with a comment tying it to the `padding-right: 20px` absorption — so the menu's right edge stays on the "···" track edge as in production. Confirm at a wide width (>1350px, no scrollbar) that the open menu sits where it does on `master`, and at a narrow width that it is still within the scrollport; a `getBoundingClientRect().right` comparison of `.pr-row-menu` against `.pr-pin-menu`'s **content**-box right edge is the cheap assertion.

#### ADVISORY from attempt 2 (recorded, non-gating, and deliberately NOT fixed)

Per *Advisory Never Becomes A Task*, these were withheld from the attempt-3 brief even though each looks like a one-liner. They may not widen an approved task; only the user can decide they earn work.

1. **Reliability:** `.pr-pin-actions` is `flex flex-wrap` with `align-content: stretch` by default. Now that the cell is `align-self: stretch`, a **two-line** action cell (the transient "Next pending" state) will have its two flex lines spread apart rather than sitting compactly centred — `items-center` governs items within a line, not the lines themselves. One line closes it: `align-content: center`.
2. **Readability/Risk:** on a `.pr-row-highlighted` row the widened pinned boxes now paint over the right segment of the row's `ring-2 ring-inset` violet outline for the height of the cells (top/bottom 10px still visible). Cosmetic and transient (~2.6s).

#### Attempt 3 — Reviewer **PASS** ✅

**The one-line fix:** a new rule `.pr-pin-menu .pr-row-menu { right: 20px; }` (SCSS ~L178-184) re-anchoring the popover so its right edge returns to the "···" track edge, i.e. production placement.

**Evidence — the rect comparison attempt 2 lacked:**

| Container | `menu.right` | `pin.right` | `pin.paddingRight` | `pin.contentRight` | diff |
|---|---|---|---|---|---|
| **1500px, nothing stuck** (the RTA-AC-3 case) | 1479 | 1499 | 20 | 1479 | **0** |
| **1000px, cells stuck** | 979 | 999 | 20 | 979 | **0** |

Both measured via `.then($el => …)` rather than a `should('be.visible')` that could have aborted on the known vertical clip — deliberately, since a visibility assertion is what masked this class of defect earlier in the run. Lint clean. `CLAUDE.md` untouched at 120 lines. Existing suite `10 tests / 7 passing / 3 failing` — the expected outcome (pre-existing clip + the superseded scroll-then-reveal assertion, both slated for `RTA-T-2`); suite deliberately not edited. Probe deleted, `git status` clean of artifacts. Leader verified all of this inline.

**Reviewer verdict:** the rule restores the exact production anchor, reaches only the grouped-view menu, and introduces no new side effect. It specifically cleared the three neighbouring-box risks the Leader asked about — the flat-view `.pr-row-menu` (no `.pr-pin-menu` ancestor, so the descendant selector cannot reach it → RTA-R-3 intact), the empty `.pr-hlo-pin-menu` header span, and the menu's untouched `top`/`width`/`z-index` — and ran the symmetric check on `.pr-pin-actions`, confirming it has no absolutely-positioned descendant needing an analogous re-anchor. Specificity (0,2,0) beats the base rule's (0,1,0) and overrides `right` only. **`RTA-DD-2` contract item 5 is discharged** — by measured geometry rather than an assumption.

##### Leader's `RTA-R-12` finding — Reviewer classified it ADVISORY, not FAIL

The Leader found (and the Implementer had not reported) that the new comment cites `RTA-R-12`, a requirement that **does not exist** — `requirements.md` defines only RTA-R-1/2/3/4/10/11. The Leader disclosed it to the Reviewer neutrally and explicitly instructed it **not** to soften its judgement because this was attempt 3 of 3.

The Reviewer classified it as ADVISORY on the merits: the repo's code-traceability convention is the `@akili-spec <spec-path>` marker, which takes a spec folder rather than a requirement ID, and nothing in `requirements.md`, `design.md`, `CLAUDE.md`, or `COMPONENT-DOCS.md` mandates that a prose comment cite a valid ID — so it is a Readability finding, not a spec violation. It stated it would have called it the same way on attempt 1.

**This resolved without the Leader needing to exercise its scope-adjudication authority.** Worth recording: the Leader had pre-committed to adjudicating a comment-ID-only FAIL as a documentation nit and escalating rather than triggering HALT + rollback, since discarding three attempts of work plus two diagnostic spikes over a wrong ID in a comment is not a defensible trade. The authority was not needed, but the pre-commitment is part of the audit trail.

##### ADVISORY from attempt 3 (recorded, non-gating, deliberately NOT fixed)

1. **Readability:** the comment cites the non-existent `RTA-R-12`; the fix traces to `RTA-AC-3` + `RTA-DD-2` item 5.
2. **Readability — the more consequential half.** *The comment's stated mechanism is wrong.* It says `padding-right: 20px` "moved its padding-box right edge 20px inboard of its border-box edge" — false: with no border, the padding-box and border-box right edges **coincide**. The real cause is `margin-right: -20px` widening the border box 20px *outboard*, which is what moves the containing-block edge. **The value `20px` is correct; the reasoning is not** — and a maintainer who trusts it would derive a wrong offset if the padding or margin ever changes. Suggested rewrite: *"the negative right margin widened the border box, moving the containing-block right edge 20px outboard; re-anchor by the same 20px."*
3. **No `CLAUDE.md` defect**, but a note: the file is at the §4 120-line cap, so recording the sticky/abs-positioning trap there requires a **swap, not an append**.

Both readability items are in the same 4-line comment. Per *Advisory Never Becomes A Task* they were not fixed and no task was minted; they are surfaced to the user as candidates for a follow-up or for the next commit that touches this file.

#### Leader root-cause hypothesis (why two rework rounds went to RTA-R-4)

Not spec ambiguity and not under-thinking. Every attempt-2/3 finding shares one shape: **a change whose *paint* consequences were reasoned about correctly and whose *side effects on neighbouring boxes* were not.** Attempt 1 set backgrounds without asking what height the box actually had. Attempt 2 widened boxes to cover gutters without asking what else resolved against that box's padding edge — and the popover did. The spec's contract named the gap and padding as *offset arithmetic* (item 1) and named the popover as a re-verification duty (item 5), but nothing connected them: no one asked "what else is measured from these boxes?" That is a genuine spec gap in `RTA-DD-2`'s contract rather than an implementer failure, and it is the kaizen candidate from this run.

Compounding it: the available automated evidence **structurally cannot** see these defects. `design.md` §10 gap 1b already predicted this ("a gap between the two pinned cells would … pass"), and both rounds were exactly that prediction coming true. Bleed-through and popover placement are geometry questions, and the suite asserts computed styles and Cypress visibility — neither of which is a geometry check. The rect-comparison probes the Leader has been requiring per attempt are the only evidence that has actually caught anything.

---

### `RTA-T-2` (amended for sticky) — Reviewer **PASS** ✅ → `[x]`

| Field | Value |
|---|---|
| **Final status** | **PASS** (Reviewer, attempt 1 of the amendment) → `[x]` |
| Date | 2026-09-02 |
| Implementer attempts | 1 |
| Skills / effort | `angular-developer`, `tdd` / `xhigh` |
| Requirements covered | RTA-R-1 (tightened), RTA-R-2 (under sticky), RTA-R-4 (weakly — see below); RTA-AC-1, RTA-AC-3, RTA-AC-4 |

**The change:** `reporting-aow-table.actions-scroll.cy.ts`, 176 → 391 lines. `be.visible` **banned as the reachability gate** and replaced by a geometry helper `assertPinnedReachable` comparing `getBoundingClientRect()` against the scroller's x-bounds. Assertion #2 inverted (offset-0 reachability + still-reachable-after-scroll). Assertion #4 strengthened to compare header-vs-row pinned right edges. Assertion #5 added for RTA-R-4. An `it.skip` records the popover-clipping defect.

#### RED → GREEN

RED (the `RTA-DD-2` sticky block commented out; `RTA-DD-1` scroller and both `min-width` floors kept):

```
7 passing · 1 pending · 6 failing
AssertionError: "More actions" button (offset 0): right edge must lie within the scroller's
visible x-bounds: expected 1027 to be at most 1000
```

GREEN (SCSS restored): `Tests: 14 · Passing: 13 · Failing: 0 · Pending: 1 · ✔ All specs passed!` · Lint clean · `.scss` verified byte-identical to its pre-task state.

**The Reviewer reconciled the RED arithmetic exactly against the file** — 3 (#1) + 3 (#2) + 1 (#3) + 3 (#4) + 3 (#5) + 1 skip = 14; RED = 7 passing + 6 failing + 1 pending — confirming the Implementer's account is internally consistent rather than a post-hoc story. It ruled the 3 collateral failures do **not** weaken the RED: the intended failure carries a **geometry-specific** message that only an off-canvas control at offset 0 can produce, while #5's failures name `background-color`, so the two are distinguishable from the assertion text alone in any future CI log.

#### Why the geometry gate is sound (the Leader's main audit question)

The Reviewer verified from the SCSS rather than assuming: the scroller has **no border, no padding**, and `overflow-y: hidden` forbids a vertical scrollbar (a horizontal one consumes `clientHeight`, not `clientWidth`) — so its bounding-rect x-bounds **are** its client x-bounds, exactly. It is also the tightest x-clipper in the chain (the AoW `<section>` deliberately carries no `overflow`, per this folder's `CLAUDE.md`).

It also caught something the Leader had not asked about: the helper is applied **only to the three controls, never to the pinned cells** — and that is load-bearing, because `.pr-pin-menu`'s `margin-right: -20px` puts its *border box* 20px outboard of the scrollport while the button inside stays in. Pointing the helper at the pinned cell would have produced a **permanent false FAIL**. And the three `click()` calls add what geometry cannot see — Cypress actionability rejects a covered element — so occlusion is covered by a different mechanism than the banned heuristic rather than left uncovered.

#### RTA-R-4 — what is and is not proven (important, do not let this drift)

Assertion #5's **default**-state half is a genuine computed style. Its **`:hover` half is CSSOM-rule inspection, not a real browser hover**: Cypress core cannot move the OS pointer without `cypress-real-events`, and a JS-dispatched `mouseover` does not set the browser's `:hover` state. The Reviewer confirmed this is disclosed **twice inside the artifact** (header and helper docstring, enumerating what it cannot catch: z-index, a gap between pinned cells, real paint opacity) and that the test title says "**a declared** non-transparent `:hover` rule" — proving exactly what it claims and no more.

So RTA-R-4's hover state has **no real-interaction evidence**. This is weaker than even `design.md` §10 gap 1b allowed for, and it *reinforces* rather than replaces the human-eye check.

#### Selectors validated

The Reviewer checked all five against the template. `[aria-label="More actions"]` excludes the flat-view twin **twice over** (it lives in `app-pr-table`'s `<td>`, never under `.pr-reporting-row`, and the flat block is not rendered at the default `viewMode() === 'grouped'`). The Implementer's judgment call on `.pr-pin-actions .pr-row-action` was **necessary** rather than incidental — `.pr-row-action` is shared with the flat twin and the prefix is what disambiguates it.

#### No-pass clause — satisfied

`waitForSettledOpen` asserts settled *state* (`.is-open`, `aria-hidden="false"`, non-zero rendered `clientHeight`) inside Cypress's retry loop, and there is **no `cy.wait(ms)` anywhere in the file**. Called in every non-skipped test before any measurement.

#### ADVISORY (recorded, non-gating, NOT fixed — no task minted)

1. **Reliability:** the helper reads the scroller's *bounding* rect, correct today only because there is no border/padding and no vertical scrollbar. If either changes it would silently start accepting an element hidden under a scrollbar gutter. `clientLeft`/`clientWidth`-derived bounds would be change-proof; a comment pinning the assumption to `reporting-aow-table.component.scss:47-50` is the cheap equivalent.
2. **Reliability:** the scroller rect is captured once in `.then()` and reused inside the retrying `.should()`. Stable here, but a layout shift during a retry would compare against a stale reference. Moving the lookup inside the `should` callback removes the hazard.
3. **Readability:** the container-width/RTA-GAP-CT rationale appears twice in the 74-line header.
4. **⚠️ Evidence hygiene (Leader accepts this one as a real caveat on the record above):** the quoted RED line reads `expected 1027 to be at most 1000`, while the helper asserts `at.most(scrollerRect.right + 1)` — an integral `1000` implies a scroller right edge of exactly 999. The numbers look **rounded**, i.e. the RED output pasted into the report was likely paraphrased rather than verbatim. The substantive claim (a ~27px off-canvas overflow at offset 0) survives either reading, and the GREEN/RED counts were independently reconciled — but **the RED line recorded above should be treated as approximate, not verbatim.** Any future re-run should capture unrounded output.

---

## ✅ Manual verification — confirmed by the user in a real browser (2026-09-02)

The two checks no automated harness in this repo could cover were performed **by a human at a browser** and confirmed. Recorded as **user-attested**, not as an agent measurement — the distinction matters, because these are precisely the claims this spec refused to let an automated run assert.

| Check | Owed because | Result |
|---|---|---|
| **Card-collapse animation smoke check** (`RTA-T-1` DoD) | Every CT spec mounts with `expandAll: true`, so the 280ms `0fr→1fr` transition never plays. `overflow-y: hidden` was verified statically across three Reviewer rounds, but "works smoothly" is an observation no static proof supplies | ✅ **Smooth.** Confirms `RTA-DD-1`'s axis split and `pr-collapse--card`'s untouched path both survived the sticky pivot |
| **RTA-R-4 hover bleed-through** (human-eye half) | Assertion #5's `:hover` half is CSSOM *rule* inspection, not a real browser hover — Cypress core cannot move the OS pointer without `cypress-real-events`, and a JS-dispatched `mouseover` does not set browser `:hover` state. So the hover state had **no** real-interaction evidence | ✅ **Solid background, no bleed-through at narrow widths.** Closes the gap `design.md` §10 gap 1b declared and the amended suite explicitly could not close |

**Both closures land exactly where the spec predicted they would be needed.** `design.md` §10 gap 1b was written before either defect existed and correctly forecast that computed-style assertions "cannot prove the pinned region is visually opaque". That prediction held through two Reviewer FAILs that materialised it, and a human eye is what finally discharged it — which is the outcome the gap was recorded to force, rather than a gap that was quietly forgotten.

`RTA-T-1`'s last blocking Definition-of-done item is therefore closed, and the task moves to `[x]`.

---

## 📋 Step 3 finalize

**Constitution Impact Check: n/a.** No module was created or reshaped, no module boundary moved, and no module's public surface changed. This spec touched three files inside one existing presentation component (`reporting-aow-table/`) plus its own colocated CT spec. No child `CLAUDE.md` is needed, no parent `## Module Guides` index requires updating, and no new top-level package exists for agents to guess about. The component's own `CLAUDE.md` was re-stamped in-place as the spec's own deliverable (named in `RTA-T-1`'s Files-expected), which is the normal path, not a constitution side-effect.

**CodeGraph re-index:** pending, per the usual post-spec convention — consumed by `/akili-archive`.

**Code traceability (`// @akili-spec`):** deliberately **not** added. The convention marks "critical or complex codebase additions" to assist future audits, and this spec's SCSS already carries far stronger traceability than a path marker would: the `RTA-DD-1` and `RTA-DD-2` rule blocks each open with a multi-line comment naming the decision, the requirement IDs, the derived constants and their arithmetic, and the failure modes they guard. The `.cy.ts` carries a 74-line header explaining the `be.visible` ban and the gap ledger. Adding a bare `@akili-spec` line would be redundant with documentation that is materially more useful. Recorded as a judgement call rather than an omission. (Note the one genuine traceability defect found — the fabricated `RTA-R-12` ID in a comment — remains an open advisory below; it was not fixed because advisories may not widen an approved task.)

---

## 🎫 FOLLOW-UP DEFECT (separate ticket — NOT part of this spec)

> Recorded here per the user's instruction, deliberately **not** added to this spec's `tasks.md` and **not** absorbed into `RTA-T-1`/`RTA-T-2`. Per `/akili-execute`'s *Advisory Never Becomes A Task* rule, work this spec did not approve leaves the spec rather than growing it. This needs its own proposal and its own budget.

**Title:** Row overflow menu (`.pr-row-menu`) is clipped by the HLO scroller's `overflow-y: hidden`

**Component:** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/`

**Status:** ships in production **today** — pre-existing, and independent of everything this spec changed.

### Evidence (two measured runs, 1000px container, single-row fixture)

| Tree state | Menu height | Overflows scroller by | Existing CT suite |
|---|---|---|---|
| `RTA-DD-1` only (no sticky) | 158px | **119.9px** | 10 passing / 0 failing |
| `RTA-DD-2` sticky | 158px | **117.5px** | 7 passing / 3 failing |

Same defect in both, ~2px apart. The scroller's `clientHeight` is 113px and only a ~38px sliver of the 158px menu falls inside the clip rectangle.

### Mechanism

`.pr-row-menu` is `position: absolute` (confirmed at runtime; the earlier `position: fixed` report was mistaken). Its containing block is correctly the "···" cell in **both** the `relative` and `sticky` versions — sticky changed nothing about where it is positioned. It is clipped by `overflow-y: hidden` on `.pr-collapse--rows > .pr-collapse-inner`, whose height is driven only by in-flow content; an absolutely-positioned dropdown contributes nothing to it. No ancestor carries a `transform`/`will-change`/`contain`/`filter`/`perspective` containing-block trigger — the cause is ordinary overflow clipping, nothing exotic.

### Why a CSS-only fix is not available

The clipping ancestor's `overflow-y: hidden` is load-bearing for the card's `0fr→1fr` collapse animation and must not be weakened, and it sits between the menu and any point where "escape the clip" could be expressed in local CSS. A real fix needs the menu rendered **outside that DOM subtree** — a CDK Overlay / portal positioned from the trigger's `getBoundingClientRect()`. That is `.ts` work and a different spec.

### ⚠️ Severity caveat — INFERRED, must be confirmed against production data before fixing

The measurements come from a **single-row CT fixture**, which is the worst case: nothing in-flow follows the row, so the scroller is only 113px tall. In production, a menu opened on an *upper* row of a multi-row HLO group has the following rows' in-flow height to render into and should not clip. The defect therefore likely bites only the **last row(s) of each group** — which would explain why it was never reported.

**This is reasoning from two fixtures, not an observation of production.** Whoever picks this up should confirm the real-world blast radius first; the fix's priority depends entirely on whether it affects every row or only the final one in each group.

### Companion finding — a false-positive gate, already being fixed inside this spec

The existing CT suite asserted `cy.get('[role="menu"]').should('be.visible')` and **passed** on a menu that is ~76% clipped. Cypress's visibility heuristic checks opacity / display / detachment / basic occlusion — **not clip-region containment by an ancestor's `overflow`**. The assertion could never have caught this. Strengthening it to compare rects is in scope for the pending `RTA-T-2` amendment (its own no-pass clause requires it), and is being handled there — but the lesson belongs on this ticket too: **`should('be.visible')` is not a clipping check.**

---

## Evidence link: `RTA-T-2` → `RTA-T-1`'s outstanding behavioural DoD

Recorded explicitly, per the user's instruction not to close this link silently. The user's direction was conditional — *"if `RTA-T-2`'s CT evidence is sufficient, close out `RTA-T-1` to `[x]`"* — so the Leader judged sufficiency item by item rather than applying the instruction wholesale.

| `RTA-T-1` DoD item | Closed by `RTA-T-2`? | Basis |
|---|---|---|
| Browser check at 1920/1440 — no visual change (RTA-AC-3) | ✅ **Yes** | CT assertion #3: at a 1500px container, `scrollWidth === clientWidth` — no scrollbar appears |
| Browser check at 1350/1024/768 — "···", Report/Continue, Copy-link reachable; header aligned (RTA-R-1, RTA-R-2) | ✅ **Yes** | CT assertions #1/#2/#4, and decisively the **RED run**: the suite failed on exactly this assertion at all three widths against the pre-fix CSS, then passed after. This is a presence-of-behavior check — the button is scrolled to, asserted visible, clicked, and the menu opens |
| Card-level collapse animation still works smoothly | ❌ **No** | The CT spec mounts with `expandAll: true`, so both collapse levels are open at mount and the 280ms transition **never plays**. The Reviewer confirmed this while auditing the no-pass clause. `overflow-y: hidden` is verified *statically*, but "works smoothly" is an observation no static proof supplies |
| Code merged via commit convention | ❌ **No** | No commit made — gated mode + standing no-autocommit rule |

**Leader judgement: `RTA-T-1` stays `[~]`.** Two of its three behavioural checks are genuinely closed by real red→green evidence, and those were the substance of the bug. But one DoD item remains structurally uncovered, and `/akili-execute` Step 2.3.0 is unambiguous — *a task with an outstanding gap never reaches `[x]`, even on a Reviewer PASS*. Marking it `[x]` would produce precisely the unfalsifiable completion the methodology exists to prevent, and the user's own "don't silently skip that link" instruction signals they want the link real rather than asserted. The remaining check is a ~2-minute human action (open an AoW card, watch it animate); the user can perform it or explicitly waive it, and either closes the task honestly.

---

## 3. Summary

**Both tasks complete (2026-09-02). Not committed — landing is owned by the user.**

| Task | Status | Evidence |
|---|---|---|
| `RTA-T-1` | **`[x]`** | Sticky actions (`RTA-DD-2`). Reviewer PASS on attempt 3/3; rect probe `diff = 0` at both 1500px unstuck and 1000px stuck; `RTA-AC-3` and `RTA-DD-2` contract item 5 discharged. Both human-eye checks — card-collapse animation and RTA-R-4 hover bleed-through — confirmed by the user in a real browser |
| `RTA-T-2` | **`[x]`** | Amended CT suite. Reviewer PASS; `Tests: 14 · Passing: 13 · Failing: 0 · Pending: 1`; genuine RED→GREEN against a non-sticky build; `be.visible` banned as the reachability gate, replaced by `getBoundingClientRect()` geometry |

This spec took **two pivots** and **six Reviewer rounds**. Neither pivot was an error being corrected: the first (Cypress E2E → component testing) was forced by an environment constraint the spec could not have known at authoring time — `cypress.env.js` is absent, so an E2E run skips rather than asserts — and the second (scroll-to-reach → sticky) was a user design decision taken on a working, already-reviewed implementation. Both are recorded in full above with their alternatives.

**What the run cost, and why:** every one of the six Reviewer rounds found something real, and only one was a plain implementation slip. Two were component-doc conventions (`COMPONENT-DOCS.md` §4/§5), three were the same structural blind spot — *paint consequences reasoned about correctly, side effects on neighbouring boxes not* — and one was the design being superseded by the user. The recurring blind spot is the kaizen candidate; see the root-cause hypothesis above.

### Open items carried out of this run

1. ⛔ **RTA-GAP-CT manual visual check** (`RTA-TEST-3`) — confirm the real shell + ~280px sidebar actually yield a sub-1048px container at 1350/1024/768px viewport. No automated test covers this by design; the CT run **empirically demonstrated** a 1350px CT container is *not* a 1350px viewport (`clientWidth: 1348px`, no overflow), which is the gap made concrete rather than a reason to doubt the fix.
3. ⚠️ **Commit-time obligation:** `reporting-aow-table/CLAUDE.md` currently stamps `36549123f` (working HEAD). Per `COMPONENT-DOCS.md` §6 it must be amended to the **actual landing commit's sha** in the commit that lands the `.html`/`.scss` hunks. Mind the §4 120-line cap — the file sits at exactly 120 and a careless added line will breach it again (this already cost one review round).
4. 📝 **PR description must state:** the CT spec is local-only (no CI runs Cypress here, `onecgiar-pr-client/CLAUDE.md` §9), RTA-GAP-CT is open, and the container widths are 1000/820/620px standing in for viewport tiers — not viewport widths.
5. 💡 **Advisories — recorded, never minted as tasks** (per *Advisory Never Becomes A Task*). The user may promote any of these to a follow-up; none was fixed, and none widened an approved task:
   - **Two defects in one 4-line SCSS comment** at `reporting-aow-table.component.scss:178-181`: it cites a **non-existent `RTA-R-12`** (the fix traces to `RTA-AC-3` + `RTA-DD-2` item 5), and — more consequentially — **its stated mechanism is wrong**. `padding-right` did not move the padding-box edge inboard; with no border, padding-box and border-box right edges coincide. The real cause is `margin-right: -20px` widening the border box *outboard*. **The value `20px` is correct; anyone re-deriving the offset from this comment would get it wrong.**
   - `align-content: center` is missing on `.pr-pin-actions`, so a two-line action cell (the transient "Next pending" state) will spread its flex lines apart now that the cell is `align-self: stretch`.
   - The widened pinned boxes paint over the right segment of a highlighted row's `ring-2 ring-inset` outline (cosmetic, ~2.6s).
   - CT: the geometry helper reads the scroller's *bounding* rect — correct only while it has no border/padding and no vertical scrollbar; the scroller rect is captured once outside the retrying `should()`; and the container-width rationale is duplicated in the file header.

### ⚠️ Handoff to the user — landing obligations

The user is folding this work together with an unrelated, already-committed Tawk.to change and moving both onto `performance-refactor`. Three things must not be lost in that move:

1. **Amend the `CLAUDE.md` sha stamp.** `reporting-aow-table/CLAUDE.md` reads `36549123f` (working HEAD). Per `COMPONENT-DOCS.md` §6 it must become the **actual landing commit's sha**, or the doc ships permanently self-flagged as stale. The file sits at exactly the §4 **120-line cap**, so this is a **swap, never an append** — a careless added line breaches it, which already cost one review round in this run.
2. **Commit convention:** `🔧 fix(reporting-aow-table) [ticket]: <description>`, with the AKILI prefix `[SPEC:docs/specs/bugfix/reporting-table-actions-clipped]`.
3. **The PR description owes three disclosures** (item 4 above): Cypress is local-only so CI green does not cover this regression; `RTA-GAP-CT` is open; and the CT container widths are 1000/820/620px standing in for viewport tiers — **not** viewport widths.

Files carrying the change (all unstaged): `reporting-aow-table.component.html`, `reporting-aow-table.component.scss`, `reporting-aow-table/CLAUDE.md`, and the new untracked `reporting-aow-table.actions-scroll.cy.ts`. A verified backup (patch + copies + md5 checksums, including the untracked spec) is at `…/scratchpad/attempt2-backup/`, though it predates the attempt-3 re-anchor rule.

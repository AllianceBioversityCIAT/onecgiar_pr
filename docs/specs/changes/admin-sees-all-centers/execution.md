# Execution Log — A platform admin sees every CGIAR centre in the sidebar

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/admin-sees-all-centers` |
| Approval Mode | `gated` (proposal Document Control) |
| Branch | `feat/admin-sees-all-centers`, cut from `performance-refactor` @ `6d477a168` (spec base `f37e1c728` is an ancestor; no diff since on `reporting-nav-sidebar/`, `centers.service.ts`, `roles.service.ts`) |
| Started | 2026-09-28 |
| Leader | Claude Opus 5.5 (T1) |
| Implementer | `akili-implementer` wrapper → `sonnet` (T2) |
| Reviewer | `akili-reviewer` wrapper → `opus` (T3) — differs from the Implementer model |
| Budget (`design.md` §14) | 3 tasks · ~130 LOC · 1 review round |

## 2. Task Execution History

### `ASC-T-1` — Compose the admin union inside the sidebar's own wrapper

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-09-28 |
| Implementer attempts | 1 |
| Requirements covered | `ASC-R-1`, `-2`, `-4`, `-7`, `-8`, `-9`, `-10`; NFR Performance, Reactivity, Reference stability (as amended per `ASC-DD-2`), Authorization |
| Skills assigned | `angular-developer`, `tdd`, the task's own list with no change. Effort `high`, one step over the T2 default, because the tasks.md fixtures have traps that make gates inert if built carelessly |

#### Attempt 1

- **Files changed:** `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.ts` (+38 / −3) · `…/reporting-nav-sidebar.component.spec.ts` (+116 / −1).
- **Implementation:**
  - `CentersService` is injected as `centersSE`. `getMyCenters()` stays a method (`ASC-DD-2`).
  - **Non-admin:** unchanged. The branch is `assignments.filter(isValidCenter)` and never reads the catalogue.
  - **Admin:** assignments are tagged `isAssigned: true`. Catalogue rows are mapped `{code, name, acronym}` → `{center_id, center_name, center_acronym, role_name: undefined, isAssigned: false}`.
  - Duplicates are dropped on `center_acronym ?? center_id`, and the assignment wins. The result is ordered assignments first, then goes through the existing validity filter.
  - The admin check reads `this.rolesSE.isAdmin`, which is signal-backed (`P-7`) and matches the component's existing reads at `:227` and `:588`.
- **Red run (pre-change):** `npx jest --no-coverage --testPathPattern="reporting-nav-sidebar"` gave 4 failures, all on behavior:

  | Case | Assertion |
  |---|---|
  | `ASC-AC-1` | `Expected length: 3, Received length: 0` |
  | `ASC-AC-2` | `Expected length: 3, Received length: 1` |
  | `ASC-AC-6` | `Expected length: 2, Received length: 0` |
  | `ASC-AC-9` | `Expected length: 1, Received length: 0` |

  `ASC-AC-5` and `ASC-AC-8` pass before the change by construction.
- **Falsifier mutations (post-change):**
  - (a) Dedup removed: `ASC-AC-2` went red with `Expected length: 3, Received length: 4`.
  - (b) `isAdmin` guard forced false: the non-admin case (`ASC-AC-3`, populated catalogue) went red because CIAT, IITA and CIP leaked in.
  - Both mutations were reverted and the suite was green again.
- **Implementer verification:**

  | Command | Result |
  |---|---|
  | `(reporting-nav-sidebar\|platform-tour)` | 86/86 passed |
  | `(api.service\|bilateral-results-list\|roles.service)` (D2) | 531/531 passed |
  | `tsc -p tsconfig.app.json` | clean |
  | `tsc -p tsconfig.spec.json` | 167 errors, the same count with the diff stashed; 0 in `reporting-nav-sidebar` |
  | `ng lint --quiet` | All files pass linting |
- **Evidence re-run (Leader-inline, non-author):** **VERIFIED**. The same commands gave 86/86, 531/531, app tsc clean, 167 spec-config errors, and 0 on the sidebar.
- **Reviewer (`akili-reviewer` / opus):** **PASS.** The union is built in the component wrapper and it stays a method. It dedupes on acronym with the assignment winning, lists assignments first, and sends catalogue rows through the existing filter. The non-admin branch never reads the catalogue, and every fixture trap is in place.
  - **D8 answered:** both loops still `track center.center_id`.
  - **No track-key collision:** an assignment's `center_id` is the CLARISA code (`RoleByUser.repository.ts:124`, `cc.code = rbu.center_id`), and both sources take the acronym from the same `cc → ci` join (`RoleByUser.repository.ts:119,124-125`; `clarisa-centers.repository.ts:34,38-40`).
- **Runtime events:** none.

#### ADVISORY (4R, recorded only — never a task)

- **Readability:** the dedup key uses `??`, while `isValidCenter` and `centerHomeLink` use `||`. An empty-string acronym would become the key `''`. This is unlikely with current CLARISA data.
- **Reliability:** `ASC-AC-2` asserts `isAssigned: true` on CIAT but not `isAssigned === false` on IITA and CIP.
- **Risk:** until `ASC-T-2` lands, catalogue rows render the tooltip `… · undefined` (D3). T-1 must not ship without T-2. The single-PR strategy in tasks.md §6 already covers this.
- **Resilience:** the non-admin read of the `isAdmin` getter adds a signal dependency. It is harmless and correct.

#### Decisions made

- The spec branch `feat/admin-sees-all-centers` was cut from `performance-refactor`, per the memory rule to commit on our own branch.
- The Reviewer got the 239-line diff as a scratchpad file path instead of inline. The file was readable with its `Read` tool, and this avoided re-emitting the whole diff as Leader output.
- No execute-time spec edits.

#### Issues encountered

- **Budget tripwire (`design.md` §14):** the whole spec was budgeted at ~130 LOC (≈50 production, ≈80 test). `ASC-T-1` alone is **158 LOC** (41 production, 117 test), and `ASC-T-2` has not started.
  - **Cause:** the test side. There are 8 DoD cases, each with its own trap fixture, plus the `CentersService` stub.
  - **Production code is within budget.**
  - Escalated to the user at the continue gate, per Step 2.4.

#### Final verification

Green, as listed above.

#### Budget tripwire — user decision

- **2026-09-28, user:** "Continue". The user accepted the LOC overrun, which is test-driven; production code is within budget. `ASC-T-2` proceeds.
- **Continue gate after `ASC-T-1`:** passed by the user (gated mode).

### `ASC-T-2` — Render the marker and stop the tooltip printing `undefined`

| Field | Value |
|---|---|
| Date | 2026-09-28 |
| Skills assigned | `angular-developer` and `ui-ux-pro-max`, the task's own list |
| Effort | medium-high on attempt 1, bumped to high/xhigh on attempt 2 |

#### Attempt 1 — FAIL

- **Files changed:** `reporting-nav-sidebar.component.html` (13), `.scss` (+15), `.spec.ts` (+148), `.ts` (+24). The diff is 196 insertions and 4 deletions.
- **Implementation:**
  - **Marker:** gated on `center.isAssigned` (`ASC-DD-5`).
  - **Expanded card:** reuses `pr-nav-program-check` (`lucideCheck`) and adds an `sr-only` label.
  - **Collapsed rail:** gets the badge `.pr-nav-center-check--rail`, built on the existing `--pr-sidebar-accent`/`--pr-sidebar-bg`. The label is appended to `aria-label`, e.g. "CIAT, Assigned to you".
  - **Tooltip:** a new `centerTooltip()` appends the role only when `shouldShowAssignmentRole()` passes; that helper is a local copy of `shell-topbar.component.ts:216`.
  - **Render tests:** compile a runtime extraction of the real `.html` to sidestep the pre-existing `NG0311` problem.
- **Implementer `Not Done / Assumptions` (verbatim):**
  > - i18n routing is a hardcoded string rather than a `TermKey` — see judgment call above; flag for Leader/Reviewer if a stricter reading is wanted.
  > - The render-based Jest tests compile a real, verbatim-extracted subset of the `.html` file (via runtime brace-matching extraction, not hand-typed markup) as the component's template, using a real `provideRouter([])` — this sidesteps the pre-existing `NG0311`/`hlmSidebarMenuButton` bug that forces every other test in this file to render with an empty template (documented inline in the new `describe` block). This is a new but justified technique in this spec file; flagging for Reviewer awareness since it differs from the DOMParser-only pattern used for `sidebar-toggle`.
- **Implementer verification:**
  - `(reporting-nav-sidebar|platform-tour)`: 89/89 passed.
  - `tsc` app config: clean. Spec-config errors on the sidebar: 0.
  - Lint: pass.
  - Mutation (a): red on CIAT's title, `Received: "CIAT · Center User"`.
  - Mutation (b): red with `Received: "CIAT"`, i.e. no marker.
- **Evidence re-run (Leader-inline):** **VERIFIED**. 89/89, app tsc clean, 0 sidebar spec errors, lint pass.
- **Reviewer (`akili-reviewer` / opus): FAIL.** Rulings:
  - The runtime-extracted template **conforms**: it is the real template, and it is robust.
  - Accessibility and tokens conform.
  - `track`, `[data-guide]`, the hrefs and the local `shouldShowAssignmentRole` copy conform.
  - Issues, verbatim:
    1. **Discovered Issue:** `readonly assignedMarkerLabel = 'Assigned to you'` is a literal on the component. The carve-out does not hold: `internationalization/` already holds copy files that do not depend on the portfolio (`bilateral-header-info.copy.ts`, `contribution-request-drawer.copy.ts`). "Assigned to you" is feature copy, not a generic control label. The package guide says "All user-facing strings MUST go through `src/app/internationalization/`" (`onecgiar-pr-client/CLAUDE.md` §5, §10). **Violated Rule:** `requirements.md` §7 NFR *Internationalization*. **Remediation:** add `src/app/internationalization/reporting-nav-sidebar.copy.ts` exporting `REPORTING_NAV_SIDEBAR_COPY = { assignedMarkerLabel: 'Assigned to you' } as const`, point `assignedMarkerLabel` at it, and drop the carve-out comment.
    2. **Discovered Issue:** the ASC-AC-4 case asserts only `component.getMyCenters()).toHaveLength(0)` and renders nothing. Its comment claims the guard sits outside both extracted fragments, which is wrong for the expanded fragment: that extraction starts at the guard (`:256`), and the guard wraps `[data-guide]`. **Violated Rule:** `tasks.md` `ASC-T-2` DoD "ASC-AC-4 — … no block at all", plus the Disqualifier's requirement to read rendered output. **Remediation:** render the expanded extraction with the non-admin fixture, assert there is no `[data-guide="platform-tour-sidebar-centers"]` and no `a`, and fix the comment.
    3. **Discovered Issue:** under mutation (a), the case went red on CIAT's title first. Jest stops at the first failing `expect`, so the IITA assertion was never evaluated, and `textContent.not.toContain('undefined')` cannot see a `title` attribute. **Violated Rule:** the `tasks.md` `ASC-T-2` Falsifier, "(a) … → `ASC-AC-7` red on `undefined` in `IITA`'s tooltip". **Remediation:** in both loops, assert that no rendered `title` or `aria-label` contains `undefined`, placed before the CIAT title check. Re-run mutation (a) and record the IITA red.
  - **ADVISORY:**
    - **Readability:** `lucideCheck` already means "active programme" in the SP list (`html:157`), so the same glyph may read as "currently open". This goes to the ASC-T-3 walk.
    - **Readability:** `.pr-nav-center-check--rail` uses hardcoded px values; the guide prefers Tailwind utilities.
    - **Reliability:** `centerTooltip` falls back to `''` on a missing name. This is harmless.
- **Runtime events:** none.

#### Attempt 2 — PASS

- **Feedback relayed:** the attempt-1 Reviewer FAIL was passed verbatim, with an attempt history. Effort was bumped to high. The worker was resumed by message and kept its context. That is a normal rework, not a runtime event.
- **Files changed (cumulative vs `e66cfc1a9`):**
  - `reporting-nav-sidebar.component.html` (13)
  - `.scss` (+15)
  - `.spec.ts` (+163)
  - `.ts` (+23)
  - new `onecgiar-pr-client/src/app/internationalization/reporting-nav-sidebar.copy.ts` (4)
- **Fixes:**
  1. The label moved to `REPORTING_NAV_SIDEBAR_COPY.assignedMarkerLabel`, and the carve-out comment was dropped.
  2. `ASC-AC-4` now renders the real expanded extraction with a non-admin who has zero assignments, against a populated catalogue. It asserts there is no `[data-guide]`, zero `a` and empty text.
  3. Both loops assert that IITA's `title` (and, in the rail, its `aria-label`) does not contain `undefined`. These assertions run before any CIAT check.
- **Falsifier mutations (post-change):**
  - (a) Unconditional role concatenation → red in the expanded loop (`spec.ts:964`) and the rail (`:1002`): `Expected substring: not "undefined"` / `Received string: "IITA · undefined"`.
  - (b) Marker gated on `shouldShowAssignmentRole(role_name)` → red at `:969` (`Expected substring: "Assigned to you"`, `Received string: "CIAT"`) and at the rail `:1007` (`Expected: "CIAT, Assigned to you"`, `Received: "CIAT"`).
  - Both reverted and green again.
- **Implementer verification:**
  - `(reporting-nav-sidebar|platform-tour)`: 89/89.
  - `tsc` app config: clean.
  - Sidebar spec-config errors: 0.
  - `ng lint --quiet`: pass.
- **Evidence re-run (Leader-inline):** **VERIFIED**. 89/89, app tsc clean, 0 sidebar spec errors, lint exit 0.
- **Reviewer (`akili-reviewer` / opus): PASS.**
  - All three attempt-1 issues are fixed.
  - The falsifier and the DoD are proven by rendered assertions against the real template.
  - ASC-AC-4 is not a vacuous pass: the same block renders 2 links for the admin fixture, so it is the guard that empties it.
- **Runtime events:** none.

#### ADVISORY (4R, final verdict — recorded only)

- **Readability:** the rail `aria-label` ternary is inline, while the tooltip uses `centerTooltip()`. A `centerAriaLabel()` would be symmetric.
- **Reliability:** the `undefined` checks target IITA only; iterating every link's `title`/`aria-label` would guard rows added to the fixture later.
- **Reliability:** `extractTemplateBlock` brace-counting would miscount a literal `{`/`}` inside an attribute. A missing anchor throws, but a truncation would not.
- **Carried from attempt 1:** `lucideCheck` doubles as "active programme" in the SP list. This goes to the ASC-T-3 walk.

#### Requirements covered

`ASC-R-3`, `-4`, `-5`, `-6`; NFR Accessibility, Internationalization, Reference stability.

#### Decisions made

- The runtime extraction of the real `.html` is accepted as the real template (Reviewer ruling). It sidesteps the pre-existing `NG0311` problem in this spec file.
- `shouldShowAssignmentRole` was copied locally, not imported from shell-topbar, to keep the blast radius at one component.

#### Budget

- **Review rounds exceeded:** `ASC-T-2` took 2 Reviewer verdicts against a budget of 1 round.
- **LOC:** the cumulative spec total is now about 370 against ~130. The user already accepted the LOC overrun after ASC-T-1. The review-round overrun is reported at this continue gate.

#### Final status

**PASS** (attempt 2 of 3).

## Scope change — 2026-09-28 (user, after `ASC-T-2`)

- **User request, verbatim:** "en el aside donde está esta sección, yo creo que debe ser collapsable para que no ocupe tanto espacio … si el usuario quiere colapsarlo, que lo pueda colapsar. Y si, por ejemplo, yo estoy dentro de un center, que ese center se quede como active en el aside, así los demás estén colapsados". Follow-up: "IMplementalo y ya, es facil. ASAP".
- **This is not a Pivot.** It is new scope the user approved, and it changes no approved requirement's meaning, except where each amendment below says so.
- **Spec amended (execute-time):**
  - `requirements.md`:
    - `ASC-R-11`, `-12`, `-13` added.
    - `ASC-R-2` amended: the header toggle is the one deliberate markup difference for non-admins.
    - `ASC-R-20` superseded for collapse.
    - `ASC-AC-10` and `ASC-AC-11` added.
  - `design.md`: `ASC-DD-6` added; the budget is now 4 tasks.
  - `tasks.md`: new `ASC-T-4`, and `ASC-T-3` re-pointed to depend on it.
- **Assumptions (Leader, stated to the user):**
  - The block is open by default.
  - The toggle applies to every user who sees the block.
  - The open state is not persisted across reloads.
  - The collapsed rail is untouched.
  - The label stays "My CGIAR centers".

## Pivot Record: `ASC-T-5` — admin read-only access to a centre's AI drafts (2026-09-28)

- **Trigger:** the user saw `ForbiddenException: You do not have access to this center.` from `BilateralAiService.assertCenterEntitlement` (`bilateral-ai.service.ts:481`) on `GET /api/bilateral/center/ai/drafts?centerId=52`, as an admin inside an unassigned centre. The sidebar now makes that route reachable. It was already reachable by URL before this spec.
- **Why this is a Pivot:** it overturns an approved non-goal ("No authorization change" in NFR *Authorization* and design §7; "Any server change" in the proposal non-goals).
- **User decision, verbatim:** "lo mejor sería que el admin pueda ver todo, pero no tener ninguna acción … que pueda ver los drafts, pero que no pueda hacer el promote del result … darle el previo para el preview, pero que no pueda hacer el create del result si no le pertenece". Leader restated the rule; user approved: "Si, dale asi."
- **Alternatives:**
  - (1) Client-only: hide drafts for non-member admins. **Rejected by the user**, who wants read access.
  - (2) **Chosen:** server read bypass for admins plus client action hiding.
- **Spec amended:**
  - `requirements.md`: `ASC-R-14`, `ASC-R-15` added; NFR *Authorization* amended; `ASC-AC-12`..`14` added.
  - `design.md`: `ASC-DD-7` added; budget now 5 tasks.
  - `tasks.md`: `ASC-T-5` added; `ASC-T-3` now depends on T-4 and T-5.
- **Correction-closure sweep:** grep of "No authorization change" / "Any server change" / "Unchanged. No permission" across the spec folder.
  - requirements.md NFR: amended.
  - design.md §7 and the proposal: superseded by `ASC-DD-7`. The text is kept as history; DD-7 names what it supersedes.
- **ADR impact:** none in `docs/trd/trd.md`.
- **Module owner:** `bilateral-ai` (P2-3700) is the user's own module. No notification owed.
- **Lateral findings (recorded, not folded):**
  - `getSignedUrl` (`:438`) is creator-only, so an admin, or any other member, cannot open a draft's files. The user accepted this for now.
  - `createJob` (`:117`) has no centre check at all. It is a pre-existing gap for every user.

### Scope addition folded into `ASC-T-4` — active on any centre route (2026-09-28, user)

- **User, verbatim:** "si estoy dentro de cualquiera de las rutas dentro del center, en el aside, el center debe quedar act /bilateral/AfricaRice/result/9652?phase=36 … Debe ser algo así /bilateral/AfricaRice/*". Then: "Implementa todo asap".
- **Cause:** the active state came from `routerLinkActive` on `centerHomeLink()` (`/bilateral/<acr>/home`). That only matches the home subtree, so it was already broken before this spec.
- **Spec edits:** `ASC-R-16` and `ASC-AC-15` added; `ASC-R-13` amended so the rail's active state follows R-16; the T-4 DoD line added.
- **Handling:** folded into `ASC-T-4` (same files, same "active" concept as `ASC-R-12`) as a rework after its first Reviewer verdict. This is scope growth, not a FAIL.

### `ASC-T-4` — Make the centre block collapsible, keeping the active centre visible

#### Attempt 1: PASS against the pre-`ASC-R-16` scope. The task stays open for `ASC-R-16`.

- **Files:** `reporting-nav-sidebar.component.html` (+19), `.ts` (+36), `.spec.ts` (+113).
- **Implementation:**
  - `activeCenterKey` is a `toSignal` over `NavigationEnd` that reads `/^\/bilateral\/([^/]+)/` off `router.url`, with the query string stripped.
  - `visibleCenters()` returns all centres when the `'centers'` group is open. When it is closed, it returns only the `isActiveCenter` one.
  - The toggle copies `pr-nav-others-toggle`.
  - `openGroups` now starts as `['mine','centers']`.
- **Red run (pre-change):** `ASC-AC-10` and `ASC-AC-11` fail with a `TypeError` on the null toggle button. tasks.md explicitly allows a red on a missing toggle.
- **Mutations:**
  - (a) Rendering nothing when closed turns `ASC-AC-11` red with `Expected length: 1, Received length: 0`.
  - (b) Ignoring the open state turns `ASC-AC-10` red with `Expected length: 0, Received length: 3`.
  - Both were reverted and the suite is green again.
- **Implementer verification:** 91/91, app tsc clean, 0 sidebar spec-config errors, lint pass.
- **Evidence re-run (Leader-inline):** **VERIFIED**. 91/91, tsc clean, 0, lint exit 0.
- **Reviewer (opus): PASS.** The toggle is an exact copy, the collapsed filter is correct, and `[data-guide]`, `track`, the rail, the T-1 union and the T-2 marker are all unmoved. The tests drive a real `Router` against the real template, and the red run is acceptable.
- **ADVISORY:**
  - RELIABILITY: visibility uses the URL prefix, but the active class and `aria-current` still come from `routerLinkActive` on `/home`. On `/bilateral/CIAT/results`, CIAT shows but is not active. **The user raised the same issue independently. It is now `ASC-R-16`, the next attempt of this task.**
  - READABILITY: strip `#` and `;` as well as `?`. `ASC-R-16` now requires ignoring the fragment.
  - RISK: the spacing above the block may have changed, now that the label is a button. This goes to the `ASC-T-3` walk.
- **Runtime events:** none.

#### Attempt 2 (`ASC-R-16`): PASS

- **Why this attempt:** it adds the user's scope (`ASC-R-16`). It is not a FAIL, so no rework attempt was consumed for a defect. The worker was resumed by message.
- **Files (cumulative vs `fa538a30a`):** `reporting-nav-sidebar.component.html` (29), `.ts` (+43), `.spec.ts` (+182).
- **Changes:**
  - Both loops dropped `routerLinkActive` and `#rla…`. The active class, and `aria-current` in the expanded block, now read `isActiveCenter(center)`.
  - `readActiveCenterKey` splits on `/[?#;]/` before running the regex.
  - `routerLink` is kept.
- **Mutation:** restoring `rlaCenter.isActive` on the expanded class turned `ASC-AC-15 (expanded)` red with `Expected: true, Received: false` at `expect(africaRice.classList.contains('pr-nav-program-card--active')).toBe(true)`. It was then reverted, and the suite went green.
- **Implementer verification:**
  - Jest: 94/94.
  - App tsc: clean.
  - Sidebar spec-config errors: 0.
  - Lint: pass.
- **Evidence re-run (Leader-inline):** **VERIFIED**.
  - Jest: 94/94.
  - App tsc: 0 errors, with the parallel `ASC-T-5` work-in-progress present in the tree.
  - Sidebar spec errors: 0.
  - `ng lint`: exit 0.
- **Reviewer (opus): PASS.**
  - `routerLinkActive` is fully removed from the centre bindings, and nothing is left orphaned.
  - `isActiveCenter` uses the same fallback key as `centerHomeLink`.
  - `aria-current` is exclusive to the active centre.
  - The tests use the real router and the real template, and assert on the DOM.
  - All attempt-1 PASS items still hold.
  - Visibility and the active state now share one predicate, which closes the attempt-1 advisory.
- **ADVISORY:**
  - RELIABILITY: `decodeURIComponent` can throw `URIError` on a malformed `%` escape. The risk is low because the Router normalises URLs.
  - READABILITY: acronym matching is case-sensitive. Confirm in the `ASC-T-3` walk whether routes accept any casing.
- **Runtime events:** none.
- **Requirements covered:** `ASC-R-11`, `-12`, `-13` (amended), `-16`; amended `ASC-R-2`; `ASC-AC-10`, `-11`, `-15`.
- **Final status:** **PASS**.

## Scope change: `ASC-T-6`, collapsed by default (2026-09-28, user)

- **User's question, verbatim:** "Por default los centers salen colapsados y se muestran unicamente los que tengo asignados? Si no tengo asignados igual debe salir colapsado siempre los centers. Es asi?"
- **Leader's answer:** no. The block opens by default, and when collapsed it shows only the current centre. The Leader restated the desired rule, and the user approved it: "Si, adelante."
- **Spec edits:**
  - `requirements.md`: `ASC-R-17` added, superseding the open-by-default and active-only clauses of `ASC-R-11`/`-12`; `ASC-AC-16` and `ASC-AC-17` added.
  - `design.md`: `ASC-DD-8` added; the budget is now 6 tasks.
  - `tasks.md`: `ASC-T-6` added; `ASC-T-3` now depends on it.

### `ASC-T-6` — Start collapsed; collapsed shows my centres plus the current one

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1) |
| Date | 2026-09-28 |
| Skills | `angular-developer` |

- **Files:** `reporting-nav-sidebar.component.ts` (16) and `.spec.ts` (+82/−17). No template change.
- **Changes:**
  - `openGroups` now starts as `['mine']`, so the block starts collapsed.
  - The closed branch of `visibleCenters()` now filters on `isAssigned || isActiveCenter`, in `getMyCenters()` order.
- **Existing tests updated (none deleted):**
  - The T-2 expanded case now opens the block first.
  - `ASC-AC-10` was rewritten for the new default: closed 1 → open 3 → closed 1.
  - `ASC-AC-11` lost its initial click.
  - The `ASC-AC-15` expanded case now opens the block first.
- **New tests:** `ASC-AC-16` and `ASC-AC-17`, both asserting on first render.
- **Mutations:**
  - (a) Start open: red, `Expected: "false", Received: "true"` on `aria-expanded`.
  - (b) Collapsed shows the active centre only: red, `Expected length: 2, Received length: 1`.
  - Both were reverted and the suite is green again.
- **Implementer verification:** 96/96 · app tsc clean · 0 sidebar spec-config errors · lint pass.
- **Evidence re-run (Leader-inline):** **VERIFIED**. `Test Suites: 2 passed` (reporting-nav-sidebar and platform-tour both ran), 96/96, app tsc 0 errors, sidebar spec-config errors 0, lint exit 0.
- **Reviewer (opus): PASS.**
  - The change matches `ASC-R-17` and `ASC-DD-8`.
  - Each rewritten case still proves what it proved before, and no case was removed.
  - The tour anchor still renders while collapsed.
  - The first-render assertions use the real router and the real template.
- **ADVISORY:**
  - READABILITY: the template comment at `html:254-255` still describes the open-by-default / active-only rule. It was out of this task's file scope; recorded for `ASC-T-3`/follow-up.
  - RELIABILITY: no test asserts `[data-guide]` directly while collapsed.
  - RISK: the DoD pattern must include `platform-tour`. The Leader confirmed it did: 2 suites ran.
- **Runtime events:** none.

## Decision: the admin's Submit for Review on a bilateral result (2026-09-28, user)

- **Finding (Leader, on the user's request "valida si un user admin puede hacer un Submit for Review dentro de un result bilateral"):**
  - **Server:** `submitForReview` (`bilateral-center.service.ts:2200`) goes through `assertSubmittable` and then `assertCenterPermission` (`:2373`, `:2447`). That check is membership-only (Center User, role 9, on the lead centre) and has no admin bypass. An admin who is not a member gets a 403. `assess` (`:2400`) has the same guard.
  - **Client:** `canSubmitFromRail` (`bilateral-result-creator.component.ts:764`) checks MDS completeness, whether a submit is already running, and the status. It never checks membership. The form stays editable for admins (`:439-441`, P2-3807). So the button is enabled, and clicking it gets a 403.
- **Options offered:**
  1. Hide Submit for a non-member admin.
  2. Make the whole form read-only for that admin, which reverts P2-3807.
  3. Leave it as it is.
- **User decision:** **3, leave it as it is.** No task created, and no change to `ASC-T-5`'s scope.

## Decision revised: the admin CAN submit for review (2026-09-28, user). This supersedes "Decision: … option 3" above.

- **User, verbatim:** "No, el admin si puede hacer submit" … "Un admin puede tanto ver como el botón de Submit for review como accionarlos, es decir, el admin puede someter un resultado. Eso siempre se ha podido entonces te lo estoy confirmando para que así mismo la funcionalidad de que un admin pueda darle clic en Submit for review".
- **Leader's check of the code:** `assertSubmittable` calls `assertCenterPermission` unconditionally at `:2373` on this branch and on `origin/performance-refactor`, `origin/staging` and `origin/master`. The server has no admin bypass there, so a non-member admin gets a 403. The Leader told the user once and did not argue further. The user stated the requirement, and it is now implemented so it holds by construction.
- **Spec edits:**
  - `requirements.md`: `ASC-R-18` and `ASC-AC-18`/`-19` added; NFR *Authorization* amended to two grants.
  - `design.md`: `ASC-DD-9` added.
  - `tasks.md`: `ASC-T-7` added; `ASC-T-3` now also depends on it.

### `ASC-T-5`: admin reads a centre's AI drafts but cannot act on them

| Field | Value |
|---|---|
| Date | 2026-09-28 |
| Skills | `nestjs-expert`, `angular-developer`, `tdd` |
| Effort | xhigh on attempt 1; attempt 2 stays at xhigh, the dial's top for T2 short of `max`, which escalates the tier instead |
| Review mode | Parallel lens reviewers (security; conformance + test integrity), because this is a security surface |

#### Attempt 1: FAIL (both lenses)

- **Files:**
  - Server: `bilateral-ai.service.ts` (34), `.spec.ts` (+116).
  - Client: `bilateral-ai-draft-detail.component.{ts,html,spec.ts}`, `my-draft-results.component.{ts,html,spec.ts}` and `bilateral-result-creator.component.{ts,spec.ts}`.
  - New: `pages/bilateral/services/bilateral-center-membership.util{,.spec}.ts`.
- **Server:** `assertCenterEntitlement(userId, centerId, mode: 'read'|'act')` has no default mode. `isUserAdmin` runs only in `'read'` mode, and only after membership fails. `listDrafts` and `getDraft` pass `'read'`. `setFormalEvidence`, `promoteDraft` and `discardDraft` pass `'act'`.
- **Client:**
  - `isCenterMember` is a pure util over `getMyCenters()`. It never reads `isAdmin`.
  - It gates the Create Result and Discard controls in the `my-draft-results` rows and aside footer, and the header actions in `bilateral-ai-draft-detail`.
  - The creator's `canUseAi` now ANDs `isCenterUserOfLeadCenter()`.
- **Pre-change red:** `ASC-AC-12` threw `ForbiddenException` at `:481` on `listDrafts` and `getDraft`.
- **Mutations:**
  - (a) Admin check applied in every mode: promote, discard and formal evidence resolved for the admin.
  - (b) Admin branch removed: `ForbiddenException` on the read paths.
  - Client: OR-ing `isAdmin` into the check made `isCenterMember()` return true.
- **Implementer `Not Done / Assumptions` (verbatim):**
  > - The "formal-evidence toggle" named in the task doesn't exist anywhere in the client yet — `PATCH_bilateralAiEvidence` has no caller and no control renders it (already documented as "Coming soon" in that folder's own `CLAUDE.md`). Nothing to hide; flagging rather than fabricating a control.
  > - `getSignedUrl` (creator-only) and `createJob` (no centre check for anyone) are confirmed pre-existing gaps, out of scope per the brief — not touched.
  > - Controller unchanged: `user.id` was sufficient for the admin check at every call site.

  The Leader's ruling: none of these is scope still owed. The formal-evidence toggle has no client control, and the conformance reviewer confirmed it (`PATCH_bilateralAiEvidence`, `bilateral-api.service.ts:270`, has no caller). The other two items are recorded out-of-scope gaps.
- **Implementer verification:**
  - Server: 228/228, eslint clean, tsc 0.
  - Client: 248/248 across 6 suites, app tsc 0, lint pass.
- **Evidence re-run (Leader-inline):** **VERIFIED**, with the same counts. eslint exit 0; `ng lint` exit 0.
- **Reviewer, security lens (opus): FAIL.**
  - The server gate is correct and fails closed.
  - Issue, verbatim in substance: the AI create entry is still offered to an admin who is not a centre member, through `app-bilateral-manual-create-drawer-host`. `[canUseAi]="flow.canUseAi()"` (`drawer-host.html:90`) comes from `BilateralManualCreateFlowService.canUseAi` (`:37-39`), which checks only the project and the primary Science Program. The drawer is reachable from the home page's "+ Create result" (`bilateral-projects-panel`) and from the creator (`goBack()`).
  - Because `createJob` (`:117-143`) has no centre check, this client gate is the only barrier.
  - Rules violated: `ASC-R-15`, `ASC-AC-13`, the `ASC-T-5` Falsifier, and `ASC-DD-7`.
- **Reviewer, conformance + tests lens (opus): FAIL.**
  - The server tests meet the Disqualifier, and the rendered-DOM proof holds for `my-draft-results` and the draft detail.
  - Issues:
    1. The same drawer entry is left ungated. The home-page "Create result" at `bilateral-projects-panel.component.html:340,431` leads to `beginFromProject()`, which opens the drawer, whose `flow.canUseAi()` has no membership check.
    2. The creator's AI entry is proven only through the signal (`component.canUseAi()`). Nothing asserts the rendered AI option.
- **ADVISORY (both lenses):**
  - `isCenterMember` ignores `role_id`, while the server and the creator's `isCenterUserOfLeadCenter` require role 9.
  - `getDraft`/`listDrafts` return the whole `job` entity (S3 keys, `text_context`, `response_snapshot`) to admins. That is inside the `ASC-R-14` grant, but a projection could be considered.
  - The creator's `?job=` path sets `selectedReportingWay('ai')` without checking `canUseAi`.
  - `isUserAdmin` has no `ORDER BY`. This is pre-existing and fails closed.
  - The `createJob` centre gap is worth a task of its own, out of this spec.
- **Runtime events:** none.

### `ASC-T-7`: admin can run the quality check and submit a bilateral result for review

#### Attempt 1: FAIL

- **Files:** `bilateral-center.service.ts` (+5/−1) and `.spec.ts` (+78).
- **Change:** `assertSubmittable` now runs `isUserAdmin` and calls `assertCenterPermission` only when the user is not an admin. The check sits at `:2376-2377`.
- **Tests added:**
  - `ASC-AC-18` for submit.
  - `ASC-AC-18` for assess.
  - An admin still gets the status precondition.
  - The existing negatives are tagged `ASC-AC-19`.
- **Pre-change red:** `ForbiddenException` at `assertCenterPermission (:2460)` ← `assertSubmittable (:2373)`.
- **Mutations:**
  - (a) Drop the bypass: `ASC-AC-18` goes red.
  - (b) `if (false)`: `ASC-AC-19` goes red with "Received promise resolved instead of rejected".
- **Implementer verification:** 133/133; eslint clean; tsc 0 before and after.
- **Evidence re-run (Leader-inline):** **VERIFIED**. 133/133, eslint exit 0.
- **Reviewer (opus): FAIL.**
  - Confirmed correct:
    - The bypass location and pattern.
    - Only `submitForReview` and `assess` are widened.
    - It fails closed.
    - The `ASC-AC-19` negatives really reach the guard.
    - The submitter identity is recorded correctly.
  - **Issue, verbatim in substance:** the DoD's "admin still gets the status **and owner-SP** preconditions" is not proven.
    - No admin test covers owner-SP.
    - The status test runs before `isUserAdmin`, so its `mockResolvedValueOnce(true)` is never consumed. The test is green regardless of the bypass.
    - An early `return result` in the admin branch would skip owner-SP and MDS with every test still green.
    - Violated: `tasks.md` DoD, and `ASC-DD-9` "Not touched: the other preconditions".
    - Remediation: an admin test through `submitForReview` with `getOwnerInitiativeByResult` returning `null`, asserting `BadRequestException /no Science Program assigned/` and that `isUserAdmin` was called; then a mutation that skips the owner check for admins must go red.
  - **ADVISORY:**
    - RISK: `getLatest` is not bypassed, so a non-member admin's quality-check polling and the rail's load of the latest assessment get a 403. **The Leader treats this as a spec gap that stops `ASC-R-18` from working, not as an advisory to drop. `ASC-DD-9` was amended (`getLatest` gets the same read-only bypass), and a DoD line was added. This completes R-18's meaning; it does not change it.**
    - READABILITY: the review-history comment still reads "Submitted for review by the reporting center" when an admin submits.
- **Runtime events:** none.

#### Attempt 2: PASS

- **Feedback:** the Reviewer's FAIL was relayed verbatim, together with the `ASC-DD-9` amendment for `getLatest`. The worker was resumed by message.
- **Files (cumulative):** `bilateral-center.service.ts` (+10/−2) and `.spec.ts` (+136).
- **Changes:**
  - `getLatest` now has the same admin bypass as the other admin checks (`:2443-2444`).
  - The status-test comment is corrected. It now states that the test does not prove the bypass.
- **New tests:**
  - An admin with no owner Science Program gets `BadRequestException`. The test asserts that `isUserAdmin` was called.
  - An admin who is not a Center User can read `getLatest`. The test asserts that `validationCenterPermissions` was never called.
  - `ASC-AC-19` markers are added on the existing non-admin negatives for submit, assess and getLatest.
- **Mutations:**
  - Owner-SP skip for admins (`if (isAdmin) return result;`): red, `Received promise resolved instead of rejected … "Result submitted for review successfully"`.
  - `getLatest` bypass removed: red, `Received promise rejected instead of resolved … ForbiddenException`.
  - Both were reverted.
- **Implementer verification:** 135/135 · eslint clean · tsc grep 0.
- **Evidence re-run (Leader-inline):** **VERIFIED**. 135/135, eslint exit 0.
- **Reviewer (opus): PASS.**
  - The owner-SP gap is closed.
  - The `getLatest` bypass is correct, minimal and fail-closed.
  - Nothing from attempt 1 regressed.
- **ADVISORY:**
  - READABILITY: retitle the `ASC-DD-9` heading at archive time, since it now covers `getLatest` too.
  - RELIABILITY: mutation (b) was not recorded for `getLatest`. Its `ASC-AC-19` test covers the case structurally.
- **Requirements covered:** `ASC-R-18`, `ASC-AC-18`, `ASC-AC-19`.
- **Final status:** **PASS** (attempt 2 of 3).

#### Attempt 2: PASS (both lenses)

- **Feedback:** both lens FAIL reports were relayed verbatim, with an attempt history attached. The worker was resumed by message. Effort was xhigh.
- **Files this round:**
  - `bilateral-manual-create-flow.service.ts` (24) and its `.spec.ts` (+33)
  - `bilateral-manual-create-drawer-host.component.spec.ts` (+53)
  - `bilateral-result-creator.component.spec.ts` (+59)
  - The attempt-1 files are unchanged, and the server is unchanged.
- **Fix:**
  - `BilateralManualCreateFlowService.canUseAi` now ANDs `isCenterMember(getMyCenters(), ctx.centerId(), ctx.centerAcronym())`. It reads `rolesVersion` and never reads `isAdmin`.
  - One gate covers both routes: the home page's "+ Create result" (`beginFromProject`) and the creator's drawer.
  - The DOM specs render the real `app-bilateral-reporting-way-selector` and check two cases on both surfaces (drawer host and creator):
    - member: AI card has `aria-disabled="false"`
    - non-member admin: AI card has `aria-disabled="true"` and `brws-card--disabled`, and a click does not select `'ai'`
- **Mutation:** `isAdmin` OR-ed into the util turned the drawer-host DOM case red: `Expected: "true" Received: "false" > expect(card.getAttribute('aria-disabled')).toBe('true')`. The Implementer isolated this from the signal check before recording it, then reverted.
- **Implementer verification:**
  - Client: 263/263 across 9 suites, app tsc clean, lint pass.
  - Server: `bilateral-ai` 228/228.
- **Evidence re-run (Leader-inline): VERIFIED.**
  - Client: 307/307 across 10 suites, app tsc 0 errors, lint exit 0.
  - Server: 228/228.
- **Reviewer, security lens (opus): PASS.** The attempt-1 issue is closed: every route into `app-bilateral-ai-upload` that the UI offers is now gated. No regressions, and the server gate still fails closed.
- **Reviewer, conformance + tests lens (opus): PASS.**
  - Both issues are closed.
  - The DOM tests would catch a template that drops `[canUseAi]`, because the member cases fail when the selector input defaults to `false`.
  - Running the creator case against the util mutation "does not block the gate", because the creator uses its own role-9 predicate.
  - Submit for review is untouched, and there is no scope creep.
- **ADVISORY (both lenses; recorded only, never tasks):**
  - RISK/RELIABILITY: "member" has two definitions. The util ignores `role_id`; the creator and the server require role 9. Adding a role-9 filter to the util would align them.
  - RISK: the creator's `?job=` deep link (`bilateral-result-creator.component.ts:619-650`) sets `'ai'` without checking `canUseAi`. It is reachable only with a job id the user already owns (`getJob` is scoped to the creator). The durable fix is a centre check in `createJob`, as its own task.
  - RISK: `getDraft` returns the whole `job` entity to any platform admin. Consider a projection.
  - TEST INTEGRITY: the creator-local mutation (OR `isAdmin` into the creator's `canUseAi`) has not been run or recorded.
  - Carried from attempt 1: `isUserAdmin` has no `ORDER BY` (pre-existing).
- **Requirements covered:** `ASC-R-14`, `ASC-R-15`, NFR *Authorization* (read grant), `ASC-AC-12`, `-13`, `-14`.
- **Runtime events:** none.
- **Final status:** **PASS** (attempt 2 of 3).

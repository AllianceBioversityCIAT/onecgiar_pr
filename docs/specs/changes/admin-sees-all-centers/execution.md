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

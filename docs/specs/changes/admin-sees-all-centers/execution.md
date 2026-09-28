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

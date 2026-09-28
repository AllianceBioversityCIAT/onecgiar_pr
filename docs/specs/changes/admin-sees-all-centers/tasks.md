# Tasks — A platform admin sees every CGIAR centre in the sidebar

## 1. Scope of this task list

- **Module / feature:** `shared` → `reporting-nav-sidebar`, the *My CGIAR centers* block
- **Linked spec:** [`requirements.md`](./requirements.md) + [`design.md`](./design.md)
- **Ticket:** none — user-originated
- **Owner / driver:** Juan David Delgado
- **Branch base:** `performance-refactor` @ `f37e1c728`
- **Status:** `in-progress` — `ASC-T-1` done; `ASC-T-2`, `ASC-T-3` pending
- **Budget (`design.md` §14):** 3 tasks · ~130 LOC · 1 review round. `/akili-execute` escalates rather than continuing if any is exceeded.

---

## 2. Pre-flight checklist

- [x] `requirements.md` approved — user, 2026-09-28 (NFR *Reference stability* amended at the Phase 2 gate per `ASC-DD-2`)
- [x] `design.md` approved — user, 2026-09-28, including the Step 2.3 correction to `ASC-DD-5`
- [x] Open questions — `ASC-OQ-1`/`-2`/`-3` remain open and **none blocks the build**; `ASC-OQ-4` (= `P-10`) is owned by `ASC-T-3`
- [x] CLARISA dependency — **already satisfied**: `CentersService` fetches the catalogue at bootstrap (`P-4`). No new call
- [x] Migration — **n/a**, client-only
- [x] No conflicting in-flight spec on these files
- [ ] 🛑 `RolesService.getMyCenters()` is **out of scope in every task**. Two permission gates read it (`api.service.ts:297`, `bilateral-results-list.component.ts:412`). Touching it is a Pivot, not an implementation choice

---

## 3. Task list

### `ASC-T-1` — Compose the admin union inside the sidebar's own wrapper

- **Type:** `client`
- **Description:** Inject `CentersService`. In `CPNavSidebarComponent.getMyCenters()` (`:638`), return the assignments as today for a non-admin; for an admin, return the assignments **plus** catalogue rows mapped into the card shape, deduplicated on acronym (assignment wins), assignments first, all passed through the **existing** `Boolean(center_acronym || center_id)` filter. Tag each row with its provenance so the template can mark "mine" without reading any role string. Keep the wrapper a **method** — do not convert it to a `computed()`.
- **Implements:** `ASC-R-1`, `ASC-R-2`, `ASC-R-4`, `ASC-R-7`, `ASC-R-8`, `ASC-R-9`, `ASC-R-10`; NFR *Performance*, *Reactivity*, *Reference stability*, *Authorization*
- **Design:** §6.2, `ASC-DD-1`, `ASC-DD-2`, `ASC-DD-3`, `ASC-DD-4`
- **Files (expected):** `…/reporting-nav-sidebar/reporting-nav-sidebar.component.ts` · `…/reporting-nav-sidebar.component.spec.ts`
- **Depends on:** `—`
- **Blocks:** `ASC-T-2`
- **Size:** `S`
- **Skills:** `angular-developer` (signals, root services, zoneless TestBed), `tdd` (logic-heavy: union, dedup, ordering, degradation)
- **Review:** `full` — the dominant risk is a **non-admin regression** (`D1`) and the two permission gates that read the sibling service method (`D2`); neither is visible in the happy path
- **Verification:**
  - **Falsifier:** on a fixture where the admin is assigned to `CIAT` **and** the catalogue contains `CIAT`, `IITA`, `CIP`, the wrapper must return exactly three rows with `CIAT` once and tagged as assigned. Two mutations, each red on a named case: (a) drop the dedup → `ASC-AC-2` red on a duplicated `CIAT`; (b) drop the `isAdmin` guard → `ASC-AC-3` red because the non-admin fixture receives catalogue rows. 🛑 The fixture **must** place the assigned centre inside the catalogue too; with disjoint sources mutation (a) is inert. 🛑 The non-admin case **must** run against a **populated** catalogue; with an empty one, mutation (b) reads the same as correct code and the gate asserts nothing.
  - **Red run:** `cd onecgiar-pr-client && npx jest --no-coverage --testPathPattern="reporting-nav-sidebar"` — `ASC-AC-1` fails on current code on its behavioral assertion (the returned list holds only the assignments), not on a missing method. 🛑 The existing `rolesMock` (`spec.ts:78`) has `isAdmin: false` and the `apiMock` has no `CentersService`; add the service stub **first**, so the red is the assertion and not a `TypeError`.
  - **Disqualifier:** a case that asserts against `RolesService.getMyCenters()` instead of the **component** wrapper is testing the wrong symbol and is not evidence. A `D7` case whose catalogue is pre-loaded before the first render cannot observe a stale cache — it must set the catalogue signal **after** the first render and assert the list grows. If the only way to make the union reactive is a `computed()`, **stop** — `P-6` rules it out and the design must be re-specified, not worked around.
  - **Consumers:** `reporting-nav-sidebar.component.html:114,116,253,257,277` (five template call sites) · `reporting-nav-sidebar.component.spec.ts:728-739` (**`:728` asserts the wrapper "delegates to the roles service" — that assertion's meaning changes and it must be updated deliberately, not deleted**) · `platform-tour.steps.ts:83` + `platform-tour.steps.spec.ts:28` (the guided tour anchors on `[data-guide="platform-tour-sidebar-centers"]`, which lives inside the block's visibility guard) · **not** `RolesService.getMyCenters()`'s 12 consumers — untouched by construction, which is the point of `ASC-DD-1`
- **Definition of done:**
  - [x] `ASC-AC-1` — admin with **zero** assignments gets the whole catalogue (🛑 fixture must use an empty `roles.center`, or `D5` is untested)
  - [x] `ASC-AC-2` — assigned centre present in both sources appears **once**, tagged assigned
  - [x] `ASC-AC-3` — non-admin with a populated catalogue gets only their assignment
  - [x] `ASC-AC-5` — admin + empty catalogue → the assignments, not an empty list
  - [x] `ASC-AC-6` — catalogue set **after** first render → the list grows (`D7`)
  - [x] `ASC-AC-8` — `RolesService.getMyCenters()` returns what it returns today; asserted, not assumed
  - [x] `ASC-AC-9` — a catalogue row with neither `acronym` nor `code` is omitted
  - [x] `ASC-R-10` — assignments sort before catalogue-only rows
  - [x] Both falsifier mutations executed against the post-change code and observed **red**
  - [x] `npx jest --testPathPattern="reporting-nav-sidebar"` green · `npx tsc --noEmit` clean · `npx ng lint --quiet` clean
- **Status:** [x] — PASS attempt 1, 2026-09-28 (`execution.md` → `ASC-T-1`)

---

### `ASC-T-2` — Render the marker and stop the tooltip printing `undefined`

- **Type:** `client`
- **Description:** In both loops — rail (`:116`) and expanded (`:257`) — render the provenance marker `ASC-T-1` tags, and make the tooltip `center.center_name + ' · ' + center.role_name` tolerate an absent role. Role **text** is gated by `shouldShowAssignmentRole()`; the **marker** is not, because that helper is `false` for every assignment. Keep `track center.center_id` on both loops and leave `[data-guide="platform-tour-sidebar-centers"]` exactly where it is.
- **Implements:** `ASC-R-3`, `ASC-R-4`, `ASC-R-5`, `ASC-R-6`; NFR *Accessibility*, *Internationalization*, *Reference stability*
- **Design:** §6.2, §6.3, `ASC-DD-4`, `ASC-DD-5`
- **Files (expected):** `…/reporting-nav-sidebar.component.html` · `…/reporting-nav-sidebar.component.scss` · `…/reporting-nav-sidebar.component.spec.ts`
- **Depends on:** `ASC-T-1`
- **Blocks:** `ASC-T-3`
- **Size:** `S`
- **Skills:** `angular-developer` (template, rendered assertions), `ui-ux-pro-max` (the marker's visual treatment within the existing card vocabulary)
- **Review:** `full` — touches DOM hooks a guided-tour step pins by attribute, and must prove the `ASC-DD-5` correction rather than re-introduce the defect the Step 2.3 challenge caught
- **Verification:**
  - **Falsifier:** with an admin assigned to `CIAT` (role `Center User`, per `AUTH-R-2`) and a catalogue holding `CIAT` and `IITA`, the rendered block must show a marker on `CIAT` and none on `IITA`, and no rendered text anywhere may contain `undefined`. Two mutations, each red on a named case: (a) restore the unconditional `' · ' + center.role_name` → `ASC-AC-7` red on `undefined` in `IITA`'s tooltip; (b) derive the marker from `shouldShowAssignmentRole(center.role_name)` → `ASC-AC-2` red, because `Center User` is filtered and `CIAT` loses its marker. 🛑 Mutation (b) is the whole point of this task — the fixture's assigned centre **must** carry role `Center User`; with any other role string the mutation passes and the `ASC-DD-5` correction is untested.
  - **Red run:** `cd onecgiar-pr-client && npx jest --no-coverage --testPathPattern="reporting-nav-sidebar"` — the marker case fails on current code on its behavioral assertion (no marker is rendered for any row), not on a missing selector.
  - **Disqualifier:** asserting the **presence of a CSS class** proves the class, not the behaviour — read rendered `textContent` and the resolved `title`/`aria-label`, per the real-artifact lock. A case that renders a hand-built fragment instead of the component's real template is not evidence. Contrast and layout are **not** covered here: jsdom cannot measure either, and a checker returning "incomplete" has evaluated nothing — the a11y colour requirement is confirmed at `ASC-T-3`, not in Jest.
  - **Consumers:** `platform-tour.steps.ts:83` + `platform-tour.steps.spec.ts:28` (`[data-guide="platform-tour-sidebar-centers"]` — must not move or be renamed) · `reporting-nav-sidebar.component.scss:349,353,554,601,765` (the card, diamond and name rules the marker sits beside) · `reporting-nav-sidebar.component.spec.ts`
- **Definition of done:**
  - [ ] `ASC-AC-2` — the assigned centre renders its marker; the catalogue-only centre does not
  - [ ] `ASC-AC-7` — no rendered text contains `undefined`, and each link resolves to `/bilateral/<acronym>/home`
  - [ ] `ASC-AC-4` — a non-admin with zero assignments still gets **no block at all**
  - [ ] Both falsifier mutations executed against the post-change code and observed **red**, mutation (b) included
  - [ ] `track center.center_id` still present on both loops; `[data-guide]` unmoved
  - [ ] The marker is not carried by colour alone
  - [ ] `npx jest --testPathPattern="(reporting-nav-sidebar|platform-tour)"` green · `npx tsc --noEmit` clean · `npx ng lint --quiet` clean

---

### `ASC-T-3` — Confirm on a real admin account and settle the catalogue count

- **Type:** manual verification + docs
- **Description:** The gate for `D9` (a dozen-plus entries making the sidebar unusable) and the settling check for `P-10` / `ASC-OQ-4` (the catalogue's cardinality, which no command in this repository can answer). Walk the sidebar on TEST with a platform-admin account; record the rendered count against the catalogue count from the database; confirm the marker reads as a distinction and not as noise, and that it survives without colour.
- **Implements:** `ASC-R-20`, `ASC-AC-1` end to end, `D8`, `D9`; settles `P-10`
- **Design:** §13, `P-10`
- **Files (expected):** `…/reporting-nav-sidebar/` has no folder guide today — if the walk changes any documented behaviour, record it in `onecgiar-pr-client/src/CLAUDE.md`; otherwise this task writes no file and reports its findings into `execution.md`
- **Depends on:** `ASC-T-2`
- **Blocks:** `—`
- **Size:** `S`
- **Skills:** `systematic-debugging` (the walk is the last confirmation); `playwright-cli` **only if installed locally** — otherwise a manual walk in Chrome
- **Review:** `checklist` — a manual walk and, at most, a documentation line
- **Verification:**
  - **Falsifier:** on TEST, signed in as a platform admin, the sidebar lists every active CGIAR centre, and the rendered count equals `SELECT COUNT(*) FROM clarisa_center cc INNER JOIN clarisa_institutions ci ON ci.id = cc.institutionId AND ci.is_active > 0 AND cc.is_active > 0`. A rendered count **below** that query is the failure. A non-admin account on the same build shows only its assignments.
  - **Red run:** `n/a (manual gate — this is D9's substitute and P-10's settling check)`. 🛑 Two traps from the client guide §9, both of which produce a convincing false negative: inject **`token` AND `user`** in localStorage (`token` alone leaves `readOnly: true`), and confirm the served bundle is not stale before concluding anything. Do not restart a dev server another session owns.
  - **Disqualifier:** a walk on a **non-admin** account proves nothing about this spec and must not be recorded as the gate — `isAdmin` is `role_id == 1` on the application role, so confirm the account's role before trusting the screen. If the browser disagrees with the green Jest suites, **stop and reopen the diagnosis**; do not patch the component.
  - **Consumers:** `none (no shared symbol changed)`
- **Definition of done:**
  - [ ] The sidebar walked on TEST with a confirmed platform-admin account, expanded **and** collapsed rail
  - [ ] The DB count run and recorded against the rendered count
  - [ ] `P-10` settled in `design.md` — the `UNVERIFIED` marker replaced with the count as measured, or the row's Impact re-stated if the number changes the answer to `ASC-R-20`
  - [ ] `D9` answered: a flat list at that size is acceptable, or a follow-up is recorded (**recorded, never folded into this spec** — a new task here is scope nobody approved)
  - [ ] `D8` confirmed by eye: the list does not flicker or re-render on unrelated interaction
  - [ ] The marker is legible without relying on colour
  - [ ] A non-admin account on the same build shows only its assignments

---

## 4. Coverage closure

Every requirement, scenario clause and acceptance criterion is owned by a named task. No row is discharged by citing a different requirement.

| Requirement / clause | Owner |
|---|---|
| `ASC-R-1` (admin sees all) | `T-1` + `T-3` (end to end) |
| `ASC-R-2` (non-admin unchanged) | `T-1` (`ASC-AC-3`) + `T-2` (`ASC-AC-4`) + `T-3` (non-admin account) |
| `ASC-R-3` (visible at zero assignments) | `T-1` (`ASC-AC-1`) + `T-2` (guard) |
| `ASC-R-4` (once, and distinguishable) | `T-1` (dedup) + `T-2` (marker) |
| `ASC-R-5` (no `undefined`) | `T-2` (`ASC-AC-7`) |
| `ASC-R-6` (navigates to bilateral home) | `T-2` (`ASC-AC-7`) |
| `ASC-R-7` (service + gates untouched) | `T-1` (`ASC-AC-8`) |
| `ASC-R-8` (catalogue failure degrades) | `T-1` (`ASC-AC-5`) |
| `ASC-R-9` (rebuilds on late catalogue) | `T-1` (`ASC-AC-6`) |
| `ASC-R-10` (mine sorts first) | `T-1` |
| `ASC-R-20` (flat list acceptable) | `T-3` |
| **Scenario 1** *BUT must NOT issue an HTTP request of its own* | `T-1` — the suite stubs `CentersService`; a real request would fail it |
| **Scenario 1** *AND IT MUST keep `/bilateral/<acronym>/home`* | `T-2` (`ASC-AC-7`) |
| **Scenario 2** *BUT must NOT consult the catalogue for this user at all* | `T-1` — the non-admin case runs against a **populated** catalogue and asserts it is ignored |
| **Scenario 2** *AND IT MUST leave both permission gates as they are* | `T-1` (`ASC-AC-8`) |
| **Scenario 3** *BUT must NOT render an empty block or a hanging spinner* | `T-1` (`ASC-AC-5`) |
| **Scenario 3** *AND IT MUST rebuild on a later retry* | `T-1` (`ASC-AC-6`) |
| `D8`, `D9` (no automated gate) | `T-3` |
| `P-10` (`UNVERIFIED`) | `T-3` |

---

## 5. Dependency graph

```
ASC-T-1  ──▶  ASC-T-2  ──▶  ASC-T-3
(union in     (marker +      (admin walk on
 the wrapper)  tooltip)       TEST + P-10)
```

Linear, no cycle. `T-2` cannot precede `T-1` because the marker renders a tag `T-1` produces.

---

## 6. PR strategy

**One PR.** ~130 LOC in one component, one idea. Splitting would leave a union nothing renders.

- Suggested subject: `✨ feat(reporting-nav-sidebar) admin sees every CGIAR centre in the sidebar`
- 🛑 No apostrophe, `$` or quote in the commit subject — Jenkins interpolates it into an unquoted `sh` (client `CLAUDE.md` §10).

---

## 7. Review intensity

| Task | `Review` | Why |
|---|---|---|
| `ASC-T-1` | `full` | The dominant risk is invisible in the happy path: a non-admin regression (`D1`) and the two permission gates reading the sibling service method (`D2`) |
| `ASC-T-2` | `full` | Touches DOM hooks a guided-tour step pins by attribute, and must prove the `ASC-DD-5` correction instead of re-introducing the defect Step 2.3 caught |
| `ASC-T-3` | `checklist` | A manual walk and at most one documentation line |

**No task is `skip-eligible.`** Both code tasks carry non-deterministic or judgment-bearing checks and touch surfaces other code pins; the third is the substitute gate for two defect classes with no automated check.

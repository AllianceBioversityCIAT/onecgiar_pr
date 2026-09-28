# Tasks — A platform admin sees every CGIAR centre in the sidebar

## 1. Scope of this task list

- **Module / feature:** `shared` → `reporting-nav-sidebar`, the *My CGIAR centers* block
- **Linked spec:** [`requirements.md`](./requirements.md) + [`design.md`](./design.md)
- **Ticket:** none — user-originated
- **Owner / driver:** Juan David Delgado
- **Branch base:** `performance-refactor` @ `f37e1c728`
- **Status:** `in-progress` — `ASC-T-1`, `ASC-T-2` done; `ASC-T-4` (collapse) done, `ASC-T-5` (admin read-only drafts, Pivot) and `ASC-T-3` pending
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
  - [x] `ASC-AC-2` — the assigned centre renders its marker; the catalogue-only centre does not
  - [x] `ASC-AC-7` — no rendered text contains `undefined`, and each link resolves to `/bilateral/<acronym>/home`
  - [x] `ASC-AC-4` — a non-admin with zero assignments still gets **no block at all**
  - [x] Both falsifier mutations executed against the post-change code and observed **red**, mutation (b) included
  - [x] `track center.center_id` still present on both loops; `[data-guide]` unmoved
  - [x] The marker is not carried by colour alone
  - [x] `npx jest --testPathPattern="(reporting-nav-sidebar|platform-tour)"` green · `npx tsc --noEmit` clean · `npx ng lint --quiet` clean
- **Status:** [x] — PASS attempt 2, 2026-09-28 (`execution.md` → `ASC-T-2`)

---

### `ASC-T-4` — Make the centre block collapsible, keeping the active centre visible *(added 2026-09-28, user scope change)*

- **Type:** `client`
- **Description:** In the expanded block (`reporting-nav-sidebar.component.html` ~`:256`), turn the "My CGIAR centers" label into the existing group toggle (`pr-nav-others-toggle`, label + `getMyCenters().length` count + `lucideChevronDown`, `aria-expanded`), keyed `'centers'` in `openGroups`, which starts open. When the block is closed, render only the centre whose home prefix matches the current URL, marked active as today. Leave the rail, the ASC-T-1 union and the ASC-T-2 marker/tooltip as they are.
- **Implements:** `ASC-R-11`, `ASC-R-12`, `ASC-R-13`; amended `ASC-R-2`
- **Design:** `ASC-DD-6`
- **Files (expected):** `…/reporting-nav-sidebar.component.html` · `.ts` · `.spec.ts` (`.scss` only if the reused class needs a spacing tweak, with no new token)
- **Depends on:** `ASC-T-2`
- **Blocks:** `ASC-T-3`
- **Size:** `S`
- **Skills:** `angular-developer`
- **Review:** `full` — touches the `[data-guide]` wrapper the platform tour pins, and a selector/DOM hook (override b)
- **Verification:**
  - **Falsifier:** an admin on `/bilateral/CIAT/home` with a catalogue of CIAT, IITA and CIP collapses the block. The rendered block must list **only** CIAT, still carrying its marker and the active state. After reopening, all three must be listed. Two mutations, each red on a named case: (a) render nothing when closed → `ASC-AC-11` red because CIAT disappears; (b) ignore the open state → `ASC-AC-10` red because IITA and CIP are still rendered after collapsing.
  - **Red run:** `cd onecgiar-pr-client && npx jest --no-coverage --testPathPattern="reporting-nav-sidebar"` — the toggle case fails on current code on its behavioral assertion (no toggle button, or all three still listed), not on a missing method.
  - **Disqualifier:** assert rendered `a` elements, their `textContent`/`href`, and `aria-expanded`; never the signal alone. Use the real-template extraction already accepted in `ASC-T-2`. Drive the current URL through the real router or the component's own URL source, not a stubbed helper that the template never reads.
  - **Consumers:** `platform-tour.steps.ts:83` + `platform-tour.steps.spec.ts:28` (`[data-guide="platform-tour-sidebar-centers"]` must stay on the block root, outside the toggle's `@if`) · `reporting-nav-sidebar.component.spec.ts`
- **Definition of done:**
  - [x] `ASC-AC-10` — the toggle collapses and reopens the list; `aria-expanded` follows
  - [x] `ASC-AC-11` — collapsed while inside CIAT shows only CIAT, active and marked; collapsed outside any centre shows no entries
  - [x] Open by default; the rail unchanged except its active state
  - [x] `ASC-AC-15` / `ASC-R-16` *(added 2026-09-28)* — active on any `/bilateral/<acronym>/…` route (query ignored), both loops, driven by the same URL source as the collapsed filter, not by `routerLinkActive` on the `/home` link
  - [x] ASC-T-1/T-2 cases still green; `[data-guide]` unmoved; `track center.center_id` kept
  - [x] Both falsifier mutations executed and observed **red**
  - [x] `npx jest --testPathPattern="(reporting-nav-sidebar|platform-tour)"` green · `npx tsc --noEmit -p tsconfig.app.json` clean · `npx ng lint --quiet` clean
- **Status:** [x] — PASS attempt 2, 2026-09-28 (`execution.md` → `ASC-T-4`)

---

### `ASC-T-5` — Admin reads a centre's AI drafts but cannot act on them *(Pivot 2026-09-28, user-approved)*

- **Type:** `server` + `client`
- **Description:**
  - **Server** (`onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai.service.ts`): give the centre guard a read-vs-act mode. `listDrafts` and `getDraft` pass for a Center User of the centre **or** a platform admin (`RoleByUserRepository.isUserAdmin`, `RoleByUser.repository.ts:20`). `promoteDraft`, `discardDraft` and `setFormalEvidence` keep the membership-only check (`validationCenterPermissions`, role 9).
  - **Client** (`onecgiar-pr-client/src/app/pages/bilateral/…`, the AI-draft list, detail and create surfaces): hide promote, discard, the formal-evidence toggle and the AI create entry when the user is **not** a member of the current centre. The membership check MUST NOT short-circuit on `isAdmin`.
- **Implements:** `ASC-R-14`, `ASC-R-15`; the amended NFR *Authorization*
- **Design:** `ASC-DD-7`
- **Files (expected):**
  - `bilateral-ai.service.ts` + `bilateral-ai.service.spec.ts`
  - `bilateral-ai.controller.ts` only if the user id is not enough for the admin check
  - the bilateral AI-draft client component(s) and their specs
- **Depends on:** `ASC-T-2`
- **Blocks:** `ASC-T-3`
- **Size:** `S`–`M`
- **Skills:** `nestjs-expert`, `angular-developer`, `tdd`
- **Review:** `full`, parallel lens reviewers (security surface, override f)
- **Verification:**
  - **Falsifier:** fixtures are a user who `isUserAdmin` = true and `validationCenterPermissions` = 0 for centre 52, plus a draft of centre 52.
    - `listDrafts` and `getDraft` resolve.
    - `promoteDraft`, `discardDraft` and `setFormalEvidence` throw `ForbiddenException`.
    - A non-admin non-member is still forbidden on all five.
    - Two mutations, each red on a named case: (a) let the admin branch reach `getDraftRaw` for **every** caller, so `ASC-AC-13` goes red because promote resolves for the admin; (b) drop the admin branch, so `ASC-AC-12` goes red with a `ForbiddenException` on `listDrafts`.
    - Client side: for an admin non-member the promote/discard/formal/create controls are absent from the rendered DOM; for a member they are present.
  - **Red run:** `cd onecgiar-pr-server && npx jest --silent --forceExit --testPathPattern="bilateral-ai.service"` — `ASC-AC-12` fails on current code with `ForbiddenException` on `listDrafts`.
  - **Disqualifier:**
    - A case that mocks `assertCenterEntitlement` itself proves nothing. Mock the repositories (`isUserAdmin`, `validationCenterPermissions`) and call the public methods.
    - A client check reading `rolesSE.isAdmin` or an existing `isAdmin`-short-circuited gate would pass the admin, which is the bug, not the fix.
    - Never run the unscoped server suite.
  - **Consumers:** `bilateral-ai.controller.ts` (the five routes) · `bilateral-ai.controller.spec.ts` · the client AI-draft components · `RoleByUserRepository.isUserAdmin` (read only, not modified)
- **Definition of done:**
  - [ ] `ASC-AC-12` — the admin non-member lists and reads drafts
  - [ ] `ASC-AC-13` — the admin non-member is forbidden on promote, discard and formal evidence (server), and sees none of those controls (client)
  - [ ] `ASC-AC-14` — a non-admin non-member is still forbidden everywhere
  - [ ] Both falsifier mutations executed and observed **red**
  - [ ] Server: `npx jest --testPathPattern="bilateral-ai"` green · `npx eslint` on the touched files `--quiet` clean · `npx tsc --noEmit` clean on touched files
  - [ ] Client: the touched specs green · `npx tsc --noEmit -p tsconfig.app.json` clean · `npx ng lint --quiet` clean

---

### `ASC-T-6` — Start collapsed; collapsed shows my centres plus the current one *(added 2026-09-28, user)*

- **Type:** `client`
- **Description:** in `reporting-nav-sidebar.component.ts`, drop `'centers'` from the initial `openGroups`. Change the closed branch of `visibleCenters()` from "active only" to "`isAssigned` **or** `isActiveCenter`", keeping the `getMyCenters()` order. Do not touch the template, the rail, the T-1 union, the T-2 marker or the R-16 active rule.
- **Implements:** `ASC-R-17` (supersedes parts of `ASC-R-11` / `ASC-R-12`)
- **Design:** `ASC-DD-8`
- **Files (expected):** `…/reporting-nav-sidebar.component.ts` · `.spec.ts`
- **Depends on:** `ASC-T-4`
- **Blocks:** `ASC-T-3`
- **Size:** `XS`
- **Skills:** `angular-developer`
- **Review:** `full` — it reverts delivered behaviour (open by default, active-only when collapsed; override d)
- **Verification:**
  - **Falsifier:** with the `ASC-AC-16` fixture, the first render is collapsed and lists exactly CIAT and IITA, in that order. With the `ASC-AC-17` fixture, it lists nothing. Two mutations, each red on a named case: (a) start open → `ASC-AC-16` red, because CIP is listed and `aria-expanded="true"`; (b) collapsed shows the active centre only → `ASC-AC-16` red, because CIAT is missing.
  - **Red run:** `cd onecgiar-pr-client && npx jest --no-coverage --testPathPattern="reporting-nav-sidebar"` — `ASC-AC-16` fails on current code because the block starts open.
  - **Disqualifier:** assert on rendered `a` elements and on `aria-expanded` on the first render, with no click beforehand. Existing tests that assumed open-by-default must be updated deliberately (click to open first), never deleted.
  - **Consumers:** `reporting-nav-sidebar.component.spec.ts` (the T-1/T-2/T-4 render cases that assume an open block) · `platform-tour.steps.ts:83` (the `[data-guide]` root is still rendered while collapsed)
- **Definition of done:**
  - [x] `ASC-AC-16` — collapsed on first render; mine plus the current centre; opening shows all
  - [x] `ASC-AC-17` — zero assignments and outside any centre: collapsed and empty, toggle visible
  - [x] Earlier cases updated to open first where they need the full list; none deleted
  - [x] Both falsifier mutations executed and observed **red**
  - [x] `npx jest --testPathPattern="(reporting-nav-sidebar|platform-tour)"` green · `npx tsc --noEmit -p tsconfig.app.json` clean · `npx ng lint --quiet` clean
- **Status:** [x] — PASS attempt 1, 2026-09-28 (`execution.md` → `ASC-T-6`)

---

### `ASC-T-7` — Admin can run the quality check and submit a bilateral result for review *(added 2026-09-28, user)*

- **Type:** `server`
- **Description:** apply `ASC-DD-9` in `onecgiar-pr-server/src/api/bilateral/services/bilateral-center.service.ts`. The admin check wraps `assertCenterPermission` inside `assertSubmittable` only.
- **Implements:** `ASC-R-18`
- **Design:** `ASC-DD-9`
- **Files (expected):** `bilateral-center.service.ts` · its spec (`bilateral-center.service.spec.ts` or the nearest existing submit-for-review spec)
- **Depends on:** `—`
- **Blocks:** `ASC-T-3`
- **Size:** `XS`
- **Skills:** `nestjs-expert`, `tdd`
- **Review:** `full` — authorization surface (override f)
- **Verification:**
  - **Falsifier:** fixtures are an admin (`isUserAdmin` true, `validationCenterPermissions` 0) and a result that satisfies every other precondition.
    - `submitForReview` and `assess` both get past the guard.
    - A non-admin non-member still gets `ForbiddenException`.
    - An admin still gets `BadRequestException` on a result in QA/Submitted status, which proves the other preconditions still hold for admins.
    - Mutations: (a) drop the bypass → `ASC-AC-18` red with `ForbiddenException`; (b) make the bypass unconditional (skip the check for everyone) → `ASC-AC-19` red.
  - **Red run:** `cd onecgiar-pr-server && npx jest --silent --forceExit --testPathPattern="bilateral-center"` — `ASC-AC-18` fails on current code with `ForbiddenException`.
  - **Disqualifier:** mock the repositories, not `assertCenterPermission`/`assertSubmittable`, and call the public `submitForReview`/`assess`. Never run the unscoped server suite.
  - **Consumers:** `bilateral-center.controller.ts` (`submit-for-review`, `quality-assessment`) · existing bilateral-center specs
- **Definition of done:**
  - [x] `ASC-AC-18` — the admin non-member passes the guard on assess and submit
  - [x] `ASC-AC-19` — the non-admin non-member is still forbidden
  - [x] The admin still gets the status and owner-SP preconditions (owner-SP proven through the bypass path, `isUserAdmin` asserted called)
  - [x] *(amended 2026-09-28)* `getLatest` admits the admin non-member and still forbids the non-admin non-member
  - [x] Both mutations executed and observed **red**
  - [x] `npx jest --testPathPattern="bilateral-center"` green · eslint `--quiet` on the touched files · no new tsc errors on the touched files
- **Status:** [x] — PASS attempt 2, 2026-09-28 (`execution.md` → `ASC-T-7`)

---

### `ASC-T-3` — Confirm on a real admin account and settle the catalogue count

- **Type:** manual verification + docs
- **Description:** The gate for `D9` (a dozen-plus entries making the sidebar unusable) and the settling check for `P-10` / `ASC-OQ-4` (the catalogue's cardinality, which no command in this repository can answer). Walk the sidebar on TEST with a platform-admin account; record the rendered count against the catalogue count from the database; confirm the marker reads as a distinction and not as noise, and that it survives without colour.
- **Implements:** `ASC-R-20`, `ASC-AC-1` end to end, `D8`, `D9`; settles `P-10`
- **Design:** §13, `P-10`
- **Files (expected):** `…/reporting-nav-sidebar/` has no folder guide today — if the walk changes any documented behaviour, record it in `onecgiar-pr-client/src/CLAUDE.md`; otherwise this task writes no file and reports its findings into `execution.md`
- **Depends on:** `ASC-T-4`, `ASC-T-5`, `ASC-T-6`, `ASC-T-7` *(was `ASC-T-2`; re-pointed 2026-09-28)*
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
| `ASC-R-20` (flat list acceptable) | superseded by `ASC-R-11` |
| `ASC-R-11`, `-12`, `-13` (collapse, active kept, rail untouched) | `T-4` + `T-3` (walk) |
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
ASC-T-1  ──▶  ASC-T-2  ──┬──▶  ASC-T-4  ──┬──▶  ASC-T-3
                         └──▶  ASC-T-5  ──┘
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
| `ASC-T-4` | `full` | Touches the `[data-guide]` wrapper the tour pins |
| `ASC-T-5` | `full` (parallel lenses) | Security surface — grants a read permission |
| `ASC-T-6` | `full` | Reverts delivered default (override d) |
| `ASC-T-7` | `full` | Authorization surface |
| `ASC-T-3` | `checklist` | A manual walk and at most one documentation line |

**No task is `skip-eligible.`** Both code tasks carry non-deterministic or judgment-bearing checks and touch surfaces other code pins; the third is the substitute gate for two defect classes with no automated check.

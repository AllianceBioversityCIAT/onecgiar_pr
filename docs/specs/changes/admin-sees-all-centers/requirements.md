# Requirements — A platform admin sees every CGIAR centre in the sidebar

## 1. Module / Feature

- **Module:** `shared` (nav sidebar) · surface: `reporting-nav-sidebar`
- **Sub-feature:** the *My CGIAR centers* block
- **Owner:** Juan David Delgado (`j.delgado@cgiar.org`)
- **Status:** `draft` — awaiting Phase 1 approval
- **Ticket(s):** none — user-originated
- **Depth:** **Lite**
- **Proposal:** [`proposal.md`](./proposal.md) — approved 2026-09-28
- **Module code:** `ASC`

---

## 2. Context

The sidebar's centre block renders `getMyCenters()`, which returns the signed-in user's own assignments with **no admin branch** (`roles.service.ts:196` — as run: `grep -rn "getMyCenters" src/app`). A platform admin with no centre assignments therefore sees nothing, because the whole block sits behind `@if (getMyCenters().length > 0)` (`reporting-nav-sidebar.component.html:114`, `:253`).

This was never specified. The governing spec casts the admin as the person who **assigns** users to centres (`docs/specs/archive/2026-09-18-auth--center-user/requirements.md:48,57`), and the PRD's Platform admin persona lists `admin-section`, `init-admin-section`, `manage-data`, `versioning`, `user-notification-settings` as their surfaces — **bilateral/centres is not among them** (`docs/prd.md:43`). So this is a new expectation, not a regression.

**Two findings from the Phase-2 probe already shape the scope, and both make the change smaller:**

- **The catalogue is already in memory.** `CentersService` (`shared/services/global/centers.service.ts`) is `providedIn: 'root'`, fetches `clarisa/centers/get/all` at bootstrap, retries twice, caches, treats an empty response as a failed attempt, and — since P2-3678 — stores the catalogue in a **signal** (`centers = signal<CenterDto[]>([])`) precisely so `computed()` consumers rebuild when it lands. ~25 screens already read it. **No new request is needed.**
- **Navigating to an unassigned centre already works.** `bilateral.component.ts:68-73` carries an explicit branch — *"Admin users (or users without a matching center assignment): resolve via CLARISA catalog"* — and resolves the centre name and code from the catalogue. The destination is already built for this.

- **PRD** — **US-A1** (admin manages roles so the right people see the right modules) is the nearest story; none of `US-A1`..`US-A5` covers browsing centres. See `ASC-OQ-1`.
- **UX/UI** — `docs/ux-ui/design.md:20` (*"Catalogs are flat, results are rich"* — CLARISA-backed pickers stay shallow and searchable) is the principle this block must not violate once it holds the whole catalogue.
- **TRD** — no workflow change. This is navigation and visibility, not authorisation.

---

## 3. In Scope / Out of Scope

### In scope

- The *My CGIAR centers* block of `reporting-nav-sidebar`, expanded (`:253`) and collapsed rail (`:114`).
- Reading the existing `CentersService` catalogue signal for admins.
- Distinguishing a centre assigned to the admin from one they merely administer.
- Degradation when the catalogue is empty or failed.

### Out of scope

- **Changing `getMyCenters()`.** 12 production consumers, two of them permission gates (`api.service.ts:297`, `bilateral-results-list.component.ts:412`). Rejected as `Option A` in the proposal.
- **Granting new permissions.** Admins already pass both gates via their own `isAdmin` checks. This spec changes what is *listed*, never what is *allowed*.
- The topbar (`shell-topbar.component.html:261`) and header-panel (`header-panel.component.html:349`) centre lists — same gap, deliberately left out (`ASC-OQ-3`).
- Wiring or deleting the unused `validateCenterAccess()` (`ASC-OQ-2`).
- Any server change.
- Search or pagination inside the block — see `ASC-R-20`.

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Platform admin | Every CGIAR centre is reachable from the sidebar, with their own assignments still marked as theirs. |
| Center User · submitter · QA reviewer · PMU lead | **Nothing.** Byte-identical sidebar. This is the property most of the gates below exist to protect. |

---

## 5. User Stories

- **`ASC-US-1`** — As a platform admin, I want every CGIAR centre listed in the sidebar, so that I can reach any centre without being assigned to it first. *Extends `US-A1`.*
- **`ASC-US-2`** — As a platform admin who **is** assigned to centres, I want to tell my own centres apart from the rest, so that the list I work in daily does not get lost among the others.
- **`ASC-US-3`** — As any non-admin user, I want my sidebar to keep behaving exactly as it does today.

---

## 6. Functional Requirements

### Required (MUST)

- **`ASC-R-1`** When the signed-in user is a platform admin, the centre block MUST list every centre in the CLARISA catalogue.
- **`ASC-R-2`** When the user is **not** an admin, the block MUST render exactly what it renders today — same entries, same order, same markup. *(Amended 2026-09-28 by `ASC-R-11`: the section label becomes a toggle for every user. **Entries and order** stay identical for a non-admin; the header markup is the one deliberate difference.)*
- **`ASC-R-3`** The block MUST be visible to an admin with **zero** centre assignments. Today's `length > 0` guard hides it from precisely the user this change serves.
- **`ASC-R-4`** A centre the admin is assigned to MUST appear **once**, not twice, and MUST be visually distinguishable from a centre they merely administer.
- **`ASC-R-5`** No entry MUST render a missing role as the literal text `undefined`. A catalogue centre carries no role (`CenterDto` has no role field).
- **`ASC-R-6`** Every entry MUST navigate to that centre's bilateral home, using the same link shape as today.
- **`ASC-R-7`** What `getMyCenters()` returns MUST NOT change, and neither permission gate that reads it (`api.service.ts:297`, `bilateral-results-list.component.ts:412`) MUST change behaviour.
- **`ASC-R-8`** If the catalogue is empty or its fetch failed, an admin MUST still see their assigned centres. The failure MUST NOT empty the block.
- **`ASC-R-9`** The list MUST rebuild when the catalogue resolves after first paint. `CentersService.centers` is a signal for this reason; `RolesService.roles` is a plain property and is not (`roles.service.ts:27`).

### Should (SHOULD)

- **`ASC-R-10`** The admin's own centres SHOULD sort before the rest, so the daily working set stays at the top.

### Added 2026-09-28 — user scope change after `ASC-T-2` ("que sea collapsable … y si estoy dentro de un center, que se quede como active")

- **`ASC-R-11`** The *My CGIAR centers* block in the expanded sidebar MUST be collapsible. Its label becomes a toggle that reuses the existing "Other science programs" pattern: `pr-nav-others-toggle` with label, count and chevron, and `aria-expanded`. The block starts **open**. The toggle applies to **every** user who sees the block, because it is the section header, not an admin feature.
- **`ASC-R-12`** While the block is collapsed, the centre the user is currently in MUST stay visible as the active entry. That centre is the one whose `centerHomeLink()` prefix matches the current URL, `/bilateral/<acronym>/…`. Every other centre is hidden. When the user is not inside any centre, a collapsed block shows only its toggle.
- **`ASC-R-14`** *(Pivot 2026-09-28 — user: "que el admin pueda ver todo, pero no tener ninguna acción")* A platform admin inside a centre they are **not** a Center User of MUST be able to **read** that centre's AI drafts: list them (`GET api/bilateral/center/ai/drafts`) and open one with its evidence for preview (`GET …/ai/drafts/:id`).
- **`ASC-R-15`** That admin MUST NOT be able to act on the drafts. Promote (`POST …/promote`), discard (`DELETE …`) and formal-evidence toggling (`PATCH …/evidence/:id`) keep requiring an active Center User role on the draft's centre, admins included. The server stays the enforcing gate. The client MUST also hide or disable those controls, plus the AI "create" entry point, for an admin who is not a member of the centre, so the admin never meets a 403.
- **`ASC-R-16`** *(Added 2026-09-28, user: "si estoy dentro de cualquiera de las rutas dentro del center … debe ser algo así /bilateral/AfricaRice/*")* A centre entry MUST read as **active** on **any** route under `/bilateral/<acronym>/`, e.g. `/bilateral/AfricaRice/result/9652?phase=36`, and not only on its `/home` link. Query string and fragment are ignored. This applies to both the expanded block and the collapsed rail, and it is the same "active" `ASC-R-12` keeps visible when the block is collapsed.
- **`ASC-R-13`** The collapsed rail (`isCollapsed()`) is out of scope for `ASC-R-11`/`ASC-R-12` and keeps rendering as it does after `ASC-T-2`, except for its active state, which follows `ASC-R-16`.

### Could (MAY)

- **`ASC-R-20`** *(Superseded 2026-09-28 by `ASC-R-11` for collapse; search stays out of scope.)* The block MAY stay a flat list without search or collapse. `docs/ux-ui/design.md:20` asks catalogues to be *"shallow and searchable"*; whether a dozen-plus entries cross that line is `ASC-OQ-4`, resolved at the design gate.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | No new HTTP request. The catalogue is already fetched at bootstrap by `CentersService` and shared. The block MUST NOT trigger a fetch of its own. |
| **Reactivity** | The admin list MUST be derived through the signal graph, never from a one-shot read cached before the catalogue lands — the defect class P2-3190 / P2-3335 / P2-3554 and P2-3678 were about. |
| **Reference stability** | Both loops MUST keep a `track` expression keyed on a stable centre identity (`@for … track center.center_id`, `reporting-nav-sidebar.component.html:116`, `:257`), so a fresh array reference re-renders nothing. *(Amended at the Phase 2 gate, `ASC-DD-2`: the original wording forbade returning a fresh array per change detection. That prohibition is `CentersService.centersList`'s, and it is scoped to `pr-select` — a `computed()` over an input rendered through `*cdkVirtualFor` with **no** `trackBy`. The sidebar has `track`, the hazard does not transfer, and the current code already returns a fresh array from its existing `.filter()`. The only shape that would avoid it, a `computed()`, is ruled out by `P-6`.)* |
| **Authorization** | *(Amended 2026-09-28, Pivot `ASC-T-5`.)* One permission is granted, and it is **read-only**: a platform admin (`RoleByUserRepository.isUserAdmin`) may list and read AI drafts of any centre. No write permission is granted; every mutating AI-draft path keeps its Center User check. |
| **Accessibility** | The "mine vs all" distinction MUST NOT be carried by colour alone. The collapsed rail keeps `aria-label` with the centre name. |
| **Internationalization** | Any new user-visible string goes through `src/app/internationalization/` or reuses an existing label verbatim. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `ASC-AC-1` | An admin with **zero** centre assignments; catalogue loaded with N centres | The sidebar renders | The block is visible and lists all N |
| `ASC-AC-2` | An admin assigned to CIAT; catalogue contains CIAT and others | The sidebar renders | CIAT appears **once**, marked as theirs; the others appear unmarked |
| `ASC-AC-3` | A non-admin assigned to CIAT; catalogue loaded | The sidebar renders | Exactly CIAT — the catalogue is ignored entirely |
| `ASC-AC-4` | A non-admin with zero assignments | The sidebar renders | The block is hidden, as today |
| `ASC-AC-5` | An admin; catalogue empty (failed fetch) but two assignments | The sidebar renders | The two assigned centres are listed; the block is not empty |
| `ASC-AC-6` | An admin; catalogue resolves **after** first paint | The catalogue lands | The list rebuilds without a navigation or reload |
| `ASC-AC-7` | An admin; a catalogue centre | Its entry renders | No entry contains the text `undefined`, and its link is `/bilateral/<acronym>/home` |
| `ASC-AC-8` | Any user | `getMyCenters()` is called by any of its 12 consumers | It returns exactly what it returns today |
| `ASC-AC-10` | Any user with a visible block | They click the section toggle | The list collapses (`aria-expanded="false"`); a second click reopens it |
| `ASC-AC-11` | An admin inside `/bilateral/CIAT/…`; block collapsed | The sidebar renders | Only CIAT is listed, and it is marked active; outside any centre a collapsed block lists nothing |
| `ASC-AC-15` | Any user with AfricaRice listed | They are on `/bilateral/AfricaRice/result/9652?phase=36` | AfricaRice is active in both the expanded block (with `aria-current="page"`) and the rail; no other centre is |
| `ASC-AC-12` | An admin who is not a Center User of centre 52 | They call list drafts / get draft for centre 52 | 200 with the drafts; no `ForbiddenException` |
| `ASC-AC-13` | The same admin | They call promote, discard or set formal evidence on a centre-52 draft | 403, exactly as today; and the client renders none of those controls for them |
| `ASC-AC-14` | A non-admin, non-member | They call list or get draft for centre 52 | 403, exactly as today |
| `ASC-AC-9` | An admin; a catalogue row missing both `acronym` and `code` | The block renders | That row is omitted, exactly as the existing `:638` filter omits a malformed assignment |

### Scenario — the admin with no assignments (`ASC-R-1`, `ASC-R-3`, `ASC-AC-1`)

- **GIVEN** a signed-in platform admin whose `roles.center` is empty
- **AND** the CLARISA catalogue has resolved
- **WHEN** the sidebar renders its centre block
- **THEN** the block is visible and lists every catalogue centre
- **BUT** it must NOT issue an HTTP request of its own
- **AND IT MUST** keep each entry navigating to `/bilateral/<acronym>/home`

### Scenario — nobody else moves (`ASC-R-2`, `ASC-R-7`, `ASC-AC-3`, `ASC-AC-8`)

- **GIVEN** a non-admin user assigned to exactly one centre
- **WHEN** the sidebar renders and any consumer calls `getMyCenters()`
- **THEN** the block shows that one centre and the method returns that one centre
- **BUT** it must NOT consult the catalogue for this user at all
- **AND IT MUST** leave both permission gates returning what they return today

### Scenario — the catalogue fails (`ASC-R-8`, `ASC-R-9`, `ASC-AC-5`, `ASC-AC-6`)

- **GIVEN** an admin with two assignments
- **AND** the catalogue fetch has failed, leaving `centers()` empty
- **WHEN** the sidebar renders
- **THEN** the two assigned centres are listed
- **BUT** it must NOT render an empty block or a spinner that never resolves
- **AND IT MUST** rebuild the list if a later retry populates the catalogue

---

## 9. Defect classes and the gate for each

| # | Defect this spec can produce | Gate |
|---|---|---|
| `D1` | **A non-admin's sidebar changes.** The blast radius that matters most | `ASC-AC-3`, `ASC-AC-4` as Jest cases with `isAdmin: false`. Scoped run: `npx jest --testPathPattern="reporting-nav-sidebar"` |
| `D2` | A permission gate's input changes because `getMyCenters()` was touched | `ASC-AC-8`, plus the existing suites of both gate owners: `npx jest --testPathPattern="(api.service\|bilateral-results-list)"` |
| `D3` | An entry renders the literal `undefined` where a role would go | `ASC-AC-7` — assert the rendered text of a catalogue entry contains no `undefined` |
| `D4` | A malformed catalogue row routes to `/bilateral/undefined/home` | `ASC-AC-9` — the existing `:638` filter must also cover catalogue rows |
| `D5` | The block stays hidden for an admin with zero assignments — the exact user this is for | `ASC-AC-1`. 🛑 A fixture with assignments cannot catch this; the case **must** use an empty `roles.center` |
| `D6` | A duplicate: the admin's own centre listed twice, once per source | `ASC-AC-2`. 🛑 The fixture **must** have the assigned centre also present in the catalogue, or the dedup is untested and the assertion is inert |
| `D7` | A `computed()` caches the empty catalogue and never rebuilds — the P2-3190 / P2-3554 class | `ASC-AC-6` — set the catalogue signal **after** the first render and assert the list grows. A fixture pre-loaded with the catalogue cannot see this |
| `D8` | A fresh array each change detection re-renders the list and starves the sidebar | **No dedicated automated gate.** Substitute: the design pins a by-reference or memoised read, and the Reviewer checks it against the `centersList` comment. Recorded as a review obligation, not a command |
| `D9` | **A dozen-plus entries make the sidebar unusable** — scroll, density, the collapsed rail becoming a column of identical diamonds | **No automated gate, and none is proposed.** Substitute: a human check at the HITL pause, against a real admin account. `ASC-OQ-4` |
| `D10` | A type error the Jest runner erases | `npx tsc --noEmit` from `onecgiar-pr-client/` |

**Classes with no automated check:** `D8` (review obligation) and `D9` (human check). Both are stated here rather than left implicit, because a gate that cannot see the defect it is meant to catch is not a gate.

---

## 10. Dependencies & Assumptions

### Upstream

- `CentersService` and its `clarisa/centers/get/all` fetch — **already present and already running at bootstrap.** No new dependency.

### Downstream consumers

- None. This spec adds no exported symbol and changes no shared contract. `getMyCenters()` is explicitly out of scope, which is what keeps its 12 consumers out of the blast radius.

### Assumptions

- **A1** — `CentersService.centers()` holds the full CGIAR centre catalogue, since the service treats an empty response as a failed attempt rather than a valid one (`centers.service.ts`, the `!response?.length` branch).
- **A2** — `isAdmin` is `role_id == 1` on the application role (`roles.service.ts:89`, `:154`) and is signal-backed (`isAdminState`), so it is safe to read from a `computed()`.

---

## 11. Open Questions

- **`ASC-OQ-1`** — Does the PRD's Platform admin persona (`docs/prd.md:43`) get extended to include centre browsing, or is this an operational convenience outside the documented persona? **Owner: the user / PO.** Decides whether a PRD delta is owed at archive time. Does not block the build.
- **`ASC-OQ-2`** — Wire up or delete the unused `validateCenterAccess()` (`roles.service.ts:200`, no production caller on any branch)? **Owner: the user.** Out of scope here; leaving it is leaving a trap for the next reader.
- **`ASC-OQ-3`** — Do the topbar and header-panel centre lists follow, or stay assignment-only? **Owner: the user.** They will visibly disagree with the sidebar until settled.
- **`ASC-OQ-4`** — How many centres does CLARISA actually return, and does a flat list of that size still satisfy `docs/ux-ui/design.md:20`? **Owner: the design gate**, settled by reading the catalogue rather than assuming a count.

---

## 12. Out-of-Band Notes

- The proposal feared a new catalogue fetch and a shape-mapping burden. The Phase-2 probe found the catalogue already resolved in a shared signal and the bilateral destination already handling unassigned centres, so the change is materially smaller than proposed. The shape mapping remains real: `CenterDto` is `{ code, financial_code, institutionId, name, acronym, lead_center, full_name }` against the assignment shape `{ center_id, center_name, center_acronym, role_name }` — nothing lines up by name and `role_name` has no counterpart.

---

## Required cross-references

- `docs/prd.md` — **US-A1**, Platform admin persona (`:43`).
- `docs/ux-ui/design.md` — `:20` (catalogues stay shallow and searchable).
- `docs/specs/archive/2026-09-18-auth--center-user/requirements.md` — `:48`, `:57` (the admin assigns; they are not a centre user).
- `onecgiar-pr-client/src/CLAUDE.md` — client source-tree conventions.

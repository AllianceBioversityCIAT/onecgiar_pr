# Design — A platform admin sees every CGIAR centre in the sidebar

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/admin-sees-all-centers` |
| Type | Change · Depth **Lite** |
| Status | `draft` — awaiting Phase 2 approval |
| Requirements | [`requirements.md`](./requirements.md) |
| Branch base | `performance-refactor` @ `f37e1c728` — every citation read at this SHA |
| Date | 2026-09-28 |

## 1A. Premise Ledger

**Count:** 10 rows — **9 verified**, **1 `UNVERIFIED`** (0 `High`, 1 `Low`).
**Blast-radius triggers:** two fire. The design names a user action and a branch point (`live-path`, `P-2`), and changes a component method its own template reads from five call sites (`consumer`, `P-9`). The `shared-state` trigger does **not** fire — `CentersService` is **read**, never modified, and no state, service, base class or lifecycle hook is changed for any other component.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| `P-1` | The sidebar's centre block renders the component's own `getMyCenters()` wrapper, not the service method directly | `location` | `reporting-nav-sidebar.component.html:116`, `:257` (`@for (center of getMyCenters(); track center.center_id)`); wrapper at `reporting-nav-sidebar.component.ts:638` | `f37e1c728` | There is no local composition point and the change must move into `RolesService` — **High** | verified |
| `P-2` | The reproduction reaches that wrapper: admin signs in → shell renders `reporting-nav-sidebar` → block guarded by `@if (getMyCenters().length > 0)` → `@for` over the same call. Branch point: `isCollapsed()` selects the rail (`:114`) or the expanded block (`:253`); both call the same wrapper | `live-path` | `reporting-nav-sidebar.component.html:114` (rail guard), `:116` (rail `@for`), `:253` (expanded guard), `:257` (expanded `@for`), `:277` (divider guard); wrapper `…component.ts:638` | `f37e1c728` | The patched code is not what the admin reaches — **High** | verified |
| `P-3` | `RolesService.getMyCenters()` has no admin branch — it returns the assignments verbatim | `existence` | `roles.service.ts:196-198`: `return this.roles?.center ?? [];` | `f37e1c728` | The feature already exists and the spec is unnecessary — **High** | verified |
| `P-4` | The CLARISA catalogue is already resolved and held in a **signal** by a root service; it is fetched at bootstrap, retried twice, cached, and an empty response is treated as a failed attempt rather than cached | `existence` | `centers.service.ts`: `@Injectable({providedIn:'root'})`, `readonly centers = signal<CenterDto[]>([])`, constructor `void this.getData()`, `RETRY_COUNT = 2`, and the `if (!response?.length) throw` branch | `f37e1c728` | A new fetch, cache and retry must be built here — the change roughly triples — **High** | verified |
| `P-5` | Navigating to a centre the user is **not** assigned to already resolves, by an explicit admin branch | `existence` | `bilateral.component.ts:68-73`, comment *"Admin users (or users without a matching center assignment): resolve via CLARISA catalog"*, resolving name and code from `centersService.getData()` | `f37e1c728` | Listing a centre would produce a broken destination and the spec needs a bilateral task — **High** | verified |
| `P-6` | `RolesService.roles` is a **plain property**, not a signal, and may be empty on a cold load — so a `computed()` reading it caches the empty value and never rebuilds | `data-env` | `roles.service.ts:27` (docstring: derived reads are *"invisible to the signal"*); independently recorded at `dashboard-lab.component.ts:1989` — *"a plain non-reactive property that may be empty on a cold load"* | `f37e1c728` | `ASC-DD-2` inverts: the wrapper could safely become a `computed()` — **High** | verified |
| `P-7` | `isAdmin` **is** signal-backed and safe to read reactively | `data-env` | `roles.service.ts:33` `private readonly isAdminState = signal(false)`, `:74` getter over it, written at `:89`, `:130`, `:154` | `f37e1c728` | The admin branch would need its own reactivity — **Low** | verified |
| `P-8` | The two shapes share no field name, and the catalogue carries no role | `data-env` | Assignment shape `{center_id, center_name, center_acronym, role_name}` — `roles.service.spec.ts:456-462`, rendered at `…component.html:124`, `:265`. Catalogue shape — `shared/interfaces/center.dto.ts`: `{code, financial_code, institutionId, name, acronym, lead_center, full_name}`. Server projection confirms it: `clarisa-centers.repository.ts:31-43` selects `code, financial_code, institutionId, name, acronym` | `f37e1c728` | No mapping layer is needed — **High** | verified |
| `P-9` | The wrapper this design changes is read from **five** template call sites and one spec, and by nothing outside the component | `consumer` | `grep -rn "getMyCenters" src/app/shared/components/reporting-nav-sidebar/` → `component.html:114,116,253,257,277`; `component.ts:638`; `component.spec.ts:728-739`. Repo-wide `grep -rn "getMyCenters" src/ cypress/` finds no external reader of the **component** method (the 12 other hits read the **service** method, which this design does not touch) | `f37e1c728` | An external consumer breaks silently — **High** | verified |
| `P-10` | The catalogue the endpoint returns is the set of CGIAR centres active in both `clarisa_center` and `clarisa_institutions`; its **cardinality** is unknown | `data-env` | Filter verified: `clarisa-centers.repository.ts:41-42` (`ci.is_active > 0 and cc.is_active > 0`). The **count** is `UNVERIFIED — confirm at source before relying on it` — no command in this repository returns it without a live DB or an authenticated call | `—` | Only `ASC-R-20` / `ASC-OQ-4` — whether a flat list is still acceptable. No decision or task below depends on the number — **Low** | **`ASC-T-3`**, the HITL browser check, owner **the user** (VPN/DB access) |

## 2. Architecture Overview

### 2.1 Where this lives in the system

```
RolesService.roles (plain property, NOT reactive)  ──┐
  .center[] = assignments                            │
                                                     ├──▶ CPNavSidebar.getMyCenters()   ◀── the ONLY change
CentersService.centers (signal, root, bootstrapped) ─┤      (method, re-read per CD)
  = CLARISA catalogue                                │              │
                                                     │              ▼
RolesService.isAdmin (signal-backed) ────────────────┘    union + dedup + map + filter
                                                                    │
                                              ┌─────────────────────┴─────────────────────┐
                                              ▼                                           ▼
                                   rail @for (:116)                          expanded @for (:257)
                                              └─────────────────┬─────────────────────────┘
                                                                ▼
                                                    centerHomeLink() → /bilateral/<acronym>/home
                                                                ▼
                                          bilateral.component.ts:68 resolves via CLARISA  (already exists)
```

Everything outside the single boxed node is existing, unmodified code.

### 2.2 Interaction

1. Shell renders the sidebar. `getMyCenters()` is evaluated per change-detection pass, as today.
2. It reads assignments (plain property — always current) and, when `isAdmin`, the catalogue signal.
3. It maps catalogue rows into the card shape, removes those already present as assignments, filters malformed rows, and returns the union.
4. Catalogue empty or failed → the union degenerates to the assignments, which is `ASC-R-8`.
5. Catalogue resolves later → the next change-detection pass picks it up, which is `ASC-R-9`.

## 3. Data Model Changes

None. No entity, migration, stored field, or payload.

## 4. API Surface

None. No endpoint is added or changed, and no new request is issued — `CentersService` already owns the only call (`ASC` NFR *Performance*, `P-4`).

## 5. Server Workflow / Business Rules

Out of scope by construction. No server file is touched.

## 6. Frontend Plan

### 6.1 Routes / modules

Unchanged. One component: `shared/components/reporting-nav-sidebar/`.

### 6.2 Components & services

| Element | Change |
|---|---|
| `CPNavSidebarComponent.getMyCenters()` (`:638`) | Becomes the composition point: assignments, plus the mapped catalogue when `isAdmin`, deduplicated |
| `CentersService` | **Injected and read only.** Not modified |
| `RolesService` | **Untouched.** This is the whole point of `ASC-DD-1` |
| Card template (`:257-266`, rail `:116-126`) | Gains the "mine vs all" marker and a role line that tolerates absence |

### 6.3 Design system usage

Reuses the existing vocabulary only — `pr-nav-center-card`, `pr-nav-center-diamond`, `programDotColor()`, `pr-nav-program-name`. **No new design token.** If the Phase-3 treatment turns out to need one, that routes back through `/akili-propose` per the token rule rather than being improvised here.

## 7. Security & Authorization

**No authorization change.** The spec alters what is *listed*, never what is *permitted*. Both centre permission gates keep reading `RolesService.getMyCenters()`, which this design does not modify (`P-9`), and both already admit admins through their own `isAdmin` checks (`api.service.ts:295`, `bilateral-results-list.component.ts:409`). A listed centre the admin may not act in still fails those gates exactly as before.

## 8. Performance & Capacity

No new request (`P-4`). Work per change-detection pass is O(assignments + catalogue) over a set bounded by the active CGIAR centres (`P-10`) — a map, a set lookup, and a filter over a list whose order of magnitude is tens. The wrapper already runs a `.filter()` on every pass today, so the shape of the cost is unchanged.

## 9. Observability

None added. A catalogue failure is already handled and logged by `CentersService`; this design must not swallow it differently, only degrade (`ASC-R-8`).

## 10. Testing Plan (forward-looking)

Jest against the component, per the gates in `requirements.md` §9. Three fixtures carry trap conditions that make the difference between a real gate and an inert one, and they are called out in the tasks: an admin with **zero** assignments (`D5`), an assigned centre that is **also** in the catalogue (`D6`), and a catalogue that lands **after** first render (`D7`).

## 11. Backwards Compatibility & Migration Plan

Fully backwards compatible for every non-admin: the admin branch is the only new path, and `ASC-AC-3` / `ASC-AC-4` pin the unchanged behaviour. Rollback is reverting one component.

## 12. Design Decisions (ADRs)

### `ASC-DD-1` — Compose in the component's own wrapper; never touch `RolesService.getMyCenters()`

- **Decision:** the union is built in `CPNavSidebarComponent.getMyCenters()` (`:638`). The service method is unchanged.
- **Why:** the service method has 12 production consumers across 5 modules, **two of which are permission decisions** (`api.service.ts:297`, `bilateral-results-list.component.ts:412`). Redefining "my centres" at the source would change the input to an authorization check in order to solve a navigation problem. The component already owns a wrapper around exactly this data, for exactly this kind of local concern (`P-1`, `P-9`).
- **Rejected:** an `isAdmin` branch inside the service (proposal `Option A`); a server-side change to the roles payload (`Option C`) — that one alters an **auth** payload and makes an admin indistinguishable from a user assigned to every centre.

### `ASC-DD-2` — Keep the wrapper a **method**; do not convert it to a `computed()`

- **Decision:** `getMyCenters()` stays a plain method re-evaluated on every change-detection pass.
- **Why:** a `computed()` is the instinctive choice and is **wrong here**. It would read `RolesService.roles`, a plain non-reactive property that may be empty on a cold load (`P-6`) — the computed would cache the empty assignment list and never rebuild, which is the P2-3190 / P2-3335 / P2-3554 defect class that P2-3678 was written to eliminate. The catalogue half *is* reactive (`P-4`), so a computed would be correct for one input and silently stale for the other, which is worse than either.
- **The cost, and why it is acceptable here:** a method returns a fresh array each pass. `CentersService.centersList` carries a prominent warning against exactly that — but that warning is scoped to `pr-select`, which derives options in a `computed()` over an input and renders through `*cdkVirtualFor` **with no `trackBy`**. The sidebar's two loops are `@for (… ; track center.center_id)` (`:116`, `:257`), so Angular diffs by key and a new array reference re-renders nothing. The hazard does not transfer. **This was checked, not assumed** — and the current code already returns a fresh array from its existing `.filter()`.
- **Consequence for `requirements.md`:** the NFR *Reference stability* was written before this was checked and is over-strict as drafted. Amended in the same round — see §13.

### `ASC-DD-3` — Dedup on the acronym, with the assignment winning

- **Decision:** the union is keyed on `center_acronym`, falling back to `center_id`. When a centre appears in both sources, the **assignment** row is kept and the catalogue row dropped.
- **Why:** the assignment row is strictly richer — it carries `role_name`, which the catalogue has no counterpart for (`P-8`). Keeping the catalogue row would lose the admin's own role and turn "mine" into "all", which is `ASC-R-4` failing. Keying on the acronym matches how `api.service.ts:297` and `bilateral.component.ts:58` already resolve a centre.

### `ASC-DD-4` — Map catalogue rows into the card shape at the boundary, and reuse the existing malformed-row filter

- **Decision:** `{code, name, acronym}` → `{center_id: code, center_name: name, center_acronym: acronym, role_name: undefined}`, then through the **existing** `Boolean(center_acronym || center_id)` filter (`:638`).
- **Why:** nothing lines up by name (`P-8`), and the existing filter exists precisely to stop a row with neither key from building `/bilateral/undefined/home` — the comment at `:639-640` says so. A catalogue row must pass the same guard, or the defect the filter prevents re-enters through the other door (`ASC-AC-9`, `D4`).
- **Role absence:** `role_name` is legitimately absent for a catalogue centre. The tooltip `center.center_name + ' · ' + center.role_name` (`:124`, `:265`) must stop concatenating it unconditionally, or it renders the string `undefined` (`ASC-R-5`, `D3`). Reuse `shouldShowAssignmentRole()` (`shell-topbar.component.ts:216`) **for the role text only** — it filters empties and omits the uninformative default `Center user`, which is right for a tooltip suffix. 🛑 It is **not** usable as the "mine" marker: `AUTH-R-2` makes `Center User` the role of every assignment, so that helper is `false` for all of them. See `ASC-DD-5`.

### `ASC-DD-5` — Mark "mine" from the row's **source**, never from its role text

- **Decision:** the union tags each row with which source produced it. An assignment-sourced row carries the marker; a catalogue-only row does not. Assigned centres sort first (`ASC-R-10`). The marker is textual or structural, never colour alone (a11y NFR).
- **🛑 Corrected at the Step 2.3 reversion challenge — the first draft of this DD was wrong.** It proposed reusing the existing `role_name` line as the marker, reasoning that a role is "present for assignments and absent for catalogue rows by construction". That is false in practice: `AUTH-R-2` (`docs/specs/archive/2026-09-18-auth--center-user/requirements.md:66`) auto-sets every centre assignment to **Center User** and forbids the admin from picking another role, and `shouldShowAssignmentRole()` (`shell-topbar.component.ts:219`) returns `false` for exactly `'center user'`. The marker would therefore have rendered for **zero** assignments — implemented correctly, shipped, and discovered only when an admin saw no distinction at all.
- **Consequence:** the marker must be derived from the row's provenance, which the union already knows, and must not depend on any role string. `shouldShowAssignmentRole()` keeps its narrower job in `ASC-DD-4` — deciding whether to append role *text* — where omitting the uninformative default is correct.

### `ASC-DD-6` — Collapse reuses the existing group toggle; a collapsed block keeps the active centre *(added 2026-09-28, user scope change)*

- **Decision:** the "My CGIAR centers" label becomes the same toggle "Other science programs" uses (`pr-nav-others-toggle`, `toggleGroup()`/`isGroupOpen()` with a `'centers'` key, `lucideChevronDown`). `openGroups` starts with `'centers'` open. When the block is closed, the loop renders only the centre whose home prefix `/bilateral/<acronym || id>` matches the current router URL.
- **Why:** it is the sidebar's own collapse vocabulary, so there is no new token, component or state mechanism. Keeping the active centre visible is the user's explicit ask: the place you are in should not disappear behind a fold.
- **Not persisted:** the open state is not saved across reloads, because the user did not ask for that. If it turns out to be needed, the `pr-sidebar-pinned-programs` localStorage pattern is the model, as a follow-up.
- **Rail untouched** (`ASC-R-13`): the rail has no label to carry a toggle.
- **`track`:** it stays `center.center_id`. The `[data-guide="platform-tour-sidebar-centers"]` wrapper stays on the block root, outside the toggle's `@if`.

### `ASC-DD-7` — Split the draft guard into read and act; admins pass only the read *(Pivot 2026-09-28, `ASC-T-5`)*

- **Decision:** in `bilateral-ai.service.ts`, `listDrafts` and `getDraft` authorise with "Center User of the centre **or** `isUserAdmin`". `promoteDraft`, `discardDraft` and `setFormalEvidence` keep today's membership-only check. This is implemented by giving `getDraftRaw` / `assertCenterEntitlement` an explicit read-vs-act mode, so no mutating caller can reach the admin branch by accident.
- **Client:** the bilateral AI-draft UI hides promote, discard, the formal-evidence toggle and the AI create entry for a user who is not a member of the current centre. This uses a **membership** check, not the existing `isAdmin`-short-circuited gates (`api.service.ts:295`, `bilateral-results-list.component.ts:409`), which would let the admin through.
- **Why:** the user asked for it: an admin sees everything and acts on nothing that is not theirs. The server keeps enforcing, and the client hiding is UX so the admin never meets a 403.
- **Supersedes:** `§7 Security & Authorization` ("no authorization change") and the proposal's non-goal "Any server change", for this read path only.
- **Not in scope:**
  - `getSignedUrl` (`:438`, creator-only). The admin sees the draft preview but cannot open its files; the user accepted this.
  - `createJob` (`:117`) has **no** centre check for anyone. That is a pre-existing gap, recorded, not fixed here.

### `ASC-DD-8` — Collapsed by default, and collapsed means "mine + where I am" *(added 2026-09-28, user)*

- **Decision:** `openGroups` no longer starts with `'centers'`. `visibleCenters()`, while closed, returns the rows with `isAssigned` plus the `isActiveCenter` row, in the order `getMyCenters()` already gives them. That order is assignments first (`ASC-R-10`), so the active catalogue row lands after them.
- **Supersedes:** the open-by-default and active-only clauses of `ASC-DD-6`. The toggle markup, the URL source and `ASC-R-16` are unchanged.
- **Consequence:** for a non-admin, every row is assigned, so the open and collapsed lists are identical except when they are on an unassigned centre by URL. The user accepted this.

## 13. Open Gaps & Follow-ups

- **Reversion challenge (Step 2.3) — one DD corrected.** `ASC-DD-5`'s first draft used the `role_name` line as the "mine" marker. The challenge asked what removing/relying on it breaks and surfaced `AUTH-R-2`: every assignment is `Center User`, which `shouldShowAssignmentRole()` filters out, so the marker would never have rendered. Corrected in place before `tasks.md`. No other DD reverts delivered behaviour.
- **Amendment made this round (`ASC-DD-2`):** `requirements.md` NFR *Reference stability* — from "MUST NOT return a fresh array on every change detection" to a `trackBy`-aware form. The original would have mandated memoisation that the `@for … track` makes unnecessary, and the only alternative shape (`computed()`) is the one `P-6` rules out.
- `ASC-OQ-1` (PRD persona), `ASC-OQ-2` (dead `validateCenterAccess`), `ASC-OQ-3` (topbar / header-panel) — all remain open and none blocks the build.
- `ASC-OQ-4` / `P-10` — the catalogue's cardinality, and whether a flat list of that size still satisfies `docs/ux-ui/design.md:20`. Owned by `ASC-T-3`, the HITL check.

## 14. Budget (Step 2.4)

| | Expected |
|---|---|
| Tasks | **3** → **6** after the 2026-09-28 scope changes (`ASC-T-4` collapse, `ASC-T-5` admin read-only drafts, `ASC-T-6` collapsed-by-default) |
| LOC | **~130** (≈50 production, ≈80 test) |
| Review rounds | **1** |

Matches **Lite**. `/akili-execute` escalates rather than continuing if any is exceeded.

## Required cross-references

- `requirements.md` — `ASC-R-1`..`ASC-R-10`, `ASC-R-20`, §9 defect classes.
- `docs/ux-ui/design.md:20` — catalogues stay shallow and searchable.
- `docs/prd.md:43` — Platform admin persona.

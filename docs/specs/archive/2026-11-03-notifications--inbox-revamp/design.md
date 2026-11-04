# Notifications Inbox Revamp — Design

## 1. Summary

Client-only revamp of the Notifications inbox (`onecgiar-pr-client`). Two backend calls that already exist — the **Requests** stream (`request/get/received|sent`) and the **Updates** stream (`notification/updates`) — are merged into one presentational list with a single decision/info classification, grouped by recency, filterable exactly as today. The existing `contribution-request-drawer` (shipped 2026-09-25, see `docs/specs/changes/contribution-request-drawer/design.md`) gains a new read-only `view` mode and is opened from every row, not only pending ones. No backend change, no new AOW mechanism — the biggest constraint this design accepts is that **Updates-tab rows carry a thinner result shape** than Requests-tab rows (no reporting center, no `contributing_programs` list), so the metadata grid renders conditionally per row rather than assuming one fixed shape.

Requirements: `docs/specs/notifications/inbox-revamp/requirements.md`. Builds directly on `docs/specs/changes/contribution-request-drawer/design.md` (`CRD-DD-*`) — this spec does not reopen any `CRD-DD` decision.

---

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| NOTIF-P-1 | A Requests-tab row "needs a decision" iff it is on the **Received** side with `request_status_id === 1` | `notification-item.component.ts::get isPending()` | Read directly (explore pass, 2026-09-29): `notification?.request_status_id === 1 && !this.isSent` | verified | Reclassify per whatever the real gate is; NOTIF-R-1's merge function changes, not its intent |
| NOTIF-P-2 | `notification/updates` rows' `obj_result` relation includes `obj_version` (phase) and `obj_result_by_initiatives`, but NOT `result_center_array` or `obj_result_by_project` | `onecgiar-pr-server/src/api/notification/notification.controller.ts` (`getNotificattionSelect()`/`getNotificationRelations()`) | Read via delegated explore pass, 2026-09-29; not re-read line-by-line by the Leader in this session | assumed | The metadata grid's per-source field list (§6.2) is wrong for that field; correct it and re-check NOTIF-AC-7's test fixtures — cheap, a template-level fix |
| NOTIF-P-3 | `contribution-request-drawer` is purely presentational — no HTTP calls, all state passed via `@Input()`/emitted via `@Output()` | `.../contribution-request-drawer/contribution-request-drawer.component.ts` | Read directly (explore pass, 2026-09-29) | verified | The `view` mode addition (§6.2) would need its own data-fetch, not just new inputs |
| NOTIF-P-4 | Accept/Decline and the ToC/indicator ("Align") mapping already submit together in one `PATCH request/update` call, via `result_toc_result` | `notification-item.component.ts::acceptOrReject()` | Read directly (explore pass, 2026-09-29): quoted body shape `{ result_request, result_toc_result, request_status_id }` | verified | NOTIF-R-6 would need a second call; §5 sequencing changes |
| NOTIF-P-5 | No standalone "AOW selector" component exists anywhere in `onecgiar-pr-client/src/app` | Glob for `aow-selector`/`AowSelector` | Returned zero implementation files (only an unimplemented spec folder) | verified | NOTIF-R-6's "reuse Align, do not invent AOW checklist" premise would need to change |
| NOTIF-P-6 | `group-notifications-by-recency` buckets by a parametrized `dateKey` (default `requested_date`) and is otherwise source-agnostic | `pipes/group-notifications-by-recency.pipe.ts` | Read via delegated explore pass, 2026-09-29 | assumed | The merge layer (§6.2) needs its own recency bucketing instead of reusing the pipe as-is |

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client modules touched (only):**
  - `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-notifications/` — `results-notifications.component.ts`, `results-notifications.service.ts`, `components/notification-item/`, `components/contribution-request-drawer/`, all six `pipes/*.pipe.ts`.
  - **Amended 2026-09-29 (`NOTIF-DD-6` Pivot):** `pages/requests/` (received/sent) and `pages/updates/` are **retired**, not merely "touched" — their routes are removed/redirected and their list-rendering + filter-toolbar responsibility moves into `results-notifications.component`. `pages/settings/` is unaffected and keeps its own route.
  - No change to `shared/components/header-panel/components/pop-up-notification-item/` or `shared/services/notification-navigation.service.ts` in this pass — see `NOTIF-DD-5` (§12).
- **Server modules touched:** none. `api/notification` and `share-result-request` endpoints are consumed exactly as they respond today (`docs/trd/trd.md` §4 `Notification` row; `AC-4`-style stability applies by analogy even though this isn't a bilateral payload).
- **External integrations touched:** none new.

### 2.2 Sequence — opening the detail panel from any row

```
[results-notifications page]
  ├── fetch (unchanged): get_section_information() → receivedData
  ├── fetch (unchanged): get_updates_notifications() → updatesData
  └── NEW: buildUnifiedList(receivedData, updatesData)
        ├── tag each Requests row: { source:'request', needsDecision: status_id===1 && !isSent }
        ├── tag each Updates row:  { source:'update',  needsDecision: false }
        ├── normalize a common `activityDate` (requested_date | created_date) for recency bucketing
        └── group-notifications-by-recency(dateKey:'activityDate') (unchanged pipe, new key)

[row click, not on person-name / result-title]
  └── notification-item.component.ts::openDrawer(entry)
        ├── source:'request', needsDecision:true  → mode:'decide'   (UNCHANGED — CRD-DD-10 flow)
        ├── source:'request', needsDecision:false  → mode:'view'     (NEW — was previously non-clickable, "Status 2/3 blocks get none of this")
        └── source:'update'                        → mode:'view'     (NEW — Updates rows had no drawer entry point at all)
```

---

## 3. Data Model Changes

None. No entity, DTO, or migration changes — this is a presentation-layer merge of two existing, unchanged responses.

---

## 4. API Surface

No new or changed endpoints. Consumed as-is:

| Call | Wraps | Used for |
|---|---|---|
| `GET request/get/received` | `results-notifications.service.ts::get_section_information()` | Received requests (decision + resolved) |
| `GET request/get/sent` | `::get_sent_notifications()` | Sent requests (always info) |
| `GET notification/updates` | `::get_updates_notifications()` | Informational feed |
| `PATCH request/update` | `notification-item.component.ts::acceptOrReject()` | Accept/Decline (+ optional `result_toc_result`) — unchanged |

---

## 5. Server Workflow / Business Rules

Unchanged. `acceptOrReject()`'s existing branches (ToC-carried / bilateral / legacy, per `CRD-DD-3`/`CRD-DD-4`) keep governing what happens on Accept — this spec only changes what the user sees before and while deciding, never the decision call itself.

---

## 6. Frontend Plan

### 6.1 Routes / modules

**Amended 2026-09-29 (Pivot Record, `NOTIF-T-6` execution — see `execution.md`; supersedes the original text below the strike-through note; `NOTIF-DD-6`).** The original plan ("no routing change... a client-side tab state inside the existing page, not a new route") under-specified what happens to the pre-existing "Requests | Updates" routed tabs — `NOTIF-T-6`'s Implementer built the new tab row *alongside* them rather than replacing them, which the Reviewer caught as producing duplicate rows, duplicate Accept/Decline surfaces, and the unified list leaking onto the unrelated Settings route. The user resolved this (2026-09-29): **the new tab row replaces the Requests/Updates routed tabs.**

Corrected plan:

- `results-notifications-routing.module.ts`'s `requests` and `updates` child routes are removed (or redirected to the parent `results-notifications` path, whichever the Implementer finds cleaner given `RouterModule` conventions already in use) — the merged All/Needs-decision/For-info view becomes the ONE thing rendered at `results-notifications`, not a route among several.
- The filter toolbar (search / center / initiative / phase / bilateral-project — the five `filter-notification-by-*` pipes, per `NOTIF-R-10`) **migrates from `requests.component.*`/`updates.component.*` into `results-notifications.component`**, operating on the unified list.
- `NOTIF-R-8`'s Received/Sent independence requirement is **re-expressed as an in-list toggle** inside `results-notifications.component` (mirroring the visual pattern already used for the pending-row Received/Sent segmented control in the mockup, `ntSegR`/`ntSegS`) rather than as separate routes — switching Received↔Sent still closes an open detail panel (`NOTIF-AC-6`, unchanged in intent) and still filters which rows the unified list shows, it just no longer navigates.
- `settings.component.*` (the Notification Settings tab) is **unaffected** — it keeps its own route and must NOT render the unified notification list (this was `NOTIF-T-6` attempt 1's blocking bug: the list rendered on every child route including Settings, because it lived in the parent template above an untouched `<router-outlet>`). With `requests`/`updates` routes removed, the risk changes shape but the constraint stands: the unified list is `results-notifications.component`'s own content now, and `settings` remains a sibling route the parent template does not blanket-render content above.
- `received-requests.component.*`/`sent-requests.component.*` (the actual list-rendering components inside the old `requests` route) are retired — their rendering responsibility (the `<app-notification-item>` list, grouped by recency) moves to `results-notifications.component`, which already consumes `<app-notification-item>` per `NOTIF-T-6`'s original (correct) work. Do not delete their `.spec.ts` coverage outright — port any assertion that isn't already duplicated by `results-notifications.component.spec.ts`'s own tests before removing the components, so no regression silently disappears with the file.
- `updates.component.*` is retired the same way; anything it uniquely covered (e.g. the Updates-only empty state, if visually distinct) gets a look before deletion.

~~No routing change. `results-notifications-routing.module.ts` keeps its current routes; the "All / Needs your decision / For your information" split is a **client-side tab state** inside the existing page, not a new route.~~ *(superseded, see above)*

### 6.2 Components & services

**New: a unification layer inside `results-notifications.service.ts`** (or a co-located pure function/service if the existing service is judged too large to extend — decided at task time, not here):

- `buildUnifiedList(received: any[], sent: any[], updates: any[]): UnifiedNotification[]` — tags each source row with `source: 'request' | 'update'`, `needsDecision: boolean` (per `NOTIF-P-1`), and a normalized `activityDate` field.
- The five `filter-notification-by-*` pipes run against this unified array unchanged in logic; per `NOTIF-DD-4`, a filter whose matched field is absent on a row (e.g., center filter against an Updates row with no `result_center_array`) excludes that row rather than passing it through — documented, not silent.
- `group-notifications-by-recency` is called with `dateKey: 'activityDate'` instead of the current hardcoded default (its `dateKey` param already supports this — `NOTIF-P-6`).

**Changed: `contribution-request-drawer`** gains a third mode:

| Mode | Trigger | Footer |
|---|---|---|
| `decide` (existing) | Row-body click on a pending Received row | Accept / Decline — unchanged, `CRD-DD-10` |
| `confirm-decline` (existing) | Decline from `decide` mode | Confirm / Cancel — unchanged |
| **`view` (new)** | Row-body click on any resolved Received row, any Sent row, or any Updates row | No footer — result card + metadata grid only, close (✕ / scrim / Escape) |

`view` mode reuses the drawer's existing header/result-card/review-table builders (`drawerHeader()`, `drawerReviewTables()`) with a **per-source field adapter**:

| Field | Requests-tab rows | Updates-tab rows |
|---|---|---|
| Result code + title | `obj_result.result_code` / `.title` | same |
| Result type | `obj_result.obj_result_type.name` | omit — not returned (`NOTIF-P-2`) |
| Phase | `obj_result.obj_version` | same |
| Primary program | `obj_result.obj_result_by_initiatives[0]` | same relation, per `NOTIF-P-2` |
| Reporting center | `result_center_array[0].clarisa_center_object...` | omit — not returned |
| Submitted by / actor | `obj_requested_by` | `obj_emitter_user` |

A field with no source on a given row is **omitted from the grid**, never rendered blank (`NOTIF-R-5`, `NOTIF-AC-7`).

**Changed: `notification-item.component.ts`** — the `role="button"` / `openDrawer('details')` click wiring that today only applies to the pending-row template block (`CRD` §6.3) is extended to the resolved-row and Updates-row templates, opening in `view` mode. Nothing about the pending-row block's popups or inline ToC block changes.

**Changed: chip rendering** — a single `"Contribution request"` chip for any `source:'request'` row (no sub-typing, per `NOTIF-R-3`), and the row's `NotificationType` label for any `source:'update'` row (already resolved by `getResultNotificationTextParts()` / `resolveNotificationType()` — reused, not reimplemented).

### 6.3 Design system usage

- Same primitive as today: `hlm-sheet` / `hlm-sheet-content` (side `right`). No new dependency.
- Tabs (`All` / `Needs your decision` / `For your information`) and the funding/type chip row use existing Helm/PrimeNG tokens already in the page — no new design tokens introduced.
- A11y: `view` mode inherits the drawer's existing focus-trap/restore behavior (`CRD` §10, `D-7`); the newly-clickable resolved/Updates rows get the same `role="button"` / `tabindex="0"` / `aria-label` treatment the pending rows already have.
- Responsive: unchanged from the drawer's existing plan (`CRD` `D-6`, sticky regions, one scroll) — no new breakpoint behavior introduced by `view` mode since it renders a strict subset of `decide` mode's content.
- i18n: any new copy (tab labels, "Contribution request" chip, `view` mode's absence of a footer) goes through `src/app/internationalization/` per `NOTIF`'s NFR table.

### 6.4 Real-time / notification UX

Unchanged. No new socket/Pusher events; `user-notification-settings` gating is untouched.

---

## 7. Security & Authorization

No change. The unified list only ever contains rows the existing `request/get/received|sent` and `notification/updates` calls already scoped to the current user; no new cross-user exposure is introduced by merging them client-side.

---

## 8. Performance & Capacity

- `buildUnifiedList()` runs client-side over already-fetched arrays (typically tens of rows) — negligible cost, no new network round-trip (`NOTIF-R` performance NFR).
- `view` mode reuses the drawer's existing render path; no new heavy dependency.

---

## 9. Observability

No new logging. This is a presentation-layer change; existing `PATCH_readNotification` / `PATCH_readAllNotifications` telemetry (if any) is unaffected.

---

## 10. Testing Plan

- **Unit (client Jest):** `buildUnifiedList()` — classification (`NOTIF-AC-1`), recency grouping over mixed sources, and the "missing field → omitted" rule (`NOTIF-AC-7`) with a fixture Updates row lacking `result_center_array`.
- **Component (client Jest):** `notification-item` click-target routing — clicking the person-name/result-title link does NOT open the drawer, clicking elsewhere on the row does (`NOTIF-AC-2` / `NOTIF-AC-3`); `contribution-request-drawer` in `view` mode renders no Accept/Decline footer and no per-program history; switching selected notification (A → B) does not leak A's transient state (`NOTIF-AC-5`).
- **Component (client Jest):** Received ↔ Sent tab switch closes an open panel (`NOTIF-AC-6`).
- **Regression (existing, must stay green):** `npx jest --testPathPattern="notification-item|contribution-request-drawer" --silent --reporters=summary --no-coverage` — the `CRD-DD-10` popup-coexistence tests and the P2-3187 tests are not touched by this spec and must not regress.
- **Manual / HITL (T6 visual, no automated equivalent exists — accepted gap, see §13):** responsive layout of the redesigned tab/chip row at mobile width; focus order on `view` mode open/close.

---

## 11. Backwards Compatibility & Migration Plan

- Purely additive at the API-consumption level — no contract change, no rollout flag needed.
- `contribution-request-drawer`'s existing `decide`/`confirm-decline` behavior is untouched; `view` is a new, additive mode.
- No data backfill.

---

## 12. Design Decisions

### NOTIF-DD-1 — Merge Requests + Updates client-side, no new backend endpoint

- **Context:** the mockup's "All" tab implies one unified list; today these are two separate calls feeding two separate tabs.
- **Decision:** merge them in a client-side `buildUnifiedList()` function, computed from data already fetched by the two existing calls.
- **Alternatives considered:** (1) a new backend "unified inbox" endpoint — rejected, out of this spec's Non-Goals (no `api/notification` changes this pass) and unnecessary given the client already fetches both arrays; (2) keep Requests/Updates as fully separate tabs, add only the "needs decision" framing within Requests — rejected, doesn't deliver the "All" view the proposal and requirements call for.
- **Consequences:** the merged list inherits each source's own field-completeness gaps (`NOTIF-P-2`); filters degrade per-row rather than uniformly (`NOTIF-DD-4`).

### NOTIF-DD-2 — Generalize `contribution-request-drawer` with a new `view` mode, not a second component

- **Context:** the proposal's Option B (generalize vs. keep two detail surfaces). The drawer already exists, is presentational, and its shell (`hlm-sheet`) is reusable.
- **Decision:** add a third `mode: 'view'` to the existing component instead of building a parallel panel.
- **Alternatives considered:** (1) a brand-new shared panel component — rejected, duplicates the sheet shell, focus-trap, and header/result-card builders the drawer already has working and tested; (2) leave non-decision rows without any detail surface — rejected, defeats the point of the revamp.
- **Reversion challenge — "what does adding a `view` mode risk breaking in `decide`/`confirm-decline`?"** Nothing: `view` is a new branch in the mode switch, not a change to the existing two. The row-click wiring for **pending** rows (`CRD-DD-10`'s popups + drawer coexistence) is untouched; only previously-non-clickable rows (resolved Received, Sent, Updates) gain a new click target. No existing test path is altered.
- **Consequences:** the drawer component grows one more mode branch and a per-source field adapter (§6.2); its test suite grows accordingly (§10).

### NOTIF-DD-3 — Real request-type taxonomy replaces the mockup's five-chip fiction

- **Context:** the reference mockup showed five distinct decision-chip types ("Contribution request", "Primary program request", "CG Center tagged", "Bilateral project tagged", "Contributor request"); none of these exist as distinct backend concepts for Requests-tab rows — there is exactly one contribution-request shape.
- **Decision:** render a single "Contribution request" chip for every decision row; use the real `NotificationType` enum label for every informational row.
- **Alternatives considered:** inventing a client-side sub-typing heuristic to recover the mockup's five chips — rejected, would render labels the data can't back, violating `NOTIF-R-3`/`NOTIF-AC-7`'s spirit.
- **Consequences:** the redesigned list is visually simpler than the mockup on this one axis; flagged to the user as a corrected assumption, not a silent deviation.

### NOTIF-DD-4 — A row missing a filter's field is excluded under that filter, not passed through

- **Context:** Updates-tab rows lack `result_center_array` / `obj_result_by_project`; the center and bilateral-project filters key on those fields.
- **Decision:** when a filter is active and a row's shape lacks the field it matches on, that row does not pass the filter (safe default — matches today's behavior where each pipe already assumes its field exists).
- **Alternatives considered:** always show field-less rows regardless of an active filter — rejected, would make filters lie about what they're excluding.
- **Consequences:** filtering by center or bilateral project will, until a future backend enrichment, effectively hide Updates-tab rows from those two filters. Recorded as an open gap (§13), not solved in this spec (Non-Goals forbid backend changes).

### NOTIF-DD-5 — Bell popup (`pop-up-notification-item`) unchanged this pass

- **Context:** `NOTIF-OQ-3` asked whether the bell popup should also open the new panel.
- **Decision:** no. Keep its current click-through navigation; revisit only if the user asks for it as a follow-up.
- **Alternatives considered:** wiring the popup into the same `view`/`decide` modes now — rejected, expands scope and budget (§ below) without a stated need.
- **Consequences:** the popup and the full inbox page present notifications slightly differently until/unless a follow-up spec unifies them.

### NOTIF-DD-7 — Row badges (funding window, result type/level, bilateral project name) are real, not fictional (2026-09-30)

- **Context:** the 2026-09-29 correction (`NOTIF-DD-3`) ruled out inventing the mockup's 5-way decision-chip sub-typing, and was read too broadly by the T-1–T-7 execution as "none of the mockup's extra badges are real." The user pushed back with the mockup image; a fresh server-code read (`share-result-request.service.ts::getRequestRelations()`) confirmed `obj_result.source_name`, `obj_result_type`, `obj_result_level`, and `obj_result_by_project.obj_clarisa_project` are already eager-loaded and returned on every Requests-tab row today — just never rendered client-side.
- **Decision:** render these as additive per-row badges (`NOTIF-R-12`) on Requests-tab rows immediately (no backend change needed there), AND widen the Updates-tab select/relations (`NOTIF-R-13`) so the same badges + the bilateral project name (`NOTIF-R-14`) work there too — approved as a narrow, explicit exception to the "no `api/notification` changes" Non-Goal.
- **Consequences:** `notification-item`/`results-notifications.component`'s row templates gain new badge markup (new task, `NOTIF-T-9`); `notification.service.ts`'s Updates select widens (new task, `NOTIF-T-8`); tab-badge visual styling gets a pass (`NOTIF-T-10`); the filter toolbar gains Type/Funding/Result-type filters now backed by real fields (`NOTIF-T-11`).

### NOTIF-DD-6 — The unified tab row REPLACES the Requests/Updates routed tabs (Pivot, 2026-09-29)

- **Context:** `NOTIF-T-6`'s first execution attempt built the new All/Needs-decision/For-info tab row correctly, but left the pre-existing "Requests | Updates" routed tabs (and their routed `received-requests`/`sent-requests`/`updates` pages) in place alongside it, since the original §6.1 text ("a client-side tab state inside the existing page, not a new route") didn't explicitly say the new tabs should *replace* the old ones, and `NOTIF-T-6`'s file scope in `tasks.md` didn't list the old pages. The Reviewer caught this producing duplicate rows, duplicate Accept/Decline surfaces, and the unified list leaking onto the unrelated `settings` route.
- **Decision:** the new tab row replaces the Requests/Updates routed tabs entirely. `received-requests.component.*`/`sent-requests.component.*`/`updates.component.*` are retired; their old routes are removed/redirected; the filter toolbar migrates into `results-notifications.component`; `NOTIF-R-8`'s Received/Sent independence becomes an in-list toggle rather than a route split (see §6.1's amended text).
- **Alternatives considered:** (1) nest the new tabs *inside* the Received/Sent split (one merged All/Decision/Info view per side) — rejected by the user; keeps `NOTIF-R-8` more literally but contradicts `design.md` §6.2's `buildUnifiedList(received, sent, updates)` signature, which already merges Received+Sent into one array, and would need that signature reworked; (2) leave both UIs coexisting — rejected, that's the state the Reviewer found broken (duplicate surfaces, Settings-route leak).
- **Consequences:** `NOTIF-T-6`'s scope grows to include `requests.component.*`, `received-requests.component.*`, `sent-requests.component.*`, `updates.component.*`, and `results-notifications-routing.module.ts` (route removal). `NOTIF-T-7`'s file scope (isolation + regression) grows correspondingly, since its "Files (expected)" originally named `received-requests`/`sent-requests` — those files no longer exist post-`T-6`, so `T-7`'s isolation tests move to whatever component now hosts the merged list. The Budget below is revised accordingly.

---

## Budget (Step 2.4)

| Signal | Estimate | Revised (2026-09-29, post-Pivot) |
|---|---|---|
| Expected tasks | 7 | 7 (unchanged — `NOTIF-T-6` absorbs the added scope rather than splitting into a new task, since it's a direct continuation of the same Reviewer-caught gap, not new work) |
| Expected LOC | ~500–650 (client only) | ~750–950 (client only) — `NOTIF-T-6`'s re-scope adds retiring 3 components + a routing change on top of its original tab-row work |
| Expected review rounds | 1–2 | 2–3 for `NOTIF-T-6` specifically (1 already spent pre-Pivot; expect at least 1 more given the larger surface) |

Matches the **Standard** depth chosen in `requirements.md`, revised once by this Pivot. If `/akili-execute` finds `NOTIF-T-6`'s re-scoped work growing further past this revised estimate, the Leader should stop and escalate again rather than silently absorbing a second overrun.

---

## 13. Open Gaps & Follow-ups

- **Center / bilateral-project filters miss Updates-tab rows** (`NOTIF-DD-4`) — accepted for this spec; a real fix needs `notification/updates` to return `result_center_array` / `obj_result_by_project`, which is a backend change out of scope here.
- **Visual/responsive/focus-order verification has no automated check** — accepted gap, routed to a manual/HITL pass (§10), consistent with the same gap already named in `requirements.md` §10.
- **Bell popup left unchanged** (`NOTIF-DD-5`) — explicit follow-up candidate, not silently dropped.
- **`NOTIF-P-2` was verified via a delegated explore pass, not a direct re-read by the Leader** — cheap to re-confirm at task time with a single grep before the field-adapter task starts; flagged so the Implementer double-checks rather than assumes.
- **Port, don't silently drop, any unique test coverage in `received-requests`/`sent-requests`/`updates`'s own `.spec.ts` files before deleting those components** (`NOTIF-DD-6`) — if any of them assert something not already covered by `results-notifications.component.spec.ts`, that assertion needs a new home, not a quiet disappearance.
- **Bell popup (`NOTIF-DD-5`) and the retired Requests/Updates pages may now diverge further** — the popup still click-throughs somewhere; confirm at `NOTIF-T-6` re-execution time that its target still resolves once the old routes are gone (likely needs to point at the new merged `results-notifications` route instead of `.../requests` or `.../updates`).

---

## Required cross-references

- `docs/specs/notifications/inbox-revamp/requirements.md` (same folder).
- `docs/specs/changes/contribution-request-drawer/design.md` — source of `CRD-DD-*`, not reopened here.
- `docs/prd.md` — US-S3.
- `docs/ux-ui/design.md` — §10 accessibility, DD-10 dual-channel notifications.
- `docs/trd/trd.md` — `Notification` module row, W4.

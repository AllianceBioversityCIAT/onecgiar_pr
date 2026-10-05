# Notification Detail Side Panel — Design

## Document Control

- **Spec:** `notifications/detail-side-panel` · **Depth:** Standard · **Type:** Change · **Approval Mode:** gated
- **Requirements:** `requirements.md` (DSP-R-1..R-14, DSP-AC-1..AC-10)
- **Facts source:** an Explore scout pass on 2026-10-05 (server entities/migrations, controller pattern, client list/row/drawer, tokens). Citations are in §1A.

---

## 1. Summary

The row (`notification-item`) keeps **all** decision state, as it does today. Its detail UI moves into a new presentational `notification-detail-content` component, wrapped in one `<ng-template>` inside the row. A page-scoped `NotificationDetailPanelService` decides where that template renders:
- **≥ 1280 px:** as a CDK `TemplatePortal` into a sticky `<aside>` beside the list.
- **< 1280 px:** inside the existing `hlm-sheet` drawer, now a thin shell.

The approval chain comes from a new `GET /api/results/request/get/result/:resultId/approval-chain`, which composes `submission`, `results_by_inititiative` and `share_result_request`.

---

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| DSP-P-1 | `request_status_id`: 1 Pending, 2 Accepted, 3 Rejected, 4 Draft | `migrations/1669405102671-insertRequestData.ts:7`, `1770336723684-AddNewRequestStatusDraft.ts:7-8` | Seed values read; usage at `share-result-request.service.ts:291,1712` | verified | The status mapping in DD-4 changes; T-1 tests catch it |
| DSP-P-2 | `results_by_inititiative.initiative_role_id`: 1 Owner (primary), 2 Contributor | `migrations/1664912268260-controlListInserts.ts:54,57` | Seed read; `service.ts:182` uses role 1 as owner | verified | Primary/contributor split in DD-4 inverts |
| DSP-P-3 | `request_type` ∈ {`contribution`, `primary`}. A primary row stores `owner_initiative_id = shared_inititiative_id` | `share-result-request.entity.ts:44-47,73-81`, `repository.ts:146-152` | Enum and comment read | verified | The primary step source in DD-4 needs another column |
| DSP-P-4 | Latest submission = `submission WHERE results_id=? AND is_active=1 ORDER BY created_date DESC LIMIT 1`, `status` true = submit | `bilateral.service.ts:2069-2090`, `submission.entity.ts` | Existing query read | verified | The submission step needs a different rule |
| DSP-P-5 | No existing endpoint returns every request row for a result with actor/date/type | `resultByInitiatives.repository.ts:219-320`, `results.service.ts:4372` | Closest readers return status-1/draft only, without actors | verified | Reuse it instead of a new query |
| DSP-P-6 | Global `JwtMiddleware` on `api/*`, user via `@UserToken()`, envelope via `ResponseInterceptor`, admin = `$_getMaxRoleByUser(id) === 1` | `app.module.ts:140-156`, `share-result-request.controller.ts:28-29`, `RoleByUser.repository.ts:68-88` | Read | verified | Auth wiring for T-1 differs |
| DSP-P-7 | `@angular/cdk` ^21.2.14 is installed. `layout` and `portal` are not used yet | `onecgiar-pr-client/package.json:34` | grep | verified | Add the dependency (unlikely) |
| DSP-P-8 | A row leaves the DOM when source/tab/filters stop matching it after a refresh. "Load more" only appends rows | `results-notifications.component.ts:209,248,307`, html :441-456 | Read | verified | DSP-R-3 needs an explicit page-level close |
| DSP-P-9 | The `hlmSheetTitle`/`hlmSheetDescription`/`hlmSheetClose` directives need sheet context (they inject the Brn sheet) | `@spartan/sheet` helm sources (`hlm-sheet-title.ts`, `hlm-sheet-close.ts`, `hlm-sheet-description.ts`) + `@spartan-ng/brain`'s own `.d.ts` (`BrnDialogTitle`/`BrnDialogClose`/`BrnDialogDescription`, each declaring a `private readonly _brnDialogRef` field injected in its constructor) | T-3: read the Helm directive sources (each `hostDirectives` a `Brn*` equivalent) and the Brain package's type declarations confirming each one injects its own dialog ref, which only resolves for a component registered as the sheet's own portal content | **verified** | N/A — confirms DD-3 as planned: content declared in `#detailTpl` resolves its injector at the row's (`notification-item`'s) declaration site, not under the dialog's `BrnDialogRef` provider — so `notification-detail-content` uses a plain `h2[id]` + hand-built close button; the shell forwards `labelledBy`/`describedBy` onto `<hlm-sheet>`'s own `aria-labelledby`/`aria-describedby` inputs (attempt 2 fix — not an attribute on `hlm-sheet-content`, the attempt-1 mistake) |
| DSP-P-10 | The sheet portal can project an `ngTemplateOutlet` the same way it projects `[crdAlign]` today (CRD-P-4) | CRD-P-4 (jsdom-only) | T-3: `notification-item.component.spec.ts`'s positive `[crdAlign]` projection assertions — `'renders the [crdAlign] block for a bilateral request'` (L2033-2038) and `'still renders [crdAlign] for a bilateral result opened in decide mode (unchanged, CRD-DD-10)'` (L2620-2630) — prove `ngTemplateOutlet` end-to-end: `#detailTpl` → `app-notification-detail-content` → the shell's `<ng-content/>`, under the shared Jest Sheet stub, plus `notification-detail-content.component.spec.ts`'s own `[crdAlign]` projection tests in isolation | jsdom-verified (unchanged caveat: real CDK portal/overlay projection stays the Leader's manual browser pass, T-9) | N/A — confirms DD-3 as planned |

---

## 2. Architecture Overview

### 2.1 Where this lives

| Layer | Path | Role |
|---|---|---|
| Server | `api/results/share-result-request/` (controller, service, repository, new `dto/approval-chain.dto.ts`) | Chain endpoint |
| Client API | `shared/services/api/results-api.service.ts` | `GET_requestApprovalChain(resultId)` |
| Page | `results-notifications.component.{html,ts}` | Provides `NotificationDetailPanelService`. List and `<aside>` in a flex row. Calls `closeAll()` on a Received/Sent switch |
| Panel service (new) | `results-notifications/services/notification-detail-panel.service.ts` | `isWide` signal (BreakpointObserver `(min-width: 1280px)`), `activeKey`, `portal`, `open/close/closeAll` |
| Row | `components/notification-item/` | Owns state and the chain fetch. Declares `#detailTpl`. Routes it to the portal or the drawer. Closes on destroy |
| Content (new) | `components/notification-detail-content/` | Presentational body: header, chips, sentence, RESULT grid, chain, where-it-contributes, `[crdAlign]` slot, footer |
| Drawer | `components/contribution-request-drawer/` | Becomes a sheet shell: `open`, `closed`, a11y labels, width, and projects the content |

### 2.2 Interaction

1. Row activated → `onRowActivate()` → `openDrawer()`. This sets the mode and state as today, then calls `panel.open(key, new TemplatePortal(detailTpl, vcr))` and starts the chain fetch.
2. **Wide:** the page `<aside>` renders `cdkPortalOutlet = panel.portal()`. The drawer gets `open = drawerOpen() && !panel.isWide()` → closed.
3. **Narrow:** the aside is not rendered. The drawer is open and projects `ngTemplateOutlet = detailTpl`.
4. `isWide` flips while open → the drawer's open binding and the aside condition swap. The template is re-instantiated in the other container. Row state survives because it lives in the row (DSP-R-4).
5. Another row opens → `panel.open(keyB, …)` replaces the portal. The service notifies the previous owner through an `activeKey` effect in each row: if `activeKey !== myKey` and I'm open → reset my drawer state (DSP-R-2).
6. Decision success → the row closes the panel and emits `requestEvent` (page refresh, as today; `CRD-R-8`). No chain request is sent here. The next open of the row fetches a fresh chain (step 1). (pivot DSP-T-2, user-approved 2026-10-05)

---

## 3. Data Model

No entity or migration changes. Read-only over `submission`, `result`, `result_status`, `results_by_inititiative`, `share_result_request`, `clarisa_initiatives`, `users`, `role_by_user`.

---

## 4. API Surface

### 4.1 New endpoint

`GET /api/results/request/get/result/:resultId/approval-chain` (JWT via global middleware, `ResponseInterceptor` envelope)

Response `response` (DTO `ApprovalChainDto`):

| Field | Type | Notes |
|---|---|---|
| `result_id` | number | |
| `submission` | `{ state: 'submitted' \| 'not_submitted', result_status_id, result_status_name, actor_name \| null, date \| null }` | DD-4 |
| `steps[]` | `{ initiative_id, official_code, short_name, name, role: 'primary' \| 'contributor', status: 'accepted' \| 'pending' \| 'declined', actor_name \| null, date \| null, is_viewer_program }` | Ordered: primary first, then contributors by `official_code` |

Errors: 403 when unauthorized (DD-5). 404 when the result does not exist or is inactive. 400 when `resultId` is not a positive integer.

### 4.2 Bilateral / platform-report impact

None. This is not part of `/api/bilateral/*`, so `bilateral-result-summaries.en.md` is untouched.

---

## 5. Server Workflow / Business Rules

Composition (DD-4), one repository method running ≤ 4 queries:

1. **Submission:** take the latest active submission (DSP-P-4). If it exists with `status = true` → `submitted` (actor = user's full name, date = `created_date`). Otherwise → `not_submitted`, with the current `result.status_id` and its name (e.g. "Editing"), and no actor/date.
2. **Primary:** take the active `results_by_inititiative` row with role 1.
   - If an active `share_result_request` with `request_type='primary'` exists for the result and its status is not 4, the primary step uses that request's status (1 → pending, 2 → accepted, 3 → declined), with actor/date from `approved_by`/`aprovaed_date` when decided, else `requested_by`/`requested_date`.
   - Otherwise → `accepted`, with actor/date from the owner row's `created_by`/`created_date`.
   - No owner and no primary request → no primary step.
3. **Contributors:** take the union by initiative.
   - (a) Active `results_by_inititiative` rows with role 2 → `accepted`.
   - (b) Active `share_result_request` rows with `request_type='contribution'` and status ∈ {1, 2, 3}, keyed on `shared_inititiative_id`.
   - Per initiative, the **latest request** (by `requested_date`) decides status and actor/date: decided → approver/`aprovaed_date`, pending → requester/`requested_date`. A role-2 row with no request → `accepted` with `created_by`/`created_date`. A role-2 row always wins over a declined request (the program is a contributor now).
   - Exclude the primary initiative. Exclude status 4 drafts.
4. **is_viewer_program:** the initiative is in the viewer's active `role_by_user` initiatives (same source as `getUserInitiatives`).

---

## 6. Frontend Plan

### 6.1 Routes / modules

No route changes. `notification-detail-content` is standalone and imported by `notification-item`. The panel service is provided in `ResultsNotificationsComponent.providers`, so each page instance has its own and nothing is shared with the header bell.

### 6.2 Components & services

| Unit | Inputs / API | Notes |
|---|---|---|
| `NotificationDetailPanelService` | `isWide: Signal<boolean>`, `activeKey: Signal<string\|null>`, `portal: Signal<Portal\|null>`, `open(key, portal)`, `close(key)` (no-op if not active), `closeAll()`, `closedByUser$` | `toSignal(BreakpointObserver.observe('(min-width: 1280px)'))` |
| `notification-detail-content` | The existing drawer inputs (mode, headerParts, resultCode/Title, reviewRows, footer flags, acceptLabel, showAlignSlot, focusAlign) + new `title`, `chips` (status, funding, levelType, date), `resultGrid` (6 label/value), `chain` (`{state:'loading'\|'ok'\|'error', data}`), `headingId`. Outputs: the existing ones + `retryChain` | Moves the drawer's body/footer markup and logic here (`needsMore`, expand, guards, focusAlign scroll). Keeps all `crd-*` `data-testid`s. Uses **no** `hlmSheet*` directives (DSP-P-9) — a plain `h2[id]` and a close `button` |
| `contribution-request-drawer` (shell) | `open`, `labelledBy`, output `closed` | `hlm-sheet` + `hlm-sheet-content` (same width classes, motion-reduce, `aria-labelledby`), `<ng-content />` |
| `notification-item` | + `approvalChain` signal, `chips()`, `resultGrid()`, `detailTitle()` builders; `ngOnDestroy → panel.close(key)`; an `activeKey` effect resets own state when another row takes over | The existing decision methods are unchanged |
| Page | `flex items-start gap-[16px]`: list `flex-1 min-w-0`; `@if (panel.isWide() && panel.portal())` → `<aside role="complementary" [attr.aria-labelledby]>` sticky | `setActiveSource()` → `panel.closeAll()` |

**Field sources** (reused from today's builders, scout §9):
- **Chips:** `rowStatusLabel`, `fundingWindowBadge` (`'W3/Bilaterals'` shown as is), `resultLevelTypeBadge`, and the date `activityDate` formatted `dd MMM yyyy`.
- **Grid:**
  - Reporting center: the `result_center_array[0]` acronym.
  - Result type: level · type.
  - Primary SP: the chain's primary `official_code`, falling back to `obj_result_by_initiatives[0]` while loading.
  - Contributing programs: the chain's contributor codes with status ≠ declined, joined with ", " (skeleton while loading).
  - Submitted by: today's `submittedBy`.
  - Phase: `obj_version.phase_name`.
  - An empty value → `copy.dashValue` (muted).

**Order in the body:** sentence → RESULT card → APPROVAL CHAIN → Where it contributes → MAP TO YOUR THEORY OF CHANGE (`[crdAlign]`). The footer is pinned.

**Focus (DSP-R-13):**
- When docked, `afterNextRender` focuses the content heading (`tabindex=-1`).
- On close, the row focuses its own host row element.
- Escape: a `keydown.escape` handler on the aside → row `closeDrawer()`.
- The drawer keeps the CDK trap and restore.

### 6.3 Design system usage (mockup → project tokens)

| Mockup | Project token |
|---|---|
| `--surface` | `surface-card` / `--pr-surface-card` |
| `--surface-2` (RESULT card) | `surface-subtle` |
| `--surface-3` (status chip bg) | `--pr-surface-sunken` |
| `--surface-4` (dividers) | `--pr-border-divider` |
| `--border` / `--border-strong` | `--pr-border` / `--pr-border-strong` |
| `--text` / `--text-2` / `--text-3` / `--text-4` / `--text-muted` | `ink-heading` / `ink-body` / `ink-secondary` / `ink-subtle` / `ink-muted` |
| `--accent` (links, "Your program") | `brand-300` |
| `--primary` (Accept) | `hlmBtn variant="brand"` (unchanged) |
| `--st-approved-fg/bg` | `--pr-status-approved-fg/-bg` |
| `--st-editing-fg/bg` (awaiting) | `--pr-status-in-progress-fg/-bg` |
| declined | `--pr-status-rejected-fg/-bg` |
| not submitted | `--pr-status-not-started-fg/-bg` |
| JetBrains Mono | the existing `font-mono` |

**Metrics (from the pasted DOM):**

| Element | Value |
|---|---|
| Panel | radius 12, 1 px border, no shadow, `sticky top-[24px] h-[calc(100vh-140px)]` (to verify against the real top bar, R4), `w-[380px] min-[1600px]:w-[440px]` |
| Header | `pt-[14px] px-[20px]`, title 15/700 |
| Chips row | `px-[20px] pt-[8px] pb-[14px]`, bottom border divider. Pills are 11/600 `rounded-full px-2 py-[2px]`; the funding pill is outlined |
| Body | `p-[20px] gap-[20px]`, independent scroll |
| Sentence | 15/400, line-height 1.5 |
| RESULT card | radius 10, `p-4`, label 11/600 uppercase tracking .08em, link 14/600, grid `grid-cols-2 gap-x-5 gap-y-[14px]`, labels 11/500 muted, values 13 |
| Chain step | `py-[10px]`, divider between steps, 18 px icon (filled check = approved fg; ring 2 px = in-progress fg; declined = rejected fg with ✕), name 13/600, sub 12 `ink-subtle`, "Your program" 11/600 brand, pill at the right |
| Footer | `px-[20px] py-[14px]`, top divider, buttons `min-h-[36px]` |

These are Spartan/Helm primitives: `hlmBtn`, `hlmBadge` where the variants fit (otherwise token classes), and `hlm-skeleton` for chain loading.

The drawer (< 1280 px) renders the **same content**. Its width stays as today (`!w-[720px]`, full screen < 640 px).

### 6.4 Real-time / notification UX

None new. The chain is fetched on each open only (no post-decision fetch, pivot DSP-T-2).

---

## 7. Security & Authorization (DD-5)

The viewer may read the chain for result R when either:
- they are an admin (`$_getMaxRoleByUser === 1`), or
- one of their active `role_by_user.initiative_id` values appears in R's active `results_by_inititiative` rows or active `share_result_request` rows (shared/owner/requester/approving).

Otherwise → 403, with no body data. Only names, codes and dates are returned (no emails, no ids of users). Nothing is logged beyond `_handlersError` (no tokens, `.cursorrules`).

## 8. Performance & Capacity

≤ 4 indexed queries keyed by `result_id`. Target p95 < 500 ms (NFR). One fetch per open (the panel closes on decision, so the next open is the refresh). Not cached client-side: freshness matters more here.

## 9. Observability

The existing `_handlersError` path only.

## 10. Testing Plan

| Level | What | Command |
|---|---|---|
| Server Jest | Chain service: status mapping, role-2-over-declined, latest-request-wins, drafts excluded, primary from request vs owner, not-submitted branch, is_viewer_program, 403 path | `npx jest --maxWorkers=2 --testPathPattern=share-result-request` |
| Client Jest | Panel service (open/close/closeAll/isWide), row routing wide vs narrow + destroy + takeover reset, content rendering (chips, grid `–`, chain states incl. mockup fixture, retry), the existing drawer/notification-item suites updated | `npx jest --maxWorkers=2 --testPathPattern="results-notifications"` |
| Manual (T-9) | Layout and fidelity at 1280/1440/1600/1024/390 px, focus, sticky, light/dark | Browser pass against `mockup/` |

## 11. Backwards Compatibility & Rollback

- Additive endpoint, no migration. Rollback = revert the client commit; the endpoint is harmless if unused.
- The drawer's public selector stays the same. Its inputs move to the content component, so spec assertions move with them.

---

## 12. Design Decisions

### DSP-DD-1 — Row-owned template routed by a page service (Option B)
- **Decision:** the row keeps its state. Its detail template is portaled to the page when wide and projected into the drawer when narrow.
- **Rejected:** lift state to the page, because it rewrites 1.3k lines of decision logic just stabilized by PSR/BCT; CSS-only non-modal sheet, because CDK Dialog cannot take part in the layout.
- **Covers:** DSP-R-1..4.

### DSP-DD-2 — Single breakpoint source
- **Decision:** `isWide` comes from `BreakpointObserver` in the service. The aside width (380/440) is pure CSS.
- **Why:** one signal drives both containers, so they can never both show (DSP-R-4).

### DSP-DD-3 — Content component; drawer becomes a shell
- **Decision:** move the body and footer out of `contribution-request-drawer` into `notification-detail-content`, without `hlmSheet*` directives.
- **Reversion challenge** ("what does removing the sheet title/description/close directives break?"):
  - The sheet loses its auto-wired accessible name/description.
  - Escape/✕ close routing changes.
  - Tests asserting `crd-*` inside the drawer break.
- **Addressed:**
  - The shell sets `aria-labelledby` to the content heading id.
  - The content ✕ emits `closed` → the row closes (the sheet's own Escape still emits `closed`).
  - The `crd-*` testids are kept in the content.
  - The CRD-T-6 manual focus check is repeated in T-9.

### DSP-DD-4 — Chain composition rules
- **Decision:** §5 as written: role-2 beats a declined request, the latest request wins, drafts are excluded, and the primary step comes from the primary request if one exists, else from the owner row.
- **Why:** it matches what the product treats as "contributor" today (`accepted_contributing_initiatives` = role 2).

### DSP-DD-5 — Authorization = involvement or admin
- **Decision:** as §7.
- **Rejected:** "any authenticated user". Program decision status is not public today.

### DSP-DD-6 — RESULT grid always shows 6 labels, `–` when empty (supersedes NOTIF-R-5/AC-7 for this grid)
- **Reversion challenge** ("what does dropping 'omit when missing' break?"):
  - Update-source rows have no reporting center (NOTIF-P-2), so they will show `–`.
  - The NOTIF-T-4 `viewMetadataRows` tests asserting omission break.
- **Addressed:**
  - `–` is the user-approved behavior (2026-10-05).
  - Result type is now available on update rows (NOTIF-R-13 widening).
  - The tests are rewritten in T-4, not deleted.
  - Status and request kind move from the grid to the chips/title, so nothing is lost.

### DSP-DD-7 — Contributing programs from the chain
- **Decision:** the grid field uses the chain (all non-declined contributors).
- **Why:** the row payload has no contributor list (inbox-revamp §11).

### DSP-DD-8 — ToC section frames the existing Align step
- **Decision:** add a heading + helper text and restyle the spacing only. No AOW checklist and no new save path (NOTIF-R-6).
- **Why:** an AOW checklist does not exist in the product.

### DSP-DD-9 — Where it contributes stays, after the chain
- **Decision:** user decision D3.

### DSP-DD-10 — Chain fetch owned by the row, uncached
- **Decision:** the fetch runs on every open (no cache). Its error state is local to the chain section.
- **Amended (pivot DSP-T-2, 2026-10-05):** there is no re-fetch on decision success. The existing decision methods close the panel in `finalize` (`CRD-R-8`/`CRD-DD-6`), which supersedes any in-flight chain request, so a post-decision fetch can never be displayed. Freshness after a decision comes from the next open.
- **Why:** DSP-R-8 says a failure must not block the decision.

---

## 13. Budget (tripwire for `/akili-execute`)

| Metric | Expected |
|---|---|
| Tasks | 9 (8 code + 1 manual) |
| LOC | ~1,100 (≈ 450 source + 650 tests/specs) |
| Review rounds | ≤ 2 per task; ≤ 12 Reviewer passes total |

## 14. Open Gaps & Follow-ups

- DSP-P-9 and DSP-P-10 confirmed in T-3 (§1A updated with evidence); neither changed the plan.
- `h-[calc(100vh-140px)]`: verify against the real header in T-9.
- Phone landscape below 1280 uses the drawer — this is intended.

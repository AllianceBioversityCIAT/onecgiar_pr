# Notification Detail Side Panel — Tasks

## 1. Scope of this task list

- **Module / feature:** `notifications/detail-side-panel`
- **Linked spec:** `requirements.md` (DSP-R-*, DSP-AC-*) + `design.md` (DSP-DD-*, DSP-P-*)
- **Owner / driver:** Santiago Sanchez
- **Status:** not-started
- **Test discipline (every task):** Jest always runs with `--maxWorkers=2` and a scoped `--testPathPattern`. Never run the full suite. Run one test run at a time on the machine. Lint only the touched files (`npx eslint <files> --quiet`). No `git commit` without the user's go-ahead.

## 2. Pre-flight checklist

- [x] `requirements.md` approved
- [x] `design.md` approved
- [x] No migration (design §3)
- [ ] No other in-flight spec editing `notification-item` / `contribution-request-drawer` (the working tree currently has uncommitted `bilateral-project-tagged` changes in `notification-item.*` — commit or stash them before DSP-T-6)

## 3. Task list

### `DSP-T-1` — Server: approval-chain endpoint `[x]`
- **Type:** `server`
- **Description:** Add `GET get/result/:resultId/approval-chain` to `share-result-request.controller.ts`, `ShareResultRequestService.getApprovalChain(resultId, user)`, a repository method composing submission / owner / primary request / contributors per design §5, and `dto/approval-chain.dto.ts`. Authorization follows design §7. Errors:
  - 400 when the id is not a positive integer
  - 404 when the result is missing or inactive
  - 403 when the user is not involved in the result and is not an admin
- **Implements:** DSP-R-12 (both scenarios); DSP-R-8 data (order, statuses, actor/date, `is_viewer_program`, the not-submitted branch); DD-4, DD-5; DSP-AC-9
- **Files:** `onecgiar-pr-server/src/api/results/share-result-request/{share-result-request.controller.ts, share-result-request.service.ts, share-result-request.repository.ts, dto/approval-chain.dto.ts}` + specs
- **Depends on:** — · **Blocks:** T-2
- **Estimate:** M · **Review:** full (auth + new contract) · **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`
- **Verification:** `npx jest --maxWorkers=2 --testPathPattern=share-result-request --silent --reporters=summary --forceExit`
  - **Falsifier:** each of these inputs FAILs the task:
    - a role-2 contributor that also has an older declined request comes back `declined`
    - two requests for SP01 (pending, newer than an accepted one) come back `accepted`
    - a status-4 draft appears in `steps`
    - a primary request with status 1 shows the primary as `accepted`
    - with no submission row, `submission.state` is not `not_submitted` or `result_status_name` is null
    - a user with no involved initiative and a role ≠ 1 gets 200
    - the response contains an email or a user id
  - **Disqualifier:**
    - Tests that mock the repository method under test prove nothing about the composition. At least one test must feed raw rows (owner, contribution requests with statuses 1/2/3/4, role-2 rows, submissions) into the composition function.
    - The 403 test must go through the service's real role/initiative lookup, not a stubbed `isAuthorized`.
  - **Consumers:** none (new symbol)
- **DoD:** tests red → green; server lint on the touched files is clean; Swagger `@ApiOperation` present.

### `DSP-T-2` — Client: chain API method + row chain state `[x]`
- **Type:** `client`
- **Description:** Add `GET_requestApprovalChain(resultId)` to `results-api.service.ts`. In `notification-item`:
  - an `approvalChain` signal (`loading` | `ok` | `error` + data)
  - fetch on `openDrawer` (every mode)
  - `retryChain()`
  - no chain request on decision success: the panel closes (`CRD-R-8`) and the next open fetches fresh (pivot DSP-T-2)
  - a stale response for a previous open (row reopened or closed) is ignored
- **Implements:** DSP-R-8 scenarios "Loading and failure" (state side) and "After a decision"; DD-10; DSP-AC-7 (state), DSP-AC-8
- **Files:** `onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts`, `notification-item.component.ts` (+spec)
- **Depends on:** T-1 (contract) · **Blocks:** T-5
- **Estimate:** S · **Review:** checklist · **Skills:** `angular-developer`, `tdd`
- **Verification:** `npx jest --maxWorkers=2 --testPathPattern="notification-item.component|results-api.service" --silent --reporters=summary --no-coverage`
  - **Falsifier:** each of these inputs FAILs the task:
    - opening the row does not call `GET_requestApprovalChain` with `obj_result.id`
    - an HTTP error leaves the state at `loading`
    - after a successful accept, a chain request is sent before the panel closes (it can never be displayed)
    - after a successful accept, reopening the row does not fetch a fresh chain (use an async `Subject`, not a sync `of(...)`, for the PATCH)
    - a response arriving after close overwrites the state
    - the accept/decline methods change their `PATCH` payload (existing tests go red)
  - **Disqualifier:** any change to `acceptOrReject`'s / `submitPrimaryDecline`'s payload or control flow voids the task. Call-count assertions on synchronous `of(...)` mocks do not prove behavior across `finalize`.
  - **Consumers:** `ResultsApiService` (additive method only)
- **DoD:** tests red → green; the existing notification-item suite stays green.

### `DSP-T-3` — Extract `notification-detail-content`; drawer becomes a sheet shell (no visual change) `[x]`
- **Type:** `client`
- **Description:** Create standalone `components/notification-detail-content/`. Move the drawer's body and footer markup/logic into it (inputs, outputs, `needsMore`/expand, click guards, focusAlign scroll, `crd-*` testids), with a plain `h2[id]` and a close button instead of the `hlmSheet*` directives. Reduce `contribution-request-drawer` to a shell:
  - `hlm-sheet` + `hlm-sheet-content`, with the same width and motion classes
  - `aria-labelledby` input
  - `<ng-content/>`
  - a `closed` output
  
  In `notification-item`, wrap `<app-notification-detail-content>` in `<ng-template #detailTpl>` and render it in the drawer via `ngTemplateOutlet`. Confirm DSP-P-9 and DSP-P-10 and record the result in `design.md` §1A. **Pixel output is unchanged at every width** (restyle comes in T-4/T-5/T-8). Update the `CLAUDE.md` of both components.
- **Implements:** DD-3 (including its reversion-challenge mitigations); prerequisite for DSP-R-1/R-4
- **Files:** new `notification-detail-content.component.{ts,html,scss,spec.ts}` + `CLAUDE.md`; `contribution-request-drawer.*` (+spec, CLAUDE.md); `notification-item.component.{html,ts}` (+spec)
- **Depends on:** — · **Blocks:** T-4, T-5, T-6, T-8
- **Estimate:** M · **Review:** full (shared component contract) · **Skills:** `angular-developer`, `spartan`
- **Verification:** `npx jest --maxWorkers=2 --testPathPattern="contribution-request-drawer|notification-detail-content|notification-item.component" --silent --reporters=summary --no-coverage`
  - **Falsifier:** each of these inputs FAILs the task:
    - any pre-existing decide / confirm-decline / view behavior test goes red without being moved 1:1 to the content spec
    - the sheet panel has no accessible name (`aria-labelledby` missing or pointing to a non-existent id)
    - the content ✕ click does not reach `notification-item.closeDrawer()`
    - the `[crdAlign]` block does not render inside the drawer for a bilateral decide row
  - **Disqualifier:**
    - Deleting a test instead of relocating it voids the evidence. The moved-test count must equal the removed-test count (list both in `execution.md`).
    - jsdom cannot prove the real sheet portal projection (CRD-P-4). One manual open in the browser at 1024 px is required before PASS.
  - **Consumers:** `notification-item` (sole user of `app-contribution-request-drawer`; confirm with grep)
- **DoD:** suites green; `npm run build` (client) green; lint on the touched files is clean; both CLAUDE.md files updated.

### `DSP-T-4` — Content: header, chips row, sentence, RESULT card + 6-field grid `[ ]`
- **Type:** `client`
- **Description:** Restyle per design §6.3 metrics and tokens:
  - title = request kind / update type label
  - chips row: status, funding (outlined), level · type, date `dd MMM yyyy`
  - sentence: the existing `headerParts`, 15/400, linked result
  - RESULT card: linked `code - title` + a 2-column grid of exactly 6 fields, with muted `–` for empty values (the Contributing programs cell shows a skeleton while the chain is loading)
  
  The row builds `detailTitle()`, `chips()`, `resultGrid()`. The view-mode `viewMetadataRows` grid is removed; its status and request kind move to chips/title. Rewrite the NOTIF-T-4/T-14 tests for the new grid. New strings go in `contribution-request-drawer.copy.ts`.
- **Implements:** DSP-R-5, DSP-R-6, DSP-R-7 (all three scenarios); DD-6, DD-7; DSP-AC-10
- **Files:** `notification-detail-content.*`, `notification-item.component.ts` (+spec), `internationalization/contribution-request-drawer.copy.ts`
- **Depends on:** T-3 (and T-2 for the contributing-programs value) · **Blocks:** T-9
- **Estimate:** M · **Review:** checklist · **Skills:** `spartan`, `tailwind-design-system`, `ui-ux-pro-max`
- **Verification:** scoped Jest as in T-3
  - **Falsifier:** each of these inputs FAILs the task:
    - a fixture with `result_center_array: []` drops the "Reporting center" label instead of showing `–`
    - the grid order differs from Reporting center → Result type → Primary SP → Contributing programs → Submitted by → Phase
    - an `'W3/Bilaterals'` row shows no funding chip
    - a PSR bilateral-contributor row loses its `leadCode` / "on behalf of" sentence parts
    - a hardcoded English string appears in the template
  - **Disqualifier:** class-presence assertions (e.g. `text-ink-muted` on the dash) do not prove the visual. Fidelity is proven only in T-9. Record this in `execution.md`.
  - **Consumers:** none beyond notification-item
- **DoD:** tests green; lint on the touched files is clean.

### `DSP-T-5` — Content: APPROVAL CHAIN section `[ ]`
- **Type:** `client`
- **Description:** Render `chain` input:
  - **Submission step:** submitted = filled check + "Submitted" pill + "Submitted by {actor} · {date}"; not_submitted = ring + result status pill, no actor.
  - **Program steps:** mono code + name, "Your program" (brand) when `is_viewer_program`, subtitle "Contributing program" / actor · date, pill Accepted / Awaiting decision / Declined with the status tokens from design §6.3.
  - **States:** skeleton while loading; inline error + Retry (emits `retryChain`) on failure. Neither state disables the footer.
  - **Accessibility:** status is always in pill text, never color alone.
- **Implements:** DSP-R-8 (all four scenarios, render side); DSP-AC-6, DSP-AC-7
- **Files:** `notification-detail-content.*`, copy file, `notification-item.component.html` (bind `chain`, `retryChain`)
- **Depends on:** T-2, T-3 · **Blocks:** T-9
- **Estimate:** M · **Review:** checklist · **Skills:** `spartan`, `ui-ux-pro-max`, `tdd`
- **Verification:** scoped Jest as in T-3, with a **mockup fixture** (9400: Samuel Otieno submitted 25 Sep 2026; SP04 accepted; SP01 pending + viewer; SP07 accepted by Marta Kowalski)
  - **Falsifier:** each of these inputs FAILs the task:
    - the rendered step order or pill texts differ from DSP-R-8's main scenario
    - "Your program" appears on SP04
    - in the error state the Accept button is disabled or absent
    - a declined step renders the same icon as a pending one
  - **Disqualifier:** a test that asserts only that the section exists is not evidence. Assert per-step text in order.
  - **Consumers:** none
- **DoD:** tests green; lint on the touched files is clean.

### `DSP-T-6` — Panel service + page two-column layout + docked aside `[ ]`
- **Type:** `client`
- **Description:** New `services/notification-detail-panel.service.ts` (design §6.2: `isWide` via `BreakpointObserver('(min-width: 1280px)')`, `activeKey`, `portal`, `open/close/closeAll`), provided in `ResultsNotificationsComponent`. Page layout:
  - list wrapper `flex items-start gap-[16px]`, list `flex-1 min-w-0`
  - `@if (panel.isWide() && panel.portal())` → `<aside role="complementary">` with `cdkPortalOutlet`, `sticky top-[24px] h-[calc(100vh-140px)] w-[380px] min-[1600px]:w-[440px] shrink-0`, radius 12, border, card surface, `overflow-hidden flex flex-col`, `motion-reduce` safe
  - `setActiveSource()` calls `panel.closeAll()`
- **Implements:** DSP-R-1 (wide scenario incl. widths and the BUT clause), DSP-R-3 (Received/Sent trigger), DSP-R-14; DD-2
- **Files:** new service (+spec); `results-notifications.component.{html,ts,spec.ts}`
- **Depends on:** T-3 · **Blocks:** T-7
- **Estimate:** M · **Review:** checklist · **Skills:** `angular-developer`, `tailwind-design-system`
- **Verification:** `npx jest --maxWorkers=2 --testPathPattern="notification-detail-panel.service|results-notifications.component" --silent --reporters=summary --no-coverage`
  - **Falsifier:** each of these inputs FAILs the task:
    - `open(B)` while A is active leaves `activeKey === A`
    - `close(A)` while B is active clears B
    - with `isWide=false` the aside is in the DOM
    - switching Received → Sent leaves `portal()` non-null
  - **Disqualifier:** jsdom cannot evaluate `sticky`, the widths or the media query. Those are T-9 checks only.
  - **Consumers:** none (new)
- **DoD:** tests green; lint on the touched files is clean.

### `DSP-T-7` — Row routing: portal vs drawer, takeover, destroy, resize, focus, Escape `[ ]`
- **Type:** `client`
- **Description:** In `notification-item`:
  - `openDrawer` → `panel.open(key, TemplatePortal(detailTpl))`
  - drawer `[open]` = `drawerOpen() && !panel.isWide()`
  - an effect: when `activeKey` ≠ my key while I'm open → reset my drawer state (mode, Align selection, chain)
  - re-activating my own row while open → close (`NOTIF-R-11`)
  - `ngOnDestroy` → `panel.close(key)`
  - `closeDrawer` → `panel.close(key)` + focus my row element
  - docked open → focus the content heading (`afterNextRender`)
  - Escape inside the aside → close
  - resize keeps the state (the state lives in the row; only the container swaps)
- **Implements:** DSP-R-1 (narrow scenario), DSP-R-2 (both scenarios incl. BUT), DSP-R-3 (✕, Escape, row-leaves-list + BUT), DSP-R-4 (scenario + AND IT MUST), DSP-R-13; DSP-AC-1..AC-5
- **Files:** `notification-item.component.{ts,html,spec.ts}`, page html (Escape handler on the aside if placed there)
- **Depends on:** T-6 · **Blocks:** T-9
- **Estimate:** M · **Review:** full (state ownership across components) · **Skills:** `angular-developer`, `tdd`
- **Verification:** scoped Jest (`notification-item.component|notification-detail-panel`)
  - **Falsifier:** each of these inputs FAILs the task:
    - with `isWide=true`, opening A sets the drawer `open` input to true
    - opening B leaves A's `drawerMode === 'confirm-decline'`
    - destroying A's component while it is active leaves `panel.portal()` non-null
    - flipping `isWide` from true to false while A is in confirm-decline yields drawer `open=false` or mode ≠ confirm-decline
    - both the aside and the drawer report open at the same time
  - **Disqualifier:** focus assertions in jsdom (`document.activeElement`) prove the call, not real focus order. Real focus is verified only in T-9 (same gap as CRD-P-3).
  - **Consumers:** `NotificationDetailPanelService`
- **DoD:** tests green; the existing notification-item suite is green; lint on the touched files is clean.

### `DSP-T-8` — Content: Where it contributes, ToC section frame, pinned footer restyle `[ ]`
- **Type:** `client`
- **Description:**
  - Order the body: chain → "Where it contributes" (unchanged behavior: CRD-R-4 in decide, hidden-when-empty in view) → "MAP TO YOUR THEORY OF CHANGE" heading + helper copy wrapping `[crdAlign]` (only when `showAlignSlot` and decide/confirm-decline).
  - Restyle the footer: `px-[20px] py-[14px]`, top divider, pinned outside the scroll area, same states and labels.
  - Do not touch the Align controls' logic.
- **Implements:** DSP-R-9, DSP-R-10 (incl. BUT and AND IT MUST), DSP-R-11; DD-8, DD-9
- **Files:** `notification-detail-content.*`, copy file
- **Depends on:** T-3 · **Blocks:** T-9
- **Estimate:** S · **Review:** checklist · **Skills:** `spartan`, `ui-ux-pro-max`
- **Verification:** scoped Jest as in T-3
  - **Falsifier:** each of these inputs FAILs the task:
    - a primary request in decide shows the ToC heading
    - a view-mode row shows the footer or the ToC section
    - the bilateral accept `PATCH` payload changes (existing `result_toc_result` tests go red)
    - "Where it contributes" renders before the chain
  - **Disqualifier:** the claim that the footer is "pinned" cannot be proven in jsdom; it goes to T-9.
  - **Consumers:** none
- **DoD:** tests green; lint on the touched files is clean.

### `DSP-T-9` — HITL browser pass (visual fidelity, layout, focus) `[ ]`
- **Type:** `rollout`
- **Description:** Run the local stack (`docs/infrastructure.md` §6) and compare against `mockup/` at 1280, 1440, 1600, 1024, 390 px:
  - docked width 380/440
  - sticky height vs the real top bar (adjust `calc` if it overlaps)
  - no page horizontal scroll
  - list clickable while docked
  - swap / toggle / filter-away / Received↔Sent close
  - resize while in confirm-decline
  - focus to the heading on open and back to the row on close
  - Escape
  - drawer projection at 1024 and full screen at 390
  - chain states, using devtools offline to force the error
  - light and dark mode
  
  Record screenshots and the result in `execution.md`.
- **Implements:** the visual/layout and focus defect classes in requirements §10; DSP-R-1 widths; DSP-R-13/R-14; DSP-P-10
- **Depends on:** T-4, T-5, T-7, T-8 · **Blocks:** —
- **Estimate:** S · **Review:** user (HITL) · **Skills:** `run`, `claude-in-chrome`
- **Verification:** manual checklist above, signed off by the user
  - **Falsifier:** any listed check fails; panel and drawer are visible together at any width.
  - **Disqualifier:** screenshots taken with mocked data that does not include a pending + accepted + viewer program mix do not prove DSP-AC-6. Use a real QA/local result that has one, or record the gap.
  - **Consumers:** none
- **DoD:** user sign-off recorded.

## 4. Dependency graph

```
T-1 ──► T-2 ──────────────► T-5 ─┐
T-3 ──┬► T-4 (needs T-2) ────────┤
      ├► T-5                     ├─► T-9
      ├► T-8 ────────────────────┤
      └► T-6 ──► T-7 ────────────┘
```

T-1 and T-3 can start in parallel. Only one of them may run Jest at a time.

## 5. Coverage (scenario / clause → task)

| Requirement · scenario / clause | Task |
|---|---|
| R-1 Wide: docked, list usable | T-6, T-7, T-9 |
| R-1 Wide BUT: no scrim / no trap / no scroll block | T-6 (no sheet when wide), T-9 |
| R-1 Wide AND IT MUST: 380 / 440 px | T-6 (classes), T-9 (measured) |
| R-1 Narrow: drawer, same content, full screen < 600 | T-3, T-7, T-9 |
| R-2 Swap: shows B, A discarded | T-7 |
| R-2 Swap BUT: no state carried | T-7 |
| R-2 Re-activate same row closes | T-7 |
| R-3 ✕ / Escape / Received↔Sent / row leaves list | T-7 (✕, Esc, destroy), T-6 (source switch) |
| R-3 BUT: no stale detail for a removed row | T-7 |
| R-4 Resize moves the detail and keeps state | T-7 |
| R-4 AND IT MUST: never both containers | T-7, T-9 |
| R-5 Title + chips | T-4 |
| R-6 Sentence parity (incl. PSR variants) | T-4 |
| R-7 All fields / order | T-4 |
| R-7 Not applicable → `–`, BUT never drop the label or invent a value | T-4 |
| R-8 Mixed statuses (mockup) | T-1 (data), T-5 (render) |
| R-8 Loading / failure, BUT not blocking the decision | T-2 (state), T-5 (render) |
| R-8 After a decision → panel closes, next open fetches fresh (pivot) | T-2 |
| R-8 Not submitted | T-1, T-5 |
| R-9 Where it contributes kept, after the chain | T-8 |
| R-10 ToC frame, BUT the save is unchanged, AND hidden for primary/view | T-8 |
| R-11 Footer states, pinned | T-8, T-9 |
| R-12 Authorized viewer | T-1 |
| R-12 Unauthorized → 403, BUT no leak | T-1 |
| R-13 Focus in/out | T-7, T-9 |
| R-14 Sticky, independent scroll | T-6, T-9 |

## 6. Rollout & verification

Local only. Staging/master promotion follows the team cadence (not done by agents). Commits follow `<emoji> <type>(<scope>): …`, with no apostrophes in the subject (Jenkins).

## 7. Roll-back plan

Revert the client commits. The server endpoint is additive and inert if unused.

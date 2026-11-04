# Contribution Request Drawer — Tasks

> **Pivot 2026-09-25:** there are now 7 tasks. CRD-T-7 restores the row popups and the inline block, which T-4 deleted, so the drawer and the popups coexist (design CRD-DD-10). T-3 and T-4 below are executed history: their "delete the popups" wording is superseded by T-7.
>
> **Answer first:** 6 tasks. T-1 builds the drawer shell and proves the Spartan sheet premises. T-2 fills in its content. T-3 adds the drawer logic to `notification-item` alongside the old popups, so the suite stays green. T-4 swaps the template, deletes the popups and the inline block, and rewrites the coupled tests. T-5 updates the docs. T-6 is the real-browser pass for the defect classes jsdom cannot see.

## 1. Scope of this task list

- **Module / feature:** `notifications` — contribution request drawer (client only).
- **Linked spec:** `requirements.md` + `design.md` (same folder).
- **Owner / driver:** Santiago Sanchez.
- **Status:** not-started.
- **Budget (design §14):** 6 tasks · ~ +650 / −260 LOC · ≤ 2 review rounds per task.

Paths below are relative to `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-notifications/` unless absolute. `NI` = `components/notification-item/`, `CRD` = `components/contribution-request-drawer/`.

Test command (touched specs only, never the full suite):
`npx jest --testPathPattern="notification-item|contribution-request-drawer" --silent --reporters=summary --no-coverage` (run from `onecgiar-pr-client/`).

## 2. Pre-flight checklist

- [x] `proposal.md` approved (2026-09-25).
- [x] `requirements.md` approved (2026-09-25).
- [x] `design.md` approved (2026-09-25).
- [x] Open questions resolved (proposal OQ-2/OQ-3; requirements §12 has none).
- [x] No server, CLARISA or migration dependency.
- [x] No conflicting in-flight spec on `notification-item` (the NOTIF-T-* revamp is committed on this branch: `485847996`).

## 3. Task list

### [x] CRD-T-1 — Drawer shell on `hlm-sheet` + copy file (spike)

- **Type:** client
- **Description:** Create the standalone `ContributionRequestDrawerComponent`: `hlm-sheet` side right, width override (`!w-[720px] sm:!max-w-[720px]`, full width under 640px), header (title + description slot), scrolling body with the `[crdAlign]` projection slot, sticky footer placeholder. Inputs `open`; output `closed` from ✕, scrim and Escape. Create `src/app/internationalization/contribution-request-drawer.copy.ts` with every string listed in design §6.3. This task **proves CRD-P-3, P-4 and P-9 before anything else is built** (consult the Spartan MCP for the controlled open/close contract of `BrnSheet`/`BrnDialog`).
- **Implements:** CRD-R-9 (close by ✕/scrim/Escape, records nothing on the drawer side); NFR Layout (720px, full width under 640px, sticky header/footer, single scroll), NFR i18n, NFR Motion.
- **Files (expected):** `CRD/contribution-request-drawer.component.{ts,html,scss,spec.ts}`, `onecgiar-pr-client/src/app/internationalization/contribution-request-drawer.copy.ts`.
- **Depends on:** —
- **Blocks:** CRD-T-2
- **Estimate:** M
- **Review:** full (first `@spartan/sheet` consumer in the repo)
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`
- **Verification:**
  - **Falsifier:** with a host test component that sets `open = true` and projects `<div crdAlign data-testid="x">`, the projected node is **not** found in `document.body`. Or pressing Escape / clicking ✕ does **not** emit `closed`. Or the rendered `hlm-sheet-content` class list lacks the `!w-[720px]` override.
  - **Red run:** `npx jest --testPathPattern="contribution-request-drawer"` fails before the component exists and passes after.
  - **Disqualifier:** if the sheet cannot be driven from the `open` input (open **and** close), or the projection does not render inside its portal, **stop**. Record it in design CRD-DD-2 and switch to the fallback: a hand-rolled shell copied from `bilateral-create-drawer`, with focus handling added, or DD-1 alt B for projection. Report to the Leader before continuing; do not patch around it.
  - **What the checks cannot prove:** focus trap and focus restore to the opener, and the real rendered width. jsdom does not do layout or real focus management. Both go to CRD-T-6.
  - **Consumers:** none (no shared symbol changed; new files only).
- **Status:** [x] PASS on attempt 2, 2026-09-25 (see `execution.md`)
- **Definition of done:**
  - [x] Spec green; lint clean (`npx ng lint --quiet`).
  - [x] No hex, no rem type utilities, no hardcoded English in the template (grep the `.html` for quoted literals and `#` colours).
  - [x] Premise outcomes (P-3, P-4, P-9) written into design §1A (P-9 `verified`; P-3/P-4 `partially verified`, the rest at CRD-T-6).

### [x] CRD-T-2 — Drawer content: header, Result card, "Where it contributes", footer states

- **Type:** client
- **Description:** Render the presentational content from inputs (design §6.2):
  - the header sentence from `headerParts`, with codes in mono;
  - the RESULT card, emitting `resultActivated`;
  - one field table per `reviewRows` entry, with the 200px/1fr grid collapsing to one column under 640px, a muted dash value, mono + tabular Target / Contribution target, and `line-clamp-3` with a per-cell Show more/less;
  - the footer in `mode = 'decide'` (Decline outline + Accept contribution brand) and `'confirm-decline'` (question + Cancel + Confirm decline);
  - busy spinners, disabled states, `blockedReason` and `acceptHelper` lines tied through `aria-describedby`;
  - `focusAlign`, which scrolls the projected slot into view after open.
- **Implements:** CRD-R-2 (render of both sentence variants), CRD-R-3 (card activation output), CRD-R-4 (all four scenarios: data, "no review data — BUT must NOT hide the section", several entries, long-text clamp), CRD-R-6 "Incomplete mapping" (helper render), CRD-R-7 (footer modes; Cancel emits `declineCancelled`), CRD-R-8 "Busy" and "Blocked" (render), CRD-R-10 "Bilateral row accept" (scroll-into-view of Align). NFR Tokens, NFR a11y (focus rings, `aria-describedby`).
- **Files (expected):** `CRD/*` (same four files), `contribution-request-drawer.copy.ts`.
- **Depends on:** CRD-T-1
- **Blocks:** CRD-T-4
- **Estimate:** M
- **Review:** checklist
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`
- **Verification:**
  - **Falsifier:** feeding an empty `reviewRows` (built as one all-dash table) renders fewer than 7 labels, or hides the section. Two tables render as one. `mode = 'confirm-decline'` still shows Accept contribution. `acceptDisabled = true` leaves the Accept button clickable. `blockedReason = null` still renders an empty reason element.
  - **Red run:** new cases in `contribution-request-drawer.component.spec.ts` fail before the template change and pass after.
  - **Disqualifier:** if Helm button variants cannot express "one brand button per state" without hex or a new SCSS block, stop and ask. Do not add `.pr-*` classes.
  - **What the checks cannot prove:** that the clamp actually truncates (a class-presence assertion is not a visual truncation), and that the layout matches the mockup. Both go to CRD-T-6.
  - **Consumers:** none (component not yet mounted anywhere).
- **Definition of done:**
  - [x] Spec green; lint clean.
  - [x] Every visible string comes from the copy file (the spec imports the same constant).
  - [x] Token mapping matches design §6.3; no hex.
- **Status:** [x] PASS on attempt 2, 2026-09-25 (see `execution.md`)

### [x] CRD-T-3 — `notification-item`: drawer state and decision logic (additive)

- **Type:** client
- **Description:** Add to `NotificationItemComponent`, without removing the popups yet:
  - state: `drawerOpen`, `drawerMode`, `drawerFocusAlign`, `isPending`, `isTocMappingTouched()`;
  - methods: `openDrawer(entry)` (seeds `tocInitiative` locally for bilateral requests, no global hydration), `closeDrawer()` (discards the mapping), `onDrawerAccept()` (design §2.2 decision table), `clearTocMapping()`, `onDrawerResult()` (non-bilateral → new tab at `resultUrl()`; bilateral → `closeDrawer()` then `navigateToResult()`);
  - builders: `drawerHeader()`, `drawerReviewTables()` (from `tocReview` + `tocTypologyOf()`, with a single all-dash table when empty), `drawerBlockedReason()`, `drawerAcceptHelper()`.

  Change `onTocPlannedResultChange()` to call `hydrateGlobalTocState()` on the first answer. Put `closeDrawer()` first in `acceptOrReject`'s `finalize`. Make the legacy branch of `onDrawerAccept` call `closeDrawer()` before `mapAndAccept()`. Change `onAcceptContribution()`'s bilateral branch to `openDrawer('align')`; the prompt dialog is no longer reachable from the row, and the old test at spec L512 is updated in this task to the new expectation.
- **Implements:** CRD-R-2 "AND IT MUST use the same requester/responder resolution" (builder reuses `requesterCode`/`responderCode`), CRD-R-3 "AND IT MUST close the contribution drawer before a bilateral in-app navigation", CRD-R-4 (builder: values, dash fallback, several entries, typology rule), CRD-R-5 "Switching planned/unplanned" and "Clear mapping", CRD-R-6 all scenarios:
  - plain accept: 1 PATCH, status 2, inert payload;
  - with mapping: "BUT must NOT send a second PATCH, and must NOT open `<app-share-request-modal>`";
  - incomplete: "AND IT MUST stay possible to accept after Clear mapping";
  - legacy: "BUT the two must NOT be visible at the same time".

  Also CRD-R-7 (confirm → 1 PATCH status 3; cancel → nothing), CRD-R-8 "Blocked" (reason builder), CRD-R-8 "Outcome closes the drawer — AND IT MUST NOT stay open after the refetch", CRD-R-9 (closing records nothing, discards the mapping), CRD-R-10 (row Accept bilateral → drawer on Align, no PATCH; row Decline → confirm mode). Keeps the P2-3188 portfolio routing (`isP25Request`).
- **Files (expected):** `NI/notification-item.component.ts`, `NI/notification-item.component.spec.ts`.
- **Depends on:** — (parallel with CRD-T-1/T-2)
- **Blocks:** CRD-T-4
- **Estimate:** M
- **Review:** full (touches the P2-3187 decision path)
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier (each is a spec case):**
    - with the `PATCH_updateRequest` spy, an untouched bilateral `onDrawerAccept()` sends a payload other than `{ planned_result: null, result_toc_results: [] }` with status 2, or sends 2 calls;
    - a complete mapping sends tabs whose `initiative_id` is the owner's instead of the contributor's;
    - `onDrawerAccept()` with `planned_result = true` and no `toc_result_id` calls the PATCH at all;
    - the legacy branch sets `dataControlSE.showShareRequest = true` while `drawerOpen()` is still true (assert order with call-order spies);
    - on a PATCH **error**, `requestEvent.emit` runs while `drawerOpen()` is true;
    - `openDrawer('details')` calls `hydrateGlobalTocState` (spy) for a bilateral request;
    - `isP25` arg ≠ request portfolio.
  - **Red run:** the new `describe('CRD — drawer logic')` block fails before the methods exist and passes after. The rest of the existing suite stays green (popups still present).
  - **Disqualifier:** if the decision table cannot be expressed without changing `acceptOrReject()`'s payload construction or `buildTocMappingPayload()`, stop. Those are the P2-3187 contract and are out of scope.
  - **What the checks cannot prove:** that no second overlay is **visually** present. The order assertion proves call order, not what is on screen. CRD-T-6 checks the screen.
  - **Consumers:** `onAcceptContribution` (row template, NI `.html` L88), `acceptOrReject` (row template + dialogs, removed in T-4), `onTocPlannedResultChange` (mapping dialog template, moved in T-4).
- **Status:** [x] PASS 2026-09-25 (see `execution.md`)
- **Definition of done:**
  - [x] Spec green; lint clean.
  - [x] No change to `acceptOrReject`'s body construction, `buildTocMappingPayload()`, `isTocMappingComplete()`, `invalidateRequest()`.

### [x] CRD-T-4 — Wire the drawer into the row; delete the popups and the inline block; rewrite coupled tests

- **Type:** client
- **Description:**
  - In `NI/notification-item.component.html`, status-1 block only: make the row an interactive control (`role="button"`, `tabindex="0"`, `aria-label` from copy with the result code, click / Enter / Space → `openDrawer('details')`, pointer cursor), and add `$event.stopPropagation()` on the result link, the bilateral link and the two row buttons. Row Decline → `openDrawer('confirm-decline')`.
  - Mount `<app-contribution-request-drawer>` bound to the T-3 builders and handlers. For bilateral requests only, project the Align block: heading/hint from copy, `app-pr-yes-or-not` + `app-cp-multiple-wps` (same bindings as today's mapping dialog), Clear mapping ghost button shown when touched, and `position: relative; z-index` on the wrapper (CRD-P-5).
  - Delete the inline `toc_review` block and the three `<app-pr-dialog>`s.
  - In `.ts`, remove `showConfirmRejectDialog`, `showTocPromptDialog`, `showTocMappingDialog`, `openTocMappingStep()` and their `finalize` resets.
  - In `NI/notification-item.module.ts`, import `ContributionRequestDrawerComponent`; drop `PrDialogComponent` if nothing else in the module uses it.
  - Remove the now-dead `.toc_review*`, `.toc-mapping*` and dialog-only rules from `NI/.scss`.
  - Rewrite the spec's P2-3187 block (L472-739) and the NOTIF-T-7 L854 test to drawer equivalents, keeping each guarantee by name: AC1/AC3/AC4/AC5/AC6, portfolio routing, "never opens the legacy share-request modal", "closing records nothing", closed-platform and phase blocks.
- **Implements:** CRD-R-1 all three scenarios, including "BUT a click on the row's result link, bilateral result link, Accept or Decline button must NOT also open the drawer" and "AND IT MUST expose the row as an interactive control"; CRD-R-5 "Section visibility" and "Not for other kinds"; CRD-R-7 "BUT no dialog opens on top of the drawer"; CRD-R-10 wiring; CRD-R-11 both clauses ("no `app-pr-dialog` opens from this component", "AND IT MUST keep the guarantee that the bilateral path never opens `<app-share-request-modal>`").
- **Files (expected):** `NI/notification-item.component.{html,ts,scss,spec.ts}`, `NI/notification-item.module.ts`.
- **Depends on:** CRD-T-2, CRD-T-3
- **Blocks:** CRD-T-5, CRD-T-6
- **Estimate:** L
- **Review:** full
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`
- **Verification:**
  - **Falsifier:**
    - clicking the Accept button of a pending row flips `drawerOpen` via the row handler (bubbling not stopped);
    - a status-2 fixture row has `tabindex="0"` or opens the drawer;
    - an `isSent` row is focusable;
    - a ToC-carried or legacy fixture renders the `[crdAlign]` block;
    - `fixture.debugElement.queryAll(By.css('app-pr-dialog')).length > 0`;
    - any code path in the bilateral block sets `showShareRequest = true`.
  - **Red run:** the rewritten spec cases fail against T-3's intermediate state (popups still rendered, row not interactive) and pass after.
  - **Disqualifier:** if a rewritten test must weaken a named guarantee to pass (e.g. drop the single-PATCH assertion), stop. That means the design dropped behaviour.
  - **What the checks cannot prove:** focus returning to the row after close, and the ToC dropdowns rendering unclipped inside the sheet → CRD-T-6.
  - **Consumers:** `received-requests` and `sent-requests` templates (they mount `app-notification-item`; `sent` passes `[isSent]="true"` and must stay non-interactive); `NotificationItemModule` importers (for the pipes: unaffected).
- **Definition of done:**
  - [x] Spec green; lint clean; `npm run build` passes (templates are only type-checked by the build).
  - [x] Count of `app-pr-dialog` in `NI/.html` = 0.
  - [x] Coverage for the touched files does not drop below 50/60/60/60.
- **Status:** [x] PASS on attempt 2, 2026-09-25 (see `execution.md`)

### [x] CRD-T-7 — Pivot: restore the row popups and the inline ToC block (drawer and popups coexist)

- **Type:** client
- **Description:** Pivot of 2026-09-25 (`execution.md` → `## Pivot Record: CRD-T-5`). The row keeps today's popup flow. The drawer adds a second, independent flow that is entered by clicking the row body. In `NI/`:
  - Restore from `HEAD` the three `<app-pr-dialog>` blocks (reject confirm, "Map to your Theory of Change?" prompt, mapping step), their signals `showConfirmRejectDialog` / `showTocPromptDialog` / `showTocMappingDialog`, `openTocMappingStep()` (keep using the extracted `seedTocInitiative()`; hydration on open stays as in `HEAD` for the popup path), their `finalize` resets, `PrDialogComponent` in the module, and their SCSS.
  - Restore the inline `toc_review` block from `HEAD`.
  - Row **Accept**: every kind behaves as in `HEAD`, so bilateral → `openTocMappingStep()` (prompt dialog). Row **Decline**: back to `showConfirmRejectDialog.set(true)`.
  - The drawer flow is unchanged: `openDrawer('details')` from the row body; inline decline confirmation, Align and Accept contribution inside the drawer. The `'align'` and `'confirm-decline'` entry modes may stay, but no row button opens them.
  - Never both visible: nothing reachable from the drawer (`onDrawerAccept`, footer outputs, Align) sets a dialog signal. Opening the drawer resets any dialog signal to false. `acceptOrReject` `finalize` runs `closeDrawer()` first and resets the three dialog signals.
  - Specs: restore the `HEAD` popup-path P2-3187 tests (AC1/AC3/AC4/AC5/AC6 via the popups, prompt "Not now" / "Map it", "Skip and accept", "Accept with mapping", reject dialog). Return the L512 and NOTIF-T-7 L854 tests to their `HEAD` expectations. Keep every drawer-flow test that is still valid; the row-button → drawer tests become row-button → popup tests.
- **Implements:** CRD-R-10 (amended), CRD-R-11 (amended), CRD-R-4 (amended: the inline block stays), and CRD-R-1 unchanged.
- **Files (expected):** `NI/notification-item.component.{html,ts,scss,spec.ts}`, `NI/notification-item.module.ts`.
- **Depends on:** CRD-T-4
- **Blocks:** CRD-T-5, CRD-T-6
- **Estimate:** M
- **Review:** full (P2-3187 decision path; two flows share `tocInitiative`)
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier (each is a spec case):**
    - row Accept on a bilateral request opens the drawer, or does not set `showTocPromptDialog`;
    - row Decline does not set `showConfirmRejectDialog`;
    - `onDrawerAccept()` or any drawer footer output sets any dialog signal to true;
    - `openDrawer()` leaves a dialog signal true;
    - the popup "Accept with mapping" path sends ≠ 1 PATCH or the owner `initiative_id`;
    - the drawer untouched-bilateral accept no longer sends the inert payload;
    - a ToC-carried row no longer renders the `toc_review` block;
    - `fixture.debugElement.queryAll(By.css('app-pr-dialog')).length !== 3` for a pending bilateral row.
  - **Red run:** the restored popup tests fail against the T-4 state and pass after.
  - **Disqualifier:** if restoring the popups requires changing `acceptOrReject`'s body construction, `buildTocMappingPayload()`, `isTocMappingComplete()` or `invalidateRequest()`, stop.
  - **What the checks cannot prove:** that no popup is ever visible over an open drawer on screen → CRD-T-6.
  - **Consumers:** `received-requests`, `sent-requests`, `updates` (they mount `NotificationItemModule`).
- **Definition of done:**
  - [x] Spec green (`notification-item|contribution-request-drawer|updates.component`); lint clean; `npm run build` passes.
  - [x] Count of `app-pr-dialog` in `NI/.html` = 3; the `toc_review` block is present.
  - [x] Coverage for the touched files stays at or above 50/60/60/60.
- **Status:** [x] PASS on attempt 1, 2026-09-25 (see `execution.md`)

### [x] CRD-T-5 — Docs: folder guides and design deviation

- **Type:** docs
- **Description (amended by the 2026-09-25 pivot):** Update `NI/CLAUDE.md`. Cover the contract; drawer ownership; the **two coexisting flows** (row buttons → popups as before; row body → drawer with its own inline flow; never both visible); the DD-6 close-before-refetch trap and the late-`closed` guard; the deferred hydration on the drawer path only; and re-stamp `Verified:`. and write `CRD/CLAUDE.md` (≤120 lines, per `onecgiar-pr-client/docs/COMPONENT-DOCS.md`). Add a `onecgiar-pr-client/docs/DESIGN-DEVIATIONS.md` entry: the Align section keeps today's mapping controls instead of the mockup's single "Select an indicator" dropdown (proposal OQ-3), plus the inline decline confirmation the mockup lacks (CRD-DD-5). Add one pointer line in `onecgiar-pr-client/src/CLAUDE.md` §3.3 (results-notifications) naming the drawer.
- **Implements:** design CRD-DD-3 consequences, CRD-DD-5; client folder-doc convention.
- **Files (expected):** `NI/CLAUDE.md`, `CRD/CLAUDE.md`, `onecgiar-pr-client/docs/DESIGN-DEVIATIONS.md`, `onecgiar-pr-client/src/CLAUDE.md`.
- **Depends on:** CRD-T-7 (was CRD-T-4 before the pivot)
- **Blocks:** —
- **Estimate:** S
- **Review:** checklist
- **Skills:** `cognitive-doc-design`
- **Verification:**
  - **Falsifier (amended by the pivot):** `NI/CLAUDE.md` does not describe both flows, or claims the popups were removed. `CRD/CLAUDE.md` exceeds 120 lines. No DESIGN-DEVIATIONS entry names CRD-DD-3 and CRD-DD-10.
  - **Red run:** n/a (no test gate).
  - **Disqualifier:** none. Docs follow the code as it stands after T-7.
  - **Consumers:** none (no shared symbol changed).
- **Definition of done:**
  - [x] Both `Verified:` stamps carry the date and branch.
  - [x] No stale claim left (forward grep for removed member names across both folder guides).
- **Status:** [x] PASS on attempt 3, 2026-09-25 (see `execution.md`)

### [x] CRD-T-6 — Real-browser verification (visual and focus)

- **Type:** tests (manual, T6 visual review)
- **Description:** In a real browser, signed in as an **admin** (or with a bilateral request in the open phase; on prtest every pending bilateral request is in closed phase 34), exercise:
  - one ToC-carried request, one bilateral, one legacy;
  - decided and Sent rows.

  Capture screenshots of the drawer for each kind at 1440px and 390px, and compare them against the two user screenshots. Check:
  - 720px width;
  - sticky header/footer with a single body scroll;
  - 3-line clamp and Show more;
  - dash values;
  - ToC widget dropdowns fully visible (CRD-P-5);
  - no overlay visible on top of the drawer on the legacy path;
  - Escape inside an open `pr-select` closes the dropdown first, then the drawer on the next Escape;
  - focus trapped while open and returned to the originating row on close;
  - `prefers-reduced-motion` honoured;
  - the projected Align slot renders inside the sheet portal (document.body), not inline;
  - (pivot) row Accept/Decline still open the old popups, the row body opens the drawer, and a popup and the drawer are never visible together.

  Confirm the served bundle is fresh (`src/CLAUDE.md` / client `CLAUDE.md` §9 traps: inject `token` **and** `user`, and verify with `window.ng.getComponent`). Nothing is decided on real data unless the user agrees (an accept/decline is irreversible).
- **Implements:** defect classes D-6, D-7 (requirements §8); NFR Layout, Accessibility, Motion; CRD-R-9 "focus returns to the row".
- **Files (expected):** screenshots under `docs/specs/changes/contribution-request-drawer/evidence/`.
- **Depends on:** CRD-T-7 (was CRD-T-4 before the pivot)
- **Blocks:** —
- **Estimate:** S
- **Review:** checklist (evidence reviewed at the `/akili-validate` HITL pause)
- **Skills:** `claude-in-chrome` (or `playwright-cli` if installed)
- **Verification:**
  - **Falsifier:** any screenshot shows a dropdown cut by the body edge, a second overlay above the drawer, a panel width ≠ 720px at 1440px, or focus landing on `<body>` after close.
  - **Red run:** n/a (manual).
  - **Disqualifier:** if the served bundle cannot be confirmed fresh, the screenshots are not evidence. Start an own server on a free port (`npm start -- --port 4500`) and retake them; never restart a server someone else owns. If no pending bilateral request is decidable (phase lock, no admin), report that path as **not verified** rather than passing it.
  - **Consumers:** none.
- **Definition of done:**
  - [ ] Screenshots for the three kinds × two widths saved — waived: the user tested manually and approved (2026-09-25).
  - [x] Each checklist item marked pass / fail / not-verified with a reason.
- **Status:** [x] PASS by user HITL, 2026-09-25 (see `execution.md`)

## 4. Dependency graph

```
CRD-T-1 ──► CRD-T-2 ──┐
                      ├──► CRD-T-4 ──► CRD-T-7 (pivot) ──┬──► CRD-T-5
CRD-T-3 ──────────────┘                                  └──► CRD-T-6
```

CRD-T-5 and CRD-T-6 depend on CRD-T-7 after the 2026-09-25 pivot.

Parallel-safe: CRD-T-3 runs alongside CRD-T-1 → CRD-T-2 (different files). CRD-T-5 and CRD-T-6 run in parallel after CRD-T-4 (T-6 is a measurement; it must not overlap with an active delegated agent, per the root concurrency rule).

## 5. Coverage — scenarios and clauses → tasks

| Requirement / clause | Owner task(s) |
|---|---|
| R-1 Pointer open | T-4 |
| R-1 "BUT a click on the row's result link, bilateral result link, Accept or Decline … must NOT also open" | T-4 |
| R-1 Keyboard open + "AND IT MUST expose the row as an interactive control" | T-4 |
| R-1 Rows that do not open (decided, Sent) | T-4 |
| R-2 Non-bilateral sentence (render) / "AND IT MUST use the same requester/responder resolution" | T-2 / T-3 |
| R-2 Bilateral sentence | T-3 (builder), T-2 (render) |
| R-3 Open result / "AND IT MUST close the contribution drawer before a bilateral in-app navigation" | T-2 (output), T-3 / T-3 |
| R-4 Data, several entries | T-3 (builder), T-2 (render) |
| R-4 No review data + "BUT it must NOT hide the section or show an error" | T-3 (dash table), T-2 (render) |
| R-4 Long text clamp | T-2 (class), T-6 (actual truncation) |
| R-5 Section visibility / Not for other kinds | T-4 |
| R-5 Switching planned/unplanned | T-3 |
| R-5 Clear mapping | T-3 (logic), T-4 (button) |
| R-6 Plain bilateral accept | T-3 |
| R-6 With mapping + "BUT it must NOT send a second PATCH, and must NOT open `<app-share-request-modal>`" | T-3, T-4 (rewritten guarantee) |
| R-6 Incomplete + "AND IT MUST stay possible to accept after Clear mapping" | T-3, T-2 (helper) |
| R-6 Legacy + "BUT the two must NOT be visible at the same time" | T-3 (order), T-6 (screen) |
| R-7 Confirm + "BUT no dialog opens on top of the drawer" | T-3 (PATCH), T-2 (footer), T-4 (no dialog) |
| R-7 Cancel | T-2 (output), T-3 (nothing sent) |
| R-8 Busy | T-2 |
| R-8 Blocked | T-3 (reason), T-2 (render) |
| R-8 Outcome + "AND IT MUST NOT stay open after the refetch showing another request" | T-3 |
| R-9 Close without deciding (no PATCH, mapping discarded) / focus returns to row | T-1, T-3 / T-6 |
| R-10 Bilateral row accept / Row decline | T-3 (logic), T-2 (scroll), T-4 (wiring) |
| R-11 No popups + "AND IT MUST keep … never opens `<app-share-request-modal>`" | T-4 |
| NFR Layout / Motion | T-1, T-2, T-6 |
| NFR Accessibility | T-2 (rings, describedby), T-4 (row role), T-6 (trap/restore) |
| NFR Tokens / i18n | T-1, T-2 (grep), T-5 n/a |
| NFR Compatibility (routing by `isP25Request`, payload unchanged) | T-3 |

## 6. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| CRD-TEST-1 | unit (client) | T-1: open/close outputs, projection in portal, width override | `CRD/contribution-request-drawer.component.spec.ts` |
| CRD-TEST-2 | unit (client) | T-2: header, table/dash/multi, footer modes, reason/helper | same file |
| CRD-TEST-3 | unit (client) | T-3: decision table, PATCH spy, close-before-emit, deferred hydration | `NI/notification-item.component.spec.ts` (`describe('CRD — drawer logic')`) |
| CRD-TEST-4 | unit (client) | T-4: row interactivity, no dialogs, rewritten P2-3187 guarantees | same file |
| CRD-TEST-5 | manual / T6 visual | T-6: D-6, D-7 | `evidence/` screenshots |

## 7. Rollout & verification

- [ ] Commit per task only when the user asks (no auto-commit), format `✨ feat(contribution-request-drawer): …`, no apostrophes/`$`/quotes in the subject (Jenkins).
- [ ] CI green (lint, Jest, build, SonarCloud).
- [ ] CRD-T-6 evidence reviewed at the `/akili-validate` HITL pause.

## 8. Cleanup & follow-ups

- [ ] Spec status → `shipped` after merge.
- [ ] Follow-up spec: single "Select an indicator" dropdown + multi-item mapping (proposal OQ-3).
- [ ] Promote "inline confirmation inside drawers" to `docs/ux-ui/design.md` §12 if a second drawer adopts it.

## 9. Roll-back plan

1. Revert the PR(s). No migration, no flag, no data.
2. Nothing downstream to notify (no payload change).

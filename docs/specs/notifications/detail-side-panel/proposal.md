# Proposal — Notification detail as a docked side panel

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `notifications/detail-side-panel` |
| Slug | `detail-side-panel` — derived from free-text argument (screenshots + pasted panel HTML) |
| Type | Change |
| Approval Mode | gated |
| Status | Approved 2026-10-05 (Santiago Sanchez) — single delivery, decisions in §12 |
| Date | 2026-10-05 |
| Author | Santiago Sanchez (with Claude) |
| Depends on | `notifications/inbox-revamp` (row/list redesign, shipped) · `changes/contribution-request-drawer` (the drawer this reuses) |
| Parallel-safe | no — touches `notification-item` and `contribution-request-drawer`, both edited by recent notification specs |
| Related baseline | `docs/ux-ui/design.md` § Breakpoints (`lg` = 1280) and § Patterns ("Drawers become full-screen sheets below `sm`") |

## 2. Intent

On wide screens, clicking a notification opens its detail **in a panel docked to the right of the list**, not over it. On small screens the same content opens in the **drawer that already exists**. Both show the same content in the mockup's style: status chips, the sentence, a result card with a metadata grid, the approval chain, the ToC mapping, and Decline/Accept.

## 3. Problem / Current Behavior

| Today | Why it hurts |
|---|---|
| Every click opens `app-contribution-request-drawer`: a modal `hlm-sheet`, 720 px wide, with a scrim over the list | On a laptop the list disappears. You can't scan the next row while you read the current one. |
| Each `notification-item` row owns its own drawer instance and all decision state (accept/decline, ToC mapping, busy flags) | There is no page-level place to put a docked panel. The row is the only thing that knows how to decide. |
| The drawer shows a header sentence, a RESULT card (code + title only), a metadata grid in `view` mode only, "Where it contributes" tables, and the Align slot | The mockup's layout is different: chips header, RESULT card with an embedded 2-column grid, approval chain, AOW checklist look, compact footer. |
| There is no approval chain anywhere | The data exists (`share_result_request.request_status_id` per program, `submission` rows), but `get/received` only returns the requests addressed to the viewer's own programs — the other programs' statuses on the same result never reach the client. A read endpoint grouping them per result is needed. |

## 4. Proposed Outcome

| Viewport | Behavior |
|---|---|
| **≥ 1280 px (`lg`)** | The list narrows and a sticky panel (380 px wide at `lg`, 440 px at `xl` ≥ 1600, `top: 24px`, `height: calc(100vh - 140px)`, rounded 12 px, bordered, no shadow) docks on the right. Clicking another row swaps its content. ✕ closes it and the list goes back to full width. No scrim, no focus trap, and the page stays interactive. |
| **< 1280 px** | Today's `hlm-sheet` drawer, with the same new content. Below `sm` it is full-screen, as it already is. |
| **Resize across 1280 px while open** | The open notification moves between the two containers. Its in-progress state (mode, ToC selection) is kept. |

Panel anatomy, top to bottom (from the mockup):

1. **Header:** title (request kind, e.g. "Contribution request") and a ✕ button.
2. **Chips row:** status pill ("Needs your decision" / "For your information"), funding outline pill (W1/W2 · W3/Bilateral), `·`, result type, date.
3. **Sentence:** the same text parts the row uses, with mono codes and a linked result.
4. **RESULT card** (subtle surface): linked `code - title`, then a 2-column grid with Reporting center, Result type, Primary Science Program, Contributing programs, Submitted by, Phase. A missing value shows a muted `–`.
5. **APPROVAL CHAIN:** program submission, then one step per program (primary + contributors). Each step has a ✓ / ring icon, the code and name, a "Your program" marker, who acted and when, and a status pill (Submitted / Accepted / Awaiting decision / Declined). Lazy-loaded on open from a new read endpoint (§11).
6. **MAP TO YOUR THEORY OF CHANGE:** the existing Align/ToC mapping, restyled as the mockup's checklist rows. The logic and the save path stay the same.
7. **Sticky footer:** Decline (outline) and the kind-aware Accept label (brand), plus the existing confirm-decline, blocked-reason and helper states.

## 5. Scope

- Client: `results-notifications.component.*` (page layout and the panel outlet), `notification-item` (where it renders its detail), `contribution-request-drawer` (split it into a shared panel body and a sheet shell), plus copy and specs.
- Restyle the panel content to the mockup, using **project tokens** (`--pr-*`, `ink-*`, `surface-*`) mapped from the mockup's `--surface/--text-N/--st-*`. No new palette.
- Spartan/Helm primitives only (badge, button, checkbox, sheet), per the "Visual changes use Spartan" rule.
- Server: one new read endpoint for the approval chain of a result (existing tables, no migration expected).

## 6. Non-Goals

- No change to Accept/Decline business logic, the ToC mapping save flow, or the shapes of existing endpoints (the chain is a new, additive read endpoint).
- No change to the row's own Accept/Decline popups (CRD-DD-10 still holds: the row buttons and the panel are two coexisting entry points).
- No list redesign (tabs, filters and grouping stay as `inbox-revamp` shipped them).
- No header-bell popup changes.
- No new AOW selector. The checklist look wraps the existing ToC mapping control. If it can't be reskinned without touching its logic, it keeps its current UI inside the new section frame.

## 7. Affected Users, Systems, And Specs

| Area | Path | Change |
|---|---|---|
| Page | `onecgiar-pr-client/.../results-notifications/results-notifications.component.{html,ts,scss}` | 2-column layout at `lg`+ and a `cdkPortalOutlet` host for the docked panel |
| Row | `.../components/notification-item/` | Renders its detail through one shared template into either the sheet or the page outlet. Clears it on destroy. |
| Drawer | `.../components/contribution-request-drawer/` | Body extracted into a presentational `notification-detail-panel` (shared). The sheet becomes a thin shell around it. |
| New coordinator | `notification-detail-panel.service.ts` (page-scoped) | Signal: active row id + portal. Guarantees only one row is open at a time. |
| Copy | `internationalization/contribution-request-drawer.copy.ts` | Section labels: APPROVAL CHAIN, MAP TO YOUR THEORY OF CHANGE, chain step statuses |
| Server | `api/results/share-result-request/` | New read endpoint: the approval chain for one result |
| Specs touched | `changes/contribution-request-drawer`, `notifications/inbox-revamp`, `notifications/bilateral-primary-sp-request` | Their drawer requirements (CRD-R-*, NOTIF-R-*, PSR-R-11) still hold. The container changes, not the contract. |

## 8. Visual Reference

- Source: user screenshots + pasted DOM of the reference panel.
- Location: `docs/specs/notifications/detail-side-panel/mockup/inbox-with-docked-panel.png` (full page, docked panel on the right) · `mockup/docked-panel-detail.png` (panel close-up).
- Notes: the pasted HTML gives exact metrics: header padding `14px 20px 0`, chips row `8px 20px 14px` with bottom divider, body padding `20px` with `gap: 20px`, RESULT card radius `10px` padding `16px`, grid `1fr 1fr` gap `14px 20px`, section labels `11px/600/uppercase/0.08em`, chain step icon `18px`, checklist rows `min-height: 36px`, footer `14px 20px` with top divider, buttons `min-height: 36px`. `/akili-specify` turns these into the design-token table.

## 9. Requirement Delta Preview

### ADDED Requirements

- At ≥ 1280 px, opening a notification shows its detail in a non-modal panel docked beside the list. The list stays visible and interactive.
- Only one notification detail is open at a time. Opening another row replaces the panel content.
- A resize across 1280 px while the panel is open keeps the same notification and its in-progress state.
- Header chips row: status, funding window, result type, date.
- RESULT card with an embedded metadata grid (6 fields, muted `–` when missing).
- An approval chain listing the submission and every program's decision state, marking the viewer's program.

### MODIFIED Requirements

- CRD panel container: modal sheet → docked panel at `lg`+. The sheet stays as-is below `lg`.
- `view`-mode metadata grid (NOTIF-T-4): moves into the RESULT card with all 6 fields always present. Fields are expected to be filled; the muted `–` (as in the mockup's Reporting center) is only a defensive fallback for genuinely not-applicable values (e.g. no reporting center on a W1/W2 result). Supersedes NOTIF-R-5/AC-7 for the card grid — approved 2026-10-05.
- Align slot: restyled as the checklist section "MAP TO YOUR THEORY OF CHANGE".
- Footer: the same states, restyled to the mockup's compact sticky footer.

### REMOVED Requirements

- None. "Where it contributes" tables are kept (decision Q3), placed after the approval chain, before the ToC section.

## 10. Approach Options

| | Option | Trade-off |
|---|---|---|
| A | **Lift state to the page.** One page-level panel component. Rows just emit "selected", and the page owns accept/decline, ToC mapping and busy state. | Cleanest end state, but it rewrites the decision logic out of a 1,333-line component with a 3,854-line spec. High regression risk on flows that just shipped (PSR, BCT, W1W2). |
| **B** | **Portal the row's detail.** Extract the drawer body into a presentational `notification-detail-panel`. The row keeps all its state and renders one `<ng-template>` either inside `hlm-sheet` (< `lg`) or, through a page-scoped service, into a `cdkPortalOutlet` in the page's right column (≥ `lg`). `BreakpointObserver('(min-width: 1280px)')` picks the target. | The decision logic doesn't move. Change detection and bindings stay in the row's context. Risks: a row destroyed by a filter, tab switch or pagination must clear the outlet, and focus management for a non-modal panel is new. |
| C | **CSS-only.** Make `hlm-sheet` non-modal and position it inline. | Not viable. The Spartan sheet is a CDK Dialog overlay (portal + scrim + focus trap), so it can't take part in the page's flex layout. |

## 11. Recommended Approach

**Option B, delivered as one spec** (user decision 2026-10-05: everything ships together).

| Layer | Content |
|---|---|
| Client | Docked panel + drawer share one body; mockup restyle of header/chips, sentence, RESULT card + grid, approval chain, "Where it contributes", ToC section, footer. |
| Server | New read endpoint under `api/results/request/` returning, for one result: the submission (who, when) and every active `share_result_request` on it (program code/name, role primary/contributor, `request_status_id`, actor, date). The panel lazy-loads it on open. |

Why B: smallest safe path — the accept/decline state stays in the row, the drawer's presentational contract is reused.

## 12. Risks, Dependencies, And Decisions

| # | Item | Note |
|---|---|---|
| R1 | Row destroyed while docked (filter, Received↔Sent, tab change, "load more") | The service clears the outlet in the row's `ngOnDestroy`; the panel closes. |
| R2 | Non-modal panel accessibility | No focus trap. Focus the panel heading on open, return it to the row on close; Escape closes only when focus is inside. CRD-P-3 changes for `lg`+. |
| R3 | Spec churn | `notification-item.component.spec.ts` (3.8k lines) asserts on drawer inputs; keep input names on the shell. Run affected specs before commit. |
| R4 | Sticky height `calc(100vh - 140px)` | Verify against the real top bar. |
| R5 | Chain endpoint permissions | Must only return chains for results the viewer can see (same role gate as `get/received`). |
| R6 | Chain after a decision | After Accept/Decline the chain must refresh. **Resolved by pivot DSP-T-2 (2026-10-05):** the panel closes on decision (`CRD-R-8`); the next open fetches a fresh chain. |
| D1 | Approval chain | **In scope, same delivery.** |
| D2 | Missing values | All fields expected; muted `–` only as defensive fallback for not-applicable values. |
| D3 | "Where it contributes" | **Kept**, below the approval chain. |
| D4 | Panel width | 380 px at `lg` (1280–1599), 440 px at `xl` (≥ 1600). Recommended by Claude, user deferred. |

## 13. Success Criteria

- The approval chain shows the submission and every program's real status for the result, marks "Your program", and refreshes after a decision.
- At 1440 px: clicking a row docks the panel and the list stays visible and clickable. Clicking a second row swaps the content. ✕ restores full width.
- At 1024 px and 390 px: the same content opens in the existing drawer (full-screen below 600).
- Accept/Decline from the panel behaves identically to today's drawer, including confirm-decline, blocked reason, busy spinners, kind-aware label, and ToC mapping for bilateral rows.
- Visual parity with `mockup/docked-panel-detail.png` using project tokens, verified in light mode.
- Affected Jest specs green with `--maxWorkers=2 --testPathPattern` scoped to the notification components.

## 14. Next Step

```text
/akili-specify notifications/detail-side-panel
```



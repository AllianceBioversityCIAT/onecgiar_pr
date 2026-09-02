# Design — Unmount the leftover floating footer on Result Detail

**How:** delete `/result/result-detail/` from the site footer’s route allow-list so the footer and its 400px hover trap do not mount on that URL. Do not leave the entry with `floating` off — an in-flow footer under a viewport-locked page is a second defect. No new tokens, no action-strip redesign.

Links: `requirements.md` (FOVL-R-1 / R-2 / R-3). Proposal Option A. Baseline: `docs/prd.md` US-S1 / US-S5 · `docs/ux-ui/design.md` §9–10 · `docs/trd/trd.md` W1 · `result-detail/CLAUDE.md` layout contract.

## 1. Summary

Result Detail already owns the viewport floor (`section-bottom-bar`). The floating CGIAR footer on that route is leftover from the old Save FAB. This design removes that route from the footer allow-list. Trade-off: Contact Us / legal links leave this page; they stay on Results list and every other listed route (FOVL-R-3).

## 2. Architecture Overview

### 2.1 Where this lives in the system

| Layer | Touched? |
|---|---|
| Server | No |
| Client | `shared/components/footer` (allow-list + spec). Result Detail layout is unchanged. |
| External | Tawk unchanged unless HITL shows a new clip after the footer is gone |

### 2.2 Sequence / interaction diagram

```
User opens /result/result-detail/:id
  └── app-footer.showIfRouteIsInList()
        ├── URL matches a remaining listed path → mount footer (unchanged)
        └── URL is Result Detail (no longer listed) → do not mount
              └── action strip stays the only floor chrome
```

## 3. Data Model Changes

### 3.1 Entities

None.

### 3.2 Migrations

None.

### 3.3 CLARISA / external-data implications

None.

## 4. API Surface

### 4.1 New / changed endpoints

None.

### 4.2 Bilateral / platform-report impact

None.

## 5. Server Workflow / Business Rules

None. Client chrome only. `W1` is the user flow that stays unblocked (save / next section).

## 6. Frontend Plan

### 6.1 Routes / modules

No router table change. Only the **footer’s own allow-list** (the array `FooterComponent` walks with `router.url.includes`). Result Detail URLs stop matching that list.

### 6.2 Components & services

| Piece | Change |
|---|---|
| `footer.component.ts` | Remove the Result Detail allow-list entry. Keep every other entry. |
| `footer.component.html` | No markup change. The existing `*ngIf="showIfRouteIsInList()"` and the hover-trap `*ngIf="isFloating"` both stay false on this URL. |
| `footer.component.scss` | No change in the happy path. Touch only if HITL still sees a leftover overlay after the route is gone. |
| `section-bottom-bar` | No change in the happy path. A wrap / padding tweak is allowed only if HITL shows a control still clipped after the footer is gone — same spec, not a second change. |
| Tawk | No change unless that HITL clip is the chat bubble (`yOffset: 130` already shipped). |

State: none. `showIfRouteIsInList` already derives mount from URL + allow-list.

### 6.3 Design system usage

No new tokens, components, or copy. The visual target is the **existing** wide-screen strip (`visual/wide-action-bar-correct.jpg`): same buttons, same order, same `--pr-*` colors already on the strip. Responsive rule: restore that strip from `md` (900px) up (`docs/ux-ui/design.md` §9). No `xs`/`sm` Result Detail layout. A11y: uncovering the strip restores Tab order to Save draft (`docs/ux-ui/design.md` §10). No new i18n keys.

### 6.4 Real-time / notification UX

Not applicable.

## 7. Security & Authorization

No auth, input, or secret surface. `AC-9` still applies (do not log tokens while debugging).

## 8. Performance & Capacity

Negligible — one fewer overlay on Result Detail.

## 9. Observability

None. Do not add logs for a mount-list change.

## 10. Testing Plan (forward-looking)

| Class | Harness | What it proves |
|---|---|---|
| Footer gone on Result Detail (FOVL-R-1, FOVL-AC-1) | Jest `footer.component.spec.ts` | With `router.url` containing `/result/result-detail/` (and a typical section suffix), `showIfRouteIsInList()` is false; `.footer` and `.footer-blocker` are absent. **Mandatory regression: red on current code, green after the allow-list edit.** |
| Other routes unchanged (FOVL-R-3, FOVL-AC-3) | Same spec | Results list still mounts; a floating-listed path (e.g. Type-One Report) still sets `isFloating`. |
| Strip still present | Existing `section-bottom-bar` specs | Testids unchanged. |
| Strip unobstructed (FOVL-R-2, FOVL-AC-2) | **HITL**, not Jest | jsdom cannot measure stacking or click hit-testing. Compare `md` and ~1100px against `visual/wide-action-bar-correct.jpg`; click Back / Next / Sync / Save draft. T6 only if that screenshot is disputed. |

A passing Jest run that only checks the allow-list is **not** evidence the strip is unobstructed.

## 11. Backwards Compatibility & Migration Plan

- No migration, flag, or payload change.
- Footer contract on every remaining listed route is unchanged.
- Result Detail loses in-page legal / Contact Us. Users reach them from Results list or any other listed page. No backfill.

## 12. Design Decisions (ADRs)

### FOVL-DD-1 — Delete the Result Detail allow-list entry (do not set `floating: false`)

- **Context:** `showIfRouteIsInList` mounts the footer whenever the URL matches an entry. Result Detail is viewport-locked; an in-flow footer cannot sit under the form and would appear as a second, scroll-trapped bar.
- **Decision:** Remove the `/result/result-detail/` entry entirely so the footer does not mount (FOVL-R-1).
- **Alternatives considered:**
  1. Keep the entry, `floating: false` — rejected: in-flow footer under a locked page.
  2. Option B (tiny handle + raise strip z-index) — rejected: two-layer chrome, easy to regress; legal links remain on other routes.
  3. Only restyle the strip (`flex-nowrap`) — rejected: does not stop a higher-z overlay.
- **Consequences:** No Contact Us / Terms on the Result Detail URL. Accepted (FOVL-OQ-1).
- **Reversion challenge (Step 2.3):** *What does removing this break?* The shipped hover-to-reveal footer on Result Detail goes away. That is the defect surface, not a protected feature. Concrete loss: in-page legal / Contact Us on that URL. Already addressed by FOVL-R-3 (other routes keep the footer) and the shell Contact Us dialog, which remains reachable from any page that still shows the footer. Existing footer specs mock generic paths; none assert that Result Detail must float. No unaddressed breakage.

### FOVL-DD-2 — Jest owns mount; HITL owns “unobstructed”

- **Context:** The dominant user-visible class is overlay / hit-testing. jsdom cannot see it.
- **Decision:** The red/green regression is the allow-list / DOM-absence test. FOVL-R-2 is gated by a HITL visual at `md` and ~1100px against the wide fixture.
- **Alternatives considered:** Cypress E2E for overlap — rejected for Lite; no CI Cypress workflow, and the mount test already locks the cause. Pixel screenshot CI — rejected: no such gate in this repo.
- **Consequences:** A green Jest run can still hide a Tawk clip. Execute must not close FOVL-R-2 without the HITL note.

## 13. Open Gaps & Follow-ups

- Tawk clip after footer removal: observe in HITL; do not pre-emptively retune `yOffset`.
- Legal-link handle on Result Detail (proposal Option B): deferred, not in this spec.
- Phone (`xs`/`sm`) Result Detail layout: out of scope (`docs/ux-ui/design.md` §9).

## 14. Budget (Step 2.4)

| Signal | Estimate |
|---|---|
| Expected tasks | **2** — (1) red regression on current allow-list, (2) remove entry + green + HITL |
| Expected LOC | **~40** (one allow-list line + ~25–35 spec lines; SCSS only if HITL forces it) |
| Expected review rounds | **1** |

Depth **Lite** matches this budget. Tripwire for `/akili-execute`: more than 2 tasks, ~80 LOC, or a second review round → stop and ask before growing the spec.

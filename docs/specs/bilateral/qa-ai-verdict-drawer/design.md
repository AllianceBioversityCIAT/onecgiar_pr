# Design — QA AI verdict drawer (W3/Bilateral)

## Document Control

| Field | Value |
|---|---|
| Module | `bilateral` · `qa-ai-verdict-drawer` · code **`BIL-QAD`** |
| Depth | **Standard** — re-checked against the finished design (§14 Budget), not left as the Phase 0 guess |
| Status | **approved** — owner approval 2026-09-18 (verbal, at `/akili-execute`) |
| Requirements | `requirements.md` (this folder) — `BIL-QAD-R-1` … `R-11` |
| Date | 2026-09-18 |
| Skills applied | `ui-ux-pro-max` — used for its **UX/a11y rule lookups only**. Its `--design-system` generator was deliberately **not** run: it produces a new visual identity, and this spec's whole constraint is that the identity is already owned by `docs/ux-ui/design.md` DD-12 and the in-repo drawer pattern |
| Baseline | `docs/ux-ui/design.md` §6, §7, §9, §10, DD-12 · `docs/trd/trd.md` W1, W8 |

## 1. Summary

Replace the component's **shell** and **layout**, keep its **logic** and **contract**.

`BilateralQualityAssessmentDialogComponent` stops rendering into `app-pr-dialog` and renders its own scrim + right-anchored `<aside>`, copying the shell mechanics of `bilateral-create-drawer`. Its inputs, outputs, computed signals and state machine are untouched. The body markup is re-laid-out into the reference's visual language without a single content change.

**What does not change:** the service, the API, the contract, the state machine, the component's public surface, every copy string.

## 2. Architecture Overview

### 2.1 Where this lives in the system

One leaf component in the Angular client. Nothing above or below it moves.

```
bilateral-result-creator.component.html:44
  └── <app-bilateral-quality-assessment-dialog>      ← same bindings, same events
        ├── [scrim]            ← NEW (was app-pr-dialog's mask)
        └── <aside role=dialog>← NEW (was app-pr-dialog's panel)
              ├── header  (fixed)   ← re-laid-out
              ├── body    (scrolls) ← re-laid-out, content identical
              └── footer  (fixed)   ← re-laid-out

BilateralQualityAssessmentUiService   ← UNTOUCHED (read-only consumer)
PrDialogComponent                     ← no longer imported by this component
```

### 2.2 Interaction

Unchanged from the parent spec. The drawer is a passive renderer of `state()`:

| Service state | Drawer renders | Exits |
|---|---|---|
| `assessing` | Running view: progress bar, legend, tip | **none** — no ✕, no scrim-close, no Escape, no footer |
| `deciding` | Verdict view: overall, sections, evidence | ✕ / scrim / Escape → `dismissed`; footer → `decisionChosen` |
| `submitting` | Verdict view, footer busy | **none** |

## 3. Data Model Changes

**None.** No entity, no migration, no CLARISA implication. Recorded explicitly so the absence is deliberate.

## 4. API Surface

**None.** No new or changed endpoint. `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` is not touched — no payload change, therefore no change-log row.

## 5. Server Workflow / Business Rules

**None.** This spec does not open the server.

## 6. Frontend Plan

### 6.1 Routes / modules

No route change. No module registration change — the component is already standalone and already imported by the creator.

### 6.2 Components & services

| File | Change |
|---|---|
| `…-dialog.component.ts` | Add shell mechanics; **keep** every existing input, output, computed and the tip effect |
| `…-dialog.component.html` | New shell wrapper; body re-laid-out; content nodes preserved 1:1 |
| `…-dialog.component.scss` | Delete all four `app-pr-dialog` `::ng-deep` overrides (lines 1, 10, 20, 108); add `:host` box setup and `@keyframes` only |
| `…-dialog.component.spec.ts` | Retarget 2 footer selectors; add shell + parity assertions |

**Component contract — frozen (`BIL-QAD` NFR *Backwards compatibility*):** `assessment`, `visible`, `running`, `submitting` in; `dismissed`, `sectionSelected`, `decisionChosen` out. The creator's template bindings do not change.

**Naming.** The class and selector keep their names. Renaming `…-dialog` to `…-drawer` would touch the creator template, the spec file and the folder for zero behavioural gain, and would break the `@akili-spec` trail back to `bilateral/qa-ai-traffic-light`. The file names stay; §13 records the cosmetic mismatch as accepted.

### 6.3 Shell mechanics — copied, not shared

Per the owner's scope decision, `bilateral-create-drawer` is the **pattern source**, not a dependency. Four mechanics are reimplemented locally:

| Mechanic | Implementation | Requirement |
|---|---|---|
| Scrim | Fixed inset-0 backdrop below the panel in z-order, click → `requestClose()` | `R-1`, `R-3` |
| Escape | Host listener, **guarded on `running() ‖ submitting()`** | `R-3`, `R-4` |
| Focus return | `restoreFocusTarget`-style: capture the active element on open, refocus on close | `R-6` |
| Body scroll lock | **Save-and-restore the previous value**, never blank-and-reset — see `BIL-QAD-DD-3` | `R-6` |

### 6.4 Layout contract

Three rows, the middle one the only scroller. This is what makes `R-5` structural rather than patched:

| Row | Behaviour |
|---|---|
| Header | `shrink-0`. Verdict icon + title + ✕ (✕ suppressed while running/submitting) |
| Body | `flex-1 min-h-0 overflow-y-auto overscroll-contain`. The `min-h-0` is load-bearing: a flex child will not shrink below its content without it, and the body would never scroll |
| Footer | `shrink-0`. Absent entirely while `running()`; present but fully inert (all actions disabled, primary button busy) while `submitting()` — see the 2026-09-18 amendment to `BIL-QAD-R-4` |

Geometry (`R-7`, `R-9`): `≥640px` → 760px default, drag 520–900px. `<640px` → `100vw`, no drag affordance.

### 6.5 Visual language mapping

Every row is a **re-treatment of an existing node**. Nothing in the right column is new content:

| Reference treatment | Applied to |
|---|---|
| Fixed header, title + ✕ | The existing `title()` computed and its verdict icon |
| Uppercase grey eyebrow above a group | The existing `<h3>` group headings: *What the colours mean*, *By section*, *Evidence* |
| Card with title left, status chip top-right | The existing `<article class="bqa-dialog__section">` — it already puts the verdict pill at the row's right |
| Labelled sub-block inside a card | The existing *What to address* / *What is working well* blocks |
| Fixed footer, actions right | The existing **Make adjustments** + **Submit for review** |
| Header subtitle | **Left empty** — PRMS has no equivalent field (`R-8`) |
| Footer left status line | **Left empty** — same reason |
| Per-field suggestion / accept / counter | **Not built** — out of scope |

Tokens: the verdict colours ship already (`data-verdict` attribute selectors for green/amber/red/grey). **They are reused verbatim, not re-picked** — that is the mitigation for defect class D-7, which has no automated contrast gate.

### 6.6 Motion

Enter: horizontal transform, **ease-out**, 180–220ms (`ui-ux-pro-max`: ease-out for entering, 150–300ms for micro-interactions). The indeterminate progress bar keeps its infinite animation — the one legitimate use of continuous motion is a loading indicator. All of it collapses under `prefers-reduced-motion: reduce` (`R-10`).

### 6.7 Accessibility

| Rule | Applied |
|---|---|
| `role="dialog"` + `aria-modal="true"` + accessible name | On the `<aside>` (`R-6`) |
| Focus trap + return | `R-6` |
| Visible focus rings | `focus-visible:ring-2` on ✕, footer buttons, section triggers — never `outline-none` without a replacement (`ui-ux-pro-max`: Critical) |
| `aria-live` on async status | **Already present** — `role="status"` on the running block, `aria-live="polite"` on the tip. Preserved, not re-added |
| `aria-expanded` / `aria-controls` / `inert` | **Already present** on the feedback triggers and panels. Preserved |
| Icon-only button needs a name | ✕ gets `aria-label` |
| Touch targets ≥ 44px | Footer actions and ✕ at phone width (`R-7`) |

## 7. Security & Authorization

Untouched. This layer never sees the payload, issues no request and writes no log. AC-9 / W8 hold by construction.

## 8. Performance & Capacity

No new HTTP call, subscription or timer. The existing 5 s tip interval keeps its `onCleanup(clearInterval)`. Motion uses `transform`/`opacity` only, never `width`/`height`.

## 9. Observability

**None added.** No logging exists in this component and none is introduced.

## 10. Testing Plan

Mapped to the defect classes in `requirements.md` §9 — including, deliberately, what the automated gate **cannot** reach.

| Gate | Covers | Command |
|---|---|---|
| Component spec — parity | D-1 (`R-2` inventory, state by state) | `npx jest --silent --reporters=summary --no-coverage --testPathPattern="bilateral-quality-assessment"` |
| Component spec — behaviour | D-2 (`R-3`, `R-4`), D-6 (scroll-lock restore) | same |
| **Browser pass, manual** | **D-3** (fixed chrome at 5 sections), **D-5** (focus trap) | Real browser; a task done-criterion, not a suggestion |
| **Screenshots 1440/1024/375** | **D-4** (visual) | Owner review at the HITL pause, or T6 Multimodal |
| Lint | style/type drift | `npx ng lint --quiet` |

**jsdom cannot measure layout.** Every element reports 0×0, so no `jest` assertion in this repo can prove a footer stayed fixed or a panel came into view. The manual gates above are not belt-and-braces — for D-3 and D-5 they are the *only* gate, and `requirements.md` §9 records D-4 and D-7 as accepted risks with no gate at all.

## 11. Backwards Compatibility & Migration Plan

| Concern | Handling |
|---|---|
| Component public surface | Frozen. No consumer change beyond an optional element rename |
| Server / payload / contract | Untouched |
| Rollback | Revert the commit. The component is a leaf with one consumer and no persisted state |
| Feature flag | Not warranted — presentation-only, instantly revertible |

## 12. Design Decisions

### `BIL-QAD-DD-1` — Own shell instead of `app-pr-dialog`

**Decision.** The component renders its own scrim and `<aside>`.

**Why.** `app-pr-dialog` centres a box that scrolls as a whole. Every friction point in the current file traces to fighting that: four `::ng-deep` overrides to pin the panel, body, mask and footer, and a manual `scrollIntoView` rescue because panels open below a short box's fold. A drawer makes `R-5` structural.

**Rejected:** extending `app-pr-dialog` with a `position="right"` mode — it would put a shared dialog used across the app under test for one screen's benefit.

### `BIL-QAD-DD-2` — Copy `bilateral-create-drawer`, do not extract `pr-drawer`

**Decision.** Reimplement the four shell mechanics locally.

**Why.** Owner decision, 2026-09-18. Extraction would put three production drawers back under test for a presentation change.

**Cost, recorded not hidden:** this is the **fourth** hand-rolled shell. `bilateral-create-drawer/CLAUDE.md` already lists the `shared/components/pr-drawer` extraction as pending; a task updates that note to count a fourth consumer.

### `BIL-QAD-DD-3` — Save-and-restore the body scroll lock *(reversion challenge — Step 2.3)*

**Reversion.** Dropping `app-pr-dialog` drops its **ref-counted** body-scroll lock, which correctly handles two overlays open at once.

**Challenge — "what does removing this break?"** A naive replacement that sets `overflow:'hidden'` on open and `overflow:''` on close **unlocks the page while another dialog is still open**, if any `app-pr-dialog` is mounted over the creator at the same time. The naive version is a real regression, not a theoretical one.

**Resolution.** Do what `bilateral-create-drawer` does: capture `document.body.style.overflow` **on open** and restore *that captured value* on destroy. If a `pr-dialog` had already set `hidden`, the drawer restores `hidden` and the lock survives. This composes correctly with the ref-counted lock without sharing it.

**Locked by:** a spec assertion that the previous value — not the empty string — is restored (defect class D-6).

### `BIL-QAD-DD-4` — The scroll rescue is re-measured, not deleted *(reversion challenge — Step 2.3)*

**Reversion.** `toggleSection()`'s `afterNextRender` + `transitionend` + `scrollIntoView` was written for a short centred box and looks redundant on a full-height drawer.

**Challenge.** It may still be needed for the **last** card in a long list, whose expanded panel can still open below the body scroller's fold. Deleting it unverified reproduces the exact defect it was written for — a click that appears to do nothing.

**Resolution.** Keep it. Remove it only after `BIL-QAD-AC-5` is verified in a real browser **without** it (`R-11` already gates this as MAY). The default is to keep.

### `BIL-QAD-DD-5` — Keep the component's name

**Decision.** Class, selector and file names stay `…-dialog`.

**Why.** A rename touches the creator template, the spec file and the folder for zero behavioural gain, and breaks the `@akili-spec` trail to the parent spec. The cosmetic mismatch is accepted and recorded in §13.

### `BIL-QAD-DD-6` — Reuse the verdict colour tokens verbatim

**Decision.** No colour is re-picked; the shipped `data-verdict` palette carries over unchanged.

**Why.** Defect class D-7 (contrast) has **no automated gate** in this repo. Reusing already-shipped, already-reviewed values is the only mitigation available that does not depend on a check that does not exist.

## 13. Open Gaps & Follow-ups

| Item | Disposition |
|---|---|
| Component named `…-dialog` while rendering a drawer | Accepted (`DD-5`) |
| Fourth hand-rolled drawer shell | Debt recorded in `bilateral-create-drawer/CLAUDE.md` (`DD-2`) |
| D-4 (visual) and D-7 (contrast) have no automated gate | Accepted risks, recorded in `requirements.md` §9 |
| `BIL-QAD-OQ-1` — ticket placement | Open, administrative; resolve before the commit |
| 8 remaining `progress_activity` icon uses | Out of scope; belongs on the ticket that surfaced it |

## 14. Budget *(Step 2.4 — the tripwire `/akili-execute` compares against)*

| Metric | Expected |
|---|---|
| **Tasks** | **5** |
| **LOC** | **~400** (net; a large share is markup moved rather than added) |
| **Review rounds** | **1–2** |

**Sizing verdict: `Standard` is correct, and confirmed by the finished design rather than assumed.** It is not `Lite` — five tasks, a focus trap, a responsive contract and two reversion challenges are past a copy tweak. It is not `Full` — no data, API, auth, migration or rollout surface exists to reason about, and §3, §4, §5 and §9 are all legitimately empty.

Exceeding this budget is **information, not failure**: if execution runs past ~400 LOC or a third review round, the Leader stops and escalates rather than continuing. The most likely overrun is the body re-layout (`T-2`) — if content parity starts requiring logic changes, the premise "design only" is wrong and the user should hear that immediately.

## Required cross-references

- `docs/ux-ui/design.md` — §6 *Drawers and modals* (the rule this restores), §7 + DD-12, §9, §10
- `docs/trd/trd.md` — W1, W8
- `requirements.md` — `BIL-QAD-R-1` … `R-11`, §9 defect classes
- Parent spec — `docs/specs/bilateral/qa-ai-traffic-light/design.md`
- Pattern source — `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-create-drawer/`

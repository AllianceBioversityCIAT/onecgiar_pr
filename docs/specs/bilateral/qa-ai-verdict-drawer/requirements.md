# Requirements — QA AI verdict drawer (W3/Bilateral)

## Document Control

| Field | Value |
|---|---|
| Module | `bilateral` · sub-feature `qa-ai-verdict-drawer` · module code **`BIL-QAD`** |
| Spec path | `docs/specs/bilateral/qa-ai-verdict-drawer/` |
| Depth | **Standard** — a shell replacement with focus, responsive and a11y surface. Not Lite: this is not a copy tweak. Not Full: no data, API, auth or migration work. |
| Type | **Change** (presentation-only) |
| Approval Mode | **gated** |
| Status | **approved** — owner approval 2026-09-18 (verbal, at `/akili-execute`) |
| Owner | Juan David Delgado |
| Date | 2026-09-18 |
| Ticket(s) | TBD — see `BIL-QAD-OQ-1`. Follows [P2-3698](https://cgiarmel.atlassian.net/browse/P2-3698) (Done) under [P2-3150](https://cgiarmel.atlassian.net/browse/P2-3150) (Ready For UAT), epic [P2-3482](https://cgiarmel.atlassian.net/browse/P2-3482) |
| Proposal | `proposal.md` (this folder) — approved intent, 2026-09-18 |
| Parent spec | **`bilateral/qa-ai-traffic-light`** — this amends the *presentation* of `BIL-QAI-R-4` and `BIL-QAI-R-10`; every behavioural clause of both is restated here unchanged |
| Baseline | `docs/prd.md` — **US-S1**, **US-S4** (submitter iterates before submitting), **AC-9** · `docs/ux-ui/design.md` — **§6 *Drawers and modals*** (the rule restored), §7 tokens + **DD-12**, §8 component rules, **§9** breakpoints, **§10** a11y · `docs/trd/trd.md` — **W1**, **W8** |
| Visual reference | `mockup/reference-ai-review-drawer.png` — visual language only; its feature set is explicitly out of scope |

---

## 2. Executive Summary

The bilateral AI quality verdict currently renders in a centred modal (`app-pr-dialog`). `docs/ux-ui/design.md` §6 assigns that surface to confirm/destroy dialogs and assigns **drawers** to *"stateful side-by-side review/edit (**QA review**, …)"*. This spec moves the verdict to a right-side drawer over a scrim, in the visual language of the supplied reference, **changing no content and no behaviour**.

The single hardest requirement to verify is the one that matters most: **content parity**. Everything the modal showed, the drawer shows, with the same words. Everything the modal did, the drawer does.

## 3. Glossary

| Term | Meaning |
|---|---|
| **Verdict surface** | The one overlay that carries the whole submit flow: `assessing → deciding → submitting` |
| **Scrim** | The dimming backdrop that blocks the form behind the drawer |
| **Running** | `BilateralQualityAssessmentUiService.isRunning()` — the AI call is in flight |
| **Submitting** | `isSubmitting()` — the submit PATCH is in flight |
| **Stale** | `assessment.is_current === false` — saved content changed since the verdict was produced |
| **Content parity** | Every field, label, copy string and control present before this change is present after it, with identical text |

## 4. System Context & Scope

### Context

One Angular component on one screen. Flow F1 step 6–7 (`docs/ux-ui/design.md`), surface `/bilateral/:center/result/:code`. No server, no contract, no persistence, no external dependency.

**Surfaces touched:** `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-quality-assessment-dialog/` (4 files) and at most one line of `bilateral-result-creator.component.html`.

### In scope

- The verdict surface becomes a right-side drawer over a scrim, full viewport height, with the geometry and shell mechanics of `bilateral-create-drawer`.
- Re-layout of the existing content into the reference's visual language: eyebrow-grouped sections, card-per-item with a status chip top-right, fixed header and fixed footer.
- Accessibility parity or better: labelled `role="dialog"` + `aria-modal="true"`, focus trap, focus return to the opener.
- Responsive behaviour across `docs/ux-ui/design.md` §9 breakpoints.

### Out of scope

- The AI flow: endpoints, contract, polling window, `bilateral_quality_assessments`, the mandatory `{assessment_id, decision}` submit body, verdict derivation. **Reviewed and found sound** (`proposal.md` § *Flow review*).
- Any copy, field or metadata change.
- A non-blocking side-by-side drawer (owner decision, 2026-09-18).
- Extracting `shared/components/pr-drawer` or migrating the other three drawers (owner decision, 2026-09-18).
- The reference image's own feature set: per-field *AI suggestion / Your version / Keep my version / Applied*, the reviewed counter, *Re-run review*, *Finish review*.
- Rendering the assessment in the reviewer's `result-review-drawer`.

## 5. Stakeholders / Personas

| Persona | What changes for them |
|---|---|
| **Result submitter (Centre user)** | The verdict arrives in a right-side drawer instead of a centred box. Same words, same choices. With five sections expanded, the **Submit for review** button no longer scrolls out of reach. |
| QA reviewer / Program reviewer | **Nothing.** Their drawer is untouched; no payload changes. |
| Platform admin | Nothing. |

## 6. User Stories

- **`BIL-QAD-US-1`** — As a **result submitter**, I want the quality verdict in a full-height side panel, so that I can read five sections of feedback without the decision buttons scrolling away. *(Refines `US-S4`.)*
- **`BIL-QAD-US-2`** — As a **result submitter**, I want the verdict surface to look and behave like the other panels in the module, so that I do not have to learn a second overlay convention. *(Refines `US-S1`.)*

## 7. Functional Requirements

### Required (MUST)

#### `BIL-QAD-R-1` — The verdict surface is a right-side drawer over a scrim

The system MUST render the verdict surface as a panel anchored to the right edge, spanning the full viewport height, above a scrim that dims and blocks the form behind it.

##### Scenario: The drawer opens on submit

- GIVEN a bilateral result whose Submit button is enabled
- WHEN the submitter presses **Submit for review**
- THEN the verdict surface opens as a right-anchored, full-height panel over a scrim
- AND the form behind it is visibly dimmed and not interactive
- BUT it must NOT render as a centred modal box
- AND IT MUST be the only overlay on screen for the whole `assessing → deciding → submitting` flow — never two surfaces swapped mid-flight

#### `BIL-QAD-R-2` — Content parity is total

The drawer MUST render every field, label, copy string and control the modal rendered, with identical text, for every state.

The complete inventory that MUST survive:

| State | Content that MUST be present |
|---|---|
| **Running** | Indeterminate progress bar · lead line *"Reading the result against the quality criteria. This usually takes under a minute."* (**quoted in full since 2026-09-18** — the row previously truncated it with an ellipsis, which left the second sentence ungated in a table that declares itself the *complete* inventory; surfaced by `BIL-QAD-T-3`) · the group *What the colours mean* · all four legend rows (green, amber, red, grey) with their exact `VERDICT_LEGEND` labels and meanings · the rotating tip (all three `TIPS`, 5 s cadence) |
| **Deciding — overall** | Eyebrow *Overall result* · the verdict word · the score `N/100` when non-null · the summary, with its fallback *"Review the assessment before submitting."* |
| **Deciding — stale** | The stale banner, exact text |
| **Deciding — sections** | Group *By section* · one card per present section in `SECTION_ORDER` · each card's label, verdict pill, comments · *Go to \<label\>* only where `canNavigate` · *See feedback* / *Hide feedback* only where `hasFeedback` · inside the panel, *What to address* (issues) and *What is working well* (strengths) with their icons |
| **Deciding — evidence** | Group *Evidence* · one line per item with its verdict and reason |
| **Unavailable** | Title *Quality check unavailable* · `degraded_reason` with its fallback copy |
| **Footer** | **Make adjustments** · **Submit for review** / **Submit without quality check** · the *Submitting…* busy label |

##### Scenario: Nothing is lost in the re-layout

- GIVEN an assessment with all five sections, issues, strengths, evidence lines, a score and a summary
- WHEN the drawer renders it
- THEN every item in the inventory above is present in the DOM with the same text as before this change
- BUT it must NOT add any field, label, counter, subtitle or action the modal did not have
- AND IT MUST NOT rewrite, shorten or re-tone any existing copy string

#### `BIL-QAD-R-3` — Every dismissal path keeps meaning "Make adjustments"

Scrim click, the ✕ control and `Escape` MUST all dismiss the drawer with exactly the effect the modal's dismissal had: nothing is submitted, the assessment stays available on the rail.

##### Scenario: Three doors, one meaning

- GIVEN the drawer is open in the `deciding` state
- WHEN the submitter clicks the scrim, or presses `Escape`, or activates ✕
- THEN the drawer closes and no submission occurs
- AND the rail's stored-assessment card remains, reopenable
- BUT it must NOT submit, re-run the check, or discard the stored assessment

#### `BIL-QAD-R-4` — No exits while the check or the submit is in flight

While `running()` or `submitting()`, the drawer MUST offer no dismissal path.

- While `running()`: no footer at all.
- While `submitting()`: the footer remains present but **fully inert** — every action disabled, the primary button showing its `aria-busy` *Submitting…* state (the label `BIL-QAD-R-2`'s inventory requires).

> **Amended 2026-09-18** (owner ruling, recorded in `execution.md` under `BIL-QAD-T-1`). This clause previously read "no dismissal path **and no footer**" for both states, which contradicted `BIL-QAD-R-2`'s inventory (which requires the footer's *Submitting…* busy label) and `design.md` §2.2 (`submitting` → "Verdict view, footer busy"). The shipped behaviour — footer present and disabled while submitting — is the parity-correct reading, and parity is this spec's governing constraint. `BIL-QAD-R-2` and §2.2 stand unchanged.

##### Scenario: The running state is sealed

- GIVEN the drawer is open and the quality check is running
- WHEN the submitter clicks the scrim, presses `Escape`, or looks for ✕
- THEN nothing closes and no footer is present
- BUT it must NOT render a ✕, a Cancel, or any other exit

##### Scenario: The submitting state is sealed but still speaks

- GIVEN the drawer is open and the submit is in flight
- WHEN the submitter clicks the scrim, presses `Escape`, or looks for ✕
- THEN nothing closes
- AND the footer is still present, with every action disabled and the primary button in its *Submitting…* busy state
- BUT it must NOT render a ✕, a Cancel, or any other working exit

> Rationale, unchanged from the parent spec: the server row is already claimed, so there is nothing a cancel could undo.

#### `BIL-QAD-R-5` — Chrome is fixed; only the body scrolls

The header and footer MUST remain visible regardless of content length; scrolling MUST be confined to the body between them.

##### Scenario: Five sections, last one expanded

- GIVEN an assessment with five sections rendered in the drawer
- WHEN the submitter expands the last section's feedback
- THEN the header stays visible at the top and the footer stays visible at the bottom
- AND **Submit for review** is reachable without scrolling the chrome
- AND the expanded feedback is brought into view rather than opening below the fold
- BUT it must NOT require any `::ng-deep` override of a dialog wrapper to achieve this

#### `BIL-QAD-R-6` — Focus is trapped while open and returned on close

##### Scenario: Keyboard user opens and closes the drawer

- GIVEN the submitter opened the drawer from the rail's **View AI assessment** button
- WHEN they `Tab` through the drawer and then dismiss it
- THEN focus stays within the drawer while it is open
- AND on close, focus returns to the **View AI assessment** button
- AND IT MUST expose `role="dialog"`, `aria-modal="true"` and an accessible name
- BUT it must NOT leave `document.body` scroll-locked after the drawer unmounts

#### `BIL-QAD-R-7` — Responsive across the baseline breakpoints

| Viewport | Behaviour |
|---|---|
| `≥ 640px` | Right-anchored panel, **760px** default width |
| `< 640px` | Full-bleed, `100vw`, no resize affordance |

##### Scenario: Phone width

- GIVEN a viewport narrower than 640px
- WHEN the drawer opens
- THEN it occupies the full viewport width and height
- AND every footer action remains reachable and tappable
- BUT it must NOT produce horizontal page scroll

#### `BIL-QAD-R-8` — The visual language follows the reference, the content does not

The drawer MUST adopt the reference's visual treatment — fixed header with title and ✕, uppercase eyebrow group labels, one card per item with its status chip at the card's top-right, labelled sub-blocks inside a card, fixed footer with actions right-aligned — applied **only** to the content inventoried in `BIL-QAD-R-2`.

##### Scenario: Reference language, PRMS content

- GIVEN the reference screenshot showing per-field AI suggestions and a review counter
- WHEN the drawer is built
- THEN the shell, eyebrows, cards, chips and footer treatment follow it
- BUT it must NOT introduce the reference's header subtitle, its "N of N reviewed" counter, its *Re-run review* or *Finish review* actions, or any per-field suggestion/accept control
- AND IT MUST leave a slot empty rather than invent content to fill it

### Should (SHOULD)

- **`BIL-QAD-R-9`** The drawer SHOULD be resizable by dragging its left edge between **520px and 900px** on viewports `≥ 640px`, matching `bilateral-create-drawer`. *(Shell parity; carries no behaviour of its own.)*
- **`BIL-QAD-R-10`** The drawer SHOULD animate in and out with a horizontal transform, and MUST collapse that motion to none under `prefers-reduced-motion: reduce`.

### Could (MAY)

- **`BIL-QAD-R-11`** The drawer MAY drop the manual `scrollIntoView` rescue in `toggleSection()` **only if** `BIL-QAD-R-5`'s scenario is verified in a real browser without it. Deleting it unverified is how the original "the click did nothing" defect returns.

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Accessibility** | WCAG 2.1 AA per `docs/ux-ui/design.md` §10: labelled dialog, focus trap, focus return, `Escape`, visible focus rings, `aria-expanded`/`aria-controls` preserved on the feedback triggers, `inert` still hiding collapsed panels from tab order and the a11y tree |
| **Responsive** | Renders correctly at **1440px, 1024px, 375px** (`docs/ux-ui/design.md` §9) with no horizontal page scroll |
| **Styling** | DD-12 Tailwind-first: new styling as Tailwind utilities in the template; SCSS only for `@keyframes`, `:host` box setup and projected DOM. No new `.pr-*` SCSS class blocks. `material-icons-round` only |
| **Backwards compatibility** | Component inputs and outputs (`assessment`, `visible`, `running`, `submitting`, `dismissed`, `sectionSelected`, `decisionChosen`) MUST NOT change shape. No payload, contract or `bilateral-result-summaries.en.md` change |
| **Security / Privacy** | No new logging of any kind. AC-9 and W8 are untouched by construction — this layer never sees the payload |
| **Internationalization** | No new strings. Existing literals stay where they are; this spec does not open the `internationalization/` migration |
| **Performance** | No new HTTP calls, no new polling, no new subscriptions. The tip interval stays a single 5 s timer, cleaned up on teardown |

## 9. Defect classes and the gate that catches each

The dominant defect class of this spec is **visual**, and the default client gate (`jest` in jsdom) is structurally blind to it. jsdom has no layout engine: it cannot measure a scroll position, a fixed footer, an overflow or a contrast ratio. A green `jest` run here proves the DOM contains the right nodes — **never that the drawer looks or scrolls right**.

| # | Defect class | Gate | Can it see it? |
|---|---|---|---|
| **D-1** | **Content drift** — a field, label or copy string lost in the re-layout | Parity assertions in `bilateral-quality-assessment-dialog.component.spec.ts` covering the `BIL-QAD-R-2` inventory | ✅ **Yes** — this is the strong gate, and it guards the requirement that matters most |
| **D-2** | **Behaviour drift at the gate** — an exit offered while running/submitting, a dismissal that submits | Component spec: dismissal paths, footer absence while running | ✅ Yes |
| **D-3** | **Scroll / overflow regression** — footer scrolls away, expanded panel opens below the fold | **None automatable.** jsdom reports every element at 0×0 | ❌ **No** → human check at the Phase-3 HITL pause, in a real browser, at five sections with the last expanded (`BIL-QAD-AC-5`) |
| **D-4** | **Visual regression** — chip misaligned, spacing wrong, does not read as the reference language | **None automatable.** No visual-regression harness in this repo | ❌ **No** → screenshots at 1440/1024/375 reviewed by the owner at the HITL pause, or routed to a **T6 Multimodal** review |
| **D-5** | **Focus trap not actually trapping** | Component spec covers `Escape` and focus return; the **trap itself** is only weakly observable in jsdom | ⚠️ **Partial** → keyboard pass in a real browser at the HITL pause |
| **D-6** | **Body scroll-lock leak** — `document.body.style.overflow` left set after unmount | Component spec: assert `document.body.style.overflow` is restored on destroy | ✅ Yes |
| **D-7** | **Contrast failure** on the chips/eyebrows over the new surfaces | No automated checker runs on rendered output here | ❌ **No** → accepted risk, mitigated by reusing the parent spec's already-shipped verdict colour tokens unchanged rather than picking new ones |

**Accepted risks:** D-4 and D-7 have no automated gate in this repository and no substitute beyond human review. They are recorded here rather than left implicit. D-3 and D-5 have no automated gate but **do** have a mandated manual substitute, which is a task-level done criterion, not a suggestion.

## 10. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `BIL-QAD-AC-1` | A result being submitted | The check starts | The verdict surface opens as a right-anchored full-height drawer over a scrim, with no footer and no exit |
| `BIL-QAD-AC-2` | An assessment with 5 sections, issues, strengths, evidence, score and summary | The drawer renders | Every item in the `BIL-QAD-R-2` inventory is present with unchanged text |
| `BIL-QAD-AC-3` | The drawer open in `deciding` | Scrim click / `Escape` / ✕ | Dismissed with no submission; the rail card survives |
| `BIL-QAD-AC-4` | The drawer open while `running()` | Scrim click / `Escape` | Nothing closes; no footer, no ✕ present |
| `BIL-QAD-AC-4b` | The drawer open while `submitting()` | Scrim click / `Escape` | Nothing closes; no ✕; the footer **is** present with every action disabled and the primary button in its *Submitting…* busy state |
| `BIL-QAD-AC-5` | 5 sections, last one expanded, **real browser** | Scrolling the body | Header and footer stay fixed; **Submit for review** reachable; the expanded panel is brought into view |
| `BIL-QAD-AC-6` | Opened from the rail's **View AI assessment** button | The drawer is dismissed | Focus returns to that button; `document.body` scroll lock released |
| `BIL-QAD-AC-7` | Viewports 1440 / 1024 / 375px | The drawer renders | Correct at each; `100vw` below 640px; no horizontal page scroll |
| `BIL-QAD-AC-8` | An `unavailable` assessment | The drawer renders | Title *Quality check unavailable*, the degraded reason, and **Submit without quality check** |
| `BIL-QAD-AC-9` | The component after this change | Inspecting the styles | No `::ng-deep` override targeting `app-pr-dialog` remains |

Cross-cutting project ACs that already apply (referred, not restated): **AC-9** (security and secrets — untouched by construction).

## 11. Dependencies & Assumptions

### Upstream dependencies

- `BilateralQualityAssessmentUiService` — consumed read-only, unchanged.
- `bilateral-create-drawer` — **pattern source only**, not imported (owner decision: no shared extraction).

### Downstream consumers

- `bilateral-result-creator.component.html:44` — the only consumer. Its bindings do not change; at most the element name does.

### Assumptions

- **A-1** The verdict colour tokens shipped by the parent spec are correct and are reused verbatim. This spec does not re-pick colours.
- **A-2** The reference screenshot is a visual-language reference, not a feature reference. Confirmed by the owner, 2026-09-18.
- **A-3** P2-3150 being in UAT does not preclude a presentation change landing before sign-off — pending `BIL-QAD-OQ-1`.

## 12. Open Questions

| ID | Question | Status |
|---|---|---|
| `BIL-QAD-OQ-1` | Ticket placement: a sub-task under P2-3150, or a new ticket after UAT sign-off? | **Open — does not block the spec.** Administrative; resolve before `/akili-execute` produces a commit |
| `BIL-QAD-OQ-2` | Does *Go to \<section\>* still close the drawer entirely? | **Resolved 2026-09-18 — yes, unchanged.** Changing it would be behaviour, not design |
| `BIL-QAD-OQ-3` | Resizable, or fixed width? | **Resolved 2026-09-18 — resizable, matching `bilateral-create-drawer`** (`BIL-QAD-R-9`). Shell parity carries no behaviour |

## 13. Out-of-Band Notes

- **Debt to record, not to pay here:** this makes a fourth hand-rolled drawer shell. `bilateral-create-drawer/CLAUDE.md` already lists the `shared/components/pr-drawer` extraction as pending; this spec adds a fourth consumer to that count and should say so there.
- **Lateral finding, not this spec's work:** 8 remaining `progress_activity` icon uses in the client render as raw text (Material Symbols ligature; the app loads Material Icons Round). Belongs on the ticket that surfaced it.

## 14. Requirement ID Index

| ID | Title | Strength | ACs |
|---|---|---|---|
| `BIL-QAD-R-1` | Right-side drawer over a scrim | MUST | AC-1 |
| `BIL-QAD-R-2` | Content parity is total | MUST | AC-2, AC-8 |
| `BIL-QAD-R-3` | Every dismissal means "Make adjustments" | MUST | AC-3 |
| `BIL-QAD-R-4` | No exits while running or submitting | MUST | AC-4, AC-4b |
| `BIL-QAD-R-5` | Fixed chrome, body-only scroll | MUST | AC-5, AC-9 |
| `BIL-QAD-R-6` | Focus trapped and returned | MUST | AC-6 |
| `BIL-QAD-R-7` | Responsive across breakpoints | MUST | AC-7 |
| `BIL-QAD-R-8` | Reference language, PRMS content | MUST | AC-2 |
| `BIL-QAD-R-9` | Resizable 520–900px | SHOULD | AC-7 |
| `BIL-QAD-R-10` | Transform animation, reduced-motion safe | SHOULD | — |
| `BIL-QAD-R-11` | Drop the scroll rescue only if verified | MAY | AC-5 |

## Required cross-references

- `docs/prd.md` — US-S1, US-S4, AC-9
- `docs/ux-ui/design.md` — §6 *Drawers and modals*, §7 + DD-12, §8, §9, §10
- `docs/trd/trd.md` — W1, W8
- Parent spec — `docs/specs/bilateral/qa-ai-traffic-light/requirements.md` (`BIL-QAI-R-4`, `BIL-QAI-R-10`)
- `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` — **not touched**; recorded to make the absence deliberate

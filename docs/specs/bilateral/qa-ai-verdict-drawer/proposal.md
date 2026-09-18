# Proposal — QA AI verdict: modal → right-side drawer (W3/Bilateral)

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/qa-ai-verdict-drawer/` |
| Slug | `qa-ai-verdict-drawer` — derived from a free-text argument ("revisar el flujo de la IA … mejoremos la UI para el modal que muestra el resultado de la IA … drawer en vez de modal"). Placed under `bilateral/` per the domain-module taxonomy (precedent: `bilateral/qa-ai-traffic-light`). |
| Type | **Change** (presentation-only) |
| Approval Mode | **gated** (default) |
| Status | **draft** — awaiting owner approval |
| Owner | Juan David Delgado |
| Date | 2026-09-18 |
| Ticket(s) | None yet. Follows delivered [P2-3698](https://cgiarmel.atlassian.net/browse/P2-3698) (Done) under [P2-3150](https://cgiarmel.atlassian.net/browse/P2-3150) *W3/Bilateral results - QA AI: Result Quality Assessment on Submission* (**Ready For UAT**, Cami), epic [P2-3482](https://cgiarmel.atlassian.net/browse/P2-3482). P2-3150 is UI-only for the centre reporter, so a sub-task under it is the natural home — confirm before `/akili-specify`. |
| Baseline | `docs/ux-ui/design.md` — **§6 *Drawers and modals*** (the rule this change restores), §7 tokens + **DD-12** (Tailwind-first, violet accent, `material-icons-round`), §8 component rules, §9 breakpoints, §10 a11y · `docs/prd.md` — US-S1/US-S4 (submitter iterates before submitting), AC-9 · `docs/trd/trd.md` — W1, W8 (no payload bodies in logs) |
| Related specs | **`bilateral/qa-ai-traffic-light`** (parent — this amends its `BIL-QAI-R-4`/`R-10` presentation only) · `bilateral/manual-create-drawer` (the drawer shell this copies) · kaizen `bilateral--manual-create-drawer` |
| Depends on | none (in-repo, presentation layer only) |
| Parallel-safe | **yes** — touches four files inside one component folder plus at most one line of the creator template. No server, no contract, no migration. |
| Evidence | Vault: `CGIAR/W3/w3-bilateral-module/w3-p2-3150-ai-traffic-light-qa-on-submit.md` (flow, contract v0.2, the delivered window and why it is shaped as it is) · Reference visual: `mockup/reference-ai-review-drawer.png` |

**Model checkpoint:** T1 phase; session model (Opus 5, 1M) is at or above the registry's `opus` entry → pass, no downgrade recommended.

## Intent

Two things, in order:

1. **Review the bilateral AI flow** (bilateral results, P2-3150) and say plainly whether it is sound. **It is** — see *Flow review* below. No server, contract, persistence or decision-gate change is proposed.
2. **Move the verdict window from a centred modal to a right-side drawer**, following the drawer line already used elsewhere in the module, with the visual language of the reference screenshot. **Content is frozen:** the same fields, the same metadata, the same copy, the same buttons, the same behaviour. Design only.

## Problem / Current Behavior

### Flow review (the first half of the ask)

The flow delivered in `bilateral/qa-ai-traffic-light` holds up. Traced end to end on this branch:

| Step | Where | Verdict |
|---|---|---|
| Submit runs the check first, every time | `BilateralQualityAssessmentUiService.run()` → `POST center/quality-assessment/:resultId` | ✅ sound |
| Poll while the row is `running`, 3 s interval, 70 s window | `bilateral-quality-assessment-ui.service.ts` (`POLL_INTERVAL_MS`, `POLL_WINDOW_MS`) | ✅ sound — and correctly does **not** treat a timeout as `unavailable`, because `submit-for-review` rejects a decision against a `running` row |
| One surface for assessing → deciding → submitting | `isDialogOpen = isRunning() ‖ state()==='deciding' ‖ isSubmitting()` | ✅ sound — one overlay, never two swapped mid-flight |
| Decision is mandatory in the submit body | `PATCH center/submit-for-review/:resultId` requires `{ assessment_id, decision }` | ✅ sound — closed the bypass route to Pending Review |
| `type_specific` optional in the response | `REQUIRED_SECTION_KEYS` vs `OPTIONAL_SECTION_KEYS`; client filters on `!!sections[key]` | ✅ sound — the 2026-09-17 *Other output* regression is fixed and locked by tests |
| Rehydration after reload | `loadLatest()` + the `bcr-quality-summary` rail card | ✅ sound |
| No payload bodies logged | one line per call: `result_id`, `request_id`, `outcome`, `http_status`, `elapsed_ms` | ✅ sound (AC-9, W8) |

**The flow is not what needs work. The surface is.** Which brings the second half.

### The surface is a modal where the baseline says drawer

`docs/ux-ui/design.md` §6 assigns the two surfaces explicitly:

> - **Drawer** for stateful side-by-side review/edit (**QA review**, share/request, evidence preview).
> - **Modal** for confirm/destroy, share-request, delete-confirmation, error display.

The verdict window is QA review with per-section expandable feedback and a navigate-to-section action. It shipped as `app-pr-dialog`. **That is baseline drift, not a matter of taste** — and it shows up as friction in the code that is already there:

| Symptom | Where | Why it happens |
|---|---|---|
| Header/footer had to be pinned by hand, against the wrapper | `…-dialog.component.scss` — four `::ng-deep` overrides (lines 1, 10, 20, 108) pinning panel, body, mask and footer | `.pr-dialog` scrolls as one box; with five sections the **Submit for review** button scrolled off screen |
| Expanding a section needs a manual scroll rescue | `…-dialog.component.ts` `toggleSection()` — `afterNextRender` + wait for `transitionend` + `scrollIntoView` | The panel opens below the fold of a short centred box, so the click looked like it did nothing |
| Fixed, narrow box | `width: min(680px, calc(100vw - 32px))` | A centred modal cannot get taller without crowding the viewport; a right panel is full-height by construction |

A drawer removes the cause of all three rather than patching each one: full viewport height, chrome naturally pinned top and bottom, one scroller in the middle.

### Three hand-rolled drawers, no shared primitive

`bilateral-create-drawer`, `result-review-drawer` and `indicator-drawer` each re-implement scrim, Escape, focus return and body-overflow lock. `bilateral-create-drawer/CLAUDE.md` already records the pending extraction to `shared/components/pr-drawer`. Out of scope here by the owner's decision (2026-09-18) — recorded below as debt.

## Proposed Outcome

1. The verdict window opens as a **right-side drawer over a scrim**, full viewport height, `760px` default on desktop (drag 520–900px), `100vw` below 640px — the `bilateral-create-drawer` geometry.
2. **Every exit behaves exactly as today:** scrim click, ✕ and Escape = *Make adjustments*; both are suppressed while `running()` or `submitting()`, because the row is already claimed server-side.
3. **The content is unchanged, field for field:** running state (indeterminate bar, four-colour legend, rotating tip), overall verdict + score + summary, stale banner, the per-section cards with their verdict pill, comments, *Go to <section>* and inline *See feedback* (issues + strengths), the evidence lines, the unavailable message, and the two footer buttons with their exact labels. No copy is rewritten, no field is added or removed.
4. The visual language follows `mockup/reference-ai-review-drawer.png` and DD-12: fixed header with eyebrow + title + ✕, section-eyebrow grouping, card-per-item with a status chip top-right, fixed footer carrying the actions.
5. All existing behaviour locked by the component spec keeps passing; the two assertions coupled to `.pr-dialog-footer` move to the drawer's own footer class.

## Scope

**In scope** — four files in one folder, plus at most one line elsewhere:

| File | Change |
|---|---|
| `…/bilateral-quality-assessment-dialog.component.html` | `app-pr-dialog` → drawer shell (scrim + `<aside role="dialog" aria-modal="true">`); same body markup, re-laid-out per the reference |
| `…/bilateral-quality-assessment-dialog.component.scss` | Drop all four `::ng-deep` wrapper overrides; drawer geometry, enter/exit transform animation |
| `…/bilateral-quality-assessment-dialog.component.ts` | Drawer shell mechanics (Escape, scrim, focus return, overflow lock, width/resize). `toggleSection()`'s scroll rescue is **re-measured**, not deleted, and only removed if the drawer genuinely makes it unnecessary |
| `…/bilateral-quality-assessment-dialog.component.spec.ts` | Two `.pr-dialog-footer` assertions retargeted; add a drawer-shell test (Escape/scrim = dismiss, suppressed while running) |
| `bilateral-result-creator.component.html:44` | Only if the selector is renamed |

**Non-Goals**

- Any change to the flow, the contract, the endpoints, `bilateral_quality_assessments`, the decision gate or the polling window.
- Any copy, field, metadata or verdict-logic change. The drawer shows what the modal shows.
- A non-blocking side-by-side drawer (owner decision, 2026-09-18 — see *Approach Options* B).
- Extracting `shared/components/pr-drawer` or migrating the other three drawers (owner decision, 2026-09-18).
- The reference screenshot's own content — per-field *AI suggestion / Your version / Keep my version / Applied*, the "N of 7 reviewed" counter, *Re-run review*, *Finish review*. **We take its visual language, not its feature set.**
- Painting the assessment in the reviewer's `result-review-drawer` (the additive `quality_assessment` block exists; rendering it is separate work).

## Affected Users, Systems, And Specs

| | |
|---|---|
| **Users** | Centre result submitters on `/bilateral/:center/result/:code` — the only people who see this surface. Program reviewers are unaffected (their drawer is untouched). |
| **Systems** | Angular client only. No server, no DB, no external contract. |
| **Specs** | Amends `bilateral/qa-ai-traffic-light` `BIL-QAI-R-4` and `R-10` **presentation only** — their behavioural clauses are restated unchanged. Inherits the shell contract of `bilateral/manual-create-drawer`. |
| **Docs** | `bilateral/qa-ai-traffic-light` gets an amendment note. `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` is **not** touched — no payload change. |

## Visual Reference

- Source: **Screenshot supplied by the owner** (reference for visual language only)
- Location: `docs/specs/bilateral/qa-ai-verdict-drawer/mockup/reference-ai-review-drawer.png`
- Notes: Right-side panel, fixed header (title + one-line subtitle + ✕), uppercase section eyebrows, one card per item with a status chip top-right, fixed footer with a left-hand status line and right-hand actions. **Its content is not the target** — it shows a per-field suggestion/accept flow PRMS does not have. What carries over is the shell, the rhythm and the chip/eyebrow/card treatment, applied to the fields we already render. `/akili-specify` should produce a mockup of *our* content in this language before any code is written.

## Requirement Delta Preview

### ADDED Requirements

- The verdict surface is a right-side drawer over a scrim: full viewport height, 760px desktop default, resizable 520–900px, 100vw below 640px.
- Focus returns to the element that opened the flow when the drawer closes (the rail's *View AI assessment* button, or the Submit button).
- The drawer carries `role="dialog"` + `aria-modal="true"` + an accessible label, and traps focus while open.

### MODIFIED Requirements

- `BIL-QAI-R-4` / `R-10`: the verdict and working state render in a drawer instead of a centred modal. **Every behavioural clause is unchanged** — one surface for the whole flow, no exits while running, three-way dismissal mapping to *Make adjustments*.
- Section feedback keeps expanding inline inside its own card; the scroll rescue is re-measured against the taller surface.

### REMOVED Requirements

- None. No behaviour, field or copy is removed.

## Approach Options

| | Option | Trade-off |
|---|---|---|
| **A** ✅ | **Drawer with scrim, in place** — the component keeps its identity and inputs/outputs; only its shell changes, copying `bilateral-create-drawer` | Smallest safe path. Zero behaviour change, zero consumer change, the spec file stays largely intact. Cost: a fourth hand-rolled scrim/Escape/focus implementation |
| B | **Non-blocking side-by-side drawer** — closest to the reference image; the reporter fixes the form with the feedback beside it | Genuinely more useful, and the reference's real value. But it is a **behaviour** change, not a design one: it reopens what happens to a pending decision while the content is edited (the server invalidates on hash mismatch), so the verdict goes stale under the user's hands. Rejected by the owner, 2026-09-18 — worth revisiting as its own proposal |
| C | **Extract `shared/components/pr-drawer` first, then migrate** — pays the debt `bilateral-create-drawer/CLAUDE.md` already records | Right long-term shape, but puts three production drawers back under test for a design change. Rejected by the owner, 2026-09-18 |

## Recommended Approach

**Option A.** It is the only one that satisfies the stated constraint — *"no cambies nada de contenido, solo diseño"* — while also closing a real baseline drift (§6 says drawer for QA review). The blast radius is one component folder; the flow, the contract and the decision gate are not opened at all. Options B and C are both defensible and both are recorded above so neither is lost — they are separate proposals, not this one.

## Risks, Dependencies, And Open Questions

| | Item | Handling |
|---|---|---|
| **R-1** | The scroll rescue in `toggleSection()` was written for a short centred box. On a full-height drawer it may be unnecessary — or may still be needed near the bottom of a long list | Re-measure at five sections with the last one expanded before deleting anything. Removing it blind is how the original "the click did nothing" bug returns |
| **R-2** | Two spec assertions bind to `.pr-dialog-footer` (lines 72, 143) | Retarget them in the same commit. The rest of the spec binds to `.bqa-dialog__*` classes and survives |
| **R-3** | Fourth hand-rolled drawer shell — scrim, Escape, focus return and overflow lock duplicated again | Accepted by the owner. Record the debt in `bilateral-create-drawer/CLAUDE.md`'s *Pendiente* and in the kaizen entry, so `pr-drawer` keeps its fourth consumer counted |
| **R-4** | The drawer's `body { overflow: hidden }` lock and `PrDialogComponent`'s ref-counted lock must not fight if both are ever mounted | The component stops using `app-pr-dialog` entirely, so only one lock exists. Verify no other overlay is open at submit time |
| **R-5** | P2-3150 is **Ready For UAT**. A UI change landing mid-UAT can confuse the tester | Confirm with the owner whether this ships as a sub-task of P2-3150 or waits for UAT sign-off — **OQ-1** |
| **OQ-1** | Ticket placement: sub-task under P2-3150, or a new ticket after UAT? | Owner |
| **OQ-2** | Keep *Go to <section>* closing the drawer entirely (today's behaviour), or leave the drawer open behind the scrim? Closing is today's behaviour and the safe default | Owner — default: unchanged |
| **OQ-3** | Should the drawer be resizable (create-drawer offers 520–900px drag), or fixed-width? Resize is shell parity, not new behaviour | Owner — default: match create-drawer |

**Lateral finding, not scope.** The vault note records **8 remaining uses of `progress_activity`** in the client (ai-assistant, result-creator, bilateral-page-header, dashboard-lab, guided-creation…). It is a **Material Symbols** ligature and the app loads **Material Icons Round**, so each renders as raw text — unreported only because they all sit next to a label. This spec's own use was already fixed to `autorenew`. Per house practice this belongs as a comment on the ticket that surfaced it, not a new ticket.

## Success Criteria

1. The verdict surface renders as a right-side drawer on `/bilateral/:center/result/:code`, full height, over a scrim.
2. **Content diff is empty:** every field, label, verdict, score, comment, issue, strength, evidence line, legend row, tip and button label present before the change is present after it, with the same text.
3. Escape, scrim click and ✕ all dismiss as *Make adjustments*; all three are inert while `running()` or `submitting()`.
4. With five sections and the last one expanded, header and footer stay fixed and **Submit for review** is reachable without scrolling the chrome.
5. Focus returns to the opener on close; the panel is labelled and `aria-modal`.
6. `npx jest --silent --reporters=summary --no-coverage --testPathPattern="bilateral-quality-assessment"` green; `npx ng lint --quiet` clean.
7. All four `::ng-deep` overrides on `app-pr-dialog` (scss lines 1, 10, 20, 108) are gone, not relocated.
8. Verified at 1440px, 1024px and 375px.

## Next Step

```text
/akili-specify bilateral/qa-ai-verdict-drawer
```

Ask `/akili-specify` to produce a mockup of **our** content in the reference's visual language (`mockup/`) before writing code — the reference screenshot shows a different feature set, so it cannot be followed literally.

# Proposal — Bilateral AI Drafts: Spotlight the Job's Drafts from "Open drafts"

## Document Control

| Field | Value |
|---|---|
| **Module** | `bilateral` |
| **Spec Path** | `docs/specs/bilateral/ai-draft-spotlight/` |
| **Slug** | `ai-draft-spotlight` (derived from the free-text argument) |
| **Type** | Change |
| **Deliverable** | software |
| **Approval Mode** | gated |
| **Requirement prefix (proposed)** | `ADS` (AI Draft Spotlight) |
| **Owner** | Maria Camila Giraldo (M.Giraldo@cgiar.org) |
| **Date** | 2026-10-27 |
| **Ticket(s)** | **P2-4029** "Implement a Guided Tour Highlight Effect to Identify Recently AI-Generated Drafts": description and acceptance criteria 1–5 are the primary requirement source |
| **Source of intent** | Jira P2-4029 and the user request in chat on 2026-10-27, with a screenshot of the success toast over Draft Results. No Figma |
| **Builds on** | `docs/specs/archive/2026-10-27-bilateral--ai-draft-new-indicator/` (`ADN-*`, commit `edcf190f0`) · `docs/specs/bilateral/ai-processing-queue/` (`AIQ-R-9` D, the `?job=` ring) · `bilateral/guided-tour` (`BGT-*`, driver.js) |
| **Depends on** | none (the `ADN` work it builds on is committed) |
| **Parallel-safe** | no: it edits the same `my-draft-results` and `bilateral-ai.service` files as `ADN` |

---

## 1. Intent

When the user clicks **Open drafts** on the "*<label>* is ready" toast, the page should clearly show them which drafts that AI run produced. The user asked for a tour-style spotlight: the screen dims and only that run's drafts stay lit.

## 2. Problem / Current Behavior

| # | Today | Evidence |
|---|---|---|
| P-1 | The toast's **Open drafts** reloads the list and navigates to `/bilateral/:acronym/drafts` **without** `?job=` | `bilateral-ai.service.ts:463-466` (`openDraftsForJob`) |
| P-2 | If the user is already on Draft Results, which is the case in the screenshot, that navigation changes nothing. The toast closes and nothing else visibly happens. This is the user's complaint | User report, 2026-10-27 (screenshot) and P-1 |
| P-3 | The page already has a scroll-and-ring highlight for `?job=`. Only the drawer's "View N drafts" uses it | `ai-processes-drawer-host.component.ts:108`; effect at `my-draft-results.component.ts:250-283`; ring classes at `my-draft-results.component.html:242-244` |
| P-4 | The ring is a thin `ring-2` around the card. It is easy to miss on a long list | `my-draft-results.component.html:242-244` |
| P-5 | A second `?job=` with the **same** id is ignored, so clicking the same job twice does not highlight again | `my-draft-results.component.ts:408` (`if (jobId === this.pendingHighlightJobId()) return;`) |
| P-6 | `driver.js` is already a dependency and already styled for PRMS (`popoverClass: 'pr-guide'`, `overlayOpacity: 0.65`, `stagePadding: 6`) | `onecgiar-pr-client/package.json:54`; `bilateral-tour.service.ts:225-229` |

## 3. Proposed Outcome

1. **Open drafts** always lands the user on that job's session group, whether they start on Draft Results, on another bilateral tab, or anywhere else in the app.
2. Once the group is on screen, the page dims and that group stays lit, with a short popover: **"2 new drafts from *Google – CGIAR Accelerator on Digital Transformation Support*. Review each one, then create the result or discard it."** (final wording at specify).
3. The user closes it with **Got it**, **Esc** or a click outside. Focus then returns to the group. After that, the existing ring and the "New" badge remain.
4. Nothing changes in draft data, status or the API.

## 4. Scope

- The toast's **Open drafts** action passes `?job=<jobId>`.
- A one-shot spotlight on Draft Results when it arrives through that action, after the existing scroll.
- Re-triggering: clicking **Open drafts** for the same job again shows the spotlight again (fixes P-5 for this path).
- Fallback when the group is not visible (for example, a project filter hides it): no spotlight. Proposed behavior: clear the filter, or show a short notice (see OQ-2).
- Copy for the popover in `bilateral-ai-processes.copy.ts`.

## 5. Non-Goals

- Server, database, migration or `/api/bilateral/*` payload changes.
- The bell and email deep links (they carry no job id today, `ADN` C-4). They stay as they are.
- Changing the "New" indicator (`ADN-*`) or the persistent `?job=` ring (`AIQ-R-9` D).
- A multi-step tour. This is one step only.
- Spotlighting individual draft rows. The unit is the session group, which already contains exactly that job's drafts (`BADR-R-8`).

## 6. Affected Users, Systems, And Specs

| Kind | Item |
|---|---|
| Users | Center submitters who start an AI text-mining run (own jobs only, as with the toast) |
| Client files | `pages/bilateral/services/bilateral-ai.service.ts` (+ spec) · `pages/bilateral/pages/my-draft-results/my-draft-results.component.{ts,html}` (+ spec) · `internationalization/bilateral-ai-processes.copy.ts` · probably a small spotlight helper beside `bilateral-tour.service.ts` · folder `CLAUDE.md` |
| Specs | `ADN` (archived): the "New" badge coexists · `AIQ-R-9` D: the `?job=` contract is reused · `BGT`: same visual language as the bilateral tour |
| Server | none |

## 7. Visual Reference

- Source: none (a screenshot of the current toast was given in chat; no mockup).
- Location: n/a.
- Notes: the look reuses the existing bilateral guided tour (`pr-guide` popover over a 0.65 overlay), so the visual language is already approved. I can generate a mockup before specify if you want one.

## 8. Requirement Delta Preview

### ADDED Requirements

- **ADS-R-1**: When the user opens a job's drafts from the toast, Draft Results shows a one-step spotlight on that job's session group, after the group is scrolled into view.
- **ADS-R-2**: The spotlight dims the rest of the page, shows a popover with the draft count and the job label, and closes with Got it, Esc or a click outside. Focus returns to the group (a11y, `design.md` §10).
- **ADS-R-3**: The spotlight shows once per click. It does not reappear on reload, even though `?job=` stays in the URL.
- **ADS-R-4**: If the target group is not on screen, no overlay appears over an empty area. The fallback is defined in OQ-2.

### MODIFIED Requirements

- **`openDraftsForJob`** (P-1): navigates with `queryParams: { job }`, the same contract as the drawer's "View N drafts".
- **`?job=` handling** (P-5): a repeat request for the same job re-runs the scroll, the highlight and the spotlight.

### REMOVED Requirements

- none.

## 9. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. driver.js single step** (recommended) | Toast passes `?job=` plus a one-shot "spotlight" signal; the page runs `driver().highlight({ element: '#mdr-session-<id>', popover })` after the existing scroll | Reuses an installed, PRMS-styled library: overlay, Esc, click-outside and focus handling are built in; same look as the tour; small change | driver.js measures the element once, so it must run **after** the second scroll pass (`SCROLL_SETTLE_MS`), and the card is tall when a job has many drafts |
| B. Custom CSS overlay | A full-page backdrop plus `z-index` lift of the card, in the component | No dependency; full styling control | Re-implements focus trap, Esc, scroll lock and stacking in a page that already juggles a drawer (`body.overflow`); drifts from the tour's look |
| C. Stronger ring only | Navigate with `?job=` and add a pulse animation to the existing ring | Smallest change | Not what the user asked for; on a long list it is still easy to miss |

## 10. Recommended Approach

**Option A.** It fixes the root issue (P-1, the missing `?job=`) with a one-line contract the drawer already uses. It also gives the user the spotlight they described, using the same component and styling as the bilateral tour, so no new UI primitive is needed.

Sketch for specify:

- `openDraftsForJob` navigates to `['/bilateral', acronym, 'drafts']` with `{ job: jobId }` and sets a one-shot "spotlight requested for `jobId`" signal on the service.
- `MyDraftResultsComponent` consumes that signal in the existing highlight effect. After the settle pass, if the group element exists, it starts driver.js with a single step. On close, it clears the signal and focuses the group.
- Same-job re-click: the service request carries a nonce, so the page re-runs the scroll even when `?job=` is unchanged.

## 11. Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| R-1 | **Timing**: driver.js positions the cut-out on the element's rect at start time. Starting before the second scroll pass ends leaves the cut-out offset. Start after `SCROLL_SETTLE_MS` and call `driver.refresh()` on resize |
| R-2 | **Scroll container**: Draft Results scrolls inside a container (`scrollWithinNearestScrollContainer`), not the window. driver.js's own `scrollIntoView` must be turned off (`smoothScroll: false`) so it does not fight the page's scroll. *Superseded at specify:* `smoothScroll` only picks smooth vs instant. The resolution is `design.md` DD-3 (the page owns the scroll) and DD-9 (container-scroll `refresh()`) |
| R-3 | **Stacking**: the bilateral tour, the AI processes drawer and the draft detail drawer can all be open. The spotlight must not start while a drawer or the tour is open, and opening Review must close it first |
| R-4 | **Tall groups**: a job with many drafts makes a card taller than the viewport. The popover should anchor to the group header, not the whole card (decide at specify) |
| OQ-1 | Should the drawer's **"View N drafts"** show the spotlight too? *Recommended: yes*, so both entry points behave the same |
| OQ-2 | When a filter hides the target group: *recommended: clear the filters for that job and then spotlight*, rather than show a notice |
| OQ-3 | Popover wording, final English copy (American English, `changes--american-english-copy`) |

## 12. Success Criteria

- From Draft Results, clicking **Open drafts** on the toast dims the page and lights that job's group, with the popover, within about 1 s of the click.
- The same from another bilateral tab or from outside the module.
- Esc, Got it and a click outside each close the spotlight; focus lands on the group; no page scroll lock remains.
- A reload with `?job=` in the URL shows the ring and no spotlight.
- Jest covers the navigation contract, the one-shot rule, same-job re-click, the hidden-group fallback, and close and cleanup. Client coverage gates stay green.

## 13. Next Step

```text
/akili-specify bilateral/ai-draft-spotlight
```

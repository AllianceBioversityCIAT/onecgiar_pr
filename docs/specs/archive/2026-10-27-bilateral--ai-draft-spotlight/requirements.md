# Requirements — Bilateral AI Draft Results: Spotlight the Run's Drafts from "Open drafts"

## Document Control

| Field | Value |
|---|---|
| **Module** | `bilateral` |
| **Sub-feature** | `ai-draft-spotlight` |
| **Spec Path** | `docs/specs/bilateral/ai-draft-spotlight/` |
| **Type** | Change |
| **Deliverable** | software |
| **Depth** | **Standard**: client-only (one service, one page, one copy file, folder guide) with a timing and rendering risk; re-checked in `design.md` §Budget |
| **Approval Mode** | gated |
| **Requirement prefix** | `ADS` (AI Draft Spotlight): `ADS-R-n`, `ADS-AC-n`, defect classes `ADS-Dn` |
| **Owner** | Maria Camila Giraldo (M.Giraldo@cgiar.org) |
| **Status** | approved (gated, 2026-10-27) |
| **Ticket(s)** | **P2-4029**: "Implement a Guided Tour Highlight Effect to Identify Recently AI-Generated Drafts" (AC 1–5 below are cited as `J-AC-n`) |
| **Source of intent** | `proposal.md` (same folder) · Jira P2-4029 · user screenshot, 2026-10-27 |
| **Builds on** | `archive/2026-10-27-bilateral--ai-draft-new-indicator/` (`ADN-*`, commit `edcf190f0`) · `bilateral/ai-processing-queue/` (`AIQ-R-9` D, `?job=` scroll and ring) · `bilateral/guided-tour` (`BGT-*`, driver.js tour look) |
| **Baseline cited** | `docs/prd.md` US-S1, §5 (AI helpers) · `docs/ux-ui/design.md` §10 (a11y) · `docs/trd/trd.md` `bilateral` client module row |

---

## 1. Executive Summary

When an AI run finishes, the toast says "*<label>* is ready · N drafts ready · **Open drafts**". Today, clicking **Open drafts** only closes the toast. When the user is already on Draft Results, nothing on the page changes.

This spec makes **Open drafts** take the user to that run's drafts and spotlight them in a one-step, guided-tour style. The rest of the screen dims, the run's session group stays lit, and a short popover explains what to do. The user dismisses it, and the page returns to normal. It is client-only and changes no data.

---

## 2. Glossary

| Term | Meaning here |
|---|---|
| **Run / job** | One AI text-mining submission. Every draft carries its `job_id` |
| **Session group** | The card on Draft Results that holds every draft of one job (`BADR-R-8`). It is the unit that is spotlit |
| **Completion toast** | The sticky success toast "*<label>* is ready · N drafts ready" with the **Open drafts** action, shown when an own job completes with drafts |
| **Spotlight** | A one-step guided-tour overlay: the page is dimmed and one element stays lit, with an attached popover |
| **Spotlight request** | A one-shot instruction "spotlight job X", created by a user click. A URL alone never creates one |
| **Drawer entry point** | The "View N drafts" action in the AI processes drawer |

---

## 3. System Context & Scope

### 3.1 Current behavior (evidence as run at `edcf190f0`)

| # | Today | Evidence |
|---|---|---|
| C-1 | **Open drafts** reloads the list and navigates to `/bilateral/:acronym/drafts` with no job id | `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-ai.service.ts:463-466` |
| C-2 | The drawer's "View N drafts" navigates with `?job=<id>`, which scrolls to the group and rings it for as long as `?job=` stays in the URL | `components/ai-processes-drawer/ai-processes-drawer-host.component.ts:108`; `my-draft-results.component.ts:250-283`, `:406-413`; ring classes `my-draft-results.component.html:242-244` |
| C-3 | A second `?job=` with the same id is ignored, so no new scroll or ring happens | `my-draft-results.component.ts:408` |
| C-4 | Draft Results has client-side filters that can hide a group, and a `clearFilters()` action | `my-draft-results.component.ts:157` (`MyDraftResultsFilterService`), `:431` (`drafts`), `:659` (`clearFilters`) |
| C-5 | The app already has a PRMS-styled guided tour on bilateral built with driver.js | `onecgiar-pr-client/package.json:54`; `bilateral-tour.service.ts:225-229` |
| C-6 | The page scrolls inside a container, not the window | `my-draft-results.component.ts` (`scrollWithinNearestScrollContainer`, used by the highlight effect at `:276`) |

### 3.2 In scope

- **Open drafts** on the completion toast: navigation to the job and a spotlight request.
- **Drawer entry point**: the same spotlight (decision D-1).
- The spotlight on Draft Results: overlay, lit group, popover, dismissal, and focus return.
- Making the hidden target visible when filters hide it (decision D-2).
- Popover copy.

### 3.3 Decisions taken at specify (defaults from the proposal, open to change at the Phase 1 gate)

| # | Decision | Choice | Source |
|---|---|---|---|
| D-1 | Does "View N drafts" in the drawer also spotlight? | **Yes**: both entry points behave the same | proposal OQ-1 (recommended) |
| D-2 | What if filters hide the group? | **Clear the filters, then spotlight** | proposal OQ-2 (recommended) |
| D-3 | What is lit? | The **whole session group** of the job, which holds every draft of that run and no others | J-AC-2, J-AC-4 |

### 3.4 Out of scope

- Server, database, migration or `/api/bilateral/*` changes.
- The bell and email deep links (no job id today; `ADN` C-4).
- Changing the "New" badge (`ADN-*`) or the persistent `?job=` ring (`AIQ-R-9` D).
- A multi-step tour, or a "don't show again" preference.
- Toasts for failed or empty jobs (their action opens the drawer, not drafts).

---

## 4. Personas

| Persona | What changes for them |
|---|---|
| Result submitter (center staff who start an AI run) | **Open drafts** now shows exactly which drafts the run produced |
| Teammates on the same center | Nothing. The toast only fires for the viewer's own jobs (`AIQ`, C-2 of `ADN`) |

---

## 5. Functional Requirements

### Requirement ADS-R-1: Open drafts lands on the run's drafts

The system SHALL take the user from **Open drafts** (and from the drawer's "View N drafts", D-1) to Draft Results for the job's center, with that job targeted, and SHALL create one spotlight request for that job.

#### Scenario ADS-AC-1a: Already on Draft Results (the reported case)

- GIVEN the user is on Draft Results of center X
- AND their own job J of center X has just completed with 2 drafts
- WHEN they click **Open drafts** on J's toast
- THEN the page scrolls to J's session group and the spotlight starts on it
- BUT it must NOT require a reload or a second click

#### Scenario ADS-AC-1b: From another page

- GIVEN the user is on another bilateral tab, or outside the bilateral module
- WHEN they click **Open drafts** on job J's toast
- THEN they land on Draft Results of J's center with J targeted, and the spotlight starts once J's group is rendered

#### Scenario ADS-AC-1c: Same job twice

- GIVEN the user already opened and dismissed the spotlight for job J
- WHEN they click an action that targets J again (the drawer's "View N drafts" for J)
- THEN the scroll and the spotlight run again
- AND IT MUST NOT be ignored because the URL already names J (C-3)

#### Scenario ADS-AC-1d: Drawer entry point

- GIVEN the AI processes drawer is open with completed job J
- WHEN the user clicks "View N drafts" on J
- THEN the drawer closes and the spotlight starts on J's group, as in ADS-AC-1a

### Requirement ADS-R-2: The spotlight shows only that run's drafts

The system SHALL dim the whole page with a semi-transparent overlay and keep **only** the targeted job's session group lit and readable, with a popover attached to it.

#### Scenario ADS-AC-2a: Lit area and popover

- GIVEN the spotlight starts for job J with N drafts in its group
- THEN every element of the page except J's group is under the overlay, including other jobs' groups and the page header
- AND J's group (header and all its draft rows) is lit and readable
- AND a popover shows a title naming the run (J's project name, else program code, else job id, the same label as the toast) and a body stating N and what to do next (Review, then Create Result or Discard)
- AND the popover has a **Got it** button
- BUT the drafts of any other job MUST NOT be lit (J-AC-2, J-AC-4)

#### Scenario ADS-AC-2b: Starts after the page settles

- GIVEN J's group is rendered below the fold
- WHEN the spotlight starts
- THEN it starts only after the scroll to J's group has settled, so the lit area matches the group's position on screen
- AND IT MUST NOT show a lit cut-out that is offset from the group

#### Scenario ADS-AC-2c: A group taller than the screen

- GIVEN J's group is taller than the visible area (many drafts)
- WHEN the spotlight starts
- THEN the group's header is on screen and the popover is visible without scrolling

### Requirement ADS-R-3: Dismissal returns the page to normal

The system SHALL close the spotlight on **Got it**, on **Esc**, or on a click on the overlay, and SHALL leave the page exactly as it would be without the spotlight.

#### Scenario ADS-AC-3a: Each way of closing

- GIVEN the spotlight is open
- WHEN the user clicks **Got it**, OR presses **Esc**, OR clicks the dimmed area
- THEN the overlay and popover are removed
- AND keyboard focus moves to J's group
- AND J's ring and "New" badge remain as before (`AIQ-R-9` D, `ADN-R-1`)
- BUT the page MUST NOT keep a scroll lock, a leftover overlay, or an inert region

#### Scenario ADS-AC-3b: Leaving the page while it is open

- GIVEN the spotlight is open
- WHEN the user navigates away (another tab, a result, another center)
- THEN the spotlight is removed and nothing of it remains on the next page

### Requirement ADS-R-4: The spotlight is one-shot and click-driven

The system SHALL show the spotlight only in response to a spotlight request, once per request.

#### Scenario ADS-AC-4a: Reload does not replay it

- GIVEN the user dismissed the spotlight and the URL still has `?job=J`
- WHEN they reload the page, or open the same URL in a new tab
- THEN the group is scrolled to and ringed as today (C-2)
- BUT the spotlight MUST NOT appear

#### Scenario ADS-AC-4b: The request expires if not used

- GIVEN a spotlight request for J was created
- WHEN J's group never becomes available on Draft Results (see ADS-R-5)
- THEN the request is dropped
- AND IT MUST NOT fire later on an unrelated visit to Draft Results

### Requirement ADS-R-5: Hidden or missing target

The system SHALL make the targeted group visible before it spotlights it, and SHALL never dim the page around nothing.

#### Scenario ADS-AC-5a: Filters hide the group (D-2)

- GIVEN Draft Results has active filters (project, status, search…) that hide J's group
- WHEN a spotlight request for J arrives
- THEN the filters are cleared, J's group appears, and the spotlight starts on it

#### Scenario ADS-AC-5b: The group is not in the list

- GIVEN J's drafts are not in the loaded list (all discarded or created, the list failed to load, or J belongs to another center)
- WHEN a spotlight request for J arrives
- THEN no overlay appears and no error is shown
- AND the page behaves as today

### Requirement ADS-R-6: No clash with other overlays

The system SHALL NOT run the spotlight together with another modal layer on the bilateral pages.

#### Scenario ADS-AC-6a: Another layer is open

- GIVEN the draft detail panel (Review), the AI processes drawer, or the bilateral guided tour is open
- WHEN a spotlight request arrives
- THEN the spotlight waits until that layer is closed, or is dropped if the layer stays open (rule fixed in `design.md`)
- BUT two dimming layers MUST NOT be shown at the same time

#### Scenario ADS-AC-6b: Opening Review from the lit group

- GIVEN the spotlight is open
- WHEN the user presses **Review** or **Create Result** inside the lit group
- THEN the spotlight closes first and the action proceeds normally

### Requirement ADS-R-7: Works across screen sizes (J-AC-5)

The system SHALL render the spotlight correctly from 375 px to 1280 px and wider.

#### Scenario ADS-AC-7a: Mobile and desktop

- GIVEN viewports of 375 px and 1280 px wide
- WHEN the spotlight starts
- THEN the lit area matches J's group bounds and the popover sits fully inside the viewport, with no horizontal page scroll

#### Scenario ADS-AC-7b: Resize while open

- GIVEN the spotlight is open
- WHEN the window is resized
- THEN the lit area follows the group

### Requirement ADS-R-8: No data change (J-AC-5)

The system SHALL NOT create, update or delete any draft, job or result, and SHALL NOT change any draft status. The spotlight is presentation only.

---

## 6. Non-Functional Requirements

| ID | Requirement |
|---|---|
| ADS-NFR-1 | **Timing**: on Draft Results with the list already loaded, the spotlight is visible within ~1 s of the click (one scroll settle pass, `SCROLL_SETTLE_MS` = 600 ms today) |
| ADS-NFR-2 | **Accessibility** (`design.md` §10): the popover has an accessible name and description; **Got it** is keyboard-reachable and focused when the popover opens; Esc closes it; focus returns to the group afterwards |
| ADS-NFR-3 | **Visual consistency** (J-AC-5): same overlay, popover style and button styling as the bilateral guided tour (`pr-guide`) |
| ADS-NFR-4 | **Copy**: American English, in `bilateral-ai-processes.copy.ts` |
| ADS-NFR-5 | **No new dependency**: the existing `driver.js` only |
| ADS-NFR-6 | Client test gates stay green (Jest 50/60/60/60, `ng lint`, type check) |

---

## 7. Defect Classes and Gates

| Class | What goes wrong | Gate |
|---|---|---|
| ADS-D1 Navigation contract | Toast or drawer navigates without the job, or creates no request | Jest on `bilateral-ai.service` and the drawer host (navigate args, request created) |
| ADS-D2 One-shot logic | Spotlight replays on reload, fires twice, ignores a same-job re-click, or a stale request fires later | Jest on the component: request consumption, reload with `?job=` and no request, same-job re-request, expiry |
| ADS-D3 Filter fallback | Filters stay on and the target never appears, or filters are cleared when the group was already visible | Jest: filter service spy, both branches |
| ADS-D4 Cleanup | Overlay, scroll lock or listener left behind after close or navigation | Jest: driver instance destroyed on each close path and on component destroy (driver stubbed) |
| ADS-D5 **Geometry and timing** | Cut-out offset from the group, popover off-screen, the page's scroll container fighting driver's scroll, tall-group anchoring | **No automated jsdom check is possible.** Substitute: **HITL visual check at 375 and 1280 px** in a real browser, on a job with 1 draft and on one with many drafts, landing from Draft Results and from another tab, recorded with screenshots. A Cypress component probe like the one `ADN` used is optional |
| ADS-D6 Overlay clash | Spotlight over the draft panel, the drawer or the tour | Jest on the guard (layer-open state stubbed) plus a HITL step |
| ADS-D7 A11y | No focus on Got it, Esc not closing, focus lost after close | Jest (key events, `document.activeElement`) plus a HITL keyboard pass |
| ADS-D8 Type contract | Wrong shape passed into the driver config or the service request | `ng build` / `tsc` type check |

Accepted risk: driver.js renders its overlay as an SVG cut-out. Its contrast against the lit card is set by the tour's existing `overlayOpacity` and is judged at the HITL pause, not by `axe`.

---

## 8. Requirement ID Index

| ID | Title | Jira AC | Proposal |
|---|---|---|---|
| ADS-R-1 | Open drafts lands on the run's drafts | J-AC-1 | MODIFIED `openDraftsForJob`, `?job=` re-trigger, OQ-1 |
| ADS-R-2 | Only that run's drafts are lit | J-AC-1, J-AC-2, J-AC-4 | ADS-R-1, ADS-R-2 (preview) |
| ADS-R-3 | Dismissal returns the page to normal | J-AC-3 | ADS-R-2 (preview) |
| ADS-R-4 | One-shot, click-driven | J-AC-3 | ADS-R-3 (preview) |
| ADS-R-5 | Hidden or missing target | J-AC-2 | ADS-R-4 (preview), OQ-2 |
| ADS-R-6 | No clash with other overlays | J-AC-5 | R-3 |
| ADS-R-7 | Works across screen sizes | J-AC-5 | R-1, R-4 |
| ADS-R-8 | No data change | J-AC-5 | Non-goals |

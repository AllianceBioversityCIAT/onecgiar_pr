# Requirements — Progress Tracker Results Browse in the Report Form

## 1. Module / Feature

- **Module:** `result-framework-reporting` → `dashboard-lab/lab-report-form` (+ a new sibling component)
- **Sub-feature:** Progress Tracker source in the report form (child 2 of the `progress-tracker-pull-bridge` family)
- **Owner:** Juan Carlos Cadavid (PRMS)
- **Status:** `approved` (specify approved 2026-09-22; ready for `/akili-execute`, **not started** — held until child 1's PR1 schema+config is green)
- **Depth:** **Full** — a structural change to the most trap-laden component in the module, on the live 2026 reporting entry point
- **Type:** Change · **Approval Mode:** gated
- **Parent spec:** `docs/specs/changes/progress-tracker-pull-bridge` (`family.md`, child #2, status `active`)
- **Proposal:** `./proposal.md` (approved 2026-09-22)
- **Module code:** `PTB`
- **Ticket(s):** none assigned

---

## 2. Context

This child is the **client half** of the pull bridge. When a user reports on a pooled W1/W2 KPI in the Reporting aside, a **Progress Tracker** source appears beside Manual entry (a third tab for knowledge-product KPIs), listing the drafts the Progress Tracker proposes and pre-filling PRMS's own create form when the user picks one. Nothing is persisted here — the result exists only when the user presses PRMS's **Create and continue**, landing in **Editing**, W1/W2, exactly as a manually created result does (Guide §2; `family.md` §4 OQ-4).

It consumes the routes sibling child 1 exposes, addressed by **PRMS ids only** (`family.md` §2). It ships **no migration and no server change**.

**Baseline anchors.** `docs/prd.md` — refines `US-S1` (create a typed result with its required fields) and `US-S5` (never lose work to a network error); bound by `AC-1` (typed result integrity) and `AC-9` (secrets). `docs/ux-ui/design.md` — §7 design tokens and §8 components govern every surface; the prototype figures are a layout reference, not a token source. `docs/trd/trd.md` — §5 W1 (result lifecycle, unchanged) and §6 (frontend architecture and state boundaries).

**Primary requirement source:** Jose Berenguer, *"PRMS ⇄ Progress Tracker — the pull bridge"*, v1.0, 15 Sep 2026, `../source/` — cited as **Guide §N**. Figures 5–8 (Guide §6) are the visual reference.

---

## 3. In Scope / Out of Scope

### In scope

- Two client API methods consuming child 1's routes.
- A standalone `pt-results-browse` component, **sibling of** `kp-cgspace-browse`, with six rendered states.
- `lab-report-form` integration: a source switcher for **non-KP** indicators, a **third tab** for KP indicators, and the pick-to-prefill mapping.
- Carrying the draft description and its provenance tail in `toc_progressive_narrative`, plus the provenance fields child 1 made storable.
- Client Jest coverage of every state and mapping rule, one Cypress component test for the tab layout, and a regression test for emerging mode.

### Out of scope

- Everything server-side — module, routes, env keys, mapping table, `/resolve` fill, provenance schema (**sibling child 1**).
- **Any migration or server file.** This child touches no `onecgiar-pr-server/` path.
- Mounting the component in `aow-hlo-create-modal` or the legacy `report-result-form` (parent `S-out-1`).
- The "N results ready" badge (parent `S-out-2`) — the API method ships, the badge does not.
- Greying out already-used proposals (parent `S-out-3`).
- The visible "Description of Result" box — locked deferred (`family.md` §4 OQ-2).
- **Generalizing `kp-cgspace-browse`** into a shared source component. Explicitly rejected (`./proposal.md` §10 Option B).

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter (pooled W1/W2) | Gains the Progress Tracker source in the aside. The manual path is untouched and always reachable |
| Result submitter (emerging mode) | **No change — and this is a requirement, not a side effect** (`PTB-R-12`) |
| Centers / bilateral submitters | No change — the source does not appear for them |
| QA reviewer | Receives results whose title and description were drafted upstream; workflow, validation and QA identical |

---

## 5. User Stories

- **`PTB-US-1`** — As a **result submitter**, I want to see what the Progress Tracker can propose for the KPI I am reporting, so that I do not retype work already evidenced there. *(Refines `US-S1`.)*
- **`PTB-US-2`** — As a **result submitter**, I want to know that nothing is saved until I press Create, so that I can explore proposals without committing to one. *(Refines `US-S1`.)*
- **`PTB-US-3`** — As a **result submitter**, I want the form to stay fully usable by hand when the Progress Tracker is slow, unknown to my KPI, or down, so that an external source never blocks my reporting. *(Refines `US-S5`.)*
- **`PTB-US-4`** — As a **result submitter reporting an emerging result**, I want the form to behave exactly as it does today, so that a feature I am not using cannot break the one I am. *(Refines `US-S1`.)*

---

## 6. Functional Requirements

### Required (MUST)

- **`PTB-R-1`** For a **non-knowledge-product** W1/W2 indicator, the report form MUST offer a source switcher with **Manual entry** and **Progress Tracker**.
- **`PTB-R-2`** For a **knowledge-product** W1/W2 indicator, the report form MUST offer **three** tabs: Browse repositories, Manual entry, Progress Tracker.
- **`PTB-R-3`** The Progress Tracker panel MUST render exactly one of six states at any time: `loading`, `results`, `empty`, `not_found`, `unavailable`, or `picked` (the post-selection banner).
- **`PTB-R-4`** In the `not_found` and `unavailable` states, the panel MUST offer an explicit control that returns the user to Manual entry.
- **`PTB-R-5`** A control that returns the user to manual entry MUST remain reachable during the `loading` state — it MUST NOT be hidden behind the spinner.
- **`PTB-R-6a`** The upstream **base URL** and the **API key** MUST NOT appear in client source, in a request the browser issues, or in the browser's network log.
- **`PTB-R-6b`** The client MUST address **PRMS/Integration identifiers only**. It MUST NOT send a Progress Tracker `indicator_id` in any request it issues.
- **`PTB-R-6c`** The Progress Tracker `indicator_id` MAY appear in **received response bodies**, inside opaque provenance (`result_key`) and display-only deep links (`source.pt_url`) — `PTB-R-16` requires the client to send `result_key` back, and `PTB-R-23` requires it to render the "Open in Progress Tracker" link. *(Amended 2026-09-22 alongside child 1's `PTM-R-3` split — same defect, found by the backward sweep. See the Pivot Record in `../progress-tracker-indicator-mapping/execution.md`.)*
- **`PTB-R-7`** The client MUST NOT issue any request to the **Progress Tracker upstream host** (the `PT_INTEROP_BASE_URL` origin). Every Progress Tracker call MUST go to the PRMS origin. *(Narrowed 2026-09-22, requester-approved: PRMS's own `reviewApiUrl` — an `execute-api` host in prod, called by `ai-review.service.ts` — and the unrelated `bulkUploaderUrl` on a `synapsis-analytics.com` host pre-date this family and are out of scope. See `progress-tracker-results-browse/execution.md`, spec-wording finding.)*
- **`PTB-R-8`** The client MUST treat child 1's envelope as authoritative: an HTTP 200 carrying `status` of `ok`, `not_found` or `unavailable` maps to the corresponding rendered state. A transport-level failure MUST map to `unavailable`.
- **`PTB-R-9`** On "Use this result", the form MUST pre-fill the result title, truncated to PRMS's 30-word limit **with a visible notice when truncation occurred**.
- **`PTB-R-10`** On "Use this result", the form MUST pre-fill the result type **only when the indicator leaves the type open**. When the indicator fixes the type, the proposal's type MUST NOT override it.
- **`PTB-R-11`** On "Use this result" for a knowledge-product indicator, the form MUST pre-fill the repository handle when the proposal carries one, and MUST leave the existing knowledge-product flow otherwise unchanged — **except that a Progress Tracker pick never auto-creates**: while a proposal is attached, syncing the handle validates it and leaves creation to **Create and continue** (`PTB-R-14`), and the Progress Tracker tab tells the user the handle must be synced. *(Amended 2026-09-22, requester-approved: the existing KP "sync → auto-create" path would otherwise create a result from a PT pick without Create and continue — see `execution.md`, PTB-T-5.)*
- **`PTB-R-12`** The change MUST NOT alter the rendered form for emerging mode. The sticky **Create and continue** footer MUST still render when `isEmerging()` is true.
- **`PTB-R-13`** The change MUST NOT alter the Browse repositories or Manual entry behavior for any existing indicator type.
- **`PTB-R-14`** Selecting a proposal MUST NOT persist anything. The result MUST come into existence only through the existing **Create and continue** action.
- **`PTB-R-15`** While a proposal is selected and unsaved, the form MUST display a banner stating that nothing has been saved.
- **`PTB-R-16`** The create payload MUST carry the draft description and its provenance tail in `toc_progressive_narrative`, and MUST carry the provenance fields (`result_key`, `evidence_fingerprint`) child 1 persists.
- **`PTB-R-17`** Every existing caller of the create-payload builder MUST continue to send an empty `toc_progressive_narrative`. Only the Progress Tracker path sets a value.
- **`PTB-R-18`** Countries, impact-area scores and gender split from a proposal MUST be displayed as guidance only and MUST NOT be written into the create payload.

### Should (SHOULD)

- **`PTB-R-20`** The panel SHOULD render retrievable content within ~1.5 s of opening, upgrading in place when a slower AI draft arrives, so the user is not shown an empty panel for the measured ~20 s cold case.
- **`PTB-R-21`** The `loading` state SHOULD set an honest expectation for a wait that can reach ~20 s, rather than implying an imminent result.
- **`PTB-R-22`** The component SHOULD be mounted and retained (not destroyed on tab switch) so that switching away and back does not re-fetch.
- **`PTB-R-23`** The panel SHOULD show each proposal's result type, confidence, cited evidence, rationale and `missing_info`, and SHOULD link out to the KPI in the Progress Tracker.

### Could (MAY)

- **`PTB-R-30`** The panel MAY offer a refresh control that requests a freshly drafted proposal.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | First meaningful paint of the panel within **1.5 s** of opening in the template/cached path (measured upstream: template 1.4 s, cache hit 1.1 s — `family.md` §5.1). The cold AI path may take up to the client timeout; the UI MUST remain interactive throughout. |
| **Client timeout** | The client HTTP timeout MUST exceed child 1's server-side call timeout so that the classified `unavailable` arrives from the server rather than being invented by the browser. |
| **Security** | No upstream **base URL or key** in the client bundle or any browser request, and the client **sends** PRMS ids only (`AC-9`, `PTB-R-6a`, `PTB-R-6b`, `PTB-R-7`). A **received** response body may carry the PT id inside `result_key` / `source.pt_url` (`PTB-R-6c`). |
| **Accessibility** | The tab set MUST use `role="tablist"` / `role="tab"` with `aria-selected`, matching the existing switcher. New interactive controls MUST be keyboard reachable. WCAG 2.1 AA per `docs/ux-ui/design.md` §10. |
| **Internationalization** | New user-facing strings MUST follow whatever convention the surrounding component already uses; the design records which, with evidence. |
| **Design system** | Surfaces MUST use `docs/ux-ui/design.md` §7 tokens and §8 components, reusing `kp-cgspace-browse`'s visual language rather than the prototype screenshots. |
| **Backwards compatibility** | Additive. No existing test may be edited to accommodate the change (`PTB-R-13`, `PTB-R-12`). |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `PTB-AC-1` | A non-KP W1/W2 indicator | The report form opens | A two-option source switcher renders (Manual entry, Progress Tracker), **and it must NOT** render the Browse repositories tab |
| `PTB-AC-2` | A knowledge-product W1/W2 indicator | The report form opens | Three tabs render, **and IT MUST** keep Browse repositories as the tab the existing flow uses |
| `PTB-AC-3` | The Progress Tracker tab is opened and the request is in flight | The panel renders | The `loading` state shows, **and IT MUST** keep a route back to Manual entry reachable |
| `PTB-AC-4` | Child 1 answers `status: 'ok'` with one or more proposals | The panel renders | Each proposal shows type, confidence, evidence, rationale and `missing_info` |
| `PTB-AC-5` | Child 1 answers `status: 'ok'` with an empty list | The panel renders | The `empty` state shows, **and it must NOT** be presented as an error |
| `PTB-AC-6` | Child 1 answers `status: 'not_found'` | The panel renders | The `not_found` state shows with copy saying this KPI is not known to the Progress Tracker, **and IT MUST** offer the Manual entry escape |
| `PTB-AC-7` | Child 1 answers `status: 'unavailable'`, **or** the request fails at transport level | The panel renders | The `unavailable` state shows with the Manual entry escape, **and it must NOT** surface any upstream host, URL or raw error text |
| `PTB-AC-8` | A proposal whose title is longer than 30 words | The user presses "Use this result" | The title is truncated to 30 words **and a visible notice states that it was truncated** |
| `PTB-AC-9` | A proposal for an indicator that **fixes** the result type | The user presses "Use this result" | The indicator's type is retained, **and it must NOT** be replaced by the proposal's type |
| `PTB-AC-10` | A proposal for an indicator that **leaves the type open** | The user presses "Use this result" | The proposal's type is pre-filled |
| `PTB-AC-11` | A proposal has been selected | The form renders | A banner states nothing has been saved, **and it must NOT** have issued any create request |
| `PTB-AC-12` | A proposal has been selected | The user presses **Create and continue** | Exactly one `POST /api/results-framework-reporting/create` is issued, carrying the draft description in `toc_progressive_narrative` and the provenance fields |
| `PTB-AC-13` | Any create path that did **not** come from the Progress Tracker | The payload is built | `toc_progressive_narrative` is `''`, exactly as today |
| `PTB-AC-14` | An indicator in **emerging mode** (`isEmerging()` true) | The form renders | The sticky **Create and continue** footer renders, **and IT MUST** be reachable — this is the regression the module guide records |
| `PTB-AC-15` | Any existing indicator type on Browse repositories or Manual entry | The user completes the existing flow | Behavior is unchanged and the pre-existing suite passes **without any test being edited** |
| `PTB-AC-16` | The client bundle and a full browse-to-create session | The browser's network log is inspected | No request targets the **Progress Tracker upstream host** (the `PT_INTEROP_BASE_URL` origin; PRMS's own pre-existing `execute-api` / `synapsis-analytics.com` calls are out of scope — narrowed 2026-09-22), **and no request the browser issues** contains a Progress Tracker `indicator_id` or API key. A **received response body** carrying the id inside `result_key` / `source.pt_url` is **permitted** (`PTB-R-6c`) |
| `PTB-AC-17` | A proposal carrying countries, impact areas or gender split | The user presses "Use this result" then Create | Those values are shown as guidance, **and it must NOT** appear in the create payload |

Cross-cutting project ACs that apply without restatement: `AC-1`, `AC-3`, `AC-9`.

---

## 9. Defect Classes and Their Gates

| # | Defect class | Gate | Automated? |
|---|---|---|---|
| D-1 | **The create footer disappears in emerging mode** — the `@if` chain the module guide records as already broken once | Jest assertion on the rendered footer with `isEmerging()` true (`PTB-AC-14`) + the existing suite green unchanged | ✅ |
| D-2 | A tab or panel renders for the wrong indicator type | Jest template assertions (`PTB-AC-1`, `PTB-AC-2`) | ✅ |
| D-3 | A state is unreachable or two states render at once | Jest, one case per state (`PTB-AC-3`–`PTB-AC-7`) | ✅ |
| D-4 | Pre-fill mapping wrong (truncation, type override, handle) | Jest on the mapping (`PTB-AC-8`–`PTB-AC-10`) | ✅ |
| D-5 | Payload regression for existing callers | Jest on the payload builder (`PTB-AC-13`) + the existing suite unchanged (`PTB-AC-15`) | ✅ |
| D-6 | Upstream identity leaks into the browser | Repo grep over the client bundle sources for the upstream host patterns (`PTB-AC-16`, static half) | ✅ |
| D-7 | Guidance-only fields leak into the create payload | Jest on the payload builder (`PTB-AC-17`) | ✅ |
| **D-8** | **Tab layout breaks at narrow widths** — three tabs where two fitted, columns starving | ❌ **jsdom cannot measure layout.** **Substitute:** one **Cypress component test** measuring rendered geometry at two viewports that differ on the dimension the gate depends on, per the rendered-measurement checklist. Named, not waved | ⚠️ substituted (CT) |
| **D-9** | **The loading experience is wrong for a 20 s wait** — technically correct, humanly unacceptable | ❌ **No assertion can evaluate this.** **Substitute:** a human check at the HITL pause against the real `loading` state with a throttled response. Recorded as a required manual gate | ❌ substituted (human) |
| **D-10** | **A live browser issues a request the unit tests cannot see** (a stray absolute URL, a redirect) | ❌ **Unit tests assert on stubs, not on the network.** **Substitute:** browser network-log inspection during the family-level TEST walkthrough (`PTB-AC-16`, dynamic half), which needs child 1 deployed | ❌ substituted (HITL) |

---

## 10. Dependencies & Assumptions

### Upstream dependencies

- **Sibling child 1** (`progress-tracker-indicator-mapping`) — supplies `GET /api/progress-tracker/indicators/:tocIndicatorId/results` and `.../programs/:programId/ready-counts`, the always-200 envelope with `ok | not_found | unavailable`, and the provenance storage. **Contract-first:** this child builds and unit-tests against that contract with stubs; it does **not** require child 1 to be `done` to start (`family.md` §2).
- The existing create path and payload builder in `shared/report-result/`.

### Downstream consumers

- None. No other spec consumes this component in this family; the two other create surfaces are a deliberate follow-up (parent `S-out-1`).

### Assumptions

- Child 1's envelope shape is exactly as designed. **If it changes, this child's state mapping changes** — which is why the route signature was fixed before either child started.
- The latencies this child designs its loading experience around (template 1.4 s, cache 1.1 s, cold 20.2 s) are the staging measurements in `family.md` §5.1.

---

## 11. Open Questions

- **`PTB-OQ-1`** — Exact tab labels and ordering for the three-tab knowledge-product case. **Resolved in `design.md`**, against `docs/ux-ui/design.md` §8.
- **`PTB-OQ-2`** — Does the post-pick banner reuse the existing selected-item banner or need its own? **Resolved in `design.md`.**
- **`PTB-OQ-3`** — For a **non-KP** indicator sitting on the Progress Tracker tab **before** picking, should the rest of the form stay visible? The existing reveal condition makes it visible for non-KP indicators regardless of tab, whereas a KP indicator on Browse sees a Cancel-only footer. **Resolved in `design.md`** — it is a consequence of an existing condition, not a free choice.

Family-level gates not restated as blockers here: D1 egress, D4 QA programs, D5 sign-off, PROD budget (`family.md` §5).

---

## 12. Requirement ID Index

| ID | Summary | Covered by AC |
|---|---|---|
| `PTB-R-1` | Two-option switcher for non-KP | `PTB-AC-1` |
| `PTB-R-2` | Three tabs for KP | `PTB-AC-2` |
| `PTB-R-3` | Six states, exactly one at a time | `PTB-AC-3`–`PTB-AC-7`, `PTB-AC-11` |
| `PTB-R-4` | Manual escape on not_found / unavailable | `PTB-AC-6`, `PTB-AC-7` |
| `PTB-R-5` | Manual escape reachable while loading | `PTB-AC-3` |
| `PTB-R-6a` | No base URL / API key client-side | `PTB-AC-16` |
| `PTB-R-6b` | Client sends PRMS ids only | `PTB-AC-16` |
| `PTB-R-6c` | PT id permitted in received bodies | `PTB-AC-16` |
| `PTB-R-7` | No direct upstream request | `PTB-AC-16` |
| `PTB-R-8` | Envelope status → state mapping | `PTB-AC-4`–`PTB-AC-7` |
| `PTB-R-9` | 30-word truncation with notice | `PTB-AC-8` |
| `PTB-R-10` | Type only when the indicator leaves it open | `PTB-AC-9`, `PTB-AC-10` |
| `PTB-R-11` | KP handle pre-fill | `PTB-AC-2` |
| `PTB-R-12` | Emerging mode unchanged; footer renders | `PTB-AC-14` |
| `PTB-R-13` | Existing flows unchanged | `PTB-AC-15` |
| `PTB-R-14` | Pre-fill is not creation | `PTB-AC-11`, `PTB-AC-12` |
| `PTB-R-15` | Unsaved banner | `PTB-AC-11` |
| `PTB-R-16` | Narrative + provenance in the payload | `PTB-AC-12` |
| `PTB-R-17` | Existing callers still send `''` | `PTB-AC-13` |
| `PTB-R-18` | Guidance-only fields excluded | `PTB-AC-17` |
| `PTB-R-20` | ~1.5 s first paint, upgrade in place | `PTB-AC-3` |
| `PTB-R-21` | Honest loading copy for ~20 s | `PTB-AC-3` (+ D-9 human gate) |
| `PTB-R-22` | Mounted and retained across tab switches | `PTB-AC-15` |
| `PTB-R-23` | Proposal detail rendered | `PTB-AC-4` |
| `PTB-R-30` | Refresh control (MAY) | — |

---

## Required cross-references

- `docs/prd.md` — `US-S1`, `US-S5`; `AC-1`, `AC-3`, `AC-9`
- `docs/ux-ui/design.md` — §7 (tokens), §8 (components), §10 (accessibility)
- `docs/trd/trd.md` — §5 W1, §6 (frontend architecture)
- `onecgiar-pr-client/CLAUDE.md` — custom `auth` header, `HTTP_METHOD_descriptiveName`, commit format
- `.../lab-report-form/CLAUDE.md` — the trap list, which is a requirement here and not a note
- `./proposal.md` · `../family.md` · `../progress-tracker-indicator-mapping/design.md` (the consumed contract) · `../source/PRMS-ProgressTracker-Pull-Bridge-Guide-2026-09-15.docx`

# Proposal — Progress Tracker Results Browse in the Report Form (child 2 of 2)

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/progress-tracker-pull-bridge/progress-tracker-results-browse` |
| **Slug** | `progress-tracker-results-browse` |
| **Parent Spec** | `docs/specs/changes/progress-tracker-pull-bridge` (manifest: `family.md`, child #2) |
| **Type** | Change |
| **Approval Mode** | gated (default) |
| **Date** | 2026-09-22 |
| **Requester** | Juan Carlos Cadavid (PRMS) |
| **Depends on** | none — built against the PRMS indicator id contract child 1 exposes, so both build concurrently (`family.md` §2) |
| **Parallel-safe** | yes — client only, no migration, no server change |
| **Modules** | client `shared/services/api/results-api.service.ts` · client `result-framework-reporting/dashboard-lab/lab-report-form` (+ new sibling component) · client `shared/report-result/create-result-payload.util.ts` |
| **Primary requirement source** | Jose Berenguer, *"PRMS ⇄ Progress Tracker — the pull bridge"*, v1.0 draft, 15 Sep 2026 — `../source/PRMS-ProgressTracker-Pull-Bridge-Guide-2026-09-15.docx` / `.txt`. Cited as **Guide §N** |
| **Parent evidence** | Claims `P1`–`P12` are established and cited in `../proposal.md` §3; this child cites them by id |
| **Baseline docs** | `docs/ux-ui/design.md` §7 (design tokens), §8 (components) · `docs/trd/trd.md` §5 W1, §6 (frontend architecture) · `onecgiar-pr-client/CLAUDE.md` (custom `auth` header, `HTTP_METHOD_descriptiveName`) |

---

## 2. Intent

Build the **client half** of the pull bridge: the Progress Tracker becomes a visible source inside the report form of the Reporting aside, listing the drafts the Progress Tracker proposes for the KPI being reported, and pre-filling PRMS's own create form when the user picks one.

Nothing is persisted here. The result exists only when the user presses PRMS's own **Create and continue**, and lands in **Editing**, W1/W2, exactly as a manually created result does (Guide §2; `family.md` §4 OQ-4).

---

## 3. Problem / Current Behavior

| # | Claim | Evidence |
|---|---|---|
| C1 | **The only external source in the report form serves Knowledge Products.** The entry-mode switcher sits inside `@if (currentResultIsKnowledgeProduct())`, so a non-KP indicator gets no source choice at all. | Parent `P1` — `lab-report-form.component.html:84-108` |
| C2 | That switcher is **live, not flagged** (`kpBrowseEnabled = true`) and searches CGSpace + MELSpace + WorldFish. | Parent `P2` — `lab-report-form/CLAUDE.md` |
| C3 | **Three create surfaces carry the same pattern** — the aside form (live 2026 entry), the AoW/HLO modal, and the legacy result-creator form. | Parent `P3` — `lab-report-form.component.html:95` · `aow-hlo-create-modal.component.html:69` · `report-result-form.component.html:61` |
| C4 | 🛑 **`lab-report-form`'s Card 2 and Card 3 share an asymmetric `@if` chain.** Card 3's condition stays open to the end of the `<form>`, wrapping the sticky `Create and continue` footer and owning the `@else`. Closing it early or adding `!isEmerging()` to it orphans the `@else` and deletes the create footer in emerging mode. | `lab-report-form/CLAUDE.md` → "Trampa: Card 2 / Card 3 compartían un solo `@if`" (spec `changes/emerging-creation-hide-indicator-ui`, EHU-T-1); parent `R2`. Live at `lab-report-form.component.html:198` |
| C5 | **The client hardcodes the narrative empty.** `create-result-payload.util.ts` sends `toc_progressive_narrative: ''` with a comment stating neither surface has a narrative field — while the server DTO already accepts and stores it. | Parent `P6` — `create-result-payload.util.ts:236-238` · `create-results-framework.dto.ts:145-150` |
| C6 | **There is no field for the visible "Description of Result" at create time.** `CreateResultDto` carries only `initiative_id`, `result_type_id`, `result_level_id`, `result_name`, `handler`, `has_innovation_link`, `linked_results`. | Parent `P7` — `create-result.dto.ts:3-45` |
| C7 | **Measured on staging, 2026-09-22:** cold `mode=auto` **20.2 s**, `refresh=true` **16.5 s**, **cache hit 1.1 s**, `mode=template` **1.4 s**. The PRMS ceiling is **29 s** (API Gateway) inside a 30 s Lambda — ≈9 s headroom, so the call is viable synchronously. | `family.md` §5.1 — verified, superseding the Guide's supplier-reported figures. ⚠️ Two corrections that land on this child: a cache hit is **1.1 s, not 0.21 s**, and `mode=template` is **1.4 s, not instant** |
| C8 | 🛑 **PT DEV has drifted from the contract** — 422 on `mode=template` and `refresh=true` for the Guide's own sample KPI, while staging is correct. | `family.md` §5.1. Child 1 classifies 422 as `unavailable`, so this child renders the `unavailable` state; it never sees a raw 422 |

---

## 4. Proposed Outcome

Reporting on a pooled W1/W2 KPI in the aside:

- A **non-KP** indicator shows `Manual entry | Progress Tracker`.
- A **knowledge-product** indicator shows a **third tab** beside `Browse repositories | Manual entry`.
- The Progress Tracker panel lists each proposal with its result type, confidence, cited evidence, rationale and the `missing_info` the person still has to complete in PRMS — plus a link out to the KPI in the Progress Tracker.
- **"Use this result"** pre-fills title (truncated at PRMS's 30-word limit, with a visible notice), description, result type *only where the KPI leaves it open*, and the repository handle for a knowledge-product draft. A banner states that nothing has been saved.
- The user may pick another proposal, change everything by hand, or ignore the panel entirely.
- When the Progress Tracker is slow, unknown to this KPI, or down, the form stays **fully usable by hand** with a "use Manual entry" escape.

---

## 5. Scope

| # | Deliverable | Notes |
|---|---|---|
| B1 | **Client API methods** `GET_progressTrackerResults`, `GET_progressTrackerReadyCounts` in `shared/services/api/results-api.service.ts` — `HTTP_METHOD_descriptiveName` naming, custom `auth` header, addressed by the **PRMS** indicator id | Guide §7 item 4; `onecgiar-pr-client/CLAUDE.md` |
| B2 | **Standalone `pt-results-browse`**, sibling to `kp-cgspace-browse`, injecting only the API service | Guide §7 item 5 |
| B3 | **Six states** — `loading`, `results`, `empty`, `not_found` ("this KPI is not known to the Progress Tracker"), `unavailable`, and the post-pick banner. `not_found` and `unavailable` both carry the Manual-entry escape | Guide §7 item 9 |
| B4 | **`lab-report-form` hunks** — the source switcher lifted out of its `currentResultIsKnowledgeProduct()` gate (C1) so non-KP indicators get two tabs and KP indicators get three; the panel mounted and kept with `[hidden]` as the browse panel already is; reset on re-arm | Guide §7 item 6 |
| B5 | **`onPtResultSelected` mapping** — title cut at 30 words **with a visible notice**, description, result type only when the KPI leaves it open, `knowledge_product_handle` for KP drafts. Countries, impact-area scores and gender split are shown as **guidance only**; PRMS captures them in later sections | Guide §4.1 field table, §6 |
| B6 | **Payload hunk (S8)** — `create-result-payload.util.ts` stops hardcoding `toc_progressive_narrative: ''` (C5). Every existing caller keeps sending `''`; only the Progress Tracker path sets a value: the draft description plus the provenance tail | Guide §7 item 7 |
| B7 | **Provenance sent (S9b)** — `result_key` and `evidence_fingerprint` travel in the create payload into the storage child 1 added | `family.md` §3 |
| B8 | **Tests** — client Jest for the six states, the 30-word truncation, the type-only-when-open rule and the reset on re-arm; **one Cypress CT** for the tab layout in the aside; a regression test that emerging mode still renders the create footer (C4) | Root `CLAUDE.md` gates (50/60/60/60) |

### Out of scope for this child

| Out | Where it lives |
|---|---|
| The server module, routes, env keys, mapping table, `/resolve` fill, provenance schema | Sibling child 1 |
| Mounting `pt-results-browse` in `aow-hlo-create-modal` and the legacy `report-result-form` (C3) | Parent S-out-1 — the component is standalone, so each is a two-line mount once this is QA'd on TEST |
| The "N results ready" badge | Parent S-out-2 — `GET_progressTrackerReadyCounts` ships so the badge is a client-only follow-up |
| Greying out already-used proposals | Parent S-out-3 |
| The visible "Description of Result" box | **Deferred** (`family.md` §4 OQ-2) — needs a `CreateResultDto` change shared by every create surface (C6) and a P&R decision (Guide A4 / J1) |

---

## 6. Non-Goals

Inherited from the parent `N1`–`N8` and not restated. One worth repeating because it is visible here: **countries, impact areas and gender split are displayed as guidance and never written at create** — PRMS captures them in later sections (Guide §6, "three honest limitations").

---

## 7. Affected Users, Systems, And Specs

| Actor / system | Effect |
|---|---|
| **Science Program result submitters (pooled W1/W2)** | Gain the Progress Tracker source in the aside. The manual path is untouched and always reachable |
| **Centers, bilateral submitters** | No change — the source does not appear for them |
| **QA reviewers** | Receive results whose title and description were drafted from Progress Tracker evidence; workflow, validation and QA are identical (`docs/trd/trd.md` §5 W1) |
| **`lab-report-form`** | Structural change to the entry-mode switcher — the highest-risk file in the family (C4) |
| **The other two create surfaces** | Untouched in this child (C3) |
| **PRMS server / database** | **No change.** No migration, no DTO edit |
| **Module guides to update at `/akili-archive`** | `lab-report-form/CLAUDE.md` — the switcher stops being KP-only |
| **Related specs** | `docs/specs/archive/2026-08-27-changes--kp-cgspace-browse` and `.../2026-09-14-changes--kp-multi-repository-browse` — `kp-cgspace-browse` is the component to mirror |

---

## 8. Visual Reference

- **Source:** Prototype screenshots inside the primary source document — not a Figma file, not a generated mockup.
- **Location:** `../source/PRMS-ProgressTracker-Pull-Bridge-Guide-2026-09-15.docx`, Guide §6:
  - **Figure 5** — left: today's KP-only `Browse repositories | Manual entry`; right: the target `Manual entry | Progress Tracker` on a non-KP KPI
  - **Figure 6** — the panel (type chip, confidence, evidence list, "Use this result", "Open in Progress Tracker", the "nothing is saved until you press Create and continue" footer) and the expanded Details
  - **Figure 7** — left: the post-pick pre-filled state with its banner; right: the failure state with the form still usable by hand
  - **Figure 8** — the created result in Editing, W1/W2
- **Notes:** These come from an **adjusted local copy built from the public PRMS code with synthetic data** (Guide §6). They are an accurate reference for **layout and states**, not a token-level design source. `/akili-specify` must reconcile every surface against `docs/ux-ui/design.md` §7 (tokens) and §8 (components) and reuse `kp-cgspace-browse`'s existing visual language rather than the prototype's. No new design tokens are expected.

---

## 9. Requirement Delta Preview

### ADDED

- **A1** — A `Progress Tracker` source for **non-KP** W1/W2 indicators (`Manual entry | Progress Tracker`).
- **A2** — A **third tab** beside `Browse repositories | Manual entry` for knowledge-product W1/W2 indicators.
- **A3** — Six rendered states, each with the Manual-entry escape where it applies.
- **A4** — "Use this result" pre-fill: title (30-word truncation with a visible notice), description, type only where the KPI leaves it open, handle for KP drafts. Pre-fill is not creation.
- **A5** — Guidance-only display of countries, impact-area scores, gender split, rationale and `missing_info`.
- **A6** — The draft description and the provenance tail travel in `toc_progressive_narrative`.

### MODIFIED

- **M-1** — ⚠️ `lab-report-form`'s entry-mode switcher stops being gated behind `currentResultIsKnowledgeProduct()` and becomes source-aware (C1). **C4 governs this hunk**: Card 3's `@if` must stay open to the end of the `<form>`.
- **M-2** — `create-result-payload.util.ts` stops hardcoding `toc_progressive_narrative: ''` (C5). Existing callers keep sending `''`.

### REMOVED

- None. The manual path and the KP browse tab are untouched.

---

## 10. Approach Options

### Option A — A second component, mirroring `kp-cgspace-browse` ✅

A standalone `pt-results-browse` beside `kp-cgspace-browse`, each owning its own source.

| | |
|---|---|
| **Pros** | Mirrors the existing pattern exactly; the KP browse is untouched, so its shipped behavior cannot regress; the component is trivially mountable in the other two surfaces later (C3); this is what the prototype did |
| **Cons** | Some duplicated state-machine shape between the two browse components |
| **Verdict** | **Recommended** |

### Option B — Generalize `kp-cgspace-browse` into one "external source" component

One component parameterized by source.

| | |
|---|---|
| **Pros** | No duplication; one state machine |
| **Cons** | Refactors a component that shipped twice and is live in production for all three repositories, to add an unrelated source whose response shape, states and pre-fill mapping are entirely different. The regression surface is the KP flow that currently works |
| **Verdict** | Reject — the wrong thing to destabilize for a first integration |

### Option C — Render inside the form, no dedicated component

Inline the panel in `lab-report-form`.

| | |
|---|---|
| **Pros** | Fewest files |
| **Cons** | `lab-report-form` is already the largest and most trap-laden component in the module (C4); it is not testable in isolation; and it blocks the cheap mount in the other two surfaces |
| **Verdict** | Reject |

---

## 11. Recommended Approach

**Option A**, with four constraints:

1. **Treat C4 as a requirement, not a caution.** The Card 2 / Card 3 `@if` asymmetry already deleted the create footer once. The hunk keeps Card 3's condition open to the end of the `<form>`, and a regression test asserts that emerging mode still renders `Create and continue`.
2. **Mount the panel and keep it with `[hidden]`**, exactly as the browse panel does today (`lab-report-form.component.html:109-110`) — switching tabs must not remount and re-fetch.
3. **Design the wait against the measured numbers, not against zero** (C7). A cold draft is **20.2 s** and the budget holds with ≈9 s headroom, so the synchronous call is safe — but **template-first is not instant either (1.4 s), and even a cache hit is 1.1 s**. So: no state assumes an immediate paint; `loading` is a real state with honest expectation-setting for the ~20 s worst case; template content upgrades to the AI draft when child 1 offers both. The Manual-entry escape stays visible throughout, never behind the spinner.
4. **Pre-fill is not creation, and the UI must say so.** The banner stays visible until Create; the user can re-pick or abandon; `missing_info` is shown rather than hidden, because the person is the one who finalises the result (Guide §2).

---

## 12. Risks, Dependencies, And Open Questions

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **Host-form regression (C4)** — orphaning the `@else` removes the create footer in emerging mode; it has happened before | **High** | The `CLAUDE.md` trap list is a requirement; regression test for emerging mode; Cypress CT for the tab layout; existing `lab-report-form` suite must stay green **unchanged** |
| R2 | **Perceived latency** — **20.2 s measured** on a cold KPI, and no cheap first paint: template mode is 1.4 s and a cache hit 1.1 s (C7) | Medium | Template-first content that upgrades in place; loading copy honest about a ~20 s worst case; the Manual-entry escape visible throughout. The budget itself is settled — ≈9 s headroom under the 29 s ceiling (`family.md` §5.1) |
| R2b | **Upstream environment drift** — PT DEV returns 422 where staging is correct (C8) | Low | Child 1 classifies it as `unavailable`; this child renders that state. QA must run against PT staging, never DEV (locked OQ-3) |
| R3 | **AI-drafted text entering the system of record** | Medium | Pre-fill is not creation; the banner says nothing is saved; `missing_info` is shown; a person edits and presses Create (Guide §2) |
| R4 | **Title truncation surprising the user** — PRMS caps at 30 words, drafts are written to it but not guaranteed | Low | Truncate with a **visible** notice (Guide §7 item 6), never silently |
| R5 | **Tab crowding on KP indicators** — three tabs where two shipped | Low | Reconcile against `docs/ux-ui/design.md` §8 at `/akili-specify`; Cypress CT is the layout gate |
| R6 | **Empty-coverage disappointment** — several areas of work have no evidence at all (Guide §8.2 P4) | Low | `empty` and `not_found` are first-class states with plain copy, not errors |

**Dependencies:** child 1 deployed to TEST before the end-to-end walkthrough (`family.md` §2) · D1 (egress) · D4 (two or three real programs with evidence on TEST). Full table in `family.md` §5.

**Open questions:** **OQ-8 is CLOSED for staging** (`family.md` §5.1); its measured figures are now inputs to this child's loading design rather than an open gate. OQ-1, OQ-2, OQ-3, OQ-4, OQ-5 and OQ-9 are **locked** in `family.md` §4. What remains open nearby — the PROD budget and D1 egress — does not block this child, which ships no server call of its own. Two questions for `/akili-specify`: the exact tab labels and ordering for the three-tab KP case, and whether the post-pick banner reuses the existing KP banner component or needs its own.

---

## 13. Success Criteria

| # | Criterion | How it is proven |
|---|---|---|
| SC-1 | **Family walkthrough** — on PRMS TEST, from a real pooled W1/W2 KPI with evidence: Report → Progress Tracker → drafts → "Use this result" → form pre-filled → Create and continue → result in **Editing**, W1/W2, with provenance attached | HITL walkthrough once child 1 is on TEST (parent SC-1; needs D4) |
| SC-2 | **Fail-soft** — with the upstream unreachable or the KPI unknown, the form stays fully usable by hand and shows the right one of `unavailable` / `not_found` with the Manual-entry escape | Client Jest per state + one deliberate HITL failure run |
| SC-3 | **No direct browser call** to the Progress Tracker upstream host (the `PT_INTEROP_BASE_URL` origin) — *narrowed 2026-09-22 (requester-approved): originally "`synapsis-analytics.com` or any `execute-api` host", which PRMS's own pre-existing `reviewApiUrl` / `bulkUploaderUrl` already contact*; the network tab shows one PRMS call per open and one `POST /api/results-framework-reporting/create` on create | Browser network inspection during SC-1 (parent SC-3; mirrors Guide §6) |
| SC-4 | **A non-KP indicator shows two tabs; a KP indicator shows three** | Cypress CT + Jest template assertions |
| SC-5 | **Manual entry and the KP browse tab are unchanged** for every existing indicator type, **including emerging mode, which still renders `Create and continue`** | Existing `lab-report-form` Jest suite green and unchanged + the C4 regression test |
| SC-6 | Title over 30 words is truncated **with a visible notice**; result type is pre-filled only when the KPI leaves it open | Client Jest on the mapping |
| SC-7 | Gates hold: client Jest ≥ 50/60/60/60, `npx ng lint --quiet` clean, `npx tsc --noEmit` clean, every module `*.cy.ts` green | Root `CLAUDE.md` verification commands |

---

## 14. Next Step

```
/akili-specify docs/specs/changes/progress-tracker-pull-bridge/progress-tracker-results-browse
```

🛑 Held at the requester's instruction until both child proposals have been reviewed together with the OQ-8 validation results.

---

## Provenance

Derived from `../proposal.md` (approved 2026-09-22, Option B) and the family manifest `../family.md`. The primary requirement source is Jose Berenguer's guide of 15 Sep 2026 in `../source/`; its §4 field table and §6 states are adopted as the functional reference, while §7 item 8 — reading the Progress Tracker id from `indicators[0].related_node_id` client-side — is deliberately not followed: the id is resolved server-side by child 1, so the browser never carries it (parent `P9`, `family.md` §2).

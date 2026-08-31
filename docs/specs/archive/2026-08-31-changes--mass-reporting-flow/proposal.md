# Proposal: Mass Reporting Flow — burn-down aids for high-volume W1/W2 reporting

## 1. Document Control

| Field | Value |
|---|---|
| **Spec Path** | `changes/mass-reporting-flow` |
| **Type** | Change |
| **Approval Mode** | pre-approved (j.cadavid@cgiar.org, 2026-08-29 — "apruebo y YOLO": specify + one judgment-day pass fix-only + execute without routine pauses; ≤1 Reviewer round per task, targeted test runs only, no Cypress) |
| **Author** | Claude (Fable 5) with j.cadavid@cgiar.org |
| **Date** | 2026-08-29 |
| **Requirement source** | Chat + screenshot of the By-AOW reporting view (AOW03, 67 KPIs, 1 reported). No Jira ticket. |
| **Target surface** | Reporting tab (`DashboardLabComponent` — grouped and By-AOW views), report modal flow |
| **Depends on** | none (builds on the shipped `changes/reporting-entry-hub` surfaces) |
| **Parallel-safe** | yes (client-only; no shared contracts) |

---

## 2. Intent

A program user may have to report against **dozens to hundreds of KPIs** in one sitting (AOW03 alone: 67). Every aid that removes a click, a re-read, or a "where was I?" multiplies across that volume. This change adds four burn-down aids to the reporting views so a high-volume session flows instead of grinding.

---

## 3. Problem / Current Behavior

1. **No work-state filter.** Reported and pending KPIs render interleaved; the user re-reads finished rows on every pass. The state exists per card (`buildIndicatorCardMeta` → Not started / In progress / Complete) but nothing filters on it.
2. **No burn-down ordering.** Groups and KPIs render in catalogue order; the user hunts for the remaining work.
3. **One-modal-per-KPI round trip.** Report → modal → save → close → scroll → find next → Report. The modal (`app-report-result-form`) is legacy, driven entirely by `EntityAowService` signals with zero inputs/outputs — closing and reopening is the whole loop today.
4. **No session feedback.** Nothing tells the user "you have done 12, 55 remain in this AoW" — the context banner shows cumulative progress, not the session's.

Plus one observation to settle early: the screenshot shows **three visually identical cards** ("KPI 3.6.1 … 0 of 4 reported"). If they are distinct instances (per ToC target/node), the card hides the differentiating field; if not, it is a data/grouping bug. Either way it is not this spec's scope — see Open Questions.

---

## 4. Proposed Outcome

| # | Aid | Behaviour |
|---|---|---|
| 1 | **Pending-only toggle** | A "Only pending" control (both reporting views) hides Complete KPIs; groups whose KPIs are all complete collapse/hide; counts adjust. State persists per session. |
| 2 | **Burn-down sort** | Within a group, KPIs sort Not started → In progress → Complete (then catalogue order); groups with more remaining work sort first. A "Sort: remaining work / catalogue" switch keeps the old order reachable. |
| 3 | **Save and next** | After a successful save in the report modal, the user can jump straight to the next pending KPI of the same group/AoW without closing + hunting. Mechanism depends on what save signal `EntityAowService` exposes (OQ-2); the degraded fallback is a **"Next pending"** affordance on the just-saved card. |
| 4 | **Session counter** | The By-AOW context banner (and grouped header pill) adds "**N reported this session · M pending in <scope>**", reset on page load. |
| 5 | **AI narrative (admin-manageable)** — *mechanism superseded by requirements MRF-R-9 / design MRF-DD-1: client-side `ASSISTANT_ENGINE` (WebLLM), verified no server LLM exists; "server's AI capability" below kept as originally written* | A **Generate narrative** action on the By-AOW banner (and per grouped AoW header) produces a short progress narrative from the AoW's structured data (KPIs, reported x/y, per-HLO breakdown, state mix) via the server's AI capability. **Owner constraint: easy to administer** — an admin toggles it and edits its prompt template from the existing global-parameters admin module, no release needed: `ai_narrative_enabled` (on/off, lane hidden when off) + `ai_narrative_prompt` (template with placeholders). Output is copy-to-clipboard text with a visible "AI-generated — review before use" caption; nothing is persisted to results. Mechanism (which api/ai backend, or a new small endpoint) confirmed against source in specify. |

---

## 5. Scope

- Server: one narrative endpoint under the AI module (reuse of the existing AI backend; no new provider unless none exists — verified in specify), reading `ai_narrative_enabled` / `ai_narrative_prompt` from global parameters.
- Client-only otherwise: `dashboard-lab.component.{ts,html}`, `reporting-aow-table` inputs (if the grouped view participates), the By-AOW sections pipeline (`plannedByAowSections`), the context banner, `reporting-program-band` (toggle/sort controls placement).
- Read-only reuse of `buildIndicatorCardMeta`; no endpoint, no migration, no payload change.

## 6. Non-Goals

- Editable table / spreadsheet entry mode (own proposal if wanted — bigger bet).
- One-result-to-many-KPIs attachment (own proposal; touches result→ToC mapping flow).
- CSV import or AI prefill (`api/ai`) — big bet, separate track.
- Any change to the report modal's internal form.
- The duplicate-cards investigation (OQ-1 → separate bugfix/quick).

---

## 7. Affected Users, Systems, And Specs

| Persona | Impact |
|---|---|
| Result submitter (AoW lead / PI) | Primary beneficiary: burn-down filtering, ordering, chained reporting. |
| SP Leader / PMU | Unchanged reads; session counter is per-browser only. |

Related: shipped `changes/reporting-entry-hub` (owns the surfaces this extends); `reporting-aow-table` is owned by earlier specs — its pinned tests must stay green.

---

## 8. Visual Reference

- Source: None yet (screenshot of the current view is the baseline) + **competitor walkthrough** (2026-08-29, live session): `performance-tracker.synapsis-analytics.com` — My KPI Set (AoW → HLO → KPI), per-KPI guided wizard, My Pending Actions. Findings below; treat all competitor content as reference only, never copied assets.
- Location: —
- Notes: controls follow the band/banner patterns shipped in `reporting-entry-hub`.

### Competitor findings (what to rescue, and where)

**Adopt in THIS spec (cheap, fits the burn-down story):**
| Pattern seen | PRMS translation |
|---|---|
| `Copy link to this KPI` + `?indicator=<id>` deep link | Per-KPI copy-link + `?kpi=<id>` query param restored on load (we already restore `tocView`/`tocAow`; this completes the chain SP → AoW → HLO → KPI). Enables sharing "report THIS one" links — a real mass-coordination tool. |
| `Read more` on clamped KPI descriptions | Add to our 2-line-clamped cards (tooltip alone fails on long RCT-style texts). |
| Stat framing "KPIS WITH EVIDENCE 0 of 41" at every level | Our banner/tiles already show Reported x/y — extend the same tiles to the **grouped AoW headers** so both views speak the same numbers (coherence requirement below). |
| Traffic-light tooltip honesty ("excludes 3 zero-target KPIs from the %") | Decide and state the zero-target rule in our pct math (today `buildAowBannerStats` counts them in the denominator — they can never complete). → OQ-5 |

**Separate proposals (bigger bets, recorded not scoped):**
| Pattern | Why separate |
|---|---|
| **Per-KPI guided wizard** ("Guide me through this", 4 steps: what this KPI is → where it sits in the workflow → evidence → what you can do now) — role-aware copy | This is the direct answer to "KP / Innovation / Capacity confuses the reporter": a type-aware stepper that explains what counts as evidence for THIS indicator type and lands in the right creation flow. PRMS already ships `GuidedCreationComponent` (path → program → aow → indicator → title → review) — extend it to open **per-KPI** with type-specific guidance instead of building new. → `changes/kpi-guided-reporting` |
| **My Pending Actions** (personal queue landing: "Good morning · 3 results await your action · three moves") | Needs the review-workflow statuses per user role; pairs with the notifications module. → `changes/my-pending-actions` |
| **AI assistant** chat panel with suggested questions | Conversational product of its own (cost, tone, governance). → future proposal |
| Budget column ($ per KPI) | PRMS has no per-indicator budget data — not applicable. |

**Coherence requirement (both views, one language):** the grouped view (`?tocView=aows`) and the By-AOW view must expose the **same stat vocabulary** (KPIs · Reported x/y · Progress %, same zero-target rule) and the same state chips, so drilling SP → AoW → HLO → KPI never changes the numbers' meaning. The competitor gets this right by reusing one AoW card at both levels; ours is the context banner ↔ grouped header pair.

---

## 9. Requirement Delta Preview

### ADDED
- Pending-only filter (both reporting views), persisted for the session.
- Burn-down sort with an explicit catalogue-order fallback.
- Post-save "next pending" navigation (modal-integrated or card-level fallback).
- Session reported/pending counter in the context banner and grouped header.
- Per-KPI **copy link** + `?kpi=<id>` deep-link restore (competitor parity, completes the SP → AoW → HLO → KPI chain).
- **Read more** expansion on clamped KPI descriptions.
- Grouped AoW headers show the same Reported x/y tiles as the By-AOW banner (stat-vocabulary coherence).

### MODIFIED
- Group/KPI ordering default inside the reporting views (catalogue order stays reachable).

### REMOVED
- Nothing.

---

## 10. Approach Options

| | A — Four aids, one Lite/Standard spec (recommended) | B — A + editable table mode | C — Filter + sort only |
|---|---|---|---|
| Value for volume users | High: covers find-next, skip-done, feedback | Highest, but table entry rewrites the save path | Medium: still one-modal-per-KPI |
| Risk | Low: additive UI over existing computeds; the only probe is the modal's save signal | High: new save flow, validation, autosave semantics | Lowest |
| Size | ~300–400 LOC client (+ per-state template LOC — KZ-REH-1) | 3–4× A | ~150 LOC |

## 11. Recommended Approach

**Option A.** The four aids compose one coherent "burn-down session" story, share the same state source (`buildIndicatorCardMeta`), and touch no contract. Aid 3 is the only one with mechanism risk, and it carries its own degraded fallback so it can never sink the spec.

---

## 12. Risks, Dependencies, And Open Questions

**Risks**
- **R1** The legacy report modal has no outputs; hooking "saved" may require observing `EntityAowService` state or the indicator's refreshed numbers — verify against source before requirements (KZ lesson: never assert a component capability unverified).
- **R2** Sorting changes a default users may be used to — mitigated by the explicit sort switch and catalogue fallback.
- **R3** Template LOC: four aids × state variants — budget templates separately (KZ-REH-1).

**Open questions**
- **OQ-1** Duplicate-looking KPI cards (3 × "KPI 3.6.1", identical copy): distinct instances missing their differentiator, or a data/grouping bug? → investigate as `bugfix/duplicate-kpi-cards` before or alongside this spec.
- **OQ-2** What signal marks a successful save in the modal flow? (Drives aid 3's mechanism.)
- **OQ-3** Does "Only pending" also hide In-progress KPIs, or only Complete? (Default proposed: hide Complete only.)
- **OQ-4** Session counter: per AoW, per program, or both?
- **OQ-5** Zero-target KPIs: exclude from Progress % denominators (competitor does, and says so in the tooltip) or keep counting them? Affects `buildAowBannerStats`, `overviewAowProgress` and the new tiles — one rule everywhere.
- **OQ-6** `?kpi=` restore target: scroll+highlight the card, or also auto-open its group?
- **OQ-7** AI narrative backend: what does `api/ai` actually call today (provider, env), and is a text-generation path already exposed or does the spec add one? (Scout running; requirements must cite source.)
- **OQ-8** Narrative scope v1: per AoW only, or also per HLO group? (Recommended v1: per AoW — one button, one prompt, one cost unit.)

## 13. Success Criteria

- A user can list only their remaining KPIs in one click and traverse them without returning to the list between saves (aid 3, at least via the fallback).
- Reporting N KPIs in a row requires ≤ 2 interactions per KPI after the first (open next + save), down from ≥ 4.
- No regression in the grouped table's pinned tests; catalogue order remains one click away.

## 14. Next Step

```text
/akili-specify changes/mass-reporting-flow
```

# Module Spec — `bilateral/project-overview-metrics`

## 1. Module / Feature

- **Module:** `bilateral`
- **Sub-feature:** `project-overview-metrics`
- **Owner:** Santiago Sanchez
- **Status:** draft
- **Ticket(s):** Freshdesk "Replicated innovations for w3/bilat projects" (Nicoleta Trifa, 2026-09-22). No Jira ticket yet (`BIL-POM-OQ-2`).
- **Depth:** **Standard**

---

## 2. Context

The Bilateral Home (`/bilateral/{acronym}/home`, `BilateralProjectsPanelComponent`) lists one card per W3/Bilateral project with a single aggregate — total reported results (`getProjectResultsCount`). The equivalent pooled/Science-Program overview (`result-framework-reporting-card-item.component.ts`) already breaks this down into total / replicated / new-for-review, computed server-side over `Result.is_replicated` and `status_id`.

Nicoleta Trifa (P/A) asked for the same breakdown on bilateral project cards, plus a third metric — count of W1/W2 results where the project is tagged as a contributor — that has **no pooled precedent and no existing data-model link** (confirmed by investigation: `results_by_inititiative`, the contributor mechanism, only accepts Science Program ids; the bilateral module's own "contributing" fields — `SaveBilateralContributorsDto.contributing_bilateral_projects` / `contributing_programs` — link bilateral *results* to projects/programs, never a W1/W2 result back to a bilateral project).

Per the approved proposal (`docs/specs/bilateral/project-overview-metrics/proposal.md`), this spec ships the two metrics with existing data (replicated, new-for-review) and **formally defers the third** (W1/W2 contributor count) pending a product decision on the new data-model relationship it requires (`BIL-POM-OQ-1`).

References: `docs/prd.md` G3 (Bilateral / external consumer reliability), US-D1 · `docs/trd/trd.md` bilateral module section · `docs/ux-ui/design.md` §8 (component rules) · `onecgiar-pr-server/src/api/bilateral/CLAUDE.md` §7.3.1 (contributing mechanisms).

---

## 3. In Scope / Out of Scope

### In scope

- Add `is_replicated` to the `bilateral-center-results` SELECT and response shape.
- Compute, per bilateral project, a **replicated-innovations count** and a **new-results-for-review count** from that data, client-side.
- Render both counts on each bilateral project card (grid view) and table row (list view) in `bilateral-projects-panel`.
- Clicking a count navigates to the Results tab, pre-filtered consistently with the existing `navigateToProjectResults` behavior.

### Out of scope

- **W1/W2 contributor count (metric #3)** — no data-model link exists today; deferred to a follow-up spec once the product decision (`BIL-POM-OQ-1`) is made. This spec ships with only two of the three requested metrics, by design.
- Where/how a project team updates a replicated innovation, and whether it reuses pooled's editing options — explicit non-goal per user direction; separate spec.
- Any change to `bilateral-review`, `result-review-drawer`, or the innovation edit pages (`rd-result-types-pages/innovation-dev-info`, `innovation-use-info`, `rd-annual-updating`).
- Any change to the pooled/Science-Program overview (`result-framework-reporting`).
- Any new backend endpoint — this spec extends the existing `GET bilateral-center-results` response only.

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Center reporting team | Sees replicated / new-for-review counts per project on the Bilateral Home, without opening the Results tab. |
| PMU / P&A reviewer (Nicoleta's team) | Gets the requested visibility into replication progress per bilateral project. |
| Bilateral consumer (downstream) | Unaffected — this spec touches an internal Angular-consumed endpoint, not the `/api/bilateral/*` external contract. |

---

## 5. User Stories

- **`BIL-POM-US-1`** — As a P&A reviewer, I want to see how many innovations a bilateral project has replicated into the current phase, so that I can track replication progress without opening the Results tab.
- **`BIL-POM-US-2`** — As a P&A reviewer, I want to see how many new results a bilateral project has reported for review this phase, so that I can prioritize review workload per project.

Refines: `docs/prd.md` US-D1 (stable downstream reporting), G3.

---

## 6. Functional Requirements

### Required (MUST)

- **`BIL-POM-R-1`** The system MUST include `is_replicated` (boolean) in the response of `GET bilateral-center-results`, sourced from `result.is_replicated`.
- **`BIL-POM-R-2`** The system MUST compute, per `project_id`, a count of results where `is_replicated = true`, restricted to the currently selected phase (`versionId`) — matching how the existing aggregate results count is scoped.
- **`BIL-POM-R-3`** The system MUST compute, per `project_id`, a count of results where `is_replicated = false AND status_id = PENDING_REVIEW (5)` — the "new for review" count.
- **`BIL-POM-R-4`** The system MUST render both counts on every bilateral project card in grid view and every row in list view, on `BilateralProjectsPanelComponent`.
- **`BIL-POM-R-5`** When the user clicks a project's counts, the system MUST navigate to `/bilateral/{acronym}/results` with the same `project`, `phase`, and applicable filter query params `navigateToProjectResults` already sets for the aggregate count.
- **`BIL-POM-R-6`** The counts MUST refresh whenever `refresh()` or a phase change re-fetches `bilateral-center-results` — never stale after a phase switch.

### Should (SHOULD)

- **`BIL-POM-R-10`** The UI SHOULD visually distinguish "replicated" from "new for review" (distinct icon/label per Tailwind-first styling, `docs/ux-ui/design.md` §8), not just two unlabeled numbers.

### Could / Nice-to-have (MAY)

- **`BIL-POM-R-20`** The system MAY show a tooltip explaining "replicated" vs "new for review" the first time a user sees the cards (parity with any similar affordance already used elsewhere; not required for launch).

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | Adding one boolean column to an existing SELECT MUST NOT measurably change `bilateral-center-results` p95 latency (no new join). |
| **Backwards compatibility** | `is_replicated` is an **additive** field on an internal (non-`/api/bilateral/*`) endpoint — no contract doc update required, but confirm no other consumer of `getResultsByBilateralCenter` breaks on the new field. |
| **Accessibility** | New count badges MUST have an `aria-label` stating the full count and meaning (mirrors the existing `bpp_results_badge` pattern), per `docs/ux-ui/design.md` §10. |
| **Internationalization** | All new copy ("replicated", "new for review") MUST go through `src/app/internationalization/` if it differs P22/P25, otherwise plain English is acceptable per existing bilateral panel precedent (the panel today is not fully P22/P25-keyed). |
| **Test coverage** | Client thresholds (50/60/60/60) and server thresholds (5/20/35/40) MUST NOT regress. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `BIL-POM-AC-1` | A bilateral project with 3 results where `is_replicated = true` in the selected phase | The Bilateral Home loads that center/phase | The project's card shows a replicated count of 3. |
| `BIL-POM-AC-2` | A bilateral project with 2 results where `is_replicated = false` and `status_id = 5` (Pending Review) | The Bilateral Home loads | The project's card shows a new-for-review count of 2. |
| `BIL-POM-AC-3` | A bilateral project with a replicated result whose `status_id` is also `5` (re-submitted after replication) | The Bilateral Home loads | That result counts toward "replicated" only, NOT toward "new for review" (mutually exclusive by `BIL-POM-R-2`/`R-3` definition). |
| `BIL-POM-AC-4` | The user is viewing project cards for phase N | The user switches phase to N-1 via the existing phase switcher | Both counts recompute against phase N-1's `bilateral-center-results` response, with no stale phase-N numbers visible. |
| `BIL-POM-AC-5` | A project card shows a replicated count of 3 | The user clicks it | The app navigates to `/bilateral/{acronym}/results` with `project`, `phase` query params set, consistent with clicking the existing aggregate count. |

Cross-cutting project ACs that already apply: `AC-4` (Bilateral / platform-report stability — not applicable here, this endpoint is internal) · `AC-9` (Security and secrets — no new sensitive data exposed).

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- `versioning` module (phase/`versionId` context, already consumed by `bilateral-projects-panel`).
- `result-status.enum.ts` (`PENDING_REVIEW = 5`).

### Downstream consumers

- None new. `BilateralCenterResult` interface consumers other than `bilateral-projects-panel` (e.g. `bilateral-results-list.component.ts`, per its re-export note) gain an optional field; verify none breaks on strict typing.

### Assumptions

- "New for review" is correctly defined as `is_replicated = false AND status_id = PENDING_REVIEW`, per `BIL-POM-R-3` — to be validated against real data during implementation (project convention: verify against real DB rows, not just this ticket's one screenshot), not assumed correct from the mockup alone.
- The phase (`versionId`) already selected by `bilateral-projects-panel`'s `effectiveVersionId` is the correct scope for "current phase" — no new phase-selection UI needed.

---

## 10. Open Questions

- **`BIL-POM-OQ-1`** (blocks a *future* spec, not this one) — For the deferred W1/W2 contributor count: should PRMS add a new data-model relationship allowing a W1/W2 result to explicitly tag a contributing bilateral project (Option B from the proposal), and if so, who sets it (author at submission, or P/A during review)? **Resolution for this spec: deferred — see Out of Scope.**
- **`BIL-POM-OQ-2`** — Should a Jira ticket be opened for this work, or does the Freshdesk ticket remain the record of intent? Does not block design/tasks.
- **`BIL-POM-OQ-3`** — Confirm "new for review" definition (`BIL-POM-R-3`) against real data before shipping (see Assumptions). Does not block design, but blocks the acceptance test for `BIL-POM-AC-2`/`AC-3` being marked done.

---

## 11. Out-of-Band Notes

This spec is the first of what may become a two-part family: this one (metrics #1/#2, no data model change) and a future `bilateral/project-overview-w1w2-contributor` (metric #3, pending `BIL-POM-OQ-1`). No `family.md` is created yet because the second spec is not approved/scoped — create one only if/when that follow-up is greenlit.

---

## Required cross-references

- `docs/prd.md` — G3, US-D1.
- `docs/ux-ui/design.md` — §8 (component rules), §10 (a11y).
- `docs/trd/trd.md` — bilateral module section.
- `onecgiar-pr-server/src/api/bilateral/CLAUDE.md` §7.3.1 — existing contributing mechanisms (why metric #3 has no data source).

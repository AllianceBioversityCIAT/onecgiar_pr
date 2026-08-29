# Proposal: Reporting Entry Hub — one place to find where to report W1/W2 and W3

## 1. Document Control

| Field | Value |
|---|---|
| **Spec Path** | `changes/reporting-entry-hub` |
| **Proposal File** | `docs/specs/changes/reporting-entry-hub/proposal.md` |
| **Type** | Change |
| **Approval Mode** | pre-approved (j.cadavid@cgiar.org, 2026-08-28 — "adelante en YOLO mode": specify + one judgment-day pass with fix-only + execute without routine pauses; practicality mandate: max 1 review round per task, targeted test runs only — never the full client suite) |
| **Slug** | `reporting-entry-hub` — given explicitly as the first token; free text after `—` used as context only |
| **Author** | Claude (Fable 5) with Juan Carlos Cadavid |
| **Date** | 2026-08-28 |
| **Requirement source** | Chat request + 4 screenshots (SP02 overview, AoW progress card, Reporting tab, Bioversity bilateral home). No Jira ticket yet. |
| **Target route** | `/result-framework-reporting/entity-details/:code/overview` (`DashboardLabComponent` → `ProgramOverviewComponent`) |
| **Depends on** | `auth/center-user` (Center User role + `validationCenterPermissions`) — *soft*: the hub degrades to an empty state without it |
| **Parallel-safe** | yes vs. `bilateral/webhook-external-platforms` (server-only, disjoint); **no** vs. any spec editing `program-overview.component.*` or `reporting-program-band.component.*` |

---

## 2. Intent

Give every user **one obvious answer to "where do I report?"** from the Science Program overview: a hub that separates the two reporting paths that exist today — **W1/W2 (program-scoped, by Area of Work)** and **W3 / bilateral (center-scoped, by project)** — and takes the user straight into the correct flow with the right context preselected.

---

## 3. Problem / Current Behavior

Two reporting paths, two mental models, no screen that connects them:

| Path | Scope | Entry today | Gate |
|---|---|---|---|
| **W1/W2** | Program → AoW → indicator | Program header → tab **Reporting** → grouped table `app-reporting-aow-table` | `EntityAowService.canReportResults()` (`entity-aow.service.ts:79-92`) |
| **W3 / bilateral** | Center → bilateral project | Sidebar **My CGIAR Centers** → `/bilateral/:acronym/home` → **Create result** | `validationCenterPermissions` (`RoleByUser.repository.ts:316-346`, role 9) |

Observed pain (screenshots, code):

1. **The overview shows W3 but cannot act on it.** Card 2 "W3 / Bilateral · 34 results" and card 3 "Contributing Centers" only call `setActiveSection('bilateral')` (`program-overview.component.ts:202`) — they filter the dashboard, they do not lead anywhere a result can be created.
2. **No program → center bridge.** The bilateral home already shows each project's allocation chips (`Breeding for Tomorrow 80%`, from `clarisa_project_mappings.allocation`), but from SP02 the user cannot see *which of my centers has projects funding this program*. The relationship exists in data; it has no UI in the program context.
3. **Two identical "Report emerging result" buttons do different things.** Program band → opens the legacy emerging modal (`openReportModal()`, `dashboard-lab.component.ts:576`). Bilateral header → navigates to `/bilateral/:acronym/create`. Same label, different flow, different scope.
4. **Tab naming is ambiguous.** `Overview / Reporting / Results` does not say which tab covers W3. "Reporting" is W1/W2 only; "Results" (`ProgrammeResultsComponent`) lists both.
5. **AoW deep link is broken.** `onOpenAow()` (`dashboard-lab.component.ts:1555-1561`) navigates to `?tocView=aows` and ignores the emitted AoW code, so nothing today opens the Reporting tab positioned on a given AoW.

---

## 4. Proposed Outcome

A **"Where to report" block** at the top of the overview body (above "About this program" or replacing the KPI strip's passive behaviour) with **two lanes**:

| Lane | Shows | Primary action | Empty state |
|---|---|---|---|
| **W1/W2 — Pooled** | Per-AoW progress (reuse `aowStats`) + program-level *Intermediate / 2030 outcomes* row (they are **not** nested under an AoW — `family.md` of `intermediate-outcome-aow-visibility`) | "Report for AoW0x" → Reporting tab with that group **opened** (needs the deep-link fix, item 5 above) | User has no reporting rights on this SP → explain who can report and how to request access |
| **W3 — Bilateral** | *My centers* × *their bilateral projects that allocate to this program*, with the allocation % chip | "Create result" → `/bilateral/:acronym/create` (existing route) with the project preselected when the creator supports it | User has no center association → "Reporting W3 requires a Center User role. Contact PRMSTechSupport…"; user has centers but none funds this SP → "None of your centers has a project allocated to SP0x" + link to center home |

Behaviour-level commitments:

- The block is **phase-aware** (respects the existing `versionId`/phase selector — DD-7) and never introduces a second phase picker.
- Cards 2/3 of the KPI strip become **entries into the lanes**, not just section filters.
- The two "Report emerging result" buttons get **context-specific labels** (product decision recorded in OQ below).
- No new reporting form. The hub routes into existing flows.

---

## 5. Scope

- Client: new hub component under `dashboard-lab/components/` (Tailwind-first, `material-icons-round`, brand tokens — DD-12), mounted in `dashboard-lab.component.html`; wiring of KPI cards 2/3; label change on the band CTA; fix of `onOpenAow()` to carry the AoW code and open the group.
- Server: **one small read endpoint** — bilateral projects for `{centerCodes[] ∈ my centers} × programCode` with allocation %, phase-scoped (join `clarisa_projects.organization_code` ⋈ `clarisa_project_mappings.program_code`, `is_active`, `phase`). Additive, JWT-protected, under `api/results-framework-reporting/*` or `api/bilateral/center/*` — decided in `/akili-specify`.
- Copy through `src/app/internationalization/` (DD-9); a11y per `design.md` §10 (tablist/landmarks, keyboard reachable — verified against source, per KZ lesson `target-tooltip-1`).
- Design canvas (`/design`) with 2–3 layout variants **before** `/akili-specify`.

## 6. Non-Goals

- Changing the bilateral result creator, MDS sections, or the emerging-result modal internals.
- Reworking permissions (`auth/center-user` owns the Center User role).
- Building the reserved per-center dashboards (`/result-framework-reporting/centers`, `/center/:centerCode/report`) — the hub may *link* to them later, not build them.
- Any change to `/api/bilateral/*` public payloads (AC-4).
- A portfolio-level (cross-program) hub — program overview only.

---

## 7. Affected Users, Systems, And Specs

| Persona | Impact |
|---|---|
| **AoW lead / PI** (W1/W2 submitter) | One click from overview into the right AoW group. |
| **Center focal point** (Center User, W3) | Discovers from the program which of their projects fund it; jumps to Create result. |
| **Mixed user** (both roles) | Sees both lanes side by side; the split is explicit instead of learned. |
| **PMU / SP Leader** | Read-only lanes still useful as a "who can report what" map; no new write path. |

Code areas: `dashboard-lab.component.{ts,html}`, `program-overview.component.*`, `reporting-program-band.component.*`, `results-api.service.ts` / `bilateral-api.service.ts`, server `results-framework-reporting` or `bilateral-center` controller + a repository query on `clarisa_projects` / `clarisa_project_mappings`.

Related specs: `auth/center-user` (soft dependency, in flight), archived `reporting/bilateral-centers-overview` (same card family; keep its center grouping), `results/intermediate-outcome-aow-visibility` (program-level outcomes rule), openspec `p2-3001-bilateral-projects-by-program` (existing by-program endpoint without allocation/center filter — extend or supersede, not duplicate).

---

## 8. Visual Reference

- **Source:** Generated design canvas (claude-design, `/design`) — https://claude.ai/code/artifact/ba2dadcc-80da-4f5d-8e4c-d1a89e5882ef
- **Location:** `docs/specs/changes/reporting-entry-hub/mockup/` — `Main.dc.html` (Variant A, **chosen**), `VariantB.dc.html`, `VariantC.dc.html`, `canvas.json` (tradeoff notes), `README.md`.
- **Decision (2026-08-28, owner):** Variant A. Values lifted from `program-overview.component.html` / `reporting-program-band.component.html` (violet `#6b46e5`, border `#e3e3e8`, cards radius 12 / pad 20, tabs 48px, lucide icons, Poppins 12px base). Borrow from B: inline "Report" action on the "Progress by area of work" rows.
- **Scale constraint (owner, 2026-08-28):** a single center can hold ~200 bilateral projects (Alliance: 198). The W3 lane is therefore **search-first**: per-center header with `N of M projects fund SP0x`, a search box (code/name) across my centers' matching projects, a 3-row slice per expanded center (sorted by allocation %, recently used first) and `Show all N`. Never an unbounded inline list.

---

## 9. Requirement Delta Preview

### ADDED
- Overview hub with W1/W2 lane (per AoW + program-level outcomes) and W3 lane (my centers × projects allocated to this SP, with %).
- Endpoint: bilateral projects by *my centers* and program code with allocation, phase-scoped.
- Empty states: no SP reporting rights · no center role · centers without projects on this SP.
- AoW deep link that opens a specific group in the Reporting tab.

### MODIFIED
- KPI cards "W3 / Bilateral" and "Contributing Centers": from section filter to lane entry (filter behaviour preserved as secondary).
- "Report emerging result" label/behaviour differentiated by context (program vs center).
- `onOpenAow()` honours the emitted AoW code.

### REMOVED
- Nothing. (Tab rename, if approved, is a label change, not a route change.)

---

## 10. Approach Options

| | A — Two-lane hub block on Overview (recommended) | B — Make KPI cards actionable + right rail | C — New "Report" tab |
|---|---|---|---|
| Discoverability | High: first thing on the page, both paths named | Medium: relies on users clicking stat cards | High but adds a 4th tab to an already ambiguous set |
| Overview density | Adds one block; can collapse after first use | Lowest footprint | Zero on Overview, but splits "status" from "action" across tabs |
| Effort | Client hub + 1 endpoint + deep-link fix | Same endpoint, less layout | Same + new route/band/tab copy + guide tutorials update |
| Risk | Overview becomes the "everything page" if not bounded | Hidden affordance; W3 empty states hard to place | Naming debt (`Reporting` vs `Report`) gets worse |

## 11. Recommended Approach

**Option A**, bounded: one block, two lanes, no new form, cards 2/3 feed into it, deep-link fix included. It answers the question where users already look (the overview already frames W1/W2 vs W3), reuses `aowStats` and `bilateralCenters()` that the page already computes, and needs exactly one additive read endpoint. Option C is kept as a design variant to compare on the canvas, not as the plan.

---

## 12. Risks, Dependencies, And Open Questions

**Risks**
- **R1** Overview overload — mitigate with a collapsible block and a strict content budget agreed on the canvas.
- **R2** Center identity mismatch: sidebar uses `center_id` = CLARISA *code*; `clarisa_projects.organization_code` is the *institution id*. The new query must map code → institution explicitly (same class of bug as `KZ-OPF-1` bigint-as-string; pin fixtures).
- **R3** `auth/center-user` still in progress — hub ships with the empty state as the default path; do not block on it.
- **R4** Design claims about existing components must be verified against source before `requirements.md` (KZ `target-tooltip-1`, High).
- **R5** Project volume: `GET api/bilateral/center/projects?centerId=` returns every project of a center (~200 for Alliance) and the hub would call it once per center — mitigate with the new SP-filtered endpoint (returns only projects allocating to this SP, all my centers in one call) and a hard cap (OQ-6).

**Dependencies**: `RolesService.getMyCenters()`, `GET api/bilateral/center/projects`, `clarisa_project_mappings`, phase selector (`versionId`).

**Open questions (to close on the canvas / in specify)**
- **OQ-1** Tab naming: keep `Overview / Reporting / Results` or rename to e.g. `Overview / Report W1-W2 / Results`? (IA decision, affects `ReportingGuideService` tutorials.)
- **OQ-2** "Report emerging result" on the program band: stays as emerging-modal launcher with a clearer label, or becomes the hub's W1/W2 CTA?
- **OQ-3** ~~W3 lane granularity~~ **Closed 2026-08-28:** centers as collapsible groups with counts, projects as a searchable 3-row slice + `Show all` (Alliance has 198 projects; density confirmed against real data).
- **OQ-6** Server paging: does the new endpoint return all matching projects for my centers (filtered by SP, typically ≤ 50) and the client searches in memory, or does it page/search server-side? Recommend all-at-once with a hard cap (e.g. 300) and a server-side search fallback only if the cap is hit.
- **OQ-4** Should the bilateral creator accept a `?projectId=` preselect? If not, the W3 CTA lands on center home with the project highlighted.
- **OQ-5** Who sees the W3 lane when they have no center: everyone (educational empty state) or only users with any bilateral history?

---

## 13. Success Criteria

- From any SP overview, a W1/W2 submitter reaches a specific AoW group in ≤ 2 clicks; a Center User reaches "Create result" for a project funding that SP in ≤ 2 clicks.
- 100% of users without a center role see an explanatory empty state, never a dead card.
- New endpoint p95 ≤ 1 s for a user with ≤ 10 centers (QAS-3 class).
- No regression in overview load (`GET_ResultToReview` call count unchanged; new call is lazy per lane).
- `onOpenAow()` deep link covered by a unit test that asserts the AoW code is in the URL.

## 14. Next Step

1. `/design` — canvas with variants A/B/C using the screenshots as reference; export chosen variant to `docs/specs/changes/reporting-entry-hub/mockup/` and close OQ-1..OQ-5.
2. Then:

```text
/akili-specify changes/reporting-entry-hub
```

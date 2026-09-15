# Requirements: Results Center platform reporting guide

## Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/results-center-reporting-guide` |
| **Parent proposal** | [`proposal.md`](./proposal.md) |
| **Module** | `results` / Results Center + `result-framework-reporting` (hub reuse) |
| **Type** | Change |
| **Depth** | Standard |
| **Approval Mode** | gated |
| **Status** | in-review |
| **Depends on** | `changes/results-center-sp-layout` (hero CTA slot — ship layout first or coordinate) |
| **Date** | 2026-09-11 |

---

## 1. Executive Summary

Results Center users can search and export results but have **no platform-level guidance** on *where to start reporting* (W1/W2 pooled funding via Science Programs, W3 bilateral via Centers, or emerging results). The SP shell already ships a **Where to report** modal scoped to one program; this spec adds a **platform guide** on Results Center that explains the three paths, adapts to the user's SP/Center associations, and routes into existing reporting flows without duplicating create logic.

---

## 2. Glossary

| Term | Definition |
|---|---|
| **Platform guide** | RC modal that orients users across W1/W2, W3, and Emerging before (or while) selecting a Science Program. |
| **SP hub** | Existing `ReportingEntryHubComponent` inside `WhereToReportModalComponent` — AoW rows, W3 accordion, emerging card. |
| **SP access** | User has ≥1 initiative in `myInitiativesListReportingByPortfolio` OR is platform admin. |
| **Center access** | `rolesSE.getMyCenters().length > 0`. |
| **Guide-only mode** | Modal state when user lacks SP access (non-admin): educational lanes, no AoW fetch. |
| **Program picker** | Compact list when user has 2+ SP associations; auto-skip when exactly one. |

---

## 3. System Context & Scope

### 3.1 PRD alignment

- Refines submitter onboarding and discoverability (`docs/prd.md` — result reporting flow, portfolio personas).
- UX tokens and modal patterns: `docs/ux-ui/design.md` §7–§8.
- Client-only; no TRD API changes.

### 3.2 In scope

- **Where to report** CTA on Results Center hero (alongside Update result).
- Platform guide modal with persona branching.
- Program picker (when needed) + embed/reuse SP `WhereToReportModalComponent`.
- Guide-only lanes when user has no SP access.
- Deep links into SP reporting (`entity-details/{code}` + existing query params).
- Scoped Jest for persona service and RC wiring.

### 3.3 Out of scope

- Replacing or modifying SP band **Where to report** behavior.
- New backend endpoints.
- Creating results directly from Results Center.
- i18n.
- Smart back navigation from SP back to RC (future; v1 omits `returnTab`).

---

## 4. Stakeholders / Personas

| Persona | What changes |
|---|---|
| **Result submitter (SP + Center)** | Opens guide from RC → picks SP (if many) → uses familiar hub to report. |
| **Submitter (SP only)** | W1/W2 + emerging actionable; W3 shows **no-centers** + Request access. |
| **Center user, no SP** | Sees W3 explainer + center context; W1/W2 explains SP membership required. |
| **No associations** | Guide-only copy + access links; no misleading disabled Report rows. |
| **Platform admin** | Picker includes full SP catalog (my + other programs). |

---

## 5. User Stories

- **RCG-US-1** — As a **result submitter on Results Center**, I want a **Where to report** guide, so that I understand W1/W2 vs W3 vs emerging before navigating away.
- **RCG-US-2** — As a **submitter without a Center role**, I want a clear W3 empty state with **Request access**, so that I know why bilateral reporting is unavailable.
- **RCG-US-3** — As a **submitter without SP access**, I want guidance on how to get program membership, so that I am not faced with empty or disabled AoW lists.
- **RCG-US-4** — As a **submitter with multiple programs**, I want to pick my Science Program once, so that the hub shows the correct AoW and W3 data.

---

## 6. Functional Requirements

### RCG-R-1 — Entry point on Results Center

The system **SHALL** expose a **Where to report** control on the Results Center hero that opens the platform guide modal.

#### Scenario: Open guide from RC

- GIVEN the user is on `/result/results-outlet/results-list`
- WHEN they activate **Where to report**
- THEN a modal opens with title **Where to report** and the hub subtitle from `HUB_COPY`
- AND focus is trapped in the modal until closed
- AND Escape closes the modal

---

### RCG-R-2 — Explain three reporting paths

The guide **SHALL** present W1/W2 (pooled), W3 (bilateral), and Emerging results using the same lane structure and terminology as the SP hub (`hub-copy.ts`).

#### Scenario: Visual parity

- GIVEN the guide is open in hub mode for a selected program
- WHEN the user views the modal body
- THEN they see two primary lanes (W1/W2 · W3) and the emerging card pattern matching SP modal layout
- BUT the SP band modal opened from a program shell **MUST NOT** change behavior (regression-free)

---

### RCG-R-3 — Persona detection

The system **SHALL** compute access flags:

| Flag | Rule |
|---|---|
| `hasSpAccess` | `myInitiativesListReportingByPortfolio.length > 0` OR `rolesSE.isAdmin` |
| `hasCenterAccess` | `getMyCenters().length > 0` |
| `spChoices` | Reporting initiatives for normal users; my + other Science Programs for admin |

#### Scenario: Flags drive modal mode

- GIVEN a signed-in user
- WHEN the guide opens
- THEN the modal mode is one of: `guide-only` | `pick-program` | `hub`
- AND `guide-only` is selected when `hasSpAccess` is false
- AND `pick-program` when `hasSpAccess` and `spChoices.length > 1`
- AND `hub` when `hasSpAccess` and `spChoices.length === 1` (auto-selected)

---

### RCG-R-4 — W3 lane without Center role

When the user has **no Center access**, the W3 lane **SHALL** show the existing **`no-centers`** empty state (body text + **Request access** mailto from `HUB_COPY`) — not a loading skeleton indefinitely and not an empty accordion.

#### Scenario: SP user, no center

- GIVEN the user has SP access and hub mode for program `SP01`
- AND `getMyCenters()` returns `[]`
- WHEN the W3 lane renders
- THEN status is `no-centers` with `copy.w3.noCentersBody` and Request access link
- BUT IT MUST NOT show a project search field or center accordion

---

### RCG-R-5 — W1/W2 lane without SP access

When the user has **no SP access** and is **not admin**, the W1/W2 lane **SHALL** show **guide-only** copy explaining pooled funding and how to obtain program access — **not** disabled AoW Report buttons on an empty list.

#### Scenario: No SP association

- GIVEN `hasSpAccess` is false
- WHEN the guide opens in `guide-only` mode
- THEN the W1/W2 lane shows platform explainer text and a link to Science Programs portfolio (`/result-framework-reporting`) or program-admin contact guidance
- BUT IT MUST NOT fetch `GET_ScienceProgramTocProgress` or render AoW rows

---

### RCG-R-6 — Center access without SP (resolved OQ-1)

When the user has **Center access** but **no SP access**, the W3 lane **SHALL** explain that bilateral projects are shown **in the context of a Science Program** and direct the user to obtain SP access or browse Science Programs — **not** fetch W3 projects without a `programCode`.

#### Scenario: Center only

- GIVEN `hasCenterAccess` is true and `hasSpAccess` is false
- WHEN the guide opens
- THEN W3 shows guide copy naming the user's center count (if > 0) and explaining SP membership is required to list mapped projects
- AND a navigation affordance to Science Programs home is visible

---

### RCG-R-7 — Program selection and hub embed

When the user has SP access, the guide **SHALL** embed the existing `WhereToReportModalComponent` / hub once `programCode` is selected, reusing fetch and Report navigation logic.

#### Scenario: Single program auto-select

- GIVEN the user has exactly one entry in `spChoices`
- WHEN the guide opens
- THEN `programCode` is set automatically and the hub loads AoW + W3 for that code
- AND the user reaches an actionable Report control in ≤2 clicks from RC (open guide → Report on an AoW)

#### Scenario: Multi-program picker

- GIVEN `spChoices.length > 1`
- WHEN the guide opens
- THEN a program picker is shown first
- AND selecting a program transitions to hub mode without closing the modal

---

### RCG-R-8 — Reporting rights and emerging

Report actions **SHALL** respect existing gates:

- W1/W2 Report enabled only when `EntityAowService.canReportResults()` is true for the selected `programCode` (service primed with `entityId` before check).
- Emerging hidden/disabled for Avisa initiatives (`isAvisaInitiative`) same as SP modal.
- Emerging navigates with `reportEmerging=true` query param; **no** `returnTab` in v1.

#### Scenario: No reporting rights on program

- GIVEN hub mode for a program the user belongs to but `canReportResults()` is false
- WHEN the user hovers a W1/W2 Report button
- THEN the existing `noRightsTooltip` from `HUB_COPY` is shown
- AND the button is visually disabled (same as SP modal)

---

### RCG-R-9 — Deep links

Navigation from hub actions **SHALL** use existing routes:

- AoW → `/result-framework-reporting/entity-details/{code}?tocView=byAow&tocAow={aow}`
- Program level → `tocView=aows`
- Emerging → `reportEmerging=true`

No duplicate result-creation logic on Results Center.

---

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| **RCG-NFR-1** | Modal a11y: `role="dialog"`, labelled title, focus trap, Escape dismiss — match `WhereToReportModalComponent`. |
| **RCG-NFR-2** | Reuse `HUB_COPY` / `hub-copy.ts` for W3 empty state and shared strings; platform-only strings in `platform-guide-copy.ts`. |
| **RCG-NFR-3** | No new global CSS classes; `:host` / component SCSS or Tailwind arbitrary px in new component only. |
| **RCG-NFR-4** | Scoped Jest only; never full client suite in CI agent runs. |

---

## 8. UI States (Design Impact)

| State | Requirement |
|---|---|
| **Loading** | Hub loading skeletons for W1/W2 and W3 while fetching (reuse hub signals). |
| **Guide-only** | Static lanes; no spinners for unavailable data. |
| **Picker** | List of SP names/codes; loading if admin catalog fetch pending. |
| **Error** | W3 error lane with Retry (existing hub behavior). |
| **Empty W3 no-centers** | RCG-R-4. |
| **Responsive** | Modal `max-w-[90vw]`; lanes stack ≤1279px (hub grid already does). |

---

## 9. Defect Classes & Verification Gates

| Defect class | Gate | Substitute if no automation |
|---|---|---|
| Wrong persona mode (guide vs hub) | Jest on `PlatformReportingGuideService` / facade | — |
| W3 shows blank instead of no-centers | Jest on hub embed with `myCentersCount: 0` | HITL: user without center role |
| AoW fetch when no SP access | Jest asserts no `GET_ScienceProgramTocProgress` call in guide-only | — |
| SP modal regression | Scoped `where-to-report-modal.component.spec.ts` unchanged/passing | — |
| Visual drift from SP modal | No automated layout diff | **HITL** side-by-side RC vs SP01 at ≥900px |
| a11y (focus trap) | Partial — unit tests for open/close state | **HITL** keyboard-only smoke |

---

## 10. Assumptions & Resolved Open Questions

| ID | Resolution |
|---|---|
| **OQ-1** | Center, no SP → W3 guide copy; no W3 API without `programCode`. |
| **OQ-2** | Admin picker uses my + other Science Programs from `GET_ScienceProgramsProgress`. |
| **OQ-3** | CTA on RC **hero** next to Update result. |
| **OQ-5** | Omit `returnTab` when navigating from RC guide in v1. |

---

## 11. Requirement ID Index

| ID | Summary |
|---|---|
| RCG-R-1 | RC hero CTA opens guide |
| RCG-R-2 | Three-path explainer / SP visual parity |
| RCG-R-3 | Persona flags and modal modes |
| RCG-R-4 | W3 no-centers empty state |
| RCG-R-5 | W1/W2 guide-only without SP |
| RCG-R-6 | Center-only W3 explainer |
| RCG-R-7 | Program picker + hub embed |
| RCG-R-8 | canReport + Avisa emerging gates |
| RCG-R-9 | Deep links via existing routes |
| RCG-NFR-1..4 | a11y, copy reuse, styling, scoped tests |

---

## 12. Acceptance Criteria Index

| ID | Maps to |
|---|---|
| **RCG-AC-1** | RCG-R-1 scenario |
| **RCG-AC-2** | RCG-R-4 scenario |
| **RCG-AC-3** | RCG-R-5 scenario |
| **RCG-AC-4** | RCG-R-7 single-SP scenario |
| **RCG-AC-5** | RCG-R-6 scenario |

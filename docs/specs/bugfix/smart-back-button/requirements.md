# Module Spec: `bugfix/smart-back-button` — Requirements

Lite · Bug Mode. Source of truth: `proposal.md` Bug Diagnosis.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/smart-back-button` |
| Module | Result Framework Reporting (program shell) |
| Sub-feature | Smart Back destination + label |
| Type | Bug |
| Depth | Lite |
| Approval Mode | gated |
| Status | approved |
| Ticket | none |
| Baseline | `US-S1` (`docs/prd.md`); IA Results Framework Reporting (`docs/ux-ui/design.md` §2); `W1` (`docs/trd/trd.md`) |
| Related | Archived Submitter / indicator back-links (hierarchical return, not `history.back()`); `KZ-changes--kp-report-modal-auto-create-1` |
| Live surface | Program-band Back on Overview / Reporting / Results. Resolver is shared with the bilateral header. |

## 2. Executive Summary

From a Science Program shell, Back MUST leave the program and open the last **catalog** (Science programs, Portfolio overview, or Results list). It MUST NOT send the user to another Science Program they opened in the sidebar, and a second click MUST NOT bounce them back.

## 3. Glossary

| Term | Meaning |
|---|---|
| Program shell | Overview, Reporting, or Results for one SP (`/entity-details/:code…`) |
| Catalog | Home (`/result-framework-reporting/home`), Portfolio overview, or Results Center list |
| Sibling SP | Any other `/entity-details/…` URL (sidebar hop) |

## 4. System Context & Scope

**In scope:** Back label and destination on the program shell; no ping-pong after that click; keep catalog, drill-down, and Center-back behavior.

**Out of scope:** Restyling the button; `history.back()` as the only return; Result Detail Submitter / AOW / Back to results; Galaxy hub Back; i18n; new tokens.

Refines `US-S1`. No API / payload change (`AC-4` N/A).

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Result submitter / SP focal | Back exits to the catalog instead of looping SPs |
| QA / PMU | Same chrome when they open a program |

## 6. Functional Requirements

### SBB-R-1 — Shell Back exits to a catalog

On the program shell the system MUST resolve Back to the last catalog in session history, skipping every sibling `/entity-details/` URL. If no catalog is in history, it MUST fall back to Science programs home.

#### Scenario: Sidebar hop SP08 → SP01 → Overview (failing case)

- GIVEN the user opened Science programs home, then SP08, then SP01, then Overview
- WHEN they read or click Back on SP01 Overview
- THEN the label is **Back to Science programs**
- AND the destination is `/result-framework-reporting/home`
- BUT it must NOT label the control **Back** or point at SP08 (or any `/entity-details/` URL)
- AND IT MUST still say **Back to Portfolio overview** / **Back to Results list** when that catalog was the entry (not home)

#### Scenario: Direct land / refresh

- GIVEN history contains only the current program-shell URL
- WHEN Back is resolved
- THEN label and destination are Science programs home

### SBB-R-2 — Back must not ping-pong

After the user follows a shell Back, a second Back MUST NOT return them to the program they just left.

#### Scenario: Second click after a sibling hop

- GIVEN the failing case in SBB-R-1
- WHEN they click Back and then click Back again on the landing surface
- THEN they remain on the catalog (or that catalog’s own parent)
- BUT it must NOT navigate back to SP01
- AND IT MUST leave By-AOW drill-down Back (Overview / all Areas of Work) unchanged

### SBB-R-3 — Center and drill-down Back stay as specified

Center create/detail/shell Back MUST keep today’s named destinations. A hop **Center → SP** MUST keep **Back to Bilateral results**. Same-program tab switches MUST still skip internals and exit to the catalog.

#### Scenario: Center then Science Program

- GIVEN the user opened a Center surface, then a Science Program shell
- WHEN Back is resolved on that shell
- THEN the label is **Back to Bilateral results**
- AND the destination is that Center (or Centers) URL
- BUT it must NOT drop that hop to generic **Back** or force home

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Compatibility | Existing catalog / drill-down / Center cases in `smart-navigation.service.spec.ts` MUST stay green |
| Security | No new endpoints, auth, or logging of tokens |
| A11y | Existing `aria-label` stays bound to the resolved label |
| i18n | No new strings this spec; keep current English labels |

## 8. Defect Classes and Gates

| Defect class | Gate |
|---|---|
| Sibling SP as destination / generic **Back** | Jest: `getBackTarget` after home → SP08 → SP01/overview |
| Ping-pong after `back()` | Jest: `back()` then resolve again; destination is not the left SP |
| Catalog / drill-down / Center regression | Existing specs in the same file MUST stay green; SBB-R-3 scenario added |
| Band still paints **Back** on the live page | Jest proves the resolver string. jsdom cannot prove the painted band. **Substitute:** HITL glance on Overview after a sidebar hop, or accept the resolver test as the Lite gate (accepted risk) |

A passing suite that never builds the sibling-SP history is **not** a gate for SBB-R-1.

## 9. Requirement ID Index

| ID | Strength | Scenario owned by |
|---|---|---|
| SBB-R-1 | MUST | SBB-T-1 (red) + SBB-T-2 (green); direct land = existing spec |
| SBB-R-2 | MUST | SBB-T-1 (red) + SBB-T-2 (green) |
| SBB-R-3 | MUST | SBB-T-1 adds Center → SP; SBB-T-2 keeps tabs / drill-down green |

## 10. Dependencies & Assumptions

- No server or route-table change.
- **SBB-A-1:** Center → SP keeps **Back to Bilateral results** (proposal OQ, recommended yes).
- Live control is the program band, not `entity-details.component` (`KZ-changes--kp-report-modal-auto-create-1`).

## 11. Open Questions

None blocking. SBB-A-1 records the Center → SP choice.

## 12. Out-of-Band Notes

Regression test MUST go red on current code (sibling hop returns `{ label: 'Back', url: …/SP08… }`) and green after the fix.

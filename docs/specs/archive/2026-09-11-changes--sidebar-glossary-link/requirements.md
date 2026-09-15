# Requirements: Glossary link in Reporting sidebar EXTRAS

## Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/sidebar-glossary-link` |
| **Parent proposal** | [`proposal.md`](./proposal.md) |
| **Module** | `result-framework-reporting` / shared navigation |
| **Type** | Change |
| **Depth** | Lite |
| **Approval Mode** | gated |
| **Status** | shipped |
| **Ticket(s)** | P2-3145 |
| **Date** | 2026-09-11 |

---

## 1. Executive Summary

Add a **Glossary** entry as the **first item** in the Reporting sidebar **EXTRAS** group so users can open the centralized CLARISA glossary without scrolling to the page footer. Reuse the canonical URL already established for the footer (P2-3145). No backend, API, or data-model changes.

---

## 2. Glossary

| Term | Definition |
|---|---|
| **EXTRAS** | Bottom section of `reporting-nav-sidebar` (Release notes, Notifications, Text size today). |
| **CLARISA glossary** | Public CGIAR reporting terminology at `https://clarisa.cgiar.org/landing-page/glossary`. |
| **Collapsed rail** | Sidebar icon-only mode; items expose labels via `tooltip` on `hlmSidebarMenuButton`. |

---

## 3. System Context & Scope

### In scope

- New Glossary row in EXTRAS (first position).
- External link opens CLARISA glossary in a new tab.
- Shared URL constant consumed by footer + sidebar.
- Unit tests for sidebar (and footer if constant extracted).

### Out of scope

- In-app glossary embed (iframe/drawer).
- Removing or changing the footer link label (“Glossary of Terms”).
- CLARISA panel documentation URL as primary destination.
- Field-tooltip deep links, empty-state CTAs, AI assistant changes.

### PRD / UX alignment

- **`docs/prd.md` G1 (Quality reporting):** Reduces friction when users encounter domain jargon during reporting.
- **`docs/ux-ui/design.md` §8 (Components):** Reuse existing Spartan sidebar menu button pattern and tokens.

---

## 4. Stakeholders / Personas

| Persona | Benefit |
|---|---|
| Result submitter | One-click glossary while filling forms |
| QA reviewer | Quick term lookup during review |
| Portfolio lead | Same shortcut during consolidation workflows |

---

## 5. Functional Requirements

### SGL-R-1: Glossary is first in EXTRAS

The Reporting sidebar EXTRAS group SHALL include a **Glossary** menu item as its **first** entry, before Release notes.

#### Scenario: Expanded sidebar

- GIVEN the sidebar is expanded
- WHEN the user views the EXTRAS section
- THEN **Glossary** appears above **Release notes**
- AND it uses the same `hlmSidebarMenuButton` styling as sibling EXTRAS items
- AND it displays the label **Glossary** with a book icon (`lucideBookOpen`)

#### Scenario: Collapsed sidebar

- GIVEN the sidebar is collapsed to the icon rail
- WHEN the user focuses or hovers the Glossary control
- THEN the accessible name / tooltip reads **Glossary**
- BUT it must NOT require a flyout panel (same pattern as Release notes)

---

### SGL-R-2: External link to CLARISA glossary

Activating Glossary SHALL open the CLARISA public glossary in a new browser tab.

#### Scenario: Click opens canonical URL

- GIVEN any authenticated Reporting page with the sidebar visible
- WHEN the user activates the Glossary item
- THEN the browser navigates to `https://clarisa.cgiar.org/landing-page/glossary`
- AND the link uses `target="_blank"` and `rel="noopener noreferrer"`
- AND IT MUST use the same URL constant as the footer glossary link (P2-3145)
- BUT it must NOT use an in-app `routerLink`

---

### SGL-R-3: No regression to existing EXTRAS

Existing EXTRAS behaviors SHALL remain unchanged.

#### Scenario: Sibling items still work

- GIVEN the Glossary item is added
- WHEN the user uses Release notes, Notifications, or Text size
- THEN each item behaves as before
- AND the notifications badge logic is unchanged
- AND the font-scale overlay still opens from Text size

---

## 6. Non-Functional Requirements

### SGL-NFR-1: Single source of truth for glossary URL

The CLARISA glossary URL SHALL live in one shared client constant; footer and sidebar MUST import it (not duplicate string literals).

### SGL-NFR-2: Accessibility

The Glossary control SHALL be a native anchor (`<a>`) with discernible name “Glossary” and safe external-link attributes.

---

## 7. Defect Classes & Verification Gates

| Defect class | How it is caught |
|---|---|
| Wrong or duplicated URL | Unit test asserts `href` on sidebar + footer against shared constant |
| Wrong menu order | Unit test asserts Glossary precedes Release notes in EXTRAS markup |
| Broken collapsed access | Template test asserts `tooltip="Glossary"` on the anchor |
| Regressed EXTRAS siblings | Existing sidebar spec suites still pass (scoped run) |
| Visual mismatch with EXTRAS rows | **Accepted risk (Lite)** — no automated layout gate; manual spot-check against user screenshot at HITL |

**Verification command (scoped):**

```bash
cd onecgiar-pr-client && npm run test -- --testPathPattern="reporting-nav-sidebar.component.spec|footer.component.spec|clarisa-links.constants.spec"
```

---

## 8. Requirement ID Index

| ID | Summary |
|---|---|
| SGL-R-1 | Glossary first in EXTRAS (expanded + collapsed) |
| SGL-R-2 | External CLARISA link (new tab, shared URL) |
| SGL-R-3 | No EXTRAS regression |
| SGL-NFR-1 | Shared URL constant |
| SGL-NFR-2 | a11y external link |

---

## 9. Open Questions (resolved for spec)

| ID | Resolution |
|---|---|
| OQ-1 Canonical URL | **Landing page** — matches P2-3145 and footer |
| OQ-2 Label | Sidebar: **Glossary**; footer keeps **Glossary of Terms** |
| OQ-3 Duplicate entry points | Intentional — sidebar + footer both remain |

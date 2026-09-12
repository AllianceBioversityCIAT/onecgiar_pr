# Proposal — Glossary link in Reporting sidebar EXTRAS

## Document Control

| Field | Value |
|---|---|
| **Spec path** | `changes/sidebar-glossary-link` |
| **Slug** | `sidebar-glossary-link` — derived from user intent (Glossary entry in vertical sidebar EXTRAS) |
| **Type** | Change |
| **Approval Mode** | gated |
| **Status** | shipped |
| **Author** | AKILI propose (2026-09-11) |
| **Depends on** | none |
| **Parallel-safe** | yes |
| **Ticket(s)** | P2-3145 (existing footer glossary link — same destination) |

---

## Intent

Add a **Glossary** entry at the **top of the EXTRAS** section in the Reporting vertical sidebar so users can open the centralized CLARISA glossary without scrolling to the page footer. Align with the screenshot provided by the product owner and reuse the canonical URL already established in the footer (P2-3145).

---

## Problem / Current Behavior

- The official CGIAR reporting glossary lives on CLARISA (`https://clarisa.cgiar.org/landing-page/glossary`).
- PRMS already links to it from the **page footer** (`footer.component.ts`, label “Glossary of Terms”) and the **AI assistant** can look up terms from the same source.
- The **primary navigation sidebar** (`reporting-nav-sidebar`) EXTRAS block lists only Release notes, Notifications, and Text size — no glossary shortcut.
- Users reporting results encounter domain jargon (AoW, HLO, KCR, indicator tiers, etc.) throughout the app; the sidebar is always visible during reporting workflows, but the glossary is not.

---

## Proposed Outcome

| Surface | Behavior |
|---|---|
| Sidebar EXTRAS (expanded) | New first item: **Glossary** with book icon, opens CLARISA glossary in a new tab |
| Sidebar EXTRAS (collapsed rail) | Same item as icon-only with tooltip “Glossary” |
| URL | `https://clarisa.cgiar.org/landing-page/glossary` (same as footer / P2-3145) |
| Accessibility | External link: `target="_blank"` + `rel="noopener noreferrer"`; tooltip/label “Glossary” |

---

## Scope

**In scope (this change)**

1. Add Glossary as the **first** item under EXTRAS in `reporting-nav-sidebar.component.html`.
2. Wire icon (`lucideBookOpen` — already registered in the component) and external href.
3. Unit test(s) in `reporting-nav-sidebar.component.spec.ts` asserting presence, order (before Release notes), href, and `target="_blank"`.
4. Optional thin refactor: extract glossary URL to a shared constant (e.g. `clarisa-links.constants.ts`) consumed by footer + sidebar to avoid drift.

**Explicitly out of scope (follow-up specs if desired)**

- Embedding glossary content inside PRMS (iframe/drawer).
- Deep-linking individual field tooltips to CLARISA term anchors (requires CLARISA anchor map audit).
- Replacing or removing the footer link (keep both — different discoverability paths).
- Using the secondary CLARISA panel URL as the primary destination (see Open Questions).

---

## Non-Goals

- Building or syncing an in-app glossary database.
- Changing AI assistant glossary lookup behavior.
- i18n of the CLARISA destination (CLARISA owns content language).
- Adding glossary to legacy sidebars outside the Reporting Spartan sidebar.

---

## Affected Users, Systems, And Specs

| Actor / system | Impact |
|---|---|
| Result submitters, QA reviewers, portfolio leads | Faster access to term definitions while reporting |
| `reporting-nav-sidebar` | New EXTRAS menu item |
| `footer.component` | Possible shared URL constant only |
| `docs/ux-ui/design.md` §8 sidebar | Minor deviation — EXTRAS grows beyond original three items (already documented in `DESIGN-DEVIATIONS.md` for Release notes / Notifications) |
| P2-3145 | Same canonical URL; sidebar is an additional entry point |

**Existing glossary touchpoints (unchanged by default)**

| Location | Role today |
|---|---|
| Footer → “Glossary of Terms” | Persistent page-level link |
| AI assistant tool | Conversational term lookup |
| `pr-field-header` tooltips | Can include inline `<a>` links in HTML tooltips (pattern exists in Cypress specs) |
| `result-framework-reporting/README.md` §2 | **Developer** concept glossary — not user-facing |

---

## Visual Reference

- **Source:** User screenshot (sidebar EXTRAS with Glossary above Release notes).
- **Location:** `/Users/jcadavid/.cursor/projects/Users-jcadavid-orca-workspaces-onecgiar-pr-qa-development-2026/assets/image-1789161630486-0.jpg`
- **Notes:** Match existing EXTRAS row styling (`hlmSidebarMenuButton`, icon + label, collapsed tooltip). No Figma provided; follow Spartan sidebar tokens already in use.

---

## Requirement Delta Preview

### ADDED Requirements

- **SGL-R-1:** The Reporting sidebar EXTRAS group SHALL include a **Glossary** item as its first entry.
- **SGL-R-2:** Activating Glossary SHALL open `https://clarisa.cgiar.org/landing-page/glossary` in a new browser tab with `rel="noopener noreferrer"`.
- **SGL-R-3:** In collapsed sidebar mode, Glossary SHALL remain reachable via the icon rail with an accessible name/tooltip “Glossary”.

### MODIFIED Requirements

- None (additive navigation only).

### REMOVED Requirements

- None.

---

## Approach Options

| Option | Description | Pros | Cons |
|---|---|---|---|
| **A — Sidebar-only, inline URL** | Copy footer URL string into sidebar template/component | Smallest diff (~15 lines) | Two places to update if URL changes |
| **B — Shared constant + sidebar** (recommended) | Extract `CLARISA_GLOSSARY_URL` to `shared/constants/`; footer + sidebar import it | Single source of truth; matches P2-3145 intent | Slightly wider diff (footer + sidebar + 2 specs) |
| **C — In-app glossary panel** | Slide-over or iframe embedding CLARISA | Keeps user in-app | Cross-origin, auth, a11y, maintenance; contradicts CLARISA-as-source-of-truth |

---

## Recommended Approach

**Option B** — shared constant + sidebar entry. Implementation is still a small change (~30–40 lines including tests) but prevents the footer and sidebar from diverging. Use `<a hlmSidebarMenuButton>` (not `routerLink`) for the external URL. Place the new `<li>` **before** Release notes in `reporting-nav-sidebar.component.html` (~line 383).

**Future reuse map** (not in this spec — candidates for later `/akili-propose` chunks):

1. **Field tooltips** — audit high-traffic labels (result level, indicator type, bilateral status) and add glossary deep links where CLARISA exposes stable anchors.
2. **Empty states / onboarding** — “New to reporting?” CTA linking to glossary (e.g. programme Results empty state).
3. **Complex drawers** — contextual “What does this mean?” link in bilateral review / report-result drawers.
4. **Help menu / top bar** — only if analytics show sidebar still insufficient.

---

## Risks, Dependencies, And Open Questions

| Risk / question | Mitigation |
|---|---|
| **OQ-1:** User supplied two URLs — landing page vs CLARISA panel doc path. Which is canonical for sidebar? | **Recommend landing page** — matches P2-3145, footer, and public UX. Panel doc URL may be maintainer-oriented; confirm with PO. |
| **OQ-2:** Label “Glossary” vs footer “Glossary of Terms” | Sidebar space favors short label per screenshot; footer can stay verbose. |
| **OQ-3:** Duplicate entry points (sidebar + footer) | Intentional — different mental models; no removal unless analytics show redundancy. |
| External site availability | Same as today for footer link; no PRMS fallback required. |
| Collapsed flyout | EXTRAS items use tooltips on rail — no flyout panel needed (unlike PLATFORM groups). |

---

## Success Criteria

1. Glossary appears **first** in EXTRAS, visually consistent with Release notes / Notifications / Text size.
2. Click opens CLARISA glossary in new tab; href matches footer constant.
3. Collapsed sidebar shows book icon with “Glossary” tooltip.
4. Scoped unit tests pass for `reporting-nav-sidebar.component.spec.ts` (and footer spec if constant extracted).
5. No regression to existing EXTRAS behaviors (notifications badge, font scale overlay, release notes route).

---

## Next Step

After approval:

```text
/akili-specify changes/sidebar-glossary-link
```

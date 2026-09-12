# Design: Glossary link in Reporting sidebar EXTRAS

## Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/sidebar-glossary-link` |
| **Requirements** | [`requirements.md`](./requirements.md) |
| **Depth** | Lite |
| **Status** | shipped |
| **Date** | 2026-09-11 |

---

## 1. Summary

Add one external navigation row to the Spartan Reporting sidebar and centralize the CLARISA glossary URL in a shared constant. **Client-only** change; no server, migration, or API work. Matches existing EXTRAS patterns (Release notes row structure, external link pattern from footer).

---

## 2. Architecture Overview

### 2.1 Where this lives

| Layer | Touch |
|---|---|
| **Client** | `reporting-nav-sidebar`, `footer`, new `clarisa-links.constants` |
| **Server** | none |
| **External** | CLARISA public glossary (HTTPS, no auth) |

### 2.2 Interaction flow

```
[User clicks Glossary in sidebar EXTRAS]
  └── <a href={CLARISA_GLOSSARY_URL} target="_blank">
        └── Browser opens CLARISA landing-page/glossary (new tab)
```

PRMS does not proxy or embed CLARISA content.

---

## 3. Data Model Changes

None.

---

## 4. API Design

None.

---

## 5. Backend Module Design

Not applicable.

---

## 6. Frontend / UX Component Architecture

### 6.1 Shared constant

| Artifact | Path | Purpose |
|---|---|---|
| `CLARISA_GLOSSARY_URL` | `onecgiar-pr-client/src/app/shared/constants/clarisa-links.constants.ts` | Single public glossary URL (P2-3145) |

Rationale (from existing `footer.component.ts` comment): URL is public, identical in every environment, and must not depend on gitignored `environment.footerUrls`.

Optional co-located spec: `clarisa-links.constants.spec.ts` exporting the expected string (minimal).

### 6.2 Footer refactor

| File | Change |
|---|---|
| `footer.component.ts` | Replace inline `glossary` string with import of `CLARISA_GLOSSARY_URL` |
| `footer.component.html` | Bind `[href]` to imported constant (via component field or direct template access) |
| `footer.component.spec.ts` | Assert href still matches constant (existing P2-3145 test updated if needed) |

Footer label **Glossary of Terms** unchanged.

### 6.3 Sidebar EXTRAS row

| File | Change |
|---|---|
| `reporting-nav-sidebar.component.ts` | Expose `readonly clarisaGlossaryUrl = CLARISA_GLOSSARY_URL` (or similar) for template binding |
| `reporting-nav-sidebar.component.html` | Insert new `<li hlmSidebarMenuItem>` **before** Release notes |

Row contract:

- Element: `<a hlmSidebarMenuButton>` (not `routerLink`)
- `href`: shared constant
- `target="_blank"`, `rel="noopener noreferrer"`
- `tooltip="Glossary"`
- Icon: `lucideBookOpen` (already registered in component `provideIcons`)
- Label: `<span>Glossary</span>`

No SCSS changes expected — existing EXTRAS group styles apply.

### 6.4 Visual / tokens

Follow existing EXTRAS items per user screenshot and `docs/ux-ui/design.md` §8 sidebar patterns. No new design tokens.

---

## 7. Shared Contracts

| Symbol | Value |
|---|---|
| `CLARISA_GLOSSARY_URL` | `https://clarisa.cgiar.org/landing-page/glossary` |

---

## 8. Design Decisions

### SGL-DD-1: Shared constant over inline duplicate (supersedes footer inline only)

**Decision:** Extract `CLARISA_GLOSSARY_URL` to `shared/constants/`.

**Why:** Footer and sidebar must not drift; footer comment already documents why env files are unsuitable.

**Rejected:** Copy URL into sidebar only (proposal Option A) — two maintenance points.

### SGL-DD-2: Landing page URL, not CLARISA panel doc path

**Decision:** Use `landing-page/glossary` only.

**Why:** Matches P2-3145, footer, and public UX. Panel doc URL is maintainer-oriented.

### SGL-DD-3: Native anchor, not router or overlay

**Decision:** Plain external `<a>` with Spartan menu button directive.

**Why:** Destination is off-origin; same as footer. No in-app route needed.

### SGL-DD-4: Short label “Glossary” in sidebar

**Decision:** Sidebar label **Glossary**; footer keeps **Glossary of Terms**.

**Why:** Rail width and user screenshot; footer has more horizontal space.

---

## 9. Risks & Rollback

| Risk | Mitigation |
|---|---|
| CLARISA downtime | Same as today for footer — no PRMS fallback |
| EXTRAS visual regression | Manual spot-check; reuse existing button classes |

**Rollback:** Revert sidebar `<li>` and constant refactor; footer can restore inline string if needed.

---

## 10. Budget (Step 2.4)

| Metric | Estimate |
|---|---|
| **Tasks** | 2 |
| **LOC (net)** | ~45–55 |
| **Review rounds** | 1 |

Depth **Lite** is appropriate — estimate matches Lite (single focused client change).

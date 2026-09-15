# Tasks: Glossary link in Reporting sidebar EXTRAS

## Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/sidebar-glossary-link` |
| **Requirements** | [`requirements.md`](./requirements.md) |
| **Design** | [`design.md`](./design.md) |
| **Depth** | Lite |
| **Status** | shipped |
| **Date** | 2026-09-11 |

---

## 1. Scope of this task list

- **Feature:** Glossary link in Reporting sidebar EXTRAS
- **Owner:** Implementer (client)
- **Status:** `done`

---

## 2. Pre-flight checklist

- [x] `requirements.md` approved
- [x] `design.md` approved
- [x] OQ-1..OQ-3 resolved (see requirements §9)
- [x] No conflicting in-flight spec on `reporting-nav-sidebar`

---

## 3. Task list

### SGL-T-1 — Shared CLARISA glossary URL constant + footer wiring

- **Type:** client
- **Description:** Create `clarisa-links.constants.ts` exporting `CLARISA_GLOSSARY_URL`. Refactor `footer.component` to import the constant instead of an inline string. Add or update co-located constant spec if created.
- **Implements:** SGL-R-2 (URL clause), SGL-NFR-1
- **Design refs:** SGL-DD-1, §6.1, §6.2
- **Files (expected):**
  - `onecgiar-pr-client/src/app/shared/constants/clarisa-links.constants.ts`
  - `onecgiar-pr-client/src/app/shared/constants/clarisa-links.constants.spec.ts` (optional)
  - `onecgiar-pr-client/src/app/shared/components/footer/footer.component.ts`
  - `onecgiar-pr-client/src/app/shared/components/footer/footer.component.html`
- **Depends on:** —
- **Blocks:** SGL-T-2
- **Estimate:** S
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] `CLARISA_GLOSSARY_URL` equals `https://clarisa.cgiar.org/landing-page/glossary`
  - [x] Footer glossary link href binds to constant; label still “Glossary of Terms”
  - [x] `footer.component.spec.ts` P2-3145 test passes
- **Verification:**

```bash
cd onecgiar-pr-client && npm run test -- --testPathPattern="footer.component.spec|clarisa-links.constants.spec"
```

- **Disqualifiers:** Test passes but footer still contains a hardcoded glossary URL string literal (grep `landing-page/glossary` in footer — should appear only in constant file).
- **Falsification input:** Change constant to a wrong URL — footer spec MUST fail on href assertion.

---

### SGL-T-2 — Sidebar EXTRAS Glossary row + tests

- **Type:** client + tests
- **Description:** Add Glossary as first EXTRAS item in `reporting-nav-sidebar` using `lucideBookOpen`, external anchor, and shared constant. Add scoped unit tests for order, href, target/rel, and tooltip.
- **Implements:** SGL-R-1 (all scenarios), SGL-R-2 (all scenarios), SGL-R-3, SGL-NFR-2
- **Design refs:** SGL-DD-2, SGL-DD-3, SGL-DD-4, §6.3
- **Files (expected):**
  - `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.ts`
  - `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.html`
  - `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.spec.ts`
- **Depends on:** SGL-T-1
- **Blocks:** —
- **Estimate:** S
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] Glossary `<li>` appears before Release notes in EXTRAS markup
  - [x] Anchor uses `CLARISA_GLOSSARY_URL`, `target="_blank"`, `rel="noopener noreferrer"`, `tooltip="Glossary"`
  - [x] `lucideBookOpen` icon present; no `routerLink` on Glossary row
  - [x] Scoped sidebar + footer tests green
  - [x] Manual spot-check: expanded + collapsed sidebar matches EXTRAS styling (HITL)
- **Verification:**

```bash
cd onecgiar-pr-client && npm run test -- --testPathPattern="reporting-nav-sidebar.component.spec|footer.component.spec|clarisa-links.constants.spec"
```

- **Disqualifiers:**
  - Template-parse test finds Glossary after Release notes → order requirement not met
  - href differs from `CLARISA_GLOSSARY_URL` → URL drift
  - Presence-only test without href/order/tooltip assertions → insufficient for SGL-R-1/R-2
- **Falsification input:** Remove the Glossary `<li>` — new sidebar tests MUST fail.
- **Presence vs behavior gap:** Template string tests prove markup authorship, not pixel layout; layout parity is manual HITL only.

---

## 4. Dependency graph

```
SGL-T-1 (constant + footer)
   └── SGL-T-2 (sidebar + tests)
```

---

## 5. Scenario → task coverage

| Requirement / clause | Task |
|---|---|
| SGL-R-1 expanded order + icon + label | SGL-T-2 |
| SGL-R-1 collapsed tooltip | SGL-T-2 |
| SGL-R-2 URL, target, rel, no routerLink | SGL-T-1, SGL-T-2 |
| SGL-R-3 no EXTRAS regression | SGL-T-2 (existing specs + manual) |
| SGL-NFR-1 shared constant | SGL-T-1 |
| SGL-NFR-2 anchor a11y | SGL-T-2 |

---

## 6. PR strategy

**Single PR** (~45–55 LOC). One client-only change; no backend or migration split needed.

**Suggested commit:** `✨ feat(reporting-nav-sidebar) [P2-3145]: add Glossary link to sidebar EXTRAS`

---

## 7. Recommended first task

**SGL-T-1** — establishes the shared URL before sidebar consumes it.

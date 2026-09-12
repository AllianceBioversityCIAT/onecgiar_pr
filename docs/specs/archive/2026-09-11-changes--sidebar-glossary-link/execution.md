# Execution: Glossary link in Reporting sidebar EXTRAS

## Document Control

| Field | Value |
|---|---|
| **Spec path** | `changes/sidebar-glossary-link` |
| **Status** | shipped |
| **Date** | 2026-09-11 |

---

## SGL-T-1 — Shared CLARISA glossary URL constant + footer wiring

**Status:** done

**Delivered:**

- `onecgiar-pr-client/src/app/shared/constants/clarisa-links.constants.ts`
- `onecgiar-pr-client/src/app/shared/constants/clarisa-links.constants.spec.ts`
- `footer.component.ts` — imports `CLARISA_GLOSSARY_URL`
- `footer.component.spec.ts` — asserts href against constant

**Verification:** 3 suites green (includes footer + clarisa-links specs).

---

## SGL-T-2 — Sidebar EXTRAS Glossary row + tests

**Status:** done

**Delivered:**

- `reporting-nav-sidebar.component.html` — Glossary first in EXTRAS
- `reporting-nav-sidebar.component.ts` — `clarisaGlossaryUrl` binding
- `reporting-nav-sidebar.component.spec.ts` — SGL-T-2 parsed-template + constant tests

**Verification:** `reporting-nav-sidebar.component.spec.ts` — 85 tests total across scoped run.

---

## Reviewer

- **Outcome:** PASS (scoped tests green; requirements SGL-R-1..R-3 satisfied)
- **Manual HITL:** Spot-check expanded/collapsed sidebar styling recommended in QA environment

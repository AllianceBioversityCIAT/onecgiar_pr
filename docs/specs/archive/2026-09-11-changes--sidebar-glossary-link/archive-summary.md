# Archive Summary — Glossary link in Reporting sidebar EXTRAS

## 1. Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/sidebar-glossary-link/` |
| Archive date | 2026-09-11 |
| Ticket | P2-3145 |
| Depth | Lite |
| Branch | `qa-development-2026` |

## 2. Final Status

**Shipped.** 2/2 tasks complete. User verified expanded and collapsed sidebar in QA environment.

| Task | Status |
|---|---|
| `SGL-T-1` — shared `CLARISA_GLOSSARY_URL` + footer refactor | ✅ done |
| `SGL-T-2` — sidebar EXTRAS Glossary row + tests | ✅ done |

## 3. Requirements Delivered

| ID | Delivered as |
|---|---|
| SGL-R-1 | Glossary first in EXTRAS; `lucideBookOpen`; tooltip "Glossary" |
| SGL-R-2 | External link to CLARISA landing glossary; new tab; shared constant |
| SGL-R-3 | Release notes, Notifications, Text size unchanged |
| SGL-NFR-1 | `clarisa-links.constants.ts` single source of truth |
| SGL-NFR-2 | Native `<a>` with `rel="noopener noreferrer"` |

## 4. Files Changed Summary

| File | Change |
|---|---|
| `shared/constants/clarisa-links.constants.ts` | New constant |
| `shared/constants/clarisa-links.constants.spec.ts` | Unit test |
| `footer.component.ts` | Import constant |
| `footer.component.spec.ts` | Assert against constant |
| `reporting-nav-sidebar.component.html` | Glossary EXTRAS row |
| `reporting-nav-sidebar.component.ts` | `clarisaGlossaryUrl` |
| `reporting-nav-sidebar.component.spec.ts` | SGL parsed-template tests |

## 5. Test Evidence Summary

| Gate | Result |
|---|---|
| Scoped Jest (3 suites) | ✅ 85 tests passed |

```bash
npm run test -- --testPathPattern="reporting-nav-sidebar.component.spec|footer.component.spec|clarisa-links.constants.spec"
```

Manual HITL: user confirmed sidebar behaviour in testing environment.

## 6. Validation Summary

No standalone `/akili-validate` — Lite client-only change; scoped tests + manual pass sufficient.

## 7. Follow-Ups

None. Future glossary deep links in field tooltips remain out of scope (noted in proposal).

## 8. Historical Notes

- Reused P2-3145 canonical URL from footer; sidebar label "Glossary" vs footer "Glossary of Terms" by design.
- Clean kaizen run — no pending standardizations.

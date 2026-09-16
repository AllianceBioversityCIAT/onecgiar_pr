# Execution Log — W3 bilateral Editing open-route fix

## Summary

Implemented shared three-way routing for W3/Bilateral list rows. Editing (and Draft) results now open `/bilateral/{leadCenter}/result/{code}?phase=` instead of the bilateral review drawer.

## Tasks

| Task | Status | Notes |
|---|---|---|
| `BIL-T-1` | PASS | Regression tests added; would fail on pre-fix code |
| `BIL-T-2` | PASS | `bilateral-result-open-route.util.ts` + wired programme-results & results-list |

## Verification

```bash
cd onecgiar-pr-client && npm run test -- --testPathPattern="bilateral-result-open-route.util.spec|programme-results.component.spec|results-list.component.spec"
# 236 passed
```

## Files changed

- `onecgiar-pr-client/src/app/shared/routing/bilateral-result-open-route.util.ts` (new)
- `onecgiar-pr-client/src/app/shared/routing/bilateral-result-open-route.util.spec.ts` (new)
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.ts`
- `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.ts`
- Co-located spec updates

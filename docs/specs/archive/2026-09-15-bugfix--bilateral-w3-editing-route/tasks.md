# Tasks — W3 bilateral in Editing opens center editor, not review drawer

## 1. Scope

Two client tasks. Covers `BIL-R-1` … `BIL-R-6` and defect classes D1–D6.

- **Spec:** `bugfix/bilateral-w3-editing-route` · **Depth:** Lite · **Mode:** Bug
- **Budget (`design.md` §10):** 2 tasks · ~100 LOC · 1 review round
- **Skills:** `angular-developer`, `tdd`

## 2. Pre-flight checklist

- [x] `requirements.md` approved
- [x] `design.md` approved
- [x] `BIL-OQ-1` resolved (Draft routes with Editing — default applied)
- [x] Scoped client tests green

## 3. Task list

### `BIL-T-1` — Regression tests (red before fix)

| Field | Value |
|---|---|
| Status | [x] complete |
| Size | M |
| Depends on | — **must fail on current code before T-2** |
| Requirements | `BIL-R-1`, `BIL-R-2`, `BIL-R-4`, `BIL-AC-5` |
| Design | `design.md` §8 |
| Skills | `angular-developer`, `tdd` |

**Scope.**

1. Add `bilateral-result-open-route.util.spec.ts` with matrix cases: Editing W3 → center editor; Submitted W3 → review; Approved / AVISA → Result Detail; missing `lead_center` → Result Detail fallback; Draft W3 → center editor if `BIL-OQ-1` default stands.
2. In `programme-results.component.spec.ts`:
   - Editing W3: `resultRoute` returns `/bilateral/AfricaRice/result/9368?phase=36`; `usesBilateralReviewFlow` false; `openResult` does **not** call `showReviewDrawer.set(true)`.
   - `copyLink` for Editing W3: copied URL must not contain `bilateral-review`.
   - Keep existing Submitted W3 review-drawer test green (will pass before and after).
3. In `results-list.component.spec.ts`:
   - Add `getResultLink` / `getResultQueryParams` for W3 **Editing** with `lead_center: 'AfricaRice'` → center editor commands.
   - `onResultLinkClick` for Editing W3 must **not** preload review drawer.

**Verification.**

```bash
cd onecgiar-pr-client && npm run test -- --testPathPattern="bilateral-result-open-route.util.spec|programme-results.component.spec|results-list.component.spec"
```

**Disqualifier.** Editing W3 tests **must fail** on current code (D1). A green run at T-1 means the fixture lacks `status_name: 'Editing'` or `source_name/origin: 'W3/Bilaterals'` — not a pass.

**Falsifying input.** Row with `status_name: 'Submitted'` expecting center-editor URL — must fail after fix if regression reintroduced (D2).

**Done.** New tests exist; Editing W3 cases red; Submitted W3 review tests still green.

---

### `BIL-T-2` — Shared resolver + wire both lists

| Field | Value |
|---|---|
| Status | [x] complete |
| Size | S |
| Depends on | `BIL-T-1` |
| Requirements | `BIL-R-1` … `BIL-R-6`, `BIL-AC-6`, D3–D6 |
| Design | `design.md` §5, `BIL-DD-1` … `BIL-DD-3` |
| Skills | `angular-developer` |

**Scope.**

1. Create `shared/routing/bilateral-result-open-route.util.ts` exporting classification + route builder per `design.md` §5.
2. Refactor `programme-results.component.ts`: `resultRoute`, `openResult`, `copyLink`/`resultLink`; split `isW3BilateralForUpdate` for `canUpdateResult` (`BIL-DD-3`).
3. Refactor `results-list.component.ts`: `getResultRoute`, `navigateToResult`, `onResultLinkClick`; extend cache key with status + lead_center.
4. Grep for remaining `usesBilateralReviewFlow` — both components should delegate to util (public wrapper ok for specs).

**Verification.**

```bash
cd onecgiar-pr-client && npm run test -- --testPathPattern="bilateral-result-open-route.util.spec|programme-results.component.spec|results-list.component.spec"
cd onecgiar-pr-client && npx ng lint --quiet
```

**Disqualifier.** T-1 Editing W3 tests must turn green **without modifying their expectations**. Submitted W3 review-drawer tests must stay green with **no assertion edits** (D2, D3).

**Falsifying input.** Removing `!isEditingOrDraft` from review branch makes T-1 Editing tests fail again.

**Done.** All scoped tests green; lint clean; no `/bilateral//result/` URLs in tests.

## 4. Dependency graph

```
BIL-T-1 (red) ──► BIL-T-2 (green)
```

## 5. Coverage map

| Clause | Task |
|---|---|
| `BIL-R-1` · primary scenario | T-1, T-2 |
| `BIL-R-1` · BUT must NOT open review modal | T-1 `openResult` / `onResultLinkClick` |
| `BIL-R-2` · Submitted scenario | T-1 existing + util matrix |
| `BIL-R-3` · Approved / AVISA | T-1 util + existing specs |
| `BIL-R-4` · Copy link scenario | T-1 `copyLink` |
| `BIL-R-5` · canUpdateResult | T-2 split predicate; D6 spot-check |
| `BIL-R-6` · Draft | T-1 util row; T-2 if OQ-1 yes |
| Missing lead_center · AND IT MUST fall back | T-1 util + T-2 |

## 6. PR strategy

**Single PR** (~100 LOC, one concern). Target branch per team cadence (`qa-development-2026` / `staging`).

Optional HITL after merge: open W3 Editing `#9368` from Programme Results on test env — confirm center editor, not review drawer.

## 7. Roll-back

Revert one commit. Routing-only; no migration or payload impact.

## Required cross-references

- `./requirements.md`, `./design.md`, `./proposal.md`

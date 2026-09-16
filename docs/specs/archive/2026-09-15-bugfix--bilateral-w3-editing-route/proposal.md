# Proposal — W3 bilateral in Editing must open the center editor, not the review drawer

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/bilateral-w3-editing-route` |
| Slug | `bilateral-w3-editing-route` — derived from free-text: *"si el resultado es un bilateral W3 … en estatus editing … debería abrir [center editor], no [review drawer]"* |
| Type | Bug |
| Approval Mode | gated |
| Source | User report with screenshots (2026-09-15) |
| Date | 2026-09-15 |
| Depends on | none |
| Parallel-safe | yes — routing helpers only; no shared migration or payload contract |

## Intent

When a user opens a **W3/Bilateral** result that is still in **Editing** status, PRMS must land them on the **center bilateral result editor** (`/bilateral/{leadCenter}/result/{code}?phase=`), not the **Review External Result** drawer used for programme-side bilateral review.

## Problem / Current Behavior

| Entry surface | W3 + Editing today | Expected |
|---|---|---|
| Bilateral center → Results tab | ✅ `/bilateral/AfricaRice/result/9368?phase=36` (center editor with section rail) | Same |
| Programme Results tab, Results Center list, row menus / deep links | ❌ Opens **Review External Result** drawer on `…/bilateral-review?reviewResult=…` | Center editor URL above |

The review drawer is the correct surface for **Pending review** (and similar programme-review states). It is the wrong surface for a center submitter still **Editing** their W3 contribution — they need the multi-section editor (Overview, General information, Contributors, etc.) shown in the user's reference screenshot.

Root routing logic treats **every** W3/Bilateral row as review-drawer-bound except AVISA (`SGP-02` / `SGP02`) and **Approved**:

```typescript
// programme-results.component.ts:1477-1479
usesBilateralReviewFlow(row): boolean {
  if (this.isW3BilateralsAvisa(row) || row?.statusName === 'Approved') return false;
  return row?.origin === 'W3/Bilaterals';
}
```

The same guard exists in `results-list.component.ts:765-768`. **Editing is never excluded**, so W3 rows in Editing (status_id `1`) incorrectly match the review flow.

## Proposed Outcome

- **W3/Bilateral + Editing** → navigate to `/bilateral/{lead_center_acronym}/result/{result_code}?phase={version_id}` (bilateral result creator / section rail).
- **W3/Bilateral + Pending review / Submitted / Rejected** (programme-review lane) → keep opening the bilateral review drawer (unchanged).
- **W3/Bilateral + Approved** and **AVISA** → keep opening Result Detail (unchanged).
- **Copy link** and **Open result** share the same three-way branch everywhere today (`programme-results`, `results-list`, notification deep links that reuse the same helpers).

## Scope

**In scope (client only):**

- Introduce a shared routing predicate (e.g. `shouldOpenBilateralCenterEditor(row)`) keyed on `source_name` / `origin === 'W3/Bilaterals'` **and** `status_id === 1` (Editing). Prefer `statusId` / `status_id` over string `statusName` to avoid locale drift; keep `statusName === 'Editing'` as a defensive mirror if needed.
- Update `resultRoute()` / `getResultRoute()` in:
  - `programme-results.component.ts`
  - `results-list.component.ts`
- Update `openResult()` / `navigateToResult()` / `copyLink()` branches that call `usesBilateralReviewFlow()` so Editing W3 does **not** preload `currentResultToReview` or `showReviewDrawer`.
- Route builder for the center editor uses `lead_center` (acronym — confirmed in `api.service.ts:287` and `ProgrammeResultRow.center`).
- Jest regression tests in `programme-results.component.spec.ts` and `results-list` specs: Editing W3 → center editor commands + no review-drawer side effects; Submitted W3 → review drawer unchanged.

**Out of scope:**

- Bilateral review tab table UX (Editing rows may still appear there with a neutral chip — opening them from that tab is a separate product decision; this bug targets the **global open-result** paths).
- Backend or `/api/bilateral/*` payload changes.
- AVISA exception logic.
- Draft status (`8`) — open question below; default is to treat Draft like Editing if product confirms.

## Non-Goals

- Redesigning the review drawer or center editor UI (rail alignment work is archived separately under `archive/2026-09-15-bilateral--result-rail-alignment/`).
- Changing which rows appear on the Bilateral review tab KPI/list.
- Smart Back origin rules (center editor already has bilateral origin persistence in `smart-navigation.service.ts`).

## Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| **Users** | Center staff editing W3 bilateral contributions; programme leads opening a row from Programme Results or Results Center |
| **Client** | `programme-results.component.ts`, `results-list.component.ts`; optionally a small shared helper under `shared/` or `pages/bilateral/` to DRY the three-way branch |
| **Server** | none |
| **Related specs** | `archive/2026-09-08-changes--sp-bilateral-review-tab` (review drawer routing intent); `archive/2026-09-15-bilateral--result-rail-alignment` (center editor chrome, not entry routing) |

## Visual Reference

- **Source:** User-provided screenshots (session 2026-09-15)
- **Location:**
  - Correct (Editing → center editor): `docs/specs/bugfix/bilateral-w3-editing-route/reference/correct-center-editor-editing.jpg` — `/bilateral/AfricaRice/result/9368?phase=36`, section rail, "Editing" badge, Save draft / Next toolbar
  - Wrong (current bug): `docs/specs/bugfix/bilateral-w3-editing-route/reference/wrong-review-drawer-editing.jpg` — "Review External Result" modal with ToC alignment / Data standards cards
- **Notes:** Image #1 is the target; Image #2 is the regression the user reported for Editing status.

## Bug Diagnosis

### Observed Symptom

Opening a W3/Bilateral result in **Editing** status from a programme- or platform-level results list shows the **Review External Result** drawer (programme bilateral review UX) instead of the **center bilateral result editor** with the vertical section rail.

### Reproduction Steps

1. Log in to PRMS test environment (`qa-development-2026`).
2. Locate a W3/Bilateral result in **Editing** (example from report: result `#9368`, AfricaRice, Capacity sharing for development, phase 36).
3. Open it from **Programme Results** or **Results Center** (not from the bilateral center Results tab — that path already works).
4. **Actual:** Review External Result drawer opens (`…/entity-details/{SP}/bilateral-review?reviewResult=9368…`).
5. **Expected:** Center editor at `/bilateral/AfricaRice/result/9368?phase=36` with General information section active.

### Root Cause (confirmed)

`usesBilateralReviewFlow()` in `programme-results.component.ts:1477-1479` and `results-list.component.ts:765-768` returns `true` for all `W3/Bilaterals` rows except AVISA and Approved. **Editing (`status_id = 1`) is not excluded.** `resultRoute()` / `getResultRoute()` therefore build the bilateral-review deep link, and `openResult()` / `navigateToResult()` set `BilateralResultsService.currentResultToReview` and `showReviewDrawer` before navigating — mounting the review drawer instead of the center editor.

The bilateral center Results list (`bilateral-results-list.component.ts:964`) already navigates directly to `/bilateral/{centerAcronym}/result/{code}` and is unaffected; the bug is isolated to the shared W3 routing helpers used by programme/platform lists.

### Impact & Scope

- **High** for center submitters who discover their W3 draft from Programme Results or Results Center and land in a read-only review surface instead of the editor.
- **No data integrity risk** — wrong UI only; saves are not attempted from the review drawer for Editing rows in the same way.
- **Blast radius:** every code path that copies the `usesBilateralReviewFlow` pattern (programme-results, results-list, copy-link producers, notification deep links that reuse the same route helper). Grep for `usesBilateralReviewFlow` and `getResultRoute` during specify/execute.

### Fix Strategy

Smallest safe correction: add a **third route branch** (center editor) before the review-drawer branch:

1. If W3 + Editing (+ optionally Draft) → `/bilateral/{lead_center}/result/{code}?phase={version_id}`; do not touch review-drawer signals.
2. Else if existing `usesBilateralReviewFlow` → review drawer (unchanged).
3. Else → Result Detail (unchanged).

Extract the predicate to one shared helper to prevent the two list components from drifting again. Route to `/akili-specify bugfix/bilateral-w3-editing-route` in **Bug Mode** with mandatory regression tests (red before fix, green after) in the co-located Jest specs.

## Approach Options

| Option | Summary | Trade-offs |
|---|---|---|
| **A — Exclude Editing in `usesBilateralReviewFlow` + add center-editor route** (recommended) | Extend routing with explicit center-editor branch; narrow review flow to non-Editing W3 | Minimal diff; preserves review drawer for Submitted/Pending review; needs shared helper |
| **B — Status allow-list for review drawer** | Review drawer only for `Pending Review`, `Rejected`, maybe `Submitted` | More explicit product mapping; risk of missing a status unless aligned with BRT-R-12 |
| **C — Always open center editor for W3 from Results Center; review only from Bilateral review tab** | Remove review routing from list open actions | Larger behaviour change; breaks existing deep links and notification producers |

## Recommended Approach

**Option A** — exclude Editing from the review flow and route Editing W3 to the center editor using `lead_center` acronym already on list rows. Matches the working bilateral center Results tab behaviour and the user's screenshots with the smallest diff.

## Risks, Dependencies, And Open Questions

| ID | Risk / question | Mitigation |
|---|---|---|
| OQ-1 | Should **Draft** (`status_id = 8`) also open the center editor? | Default yes (same submitter lane as Editing) unless product says otherwise |
| OQ-2 | Missing or malformed `lead_center` on a W3 Editing row | Fail soft: fall back to Result Detail or show toast; add test with empty `lead_center` |
| OQ-3 | Opening Editing W3 from **Bilateral review tab** "See" action | Out of scope unless product wants parity; document current behaviour |
| R-1 | Drift between programme-results and results-list | Shared helper + paired spec tests |
| R-2 | Notification deep links copying old review URL for Editing W3 | Audit `pop-up-notification-item`, `update-notification`, `programme-results` copyLink during execute |

## Success Criteria

- [ ] W3 + Editing opened from Programme Results navigates to `/bilateral/{acronym}/result/{code}?phase=` with no review drawer mounted.
- [ ] W3 + Submitted (or Pending review) from the same surfaces still opens the review drawer.
- [ ] W3 + Approved and AVISA still open Result Detail.
- [ ] Copy link for Editing W3 produces the center editor absolute URL, not a bilateral-review deep link.
- [ ] Jest regression tests cover the three branches; existing bilateral-review tests stay green.

## Next Step

```text
/akili-specify bugfix/bilateral-w3-editing-route
```

Run in **Bug Mode** — convert the confirmed root cause into requirements, design, tasks, and a mandatory regression test (red before fix, green after).

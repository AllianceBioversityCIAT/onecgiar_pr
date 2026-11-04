# Module Spec — `design.md` (Lite)

## 1. Summary

Plumb the step-wide `missingPrincipalImpactAreas()` list (already computed in `step-n3.component.ts`) down as a new `@Input` into every `app-ipsr-step3-evidence-list` instance, and render the same `app-alert-status` warnings inside its dialog template, above the tag checkboxes. No new state, no new computation, no backend change — pure prop-drilling + template addition. Biggest trade-off accepted: the list stays step-wide (not filtered per owner/level), so a reporter may see a warning about an Impact Area unrelated to the specific evidence they're adding — accepted per `requirements.md` §9 Assumptions, matching the page-level behavior exactly.

Implements: `requirements.md` `IPSR-R-1`, `IPSR-R-2`, `IPSR-R-3`, `IPSR-R-10`.

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| IPSR-P-1 | `app-ipsr-step3-evidence-list` has no existing `@Input` named `missingPrincipalImpactAreas` (no collision) | `ipsr-step3-evidence-list.component.ts` | Read file (lines 82-107): inputs are `owner`, `level`, `required` only | verified | Pick a different input name |
| IPSR-P-2 | All 4 template call sites of `app-ipsr-step3-evidence-list` are reachable from `step-n3.component` (directly or via `step-n3-complementary-innovations`) | `step-n3.component.html` (2 sites), `step-n3-complementary-innovations.component.html` (2 sites) | Grepped `app-ipsr-step3-evidence-list` project-wide: exactly these 2 files | verified | A missed call site would silently lack the alert — re-grep before closing the task |
| IPSR-P-3 | `IPSR_STEP3_EVIDENCE_COPY.principalImpactAreaAlert` and `impactAreaNames` are already exported and imported by `ipsr-step3-evidence-list.component.ts` | `ipsr-step3-evidence-list.copy.ts` | Read file: `principalImpactAreaAlert: (areaName) => ...` at line 82; `copy` field already exposed on the component (`step-n3-evidence-list.component.ts:89`) | verified | Add the missing export/import |

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client modules touched:** `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n3/` — `step-n3.component.{ts,html}`, `components/step-n3-complementary-innovations/step-n3-complementary-innovations.component.{ts,html}`, `components/ipsr-step3-evidence-list/ipsr-step3-evidence-list.component.{ts,html}`.
- **No server modules touched.**

### 2.2 Data flow (prop drilling, no new service/state)

```
step-n3.component.ts
  missingPrincipalImpactAreas(): IpsrPrincipalImpactArea[]   ← already exists
       │
       ├─ step-n3.component.html
       │    [missingPrincipalImpactAreas]="missingPrincipalImpactAreas()"
       │    → 2x <app-ipsr-step3-evidence-list> (core, readiness/use)
       │
       └─ step-n3-complementary-innovations.component
            new @Input missingPrincipalImpactAreas: IpsrPrincipalImpactArea[]
            (received from step-n3.component.html, forwarded unchanged)
                 │
                 └─ step-n3-complementary-innovations.component.html
                      [missingPrincipalImpactAreas]="missingPrincipalImpactAreas"
                      → 2x <app-ipsr-step3-evidence-list> per bodyItem
                                  │
                                  └─ ipsr-step3-evidence-list.component
                                       new @Input missingPrincipalImpactAreas: IpsrPrincipalImpactArea[] = []
                                       renders alerts in dialog template, using
                                       existing `copy.principalImpactAreaAlert(copy.impactAreaNames[area])`
```

No `@Output`, no signal, no service — the array reference is recomputed by the parent's method call on every change-detection pass (existing pattern: `missingPrincipalImpactAreas()` is already called this way from the page-level `@for`), so the dialog sees the same up-to-date list without any new sync mechanism.

## 3. Extended Directory Structure

No new files. Modified:

```
step-n3/
├── step-n3.component.html                                  (bind new input, 2 call sites)
├── components/
│   ├── step-n3-complementary-innovations/
│   │   ├── step-n3-complementary-innovations.component.ts   (new @Input)
│   │   └── step-n3-complementary-innovations.component.html (forward input, 2 call sites)
│   └── ipsr-step3-evidence-list/
│       ├── ipsr-step3-evidence-list.component.ts             (new @Input, default [])
│       └── ipsr-step3-evidence-list.component.html           (render alerts in dialog)
```

## 4. Data Model

No change — `IpsrPrincipalImpactArea` type already exists (`ipsr-step-3-body.model.ts`).

## 5. API Design

None — client-only, no HTTP surface touched.

## 6. Backend Module Design

N/A.

## 7. Frontend / UX Component Architecture

**`IPSR-DD-1` — Reuse `app-alert-status`, not a new component.** The page already renders `app-alert-status` for this exact copy (`step-n3.component.html:10`). The dialog gets the identical markup:

```html
@for (area of missingPrincipalImpactAreas; track area) {
  <app-alert-status status="warning" [collapsible]="false" [description]="copy.principalImpactAreaAlert(copy.impactAreaNames[area])"
      data-testid="dialog-principal-impact-area-alert"></app-alert-status>
}
```
placed as the first block inside `<div class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">` (`ipsr-step3-evidence-list.component.html:216`), i.e. above the source-of-evidence radio buttons — so it is the first thing seen, right before the reporter picks a link/file and ticks tag checkboxes. A distinct `data-testid` (`dialog-principal-impact-area-alert`) keeps it disambiguated from the page-level `principal-impact-area-alert` for tests.

**`IPSR-DD-2` — `@Input` default is `[]`, not `undefined`.** `ipsr-step3-evidence-list.component.ts` already has non-required inputs defaulting to safe values (`required = false`); this input follows the same pattern (`missingPrincipalImpactAreas: IpsrPrincipalImpactArea[] = []`) so the `@for` never needs a null-check and existing/future test beds that don't set the input keep rendering with no alert block (satisfies `IPSR-R-3`).

**`IPSR-DD-3` — No filtering by owner/level.** Per `requirements.md` §9 Assumptions: the same full list is shown in every dialog instance, exactly mirroring the page banner. Rejected alternative: filtering to only the Impact Areas whose `*_related` field the *current* owner/level could plausibly satisfy — rejected because `missingPrincipalImpactAreas()` itself is step-wide (any evidence, any owner/level, tagging an area anywhere clears it), so a per-owner filter would show a *different, narrower* list than the page banner for the same underlying condition, which is more confusing than showing the same list twice.

*Step 2.3 Reversion challenge:* N/A — this design is purely additive, no existing behavior is removed, disabled, or inverted.

## 8. Shared Contracts or Package Extensions

None.

## 9. Design Decisions

See `IPSR-DD-1..3` in §7.

## 10. Budget (Step 2.4 sizing)

- **Expected tasks:** 1 (single focused change across 3 already-identified files; Lite depth).
- **Expected LOC:** ~25 (2-line `@Input` declarations ×2, 2-line template bind ×4 call sites, 4-line alert block, minor JSDoc note) — well under the `/akili-quick` escalation's original ≤20 LOC-per-file assumption, but spans 3 files/2 component boundaries, which is what took it out of Quick.
- **Expected review rounds:** 1 (mechanical prop-drilling, no new logic branch).

Depth check: `Lite` matches — no split recommended.

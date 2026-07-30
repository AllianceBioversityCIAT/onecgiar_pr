## Why

In the Evidence section the green check turns valid as soon as **any** single piece of evidence is uploaded, even when mandatory marker- or readiness-specific evidence is still missing. This lets users mark a result as "done" without the evidence the reporting rules actually require, which is the bug reported in **P2-3056** (child of P2-3012, *Open Phase Step 1 — open PRMS 2026 phase*). Requirements were confirmed with the reporter, Santiago Sánchez, over Slack on 2026-06-18. Separately, the five Impact-Area checkbox labels still show the old short names while the rest of the section (alerts) already uses the new canonical Impact-Area names.

**Scope: frontend-only.** The backend green-check (`results-validation-module.repository.ts`, raw SQL) already enforces all three completeness rules below; the defect is that the client's local `isComplete` flag for the Evidence section does not. No server change is required.

## What Changes

- **Block the Evidence green check** in the client so the section is only complete when ALL of these hold (today only the first is checked):
  - at least one piece of evidence is uploaded;
  - **AND** every Impact-Area marker set to **Principal (score 2 / `tag_level` 3)** in General Information has at least one piece of evidence tagged to it — applies to **all result types**;
  - **AND** when the Innovation Development readiness field ("How would you assess the current readiness of this innovation?") is **1–9**, at least one Innovation-Readiness-tagged evidence exists — applies **only to Innovation Development** (readiness 0 = exempt).
  - The blocking reuses the already-present `validateCheckBoxes()` and `validateHasInnoReadinessLevelEvidence()` helpers (today they only render yellow warnings without affecting `isComplete`).
- **Rename the five Impact-Area checkbox labels** in the Evidence section to the canonical names (matching the alert text that already uses them):
  - Gender → **Gender equality, youth and social inclusion**
  - Climate change → **Climate adaptation and mitigation**
  - Nutrition → **Nutrition, health and food security**
  - Environment → **Environmental health and biodiversity**
  - Poverty → **Poverty reduction, livelihoods and jobs**
  - Label text only. The "Climate adaptation and mitigation" checkbox stays bound to the existing `youth_related` field (intentional historical column reuse) — **no binding change**.

## Capabilities

### New Capabilities
- `evidence-green-check`: Defines when the Evidence section's local completeness flag (green check) is satisfied — base evidence presence plus mandatory marker-Principal evidence (all result types) and Innovation-Readiness evidence (Innovation Development, readiness 1–9). Also fixes the five Impact-Area checkbox labels to the canonical Impact-Area names.

### Modified Capabilities
- (none) — `evidence-alert-messaging` already standardized the alert wording on the new Impact-Area names; this change only aligns the checkbox labels and the local green-check gate with that behavior.

## Impact

- **Client only** (`onecgiar-pr-client`):
  - `pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.html` — line 101 `[isComplete]` of the Evidence `appFeedbackValidation` block: extend the condition with the existing validation helpers.
  - `pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.ts` — `tagFields` array labels (5 Impact-Area entries); possibly expose a small getter to keep the template condition readable.
  - `pages/results/pages/result-detail/pages/rd-evidences/evidence-item/evidence-item.component.html` — the five `app-pr-checkbox` labels.
  - `pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/components/user-evidence/user-evidence.component.html` — the same five `app-pr-checkbox` labels (separate copy used by Innovation Development results).
  - Specs: `rd-evidences.component.spec.ts` (green-check gate), `evidence-item.component.spec.ts` (labels).
- **No backend changes**: server green-check (`onecgiar-pr-server/.../results-validation-module.repository.ts`, `evidenceValidation()`) already enforces these rules in SQL (markers `tag_level_id = 3`; readiness for result_type 7, level ≠ 0). Server is read-only for this change.
- No API contract changes, no migrations.
- Verification must confirm whether the user-visible side-menu check is driven by the backend green-check, the client `isComplete`, or both, so the fix lands where the user actually sees the bug.
- SDD baseline: behavior fits `docs/system-design/design.md` (Evidence section) and `docs/detailed-design/detailed-design.md` (results validation). Related changes: `p2-2981-evidence-labels-frontend` (other evidence labels, no overlap), spec `evidence-alert-messaging` (alert names).

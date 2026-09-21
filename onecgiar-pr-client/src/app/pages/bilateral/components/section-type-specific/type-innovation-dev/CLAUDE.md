# type-innovation-dev (bilateral)

**Verified:** 2026-09-18 · QA batch `P2-3778` / `P2-3779` / `P2-3780` — Innovation developers unrendered, false REQUIRED markers cleared, collaborators placeholder; prior: 2026-09-18 spec `bugfix/innovation-developer-prefill-stale-lead-contact` `BIL-IDP-T-4` — prefill is re-evaluable, fed by General information's save; prior: 2026-09-16 spec `bilateral/qa-ai-traffic-light` `BIL-QAI-T-12` rework — key-presence prefill gate; prior: 2026-09-16 (field restored) · 2026-09-09 · branch feat/P2-3390-bilateral-investment-tables · 7d0215b13

## What it is
Section 5 of the bilateral form: Innovation Development, rendered by
`../section-type-specific.component.html` for that result type. Shows the **MDS** — exactly 2 fields,
typology + readiness (P2-3778) — and hides the rest of the pooled-funding form behind **Complete full
metadata** (P2-3391, QA-verified via P2-3327), which includes the three "Investment (USD)" tables
(P2-3390).

## Innovation developers — removed, restored, removed again (the last state is the one to keep)

- 🛑 **NOT RENDERED (`P2-3778`, 2026-09-18).** The MDS zone is typology + readiness, nothing else. The
  decision is 2026-09-03's (Nicoleta Trifa via Ángel Jarrín, re-stated on the ticket by Juan David
  Delgado): removed, and "for innovations this will be replaced by the lead contact person information".
  Section 1 already tells the reporter so (`../../section-general-info/…component.html:41-47`), so the
  field's presence was a contradiction QA could see. Briefly restored 2026-09-16 (`BIL-QAI-R-15`/`DD-12`);
  **do not restore it again without a written decision**.
- ✅ **What deliberately stayed.** `buildPayload()` still sends `innovation_developers` (hiding a field
  never deletes its data) and the prefill still seeds it from the Lead contact person — the substitution
  the decision names, and the same one the server's ingest path performs
  (`onecgiar-pr-server/src/api/bilateral/handlers/innovation-development.handler.ts:59-63`). Still read
  by: the review drawer (`.../inno-dev-content.component.html:20`), W1/W2
  (`.../innovation-dev-info.component.html:143`), the `s7_id_innovation_developers` export and the PDF.
- ⚠️ **The prefill's gate is KEY PRESENCE, not truthiness** (`'innovation_developers' in this.body`).
  `InnovationDevExists` (`results-innovations-dev.repository.ts:274-312`) omits the key when no row
  exists and includes it — `null` or a string — once one does; truthiness re-filled a cleared value.
- ⚠️ **It is re-evaluable** (`BIL-IDP-T-4`): constructor `effect()` on `loaded()`+`resultLeadContact()`,
  fed by General info's **save**, never a live commit (that blanked the field mid-keystroke).

## Contract
- Endpoint: **the same one pooled funding's summary uses** —
  `GET/PATCH results/summary/innovation-dev/(get|create)/result/:id` via
  `BilateralApiService.GET_innovationDev` / `PATCH_innovationDev`. There is no bilateral-specific one.
- State: `body` is the server's `CreateInnovationDevDto`. Saving goes through
  `BilateralAutoSaveService.schedulePayload('typeSpecific', …, { statusKey: 'type-specific' })`.
- Load flag: `loaded = signal<boolean | null>(null)` — `null` in flight, `true` loaded, `false` failed.
  **Every write is gated on `=== true`** at the single choke point `queueTypeSave()`.
- Green check: `BilateralMdsTrackerService.setSectionFields('type-specific', …)`. **Two items only**:
  `nature`, `readiness`. Innovation developers is untracked and no longer rendered (P2-3778).
- Toggle: `BilateralExpandableStateService.get/setShowAllFields(resultId, 'type-specific')` — the
  open/closed state survives navigation between sections.
- Catalogues: `InnovationControlListService` (`typeList`, `characteristicsList`, `readinessLevelsList`).
- Phase: `BilateralCreationService.reportingYear()` — the result's own phase year, used by the gate below.

## Traps (⚠️ = already broke something)
- ⚠️ **Nothing outside the MDS may enter `setSectionFields` with `filled: false`.** The tracker
  computes `complete` as `filledFields === totalFields`; a fourth empty item leaves the section amber
  forever and **disables Submit** (`overallStatus() === 'complete'`). Same fall P2-3348, Capacity
  Sharing and Policy Change already took.
- ⚠️ **The Short title 10-word ceiling (P2-3340) is still alive even though the field is no longer MDS.**
  It is reported as an `invalid` item **only when exceeded**, with `filled: true`, so it blocks Submit with a reason without touching the percentage. Listing it unconditionally breaks AC9.
- ⚠️ **`SCALING_STUDIES_READINESS_THRESHOLD = 17` is a CLARISA ID, not the number 6.** Readiness level 6 is row 17 of `readinessLevelsList`. Pooled funding says the same thing a different way with `getReadinessLevelIndex() >= 6`, which is the array index.
- ⚠️ **The scaling-studies question is gated on the PHASE YEAR, and `isP25()` must never be used for it.**
  `showScalingStudies` returns false from `ReportingDesignYear.InnovationDevFormReduction` (2026) on, at
  **every** readiness level (P2-3265); below that it falls back to `isReadyForScalingStudies`. A
  portfolio gate would wrongly strip the question from a 2025 result inside the P25 portfolio
  (Ángel Jarrín, 23-Aug-2026, forbids this). An unresolved phase year counts as current and hides it.
- ⚠️ **NOTHING may be saved until `loaded() === true`** (P2-3558). `body` starts as `{}`, indistinguishable
  from a form the user emptied, and `buildPayload()` sends `?? null` for every key. The GET can answer a
  server-side **HTTP 500** that the interceptor rethrows
  (`shared/interceptors/general-interceptor.service.ts:81-83`), leaving `body` at `{}` with no warning —
  the first keystroke would then autosave `null` over stored data. `null` blocks too: the GET takes
  240-620 ms on prtest against an 800 ms debounce. New write paths MUST go through `queueTypeSave()`.
- ⚠️ **A failed load shows `app-alert-status status="error"` and disables Save**, rendered on `=== false` only (`!loaded()` would flash it while merely in flight), OUTSIDE the note/button row (P2-3327 AC2, test-pinned).
- ⚠️ **`reference_materials` is OMITTED from the payload when `body` holds no array — never sent as `[]`**
  (P2-3557). The server de-activates every stored evidence of type 4 that any value other than
  `null`/`undefined` — `[]` included — leaves out (`results/summary/innovation_dev.service.ts:99-125`).
  A present array (`[]` from deleting the last row) is still sent, so real deletions persist. Same fix as
  pooled funding (`0fca46d3a`, P2-3550 AC4). `scaling_studies_urls` needs no such guard (truthy
  `.length` writer, `summary.service.ts:710-731`).
- ⚠️ **The spec's `build()` runs the first change detection**, so `ngOnInit` fires and the default GET
  mock leaves the component `loaded`. A test that creates the component without it can save nothing.
- ⚠️ **Hiding the question does NOT remove the fields from the payload, on purpose** — "Remove" never
  means delete data, so `buildPayload` still sends `has_scaling_studies`/`scaling_studies_urls`; a
  value from an earlier phase must never be blanked by a 2026-form save. Test-pinned.
- ⚠️ **The green check does NOT read `has_scaling_studies` for Innovation Development** — only
  `validation_innovation_use_P25` (Innovation **Use**) does. Don't assume W1/W2's P2-3265 half
  (blocked on P2-3494) moves with this surface.
- ⚠️ **The spec's `creation` mock must carry `reportingYear`.** `showScalingStudies` calls it, and a
  missing key fails every test in the file as `is not a function`.
- ⚠️ **An optional field with no `[required]` input is painted REQUIRED** (P2-3779). `pr-yes-or-not:27`
  and `pr-field-header:16` both default it to **true**, so the marker is opt-OUT — three full metadata
  fields announced themselves as mandatory while the section saved and turned green with all three
  empty. Every optional field here passes `[required]="false"`. Test-pinned.
- ⚠️ **The MDS note goes at the very top in this section**, while Capacity Sharing and Policy Change
  paint it after their MDS fields. Deliberate: P2-3391 AC1 and P2-3327 AC2 say "at the top".

## Missing from the pooled-funding form (and why)
The three blocks driven by the **questionnaire** (`result_questions`) cannot be mounted today:
| Pooled-funding block | Why it is absent |
|---|---|
| `gesi-innovation-assessment` + `scale-impact-analysis` | P2-3290 (`Open`) replaces them with 2 structured questions |
| `intellectual-property-rights` | P2-3272 (`Open`) consolidates 4 questions into 1 |
| `innovation-team-diversity` | P2-3291 (`Open`) restructures the hierarchy |
| `anticipated-innovation-user`, `megatrends` | **Removed** by P2-3263/P2-3264 — do not revive them |

Would also need a `GET result-questions/innovation-development/:id` and reusing components from
`pages/results/.../innovation-dev-info/` (declared in an NgModule, not standalone).

## The three Investment (USD) tables (P2-3390)

`app-estimates-cgiar` (`shared/components/innovation-use-form/components/estimates`) — the same component
W1/W2 renders — over `investment_programs` / `investment_bilateral` / `investment_partners`, one row per
entity already linked to the result. Optional; `updateMds()` is untouched, so it counts for nothing —
and since P2-3779 the headers say so too: `[required]` follows `requiredSections`, like the amount inputs.

- ⚠️ **This type has TWO investment key families on the SAME endpoint, and they must not be mixed.** W1/W2
  sends the legacy `*_expected_investment` family (`InnoDevService`, resolves `non_pooled_project` by
  `non_pooled_projetct_id` — finds nothing for a bilateral project and **silently drops the row**).
  This form sends only the flat family (`ResultInvestmentService`, `api/results/result_budget`,
  forces `non_pooled_projetct_id = null`). A spec pins that the legacy keys never leave this form.
- The rows come from the result's own links, so the tables are empty until Contributors & Partners has
  something in them; there is no catalogue to pick from here, by design.
- Disabled while `loaded() !== true`: `queueTypeSave` writes nothing in that state, so an editable table
  would silently discard what the person types.

## Pending / Coming soon
- AC11 (read-only in Pending Review / Approved / Rejected): **not implemented** — no bilateral section
  has the read-only infrastructure yet.
- Making investment mandatory / part of the green check: needs `validation_innovation_dev_P25` (MySQL,
  applied by hand per environment). Out of P2-3390, which shipped it optional.

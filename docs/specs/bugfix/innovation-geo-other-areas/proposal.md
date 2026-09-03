# Proposal — Innovation Geo Focus: "other geographic areas" question comes pre-answered

## 1. Document Control

| Field | Value |
|---|---|
| Slug | `innovation-geo-other-areas` — derived from free-text ticket (core intent: geo-focus question for Innovation results not behaving as required) |
| Spec Path | `docs/specs/bugfix/innovation-geo-other-areas/` |
| Type | **Bug** |
| Approval Mode | `gated` (default) |
| Ticket(s) | none provided |
| Status | draft — scope confirmed with reporter (see §3.1 and Decision Log) |

---

## 2. Intent

The mandatory Yes/No question *"Are there any other geographic areas where the innovation could be impactful (beyond current development and use)?"* must force a conscious answer from the submitter — it must render **unanswered** (no pre-selection) whenever it is shown, so the field stays flagged as incomplete until the user picks one.

---

## 3. Problem / Current Behavior

**This is not a missing question — it already exists in code, word-for-word**, wired to field key `[geoscope-management]-has_extra_geo_scope` in `onecgiar-pr-client/src/app/shared/services/fields-manager.service.ts` (lines 176–182):

```ts
'[geoscope-management]-has_extra_geo_scope': {
  label: 'Are there any other geographic areas where  the innovation could be impactful (beyond current development and use)?',
  description: 'This should reflect other geographies where the innovation development, testing and/or use could also contribute to outcomes and impact"',
  required: true,
  hide: this.isP22() || !this.isAnInnovation()
},
```

It renders via `app-pr-radio-button` (Yes/No options) in `rd-geographic-location.component.html` (lines 33–49), backed by an existing `result.has_extra_geo_scope` column (migration `1761324189440-AddFieldHasExtraGeoScope.ts`, already applied). Field, copy, DB column, and Innovation-only gating are all already built.

### Decision Log (resolved with reporter before specify)

- **Visibility gate on Global (id 1) / "This is yet to be determined" (id 50) main focus stays as-is.** Confirmed intentional: a globally-scoped innovation already covers every geography, so asking about "other areas" is redundant and would falsely flag complete global-scope results as incomplete. Same logic for "to be determined" — the main focus must be resolved first. **No change here.**
- **The actual defect is a silent pre-answer**, confirmed in code and already called out as a known trap in the section's own `CLAUDE.md`:

  `rd-geographic-location.component.ts`, `fillExtraGeographicLocationBody()`, line 172:
  ```ts
  this.extraGeographicLocationBody.has_extra_geo_scope = Boolean(response.has_extra_geo_scope);
  ```
  `Boolean(null)` evaluates to `false`. So when the server has never received an answer (`null`), the UI renders the question **already answered "No"** instead of blank — the opposite of "force a conscious answer." The template's completeness check (`[isComplete]="... !== undefined"`, line 48) doesn't catch this either, since the value is no longer `undefined` after the coercion — it's `false`, which reads as complete.

## 3.1 Bug Diagnosis

### Observed Symptom
The mandatory geo-focus question, when it is shown (Regional / National / Sub-national main focus), should require a conscious Yes/No answer from the submitter — but it can appear pre-answered as "No" without the user ever touching it.

### Reproduction Steps
1. Open (or create) an Innovation Development or Innovation Use result (P25, not P22) whose main geographic focus is **Regional**, **National**, or **Sub-national** (i.e. not Global, not "yet to be determined") — so the extra-geo-scope block is visible.
2. Load the Geographic Location section without ever answering the "other geographic areas" question.
3. Observe: the question shows **"No" already selected**, and the completeness bar does not flag it as missing — even though the reporter never answered it.

### Root Cause (confirmed)
`fillExtraGeographicLocationBody()` (`rd-geographic-location.component.ts:172`) coerces the server value with `Boolean(response.has_extra_geo_scope)`. This collapses the three real states (`true` / `false` / `null`-unanswered) down to two, making "unanswered" indistinguishable from an explicit "No". The template's completeness guard (`!== undefined`) doesn't rescue this, because the coercion never produces `undefined` — it produces `false`.

### Impact & Scope
- Affects every Innovation Development / Innovation Use result (P25, non-P22) with a non-Global, non-"to be determined" main focus, on first load or reload of the Geographic Location section.
- Submitters can unknowingly submit "No" for a question they never actually answered, silently under-reporting geographies with potential impact.
- Fix is confined to the client: no migration, no DTO, no backend change — `has_extra_geo_scope` already persists `true`/`false`/`null` correctly server-side; only the client-side read path miscasts it.

### Fix Strategy
Not cosmetic (it's a data-mapping + completeness-check correction, both testable) → routes to `/akili-specify` (Lite) in Bug Mode with a regression test (red before fix, green after) that:
- asserts an unanswered (`null`) server value renders **no** radio selection, and
- asserts the completeness check still correctly flags it as missing until answered, while a genuine `true`/`false` from the server still renders and counts as answered.

---

## 4. Proposed Outcome

When the "other geographic areas" question is visible (Regional / National / Sub-national main focus, Innovation result, non-P22), it renders with **no option pre-selected** until the submitter picks one, and the section's completeness/missing-fields count correctly treats it as incomplete until then.

---

## 5. Scope

### In scope
- Stop `fillExtraGeographicLocationBody()` from coercing an unanswered (`null`) server value into `false`.
- Ensure the completeness check (currently `!== undefined`) also treats `null` as "not yet answered" so the missing-fields count stays accurate.
- Regression test covering both the load-time mapping and the completeness check.

### Out of scope
- The `geo_scope_id != GLOBAL && != DETERMINED` visibility gate — confirmed correct, not touched.
- The question's copy/description text — already correct, verbatim.
- Extending this question to Innovation Package/IPSR pathway steps — not requested.
- Any P22 behavior — stays excluded, unchanged.

---

## 6. Non-Goals

- No backend/entity/migration changes — the `has_extra_geo_scope` column and save path already round-trip `true`/`false`/`null` correctly; only the client's read-side mapping is wrong.
- No change to the nested "what is the geographic scope where there may be potential impact" follow-up question (the `app-geoscope-management` block shown when "Yes" is picked).

---

## 7. Affected Users, Systems, And Specs

| Item | Detail |
|---|---|
| Persona | Result submitter (Innovation results) |
| Client component | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-geographic-location/rd-geographic-location.component.ts` — `fillExtraGeographicLocationBody()` (line 172) |
| Client template | `rd-geographic-location.component.html` — `appFeedbackValidation [isComplete]` expression (line 48) |
| Model | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-geographic-location/models/extraGeographicLocationBody.ts` |
| Backend | No change — `has_extra_geo_scope` persistence already correct. |
| Related specs | None found under `docs/specs/results/` for this section. |

---

## 8. Visual Reference

- Source: User-provided screenshot (ticket attachment `image-20260827-134124.png`)
- Location: Provided inline in the originating message; not persisted under this spec folder.
- Notes: The screenshot's visual layout (label, description box, Yes/No radios) already matches the existing `app-field-card` + `app-pr-radio-button` implementation — no new mockup needed. The screenshot's "No" appearing selected is the **symptom** being fixed, not the target state; the target is an unanswered/blank state until the user picks.

---

## 9. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — Fix the null-coercion at the read boundary (recommended)** | Assign `response.has_extra_geo_scope` as-is (no `Boolean()`), and change the completeness check to treat `null`/`undefined` the same way. | Smallest, most literal fix; matches confirmed root cause exactly; no behavior change for genuinely answered results. |
| B — Add an explicit tri-state flag alongside the boolean | Introduce a separate `has_extra_geo_scope_answered` flag. | More defensive but unnecessary — the server already distinguishes `null` from `true`/`false`; adding a shadow flag duplicates that information for no benefit. |

**Recommended: Option A.**

---

## 10. Risks, Dependencies, And Open Questions

- No open questions — visibility-gate scope and default-value behavior both confirmed with the reporter.
- Dependency: none — pure client-side, no backend/migration work.
- Risk: low — change is localized to one method + one template expression; existing Cypress/Jest coverage for `rd-geographic-location` and `pr-radio-button` should catch regressions. Verify no other reader of `extraGeographicLocationBody.has_extra_geo_scope` assumes it is always a strict boolean (e.g. `onSaveSection()`'s payload construction) — audit during `/akili-specify`.

---

## 11. Success Criteria

- Loading the Geographic Location section for an Innovation result with a never-answered extra-geo-scope question shows no radio selected.
- The section's missing-fields count flags it as incomplete until the submitter answers.
- A previously answered `true`/`false` value still loads and displays correctly (no regression).
- The Global/"to be determined" visibility gate is untouched and still hides the question in those cases.
- Regression test added (red before fix, green after).

---

## 12. Next Step

```text
/akili-specify bugfix/innovation-geo-other-areas
```

in **Bug Mode** — converts this confirmed root cause into a fix plan and a mandatory regression test.

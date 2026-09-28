# Tasks — IPSR GI Impact Area scores parity

- **Linked spec:** [`requirements.md`](./requirements.md) · [`design.md`](./design.md) · refs `docs/prd.md` G1, `docs/ux-ui/design.md` §8, `docs/trd/trd.md` (client `pages/ipsr`)
- **Depth:** Lite · **Status:** not-started · **Budget:** 1 task / ~110 LOC / 1 review round

Pre-flight: OQ-1 is resolved as assumed (header P25-only, see DD-3). No conflicting in-flight spec touches `ipsr-general-information` (checked `docs/specs/`). There is no migration.

## [x] IPSR-GIS-T-1 — Align the Impact Area block with Results

- **Type:** client
- **Description:** Apply design §1 in full: group header + counter (P25), segmented rows with guidance in `[tooltip]`, P25 checkboxes inside `app-field-card`, page-local SCSS overrides and `data-testid="gi-field-gender_tag_id"` on the gender row. Add the `.ts` members `IMPACT_AREA_TAG_FIELDS`, `IMPACT_AREAS_TOTAL`, `impactAreasScored` and `guidanceAsTooltip`. Add Jest cases.
- **Implements:** R-1 (both scenarios), R-2 (scenario + the P22-labels BUT clause), R-3, R-4 (both clauses)
- **Files:** `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-detail/pages/ipsr-general-information/ipsr-general-information.component.{html,ts,scss,spec.ts}`
- **Depends on / Blocks:** — / —
- **Estimate:** S · **Review:** checklist
- **Skills:** `angular-developer`, `tailwind-design-system` (the SCSS override only, no new utilities), `spartan` (consult only; no new Spartan component is introduced)

### Clause ownership

| Clause | Proven by |
|---|---|
| R-1 "`1 of 5` with gender = 0 (id 1)" + BUT "not 0 of 5" | Jest: body `{gender_tag_level_id: 1}` → `impactAreasScored === 1`; `null` / `undefined` / `''` do not count; all 5 set → 5 |
| R-1 guidance: ⓘ when the flag is on, inline box when it is off | Jest: `isReportingFormGuidance2026` mocked true/false → the `app-alert-status` with `impactAreaScoresInfo` is present only when false |
| R-2 "5 segmented, 0 per-tag alert boxes" | Jest DOM (P25 and P22): 5 `app-pr-radio-button[variant=segmented]`; no `app-alert-status` bound to `genderInformation()` … `povertyInformation()` |
| R-2 P25 labels = Results / BUT P22 labels unchanged | Jest: the P25 `label` equals `fields()['[general-info]-gender_tag_id'].label`; P22 = `'Gender equality tag'` (plus the other 4 literals) |
| R-3 card done ⇔ `isImpactAreaComplete` | Jest: P25, tag = 3, `gender_impact_area_id: [1]` → the `app-field-card` `hasValue` is true; `[]` → false |
| R-4 hooks identical | Jest: 5 `[appfeedbackvalidation]` in the block; ids `gender_tag_alert`, `climate_change_tag_alert`, `nutrition_tag_alert`, `environment_tag_alert`, `poverty_tag_alert` present (P25) |
| R-4 BUT "no `mandatory` on the inner `.pr-field`" | Jest: P25 tag = 3 → the checkbox wrapper `.pr-field` has no `mandatory` class |
| Visual match with the screenshot | **Not automatable.** HITL: real browser, the same P25 IPSR next to a Results GI, plus one P22 IPSR (the DD reversion check on Evidence/alert stacking) |

### Verification

- **Falsifier:** a body with `gender_tag_level_id = 1` and the rest `null` that renders the header as `0 of 5`, **or** a P22 render whose gender label is not `Gender equality tag`, **or** fewer or more than 5 `appFeedbackValidation` in the block. Any one of these = FAIL.
- **Red run:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="ipsr-general-information.component.spec"`. The new cases fail before the change (`impactAreasScored` undefined, no segmented variant) and pass after.
- **Build:** `npm run build` (from `onecgiar-pr-client/`). Required because `tsc` does not typecheck templates. An error in `ipsr-general-information.component.html` = FAIL.
- **Lint:** `npx ng lint --quiet` clean on the touched files.
- **Disqualifier:** the Jest DOM cases need `NO_ERRORS_SCHEMA` to render `app-pr-radio-button` attributes. That is acceptable (we assert on host attributes and bindings), **but** a Jest pass then proves bindings, not rendered visuals. The visual row therefore stays HITL-only and can never be marked done from Jest. If the build needs any module/import change, or the diff passes ~160 LOC, stop and re-specify (budget tripwire).
- **Consumers:** none (no shared symbol changed; the new members are private to this component).

### Definition of done

- [x] Red run → green, build green, lint clean
- [x] HITL browser check done (P25 against the screenshot + one P22 IPSR)
- [x] No hex values / no new global SCSS; validation hooks untouched (diff review)
- [x] Commit (only when the user says so): `🎨 style(ipsr-general-information): align Impact Area scores block with results [SPEC:ipsr/gi-impact-area-scores-parity]`, with no apostrophes in the subject (Jenkins)

## Roll-back

Revert the single commit. There is no data, flag or migration involved.

# Design — IPSR GI Impact Area scores parity

- **Depth:** Lite · **Status:** draft · **Requirements:** [`requirements.md`](./requirements.md)
- **Reference implementation:** `pages/results/pages/result-detail/pages/rd-general-information/` (`.html` L77–369, `.scss`, `.ts` `IMPACT_AREA_TAG_FIELDS` / `impactAreasScored`)
- **Files touched (3 + spec):** `pages/ipsr/pages/innovation-package-detail/pages/ipsr-general-information/ipsr-general-information.component.{html,ts,scss,spec.ts}`

No data, API, server or shared-contract change. Every component involved (`app-field-group-header`, `app-field-card`, `app-pr-radio-button variant="segmented"`) is already exported by `CustomFieldsModule`, which the IPSR GI module already imports. **No module edit is needed.**

## 1. Component changes

| Area | Today (IPSR) | After | Req |
|---|---|---|---|
| Heading (P25) | `h1.pr_label` + always-visible `app-alert-status` | `app-field-group-header` label "Impact Area scores", `completed = impactAreasScored`, `total = IMPACT_AREAS_TOTAL`, `unit = "scored"`, `tooltip = guidanceAsTooltip ? impactAreaScoresInfo() : ''`; inline box only when `!guidanceAsTooltip` | R-1 |
| Per-tag guidance | `app-alert-status` above each of the 5 rows | Removed. The same text goes to that row's `app-pr-radio-button [tooltip]` (`genderInformation()`, `climateInformation()`, …) | R-2 |
| Tag control | `app-pr-radio-button` list variant | Adds `variant="segmented"`. Bindings are unchanged | R-2 |
| Tag label | Hard-coded literal | P25: `getImpactAreaFieldLabel('[general-info]-<tag>_id')` (the same `FieldsManagerService` key Results uses). P22: the current literal | R-2 |
| P25 checkbox template | `app-pr-field-header` + `.pr-field` | `app-field-card [label][description][required][hasValue]="isImpactAreaComplete(fieldName)"` wrapping the same `.pr-field` (**no** `mandatory` class) | R-3 |
| `.ts` | — | `IMPACT_AREA_TAG_FIELDS` (the 5 body keys of the IPSR model: `gender_tag_level_id`, `climate_change_tag_level_id`, `nutrition_tag_level_id`, `environmental_biodiversity_tag_level_id`, `poverty_tag_level_id`), `IMPACT_AREAS_TOTAL`, getter `impactAreasScored` (presence: not `null` / `undefined` / `''`), `guidanceAsTooltip = computed(isReportingFormGuidance2026)` | R-1 |
| `.scss` | `.radio_grid` 450px/1fr | Copies the Results page-local overrides: `.radio_grid { display:block }`, flattens `.block_container`, and adds the first-row `border-top: none` via `data-testid` on the gender row | R-2 |

Untouched (R-4): the 5 `appFeedbackValidation` divs and their `isComplete` expressions, the `#gender_tag_alert` / `#climate_change_tag_alert` / … anchors, the P22 `*ngIf` score-2 alerts, the `showImpactAreaEvidenceField` evidence inputs, `ngModel` targets and `onSaveSection`.

## 2. Design decisions

- **DD-1: `[label]` binding, not `fieldRef`, on the tag radios.** Setting `fieldRef` would make the radio read label/required from `FieldsManagerService` in P22 as well, which would change the P22 labels (the P22 key even carries the typo "Gender equality scoren"). A conditional `[label]` keeps P22 byte-identical. *Rejected:* `fieldRef` for both portfolios.
- **DD-2: the counter is copied, not shared.** The Results getter reads `generalInfoBody`, but IPSR uses different body keys (`gender_tag_level_id`, not `gender_tag_id`). A shared helper would need a key-list parameter and a second consumer contract, which is scope creep for 6 lines. It can be revisited if a third screen needs it.
- **DD-3: the group header stays P25-only** (OQ-1, assumed). P22 IPSR has never had a heading here. Adding one is new UI, not parity.
- **DD-4: the SCSS overrides stay page-local.** `.radio_grid` and `.block_container` are global classes. We copy the Results page-local override and never edit `styles/`.

## 3. Reversion challenge (Step 2.3)

| Removed | What does removing it break? | Resolution |
|---|---|---|
| The 5 per-tag `app-alert-status` boxes | (a) The guidance is no longer visible without a hover or focus. (b) Any spec that counts alert boxes. | (a) Same decision Results shipped on 14-sep-2026, and the text is preserved in the ⓘ (keyboard-focusable). (b) The IPSR spec only tests `impactAreaScoresInfo()` text, not the alert DOM (checked: L566–576). Nothing breaks. |
| `.radio_grid` 450px/1fr + `.block_container` card chrome | The P22 score-2 alert and the P22 Evidence input lose their right-hand slot and card shadow, and stack under the row. | Accepted. It reads as the same row list as Results. Verify P22 at the HITL browser check. |
| `h1.pr_label` | Nothing reads the `.pr_label` h1 in this block (scan keys on `.pr-field.mandatory`) | None needed |

## 4. Budget (tripwire for `/akili-execute`)

| Tasks | LOC (net) | Review rounds |
|---|---|---|
| 1 | ~110 (html ~70 · ts ~15 · scss ~12 · spec ~15) | 1 |

This matches Lite. If execution passes ~160 LOC or needs a second rework, stop and escalate.

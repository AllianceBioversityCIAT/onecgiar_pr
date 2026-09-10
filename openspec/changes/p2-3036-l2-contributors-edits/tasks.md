## 1. Pre-flight

- [x] 1.1 Confirmed: `changePrimaryInit` UI-bound only in the Submitter block; service assignment (~line 261) stays → save payload unaffected.
- [x] 1.2 Confirmed `multiple-wps-content` uses `isUnplanned`; the Indicator/Contribution block (~line 67) already gates on `!isUnplanned`.
- [x] 1.3 Grepped: Submitter field and the 30-word limit are isolated to this tree (no twin).

## 2. Remove Submitter

- [x] 2.1 Removed the `@if (getConsumed()) { … Submitter … }` block and its note.
- [x] 2.2 Service still sets `changePrimaryInit` (untouched) → PATCH payload unchanged.

## 3. No-scenario removals (multiple-wps-content.component.html)

- [x] 3.1 Added `&& !isUnplanned` to the Level wrapper `*ngIf` (line 3).
- [x] 3.2 Added `&& !isUnplanned` to the HLO/Outcome `@if` (line 18).

## 4. Word limit

- [x] 4.1 Changed `[maxWords]="30"` → `[maxWords]="50"` on the "Why is the result being reported?" textarea.

## 4b. No-scenario removal — HLO tab header (QA follow-up, P2-3062)

QA (Santiago) flagged the HLO tab header ("HLO N~1" chip + "+" add button) still showing in the No scenario — Level 2 only hid the inner dropdowns, not the outer tab header in `multiple-wps.component.html`.

- [x] 4b.1 `multiple-wps.component.ts`: add `isCP2026 = computed(() => this.fieldsManagerSE.isContributorsPartners2026())` (mirrors the child's gate; `fieldsManagerSE` already injected).
- [x] 4b.2 `multiple-wps.component.html`: gate the tab-header block `@if (!hidden)` → `@if (!hidden && (isCP2026() ? !isUnplanned : true))` so chips + "+" hide in No, only on 2026 (2025 / IPSR / bilateral / share-request unchanged).

## 4c. No-scenario removal — empty ToC container (QA follow-up #2, P2-3062)

QA (Santiago) flagged that, after hiding the HLO tab header, an **empty padded container** still rendered in the No scenario (the `multiple-wps-container` wrapping `app-multiple-wps-content`, whose inner fields are all gated off when `isUnplanned`). Only the parent "Why is the result being reported?" justification should remain.

- [x] 4c.1 `multiple-wps.component.html`: gate the **whole root** `local_container section_container` with `@if (isCP2026() ? !isUnplanned : true)`, and simplify the tab-header condition to `@if (!hidden)`. In 2026 + No nothing of the ToC block renders (no chips, no "+", no empty box); 2025 / Yes / IPSR / bilateral / share-request unchanged.
- [x] 4c.2 `build:dev` passes — no template errors.

## 5. Verify

- [x] 5.1 Build/compile the client — no template errors.
- [ ] 5.2 On a P25 result with ToC = **Yes**: Level and HLO/Outcome still render; no Submitter; indicator block unchanged.
- [ ] 5.3 On a P25 result with ToC = **No**: Level and HLO/Outcome are gone; no Submitter; "Why is the result being reported?" accepts up to 50 words.
- [ ] 5.4 Save on a multi-initiative result and confirm no save/green-check regression from removing Submitter.
- [ ] 5.5 Capture before/after for validation (outside repo / `.local-screenshots/`).

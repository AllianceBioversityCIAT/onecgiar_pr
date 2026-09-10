## 1. AC1 — helper text

- [x] 1.1 Replace the Requests description paragraph in `results-notifications.component.html` with the new text.

## 2. Button rename

- [x] 2.1 In `notification-item.component.html`, set the confirm button label to "Accept contribution" and the reject button label to "Decline contribution" (text only; click handlers unchanged).

## 3. AC2 — default active phase

- [x] 3.1 In `results-notifications.component.ts` `getAllPhases()`, default `phaseFilter` to the current active reporting phase when unset and no phase query param applied; then call `onPhaseChange()` to populate Entity.
- [x] 3.2 Preserve query-param precedence (`setQueryParams`).

## 4. Dynamic Accept validation (ToC alignment)

- [x] 4.1 In `share-request-modal.component.ts` `validateAcceptOrReject()`, gate `missingTocIds` on planned_result being Yes so "No" enables Accept without ToC; verify the result-detail share flow is unaffected (scope to `inNotifications` if needed).

## 5. Verify

- [x] 5.1 `npm run build:dev` passes.
- [x] 5.2 Jest suite passes.
- [ ] 5.3 Visual: helper text updated; Phases pre-selected to active phase + Entity enabled; buttons read "Accept contribution"/"Decline contribution"; Accept enabled on No, disabled on Yes until ToC filled.

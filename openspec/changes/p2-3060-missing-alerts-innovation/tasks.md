## 1. Field 1 — "Current core innovation use" (Innovation Use)

- [x] 1.1 Add a `checkAlert()`-style completeness method to `innovation-use-form.component.ts` (complete when `innov_use_to_be_determined` is set OR ≥1 active actor/organization/measure)
- [x] 1.2 Add `<div appFeedbackValidation labelText="Current core innovation use in number of users that can be supported by evidence (within the reporting year)" [isComplete]="…">` in `innovation-use-form.component.html`, adjacent to the core-innovation radio, so the DOM scan picks it up (P25 only — guard with `fieldsManagerSE.isP25()`)
- [~] 1.3 Logic covered by unit tests + AOT build; same directive/mechanism proven end-to-end by Field 2 DOM test. Live browser check pending (browser busy).

## 2. Field 2 — "Innovation team diversity" (Innovation Development)

- [x] 2.1 Add a completeness getter/method (team-diversity question has a selected `radioButtonValue`) to `innovation-team-diversity.component.ts`, guarded with optional chaining
- [x] 2.2 Add `<div appFeedbackValidation labelText="<question_text>" [isComplete]="…">` in `innovation-team-diversity.component.html` inside the `paddingLeft20` wrapper
- [x] 2.3 Verified via end-to-end DOM test (marker renders without `.complete` when empty, gains `.complete` when selected). Live browser check pending (browser busy).

## 3. Tests

- [x] 3.1 Jest unit tests for the Field 1 completeness method (to-be-determined / actors / orgs / measures / empty cases)
- [x] 3.2 Jest unit tests for the Field 2 completeness method (selected / not-selected / missing-options cases)
- [x] 3.3 Run `npm run test` for the touched specs; keep client coverage thresholds (50/60/60/60)

## 4. Field 3 — "Evidence of user need/user demand" (PENDING QA)

- [ ] 4.1 BLOCKED — await Santi (QA) confirmation over Slack on the expected required behavior for the "Evidence of user need/user demand" section
- [ ] 4.2 Once confirmed: finalize the spec requirement with a concrete completeness rule and wire the alert following the same `appFeedbackValidation` pattern
- [ ] 4.3 Manual + unit verification for Field 3

## 5. Wrap-up

- [ ] 5.1 Lint the touched files (`npm run lint:fix` scoped)
- [ ] 5.2 Commit with the project convention (`🐛 fix(innovation-use-form / innovation-team-diversity) P2-3060: …`) — do NOT push until Yeck approves
- [ ] 5.3 Update `onecgiar-pr-client/src/CLAUDE.md` §21.5 note if a new reusable insight emerged

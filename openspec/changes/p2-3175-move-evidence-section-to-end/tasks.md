# Tasks — P2-3175: Move the Evidence section to the end of the result form

## 1. Branch setup

- [x] 1.1 Create branch `P2-3175-move-evidence-section-to-end` from `staging` (verify with `git branch --show-current` before any commit)

## 2. Implementation

- [x] 2.1 In `onecgiar-pr-client/src/app/shared/routing/routing-data.ts`, move the Evidence entry (`prName: 'Evidence'`, `path: 'evidences'`) from before `...rdResultTypesPages` to after it, keeping the `**` wildcard as the last array entry

## 3. Verification

- [x] 3.1 Run client unit tests (`npm run test`) — expect green, no order-dependent failures
- [x] 3.2 Run lint (`npm run lint`) — clean
- [x] 3.3 In-browser check (`npm start`, prtest backend): open one result per type (Policy Change 1, Innovation Use 2, CapSharing 5, Knowledge Product 6, Innovation Dev 7) and confirm Evidence is the last item of the side menu with sequential numbering; spot-check a P25 result too
- [x] 3.4 Confirm Evidence still works unchanged: open the section, green check renders, deep link `/result/result-detail/<id>/evidences` resolves
- [x] 3.5 Read-only check that server green-checks logic has no section-order dependency (no code change)

## 4. Delivery

- [x] 4.1 Commit with project convention (`🎨 style(routing-data) P2-3175: move Evidence section to end of result form` or `♻️ refactor(...)`) — English message
- [x] 4.2 Push branch and merge to `dev` per team flow; notify QA (Cami) with verification steps; document on the Jira ticket (What was done / Why / How to verify, noting AC4 = N/A per author)

## 1. Implementation

- [x] 1.1 In `customized-alerts-fe.service.ts` `show()`, before inserting the new alert, remove every existing `.custom_modal_container` node (cancel any alert currently on screen, including one mid-close), so only the new alert is shown.

## 2. Tests

- [x] 2.1 In `customized-alerts-fe.service.spec.ts`, add a test: call `show()` twice with different ids and assert only one `.custom_modal_container` remains in the DOM. (Create the spec if it does not exist.)

## 3. Local verification

- [x] 3.1 Run the unit test for the alert service.
- [x] 3.2 Manually verify in the running app: delete an evidence → confirm "Yes, delete" → the confirmation popup is gone before the green "Section saved successfully" appears (no overlap). Re-check a sync confirmation still shows its single toast.

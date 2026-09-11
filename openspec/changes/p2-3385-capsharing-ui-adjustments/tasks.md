## 1. Frontend — pointer on the primary submit action

- [x] 1.1 Add `cursor-pointer` to the submit button's class list in `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.html:333`, keeping `disabled:cursor-not-allowed` ahead of it in effect. Do not touch the `Cancel` button at line 325 (out of scope).
- [x] 1.2 Check whether `lab-report-form.component.spec.ts` already asserts the submit button's class list. If it does, extend that assertion to cover `cursor-pointer`; if it does not, add no new test (a cursor utility does not warrant one on its own).

## 2. Frontend — frame the degree sub-question

- [x] 2.1 Give the capdev sub-term radio group at `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/cap-dev-info/cap-dev-info.component.html:44-51` a `label` so `field-card`'s `isBare` becomes false and the group renders inside the card. Use plain question text consistent with its siblings (`Length of training`, `Delivery Method`).
- [x] 2.2 Confirm `[required]="false"` is still explicitly present on that group and that the surrounding comment explaining the `validate_capdev_term_id()` fallback is still accurate. Update the comment only if the change made it wrong.
- [x] 2.3 Add a regression test in `cap-dev-info.component.spec.ts`: the sub-term group renders with a label AND `required` is `false`. This is the guard against silently turning the section's green check into a blocker.
- [x] 2.4 Update `cap-dev-info/CLAUDE.md` — re-stamp the `Verified:` line and record that the sub-term group now carries a label while staying optional, per the folder-doc rule.

## 3. Frontend — verify the geographic-focus finding (no code change committed here)

- [x] 3.1 Reproduce in the browser: open a Capacity Sharing result, go to the Geographic location section, select nothing, and record what the question actually looks like. Save the screenshot to `onecgiar_pr/.local-screenshots/p2-3385-geographic-focus-no-selection.png` (gitignored).
- [x] 3.2 Decide from the screenshot, not from the ticket's stale one: if nothing now suggests the question is answered, the item is resolved by the earlier `field-card` redesign — write that outcome into P2-3385 with the evidence and stop. If it still misleads, open a separate finding with the real cause; do not change `hasValue` (`pr-radio-button.component.ts:90`) or the `.complete` class (`pr-radio-button.component.html:11`) as part of this change.

## 4. Verification

- [x] 4.1 Run the client unit tests for the touched specs: `npx jest --silent --reporters=summary --no-coverage` scoped to `cap-dev-info` and `lab-report-form`. Paste the real output; a green run is one summary line.
- [x] 4.2 Run `npx ng lint --quiet` on the client and confirm no new findings on the two touched templates.
- [x] 4.3 In the browser at `localhost:4200` (client only — it points at the prtest backend, no local server needed): hover `Create and continue` and confirm the pointer; then open a Capacity Sharing result, choose the long-term length of training, and confirm PhD / Master now sit inside the card with a label and no asterisk.
- [x] 4.4 Capture before/after screenshots into `onecgiar_pr/.local-screenshots/` for the Jira comment.

## 5. Documentation

- [x] 5.1 Comment on P2-3385 with what was done, how to verify it in the app (result type: Capacity Sharing; the length-of-training answer that reveals the sub-question), and the outcome of task 3.2.
- [x] 5.2 In that same comment, record the two known-and-not-fixed items with their reason: the `Cancel` button cursor (`lab-report-form.component.html:325`) and the bilateral twin (`type-capacity-sharing.component.html:94-102`) — both the same defect, neither named by this ticket.

## Out of scope — do not do these

- No server code, no migrations, nothing touching `validation_capacity_dev_P25` / `_P22`.
- No changes to `field-card`'s `isBare` logic, to `hasValue`, to the `.complete` class, or to `DataControlService`.
- No git state changes — no add, commit, push, or branch switching.

## 1. Frontend — remove the duplicated question (Section 4)

- [x] 1.1 In `onecgiar-pr-client/src/app/shared/components/innovation-use-form/innovation-use-form.component.html`, remove the innovation link radio button (`fieldRef="[innovation-use-form]-has-innovation-link"`) and the dependent "Please select a result" multi-select block, keeping the rest of the `@if (!this.isIpsr)` branch intact.
- [x] 1.2 In `onecgiar-pr-client/src/app/shared/components/innovation-use-form/innovation-use-form.component.ts`, drop members that become unused after 1.1 (e.g. `formatResultLabel`, the `innovationUseResultsSE` injection) only if nothing else in the template or class still uses them — verify with a grep before deleting.
- [x] 1.3 Confirm the IPSR consumer `pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n1/step-n1.component.html` still compiles and renders unchanged (it passes `[isIpsr]="true"`).

## 2. Frontend — stop Section 4 from overwriting the Section 2 answer

- [x] 2.1 In `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-use-info/innovation-use-info.component.ts`, change `onSaveSection()` so `has_innovation_link` and `linked_results` are taken from a fresh read of the server state (`GET_innovationUseP25`) performed as part of the save, instead of the values loaded when the component mounted.
- [x] 2.2 Ensure the payload NEVER carries `undefined` or `null` for `has_innovation_link`: on a failed or empty read, fall back to the value already held in `innovationUseInfoBody`. (The server treats a falsy value as "no link" and wipes the linked results.)
- [x] 2.3 Leave the P22 branch (`PATCH_innovationUse`) sending the same payload shape as before — only the source of the two values changes.

## 3. Frontend — remove the orphan field definition

- [x] 3.1 Grep the client for `[contributors-partners]-is-lead-by-partner` to confirm no template consumes it.
- [x] 3.2 Remove that entry from `onecgiar-pr-client/src/app/shared/services/fields-manager.service.ts` (its label is a copy of the innovation link question).
- [x] 3.3 Verify `rd-contributors-and-partners.component.html` still resolves its label through `[innovation-use-form]-has-innovation-link` and renders unchanged.

## 4. Tests

- [x] 4.1 Update `onecgiar-pr-client/src/app/shared/services/fields-manager.service.spec.ts`: drop the assertions on the removed key, keep the ones covering the surviving key.
- [x] 4.2 Update `innovation-use-form.component.spec.ts` to assert the innovation link control is no longer rendered.
- [x] 4.3 Add specs in `innovation-use-info.component.spec.ts` covering: payload uses the freshly read values; fallback to the held value when the read fails; payload never sends `undefined`/`null` for `has_innovation_link`.
- [x] 4.4 Run the touched specs (`npm run test src/app/...`), then the full client suite to confirm the coverage gate (branches 50 / functions 60 / lines 60 / statements 60) still passes.

## 5. Verification in the app (test backend)

- [x] 5.1 `cd onecgiar-pr-client && npm start`, sign in, open a **P25 innovation use** result.
- [x] 5.2 Section 2: answer **Yes**, select two linked results, save. Section 4: confirm the question is gone. Save Section 4. Return to Section 2 → the answer is still Yes and both linked results are still there.
- [x] 5.3 Repeat with **No** in Section 2: save Section 4, return to Section 2 → still No.
- [ ] 5.4 Stale-state check: open Section 4, then change the Section 2 answer in another tab/route, come back and save Section 4 without reloading → the Section 2 answer wins.
- [x] 5.5 Regression: open a **P22** innovation use result and save the section — no error, no visible change from before.
- [x] 5.6 Regression: open the **IPSR** innovation use pathway step 1 → renders exactly as before.
- [x] 5.7 Confirm persistence with a read-only check against the test backend, e.g. `curl -s -H "auth: $TOKEN" "https://prtest-back.ciat.cgiar.org/..."` for the same result id, and compare `has_innovation_link` / linked results before and after a Section 4 save.
- [x] 5.8 Capture before/after screenshots into `onecgiar_pr/.local-screenshots/` (gitignored) as `p2-3199-*.png` for the Jira update.

## 6. Hand-offs (no code here)

- [x] 6.1 Comment on [P2-3199](https://cgiarmel.atlassian.net/browse/P2-3199) with what was done, how to verify, branch and commits.
- [x] 6.2 Report to the backend team, on the same ticket, that `PATCH /results-framework-reporting/innovation-use` deletes linked results when `has_innovation_link` is absent (`if (!has_innovation_link) → createForInnovationUse(resultId, [], user)`), and that the endpoint should ignore fields that are not present. Include the file/line evidence. **Do not modify server code.**
- [x] 6.3 Notify Santiago Sánchez on Slack when the change is deployed to testing, and remind him the green check / P2-3191 stays with him and Juan David.

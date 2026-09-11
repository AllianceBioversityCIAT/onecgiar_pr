## 1. Frontend — pre-flight

- [x] 1.1 Re-read the live payload for question 112 and confirm the three level-2 options and six level-3 sub-options.
      **Confirmed against prtest** (`GET /v2/api/results/questions/innovation-development/7000`): 112 → 113 "Yes…" (6 sub-options 116–121), 114 "No concrete actions…", 115 "This does not apply…". **This contradicts the requirement audit** published on the ticket, which recorded eight flat options — corrected on P2-3291.
- [x] 1.2 Confirm `checkboxConfig` still has exactly three consumers, all under `innovation-dev-info/components/`.
      `innovation-team-diversity`, `gesi-innovation-assessment`, `scale-impact-analysis`. No other consumer in the client.
- [x] 1.3 Confirm the line references still match: `pr-radio-button.component.html:89-107`, `pr-radio-button.component.scss:13-18, 22-28`.

## 2. Frontend — the visual sub-group

- [x] 2.1 `pr-radio-button.component.html` — wrap the contents of the sub-options `ng-container` in a single `div.radioButton__subGroup`. `*ngIf` conditions untouched.
- [x] 2.2 `pr-radio-button.component.scss` — `.radioButton__subGroup`: `margin-left: 28px`, `padding-left: 16px`, `border-left: 1px solid var(--pr-border-strong)`, `margin-top: 8px`.
      **`--pr-border-divider` was tried first and rejected after looking at it in the browser**: at `#eeeef1` on a white card the 1px rule is invisible, which is worse than no rule. `--pr-border-strong` (`#d5d5dc`) reads.
- [x] 2.3 `pr-radio-button.component.scss` — move `&__subLabel` out of `.radioButton`, where it had never matched, into the sub-group. Typography and secondary colour kept.
- [x] 2.4 `pr-radio-button.component.scss` — drop the redundant `margin-left: 20px` on `.checkboxList`.

## 3. Tests

- [x] 3.1 `pr-radio-button.component.spec.ts` — sub-group renders only when the parent option is selected and has sub-options.
- [x] 3.2 A radio group without sub-options renders no wrapper.
- [x] 3.3 The sub-label is rendered inside the wrapper (`closest('.radioButton')` is null).
- [x] 3.4 Cases built from the real payload shape: three top-level options, six sub-options on the affirmative one, none on either dismissal, none before an answer is given.
      Added as stubs with `NG_VALUE_ACCESSOR` **declared on the stub component itself** — providing it through the TestBed does not satisfy NgModel and throws `NG01203`.
- [x] 3.5 Run the specs and paste the real output into the ticket.
      `npx jest .../pr-radio-button.component.spec.ts` → **7 passed, 7 total**.
      `npx jest .../innovation-dev-info` → **16 suites, 136 tests, all passed**.

## 4. Verification in the app

- [x] 4.1 Innovation team diversity in all three states on a 2026 Innovation Development result (code **8565**, phase 36).
      Yes → sub-group with 6 rows, `margin-left: 28px`, `border-left: 1px solid rgb(213,213,220)`, sub-label inside. No / N.A. → 0 sub-groups, 0 checkbox rows.
      Measured: the radio label starts at x=611, the first checkbox at x=630 — the sub-options now begin **after** the text they depend on. Before the change they sat at ~607, to its left.
- [x] 4.2 The other two questions built on the same control.
      `gesi-innovation-assessment`: affirmative option → sub-group, 6 rows; "No actions taken yet" → none. `scale-impact-analysis`: affirmative → sub-group, 6 rows; the other three options → none.
- [x] 4.3 A radio group with no sub-options is visually unchanged.
      General information on the same result: 5 Impact Area groups, **0** sub-groups and **0** checkbox lists rendered. They use `variant="segmented"`, which does not enter the changed branch at all.
- [x] 4.4 A result that already carries an answer.
      Result **8799** (Submitted, 2026): "Yes" selected, sub-group rendered with its 6 rows and the **2 stored sub-options still ticked**, section reported complete. Nothing about the saved answer changed.
- [ ] 4.5 Strict read-only view (a user without edit rights).
      ⚠️ **NOT verified.** Every 2026 Innovation Development result reachable with this account renders its controls enabled, so the `readOnly` path could not be exercised. Low risk — `readOnly` only sets attributes on the controls and never touches the wrapper — but it was not checked, and saying so is cheaper than a false claim.
- [x] 4.6 Screenshots to `onecgiar_pr/.local-screenshots/`: `p2-3291-team-diversity-after.png`, `p2-3291-team-diversity-after-zoom.png`, `p2-3291-team-diversity-answered-result.png`.

## 5. Documentation

- [x] 5.1 New folder guide `custom-fields/pr-radio-button/CLAUDE.md` — the contract, the three `checkboxConfig` consumers, and the four traps (the sub-option clearing in `onValueChange`, the `groupName` id rule, the sibling-not-descendant DOM shape, the `NG_VALUE_ACCESSOR` stub requirement).
- [x] 5.2 `innovation-dev-info/CLAUDE.md` — records that its three questions are the only consumers of that branch, and that the data hierarchy already exists. Re-stamped.

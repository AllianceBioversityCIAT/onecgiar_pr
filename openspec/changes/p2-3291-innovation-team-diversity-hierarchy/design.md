## Context

Verified on `performance-refactor`, head `c813fd719`, against the live payload from prtest.

**The data is already two-level.** `result-questions.service.ts:571` (`innovationTeamDiversityV2`) reads question 112 (level 1, result type 7, version `P25`), its level-2 children as `options`, and their level-3 children as `subOptions`:

| Level | id | Text |
|---|---|---|
| 2 | 113 | "Yes, concrete actions have been taken to ensure:" — 6 sub-options |
| 3 | 116–121 | Gender / Experience / Expertise / Disciplinary / Regional / Other |
| 2 | 114 | "No concrete actions to diversify the innovation team composition…" — 0 sub-options |
| 2 | 115 | "This does not apply to this innovation" — 0 sub-options |

**The conditional logic already exists.** `pr-radio-button.component.html:89`:
`*ngIf="option?.subOptions?.length && value === option[optionValue]"` — the six checkboxes render only while 113 is the selected radio, and disappear when the user picks 114 or 115.

**What is actually wrong is the geometry.** In the rendered DOM the wrapper `*ngFor` div holds three siblings: `.radioButton` (a 16px native radio + 8px gap + label, so the label text starts at ~24px), then `<p class="radioButton__subLabel">`, then one `.checkboxList` per sub-option at `margin-left: 20px`. A checkbox at 20px sits *to the left of* the radio label text above it. Nothing about the layout says "these belong to Yes".

**And one selector is dead.** `pr-radio-button.component.scss:13` declares `&__subLabel` **inside** `.radioButton`, producing `.radioButtonList .radioButton .radioButton__subLabel`. The `<p>` is a sibling of `.radioButton`, so that rule has never applied: the sub-label gets neither its `margin-left: 25px` nor its `body-2` typography nor its secondary colour.

## Goals / Non-Goals

**Goals:**
- Make the six diversity types read unmistakably as sub-options of "Yes", using the existing app tokens.
- Fix the dead sub-label selector, since the sentence it styles is part of the same visual group.
- Leave the stored contract, the option set and the conditional logic exactly as they are.

**Non-Goals:**
- Inventing a synthetic "Yes" or restructuring the questionnaire. Both were considered by the requirement audit under a mistaken reading of the data; the payload shows they are unnecessary.
- Clearing the six sub-answers when the user switches to "No" or "N.A." — see D3.
- Changing wording, the required flag, or the green check.
- Refactoring `app-pr-radio-button` beyond the sub-option block.

## Decisions

**D1 — Group with a wrapper element and a vertical rule, not with a bigger margin.**
A larger `margin-left` moves the checkboxes right but still leaves six free-floating rows; nothing marks where the group starts and ends. A wrapper carrying `border-left: 1px solid var(--pr-border-strong)` draws the containment explicitly and is the cheapest honest signal. `--pr-border-strong` (`#d5d5dc`) is an existing token, so no new colour enters the palette. **`--pr-border-divider` (`#eeeef1`) was tried first and rejected after looking at it**: on a white card that line is invisible at 1px, which is worse than omitting it — the code would claim a grouping signal it does not deliver. Alternative rejected: a nested card or background fill — heavier than the problem, and it would compete with `app-field-card`, which already wraps the whole question.

**D2 — Indent to 28px, past the radio label's optical start.**
The radio label text begins at ~24px (16px control + 8px gap). The sub-group sits at 28px so the checkboxes clearly start *after* the text they depend on, rather than under the radio control. Alternative rejected: aligning exactly at 24px — visually ambiguous at a glance, which is the very complaint.

**D3 — Leave the existing clearing behaviour exactly as it is.**
The requirement audit raised this as an open question — what happens to ticked diversity types when the user switches to a dismissal answer — and proposed clearing them. Reading the control settles it: `pr-radio-button.component.ts:149-164` (`onValueChange`) **already** walks every option's `subOptions` and resets `answer_boolean` to `false` and `answer_text` to `null` on every value change. So the contradictory-record risk the audit worried about does not exist, and the answer the audit asked business for is already in the code. *Decision:* touch none of it. The ticket says _"No change to the underlying data model or stored values"_, and the current behaviour already matches what the audit would have asked for. The open question is withdrawn on the ticket with this evidence rather than left hanging.

**D4 — Change the shared control, not just the one component.**
The wrapper lives in `pr-radio-button`, so all three `checkboxConfig` consumers get the grouping. That is correct rather than a spill: all three are Innovation Development questions with the identical structure and the identical complaint latent in them, and two of them (`gesi-innovation-assessment`, `scale-impact-analysis`) are slated for removal by P2-3290 anyway. Alternative rejected: a local override in `innovation-team-diversity.component.scss` — it would need `::ng-deep` to pierce the child's encapsulation, and it would leave two sibling questions inconsistent with the one next to them.

**D5 — Fix the dead selector rather than delete it.**
The rule was written with intent (25px indent, `body-2`, secondary colour); it simply never matched. Re-parenting it restores what the author meant. Alternative rejected: deleting it as unused — that would ship the sub-label with browser-default paragraph margins, which is worse than today.

## Risks / Trade-offs

- **The grouping affects two other questions in the same form** → intended (D4), and both are visually improved in exactly the same way. Verified by opening all three.
- **A radio group elsewhere in the app starts using `checkboxConfig` later and inherits the rule** → that is the desired default for a sub-option list; the rule is scoped to the branch that only renders when sub-options exist.
- **The sub-label becomes visible in a way testers have not seen** → it was always in the DOM, only unstyled. Called out in the verification steps so it is not filed as a new element.
- **D3 leaves hidden sub-answers reachable in stored data** → unchanged from today; recorded as an open question on the ticket rather than fixed under a display-only scope.

## Migration Plan

No data migration, no feature flag. Template and stylesheet only; rollback is reverting the commit.

## Open Questions

None. The one question the requirement audit raised — what happens to ticked diversity types when the user switches to a dismissal answer — is answered by the code itself: `onValueChange` already clears them (D3). It is withdrawn on the ticket with that evidence, so nothing is left pending on business.

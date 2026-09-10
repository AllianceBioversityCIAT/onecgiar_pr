## Why

**Frontend-only change. No backend work is required.** Jira: **P2-3291** (epic P2-3243 — SIDS Forms Update W1/W2).

The Innovation Development form asks whether concrete actions have been taken to promote diversity in the innovation team. Business feedback (Nicoleta Trifa, CGIAR System Organization, 4 Aug 2026) is that the six diversity checkboxes "are placed on same alignment in PRMS and doesn't look like the options are derived from YES".

**The requirement audit published on the ticket described the current state incorrectly and is corrected here.** It recorded "eight options at the same level, six of them diversity types and two of them dismissals", and raised an open question about whether "Yes" would have to become a stored answer. Reading the live payload settles both points:

- `GET /v2/api/results/questions/innovation-development/{id}` returns question **112** with exactly **three** level-2 options — **113** "Yes, concrete actions have been taken to ensure:", **114** "No concrete actions…", **115** "This does not apply to this innovation" — and the **six** diversity types as level-3 `subOptions` of 113 (ids 116–121).
- So "Yes" **already exists as a stored row**. It does not have to be invented, derived or migrated, and the contradiction the audit raised does not exist.
- `pr-radio-button.component.html:89` already renders the sub-options **only** when their parent option is the selected one, so the conditional logic in Part 3 of the ticket is already implemented.

What is left is exactly what business asked for and nothing more: **the six checkboxes do not read as subordinate to "Yes"**. They are indented by 20px, which lands them at roughly the same optical position as the radio labels above them.

## What Changes

- The conditional sub-options of a radio option are wrapped in a **visual sub-group**: indented past the radio's own label and marked with a vertical rule, so they read as belonging to the option that revealed them.
- **Bug fixed on the way:** `pr-radio-button.component.scss:13` nests `&__subLabel` inside `.radioButton`, but the `<p class="radioButton__subLabel">` in the template is a **sibling** of `.radioButton`, not a descendant. The selector has never matched, so "Multiple answers can be selected." renders with default paragraph styling and no indentation. It is moved to a selector that matches.
- No change to the questionnaire, to stored answers, to which options exist, or to the conditional logic — all four already behave as the ticket requires.

## Capabilities

### New Capabilities
- `innovation-team-diversity-question`: how the Innovation team diversity question presents its three top-level answers and the six conditional diversity types — the visual hierarchy, and the guarantee that the stored contract is untouched.

### Modified Capabilities
<!-- None. -->

## Impact

**Code (client only), all inside the Innovation Development form's shared control:**
- `src/app/custom-fields/pr-radio-button/pr-radio-button.component.html:89-107` — the `ng-container` holding the sub-label and the checkbox list gains a wrapper element.
- `src/app/custom-fields/pr-radio-button/pr-radio-button.component.scss:13-18, 22-28` — the dead `&__subLabel` selector and the `.checkboxList` indentation.

**Blast radius:** `checkboxConfig` has exactly **three** consumers, all three in `innovation-dev-info/components/`: `innovation-team-diversity`, `gesi-innovation-assessment`, `scale-impact-analysis`. All three use the identical pattern (`verticalAlignment` + `subLabel="Multiple answers can be selected."` + `listAttr: 'subOptions'`), and all three belong to Innovation Development — the only result type in this ticket's scope. Radio groups without sub-options never enter the changed branch and are visually unaffected.

**Backend:** none. No question, option, answer or migration is touched.

**Phase scope:** the epic's governing rule (2026 onwards, previous phases unchanged) is satisfied by construction. The questionnaire is versioned — `innovationTeamDiversityV2()` filters `version: 'P25'` — but this change alters no data at all, only how already-rendered sub-options are laid out. A 2025 result reading the P22 questionnaire gets the same improved grouping of its own options, which is presentation, not content.

**SDD baseline:** `docs/ux-ui/design.md` (form layout and component behaviour). The Claude Design mockup was re-read on 2026-08-25 and does not cover this legacy questionnaire — it contains no radio groups — so the existing app tokens are the reference, not the mockup.

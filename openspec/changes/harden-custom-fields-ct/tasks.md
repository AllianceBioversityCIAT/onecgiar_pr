## 1. Baseline and shared harness

- [x] 1.1 Run `npm run test:ct` and record the starting state (currently 67 tests / 23 spec files) so any new red is attributable to this change
- [x] 1.2 Read `pr-multi-select.component.ts` on `master` (`git show master:...`) and write down its observable behaviour for: selection, deselection, search, select-all, disabled options, deletion guards — this is the reference contract, not the current code
- [x] 1.3 Extend `cypress/support/ct-utils.ts` with the shared contract blocks from design D4: read-only gate, `isStatic` rendering, `.pr-field.mandatory`/`.complete` validation DOM, placeholder rendering
- [x] 1.4 Add a mount helper that exposes the bound model to the test so external in-place mutation (`splice`/`push`) can be driven from the spec

## 2. pr-multi-select — priority 1 (34 consumers, user-reported defects)

- [x] 2.1 Model synchronisation: selection adds `optionValue`, deselection removes it, pre-existing values render checked, `selectOptionEvent` emits once
- [x] 2.2 External mutation: in-place `splice` unchecks, `push` checks (the known regression path)
- [x] 2.3 Late-arriving options: mount with `[]`, replace with real options, assert rendering and that model values render checked
- [x] 2.4 Immutability: the parent's `options` array is unchanged in length, order and object identity after select/deselect cycles
- [x] 2.5 `[disableOptions]`: disabled option stays visible, rejects selection, leaves model untouched
- [x] 2.6 `[cannotRemoveOptionValues]`: protected chip has no remove affordance and survives deselection; unprotected values still removable
- [x] 2.7 Deletion guards: `[confirmDeletion]` blocks removal until confirmed and restores on dismiss; `[logicalDeletion]` flags instead of splicing
- [x] 2.8 `[showSelectAll]`: selects all enabled options, skips disabled ones, deselect-all retains protected values
- [x] 2.9 Search: filters the view only, preserves selections, restores full list on clear, selecting a filtered match appends
- [x] 2.10 Labels: placeholder shows only while empty, `selectedLabel` count reflects the selection
- [x] 2.11 Run the multi-select spec, triage every failure against the `master` reference, and record it in the defect report

## 3. High-usage single-value fields

- [x] 3.1 `pr-select` (53 consumers): CVA both directions, programmatic set, clear to `null`, placeholder, required marker
- [x] 3.2 `pr-input` (50 consumers): CVA both directions, clear, placeholder, required marker
- [x] 3.3 `pr-radio-button` (39 consumers): CVA both directions, exclusive selection, programmatic set
- [x] 3.4 `pr-textarea` (27 consumers): CVA both directions, clear, word-counter interaction where wired
- [x] 3.5 Run the four specs, triage failures against `master`, append to the defect report

## 4. Remaining fields

- [x] 4.1 `pr-checkbox` (14) and `pr-yes-or-not` (14): CVA both directions, programmatic set, required marker
- [x] 4.2 `pr-range-level` (5): CVA both directions, boundary values
- [x] 4.3 Shell and feedback components (`field-card`, `pr-field-header`, `alert-status`, `pr-word-counter`, `custom-validation-tooltip`, `pr-field-validations`): apply the shared read-only/static/label contracts from 1.3
- [x] 4.4 Action and domain components (`pr-button`, `add-button`, `save-button`, `sync-button`, `edit-or-delete-item-button`, `lead-contact-person-field`, `detail-section-title`, `no-data-text`, `under-construction-point`): apply the shared contracts; keep zero-consumer inputs at smoke level per design non-goals

## 5. Report and close

- [x] 5.1 Run the full `npm run test:ct` suite and capture the final tally (passed / failed / total)
- [x] 5.2 Write the defect report: one entry per legitimate red test with reproduction, expected vs actual, and the `master` evidence backing the expectation
- [x] 5.3 Separate the report into confirmed regressions vs behaviour changed on purpose by the Spartan redesign, and hand the second list to the user for confirmation
- [x] 5.4 State plainly in the handover that the suite is intentionally NOT fully green, and that fixing the defects is a separate authorised change
- [ ] 5.5 Verify no production file was modified (`git status` shows only `*.cy.ts` and `ct-utils.ts`), then run lint and the Jest suite before any push, per the green-gate rule

## Why

The `custom-fields/` library is the interaction layer of the whole client: `app-pr-select` appears in 53 screens, `app-pr-input` in 50, `app-pr-radio-button` in 39, `app-pr-multi-select` in 34. It is **excluded from Jest coverage** by design (jsdom cannot lay out its `:focus-within` dropdowns and virtual scroll), so Cypress Component Testing (CT) is the *only* automated gate these components have — and today that gate is 67 tests across 23 components (~3 each). They are smoke tests: they assert what the code currently does, so a regression that changes behaviour consistently still passes.

That gap is no longer theoretical. The user reported real multi-select failures while using the app after the Angular 21 + Spartan migration (PrimeNG was removed on `performance-refactor`), and `pr-multi-select` alone exposes **26 inputs** guarded by 7 tests. Without contract-level tests we cannot tell a deliberate redesign from a silent regression.

**This change is frontend-only.** No backend/server work is required, and none is requested from the user.

## What Changes

- Replace the smoke-level CT suite for `custom-fields/` with a **contract suite**: each test states how the component is *expected* to behave, not how it currently behaves.
- Derive every expectation from three auditable sources, never from the current implementation:
  1. **`master` as the reference contract.** The same components run there on PrimeNG and have been in production for years. Any behavioural difference on `performance-refactor` is a regression candidate.
  2. **Real consumer usage.** Extract from the consuming templates which inputs and combinations are actually used, and prioritise those. Inputs nobody uses get lower priority than inputs used in 34 screens.
  3. **User-reported defects**, starting with the multi-select failures.
- **Failing tests are treated as defects, not as tests to soften.** A red contract test is reported as a bug with its reproduction; production code is NOT modified to make it pass without explicit authorisation.
- Deliver a **defect report** listing every legitimate red test found, with the expected-vs-actual behaviour and the `master` evidence backing the expectation.
- Sequence by real-world exposure: `pr-multi-select` first (priority 1, user-reported), then `pr-select`, `pr-input`, `pr-radio-button`, `pr-textarea`, then the remaining components.

Out of scope (explicitly): wiring CT into CI, rewriting the 3 stale `cypress/e2e/` specs, and fixing any defect the suite uncovers. Those are follow-ups, not this change.

## Capabilities

### New Capabilities
- `custom-fields-contract`: the expected behaviour of the shared form-field components in `src/app/custom-fields/` — selection and deselection semantics, model synchronisation (including external in-place mutation), search/filter interaction, grouping, select-all, deletion guards (`confirmDeletion`, `logicalDeletion`, `cannotRemoveOptionValues`), read-only/static rendering, and required-field validation state — expressed as testable contracts and enforced by Cypress CT.

### Modified Capabilities
<!-- None. No existing spec under openspec/specs/ covers custom-fields; the 8 current specs are feature-scoped (evidence, toc, leads, alerts). -->

## Impact

- **Code touched:** `src/app/custom-fields/**/*.cy.ts` (23 spec files) and `cypress/support/ct-utils.ts` if new mount helpers are needed. **No production component code is modified by this change.**
- **Commands:** `npm run test:ct` (Cypress 14.5.1, headless, `src/**/*.cy.ts`). Local-only — CT is not part of the Jenkins pipeline (verified against build #63: `Startup → Test → Linting → Frontend Build → Deploy`), so this change does not alter CI timing or the deploy gate.
- **Known constraint:** `RolesService.readOnly` defaults to `true` and hides the interactive control; mounts must pass `editable: true`.
- **Stack:** Angular 21 + Spartan + Tailwind (preflight enabled); PrimeNG is fully removed on this branch, which is precisely why `master` is a *behavioural* reference and not a code reference.
- **SDD baseline:** component rules and the "never raw native controls" mandate come from `docs/system-design/design.md`; the CT-as-the-validation-layer decision for `custom-fields/` is stated in `onecgiar-pr-client/CLAUDE.md` §9.
- **Jira:** no ticket exists for this work — it originates from a direct user request on the `performance-refactor` branch. A ticket should be opened if the defect report needs to be triaged by the team.

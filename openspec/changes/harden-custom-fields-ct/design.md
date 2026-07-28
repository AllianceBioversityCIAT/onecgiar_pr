## Context

`src/app/custom-fields/` holds the 23 shared form-field components every reporting screen is built from. They are deliberately excluded from Jest coverage (`collectCoverageFrom: ['!./src/app/custom-fields/**/*']`) because their behaviour lives in real browser layout — `:focus-within` dropdowns, CDK virtual scroll, overlay positioning — which jsdom cannot reproduce. Cypress Component Testing is therefore the only automated gate on this layer, and it is not part of CI (verified against Jenkins build #63: `Startup → Test → Linting → Frontend Build → Deploy`). It exists so a developer or an agent can self-verify locally.

The current suite is 67 tests over 23 components. It was written *descriptively* — asserting what the implementation does — so it cannot detect a regression that changes behaviour consistently across component and test.

**What changed underneath.** On `performance-refactor` these components were migrated from Angular 19 + PrimeNG to Angular 21 + Spartan. The diff of `pr-multi-select.component.ts` against `master` shows the substantive change is `@Input()` → `input()` **signals** (and `@Output()` → `output()`), plus a new internal `optionsIntance` copy. Signal inputs are read as functions and settle on a different change-detection schedule than decorator inputs — the classic source of "it renders but doesn't react" defects. This is consistent with the multi-select failures the user observed while using the app.

### Data flow being tested

```
parent template  →  [options] / optionLabel / optionValue / [disableOptions]   (config in)
       ↕            [(ngModel)]  ⇄  ControlValueAccessor  ⇄  internal state    (two-way model)
       ←            (selectOptionEvent) / (removeOptionEvent)                  (events out)
```

CT owns exactly this boundary: a host component supplies the inputs and the bound model, and the test drives the DOM as a user would. No API, no service, no router.

### Canonical real-world usage (measured, not assumed)

Across the 34 templates consuming `app-pr-multi-select`, the dominant shape is:

```html
<app-pr-multi-select
  [options]="dropdown1Options()"        label="Contributing CGIAR Centers"
  selectedLabel="Center(s) selected"    optionLabel="full_name"  optionValue="code"
  [required]="false"                    [(ngModel)]="partnersBody.contributing_center"
  placeholder="Select center(s)"        [disableOptions]="cgspaceDisabledList"
  (selectOptionEvent)="onContributingCenterSelect($event)">
```

Input usage by real consumer count — this is the prioritisation key:

- `[options]` 34 · `[required]` 27 · `optionValue=` 31 · `label=` 26 · `optionLabel=` 25 · `placeholder=` 23
- `selectedLabel=` 15 · `[readOnly]` 11 · `[disableOptions]` 10 · `[isStatic]` 7
- `[confirmDeletion]` 4 · `[showSelectAll]` 2 · `[logicalDeletion]` 1 · `[cannotRemoveOptionValues]` 1
- **Zero consumers:** `group` / `optionGroupLabel` / `optionGroupChildren`, `flagsCode`, `showPartnerAlert`, `selectedPrimary`, `hideSelect`

Components sharing this contract surface: `pr-select` (53 screens), `pr-input` (50), `pr-radio-button` (39), `pr-multi-select` (34), `pr-textarea` (27), `pr-checkbox` (14), `pr-yes-or-not` (14), `pr-range-level` (5). They all sit behind the same `RolesService.readOnly` gate and the same `.pr-field.mandatory/.complete` DOM contract that `DataControlService.someMandatoryFieldIncompleteResultDetail()` scans — so the read-only and validation contracts must be written once and applied uniformly.

## Goals / Non-Goals

**Goals:**
- Express each component's behaviour as **contracts derived from an external source of truth**, never from reading the current implementation.
- Make a regression *fail loudly*: if `performance-refactor` behaves differently from `master` on a path a real consumer depends on, a test goes red.
- Prioritise by measured consumer usage so effort lands where breakage actually hurts.
- Produce a defect report that a developer (or Juan David for anything server-side) can act on without re-investigating.

**Non-Goals:**
- Fixing the defects found. A red test is the deliverable; the fix is a separate, authorised change.
- Wiring CT into Jenkins or GitHub Actions.
- Repairing the 3 stale `cypress/e2e/` specs from October 2025.
- Testing inputs with **zero real consumers** (`group`, `flagsCode`, `showPartnerAlert`, `selectedPrimary`) beyond a smoke-level assertion — spending contract effort there is laboratory work.

## Decisions

### D1 — `master` is the specification of record

**Decision:** When the expected behaviour of a path is not otherwise documented, read the `master` implementation (PrimeNG, years in production) and encode *its* observable behaviour as the contract.

**Why over the alternatives:** Writing expectations from intuition invents requirements — the exact failure mode the user warned about ("cómo se espera, no cómo está"). Writing them from the current code reproduces the bug in the test. `master` is the only artefact that is both behavioural and independently validated: users have exercised it in production for years.

**Boundary:** `master` is a reference for *behaviour*, not for *code* — PrimeNG is gone, so no markup or selector may be copied from it. Where the redesign changed behaviour **on purpose**, the test documents the new contract and the deviation is noted in the report rather than filed as a bug.

### D2 — Contracts are written from the consumer's need, not the component's API

**Decision:** Each test names a real usage and the guarantee that usage depends on. `cannotRemoveOptionValues` is tested because `rd-contributors-and-partners` pins the lead center with it — not because the input exists.

**Why:** It produces tests that fail for reasons that matter, and it keeps the suite proportional: 26 inputs do not deserve 26 equal shares of effort when 4 of them carry 34 screens.

### D3 — Red tests are defects; production code is not touched

**Decision:** A failing contract test is recorded in the defect report with expected vs actual and the `master` evidence. Neither the component nor the assertion is softened to reach green.

**Why:** This is the whole point of the exercise. It also matches the standing rule on this branch: the agent does not modify production code to make its own tests pass. **Trade-off:** the suite ends this change *not fully green*, which is the intended outcome and must be stated plainly rather than hidden.

### D4 — Shared contracts are written once and reused

**Decision:** Behaviours common to every field — the `RolesService.readOnly` gate, `isStatic` rendering, the `.pr-field.mandatory` / `.complete` validation DOM, placeholder and label rendering — go into a shared contract block in `cypress/support/ct-utils.ts` applied per component, rather than being retyped 23 times.

**Why:** These are the behaviours most likely to have drifted uniformly during the Spartan migration, and a single definition means a single place to correct when the contract itself is clarified. **Alternative rejected:** fully independent spec files — simpler to read in isolation, but guarantees the 23 copies diverge.

### D5 — Signal-input reactivity gets first-class coverage

**Decision:** Every component with signal inputs gets explicit tests for *late* and *external* mutation: options arriving after mount (the real case — they come from an async API), the bound model being mutated in place by the parent (`splice`/`push`), and inputs being replaced wholesale.

**Why:** This is the migration's actual risk surface (D1's diff). The one existing test of this kind — "reflects an EXTERNAL in-place removal (splice)" — was written because that exact bug shipped before. That precedent is the strongest available evidence that this class of defect recurs here.

## Risks / Trade-offs

- **Expectations drift into invention where `master` is silent** (behaviour added after the fork, e.g. `cannotRemoveOptionValues`) → For those paths the contract is derived from the consumer's usage and stated explicitly as such in the report, so the user can confirm or correct the assumption instead of trusting it.
- **A "regression" is actually an intentional redesign** → Every red test is reported with its `master` evidence before anything is called a bug; the user decides. No defect is filed on my judgement alone.
- **The suite is local-only, so nothing prevents a future regression from shipping** → Accepted for this change and named as the obvious follow-up. Adding a CT stage to Jenkins is out of scope here but is the natural next step once the suite is green and trusted.
- **CT is slower and heavier than Jest** (real browser, 23 spec files) → Kept acceptable by mounting with `mountCF`/`mountComponent` and stubbing services, never bootstrapping the app.
- **`RolesService.readOnly` defaults to `true` and silently hides the control** → Mount helpers must pass `editable: true`; a test that forgets it passes against an empty DOM and proves nothing. The shared contract block (D4) removes the chance to forget.

## Migration Plan

Not applicable — this change adds test files only. No production code, no deployment, no rollback path. `npm run test:ct` must be runnable before and after with no change to the build or the Jenkins pipeline.

## Open Questions

1. **What exactly failed in the multi-select?** The user reported defects but has not yet given the screen and the expected behaviour. Priority-1 contracts start from the measured usage above; his concrete case should be added as the first test the moment he describes it.
2. **Should intentional Spartan-era behaviour changes be back-documented** into `docs/system-design/design.md` once identified? Recommended, but not part of this change.

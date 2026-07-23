# Proposal — P2-3175: Move the Evidence section to the end of the result form

## Why

In several result types, the Evidence section currently appears before the final type-specific section (e.g., before Innovation Use or Innovation Development), yet the evidence a user provides often depends on the data entered in those later sections. Placing Evidence last gives a logical, intuitive completion order: fill in all result information first, then attach supporting evidence (Jira P2-3175, QA Enhancement, parent epic P2-3174).

## What Changes

- The Evidence section becomes the **last** section of the result creation/editing form for all applicable result types.
- The side panel menu (the only inter-section navigation — there are no Previous/Next buttons, confirmed N/A by the ticket author) reflects the new order automatically, including its `1. 2. 3.` numbering.
- No changes to Evidence functionality, stored data, validations, or green checks — position only.

## Capabilities

### New Capabilities
- `result-form-section-order`: Defines the ordered list of sections in the Result Detail form and requires Evidence to always be the final visible section for every result type and portfolio.

### Modified Capabilities

<!-- none — existing evidence specs (card layout, deletion persistence, alert messaging) are unaffected; only section position changes -->

## Impact

- **Code**: `onecgiar-pr-client/src/app/shared/routing/routing-data.ts` — move the Evidence entry (currently lines 370-375 of `resultDetailRouting`) to after the `...rdResultTypesPages` spread and before the `**` wildcard (which must remain last).
- **Consumers of the array** (no code change needed, behavior follows the array order):
  - `result-detail-routing.module.ts` — Angular child routes (resolved by `path`, order-safe).
  - `panel-menu.component.ts/.html` — side menu; numbering is `$index + 1`, recomputed automatically.
  - `panel-menu.pipe.ts` — filters by `prHide`/`portfolioAcronym` preserving array order; green checks matched by `section_name` string, position-independent.
- **Out of scope**: Previous/Next navigation (does not exist — AC4 confirmed N/A by ticket author on Slack, 2026-07-22); backend green-checks logic (read-only verification only); Evidence module internals.

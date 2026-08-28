# section-geography (bilateral)

**Verified:** 2026-08-28 · branch performance-refactor · a9e7ae7c4

## What it is
Geographic Focus for the W3/Bilateral result form: the main geo scope (Card 1) and the
"potential impact in other geographic areas" follow-up (Card 2), each with its own
regions/countries pickers. The classic form's equivalent is
`results/pages/result-detail/pages/rd-geographic-location/`.

## Contract
- State: **two separate bodies**, both local signals — `geographicLocationBody` (main scope) and
  `extraGeographicLocationBody` (Card 2). They are not one object; a change to one does not
  hydrate the other.
- Owner of the result id: `BilateralCreationService.currentResultId()`. On a deep link it first
  holds the **public result code** and is replaced by the internal DB id only after
  `GET_BilateralResultDetail` resolves — the hydrate `effect()` waits for that.
- Result type: `BilateralCreationService.resultTypeId()` (2 = Innovation Use, 7 = Innovation
  Development). Drives `isInnovationResult()` → `extraScopeQuestionLabel()` /
  `extraScopeQuestionDescription()`.
- Completeness: pushes to `BilateralMdsTrackerService.setSectionFields('geography', …)` from
  `updateTracker()`.

## Where it is used
- `pages/bilateral/pages/bilateral-result-creator/` — as one accordion section of the form.

## Traps (⚠️ = already broke something)
- ⚠️ **Card 2 is hidden when the main scope is Global (1) or To-be-determined (50).** The gate is on
  the main scope, not on the result type — so an innovation with a Global focus never sees the
  geographic-impact question at all. The classic form gates the same question on
  `isP22() || !isAnInnovation()` instead, with no scope condition. The two forms therefore
  disagree, and that gap is reported on P2-3504 rather than fixed here (changing visibility moves
  completeness).
- ⚠️ **`has_extra_geo_scope` stays `null` until the user answers, on purpose** — `null` means
  "unanswered" and drives the "Please answer Yes or No." error. Do not default it to `false`:
  that answers a required question on the user's behalf. P2-3504 asks for "No (default selected)";
  the contradiction is reported on the ticket, and a test pins the null.
- ⚠️ **The wording is per result type.** Innovations get the business-approved
  "…other geographic areas where the innovation could be impactful…"; other typologies keep
  "Are there any regions that you wish to specify for this Output?" (P2-3504). Do not unify them
  without a ticket — rewording non-innovation typologies was never asked for.
- The spec's `creation` mock must carry `resultTypeId`; the wording computeds call it, and a
  missing key fails as `undefined is not a function` only once something evaluates them.
- The classic form's copy in `FieldsManagerService` has a **double space** ("where  the innovation")
  and a stray trailing quote in its description. This component uses the corrected text from the
  P2-3504 ticket, so the two strings are not byte-identical on purpose.

## Pending / Coming soon
- P2-3504 — visibility gap (Global focus) and the "No by default" request: both open on the ticket.

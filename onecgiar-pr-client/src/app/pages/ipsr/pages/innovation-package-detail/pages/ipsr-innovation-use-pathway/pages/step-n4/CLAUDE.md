# step-n4 — IPSR Innovation Package, "Step 4: Additional information"

**Verified:** 2026-08-31 · branch performance-refactor · bf8df3930

## What it is
The last step of the Innovation use pathway: expected investment tables (initiative, bilateral,
partner co-investment), reference material links, and — for P25 only — the retired scaling-studies
question.

## Contract
- State: one mutable payload, `ipsrStep4Body`, replaced wholesale by the GET and sent back
  wholesale by the PATCH. Child tables receive it as `[body]` and mutate it in place.
- Endpoints via `ResultsApiService`:
  - `GETInnovationPathwayStepFourByRiId(isP25)` / `PATCHInnovationPathwayStepFourByRiId(body, isP25)`
  - `PATCHInnovationPathwayStepFourByRiIdPrevious(body, descrip)` — "Save & go to previous step".
- Phase year: `api.dataControlSE.currentResultSignal()?.phase_year` — **and nothing else**, no
  fallback. See the trap below.
- `disabledOptionsPartners` is derived from the UNFILTERED institution list, before the role filter —
  it must keep every already-picked partner out of the "add partner" dropdown.

## Where it is used
- Routed leaf: `step-n4-routing.module.ts` under
  `ipsr/detail/:code/ipsr-innovation-use-pathway/step-4`.

## The scaling-studies question (P2-3426)
- `isScalingStudiesRetired()` — true from phase 2026 onwards. Below that, the block renders exactly
  as it did before the ticket, fully editable.
- `hasStoredScalingStudiesAnswer()` — `has_scaling_studies === true`, full stop. Deliberately the
  ONLY place the criterion lives. ⚠️ **PROVISIONAL for `false` only**, awaiting the PO.
- `showScalingStudiesReadOnly()` = retired && stored. Read-only is not a new component: `[readOnly]`
  on `app-pr-radio-button` paints `block-field` and disables the radios, `[disabled]` on
  `app-studies-link` disables the inputs and drops the delete and "Add another study link" controls.

## Traps (⚠️ = already broke something)
- ⚠️ **Phase year, never portfolio.** "2026 onwards" is `phase_year >= 2026`, never `isP25()`. prtest
  holds 2025-phase results INSIDE the P25 portfolio (repo rule 9), so a portfolio gate rewrites
  those older forms. The P2-3426 ticket's own "Phase threshold - RESOLVED" section says `isP25()` is
  enough — **it is wrong** and is flagged on the activity. The outer `@if (isP25())` stays because
  P22 uses a different Step 4 endpoint entirely, not because it is the phase axis.
- ⚠️ **Saving with a falsy `has_scaling_studies` WIPES the package's stored study links.**
  `onecgiar-pr-server/src/api/ipsr-framework/pathway/ipsr-pathway-step-four.service.ts:104-109`
  deactivates every `result_scaling_study_urls` row when the DTO's flag is falsy or absent. The
  read-only branch therefore keeps `[(ngModel)]` bound: the value has to round-trip. Never "clean"
  those two keys out of the PATCH payload. Locked by tests in `step-n4.component.spec.ts`
  ("stored scaling studies must survive a save").
- ⚠️ **The server coerces NULL to false on the way out**
  (`ipsr-pathway-step-four.service.ts:654`, `has_scaling_studies ?? false`), so the client cannot
  tell a platform-written "No" from a user's "No". That coercion is load-bearing for the green
  check and must not be removed here — it is P2-3494, owned by Juan David Delgado.
- ⚠️ **`onSavePrevious` always hits the LEGACY P22 endpoint**, whatever the portfolio. It does not
  carry the scaling-studies fields at all, so it is not a wipe path — but it is also not a valid way
  to verify P25 save behaviour.
- **No use-level plumbing here.** An earlier framing of P2-3426 fetched the Core innovation's
  `use_level_evidence_based` from `GETInnovationPathwayByRiId` on every entry into Step 4. Note 6 of
  the ticket declares that superseded; it was removed 31-Aug-2026. Do not reintroduce it — the level
  has no influence on this screen. It still matters to P2-3265 / the Innovation Use surface.
- ⚠️ **`app-studies-link` used to seed one `''` row into an empty list on init** — harmless while
  the list was editable (it is the first "Add link" input), poisonous in read-only mode, where that
  empty string cannot be filled in and would still ride the PATCH body and be persisted as a study
  URL. `studies-link.component.ts` now skips the seed when `[disabled]`. That component is SHARED
  with the Innovation Development / Innovation Use surfaces — its own docs live in
  `shared/components/innovation-use-form/CLAUDE.md`.
- 🛑 **Never demand a non-blank link on top of the stored `true`.** An earlier pass did, and it hid
  the answer of every package holding `true` + `['']` — reachable, not hypothetical: ticking "Yes"
  and saving without typing the URL persists the seed empty string
  (`ipsr-pathway-step-four.service.ts:194-196` puts it in `urlsToCreate`, `:625` returns it
  verbatim). That contradicts AC Case 1. `true` is unambiguous — neither the server nor
  `IpsrStep4Body` ever writes it on its own — so it alone is the criterion. Locked by tests.
- 🛑 **No fallback for the phase year.** `isScalingStudiesRetired()` reads ONLY
  `currentResultSignal().phase_year`, i.e. the phase of the package being viewed
  (`ipsr.repository.ts:282` selects `v.phase_year`; `api.service.ts:126` sets the signal). It used to
  fall back to `dataControlSE.reportingCurrentPhase.phaseYear` — wrong module (REPORTING) and wrong
  concept (the OPEN phase, not this package's). `IPSRCurrentPhase.phaseYear` has the same defect and
  is not used either: with 2026 open, a 2025 package would get retired. No year → fail OPEN.
- **`scaling_studies_urls` is not declared on `IpsrStep4Body`.** It arrives from the GET and rides
  the PATCH body untouched. Do not add a defaulted field to the model: that would put an extra key in
  every package's payload — see the wipe trap above. The component no longer reads it at all.

## Children without their own file
| Component | What it does | Trap |
|---|---|---|
| `step-n4-initiative-investment-table/` | initiative expected investment rows | Mutates `body` in place. |
| `step-n4-bilateral-investment-table/` | bilateral projects + add/edit/delete modals | Deleting emits `bilateralDeleted` → a full `onSaveSection()`, i.e. a real PATCH. |
| `step-n4-partner-co-investment-table/` | partner co-investment | Role id differs by portfolio: `2` for P25, `7` for P22. |
| `step-n4-reference-material-links/` | reference material links | — |

## Pending / Coming soon
- P2-3426 dilemma with Ángel — about `false` ONLY: does a platform-written "No" count as "a stored
  answer"? Until answered, `hasStoredScalingStudiesAnswer()` says no. Switching to yes also needs the
  server to distinguish NULL from false, and stays half-broken until P2-3494 lands. A stored `true`
  is not part of the dilemma and is always shown.
- P2-3494 (Juan David Delgado): `validation_ipsr_step_four_P25` returns FALSE while
  `has_scaling_studies IS NULL`, with no level condition
  (`migrations/1769532691577-CreatIPSRGreen.ts:615`).

## 1. Server — contract and read path

- [x] 1.1 Add `has_innovation_link?: boolean` and `linked_results?: number[]` to `SaveBilateralContributorsDto`, documented like the P2-3443 keys (sending replaces, omitting leaves untouched)
- [x] 1.2 Add `r.has_innovation_link` to the `getCommonFieldsBilateralResultById` SELECT
- [x] 1.3 Return `linkedResults` (active ids) in `getBilateralResultById` via `ResultsInnovationsUseRepository.getLinkedResultsByOrigin`

## 2. Server — write path

- [x] 2.1 Inject `ResultsInnovationsUseRepository` into `BilateralCenterService` (already provided by `bilateral.module.ts`)
- [x] 2.2 Add `syncLinkedBundledAnswer()` implementing the P2-3424 narrow protocol: Yes + selection replaces; No clears only when the stored answer was Yes; unanswered or omitted touches nothing
- [x] 2.3 Skip the whole sync for result types 2 and 7, reading the type from the result already loaded by `saveContributors`
- [x] 2.4 Call it from `saveContributors` behind the `!== undefined` key guard the other blocks use

## 3. Client — hydrate, send, display

- [x] 3.1 Hydrate `hasLinkedResult` and `selectedLinkedResultIds` from the detail GET the section already issues, behind a `linkedHydrated` flag
- [x] 3.2 Send both keys from `buildContributorsPayload()` only when `linkedHydrated()` is true
- [x] 3.3 Retire `unpersistedFieldsComingSoon`: remove the tag, the `globalDisabled` wrappers and the `Coming soon` test hook; restore the `hiddenFieldsWithValues()` count
- [x] 3.4 Hide the whole question block when `resultTypeId()` is 2 or 7
- [x] 3.5 Bind the results multi-select `[isStatic]` to `!readOnly()` (P2-3520 trap)

## 4. Tests

- [x] 4.1 Server: narrow protocol — Yes replaces, No-after-Yes clears, No-that-was-never-Yes and omitted key touch nothing, excluded types write nothing
- [x] 4.2 Client: invert the `Coming soon` specs; add hydration, payload, AC12 clearing and the type 2/7 exclusion
- [x] 4.3 Client read-only suite: the picker is not editable on a submitted result and the stored value is visible

## 5. Documentation and gate

- [x] 5.1 Update the section's `CLAUDE.md` (contract, the retired flag, the pending/not-built table) and the in-code comments that describe the marker
- [x] 5.2 Gate: server `npx jest` + `npx eslint`; client `npm run build:dev` + `npx jest` + `npx ng lint`
- [x] 5.3 Adversarial re-read of the diff before pushing

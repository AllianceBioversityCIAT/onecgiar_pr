## 1. Pre-flight / confirmations (Juan David, Slack 2026-06-25)

- [x] 1.1 Backend synergy mapping fixed + validated (`8db12d3ac`; init 62 → SP01/SP12).
- [x] 1.2 Other SP also go as a contribution request (normal sharing flow), same as ToC SP.
- [x] 1.3 Front applies no precedence — only labels `from_toc` and sends it.
- [x] 1.4 Flag naming RESOLVED: `from_toc` (Juan David, aligned to `from_cgspace`).

## 2. BACK — Juan David — DONE (`70886177b`, pushed to P2-2928)

- [x] 2.1 Migration `AddFromTocToContributorsPartners`: `from_toc tinyint NOT NULL DEFAULT 0` on `results_center`, `results_by_inititiative` AND `share_result_request` (3rd table: pending SP live there until approved).
- [x] 2.2 Entities: column added to `results-center.entity.ts`, `results_by_inititiative.entity.ts`, `share-result-request.entity.ts`.
- [x] 2.3 DTOs: `from_toc` on `ResultsCenterDto`; `ContributingInitiativeTocFlagDto` (`{ id, from_toc }`) on accepted/pending; `initiativeFromToc` map on `CreateTocShareResult`.
- [x] 2.4 Persist Centers: `handleContributingCenters()` sets `from_toc` on insert and update.
- [x] 2.5 Persist SP: `createTocMappingV2()` extracts `{id, from_toc}` → `initiativeFromToc` map → share request; approval (`createNewInitiativeEntry` / `activateExistingInitiativeEntry`) copies `from_toc` into `results_by_inititiative` (DeepSeek R1 finding #1 + #4).
- [x] 2.6 Read: queries select `rc.from_toc`, `rbi.from_toc` (accepted), `srr.from_toc` (pending).

## 3. FRONT — us (`rd-contributors-and-partners`, gated by `isCP2026()`) — DONE

- [x] 3.1 Save Centers: `onSaveSection` unions `contributing_center` (ToC) + `otherCentersSelected`, tags each `from_toc`, strips `__OTHER_CENTERS__`.
- [x] 3.2 Save SP: builds accepted/pending from `scienceSelected` ∪ `otherScienceSelected` as `{ id, from_toc }` (split by `_was_accepted`), strips `__OTHER_SCIENCE__`.
- [x] 3.3 Read re-bucket: `applyTocMappingOnLoad()` (service) splits persisted centers + accepted/pending SP into dropdown 1 (`from_toc`) vs dropdown 2 by the persisted flag.
- [x] 3.4 2025/legacy save untouched; `build:dev` passes (15s, exit 0).

## 4. Verification

- [ ] 4.1 Save a 2026 result (e.g. under init 62 for SP): pick ToC + Other centers and SP, save, reload → ToC items render in dropdown 1, Other in dropdown 2.
- [ ] 4.2 DB check: `results_center` / `results_by_inititiative` rows carry the correct `from_toc`.
- [ ] 4.3 SP selections create pending contribution requests (sharing flow) for both ToC and Other.
- [ ] 4.4 2025 result unchanged.

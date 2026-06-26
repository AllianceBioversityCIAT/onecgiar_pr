## 1. Pre-flight / confirmations (Juan David, Slack 2026-06-24)

- [x] 1.1 Front applies NO precedence logic; backend resolves the 4 KPI/HLO scenarios. Front just unions the ids across selected nodes.
- [x] 1.2 Source = contributing_synergy_program_initiative_ids (per toc_result node); cross /clarisa/initiatives by `id` (verified: id 50 → SP01, id 41 → SGP-02).
- [x] 1.3 Save = the SP becomes a pending contribution request, done on Save → DEFERRED ("por ahora que sea solo visual el select").

## 2. Visual layer (done)

- [x] 2.1 Service: scienceSelected, otherScienceSelected, tocReferenceSynergyInitiativeIds (signal).
- [x] 2.2 multiple-wps-content effect: union of contributing_synergy_program_initiative_ids across ALL selected nodes (same effect that unions Centers).
- [x] 2.3 Parent: referenceScience / otherScienceList / dropdown1OptionsSP / hasReferenceScience computeds + onScienceSelect / deleteScience / deleteOtherScience / showOtherScience + preselect effect + GET_AllInitiatives load.
- [x] 2.4 HTML: split (dropdown1 + Other item + dropdown2 + chips) and the no-SP note, gated by isCP2026(); legacy contributing-initiatives dropdown kept for non-2026.
- [x] 2.5 build:dev passes. Verified on result 8562 (no SP in ToC → shows the "No Science Programs…" note; legacy dropdown hidden in 2026). Screenshot in .local-screenshots/verify-sp-nosp.png.

## 3. Backend mapping (Juan David) — DONE

- [x] 3.1 Backend: fix the mapping so contributing_synergy_program_initiative_ids is populated. Fixed in `8db12d3ac` (2026-06-25, on P2-2928 + merged to dev): corrected join (`trsp.toc_results_id = tr.id`), phase filter on `trsp.phase`, and resolve to `ci.id` via `clarisa_initiatives.official_code`.
- [x] 3.2 Data contract verified on prtest: initiative 62 → node 7472 returns synergy ids [50, 61], node 7482 returns [50]; ids resolve to SP01, SP12 via /clarisa/initiatives by `id`.
- [ ] 3.3 Visual verification of the populated split still pending — needs a result under an initiative with synergy in its selected ToC nodes (e.g. init 62). Test result 8562/init 50 has no synergy.

## 4. DEFERRED — SAVE / pending

- [ ] 4.1 On Save: selected SP create pending contribution requests (the existing sharing flow). Wire with the save design (same track as Centers save).

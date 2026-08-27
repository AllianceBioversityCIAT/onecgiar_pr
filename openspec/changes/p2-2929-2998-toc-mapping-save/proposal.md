## Why

The 2026 redesign split **Contributing CGIAR Centers** (P2-2998) and **Contributing Science Program/Accelerator** (P2-2929) into "from ToC" + "Other(s)" dropdowns. The visual layer is shipped; the **Save was deferred**. This change wires persistence.

Requirement (Yeck): when a center/SP comes from the ToC we MUST store it in DB, but it MUST keep rendering as a **ToC mapping** on reload (dropdown 1), while "Other(s)" selections render in dropdown 2. So the persisted row has to record its **origin**. The backend synergy mapping is already fixed and validated (Juan David, `8db12d3ac`; init 62 → SP01/SP12).

Confirmed with Juan David (Slack 2026-06-25):
- The **Other** SP (not from ToC) ALSO go as a contribution **request** in the first instance — they follow the normal sharing flow, same as the ToC ones.
- Front applies NO precedence logic; it only labels each item with its origin and sends it.

## Work split

- **FRONT (us):** label each item with `from_toc`, strip the `__OTHER_*__` sentinels, send the contract, and re-bucket dropdown 1 / dropdown 2 on reload by the persisted flag.
- **BACK (Juan David):** migration (new column), entities + DTOs, persistence in the save services, and return the flag from the read. Plan sent to Juan David on Slack.

## What Changes

A new `from_toc` boolean (default `false`) on `results_center` and `results_by_inititiative` records whether a contributing center / initiative (Science Program) originated from the result's ToC.

**Save contract (front → back):**
```
// Centers (partners save)
contributing_center: [{ code, is_leading_result, from_toc }]   // sentinel __OTHER_CENTERS__ stripped

// Science Programs (ToC save) — pending → contribution request, ToC + Other
pending_contributing_initiatives: [{ id, from_toc }]           // sentinel __OTHER_SCIENCE__ stripped
```

**Read contract (back → front):** `getContributorsPartnersByResultId` returns `from_toc` per `contributing_center` and per initiative (accepted/pending), so the front rebuilds dropdown 1 (ToC, `from_toc=true`) vs dropdown 2 (Other, `false`).

## Capabilities

### New Capabilities
- `toc-mapping-persistence`: persist and re-read the ToC-origin of contributing centers and Science Programs (the `from_toc` flag), so the 2026 split round-trips through Save/reload.

## Impact

- **Front:** `rd-contributors-and-partners.component.ts` (`onSaveSection` — build the labeled arrays, strip sentinels), `rd-contributors-and-partners.service.ts` (`getSectionInformation` — re-bucket by persisted flag), computeds for dropdown 1/2.
- **Back (Juan David):** 1 migration (2 columns), `results-center.entity.ts` + `results_by_inititiative.entity.ts`, `ResultsCenterDto` / `SavePartnersV2Dto` / `UpdateContributorsPartnersDto`, `handleContributingCenters()`, `createTocMappingV2()` / `updateResultByInitiative()`, `getContributorsPartnersByResultId()` + the underlying read queries.
- Gated by `isCP2026()`; 2025/legacy save untouched. Risk: medium (shared section + persistence) — mitigated by the gate and additive column with a safe default.

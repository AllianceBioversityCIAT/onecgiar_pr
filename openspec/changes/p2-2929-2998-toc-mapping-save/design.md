## Context

The 2026 Contributors & Partners split (Centers P2-2998, Science Programs P2-2929) renders two dropdowns each: "from ToC" + "Other(s)". Persistence was deferred; this change adds it. The backend synergy mapping is already fixed/validated (Juan David, `8db12d3ac`). Work is split: front (us) + back (Juan David).

## Decisions

**D1 — New origin flag `from_toc`.** Add a boolean column (`NOT NULL DEFAULT 0`) to `results_center` and `results_by_inititiative`. Records whether the row came from the result's ToC. Follows the existing `from_cgspace` precedent on `results_center`. A dedicated boolean is preferred over overloading `initiative_role_id` (the role drives the pending/share flow).

**D2 — Front labels, no precedence.** The front sets `from_toc=true` for items derived from the ToC reference sets (`tocReferenceCenterInstitutionIds` / `tocReferenceSynergyInitiativeIds`) and `false` for "Other(s)" picks. The backend just persists the flag; it does not recompute origin.

**D3 — Science Programs persist as contribution requests.** Both ToC and Other SP go into `pending_contributing_initiatives` and follow the **normal sharing flow** (Juan David, Slack 2026-06-25: "Los SP other también deben enviarse en primera instancia como un request"). `from_toc` only differentiates origin, not the flow.

**D4 — Re-bucket on reload by the persisted flag.** The read returns `from_toc` per row; the front buckets dropdown 1 (`true`) vs dropdown 2 (`false`) by the persisted value, NOT by re-deriving against the live ToC. This keeps a saved ToC mapping rendering as ToC even if the ToC later drifts.

**D5 — Strip sentinels before save.** The `__OTHER_CENTERS__` / `__OTHER_SCIENCE__` items are UI-only toggles; the front removes them from the payload.

**D6 — Gate by `isCP2026()`.** The 2025/legacy save path and the rest of the PATCH (`institutions`, `mqap`, `bilateral`, lead) are untouched.

**D7 — Work split.** Front = us (label + strip + re-bucket). Back = Juan David (migration + entities/DTOs + persistence + read). The contract above is the interface between the two.

## Risks / Trade-offs

- Shared section + new persistence → mitigated by the `isCP2026()` gate and an additive column with a safe default (`false`), so legacy rows and 2025 are unaffected.
- Front and back ship independently: the front can bind/send the flag before the column exists (it is ignored), but the **read round-trip** (seeing dropdown 1/2 rebuilt) only works once Juan David returns `from_toc`.

## Open Questions

- OQ1 — RESOLVED: flag named `from_toc` (Juan David, aligned with `from_cgspace`). Back implemented in `70886177b`; the share-request approval copies `from_toc` into `results_by_inititiative` (DeepSeek R1 finding incorporated).

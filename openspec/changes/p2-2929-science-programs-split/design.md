## Context

P2-2929: Contributing Science Program/Accelerator from ToC, split into "from ToC" + "Other(s)", mirroring Centers (P2-2998). Visual layer; save/pending deferred. IN PROGRESS — blocked on a backend mapping fix (synergy ids arrive empty).

## Decisions

**D1 — Same union plumbing as Centers.** `multiple-wps-content` unions `contributing_synergy_program_initiative_ids` across ALL selected nodes into `tocReferenceSynergyInitiativeIds`; the parent derives referenceScience / otherScienceList from `/clarisa/initiatives` (GET_AllInitiatives), crossing by `id`.

**D2 — Front applies no precedence.** Backend resolves the 4 KPI/HLO scenarios (Juan David); the front only unions + dedupes what arrives.

**D3 — No-SP note.** When `tocReferenceSynergyInitiativeIds` is empty → show the fixed note and no dropdown/Other (Excel rule).

**D4 — Gate by isCP2026.** The legacy contributing-initiatives dropdown (accepted/pending/new + sharing) stays for non-2026.

**D5 — Save deferred.** The split binds to temporary arrays (`scienceSelected` / `otherScienceSelected`); the existing save and the pending/contribution-request flow are untouched until the save is designed (same track as Centers).

## Risks / Trade-offs

- The 2026 split visually replaces the sharing dropdown but does NOT persist yet — must not corrupt the existing save (it doesn't; separate arrays, PATCH untouched).
- Blocked on backend: cannot verify the populated split until synergy ids come through.

## Open Questions

- OQ1: How SP selections persist (pending contribution requests) on Save — with the save design.

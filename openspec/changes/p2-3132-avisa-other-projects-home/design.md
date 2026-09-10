## Context

The home page loads `{ mySciencePrograms, otherSciencePrograms }` from `GET api/results-framework-reporting/get/science-programs/progress`. The backend buckets by user edit role (`hasEdit` → my, else other). AVISA can therefore land in **My** for members. P2-3132 requires a third, client-side bucket.

AVISA is identified consistently elsewhere as `official_code` / `initiativeCode` `SGP-02` or `SGP02`, or `initiativeId === 41`.

## Goals / Non-Goals

**Goals:**
- New **Other projects** section on the home page.
- AVISA card appears only there, for every user, with unchanged card data/behavior.
- My and Other SP sections never render AVISA.

**Non-Goals:**
- No backend bucket changes (P2-3131 covers broader AVISA removal from entry dropdowns).
- No copy/design overhaul beyond the new section title and grid placement.
- No changes to Recent activity or card navigation.

## Decisions

**Decision 1 — Client-side partition after fetch.**
Filter AVISA out of `mySciencePrograms` and `otherSciencePrograms`, collect into `otherProjectsList`. Rationale: ticket is front-only; API contract unchanged; matches existing home service pattern.

**Decision 2 — Section order: My SPs → Other SPs → Other projects.**
Place **Other projects** after **Other Science Programs/Accelerators** so SP browsing flow stays intact and AVISA sits at the bottom as a special case.

**Decision 3 — Reuse `ResultFrameworkReportingCardItemComponent`.**
Same card, same `SPProgress` item; no new card type.

**Decision 4 — Hide empty Other projects section.**
Render the section only when `otherProjectsList().length > 0` (defensive if API omits AVISA).

**Decision 5 — Entity details SGP-02 fallback includes `otherProjectsList`.**
`entityDisplayShortName` searches `[...mySPs, ...otherSPs, ...otherProjects]` so AVISA short name still resolves after the move.

## Risks / Trade-offs

- [AVISA missing from API response → section hidden] → acceptable; AVISA is seeded in portfolio 3.
- [Duplicate AVISA in my+other from API] → dedupe by `initiativeId` when building `otherProjectsList`.
- [Future projects in Other projects] → partition helper is AVISA-specific today; extend when product adds more codes.

## Migration Plan

Frontend-only deploy. Rollback = revert commit.

## Open Questions

- None blocking.

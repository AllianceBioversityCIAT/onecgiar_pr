# Design — P2-3175: Move the Evidence section to the end of the result form

## Context

The Result Detail form's section order is defined by a single source of truth: the `resultDetailRouting: PrRoute[]` array in `onecgiar-pr-client/src/app/shared/routing/routing-data.ts` (lines 318-378). Two consumers read the same array:

1. `result-detail-routing.module.ts` — registers the entries as Angular child routes (resolved by `path`).
2. `panel-menu.component.ts` — feeds the side panel menu (`navigationOptions = resultDetailRouting`), filtered per result by `panel-menu.pipe.ts` (`prHide` = result_type_id, `portfolioAcronym` = P22/P25). `Array.filter` preserves order, numbering is `{{ $index + 1 }}`.

Today Evidence (lines 370-375) sits before the `...rdResultTypesPages` spread (line 376), so type-specific sections (Innovation Use/Dev, KP, Policy, CapSharing) render after Evidence. There is **no Previous/Next navigation** between sections (verified by grep; AC4 confirmed N/A by ticket author). Green checks are matched by `section_name` string, not index.

## Goals / Non-Goals

**Goals:**
- Evidence is the last visible section for all 5 result types and both portfolios.
- Zero behavioral change to Evidence itself (routes, data, validations, green checks).

**Non-Goals:**
- Adding Previous/Next navigation (does not exist; out of scope).
- Backend changes (green-checks completeness logic is position-agnostic; verify read-only).
- Any change to the Evidence module (`rd-evidences/`) internals.

## Decisions

- **D1 — Reorder the array, nothing else.** Move the Evidence object to after `...rdResultTypesPages` and before the `**` wildcard. Alternative considered: per-type conditional ordering in the pipe — rejected as needless complexity; the ticket asks for Evidence last for *all* applicable types and one shared list already models that.
- **D2 — Keep the `**` wildcard as the physical last entry.** The Angular router matches wildcards in declaration order; it must remain last.
- **D3 — No test-file surgery.** `routing-data*.ts` is excluded from Jest coverage; validation is done via the existing panel-menu pipe spec (if order assertions exist) plus in-browser verification of the 5 result types.

## Risks / Trade-offs

- [Deep links / bookmarks to `/evidences`] → None: routes resolve by `path`, unaffected by order.
- [User muscle memory: Evidence moves visually] → Intended by the ticket; QA (author) drives the UX decision.
- [Hidden consumer assuming Evidence's index] → Searched: no index-based consumers found (menu, pipe, green checks, router are all name/path-based). Residual risk covered by browser verification of all 5 types.
- [Backend green-checks iteration order] → Read-only check only; matching is by `section_name`, and no order dependency was found client-side.

## Migration Plan

Single-file client change, no data migration. Deploy with the normal branch → dev flow; rollback = revert the commit.

## Open Questions

None — AC4 (Previous/Next) resolved as N/A with the ticket author (Slack, 2026-07-22).

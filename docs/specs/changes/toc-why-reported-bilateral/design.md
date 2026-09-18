# Design — Bilateral ToC: no justification field when the answer is "No"

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/toc-why-reported-bilateral/` |
| Depth | **Lite** — one standalone Angular component + its spec |
| Status | draft |
| Date | 2026-09-18 |
| Requirements | `requirements.md` — `BIL-TOC-WR-R-1..3`, `N-1..2` |

## Executive Summary

Delete the rendering of the justification textarea and everything that exists only to feed it (`showWhyReported`, `onWhyReportedInput`, its debounce timer, the `toc-why-reported` checklist item). **Keep** the `whyReported` signal, its hydration and its place in the autosave payload — that is what stops the server from nulling already-stored text. Client-only; nothing else in the stack moves.

## Architecture Overview

Single touched unit: `onecgiar-pr-client/src/app/pages/bilateral/components/section-toc/`.

| File | Change |
|---|---|
| `section-toc.component.html` | Remove the `@if (showWhyReported()) { … }` block (`:33-45`) |
| `section-toc.component.ts` | Remove `showWhyReported` (`:93`), `onWhyReportedInput` + `_whyReportedTimer` (`:582-588`, and its branch in `clearTocDebouncers` `:393-396`), and the `toc-why-reported` item in `publishTocMds` (`:617-625`). **Keep** `whyReported` (`:80`), its hydration (`:279-280`, `:320-327`), its reset in `clearTocSelection` (`:430`) and its payload branch (`:448-449`) |
| `section-toc.component.spec.ts` | Replace the `whyReported (unplanned justification)` block (`:694+`) with the new contract; drop the stale comment claiming the field "gates Submit" |

No change to: `bilateral-auto-save.service`, `save-bilateral-toc-mapping.dto.ts`, `bilateral-center.service.ts`, `results-toc-results.service.ts`, any migration, any `validation_*` procedure.

## Data Model

Unchanged. `results_toc_result.toc_progressive_narrative` keeps backing both textareas; on the bilateral unplanned branch it simply stops being writable from the UI while still being re-sent verbatim.

## API Design

Unchanged. `PATCH /api/bilateral/center/toc-mapping/:resultId` keeps accepting the optional `toc_progressive_narrative`, and the client keeps sending it on the unplanned branch.

## Frontend Component Design

The gate is deleted, not inverted: after the change the unplanned branch has **no** follow-up UI at all, so `showWhyReported` has no remaining caller. `whyReported` becomes a *carrier*: hydrated on load, never edited, re-sent on save.

## Design Decisions

### DD-1 — Keep sending `toc_progressive_narrative` on the unplanned branch

- **Decision:** the payload expression at `:448-449` stays exactly as it is.
- **Why:** the bilateral "No" save path is `saveTocMapping` → `updateTocResultPartial` → `_handleUnplannedResult` (`results-toc-results.service.ts:2528`) → `_handleUnplannedSpecialCase` (`:2674`), which **deactivates every active row and inserts a new one** with `toc_progressive_narrative: … ?? null` (`:2697-2699`). The module's usual "omitted key = don't touch" discipline does not hold on a re-insert: dropping the key would null every existing justification on the next autosave.
- **Rejected — drop the signal and the key:** smaller diff, silent data loss on existing results.
- **Rejected — make the server carry the previous value forward:** correct in principle, but `_handleUnplannedSpecialCase` is shared with the classic W1/W2 write path; server blast radius for a UI-only requirement.
- **Cost:** a value the user can no longer see rides the payload → mandatory inline comment (`BIL-TOC-WR-N-2`).

### DD-2 — Remove the checklist item rather than keep it unfilled

- **Decision:** `publishTocMds` stops pushing `toc-why-reported`.
- **Why:** with no field to fill, a permanently-unfilled item would be unreachable. Safe because every `toc` item is `optional: true` (PO decision 2026-09-09) and `submitForReview` only requires a lead centre plus a Science Program — so `canSubmitFromRail` never counted it (`BIL-TOC-WR-R-3`).

### DD-3 — Bilateral only

- **Decision:** the classic form keeps its justification and its info text (`rd-contributors-and-partners.component.ts:465`).
- **Why:** explicit non-goal in `proposal.md`. Worth a release-note line so QA does not report the divergence as a defect on the classic side.

## Reversion Challenge (Step 2.3)

This design removes delivered behavior, so the challenge applies. **"What does removing this break?"**

| Breakage | Addressed? |
|---|---|
| Program teams lose the adaptive-management input for bilateral no-mapped results, and the AI quality assessment receives `contribution: null` for new unplanned results (`quality-assessment/mappers/contributors-and-partners.mapper.ts:190`) | **Accepted** — it is the point of the change; PO decision on record |
| Existing stored justifications nulled on the next save | **Addressed by DD-1** |
| Submit gate / completeness regression | **Not a breakage** — items already `optional: true` |
| Green checks reading the field on the unplanned branch | **Not on this path** — `1762528725798-createValidtionP25.ts:136,321` reads it only alongside `toc_result_id IS NOT NULL`. Confirm against the live procedure (the repo's `validation_*` migrations lag the deployed ones) |

## Budget (tripwire for `/akili-execute`)

| Metric | Expected |
|---|---|
| Tasks | 1 |
| LOC | ~40 net (≈25 removed in the component, ≈15 changed in the spec) |
| Review rounds | 1 |

Exceeding any of these means the change is not what this spec describes — stop and escalate rather than continue.

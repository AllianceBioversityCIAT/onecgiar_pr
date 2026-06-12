## Why

P2-2981. In the flat evidence card (P2-2935 design), the card body lays link, impact-area tags and description out on one wrapping horizontal row. The description is squeezed into the remaining width on the right (`flex: 1 1 240px`), so longer descriptions wrap awkwardly into a narrow column even though there is empty space across the card. The description is the field most likely to be long and deserves the full card width.

**Frontend-only.** No backend change. CSS-only (plus a small markup grouping if needed).

## What Changes

- Restack `.ev_card_body` so items no longer share one horizontal row:
  - Row 1: the link/file (`.ev_ro_main`) on its own line.
  - Below: impact-area tags on their own line.
  - Below: the description (`.ev_ro_details`) on its own full-width line, free to grow.
- The description gets the full card width so long text wraps across the whole card instead of a ~240px column.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
<!-- Layout/visual only; no spec-level requirement change. Evidence card content and behavior are unchanged. -->

## Impact

- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.scss` (`.ev_card_body` and children)
- Possibly `rd-evidences.component.html` if grouping nodes are needed (prefer CSS-only).
- Jira: P2-2981. SDD baseline: UI layout per `docs/system-design/design.md` (evidence card pattern, P2-2935).

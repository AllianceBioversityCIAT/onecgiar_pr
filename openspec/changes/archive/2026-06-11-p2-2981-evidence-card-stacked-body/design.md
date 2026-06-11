## Context

`.ev_card_body` is currently `display: flex; flex-wrap: wrap; align-items: center; gap: 8px 24px`, with three children: `.ev_ro_main` (link/file), a tags `.ev_ro_item`, and `.ev_ro_details` (description, `flex: 1 1 240px`). They flow on one wrapping row, so the description occupies leftover horizontal space and wraps into a narrow column.

The requested layout (confirmed): link on its own line, then tags, then the description full-width below.

## Goals / Non-Goals

**Goals:**
- Stack the body items vertically so each occupies its own line.
- Give the description the full card width so it can grow without a cramped column.

**Non-Goals:**
- No change to the card header (`.ev_card_top`: index, type, lock, dates, actions).
- No change to content, icons, tooltips, or behavior.
- No markup restructure if CSS alone achieves it.

## Decisions

- **Switch `.ev_card_body` to `flex-direction: column; align-items: flex-start`** instead of forcing per-child `flex-basis: 100%`. One rule change, each `.ev_ro_item` naturally takes its own line in source order (link → tags → description). Alternative (keep row, set `.ev_ro_details { flex-basis: 100% }`) rejected: it only wraps the description but leaves link+tags sharing a row, which doesn't match the confirmed "link alone on top" layout and is more fragile across widths.
- **Reset `.ev_ro_details { flex: 1 1 240px }`** since in a column it would mean vertical grow. Let it be full-width (`align-self: stretch` / default stretch) and keep `align-items: flex-start` for icon-to-text alignment.
- Adjust the `gap` to a single vertical rhythm (e.g. `gap: 10px`) now that items stack.

## Risks / Trade-offs

- [Cards get taller now that items stack vertically] → Acceptable and intended; the description is the priority field. Header is untouched, so scan-ability of type/date/actions is preserved.
- [Tag row alignment in column mode] → Tags already wrap inside `.ev_ro_tags`; verify they sit left-aligned under the link.

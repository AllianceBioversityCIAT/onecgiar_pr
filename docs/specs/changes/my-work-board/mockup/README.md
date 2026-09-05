# Mockup — "My work" board

- Canvas (Claude Design artifact): https://claude.ai/code/artifact/d7a35454-ca8c-4840-94a2-fd624c38d8a0
- Source artboards in this folder (Design Components format, one file per artboard):
  - `Main.dc.html` — desktop 1440×900: topbar, SP band with the 4th tab **My work** (count badge), board toolbar (Mine / All program results, phase, sort), and the three column groups: *Needs my action* (Editing), *Waiting on others* (Pending review, Submitted), *Closed* (Approved, Discontinued — collapsed rails).
  - `Card.dc.html` — result card in three states: Editing with completeness, Submitted (waiting), Editing with unknown completeness.
  - `Empty.dc.html` — whole-board empty state.
  - `canvas.json` — layout plus the sticky notes carrying OQ-1, OQ-2, the no-drag-and-drop rule and the viewport rule.
- Values lifted from the client: `colors.scss` tokens (primary 300/400 `#6b46e5`/`#5733c4`, band `#f7f4fd`, app `#f7f7f9`, border `#e3e3e8`, text heading/secondary/muted/subtle), `STATUS_META` colours, the Results tab category chip (16px, primary-50/primary-400), band tab metrics (14px, 2px underline, 40px row). Sidebar omitted from the frame.
- Static mockup (no working controls). Sample titles and codes are illustrative.

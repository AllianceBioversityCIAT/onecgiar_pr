## 1. Fix the scoped style

- [x] 1.1 Added a `.pr-message` block to `normal-selector.component.scss` mirroring the parent `rd-contributors-and-partners.component.scss` definition (flex row, `gap: 0.5rem`, `background var(--pr-color-orange-100)`, `padding 10px 15px`, `border-radius 5px`, `color var(--pr-color-black)`, top/bottom margins; `p { margin: 0 }`). No hex literals. Build:dev compiles clean.

## 2. Verify

- [ ] 2.1 `npm start`, open a P25 result whose ToC returns no External Partners; confirm the note shows the peach box identical to the Centers / Science Programs notes.
- [ ] 2.2 Confirm no visual regression on the Centers and Science Programs notes (their styling is untouched).

## 3. Handoff

- [ ] 3.1 Commit on the P2-2928 epic branch: `🎨 style(normal-selector) P2-2928: box the External Partners empty-state note to match Centers/SP`.
- [ ] 3.2 Keep separate from the format-time-ago timezone change (different concern / ticket).

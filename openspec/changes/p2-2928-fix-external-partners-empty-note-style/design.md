## Context

Three empty-state notes in Contributors & Partners (P25) use identical markup `<div class="pr-message"><i>info</i><p>…</p></div>`:
- Centers note and Science Programs note live in `rd-contributors-and-partners` (its `.scss` defines `.pr-message` → peach box).
- External Partners note lives in `normal-selector` (its `.scss` does NOT define `.pr-message`).

Angular default `ViewEncapsulation.Emulated` scopes component styles, so the External Partners note gets no box.

## Goals / Non-Goals

**Goals:**
- External Partners empty-state note visually matches the Centers / Science Programs notes.

**Non-Goals:**
- No change to the shared/global stylesheet (would risk other `.pr-message` consumers).
- No markup, binding, or logic change.

## Decisions

- Add a scoped `.pr-message` block to `normal-selector.component.scss` identical to the parent's definition (flex, `gap: 0.5rem`, `background: var(--pr-color-orange-100)`, `padding: 10px 15px`, `border-radius: 5px`, `color: var(--pr-color-black)`, margins; `p { margin: 0 }`). Uses existing `--pr-*` tokens — no hex literals.
- Prefer duplication of the small scoped block over promoting `.pr-message` to a global class in this change, to keep the fix contained and side-effect-free.

## Risks / Trade-offs

- Minimal risk; single-component SCSS addition.
- Minor duplication of the `.pr-message` rule across two component stylesheets — acceptable given encapsulation; a later refactor could extract a shared partial if `.pr-message` proliferates.

## 1. Implement the banner

- [x] 1.1 Add the banner markup in `entity-aow-aow.component.html` between `.entity-aow-aow_tabs` and `.entity-aow-aow_content` (warning icon + message `<p>`, final clause in `<strong>`).
- [x] 1.2 Add `.aow-repeated-note` styles in `entity-aow-aow.component.scss` using `--pr-color-yellow-*` tokens (bg yellow-50, border yellow-rgb @0.4, icon yellow-300, text yellow-700/800, `body-2` typography).

## 2. Verify

- [x] 2.1 Component spec passes (21/21) — template + SCSS compile, no regression.
- [ ] 2.2 Run `npm run lint` on the changed files (pending — run via `ng lint`, isolated eslint not configured).
- [x] 2.3 Generate a final preview PDF of the result to send to the reporter (Ángel) for sign-off → `~/Desktop/P2-3052-resultado-para-angel.pdf`.

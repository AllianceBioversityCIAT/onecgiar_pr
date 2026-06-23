## 1. Pre-flight (verify before editing)

- [x] 1.1 Grep the whole client for the old question text. **Found 6 occurrences across 4 features** (not 2): Contributors&Partners P25 (html:35 + ts:239 — in scope), `ipsr-contributors` (.ts:308 + .html:4), `share-request-modal` (.html:64), `result-review-drawer` (.html:91). → Rename scope (only C&P vs all 4) sent to Ángel via Slack; the 2 C&P renames are BLOCKED on his answer.
- [x] 1.2 Grep for the old info-note phrases: `2025 target of the indicator` appears only once (multiple-wps-content.component.html:86) and `label="Indicator"` only once (line 72) — both isolated to this tree, safe to edit.

## 2. ToC question copy (rd-contributors-and-partners.component.html / .ts) — scope = this ticket only (Contributors & Partners)

> NOTE: the old question text is reused in 3 other surfaces (ipsr-contributors, share-request-modal, result-review-drawer). Ángel confirmed the rename "applies to all 4" but was launched for THIS ticket; he will decide whether to fold the other 3 into this user story or create separate US stories. Per ticket scope we rename ONLY Contributors & Partners here and leave the rest for his definition (do not expand scope).

- [x] 2.1 In `rd-contributors-and-partners.component.html`, change the `app-pr-yes-or-not [label]` to `Can this result be mapped to a planned TOC KPI or indicator?`
- [x] 2.2 In `rd-contributors-and-partners.component.ts`, update the contributor question string to use the same new label.
- [x] 2.3 In the same HTML, replace the `app-alert-status [description]` info note under the question with the 2026/2027 text (Excel row 5), keeping `<strong>` emphasis on Yes/No.

## 3. ToC detail copy (multiple-wps-content.component.html)

- [x] 3.1 Rename the indicator `app-pr-select [label]` from `Indicator` to `KPI Statement/description`.
- [x] 3.2 Add `description="Maps to TOC: [KPI Statement – deliverable short name and indicator description]"` to that `app-pr-select` (inline help text).
- [x] 3.3 Replace the Contribution-to-indicator-target `app-alert-status [description]` text with the 2026 wording (Excel row 18), including the farmers/USD/workshops examples, the Knowledge Product 1/0 guidance, and the 2026 aggregation sentence.

## 4. Verify

- [ ] 4.1 Build/compile the client (`npm run build:dev` or equivalent) — no template/compile errors.
- [ ] 4.2 Re-grep: the old strings (`Does this result align...`, `2025 target of the indicator`) no longer appear in the section.
- [ ] 4.3 Run the app locally, open a P25 result → Contributors & Partners, and visually confirm all five copy changes render correctly (question, its info note, KPI label + help text, Contribution Target info note).
- [ ] 4.4 Capture before/after screenshots of each changed element for the validation PDF (saved outside the repo / `.local-screenshots/`).

# Proposal — ToC KPI dropdown readability (`changes/toc-kpi-option-readability`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/toc-kpi-option-readability` |
| Slug | `toc-kpi-option-readability` — derived from free-text argument |
| Type | Change (usability enhancement; no defect in data or logic) |
| Deliverable | software |
| Approval Mode | gated |
| Requirement source | Marc Schut, *PRMS feedback – Innovation Development, Use and Packages reporting (batch 1)*, 30-Oct-2026, item 3 "Usability note" (SharePoint PRMSProject › 05_Digital Tools › 16. Reporting Tool › 2026 › IPSR). Our reply in that document (3-Nov-2026): *"we will improve it: code + name on the line, full text on hover"*. Epic P2-3094. |
| Visual source | None (no Figma). Small change inside an existing control |
| Depends on | none |
| Parallel-safe | yes (client only; no migration, no API contract) |
| Date | 2026-11-19 |
| Status | **Approved** by Santiago Sanchez, 2026-11-19, with OQ-1 resolved (see §12) |

## 2. Intent

When a reporter maps a result to a ToC KPI, they must be able to **read** each KPI before choosing it, and read the full KPI they chose afterwards.

## 3. Problem / Current Behavior

| # | Today | Evidence |
|---|---|---|
| P-1 | The "KPI Statement/description" select shows `indicator_description` raw as the option label | `multiple-wps-content.component.html:88-101` (`optionLabel="indicator_description"`) |
| P-2 | Each option row is a fixed **30 px** (one line) because the list is a CDK virtual scroll with a fixed item size | `pr-select.component.ts:63` (`virtualOptionItemSize = extraInformation() ? 50 : 30`) |
| P-3 | The option label is cut with `overflow: hidden; text-overflow: ellipsis`. No `title`, no tooltip, no second line | `pr-select.component.scss:120-125`, `pr-select.component.html:85-91` |
| P-4 | Marc observed horizontal scrolling and unreadable KPI text on result #953 (SP09, HLO 5.5.1) | Feedback doc, item 3. Exact cause of the horizontal scroll: `UNVERIFIED — confirm at source before relying on it` (reproduce on PRTest) |
| P-5 | After selection, the closed select shows the same one-line string; below it only "Indicator Typology" is shown. The full KPI text is visible nowhere | `multiple-wps-content.component.html:91-115` |
| P-6 | Whether the KPI code (e.g. `A5P8.2`) is always the first token of `indicator_description`, or lives in another column, is unknown. The server passes the DB column as-is (`toc-results.repository.ts:1028`, `toc-results.service.ts:399`); no fixture in the repo shows the real shape | `UNVERIFIED — confirm at source before relying on it` (owner: Santiago, SQL in OQ-1) |
| P-7 | No commit has touched this select since the feedback (30-Oct) | `git log -- …/multiple-wps-content/` (last: `ac951a0bc`, before 30-Oct) |

Design constraint: `docs/ux-ui/design.md:300` forbids hiding critical content in hover-only tooltips (they fail on touch devices and screen readers). So a hover alone, which is what we promised, does not meet the baseline. The full text must also be readable without hovering.

## 4. Proposed Outcome

1. In the open list, each KPI option shows **up to two lines** (instead of one cut line). Overflow beyond two lines ends in "…", and the full text is available on hover and to assistive technology.
2. Once a KPI is selected, the **full KPI text** is shown read-only under the select, next to "Indicator Typology".
3. If the data allows it (OQ-1), the option line leads with the **KPI code** so reporters can scan by code.
4. No other `app-pr-select` in the app changes. The new behaviour is opt-in.

## 5. Scope

- `custom-fields/pr-select/`: one opt-in input (working name `wrapOptions`) that enables 50 px two-line rows, `line-clamp-2`, and a `title` / `aria-label` with the full label. When the input is off, nothing changes.
- `rd-contributors-and-partners/components/multiple-wps/components/multiple-wps-content/`: turn the input on for the KPI select; add the read-only full-text block for the selected KPI (2026+ form, `isCP2026()`).
- Copy through `internationalization/` for the new label ("Selected KPI" or the equivalent agreed in specify).
- Cypress CT for `pr-select` (the gate for `custom-fields/`) + Jest for `multiple-wps-content`.
- Item (3), the code on the line: only if OQ-1 shows the code is reliably in the string. Otherwise it moves to a follow-up.

## 6. Non-Goals

- Changing which KPIs are listed (item 3's "missing PoD" was answered as a rule: A5P7.1 is a Knowledge Product indicator).
- Server, DB, ToC data or `/api/bilateral/*` changes. The PATCH payload is unchanged (W3 form ↔ API ↔ Fetcher rule: **no payload impact**, to be stated in the PR).
- Redesigning `app-pr-select` or replacing the virtual scroll.
- The other selects in the same panel (Level, HLO, Outcome, Output).

## 7. Affected Users, Systems, And Specs

| Who / what | Impact |
|---|---|
| Result submitters (W1/W2 P25, 2026+) mapping a result to a ToC KPI | Primary beneficiaries |
| IPSR contributors (`ipsr-contributors` reuses `app-cp-multiple-wps`) | Same improvement, same component |
| Contributor mirrors / share-request modal / review drawer (read-only instances) | Show the selected full text; verify in CT/Jest that read-only instances still render correctly |
| `app-pr-select` (shared, 50+ call sites) | Opt-in input only; default path untouched |
| Related specs | `changes/multi-hlo-result-linking` (same component, `indicatorOptions()` disabling), `bugfix/p2-3542-section-bar-toc-tabs` (off-screen feedback) — must not regress |

## 8. Visual Reference

- Source: None
- Location: —
- Notes: an in-place change to an existing control (taller rows, clamp, one read-only text block). It follows the existing `extraInformation` 50 px row pattern and the read-only box style of "Indicator Typology" (`fc-readonly-value`). A mockup can be generated in specify if wanted.

## 9. Requirement Delta Preview

### ADDED Requirements
- The KPI select shows each option on up to two lines, with the full text available on hover and via `aria-label`.
- After a KPI is selected (2026+ form), its full text is shown read-only under the select.
- (Conditional on OQ-1) The option line starts with the KPI code.

### MODIFIED Requirements
- `app-pr-select` gains an opt-in way to render taller, clamped option rows. Default behaviour unchanged.

### REMOVED Requirements
- None.

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| A. Hover only | Add `title` to every option | Smallest; literally what we promised | Fails `design.md:300` (touch, screen readers); text still unreadable at a glance; no full text after selection |
| **B. Two lines + full text after selection (recommended)** | Opt-in `wrapOptions` on `pr-select` (50 px rows reused from `extraInformation`, `line-clamp-2`, `title` + `aria-label`) + read-only full KPI under the select | Meets the promise and the baseline; reuses an existing row height so the virtual scroll stays fixed-size; zero impact on other selects | Touches `custom-fields/` → Cypress CT batch required |
| C. Variable-height list | Drop the virtual scroll for this select and let options wrap freely | Full text always visible in the list | Bigger change to a shared control; lists can be long; performance risk; out of proportion for one field |

## 11. Recommended Approach

**Option B.** It keeps the promise to Marc, closes the a11y gap the baseline names, and is the smallest change that keeps the fixed-size virtual scroll (the 50 px row already exists for `extraInformation`). The code-first label (item 3 of the outcome) is decided by OQ-1, not guessed.

## 12. Risks, Dependencies, And Open Questions

| ID | Item | Mitigation / owner |
|---|---|---|
| OQ-1 | ~~Is the KPI code always the first token of `indicator_description`?~~ **Resolved 2026-11-19** (PROD read, `Integration_information.toc_results_indicators`): only **273 of 10,251** descriptions start with a code; `toc_result_indicator_id` / `related_node_id` are UUIDs, never the code; length up to **3,969** chars (SP09 PoDs 1,000–3,600). SP09 rows read `A5P6.2: PoD name: <name>. Lead Center: <center>. PoD KPI: …`. **Consequences:** (a) no code parsing — the first two lines of the raw text already show code + PoD name + Lead Center where a code exists; (b) a full-text hover is dropped: a tooltip of thousands of characters is unreadable (client guide rule 16). The full text goes in the read-only block after selection, clamped with "Show more" | Closed |
| OQ-2 | Does the horizontal scroll Marc saw come from the option row or from the panel width? | Reproduce on PRTest with result #953 during specify |
| OQ-3 | Copy for the read-only block ("Selected KPI statement"?) | Decide in specify; via `internationalization/` |
| R-1 | `custom-fields/` is excluded from Jest; regressions show only in Cypress CT | Run `npm run test:ct:changed` in batches (never alongside Jest, `--maxWorkers=2` for Jest) |
| R-2 | The CT suite is already partly red on this branch (memory: 27/63 files on 2026-09-16) | Compare against the baseline; a pre-existing red is not a regression |
| R-3 | Read-only instances of `app-cp-multiple-wps` (mirrors, modal, drawer) could show a block in an awkward place | Cover them in specify's design; gate the block to the editable + read-only 2026 form only |
| R-4 | The unsaved-changes dirty tracker | View-only change; nothing new is written into `partnersBody` |

## 13. Success Criteria

- On PRTest, result #953 (SP09, HLO 5.5.1): each KPI option is readable on two lines without horizontal scrolling; hovering an option shows its full text.
- After selecting a KPI, its full text is visible under the select without hovering.
- Every other `app-pr-select` in the app renders exactly as before (CT green against baseline).
- PATCH payload of Contributors & partners is byte-identical before and after.
- A reply to Marc's comment on item 3 in the feedback document, once on PRTest.

## 14. Next Step

```text
/akili-specify changes/toc-kpi-option-readability
```

Before it, settle OQ-1 with the read-only query.

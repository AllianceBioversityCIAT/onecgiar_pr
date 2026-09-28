# Requirements — The section bottom bar must not read "Section complete" while an off-screen ToC tab is empty

## 1. Module / Feature

- **Module:** `results` (Result Detail) · secondary: `ipsr`
- **Sub-feature:** `section-bottom-bar` completeness pill · `rd-contributors-and-partners` ToC tabs
- **Owner:** Juan David Delgado (`j.delgado@cgiar.org`)
- **Status:** `approved` — user, 2026-09-25
- **Ticket(s):** **P2-3542** (QA-Bug, `To Be Improved`) under epic **P2-3512** *TOC User Feedback*
- **Depth:** **Lite**, in **Bug Mode**
- **Proposal:** [`proposal.md`](./proposal.md) — approved 2026-09-25
- **Module code:** `SBT`

---

## 2. Context

The bottom bar of a Result Detail section carries a completeness pill. On a section whose ToC mapping has **two or more tabs**, only the active tab is in the document, so the pill's DOM scan cannot see the other tabs' mandatory fields and paints "Section complete" while the sections rail — which asks the server — is red. That contradiction is the whole ticket: its acceptance criterion has always been one line, *the bottom bar and the sections rail must never disagree*.

**The defect is entirely client-side.** The server's green check answers correctly and is not touched: measured on TEST 2026-09-01, `validation_contributor_partner_P25(11422)` → `0` and `(11429)` → `0`, both red; measured live 2026-09-22, `currentSectionIsDone()` → `false` at the same instant `isComplete()` → `true`.

- **PRD** — **AC-6** ToC alignment at submit (the reporter must be able to see what still blocks it), **AC-2** submission workflow (the pre-submit signal a submitter reads must match the one that gates the transition). Goal **G1** / metric **M1.3**, *results blocked at the deadline boundary due to missing required fields* — a bar that says "complete" is exactly how a result reaches the deadline with a gap nobody was shown.
- **UX/UI** — `docs/ux-ui/design.md` **F1 step 6** (*"If gaps, panel menu shows red badges; submission is blocked"*) and **DD-4** (*"Sections expose their own validity"*). This spec changes no pixel; it changes which inputs feed an existing pill and an existing list.
- **TRD** — **W1 Result lifecycle**: pre-submit validation is server-side and stays so. Nothing here moves validation to the client.

---

## 3. In Scope / Out of Scope

### In scope

- The `section-bottom-bar` completeness pill and its "still missing" popover, on Result Detail.
- The mandatory-field scan in `DataControlService`, as the one place the bar's list is assembled.
- The ToC-tab child (`app-cp-multiple-wps`) reporting the gaps on the tabs it does **not** render.
- The same correction reaching **IPSR** (`ipsr-contributors`), which mounts the same child and runs the same scan — confirmed in scope by the user, 2026-09-25.
- A regression test that fails on `9354317d4` and passes after the fix.

### Out of scope

- The sections rail, Submit gating, `GreenChecksService`, `ResultSectionsService` — correct today, untouched.
- `validation_contributor_partner_P25` and every other server-side green check. Its three known defects (stale migrations `1762528725798` / `1762866499786`; false reds when `rit.number_target` is `0`/`null`; the `COUNT(temp.valid) = SUM(temp.valid)` NULL false green — all recorded in the P2-3542 comment of 2026-09-01) are real and are **separate tickets**; none produces this symptom.
- Reverting `RSC-1`. Its live-as-you-type pill is preserved, not undone.
- The **share-request modal**, whose `app-cp-multiple-wps` joins the scan's container union while open — pre-existing, unreported, excluded by the user's scope answer 2026-09-25. Recorded as `SBT-OQ-1`.
- The contributors' read-only ToC mirrors, the notifications item, and the bilateral review drawer — see `SBT-R-5`.

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | The bar stops telling them a section is finished when it is not, and names which ToC tab still has a gap. No new click, no new screen. |
| QA reviewer | One fewer result arriving with a section the submitter believed complete. |
| PMU lead | Metric **M1.3** stops being inflated by a UI that hid the gap. |

---

## 5. User Stories

- **`SBT-US-1`** — As a result submitter, I want the bar at the bottom of the section to agree with the rail on the left, so that I can trust either one to tell me whether the section is finished. *Enforces `AC-6`, `AC-2`.*
- **`SBT-US-2`** — As a result submitter, I want to be told **which** ToC tab still has a gap, so that I do not have to open every tab to find it. *Refines `US-S1`.*
- **`SBT-US-3`** — As a result submitter, I want the bar to keep reacting while I type, so that I do not have to save to learn whether I finished the field. *Refines `US-S5`; preserves `RSC-1`.*

---

## 6. Functional Requirements

### Required (MUST)

- **`SBT-R-1`** While any ToC tab of the open section carries an incomplete mandatory field, the bottom bar MUST NOT report the section complete — **whether or not that tab is the one rendered**.
- **`SBT-R-2`** A gap on a tab that is not rendered MUST be named in the bar's "still missing" list, identifying **both** the tab and the field (e.g. `Outcome N~2: Contribution to indicator target`).
- **`SBT-R-3`** The bar MUST keep deciding completeness without a save round-trip: clearing or filling a mandatory field on the **rendered** tab MUST move the pill within the existing scan cadence, exactly as it does today.
- **`SBT-R-4`** A section that reports off-screen gaps MUST stop reporting them once it is destroyed, so no gap of one section is counted against the next.
- **`SBT-R-5`** Only the block the submitter can edit MUST report off-screen gaps. The contributors' read-only ToC mirrors MUST NOT — the server's green check does not grade them, so reporting them would make the bar disagree with the rail in the opposite direction.
- **`SBT-R-6`** The correction MUST apply on IPSR (`ipsr-contributors`) as well as Result Detail, since both mount the same ToC-tab child and run the same scan.
- **`SBT-R-7`** A section with **one** ToC tab, and every section with no ToC tabs at all, MUST behave exactly as today — same count, same names, same pill.

### Should (SHOULD)

- **`SBT-R-10`** When the section is incomplete for a reason no rendered field carries, the bar SHOULD keep reading **"Section incomplete"** rather than `0 fields missing` with an empty list. *(User decision, 2026-09-25: conserve.)*

### Could (MAY)

- **`SBT-R-20`** An entry naming an off-screen gap MAY offer no jump button, since there is nothing on screen to scroll to. The existing per-entry `canGoToField` already degrades this way.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | The scan runs on an existing 150 ms throttled rAF (`result-detail.component.ts:265-284`). Reporting off-screen gaps MUST add no new change-detection trigger and no new timer, and MUST be O(number of ToC tabs) — single digits in practice. |
| **Correctness** | The bar MUST NOT report complete while `validation_contributor_partner_P25(<result_id>)` returns `0`. The reverse is permitted and accepted: the server may know a rule the client does not, and the bar converges on the next save — the trade-off `RSC-1` already accepted. |
| **Backwards compatibility** | `DataControlService.fieldFeedbackList` MUST remain a **writable** signal. `save-button.contract.cy.ts:190-211` calls `.set([...])` on it. |
| **Internationalization** | Any user-visible string added goes through `src/app/internationalization/` per the client guide, or reuses an existing label verbatim. |
| **Accessibility** | No new interactive control, so no new a11y surface. The popover's existing semantics are unchanged. |
| **Observability** | No logging added. A source that throws MUST NOT take the scan down with it — the on-screen gaps still have to be reported. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `SBT-AC-1` | Result 8954: tab 1 complete (contribution `0`, centre, lead centre, partner block), tab 2's *Contribution to indicator target* empty and saved | The page is reloaded and tab 1 is the rendered tab | The bar reads **red** and names `Outcome N~2: Contribution to indicator target`. **This is the case the 2026-09-22 re-test failed.** |
| `SBT-AC-2` | The same result, standing on **tab 2** | The bar renders | It still reads red and names the field once — **not twice**. The rendered tab is counted by the scan alone. |
| `SBT-AC-3` | A section with two tabs, both complete | The bar renders | It reads **"Section complete"**. No phantom gap. |
| `SBT-AC-4` | A section with two tabs, tab 2 empty, while `onActiveTab` has hidden the form for its 50 ms remount | The bar is read during that window | It still reads red. It must not flash green mid tab-switch. |
| `SBT-AC-5` | A section with **one** ToC tab whose contribution is empty | The bar renders | It names the field **once**, from the DOM scan, exactly as today. |
| `SBT-AC-6` | A section reporting an off-screen gap | The section is destroyed and another section opens | The next section's bar reports only its own gaps. |
| `SBT-AC-7` | A result whose contributors' read-only ToC mirror has an incomplete tab, while the submitter's own block is complete | The bar renders | It reads **"Section complete"** — the mirror is not graded. |
| `SBT-AC-8` | The `No` scenario (`planned_result === false`), where the whole ToC block is hidden | The bar renders | No ToC gap is reported; only the justification narrative rule applies, as today. |
| `SBT-AC-9` | General information (no ToC tabs) with two mandatory fields empty | The bar renders | `2 fields missing`, both named, both with a jump button — unchanged. |
| `SBT-AC-10` | Any off-screen gap source that throws | The scan runs | The on-screen gaps are still reported; the scan does not return an empty list. |
| `SBT-AC-11` | `DataControlService` after the change | A consumer calls `fieldFeedbackList.set([...])` | It succeeds — the signal is still writable. |

Cross-cutting project ACs that already apply: `AC-2`, `AC-6`, `AC-9`.

### Scenario — the defect (`SBT-R-1`, `SBT-AC-1`)

- **GIVEN** a P25 result in Contributors & Partners with two ToC tabs
- **AND** tab 1 is complete and tab 2's *Contribution to indicator target* is empty and saved
- **AND** tab 1 is the rendered tab
- **WHEN** the bottom bar paints its completeness pill
- **THEN** it reads incomplete and names `Outcome N~2: Contribution to indicator target`
- **AND** the sections rail is red, and the two agree
- **BUT** it must NOT reach that answer by asking the server — no new request, no waiting for a save
- **AND IT MUST** still turn green the moment tab 2's field is filled, without a save

### Scenario — the live pill survives (`SBT-R-3`, `SBT-AC-3`)

- **GIVEN** the same section with the last empty mandatory field on the **rendered** tab
- **WHEN** the reporter types a value into it
- **THEN** the pill turns green within the existing scan cadence
- **BUT** it must NOT wait for **Save draft** or for the green check to refresh
- **AND IT MUST** turn red again, just as fast, if the value is cleared

### Scenario — nothing leaks (`SBT-R-4`, `SBT-R-5`, `SBT-AC-6`, `SBT-AC-7`)

- **GIVEN** Contributors & Partners open and reporting an off-screen gap
- **WHEN** the reporter navigates to Evidence
- **THEN** Evidence's bar reports only Evidence's own gaps
- **BUT** it must NOT carry the ToC gap over
- **AND IT MUST** ignore the contributors' read-only mirrors in every case, on both sections

---

## 9. Defect classes and the gate for each

| # | Defect this spec can produce | Gate |
|---|---|---|
| `D1` | The off-screen gap is still invisible — the bug is not fixed | `SBT-AC-1` as a Jest test on the publisher, red before the fix. Scoped run: `npx jest --testPathPattern="cpmultiple-wps"` |
| `D2` | The rendered tab is counted **twice** — once by the scan, once by the publisher — so "1 field missing" reads "2" | `SBT-AC-2`, `SBT-AC-5` |
| `D3` | A publisher that outlives its section reports its gaps against the next one | `SBT-AC-6` — a destroy test, not a mount test |
| `D4` | A contributor's read-only mirror drags the submitter's bar red | `SBT-AC-7` |
| `D5` | `fieldFeedbackList` stops being writable and the Cypress contracts break silently — **CT is local-only, there is no CI job for it** | `SBT-AC-11` as a Jest assertion (`typeof fieldFeedbackList.set === 'function'`), plus the file list in the task's `Consumers`. The Jest assertion is the gate; the CT run is the confirmation |
| `D6` | A type error the Jest runner erases but the build catches | `npx tsc --noEmit` from `onecgiar-pr-client/`. No template is touched, so `tsc` is sufficient here — the client guide's warning that `tsc` cannot typecheck templates does not bite |
| `D7` | The scan regresses for sections with no ToC tabs at all | `SBT-AC-9` — the existing `data-control.service.spec.ts` and `rd-contributors-and-partners.zoneless.spec.ts` suites must stay green |
| `D8` | **The ring denominator under-counts.** Off-screen fields that are *complete* are not added to `mandatoryFieldsTotal`, so the ring can read "5 of 6" on a section that really has 8 | **No automated gate, and none is proposed.** The direction is safe by construction — the ring can never read full while something is missing — and the exact denominator is not what this ticket is about. **Recorded as an accepted risk**, to be confirmed by eye at the browser check below |
| `D9` | The fix works in Jest and not in the browser — stale bundle, a tab index restored from `savedActiveTabIndex`, a real payload shape the fixtures do not model | **No automated gate.** Substitute: **a human check at the HITL pause** on TEST with result 8954, following the reproduction steps verbatim, per the client guide §9 (inject `token` **and** `user`; confirm the served bundle is not stale). This is the gate for `SBT-AC-1` end to end — the Jest test proves the publisher, the browser proves the wiring |

**Classes with no automated check:** `D8` (accepted risk) and `D9` (substituted by the browser check). Both are stated here rather than left implicit, because a gate that cannot see the defect it is supposed to catch is not a gate.

---

## 10. Dependencies & Assumptions

### Upstream

- None. No server change, no migration, no CLARISA/ToC call, no coordination with Yeck or Cristian.

### Downstream consumers

- `section-bottom-bar` (pill, ring, popover, `goToField`), `save-button` (the "N alerts" chip used by IPSR, the result creator and links-to-results), and the specs and Cypress contracts enumerated in the proposal's Blast Radius. Carried into `design.md`'s Premise Ledger as a `consumer` row and into the owning task's `Consumers` field.

### Assumptions

- **A1** — `completnessStatusValidation(tab)` (`multiple-wps.component.ts:199-213`) is a correct per-tab completeness answer for every tab, rendered or not. It is what paints each tab's own red/green check icon today, so the UI already trusts it; this spec adds no second opinion.
- **A2** — The scan's existing 150 ms cadence is frequent enough to carry a value typed on the rendered tab. It already is, for every field the scan sees today.

---

## 11. Open Questions

- **`SBT-OQ-1`** — The **share-request modal** mounts `app-cp-multiple-wps` inside Result Detail, so its `.section_container` joins the scan's union while the modal is open. Pre-existing, never reported, and excluded from this spec by the user's scope answer (2026-09-25). **Owner: Juan David — a separate ticket if QA ever reports it.** Does not change this fix.
- **`SBT-OQ-2`** — `D8`'s ring denominator: accept the under-count, or teach the publisher to report its tabs' total as well as their gaps? **Owner: the HITL pause after `design.md`.** Low impact — the recommendation is to accept it and keep the change small.

---

## 12. Out-of-Band Notes

- This spec corrects one premise recorded in `docs/specs/archive/2026-09-08-changes--realtime-section-completion/execution.md:123` — *"`rd-theory-of-change` (the only section with hidden tabs) is P22-only"*. That spec's outcome (a live, as-you-type pill) stands and is a requirement here (`SBT-R-3`); only its premise about which sections have hidden tabs was wrong.
- QA's 2026-09-22 follow-up attributed the symptom to a frozen `computed()` in `ResultSectionsService`. The measurements were right; the attribution was not — `isComplete` simply no longer reads `currentSectionIsDone()`. `ResultSectionsService` needs no change. Worth saying back to QA when the fix lands.

---

## Required cross-references

- `docs/prd.md` — **G1**/**M1.3**, **US-S1**, **US-S5**, **AC-2**, **AC-6**.
- `docs/ux-ui/design.md` — **F1** step 6, **DD-4** (panel menu / sections expose their own validity).
- `docs/trd/trd.md` — **W1** Result lifecycle (server-side pre-submit validation, unchanged).
- `onecgiar-pr-client/src/CLAUDE.md` §21.5 — the three validation layers, and which one the scan reads.
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/CLAUDE.md` · `.../rd-contributors-and-partners/CLAUDE.md` — both describe this bar and are re-stamped in the same commit per the folder-doc convention.

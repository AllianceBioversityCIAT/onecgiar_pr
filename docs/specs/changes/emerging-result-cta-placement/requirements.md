# Requirements — Persistent emerging-result CTA that opens the Reporting aside

**One line:** a submitter who can create emerging results sees **Report emerging result** on the Science Program band of every tab, and both that control and the *Where to report* hub card open the **Reporting aside** (not the legacy centered dialog).

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/emerging-result-cta-placement` · Prefix `ERC` |
| Type | **Change** · Depth **Standard** |
| Approval Mode | `gated` (inherited from `proposal.md`) |
| Date | 2026-09-05 |
| Status | `approved` (Phase 1 Continue + Phase 3 HITL, 2026-09-05) |
| Ticket(s) | none yet (`ERC-OQ-1`) |
| Depends on | none · Parallel-safe: **no** vs. specs editing `reporting-program-band` or dashboard-lab hub/emerging handlers |
| Visual reference | Four user screenshots (chat 2026-09-05): hub CTA, band cluster, legacy dialog, Reporting aside. Not persisted in-repo. |
| Proposal | `./proposal.md` — intent converted here; Option C rejected; Option B preferred for Results / My results with hop fallback (`ERC-R-4`) |

Cites: `docs/prd.md` persona *Result submitter*, `G1` (`M1.2`), `US-S1`, `AC-1`, `AC-3`, `AC-5` · `docs/ux-ui/design.md` §1, §7 tokens, §10 a11y, client UI-RULES (one brand button; drawer not stacked modal) · `docs/trd/trd.md` `W1`, module `result-framework-reporting` · shipped specs `reporting-entry-hub` (hub card stays; that spec left emerging destination unchanged — this spec owns the destination change), `mass-reporting-flow` (aside is the planned-report reference), `my-work-board`, `sp-shell-app-viewport`.

Kaizen: **KZ-REH-2** (no native `[disabled]` on gated CTAs) · **KZ-MRF-2** (no undefined `--pr-*` tokens).

---

## 2. Context

Emerging results were never planned in the programme Theory of Change. Today the only obvious start is the **Report emerging result** card inside *Where to report*. That card opens a **legacy centered dialog**. The Reporting tab’s row **Report** already opens a better **aside** (sticky chrome, dirty-close, two-column form). The program band already sits on Overview, Reporting, Results, and My results, but its only create-adjacent control is *Where to report*.

This spec adds the emerging CTA to that band cluster and unifies both emerging entries onto the Reporting aside. No new API. Create stays the existing emerging payload (no ToC indicator).

Touches `docs/ux-ui/design.md` flow **F1** (create a typed result) and the Science Program chrome. Server module `api/results-framework-reporting` is **read-only** here (`docs/trd/trd.md` §2).

---

## 3. In Scope / Out of Scope

### In scope

- A **Report emerging result** control on the program band (expanded identity block and collapsed 48px bar) on Overview, Reporting, Results, and My results.
- Distinct band actions: *Where to report* and *Report emerging result* MUST NOT share a click handler.
- Hub **Report emerging result** and the band CTA both open the Reporting aside in **emerging mode** (no planned KPI; user chooses Output/Outcome + category in the form).
- Hide the CTA (and refuse the hub emerging action) when the user cannot create emerging results (AVISA / `SGP-02`, or no selected programme).
- Unhook the legacy centered dialog from hub and band only.
- Responsive label collapse, keyboard order, focus, and dirty-close on the aside.
- After create: existing aside navigation to result detail; Smart Back origin is the tab the user started from when that origin is Results or My results.

### Out of scope

- Deleting `app-report-result-form` or the legacy dialog component.
- Changing W1/W2 planned **Report**, W3 / bilateral create, or *Where to report* lanes.
- New result types, payloads, or endpoints (`AC-4` untouched).
- Redesigning the planned-KPI aside chrome or its `info` / `results` tabs.
- Guided-creation full-screen / unused `/emerging` sidebar expansion.
- Bilateral header **Report emerging result**.

---

## 4. Personas Affected

| Persona | What changes |
|---|---|
| Result submitter | Starts an emerging result from any SP tab; same form as Reporting. |
| PMU / programme lead | Same CTA if they can report; no new analytics. |
| QA reviewer · Platform admin · Bilateral consumer | No change. Downstream payloads unchanged. |

---

## 5. User Stories

- **`ERC-US-1`** As a result submitter, I want **Report emerging result** on the program band of every SP tab, so that I do not have to open *Where to report* first. (Refines `US-S1`, `G1` / `M1.2`.)
- **`ERC-US-2`** As a result submitter, I want that action — and the hub’s emerging card — to open the same aside I use when I report a planned KPI, so that I am not taught two different creators. (Refines `US-S1`.)
- **`ERC-US-3`** As a result submitter on an AVISA / view-only programme, I want no emerging create control, so that I cannot start a result that must not be created. (Refines `AC-3`.)
- **`ERC-US-4`** As a result submitter, I still want *Where to report* for W1/W2 and W3 wayfinding, so that emerging does not replace that hub. (Refines `US-S1`, `REH` shipped intent.)

---

## 6. Functional Requirements

### Required (MUST)

### Requirement: Band CTA on every SP tab

**`ERC-R-1`** When the user may create emerging results for the selected programme, the program band MUST show a control labelled **Report emerging result** on Overview, Reporting, Results, and My results, in both the expanded identity cluster and the collapsed 48px bar.

#### Scenario: Visible on all four tabs

- GIVEN a non-AVISA Science Program and a user who may create emerging results
- WHEN they open Overview, Reporting, Results, or My results
- THEN the band cluster shows **Report emerging result** without opening *Where to report*
- AND the control is present in the expanded cluster and in the collapsed bar
- BUT it MUST NOT replace or hide *Where to report* or Tour
- AND IT MUST use the outline / secondary treatment (not a second filled brand button)

#### Scenario: Narrow viewport

- GIVEN the band at a viewport where *Where to report* already hides its text
- WHEN the emerging control is shown
- THEN its visible label MAY collapse to icon-only
- AND IT MUST keep an accessible name **Report emerging result** (`aria-label` or equivalent)
- AND IT MUST NOT overflow the 48px collapsed bar horizontally (see defect-class table — layout is a visual gate)

---

### Requirement: Distinct actions

**`ERC-R-2`** Activating *Where to report* MUST open only the *Where to report* hub. Activating **Report emerging result** MUST start only the emerging create flow. The two MUST NOT share a click.

#### Scenario: Where to report does not start emerging

- GIVEN the band on any SP tab
- WHEN the user activates *Where to report*
- THEN the *Where to report* hub opens
- BUT the emerging aside MUST NOT open
- AND IT MUST NOT emit or handle an emerging-create signal as a side effect of that click

#### Scenario: Emerging does not open the hub

- GIVEN the band on any SP tab
- WHEN the user activates **Report emerging result**
- THEN the emerging create aside opens
- BUT the *Where to report* hub MUST NOT open as a prerequisite

---

### Requirement: One create surface — the Reporting aside

**`ERC-R-3`** The band **Report emerging result** control and the *Where to report* hub **Report emerging result** card MUST open the same Reporting aside used by a planned-KPI **Report**, in **emerging mode**: no ToC indicator, no planned KPI context.

#### Scenario: Hub no longer opens the legacy dialog

- GIVEN the *Where to report* hub is open
- WHEN the user activates **Report emerging result** in the hub
- THEN the hub closes
- AND the Reporting aside opens in emerging mode
- BUT the legacy centered dialog (`report-emerging-dialog` / *Report emerging result* modal with the old form) MUST NOT appear
- AND IT MUST NOT preselect an indicator category (user chooses Output/Outcome + category in the form)

#### Scenario: Band opens the same aside

- GIVEN Overview or Reporting (hosts that already show the Reporting aside)
- WHEN the user activates the band **Report emerging result**
- THEN the Reporting aside opens in emerging mode on the current tab
- AND the form is the same create form used for planned Report (category choice instead of a locked KPI)
- BUT planned-KPI tabs that only make sense for an indicator (`info` / reported-results) MUST NOT be offered as the starting view

---

### Requirement: Results and My results can start emerging without the hub

**`ERC-R-4`** From Results or My results, activating the band CTA MUST start the emerging create flow without opening *Where to report*. The user MUST be able to finish or cancel without being stranded on a tab they did not choose.

#### Scenario: Start from Results or My results

- GIVEN Results or My results and a user who may create emerging results
- WHEN they activate the band **Report emerging result**
- THEN the emerging create aside becomes available (in place, or after a host hop that opens that aside)
- BUT *Where to report* MUST NOT be required
- AND IT MUST restore Results or My results when the aside closes without a create, if the implementation left that tab to host the aside
- AND IT MUST, after a successful create, send the user to result detail with Smart Back origin equal to the tab they started from (Results or My results), including that tab’s query params

---

### Requirement: Gate when emerging create is forbidden

**`ERC-R-5`** When emerging create is forbidden for the selected programme (AVISA / `SGP-02`, or no programme selected), the band MUST NOT show **Report emerging result**, and the hub emerging action MUST NOT open a create surface.

#### Scenario: AVISA

- GIVEN programme AVISA (`SGP-02`)
- WHEN the user views any of the four SP tabs
- THEN the band emerging control is absent
- AND a hub emerging activation MUST NOT open the aside or the legacy dialog
- BUT *Where to report* MAY still open if the programme already shows that hub for wayfinding
- AND IT MUST NOT create a result

---

### Requirement: Planned Report and hub lanes unchanged

**`ERC-R-6`** A planned-KPI **Report** on the Reporting table MUST still open the aside against that KPI. *Where to report* W1/W2 and W3 actions MUST keep their current destinations.

#### Scenario: Planned row Report

- GIVEN a Reporting row with a planned indicator
- WHEN the user activates **Report** on that row
- THEN the aside opens with that indicator’s context
- BUT it MUST NOT open in emerging mode (no category-choice empty KPI)
- AND IT MUST NOT open the legacy emerging dialog

---

### Requirement: Phase and payload

**`ERC-R-7`** Emerging create MUST use the shell’s current reporting phase. The create payload MUST remain an emerging result (no ToC indicator id). No second phase picker.

#### Scenario: Phase follows the shell

- GIVEN a selected phase on the SP shell
- WHEN the user creates an emerging result from the band or hub
- THEN the result is created in that phase
- BUT the aside MUST NOT introduce a second phase control
- AND IT MUST NOT attach a planned ToC indicator id

---

### Should (SHOULD)

- **`ERC-R-10`** Results and My results SHOULD open the aside **in place** (no tab change). A hop to Overview or Reporting that satisfies `ERC-R-4` (return tab + Smart Back) is an accepted degradation if in-place hosting does not fit the design budget.
- **`ERC-R-11`** Keyboard tab order in the band cluster SHOULD be Tour → Report emerging result → Where to report. Focus rings MUST remain visible (`docs/ux-ui/design.md` §10).
- **`ERC-R-12`** The aside SHOULD keep its existing Escape + dirty-confirm behaviour in emerging mode.

### Could / Nice-to-have (MAY)

- **`ERC-R-20`** The collapsed-bar label MAY use a shorter visible string (e.g. **Emerging**) if **Report emerging result** overflows, provided the accessible name stays **Report emerging result**.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | Opening the aside MUST NOT add a new network call beyond what planned Report already needs to prime programme context. No extra list fetch for “existing contributors” when there is no indicator. |
| **Security** | JWT / existing create authorization only. No secrets in logs (`.cursorrules`). Client hide is UX; server create gate unchanged (`AC-3`). |
| **Backwards compatibility** | MUST NOT change `/api/bilateral/*` or create-result field names (`AC-4`). Legacy dialog file MAY remain in the tree. |
| **Accessibility** | WCAG 2.1 AA for the new control: name, role, focus, 4.5:1 text contrast (`docs/ux-ui/design.md` §10). Band heights stay 32/36px to match chrome (do not grow the 48px bar to satisfy a 44px touch ideal). |
| **Internationalization** | New user-facing strings MUST go through `src/app/internationalization/` when they are domain copy; structural **Report emerging result** MAY match the hub’s existing English until a term key exists. |
| **Observability** | No new telemetry required. MUST NOT log tokens. |
| **Tokens** | MUST use existing `--pr-*` only (KZ-MRF-2). |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `ERC-AC-1` | Non-AVISA SP; user may create | User opens each of the four tabs | Band shows **Report emerging result** in expanded and collapsed chrome |
| `ERC-AC-2` | Band visible | User clicks *Where to report* | Hub opens; emerging aside does not |
| `ERC-AC-3` | Band visible | User clicks **Report emerging result** | Emerging aside opens; hub does not |
| `ERC-AC-4` | Hub open | User clicks hub **Report emerging result** | Hub closes; emerging aside opens; legacy dialog does not |
| `ERC-AC-5` | Overview or Reporting | Band emerging click | Aside opens on the current tab in emerging mode (category choice, no KPI) |
| `ERC-AC-6` | Results or My results | Band emerging click | Emerging flow starts without the hub; cancel returns to that tab if a hop occurred; create Smart Back returns there |
| `ERC-AC-7` | AVISA / `SGP-02` | User views any SP tab / tries hub emerging | No band emerging CTA; no create surface opens |
| `ERC-AC-8` | Reporting planned row | User clicks row **Report** | Aside opens for that KPI, not emerging mode, not legacy dialog |
| `ERC-AC-9` | Emerging aside open | User completes create | Result is emerging (no ToC indicator), current shell phase; user lands on result detail |

Project ACs that already apply (do not restate): `AC-1`, `AC-3`, `AC-5`, `AC-9`. `AC-4` = no payload contract change.

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- Shipped *Where to report* hub (`reporting-entry-hub`).
- Reporting aside + `lab-report-form` emerging inputs (`mass-reporting-flow` lineage).
- Band on four tabs (`my-work-board`, `sp-shell-app-viewport`).
- `canReportEmerging()` / AVISA helper already on dashboard-lab.
- Smart Back origin persistence for Results / My results.

### Downstream consumers

- None. Create payload shape unchanged.

### Assumptions

- `A-1` Label is **Report emerging result** (singular), matching the hub card. (`ERC-OQ-2` default.)
- `A-2` In-place aside on Results / My results is preferred; hop with `returnTab` is allowed (`ERC-R-10`). (`ERC-OQ-3` default.)
- `A-3` No Jira key unless the owner supplies one (`ERC-OQ-1`).
- `A-4` The four screenshots are the visual source of truth for *what* changes, not pixel-perfect chrome (tokens stay PRMS).

---

## 10. Open Questions

- **`ERC-OQ-1`** Jira ticket key? Default: none. Does **not** block design if left empty.
- **`ERC-OQ-2`** Confirm label **Report emerging result**. Default: yes. Adjust if Image 1 copy must differ.
- **`ERC-OQ-3`** Results / My results: in-place (B) vs hop (A)? Default for design: **in-place**, with hop as documented degradation (`ERC-R-10`). Confirm if a tab jump is preferred to ship faster.

These defaults let Phase 2 proceed. Changing a default in Adjust must sweep this file, `proposal.md`, and later `design.md` / `tasks.md`.

---

## 11. Out-of-Band Notes

- `reporting-entry-hub` `requirements.md` Out of scope said emerging destination was **unchanged**. This spec **owns** that destination change. Do not “fix” the archived REH spec; cite this one.
- Dashboard-lab `CLAUDE.md` still says six entry points keep the old modal on purpose. After this spec ships, hub + band are aside; update that note in the same implementation commit as the folder-doc convention.

---

## 12. Defect classes and gates

| Defect class | What goes wrong | Gate that can see it | If the gate is blind |
|---|---|---|---|
| Wrong surface | Hub/band still opens `report-emerging-dialog` | Scoped Jest: hub/band handlers do not set the legacy modal flag; aside open flag is true | — |
| Coupled clicks | *Where to report* also starts emerging | Scoped Jest: `whereToReport` click does not emit/handle emerging | — |
| Missing CTA | Control absent on Results or My results or collapsed bar | Scoped Jest per host + collapsed fixture | — |
| AVISA leak | CTA or create on `SGP-02` | Scoped Jest `canReportEmerging === false` | — |
| Planned-report regression | Row Report opens emerging or the legacy dialog | Existing dashboard-lab Reporting specs + one assertion “not emerging” | — |
| Wrong payload | Emerging create sends a ToC indicator id | Jest on emerging-mode form / create payload helper | — |
| Return-tab stranding | Hop from My results never returns | Jest on `returnTab` close path | — |
| Collapsed-bar overflow | Third button clips or wraps the 48px bar | **jsdom cannot measure layout** | HITL visual at 375px + 900px, or T6 screenshot review |
| Contrast / focus | Outline CTA fails 4.5:1 or has no focus ring | Automated contrast over computed CSS is incomplete in Jest | HITL visual / T6; record as substituted gate |
| Token typo | New `var(--pr-*)` undefined (transparent) | `design-tokens.spec.ts` used-vs-defined sweep (KZ-MRF-2) | — |

A passing Jest run that never opens a browser **does not** prove overflow or contrast. Those two classes are explicit visual substitutes, not accepted silent risk.

---

## 13. Requirement ID Index

| ID | Kind | Summary |
|---|---|---|
| `ERC-US-1`…`4` | Story | Band CTA; same aside; AVISA hide; hub stays |
| `ERC-R-1` | MUST | Band CTA on four tabs, both chrome states |
| `ERC-R-2` | MUST | Distinct *Where to report* vs emerging |
| `ERC-R-3` | MUST | Aside emerging mode; no legacy dialog |
| `ERC-R-4` | MUST | Results / My results start + return / Smart Back |
| `ERC-R-5` | MUST | AVISA / no-programme gate |
| `ERC-R-6` | MUST | Planned Report and hub lanes unchanged |
| `ERC-R-7` | MUST | Shell phase; emerging payload |
| `ERC-R-10` | SHOULD | In-place on Results / My results |
| `ERC-R-11` | SHOULD | Tab order Tour → Emerging → Where to report |
| `ERC-R-12` | SHOULD | Escape + dirty confirm |
| `ERC-R-20` | MAY | Shorter collapsed visible label |
| `ERC-AC-1`…`9` | AC | Scenario table |
| `ERC-OQ-1`…`3` | OQ | Ticket, label, in-place vs hop |

---

## Required cross-references

- `docs/prd.md` — `G1` / `M1.2`, `US-S1`, `AC-1`, `AC-3`, `AC-5`, `AC-9`
- `docs/ux-ui/design.md` — §1, §7, §10, F1
- `docs/trd/trd.md` — `W1`, `result-framework-reporting`
- `docs/specs/changes/emerging-result-cta-placement/proposal.md`
- Archived `docs/specs/archive/2026-08-29-changes--reporting-entry-hub/` (hub card; destination superseded here)

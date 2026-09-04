# Requirements — Result Detail shows a clickable Submitter (Science Program)

The Result Detail identity strip MUST show the primary Science Program as **Submitter** and MUST link that value to the program’s reporting home. **Back to results** MUST keep going to the Results Center list.

## 1. Document Control

| Field | Value |
|---|---|
| Module | `results` (Result Detail chrome) |
| Sub-feature | `result-submitter-back-link` |
| Depth | Standard |
| Type | Change |
| Status | draft |
| Approval Mode | gated |
| Proposal | `docs/specs/changes/result-submitter-back-link/proposal.md` |
| Visuals | `docs/specs/changes/result-submitter-back-link/visual/` |
| Baseline | `US-S1` (`docs/prd.md`); Result Detail + Result Framework Reporting (`docs/ux-ui/design.md` §4–§5, §7 tokens, §9 tablet, §10 keyboard); `W1` (`docs/trd/trd.md`) |
| Ticket | none |
| Locked from proposal | Option A (link → SP home); keep **Back to results**; inline link chrome, not Image 2 chips; primary SP for this slice (not Center) |

## 2. Context

After **Report** on an indicator (By AOW / Reporting), the user lands on Result Detail. The new header shows title, code, category, level, funding, and status. It does not show which Science Program owns the result. The only chrome back-link is **Back to results**, which opens the global Results Center list.

The result payload already has the program (`initiative_official_code`, `initiative_name`). The previous header showed **Submitter: SP09 - Scaling for Impact** (`visual/legacy-submitter-chip.jpg` — copy example only). Acceptance criteria and Jest use the live header fixture **SP04 / Multifunctional Landscapes**. The `pageOpen` mockup dropped that chip and did not replace it.

This spec restores that identity on the current strip and makes it the way back to the program — without changing create APIs or replacing **Back to results**.

Refines `US-S1`. Touches Result Detail (`docs/ux-ui/design.md` §4) after F1-style create, and the Reporting home already used by SP cards (`/result-framework-reporting/entity-details/:code`).

## 3. Glossary

| Term | Meaning |
|---|---|
| Identity strip | The one-line metadata row under the result title: code, ⓘ, category, level, funding, status |
| Submitter | The result’s primary Science Program, shown as `{official_code} - {name}` |
| Official code | `currentResult.initiative_official_code` as stored (e.g. `SP04`, `SGP-02`). Do not invent a hyphen variant |
| Program home | `/result-framework-reporting/entity-details/{official_code}` — same destination as a Reporting Home SP card |
| `md` | 900px tablet breakpoint (`docs/ux-ui/design.md` §9) |

## 4. In Scope / Out of Scope

**In scope**

- Show Submitter on the Result Detail identity strip when an official code exists.
- Make that value a link to program home.
- Accessible name that includes “Submitter”.
- Hide the control when there is no official code.
- Keep **Back to results** on `/result/results-outlet/results-list`.
- Wrap/readability of the strip at `md` (900px).

**Out of scope**

- Restoring the six-chip legacy metadata row.
- Filling ⓘ Origin / Center / Created by (`Coming soon`).
- Replacing, relabeling, or removing **Back to results**.
- Browser `history.back()` as the return.
- Exact AOW / indicator / filter / scroll restore (proposal Option C).
- Create-payload, server API, Tawk, or action-strip changes.
- Showing a Center as Submitter on W3/Bilateral results (this slice is always the primary SP when a code exists).

## 5. Personas Affected

| Persona | What changes |
|---|---|
| Result submitter (AoW lead / PI) | Sees which SP they reported under; one click back to that program (`US-S1`) |
| QA reviewer | Same chrome when they open Result Detail |

## 6. User Stories

- **RSBL-US-1** — As a result submitter, I want to see the Science Program on Result Detail, so that I know which program I am reporting under. Refines `US-S1`.
- **RSBL-US-2** — As a result submitter, I want to open that Science Program from the header, so that I can return to reporting after creating or opening a result. Refines `US-S1`.

## 7. Functional Requirements

### Required (MUST)

- **RSBL-R-1** When Result Detail has a primary official code, the identity strip MUST show a Submitter value `{official_code} - {name}` without opening ⓘ. The name is `initiative_name` (or the short name already on the result). The system MUST NOT invent a name or a different code spelling.
- **RSBL-R-2** The Submitter value MUST be a single in-app link to `/result-framework-reporting/entity-details/{official_code}`. The official code in the path MUST be the stored value, unchanged. Click and keyboard activation MUST open that route in the same tab.
- **RSBL-R-3** When there is no official code (missing, empty, or whitespace-only), the system MUST NOT render a Submitter link. It MUST NOT render `entity-details/` with an empty or `undefined` segment.
- **RSBL-R-4** **Back to results** MUST remain visible and MUST keep targeting `/result/results-outlet/results-list`.
- **RSBL-R-5** Submitter MUST come from the loaded result, not from the referrer. Refresh and a shared Result Detail URL MUST still show the same Submitter and the same link.
- **RSBL-R-6** The Submitter control’s accessible name MUST include the word “Submitter” and MUST include the official code. The control MUST be reachable by Tab and MUST show a visible focus ring (`docs/ux-ui/design.md` §10).
- **RSBL-R-7** At viewport width ≥ `md` (900px), Submitter MUST remain fully readable and pointer-reachable. The strip MAY wrap; it MUST NOT overflow horizontally or cover the title, PDF, or ⋮ actions.

### Should (SHOULD)

- **RSBL-R-10** Submitter SHOULD use the same link treatment as **Back to results** (primary color, hover opacity) — inline in the strip, not an outlined Image 2 chip.

### Could (MAY)

None.

### Scenarios

#### RSBL-R-1 — Submitter visible on the strip

- GIVEN Result Detail is showing a result whose official code is `SP04` and whose name is `Multifunctional Landscapes`
- WHEN the header renders
- THEN the identity strip shows `SP04 - Multifunctional Landscapes` without opening ⓘ
- AND a visible “Submitter” label is present (text or `aria-label`)
- BUT the system MUST NOT show a fabricated name if only the code exists — then it MUST show the code alone
- AND IT MUST use the stored official code, including existing hyphenation (`SGP-02` stays `SGP-02`)

#### RSBL-R-2 — Click opens program home

- GIVEN the Submitter link is shown for official code `SP04`
- WHEN the user activates it (pointer click or Enter)
- THEN the app navigates to `/result-framework-reporting/entity-details/SP04` in the same tab
- AND IT MUST NOT open a new window
- BUT it MUST NOT append a guessed AOW, `tocView`, or return query — program home only

#### RSBL-R-3 — No code, no link

- GIVEN Result Detail is showing a result with no official code (missing, empty, or whitespace-only)
- WHEN the header renders
- THEN no Submitter link is in the document
- AND no `href` contains `entity-details/undefined` or `entity-details/` with an empty last segment
- BUT **Back to results**, title, code, and the rest of the strip MUST still render

#### RSBL-R-4 — Results Center exit unchanged

- GIVEN Result Detail is open (any section)
- WHEN the user activates **Back to results**
- THEN the app navigates to `/result/results-outlet/results-list`
- BUT that link’s label and target MUST NOT change because Submitter was added

#### RSBL-R-5 — Not referrer-only (the Report journey)

- GIVEN the user reported from an indicator (By AOW) and landed on `/result/result-detail/:code/general-information?phase=`
- OR GIVEN they opened the same URL via refresh or a shared link
- WHEN the header renders
- THEN Submitter matches RSBL-R-1 / RSBL-R-2 for that result
- BUT it MUST NOT require a `from`, `returnUrl`, or history stack
- AND IT MUST still hold after a full reload

#### RSBL-R-6 — Keyboard and name

- GIVEN Submitter is shown
- WHEN the user Tabs through the header
- THEN focus reaches the Submitter link in document order after **Back to results** and the title-row actions, and a focus ring is visible
- AND the accessible name contains `Submitter` and the official code
- BUT the control MUST NOT be name-only (`SP04`) with no Submitter cue

#### RSBL-R-7 — Tablet wrap

- GIVEN Result Detail at 900px width with a long program name
- WHEN the header renders
- THEN Submitter is fully visible (wrapping allowed) and clickable
- BUT it MUST NOT overflow the header or overlap the title / PDF / ⋮
- AND IT MUST remain usable with the sidebar open on a ~1100px window

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | No extra HTTP call for Submitter. Use the result already loaded for the header. |
| **Security** | Same-tab in-app route only. No `javascript:` / external URL from user-controlled name. Official code is path-encoded as a route param. |
| **Backwards compatibility** | Additive chrome only. No payload or API change (`AC-4` n/a). |
| **Accessibility** | WCAG 2.1 AA for the new link: name, focus, contrast on `--pr-color-primary-300` (`docs/ux-ui/design.md` §7, §10). |
| **Internationalization** | New visible “Submitter” string SHOULD go through `TerminologyService` / i18n if the header already does for siblings; if the header hardcodes English today, match that convention and do not invent a second i18n path in this spec. |
| **Responsive** | No horizontal page scroll at `md` caused by this control. |

## 9. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| RSBL-AC-1 | Result with `initiative_official_code=SP04` and name `Multifunctional Landscapes` | Header renders | Identity strip shows Submitter `SP04 - Multifunctional Landscapes` without opening ⓘ |
| RSBL-AC-2 | Submitter shown for `SP04` | Click or Enter | Same-tab navigation to `/result-framework-reporting/entity-details/SP04` |
| RSBL-AC-3 | Result with no official code (missing, empty, or whitespace-only) | Header renders | No Submitter link; no `entity-details/undefined` |
| RSBL-AC-4 | Any Result Detail section | **Back to results** | Still `/result/results-outlet/results-list` |
| RSBL-AC-5 | Arrive from Report, or refresh the result URL | Header renders | Submitter still matches AC-1 / AC-2 |
| RSBL-AC-6 | Submitter shown | Tab to the link | Accessible name includes Submitter + official code; focus ring visible |
| RSBL-AC-7 | Viewport 900px, long SP name | Header renders | Submitter readable and clickable; no overlap with title / PDF / ⋮ |

Project ACs that still apply (do not restate): `AC-1`, `AC-3`, `AC-9`.

## 10. Defect classes and gates

| Defect class | Gate | If the gate cannot see it |
|---|---|---|
| Missing / wrong Submitter text | Scoped Jest on `result-header.component.spec` (text + absence when no code) | — |
| Wrong or empty `entity-details` href | Same Jest: `routerLink` / `href` equals `/result-framework-reporting/entity-details/{code}` | — |
| **Back to results** regresses | Existing back-link assertion in the same spec | — |
| Referrer-only (breaks on refresh) | Jest uses `currentResult` only; no history mock required for the happy path | HITL: refresh after Report |
| Keyboard / accessible name | Jest: `aria-label` or accessible name; focus presence | Focus-ring paint: HITL |
| Wrap / overlap at 900px | **No automated layout gate** (jsdom cannot measure) | HITL at 900px and ~1100px vs `visual/current-header-no-submitter.jpg` + `visual/legacy-submitter-chip.jpg` |
| Contrast of the new link | Not axe-over-screenshot | HITL: primary link on white, same as **Back to results** |

A green Jest run is not evidence for RSBL-R-7. That class is HITL (or T6 if a screenshot review is requested).

## 11. Dependencies & Assumptions

### Upstream

- `GET` result already used by Result Detail supplies `initiative_official_code` and a display name. No new endpoint.
- Program home route `/result-framework-reporting/entity-details/:entityId` already exists.

### Downstream

- None. Reporting Home / entity-details only receive a navigation they already accept.

### Assumptions (locked unless Adjust)

- **RSBL-OQ-1** → Option A: program home, not exact AOW.
- **RSBL-OQ-2** → Submitter is the primary SP whenever a code exists, including W3/Bilateral.
- **RSBL-OQ-4** → Inline link, not outlined chips.
- Display name field is `initiative_name` (already on the header test fixture). If only the code is present, show the code alone.

## 12. Open Questions

Resolved in this draft from the proposal. Confirm or Adjust:

- **RSBL-OQ-1** Click goes to program home (locked). Exact AOW is a later spec.
- **RSBL-OQ-2** W3/Bilateral still shows the primary SP, not the Center (locked).
- **RSBL-OQ-3** No Jira.
- **RSBL-OQ-4** Inline link chrome (locked).

## 13. Out-of-Band Notes

Live surface after Report is `app-result-header` on Result Detail, not the aside (`KZ-changes--kp-report-modal-auto-create-1`). Do not implement Submitter inside `LabReportFormComponent`.

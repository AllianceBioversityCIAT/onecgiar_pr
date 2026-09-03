# Requirements — Result Detail links back to the reported Area of Work

The Result Detail identity strip MUST show the result’s owning **Area of Work** and MUST link that value to the program’s By AOW list for that code. **Submitter** MUST still open program home. **Back to results** MUST still open the Results Center list.

## 1. Document Control

| Field | Value |
|---|---|
| Module | `results` (Result Detail chrome) |
| Sub-feature | `result-indicator-back-link` |
| Depth | Standard |
| Type | Change |
| Status | draft |
| Approval Mode | gated |
| Proposal | `docs/specs/changes/result-indicator-back-link/proposal.md` |
| Visuals | `docs/specs/changes/result-indicator-back-link/visual/` |
| Baseline | `US-S1` (`docs/prd.md`); Result Detail + Reporting (`docs/ux-ui/design.md` §4–§5, §7, §9–§10); `W1` (`docs/trd/trd.md`) |
| Ticket | none |
| Depends on | Archived `changes/result-submitter-back-link` (Submitter shipped) |
| Locked from proposal | Option A (second strip item from ToC); keep Submitter → program home; AOW required, `kpi` optional; no return URL on create |

## 2. Context

After **Report** from By AOW, Result Detail shows **Submitter: SP04 - Multifunctional Landscapes**. That click opens the program catalogue (`tocView=aows`) — `visual/submitter-lands-on-sp-home.jpg`. The user actually reported from **inside AOW01** (`visual/by-aow-aow01-indicators.jpg`). The result already records that mapping on Contributors (`visual/result-toc-hlo-aow01.jpg`: HLO **AOW01** / OP 1.2.6).

This spec adds the deferred Option C from Submitter as a **second** control: identity of the owning Area of Work, link to By AOW. It does not retarget Submitter and does not add a return query on create.

Acceptance and Jest use **SP04** + owning AOW **AOW01** (same program fixture as the Submitter spec; AOW01 is the user’s HITL example). Do not use screenshot-only names as the Jest lock.

Refines `US-S1`. Touches Result Detail chrome (`docs/ux-ui/design.md` §4) and the existing Reporting By AOW query (`tocView=byAow`, `tocAow`, optional `kpi`).

## 3. Glossary

| Term | Meaning |
|---|---|
| Identity strip | Metadata row under the title: code, ⓘ, category, level, funding, Submitter, status |
| Owning AOW | The Area of Work from the result’s **primary / first planned** ToC mapping (e.g. `AOW01`). Stored spelling; do not invent a hyphen variant |
| Official code | Primary Science Program code already used by Submitter (e.g. `SP04`) |
| By AOW URL | `/result-framework-reporting/entity-details/{official_code}?tocView=byAow&tocAow={aowCode}` — same shape as Reporting Copy link, without requiring `kpi` |
| Program home | `/result-framework-reporting/entity-details/{official_code}` — Submitter’s destination; MUST NOT gain `tocAow` from this spec |
| `md` | 900px tablet breakpoint (`docs/ux-ui/design.md` §9) |

## 4. In Scope / Out of Scope

**In scope**

- Show Area of Work on the identity strip when an official code **and** a resolvable owning AOW exist.
- Link that value to By AOW for that AOW (same tab).
- Append `kpi=` only when exactly one contributing indicator id is known.
- Hide the control when official code or owning AOW is missing / empty / whitespace, or the AOW is a program-level bucket (Intermediate Outcomes / 2030 Outcomes).
- Keep Submitter → program home and **Back to results** → Results Center list.
- Accessible name that includes “Area of Work” and the AOW code.
- Wrap/readability at `md` (900px) and ~1100px with sidebar.

**Out of scope**

- Changing Submitter label, value, or href.
- Replacing **Back to results**.
- `history.back()`, `returnUrl`, or query params on Report / create navigations.
- Restoring search, type, status, or center filters.
- Exact scroll if `kpi=` is absent.
- New Reporting browse modes or route table entries.
- Create APIs, server contracts, Contributors ToC editor.
- Center-as-submitter. A second i18n path if the header still hardcodes English.

## 5. Personas Affected

| Persona | What changes |
|---|---|
| Result submitter (AoW lead / PI) | One click from Result Detail back into the AOW they reported under (`US-S1`) |
| QA reviewer | Same chrome when they open Result Detail |

## 6. User Stories

- **RIBL-US-1** — As a result submitter, I want to see which Area of Work this result is mapped to on Result Detail, so that I know where it sits in the program ToC. Refines `US-S1`.
- **RIBL-US-2** — As a result submitter, I want to open that Area of Work’s By AOW list from the header, so that I can continue reporting without walking the program catalogue. Refines `US-S1`.

## 7. Functional Requirements

### Required (MUST)

- **RIBL-R-1** When Result Detail has a primary official code **and** a resolvable owning AOW, the identity strip MUST show an Area of Work value `{aowCode}` or `{aowCode} - {short name}` without opening ⓘ. The system MUST NOT invent a name or a different AOW spelling. When several planned mappings exist, it MUST use the primary / first planned mapping of the submitter Science Program — not a Center-contributor mapping.
- **RIBL-R-2** The Area of Work value MUST be a single in-app link to `/result-framework-reporting/entity-details/{official_code}?tocView=byAow&tocAow={aowCode}`. Official code and AOW code in that URL MUST be the stored values. Click and keyboard activation MUST open that route in the same tab. The link MUST NOT open a new window and MUST NOT add guessed filters (`q`, `typ`, `st`, `aow` search chips).
- **RIBL-R-3** When official code is missing/empty/whitespace, **or** owning AOW is missing/empty/whitespace, **or** the AOW is a program-level bucket (Intermediate Outcomes / 2030 Outcomes), the system MUST NOT render an Area of Work link. It MUST NOT render `tocAow=undefined`, `tocAow=` with an empty value, or `entity-details/undefined`.
- **RIBL-R-4** **Submitter** MUST remain visible when it already is, and MUST keep targeting program home **without** `tocView=byAow` or `tocAow` added by this control. **Back to results** MUST remain visible and MUST keep targeting `/result/results-outlet/results-list`.
- **RIBL-R-5** Area of Work MUST come from the loaded result’s ToC mapping, not from the referrer. Refresh and a shared Result Detail URL MUST still show the same value and the same link. The system MUST NOT require a `from`, `returnUrl`, or history stack.
- **RIBL-R-6** The Area of Work control’s accessible name MUST include the words “Area of Work” and MUST include the AOW code. The control MUST be reachable by Tab after **Back to results**, title-row actions, and Submitter, and MUST show a visible focus ring (`docs/ux-ui/design.md` §10).
- **RIBL-R-7** At viewport width ≥ `md` (900px), Area of Work MUST remain fully readable and pointer-reachable. The strip MAY wrap; it MUST NOT overflow horizontally or cover the title, PDF, or ⋮. It MUST remain usable with the sidebar open on a ~1100px window.

### Should (SHOULD)

- **RIBL-R-10** When exactly one contributing indicator id is known for that owning AOW, the link SHOULD include `kpi={id}` (Reporting Copy-link contract). When zero or more than one id is known, the link MUST omit `kpi` rather than guess.
- **RIBL-R-11** Area of Work SHOULD use the same inline primary-link treatment as Submitter (muted label + primary value) — not an outlined chip.

### Could (MAY)

None.

### Scenarios

#### RIBL-R-1 — Area of Work visible on the strip

- GIVEN Result Detail is showing a result whose official code is `SP04` and whose owning AOW is `AOW01`
- WHEN the header renders
- THEN the identity strip shows `AOW01` (or `AOW01 - {name}` if a short name is already on the mapping) without opening ⓘ
- AND a visible “Area of Work” cue is present (text or `aria-label`)
- BUT the system MUST NOT show a fabricated name if only the code exists — then it MUST show the code alone
- AND IT MUST use the stored AOW spelling (`AOW01` stays `AOW01`)

#### RIBL-R-2 — Click opens By AOW

- GIVEN the Area of Work link is shown for official code `SP04` and AOW `AOW01`
- WHEN the user activates it (pointer click or Enter)
- THEN the app navigates to `/result-framework-reporting/entity-details/SP04?tocView=byAow&tocAow=AOW01` in the same tab (query order may vary; both params MUST be present)
- AND IT MUST NOT open a new window
- BUT it MUST NOT append guessed search / type / status / center filters

#### RIBL-R-3 — No AOW, no link

- GIVEN Result Detail is showing a result with no owning AOW (missing, empty, whitespace-only, or a program-level bucket)
- WHEN the header renders
- THEN no Area of Work link is in the document
- AND no `href` contains `tocAow=undefined` or `tocAow=` with an empty last value
- BUT **Submitter** (if the official code exists), **Back to results**, title, and the rest of the strip MUST still render

#### RIBL-R-4 — Submitter and Results Center unchanged

- GIVEN Result Detail is open with both Submitter and Area of Work shown
- WHEN the user activates **Submitter**
- THEN the app navigates to program home for that official code **without** `tocAow`
- AND when the user activates **Back to results**, the app navigates to `/result/results-outlet/results-list`
- BUT those two controls’ labels and targets MUST NOT change because Area of Work was added

#### RIBL-R-5 — Not referrer-only

- GIVEN the user reported from AOW01 By AOW and landed on Result Detail with `?phase=`
- OR GIVEN they opened the same Result Detail URL via refresh or a shared link
- WHEN the header renders
- THEN Area of Work matches RIBL-R-1 / RIBL-R-2 for that result’s mapping
- BUT it MUST NOT require a `from`, `returnUrl`, or history stack
- AND IT MUST still hold after a full reload

#### RIBL-R-6 — Keyboard and name

- GIVEN Area of Work is shown
- WHEN the user Tabs through the header
- THEN focus reaches the Area of Work link after **Back to results**, title-row actions, and Submitter, and a focus ring is visible
- AND the accessible name contains `Area of Work` and the AOW code
- BUT the control MUST NOT be name-only (`AOW01`) with no Area of Work cue

#### RIBL-R-7 — Tablet wrap

- GIVEN Result Detail at 900px width with Submitter and a long AOW name
- WHEN the header renders
- THEN Area of Work is fully visible (wrapping allowed) and clickable
- BUT it MUST NOT overflow the header or overlap the title / PDF / ⋮
- AND IT MUST remain usable with the sidebar open on a ~1100px window

#### RIBL-R-10 — Optional kpi

- GIVEN the owning AOW is `AOW01` and exactly one contributing indicator id `42` is known
- WHEN the Area of Work link renders
- THEN the href includes `kpi=42` and `tocAow=AOW01`
- BUT when zero or two-or-more indicator ids are known, the href MUST NOT include `kpi`

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | No extra HTTP invented for this chrome if the mapping is already loaded for Result Detail. If a read is required, it MUST be an existing Result Detail / ToC call — no new endpoint. |
| **Security** | Same-tab in-app route only. Official code and AOW code are route / query params, not raw HTML href interpolation the user can script. |
| **Backwards compatibility** | Additive chrome only. Submitter href and **Back to results** unchanged. No payload or API removal (`AC-4` n/a). |
| **Accessibility** | WCAG 2.1 AA for the new link: name, focus, contrast on `--pr-color-primary-300` (`docs/ux-ui/design.md` §7, §10). |
| **Internationalization** | Hardcode “Area of Work” the same way the header hardcodes “Submitter” / “Back to results”. Do not open a second i18n path. |
| **Responsive** | No horizontal page scroll at `md` caused by this control. |

## 9. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| RIBL-AC-1 | Result with official code `SP04` and owning AOW `AOW01` | Header renders | Strip shows Area of Work `AOW01` (or `AOW01 - {name}`) without opening ⓘ |
| RIBL-AC-2 | Area of Work shown for `SP04` / `AOW01` | Click or Enter | Same-tab navigation to `entity-details/SP04` with `tocView=byAow` and `tocAow=AOW01` |
| RIBL-AC-3 | Result with no owning AOW (missing, empty, whitespace, or program-level bucket) | Header renders | No Area of Work link; no `tocAow=undefined` |
| RIBL-AC-4 | Both Submitter and Area of Work shown | Activate Submitter / Back to results | Submitter → program home without `tocAow`; Back to results → `/result/results-outlet/results-list` |
| RIBL-AC-5 | Arrive from Report, or refresh the result URL | Header renders | Area of Work still matches AC-1 / AC-2 |
| RIBL-AC-6 | Area of Work shown | Tab to the link | Accessible name includes Area of Work + AOW code; focus ring visible |
| RIBL-AC-7 | Viewport 900px, Submitter + long AOW name | Header renders | Area of Work readable and clickable; no overlap with title / PDF / ⋮ |
| RIBL-AC-8 | Exactly one contributing indicator id `42` | Header renders | Href includes `kpi=42`; omitted when 0 or 2+ ids |

Project ACs that still apply (do not restate): `AC-1`, `AC-3`, `AC-9`.

## 10. Defect classes and gates

| Defect class | Gate | If the gate cannot see it |
|---|---|---|
| Missing / wrong AOW text | Scoped Jest on `result-header.component.spec` (text + absence) | — |
| Wrong By AOW href (`tocView` / `tocAow` / empty / `undefined`) | Same Jest: href contains `tocView=byAow` and `tocAow=AOW01` | — |
| `kpi` guessed or leftover | Same Jest: present only for the single-id fixture; absent for 0 and 2+ | — |
| Submitter or **Back to results** regresses | Existing Submitter / back-link assertions in the same spec | — |
| Referrer-only | Jest uses loaded mapping only; no history mock | HITL refresh optional |
| Keyboard / accessible name | Jest: `aria-label` contains Area of Work + code | Focus-ring paint: HITL |
| Wrap / overlap at 900px | **No automated layout gate** | HITL at 900px and ~1100px vs `visual/result-detail-with-submitter.jpg` |
| Contrast | Not axe-over-screenshot | HITL: same primary link as Submitter |

A green Jest run is not evidence for RIBL-R-7.

## 11. Dependencies & Assumptions

### Upstream

- Result Detail already loads the primary official code (Submitter).
- The result’s ToC mapping already stores an owning AOW for planned mappings (Contributors HLO). Specify/design MUST name the existing read; this spec MUST NOT invent an endpoint.
- By AOW query `tocView=byAow` + `tocAow` (+ optional `kpi`) already exists on entity-details.

### Downstream

- Reporting Home / dashboard-lab only receive a navigation they already accept (Copy link).

### Assumptions (locked unless Adjust)

- **RIBL-OQ-1** → Label **Area of Work**; value `{code}` or `{code} - {name}`.
- **RIBL-OQ-2** → Primary / first planned mapping of the submitter SP.
- **RIBL-OQ-3** → No Jira.
- **RIBL-OQ-4** → `kpi` optional; By AOW of AOW01 is enough when the id is missing or ambiguous.

## 12. Open Questions

Resolved from the proposal unless Adjust:

- **RIBL-OQ-1** Copy locked to **Area of Work**.
- **RIBL-OQ-2** Multi-HLO → primary / first planned.
- **RIBL-OQ-3** No Jira.
- **RIBL-OQ-4** `kpi` optional.

## 13. Out-of-Band Notes

Live surface after Report is `app-result-header` on Result Detail, not the aside (`KZ-changes--kp-report-modal-auto-create-1`). Do not implement this link inside `LabReportFormComponent`.

# Requirements — Result Detail action strip stays uncovered

**Corrected behavior:** on Result Detail, the site footer MUST NOT appear as a floating overlay. Back / Next / Sync / Save draft stay fully visible and usable from tablet width up, matching `visual/wide-action-bar-correct.jpg`.

## 1. Document Control

| Field | Value |
|---|---|
| Module | `results` (Result Detail chrome) + shared `footer` |
| Sub-feature | `result-detail-footer-overlap` |
| Depth | Lite (Bug Mode) |
| Type | Bug |
| Status | draft |
| Approval Mode | gated |
| Proposal | `docs/specs/changes/result-detail-footer-overlap/proposal.md` |
| Visual target | `docs/specs/changes/result-detail-footer-overlap/visual/wide-action-bar-correct.jpg` |
| Baseline | `US-S1`, `US-S5` (`docs/prd.md`); Result Detail screen (`docs/ux-ui/design.md` §9 tablet, §10 keyboard); `W1` (`docs/trd/trd.md`) |
| Ticket | none |

## 2. Context

Result Detail is a viewport-locked editor. A hover-to-reveal CGIAR footer was mounted on `/result/result-detail/` when the page had no floor. The page now has `section-bottom-bar` on that same edge. The leftover overlay (`floating: true`, z-index 10, 400px hover trap) covers the action strip on narrow windows. Confirmed root cause: proposal §9.

## 3. Glossary

| Term | Meaning |
|---|---|
| Action strip | The Result Detail floor: Back, Next, Section N of M, status, Sync, Save draft |
| Floating footer | Site footer mounted `position: fixed` with hover-to-reveal on listed routes |
| `md` | Tablet breakpoint, 900px (`docs/ux-ui/design.md` §9) |

## 4. In Scope / Out of Scope

**In scope**

- Stop mounting the floating site footer on Result Detail.
- Keep the action strip reachable at `md` and at a narrowed ~1100px desktop window.
- Regression that fails while the footer still floats on this route.

**Out of scope**

- Redesign of the action strip, new tokens, or a phone (`xs`/`sm`) layout.
- Footer behavior on Results list, IPSR, Type-One Report, QA, admin, login.
- Tawk retune unless the visual guard shows it covering Save draft after the footer is gone.
- Option B (legal-link handle on this page) — locked out; Contact Us / Terms stay on pages that still show the footer.

## 5. Personas Affected

| Persona | What changes |
|---|---|
| Result submitter | Can save and change sections on tablet / narrowed laptop (`US-S1`, `US-S5`) |
| QA reviewer | Same chrome when they open Result Detail |

## 6. User Stories

- **FOVL-US-1** — As a result submitter, I want Back / Next / Sync / Save draft unobstructed on a tablet-width window, so that I can save and move sections. Refines `US-S1`, `US-S5`.

## 7. Functional Requirements

### Required (MUST)

- **FOVL-R-1** On any URL that includes `/result/result-detail/`, the system MUST NOT render the site footer (neither floating nor in-flow).
- **FOVL-R-2** On Result Detail at viewport width ≥ `md` (900px), and at a narrowed ~1100px desktop window with the app sidebar open, the action strip MUST remain fully visible and pointer- and keyboard-reachable. Its arrangement MUST match `visual/wide-action-bar-correct.jpg` (Back, Next, position, status, Sync, Save draft). Hovering the bottom-right MUST NOT slide a second bar over those controls.
- **FOVL-R-3** Routes that already show the site footer (Results list, Type-One Report, IPSR list/detail, QA, admin, login) MUST keep their current footer behavior.

### Scenarios

#### FOVL-R-1 — Footer gone on Result Detail

- GIVEN the user is on `/result/result-detail/:id` (any section)
- WHEN the page renders
- THEN the site footer element is not in the document
- AND the 400px footer hover trap is not in the document
- BUT the action strip MUST still render when the section provides one
- AND IT MUST NOT reappear on hover, scroll, or resize

#### FOVL-R-2 — Narrow window, actions stay usable (the failing case)

- GIVEN a Result Detail section with an action strip (e.g. General information or Geographic location)
- AND the viewport is `md` (900px) or a ~1100px window with the sidebar open
- WHEN the user moves the pointer through the bottom-right (Sync / Save draft / chat)
- THEN Back, Next, Sync, and Save draft stay fully visible and clickable
- AND the strip matches `visual/wide-action-bar-correct.jpg`
- BUT the dark CGIAR footer MUST NOT cover any of those controls
- AND IT MUST remain possible to Tab to Save draft and activate it with the keyboard

#### FOVL-R-3 — Other routes unchanged

- GIVEN the user is on `/result/results-outlet/results-list` (or another listed footer route that is not Result Detail)
- WHEN the page renders
- THEN the site footer still appears with the same mode it has today (in-flow or floating)
- AND IT MUST NOT lose Contact Us / Terms / License / Glossary

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Accessibility | Covered controls fail `docs/ux-ui/design.md` §10. After the fix, strip actions MUST stay keyboard-reachable. |
| Responsive | Tablet-usable from `md` up (`docs/ux-ui/design.md` §9). No new `xs`/`sm` Result Detail layout. |
| Backwards compatibility | MUST NOT change footer mount or floating on any non-Result-Detail listed route. |
| Security / API | None — chrome only. |

## 9. Defect Classes & Verification Mapping

| Defect class | Catching command | Gap |
|---|---|---|
| Footer still mounts / floats on `/result/result-detail/` | Jest: `FooterComponent` with that URL → `showIfRouteIsInList()` false and no `.footer` / `.footer-blocker` in the DOM. **This is the mandatory red-before / green-after regression.** | — |
| Footer disappears on Results list / other listed routes | Existing `footer.component.spec` route cases plus an assertion that a listed non-detail path still shows the footer. | — |
| Overlay still covers the strip (Tawk or leftover CSS) | **No automated layout gate** — jsdom cannot measure stacking or hit-testing. Substitute: HITL visual at `md` against `visual/wide-action-bar-correct.jpg`, plus a real-browser check that the four actions receive clicks. Route to T6 only if the HITL screenshot is disputed. | Accepted: Jest cannot prove “unobstructed.” |
| Action strip missing after footer unmount | Existing `section-bottom-bar` specs (testid presence). | — |

A green Jest run that only checks the route flag is **not** proof the strip is unobstructed. The HITL visual is the gate for that class.

## 10. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| FOVL-AC-1 | Router URL contains `/result/result-detail/` | Footer evaluates its route list | Footer and hover trap are not rendered |
| FOVL-AC-2 | Result Detail at `md` or ~1100px, action strip present | Pointer crosses the bottom-right | Back / Next / Sync / Save draft stay visible and clickable; no CGIAR footer over them |
| FOVL-AC-3 | Results list (or another listed non-detail route) | Page renders | Footer still appears as it does today |

Project ACs that already apply (do not restate): `AC-9` (no secrets). No bilateral / phase / submit-workflow change.

## 11. Dependencies & Assumptions

- **Upstream:** none.
- **Downstream:** none. Save handlers on the strip are unchanged.
- **Assumptions:** Option A from the proposal is locked (unmount, no legal-link handle). Contact Us remains available from Results list and the shell dialog. Tawk stays at `yOffset: 130` unless HITL shows a new clip.

## 12. Open Questions

- **FOVL-OQ-1** (resolved) — Hide footer vs keep a handle → **hide** (proposal Option A).
- **FOVL-OQ-2** — Jira id, if QA files one. Does not block design.

## 13. Requirement ID Index

| ID | Kind | Text (short) |
|---|---|---|
| FOVL-US-1 | Story | Unobstructed strip on tablet-width |
| FOVL-R-1 | MUST | No site footer on Result Detail |
| FOVL-R-2 | MUST | Strip visible and reachable at `md`+ |
| FOVL-R-3 | MUST | Other footer routes unchanged |
| FOVL-AC-1 | AC | Footer not rendered on detail URL |
| FOVL-AC-2 | AC | Narrow window, no overlay |
| FOVL-AC-3 | AC | Other routes keep footer |

## 14. Out-of-Band Notes

Visual fixtures live under `docs/specs/changes/result-detail-footer-overlap/visual/`. The wide shot is the target; the narrow shot is the defect, not a design to preserve.

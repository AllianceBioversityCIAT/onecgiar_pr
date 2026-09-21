# Module Spec — Knowledge Product Evidence Tag-Marker Edit — `requirements.md`

**Depth:** Lite (Bug Mode). **Module code:** `KPE`.

## 1. Module / Feature

- **Module:** `results` (client) — `pages/results/pages/result-detail/pages/rd-evidences/`
- **Sub-feature:** Knowledge Product evidence tag-marker editing
- **Status:** draft
- **Ticket(s):** none yet (reported via Slack, Hector Tobon, 2026-09-08)

## 2. Context

For Knowledge Product results (`result_type_id = 6`), evidence rows are synced in from CGSpace and the Evidence section renders fully read-only — no edit or add affordance is shown (`rd-evidences.component.html:42,98`). When a submitter sets any Impact-Area score to Principal (2), `validateCheckBoxes()` (`rd-evidences.component.ts:431`) requires a matching `*_related` tag flag on at least one evidence row before the section can be marked complete. That flag can only be set through the evidence edit modal, which is unreachable for Knowledge Products — so the warning never clears and the section can never go green, blocking `AC-6` (evidence completeness) for every affected result. Confirmed root cause: see `proposal.md` § Bug Diagnosis.

## 3. In Scope / Out of Scope

### In scope

- Reveal an edit (pencil) affordance on each Knowledge Product evidence card, opening the existing evidence modal.
- Inside that modal, for Knowledge Products, keep "Source of evidence" and Link locked (unchanged) and leave the Impact-Area tag checkboxes + description textarea editable.
- Persist the change through the existing `POST_evidences` save path (no API contract change).
- Regression test proving a KP evidence row's tag flag can be set and the section reaches complete.

### Out of scope

- Adding, deleting, or re-syncing Knowledge Product evidence rows.
- Editing the Link/file/source-of-evidence fields for Knowledge Products.
- Any server-side change (CGSpace sync, evidence DTO, or entity).
- Non-Knowledge-Product evidence editing behavior.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Can now check the Impact-Area tag(s) an existing Knowledge Product evidence supports, so a Principal-score result can be completed and submitted. |

## 5. User Stories

- **`KPE-US-1`** — As a result submitter, I want to mark which Impact-Area tag a Knowledge Product's synced evidence supports, so that a Principal contribution score can be validated and the result can be submitted. Refines `US-S1`.

## 6. Functional Requirements

### Required (MUST)

- **`KPE-R-1`** For a Knowledge Product result, the system MUST render an edit (pencil) control on each evidence card that opens the existing evidence edit modal for that row.
- **`KPE-R-2`** Inside the evidence edit modal for a Knowledge Product row, the system MUST keep the "Source of evidence" radio hidden and the Link field disabled, unchanged from current behavior.
- **`KPE-R-3`** Inside the evidence edit modal for a Knowledge Product row, the system MUST allow the submitter to toggle the Impact-Area tag checkboxes (`gender_related`, `youth_related`, `nutrition_related`, `environmental_biodiversity_related`, `poverty_related`, `knowledge_product_metadata_related`) and save the change via the existing `onSaveSection()` → `POST_evidences` path.
- **`KPE-R-4`** The system MUST NOT render a delete control or an "Add evidence" control for Knowledge Product evidence cards (unchanged from current behavior).

### Should (SHOULD)

- **`KPE-R-10`** The edit modal SHOULD continue to show the description textarea as editable for Knowledge Product rows (unchanged from current behavior — not itself gated on result type).

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Accessibility** | The new edit trigger MUST be a real button with an accessible label/tooltip ("Edit evidence"), matching the existing non-KP pencil icon pattern (`prTooltip`). |
| **Backwards compatibility** | No change to `POST /api/evidences/create/:resultId` payload shape; no change to non-KP evidence behavior. |
| **Internationalization** | No new user-facing strings are introduced; the existing "Edit evidence" tooltip and tag-checkbox labels are reused as-is. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `KPE-AC-1` | A Knowledge Product result with one CGSpace-synced evidence row and no Principal Impact-Area score | The submitter opens the Evidence section | An edit (pencil) icon is visible on the evidence card; no delete icon and no "Add evidence" button are visible. |
| `KPE-AC-2` | A Knowledge Product result with a Principal (level `'3'`) score for "Gender equality, youth and social inclusion" and one evidence row with `gender_related = false` | The submitter clicks the edit icon, checks "Gender equality, youth and social inclusion" in the modal, and saves | The warning "A principal contribution score (2) has been recorded for Gender equality... Please provide evidence to support this claim." clears, and `evidenceSectionComplete` becomes `true` (assuming no other missing tag). |
| `KPE-AC-3` | The evidence edit modal is open for a Knowledge Product row | The submitter views the modal | The "Source of evidence" radio is hidden and the Link field is disabled — unchanged from current behavior (regression guard, not new behavior). |

Cross-cutting project ACs that already apply: `AC-6` (Evidence and ToC alignment at submit) — this spec makes `AC-6` satisfiable for Knowledge Products with a Principal score, which is currently impossible.

## 9. Dependencies & Assumptions

### Upstream dependencies

- None beyond the existing `rd-evidences` / `evidence-item` components and `ResultsApiService.POST_evidences` (unchanged).

### Assumptions

- The tag checkboxes in `evidence-item.component.html:105-128` already work correctly once the modal is reachable — confirmed by reading the template; they are not gated on `isKnowledgeProduct` today, only the "Source of evidence" radio (line 5) and Link field's `disabled` binding (line 20) are.
- `RolesService.readOnly` still governs whether editing is available at all (unchanged) — the new KP edit trigger MUST additionally respect `!api.rolesSE.readOnly` and `!api.dataControlSE?.currentResult?.status`, mirroring the existing non-KP condition at `rd-evidences.component.html:42`.

## 10. Requirement ID Index

| ID | Summary |
|---|---|
| `KPE-R-1` | Edit trigger visible on KP evidence cards |
| `KPE-R-2` | Source/Link stay locked for KP in the modal |
| `KPE-R-3` | Tag checkboxes editable + saveable for KP |
| `KPE-R-4` | No delete / no add for KP evidence |
| `KPE-R-10` | Description textarea stays editable for KP |
| `KPE-AC-1` | Edit visible, delete/add hidden |
| `KPE-AC-2` | Regression case: tag checked clears warning, section completes |
| `KPE-AC-3` | Source/Link lock regression guard |

## 11. Defect Classes → Verification Mapping

| Defect class | Catching command / check |
|---|---|
| Edit trigger not rendered / wrongly gated for KP | `onecgiar-pr-client` Jest: `rd-evidences.component.spec.ts` — assert pencil icon renders for `isKnowledgeProduct = true`, and delete/add icons do not. |
| Tag checkbox change not persisted / `evidenceSectionComplete` still false after fix | `onecgiar-pr-client` Jest: `rd-evidences.component.spec.ts` — regression test per `KPE-AC-2` (red before fix, green after). |
| Source/Link accidentally unlocked for KP (reversion of existing correct behavior) | `onecgiar-pr-client` Jest: `evidence-item.component.spec.ts` — assert radio hidden / Link disabled when `isKnowledgeProduct = true` (existing coverage; extend if missing). |
| Visual regression (icon placement/spacing on the card) | No automated check — accepted risk; verify manually in-browser per `onecgiar-pr-client/CLAUDE.md` §9 browser-verification rules before merge. |

All defect classes this spec can produce have an automated check except the visual-placement class, which is recorded as an accepted risk with a manual substitute.

## Why

The CGIAR System Organization (Nicoleta Trifa) reviewed the technical reporting guidance documents against the fields actually rendered in PRMS and found the reporting form's copy drifted from the guidance in several places (Freshservice `INC-158283`, Jira **P2-3201**). Two problems are more than cosmetic: the Contributors and Partners note still refers to the **2025 ToC** — a full reporting cycle behind and misleading for the 2026 cycle — and the Evidence guidance still instructs users to share CGIAR publications via a CGSpace link, which no longer applies now that Knowledge Products live in PRMS. On top of that, PRMS gained an AI assistant whose existence is nowhere explained in the form, so submitters do not know it exists or when it becomes usable.

This change is **frontend-only**. No server code, no migrations, no API contract changes. It touches copy, labels, notes and the guidance-box → tooltip presentation only; validation and submission logic are untouched.

## What Changes

**Section 1 — Titles and Description**
- Remove the inner grey `Description:` guidance box from `Title of Result` and from `Description`; their bullets move into an ⓘ tooltip beside the field label.
- Rename the field label `Description:` → `Description of Result:`.
- Move the `Lead contact person` guidance into the field tooltip, removing its grey `Description:` header without losing the help text.
- Add the AI-assistant note **once**, between the `Change result type` button and the `Title of Result` label, covering both fields.

**Section 1 — Impact Area scores**
- Add the AI-assisted notification note **once**, above the section heading, as a **static** block — explicitly not collapsible and with no "How it works" link (an earlier draft proposed both; neither is implemented).
- Move the existing scoring guidance (0/1/2 definitions and its four notes) into an ⓘ tooltip on the `Impact Area scores` heading.
- Move each of the five Impact Areas' guidance boxes (`Example topics`, `Collective global targets`, scoring note) into an ⓘ tooltip beside that area's tag label.
- Score-2 behaviour is unchanged: the evidence warning and the "Which component…" question still appear only for `(2) Principal`.

**Section 2 — Contributors and partners**
- Replace the ToC note, which currently refers to the 2025/2026 cycle, with the approved 2026 text.
- Add the CLARISA-based contributor definition before `Contributing CGIAR Centers`, linking to the CLARISA Glossary.
- Rename `Contributing W3 and/or bilateral projects` → `Contributing W3/Bilateral projects` and add the 2026 mapping-exercise note.
- On `Contributing Science Programs/Accelerators`: remove the inaccurate ToC note, add the self-registration note, and render the label in **plural** (business decision, Santiago Sánchez, 30 Jul).
- Truncate the pending-confirmation banner after `"…has not confirmed its contribution to this result."`

**Section 2 — Linked / bundled results question**
- Unify the wording to `"Is this result linked to, or (for innovations) bundled with, another reported result?"` across indicator categories, with a dedicated `Policy change` variant rendered conditionally.

**Section 5 — Evidence guidance**
- Remove `"All CGIAR publications should be shared using a CGSpace link."`
- `"Files can be also uploaded to the PRMS repository"` → `"Files can be uploaded to the PRMS repository."`
- Bullet 5 becomes: `For confidential evidence, select "Upload file" and then **respond with "No" to the confidentiality question** to indicate that it should not be public.` — the bold is new.
- Unchanged: the 6-evidence maximum, the SharePoint/OneDrive/Google Drive/DropBox prohibition, and the video tutorial link.

**Deferred — Section 3, Geographic location (point 5 of the ticket)**
Not implemented in this change. Two conflicts are open with the requester (raised on Slack, 4 Aug):
1. The guidance text differs between what was approved on 30 Jul (`"This should reflect the geographies where the result took place."`) and the 3 Aug mockup (`"This should reflect where the Output has taken place/contributed to benefit."`).
2. Unifying the question to `"What is the geographic focus of the result?"` would erase the 2026-specific variant `"What is the location of benefit for this result?"` that **P2-3036 (AC9)** deliberately introduced in `rd-geographic-location.component.html`.

A follow-up change covers this once the requester answers.

## Capabilities

### New Capabilities
- `reporting-form-guidance-tooltips`: guidance content that used to render as inline grey `Description:` boxes is reachable through an ⓘ tooltip beside the field label, with a defined open/pin/dismiss interaction (hover to open, click to pin, outside-click or Escape to close), losing no text.
- `ai-assistant-guidance-notes`: the two approved AI notes — one for result Titles and Descriptions, one for Impact Area scores — render exactly once each, in their specified position, as static blocks.
- `contributors-partners-guidance-copy`: the Contributors and Partners section states the 2026 ToC rules, defines what a contributor is with a link to the CLARISA Glossary, names the W3/Bilateral field correctly, and explains that the submitting P/A is recorded automatically.
- `linked-bundled-result-question`: the linked/bundled question uses one unified wording for every indicator category except `Policy change`, which has its own, and it exists in Section 2 only.
- `evidence-guidance-copy`: the Evidence section's guidance list reflects that Knowledge Products now live in PRMS and highlights the confidentiality answer.

### Modified Capabilities
None. `evidence-alert-messaging` governs the score-2 Impact Area alert, which this change does not touch; the Evidence guidance list is a separate surface.

## Impact

**Jira:** P2-3201 (parent), P2-3213 (implementation subtask). Source incident `INC-158283`.

**SDD baseline:** copy and tooltip presentation fall under `docs/system-design/design.md` (component rules, a11y §10). No change to `docs/detailed-design/detailed-design.md` — no new module, endpoint or contract. No `docs/prd.md` scope change.

**Affected client code** (`onecgiar-pr-client/src/`):
- `app/shared/services/fields-manager.service.ts` — field labels, `description` properties moving to tooltips, the `[general-info]-lead_contact_person` entry, and the two keys holding the linked/bundled label (`[innovation-use-form]-has-innovation-link`, `[contributors-partners]-is-lead-by-partner` — the latter's name is misleading; it holds the linked/bundled label, not a lead flag).
- `app/pages/results/pages/result-detail/pages/rd-general-information/` — AI note placement and the Title/Description labels.
- `app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.{html,ts}` — Section 2 copy, `linkedResultQuestionLabel` (introduced by P2-3112), the `2025 ToC` note.
- `app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.ts` — the `alertStatus()` guidance list.
- The Impact Area scores block — heading tooltip and per-area tooltips.

**Explicitly preserved** (regression risk, not visible in the mockup because it was built on result 28869, an Innovation use):
- `alertStatus()`'s early return for Knowledge Product results, which renders a completely different text.
- The two extra `<li>` appended only when `result_type_id === 5` (Capacity sharing): the GDPR note and the sub-sample note.
- The video tutorial link — the `claudeusercontent.com` URL seen in the mockup is a placeholder and must never ship.

**Coordination:** P2-3199 (Released Into Live) already removed the duplicated linked/bundled question from Section 4. This change only rewords the Section 2 occurrence; the Section 4 field must not be touched twice.

**Backend:** none required.

**Test gate:** `npm run lint` and `npm run test` green in `onecgiar-pr-client`, coverage thresholds 50/60/60/60 respected.

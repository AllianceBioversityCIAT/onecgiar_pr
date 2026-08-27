# Proposal — 2030 Use Projection Annual Review

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `changes/innovation-use-2030-projection` |
| Slug | `innovation-use-2030-projection` — derived from free-text argument (`[Image #1] hazme la propuesta de esto que es para innovation use`); the argument was a sentence, not a slug, so it was not interpolated into the path. |
| Type | **Change** |
| Approval Mode | `gated` (default — no explicit end-to-end mandate given) |
| Source | Screenshot of a PO/CGIAR-System review thread (Marc Schut, Angel Jarrín, Nicoleta Trifa) proposing a redesign of the "2030" section inside the Innovation Use type-specific form |
| Date | 2026-08-27 |

---

## 2. Intent

Turn the current free-editing "2030" block inside the Innovation Use result-detail form into a governed **annual-review workflow**: submitters see their previously reported 2030 use projection, must explicitly opt in to revise it, must justify large revisions, and large swings get automatically flagged for QA — instead of silently overwriting last year's number every phase.

## 3. Problem / Current Behavior

Today (`innovation-use-form.component.html:354-361`, `innovation-use-form.component.ts:71-83`, `results_innovations_use.innov_use_2030_to_be_determined` in `results-innovations-use.entity.ts`):

- The 2030 block is gated by a single "This is yet to be determined" radio (`innov_use_2030_to_be_determined`). When not set, the submitter freely edits `innovation_use_2030.actors / organization / measures` every phase, with no memory of what was reported the previous phase and no distinction between "first time reporting" and "revising an existing baseline."
- There is no comparison against the prior phase's value, no revision justification, and no automated flag when a revision is a large swing. Applicable to all results, regardless of funding source (confirmed by Marc Schut in the review thread: "applicable to all results regardless of funding source", with a note to be mindful of W3/bilateral-funded results).
- The section header/question wording is being renamed by the PO/System Office reviewers: **"Specify the targeted innovation use of the core innovation by end of 2030, supported by projections or evidence"** → **"What is the projected innovation use by end of 2030?"**, and the section title becomes **"2030 Use Projection"**, with a new tooltip: *"This projection informs CGIAR's investment case and impact modeling. It must be reviewed and, if necessary, revised annually based on current evidence."*

## 4. Proposed Outcome

- Section title renamed to **"2030 Use Projection"**; the lead question renamed to **"What is the projected innovation use by end of 2030?"** with the tooltip text above attached.
- New per-phase logic:
  - **First-time reporting** on a result → submitter enters the baseline 2030 projection (current free-edit UX, scoped to this being the first entry).
  - **Updating an existing record** → the previously entered 2030 projection is shown read-only by default. The submitter is asked *"Do you want to revise your 2030 projection based on new data?"*
    - **Yes** → fields unlock for editing; a justification (max 100 words) becomes required before save.
    - **No** → the previous projection is carried forward unchanged; no further input required.
  - **Automated QA check** — if a revised projection differs from the previous phase's value by more than 20%, the record is automatically flagged for QA review.
- Downstream effects of the flag (who sees it, where it surfaces in the QA queue/review drawer) are **not yet visible** — the source screenshot is cropped exactly at the "DOWNSTREAM:" heading. This must be clarified before `/akili-specify` can produce an implementable design (see §12 Open Questions).

## 5. Scope

- `onecgiar-pr-client/src/app/shared/components/innovation-use-form/` — the 2030 block (shared by Result Detail Innovation Use and IPSR step-n1, both consume this component per `innovation-use-form.component.ts:12` `IpsrStep1Body`).
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-use-info/` — labels/copy.
- Server: `onecgiar-pr-server/src/api/results/summary/entities/results-innovations-use.entity.ts` and its owning service (need to identify the write path — likely under `api/results-framework-reporting/innovation-use/` or an `api/results/` sub-module that persists `innov_use_2030_to_be_determined` and the 2030 actors/org/measures) — new columns for "previous projection snapshot", "revision justification", and "QA flag" plus a %-diff comparison rule.
- Whatever QA queue surface renders the automated flag (TBD — see Open Questions).
- **P25-only today**: the whole 2030 block is gated by `fieldsManagerSE.isP25()` (`innovation-use-form.component.html:287`). Confirm with the PO whether the revised workflow stays P25-only or also applies to P22/IPSR consumers of this shared component.

## 6. Non-Goals

- Not touching the *current* (non-2030) innovation-use-level section, actors/organizations/measures editing UX, or the scaling-studies question.
- Not changing bilateral/platform-report payload shape for `innovation_use_summary` unless the new fields (previous projection, justification, QA flag) are decided to be exposed there — out of scope until confirmed.
- Not redesigning the QA review drawer generally — only wiring the new automated flag into whatever exists.

## 7. Affected Users, Systems, And Specs

- **Result submitter** (Innovation Use / IPSR results) — new revise/keep decision + justification requirement.
- **QA reviewer** — new automated flag to triage.
- **PMU / portfolio lead** — 2030 projections feed CGIAR's investment case and impact modeling (per the tooltip copy), so data-quality here has downstream reporting weight.
- No existing `docs/specs/` spec covers this module yet (no `innovation-use` or `ipsr` feature spec found under `docs/specs/`).

## 8. Visual Reference

- Source: Screenshot of a review-thread document (Google Doc/Slack-style comment thread) — not a Figma link, not a generated mockup.
- Location: Provided inline as `[Image #1]` in this conversation; not persisted as a file (no `mockup/` folder created — the image is a spec-change description, not a UI mockup to build from pixel-for-pixel).
- Notes: Covers the Innovation Use "2030 Use Projection" question/logic only. The image is **cropped** — the "DOWNSTREAM:" section referenced in the proposed logic block is not visible. No screen layout/mockup is implied; this is a copy + business-logic change, not a new visual design, so the `stitch-design` mockup fallback does not apply.

## 9. Requirement Delta Preview

### ADDED Requirements

- A stored "previous 2030 projection" snapshot per result, read-only, shown to the submitter on every phase after the first.
- A "Do you want to revise your 2030 projection based on new data?" Yes/No control, gating whether the 2030 fields are editable this phase.
- A required justification field (max 100 words) when the submitter chooses to revise.
- An automated QA flag written when `abs(newValue - previousValue) / previousValue > 0.20` (exact metric TBD — see Open Questions: the "value" being diffed isn't defined yet — total actors reached? a specific measure? see §12).

### MODIFIED Requirements

- Section title: "2030" → "2030 Use Projection".
- Question label: "Specify the targeted innovation use of the core innovation by end of 2030, supported by projections or evidence" → "What is the projected innovation use by end of 2030?" (+ new tooltip).
- First-time-reporting vs. revising-existing-record now branch into different UX (today both cases render the same free-edit form).

### REMOVED Requirements

- Unrestricted free-edit of the 2030 block on every phase for an already-reported result (replaced by the revise/keep gate).

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A. Extend `results_innovations_use` in place (recommended)** | Add columns to the existing `results_innovations_use` table/entity: a snapshot of the prior phase's 2030 values (or a pointer to the prior-phase result row, which PRMS already versions per-phase — see AC-5), `revision_justification`, `revision_flagged_for_qa`. Reuse `innov_use_2030_to_be_determined` pattern for the new Yes/No revise gate. | Smallest change; leverages existing phase-versioning (`W2`) instead of inventing a new snapshot mechanism — but needs care to correctly resolve "previous phase's value" across phase rollover. |
| **B. New dedicated "2030 projection history" table** | A new entity storing one row per phase per result with value + justification + flag, independent of `results_innovations_use`. | Cleaner audit trail and easier %-diff queries across phases, but bigger migration + new module, and this system doesn't otherwise keep per-field history tables — inconsistent with existing patterns (phase rollover already snapshots prior-phase data per `W2`). |
| **C. Client-only diffing, no server enforcement** | Compute the previous value and %-diff purely in the Angular component from the already-versioned prior-phase result, without new server columns for justification/flag. | Fastest to ship, but violates `AC-3` (frontend must not be the sole gatekeeper) for the QA flag, and loses the justification text unless stored somewhere — rejected. |

**Recommended: Option A.** It fits the existing phase-versioning model (`docs/trd/trd.md` W2) and the existing `results_innovations_use` entity shape, needs one migration, and keeps the automated QA-flag check server-side and auditable (satisfying `AC-3` authorization and `AC-6` evidence-quality intent), rather than trusting the client.

## 11. Risks, Dependencies, And Open Questions

- **Risk:** "Previous phase's value" is ambiguous when actors/organizations/measures are multi-row structures, not a single number. The %-diff rule needs a defined scalar (e.g., total `how_many` across actors, or a specific headline measure) before this is implementable.
- **Risk:** The 2030 block is shared between Result Detail (Innovation Use) and IPSR step-n1 (`innovation-use-form.component.html` renders for both, gated by `isIpsr`) — confirm whether IPSR-reported innovations also need the revise/keep/justification/QA-flag workflow, or only standalone Innovation Use results.
- **Risk:** The block is currently P25-only (`fieldsManagerSE.isP25()`); confirm this workflow doesn't need to extend to P22.
- **Dependency:** Needs the QA reviewer surface (queue/review drawer) to actually render the new automated flag — not designed yet (cropped "DOWNSTREAM:" section).
- **Open question (OQ-A):** Does "revise" apply per-field (actors vs. organizations vs. measures individually) or as one all-or-nothing gate for the whole 2030 block? The screenshot implies one gate for the whole projection.
- **Open question (OQ-B):** What happens on the very first phase after this feature ships, for a result that already has 2030 data from a prior phase under the *old* free-edit rules? Is that treated as "first-time" (no prior snapshot exists) or does a migration need to backfill a synthetic "previous value" from the last phase's data?
- **Open question (OQ-C):** Marc Schut's comment flags "be mindful of W3/bilateral" — does this workflow apply identically to bilateral-sourced results, which enter the review workflow at `PENDING_REVIEW` (5) instead of `EDITING` (1) per `api/results/AGENTS.md`?

## 12. Success Criteria

- Section renders as "2030 Use Projection" with the new question label and tooltip.
- On a result's first-ever 2030 entry, the submitter enters a baseline with no revise/keep gate shown.
- On any subsequent phase, the submitter sees the prior value, is asked to revise or keep, and — if revising — cannot save without a ≤100-word justification.
- A revision whose defined scalar differs from the prior value by >20% is automatically flagged for QA server-side (not just client-computed).
- Existing non-2030 Innovation Use behavior (actors/orgs/measures editing, use-level assessment, scaling studies) is unchanged.

## 13. Next Step

Before `/akili-specify` can produce an implementable design, **OQ-A, OQ-B, and OQ-C above need an answer from the PO/reviewers** (particularly the cropped "DOWNSTREAM" logic and the scalar used for the 20% diff). Once resolved:

```text
/akili-specify changes/innovation-use-2030-projection
```

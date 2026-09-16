# Requirements — QA AI traffic light on "Submit for review" (W3/Bilateral)

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/qa-ai-traffic-light/` |
| Module code | `BIL-QAI` |
| Type | Change · Depth: **Full** (new external contract, new persistence + migration, additive bilateral payload, new client flow) |
| Approval Mode | gated (inherited from `proposal.md`) |
| Status | **amended v0.2 — pending owner approval** (2026-09-16). Base text approved at the Phase 1 gate (owner, 2026-09-16); the v0.2 amendment covers `R-2`, `R-3`, `R-4`, `R-7`, `R-8`, new `R-15`, `AC-16`–`AC-18`. Amendment record: `execution.md` § *Pivot Record: contract v0.2*. |
| Owner | Juan David Delgado (PRMS) · AI service: Daniela Gómez · Product: Ángel Jarrín |
| Date | 2026-09-16 |
| Baseline | `docs/prd.md` — G2 (M2.1 first-pass QA rate), US-S1, US-S4, **AC-2**, **AC-4**, **AC-8**, **AC-9**, OQ-5 · `docs/ux-ui/design.md` — F1 step 6–7, §6 *Drawers and modals* / *Empty-error-loading*, §7 tokens + DD-12, §8 component rules, §10 a11y · `docs/trd/trd.md` — **W1**, **W8**, ADR-004, QAS-3, QAS-9, QAS-10, QAS-12 |
| Intent source | `proposal.md` (2026-09-15, PO answers 2026-09-16) · Jira [P2-3150](https://cgiarmel.atlassian.net/browse/P2-3150) AC1–AC8 · PRMS sub-task [P2-3698](https://cgiarmel.atlassian.net/browse/P2-3698) · meeting decisions (grey rule, KP excluded from AI, no agents) · owner rules 2026-09-15/16: definitions-only payload, evidence visibility flag, 60 s window, KP fallthrough grey, MELIA, optional score |
| Extends | `docs/specs/bilateral/bulk-uploader-handoff/` (external-contract discipline) · centre form gate behaviour documented in vault `w3-p2-3639-toc-no-gatea-submit.md` |
| Authoritative external doc | `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (change-log row for the additive `quality_assessment` block) · **AI-service contract v0.2** (repo copy in `docs/bilateral-module/integration-contracts.md` § *Quality assessment (outbound)*, written by `BIL-QAI-T-1b`; vault note `CGIAR/W3/w3-bilateral-module/w3-p2-3150-ai-traffic-light-qa-on-submit.md`). v0.1 is superseded and is not implemented anywhere after the pivot. |
| Structure decision | Single spec, three task groups (server · client · KP rule). The proposal's optional three-child family was **not** taken (owner did not opt in at the gate); revisit only if `design.md` §Budget trips Full depth. |

## Executive Summary

When a Centre user presses **Submit for review** on a bilateral result, PRMS assembles the result exactly as the form displays it (labels, never ids), sends it to the AI QA service, and opens one window with a traffic-light verdict for the whole result and for each of the five form sections. The user chooses **Submit anyway** or **Make adjustments**; the AI never blocks, a slow or failed check never blocks, and the verdict plus the user's decision are stored with the result for the Program reviewer. Knowledge Products skip the AI entirely and follow a deterministic decision tree in code.

## Glossary

| Term | Meaning |
|---|---|
| Assessment | One run of the quality check over the saved content of a result; persisted as one row |
| Verdict | One of `green`, `amber`, `red` for the result overall; the same three **plus `grey`** for each section (contract v0.2), for each evidence item, and for the KP fallthrough case |
| Section | One of the five form sections: General information, Contributors & partners, Geographic location, Evidence, Type-specific details |
| Grey | "Not evaluable" — same meaning wherever it appears: an evidence item the AI could not open (private repository file, blocked URL), a **section** the AI could not assess, or a KP whose criteria are pending. Grey never counts toward the overall verdict and never colours a section it is not attached to |
| Partial | AI response `status = partial`: a verdict was produced, but part of the result could not be assessed. Stored and shown; treated as a completed assessment for every decision rule |
| Degraded reason | Plain-language sentence the AI returns alongside `partial` / `unavailable` explaining what it could not assess. Displayed verbatim; never carries a host, URL, body or stack trace |
| Definitions-only payload | Every value sent to the AI is the text the form paints (option label, caption, chip text); no ids, codes or catalogue keys |
| Stable label | A type-specific field name frozen in the contract and in one exported constant per result type; the AI validates mandatory labels strictly, so renaming or dropping one is a contract break |
| Impact areas | The five PRMS impact-area pillars with the result's tag level and, when Principal, its sub-components. Optional block: absent or empty is **not** grey and carries no penalty |
| Content hash | Deterministic hash of the definitions-only payload; equal hash ⇒ the saved content has not changed since the assessment |
| Submit anyway | The user sends the result to Pending Review after seeing the verdict, whatever its colour |
| Make adjustments | The user closes the window and keeps editing; nothing is sent |
| Unavailable | The AI service timed out, failed, or answered malformed; the check produced no verdict |
| KP rule | Deterministic decision tree for Knowledge Products (MELIA / Journal Article / metadata match) applied in code instead of the AI call |

## System Context & Scope

### Context

- **Flow touched:** `docs/ux-ui/design.md` F1 steps 6–7 on the bilateral path (`/bilateral/:center/result/:code`). Today Submit is one immediate transition: client `submitResult()` → `PATCH /api/bilateral/center/submit-for-review/:resultId` → `status_id = 5` (Pending Review) + review-history row + notification (`docs/trd/trd.md` W1).
- **Surfaces touched:** `api/bilateral` centre controller/service (new endpoints, optional body on submit), one new table, additive block on the bilateral detail read (W6, ADR-004), `pages/bilateral` result creator + one new dialog.
- **External:** AI quality-assessment endpoint operated by Daniela's team; QA criteria document (SharePoint) owned by Ángel/QA.

### In scope

- Quality check on every Submit for review, before any status change (P2-3150 AC1).
- Overall + per-section verdicts, comments, what-to-fix / what-is-good, evidence analysis incl. grey (AC2, AC3).
- Submit anyway / Make adjustments; dismissal = Make adjustments (AC4).
- Re-check on every new submission; stored verdict reused only while the saved content is unchanged (AC5 + owner's reopen requirement).
- Unavailable path with "submit without check" and its traceability (AC6, AC7).
- Persistence of verdict, decision, outstanding flags, no-check fact; additive `quality_assessment` block on the bilateral detail read (AC7).
- Definitions-only payload with evidence visibility flag; private files never leave PRMS.
- KP deterministic rule replacing the AI call; grey fallthrough.
- Optional numeric `score` captured verbatim when the AI provides it.
- **(v0.2)** Per-type `type_specific` field enumeration with frozen English labels and typed values; optional `impact_areas` block; AI response `status` / `degraded_reason`; section-level grey.
- **(v0.2)** The **Innovation developers** field restored as an editable field in the bilateral result form, so what the AI reads is what the user wrote (`BIL-QAI-R-15`).

### Out of scope

- Program/Accelerator reviewer UI for the verdict (separate story).
- Per-field indicators, hover tooltips, annotating the form.
- Skipping evaluation for AI-prefilled fields.
- Changing what enables the Submit button (MDS completeness gate stays). `BIL-QAI-R-15` adds an **optional** field, so the gate is untouched.
- Adding non-binary / unknown columns to Innovation use, or a climate evidence tag: both are real data gaps the AI will see (`design.md` §13 GAP-6, GAP-7), but changing those schemas belongs to the form owners, not to this spec.
- Pooled-funding (W1/W2) results and `api/ai` review sessions.
- The AI model, prompts, criteria thresholds and the overall-derivation rule (AI side).
- Sending KP results to the AI.
- Authorization hardening of `bilateral-center.controller.ts` beyond reusing the existing centre-permission check.

## Stakeholders / Personas

| Persona | What changes for them |
|---|---|
| Result submitter (Centre user) | Submit now opens a working state and then a verdict window; they decide whether to send. On Innovation development they also regain the **Innovation developers** field (optional, `R-15`) |
| QA reviewer (Science Program) | Pending Review results arrive with a stored verdict + decision (data only; UI later) |
| PMU lead | New signal for G2 (M2.1) on the bilateral path |
| Platform admin | Two env keys to configure per environment; one migration to run |
| AI service team (Daniela) | Builds one endpoint against the frozen contract **v0.2**: strict validation of the per-type mandatory labels, typed count/amount objects, optional `impact_areas`, `status` + `degraded_reason` in the response |
| Bilateral consumer (downstream) | Additive block only; existing fields unchanged (AC-4) |

## User Stories

- **`BIL-QAI-US-1`** — As a Centre user reporting a bilateral result, I want the system to assess the quality of my result when I submit it and show me what to improve, so that I can see how it would hold up under QA review and decide whether to correct it or send it as it is. *(P2-3150 verbatim; refines US-S1, US-S4)*
- **`BIL-QAI-US-2`** — As a Centre user, I want the wait to tell me what is happening and what the colours mean, so that I do not feel the time is lost. *(owner)*
- **`BIL-QAI-US-3`** — As a Centre user who closed the page while the check was running, I want to see the verdict when I come back and still decide, so that the run was not wasted. *(owner)*
- **`BIL-QAI-US-4`** — As a Science Program reviewer, I want the verdict and the Centre's decision to travel with the result, so that I have the quality context when I review it. *(P2-3150 AC7; refines US-Q1)*
- **`BIL-QAI-US-5`** — As the AI service team, I want a payload made only of the definitions the user saw, so that the assessment reasons over content and never over internal identifiers. *(owner rule)*

## Functional Requirements

### Required (MUST)

#### `BIL-QAI-R-1` — The check runs on Submit, before any status change

The system MUST run the quality assessment when the user presses **Submit for review** and MUST NOT change the result status until the user decides in the verdict window.

##### Scenario: Submit triggers the assessment
- GIVEN an editable bilateral result in Editing or Draft whose sections are all saved and whose MDS tracker is `complete`
- WHEN the user presses **Submit for review**
- THEN the assessment starts and the window opens in its working state
- AND the Submit button is disabled and marked busy until the window closes
- BUT it must NOT change `status_id`, write review history, or fire the submitted notification before the user decides
- AND IT MUST keep the three existing pre-submit guards (read-only result, unsaved sections, invalid fields) exactly as today, evaluated before the assessment starts.

##### Scenario: No second submission while the check runs
- GIVEN an assessment in progress for a result
- WHEN the same user presses Submit again (double click, second tab)
- THEN no second assessment starts for that result and the existing one is shown
- AND IT MUST be enforced server-side (one running assessment per result), not only by the disabled button.

#### `BIL-QAI-R-2` — Definitions-only payload grouped by section, with a typed per-type schema *(amended v0.2)*

The system MUST build the payload sent to the AI from the **persisted** result, grouped by the five form sections, with every value expressed as the label the form displays. For the *Type-specific details* section the system MUST send a **fixed, enumerated set of English field labels per result type** — the visible text of the form field — with **typed** values: strings, string arrays, or objects for anything numeric or disaggregated. The system MUST additionally send an optional top-level `impact_areas` block, sibling of `sections`.

*v0.2 rationale:* the AI service validates mandatory labels strictly and answers with a specific error when a mandatory label is missing or renamed, and it must not parse numbers out of strings to decide a colour. The per-type schema is frozen in `docs/bilateral-module/integration-contracts.md`; see `design.md` §4.5 for the field table.

##### Scenario: Labels, never identifiers
- GIVEN a saved result with ToC mapping, geography, partners and a type-specific block
- WHEN the payload is built
- THEN dropdowns, radios, checkboxes and chips appear as their visible text (e.g. level `Output`, indicator title, country name, policy type name)
- BUT it must NOT contain any key ending in `_id`, any numeric or CLARISA identifier, catalogue code, or internal PRMS `result.id`
- AND IT MUST contain the same five section keys for every result type, with `type_specific` shaped per type and empty sections present as empty objects/arrays.

##### Scenario: Payload reflects saved content, not the form buffer
- GIVEN a section with unsaved edits
- WHEN the user presses Submit
- THEN the existing "Save your changes before submitting" guard fires and no payload is built
- AND IT MUST derive the `content_hash` from the persisted data only.

##### Scenario: Type-specific fields carry frozen labels and typed values *(v0.2)*
- GIVEN a saved Capacity sharing result with 12 people trained (7 female, 4 male, 1 non-binary), one training term and two implementing organizations
- WHEN the payload is built
- THEN `type_specific.fields` carries exactly the labels the contract enumerates for that type, spelled as the form spells them — `"Number of people trained"`, `"Length of training"`, `"Delivery method"`, `"Implementing organizations"`
- AND the count arrives as an object `{ total, female, male, non_binary, unknown }`, never as a sentence or a concatenated string
- AND `"Length of training"` is a **single** value (`Long-term` | `Short-term` | `null`) because a bilateral result carries one training term, not a per-person split
- BUT it must NOT invent a label, translate one, or omit a mandatory one because its value is empty — an empty mandatory field is sent with a `null` / `[]` value under its label
- AND IT MUST take every label from one exported constant per result type, so the payload, the fixtures and the contract copy cannot drift apart; a result type with no type-specific details (Other Output, Other Outcome) sends `fields: {}`.

##### Scenario: Impact areas travel as an optional block *(v0.2)*
- GIVEN a bilateral result whose General information section tags Gender as *(2) Principal* with two sub-components and Climate as *(1) Significant*
- WHEN the payload is built
- THEN a top-level `impact_areas` array — sibling of `sections`, not a sixth section key — carries one entry per tagged pillar as `{ name, score, subcomponents[] }`, with `name` the pillar label the form paints and `score` the visible tag label (`(0) Not Targeted` | `(1) Significant` | `(2) Principal`)
- AND `subcomponents` is populated only where the form populates it (Principal) and is `[]` otherwise
- AND IT MUST send `[]` when the result tags no pillar, and the AI MUST treat an empty or absent block as **not applicable** — never grey, never a penalty, never an issue in any section
- AND IT MUST include `impact_areas` in the `content_hash`, so re-tagging a pillar invalidates a stored verdict.

#### `BIL-QAI-R-3` — Evidence carries visibility and impact-area tags; private files never leave PRMS *(amended v0.2)*

The system MUST send each evidence item with `source` (`url` | `prms_repository`), `visibility` (`public` | `private`) and `tags[]`, and MUST NOT send the link or the file of a private repository item. `tags` is the **only** link between an evidence item and an impact area.

##### Scenario: Private repository file
- GIVEN an evidence row stored in the PRMS repository (SharePoint) marked not public
- WHEN the payload is built
- THEN the item carries description, tags, `source: prms_repository`, `visibility: private` and `link: null`
- BUT it must NOT include the SharePoint link, document id, folder path or file name
- AND IT MUST be graded `grey` by PRMS regardless of what the AI answers for that item.

##### Scenario: Public URL evidence
- GIVEN an evidence row with an external URL
- WHEN the payload is built
- THEN the item carries description, tags, `source: url`, `visibility: public` and the URL.

##### Scenario: Evidence tags come from a closed vocabulary *(v0.2)*
- GIVEN an evidence row flagged gender-related and poverty-related in the form
- WHEN the payload is built
- THEN `tags` is `["Gender", "Poverty"]`, drawn from the closed vocabulary **Gender · Youth · Nutrition · Environment & biodiversity · Poverty** — the five boolean flags the evidence form offers
- BUT it must NOT emit any other value, and specifically must NOT emit `"Climate"`: the form has no climate evidence flag, so the **Climate** pillar cannot be linked to evidence by tag (documented gap, `design.md` §13 GAP-6)
- AND IT MUST send `[]` for an untagged item rather than omitting the key, so the AI can tell "no impact area claimed" from "field missing".

#### `BIL-QAI-R-4` — Verdict per section and overall, in one window; grey is a valid section verdict *(amended v0.2)*

The system MUST show one window with the overall verdict and one verdict per section (General information, Contributors & partners, Geographic location, Evidence, Type-specific details), each with plain-language comments; for amber/red sections what to correct, for green sections what is done well; evidence items listed with their own verdict including grey. A **section** verdict MAY be `grey` with the same meaning as an evidence grey ("not evaluated"); the overall verdict stays `green` | `amber` | `red`.

##### Scenario: Window for every colour
- GIVEN a completed assessment whose overall verdict is green
- WHEN the window switches to its verdict state
- THEN the overall badge, the five section rows and the evidence list are shown
- AND IT MUST be shown for green, amber and red alike (no silent pass-through on green)
- BUT it must NOT annotate the form behind the window with markers or badges.

##### Scenario: Grey never colours a section
- GIVEN an Evidence section where every item is grey
- WHEN the section verdict is rendered
- THEN the section shows the AI's section verdict as returned, with the grey items listed and their reason
- AND IT MUST NOT derive or alter the section colour from grey items.

##### Scenario: A grey section is rendered, not rejected *(v0.2)*
- GIVEN a completed assessment whose `type_specific` section verdict is `grey` with the reason "no type-specific details were reported"
- WHEN the window switches to its verdict state
- THEN that row renders with the grey badge and the text **"Not evaluated"** next to the AI's reason, and the other four rows render their own colours
- BUT it must NOT be treated as a malformed response, and must NOT change the overall verdict, which the AI owns
- AND IT MUST NOT count toward "outstanding flags": only `amber` and `red` — at section or overall level — make `had_outstanding_flags` true.

#### `BIL-QAI-R-5` — The user decides; the AI never blocks

From the verdict window the system MUST offer exactly two exits: **Submit anyway** (transition to Pending Review whatever the colour) and **Make adjustments** (close, nothing sent). Any other dismissal MUST behave as Make adjustments.

##### Scenario: Submit anyway on red
- GIVEN a verdict window with overall red
- WHEN the user presses **Submit anyway**
- THEN the result transitions to Pending Review exactly as the current submit does (status, submitted date/submitter, review-history row, notification)
- AND the assessment row records `decision = submitted_anyway` and `had_outstanding_flags = true`.

##### Scenario: Dismissal is Make adjustments
- GIVEN a verdict window open
- WHEN the user presses X, Esc, or clicks outside
- THEN the window closes, the result stays editable in its current status
- BUT it must NOT send anything or record a decision other than `adjusted`.

#### `BIL-QAI-R-6` — Fresh verdict per submission; stored verdict only while content is unchanged

The system MUST re-run the assessment on every Submit whose saved content differs from the last assessed content, and MAY reuse the last assessment when the content hash is unchanged.

##### Scenario: Edit then resubmit
- GIVEN a result assessed at content hash H1
- WHEN the user saves an edit (hash H2) and presses Submit
- THEN a new assessment runs over H2
- BUT it must NOT show any part of the H1 verdict.

##### Scenario: Closed tab, unchanged content
- GIVEN an assessment started, the user closed the tab, and the server completed and stored it at hash H1
- WHEN the user reopens the result and the saved content still hashes to H1
- THEN the result page indicates a quality check is available and pressing Submit opens the stored verdict without re-running
- AND the user has the same two exits.

##### Scenario: Leaving while running
- GIVEN an assessment in progress
- WHEN the user tries to close or navigate away from the page
- THEN a warning states the check is still running
- AND IT MUST let the user leave anyway; the server MUST finish and store the assessment regardless of the client connection.

#### `BIL-QAI-R-7` — Unavailable check never blocks; a degraded check is still a check *(amended v0.2)*

When the AI does not answer within the configured window (default 60 s) or answers with an error or malformed body, the system MUST stop waiting, tell the user the quality check is not available, and offer **Submit anyway** and **Make adjustments**.

Contract v0.2 adds an AI-declared `status` (`completed` | `partial` | `unavailable`) and a `degraded_reason`. The system MUST treat `partial` as a **completed** assessment — a real verdict the user can act on — and surface the reason; only an AI `status = unavailable` (or no usable answer at all) takes the unavailable path.

##### Scenario: Timeout
- GIVEN the AI service does not respond
- WHEN the configured window elapses
- THEN the window shows the unavailable state within the window ± 2 s
- AND an assessment row is stored with `status = unavailable`
- AND IT MUST allow submission, recording `decision = submitted_without_check` when the user submits
- BUT it must NOT surface any error body, host name or stack trace to the user.

##### Scenario: Service not configured
- GIVEN the environment lacks the AI URL or key
- WHEN Submit is pressed
- THEN the unavailable state is shown immediately with the same two exits.

##### Scenario: The AI answers `partial` *(v0.2)*
- GIVEN the AI returns a full verdict with `status: "partial"` and `degraded_reason: "One evidence link could not be opened, so the evidence section was assessed on descriptions only."`
- WHEN the window switches to its verdict state
- THEN the verdict renders normally and a one-line notice above the section list shows the `degraded_reason` verbatim
- AND the assessment row stores `status = completed` with `ai_status = partial` and the reason
- AND submitting from it records `decision = submitted_anyway` — **not** `submitted_without_check`, which stays reserved for an assessment that produced no verdict at all
- BUT it must NOT show a host name, URL, response body or stack trace, whatever the AI put in the reason — the client renders it as plain text only.

##### Scenario: The AI answers `unavailable` *(v0.2)*
- GIVEN the AI returns `status: "unavailable"` with a `degraded_reason` and no usable verdict
- WHEN the response is processed
- THEN the row is stored with `status = unavailable`, `unavailable_reason = ai_unavailable` and the reason text
- AND the window shows the unavailable state with the reason and the same two exits
- AND IT MUST record `decision = submitted_without_check` when the user submits from it.

#### `BIL-QAI-R-8` — Traceability travels with the result *(amended v0.2)*

The system MUST persist, per assessment: overall verdict, per-section verdicts and comments, per-evidence verdicts, optional scores, criteria version, status, **the AI's own `status` and `degraded_reason`**, elapsed time, content hash, the user's decision and whether amber/red flags were outstanding at decision time. The bilateral detail read used by the Program review MUST expose the latest assessment additively, including the two new fields.

##### Scenario: Decision stamped on submit
- GIVEN a completed assessment
- WHEN the user submits from the window
- THEN the submit request carries the assessment reference and the decision, the row is stamped, and the review-history comment names the overall verdict and the decision
- AND IT MUST reject a submit that references an assessment belonging to another result or whose content hash no longer matches, with a clear message.

##### Scenario: Additive payload
- GIVEN a result in Pending Review with a stored assessment
- WHEN the bilateral detail is read
- THEN a `quality_assessment` block is present with the stored fields
- BUT it must NOT change, rename or remove any existing field (AC-4), and MUST be `null` when no assessment exists.

##### Scenario: A degraded run is legible to the reviewer *(v0.2)*
- GIVEN a result submitted from an assessment the AI marked `partial`
- WHEN the bilateral detail is read
- THEN `quality_assessment` carries `ai_status: "partial"` and `degraded_reason` next to the verdicts, so a Program reviewer can tell a complete assessment from a degraded one
- AND the `decision` semantics are unchanged: `submitted_anyway` means "a verdict existed and the user sent it", `submitted_without_check` means "no verdict existed"
- AND IT MUST default both fields to `null` for every pre-v0.2 row and for KP rows (`skipped_kp_rule`), which never call the AI.

#### `BIL-QAI-R-9` — Knowledge Products follow the deterministic rule, no AI call

For a Knowledge Product result the system MUST NOT call the AI service and MUST derive the verdict in code.

##### Scenario: Not MELIA, not Journal Article
- GIVEN a KP result whose product is neither MELIA nor a Journal Article
- WHEN Submit is pressed
- THEN the window shows overall green with the rationale "auto-validated by repository metadata", five section rows green, and the two exits
- AND the row is stored with `status = skipped_kp_rule`.

##### Scenario: Journal Article with matching metadata
- GIVEN a KP Journal Article whose CGSpace and WoS metadata rows agree on year, ISI flag (both true), peer-review flag (both true) and accessibility
- WHEN Submit is pressed
- THEN the verdict is green with the matched fields listed.

##### Scenario: Fallthrough
- GIVEN a KP that is MELIA, or a Journal Article whose metadata rows disagree or are missing
- WHEN Submit is pressed
- THEN the window shows overall **grey** "criteria pending confirmation" with the mismatching or missing fields named, and the two exits
- BUT it must NOT call the AI service
- AND IT MUST allow Submit anyway.

#### `BIL-QAI-R-10` — Working state that informs

While the assessment runs the window MUST show a progress indicator, the elapsed time, rotating explanations of what green, amber, red and grey mean, and the statement that the user decides and the AI never blocks.

##### Scenario: Working state
- GIVEN Submit was pressed
- WHEN the request is in flight
- THEN the working state is visible within 200 ms of the press
- AND IT MUST be announced to assistive technology (live region) and be dismissible only through the leave-page warning path.

#### `BIL-QAI-R-15` — Innovation developers is a field the user fills, and is sent verbatim *(new, v0.2)*

For an Innovation development result the bilateral form MUST offer **Innovation developers** as its own editable, optional field, and the payload MUST send whatever the user wrote — or `null` — never a value substituted from another field.

*Why:* today the bilateral creator does not show the field and writes the column silently from the Section-1 *Lead contact person* (`type-innovation-dev.component.html:44-46`, `type-innovation-dev.component.ts:277`; the ingest handler falls back the same way, `handlers/innovation-development.handler.ts:56-75`). A QA check over that column can never fail, because the column is never empty and never says anything the lead contact does not already say. Program reviewers need the real answer; the standard PRMS result form has always shown the field (`pages/results/.../innovation-dev-info.component.html:140-147`).

##### Scenario: The user writes their own innovation developers
- GIVEN an Innovation development bilateral result whose Section 1 lead contact person is "A. Rivera"
- WHEN the user opens the Innovation development section
- THEN an optional **Innovation developers** text area is shown, prefilled with "A. Rivera" **only when the stored value is empty on first load**
- AND the user can replace it with "CIAT breeding team; Local seed cooperative", save, and see that text on reload
- AND the user can clear it, save, and see it persist as empty — the form must NOT re-fill it from the lead contact person on the next load
- BUT it must NOT keep the silent overwrite: saving the section must not copy the lead contact person over a value the user chose
- AND IT MUST persist through the existing section save path (`PATCH api/results/summary/innovation-dev/create/result/:id` via `BilateralApiService.PATCH_innovationDev`, scheduled by `BilateralAutoSaveService`), with no new endpoint.

##### Scenario: The payload reports what the user wrote
- GIVEN the field saved as "CIAT breeding team; Local seed cooperative"
- WHEN the payload is built
- THEN `type_specific.fields["Innovation developers"]` is that exact string
- AND IT MUST be `null` — under its own label, not omitted — when the field is empty, so the AI can flag a missing developer instead of grading a copy of the lead contact person.

### Should (SHOULD)

- **`BIL-QAI-R-11`** The client SHOULD show a "Quality check available" indicator on the result rail when a stored assessment is current (hash match), and open it on demand without re-running.
- **`BIL-QAI-R-12`** The system SHOULD store the AI's optional numeric `score` (0–100) per section and overall verbatim, nullable, and MUST NOT derive any colour from it.
- **`BIL-QAI-R-13`** The working state SHOULD adapt its copy after 20 s ("this is taking longer than usual, you can keep waiting or leave; the result will be saved") without changing behaviour.

### Could (MAY)

- **`BIL-QAI-R-14`** The verdict window MAY link each amber/red section row to its section in the form (Make adjustments + navigate).

## Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | Payload assembly p95 ≤ 2 s for any result type in TEST data (QAS-3 budget for detail load). Working state visible ≤ 200 ms after press. |
| **Latency window** | AI call bounded by `BILATERAL_AI_QUALITY_TIMEOUT_MS` (default 60 000). The front proxy/ALB in each environment MUST allow ≥ 65 s for `POST …/quality-assessment`; verified in TEST before the client group starts (`BIL-QAI-OQ-2`). |
| **Availability** | AI outage degrades to the unavailable path; 0 user-facing 5xx from the submit flow attributable to the AI (QAS-6 pattern). |
| **Security** | New endpoints under `/api/` behind JWT middleware and the same centre-permission check as `submitForReview`. Assessment rows readable only for results the caller may edit or review. |
| **Privacy / secrets** | The HTTP client logs request id, result id, elapsed ms, HTTP status and colours only. **No request or response bodies, no API key, no host in user-facing errors** (AC-9, W8, QAS-10). |
| **Backwards compatibility** | `PATCH submit-for-review` body is optional; bilateral detail gains one nullable block; change-log row in `bilateral-result-summaries.en.md` (AC-4, ADR-004). **(v0.2)** two nullable columns arrive in a **second additive migration**, not by editing the first — `T-2`'s migration is already queued for the owner's run, and rewriting a migration that may have run is how environments diverge. |
| **Accessibility** | Dialog: `role="dialog"`, labelled, focus trap, Esc closes as Make adjustments, live region for state changes; colours never the only carrier (icon + label per verdict) — `docs/ux-ui/design.md` §10. |
| **Design system** | Tailwind-first, tokens §7 (green `--pr-color-green-500`, amber `--pr-color-yellow-300`, red `--pr-color-red-300`, grey `--pr-color-accents-*`), `app-pr-dialog` identity used by the AI completion dialog, brand gradient on the primary CTA (DD-12). |
| **Observability** | One structured log line per assessment: `event=bilateral_quality_assessment`, result id, status, **`ai_status` (v0.2)**, overall, elapsed ms, criteria version. `degraded_reason` is stored but **never logged** — it is free text from an external service. |
| **Cost** | No new always-on compute (QAS-12); synchronous call, no worker. |

## Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `BIL-QAI-AC-1` | Editable bilateral result, all saved, MDS complete | Submit pressed | Assessment starts; `status_id` unchanged until decision; button busy |
| `BIL-QAI-AC-2` | Payload fixture for each of the six result types | Builder runs | No `_id` keys, no numeric ids, five section keys present, labels match the form catalogues |
| `BIL-QAI-AC-3` | Evidence rows: one public URL, one private repository file | Builder runs | Private item has `link: null`, no SharePoint fields, graded grey; public item carries its URL |
| `BIL-QAI-AC-4` | Completed assessment, any overall colour | Window renders | Overall badge + five rows + evidence list; form not annotated |
| `BIL-QAI-AC-5` | Verdict window open | X / Esc / outside click | Window closes, nothing sent, decision `adjusted` |
| `BIL-QAI-AC-6` | Verdict window open, overall red | Submit anyway | Pending Review reached, review-history comment names red + submitted anyway, `had_outstanding_flags = true` |
| `BIL-QAI-AC-7` | Assessed at H1, content edited to H2 | Submit | New assessment; H1 verdict never shown |
| `BIL-QAI-AC-8` | Assessment stored at H1 after tab closed; content still H1 | Reopen + Submit | Stored verdict shown without a new call |
| `BIL-QAI-AC-9` | AI URL points to a black hole | Submit | Unavailable state within window ± 2 s; row `unavailable`; submit allowed as `submitted_without_check` |
| `BIL-QAI-AC-10` | KP, not MELIA, not JA | Submit | Green window, `skipped_kp_rule`, no outbound HTTP call |
| `BIL-QAI-AC-11` | KP MELIA or JA with metadata mismatch | Submit | Grey window naming the fields; no outbound HTTP call; submit allowed |
| `BIL-QAI-AC-12` | Result in Pending Review with assessment | Bilateral detail read | `quality_assessment` block present; every pre-existing field byte-identical to the pre-change fixture |
| `BIL-QAI-AC-13` | Submit request with foreign or stale `assessment_id` | Submit | 400 with a clear message; no transition |
| `BIL-QAI-AC-14` | Assessment running | Second Submit for same result | No second AI call; same assessment returned |
| `BIL-QAI-AC-15` | New HTTP client, any outcome | Logs inspected | No body, key or host in log lines |
| `BIL-QAI-AC-16` | Payload fixture for each of the six result types | Builder runs | Every `type_specific.fields` key is present in that type's exported label constant and every mandatory label of the constant is present in the payload — the two sets match exactly; counts and USD amounts are objects, never strings |
| `BIL-QAI-AC-17` | Completed assessment with one section verdict `grey` | Window renders | That row shows the grey badge + "Not evaluated" + the AI's reason; the other rows keep their colours; the overall verdict is unchanged and `had_outstanding_flags` ignores the grey row |
| `BIL-QAI-AC-18` | Innovation development bilateral result, lead contact "A. Rivera", field cleared by the user and saved | Reload, then Submit | The field renders empty (no re-fill from the lead contact); `type_specific.fields["Innovation developers"]` is `null` |

Cross-cutting project ACs that already apply: AC-2 (transition recorded), AC-4 (additive payload), AC-8 (notifications unchanged), AC-9 (secrets).

## Defect classes and the gate that catches each

| Defect class this spec can produce | Gate | Blind spot / substitute |
|---|---|---|
| Identifier or private link leaks into the payload | Server Jest fixture tests asserting on serialized JSON (`_id` keys, digits-only values, `sharepoint` substrings) across six result types | A label that is itself numeric (e.g. a year) is legitimate; the assertion whitelists known numeric-label fields explicitly |
| Status changes before the decision | Server Jest on `submitForReview` + assessment endpoint (no `update` call on the result inside the assessment path); client Jest asserting no submit call before the CTA | — |
| Stale verdict shown | Server Jest on hash comparison; client Jest on `is_current` branch | — |
| Timeout path misbehaves (raw error, no row) | Server Jest with a stubbed `HttpService` that never resolves + fake timers; asserts row `unavailable` and error mapping | Real proxy ceiling is **not** testable in Jest → **human check in TEST** with the AI URL pointed at a slow stub (OQ-2) |
| Bodies or key in logs | Server Jest spying on `Logger` and asserting on every emitted line | — |
| Grey alters a section colour, or a grey **section** is rejected as malformed | Pure-function unit tests on the post-processing rule; client schema-check test with a grey section verdict (`T-5b`) | — |
| A type-specific label drifts from the contract (the AI's strict validation then errors in production) | Server Jest asserting `Object.keys(fields)` equals the exported label constant per type, and a Reviewer grep that the spec fixtures quote the constant, not string literals | Does **not** prove the constant matches the *form's* visible text — that is the owner's fixture review (`T-11`) against a real result in TEST |
| Innovation developers silently re-filled from the lead contact person | Client Jest: stored value non-empty ⇒ no prefill; cleared value saved ⇒ still empty after reload; save does not emit the lead contact into the payload | A prefill that only happens on a genuinely empty first load is intended behaviour, not the defect |
| `partial` treated as unavailable (or vice-versa) | Server Jest on the status mapping (`partial` ⇒ row `completed` + `ai_status`; `unavailable` ⇒ row `unavailable` + `ai_unavailable`) | — |
| KP rule misclassifies | Table-driven unit tests over the decision tree (MELIA × JA × metadata agreement matrix) | Criteria themselves are pending confirmation (accepted risk, `BIL-QAI-OQ-3`) |
| Additive payload breaks a consumer | Payload fixture test comparing pre-change fixture byte-for-byte on existing fields | — |
| Dialog dismiss paths not equivalent to Make adjustments | Client Jest: Esc, backdrop, X each emit the same outcome and no HTTP call | — |
| Visual defects: contrast, colour-only meaning, layout at phone width | **No automated gate** (jsdom cannot measure). Substitute: **T6 visual review at the client HITL pause** with screenshots of the working and verdict states in TEST | Recorded as human gate, not a risk |
| Copy quality of colour tips | **No automated gate.** Substitute: owner reads copy at the HITL pause | — |

## Dependencies & Assumptions

### Upstream dependencies

- AI quality-assessment endpoint (Daniela) implementing **contract v0.2**; `MICROSERVICE_API_KEY` reuse confirmed or a dedicated key provisioned.
- Existing bilateral detail enrichment (`bilateral.service.ts`), centre service (`bilateral-center.service.ts`), evidence + SharePoint entities, KP metadata entity, result review history.
- Client: `app-pr-dialog`, `BilateralMdsTrackerService`, `BilateralCreationService`, alerts service.

### Downstream consumers

- Program review drawer (future story) reads `quality_assessment`.
- Bilateral list/detail consumers see one new nullable block.

### Assumptions

- The AI returns the overall verdict; PRMS stores it verbatim and does not derive it (owner default, `BIL-QAI-OQ-4`).
- "Media" in the meeting notes means MELIA (confirmed 2026-09-16).
- Runtime is the Docker container, not Lambda; the 60 s synchronous call is feasible subject to the proxy check.
- Centre users always save sections before Submit (enforced by the existing guard), so persisted data is the form's truth.

## Open Questions

- **`BIL-QAI-OQ-1`** Repo location of the contract copy: `docs/bilateral-module/integration-contracts.md` (default) vs. a new server doc. *Resolve in design.*
- **`BIL-QAI-OQ-2`** Proxy/ALB request ceiling in TEST ≥ 65 s? *Human check before the client task group; if lower, default timeout set just under it.*
- **`BIL-QAI-OQ-3`** KP criteria confirmation with Mariagiulia (fields compared, MELIA handling). *Accepted risk: rule implemented as specified today; table-driven tests make a later change cheap.*
- **`BIL-QAI-OQ-4`** Does the AI return the overall verdict (default yes) and the optional `score`? *Daniela confirms on contract handoff; contract fields already optional.*
- **`BIL-QAI-OQ-5`** Should `result_code` travel in the request for the AI team's logs? *Default no; `request_id` only.*

## Out-of-Band Notes

- Contract **v0.2** supersedes v0.1 (pivot at execution gate 2, 2026-09-16; `design.md` `BIL-QAI-DD-11`). The repo copy and the per-type label enumeration are rewritten by `BIL-QAI-T-1b`; the owner sends the enumeration to Daniela. Version pinned in the payload as `contract_version: "0.2"`.
- A change to a type-specific field's **visible label** in the form is a contract break, not a copy edit: it requires a `contract_version` bump, an update to the exported label constant and its fixtures, and a message to Daniela before either side ships.
- Migration runs in each environment by the owner (memory rule: migrations are generated, pruned, and run by Juan David).
- No feature flag: the flow is inert until `BILATERAL_AI_QUALITY_URL` is configured; without it the unavailable path shows and submission works as today plus the window.

## Requirement ID Index

| ID | Title | ACs |
|---|---|---|
| `BIL-QAI-R-1` | Check runs on Submit, before status change | AC-1, AC-14 |
| `BIL-QAI-R-2` | Definitions-only payload by section; typed per-type schema + `impact_areas` (v0.2) | AC-2, AC-16 |
| `BIL-QAI-R-3` | Evidence visibility + closed tag vocabulary; private files stay | AC-3 |
| `BIL-QAI-R-4` | Verdict per section and overall, one window; section grey (v0.2) | AC-4, AC-17 |
| `BIL-QAI-R-5` | User decides; AI never blocks | AC-5, AC-6 |
| `BIL-QAI-R-6` | Fresh verdict; reuse only on unchanged content | AC-7, AC-8 |
| `BIL-QAI-R-7` | Unavailable never blocks; `partial` is a real verdict (v0.2) | AC-9 |
| `BIL-QAI-R-8` | Traceability travels with the result, incl. `ai_status`/`degraded_reason` (v0.2) | AC-6, AC-12, AC-13 |
| `BIL-QAI-R-9` | KP deterministic rule | AC-10, AC-11 |
| `BIL-QAI-R-10` | Working state that informs | AC-1 (200 ms), human visual gate |
| `BIL-QAI-R-11` | Rail indicator for a current assessment | AC-8 |
| `BIL-QAI-R-12` | Optional score stored verbatim | AC-12 |
| `BIL-QAI-R-13` | Adaptive waiting copy | human gate |
| `BIL-QAI-R-14` | Section deep-link (MAY) | — |
| `BIL-QAI-R-15` | Innovation developers editable in the bilateral form, sent verbatim (v0.2) | AC-18 |

## Required cross-references

- `docs/prd.md` — G2, US-S1, US-S4, US-Q1, AC-2, AC-4, AC-8, AC-9.
- `docs/ux-ui/design.md` — F1, §6, §7, §8, §10, DD-12.
- `docs/trd/trd.md` — W1, W6, W8, ADR-004, QAS-3, QAS-6, QAS-9, QAS-10, QAS-12.
- `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` — change log.
- `docs/specs/bilateral/qa-ai-traffic-light/proposal.md`.

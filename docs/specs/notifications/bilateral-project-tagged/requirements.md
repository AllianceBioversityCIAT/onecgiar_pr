# Module Spec: W3/Bilateral "Bilateral project tagged" notification (Requirements)

> **Answer first:** a Center-reported bilateral result can reach Pending Review with a non-lead bilateral project tagged. When it does, every active Center User of that project's owner Center (except the submitter) already gets one `RESULT_BILATERAL_PROJECT_TAGGED` row. This spec changes **only the sentence and the avatar** of that row:
>
> **`ICRISAT`** `has tagged the bilateral project` **`B-A1187`** `from your center (`**`ABC`**`) to result` **`9322`** `- <title>`
>
> The row gets an amber briefcase avatar. The trigger, recipients, dedup, chips, the BCT Center-tagged row, W1/W2 rows and historical rows stay unchanged.

## 1. Document Control

| Field | Value |
|---|---|
| Module | `notifications` (write path: `bilateral` submit and ingest, with no change in the caller) |
| Sub-feature | BCT project-tagged row copy |
| Owner | Santiago Sanchez |
| Status | approved (Santiago, 2026-10-02) |
| Depth | **Standard (lean)**: two packages, one emit line, two read branches, one avatar branch. No migration and no new type |
| Type | Change (inherited) |
| Approval Mode | gated (inherited) |
| Ticket(s) | none (proposal D-3) |
| ID prefix | `BPT-` (free; `WPT-`, `WCT-`, `BCT-`, `NOTIF-` and `NTC-` are taken) |
| Proposal | `proposal.md`. D-1 (reporter bold), D-2 (trigger stays Pending Review) and D-3 (no ticket) are binding |
| Amends | **BCT-R-7** message text (project targets only) |
| Pattern source | `notifications/w1w2-project-tagged` (executed): `segments`, `NOTIFICATION_PROJECT_TAGGED_COPY`, amber chip |

## 2. Executive Summary

| | Today | After |
|---|---|---|
| Stored `text` (new BCT project rows) | `reported by ICRISAT has tagged the B-A1187 of your center (ABC). Click to see the result.` | `ICRISAT has tagged the bilateral project B-A1187 from your center (ABC)` |
| Inbox / bell sentence | `The result <link> reported by ICRISAT has tagged the B-A1187 of your center (ABC). Click to see the result.` (nothing bold) | **ICRISAT** has tagged the bilateral project **B-A1187** from your center (**ABC**) to result **9322** - <link> |
| Push / `message` | Composed fallback | `ICRISAT has tagged the bilateral project B-A1187 from your center (ABC) to result 9322 - <title>` |
| Updates-row avatar | Emitter's initials | Amber rounded-square briefcase |
| Chips | Amber `Bilateral project tagged`, `W3/Bilateral` | Unchanged |
| BCT `CG Center tagged` rows, W1/W2 rows, historical rows | — | Unchanged |

## 3. Glossary

| Term | Meaning |
|---|---|
| BCT flow | `notifyBilateralContributorsOnSubmission`: a bilateral-source result reaches Pending Review (submit or ingest) |
| Reporter label | The result's leading Center: its institution acronym, else its Center code. If neither resolves, `A CGIAR Center` |
| Project code | `clarisa_projects.short_name`, falling back to `full_name`, then `project <id>` (same chain as today) |
| Owner label | The project's owner Center: its institution acronym, else its code (NTC-R-1) |
| Center-reported row | A `RESULT_BILATERAL_PROJECT_TAGGED` row whose `text` matches `<reporter> has tagged the bilateral project <code> from your center (<owner>)` exactly, end-anchored |
| Composed row | `text` contains ` has tagged the ` or ends with `Click to see the result.` (old BCT and pre-NOTIF-T-12 rows) |
| Bare / enriched row | The W1/W2 direct-tag shapes `B-A1080` / `B-A1080 (ABC)` (WPT) |

## 4. System Context & Scope

Baseline: PRD AC-8 · TRD W4 · `docs/ux-ui/design.md` §7 (amber `--pr-status-in-progress-*` pair), §8 (chips, avatars) · client `CLAUDE.md` (copy in `internationalization/*.copy.ts`). Extends `w1w2-project-tagged`. Must not regress `bilateral-contributor-tagging` or `w1w2-project-tagged`.

**In scope:** BCT project-target `text`, server `message` for that shape, client sentence and `segments`, Updates-row avatar for that shape.

**Out of scope:** the trigger (D-2), recipients, dedup, BCT Center targets (scenario 6), W1/W2 shapes, rewriting old rows, email, and payload contracts (`bilateral-result-summaries.en.md` is untouched).

## 5. Stakeholders / Personas

| Persona | Role here |
|---|---|
| Center User of the owner Center (e.g. ABC) | Recipient. Reads the row and opens the result in `view` |
| Center User of the reporting Center (e.g. ICRISAT) | Emitter, by submitting. Sees nothing new. Other ICRISAT users get the row when ICRISAT owns the project (AC36, unchanged) |
| QA / PO | Validates against `mockup/bct-project-tagged-row.png` |

## 6. Functional Requirements

### BPT-R-1: Center-reported text at emit time

The BCT flow SHALL store, for each **project** target, `"<reporter label> has tagged the bilateral project <project code> from your center (<owner label>)"`.

#### Scenario: Acronyms resolve

- GIVEN bilateral result 9322 led by ICRISAT (acronym `ICRISAT`), with non-lead project `B-A1187` owned by ABC (acronym `ABC`)
- WHEN it reaches Pending Review
- THEN each emitted project row's `text` is exactly `ICRISAT has tagged the bilateral project B-A1187 from your center (ABC)`
- BUT it must NOT contain `reported by`, `of your center`, or `Click to see the result.`
- AND IT MUST NOT contain an empty `()`

#### Scenario: Fallbacks

- GIVEN the owner Center's acronym is null or empty
- THEN the owner label is the owner Center code
- AND GIVEN the reporter acronym is null or empty, the reporter label is the leading Center's code
- AND GIVEN no leading Center resolves, the reporter label is `A CGIAR Center` and the existing warning is still logged

#### Scenario: Center targets and BCT behavior unchanged

- GIVEN the same submission also has a non-leading contributing Center
- THEN that Center's `RESULT_CENTER_TAGGED` row text is byte-identical to today's (`reported by <X> has tagged the <Center name>. Click to see the result.`)
- AND the trigger guard (Pending Review + bilateral source), recipient resolution, submitter exclusion, project-before-Center ordering and cross-type dedup (BCT-R-9, AC32) are unchanged
- AND IT MUST NOT emit for a project with no resolvable owner (existing warn-and-skip)

### BPT-R-2: Inbox and bell sentence

The client SHALL render a Center-reported row as `<reporter>` `has tagged the bilateral project` `<project code>` `from your center (` `<owner>` `) to result` `<result code>` `- <title link>`, with the reporter, project code, owner and result code emphasized.

#### Scenario: Center-reported row

- GIVEN a `RESULT_BILATERAL_PROJECT_TAGGED` row with `text` = `ICRISAT has tagged the bilateral project B-A1187 from your center (ABC)`, result 9322
- WHEN it is shown in the Updates tab or the bell
- THEN the flattened sentence reads `ICRISAT has tagged the bilateral project B-A1187 from your center (ABC) to result 9322 - <title>`
- AND exactly `ICRISAT`, `B-A1187`, `ABC` and `9322` are emphasized
- BUT the leading `The result` must NOT appear, and neither must the emitter person's name or a Science Program code
- AND IT MUST NOT show Accept or Decline. Clicking opens the result in `view` (unchanged)

#### Scenario: Parentheses inside the project code

- GIVEN `text` = `ICRISAT has tagged the bilateral project Seeds (Phase 2) from your center (ABC)`
- THEN the project code is `Seeds (Phase 2)` and the owner is `ABC`

### BPT-R-3: Push / message sentence

The server `message` for a Center-reported row SHALL be `<reporter> has tagged the bilateral project <code> from your center (<owner>) to result <code> - <title>`. When the result code or title is missing, the identity part SHALL drop it, the same way as the W1/W2 branch.

### BPT-R-4: Other shapes untouched

#### Scenario: Shape precedence

- GIVEN a row whose `text` is an old composed sentence (`… reported by AR has tagged the P-CIP of your center (CIP). Click to see the result.`), a W1/W2 enriched `B-A1080 (ABC)`, a legacy bare `B-A1080`, or empty
- WHEN it renders (client) or its `message` is built (server)
- THEN the output is byte-identical to today's
- AND IT MUST check the Center-reported shape **before** the composed check (its text contains ` has tagged the `), while the composed sentences must NOT match the Center-reported pattern

### BPT-R-5: Avatar

The Updates-row avatar of a Center-reported row SHALL be a briefcase icon in an amber rounded square (8px radius, the amber status token pair). Every other Updates row keeps its current avatar.

#### Scenario: Avatar by shape

- GIVEN a Center-reported row → briefcase, amber, rounded square
- AND GIVEN a W1/W2 project-tagged row (bare or enriched) → initials (unchanged)
- BUT it must NOT change the Requests-tab avatars or the AI-job and approved-decision icons

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| BPT-NFR-1 | No new query on the inbox read path. All data is fixed at emit time |
| BPT-NFR-2 | The client and server parsers are twins (same regex and trims) with a sync comment. Each pins the same shape table |
| BPT-NFR-3 | User-facing copy lives in `notification-project-tagged.copy.ts` (reuse `verb` and `centerClauseWithLabel`; add only what is missing) |
| BPT-NFR-4 | Colors only from existing tokens (`--pr-status-in-progress-bg/fg`). Icon from PrimeIcons (`pi-briefcase`), which is already in the bundle |
| BPT-NFR-5 | The emit path never throws (BCT-NFR-1 unchanged) |
| BPT-NFR-6 | No secrets or PII added to logs |

### Defect classes → gate

| Defect class | Caught by |
|---|---|
| Wrong stored text, fallbacks, `()` | `result-tagged-notification.service.spec` exact `toBe` |
| BCT regression (Center text, dedup, ordering) | Same spec: existing BCT tests stay unedited except the 4 project-text assertions |
| Shape precedence wrong (new row falls into composed, or old row misparsed) | Client `notification-type.constants.spec` + server `notification.service.spec` shape tables, plus a falsifier that swaps the check order |
| Emphasis on the wrong tokens | `notification-item.component.spec` segment assertions |
| Avatar shape and colour visually off | **No automated check** (jsdom cannot see colour or radius). Substitute: manual visual check against the mockup at the BPT-T-4 HITL gate |
| Real recipients and real owner resolution | Manual gate on local data (BPT-T-4) |

## 8. Requirement ID Index

| ID | Title | Tasks |
|---|---|---|
| BPT-R-1 | Center-reported text at emit time | BPT-T-1, BPT-T-4 |
| BPT-R-2 | Inbox and bell sentence | BPT-T-3, BPT-T-4 |
| BPT-R-3 | Push / message sentence | BPT-T-2 |
| BPT-R-4 | Other shapes untouched | BPT-T-2, BPT-T-3 |
| BPT-R-5 | Avatar | BPT-T-3, BPT-T-4 |
| BPT-NFR-1..6 | — | BPT-T-1..T-3 |

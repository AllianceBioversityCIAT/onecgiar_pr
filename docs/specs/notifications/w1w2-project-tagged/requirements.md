# Module Spec: W1/W2 "Bilateral project tagged" notification (Requirements)

> **Answer first:** a W1/W2 direct-tag save can newly link a bilateral project. This happens on a Contributors and Partners save or on create-from-Results-Framework. When it does, every active Center User of the project's owning Center gets one informational row: `Lucia Ferrari from` **`SP09`** `has tagged the bilateral project` **`B-A1080`** `from your center (`**`ABC`**`) to result` **`9341`** `- <title>`. The row has an amber `Bilateral project tagged` chip and no Accept or Decline.
>
> In the direct-tag flow, dedup becomes **one row per user, per result, per tagged type**. A user can now get both `CG Center tagged` and `Bilateral project tagged` for the same result. BCT Pending Review rows and their cross-type dedup stay unchanged, and so do legacy rows.

## 1. Document Control

| Field | Value |
|---|---|
| Module | `notifications` (write paths: `results` partners save, `results-framework-reporting` create) |
| Sub-feature | W1/W2 bilateral-project-tagged informational notification |
| Owner | Santiago Sanchez |
| Status | approved (Santiago, 2026-10-01) |
| Depth | **Standard**: two packages, two write paths (no code change in either caller), no migration, no new type |
| Type | Change (inherited from `proposal.md`) |
| Approval Mode | gated (inherited) |
| Ticket(s) | none (D-5) |
| ID prefix | `WPT-` (`WCT-`, `NOTIF-`, `BCT-`, `NTC-` are taken) |
| Proposal | `proposal.md`. D-1..D-6 are binding |
| Amends | NOTIF-R-14 / NOTIF-T-12 (bare-label shape and sentence for `RESULT_BILATERAL_PROJECT_TAGGED`). **WCT-R-4** and P2-3214 BR4 (dedup, direct-tag flow only, D-6) |
| Sibling | `notifications/w1w2-center-tagged` (executed). Reuses its `lead` text part, copy-file pattern and chip hooks |

## 2. Executive Summary

| | Today | After |
|---|---|---|
| Direct-tag save links a bilateral project of ABC | ABC's users get `Lucia Ferrari from SP09 has tagged project B-A1080 as contributor to result 9341 - …` | They get the mockup sentence, with the SP, project code, acronym and result code in bold |
| Stored `text` | `B-A1080` | `B-A1080 (ABC)` |
| Type chip | Raw `Result Bilateral Project Tagged`, violet | `Bilateral project tagged`, amber |
| Same save also tags Center ABC | ABC's users get only the project row; the `CG Center tagged` row is dropped | They get both rows (D-6) |
| A later save tags Center ABC after the project row was sent | Dropped | Sent (D-6) |
| BCT Pending Review | Owner gets the project text only, never both | Unchanged |
| Legacy bare row `B-A1080` | Old sentence | New sentence without acronym: `… from your center to result …` (D-3) |

## 3. Glossary

| Term | Meaning |
|---|---|
| Direct-tag flow | `notifyTaggedBilateralProjects` / `notifyTaggedCenters` called with no lead-in: W1/W2 partners save (including SP review of a bilateral result), IPSR contributors save, create-from-Results-Framework |
| BCT flow | `notifyBilateralContributorsOnSubmission` (bilateral result reaches Pending Review), which passes a lead-in |
| Owning Center | The Center the project resolves to through the shared owner resolver (`organization_code`, else the W3 acronym fallback) |
| Project code | `clarisa_projects.short_name`, e.g. `B-A1080`, as shown on the bilateral catalog (D-1). It falls back to `full_name`, then `project <id>` |
| Center label | The owning Center's CLARISA institution acronym, else its Center code |
| Enriched bare row | A new direct-tag row with `text` = `<project code> (<Center label>)` |
| Legacy bare row | A direct-tag row written after NOTIF-T-12 and before this change, with `text` = `<project code>` only |
| Composed row | `text` contains ` has tagged the ` or ends with `Click to see the result.` (BCT and pre-NOTIF-T-12 rows) |
| Tagged type | `RESULT_CENTER_TAGGED` or `RESULT_BILATERAL_PROJECT_TAGGED` |

## 4. System Context & Scope

Baseline:
- `docs/prd.md`: AC-8 (user-facing changes fire notifications), US-S3
- `docs/ux-ui/design.md`: §7 tokens (amber is the existing `--pr-status-in-progress-*` pair), §8 chips (Spartan `hlmBadge`), DD-10 (in-app only)
- `docs/trd/trd.md`: W4 Notifications
- client `CLAUDE.md`: copy goes in `internationalization/*.copy.ts`

This spec extends `notifications/inbox-revamp` (NOTIF-T-12) and `notifications/w1w2-center-tagged`. It must not regress `notifications/bilateral-contributor-tagging`.

### In scope
- The stored label for new direct-tag project rows (project code plus Center label).
- The sentence, emphasis and chip in the inbox row, the Updates list item and the header bell, plus the server-built description used by push.
- Per-type dedup in the direct-tag flow.
- Fallbacks for legacy bare rows and composed rows.

### Out of scope
- Email, settings, a new type, a migration, rewriting stored rows.
- Accept or Decline, or any pending state.
- BCT texts and BCT dedup.
- Changing who is notified: newly linked only, owner resolution, skipping an unresolvable owner, the lead project.
- One row per project. Several projects of the same Center on one result produce one project row (WPT-R-5).
- Changing the `CG Center tagged` sentence or chip.

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Center User of a project's owning Center | Clearer row (who, which SP, which project, which Center, which result), plus an amber chip. Also gets the `CG Center tagged` row when the Center is tagged on the same result |
| SP user saving partners or creating from the Results Framework | No visible change. They are never notified of their own action |
| Bilateral reporters (BCT) | No change |

**WPT-US-1**: As a Center User, I want to know when a Science Program tags one of my Center's bilateral projects on its result, and which project it was, so that I can follow up. *Refines US-S3, AC-8.*

## 6. Functional Requirements

### WPT-R-1: Stored text for new direct-tag project rows

The server SHALL store, as the `text` of every new direct-tag `RESULT_BILATERAL_PROJECT_TAGGED` row, `<project code> (<Center label>)`.

#### Scenario: Acronym available
- GIVEN project 1042 with `short_name` `B-A1080`, owned by a Center whose institution acronym is `ABC`
- WHEN a direct-tag save newly links it to result 9341
- THEN the stored `text` is exactly `B-A1080 (ABC)`

#### Scenario: Fallbacks
- GIVEN the owning Center has no acronym
- THEN the label uses the Center code, e.g. `B-A1080 (CENTER-07)`
- AND IT MUST NOT store an empty `()`
- AND a project with no `short_name` uses `full_name`, then `project <id>`, as the project code

#### Scenario: BCT untouched
- GIVEN a bilateral result reaches Pending Review
- THEN the BCT path still stores `reported by <X> has tagged the <project> of your center (<Y>). Click to see the result.` byte for byte

### WPT-R-2: Row sentence

The client SHALL render an enriched bare row as: `{emitter name} from` **`{SP code}`** `has tagged the bilateral project` **`{project code}`** `from your center (`**`{Center label}`**`) to result`, followed by the existing `{code} - {title}` result link.

#### Scenario: Mockup row
- GIVEN an enriched bare row `B-A1080 (ABC)` for result 9341 owned by SP09, emitted by Lucia Ferrari
- WHEN it is shown in the inbox, the Updates list item or the header bell
- THEN it reads `Lucia Ferrari from SP09 has tagged the bilateral project B-A1080 from your center (ABC) to result 9341 - <title>`
- AND `SP09`, `B-A1080` and `ABC` are emphasized, `9341 - <title>` is the existing result link, and the emitter name is not emphasized
- AND the server-built description (push or socket) reads the same sentence as plain text
- BUT it must NOT contain `The result`, `as contributor`, `created by`, or `Click to see the result.`
- AND IT MUST fall back to `A user` when the emitter name is missing, and to `a Science Program` when the SP code is missing

#### Scenario: Project code with parentheses
- GIVEN a row `Seeds (Phase 2) project (ABC)`, from the `full_name` fallback
- THEN the project code is `Seeds (Phase 2) project` and the Center label is `ABC`. Only the last trailing `(…)` is the label

### WPT-R-3: Legacy bare row fallback (D-3)

The client and the server description SHALL render a row whose `text` is not composed and has no trailing `(…)` with the new sentence, minus the label.

#### Scenario
- GIVEN a legacy bare row `B-A1080`
- THEN it reads `Lucia Ferrari from SP09 has tagged the bilateral project B-A1080 from your center to result 9341 - <title>`
- AND IT MUST NOT render `()` or `(undefined)`

### WPT-R-4: Composed rows unchanged

The client and the server description SHALL render a composed or empty row exactly as today.

#### Scenario
- GIVEN a BCT row `reported by AfricaRice has tagged the B-A1080 of your center (ABC). Click to see the result.`
- THEN it renders `The result 9341 - <title> reported by AfricaRice has tagged the B-A1080 of your center (ABC). Click to see the result.`
- BUT its trailing `(ABC).` must NOT be parsed as an enriched label

### WPT-R-5: Per-type dedup in the direct-tag flow (D-6)

In the direct-tag flow, the system SHALL notify a user at most once **per result per tagged type**.

#### Scenario: Center and project on one save
- GIVEN user U is a Center User of ABC, and result 9341 has no tagged rows
- WHEN one W1/W2 save newly links Center ABC and project `B-A1080` (owned by ABC)
- THEN U gets exactly one `Result Bilateral Project Tagged` row and one `Result Center Tagged` row

#### Scenario: Later save adds the Center
- GIVEN U already holds a `Result Bilateral Project Tagged` row for 9341
- WHEN a later save newly links Center ABC
- THEN U gets one `Result Center Tagged` row

#### Scenario: Same type twice
- GIVEN U already holds a `Result Bilateral Project Tagged` row for 9341
- WHEN a later save newly links another ABC project, `B-A1099`
- THEN U gets no new row
- AND one save that links two ABC projects gives U one project row, not two

#### Scenario: BCT keeps cross-type dedup
- GIVEN a bilateral result reaches Pending Review with project `B-A1080` (owner ABC) and contributing Center ABC
- THEN ABC's users get only the project row, never both (BCT-R-9 unchanged)

#### Scenario: Re-save and saver
- WHEN partners are re-saved with no new links, THEN nothing is sent
- AND the saver is never notified
- AND IT MUST NOT fail or roll back the save if the emission throws

### WPT-R-6: Type chip

The client SHALL label `RESULT_BILATERAL_PROJECT_TAGGED` rows with the chip `Bilateral project tagged`, using the existing amber `--pr-status-in-progress-bg/-fg` pair.

#### Scenario
- GIVEN any `Result Bilateral Project Tagged` row (enriched, legacy bare, composed)
- THEN its type chip reads `Bilateral project tagged` in amber
- AND the `W1/W2` chip, level · type, and relative time still render
- BUT the `CG Center tagged` chip stays green, and other Updates types keep their current chip

### WPT-R-7: Both direct-tag triggers covered (D-4)

The system SHALL apply WPT-R-1 and WPT-R-5 to the partners save **and** to create-from-Results-Framework.

#### Scenario
- GIVEN an SP user creates a result from the Results Framework that links `B-A1080`
- THEN ABC's Center Users get the same enriched row as WPT-R-2

### WPT-R-8: Informational only

The row SHALL open in `view` mode (or open the result). It SHALL NOT offer Accept or Decline, or show a pending state.

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| WPT-NFR-1 | Emission is post-persistence and non-fatal on both paths |
| WPT-NFR-2 | No migration, no new type, no API request or response shape change |
| WPT-NFR-3 | Copy lives in `internationalization/notification-project-tagged.copy.ts`. No hard-coded strings in templates |
| WPT-NFR-4 | Chip colors use existing tokens only |
| WPT-NFR-5 | No extra per-row query on the inbox read path (the label is resolved at emit time) |
| WPT-NFR-6 | Scoped Jest only (memory rule) |

### Defect classes and their gates

| Defect class | Caught by |
|---|---|
| Wrong stored label (missing acronym, empty `()`, wrong fallback) | Server Jest: `result-tagged-notification.service.spec` |
| BCT stored text or dedup regression | Server Jest: the existing BCT cases plus a new "owner gets project only" case |
| Per-type dedup wrong (drops the second type, or duplicates the same type) | Server Jest: four WPT-R-5 cases, each failing against today's cross-type set |
| Shape misrouting (composed parsed as enriched, parentheses in the name) | Client Jest `notification-type.constants.spec` and server `notification.service.spec`, one case per shape: enriched, parenthesised, legacy bare, BCT composed, empty |
| Sentence, emphasis or chip wrong in a consumer | Client Jest: `notification-item`, `update-notification`, `pop-up-notification-item` specs (DOM text, `<b>` contents, chip text and class) |
| Save fails because of emission | Server Jest: the emitter throws and the save resolves (already covered, kept) |
| **Visual match to the mockup** (amber hue, bold weight, spacing) | **No automated check**, because jsdom cannot see color or layout. Substitute: a manual browser check at the execute HITL pause against `mockup/project-tagged-row.png` |
| Real recipients and owner resolution on real data | No automated check. Manual check on prtest after deploy (accepted risk) |

## 8. Requirement ID Index

| ID | Title | Proposal source |
|---|---|---|
| WPT-R-1 | Stored `<code> (<label>)` | Option A, D-1 |
| WPT-R-2 | Row sentence and emphasis | Mockup, D-2 |
| WPT-R-3 | Legacy bare fallback | D-3 |
| WPT-R-4 | Composed rows unchanged | R-1 |
| WPT-R-5 | Per-type dedup (direct flow only) | D-6, R-3 |
| WPT-R-6 | Amber chip | Mockup |
| WPT-R-7 | Results Framework trigger | D-4 |
| WPT-R-8 | Informational only | Intent |
| WPT-NFR-1..6 | See §7 | — |

### Assumptions
- **A-1**: Amber is `--pr-status-in-progress-*` (`#fef3c7` / `#b45309`), which matches the mockup chip. No new token.
- **A-2**: Emphasis uses the same `<b>` style as the `lead` part of `CG Center tagged`. The mockup's monospace look is not reproduced unless the existing bold already is.

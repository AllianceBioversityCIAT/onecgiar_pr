# Module Spec — W1/W2 "CG Center tagged" notification — Requirements

> **Answer first:** when a result's Contributors and Partners (W1/W2, and the SP review of a bilateral result) or an IPSR Innovation Package's contributors get a CGIAR Center added as a **contributor**, every active user of that Center receives one informational in-app row: **`SP01`** `has tagged your CG Center as a contributor (ABC) to result` **`9398`** `- <title>`. The row carries a green `CG Center tagged` chip. It has no Accept or Decline. A newly linked lead (W1/W2) or primary (IPSR) Center is notified too: D-1 was reverted by the user (Pivot WCT-T-2, 2026-09-30). Rows that already exist, and BCT's Pending Review rows, render as they do today.

## 1. Document Control

| Field | Value |
|---|---|
| Module | `notifications` (with `results` partners save and `ipsr` contributors save write paths) |
| Sub-feature | W1/W2 + IPSR center-tagged informational notification |
| Owner | Santiago Sanchez |
| Status | approved (Santiago, 2026-09-30) |
| Depth | **Standard**: two packages, three write paths, no migration, no new notification type |
| Type | Change (inherited from `proposal.md`) |
| Approval Mode | gated (inherited) |
| Ticket(s) | none (D-5) |
| ID prefix | `WCT-` (`NOTIF-R-*` and `BCT-*` are taken) |
| Proposal | `proposal.md`. D-2, D-3 and D-5 are binding here. D-1 (exclude the lead) was **reverted** by the user at execute (Pivot WCT-T-2, 2026-09-30) |
| Amends | P2-3214 AC3 (the stored text shape for the direct-tag flow only) |

## 2. Executive Summary

| | Today | After |
|---|---|---|
| W1/W2 partners save adds a contributing Center | Notifies, with stored text `created by SP01 has tagged the <long Center name>. Click to see the result.` rendered after `The result <link>` | Notifies with the mockup sentence (SP first, Center acronym, result link) |
| W1/W2 save adds the **lead** Center | Notifies | Still notifies (D-1 reverted (Pivot WCT-T-2, 2026-09-30)) |
| IPSR Innovation Package step adds a contributing Center | **No notification** | Notifies, with the same sentence (D-3) |
| SP review of a bilateral (`source = 'API'`) result adds a Center | Notifies (P2-3214 path), old sentence | Still notifies, new sentence (WCT-R-3 amended). BCT's Pending Review flow is unchanged |
| Type chip | Raw `Result Center Tagged`, violet | `CG Center tagged`, green |

## 3. Glossary

| Term | Meaning |
|---|---|
| Direct-tag save | A partners save (W1/W2, or SP review of a bilateral result) or an IPSR contributors save |
| Owner SP | The result's initiative with `initiative_role_id = 1`; its official code (e.g. `SP01`) |
| Contributing Center | Any Center the save links to the result. **Amended (Pivot WCT-T-2, 2026-09-30):** this includes the lead (W1/W2 `is_leading_result`) and the IPSR `is_primary` Center |
| Newly tagged | A Center whose `results_center` row did not exist for the result before this save |
| Center User | An active `role_by_user` row for the Center (the existing `getUserIdsByCenter` audience) |
| Direct-tag row | A `RESULT_CENTER_TAGGED` notification written by a save (no lead-in), as opposed to a BCT Pending Review row |
| Legacy row | Any `RESULT_CENTER_TAGGED` row written before this change, or by BCT; its `text` is a composed sentence |

## 4. System Context & Scope

Baseline: `docs/prd.md` AC-8 (user-facing changes fire notifications) and US-S3 · `docs/ux-ui/design.md` DD-10 (this spec is **in-app only**, as BCT is), top-bar bell · `docs/trd/trd.md` W4 Notifications, Notification module row · client `CLAUDE.md` (copy lives in `internationalization/*.copy.ts`). Extends `notifications/inbox-revamp` (chips, row layout, NOTIF-T-12 bare-label pattern). Must not regress `notifications/bilateral-contributor-tagging`.

### In scope
- Emission on W1/W2 partners save and IPSR contributors save, for newly tagged contributing Centers only.
- New sentence and chip in the inbox row (Updates source), the Updates list item, and the header bell.
- Legacy and BCT rows keep rendering as today.

### Out of scope
- Email, notification settings, new notification type, seed migration.
- Accept or Decline, or any pending state.
- Rewriting stored historical rows.
- BCT's Pending Review flow and its texts.
- Notifying on unlink, or re-notifying on re-save.

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Center User of a tagged Center | Gets a clearer row (who, which Center, which result); now also gets one for IPSR |
| Center User of the lead or primary Center | Keeps getting a "tagged" row when that Center is newly linked (as today on W1/W2; new on IPSR) (Pivot WCT-T-2, 2026-09-30) |
| SP user saving partners or IPSR contributors | No visible change; they are never notified of their own action |
| Bilateral reporters | No change (BCT untouched) |

**WCT-US-1**: As a Center User, I want to know in the platform when a Science Program tags my Center as a contributor to its result, and which of my Centers was tagged, so that I can follow up without email. *Refines US-S3, AC-8.*

## 6. Functional Requirements

### WCT-R-1: Notify newly tagged contributing Centers on W1/W2 partners save

The system SHALL emit one `RESULT_CENTER_TAGGED` notification per Center User of each **newly tagged contributing** Center when Contributors and Partners is saved (any result reaching the partners path).

#### Scenario: Contributor added
- GIVEN W1/W2 result 9398 owned by SP01, with ABC not linked
- WHEN an SP01 user saves partners with ABC as a contributing Center (`is_leading_result` false)
- THEN each active Center User of ABC gets one unread notification of type `Result Center Tagged` for 9398
- BUT it must NOT notify the user who saved, even if they are an ABC Center User
- AND IT MUST NOT fail or roll back the partners save if the emission throws (the error is logged)

#### Scenario: Lead Center added (D-1 reverted (Pivot WCT-T-2, 2026-09-30))
- GIVEN the same result
- WHEN the save newly links XYZ as the lead Center (`is_leading_result` true)
- THEN XYZ's Center Users also get one `Result Center Tagged` notification (the P2-3214 behavior, kept)

#### Scenario: Re-save
- GIVEN ABC is already linked (active or inactive row)
- WHEN partners are saved again
- THEN no new notification is created

### WCT-R-2: Notify on IPSR Innovation Package contributors save (D-3)

The system SHALL apply WCT-R-1 to the IPSR contributors save (`results-package-toc-result` create): every newly tagged Center is notified, `primary` included (A-1 reverted (Pivot WCT-T-2, 2026-09-30)).

#### Scenario: IPSR contributor added
- GIVEN Innovation Package result 9500 owned by SP02, with ABC not linked
- WHEN the step that saves contributing Centers adds ABC with `primary` false
- THEN ABC's Center Users get one `Result Center Tagged` notification for 9500
- AND a Center newly saved with `primary` true is notified too (Pivot WCT-T-2, 2026-09-30)
- AND IT MUST NOT fail the IPSR save if the emission throws

### WCT-R-3: Existing bilateral review tagging keeps firing (amended by design DD-6)

> Amended 2026-09-30. The original "`source = 'Result'` only" filter failed the design's reversion challenge: the SP review of a bilateral result (`results.service.ts:4698`) saves centers through the same partners path and notifies today. Filtering by source would have silenced it.

The system SHALL NOT add a source filter: a contributing Center newly tagged through the partners path on a `source = 'API'` result (SP review) keeps being notified, with the same sentence as WCT-R-5.

#### Scenario: SP reviewer adds a Center to a bilateral result
- GIVEN a result with `source = 'API'` under SP review
- WHEN the reviewer saves contributing centers and ABC is newly linked as non-lead
- THEN ABC's Center Users get one `Result Center Tagged` row reading `SP0x has tagged your CG Center as a contributor (ABC) to result …`
- BUT BCT's Pending Review notifications for that result are unchanged (WCT-R-7)

### WCT-R-4: One notification per user per result

The system SHALL keep the existing rule: a user already holding any tagged-type notification for the result is not notified again, including when two tagged Centers share that user.

#### Scenario: User in two tagged Centers
- GIVEN user U is a Center User of ABC and DEF
- WHEN one save tags ABC and DEF
- THEN U gets exactly one notification

### WCT-R-5: Row sentence for direct-tag rows

The client SHALL render a direct-tag row as: **`{owner SP code}`** `has tagged your CG Center as a contributor ({Center acronym}) to result` followed by the existing `{code} - {title}` result link.

#### Scenario: Mockup row
- GIVEN a direct-tag row for result 9398 owned by SP01 that tags ABC
- WHEN it is shown in the inbox, the Updates list, or the header bell
- THEN the text reads `SP01 has tagged your CG Center as a contributor (ABC) to result 9398 - <title>`
- AND the real-time push (socket) description reads the same sentence (plain text)
- AND `SP01` is emphasized and `9398 - <title>` is the link to the result (IPSR results link to `/ipsr/detail/...`, as today)
- BUT it must NOT contain `The result`, `created by`, or `Click to see the result.`
- AND IT MUST fall back to `a Science Program` when the owner SP code is missing
- AND IT MUST fall back to the Center code when the Center has no acronym (server side, WCT-R-8)

### WCT-R-6: Type chip

The client SHALL label `RESULT_CENTER_TAGGED` rows with the chip `CG Center tagged`, using the existing green "approved" status token pair.

#### Scenario: Chip
- GIVEN any `Result Center Tagged` row (direct-tag, legacy or BCT)
- WHEN it renders in the inbox
- THEN its type chip reads `CG Center tagged` in green
- AND the `W1/W2` funding chip, the result level and type, and the relative time still render as today
- BUT other Updates types keep their current chip label and color

### WCT-R-7: Legacy and BCT rows unchanged

The client SHALL render any `RESULT_CENTER_TAGGED` row whose text is a composed sentence (contains ` has tagged the ` or ends with `Click to see the result.`), or whose text is empty, exactly as today: `The result <link> <text>`.

#### Scenario: Historical row
- GIVEN a row stored before this change with `created by SP01 has tagged the International Center X. Click to see the result.`
- WHEN it renders
- THEN it reads `The result 9398 - <title> created by SP01 has tagged the International Center X. Click to see the result.`

#### Scenario: BCT row
- GIVEN a BCT Pending Review row (`reported by AfricaRice has tagged the CIP. Click to see the result.`)
- THEN it renders as today, and the server still stores that composed sentence byte for byte

### WCT-R-8: Stored text for direct-tag rows

The server SHALL store, as `text` of a direct-tag `RESULT_CENTER_TAGGED` row, only the tagged Center's acronym, or its code when no acronym exists.

#### Scenario
- GIVEN ABC's CLARISA institution acronym is `ABC`
- THEN the stored `text` is exactly `ABC`
- BUT the BCT path (`notifyBilateralContributorsOnSubmission`) still stores its composed sentence

### WCT-R-9: Informational only

The row SHALL open in `view` mode (or open the result) and SHALL NOT offer Accept or Decline or show a pending or "Needs your decision" state.

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| WCT-NFR-1 | Emission is post-persistence and non-fatal on every path (a failure is logged and the save succeeds) |
| WCT-NFR-2 | No migration, no new notification type, no change to API request or response shapes |
| WCT-NFR-3 | Copy lives in an `internationalization/*.copy.ts` file; no hard-coded strings in templates |
| WCT-NFR-4 | Chip colors use existing tokens only (`--pr-status-approved-bg/-fg`) |
| WCT-NFR-5 | Verification runs only scoped Jest suites (memory rule: no full suites) |

### Defect classes and their gates

| Defect class | Caught by |
|---|---|
| Wrong audience (saver or duplicate notified; lead, primary or bilateral review silenced) | Server Jest: `result-tagged-notification.service.spec`, `results_by_institutions.service.spec`, `results-package-toc-result.service.spec` |
| BCT text regression | Server Jest: existing BCT cases, unchanged and green |
| Shape detection misroutes a legacy/BCT row as bare, or the reverse | Client Jest: `notification-type.constants.spec` with one case per shape (bare, composed, legacy, empty) |
| Sentence or chip wrong in a consumer (inbox, Updates item, bell) | Client Jest per consumer spec (DOM text and chip text) |
| Save fails because of emission | Server Jest: emitter throws, save still resolves |
| **Visual match to the mockup** (emphasis, green chip, spacing) | **No automated check.** Jsdom cannot see color or layout. Substitute: a manual browser check at the execute HITL pause against `mockup/center-tagged-row.png` |
| Real recipients in a real environment (role_by_user data) | No automated check. Manual check on prtest after deploy (accepted risk until then) |

## 8. Requirement ID Index

| ID | Title | Proposal source |
|---|---|---|
| WCT-R-1 | W1/W2 partners save notifies newly linked Centers (lead included) | Scope, D-1 (reverted (Pivot WCT-T-2, 2026-09-30)) |
| WCT-R-2 | IPSR contributors save notifies | D-3 |
| WCT-R-3 | Bilateral SP-review tagging keeps firing (amended, DD-6) | Proposal §4, superseded |
| WCT-R-4 | One per user per result | Non-Goals (dedup unchanged) |
| WCT-R-5 | Row sentence | Mockup, D-2 |
| WCT-R-6 | `CG Center tagged` chip | Mockup |
| WCT-R-7 | Legacy and BCT unchanged | R-2 |
| WCT-R-8 | Stored acronym | Option A |
| WCT-R-9 | Informational only | Intent |
| WCT-NFR-1..5 | See §7 | — |

### Assumptions to confirm
- **A-1** (reverted (Pivot WCT-T-2, 2026-09-30)): ~~In IPSR, the `primary` Center plays the role of the lead and is excluded.~~ With D-1 reverted, the `primary` Center is notified like any newly linked Center (user decision).
- **A-2**: The mockup's bold `9398` and blue title are the inbox-revamp link style; this spec keeps the existing link element and does not restyle it.

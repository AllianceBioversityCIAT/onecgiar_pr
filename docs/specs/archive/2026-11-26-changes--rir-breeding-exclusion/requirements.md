# Requirements — RIR breeding exclusion, innovation packages and copy v3

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/rir-breeding-exclusion` |
| Module | `api/replicated-innovation-reminders` (server only) |
| Type | Change |
| Deliverable | software |
| Depth | Standard |
| Approval Mode | gated |
| Status | approved (2026-11-25) · **Pivot P-1 (2026-11-26): RBX-R-7, RBX-R-8 approved by the user 2026-11-26** |
| Ticket | SR-167303 (follow-up of INC-165323) |
| Proposal | `proposal.md`, approved by the user on 2026-11-25 |
| Extends | `archive/2026-10-26-changes--replicated-innovation-reminders` (RIR-R-1, RIR-R-11), `archive/2026-11-23-changes--rir-center-focal-routing` (RCF-R-2) |
| ID prefix | `RBX` |

## 1. Executive Summary

Before Nicoleta releases the 2026 innovation-update reminders (target Fri 27-Nov-2026), the reminder engine changes in three ways:

1. **It excludes listed results.** SP01 breeding lines and varieties are on an exclusion list kept by `result_code`, and B4T updates them itself.
2. **It includes innovation packages.** Packages are replicated, in Editing, in the IPSR phase of the same year.
3. **It sends Nicoleta's v3 copy,** which explains the breeding exclusion.

Everything else in RIR stays the same: routing, campaigns, idempotency, non-prod redirect and the admin page.

## 2. Glossary

| Term | Meaning |
|---|---|
| Reminder universe | The pending set that RIR-R-1 selects. Dispatch, the dry-run preview and the Admin totals all read it |
| Exclusion list | The set of `result_code`s that must never appear in a reminder, each with a reason and an active flag |
| `result_code` | The stable result number shown as "Result ID". It survives replication; `result.id` does not |
| Innovation package | A result of type 10, owned by the IPSR module, whose phases have `app_module_id = 2` |
| Campaign year | The `phase_year` of the Reporting phase the campaign belongs to |
| v2 / v3 copy | v2 = the RIR revision-2 copy plus the linked Result ID (in PROD today). v3 = Nicoleta's 25-Nov copy |

## 3. System Context & Scope

Current behaviour (claims cite or mark):

- The universe is types 2 and 7, replicated, Editing, active, in the bound Reporting phase, with an active owner SP (`pending-innovation.repository.ts:67-93`). Nothing excludes a result by code (same lines).
- Packages are type 10 and live in IPSR phases (`versioning.service.ts:1424-1448`), so they never enter the universe.
- The result link is always the result-detail route (`reminder-dispatcher.service.ts:433`). The type names cover only 2 and 7 (`reminder-dispatcher.service.ts:68-71`).
- Template bodies are v2 (`1791700000000-RIR-RecipientModelV2.ts:292-374`), with the Result ID cell made a link by `1791900000000-RIR-ResultIdHyperlink.ts`, and "bilateral" removed from the Center intro by `1793400000000-RCF-CenterRouting.ts:66-70` (context amended 2026-11-25 during RBX-T-1; no requirement changed).
- The template data exposes `phaseYear` and `nextYear` only (`reminder-dispatcher.service.ts:418-421`).
- Non-type-7 W1/W2 rows go to the P/A MELIA summary (`digest-builder.ts:194-199`, RIR-OQ-7).
- PROD read-only facts, run by the user on 2026-11-25:

  | Fact | Value |
  |---|---|
  | Ruth's 114 codes in today's universe | 113 (66 W1/W2, 47 W3); 28595 already left Editing |
  | Universe size | 1,918 → 1,805 after exclusion |
  | IPSR 2026 (`version_id 9`) replicated packages | 60: 58 Editing, 1 QA, 1 Submitted; all W1/W2, all with an owner SP |

In scope: the selection, the per-result presentation and the template copy.
Out of scope: the items listed in `proposal.md` → Scope (admin UI for the list, routing changes, auto-close, Enrico's disclaimer, client changes).

## 4. Stakeholders / Personas

| Persona | What changes for them |
|---|---|
| Innovation developer (W1/W2) | Breeding results are no longer listed. The copy explains why |
| P/A MELIA focal point | SP01 summaries are shorter. Packages appear in the summary. New copy |
| Center MEL focal point | Breeding results are no longer listed. New Center copy |
| Platform admin (Nicoleta) | Admin > Reminders totals and preview reflect the exclusion and the packages before she schedules |
| B4T MELIA focal point | Not emailed about the excluded results; she updates them herself |

## 5. User Stories

- **RBX-US-1** — As Nicoleta, I want the breeding results B4T maintains left out of every reminder, so that Centers and developers are not asked to update what B4T will update.
- **RBX-US-2** — As Nicoleta, I want replicated innovation packages reminded like other innovations, so that packages also get their 2026 update.
- **RBX-US-3** — As a recipient, I want the email to tell me breeding results are handled by B4T, so that I do not look for them.

## 6. Functional Requirements

### Requirement RBX-R-1: Exclusion list (MUST)

The system MUST keep an exclusion list of `result_code`s, each with a reason and an active flag. A result whose `result_code` has an **active** entry MUST NOT be selected, whatever its type, source, phase, routing, lead Center or Center opt-in (RCF). The list MUST be seeded with exactly the 114 codes of the sheet "Results excluded from notification" (25-Nov-2026), with a reason naming SR-167303.

#### Scenario: Listed results disappear from every message

- GIVEN result codes 24791 (W1/W2, type 7) and 28580 (W3, type 7) are pending under RIR-R-1, and both have active exclusion entries
- WHEN a campaign is dispatched, previewed or counted
- THEN neither code appears in any developer digest, MELIA summary or Center email
- AND they do not appear in the unreachable list or in the pending total
- BUT it must NOT drop any result whose code is not listed.

#### Scenario: Exclusion follows the code across phases

- GIVEN code 24791 exists in Reporting 2025 and, replicated, in Reporting 2026 with a different `result.id`
- WHEN a 2026 campaign is evaluated
- THEN the 2026 row is excluded, because the key is `result_code`.

#### Scenario: Inactive entry does not exclude

- GIVEN an exclusion entry for code X has its active flag off
- WHEN X is pending
- THEN X is selected as before.

#### Scenario: Seed content

- GIVEN the migration has been applied
- THEN the list holds 114 active entries whose codes equal the sheet's codes
- AND IT MUST be idempotent: applying it twice leaves 114 entries, not 228.

### Requirement RBX-R-2: Innovation packages in the universe (MUST)

*(Modifies RIR-R-1.)* A result of type 10 MUST be pending when it is replicated, in Editing, active, has an active owner SP, is not excluded (RBX-R-1), and belongs to an **active IPSR phase whose `phase_year` equals the campaign year**. Types 2 and 7 keep their RIR-R-1 rule unchanged (bound Reporting phase). Packages MUST be classified by source and routed exactly like other non-type-7 results (RIR-R-4 and RIR-OQ-7: W1/W2 to the P/A MELIA summary, W3 to the Center, RCF opt-in first). **Routing clause superseded for W1/W2 packages by RBX-R-7 (Pivot P-1).** Selection is unchanged.

#### Scenario: Package selection

- GIVEN the campaign belongs to Reporting 2026, and IPSR 2026 holds:
  - P1: type 10, replicated, Editing;
  - P2: type 10, replicated, Submitted;
  - P3: type 10, not replicated, Editing;
- AND IPSR 2025 holds P4: type 10, replicated, Editing
- WHEN the campaign is dispatched or previewed
- THEN P1 is pending and listed in its owner SP's MELIA summary
- BUT it must NOT include P2 (not Editing), P3 (not replicated) or P4 (other year)
- AND IT MUST NOT select type 10 rows that sit in a Reporting phase, or type 2/7 rows that sit in an IPSR phase.

#### Scenario: No IPSR phase for the year

- GIVEN no active IPSR phase has the campaign year
- WHEN the campaign is evaluated
- THEN no package is selected, and types 2/7 are selected as before (no error).

### Requirement RBX-R-3: Package presentation (MUST)

In every message that lists a package, its type MUST read "Innovation package", and both its Result ID and its title MUST link to the IPSR detail page of that package in its own phase (`ipsr/detail/<code>/general-information?phase=<package version>`). Other types keep the result-detail link and their current names.

#### Scenario: Package link

- GIVEN package code 9001 in IPSR version 9 is listed
- WHEN the email renders
- THEN the row shows "Innovation package" and both links point to `…ipsr/detail/9001/general-information?phase=9`
- BUT an Innovation Use row in the same email MUST still point to `…result/result-detail/<code>/general-information?phase=<v>`.

#### Scenario: Unknown base URL shape

- GIVEN the configured results base URL does not end in the result-detail path
- WHEN a package link is built
- THEN the system uses the result-detail form rather than guessing another path (no broken host).

### Requirement RBX-R-4: Email copy v3 (MUST)

*(Modifies RIR-R-11.)* **The breeding paragraph is superseded by RBX-R-8 (Pivot P-1); everything else in v3 stands.** The four RIR templates MUST carry Nicoleta's 25-Nov copy. The shell stays as it is: header, styles, redirect notice, kind label, disclaimer, and the Result ID as a link.

| Template | Change |
|---|---|
| Developer digest (Q4 notice, final reminder) | Intro unchanged. The guidance paragraphs are reworded per v3. **New breeding paragraph.** Closure "at the end of January {nextYear}". Reopen "({nextYear}, {nextYear+1} and beyond)" |
| P/A MELIA summary | Its own greeting kept. Intro = the developer intro ("you have X innovation(s)…"), replacing "no innovation developer … can be reached". Developer column kept. Same paragraphs as the developer digest |
| Center email | Intro "your Center has X innovation(s) reported in {phaseYear-1} that have not yet been updated…". SP column header "Science Program / Accelerator who has approved the result in {phaseYear-1}". Breeding paragraph (Center wording) right after the table. Guidance per v3. Closure "in mid-February {nextYear}". Closing thanks per v3 |

The years MUST derive from the campaign year: `phaseYear-1`, `phaseYear`, `phaseYear+1` and `phaseYear+2`. Template rows that RIR did not create MUST NOT be modified. The subject is unchanged.

#### Scenario: Rendered years

- GIVEN a 2026 campaign
- WHEN a Center email renders
- THEN it says "reported in 2025", "during the 2026 reporting period", "mid-February 2027" and "(2027, 2028 and beyond)"
- AND a developer digest says "end of January 2027" and "(2027, 2028 and beyond)".

#### Scenario: Linked Result ID survives

- GIVEN the v3 templates
- THEN every results row renders the Result ID as a link to the row's own URL (RBX-R-3)
- BUT the copy MUST NOT drop the redirect notice or the automated-message disclaimer.

### Requirement RBX-R-5: Reversible rollout (MUST)

The schema change, the seed and the copy change MUST ship in one migration with a working `down`. The `down` drops the exclusion list and restores the exact v2 bodies, including the linked Result ID cell. The migration MUST be safe to re-run: `up` twice changes nothing more.

#### Scenario: Up, down, up

- GIVEN prdb at v2
- WHEN the migration runs up, then down, then up
- THEN after each up the list holds 114 rows and the 4 bodies are v3
- AND after down the list is gone and the 4 bodies equal v2 byte for byte.

### Requirement RBX-R-6: Counts agree (SHOULD)

The Admin > Reminders pending and unreachable totals, the dry-run preview and the real dispatch SHOULD read the same selection, so that excluded results and packages are reflected identically in all three. RIR already satisfies this through one shared build path; RBX MUST NOT add a second selection.

### Requirement RBX-R-7: Innovation packages go to the Lead contact person (MUST) — Pivot P-1

*(Supersedes the W1/W2 routing clause of RBX-R-2. Source: Nicoleta, 2026-11-26, answer to RBX-OQ-1: "Email should go to Lead contact person, copy P/A MELIA".)* A W1/W2 pending package whose lead Center is not opted in (RCF-R-2 still comes first) MUST be sent to its **Lead contact person** (`result.lead_contact_person_id` → active `ad_users` row, its `mail`), with the active MELIA focal points of its owner SP in copy. It MUST share the per-person email (`DEVELOPER:<email>`) with any innovation that person develops, so a person never gets two emails of one campaign. A PRMS account is NOT required for the lead contact (the field is an AD lookup). When the package has no lead contact with an address, it MUST fall back to the MELIA summary of its SP (RIR-OQ-7), and to unreachable `NO_MELIA` when that SP has no MELIA.

#### Scenario: Package to its lead contact

- GIVEN a W1/W2 package whose lead contact is Lia (active AD row, `lia@x.org`) and whose SP has MELIA m1, m2
- WHEN the campaign is built
- THEN Lia receives one email listing the package, greeted by her PRMS account name if she has one, else her AD display name
- AND m1, m2 are in copy
- BUT if Lia also develops a type-7 innovation of the campaign, both rows are in that single email.

#### Scenario: No lead contact

- GIVEN a W1/W2 package with no lead contact address
- THEN it is listed in its SP's MELIA summary, or is unreachable `NO_MELIA` when the SP has no MELIA.

#### Scenario: Opted-in Center still wins

- GIVEN a package led by an opted-in Center
- THEN it goes to that Center's focal points (RCF-R-2), not to the lead contact.

### Requirement RBX-R-8: Email copy v4 without the breeding paragraph (MUST) — Pivot P-1

*(Supersedes the breeding paragraph of RBX-R-4. Source: Nicoleta, 2026-11-26: "I've removed the breeding info in the notifications. B4T manages communication on this topic to centers".)* The four RIR templates MUST carry v3 minus its breeding paragraph, and nothing else changes. Because v3 is already applied on prdb (migration id 574) and the copy module is frozen, v4 MUST ship as a new migration (`up` = v4, `down` = v3 byte for byte). The breeding results stay excluded from the lists (RBX-R-1).

#### Scenario: No breeding text

- GIVEN the v4 templates
- THEN no template mentions breeding lines, varieties or Breeding for Tomorrow
- AND each v4 body equals its v3 body with exactly that one paragraph removed
- AND the closures still read "end of January {nextYear}" (developer, MELIA) and "mid-February {nextYear}" (Center).

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | The selection runs once per dispatch, preview or admin GET. The added predicates (an indexed `result_code` lookup and the IPSR version subquery) MUST keep it in the same order of time as today. Measure on prdb at the HITL pause; no fixed ms target |
| Security | No new endpoint. Existing admin guard unchanged |
| Privacy / logging | No addresses or codes in logs beyond what RIR logs today |
| Data | One migration with a working `down`. `migration:check` green. Per KZ-changes--replicated-innovation-reminders-2, the seed is checked against PROD read-only before release (done 25-Nov: 113/114 in universe). Re-check the counts after deploy |
| Backward compatibility | No client or `/api/bilateral/*` change. The admin API response shape is unchanged (totals only change value) |

## 8. Defect classes → gate

| Defect class | Gate |
|---|---|
| Exclusion not applied (or applied to the wrong key: `id` instead of `result_code`) | Repository spec asserting the predicate on `result_code` and `is_active`, plus a prdb dry run whose pending count equals a hand SQL count (HITL) |
| Packages from the wrong phase (Reporting instead of IPSR, other year) | Repository spec asserting the type-10 branch keys on `app_module_id = 2` and the year join, plus a prdb count of type-10 rows vs a hand SQL count |
| Types 2/7 accidentally widened to IPSR phases, or package rows leaking into 2/7 | Repository spec: the 2/7 branch stays bound to `version_id = ?` |
| Wrong link or type name for a package | Unit spec of the URL helper over both base-URL shapes, plus a dispatcher spec rendering a package row |
| Wrong years in copy | Dispatcher spec on the template data (`previousYear` … `nextNextYear`), plus a migration spec rendering each v3 body with Handlebars and a fixed year |
| Copy deviates from Nicoleta's text | **No automated check of wording.** Substitute: PRTest send of each message type to the redirect address, reviewed by the user (and Nicoleta) at the HITL pause |
| `down` does not restore v2 exactly | Migration spec comparing the `down` bodies with the v2 builder output, plus a prdb up/down/up check (HITL) |
| Seed duplicates or misses codes | Migration spec: the seed holds the 114 sheet codes, unique, and the insert is idempotent |
| A compile-only error (types) | `npm run build` (server) |

## 9. Dependencies & Assumptions

| ID | Item | Default if unanswered |
|---|---|---|
| RBX-OQ-1 | Packages routing = P/A MELIA (asked Nicoleta 25-Nov) | **Answered 26-Nov: No — To = Lead contact person, CC = P/A MELIA. Default changed → Pivot P-1, RBX-R-7** |
| RBX-OQ-2 | The January vs mid-February closure difference is intentional (asked) | **Answered 26-Nov: yes, intended (W3/bilateral can be updated until 10 Feb). Default kept** |
| RBX-OQ-3 | About 35 SP01 "Not an innovation" rows: exclude too? (asked) | **Answered 26-Nov: no, keep them in the notification. Default kept** |
| RBX-OQ-4 | The breeding paragraph shown in red | **Superseded 26-Nov: the paragraph is removed altogether → Pivot P-1, RBX-R-8** |
| RBX-OQ-5 | Nicoleta says "116 breeding results"; the sheet seeded holds 114 codes | Open. Keep 114; adding codes later is a row insert (no code change) |
| RBX-OQ-6 | Center closure text: "mid-February" (her copy) or "10 February" (her answer) | Open. Keep her copy ("mid-February") |
| DEP-1 | Cristian promotes staging → master in time for Fri 27-Nov | Escalate to the user if not |
| DEP-2 | The first real send happens only after Nicoleta sees the PRTest render | Inherited from RIR |

## 10. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| RBX-R-1 | Exclusion list | MUST |
| RBX-R-2 | Innovation packages in the universe | MUST |
| RBX-R-3 | Package presentation | MUST |
| RBX-R-7 | Innovation packages go to the Lead contact person (Pivot P-1) | MUST |
| RBX-R-8 | Email copy v4 without the breeding paragraph (Pivot P-1) | MUST |
| RBX-R-4 | Email copy v3 | MUST |
| RBX-R-5 | Reversible rollout | MUST |
| RBX-R-6 | Counts agree | SHOULD |

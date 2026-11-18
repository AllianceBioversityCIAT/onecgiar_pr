# Proposal — Center focal point routing for replicated-innovation reminders

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/rir-center-focal-routing` |
| Slug | `rir-center-focal-routing` — derived from free-text argument |
| Type | Change |
| Deliverable | software |
| Approval Mode | gated |
| Requirement source | Freshservice SR-167303 (Enrico Bonaiuti 2026-10-28, Santiago options email 2026-11-04, Nicoleta approval of option 2 on 2026-11-11). Visual source: none (existing admin screen) |
| Parent work | `docs/specs/archive/2026-10-26-changes--replicated-innovation-reminders` (RIR, INC-165323, revision 2) |
| Depends on | none (RIR is in PROD via PR #786) |
| Parallel-safe | yes |
| Date | 2026-11-13 |
| Deadline signal | Nicoleta plans to send the reminders in the week of 2026-11-16. The ticket is due 2026-11-14 |

## Intent

Let a Center that already runs its own follow-up (ICARDA first) receive **one** reminder email that lists all of its pending replicated innovations, W1/W2 and W3. Today its developers are contacted directly. The PMU should also manage the Center focal point list from Admin instead of through migrations.

## Problem / Current Behavior

| # | Today | Evidence |
|---|---|---|
| 1 | Only bilateral rows (`source = 'API'`) go to the Center focal point. W1/W2 Innovation Development rows go to each developer with an active PRMS account, with the P/A MELIA focal points in CC. W1/W2 rows with no developer, and Innovation Use rows, go into a MELIA summary per P/A | `digest-builder.ts:175-200` |
| 2 | Center focal points are looked up only for the lead Centers of bilateral rows | `reminder-dispatcher.service.ts:205-210` |
| 3 | The Center email has no CC | `digest-builder.ts:255-263` (`cc: []`) |
| 4 | The `center_mel_focal_point` list can only be changed with a migration or SQL. No API or Admin UI exists. The controller exposes only `campaigns` endpoints | `1791800000000-RIR-SeedCenterMelFocalPoints.ts`; `replicated-innovation-reminders.controller.ts` |
| 5 | ICARDA has a single focal point: Enrico Bonaiuti. Joren Verbist is not listed | seed line 117 |
| 6 | The lead Center is already resolved for every pending row, W1/W2 included (`is_leading_result = 1`) | `pending-innovation.repository.ts:46,65,85` |
| 7 | The Center template copy may say "bilateral" | `1791700000000-RIR-RecipientModelV2.ts:121` (template description). Body text `UNVERIFIED — confirm at source before relying on it` |

## Proposed Outcome

- The PMU can mark a Center as **"Center focal point receives all reminders"** (opt-in, off by default).
- For an opted-in Center, every pending replicated innovation that the Center leads is listed in **one** `CENTER:<code>` email to its active focal points:
  - W1/W2 Innovation Development
  - W1/W2 Innovation Use
  - W3
- That email CCs the P/A MELIA focal points of the W1/W2 rows. The Center's developers get no email for those innovations.
- Centers that do not opt in behave exactly as today.
- From Admin (Phase management → Reporting, next to the campaigns), the PMU can:
  - list, add, replace or deactivate Center focal points;
  - toggle the opt-in per Center.

## Scope

| In | Out (Non-Goals) |
|---|---|
| Per-Center opt-in flag (new small table or column) + migration | The Center review workflow before P/A submission (SR point 4, a separate project) |
| `build()` routing change + dispatcher center lookup for opted-in Centers | The developer role check lists (SR point 3, a data task outside this spec) |
| CC = P/A MELIA of the W1/W2 rows in the Center email | Excluding a Center from reminders entirely (option 1, rejected) |
| Admin API + UI: focal point CRUD (soft deactivate) and opt-in toggle | Admin editing of the P/A MELIA focal point list |
| Preview drawer shows the new routing (counts per type already exist) | Changing the developer or MELIA email copy |
| Center template copy, if it says bilateral-only (needs Nicoleta's OK) | Per-P/A exclusions |

## Affected Users, Systems, And Specs

- **PMU admin (Nicoleta):** manages the list and the toggle, then runs the campaign.
- **Center focal points (ICARDA):** receive a larger email.
- **Developers of opted-in Centers:** no longer receive email.
- **Server:** `api/replicated-innovation-reminders/` (digest-builder, dispatcher, pending repository, controller, new DTOs), plus 1–2 migrations.
- **Client:** `admin-section/pages/phase-management/components/replicated-innovation-reminders/`, `results-api.service.ts`, interface, copy file.
- **Not affected:** `/api/bilateral/*`. No W3 form or payload changes, so the W3/Fetcher rule does not apply.

## Visual Reference

- Source: None.
- Notes: a small table plus a toggle inside the existing reminders panel. Built with Spartan components that already exist in the app (per user feedback). No mockup needed.

## Requirement Delta Preview

### ADDED Requirements
- A Center can be opted in to receive all of its pending replicated innovations (W1/W2 + W3). Default: off.
- The admin can list, add, replace and deactivate Center focal points per Center, and toggle the opt-in. Admin-only (same guard as campaigns).
- An opted-in Center with no active focal point → its rows are reported as unreachable `NO_CENTER_MEL`. They never fall back silently to developers.

### MODIFIED Requirements
- W1/W2 routing: if the row's lead Center is opted in → `CENTER:<code>`. Otherwise → unchanged (developer / MELIA summary).
- The Center email CC goes from none to the P/A MELIA focal points of its W1/W2 rows. W3-only Center emails keep no CC.

### REMOVED Requirements
- None.

## Approach Options

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Opt-in table + routing in `build()` + Admin CRUD** (recommended) | New `center_reminder_routing (center_code PK, route_all_to_center)`. The dispatcher loads opted-in codes and passes them to `build()`. New `center-focal-points` endpoints + panel section | Pure function stays testable. Small, explicit, auditable. The list becomes PMU-owned | Needs both server and client work (≈1.5–2 days) |
| B. A flag column on `center_mel_focal_point` | Opt-in = any row with the flag | One less table | The flag sits on contact rows, not on the Center. Ambiguous when contacts disagree |
| C. Server only now, list maintained by SQL | Routing + seed ICARDA opt-in by migration | Fastest (≈0.5 day), meets next week's send | Does not deliver the Admin CRUD promised in the 2026-11-04 email. PMU depends on dev for every change |

## Recommended Approach

**Option A, delivered in two slices inside one spec:**
1. **Server routing + opt-in table + ICARDA seed.** This can ship alone in time for Nicoleta's send.
2. **Admin API + UI.**

If the date gets tight, slice 1 goes to PROD first, and Nicoleta is told the Admin screen follows. The opt-in lives in its own table because it describes the Center, not a contact.

## Risks, Dependencies, And Open Questions

| ID | Item | Owner |
|---|---|---|
| OQ-1 | ICARDA recipient: Enrico, Joren, or both? Asked in the 2026-11-13 reply | Enrico / Nicoleta |
| OQ-2 | Should the Center email also CC the MELIA of the W3 rows' P/As? Proposed: no, to keep W3 as Nicoleta defined it | Nicoleta |
| OQ-3 | Does the Center template copy need a wording change ("bilateral")? Confirm at T-1 by reading `buildCenterTemplate()` | Santiago → Nicoleta |
| R-1 | **Timing:** Nicoleta may press Send now before deploy. The reply asks her to hold. Release still needs Cristian's staging → master promotion | Santiago / Cristian |
| R-2 | The ICARDA email gets large (all ICARDA-led W1/W2 + W3). Share the PROD count before the send, as promised | Santiago |
| R-3 | Routing follows the **lead** Center. An ICARDA developer on another Center's innovation is still emailed. This was already stated in the 2026-11-04 email | — |
| R-4 | Message keys stay `CENTER:<code>`, so the idempotent log of a SENT campaign is unaffected. A campaign already SENT this phase is not re-sent | — |
| R-5 | Local / PRTest tests hit the shared DB and the mailer. The non-prod redirect (RIR-DD-4) must stay on | — |

## Success Criteria

- With ICARDA opted in, the preview shows 0 `DEVELOPER` messages for ICARDA-led innovations and one `CENTER:<ICARDA code>` message with W1/W2 + W3 rows, with MELIA in CC.
- With no Center opted in, the preview output is identical to today (regression test on `build()`).
- An admin can add Joren, deactivate a contact and toggle the opt-in from the UI. A non-admin gets 403.
- PRTest smoke: Send now on a test campaign delivers the redirected Center email with the expected list.

## Next Step

```text
/akili-specify changes/rir-center-focal-routing
```

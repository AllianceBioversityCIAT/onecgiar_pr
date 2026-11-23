# Requirements — Admin › Reminders page (move + redesign)

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/admin-reminders-page` |
| Module code | `ARP` |
| Type | Change |
| Deliverable | software |
| Depth | Standard |
| Approval Mode | gated |
| Status | approved 2026-11-17 |
| Source | `proposal.md` (approved by the user 2026-11-17) |
| Visual source | Design System artifact `https://claude.ai/artifact/GRLArZ732gXdw2gDRJC4Tu` → `project/components/AdminPhaseManagement/preview.html` (sections "Replicated innovation reminders", "Center focal points"), `project/admin-module-redesign.md` rows 6–8 |
| Depends on | `changes/rir-center-focal-routing` (same files; code on qa-dev + perf at `2ffb3e887`, not archived) |

## 1. Executive Summary

Admins get a new **Admin module › Reminders** page with two tabs: **Replicated innovation reminders** and **Center focal points**. Both blocks leave Phase management. While moving, both get the design-system layout: summary cards, a history table with only the actions valid for each row, a delivery bar, a single scheduler with a UTC hint, and a focal-points list with search, filter chips and an On/Off toggle. No server, endpoint or data change.

## 2. Glossary

| Term | Meaning |
|---|---|
| Campaign | One scheduled reminder send (`Q4_NOTICE` or `FINAL_REMINDER`) with status `PENDING`, `SENDING`, `SENT`, `FAILED` or `CANCELLED` |
| Open campaign | A campaign in `PENDING`, `SENDING` or `FAILED`. Only one open campaign per kind may exist (RIR-R-5) |
| Unreachable | A pending result with no address to send to (no MELIA, no Center, no Center focal point) |
| Opt-in / "Receives all reminders" | Per-Center setting from RCF: the Center focal point receives every pending innovation of that Center |
| Focal point | An active contact of a Center that receives the Center email |

## 3. System Context & Scope

Today:

- Reminders render at the end of Admin › Phase management › Reporting (`reporting.component.html:23`), and the focal points render inside the reminders component (`replicated-innovation-reminders.component.html:239`).
- The Admin sidebar lists Tickets dashboard, Phase management, Knowledge products, User management and AI narrative (`reporting-nav-sidebar.component.ts:182-188`); routes come from `adminModuleRouting` (`routing-data.ts:191-228`).
- `GET /api/replicated-innovation-reminders/campaigns` already returns the phase, the campaigns, `pending_total` and `unreachable_total` (`replicated-innovation-reminders.interface.ts:22-27`). Each campaign carries `scheduled_at`, `sent_at` and the four delivery counts (`:7-20`).
- The focal-points endpoint returns, per Center, `route_all_to_center` and its `contacts` with `is_active` (`:106-113`).
- Both components are standalone and inject only `ResultsApiService` (`replicated-innovation-reminders.component.ts:44,49`).

In scope: route, sidebar entry, page shell, tabs, moving both components, re-skinning both, copy keys.
Out of scope: Phase management redesign (hero, phases table, OperationCards), the app shell (rail, environment strip, top bar), any server change, new design tokens.

## 4. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Platform admin / PMU (Nicoleta, PRMS team) | Reminders and focal points move to their own page; the state (pending, unreachable, next send, Centers without focal point) is visible at a glance |
| Result submitters, MELIA, Center focal points | Nothing. Emails are unchanged |

## 5. Functional Requirements

### Requirement ARP-R-1: Reminders entry in the Admin module (MUST)

The system SHALL offer a **Reminders** item in the Admin module navigation that opens `/admin-module/reminders`, admin-only, like its siblings.

#### Scenario: Admin opens Reminders
- GIVEN an admin on any page
- WHEN they open the Admin module menu
- THEN "Reminders" is listed right after "Phase management"
- AND choosing it opens `/admin-module/reminders` with breadcrumb "Admin module › Reminders", a title and a one-line description
- AND the menu shows "Reminders" as the active item on that page

#### Scenario: Non-admin
- GIVEN a user without the admin role
- WHEN they navigate to `/admin-module/reminders`
- THEN the same guard as the other Admin routes blocks them
- BUT it must NOT add a new guard or role rule

### Requirement ARP-R-2: Tabs (MUST)

The page SHALL show two tabs, **Replicated innovation reminders** (default) and **Center focal points**.

#### Scenario: Default and switching
- GIVEN the admin opens the page
- THEN the reminders tab is selected
- WHEN they choose "Center focal points"
- THEN the focal points list shows and the reminders tab content is hidden
- AND both tabs are reachable and switchable with the keyboard

#### Scenario: Missing focal points count
- GIVEN N Centers have no active contact, N > 0
- THEN the focal points tab label shows N with a warning style and an accessible text ("N Centers without a focal point")
- AND IT MUST show no count when N = 0
- AND IT MUST show no count while the focal points are still loading or failed to load

### Requirement ARP-R-3: Removed from Phase management (MUST)

Phase management › Reporting SHALL no longer show the reminders block or the focal points block. Phases and phase operations stay unchanged.

#### Scenario
- GIVEN an admin opens Phase management › Reporting
- THEN the phases table and the phase operations show as before
- BUT it must NOT render the reminders section or the focal points section
- AND it must NOT call the reminders or focal-points endpoints

### Requirement ARP-R-4: Reminders summary cards (MUST)

The reminders tab SHALL open with three cards built from the campaign list response.

#### Scenario: Data loaded
- GIVEN the campaign list returns `pending_total` P, `unreachable_total` U and the phase name
- THEN card 1 shows "Pending replicated innovations", P and the phase name
- AND card 2 shows "Without a reachable recipient", U and a "Fix center focal points" link that switches to the focal points tab
- AND card 2 uses the warning style only when U > 0
- AND card 3 shows the next open campaign by `scheduled_at` (kind, local date and time, relative time) with the actions its status allows (ARP-R-5)

#### Scenario: No open campaign
- GIVEN no campaign is open
- THEN card 3 says no reminder is scheduled and points to the scheduler
- BUT it must NOT show send, cancel or change-date actions

#### Scenario: Loading and error
- GIVEN the list is loading, THEN the cards show skeletons
- GIVEN the list fails, THEN the existing load-error message shows with a retry, and no card shows a number

### Requirement ARP-R-5: Only valid actions per campaign (MUST)

Each campaign SHALL show only the actions its status allows. Disabled placeholder buttons are not rendered.

| Status | Actions shown |
|---|---|
| `PENDING` | Preview email · Change date · Send now · Cancel |
| `FAILED` | Preview email · Send now |
| `SENDING` | none (status only) |
| `SENT` | Send again — only while no other campaign of the same kind is open |
| `CANCELLED` | none |

The table mirrors today's predicates `canEditOrCancel`, `canPreviewOrSend` and `canSendAgain` (`replicated-innovation-reminders.component.ts:162-172`).

#### Scenario
- GIVEN a history row with status S
- THEN it shows exactly the actions in the table for S
- AND every action keeps today's behaviour (same endpoint, same confirmation dialog, same outcome message)
- BUT it must NOT render a button for an action S does not allow
- AND while a request is in flight, visible actions are disabled (today's `busy` rule), not hidden
- AND IT MUST use one visible action plus a `more` menu when a row has more than two actions

### Requirement ARP-R-6: Reminder history table (MUST)

The history SHALL list every campaign with kind, scheduled time, status badge, sent time and delivery.

#### Scenario: Delivery shown as bar + text
- GIVEN a campaign with sent s, unreachable u, skipped k, failed f
- THEN the delivery cell shows a stacked bar and a text such as "16 sent · 4 unreachable"
- AND counts equal to 0 are left out of the text and the bar
- AND failed uses the danger colour, unreachable the warning colour, sent the success colour
- AND a campaign never sent shows "Not sent yet" and no bar

#### Scenario: Sent before its scheduled time
- GIVEN a `SENT` campaign whose `sent_at` is earlier than its `scheduled_at`
- THEN the row shows "Sent manually, before schedule" under the sent time
- BUT it must NOT show that note when `sent_at` ≥ `scheduled_at`

#### Scenario: Times
- THEN times show in the admin's local zone, and a line above the table names the zone and its UTC offset

#### Scenario: Empty
- GIVEN no campaigns exist, THEN the table shows the existing empty message

### Requirement ARP-R-7: Single scheduler with UTC hint (MUST)

The scheduler SHALL be one form with a reminder-type select, a date-time input and a live hint of the UTC send time.

#### Scenario: Schedule
- GIVEN at least one kind has no open campaign
- THEN the select lists only those kinds, the first one selected
- WHEN the admin enters a date-time
- THEN the hint shows their zone, offset and "Sends at HH:MM UTC" for that date (DST-aware, as today)
- WHEN they submit
- THEN the same create request as today is sent for the selected kind
- AND IT MUST keep today's validation and error messages

#### Scenario: Nothing to schedule
- GIVEN both kinds have an open campaign
- THEN the scheduler shows a short note instead of the form

#### Scenario: Send again
- WHEN the admin chooses "Send again" on a sent row
- THEN the scheduler selects that row's kind and shows the existing send-again hint
- BUT it must NOT create a campaign without the admin submitting the form

### Requirement ARP-R-8: Focal points list with search and filters (MUST)

The focal points tab SHALL list every Center with its contacts and opt-in, with a search box and three filter chips.

#### Scenario: Filters
- THEN chips "All", "No focal point" and "Receives all reminders" show their counts
- WHEN the admin selects a chip, THEN only matching Centers show
- AND "No focal point" means no **active** contact

#### Scenario: Search
- WHEN the admin types in the search box
- THEN Centers whose code, acronym, name or contact name/email contains the text (case-insensitive) show, within the selected chip
- AND an empty result shows "No Centers match"

#### Scenario: Rows
- THEN each row shows the Center acronym and full name, active contacts as chips, the opt-in state and an "Edit contacts" action
- AND a Center without an active contact shows a warning badge "No focal point" and an inline "Add contact" that opens the existing contacts editor for that Center
- AND long Center names wrap; the action column stays visible at 1280 px

### Requirement ARP-R-9: Opt-in as an On/Off toggle (MUST)

"Receives all reminders" SHALL be a switch with visible On/Off text, keeping today's instant save.

#### Scenario
- WHEN the admin flips the switch
- THEN the same PATCH as today is sent
- AND the switch shows the server state after the response, and the result is announced in a live region
- BUT it must NOT keep the new state if the request fails; the previous state returns and the error shows
- AND the existing warning for an opted-in Center without an active contact still shows

### Requirement ARP-R-10: Behaviour unchanged (MUST)

All existing reminders and focal-points actions SHALL work as before: schedule, change date, cancel, preview, send now, send again, add, edit, deactivate, reactivate contact, toggle opt-in.

#### Scenario
- GIVEN any of these actions
- THEN the request, confirmation and outcome are the same as before this change
- BUT it must NOT add, remove or change any API call

### Requirement ARP-R-11: Style and copy rules (MUST)

- New styling uses Tailwind utilities, existing `--pr-color-*` tokens and Spartan (`hlm*`) components; in-page icons are `material-icons-round` (the sidebar keeps Lucide like its siblings).
- No new SCSS class and no new colour token or hex value.
- All new user-visible text lives in `src/app/internationalization/`.

## 6. Non-Functional Requirements

| ID | Requirement |
|---|---|
| ARP-NFR-1 | Accessibility: WCAG 2.1 AA text contrast; tabs, chips, switch and menus keyboard-operable with visible focus; status never by colour alone (badge text); icon-only buttons have `aria-label`; saves and sends announced in a live region |
| ARP-NFR-2 | Layout: no horizontal page scroll at 1280 px and 1568 px; tables scroll inside their card below 1024 px |
| ARP-NFR-3 | The page loads the campaigns and the focal points once each on open (no extra requests compared with today) |
| ARP-NFR-4 | Existing `data-testid`s are kept wherever the element still exists; new elements get `arp-*` test ids |

## 7. Defect classes → gate

| Defect class | Gate |
|---|---|
| Wrong action set per status, wrong count/filter logic, wrong "sent before schedule" rule, lost behaviour | Jest component specs (moved + new), scoped, `--maxWorkers=2` |
| Route / sidebar / guard wiring | Jest spec on routes + sidebar link list; PRTest check |
| Compile / template type errors | `npx ng build` (stricter than Jest) |
| Tokens, SCSS, hard-coded copy | Grep gates on touched files (no `#hex`, no new `.scss` classes, no literal English strings outside copy files) |
| Layout (overflow, wrapping, cut-off actions) | **No jsdom check.** Real-browser check on PRTest at 1280 and 1568 px (HITL) |
| Visual fit to the design (spacing, hierarchy) | **No automated check.** HITL visual review against the preview, optionally a T6 screenshot review |
| Contrast | Accepted: tokens are pre-existing; spot-check badge/text pairs at HITL |

## 8. Open Questions

| ID | Question | Default if not answered |
|---|---|---|
| OQ-1 | Sidebar icon | `lucideBellRing` |
| OQ-2 | Link on Phase management saying reminders moved | No link |

## 9. Requirement ID Index

ARP-R-1 Reminders entry · ARP-R-2 Tabs · ARP-R-3 Removed from Phase management · ARP-R-4 Summary cards · ARP-R-5 Valid actions per status · ARP-R-6 History table · ARP-R-7 Scheduler · ARP-R-8 Focal points list · ARP-R-9 Opt-in switch · ARP-R-10 Behaviour unchanged · ARP-R-11 Style and copy · ARP-NFR-1..4


## Amendment 2026-11-18 (user decision after ARP-T-5)

ARP-R-6 and ARP-R-7 change from "local time with a UTC hint" to "UTC with a local hint":

- The scheduler and the "Change date" input are read as UTC. A note says "Please note that the selected time is in UTC." Once valid, a line shows the local equivalent with its date, zone and offset (DST-aware for that instant).
- History times and the Next send card show UTC with a "UTC" suffix; the zone line says times are in UTC and names the admin's zone.
- Reason: admins must not convert time zones or enter their home time by mistake. Implemented by ARP-T-6.

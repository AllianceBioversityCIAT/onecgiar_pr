# Tasks — Admin › Reminders page (move + redesign)

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/admin-reminders-page` |
| Requirements / Design | `requirements.md` (ARP-R-1…11, NFR-1…4) · `design.md` (ARP-DD-1…7, P-1…13) |
| Status | approved 2026-11-17 |
| Budget | 5 tasks · ≈1,450 LOC · 10 review rounds (design §13, revised 2026-11-17 after the tripwire; was ≈850 / 7) |
| Test rules | Every Jest run: `--maxWorkers=2`, scoped `--testPathPattern`, one run at a time on the machine, never the full suite. Before push: `--findRelatedTests` on the changed files |
| Base test command | `cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --no-coverage --testPathPattern="<pattern>"` |

## 1. Pre-flight

- [ ] Branch `qa-development-2026-ss`. Other sessions' changes (`AGENTS.md`, `bilateral-pdf-mds-only`) are not touched or staged.
- [ ] `rir-center-focal-routing` code is committed (`2ffb3e887`). Its archive may still be pending; this spec's moves are recorded in its archive note.

## 2. Task list

### ARP-T-1: Move components, new route, sidebar link, page shell with tabs [x]

- **Type:** frontend structure · **Estimate:** M · **Review:** full (routing + file moves + cross-component outputs)
- **Implements:** ARP-R-1 (both scenarios), ARP-R-2 (both scenarios), ARP-R-3, ARP-R-10 (no API change), ARP-NFR-3, ARP-NFR-4; DD-1, DD-2, DD-3.
- **Scope:**
  - **First steps:** settle **P-12** (does the hidden `hlmTabsContent` stay mounted? read `BrnTabsContent` in `node_modules/@spartan-ng/brain/fesm2022` and the tabs mapping in the Jest brain mock) and **P-13** (how the sidebar marks a link active). Record both in `execution.md`. P-12 false → panels toggled with `[hidden]` (DD-3 fallback).
  - `git mv` the reminders folder to `pages/admin-section/pages/reminders/components/replicated-innovation-reminders/` and `center-focal-points/` one level up to `pages/admin-section/pages/reminders/components/center-focal-points/`. Fix relative imports (copy, interfaces, api service). Specs move with them.
  - Remove `<app-center-focal-points />` from the reminders template and its import (DD-2). Run `grep -n "center-focal\|cfp-" replicated-innovation-reminders.component.spec.ts`; any hit moves to the page spec.
  - Outputs: reminders `fixFocalPoints` (no emitter yet — wired in T-2), focal points `missingCount` (emit after a successful load and after every contacts change; never on loading/error).
  - New `RemindersPageComponent` (standalone): breadcrumb "Admin module › Reminders", `h1`, one-line description, tabs (default tab 1), count pill on tab 2 with accessible text, both panels mounted.
  - Route `reminders` (`loadComponent`) after `phase-management`, before `**`. Sidebar link after Phase management, `lucideBellRing` (register the icon where the sidebar provides Lucide icons).
  - Remove the reminders block and import from `reporting.component.html` / `reporting.module.ts`.
  - Copy: new keys in `internationalization/replicated-innovation-reminders.copy.ts` (page title, description, tab labels, count text).
  - **Design route:** `impeccable-bridge` → existing system (`docs/ux-ui/design.md`), code-led against the artifact preview · stack: `angular-developer`, `spartan`, `tailwind-design-system`.
- **Files:** `routing-data.ts`, `reporting-nav-sidebar.component.ts`, `reporting.component.html`, `reporting.module.ts`, `pages/reminders/reminders-page.component.{ts,html,spec.ts}`, moved folders, copy file.
- **Depends on:** — · **Blocks:** T-2, T-3, T-4
- **Verification:**
  - `--testPathPattern="admin-section/pages/(reminders|phase-management)|reporting-nav-sidebar|routing-data"` green.
  - `npx ng build` green (template types, moved imports).
  - `grep -rn "phase-management/components/replicated-innovation-reminders" src cypress tests` → 0.
  - Page spec: default tab = reminders; `fixFocalPoints` → tab 2 selected; `missingCount` 3 → pill "3" with accessible text; 0 → no pill; no emission → no pill.
  - Routes spec: `adminModuleRouting` has `reminders` and its index is lower than the `**` entry; sidebar `adminModuleLinks[2].path === '/admin-module/reminders'`.
  - Reporting spec/template check: no `app-replicated-innovation-reminders` in `reporting.component.html`.
- **Falsifier:** move the `reminders` route after `**` → routes spec red; emit `missingCount` 0 and render the pill anyway (`@if (count() !== null)`) → page spec red; leave the reporting import → grep/build gate red.
- **Red run:** predicted — greenfield artifact (observed in ARP-T-1: page spec red before the component exists; routes assertion red before the route is added — quote both).
- **Disqualifier:** a green page spec that never mounts the real focal-points component **and** never asserts the output wiring in the template (a fragment test) is not evidence for DD-2/DD-3 — the spec must render the real page template with stubbed children exposing the outputs.
- **Consumers:** `reporting.component.html:24`, `reporting.module.ts:7` (P-10). No Cypress/other spec (P-10 grep as run).
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`, `impeccable-bridge`.
- **Done:**
  - [x] P-12, P-13 settled and recorded.
  - [x] Red runs quoted, then green.
  - [x] Falsifiers executed and observed red.
  - [x] `ng build` green; moved specs green.

### ARP-T-2: Reminders tab — summary cards, history, delivery bar, row actions [x]

- **Type:** frontend UI + view logic · **Estimate:** M · **Review:** full (action visibility is behaviour)
- **Implements:** ARP-R-4 (3 scenarios), ARP-R-5 (incl. BUT no button for disallowed, AND busy → disabled), ARP-R-6 (4 scenarios), ARP-R-10, ARP-R-11, ARP-NFR-1 (status by text, aria-labels, live region kept); DD-6, DD-7.
- **Scope:**
  - Cards from `list()`: pending (P + phase), unreachable (U, warning style only if U > 0, link emits `fixFocalPoints`), next send (`nextCampaign` = earliest open by `scheduled_at`; its allowed actions; "no reminder scheduled" state with no actions). Skeletons while loading; existing load error + retry.
  - History: kind, scheduled (local), `hlmBadge` status, sent at + "Sent manually, before schedule" when `sent_at < scheduled_at` (strict), delivery via new `DeliveryBarComponent`, actions per DD-6 (visible from P-5 predicates ignoring `busy`; `disabled` while `busy`; PENDING → Send now + `more_vert` popover with Preview / Change date / Cancel). Zone line above the table.
  - `DeliveryBarComponent`: segments and text only for counts > 0; "Not sent yet" when not sent.
  - Token mapping per design §6.4; no `#hex`, no new SCSS.
  - **Design route:** `impeccable-bridge` → existing system, code-led against preview "Replicated innovation reminders" · stack: `angular-developer`, `spartan`, `tailwind-design-system`.
- **Files:** reminders component `.html/.ts/.spec.ts`, `delivery-bar/delivery-bar.component.{ts,spec.ts}`, copy file.
- **Depends on:** T-1 · **Blocks:** T-5
- **Verification:**
  - `--testPathPattern="admin-section/pages/reminders/components/replicated-innovation-reminders"` green.
  - Spec table: for each status (PENDING, FAILED, SENDING, SENT kind free, SENT kind open, CANCELLED) assert the exact rendered action testids and that no other action testid exists.
  - `busy = true` on a PENDING row → actions rendered and `disabled`.
  - sent-before-schedule: `sent_at` < / = / > `scheduled_at` → note shown / hidden / hidden.
  - DeliveryBar: (16,4,0,0) → text "16 sent · 4 unreachable", 2 segments; (0,0,0,0, not sent) → "Not sent yet", 0 segments; (1,0,0,2) → includes "2 failed".
  - Cards: U = 0 → no warning class; U = 4 → warning class; link click → `fixFocalPoints` emitted once; no open campaign → card 3 has no action testids.
  - `npx ng build` green.
  - Grep gate on touched files: `grep -nE "#[0-9a-fA-F]{3,6}\b" <touched html/ts>` → 0.
- **Falsifier:**
  - Render actions from `canPreviewOrSend` for SENT too → status-table spec red.
  - Use `<=` for sent-before-schedule → "equal" row red.
  - Drop the zero filter in DeliveryBar → "16 sent · 4 unreachable" assertion red (text gains "0 skipped").
  - Gate visibility on `busy` (hide while busy) → busy spec red.
- **Red run:** the status-table and busy specs must be observed red against the T-1 template (which still renders disabled buttons for every action) — quote the failing assertion. DeliveryBar: predicted — greenfield artifact (observed in ARP-T-2).
- **Disqualifier:** a spec that checks `disabled` attributes instead of presence does not prove ARP-R-5's "not rendered"; a DeliveryBar check on class names instead of rendered segment count and text is a presence assertion only.
- **Consumers:** existing `rir-*` testids in the moved spec (kept or re-asserted); no consumer outside the folder (P-10).
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`, `impeccable-bridge`.
- **Done:**
  - [x] Red on assertions quoted, then green.
  - [x] All four falsifiers executed and observed red.
  - [x] `ng build` green; hex grep 0.

### ARP-T-3: Reminders tab — single scheduler with UTC hint [x]

- **Type:** frontend UI + view logic · **Estimate:** S · **Review:** checklist (one form, logic reuses `schedule(kind)`)
- **Implements:** ARP-R-7 (3 scenarios incl. BUT no create without submit, AND IT MUST keep validation); DD-5.
- **Scope:**
  - One form `rir-schedule`: `native-select` `arp-schedule-kind` over `missingKinds()`, `scheduleKind` signal (first missing kind; reset when it stops being missing), datetime input `rir-draft-<kind>`, hint (zone, offset, "Sends at HH:MM UTC" for that date via the existing DST-aware util), submit `rir-submit-<kind>` → existing `schedule(kind)`.
  - Both kinds open → note instead of the form.
  - "Send again" sets `scheduleKind` to the row's kind and shows the existing hint; no request until submit.
  - Copy for the UTC part of the hint.
  - **Design route:** `impeccable-bridge` → existing system, code-led against preview scheduler strip · stack: `angular-developer`, `spartan`, `tailwind-design-system`.
- **Files:** reminders component `.html/.ts/.spec.ts`, `reminder-time.util.ts` (+ spec) only if a UTC formatter is missing, copy file.
- **Depends on:** T-2 (same template) · **Blocks:** T-5
- **Verification:**
  - Same pattern as T-2, green.
  - Specs: both missing → select has 2 options; one open → 1 option (the free kind); none missing → note, no form. Send again on a SENT Q4 row → select = `Q4_NOTICE`, no POST spy call until submit. Hint for `2026-12-02T09:00` at offset −300 → contains "14:00 UTC"; a date across a DST boundary uses that date's offset (existing `REMINDER_TZ_OFFSET_MINUTES` stub).
  - Submit → `POST_reminderCampaign` called once with the selected kind and the same ISO as today's util.
  - `npx ng build` green.
- **Falsifier:** compute the UTC hint with today's offset instead of the entered date's → DST spec red; list all `KINDS` in the select → "one open" spec red; call `schedule` on "Send again" → "no POST until submit" red.
- **Red run:** the select/hint specs observed red against the T-2 template (per-kind forms, no select) — quote the assertion.
- **Disqualifier:** a hint test using a stub offset equal on both dates cannot catch the DST falsifier; the fixture must use two different offsets.
- **Consumers:** existing per-kind schedule specs in the moved spec file (split where one test filled both forms).
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`, `impeccable-bridge`.
- **Done:**
  - [x] Red quoted, then green.
  - [x] Three falsifiers observed red.
  - [x] `ng build` green.

### ARP-T-4: Center focal points tab — search, chips, rows, switch [x]

- **Type:** frontend UI + view logic · **Estimate:** M · **Review:** full (filter logic + switch a11y + output)
- **Implements:** ARP-R-8 (3 scenarios), ARP-R-9 (incl. BUT rollback on failure), ARP-R-2 count source (`missingCount`), ARP-R-10, ARP-R-11, ARP-NFR-1, ARP-NFR-2 (wrap + action visible); DD-4, DD-7.
- **Scope:**
  - Toolbar: search `hlmInput` (`arp-fp-search`) + chips `arp-fp-chip-all|missing|optin` with counts. `filter` + `query` signals; `visibleCenters` = chip filter ∧ case-insensitive match over code, acronym, name, contact name, contact email. Empty → "No Centers match".
  - Rows: acronym + full name (wrap, keep the RCF-T-4 overflow fix), active contacts as pill chips with initials, `missing` = no **active** contact → warning badge "No focal point" + "Add contact" link button (`arp-fp-add-<code>`) opening the existing dialog for that Center; "Edit contacts" action kept.
  - Switch per DD-4: `button role="switch"`, `aria-checked`, On/Off text, keeps `cfp-*` toggle testid, calls existing `toggleRouting`. Result announced in an `aria-live="polite"` region.
  - `missingCount` emitted after load and after any contacts/opt-in change.
  - **Design route:** `impeccable-bridge` → existing system, code-led against preview "Center focal points" · stack: `angular-developer`, `spartan`, `tailwind-design-system`.
- **Files:** focal points `.html/.ts/.spec.ts`, copy file.
- **Depends on:** T-1 · **Blocks:** T-5 · Parallel with T-2/T-3 (different files) — but one Jest run at a time.
- **Verification:**
  - `--testPathPattern="admin-section/pages/reminders/components/center-focal-points"` green.
  - Fixture (5 Centers): A 2 active; B 0 contacts; C 1 inactive only; D opted-in with 1 active; E name "International Potato Center", contact "alessandra@…". Chips → all 5 · missing 2 (B, C) · opt-in 1 (D). Search "potato" → E; "ALESSANDRA" → E; "potato" with chip "missing" → none + empty text.
  - `missingCount` emitted 2 after load; after reactivating C's contact → 1; on load error → no emission.
  - Switch: click → PATCH once, `aria-checked` flips; PATCH error → `aria-checked` returns to previous and the row error shows.
  - "Add contact" on B opens the dialog for B.
  - `npx ng build` green; hex grep 0 on touched files.
- **Falsifier:** count "missing" as `contacts.length === 0` → C not counted → "missing 2" red; drop the lowercase in search → "ALESSANDRA" red; remove the rollback line in the switch path → error spec red.
- **Red run:** chip/search/switch specs observed red against the T-1 template (no toolbar, checkbox) — quote the assertion.
- **Disqualifier:** a fixture with no Center that has only inactive contacts cannot tell `active` from `any` (inert fixture) — Center C is mandatory.
- **Consumers:** existing `cfp-*` testids in the moved spec; page spec from T-1 (consumes `missingCount`).
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`, `impeccable-bridge`.
- **Done:**
  - [x] Red quoted, then green.
  - [x] Three falsifiers observed red.
  - [x] `ng build` green; hex grep 0.

### ARP-T-5: PRTest visual + behaviour check (HITL) [x]

- **Type:** manual verification · **Estimate:** S · **Review:** skip-eligible — claim to prove: every step below recorded with evidence in `execution.md`, no code changed
- **Implements:** ARP-NFR-2 and the layout/visual defect classes (requirements §7), ARP-R-1 live path, ARP-R-3 live.
- **Scope:** after the user pushes to perf/PRTest (no agent push without the user's go-ahead):
  1. Sidebar shows Reminders after Phase management; opens the page; active state.
  2. Phase management › Reporting has no reminders block.
  3. Both tabs at 1280 px and 1568 px (effective CSS px, browser zoom 100 %): confirm Poppins and `material-icons-round` are loaded first (icons render as glyphs, not ligature text); record the baseline page `scrollWidth` vs `clientWidth`; then no horizontal page scroll, action columns fully visible, long Center names wrap (bounding-rect of the action cell contained in its card rect).
  4. Visual review against the preview (hierarchy, spacing, badges, delivery bar).
  5. Read-only actions only: open preview drawer; switch tabs; search/filter; keyboard: open a PENDING row `more_vert` menu, Tab moves focus into it, Escape closes it and returns focus to the trigger (ARP-NFR-1, carried from the ARP-T-2 FAIL, 2026-11-17). **Never** click Send, Cancel, Change date, toggle or contact edits on PRTest (shared DB + mailer) unless the user decides to.
  6. Check campaign 12 state: it must be cancelled before 2026-11-18 (RCF-T-5 note) — remind the user, do not cancel it yourself.
- **Depends on:** T-2, T-3, T-4
- **Verification:** screenshots + rect readings in `execution.md`.
- **Falsifier:** a page that overflows at 1280 px → step 3 fails (this is what happened in RCF-T-5).
- **Red run:** n/a — manual check.
- **Disqualifier:** a check on a served bundle older than the pushed commit (verify the bundle hash / a new copy string first); a single viewport.
- **Consumers:** none.
- **Skills:** `claude-in-chrome` (read-only).
- **Done:**
  - [x] 6 steps recorded (step 5 drawer + more_vert keyboard deferred: no pending campaign on PRTest).

### ARP-T-6: Scheduler and history in UTC, with the local equivalent (user decision 2026-11-18) [x]

- **Type:** code · **Estimate:** S · **Review:** required (time conversion = logic)
- **Implements:** ARP-R-6 and ARP-R-7 as amended 2026-11-18 (see requirements.md, "Amendment 2026-11-18").
- **Why:** the user does not want admins to convert time zones in their head, or to enter their home time by mistake. The reference time is UTC, written once and shown everywhere; the admin's local time is only an aid.
- **Scope (client only, `replicated-innovation-reminders` component, its copy, its specs, `reminder-time.util` if needed):**
  1. The scheduler date-time input is read as **UTC**. Label "Date and time (UTC)". `scheduled_at` sent = the entered wall-clock with `Z` (no local offset applied).
  2. Under the input, a note always visible: "Please note that the selected time is in UTC." And, once the value is valid, a live line with the local equivalent: "= {date, time} in your local time ({zone}, {UTC±hh:mm})" — date included, so a day change is visible; offset of THAT instant (DST-aware).
  3. Remove the old hint "Your local time (…). The server runs in UTC." and "Sends at HH:MM UTC" (replaced by 2).
  4. Inline "Change date" edit: same rule — prefilled with the UTC wall-clock of `scheduled_at`, saved as UTC, same note + local-equivalent line.
  5. History "Scheduled for" and "Sent at", and the Next send card: shown in **UTC** with a "UTC" suffix (e.g. "Nov 18, 2026, 12:00 PM UTC"). Zone line above the table: "Times are shown in UTC. Your local time zone: {zone} ({offset})."
  6. Validation unchanged: empty → required; instant ≤ now → past.
- **Depends on:** T-5
- **Verification:** `cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --no-coverage --testPathPattern="pages/admin-section/pages/reminders"` green, plus new cases:
  - entering `2026-11-20T09:00` POSTs `scheduled_at` `2026-11-20T09:00:00.000Z` whatever the admin zone (test with a resolver of +60 and −300);
  - local line for Europe/Rome-like +01:00 shows 10:00 and for Bogota-like −05:00 shows Nov 20 04:00; a value that crosses midnight shows the other date;
  - edit prefill of `2026-11-20T09:00:00Z` = `2026-11-20T09:00`;
  - history cell renders the UTC time with the "UTC" suffix.
- **Falsifier:** an admin in UTC+1 who types 09:00 gets a campaign at 08:00Z → FAIL.
- **Consumers:** server unchanged (already stores UTC). No API change.
- **Skills:** `angular-developer`, `tdd`.
- **Done:**
  - [x] UTC input + note + local line (schedule and edit)
  - [x] history, Next send card and zone line in UTC
  - [x] tests green, `--findRelatedTests` green

## 3. Coverage (scenario / clause level)

| Requirement · scenario / clause | Task |
|---|---|
| R-1 Admin opens Reminders (listed after Phase management, route, breadcrumb, active) | T-1 (spec) + T-5 step 1 |
| R-1 Non-admin — same guard, BUT no new guard | T-1 (routes spec: `reminders` is a child of guarded `admin-module`, no `canActivate` on it) |
| R-2 Default and switching, keyboard | T-1 (spec) + T-5 |
| R-2 Missing count: N>0 pill + accessible text; AND none at 0; AND none while loading/error | T-1 (page spec) + T-4 (`missingCount` not emitted on error) |
| R-3 Phases/ops unchanged; BUT no reminders render; AND no reminder calls | T-1 (template + import removed) + T-5 step 2 |
| R-4 Data loaded (3 cards, warning only U>0, link switches tab) | T-2 |
| R-4 No open campaign; BUT no actions | T-2 |
| R-4 Loading / error | T-2 |
| R-5 Status table; BUT no button for disallowed; AND busy → disabled; AND > 2 → menu | T-2 |
| R-6 Delivery bar + text, zeros omitted, colours, "Not sent yet" | T-2 |
| R-6 Sent before schedule; BUT not when ≥ | T-2 |
| R-6 Times + zone line; Empty | T-2 |
| R-7 Schedule (only missing kinds, hint, same request); AND IT MUST keep validation | T-3 |
| R-7 Nothing to schedule | T-3 |
| R-7 Send again; BUT no create without submit | T-3 |
| R-8 Filters (active-only rule) · Search (+ empty) · Rows (badge, Add contact, wrap at 1280) | T-4 (+ T-5 step 3 for wrap) |
| R-9 Switch same PATCH, server state, live region; BUT rollback on failure; AND warning kept | T-4 |
| R-10 Behaviour unchanged; BUT no API change | T-1 (no api service diff) + T-2/T-3/T-4 (same calls asserted) |
| R-11 Tailwind/tokens/Spartan/icons; no SCSS/hex; copy in i18n | T-1…T-4 (hex grep, no `.scss` in diff, copy keys) |
| NFR-1 a11y | T-1 (tabs), T-2 (badges/aria-labels), T-4 (switch, live region) + T-5 |
| NFR-2 layout | T-5 (only real-browser gate) |
| NFR-3 two requests | T-1 (panels mounted; spec counts API calls on open = 1 each) |
| NFR-4 testids | T-1…T-4 |

## 4. Sequencing

T-1 → (T-2 → T-3) ∥ T-4 → T-5. One Jest run at a time even when T-2/T-4 run in parallel.

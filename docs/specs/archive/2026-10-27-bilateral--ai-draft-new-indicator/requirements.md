# Requirements — Bilateral AI Draft Results: "New" Indicator for Freshly Generated Drafts

## Document Control

| Field | Value |
|---|---|
| **Module** | `bilateral` |
| **Sub-feature** | `ai-draft-new-indicator` |
| **Spec Path** | `docs/specs/bilateral/ai-draft-new-indicator/` |
| **Type** | Enhancement (UX) |
| **Depth** | **Standard** — client-only: one page, one service, one copy file, one folder guide; re-checked against the design budget (`design.md` §Budget) |
| **Approval Mode** | gated (no proposal; created directly by `/akili-specify`) |
| **Requirement prefix** | `ADN` (AI Draft New): `ADN-R-n`, `ADN-AC-n`, `ADN-US-n`, defect classes `ADN-Dn` |
| **Owner** | Maria Camila Giraldo (M.Giraldo@cgiar.org) |
| **Status** | approved (gated, 2026-10-27) — amended after Judgment Day round 1 (`judgment.md` JD-2, JD-3, JD-4, JD-5, JD-7) |
| **Ticket(s)** | — (not provided) |
| **Source of intent** | User request 2026-10-27 + three product decisions taken at the specify gate (see §3.3) |
| **Builds on** | `docs/specs/bilateral/ai-processing-queue/` (`AIQ-*`: jobs list polling, terminal-transition toasts, `?job=` deep link) · `docs/specs/archive/2026-09-14-bilateral--ai-drafts-redesign/` (`BADR-R-8` session grouping) · `docs/specs/archive/2026-09-16-changes--bilateral-ai-draft-filters/` (`BADF-*` filters) |
| **Baseline cited** | `docs/prd.md` US-S1, §5 (AI helpers) · `docs/ux-ui/design.md` §6 listing screens, §7 brand line, §8 pattern 10 (`Matches` badge) & 11 (`Emerging` chip), §10 a11y, DD-9, DD-12 · `docs/trd/trd.md` `bilateral` client module row |

---

## 1. Executive Summary

When AI text mining finishes, the user lands on **AI Draft Results**, which already lists every draft the center still has to decide on. Nothing tells them which drafts came out of the run they just made.

This spec adds a **"New" indicator** to the session group of every AI job **the viewer started** that **this browser saw finish**. The mark is visible as soon as the job completes (the list refreshes itself) and **disappears when the user leaves the Draft Results tab**. It is client-only and changes no draft data, status, or API payload.

---

## 2. Glossary

| Term | Meaning here |
|---|---|
| **Draft** | A row of `bilateral_ai_drafts` shown in the Draft Results tab (`/bilateral/:acronym/drafts`) |
| **Job / AI run** | One AI text-mining submission (`bilateral_ai_jobs`); each draft carries its `job_id` |
| **Session group** | The card that groups the drafts of one job in the list (`BADR-R-8`) |
| **Own job** | A job started by the signed-in viewer |
| **Observed completion** | An own job that the client's job polling saw move from active (`PENDING`/`PROCESSING`) to `COMPLETED` with at least one draft, during the current browser session |
| **Fresh job** | An observed completion that has not yet been consumed by leaving the tab |
| **New indicator** | The visual mark rendered on the session group of a fresh job |
| **Leaving the tab** | Navigating to another bilateral tab, to a result (Create Result), out of the bilateral module, **or switching to another center** while on Draft Results |

---

## 3. System Context & Scope

### 3.1 Current behavior (evidence as run at `c3dd5409c`)

| # | Today | Evidence |
|---|---|---|
| C-1 | The list shows all non-discarded drafts of the center, newest first, grouped by job. A group shows hash, date, creator badge, draft count, project and program, but nothing marks a group as just generated | `onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai.service.ts:741-750` (`order: { created_date: 'DESC' }`); template `my-draft-results.component.html:237-293` |
| C-2 | The client polls the viewer's **own** jobs and detects a job going terminal only when it was seen active before | server `listJobs` `bilateral-ai.service.ts:336-360` (`user_id: userId`); client `detectTerminalTransitions` `bilateral-ai.service.ts:379-392` |
| C-3 | A job completing does **not** refresh the drafts list. The list reloads only on bilateral shell load, center change, Draft Results init, the drawer's "View N drafts", and the toast's "Open drafts" | `grep -rn "loadAllDrafts()" src/app --include='*.ts'` (non-spec) → 5 call sites: `bilateral.component.ts:28`, `ai-processes-drawer-host.component.ts:106`, `my-draft-results.component.ts:357`, `bilateral-ai.service.ts:117,445` |
| C-4 | Only the drawer's "View N drafts" adds `?job=<id>`, which rings the matching group; the toast, bell and email open `/drafts` with no job id | `ai-processes-drawer-host.component.ts:108`; `bilateral-ai.service.ts:446`; `bilateral-ai-notifications.service.ts:190` |

### 3.2 In scope

- A "New" indicator on the session groups of fresh jobs.
- Auto-refresh of the drafts list when an own job completes with drafts.
- Clearing fresh jobs when the user leaves the tab.

### 3.3 Product decisions (user, 2026-10-27)

| Decision | Choice |
|---|---|
| Who sees "New" | **Only the person who started the AI run** (own jobs). Teammates' runs are never marked |
| What counts as new | **Only jobs this browser saw finish during the session.** A reload *after* the job finished, a new tab, or opening the app later from an email shows no mark — accepted. A reload *while the job runs* still marks it, because polling resumes and sees the job finish |
| How long it shows | **Until the user leaves the Draft Results tab** |

### 3.4 Out of scope

- Any server, database, migration, or `/api/bilateral/*` payload change.
- Persisting "seen" state across reloads, devices, or users.
- Changing the drawer's `?job=` ring highlight (`AIQ-R-9` D) — it keeps working and may coexist with the indicator.
- Re-ordering or filtering by "New" (no "Show new only" filter).
- The Draft Results tab badge in the bilateral header.

---

## 4. Stakeholders / Personas

| Persona | What changes for them |
|---|---|
| Result submitter (Center user running AI) | Sees at a glance which drafts came from the run they just finished, without opening each one |
| Other Center members | Nothing — their view of a teammate's run is unchanged |
| QA reviewer, PMU, admin, bilateral consumers | Nothing |

- **`ADN-US-1`** — As a Center user who just ran AI text mining, I want the drafts it produced to be marked as new, so that I can tell them apart from drafts I already had and review them first. *Refines `US-S1`.*

---

## 5. Functional Requirements

### Requirement ADN-R-1: Mark drafts of fresh own jobs as New

The system SHALL show a "New" indicator on the session group of every fresh job, and on no other group.

#### Scenario: Run finishes while the user is elsewhere in the app

- GIVEN the viewer started a job and the client saw it active
- AND the viewer already has drafts from earlier jobs
- WHEN the job completes with 3 drafts and the viewer opens Draft Results (toast, drawer, bell, or tab)
- THEN the session group of that job shows the New indicator
- AND the groups of earlier jobs show no New indicator
- BUT it must NOT mark a group whose job completed before the client saw it active (for example, a job already finished at the first poll after a reload)
- AND IT MUST NOT mark a group whose job belongs to another user, even when that job completed during the session

#### Scenario: Failed or empty job

- GIVEN an own job the client saw active
- WHEN it ends `FAILED`, or `COMPLETED` with 0 drafts
- THEN no group is marked (there are no drafts to mark)

#### Scenario: Two own jobs finish in the same session

- GIVEN two own jobs the client saw active
- WHEN both complete with drafts before the viewer opens Draft Results
- THEN both session groups show the New indicator

### Requirement ADN-R-2: Indicator appears as soon as the job completes

The system SHALL make the drafts of a newly completed own job visible in the list, already marked, without a manual reload.

#### Scenario: User is on Draft Results when the job completes

- GIVEN the viewer is on Draft Results and an own job is running
- WHEN the polling sees that job reach `COMPLETED` with drafts
- THEN the drafts list refreshes on its own
- AND the new session group appears with the New indicator
- BUT the refresh must NOT clear the active search or filters, and must NOT close an open Review aside

### Requirement ADN-R-3: Indicator clears when the user leaves the tab

The system SHALL forget a fresh job once the user leaves the Draft Results tab while that job's drafts were in the list.

#### Scenario: Leave and come back

- GIVEN a group is shown with the New indicator
- WHEN the viewer navigates to another bilateral tab and back to Draft Results
- THEN the group no longer shows the New indicator

#### Scenario: Actions inside the tab keep the mark

- GIVEN a group is shown with the New indicator
- WHEN the viewer opens Review on one of its drafts, closes it, changes filters, or deletes another draft
- THEN the group still shows the New indicator

#### Scenario: Job finished but the user has not visited the tab yet

- GIVEN a fresh job whose drafts the viewer has not yet seen in the list
- WHEN the viewer moves between other pages (not Draft Results)
- THEN the job stays fresh, and the mark shows on the next visit to Draft Results
- AND IT MUST be lost on a page reload that happens after the job finished (session-only, §3.3)

#### Scenario: Switch center and come back

- GIVEN a group of center A is shown with the New indicator
- WHEN the viewer switches to center B on the Draft Results tab and then back to center A
- THEN the group no longer shows the New indicator

### Requirement ADN-R-4: Indicator design and accessibility

The indicator SHALL be consistent with the existing badge system and readable without color.

- It MUST carry the visible text **"New"**. Color alone is not enough.
- It MUST reuse the existing violet badge pattern (design.md §8 pattern 10), brand tokens, and `material-icons-round`, with the icon `aria-hidden="true"`.
- It MUST expose an accessible name that says what it means (e.g. "New — generated in your latest AI run").
- It MUST NOT push any existing header item (hash, creator, draft count, project, program) out of view or add truncation beyond what the baseline already shows, at 375, 900, 1000 and 1280 px effective CSS px, host zoom 100 % (375/900/1000 render the stacked header; 1280 is the narrowest single-row `xl` layout, because Tailwind `xl` = 80rem resolves against the 16 px initial value in media queries, not against the 12 px root font).
- User-facing strings MUST come from `src/app/internationalization/` (DD-9).

### Requirement ADN-R-5: No data or status change

Showing, refreshing, or clearing the indicator MUST NOT write to the server or change any draft's content, status, `is_discarded`, or order.

#### Scenario: Indicator is display-only

- GIVEN a group with the New indicator
- WHEN the indicator is shown and later cleared
- THEN no `POST`/`PATCH`/`DELETE` request is issued
- AND the drafts and their statuses are unchanged

---

## 6. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | No new HTTP endpoint. At most **one** extra drafts reload per poll cycle in which ≥1 own job completed with drafts. Today that reload is 3 GETs (`…/ai/drafts` plus the project and initiative lookups `loadAllDrafts` already issues) |
| Backwards compatibility | No payload or DB change; `bilateral-result-summaries.en.md` untouched |
| Accessibility | WCAG 2.1 AA text contrast for the badge; visible text label; decorative icon hidden (design.md §10) |
| i18n | New strings in `src/app/internationalization/` |
| Privacy / security | No new storage. Nothing written to `localStorage` |

---

## 7. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `ADN-AC-1` | Own job seen active, plus older drafts | Job completes with drafts, viewer opens Draft Results | Only that job's group shows "New" (`ADN-R-1`) |
| `ADN-AC-2` | Another user's job completes | Viewer opens Draft Results | No group is marked (`ADN-R-1`) |
| `ADN-AC-3` | Own job already terminal at the first poll | Viewer opens Draft Results | No group is marked (`ADN-R-1`) |
| `ADN-AC-4` | Viewer on Draft Results, own job running | Job completes with drafts | List refreshes; new group shows "New"; filters and aside kept (`ADN-R-2`) |
| `ADN-AC-5` | Group shows "New" | Viewer leaves the tab (another tab, or Create Result on **any** draft, which opens the result editor), or switches center, and returns | Mark gone (`ADN-R-3`) |
| `ADN-AC-6` | Group shows "New" | Review open/close, filter change, delete of another draft | Mark kept (`ADN-R-3`) |
| `ADN-AC-7` | Group shows "New" | Rendered at 375 / 900 / 1000 / 1280 px | Visible "New" text, no header overflow, accessible name present (`ADN-R-4`) |
| `ADN-AC-8` | Any of the above | Indicator shown or cleared | No write request issued (`ADN-R-5`) |

---

## 8. Defect Classes and Gates

| Defect class | Gate |
|---|---|
| `ADN-D1` Wrong groups marked (other user, pre-seen terminal, failed/empty, older job) | Jest — service spec for the fresh-job set + component spec for the group flag |
| `ADN-D2` Stale list after completion (no auto-refresh, an older concurrent response overwriting the reload, or refresh dropping filters/aside) | Jest — service spec asserts the reload on completion; component spec asserts filters and aside survive |
| `ADN-D3` Mark cleared too early (Review/filter/delete) or never (leave tab, center switch) | Jest — component spec across destroy/re-create |
| `ADN-D4` Accidental write (indicator triggers a request) | Jest — API service spy asserts no write call |
| `ADN-D5` Compiler-only (typed contract mismatch) | `npx ng build --configuration development` |
| `ADN-D6` Layout / visibility (badge wraps, overflows, clipped at narrow widths) | **No automated layout gate in jsdom.** Substitute: a rendered check by a human at the HITL pause at 375 / 900 / 1000 / 1280 px, baseline header measured first (or a T6 screenshot review) |
| `ADN-D7` Contrast / accessible name | Accessible name and visible text: Jest DOM assertion. Contrast: reuses an existing token pair (`violet-50` / `violet-700`); confirmed visually at the HITL pause |

Accepted risk: the session-only rule (§3.3) means a user who reloads after the job finished, or who opens the app later, sees no mark. This is a product decision, not a defect.

---

## 9. Dependencies & Assumptions

- Depends on the `AIQ` jobs polling (`BilateralAiService`), which runs while a job is active.
- Assumes the jobs list stays scoped to the caller (C-2). If it ever includes teammates' jobs, `ADN-R-1`'s "own job" rule needs a client-side user check (`design.md` Premise Ledger P-1).

---

## 10. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| `ADN-R-1` | Mark drafts of fresh own jobs as New | MUST |
| `ADN-R-2` | Indicator appears as soon as the job completes | MUST |
| `ADN-R-3` | Indicator clears when the user leaves the tab | MUST |
| `ADN-R-4` | Indicator design and accessibility | MUST |
| `ADN-R-5` | No data or status change | MUST |

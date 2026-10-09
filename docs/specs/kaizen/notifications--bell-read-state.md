# Kaizen Entry — notifications/bell-read-state

## Document Control

| Field | Value |
|---|---|
| Spec Path | `notifications/bell-read-state` |
| Date | 2026-10-06 |
| Branch | qa-development-2026-ss (a spec branch: `Default Branch: master`, `Integration Branch: staging`) |
| Archive Run | 1 |
| Approval Mode | gated (the user authorised T-4..T-7 without pauses) |
| Archive | `docs/specs/archive/2026-10-06-notifications--bell-read-state/` |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 7 of 7 planned (no amendments) | tasks.md |
| Reviewer FAIL rework attempts | 1: T-5. Read rows kept an inline black colour on the result reference; the dot used rem `top-4` while the root font-size is 12px | execution.md BRS-T-5 attempt 1 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | 0 (no `/akili-test` run) | — |
| Review rounds | 8 Implementer rounds against a budget of ≤ 10 | execution.md §3 |
| Budget LOC | prod +621 vs ~330 (1.9×) · test +1181 vs ~450 (2.6×), **found only at validate** | validation-report.md §8, execution.md "Validation follow-up" W3 |
| Validation FAIL / WARN | 1 FAIL (a folder guide over its line cap) and 10 WARN at first pass; final 0 FAIL / 2 WARN accepted | validation-report.md |
| HITL | 4/4 PASS. HITL-4 rests on evidence (its after-screenshot was waived by the user). Timing: 86 ms for 182 requests | validation-report.md §9 |

## Lessons

- **KZ-notifications--bell-read-state-1 — The Budget Tripwire was watched for tasks and review rounds, but never for LOC, so a 1.9× prod overrun reached validation unflagged.** (Product + Methodology, Medium)
  - **Root cause:**
    - Design §12 set three budget measures: tasks, LOC, and review rounds.
    - The Leader counted tasks and rounds at every close.
    - Nothing in the close step measured LOC, and no report or log mentioned it until the validate auditor tallied hunks.
  - **What it cost:** the user never got the escalation the tripwire promises, while there was still time to re-scope or accept the overrun.
  - **Evidence:**
    - execution.md §3 Summary ("Within budget", with no LOC line).
    - validation-report.md §8, figure check.
    - execution.md "Validation follow-up" W3.
  - **Standardization:** → P1.
- **KZ-notifications--bell-read-state-2 — "Badge derived only from server truth" was treated as sufficient. It did not say how a confirmed mutation survives an older snapshot that is already in flight.** (Product, Medium)
  - **Root cause:**
    - Design §8.1 made `markRequestSeen` non-optimistic: it flips state only after the PATCH succeeds.
    - `refreshBell()` can start before that PATCH and land after it. When it does, `bellReceived.set(...)` overwrites the confirmed flip, and the badge goes back up by 1 until the next refresh.
    - The decision-row click navigates to the inbox, whose init refreshes the bell. That makes the race reachable on the main path.
    - The generation guard orders refreshes against each other only, not against mutations.
  - **Evidence:**
    - validation-report.md §7 A-e.
    - execution.md BRS-T-4 ADVISORY (Resilience).
    - The race was not observed in HITL-2.
  - **Standardization:** → P2.

## Noted, not a lesson

- The T-5 rem offset (`top-4`) violated an existing rule: client `CLAUDE.md` rule 20, root font-size 12px. The rule already exists, so the miss sits in the brief. The T-6 brief carried it forward as a lesson from T-5, and T-6 passed. If it recurs, make "px, not rem" a standing line in every client Implementer brief.
- A folder guide went over the COMPONENT-DOCS 120-line cap (`shell-topbar/CLAUDE.md`, 115 → 122). This repeats the overflow noted in `bilateral--review-list-source-and-reporter`, which was pre-existing. Here it was this spec's own edit. A `wc -l` check in briefs that edit folder guides would catch it. It is below the lesson bar for one occurrence caused by the spec.
- A concurrent session (`bilateral/resubmit-rejected-result`) worked in the same checkout. It is a recurrence of `KZ-MRF-3` / `bugfix--kpi-count-reconciliation`. The defence held: explicit pathspecs on every commit, plus a check for foreign hunks before staging. One foreign file (`primary-program-request.service.spec.ts`) was caught and excluded.
- Browser automation was unavailable because the extension was not connected. HITL evidence came from user screenshots and read-only DB queries, which was enough. A one-shot real-data falsifier proved the T-2 disqualifier: `seen-all` → `recorded: 182` matched the bell's 182.
- The tasks.md premise that "update rows already guard modifier/middle clicks" was false (design §10.1). See the recurrence in P3.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `.agents/leader.md` → *Rework Loop, Traceability & Escalation* (append) |
| Edit | Add: "At every task close, run `git diff --numstat <spec base>..HEAD` and compare prod and test LOC with design §12. At ≥ 1.5× on either measure, fire the Budget Tripwire, even if task and round counts are inside budget." |
| Severity | Medium |
| Status | pending |
| Upstream | Methodology: `/akili-execute` Step 2.4 *Budget Tripwire* should name LOC measurement as a per-task-close act, not an implied end-of-run one. |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` → Frontend / UX Component Architecture section (append one checklist line) |
| Edit | Add: "If client state is rebuilt from a server snapshot while mutations can be in flight, state how a confirmed mutation survives an older snapshot (e.g. a set of server-confirmed ids applied on every rebuild)." |
| Severity | Medium |
| Status | pending |
| Upstream | — |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `docs/specs/kaizen-log.md` `## Active Lessons` → `KZ-changes--bilateral-review-ux-polish-1` |
| Edit | Recurrence +1. Design §10.1 reversion row claimed update rows "follow the same rule" for modifier/middle clicks. Update rows have no such guard (pop-up `.ts` ~374-388). The claim was never grep-cited, and the T-5 Implementer and the validate auditor caught it. Raise severity one level. |
| Severity | Medium |
| Status | pending |
| Upstream | — |

### P4

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `docs/trd/trd.md` §3 *Notifications & settings* |
| Edit | Append to the bullet: "`ShareResultRequestSeen` (`share_result_request_seen`): per-(request, user) seen fact for the bell, composite PK, cascade FKs (`notifications/bell-read-state`)." |
| Severity | Low |
| Status | pending |
| Upstream | — |

### P5

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `docs/ux-ui/design.md` §8 *PRMS Form UX Pattern* → new numbered pattern after 11 |
| Edit | Add: "**12. Fresh vs read inbox rows**: fresh = bold + 7px `--pr-color-primary-300` dot + sr-only 'Unread' prefix; read = regular `--pr-text-secondary`, status chips at 0.7 opacity; decision affordances (chips, Accept/Decline) never dim; an 'Earlier' separator precedes the first read row (`notifications/bell-read-state`)." |
| Severity | Low |
| Status | pending |
| Upstream | — |

### Factual sweep (root guides)

Swept the root `CLAUDE.md` and `AGENTS.md` for assertions this cycle made false. **None found:** no module list, count, stack line or command they state changed. CodeGraph remains "initialized" (true). A re-index is recommended separately.

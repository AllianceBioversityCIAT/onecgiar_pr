# Kaizen Entry — notifications/bell-quick-inbox

## Document Control

| Field | Value |
|---|---|
| Spec Path | `notifications/bell-quick-inbox` |
| Date | 2026-10-06 |
| Branch | qa-development-2026-ss (spec branch; `Default Branch: master`) |
| Archive Run | 1 |
| Approval Mode | gated |
| Archive | `docs/specs/archive/2026-10-06-notifications--bell-quick-inbox/` |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 12 (6 planned + 6 amendments, T-7…T-12) | tasks.md |
| Reviewer FAIL rework attempts | 5: T-1 (docs), T-3 (BELL-R-9 mark-read gap), T-5 (D-1 same-route hand-off, found in the browser), T-8 (zoom-unaware width, browser falsifier), T-11 (dev-server compile error) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 (6 user-approved spec amendments instead) | execution.md "Spec Amendment" blocks |
| PRODUCT_BUGs | 1: D-1, found in the T-6 browser pass and fixed in T-5 attempt 2 | execution.md — BELL-T-6 D-1 |
| Budget | ~650 LOC planned; large overrun, accepted by the user (option A) | execution.md — Budget tripwire |
| Incidents | 1: an accidental real Accept on the shared DB | execution.md — INCIDENT |
| Validation FAIL / WARN | n/a: no `validation-report.md`; Reviewer advisories recorded per task | — |

## Lessons

- **KZ-notifications--bell-quick-inbox-1 — `ngc --noEmit` was treated as the compile gate, but the esbuild dev server enforces stricter template types and silently keeps serving the last good build.** (Product + Methodology, High)
  - Root cause:
    - Tasks verified with `npx ngc -p tsconfig.app.json --noEmit`.
    - Twice that check passed while `ng serve` failed to compile:
      - T-8 attempt 2: `viewChild<ElementRef<HTMLElement>>(…, { read: ElementRef })`;
      - T-11: `(keydown.escape)="onCardKeydown($event)"` with a `KeyboardEvent` parameter.
    - `ng serve` kept serving the previous build without any visible sign.
    - The Leader verified stale code, and once clicked a state-changing button on a bundle that lacked the task's code.
  - Evidence:
    - execution.md — BELL-T-8 attempt 2 ("This error is what froze the user's `ng serve`");
    - execution.md — BELL-T-11 attempt 2 ("`ngc --noEmit` is not a sufficient compile gate");
    - execution.md — INCIDENT.
  - Standardization: → P1. Recurrence of KZ-bugfix--ipsr-complementary-innovation-modal-overlap-2 (non-esbuild gate vs the esbuild dev server) → P4.
- **KZ-notifications--bell-quick-inbox-2 — The local stack is documented as disposable, but the local server env points at a shared LAN database and the production mailer queue.** (Product, High)
  - Root cause:
    - `docs/infrastructure.md` §6 and root `CLAUDE.md` say "local is disposable".
    - The local server's `.env` uses `DB_HOST` 192.168.20.22 / `prdb`, a remote RabbitMQ, and `EMAIL_QUEUE=cgiar_ms_prod_mailer_queue` (# Prod).
    - A browser check that trusts the doc writes shared data and may send real e-mail. One accept did land: request 4548.
  - Evidence: execution.md — BELL-T-6 environment probe; INCIDENT.
  - Standardization: → P2.
- **KZ-notifications--bell-quick-inbox-3 — Deep-link falsifiers covered only a fresh mount, not a query-param change on an already-mounted page.** (Product + Methodology, Medium)
  - Root cause:
    - The BELL-T-5 falsifier list tested reading `request`/`action` at init.
    - The real hand-off often happens while the inbox is already open, as a same-route navigation, and that path never re-ran `setQueryParams`.
    - jsdom was green; the live browser found D-1.
  - Evidence:
    - execution.md — BELL-T-6 D-1;
    - BELL-T-5 attempt 2 ("The attempt-1 jsdom tests only exercised the initial query-param read").
  - Standardization: → P3.

## Noted, not a lesson

- A T-3 Implementer recorded the BELL-R-9 gap as "unchanged behaviour" under assumptions, and the Reviewer rejected it. This feeds the recurrence check for "an assumption hides a requirement gap".
- The app-wide `html { zoom: 1.15 }` broke the `100vw` maths in T-8. This is related to bugfix/cdk-overlay-root-zoom, archived by another session the same day, which added a global overlay rule.
- A temporary rename (`…TMP`) during a red run broke the user's live `ng serve`. Briefs now forbid temporary renames.
- The spec grew by six amendments in one day (T-7 security, T-8 layout, T-9/T-11/T-12 decision UX, T-10 redesign). All were user-approved and gated.
- The Leader's XHR hook counted Microsoft Clarity analytics POSTs as "writes". Filter by the API host when asserting 0 writes.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/CLAUDE.md` §9 (next to "Never trust a dev server you did not start") |
| Edit | Add: "`ngc --noEmit` is not a compile gate: the esbuild dev server types template `$event`/`viewChild` options more strictly and, after an error, silently keeps serving the last good build. Before any browser check, confirm the served `main.js` (or chunk) contains the task's new symbols." |
| Severity | High |
| Status | pending |
| Upstream | Methodology: recommend that `/akili-execute` browser-verification steps gate on "served bundle contains the change". |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/infrastructure.md` §6 (Local Environment contract), after the "disposable" sentence |
| Edit | Add: "Exception: the shared local `.env` points at the LAN DB `prdb` (192.168.20.22) and the prod mailer queue — local writes are NOT disposable. Browser checks must not click Accept, Decline-confirm, mark-read or any other write control unless the user authorizes that specific write." |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/tasks.md` (Falsifier guidance) |
| Edit | Add: "Deep-link / query-param tasks need a falsifier for a param change on an already-mounted route (same-route navigation), not only a fresh load." |
| Severity | Medium |
| Status | pending |
| Upstream | Methodology: same line for the AKILI tasks template. |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | KZ-bugfix--ipsr-complementary-innovation-modal-overlap-2 |
| Edit | Add the source `notifications/bell-quick-inbox`. Recurrence: a non-esbuild checker (`ngc --noEmit`) passed what the esbuild dev server rejected. This widens the lesson from "CT/webpack vs esbuild CSS" to "any non-esbuild gate vs esbuild". Keep High. |
| Severity | High |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `onecgiar-pr-client/src/CLAUDE.md` L413 (`header-panel/` row) |
| Edit | Replace "Top header with user menu, notifications, phase indicator. — Shell-only." with "Legacy header (not rendered; superseded by `shell-topbar`). Its `pop-up-notification-item` child is reused by the `shell-topbar` bell (bell-quick-inbox)." |
| Severity | Low |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/CLAUDE.md` (shared/components module notes) |
| Edit | Add: "`shell-topbar` bell = quick inbox. Its state is in `ResultsNotificationsService.bell*` (phase-agnostic). Decisions come from `utils/request-decision.ts`, the single source shared with the inbox row. Only one armed confirm button at a time, via `BellAcceptConfirmService`." |
| Severity | Low |
| Status | pending |

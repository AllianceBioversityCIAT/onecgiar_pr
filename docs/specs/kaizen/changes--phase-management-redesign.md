# Kaizen Entry — changes/phase-management-redesign

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/phase-management-redesign` |
| Date | 2026-10-24 |
| Branch | qa-development-2026-ss (spec branch; default is `master`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 7 (6 code + 1 HITL) | tasks.md |
| Reviewer FAIL rework attempts | 4 (T-2, T-3, T-4 and T-5, once each) | execution.md — attempt 1 FAIL entries |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0. One spec conflict (DD-3 vs WCAG) was adjudicated by narrowing | execution.md — PMR-T-4 attempt 1, Leader adjudication |
| PRODUCT_BUGs | — (no test-report) | — |
| Validation FAIL / WARN | — (no validation-report; Reviewer PASS ×6 plus the user's T-7 approval) | execution.md |
| Budget | 7/7 tasks; ~1,100 LOC vs ~450 estimated (2.4×), tripwire fired twice; review rounds 1–2 per task (within budget) | design.md §13; execution.md — budget tripwire entries |
| Drift attributable | none recorded | docs/specs/audits/ |

## Lessons

- **KZ-changes--phase-management-redesign-1 — Accessible names were not in the copy inventory, so two tasks shipped hard-coded `aria-label`s.** (Product + Methodology, Medium)
  - **Root cause:**
    - Design PMR-DD-7 listed every *visible* new string for `phase-management.copy.ts`.
    - Design §6.2 / requirements PMR-R-3 separately required "icon buttons with `aria-label`" and a labelled tab `nav`.
    - No document joined the two. The Implementers satisfied the a11y clause with English literals, and the Reviewer failed T-2 and T-4 on the i18n NFR.
    - Two of the four rework attempts came from this single gap.
  - **Evidence:** execution.md — PMR-T-2 attempt 1 FAIL issue 1; PMR-T-4 attempt 1 FAIL issue 1; design.md PMR-DD-7 vs §6.2.
  - **Standardization:** → P1

## Noted, not a lesson

- **Recurrence of KZ-BOR-1:** design.md §6.3 copied the mockup → token translation without checking it against `onecgiar-pr-client/CLAUDE.md` §5 Hard UI rules. Effects:
  - T-5 failed on rules 7/12 (violet decorative icon tile).
  - T-7 left open decisions: `bg-white` + `shadow-xs` vs rule 10, the `bg-brand-25` row tint vs rule 7, and 9 px chips vs rule 20.
  - → P2
- **Recurrence of KZ-notifications--bell-quick-inbox-2:** the local stack is still described as "disposable". This run found a second hazard: the ungated hourly `ReplicatedInnovationRemindersCron` can dispatch PENDING campaigns through the prod mailer queue from a local `start:dev`. The server was stopped after about 4 minutes, before any tick. → P3
- **LOC overrun driven by tests:** about 400 of the ~1,100 changed lines are new specs, and about 260 are removed SCSS. The same pattern was noted in `bugfix/kp-related-factor-score` (~1.2×). The estimate in design §13 counted templates and SCSS but under-counted specs. The tripwire worked as designed, so this is below the lesson bar.
- **Spec-internal conflict:** PMR-DD-3 froze the edit markup to `class`/`role`/`tabindex`/`aria-label`, while the WCAG NFR needs keyboard activation. The Leader narrowed by removing the optional attributes. The real fix (allowing `(keydown.enter/space)`) is a product follow-up. This is a one-off, not a lesson.
- **Pre-existing CT failure:** the `pr-tooltip` "tooltip pins" case is red at HEAD. The "red at HEAD" baseline probe kept it from being charged to T-4. Worth repeating: always run the HEAD baseline before treating a CT failure as a regression.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` (copy / i18n decision section) |
| Edit | "The copy inventory lists accessible names (`aria-label`, `aria-describedby` text, sr-only labels) alongside visible strings. Any requirement that asks for an accessible name gets a copy key in the same design decision." |
| Severity | Medium |
| Status | pending |
| Upstream | Recommend to the AKILI methodology repo (generic, nothing project-specific) |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-BOR-1` |
| Edit | Add source `changes/phase-management-redesign` as a recurrence. A design §6.3 mockup token table (tile tint, card shadow, row tint, rem text sizes) contradicted client Hard UI rules 7/10/12/20; it caused one Reviewer FAIL (T-5) and left three decisions open at T-7. Keep severity High. This reinforces KZ-BOR-1's pending P1/P2 (Skill Map pointer plus the design-template citation rule) as the fix. |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-notifications--bell-quick-inbox-2` |
| Edit | Add source `changes/phase-management-redesign` as a recurrence. Beyond browser-click writes, simply *running* the local server is a write risk: `ReplicatedInnovationRemindersCron` (`@Cron(EVERY_HOUR)`, no env gate) can dispatch PENDING reminder campaigns through `cgiar_ms_prod_mailer_queue`. The "local is disposable" claim in `docs/infrastructure.md` §6 and in root `AGENTS.md` (AKILI baseline, "Local stack") should name this hazard (stop the server before :00, or prefer PRTest for visual checks). Keep severity High. |
| Severity | High |
| Status | pending |

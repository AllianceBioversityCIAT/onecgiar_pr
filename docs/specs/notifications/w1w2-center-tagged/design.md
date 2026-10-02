# Module Spec — W1/W2 "CG Center tagged" notification — Design

> **Answer first:** the existing direct-tag flow (P2-3214) is extended rather than replaced.
> - **Server:** `notifyTaggedCenters` stores the Center **acronym** as a bare `text`, the same move NOTIF-T-12 made for projects. Callers pass every newly linked Center (lead and primary included, D-1/A-1 reverted (Pivot WCT-T-2, 2026-09-30)), and the IPSR contributors save gets the same hook.
> - **Client:** `getResultNotificationTextParts` composes the mockup sentence for the bare shape and falls back to today's rendering for composed (legacy / BCT) text. A new optional emphasized `lead` part carries the SP code, and the chip becomes a green `CG Center tagged`.
> - No migration, no new type, and no API shape change.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/notifications/w1w2-center-tagged/` |
| Depth | Standard (re-checked in §11: it matches) |
| Status | approved (Santiago, 2026-09-30) |
| Requirements | `requirements.md` (WCT-R-1..9, NFR-1..5). WCT-R-3 was amended by DD-6 (reversion challenge) |
| Skills | `nestjs-expert`, `angular-developer`, `spartan` (chip), `tdd` |
| Delegation | none; designed inline |

## 2. Executive Summary

| Layer | Change | Requirements |
|---|---|---|
| `ResultTaggedNotificationService` | Direct-tag label = `acronym ?? code`. The direct-tag `RESULT_CENTER_TAGGED` row stores the bare label. The `leadIn` path (BCT) is untouched | WCT-R-8, R-7 |
| `ResultsByInstitutionsService.handleContributingCenters` | **No production change** (Pivot WCT-T-2, 2026-09-30): newly linked codes are already collected regardless of `is_leading_result`; T2 adds tests only | WCT-R-1 |
| `ResultsPackageTocResultService.create` | Collects every newly saved Center (primary included (Pivot WCT-T-2, 2026-09-30)), then calls the tagged emitter after the save, non-fatal | WCT-R-2 |
| `notification-type.constants.ts` | Bare-shape sentence for `RESULT_CENTER_TAGGED` + `lead` part + shared composed-text detector | WCT-R-5, R-7 |
| Three row consumers | Render `lead` emphasized before `prefix` | WCT-R-5 |
| `notification-item` | Chip label `CG Center tagged` + green class for that type | WCT-R-6 |

## 3. Architecture Overview

```
W1/W2 partners save ─┐ (results_by_institutions.handleContributingCenters, new rows, lead included)
SP bilateral review ─┤ (results.service:4698 → same path; unchanged trigger, DD-6)
IPSR contributors ───┘ (results-package-toc-result.create, new rows, primary included)   ← NEW hook
        │ post-persist, try/catch
        ▼
ResultTaggedNotificationService.notifyTaggedCenters(resultId, emitter, codes)
        │ label = institution.acronym ?? code
        ▼ emitFor (no leadIn) → text = label (bare)      BCT: emitFor(leadIn) → composed (unchanged)
NotificationService.emitResultNotification (in-app + socket; dedup per user/result unchanged)
        ▼
Client: getResultNotificationTextParts(RESULT_CENTER_TAGGED)
   bare text   → { lead: SP code, prefix: "has tagged your CG Center as a contributor (ABC) to result" }
   composed/empty → { prefix: "The result", suffix: text }   (today)
```

## 4. Extended Directory Structure

| Path | Change |
|---|---|
| `onecgiar-pr-server/src/api/notification/services/result-tagged-notification.service.ts` (+ spec) | modify |
| `onecgiar-pr-server/src/api/notification/notification.service.ts` (+ spec) | modify (socket description case) |
| `onecgiar-pr-server/src/api/results/results_by_institutions/results_by_institutions.service.ts` (+ spec) | modify |
| `onecgiar-pr-server/src/api/ipsr/results-package-toc-result/results-package-toc-result.service.ts` | modify |
| `onecgiar-pr-server/src/api/ipsr/results-package-toc-result/results-package-toc-result.module.ts` | import `NotificationModule` |
| `onecgiar-pr-server/src/api/ipsr/results-package-toc-result/results-package-toc-result.service.spec.ts` | **new**, focused on the hook only |
| `onecgiar-pr-client/src/app/shared/constants/notification-type.constants.ts` (+ spec) | modify |
| `onecgiar-pr-client/src/app/internationalization/notification-center-tagged.copy.ts` | **new** (sentence + chip copy) |
| `.../notification-item/notification-item.component.{ts,html}` (+ spec) | modify |
| `.../update-notification/update-notification.component.html` (+ spec) | modify (`lead`) |
| `.../pop-up-notification-item/pop-up-notification-item.component.html` (+ spec) | modify (`lead`) |

## 5. Data Model

No change. It reuses `notification` (`text`, `type_id` → `Result Center Tagged`), `results_center` (`is_leading_result`, `is_primary`, `is_active`), and `clarisa_institutions.acronym` reached through `clarisa_center.clarisa_institution`. **Shape change of `notification.text` for new direct-tag rows only:** composed sentence → bare acronym/code (WCT-R-8). Old rows are not rewritten.

## 6. API Design

No endpoint, DTO, or response shape changes. `GET` notifications already returns `text`, `obj_result.obj_result_by_initiatives` (owner SP code), `obj_result.source_name`, and type and level, which is everything the client sentence needs.

## 7. Backend Module Design

### 7.1 `notifyTaggedCenters` (WCT-R-8)
- The label becomes `center.clarisa_institution.acronym`, falling back to `center.code` when the acronym is empty or missing.
- `emitFor`'s text rule extends the NOTIF-T-12 branch: when `leadIn` is absent **and** the type is `RESULT_CENTER_TAGGED`, store `target.label` alone. With a `leadIn` (BCT), the composed sentence is unchanged.
- **Socket push text (resolved R-4):** `NotificationService.buildResultNotificationDescription` (`notification.service.ts:1003`) puts `RESULT_CENTER_TAGGED` in the shared suffix group, so a bare acronym would push `The result <code> - <title> ABC`. `RESULT_CENTER_TAGGED` gets its own case mirroring the NOTIF-T-12 project case (`:988`): bare text → `<programCode ?? 'a Science Program'> has tagged your CG Center as a contributor (<text>) to result <code> - <title>`, composed or empty → the existing `buildTaggedSuffixDescription`. It reuses the server twin detector `isComposedProjectTaggedText` (renamed to type-neutral, kept in sync with the client twin).
- `notifyBilateralContributorsOnSubmission` keeps its own `name ?? center_id` label. It does not call `notifyTaggedCenters`, so it needs no edit (verified: lines 216-225).

### 7.2 W1/W2 path audience (WCT-R-1; D-1 reverted (Pivot WCT-T-2, 2026-09-30))
- ~~Lead exclusion.~~ The user reverted D-1 at execute after T2's disqualifier found the P2-3214 test `notifies only the centres that were newly linked` pinning lead notification. `handleContributingCenters` stays as is: every newly linked code, lead included, reaches `notifyTaggedCenters`. T2 pins this with tests.

### 7.3 IPSR hook (WCT-R-2, D-3; A-1 reverted (Pivot WCT-T-2, 2026-09-30))
- In the contributing-center loop of `create`, the `else` branch (new row) records `cenCC.code` for every new row, `primary` included.
- After the loop, and after the surrounding persistence completes, call `ResultTaggedNotificationService.notifyTaggedCenters(rip.id, user.id, codes)` inside try/catch, logging at `error` without rethrowing (WCT-NFR-1). This mirrors `notifyNewlyTaggedCenters` in `results_by_institutions`.
- Inject `ResultTaggedNotificationService` by importing `NotificationModule` into `ResultsPackageTocResultModule`. Its graph (`ShareResultRequestModule` is forwardRef'd, plus `VersioningModule` and `SocketManagementModule`) already appears in this module's providers or imports, so no cycle is expected. If Nest reports one, use `forwardRef(() => NotificationModule)`.
- **Observed quirk, not fixed here:** the existing `update(...)` for an existing row is not awaited (`results-package-toc-result.service.ts:247`). It is out of scope; it is recorded in §10 R-3.

### 7.4 Error handling and observability
- Every emitter call is post-persistence, wrapped in try/catch, and logged with the result id. It never throws to the controller.
- Dedup (`getAlreadyNotifiedUserIds` + in-loop set) and saver exclusion (`notification.service.ts`) are reused unchanged (WCT-R-4).

## 8. Frontend / UX Component Architecture

### 8.1 Text parts contract (WCT-R-5, WCT-R-7)
- `NotificationTextParts` gains an optional `lead` string: an emphasized token rendered **before** `prefix`. Existing types never set it, so their rendering is unchanged.
- The `RESULT_CENTER_TAGGED` case leaves the shared fall-through group (`RESULT_CONTRIBUTION_ACCEPTED/DECLINED`, `BILATERAL_RESULT_SUBMITTED` keep it):
  - Text that is empty, or composed → today's `{ prefix: 'The result', suffix: text }`.
  - Bare text → `{ lead: getProgramCode(n) ?? 'a Science Program', prefix: copy.sentence(label), suffix: null, emphasizePrefix: false }`, where the copy produces `has tagged your CG Center as a contributor (<label>) to result`.
- `isComposedProjectTaggedText` is renamed to a type-neutral `isComposedTaggedText` (same two telltales). The `RESULT_BILATERAL_PROJECT_TAGGED` case keeps using it, so its behavior is identical.

### 8.2 Consumers
- `notification-item.component.html` (Updates row branch), `update-notification.component.html`, and `pop-up-notification-item.component.html`: when `lead` is present, render it in `<b>`, followed by the prefix. That is the only template change in each file.

### 8.3 Chip (WCT-R-6)
- `rowTypeChipLabel`: for `source:'update'` rows whose resolved type is `RESULT_CENTER_TAGGED`, return the copy `CG Center tagged`. Other types keep the raw resolved name.
- `rowTypeChipColorClass`: for the same case return `!bg-[var(--pr-status-approved-bg)] !text-[var(--pr-status-approved-fg)]` (existing tokens, NFR-4). The request-row branches are unchanged.
- It stays the Spartan `hlmBadge variant="secondary"` already in the template, with no new component.

### 8.4 Design tokens (from `mockup/center-tagged-row.png`)

| Element | Token / style |
|---|---|
| `CG Center tagged` chip | `--pr-status-approved-bg` / `--pr-status-approved-fg` |
| `W1/W2` chip | existing `notification_funding_chip` outline |
| SP code | `<b>` (existing emphasis) |
| Result link | existing mono, underlined link (A-2: not restyled) |

### 8.5 Informational only (WCT-R-9)
- A `source:'update'` row already resolves `rowMode = 'view'` and has no decision footer. No change is needed. A Jest assertion pins it.

## 9. Shared Contracts

- `NotificationTextParts.lead?` is additive. No server or client DTO change.
- Copy: `internationalization/notification-center-tagged.copy.ts` exports the chip label and the sentence builder (NFR-3).

## 10. Design Decisions

| ID | Decision | Alternatives rejected | Req |
|---|---|---|---|
| DD-1 | Bare acronym stored + client-composed sentence (proposal Option A) | Server-composed new sentence (copy in backend, the client still prefixes `The result`); client reparse (no acronym available) | R-5, R-8 |
| DD-2 | Shape detection by the composed-sentence telltales, shared with NOTIF-T-12 | A new type (migration + seed); a new flag column (migration) | R-7 |
| DD-3 | ~~Lead or primary exclusion at the callers~~ **Superseded (Pivot WCT-T-2, 2026-09-30):** no audience filter by lead/primary; callers pass every newly linked Center | — | R-1, R-2 |
| DD-4 | New optional `lead` part rather than a fully bold prefix | Bolding the whole prefix contradicts the mockup; putting the SP code unbolded loses the emphasis | R-5 |
| DD-5 | The chip mapping is local to `notification-item` for this type only | Relabeling every Updates type is out of scope | R-6 |
| **DD-6** | **No `source = 'Result'` filter is added.** Every direct-tag row (W1/W2, IPSR, and SP review of a bilateral result) uses the new sentence | The proposal's source guard (see challenge below) | R-3 (amended) |

### Reversion challenges (Step 2.3)

| DD | Reverts | "What does removing this break?" | Outcome |
|---|---|---|---|
| Source guard (originally WCT-R-3) | Notifications for `source='API'` results on the partners path | **Concrete breakage:** `results.service.ts:4698` (the SP review update of a bilateral result) saves centers through `handleContributingCenters`. Today a Center added by the SP reviewer is notified; the guard would silence it, and BCT only covers Pending Review | **Design fixed:** guard dropped (DD-6); WCT-R-3 amended. The sentence ("SP0x has tagged your CG Center…") is accurate for that flow too |
| Lead exclusion (D-1) | The lead Center notified on W1/W2 save | The lead Center loses a "tagged" row about its own lead role. The reviewer path's lead is the reporting Center, so nothing of value is lost. ~~No test asserts lead notification~~ **Wrong:** T2 found `notifies only the centres that were newly linked` asserting a new lead (CIM) is notified | **Reverted by the user (Pivot WCT-T-2, 2026-09-30)** |
| Composed → bare text | The stored sentence for direct-tag rows | Any reader of `notification.text` other than the three client consumers. **Found:** the socket push description (`notification.service.ts:1003`) would garble | Kept; design fixed (§7.1 socket case, T1) |

### Risks

| ID | Risk | Mitigation |
|---|---|---|
| R-1 | Merge in progress (`UU` in `notification-type.constants.ts`, `notification-item.component.spec.ts`) | Execute only after it is resolved and committed |
| R-2 | An acronym that itself contains ` has tagged the ` is impossible in practice | Accepted |
| R-3 | IPSR's unawaited `update` (§7.3) | Out of scope; noted |
| R-4 | The socket push text would read `The result … ABC` for a bare acronym | **Resolved in design:** new `RESULT_CENTER_TAGGED` case in `buildResultNotificationDescription` (§7.1), covered in T1 |

## 11. Budget (Step 2.4)

| Metric | Estimate |
|---|---|
| Tasks | 6 (5 code + 1 manual gate) |
| LOC | ~380 (≈105 production, ≈275 tests). Revised from ~260 after the socket-description case (§7.1) was added |
| Review rounds | 1–2 per task |

This matches Standard depth. `/akili-execute` escalates if it goes past 8 tasks, 400 LOC, or 3 rounds on any task.

# Module Spec — W1/W2 "CG Center tagged" notification — Tasks

> **Answer first:** 6 tasks in 2 lanes. Server work (T1 → T2, T3) and client work (T4 → T5) are independent until the manual gate T6. About 280 LOC, about 60% of it tests. **Do not start until the merge on `qa-development-2026-ss` is resolved** (T4 and T5 touch the `UU` files).

## 1. Scope of this task list

- **Module / feature:** `notifications` / W1/W2 + IPSR center-tagged notification
- **Linked spec:** `requirements.md` (WCT-R-1..9, NFR-1..5) + `design.md` (DD-1..6, §7–§8)
- **Owner / driver:** Santiago Sanchez
- **Status:** not-started (spec approved 2026-09-30)

## 2. Pre-flight checklist

- [x] `requirements.md` and `design.md` are approved (2026-09-30)
- [x] Open questions resolved (D-1..D-3, D-5; A-1, A-2 accepted at the Phase 1 gate; DD-6 accepted at the Phase 2 gate)
- [x] **The merge in progress on `qa-development-2026-ss` is resolved and committed** (verified 2026-09-30: no `UU`, no `MERGE_HEAD`)
- [x] No migration (NFR-2), so `migration:check` is not a gate
- [x] CLARISA: reuses `clarisa_institutions.acronym` (already synced)

## 3. Task list

### [x] WCT-T-1 — Server: store the bare acronym and compose the push description

- **Type:** server
- **Description:**
  - `notifyTaggedCenters` labels each target `clarisa_institution.acronym`, falling back to `code` when the acronym is empty.
  - `emitFor` stores `target.label` alone for `RESULT_CENTER_TAGGED` when no `leadIn` is passed. The `leadIn` (BCT) path is unchanged.
  - `NotificationService.buildResultNotificationDescription` gets its own `RESULT_CENTER_TAGGED` case:
    - bare text → `<SP ?? 'a Science Program'> has tagged your CG Center as a contributor (<text>) to result <code> - <title>`
    - composed or empty → the existing suffix description
  - The server detector is renamed to a type-neutral name. Its project-case behavior is unchanged.
- **Implements:** WCT-R-8, WCT-R-7 (server half), WCT-R-5 (push clause), WCT-R-4 (dedup unchanged)
- **Design:** §7.1, §7.4, DD-1, DD-2
- **Files (expected):** `onecgiar-pr-server/src/api/notification/services/result-tagged-notification.service.ts` (+ `.spec.ts`), `onecgiar-pr-server/src/api/notification/notification.service.ts` (+ `.spec.ts`)
- **Depends on:** — · **Blocks:** WCT-T-2, WCT-T-3, WCT-T-6
- **Estimate:** S · **Review:** full (shared emitter and stored-text contract)
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:**
    - Center `ABC` (acronym `ABC`) is tagged with no leadIn, but the stored `text` is anything other than `ABC`.
    - A center with a null acronym is stored as something other than its code.
    - The BCT path (`notifyBilateralContributorsOnSubmission` with `reported by AfricaRice`) stores anything other than `reported by AfricaRice has tagged the <name>. Click to see the result.`
    - The push `desc` for bare `ABC` on result 9398 owned by SP01 is anything other than `SP01 has tagged your CG Center as a contributor (ABC) to result 9398 - <title>`.
    - A composed legacy text's push `desc` changes.
  - **Red run:** `npx jest --testPathPattern "result-tagged-notification.service.spec|notification/notification.service.spec" --silent --reporters=summary --forceExit` (the new cases fail before the change; the existing BCT and project cases stay green)
  - **Disqualifier:** if an existing BCT or NOTIF-T-12 assertion has to be **edited** (not just added to) to go green, stop. That means a regression in a shipped flow; escalate.
  - **Consumers:** `notifyTaggedCenters` ← `results_by_institutions.service.ts` (`notifyNewlyTaggedCenters`) and WCT-T-3; `emitFor` ← `notifyTaggedCenters`, `notifyTaggedBilateralProjects`, `notifyBilateralContributorsOnSubmission`; `buildResultNotificationDescription` ← `emitResultNotification` only.
- **Definition of done:**
  - [x] Red run green, with ≥5 new cases (bare, null acronym, BCT unchanged, push bare, push composed)
  - [x] `npx tsc --noEmit` and eslint quiet on the touched files
  - [x] No secrets logged

### [x] WCT-T-2 — Server: pin the partners-save audience (lead included) — amended (Pivot WCT-T-2, 2026-09-30)

- **Type:** server
- **Description:** **Amended (Pivot WCT-T-2, 2026-09-30) (D-1 reverted):** no production change to `handleContributingCenters`. Every newly linked code (lead included) keeps reaching `notifyTaggedCenters`. Add tests pinning: lead + contributor both notified, re-save silent, non-fatal emitter, `source='API'` still notifies. There is no source filter (DD-6).
- **Implements:** WCT-R-1 (lead, re-save and non-fatal scenarios), WCT-R-3 (amended: a `source='API'` result through the partners path still notifies its newly linked Centers)
- **Design:** §7.2, DD-3, DD-6
- **Files (expected):** `onecgiar-pr-server/src/api/results/results_by_institutions/results_by_institutions.service.ts` (+ `.spec.ts`)
- **Depends on:** WCT-T-1 · **Blocks:** WCT-T-6
- **Estimate:** S · **Review:** checklist
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:**
    - Saving `[{code:'ABC', is_leading_result:false}, {code:'XYZ', is_leading_result:true}]` on a result with neither linked calls `notifyTaggedCenters` with anything other than `['ABC','XYZ']` (Pivot WCT-T-2, 2026-09-30).
    - With ABC already linked, the emitter is called at all.
    - If the emitter rejects, the save rejects.
    - With `source='API'`, the emitter is NOT called for a new ABC (this is the DD-6 falsifier).
  - **Red run:** `npx jest --testPathPattern "results_by_institutions.service.spec" --silent --reporters=summary --forceExit`
  - **Disqualifier:** ~~if an existing P2-3214 test asserts that the lead is notified, stop~~ hit and resolved (Pivot WCT-T-2, 2026-09-30): user reverted D-1. New disqualifier: any existing P2-3214 assertion has to be edited to go green.
  - **Consumers:** `handleContributingCenters` ← `results_by_institutions.service.ts:338, :489` (W1/W2 save, SP review of bilateral via `results.service.ts:4698`).
- **Definition of done:**
  - [x] Red run green · tsc and eslint quiet

### [x] WCT-T-3 — Server: IPSR contributors save notifies newly saved Centers (primary included) — amended (Pivot WCT-T-2, 2026-09-30)

- **Type:** server
- **Description:**
  - In `ResultsPackageTocResultService.create`, the new-row branch of the contributing-center loop records `code` for every new row, `primary` included (A-1 reverted (Pivot WCT-T-2, 2026-09-30)).
  - After the loop, call `notifyTaggedCenters(rip.id, user.id, codes)` inside try/catch, logging at `error` without rethrowing.
  - Import `NotificationModule` into `ResultsPackageTocResultModule`, using `forwardRef` only if Nest reports a cycle.
  - Do NOT fix the unawaited `update` at `:247` (design R-3).
- **Implements:** WCT-R-2 (all clauses), WCT-NFR-1
- **Design:** §7.3, DD-3 (superseded), A-1 (reverted)
- **Files (expected):** `onecgiar-pr-server/src/api/ipsr/results-package-toc-result/results-package-toc-result.service.ts`, `.../results-package-toc-result.module.ts`, `.../results-package-toc-result.service.spec.ts` (**new**: covers the hook only, with mocked repositories)
- **Depends on:** WCT-T-1 · **Blocks:** WCT-T-6
- **Estimate:** M · **Review:** checklist
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:**
    - Saving `[{code:'ABC', primary:false}, {code:'XYZ', primary:true}]` with neither existing calls the emitter with anything other than `['ABC','XYZ']` (Pivot WCT-T-2, 2026-09-30).
    - With ABC already existing, the emitter is called.
    - If the emitter rejects, `create` rejects or returns a non-success.
    - The emitter is called before the center `save` resolves.
  - **Red run:** `npx jest --testPathPattern "results-package-toc-result.service.spec" --silent --reporters=summary --forceExit`. Also `npx nest build`, exit 0: the DI graph check, since a missing provider or a cycle only shows at boot.
  - **Disqualifier:** the module cannot boot even with `forwardRef`. Stop, because the IPSR wiring needs a design change.
  - **Consumers:** none (no shared symbol changed; the module import is additive).
- **What the assertion cannot prove:** that the real IPSR UI step saves contributors through this path. That is covered by T6's prtest check.
- **Definition of done:**
  - [x] Red run green · `nest build` exit 0 · tsc and eslint quiet

### [x] WCT-T-4 — Client: text-parts contract, sentence and copy

- **Type:** client
- **Description:**
  - Add optional `lead` to `NotificationTextParts`.
  - Rename `isComposedProjectTaggedText` → `isComposedTaggedText`; the project case still uses it, with identical behavior.
  - Give `RESULT_CENTER_TAGGED` its own case:
    - bare text → `{ lead: getProgramCode(n) ?? 'a Science Program', prefix: <copy sentence with label>, suffix: null, emphasizePrefix: false }`
    - composed or empty → today's `{ prefix: 'The result', suffix: text }`
  - The new `internationalization/notification-center-tagged.copy.ts` holds the sentence builder and the `CG Center tagged` chip label.
  - `RESULT_CONTRIBUTION_ACCEPTED/DECLINED` and `BILATERAL_RESULT_SUBMITTED` keep the shared group.
- **Implements:** WCT-R-5 (sentence, both fallbacks, no forbidden phrases), WCT-R-7 (historical and BCT scenarios), WCT-NFR-3
- **Design:** §8.1, §9, DD-2, DD-4
- **Files (expected):** `onecgiar-pr-client/src/app/shared/constants/notification-type.constants.ts` (+ `.spec.ts`), `onecgiar-pr-client/src/app/internationalization/notification-center-tagged.copy.ts`
- **Depends on:** — (needs the merge resolved) · **Blocks:** WCT-T-5
- **Estimate:** S · **Review:** full (shared contract used by three consumers)
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:** for `{type:'Result Center Tagged', text:'ABC', owner SP01}`:
    - parts are not `lead:'SP01'` with a prefix of exactly `has tagged your CG Center as a contributor (ABC) to result`;
    - or the prefix contains `The result` / `created by` / `Click to see the result.`;
    - or no owner SP gives a lead other than `a Science Program`.
    - For `text:'created by SP01 has tagged the X. Click to see the result.'`, for `'reported by AfricaRice has tagged the CIP. Click to see the result.'`, and for `''` / `null`: parts differ from today's `{prefix:'The result', suffix:text}`.
    - Any existing `RESULT_BILATERAL_PROJECT_TAGGED`, `RESULT_CONTRIBUTION_*` or `BILATERAL_RESULT_SUBMITTED` assertion changes.
  - **Red run:** `npx jest --testPathPattern "notification-type.constants.spec" --silent --reporters=summary --no-coverage`
  - **Disqualifier:** if the rename forces edits to existing project-tagged assertions beyond the identifier name, stop.
  - **Consumers:** `getResultNotificationTextParts` ← `notification-item.component.ts`, `update-notification.component.ts`, `pop-up-notification-item.component.ts` (all handled in T5); `isComposedProjectTaggedText` ← this file only (verify with grep).
- **Definition of done:**
  - [x] Red run green · `npx ng lint --quiet` clean on the touched files

### [x] WCT-T-5 — Client: render `lead` in three consumers, plus the green chip

- **Type:** client
- **Description:**
  - Each of the three templates renders `lead` in `<b>` before `prefix` when present.
  - `notification-item`:
    - `rowTypeChipLabel` returns the copy `CG Center tagged` for update rows of type `RESULT_CENTER_TAGGED`.
    - `rowTypeChipColorClass` returns the `--pr-status-approved-bg/-fg` pair for them.
    - Request-row chips and other update types are unchanged.
  - Pin `rowMode === 'view'` and the absence of decision buttons for such rows.
- **Implements:** WCT-R-5 (inbox, Updates and bell clause; SP emphasis), WCT-R-6 (all clauses, including "other types unchanged"), WCT-R-9, WCT-NFR-4
- **Design:** §8.2–§8.5, DD-4, DD-5
- **Files (expected):** `.../notification-item/notification-item.component.{ts,html,spec.ts}`, `.../update-notification/update-notification.component.{html,spec.ts}`, `shared/components/header-panel/components/pop-up-notification-item/pop-up-notification-item.component.{html,spec.ts}`
- **Depends on:** WCT-T-4 · **Blocks:** WCT-T-6
- **Estimate:** M · **Review:** checklist
- **Skills:** `angular-developer`, `spartan`, `tdd`
- **Verification:**
  - **Falsifier:** rendering the bare-shape SP01/ABC fixture in each of the three components does not give:
    - DOM text (whitespace-normalized) `SP01 has tagged your CG Center as a contributor (ABC) to result 9398 - <title>`, with `SP01` inside `<b>`;
    - in the inbox, a `[data-notif-type-chip]` text of `CG Center tagged` carrying the approved-token class;
    - a `Result Submitted` update row whose chip is unchanged (raw label, violet);
    - no decision buttons, with `rowMode` = `view`;
    - a legacy composed fixture that renders as it does today.
  - **Red run:** `npx jest --testPathPattern "notification-item.component.spec|update-notification.component.spec|pop-up-notification-item.component.spec" --silent --reporters=summary --no-coverage`
  - **Disqualifier:** if jsdom is the only evidence of color or emphasis, those are presence assertions only; T6 owns the visual proof. Do not claim the mockup match from Jest.
  - **What the assertions cannot prove:** the computed color, the spacing, and that the chip looks green. T6 checks those.
  - **Consumers:** `rowTypeChipLabel` / `rowTypeChipColorClass` are used only in `notification-item.component.html` and the drawer's `requestKind` (request rows only, so unaffected; assert this).
- **Definition of done:**
  - [x] Red run green · `npx ng lint --quiet` clean · memory rule: affected specs run before commit

### WCT-T-6 — Rollout: manual visual and data gates

- **Type:** rollout
- **Description:** These are human checks at the execute HITL pause. Each is recorded in `execution.md` as `pass`, `fail` or `not-run` (never implied).
  1. Local or prtest browser: the inbox row matches `mockup/center-tagged-row.png` (bold SP, `(ABC)`, green chip, `W1/W2` chip, meta line). The bell shows the same sentence, and the real-time toast sentence is correct.
  2. prtest: a W1/W2 partners save newly linking a contributor (and/or a lead) notifies that Center's users (Pivot WCT-T-2, 2026-09-30).
  3. prtest: an IPSR step adding a Center notifies (primary included (Pivot WCT-T-2, 2026-09-30)).
  4. prtest: an SP review of a bilateral result adding a Center notifies with the new sentence (DD-6).
  5. An old row still renders the old sentence.
- **Implements:** the defect classes "visual match" and "real recipients" (requirements §7)
- **Depends on:** WCT-T-2, WCT-T-3, WCT-T-5 · **Blocks:** —
- **Estimate:** S · **Review:** skip-eligible
- **Skills:** `claude-in-chrome` (optional, for screenshots)
- **Verification:**
  - **Falsifier:** any of checks 1–5 differs from the stated outcome.
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** prtest is not deployed with this branch. Record `not-run`; never `pass`.
  - **Consumers:** none (no shared symbol changed)
- **Definition of done:**
  - [ ] All five checks recorded in `execution.md`

## 4. Coverage closure (scenario and clause level)

| Requirement · clause | Owner |
|---|---|
| R-1 contributor notified · BUT not the saver · AND non-fatal | T2 (non-fatal, emitter called), T1 (saver exclusion is reused; asserted unchanged in the emitter spec) |
| R-1 lead notified (D-1 reverted) · re-save silent | T2 |
| R-2 IPSR notified · AND primary too (A-1 reverted) · AND non-fatal | T3 |
| R-3 (amended) the bilateral partners path still notifies · BUT BCT unchanged | T2 (source='API' case), T1 (BCT unchanged) |
| R-4 one per user per result | T1 (dedup case: one user in ABC and DEF gets one call) |
| R-5 sentence · push clause · SP emphasis and link · BUT no forbidden phrases · AND SP fallback · AND acronym→code fallback | T4 (sentence, phrases, SP fallback), T1 (push, code fallback), T5 (emphasis, link, three consumers) |
| R-6 chip label and green · AND other chips intact · BUT other types unchanged | T5 |
| R-7 historical row · BCT row (render) · BCT stored text | T4 (render), T1 (stored) |
| R-8 stored acronym · BUT BCT unchanged | T1 |
| R-9 view only, no decision | T5 |
| NFR-1 non-fatal | T2, T3 · NFR-2 no migration: verified by `git status` at review · NFR-3 copy file: T4 · NFR-4 tokens: T5 · NFR-5 scoped Jest: every red run |
| Visual match / real recipients | T6 |

## 5. Dependency graph

```
T1 ──► T2 ──┐
  └──► T3 ──┼──► T6
T4 ──► T5 ──┘
```

There are no cycles. {T1, T4} can start in parallel once the merge is resolved.

## 6. Estimates

| Task | Prod LOC | Test LOC |
|---|---|---|
| T1 | ~30 | ~70 |
| T2 | ~5 | ~35 |
| T3 | ~20 | ~60 |
| T4 | ~30 | ~50 |
| T5 | ~20 | ~60 |
| **Total** | **~105** | **~275** (≈380 in total, under the 400-LOC tripwire) |

> Budget update vs `design.md` §11: the push-description case found in Phase 3 adds about 120 LOC (mostly tests). The new total of ≈380 stays under the 400 tripwire.

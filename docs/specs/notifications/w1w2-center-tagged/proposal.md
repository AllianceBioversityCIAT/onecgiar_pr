# Proposal — W1/W2 "CG Center tagged" informative notification

> **In one line:** the server **already** notifies a Center's users when a W1/W2 result (`source = 'Result'`) tags that Center in *Contributors and Partners* (P2-3214, `RESULT_CENTER_TAGGED`). What is missing is the **row the mockup shows**: today it reads *"The result 9398 - … created by SP01 has tagged the International Center for … . Click to see the result."* under a raw `Result Center Tagged` chip. The target is *"**SP01** has tagged your CG Center as a contributor (**ABC**) to result **9398** - …"* with a `CG Center tagged` chip. It stays informational, with no accept or decline.

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/notifications/w1w2-center-tagged/` |
| Slug | `w1w2-center-tagged`, derived from the free-text argument (filed under `notifications/` next to its siblings) |
| Type | Change |
| Approval Mode | gated |
| Date | 2026-09-30 |
| Ticket | none (D-5) |
| Status | approved (Santiago, 2026-09-30) |
| Superseded in part | By `design.md` DD-6: the `source = 'Result'` guard (§4 "Scope of trigger", §5 Server, §9 ADDED) is **dropped**, because the SP review of a bilateral result uses the same path and notifies today. Those lines are kept as the historical proposal |
| Depends on | none in specs. **Blocked for execution** by the merge in progress on `qa-development-2026-ss` (R-1) |
| Parallel-safe | no. It touches `notification-type.constants.ts` and `notification-item.component.spec.ts`, and both are `UU` right now |
| Amends | `P2-3214` (commit `1d26cf931`): the center-tagged text shape only. BCT (`notifications/bilateral-contributor-tagging`) is **not** changed |

## 2. Intent

When a Science Program tags a CGIAR Center as a contributor on a W1/W2 result, that Center's users should get a short heads-up that is easy to scan. It should name **who** tagged them (SP code), **which** of their Centers (acronym), and **which** result. No action is needed from them.

## 3. Problem / Current Behavior

| Piece | Today | Evidence |
|---|---|---|
| Trigger | Saving *Contributors and Partners* links a Center that was not linked before | `results_by_institutions.service.ts:739-800` (`handleContributingCenters` → `newlyLinkedCenterCodes`) |
| Emit | `notifyTaggedCenters` → `emitFor`, one row per user, deduplicated per result, non-fatal | `result-tagged-notification.service.ts:69-91, 265-323` |
| Stored text | Full sentence: `created by <SP> has tagged the <Center **full name**>. Click to see the result.` | `result-tagged-notification.service.ts:306-309` |
| Client text | `The result <link> ` + the stored sentence | `notification-type.constants.ts` → `RESULT_CENTER_TAGGED` case |
| Chip | The raw type string `Result Center Tagged` | `notification-item.component.ts:225-228` (`rowTypeChipLabel`) |
| Lead Center | Also notified when newly linked (comment: "lead or contributor") | `result-tagged-notification.service.ts:66` |

The text names the Center by its long name, not by acronym, and it reads backwards compared with the mockup. The chip shows a backend enum string.

## 4. Proposed Outcome

| Element | Target (mockup `mockup/center-tagged-row.png`) |
|---|---|
| Sentence | **`{SP code}`** `has tagged your CG Center as a contributor (`**`{Center acronym}`**`) to result` **`{code}`** `- {title}` (title is the link) |
| Type chip | `CG Center tagged` (green, informational) |
| Other chips / meta | `W1/W2` funding chip, `Output · Knowledge Product`, relative time. These already exist (inbox-revamp) |
| Behavior | Informational only. Clicking opens the result / `view` mode. No Accept or Decline, no pending state |
| Scope of trigger | W1/W2 results only (`result.source = 'Result'`). Centers newly linked as contributors on save |

## 5. Scope

| Layer | Change |
|---|---|
| Server | In `emitFor`'s no-`leadIn` path, `RESULT_CENTER_TAGGED` stores the **Center acronym** (`acronym ?? code`) as a bare label, the same way NOTIF-T-12 already does for `RESULT_BILATERAL_PROJECT_TAGGED`. The BCT submission path (explicit `leadIn`) keeps its composed sentence byte-for-byte. Add a guard so `notifyTaggedCenters` only emits for `source = 'Result'`. Exclude the lead Center (D-1) |
| Client | `getResultNotificationTextParts`: a bare label gives the new sentence (`{SP} has tagged your CG Center as a contributor ({label}) to result`). A composed or legacy text falls back to today's rendering (`isComposed…` detection, the same pattern as NOTIF-T-12). `rowTypeChipLabel`: map `RESULT_CENTER_TAGGED` → `CG Center tagged` through a copy file, with a green chip class |
| Tests | Server: `result-tagged-notification.service.spec.ts` (bare label, BCT unchanged, source guard). Client: `notification-type.constants.spec.ts` and `notification-item.component.spec.ts` (sentence, chip, legacy fallback). Scoped Jest only |

## 6. Non-Goals

- New notification type, seed migration, or email channel. The type already exists and the inbox is in-app.
- Accept or Decline, or any request lifecycle.
- Changing the bilateral (`source = 'API'`) BCT flow or its texts.
- Rewriting historical rows. Old rows keep rendering the old sentence through the fallback.
- Notifying on unlink, or re-notifying on re-save. The newly-linked-only rule and per-result dedup stay as they are.

## 7. Affected Users, Systems, And Specs

| Area | Files |
|---|---|
| Server | `api/notification/services/result-tagged-notification.service.ts` (+ spec); possibly `api/results/results_by_institutions/results_by_institutions.service.ts` (lead exclusion) |
| Client | `shared/constants/notification-type.constants.ts` (+ spec), `.../notification-item/notification-item.component.ts/html` (+ spec), `pop-up-notification-item` (bell: same text helper), an `internationalization/*.copy.ts` entry for the chip |
| Users | Center Users of the tagged Center (recipients) and SP users who save partners (emitters, no visible change) |
| Related specs | `notifications/inbox-revamp` (NOTIF-T-12 bare-label pattern, chips), `notifications/bilateral-contributor-tagging` (must stay intact), `changes/notification-tagged-center-name` (acronym convention) |
| Baseline | PRD AC-8 · TRD W4 · design.md DD-10 (in-app only here, consistent with the BCT precedent) · client `CLAUDE.md` copy and naming conventions |

## 8. Visual Reference

- Source: user-provided screenshot
- Location: `docs/specs/notifications/w1w2-center-tagged/mockup/center-tagged-row.png`
- Notes: one Updates row (inbox and, by the same helper, the bell): SP code in bold, Center acronym in parentheses, result code bold, title as link; chips `CG Center tagged` (green), `W1/W2`, then `Output · Knowledge Product · 3 hours ago`. Build it with Spartan `hlmBadge`, as the existing chips do.

## 9. Requirement Delta Preview

### ADDED Requirements
- `RESULT_CENTER_TAGGED` rows from the W1/W2 direct-tag flow render `{SP} has tagged your CG Center as a contributor ({acronym}) to result {code} - {title}`.
- The type chip for `RESULT_CENTER_TAGGED` reads `CG Center tagged`.
- The emission is restricted to `result.source = 'Result'`.

### MODIFIED Requirements
- P2-3214 AC3: for new rows the stored `text` changes from the composed sentence to the Center acronym. Legacy and BCT rows keep the composed sentence and the old rendering.
- The lead Center is no longer notified; only contributing Centers are (D-1).

### REMOVED Requirements
- none

## 10. Approach Options

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Bare label + client composition (recommended)** | Server stores the acronym; client builds the sentence; composed texts fall back | Same pattern already shipped for projects (NOTIF-T-12); acronym is exact; copy lives in the client | Touches both packages; two text shapes coexist (handled by detection) |
| B. Server composes the new sentence | Change the template in `emitFor` | One-package server change | The client still prefixes `The result …`, so its splitting must change anyway; the copy sits in the backend; it breaks the convention NOTIF-T-12 set |
| C. Client-only reparse | Parse `has tagged the <name>` out of the stored text | No server deploy | Only has the long name, not the acronym, so it cannot meet the mockup. Fragile |

## 11. Recommended Approach

**Option A.** It is the smallest safe path because it copies a pattern already reviewed and shipped (NOTIF-T-12), it leaves BCT and legacy rows unchanged, and it needs no migration and no new type.

## 12. Risks, Dependencies, And Open Questions

| ID | Item | Status |
|---|---|---|
| R-1 | **Merge in progress** on `qa-development-2026-ss`: `notification-type.constants.ts` and `notification-item.component.spec.ts` are `UU`. Do not execute until it is resolved and committed | Blocker for execute |
| R-2 | The text-shape detection must tell a bare acronym apart from a composed sentence, and BCT's `RESULT_CENTER_TAGGED` rows (with `leadIn`) must keep rendering correctly. Needs a falsifier test for each shape | Design |
| R-3 | Per-result dedup spans all tagged types. A user already notified on that result (for example by a project tag) will not get this row. That is the intended behavior, so tell QA | Accepted |
| R-4 | Memory rule: run the affected client specs before committing, because renaming copy breaks asserted strings | Constraint |
| D-1 (was OQ-1) | ~~Only **contributing** Centers are notified. The lead Center is excluded~~ **Reverted** at execute: lead and IPSR primary are notified too | Decided, Santiago, 2026-09-30 · reverted, Santiago, 2026-09-30 (Pivot WCT-T-2, 2026-09-30) |
| D-2 (was OQ-2) | The SP code is the result's **owner SP** (`initiative_role_id = 1`, as today) | Decided, Santiago, 2026-09-30 |
| D-3 (was OQ-3) | IPSR / Innovation Package results **are included** (any `source = 'Result'`) | Decided, Santiago, 2026-09-30 |
| OQ-4 | Should the bell (pop-up) show the same sentence? (Recommended: yes, it already shares the helper) | Open, default yes |
| D-5 (was OQ-5) | No Jira ticket exists | Confirmed, Santiago, 2026-09-30 |

No `docs/specs/kaizen-log.md`, so there are no Active Lessons to apply.

## 13. Success Criteria

- An SP01 user saves partners on W1/W2 result 9398 and adds ABC as a contributing Center. ABC's Center Users (not the saver) get **one** Updates row that reads exactly as in the mockup, with a `CG Center tagged` chip and no Accept or Decline.
- Re-saving without changes sends nothing new. A bilateral (`API`) result sends nothing through this path.
- Existing `RESULT_CENTER_TAGGED` rows and BCT rows render as before.
- Scoped server and client Jest suites, tsc, and lint are green. No migration.

## 14. Next Step

```text
/akili-specify notifications/w1w2-center-tagged
```

OQ-1..OQ-3 and OQ-5 are resolved as D-1..D-3 and D-5. Finish the in-progress merge (R-1) before `/akili-execute`.

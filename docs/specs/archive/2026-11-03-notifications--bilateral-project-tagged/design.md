# Module Spec: W3/Bilateral "Bilateral project tagged" notification (Design)

> **Answer first:** BCT project targets carry their own **pre-built text**, a new optional `text` on `TaggedTarget` that `emitFor` stores verbatim. Every other target keeps today's lead-in composition. On read, a single end-anchored regex (one twin each on client and server) recognises the Center-reported shape **before** `isComposedTaggedText`. The client builds `segments` with 4 emphasized tokens, and the three consumers already render `segments` (WPT-T-4). The avatar gets one new branch.
>
> There is no migration, no new query, no new type, and no change to dedup or the callers.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `notifications/bilateral-project-tagged` |
| Status | approved (Santiago, 2026-10-02) |
| Depth | Standard (lean), re-checked in §10.2 |
| Requirements | `requirements.md` BPT-R-1..R-5, BPT-NFR-1..6 |
| Pattern source | `notifications/w1w2-project-tagged` design §7.3, §8.1, §9 |
| Approval Mode | gated |

## 2. Executive Summary

| Layer | Change | Requirement |
|---|---|---|
| Server emit | `TaggedTarget.text?`. The BCT loop sets it for project targets, and `emitFor` prefers it | BPT-R-1 |
| Server read | `parseCenterReportedProjectText` + a new first branch in `RESULT_BILATERAL_PROJECT_TAGGED` | BPT-R-3, R-4 |
| Client text | Exported twin parser + a new first branch in `getResultNotificationTextParts` | BPT-R-2, R-4 |
| Client avatar | `isCenterReportedProjectRow` getter + an `@else if` briefcase branch + one SCSS modifier | BPT-R-5 |

## 3. Architecture Overview

```
bilateral submit / ingest ──► notifyBilateralContributorsOnSubmission
                                  │ project target: text = "<rep> has tagged the bilateral project <code> from your center (<owner>)"
                                  │ center target : (no text) → emitFor composes "<leadIn> has tagged the <name>. Click…" (unchanged)
                                  ▼
                               emitFor ─► notification.text
                                  ▼
 read: server buildResultNotificationDescription        client getResultNotificationTextParts
        1. Center-reported shape? → new sentence          1. Center-reported shape? → segments (4 bold)
        2. composed/empty?        → fallback (today)      2. composed/empty?        → fallback (today)
        3. bare/enriched          → W1/W2 (today)         3. bare/enriched          → W1/W2 (today)
```

## 4. Extended Directory Structure

| File | Change |
|---|---|
| `onecgiar-pr-server/src/api/notification/services/result-tagged-notification.service.ts` (+ spec) | `TaggedTarget.text?`, BCT project text, `emitFor` precedence |
| `onecgiar-pr-server/src/api/notification/notification.service.ts` (+ spec) | Parser twin + first branch |
| `onecgiar-pr-client/src/app/shared/constants/notification-type.constants.ts` (+ spec) | Exported parser twin + first branch |
| `onecgiar-pr-client/src/app/internationalization/notification-project-tagged.copy.ts` | Doc comment only (it already has `verb` and `centerClauseWithLabel`). No new key |
| `…/notification-item/notification-item.component.ts/html/scss` (+ spec) | Avatar getter, branch, modifier |

## 5. Data Model

No schema change. `notification.text` gains a third `RESULT_BILATERAL_PROJECT_TAGGED` shape, written only by the BCT flow from now on:

| Shape | Example | Writer |
|---|---|---|
| Center-reported **(new)** | `ICRISAT has tagged the bilateral project B-A1187 from your center (ABC)` | BCT, after this change |
| Composed (legacy BCT) | `reported by ICRISAT has tagged the B-A1187 of your center (ABC). Click to see the result.` | BCT before this change; old rows |
| Enriched / bare | `B-A1080 (ABC)` / `B-A1080` | W1/W2 direct flow (unchanged) |

## 6. API Design

No endpoint or DTO change. The inbox payload keeps `text` and `message`, and only the content of `message` changes for the new shape. `bilateral-result-summaries.en.md` is not affected.

## 7. Backend Module Design

### 7.1 Emit (BPT-R-1)

- `TaggedTarget` gains an optional `text`. When it's present, `emitFor` stores it verbatim and skips both the bare-label and the lead-in composition. When it's absent, behaviour is byte-identical to today's.
- In `notifyBilateralContributorsOnSubmission`, project targets set `text` from these parts, each trimmed:
  - **reporter:** the existing `reportingCenterLabel`, else `'A CGIAR Center'`
  - **project code:** the existing `shortName ?? fullName ?? 'project <id>'` chain
  - **owner:** the existing `ownerCenterLabel`
- `label` stays populated, because `emitFor` and the logs still read it. Center targets don't set `text`.
- The `leadIn` argument is still passed, so `unionNotified` (cross-type dedup, BCT-R-9) and the project-first ordering are untouched.
- The `reportingCenterLabel` fallback keeps using `||`, so an empty acronym falls to the code, then to the degraded label. The existing warning stays.

### 7.2 Read (BPT-R-3, R-4)

- `parseCenterReportedProjectText(text)` returns `{ reporter, code, owner }` or `null`.
  - End-anchored pattern: reporter = shortest prefix before ` has tagged the bilateral project `; code = everything up to the **last** ` from your center (`; owner = non-empty `[^()]+` inside the final parens, with optional trailing whitespace.
  - It returns `null` when any part is empty after trimming.
- In the `RESULT_BILATERAL_PROJECT_TAGGED` case, the parse runs **first**. On a match it returns `<reporter> has tagged the bilateral project <code> from your center (<owner>) to result<identity>`, where `identity` uses the existing `[resultCode, resultTitle].filter(Boolean).join(' - ')` rule.
- No match → today's code path, unchanged.
- **Why old composed rows can't match:** they end in `. Click to see the result.`, not in `)`, and they say `the <code> of your center`, not `the bilateral project … from your center`. The end anchor alone rules them out.
- **Why W1/W2 enriched rows can't match:** they lack ` has tagged the bilateral project `.

## 8. Frontend / UX Component Architecture

### 8.1 Text parts (BPT-R-2)

- The twin `parseCenterReportedProjectText` is **exported** so the component can reuse it for the avatar.
- In `getResultNotificationTextParts`, the `RESULT_BILATERAL_PROJECT_TAGGED` case checks it **before** `isComposedTaggedText`. On a match it returns these `segments`:

  | # | Text | Emphasized |
  |---|---|---|
  | 1 | reporter | yes |
  | 2 | ` ` + `verb` + ` ` | no |
  | 3 | code | yes |
  | 4 | ` ` + `centerClauseWithLabel.before` | no |
  | 5 | owner | yes |
  | 6 | `centerClauseWithLabel.after` | no |

- `prefix` is the joined text, `suffix` is null and `emphasizePrefix` is false. The result code (bold) and the title link come from the existing row rendering, exactly as for W1/W2.
- No new copy key: the reporter fallback text is produced server-side.

### 8.2 Consumers

`notification-item` (Updates), `update-notification`, and `pop-up-notification-item` (bell) already render `segments` (WPT-T-4). None of them changes. The bell and `update-notification` are verified by their existing segment tests plus one new BPT case in `notification-type.constants.spec`.

### 8.3 Avatar (BPT-R-5)

- New getter `isCenterReportedProjectRow`: `isUpdateSource` **and** the type resolves to `RESULT_BILATERAL_PROJECT_TAGGED` **and** the parser matches `text`.
- Updates-row avatar `@if` chain: `aiJob` → `isApprovedDecisionUpdateRow` → **`isCenterReportedProjectRow` → `pi pi-briefcase`** → initials.
- An SCSS modifier `notification_avatar_project_tagged` gives a `border-radius: 8px` with background and colour from the amber token pair. It mirrors `notification_avatar_bilateral`.
- This applies to the Updates row only. The bell's avatar is out of scope: the mockup shows only the Updates row.

### 8.4 Design tokens

| Use | Token |
|---|---|
| Avatar background | `--pr-status-in-progress-bg` |
| Avatar icon | `--pr-status-in-progress-fg` |
| Chip (unchanged) | same pair (WPT-R-6) |
| Bold | `<b>` via `segments` (unchanged) |

Spartan: no new component. The avatar is the existing `.notification_avatar` box, and the chips are already `hlmBadge`.

## 9. Shared Contracts or Package Extensions

Shape table pinned **identically** in both specs (BPT-NFR-2):

| Input `text` | Parse result |
|---|---|
| `ICRISAT has tagged the bilateral project B-A1187 from your center (ABC)` | `ICRISAT` / `B-A1187` / `ABC` |
| `A CGIAR Center has tagged the bilateral project B-A1187 from your center (ABC)` | `A CGIAR Center` / `B-A1187` / `ABC` |
| `ICRISAT has tagged the bilateral project Seeds (Phase 2) from your center (ABC)` | `ICRISAT` / `Seeds (Phase 2)` / `ABC` |
| `reported by AR has tagged the P-CIP of your center (CIP). Click to see the result.` | `null` |
| `B-A1080 (ABC)` / `B-A1080` / empty | `null` |
| `ICRISAT has tagged the bilateral project B-A1187 from your center ()` | `null` |

Both copies carry a "keep in sync" comment naming the other file.

## 10. Design Decisions

| ID | Decision | Rejected alternative | Why |
|---|---|---|---|
| DD-1 | Self-describing sentence on `text` (proposal Option A) | W1/W2 bare label + reporter resolved at read (B); delimited label (C) | No hot-path join (NFR-1), readable raw data, old rows still fall back |
| DD-2 | Per-target `text` override in `emitFor` | Drop `leadIn` for project targets | Dropping `leadIn` would switch them to the direct-flow per-type dedup and break BCT-R-9 |
| DD-3 | Center-reported check runs **first** on both sides | Extend `isComposedTaggedText` to exclude it | Keeps the shared composed detector (used by `RESULT_CENTER_TAGGED` too) untouched |
| DD-4 | Avatar keyed on the parsed shape, not on `source_name === 'W3/Bilaterals'` | Key on funding source | A W3 result can also get W1/W2 direct-tag rows (person emitter, initials are right there) |
| DD-5 | Reporter bold (D-1), trigger stays Pending Review (D-2) | — | Proposal decisions |

### 10.1 Reversion challenge: DD-1/DD-2 replace the BCT project composed text

*What does removing it break?*

- **Readers:** a search for consumers of `of your center` / `reported by` found only test fixtures. No production code parses the old text. Dedup keys on type, not text.
- **Old rows:** the composed fallback stays on both sides, so historical rows render as before (BPT-R-4).
- **Email / push:** these read `message`, which BPT-R-3 covers.
- **Tests:** 4 server assertions pin the old project text, at `result-tagged-notification.service.spec.ts` lines 693, 726, 769 and 919. They change **by feature**. Any other BCT assertion that needs editing is a regression (the BPT-T-1 disqualifier).

**Outcome:** no unaddressed breakage.

### 10.2 Budget (Step 2.4 tripwire)

| Metric | Estimate |
|---|---|
| Tasks | 4 (3 code + 1 manual gate) |
| LOC | ~60 production + ~160 tests ≈ **220** |
| Review rounds | ≤ 2 per code task |

This matches the Standard (lean) depth. `/akili-execute` escalates if it goes past 6 tasks, ~350 LOC, or 3 rounds on any task.

### 10.3 Risks

| ID | Risk | Mitigation |
|---|---|---|
| R-1 | Order regression: the new shape falls into the composed fallback | Falsifier test: swapping the branch order turns the BPT case red (client and server) |
| R-2 | Twin drift | Identical §9 table in both specs, plus sync comments |
| R-3 | A project name containing ` from your center (` | Greedy code up to the **last** occurrence. Accepted as practically impossible |
| R-4 | Client specs pinning copy break (memory rule) | Run every touched spec before committing |

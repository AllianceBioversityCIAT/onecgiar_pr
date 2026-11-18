# Module Spec: W1/W2 "Bilateral project tagged" notification (Design)

> **Answer first:** three server changes and three client changes, with no migration and no new type.
>
> **Server**
> 1. `notifyTaggedBilateralProjects` stores `<project code> (<Center label>)`.
> 2. `emitFor` keys dedup by `(user, type)` when no lead-in is passed. BCT keeps one cross-type set.
> 3. `buildResultNotificationDescription` parses the trailing label and builds the new sentence.
>
> **Client**
> 1. `NotificationTextParts` gains an optional `segments` list (text plus emphasis), which the bare project branch fills.
> 2. The three consumers render `segments`.
> 3. The chip label and colour get a project branch next to the WCT one.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `notifications/w1w2-project-tagged` |
| Status | approved (Santiago, 2026-10-01) |
| Depth | Standard |
| Requirements | `requirements.md` (WPT-R-1..R-8, WPT-NFR-1..6) |
| Sibling design | `notifications/w1w2-center-tagged/design.md` (DD-1..DD-6): the bare-label pattern, `lead`, copy file and chip hook are reused, not restated |
| Kaizen | No `docs/specs/kaizen-log.md`, so there are no Active Lessons |

## 2. Executive Summary

| Concern | Decision |
|---|---|
| Where the Center label comes from | Emit time, from the owner resolution `notifyTaggedBilateralProjects` already runs (DD-1) |
| How the label is stored | Inside the existing `text` column as `"<code> (<label>)"` (DD-1) |
| How it is parsed | One anchored "last trailing `(…)`" rule, applied only after the composed check. It has a client twin and a server twin (DD-2) |
| Mid-sentence bold | New optional `segments` on `NotificationTextParts` (DD-3) |
| Dedup | Per type for the direct flow, cross-type for BCT, gated on `leadIn` (DD-4) |
| Chip | Copy file plus a `--pr-status-in-progress-*` class (DD-5) |

## 3. Architecture Overview

```
W1/W2 partners save ──┐                          (unchanged callers)
Results Framework ────┴─► notifyTaggedBilateralProjects ─► emitFor(no leadIn)
                                   │ label "B-A1080 (ABC)"     │ dedup per (user,type)   [DD-1, DD-4]
                                   ▼                           ▼
                           notification.text ──► read path: buildResultNotificationDescription (push / message) [DD-2]
                                              └► client: getResultNotificationTextParts → segments          [DD-2, DD-3]
                                                   ├ notification-item (inbox row + chip)                   [DD-5]
                                                   ├ update-notification (Updates list)
                                                   └ pop-up-notification-item (bell)
BCT submission ─► notifyBilateralContributorsOnSubmission ─► emitFor(leadIn) — unchanged, cross-type dedup
```

## 4. Extended Directory Structure

| Path | Change |
|---|---|
| `onecgiar-pr-server/src/api/notification/services/result-tagged-notification.service.ts` (+ spec) | Label (DD-1), dedup (DD-4) |
| `onecgiar-pr-server/src/api/notification/notification.service.ts` (+ spec) | Bare branch of `RESULT_BILATERAL_PROJECT_TAGGED`, and a private label parser (DD-2) |
| `onecgiar-pr-client/src/app/internationalization/notification-project-tagged.copy.ts` | **New**: sentence pieces and `chipLabel` (WPT-NFR-3) |
| `onecgiar-pr-client/src/app/shared/constants/notification-type.constants.ts` (+ spec) | `segments` field, parser twin, bare branch (DD-2, DD-3) |
| `.../notification-item/notification-item.component.ts/html` (+ spec) | Render `segments`, chip label and colour (DD-3, DD-5) |
| `.../update-notification/update-notification.component.html` (+ spec) | Render `segments` |
| `shared/components/header-panel/components/pop-up-notification-item/pop-up-notification-item.component.html` (+ spec) | Render `segments` |

## 5. Data Model

No schema change. `notification.text` (existing column) has these shapes for `RESULT_BILATERAL_PROJECT_TAGGED`:

| Shape | Example | Writer |
|---|---|---|
| Enriched bare (new) | `B-A1080 (ABC)` | Direct flow, after this spec |
| Legacy bare | `B-A1080` | Direct flow, NOTIF-T-12 to now |
| Composed | `reported by AR has tagged the B-A1080 of your center (ABC). Click to see the result.` | BCT and pre-NOTIF-T-12 rows |
| Empty | `null` / `''` | Hand-written rows |

## 6. API Design

No endpoint, DTO or response-shape change. The inbox payload already carries `text`, `obj_emitter_user`, the owner initiative and the result (WPT-NFR-2, WPT-NFR-5).

## 7. Backend Module Design

### 7.1 Label at emit time (WPT-R-1, WPT-R-7)

In `notifyTaggedBilateralProjects`:
- The project code stays `shortName ?? fullName ?? 'project <id>'`.
- The Center label is the resolved owner's institution acronym, falling back to the owner's code, read from the `centerIndex` the method already loads. This is the same rule BCT uses (NTC-R-1).
- The label becomes `"<code> (<label>)"`. An unresolved owner is still skipped (an existing warn).
- Both callers are covered with no edit, because they call this method.

### 7.2 Per-type dedup (WPT-R-5)

- `getAlreadyNotifiedUserIds` also selects each row's type and returns users grouped by tagged type. The query stays one query against both tagged types (the existing spec assertion on `where` still holds).
- In `emitFor`:
  - **No `leadIn`** (direct flow): a target is filtered and recorded against its **own type's** set only.
  - **`leadIn` passed** (BCT): every target is filtered against, and recorded into, the **union** set, which is today's behavior byte for byte (BCT-R-9, AC32).
- The in-loop record keeps preventing two same-type rows in one call. For example, two ABC projects on one save still produce one project row.

### 7.3 Description on the read path (WPT-R-2..R-4)

The `RESULT_BILATERAL_PROJECT_TAGGED` case:
1. If the text is empty or composed (`isComposedTaggedText`), use the existing suffix fallback. This is checked first, so a BCT `(ABC).` is never parsed (WPT-R-4).
2. Otherwise, parse with `parseTaggedProjectLabel`, a private helper that splits off the **last trailing** `(…)` with non-empty contents. It returns `{ code, centerLabel | null }`.
3. Build `"{emitter ?? 'A user'} from {SP ?? 'a Science Program'} has tagged the bilateral project {code} from your center ({centerLabel}) to result {code} - {title}"`. When `centerLabel` is null, leave out `({…})` (WPT-R-3).

## 8. Frontend / UX Component Architecture

### 8.1 Text parts (DD-3)

- `NotificationTextParts` gains an optional `segments: { text, emphasize }[]`, rendered **in place of `lead` and `prefix`** when present and before the result link. Every other type leaves it undefined, so their output doesn't change.
- The bare branch of `RESULT_BILATERAL_PROJECT_TAGGED` has a client parser twin (same rule as §7.3). It returns these segments, built from the copy file:

| # | Text | Emphasized |
|---|---|---|
| 1 | `{emitter} from` | no |
| 2 | `{SP}` | yes |
| 3 | `has tagged the bilateral project` | no |
| 4 | `{code}` | yes |
| 5 | `from your center (` + **`{label}`** + `) to result` | label yes. Without a label: `from your center to result`, plain |

- `prefix` is set to the joined plain sentence too, so any consumer or test that reads `prefix` (search, aria, the AI-job branch) still gets readable text.

### 8.2 Consumers

`notification-item`, `update-notification` and `pop-up-notification-item` each add a `segments` loop before the existing `lead`/`prefix` blocks, and skip those blocks when `segments` exists. The emphasis element is the existing `<b>` (requirements A-2). The link markup is unchanged.

### 8.3 Chip (WPT-R-6, DD-5)

- `rowTypeChipLabel`: `RESULT_BILATERAL_PROJECT_TAGGED` → `NOTIFICATION_PROJECT_TAGGED_COPY.chipLabel` (`Bilateral project tagged`).
- `rowTypeChipColorClass` (update source): `RESULT_BILATERAL_PROJECT_TAGGED` → `--pr-status-in-progress-bg/-fg`. The WCT green branch is unchanged.
- The chip is still Spartan `hlmBadge`, as today.

### 8.4 Design tokens

| Token | Value | Use |
|---|---|---|
| `--pr-status-in-progress-bg` | `#fef3c7` | Chip background (amber, matches the mockup) |
| `--pr-status-in-progress-fg` | `#b45309` | Chip text |

There are no new tokens.

## 9. Shared Contracts or Package Extensions

**Parser twin contract:** both helpers mirror each other like `isComposedTaggedText` does today:
- the server's private `parseTaggedProjectLabel` in `notification.service.ts`
- the client's in `notification-type.constants.ts`

Each carries a "keep in sync" comment. Both specs pin the same five shapes: enriched, parenthesised name, legacy bare, composed, empty.

## 10. Design Decisions

| ID | Decision | Alternatives rejected | Requirement |
|---|---|---|---|
| DD-1 | Store `"<code> (<label>)"` in `text` at emit time | Read-time owner resolution (an extra join on the paginated inbox path, and the owner can drift; WPT-NFR-5). A JSON `text` (breaks every legacy reader and the push description) | WPT-R-1 |
| DD-2 | Composed check first, then the anchored last-`(…)` split. Client and server twins | A delimiter such as `\|` (unreadable if a row ever surfaces raw, and it diverges from the BCT `(…)` convention) | WPT-R-2..R-4 |
| DD-3 | An optional `segments` field on `NotificationTextParts` | Abusing `lead`, `prefix` or `suffix` (they can't bold three separated tokens). `innerHTML` (XSS risk, since emitter names are user data) | WPT-R-2 |
| DD-4 | Per-type dedup only when `leadIn` is absent | A global per-type dedup (breaks BCT-R-9). A separate notification table or flag (migration) | WPT-R-5 |
| DD-5 | Amber `in-progress` token pair, label from the copy file | A new `--pr-status-warning` token (NFR-4: existing tokens only) | WPT-R-6 |

### 10.1 Reversion challenge: DD-4 removes cross-type dedup in the direct flow

**Question asked:** what does removing it break?

| Breakage found | Addressed |
|---|---|
| BCT-R-9 / DD-5 (owner gets the project text only, never both) depends on the shared set | Yes. Gated on `leadIn`, and the BCT path keeps the union set. A new spec asserts it |
| BCT AC32 (re-submission doesn't re-notify a user told by **any** tagged type, including an earlier direct-tag row) | Yes. The union set covers prior rows of both types |
| `result-tagged-notification.service.spec.ts:250`, "drops users already told about this result by either tagged type", asserts the old direct-flow rule | **Intentional**: it is rewritten to the per-type rule, citing D-6. It must not be deleted silently |
| `…spec.ts:277` asserts the query covers both types | Still true. It stays green as is |
| `emitFor`'s doc comment, "a centre that is both the lead and the owner of a tagged project hears once" | Updated to say this now holds per call per type in the direct flow |
| Volume: at most two tagged rows per user per result | Accepted by D-6 |

There is no unaddressed breakage.

### 10.2 Budget (Step 2.4 tripwire)

| Measure | Expected |
|---|---|
| Tasks | 5 (4 code and 1 manual visual check) |
| LOC | ~260 (~110 prod, ~150 tests) |
| Review rounds | 1–2 per code task |

This fits Standard depth. If `/akili-execute` goes over **7 tasks or ~400 LOC**, it stops and escalates.

### 10.3 Risks

| ID | Risk | Mitigation |
|---|---|---|
| DR-1 | A legacy bare row whose code came from a `fullName` ending in `(…)` is misparsed as code plus label | `short_name` is NOT NULL, so `fullName` is used only when `shortName` is empty. Accepted, and noted in the spec comment |
| DR-2 | The twin parsers drift | The same five-shape table in both specs |
| DR-3 | Existing tests assert the old sentence (`notification.service.spec.ts:453, 638`, `notification-type.constants.spec.ts:388, 399, 449`) | Updated in the same task (memory rule: run the affected specs before committing) |

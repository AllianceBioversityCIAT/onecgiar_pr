# Proposal: W1/W2 "Bilateral project tagged" notification

> **In one line:** the server **already** tells a Center's users when a W1/W2 result tags one of that Center's bilateral projects (P2-3214, `RESULT_BILATERAL_PROJECT_TAGGED`, bare-label shape since NOTIF-T-12). What's missing is the row the mockup shows. Today it reads *"Lucia Ferrari from SP09 has tagged project B-A1080 as contributor to result 9341 - …"* under the raw `Result Bilateral Project Tagged` chip. The target is *"Lucia Ferrari from **SP09** has tagged the bilateral project **B-A1080** from your center (**ABC**) to result **9341** - …"* with an amber `Bilateral project tagged` chip. The row stays informational, with no Accept or Decline. This is the sibling of `notifications/w1w2-center-tagged`.

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/notifications/w1w2-project-tagged/` |
| Slug | `w1w2-project-tagged`, derived from the free-text argument (filed under `notifications/` next to its sibling `w1w2-center-tagged`) |
| Type | Change |
| Approval Mode | gated |
| Date | 2026-10-01 |
| Ticket | none (D-5, confirmed by Santiago, 2026-10-01) |
| Status | approved (Santiago, 2026-10-01). OQ-1..OQ-5 resolved as D-1..D-5, plus the new D-6 |
| Depends on | `notifications/w1w2-center-tagged` (already executed: it brings the `lead` text part, the chip copy and colour hook, and shared `isComposedTaggedText`). No open blocker. The branch `qa-development-2026-ss` is clean |
| Parallel-safe | no. It touches the same files as `w1w2-center-tagged` (`notification-type.constants.ts`, `notification-item.component.*`, `result-tagged-notification.service.ts`, `notification.service.ts`) |
| Amends | NOTIF-T-12 (`notifications/inbox-revamp`): the bare-label text shape and the client sentence for `RESULT_BILATERAL_PROJECT_TAGGED`. P2-3214 BR4 and `w1w2-center-tagged` R-3: in the direct-tag flow, dedup becomes **per type** (D-6). BCT (`notifications/bilateral-contributor-tagging`) stays **unchanged**, including its cross-type dedup |

## 2. Intent

A Science Program user may tag a bilateral project owned by a CGIAR Center as a contributor on a W1/W2 result. When that happens, the Center's users should get a heads-up they can scan quickly. It names:

- **who** tagged it: the person and their SP
- **which** project: its code, as shown on the bilateral catalog (`B-A1080`)
- **which** of their Centers: its acronym
- **which** result

No action is needed from them.

## 3. Problem / Current Behavior

| Piece | Today | Evidence |
|---|---|---|
| Trigger | Saving W1/W2 *Contributors and Partners* links a bilateral project that wasn't linked before. Creating a result from the Results Framework does the same | `results_by_institutions.service.ts:816`, `apply-framework-result-associations.service.ts:162` → `notifyTaggedBilateralProjects` |
| Recipients | Center Users of the project's **owning Center** (`resolveProjectOwnerCenter`, falling back to the W3 acronym). If no owner resolves, it logs a warning and skips the project | `result-tagged-notification.service.ts:100-138` |
| Stored text | Bare label `project.shortName ?? fullName` with no owner-Center acronym | `result-tagged-notification.service.ts:128-132, 311-316` |
| Client text | `{emitter} from {SP} has tagged project {label} as contributor to result` + link. The whole sentence is one unemphasized `prefix` | `notification-type.constants.ts:255-265` |
| Push / email text (server twin) | Same sentence | `notification.service.ts:1128-1141` |
| Chip | The raw type string `Result Bilateral Project Tagged` (only `RESULT_CENTER_TAGGED` has a friendly label) | `notification-item.component.ts:227-233, 990-996` |
| Dedup | One tagged notification per user per result, **across both tagged types**. Projects are emitted before Centers on the same save (`results_by_institutions.service.ts:517` then `:792`), so a Center user tagged both ways on one save gets only the project row and the `CG Center tagged` row is dropped. Across separate saves, whichever row came first is the only one | `getAlreadyNotifiedUserIds`, `emitFor` in-loop set |

Gaps against the mockup:

1. The Center acronym isn't stored anywhere.
2. The wording is different ("has tagged project … as contributor").
3. Nothing is bold in the middle of the sentence. The `lead` part only bolds a token at the start.
4. The chip shows a backend enum string.
5. Cross-type dedup hides one of two distinct facts. A Center can be tagged and have one of its projects tagged on the same result, and the user hears about only one of them.

## 4. Proposed Outcome

| Element | Target (`mockup/project-tagged-row.png`) |
|---|---|
| Sentence | `{emitter name} from` **`{SP code}`** `has tagged the bilateral project` **`{project code}`** `from your center (`**`{Center acronym}`**`) to result` **`{result code}`** `- {title}` (the title is the link) |
| Project code | `clarisa_projects.short_name`, e.g. `B-A1080`, the code on the bilateral catalog pill (`bilateral-projects-panel.component.html:245`). The `1042` in the mockup was illustrative (D-1) |
| Center acronym | Owner Center's `clarisa_institution.acronym`, else its `code` (same rule as WCT-R-8 and NTC-R-1). Never an empty `()` |
| Type chip | `Bilateral project tagged`, amber/warning token pair |
| Other chips / meta | The `W1/W2` funding chip, `Output · Innovation Development`, relative time and avatar initials already exist (inbox-revamp) |
| Behavior | Informational only. Clicking opens the result in `view` mode. No Accept or Decline, and no pending state |
| Surfaces | Inbox Updates row and the bell (both use `getResultNotificationTextParts`). The server-side description is updated to match |
| Triggers | W1/W2 *Contributors and Partners* save **and** create-from-Results-Framework. Both already call `notifyTaggedBilateralProjects`, so the new text reaches both with no extra code (D-4) |
| Dedup (D-6) | Direct-tag flow: at most **one row per user, per result, per tagged type**. A user can get one `CG Center tagged` and one `Bilateral project tagged` for the same result. Re-saving still sends nothing new, and tagging two projects of the same Center on one result still sends one project row |

## 5. Scope

| Layer | Change |
|---|---|
| Server: emit | `notifyTaggedBilateralProjects` stores a bare label that also carries the owner-Center acronym: `"{shortName} ({acronym\|\|code})"` (Option A, §10). The BCT submission path (explicit `leadIn`) keeps its composed sentence byte-for-byte |
| Server: dedup | `getAlreadyNotifiedUserIds` and the `emitFor` in-loop set are keyed by `(user, type)` **only when `leadIn` is absent** (direct-tag flow). The BCT submission path (`leadIn` passed) keeps today's cross-type set, so BCT-R-9/DD-5 (project text first, never both) holds byte-for-byte |
| Server: read | In the `RESULT_BILATERAL_PROJECT_TAGGED` bare branch of `buildResultNotificationDescription`, use the new sentence. Split a trailing `(XYZ)` off the label. A legacy bare label with no acronym renders `… from your center to result …` |
| Client: text | `getResultNotificationTextParts` bare branch builds the new sentence with bold segments for SP code, project code and acronym. `NotificationTextParts` gets one optional, additive field for inline emphasized segments (DD to settle in specify; existing types don't set it, so their rendering doesn't change). Composed and legacy texts fall back exactly as today |
| Client: copy | New `internationalization/notification-project-tagged.copy.ts` (sentence builder + `chipLabel`), mirroring `notification-center-tagged.copy.ts` |
| Client: chip | `rowTypeChipLabel` → `Bilateral project tagged`. `rowTypeChipColorClass` → the existing amber/warning token pair. Built with Spartan `hlmBadge` like the other chips |
| Tests | Server: `result-tagged-notification.service.spec.ts` (label with acronym, code fallback, per-type dedup in the direct flow, cross-type dedup kept in BCT, re-save sends nothing), `notification.service.spec.ts` (new sentence, legacy bare label, composed fallback). Client: `notification-type.constants.spec.ts`, `notification-item.component.spec.ts` (sentence, emphasis, chip label/colour, legacy and BCT fallback). Scoped Jest only |

## 6. Non-Goals

- A new notification type, a seed migration, or an email template. The type already exists.
- Accept or Decline, or any request lifecycle.
- Changing the BCT bilateral-submission flow (`notifyBilateralContributorsOnSubmission`) or its `"<project> of your center (<acronym>)"` composed text.
- Rewriting historical rows. Old bare rows render through the no-acronym fallback, and composed rows render as today.
- Changing the trigger rules (newly linked only, owner resolution), notifying on unlink, or excluding the lead project. Dedup changes only as D-6 says.
- One row per tagged project. Several projects of the same Center on one result still produce a single project row for that Center's users.
- Re-labelling the `RESULT_CENTER_TAGGED` row (already done by `w1w2-center-tagged`).

## 7. Affected Users, Systems, And Specs

| Area | Files |
|---|---|
| Server | `api/notification/services/result-tagged-notification.service.ts` (+ spec), `api/notification/notification.service.ts` (+ spec) |
| Client | `shared/constants/notification-type.constants.ts` (+ spec), `pages/results/.../notification-item/notification-item.component.ts/html` (+ spec), the `pop-up-notification-item` bell (same helper, so it only needs verifying), new `internationalization/notification-project-tagged.copy.ts` |
| Users | Recipients are Center Users of the Center that owns the tagged bilateral project. Emitters are SP users who save W1/W2 partners or create from the Results Framework, and they see no change |
| Related specs | `notifications/w1w2-center-tagged` (sibling pattern: `lead`, chip hook, copy file), `notifications/inbox-revamp` (NOTIF-T-12 bare label), `notifications/bilateral-contributor-tagging` (must stay intact), `changes/notification-tagged-center-name` (acronym convention) |
| Baseline | PRD AC-8 · TRD W4 · `docs/ux-ui/design.md` §7 tokens (amber chip) and §8 components · client `CLAUDE.md` copy and naming conventions |

## 8. Visual Reference

- Source: user-provided screenshots
- Location:
  - `docs/specs/notifications/w1w2-project-tagged/mockup/project-tagged-row.png`: the target Updates row
  - `docs/specs/notifications/w1w2-project-tagged/mockup/bilateral-projects-catalog.png`: the Center's project catalog, showing the project code (`B-A1080`) that users recognise
- Notes: one row. Avatar initials `LF`. The emitter name is plain, then `from` **SP09**, `has tagged the bilateral project` **code** `from your center (ABC) to result` **9341**, and the title as a violet link. Chips: amber `Bilateral project tagged`, outlined `W1/W2`, then `Output · Innovation Development · 4 days ago`.

## 9. Requirement Delta Preview

### ADDED Requirements

- `RESULT_BILATERAL_PROJECT_TAGGED` rows from the W1/W2 direct-tag flow render `{emitter} from {SP} has tagged the bilateral project {project code} from your center ({acronym}) to result {code} - {title}`, with the SP code, project code, Center acronym and result code emphasized.
- The type chip for `RESULT_BILATERAL_PROJECT_TAGGED` reads `Bilateral project tagged`, in amber.
- New direct-tag rows store the owner-Center acronym (or its code) next to the project code.

### MODIFIED Requirements

- NOTIF-R-14 / NOTIF-T-12: the bare label changes from `{shortName}` to `{shortName} ({acronym||code})`, and the client and server sentence changes from "has tagged project X as contributor to result" to the new wording.
- Legacy bare rows (no acronym) render `… from your center to result …`. Composed (BCT and legacy) rows render as before.
- P2-3214 BR4 (direct-tag flow only): dedup goes from "one tagged notification per user per result" to "one per user per result **per tagged type**". BCT keeps the cross-type rule.

### REMOVED Requirements

- none

## 10. Approach Options

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Enriched bare label + client composition (recommended)** | Server stores `"B-A1080 (ABC)"`. Client and server split a trailing `(…)`. No match falls back to the legacy shape | Same pattern as NOTIF-T-12 and WCT, so it's well understood. The acronym is fixed at emit time with the exact owner resolution already done there. No migration, and the copy stays in the client | Two bare shapes exist side by side (with and without acronym). The split must be anchored at the end of the label, because the `fullName` fallback may contain parentheses (R-2) |
| B. Resolve the acronym at read time | Keep storing `shortName`. On read, re-resolve the project's owner Center from `clarisa_projects` | Old rows gain the acronym too | An extra join per row in the inbox query, which has a hot path (`inbox-paginated-load`). The owner can drift after emit. It duplicates the resolver on the read path |
| C. Server composes the full sentence | Change the template in `emitFor` | Only the server changes | The copy lives in the backend. It breaks the NOTIF-T-12/WCT convention, and the client still needs emphasis segments, so the client changes anyway |

## 11. Recommended Approach

**Option A.** It's the smallest safe path because:

- it reuses the bare-label and client-composition pattern that `w1w2-center-tagged` just shipped
- it doesn't add a query to the paginated inbox
- it needs no migration and no new type
- it leaves BCT rows unchanged

The only new mechanism is a small, additive emphasized-segments field on `NotificationTextParts`. Existing types don't set it.

## 12. Risks, Dependencies, And Open Questions

| ID | Item | Status |
|---|---|---|
| R-1 | `isComposedTaggedText` must not mistake `"B-A1080 (ABC)"` for a composed sentence. It doesn't today, since it only checks for ` has tagged the ` and `Click to see the result.`. Each shape needs a falsifier test: bare+acronym, bare legacy, BCT composed, empty | Design |
| R-2 | The label falls back to `fullName`, which can contain `(...)`. The split must take only a **trailing** `(…)`, and only for new rows. An alternative is a delimiter that can't appear in names (decide in design) | Design |
| R-3 | ~~Cross-type dedup hides this row~~. It becomes per-type in the direct-tag flow (D-6). Because the dedup query and the in-loop set are shared by BCT, the change must be gated on `leadIn` absent, with a regression test proving BCT owners still get only the project text. A Center user tagged both ways on one W1/W2 save now gets **two** rows, so tell QA | Design (by D-6) |
| R-4 | Memory rule: run the affected client specs before committing, because changing asserted copy breaks specs (`notification-type.constants.spec.ts`, `notification-item.component.spec.ts`) | Constraint |
| R-5 | Projects with no resolvable owner still get no notification (an existing warning-and-skip). This is out of scope, but QA should use a project whose owner resolves | Accepted |
| D-1 (was OQ-1) | The project code is `clarisa_projects.short_name` (`B-A1080`). The mockup's `1042` was illustrative | Decided, Santiago, 2026-10-01 |
| D-2 (was OQ-2) | Bold for SP code, project code, Center acronym and result code. The emitter name stays plain | Decided, Santiago, 2026-10-01 |
| D-3 (was OQ-3) | A legacy bare row (no acronym) renders `… from your center to result …` | Decided, Santiago, 2026-10-01 |
| D-4 (was OQ-4) | The Results Framework trigger is included. Impact: none extra. `apply-framework-result-associations.service.ts:162` already calls the same `notifyTaggedBilateralProjects`, so it inherits the new label and text. Its spec (if it asserts the label) gets checked in scoped Jest | Decided, Santiago, 2026-10-01 |
| D-5 (was OQ-5) | No Jira ticket | Confirmed, Santiago, 2026-10-01 |
| D-6 (new) | Dedup is one row per user, per result, **per tagged type**, in the direct-tag flow. BCT keeps its cross-type rule | Decided, Santiago, 2026-10-01 |

There is no `docs/specs/kaizen-log.md`, so no Active Lessons apply.

## 13. Success Criteria

- An SP09 user (Lucia Ferrari) saves partners on W1/W2 result 9341 and adds bilateral project `B-A1080`, owned by ABC. ABC's Center Users (not Lucia) get **one** Updates row and one bell row. Both read exactly as in the mockup, with an amber `Bilateral project tagged` chip and no Accept or Decline.
- Re-saving without changes sends nothing new.
- On one save that tags both Center ABC and project `B-A1080` (owned by ABC), ABC's users get **both** rows: `Bilateral project tagged` and `CG Center tagged`. A BCT submission with the same setup still gives owners only the project text.
- Existing bare rows render with the no-acronym fallback. BCT and legacy composed rows render byte-for-byte as before. `CG Center tagged` rows don't change.
- Scoped server and client Jest suites, tsc and lint pass. There's no migration.

## 14. Next Step

```text
/akili-specify notifications/w1w2-project-tagged
```

All open questions are resolved (D-1..D-6).

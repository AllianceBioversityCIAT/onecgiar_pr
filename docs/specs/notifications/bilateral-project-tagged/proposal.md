# Proposal: W3/Bilateral "Bilateral project tagged" notification

> **In one line:** the server **already** notifies the owning Center when a Center-reported bilateral result tags one of its projects. This is BCT scenario 7 (`notifyBilateralContributorsOnSubmission`), and it fires when the result reaches Pending Review. The amber `Bilateral project tagged` chip and the `W3/Bilateral` chip already render too. What's wrong is the sentence. Today the row reads *"The result 9322 - … reported by ICRISAT has tagged the B-A1187 of your center (ABC). Click to see the result."* The target is ***ICRISAT** has tagged the bilateral project **B-A1187** from your center (**ABC**) to result **9322** - Seed entrepreneur training…*. It's the same pattern as `w1w2-project-tagged`, with the Science Program swapped for the reporting Center.

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/notifications/bilateral-project-tagged/` |
| Slug | `bilateral-project-tagged`, derived from the free-text argument (filed under `notifications/` next to `w1w2-project-tagged`) |
| Type | Change |
| Approval Mode | gated |
| Date | 2026-10-02 |
| Ticket | none (D-3, Santiago, 2026-10-02) |
| Status | approved (Santiago, 2026-10-02). OQ-1..OQ-3 resolved as D-1..D-3 with the recommendations |
| Depends on | `notifications/w1w2-project-tagged` (executed: `segments` rendering, `NOTIFICATION_PROJECT_TAGGED_COPY`, amber chip, `parseTaggedProjectLabel`) · `notifications/bilateral-contributor-tagging` (executed: trigger, recipients, dedup) |
| Parallel-safe | no. Same files as `w1w2-project-tagged` |
| Amends | BCT scenario 7 message text (BCT-R-7, project targets only). BCT scenario 6 (Center targets), dedup and triggers stay **unchanged** |

## 2. Intent

When ICRISAT reports a W3/Bilateral result and tags a bilateral project that belongs to Alliance (Bioversity), Alliance's Center Users should see a short line they can scan quickly. It says who tagged it (the **reporting Center**), which of **their** projects, and which result. No action is needed from them.

## 3. Problem / Current Behavior

| Piece | Today | Evidence |
|---|---|---|
| Trigger | Result reaches Pending Review, from bilateral submit or `POST /api/bilateral/create` ingest | `bilateral.service.ts:705` → `notifyBilateralContributorsOnSubmission` |
| Recipients | Active Center Users of each **non-lead** project's owner Center. The submitter is excluded. One row per user per result, across types (BCT-R-9) | `result-tagged-notification.service.ts:196-224`, `emitFor` |
| Stored text | Server-composed sentence: `"reported by ICRISAT has tagged the B-A1187 of your center (ABC). Click to see the result."` | `:191, :219-223, :344` |
| Client | `isComposedTaggedText` → fallback `"The result <link> <text>"`. Nothing in the middle of the sentence is bold | `notification-type.constants.ts:347-351` |
| Push / message | Same composed fallback | `notification.service.ts:~1120` |
| Chip / funding chip | Already right: amber `Bilateral project tagged` (chip by type), `W3/Bilateral` chip from `obj_result.source_name` | `w1w2-project-tagged` WPT-R-6, inbox-revamp |
| Avatar | The mockup shows an amber briefcase. W3/Bilaterals rows already get an icon avatar instead of initials (`notification-item.component.spec.ts:1100`), but whether this type gets the briefcase is **not verified**. Check it in specify | To verify |

The only gap is the **sentence shape and emphasis**.

## 4. Proposed Outcome

| Element | Target (`mockup/bct-project-tagged-row.png`) |
|---|---|
| Sentence | **`{reporting Center acronym}`** `has tagged the bilateral project` **`{project code}`** `from your center (`**`{owner acronym}`**`) to result` **`{result code}`** `- {title}` (the title is the link) |
| Reporting Center | The result's leading Center: `clarisa_institution.acronym`, else its `code`. If neither resolves, the row reads `A CGIAR Center` (the same degraded path as today) |
| Project code | `clarisa_projects.short_name` (e.g. `B-A1187`), the same as W1/W2 (WPT D-1). The mockup's `1187` is illustrative |
| Owner acronym | The owner Center's acronym, else its code. Never `()` (NTC-R-1) |
| Bold | Reporting Center, project code, owner acronym, result code |
| Behavior | Informational. Clicking opens the result in `view`. No Accept or Decline |
| Surfaces | Inbox Updates row, the bell, and the server `message` |

## 5. Scope

| Layer | Change |
|---|---|
| Server: emit | In `notifyBilateralContributorsOnSubmission`, **project targets only** store a new self-describing sentence: `"{reporter} has tagged the bilateral project {code} from your center ({owner})"`. Center targets keep today's composed text. Dedup and ordering stay as they are |
| Server: read | `buildResultNotificationDescription` recognises the new shape before `isComposedTaggedText`, and returns `"{reporter} has tagged the bilateral project {code} from your center ({owner}) to result {code} - {title}"` |
| Client: text | The `RESULT_BILATERAL_PROJECT_TAGGED` branch matches the new shape with an anchored regex (`parseBilateralProjectTaggedText`) **before** the composed check, and builds `segments` with the 4 bold tokens. It reuses `NOTIFICATION_PROJECT_TAGGED_COPY` (`verb`, `centerClauseWithLabel`) plus one new `reporterFallback` key |
| Tests | Server: `result-tagged-notification.service.spec.ts` (new text, acronym→code fallback, degraded reporter, Center target unchanged, dedup unchanged), `notification.service.spec.ts` (new shape, old BCT composed row unchanged). Client: `notification-type.constants.spec.ts`, `notification-item.component.spec.ts` (segments and bold, old composed fallback, W1/W2 bare shapes unchanged). Scoped Jest, `--maxWorkers=2` |

## 6. Non-Goals

- BCT scenario 6 (the `CG Center tagged` row for bilateral results). It could get the same treatment later as a sibling.
- Changing the trigger (still Pending Review, not draft save), the recipients, or dedup.
- A new notification type, a migration, or an email template.
- Rewriting historical rows. Old BCT composed rows keep rendering through today's fallback.
- Touching the W1/W2 direct-tag shapes (`"B-A1080 (ABC)"` and legacy bare).

## 7. Affected Users, Systems, And Specs

| Area | Files |
|---|---|
| Server | `api/notification/services/result-tagged-notification.service.ts` (+ spec), `api/notification/notification.service.ts` (+ spec) |
| Client | `shared/constants/notification-type.constants.ts` (+ spec), `internationalization/notification-project-tagged.copy.ts`, `notification-item.component.spec.ts`. The bell only needs verifying |
| Users | Recipients are Center Users of the Center that owns a tagged non-lead project, including other users of the reporting Center when it owns the project (AC36). The emitter (the Center submitting) sees no change |
| Related specs | `notifications/w1w2-project-tagged` (pattern), `notifications/bilateral-contributor-tagging` (flow being amended), `changes/notification-tagged-center-name` (acronym rule) |
| Baseline | PRD AC-8 · TRD W4 · `docs/ux-ui/design.md` §7 and §8 · `bilateral-result-summaries.en.md`: **not** affected (no payload change) |

## 8. Visual Reference

- Source: user-provided screenshot
- Location: `docs/specs/notifications/bilateral-project-tagged/mockup/bct-project-tagged-row.png`
- Notes: amber briefcase avatar. **ICRISAT** is plain in the mockup but is bold per D-1. The project code, `(ABC)` and the result code are bold, and the title is a violet link. Chips: amber `Bilateral project tagged`, outlined `W3/Bilateral`, then `Output · Capacity Sharing for development · 5 days ago`.

## 9. Requirement Delta Preview

### ADDED Requirements

- New BCT project-target rows store `"{reporter} has tagged the bilateral project {code} from your center ({owner})"`. The client and the server render it as the target sentence, with 4 emphasized tokens.

### MODIFIED Requirements

- BCT-R-7 message: changes from `"The result <code> - <title> reported by <X> has tagged the <project> of your center (<Y>). Click to see the result."` to the new sentence.

### REMOVED Requirements

- none

## 10. Approach Options

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Self-describing sentence + anchored parse (recommended)** | The server stores the readable sentence with no leading `The result`. The client and server match `^(.+) has tagged the bilateral project (.+) from your center \(([^()]+)\)$` first | Server-only data, fixed at emit time, so no extra query. The stored text is readable as is. Old composed rows still hit the existing fallback, because they end in `Click to see the result.` and don't match the anchored regex | The parse must run **before** `isComposedTaggedText` (the new text contains ` has tagged the `). A twin regex has to be kept in sync on the server |
| B. Reuse the W1/W2 bare label + resolve the reporter on the client | Store `"B-A1187 (ABC)"`. The client picks the "Center" lead when `source_name` is W3/Bilaterals | One stored shape | The inbox payload has no lead Center. It would need a join on the hot `inbox-paginated-load` query, and a W3 result tagged in the W1/W2 flow would be ambiguous |
| C. Delimited structured label (`ICRISAT␟B-A1187␟ABC`) | Parse on a reserved separator | Unambiguous | Unreadable in raw data and any third consumer. A new convention nobody else uses |

## 11. Recommended Approach

**Option A.** It's the smallest change:

- 1 line of emit text and 1 branch on the server
- 1 parser plus segments on the client, reusing the WPT copy and the `segments` renderer
- no query, no migration, no new type, dedup untouched

## 12. Risks, Dependencies, And Open Questions

| ID | Item | Status |
|---|---|---|
| R-1 | Order matters: the new-shape check must come before `isComposedTaggedText` on both client and server. Add a falsifier test that swaps the order and goes red | Design |
| R-2 | A project `short_name` containing ` from your center (` is very unlikely. The anchored, last-`(…)` regex keeps parentheses inside names safe (the same trick as WPT DR-1) | Design |
| R-3 | Memory rule: changing asserted copy breaks specs. Run the affected client specs before committing | Constraint |
| R-4 | QA needs a bilateral result whose non-lead project has a resolvable owner Center, submitted to Pending Review, with a recipient who isn't the submitter | Accepted |
| D-1 (was OQ-1) | The reporting Center (**ICRISAT**) is **bold**, consistent with the SP code in W1/W2 | Decided, Santiago, 2026-10-02 |
| D-2 (was OQ-2) | The trigger stays **Pending Review** (today's BCT rule). No notification on draft save | Decided, Santiago, 2026-10-02 |
| D-3 (was OQ-3) | No Jira ticket | Confirmed, Santiago, 2026-10-02 |

No `docs/specs/kaizen-log.md`, so no Active Lessons apply.

## 13. Success Criteria

- ICRISAT submits bilateral result 9322 tagging non-lead project `B-A1187`, owned by ABC. ABC's Center Users get **one** Updates row and one bell row, reading exactly as in §4, with no Accept or Decline.
- The same submission's `CG Center tagged` rows, dedup (project text wins), and the submitter exclusion are unchanged.
- Old BCT composed rows and W1/W2 bare and enriched rows render byte-for-byte as before.
- Scoped server and client Jest, tsc and lint pass. There's no migration.

## 14. Next Step

```text
/akili-specify notifications/bilateral-project-tagged
```

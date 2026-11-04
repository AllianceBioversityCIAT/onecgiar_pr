# Proposal — Primary SP reviews the result, it does not "accept as primary"

## 1. Document Control

| Field | Value |
|---|---|
| **Spec Path** | `notifications/primary-review-not-accept` |
| **Slug** | `primary-review-not-accept`, derived from the free-text argument and placed under `notifications/` next to its parent specs |
| **Type** | Change. It reverses a business rule from `notifications/bilateral-primary-sp-request` (PSR-R-1, PSR-R-4) and `notifications/primary-notify-on-submit` (PNS-R-2, PNS-R-3). The code works as those specs say; the rule was a miscommunication |
| **Approval Mode** | gated (default) |
| **Status** | approved (Santiago Sanchez, 2026-10-07). OQ-1..OQ-3 delegated to the agent ("haz lo que mejor creas conveniente"); resolved in §12 |
| **Owner** | Santiago Sanchez |
| **Date** | 2026-10-07 |
| **Deadline** | production before 15:00 today (user) |
| **Ticket** | none. Source: meeting summary with Angel, 2026-10-07 (pasted by the user) |
| **Depends on** | `notifications/bilateral-primary-sp-request`, `notifications/primary-notify-on-submit`, `notifications/primary-decline-rejects-result` (all shipped) |
| **Parallel-safe** | no. It edits `bilateral-center.service.ts`, `notification-item.*`, `pop-up-notification-item.*` and `contribution-request-drawer.copy.ts` |
| **Baseline cited** | `docs/prd.md` US-S3, US-Q3 · `docs/trd/trd.md` `results` + `Notification` modules |

---

## 2. Intent

SP01 is the primary Science Program **as soon as the Center submits the result**. SP01 does not accept its role. It **reviews the result** and approves or rejects it. When SP01 approves, SP02 (contributor) gets its request to accept or decline.

---

## 3. Problem / Current Behavior

| # | Today | Evidence |
|---|---|---|
| P-1 | At Submit for review, a result with no owner turns the saved choice into a **pending primary request**. No owner row is written | `bilateral-center.service.ts:2503-2508` (`sendDraft`) |
| P-2 | Until SP01 accepts, the result is hidden from SP01's lists, counts and review queue, and any review decision is refused | `PNS-R-2` |
| P-3 | SP01 gets an inbox row and a bell card with **"Accept as primary" / "Decline"**. This looks like a separate acceptance of the role | `request-decision.ts:59`, `contribution-request-drawer.copy.ts:153`, `pop-up-notification-item.component.ts:141` |
| P-4 | The "result submitted" notice is not sent at submit when there is no owner; it is sent only after accept | `bilateral-center.service.ts:2536-2541` |

What already works and stays:
- **Approve in the review drawer releases the contributor requests** (SP02 gets Accept/Decline): `results.service.ts:4862` → `releaseContributors`.
- **Reject in the review drawer requires a justification**: `result-review-drawer` + server check on `ReviewDecisionEnum.REJECT`.
- **Deep link to the review drawer**: `entity-details/:sp/bilateral-review?reviewResult=…&reviewResultId=…`, built by `bilateral-result-open-route.util.ts` and used by `notification-navigation.service.ts`.

---

## 4. Proposed Outcome

| Situation | What happens |
|---|---|
| Center submits a result with SP01 saved as primary and no owner | SP01 becomes the owner **in the same transaction**. The result is **Pending Review** and shows in SP01's bilateral review list. SP01 members get the normal "submitted for your review" notice |
| SP01 opens the result | The review drawer opens. SP01 can complete the information, then **Approve** or **Reject** (justification required) |
| SP01 approves | SP02 gets its contributor request (Accept / Decline). Already works |
| SP01 rejects | The result is Rejected with the justification. Already works |
| An old **pending** primary request still in the inbox (created before `PNS`; prod has 2, both on **Editing** results, see OQ-3) | The Center can now **submit** that result: the pending request counts as the saved choice, SP becomes owner, the pending row is retired. If the SP clicks first: the button reads **"Review result"**; it makes SP01 the owner (existing `accept()`), then opens the review drawer when the result is Pending Review, or says "You will be notified when the Center submits it for review" when it is still Editing. The **Decline** button is removed from primary rows; rejecting is done in the drawer |
| Center changes the primary SP while editing a result that **already has an owner** (swap) | Direct owner change, no request (same `transferPrimary` path that Rejected results already use). Submit is never blocked by a swap again |
| Bell pop-up, primary card | Same **"Review result"** action. No double-click confirm (it no longer decides anything) |

Labels: Angel did not fix a final one. Proposed: button **"Review result"**, chip **"Needs your review"**. See OQ-1.

---

## 5. Scope

**Server**
- `submitForReview` (`bilateral-center.service.ts` ~L2503): when there is no owner, call `transferPrimary(resultId, savedChoiceId, user, manager, { releaseContributors: false })` instead of `sendDraft`. It already writes role 1, seeds the ToC stub and writes one ACCEPTED primary row. Then run `announcePendingReview` for this case too (remove the `hasOwner` gate at L2536).
- `assertSubmittable` (~L2672-2700): an ownerless result is submittable when it has a DRAFT **or a PENDING** primary choice. The "pending request blocks submit" guard stays only as a safety net for an owner + pending row (no longer produced).
- `submitForReview`: the chosen SP is `draft ?? pending`. `transferPrimary` retires every active primary row, so the old pending row is closed in the same transaction.
- `updatePrimaryAssignment` (~L369-405): when the result **has an owner** and the Center picks another SP, use `transferPrimary` (as the Rejected branch at L330 does) instead of `request()`. First pick with no owner stays a DRAFT (unchanged).
- Keep `accept()` as is: it is the bridge for old pending rows.

**Client**
- Primary request row (inbox `notification-item`, its drawer, bell `pop-up-notification-item`): Accept label → **"Review result"**; action = call the existing accept endpoint, then navigate with `bilateral-result-open-route` (`review-drawer`) when the result is Pending Review, otherwise show the "will be notified" message. Hide **Decline** for `request_type = 'primary'` rows. Remove the double-click confirm for primary rows.
- Center side (`section-zero-dashboard` hint): no "awaiting acceptance" text for the swap case any more; verify the copy at specify.
- Copy: `contribution-request-drawer.copy.ts` (`acceptAsPrimary`), chip text, row sentence if needed.
- Update the specs that assert "Accept as primary" (`request-decision.spec.ts`, `notification-item.component.spec.ts`, `pop-up-notification-item.component.spec.ts`).

---

## 6. Non-Goals

- Removing the primary-request tables, enums or services (PSR/PNS/PDR code stays; it is just no longer reached for new submits).
- Changing the review drawer, the approve/reject logic or the contributor release.
- A DB script for the 2 prod rows: the code path above resolves them (Center submit or SP click).
- API ingest results and the Rejected → resubmit flow (unchanged).
- Email.

---

## 7. Affected Users, Systems, And Specs

| Who / what | Impact |
|---|---|
| Center users | None visible. Submit works as today |
| SP members | See the result in their review list at submit; the inbox action opens the review |
| `bilateral-center.service.ts` | `submitForReview` branch |
| `notification-item`, `pop-up-notification-item`, `contribution-request-drawer`, `request-decision.ts` | Label, action, hide Decline |
| Specs PSR / PNS / PDR | PSR-R-1, PSR-R-4, PNS-R-2, PNS-R-3 superseded for new submits |

---

## 8. Visual Reference

- Source: None
- Location: —
- Notes: label and button visibility change on existing rows only; no new layout.

---

## 9. Requirement Delta Preview

### ADDED
- Submit for review with a saved primary and no owner makes that SP the owner and announces the result for review.
- A primary request row opens the result's review drawer.

### MODIFIED
- "Accept as primary" → "Review result" (accept + navigate, one click).
- The result is visible to SP01 from submit, not from accept.

### REMOVED
- Decline on primary request rows (rejection happens in the review drawer).
- Double-click confirm on primary bell cards.

---

## 10. Approach Options

| Option | What | Effort | Risk |
|---|---|---|---|
| **A. Owner at submit + "Review result" bridge** | Server: `transferPrimary` instead of `sendDraft`. Client: relabel, accept-then-navigate, hide Decline | ~1 server method, ~3 client files + specs | Low. Reuses shipped functions |
| B. Owner at submit + DB backfill of old pending rows | Same server change; old pending rows fixed by SQL; client only hides the buttons | Same + a DB step | Medium: needs a data script on prod before 15:00, ToC stub not seeded by SQL |
| C. Remove the primary-request lifecycle | Delete PSR/PNS/PDR paths | Large | High; not possible today |

## 11. Recommended Approach

**Option A.** It is the smallest safe path: no migration, no data script, and old pending requests keep working through the existing `accept()`.

---

## 12. Risks, Dependencies, And Open Questions

| ID | Item | Proposed default |
|---|---|---|
| R-1 | At submit, `announcePendingReview` also sends the BCT **informational** "you were tagged" notice to SP02. The **actionable** request still comes only after SP01 approves | Keep; this is how owner results already behave |
| R-2 | Client specs assert "Accept as primary"; changing copy breaks them (memory: run affected specs before commit) | Update and run only those specs, `--maxWorkers=2` |
| R-3 | Accept on click is a side effect of "Review result" for old rows | Acceptable: owner is the intended state anyway |
| OQ-1 | Final labels | **Resolved:** button "Review result", chip "Needs your review" (closest to Angel's "Needs your attention" while naming the action) |
| OQ-2 | Swap while editing | **Resolved:** direct owner change via `transferPrimary` (in scope, §5). Otherwise a swap would still produce an "accept as primary" request, against the new rule |
| OQ-3 | Pending primary requests in prod | **Resolved (user query, 2026-10-07):** 2 rows — request 4545 (result 12205 / code 9737, initiative 56) and 4546 (result 12206 / code 9738, initiative 58). Both results are **Editing (1)**, ownerless, already sent. Today their Center cannot submit them (`assertSubmittable` pending guard). Covered by §5 server items; verify both after deploy |
| R-4 | `accept()` on an Editing result (SP clicks before the Center submits) | Owner written, no announce (`announceIfPendingReview` only fires at Pending Review); later Submit sees an owner and announces normally |
| D-1 | After prod: tell Nicoleta to verify (meeting agreement) | User |

---

## 13. Success Criteria

- Center submits with SP01 primary, SP02 contributor → result is Pending Review and listed in SP01's bilateral review; SP01 has the "submitted for your review" notice.
- SP01 opens it, approves → SP02 gets Accept/Decline.
- SP01 rejects without text → blocked; with text → Rejected.
- An old pending primary row shows "Review result", no Decline; clicking it opens the review drawer for that result.
- Center of result 9737 / 9738 can submit; the SP becomes owner and the old pending row is inactive.
- Center swaps the primary on an owned Editing result → new owner at once, no request, Submit allowed.
- Affected Jest specs green (server + client, scoped).

---

## 14. Next Step

```text
/akili-specify notifications/primary-review-not-accept
```

Lite depth fits (2 tasks: server, client). Given the 15:00 deadline, `Approval Mode: pre-approved` can be set at specify if the user wants it.

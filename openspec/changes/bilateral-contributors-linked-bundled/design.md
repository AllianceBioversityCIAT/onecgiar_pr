## Context

The W1/W2 (pooled) form has asked the linked/bundled question for a long time and persists it in
`result.has_innovation_link` plus rows in the shared `linked_result` table, through a single writer:
`ContributorsPartnersService.updateContributorsAndPartners`. The bilateral (W3) Contributors &
Partners section renders the same question — same wording, same catalogue — but has no field for it
on `SaveBilateralContributorsDto` and no key in the bilateral detail payload, so the component wrote
the answer to a signal and lost it on reload. The house rule turned it into a visible-but-disabled
control with a `Coming soon` tag (`section-contributors.component.ts:213`).

Two constraints shape everything below.

1. **`linked_result` is shared.** The P22 *Links to results* section writes rows for the same
   `origin_result_id`, and legacy rows carry a `legacy_link` with a NULL `linked_results_id`. The
   generic writer `LinkedResultsService.createForInnovationUse` deactivates **every** active row of
   the origin when the selection is empty (`linked-results.service.ts:244-247`) — the blanket sweep
   that P2-3199 was raised for. P2-3424 already solved this with a narrow pair:
   `replaceLinkedResultsByOrigin` (`summary/repositories/results-innovations-use.repository.ts:281`),
   which spares the `legacy_link` rows, plus a guard in `SummaryService.saveInnovationUseLinkedResults`
   (`summary.service.ts:336-366`) that only clears on a "No" that retracts a stored "Yes".
2. **Two result types already own this answer elsewhere.** For Innovation Use the question lives in
   the type-specific section (`type-innovation-use.component.html:332`, PO decision by Ángel Jarrín on
   2026-09-10, P2-3424), and for Innovation Development the same column pair is mirrored into
   `results_innovations_dev.has_innovation_link` by `updateInnovationSummaryLink`
   (`contributors-partners.service.ts:580-618`) — the rows the green-check functions read.

## Data flow

```
client                                   server
─────────────────────────────────────────────────────────────────────────────────────
GET /bilateral/result/:id                results.service.ts getBilateralResultById
  commonFields.has_innovation_link  <──    result.repository.ts getCommonFieldsBilateralResultById
  linkedResults: number[]           <──    ResultsInnovationsUseRepository.getLinkedResultsByOrigin
        │
        ▼ hydrate (same subscribe that already hydrates the partner block)
  hasLinkedResult / selectedLinkedResultIds signals → radio + pr-multi-select
        │
        ▼ buildContributorsPayload() — keys travel only once linkedHydrated()
PATCH /bilateral/result/:id/contributors  bilateral-center.service.ts saveContributors
  has_innovation_link?: boolean      ──>    syncLinkedBundledAnswer()
  linked_results?: number[]          ──>      result.has_innovation_link (direct update)
                                              replaceLinkedResultsByOrigin() (narrow)
```

## Goals / Non-Goals

**Goals:**
- P2-3368 AC10–AC14 working end to end for the bilateral result types that have no other surface for
  this answer, verified by a reload in prtest.
- Not one row of another section's `linked_result` data lost.
- The same contract W1/W2 uses, so a result read from either surface says the same thing.

**Non-Goals:**
- Any schema migration. The column and the table exist.
- Touching the green-check MySQL functions (`validation_contributor_partner_*`). Whether a bilateral
  "Yes" should require at least one link is not in AC10–AC14, and the live functions are not readable
  from the repo (they are edited outside it).
- Widening `applyInnovationLinkSectionUpdate` so the classic W1/W2 path also uses the narrow writer.
  That is a real improvement and a real behaviour change for pooled results; it needs its own ticket
  and its own tests, not a side effect of this one.
- The other five findings of the 2026-09-23 Slack thread (notification deep links, "Your Result"
  wording, AI quality check, Science Program filter, tagged-Center wording). Santiago Sánchez took the
  notification ones; the AI-QA one is with Cristian Gamboa.

## Decisions

**D1 — Write with the narrow protocol, not with the shared writer.**
`saveContributors` gets a private `syncLinkedBundledAnswer` that mirrors
`SummaryService.saveInnovationUseLinkedResults` exactly: "Yes" + selection replaces the set; "No"
clears **only** when the stored answer was "Yes"; an unanswered question or an omitted key touches
nothing. *Alternative rejected:* delegating to `ContributorsPartnersService.updateContributorsAndPartners`,
which reaches `createForInnovationUse` and wipes the P22 rows on every autosave that carries an empty
selection. The bilateral section autosaves on every centre/project change, so that alternative loses
data on the first save.

**D2 — Exclude result types 2 and 7, in the client and in the server.**
The client hides the whole block (not disables it) when `resultTypeId()` is 2 or 7; the server ignores
both keys for those types. *Why hide and not disable:* a disabled control with no `Coming soon` tag
would be unexplained furniture, and the answer for type 2 is one section away. *Why also guard the
server:* an older client, the ingest payload or a direct API call must not create the second writing
surface the exclusion exists to prevent. *Alternative rejected:* including type 7 and duplicating the
`results_innovations_dev` mirror upsert here — a second writer of a green-check input, asserted
against a function this repo cannot read (the live functions are edited outside it). Not worth the
risk for a type whose question is unanswerable today anyway.

**D3 — Hydrate from the detail GET the section already calls.**
`loadExternalPartnersState()` is renamed `loadStoredContributorsBlock()` and fills the linked/bundled
signals from the same response, behind its own `linkedHydrated` flag. *Alternative rejected:* a second
HTTP call, or reading from `BilateralCreationService`, which does not keep these fields (the same
reason P2-3443 gave for the partner block).

**D4 — Keys travel only after hydration, exactly like the partner keys.**
`buildContributorsPayload()` adds `has_innovation_link` / `linked_results` only when `linkedHydrated()`
is true. Without this, the first centre change of a session would PATCH `has_innovation_link: null`
over a stored "Yes". The server's `!== undefined` guard cannot save us here: the client would be
sending a real value, just not the user's.

**D5 — `[isStatic]` follows `!readOnly()`.**
The literal `true` is the P2-3520 trap: `pr-multi-select` only honours `readOnly` when `isStatic` is
false, so a submitted result would render an editable-looking picker. Every other picker in this
template already binds `!readOnly()` (`:54`, `:93`, `:121`, `:194`, `:213`).

## Risks / Trade-offs

- **A "No" clears links another section created** → `replaceLinkedResultsByOrigin` spares only the
  `legacy_link` rows; rows with a real `linked_results_id` written by P22 *Links to results* are
  deactivated by an empty set. The only thing standing between those rows and an autosave is the
  "clear only on a No that retracts a stored Yes" guard, so that guard carries a dedicated test with a
  pre-existing link in the fixture.
- **Two writers of `result.has_innovation_link`** (the classic service and now the bilateral service)
  → mitigated by D2: the bilateral writer never runs for the two types whose summary rows need the
  mirror, and both writers read/write the same column with the same meaning.
- **Stale read for types 2 and 7** → not introduced here: `getInnovationLinkStatus` already prefers
  `result.has_innovation_link`, and this change writes nothing for those types.
- **The green check does not validate "Yes ⇒ at least one link" for non-innovation types** →
  out of scope and recorded as a dated note; AC10–AC14 do not ask for it. Not verified against the
  live database (that needs the VPN and is not this change's business).

## Migration Plan

No data migration. Deploy is a normal build: the client stops hiding the control and starts sending
two optional keys the server did not accept before; an older client simply omits them, which the
server reads as "leave untouched". Rollback is a plain revert — the rows written meanwhile stay valid,
because they are the same rows W1/W2 writes.

## Open Questions

- None blocking. The Innovation Use case, which reads like an open product question, was already
  decided by Ángel Jarrín on 2026-09-10 in P2-3424 and is implemented that way in the pooled form.
- To record in the ticket, not to resolve here: P2-3368 contradicts itself — the Block 2 table says
  *"Default: No pre-selected"* while AC10 says the field has no pre-selection. The code follows AC10
  (`hasLinkedResult` starts `null`), which is also what the pooled form does.

# Requirements — Bilateral Knowledge Product: pool-funding parity

## Document Control

| Field | Value |
|---|---|
| Module | `bilateral` |
| Sub-feature | `kp-pool-parity` |
| Status | in-progress |
| Depth | **Lite** |
| Type | Change |
| Ticket | P2-3980 (companion of P2-3981, AI Review off for KP in W1/W2) |

## 1. Context

A Knowledge Product (`result_type_id = 6`) reported through the bilateral editor must behave like a pool-funding KP (`rd-general-information`): its title and description come from the repository, and no AI quality check applies to it. Server side nothing changes: for a KP the server already skips the AI (`skipped_kp_rule`) and accepts `submitted_anyway` against that row.

## 2. Requirements

- **KPP-R-1** Title of Result is read-only on a bilateral KP.
- **KPP-R-2** Description of Result is read-only on a bilateral KP.
- **KPP-R-3** An empty description on a bilateral KP reads "Not applicable" (the field is not required).
- **KPP-R-4** Lead contact person, Impact areas, and the Contributors/Partners fields editable today stay editable.
- **KPP-R-5** The AI quality check neither runs nor shows for a bilateral KP (rail card, "View AI assessment", dialog, field flags, "AI quality check runs first" note).
- **KPP-R-6** "Submit for review" on a KP asks for confirmation: "This result will be sent to the Science Program for review."
- **KPP-R-7** Confirming submits the result for review once; cancelling changes nothing and sends nothing.
- **KPP-R-8** A KP with an empty title or description is never blocked from Submit by the completeness tracker.
- **KPP-R-9** Every other bilateral type, including its AI quality check, and pool funding behave exactly as before.

## 3. Out of scope

Server changes; the W1/W2 info alert shown on KPs in `rd-general-information`.

## 4. Acceptance

Each requirement is covered by a Jest spec named in `design.md` §4.

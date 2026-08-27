# Module Spec — Webhook Notifications to External Platforms — Requirements

> **Status:** Phase 1 (origin persistence) implemented; Phase 2 (dispatch) in progress
> **Tickets:** [P2-3166](https://cgiarmel.atlassian.net/browse/P2-3166) (epic [P2-3156](https://cgiarmel.atlassian.net/browse/P2-3156))
> **Branches:** `P2-3166-persist-external-platform` (Phase 1, unmerged) → `P2-3166-webhook-dispatch` (Phase 2), both based on `performance-refactor`
> **Sibling spec:** `docs/specs/notifications/bilateral-review-decision/` (P2-3157) — the in-app channel for the same decision event

## 1. Module / Feature

Outbound webhook delivery to external platforms when a Science Program reaches a final decision on
a bilateral result. Server-only; no client surface. Spans `api/results` (the trigger and the new
webhook module), `api/bilateral` (payload assembly, reused) and
`shared/microservices/email-notification-management` (the failure alert).

## 2. Context

External platforms push results into PRMS through `POST /api/bilateral/create`, authenticated by a
CLARISA API key. Once a Science Program approves or rejects one of those results, the originating
platform has no way to learn the outcome short of polling `GET /api/bilateral/results` and diffing.
P2-3166 closes that loop.

**Phase 1 removed the prerequisite that was believed to block this story.** The premise was that we
could not satisfy AC3 ("route to the platform the result came from") because that identity was not
stored. It was not stored, but it *was* arriving: `ClarisaApiKeyValidationService.validate()` got
`mis: { id, name, acronym }` back from CLARISA on every key validation and returned a bare boolean,
so the guard never saw it. The envelope fields (`idempotencyKey`, `tenant`, `op`, `received_at`) were
likewise validated and never read anywhere in the server. Phase 1 persists the authenticated
identity in three new columns on `result` and is already migrated in Testing.

Phase 2 — this spec's remaining scope — is the dispatch mechanism itself. Nothing of it exists yet:
`webhook_endpoint` and `webhook_delivery` appear in zero files, and no AC of P2-3166 is delivered.

Baseline citations:
- `docs/prd.md:157` — **AC-1 Typed result integrity** (the payload carries the typed result).
- `docs/prd.md:172` — **AC-4 Bilateral / platform-report stability**: changes are additive; the
  outbound payload reuses the documented `/create` shape rather than inventing a third contract.
- `docs/prd.md:190` — **AC-8 Observability and notifications**: background pipelines "MUST log
  structured outcomes and ACK only after success; failures MUST be recoverable **without manual
  SQL**". This is the requirement that drives the outbox over a fire-and-forget queue.
- `docs/prd.md:195` — **AC-9 Security and secrets**: "Tokens, **webhooks**, API keys, and credentials
  MUST NEVER be logged, printed, or echoed". This is why AC5 of the ticket cannot be implemented
  literally — see §5.
- `docs/trd/trd.md:254` — **W4 Notifications**.
- `docs/trd/trd.md:265` — **W6 Bilateral / platform-report enrichment**:
  "enriched `data` document … centralized in `bilateral.service.ts` (`enrichBilateralResultResponse`)".
  The webhook payload reuses exactly this.
- `docs/specs/bilateral-ai-workflow/bilateral-spec.md:610` — **D28**, webhook-per-Centre as a
  locked-in decision. See OQ-1.
- `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` — the authoritative payload contract.

## 3. In Scope / Out of Scope

### In scope

- Persisting the authenticated originating platform on ingestion (Phase 1, done).
- A configuration table of delivery endpoints, keyed polymorphically so a platform *or* a centre can
  be a recipient without a later migration.
- An outbox table and a scheduled dispatcher with bounded retries and exponential backoff.
- The signed POST payload, assembled from the existing bilateral enrichment path plus the review
  decision and its justification.
- An alert to the PRMS technical team when a delivery is permanently abandoned.

### Out of scope

- Any client/UI surface, including administration of endpoints. Rows are seeded or inserted by hand
  for now (see OQ-3).
- Inbound webhooks (PRMS receiving callbacks).
- The in-app channel to centres — that is P2-3157, already delivered.
- Email to centres on rejection. `bilateral-spec.md` Appendix B commits to it, BR1 of P2-3157
  forbids it; P2-3157 resolved that in favour of BR1 and this spec does not revisit it.
- ~~Changing the `/create` request contract to accept a per-result external id.~~ **Reversed 2026-08-25.**
  Delivered as an optional additive field — see §4, ING-2. The original rejection assumed it would break
  existing producers; an optional field does not, and the alternative (reusing the composed
  `idempotencyKey`) gave platforms a value they could not match against their own records.

## 4. Requirements

### Functional

| ID | Requirement | Ticket AC |
|---|---|---|
| **WH-1** | A delivery is enqueued if and only if a Primary SP transitions a bilateral result to Approved (6) or Rejected (7). No intermediate transition enqueues anything. | AC1 |
| **WH-2** | The payload is a POST body containing the result's type, id, the full enriched typed `data` document, the decision, and the rejection justification when the decision is a rejection. | AC2 |
| **WH-3** | The destination is resolved from the result's own origin, not from anything the caller declared. | AC3 |
| **WH-4** | A delivery that fails (timeout, 5xx, network) is retried a bounded number of times with exponential backoff, and is never lost in the process. | AC4 |
| **WH-5** | When retries are exhausted the delivery is marked terminally failed and the PRMS technical team is alerted exactly once, with enough context to investigate. | AC5 |
| **ING-1** | On ingestion through `POST /api/bilateral/create`, the authenticated calling system (`mis.id`, `mis.acronym`) and the envelope's `idempotencyKey` are persisted on the result. **Done in Phase 1.** | AC3 (enabler) |
| **ING-2** | `POST /api/bilateral/create` accepts an **optional** per-result `external_reference` in `data`: the platform's own id for that result (consecutive, UUID, any string, max 191). Stored verbatim in `result.external_reference` and returned verbatim at the top level of the decision webhook and in the ingest response, so a platform maps our callback onto its record without parsing. **Additive and optional by design** — a bilateral created in the PRMS UI has no external system behind it and stores `null`. Supersedes the earlier reading, where the column held the envelope's composed `idempotencyKey`: that key is per payload and the producer never chooses it, so it could not be matched on their side. | AC-4 |

### Non-functional

| ID | Requirement |
|---|---|
| **NFR-1** | Dispatch never blocks or fails the review decision. The decision is already committed when the enqueue happens, and an enqueue failure is logged and swallowed. |
| **NFR-2** | Routing uses only authenticated identity. The request body's `tenant` field is self-declared and MUST NOT influence the destination — otherwise a caller could aim our callbacks at a platform it merely names. |
| **NFR-3** | The dispatcher is idempotent: running it twice over the same row must not send twice (repo rule for scheduled tasks — `src/CLAUDE.md` §13). |
| **NFR-4** | Delivery state is queryable data, not log lines, so a failure can be diagnosed and replayed without manual SQL surgery (AC-8). |
| **NFR-5** | No destination URL, secret or signature is written to any log, error message, email, or exception (AC-9, `.cursorrules`). |
| **NFR-6** | Adding the dispatcher must not introduce a circular module dependency. `BilateralModule` already imports `ResultsModule`, so the naive wiring cycles — see `design.md` §2.3. |

## 5. Declared deviation — AC5 and the destination URL

Ticket AC5 asks the alert email to contain *"Result ID, **Destination URL**, Error Code"*.

`docs/prd.md:195` (AC-9) and `.cursorrules` both forbid writing webhook URLs — complete or partial —
into logs, output, or error messages. `.cursorrules` is cited in the root `CLAUDE.md` as "READ THIS"
and names "URLs de webhooks (completas o parciales)" explicitly.

**Resolution.** The alert carries `result_id`, the recipient's **acronym**, the `webhook_delivery.id`
and the HTTP/error code. Whoever investigates reads the URL from `webhook_endpoint` using that id.
The template body itself states this, so the omission reads as deliberate to whoever receives the
mail rather than looking like a missing field.
AC5's purpose — being able to investigate and tell the affected Centre — is served; the prohibition
is not broken.

This is a deliberate deviation of the same kind as modal-vs-right-rail in P2-3157, and it is
declared in the P2-3166 Jira comment awaiting product confirmation. **It is not a silent
substitution.**

## 6. Open questions

| ID | Question | Owner | Blocking? |
|---|---|---|---|
| **OQ-1** | Ticket AC3 says "external center **or** platform". Phase 1 only resolves the platform: a bilateral result a centre creates in the PRMS UI has no `external_platform_id` at all. Does the webhook also fire for those, routed per centre (D28's literal reading)? | Product / Ángel | **No.** `webhook_endpoint` carries a `recipient_type` discriminator, so the answer changes which rows exist, not the schema or the resolver. Default until answered: `PLATFORM` only. |
| **OQ-2** | Confirm the AC5 deviation in §5. | Product | No. Implemented as proposed. |
| **OQ-3** | How are endpoints onboarded — admin UI, seed migration, or manual insert? | Product + us | No. Manual/seed in test is enough to exercise the flow. |
| ~~**OQ-4**~~ | ~~The alert email needs a template registered in the external email microservice.~~ **Retracted — this was wrong.** Templates live in *this* repo's `template` table and are rendered here with handlebars; `EmailTemplate` is the enum of those row names, and five existing flows (`STATUS_UPDATE`, `IP_EXPERTS_SUPPORT`, …) are lookup-only in exactly this way. The row is seeded by migration `1787510000000`. No external dependency, no owner needed. | — | No |

## 7. Notes on what is deliberately *not* inferred from `result.source`

`SourceEnum.Bilateral` has the literal value `'API'`, so `source = 'API'` means "is W3/bilateral",
**not** "arrived through the external API". Four distinct cases leave `external_platform_id` null,
and only the last one ever runs dry:

1. Pooled funding W1/W2 (`source = 'Result'`) — no external platform exists.
2. A bilateral result a centre creates in the PRMS UI (`bilateral-center.service.ts:113`,
   `creation_method: MANUAL`) — no API key, so no `mis`.
3. Any result under initiative `SGP-02`, stamped by `createOwnerResultV2`
   (`results.service.ts:2839`) from the ordinary JWT-authenticated reporting UI.
4. Bilateral results ingested before Phase 1 existed.

Therefore the dispatcher tests `external_platform_id IS NOT NULL` and never `source`. This is not a
hypothetical: `platform-report.service.ts:433` already needs
`source === Bilateral && primary_submitter_acronym !== 'SGP-02'` to pick its branch, and
`platform-report.constants.ts:30` calls that the "non-SGP-02 bilateral branch". The lesson predates
this spec.

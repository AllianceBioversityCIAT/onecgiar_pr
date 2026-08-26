# Module Spec — Webhook Notifications to External Platforms — Design

> Cites `requirements.md` in this folder. Baseline: `docs/prd.md` AC-4 / AC-8 / AC-9,
> `docs/trd/trd.md` W4 / W6.

## 1. Summary

When a Science Program approves or rejects a bilateral result, enqueue an outbound delivery in a
durable outbox; a scheduled dispatcher builds the signed payload, POSTs it to the endpoint registered
for the result's origin, retries with backoff, and alerts the technical team when it finally gives
up.

Two properties drive every choice below: the decision must never depend on a third party's endpoint
being up (NFR-1), and a failed delivery must be diagnosable and replayable from data rather than logs
(NFR-4 / AC-8).

## 2. Architecture

### 2.1 Where this lives

| Layer | Files |
|---|---|
| Origin persistence (Phase 1, done) | `api/bilateral/services/clarisa-api-key-validation.service.ts`, `api/bilateral/guards/clarisa-api-key.guard.ts`, `api/bilateral/decorators/external-platform.decorator.ts`, `api/results/entities/result.entity.ts`, `migrations/1787420000000-AddExternalPlatformIdentityToResult.ts` |
| Outbox schema | `api/results/webhook/entities/`, `migrations/<ts>-CreateWebhookTables.ts` |
| Outbox access | `api/results/webhook/webhook-delivery.repository.ts`, `webhook-outbox.module.ts` |
| Trigger | `api/results/results.service.ts` → `reviewBilateralResult` |
| Dispatch | `api/results/webhook/webhook-dispatch.service.ts`, `webhook-dispatch.cron.ts`, `webhook-dispatch.module.ts` |
| Payload (reused) | `api/bilateral/bilateral.service.ts` → `findOne` / `enrichBilateralResultResponse` |
| Justification (reused) | `api/results/results.service.ts` → `getBilateralReviewHistory` |
| Alert | `shared/microservices/email-notification-management/` |

### 2.2 Sequence

```
SP reviewer                PRMS server                                   External platform
    │                          │
    ├─ PATCH bilateral/:id/review-decision ─▶
    │              ┌── TRANSACTION ─────────────┐
    │              │ status → 6 or 7            │
    │              │ reviewed_by / reviewed_at  │
    │              │ result_review_history row  │
    │              └── COMMIT ──────────────────┘
    │                          │
    │              emitBilateralReviewNotification()   ◀── P2-3157, non-blocking
    │              enqueueBilateralWebhook()           ◀── this spec, non-blocking
    │                     │  resolve endpoint, INSERT webhook_delivery (PENDING, payload NULL)
    │◀─ 200 ──────────────┘
                           ⋮  (request over; nothing above waited on the network)
                    @Cron  │
                           ├─ claim due rows (UPDATE → SENDING)
                           ├─ build payload  (BilateralService.findOne + justification)
                           ├─ sign HMAC-SHA256
                           ├─ POST ─────────────────────────────────────────▶
                           │◀─ 2xx ──── SENT
                           │◀─ 5xx/timeout ── attempts++, next_attempt_at = backoff
                           └─ attempts exhausted ── EXHAUSTED + alert email (once)
```

### 2.3 The module cycle, and how the outbox dissolves it

`bilateral.module.ts:84` imports `ResultsModule`. The payload builder lives in `BilateralService`;
the trigger lives in `ResultsService`. So the obvious wiring cycles:

```
ResultsModule → WebhookModule → BilateralModule → ResultsModule     ❌
```

This is the same trap that blocks P2-3188. The fix is not `forwardRef` — it falls out of the outbox,
because **enqueuing does not need the payload**:

- **Enqueue** needs only a repository. `ResultsService` gets `WebhookDeliveryRepository` injected, and
  a repository provider has no service dependencies.
- **Dispatch** builds the payload at send time and therefore needs `BilateralService` — but nothing
  needs to import the dispatcher.

So the feature ships as two modules:

```
app.module ─▶ WebhookDispatchModule ─▶ BilateralModule ─▶ ResultsModule ─▶ WebhookOutboxModule
```

`WebhookOutboxModule` holds entities + repository only. `WebhookDispatchModule` is registered
directly in `app.module.ts` and is imported by nobody. Acyclic, no `forwardRef`, and
`app.module.spec.ts` is the regression test.

Building the payload at send time has a second benefit: the body reflects the result as it stands
when it actually goes out, and it is stored so a retry can replay the identical bytes.

## 3. Data model

### 3.1 `webhook_endpoint`

Delivery configuration. Polymorphic on purpose — see OQ-1: whether centres are also recipients
changes which rows exist, not the schema.

| Column | Type | Notes |
|---|---|---|
| `id` | `int` PK auto | |
| `recipient_type` | `enum('PLATFORM','CENTER')` | discriminator |
| `recipient_id` | `int` | `mis.id` for `PLATFORM`; CLARISA centre id for `CENTER` |
| `recipient_acronym` | `varchar(50)` | denormalised for the AC5 alert, which must not carry the URL |
| `url` | `varchar(500)` | destination. Never logged |
| `secret` | `varchar(255)` | HMAC key. Never logged |
| `is_active` | `tinyint` default 1 | disable a destination without deleting it |
| `created_date`, `last_updated_date` | timestamps | |
| `UNIQUE (recipient_type, recipient_id)` | | one endpoint per recipient |

### 3.2 `webhook_delivery` — the outbox

The status columns copy `bilateral_ai_jobs` (`migrations/1784921546787-CreateBilateralAiTables.ts`),
which already models exactly this shape in this repo — `status` varchar, `attempts` int,
`error_code` / `error_message`, `response_snapshot` json. No new convention is invented.

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` PK auto | quoted in the AC5 alert |
| `result_id` | `bigint` FK → `result` | |
| `endpoint_id` | `int` FK → `webhook_endpoint` | resolved at enqueue time, so a later config change cannot silently redirect a queued delivery |
| `decision` | `varchar(10)` | `APPROVE` / `REJECT` |
| `payload` | `json NULL` | filled at send time, not at enqueue |
| `status` | `varchar(20)` default `PENDING` | `PENDING` / `SENDING` / `SENT` / `FAILED` / `EXHAUSTED` |
| `attempts` | `int` default 0 | |
| `last_http_status` | `int NULL` | |
| `last_error` | `text NULL` | message only. Never the URL |
| `next_attempt_at` | `timestamp NULL` | backoff schedule |
| `alerted_at` | `timestamp NULL` | makes the AC5 email exactly-once |
| `created_date`, `last_updated_date` | timestamps | |
| `INDEX (status, next_attempt_at)` | | the dispatcher's only query |

`SENDING` is not decoration: it is how NFR-3 is met. See §5.

## 4. Resolution — which endpoint (AC3)

```
if (result.external_platform_id != null)
    → PLATFORM / external_platform_id
else if (centres are enabled by OQ-1)
    → CENTER / lead centre of the result, from results_center
else
    → no endpoint: log and return
```

Reuse `getBilateralReviewRecipientIds`'s existing lead-centre lookup path
(`results.service.ts:2670`) rather than a second query for the same fact.

**The predicate is `external_platform_id IS NOT NULL`, never `source`.** `requirements.md` §7 lists
the four null cases and the two places in the codebase that already learned this. A result with no
active endpoint is skipped with a log line, not an error — a centre creating a result by hand is
normal, not a fault.

## 5. Dispatch cycle (AC4)

`@Cron` in `webhook-dispatch.cron.ts`, following `clarisaCron.service.ts` (named cron, class-named
`Logger`). `ScheduleModule.forRoot()` is already global in `app.module.ts`.

1. **Claim.** `UPDATE webhook_delivery SET status='SENDING' WHERE status IN ('PENDING','FAILED') AND
   next_attempt_at <= NOW()` (bounded), *then* read the claimed rows. Claiming before sending is what
   makes a double-run safe (NFR-3) — the second run finds nothing due.
2. **Build.** `BilateralService.findOne(result_id)` for the enriched typed document, plus the decision
   and, for a rejection, the justification from `getBilateralReviewHistory`. Store it in `payload`.
3. **Sign.** HMAC-SHA256 of the serialized body with the endpoint's `secret`, in a header. The ticket's
   technical note leaves the scheme to us.
4. **Send.** POST with a timeout.
5. **Settle.** 2xx → `SENT`. Otherwise `attempts++`, record `last_http_status` / `last_error`, and
   either `FAILED` with `next_attempt_at` at the next backoff step, or `EXHAUSTED` once the cap is
   reached.
6. **Alert.** On the transition into `EXHAUSTED`, and only when `alerted_at IS NULL`, send the email
   and stamp `alerted_at`.

Backoff is exponential from a small base; the cap lives in one named constant so it is tunable
without touching logic.

**Recovery without manual SQL (AC-8):** replaying an abandoned delivery is flipping `status` back to
`PENDING` and clearing `next_attempt_at` — a supported operation on data, which is precisely what the
outbox buys over a queue whose failures live in logs.

## 6. Payload (AC2)

Nothing new is serialized. `BilateralService.findOne` (`bilateral.service.ts:519`) already produces
the enriched typed document, and it is the same shape `GET /api/bilateral/results` hands to external
consumers — so a platform receiving the webhook sees what it already knows how to parse (AC-4,
W6).

```jsonc
{
  "type": "innovation_development",   // the discriminator used by /create and /results
  "result_id": 12345,
  "decision": "REJECT",               // AC2: the new status
  "justification": "…",               // AC2: present only on REJECT
  "decided_at": "2026-08-21T19:04:00Z",
  "data": { /* enrichBilateralResultResponse output — MDS fields, geo, partners, … */ }
}
```

`justification` is **omitted** when there is none, never sent as an empty string — the contract
P2-3157 fixed when it removed the hardcoded `'Approved'` literal that had been polluting
`result_review_history`.

Any change to `data` is a change to the bilateral payload contract and must add a change-log row in
`onecgiar-pr-server/docs/bilateral-result-summaries.en.md`. Reusing the existing builder is what
keeps that from happening by accident.

## 7. The alert (AC5)

`EmailNotificationManagementService.sendEmail(...)` with a new `EmailTemplate` value and a new
`buildEmailData` case.

Contents: `result_id`, the recipient **acronym**, `webhook_delivery.id`, `last_http_status` /
error code. **Not the URL** — see `requirements.md` §5 and AC-9.

Mechanics, which follow the existing path exactly rather than inventing one: the body is a row in
this repo's `template` table, fetched by name and rendered with `handlebars.compile`, and the
rendered HTML goes out as `socketFile`. That is what `UserService.sendUserStatusChangedEmail` and
four other flows already do — `EmailTemplate` is the enum of `template.name` values, and five of its
members are lookup-only, never passed through `buildEmailData`. Recipients come from the
`technical_team_email` global parameter, already used by five flows, so no new configuration surface
is introduced. The row is seeded by `1787510000000-SeedWebhookFailureAlertTemplate`.

> An earlier draft of this spec claimed the template had to be registered in an external service and
> listed that as a blocking dependency. That was wrong — it is our table and our migration.

One real limitation remains: `sendEmail` is `_client.emit(...)` — fire-and-forget over RMQ, and
`onModuleInit` only logs a failed connection. The email is best-effort by construction. The durable,
auditable half of AC5 is the `EXHAUSTED` row, which is why AC5 was designed around the outbox in the
first place.

## 8. Alternatives considered

**RMQ instead of an outbox.** Three publishers already exist, so the plumbing is familiar. Rejected:
every client is injected `@Optional()` and gated by `isConfigured()`, so in an environment without
RMQ there would be no webhook *silently*; and "we gave up on this one" would exist only as a log
line, which fails AC-8's "recoverable without manual SQL". The outbox is durable with no new
dependency, and RMQ can still drain it later if volume demands.

**Env-var configuration for URLs.** Zero schema, but one URL per environment and changing a
destination needs a deploy. Rejected.

**Asking CLARISA for the URL.** Conceptually cleanest — CLARISA is the MIS registry — but it does not
return one today, and it would couple us to a change in a system we do not control. Rejected as a
starting point.

**Synchronous send inside the transaction.** Rejected outright: it would tie the SP's response time
to a third-party endpoint, and someone else's timeout would roll back a decision already taken.

**Requiring a per-result external id from platforms.** Cleaner for them, but it changes the
documented `/create` contract and the webhook would not work until every consumer adopted it.
Rejected as a starting point; an optional additive field remains possible (ING-2).

**A single webhook module.** Rejected — it cycles (§2.3).

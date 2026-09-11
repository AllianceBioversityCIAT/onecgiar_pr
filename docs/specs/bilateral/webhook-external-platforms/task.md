# Module Spec — Webhook Notifications to External Platforms — Tasks

> Cites `requirements.md` and `design.md` in this folder. Tickets: P2-3166 / epic P2-3156.
> **Status:** Phase 1 done and migrated in Testing; Phase 2 (`WH-T-1` … `WH-T-7`) in progress.

## 1. Scope

Everything remaining for P2-3166's five ACs. Branch `P2-3166-webhook-dispatch`, cut from
`P2-3166-persist-external-platform` (which carries Phase 1) and kept current against
`origin/performance-refactor`.

## 2. Pre-flight

- [x] Branch based on `performance-refactor`, **not** `staging` — the centre module does not exist there.
- [x] Phase 1 present on the branch (verified by file existence, not by assumption).
- [x] Base current against `origin/performance-refactor`; the 7 commits it had moved ahead touch only
      `onecgiar-pr-client`, so `results.service.ts:3709` is unchanged.
- [ ] **DB access** for `migration:check` / `migration:run`.
- [x] ~~OQ-4: template registered on the external email microservice.~~ Retracted — the template is a
      row in this repo's `template` table, seeded by migration `1787510000000`. No external owner.

## 3. Task list

### `WH-T-1` — Schema for the two tables ✅

`migrations/<ts>-CreateWebhookTables.ts`. One migration, both tables, following
`1784921546787-CreateBilateralAiTables.ts`: raw `CREATE TABLE` with backticks, `ENGINE=InnoDB`, named
indexes, real `down()` dropping in reverse FK order.

Columns per `design.md` §3. The two that carry design intent, not just data:
- `webhook_endpoint.recipient_type` — resolves OQ-1 without a future migration.
- `webhook_delivery.alerted_at` — makes AC5 exactly-once.
- `webhook_delivery.status` includes `SENDING`, which is how NFR-3 is satisfied.

### `WH-T-2` — Entities, repository, `WebhookOutboxModule` ✅

`api/results/webhook/entities/webhook-endpoint.entity.ts`, `webhook-delivery.entity.ts`,
`webhook-delivery.repository.ts`, `webhook-outbox.module.ts`.

Extend the right base class per `src/CLAUDE.md` §7.6 — or none, matching `bilateral_ai_jobs`, which
declares its own timestamps rather than inheriting `BaseEntity`. Pick one and be consistent; do not
mix `created_date` with `created_at`.

**Constraint:** this module imports `TypeOrmModule.forFeature` and nothing else. No service
dependencies — that is what keeps the graph acyclic (`design.md` §2.3).

Blocked by `WH-T-1`.

### `WH-T-3` — AC1: the enqueue hook ✅

`results.service.ts` → `private async enqueueBilateralWebhook(resultId, decision, user)`, called
immediately after `emitBilateralReviewNotification` (line ~3709), **outside the transaction**,
mirroring that method's shape: own `try/catch`, own `_logger`, returns void, never rethrows (NFR-1).

Endpoint resolution per `design.md` §4. `results.module.ts` imports `WebhookOutboxModule`.

> Predicate is `external_platform_id IS NOT NULL`. **Never `source`** — `requirements.md` §7.

Blocked by `WH-T-2`.

### `WH-T-4` — AC2: payload assembly ✅

In `webhook-dispatch.service.ts`. Reuse `BilateralService.findOne(result_id)` — do **not** write a
serializer. Add `decision`, `decided_at`, and `justification` from `getBilateralReviewHistory`,
omitted entirely when absent (the contract P2-3157 fixed).

HMAC-SHA256 of the serialized body with the endpoint's `secret`, in a header, via node `crypto`.

Blocked by `WH-T-2`.

### `WH-T-5` — AC4: the dispatch cron ✅

`webhook-dispatch.cron.ts` + `webhook-dispatch.module.ts`, registered in `app.module.ts` and imported
by nobody. Pattern from `clarisaCron.service.ts`.

Claim → build → sign → send → settle, per `design.md` §5. **Claim before sending**, not after.
Backoff cap and base as named constants.

Blocked by `WH-T-4`.

### `WH-T-6` — AC5: the alert ✅

New `EmailTemplate` value (lookup-only — no `buildEmailData` case; the body is a `template` row
rendered with handlebars, as `UserService` does) plus `webhook-alert.service.ts` and the seed
migration `1787510000000`. Recipients from the `technical_team_email` global parameter. Fires on the
transition into `EXHAUSTED` only when `alerted_at IS NULL`, then stamps it.

`result_id`, recipient acronym, `webhook_delivery.id`, error code. **No URL** — AC-9,
`requirements.md` §5.

Blocked by `WH-T-5`.

### `WH-T-7` — Tests ⬜

Co-located specs. The cases that matter more than the count:

1. Approving a result with **no** registered endpoint creates no row and throws nothing.
2. A bilateral result created in the centre's UI (`external_platform_id` null) enqueues nothing as
   `PLATFORM`. The counterexample is already pinned in `bilateral-center.service.spec.ts` — extend it,
   do not duplicate it.
3. A failed POST increments `attempts` and schedules `next_attempt_at`; the row survives.
4. Exhausting retries marks `EXHAUSTED` and sends the alert **once**, not on every cron tick.
5. The alert body contains no URL.
6. An enqueue failure does not fail the approval request.
7. Running the cron twice over one due row sends once (claim semantics).
8. `justification` reaches the payload on reject and is **absent** — not `''` — on an approve with no
   comment.
9. Routing uses `mis.id` from the validated key, never the body's `tenant` (NFR-2). Already pinned in
   `bilateral.service.spec.ts` from Phase 1; assert it again at the resolver.

## 4. Verification

```bash
cd onecgiar-pr-server
npx jest --testPathPattern="webhook|results.service|bilateral"
npx jest --testPathPattern="src/app.module"     # the DI graph — where a cycle would surface
npm run lint && npm run build
npm run migration:check
```

**Do not skip:** `WH-T-3` changes `ResultsService`'s constructor. Before committing,
`grep -rln "ResultsService" --include="*.spec.ts" src` and run **every** spec that comes back — a
file-name pattern does not cover dependency injection. That mistake cost 42 tests once on P2-3214.

**And confirm the branch before trusting a green:** `test -f` on a file the change introduces. A wide
sweep once passed only because the shell was on a branch that lacked the commits.

### End-to-end

1. Insert a `PLATFORM` endpoint row pointing at a test receiver.
2. Ingest a result through `POST /api/bilateral/create` with a valid API key; confirm
   `external_platform_id` is populated.
3. Submit for review, then approve. Confirm the `PENDING` row, then the signed POST arriving, then
   `SENT`.
4. Repoint the URL at something returning 500. Reject another result. Confirm `attempts` climbing with
   backoff, then `EXHAUSTED`, then exactly one alert, and that the alert carries no URL.
5. Flip the exhausted row back to `PENDING` and confirm it replays — AC-8's "recoverable without
   manual SQL" in practice.

## 5. Rollout

- Phase 1 must be merged to `performance-refactor` for any of this to be exercisable in prtest —
  `jenkins-trigger.yml` only builds that branch.
- `migration:run` per environment for `WH-T-1`.
- Endpoints must be seeded before the first decision, or deliveries simply skip with a log (which is
  the intended behaviour, not a failure).

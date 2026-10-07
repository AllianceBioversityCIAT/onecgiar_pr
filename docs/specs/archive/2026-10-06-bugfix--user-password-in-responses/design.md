# Design — User password hash leaks in API responses

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/user-password-in-responses` · **Lite** · Bug Mode |
| Status | approved, user 2026-10-06 |
| Requirements | `requirements.md` (approved 2026-10-06) |
| Cross-refs | `docs/prd.md` `AC-4`, `AC-9` · `docs/trd/trd.md` §8 Security, QAS-1 · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` |
| Reversion challenge | Run 2026-10-06 by an independent read-only agent. Outcome in PWD-DD-1 |

## 1. Summary

Mark the `User.password` column as **not selected by default** in its TypeORM mapping. Every find, relation load and query builder in the server then stops reading the hash, which closes the bilateral leak and every other `User` relation at once. No schema change, no migration, no payload redesign. A behavioral regression test proves the effect on the generated SQL.

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| PWD-P-1 | The bilateral relation load selects `password` today | TypeORM SQL generation | Offline probe on `Result` + `{obj_created, obj_external_submitter}` emitted `` `r__r_obj_created`.`password` `` and `` `r__r_obj_external_submitter`.`password` `` | `verified` | The leak has another source. Re-diagnose before T-1 |
| PWD-P-2 | `select: false` removes it from relation loads and plain `User` queries, and `addSelect` re-adds it | TypeORM 0.3.20 behavior | Same probe with the option applied (then reverted): `REL=false USERQB=false ADDSELECT=true` | `verified` | Fall back to an explicit column list in `buildResultRelations` (proposal option B) plus an audit |
| PWD-P-3 | No server or client code reads the hash from a loaded `User` or from a response | Static search, server + client | Leader grep + independent challenge agent: only login DTO input, env/config, Cognito calls and spec mocks | `verified` | That reader must `addSelect` explicitly. Add a task |
| PWD-P-4 | No raw SQL returns `users.password` to a caller | Grep of raw SQL | Only `user.repository.ts` `AllUsersByEmail` (already broken: `cdu` alias undefined) and `getUserByEmail`, both with **0 callers**. No `u.*` / `users.*` | `verified` | That raw query must drop the column (a raw query is not covered by `select: false`) |
| PWD-P-5 | `select: false` does not change the schema, so migration generation stays empty | TypeORM: `select` is a read option, not DDL | Not run yet. T-1 runs `npm run migration:check` | `assumed` | Do not ship a generated migration. Investigate the diff |
| PWD-P-6 | `save()` of a loaded `User` (hash property `undefined`) does not overwrite the stored hash | TypeORM skips `undefined` on update | Not verified by test. Impact is low, because login never reads local hashes | `assumed` | Stored hashes get nulled on user save. Harmless for auth (Cognito), but recorded as accepted risk D5 |
| PWD-P-7 | No response cache sits in front of the bilateral GET | `bilateral.service.ts` | The only `cache` hit is an unrelated comment at :4390 | `verified` | Cached payloads would keep the hash until they expire |

## 2. Architecture Overview

- **Server touched:** `src/auth/modules/user/entities/user.entity.ts` (one column option). Readers fixed transitively: `api/bilateral`, `api/results/results-toc-results`, `api/results/share-result-request` (+ `primary-program-request`), `api/user-notification-settings`, and any other TypeORM load of `User`.
- **Client:** none.
- **External:** bilateral consumers (STAR, MEL, TIP, W3RU) see one key removed.

Flow after the fix: `GET /api/bilateral/:id` → `buildResultRelations()` relation load → TypeORM builds SELECT from metadata → `password` excluded → the serialized `obj_created` / `obj_external_submitter` have no `password` key.

## 3. Data Model Changes

| Entity | Change |
|---|---|
| `User` (`users`) | `password` column becomes non-selectable by default. Type, nullability and name are unchanged. **No migration** (PWD-P-5) |

## 4. API Surface

No endpoint or DTO change. Response effect: `password` is removed from every serialized `User` (bilateral, results, share requests, notification settings). Bilateral impact (`AC-4`): a removal of a field that was leaked, not designed. It gets a change-log row in `bilateral-result-summaries.en.md` (PWD-R-4). The contract doc never documented `obj_created`, so no other section changes.

## 5. Server Workflow

Unchanged. Auth paths (Cognito login, first-login challenge, AD, OTP) never read the local hash (PWD-P-3).

## 6. Frontend Plan

Not applicable.

## 7. Security & Authorization

- Closes the exposure of credential hashes on the JWT-excluded `/api/bilateral/*` surface (TRD QAS-1, PRD `AC-9`).
- Default-deny at the mapping layer: future readers can't leak the hash by accident. They have to opt in with an explicit `addSelect`.
- **Not covered:** raw SQL. That is accepted risk D3, guarded by the T-1 grep audit.
- Rotation of already-exposed hashes is operational (proposal R2, PWD-OQ-1) and outside the code.

## 8. Performance & Capacity

Negligible improvement: one fewer `text` column per joined user.

## 9. Observability

None added. Hashes are not logged by this change.

## 10. Testing Plan

| Test | Proves | Type |
|---|---|---|
| **Regression spec** next to the entity | Builds TypeORM metadata **offline**: a `mysql` DataSource with a dummy database name and the server's entity globs, `buildMetadatas()` only, no connection. It generates SQL for (a) `Result` with the bilateral `obj_created` / `obj_external_submitter` relations, and (b) a plain `User` query builder, and asserts neither contains `password`. It also generates (c) a `User` query with an explicit `addSelect` of `password` and asserts it *does* contain it | Behavioral, on the real generated SQL. Red today, green after (both proven by the probe) |
| Existing auth specs (`auth.service`, `auth.controller`, `user.service`, `auth-microservice.service`) | PWD-R-3 | Regression, unchanged |
| Manual GET at the HITL pause | D6: the served payload has no `"password"` | Local stack, read-only |

The test's falsifier: remove the column option and spec (a)/(b) fail. Break the opt-in and (c) fails. Cost: about 19 s for the first run, because metadata loads every entity. That's acceptable for a single scoped spec.

## 11. Backwards Compatibility & Rollback

Additive-safe removal of a leaked field. Rollback means reverting the single commit. No data or migration to undo.

## 12. Design Decisions

### PWD-DD-1: Default-deny the column in the entity mapping (proposal option A)

- **Context:** the hash reaches responses through any TypeORM load of `User`. Five or more readers are known, and future ones are unbounded.
- **Decision:** make `password` non-selectable by default. Readers that need it opt in explicitly.
- **Alternatives:** (B) an explicit column list in `buildResultRelations`, rejected because it fixes only bilateral and every other reader stays exposed. (C) a global `ClassSerializerInterceptor` + `@Exclude`, rejected because it changes serialization behavior across the whole API and is too broad for an urgent fix.
- **Consequences:** raw SQL is not covered (D3). A future reader that needs the hash must `addSelect`.
- **Reversion challenge (Step 2.3), "what does removing this break?":** **nothing found.** The independent agent checked: server (no `.password` read on a loaded `User`, no `select`/`addSelect` of it, `bcrypt.util.compareSync` never fed a User hash, no save/update depending on it), client (only login form fields and a local-interface spec), and raw SQL (only the two dead `user.repository.ts` readers). Spec mocks containing `password` (`user.service.spec.ts:43`, `user-notification-settings.service.spec.ts:397`) are inputs, not assertions, so they're unaffected. Its migration concern is covered by PWD-P-5 and the `migration:check` step in T-1.

### PWD-DD-2: Leave the dead raw-SQL readers alone

- **Context:** `AllUsersByEmail` (already broken) and `getUserByEmail` select the hash through raw SQL and have no callers.
- **Decision:** don't touch them in this bugfix. Bug Mode keeps the fix scoped to the root cause. They become follow-up F1.
- **Alternative:** deleting them now, rejected as unrelated cleanup. They return nothing to any client today.

## 13. Open Gaps & Follow-ups

- **F1:** delete or sanitize `user.repository.ts` `AllUsersByEmail` / `getUserByEmail` (dead raw-SQL hash readers).
- **PWD-OQ-1:** production confirmation and the rotation decision belong to an authorized person or security owner.
- Accepted risks: D3 (future raw SQL), D5 (save of a loaded user, PWD-P-6).

## 14. Budget (tripwire for `/akili-execute`)

| Measure | Expected |
|---|---|
| Tasks | 1 |
| LOC | ~60 (1 entity line + ~50 spec + 1 change-log row) |
| Review rounds | 1 |

Depth check: the estimate matches **Lite**. It isn't low enough for `/akili-quick`, because it's security-relevant and needs a behavioral regression test.

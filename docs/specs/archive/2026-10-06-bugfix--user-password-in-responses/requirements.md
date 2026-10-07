# Requirements — User password hash leaks in API responses

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/user-password-in-responses` |
| Module | `auth` (`User` entity), consumed by `bilateral`, `results`, `share-result-request`, `user-notification-settings` |
| Type / Depth | **Bug** (security, urgent) · **Lite** · Bug Mode |
| Approval Mode | `gated` (inherited from `proposal.md`) |
| Status | approved, user 2026-10-06 |
| Proposal | `proposal.md` (approved 2026-10-06). Aligned, with one premise corrected (see §3) |
| Requirement prefix | `PWD-R-n` |
| Cross-refs | `docs/prd.md` `AC-4` (bilateral stability), `AC-9` (security & secrets) · `docs/trd/trd.md` §8 Security, QAS-1 · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` change log |

## 2. Executive Summary

The `users.password` column holds a bcrypt hash. Today it is serialized into every API response that loads a `User` relation. `GET /api/bilateral/:id` and `GET /api/bilateral/results` are the confirmed cases. Both sit outside JWT, so any holder of an API key can read the hashes. **After the fix, no response at any depth carries a `password` key for a user, and every auth flow keeps working.**

## 3. Root Cause (confirmed during specify)

| Fact | Evidence |
|---|---|
| The column is selectable by default | `user.entity.ts:44-49`: a plain `@Column`, no `select: false`. There is no `ClassSerializerInterceptor` and no `@Exclude` anywhere in `src` |
| A relation load pulls it in | Offline TypeORM SQL generation for `Result` with `{ obj_created, obj_external_submitter }` (the `buildResultRelations()` shape) emits `` `r__r_obj_created`.`password` `` and `` `r__r_obj_external_submitter`.`password` ``. Reproduced 2026-10-06 |
| The proposed fix closes it | The same probe with `select: false` on the column: the relation load emits no `password` and neither does a plain `User` query builder. `addSelect('u.password')` still emits it (opt-in works). The change was reverted after the probe |
| **Corrected premise:** login does not need the hash | Custom login (`auth.service.ts` `singIn`) authenticates through the Cognito auth microservice and never compares the local hash. AD and OTP don't read it either. The only raw-SQL readers (`user.repository.ts` `AllUsersByEmail`, `getUserByEmail`) have **0 callers** |

## 4. Glossary

| Term | Meaning |
|---|---|
| Hash | The value of `users.password` (bcrypt `$2y$…`, or `''` / `NULL` when the user has no local password) |
| User relation load | Any TypeORM `find*` / query builder that hydrates a `User` entity, directly or as a nested relation |
| Response | Any HTTP body the server returns: JWT routes, `/api/bilateral/*`, `/api/platform-report/*` |

## 5. Scope

**In:** making the hash non-selectable by default; a regression test; an audit of every `User` reader; a change-log row in the bilateral contract doc.
**Out (non-goals):** rotating or rehashing passwords (an operational decision, R2 in the proposal); deleting the dead raw-SQL readers (recorded as a follow-up, not folded into the bugfix); redesigning the bilateral response shape.

## 6. Stakeholders

| Persona | Effect |
|---|---|
| Bilateral consumers (STAR, MEL, TIP, W3RU) | Stop receiving user hashes. `password` disappears from `obj_created` and `obj_external_submitter` |
| All PRMS users | Their credential hash is no longer exposed |
| Login users (custom/Cognito, AD, OTP) | No visible change |

## 7. Functional Requirements

### Requirement PWD-R-1: No response carries a user hash

The system MUST NOT include a `password` property for any `User` object in any response, at any nesting depth.

#### Scenario PWD-R-1.S1: Bilateral GET for a result whose creator has a hash (reproduction)

- GIVEN result 11475, whose `obj_created` user has a non-empty `users.password`
- WHEN a client calls `GET /api/bilateral/11475` with a valid `x-api-key`
- THEN the response contains `obj_created` and `obj_external_submitter` with their other fields unchanged
- BUT it must NOT contain a `password` key under either object, or anywhere else in the body
- AND IT MUST behave the same way for `GET /api/bilateral/results`, which uses the same relation set

#### Scenario PWD-R-1.S2: Any other User relation load

- GIVEN any TypeORM load that hydrates `User`, whether by plain find or as a nested relation (results-toc-results, share-result-request, primary-program-request, user-notification-settings, admin panel, …)
- WHEN the SQL is generated
- THEN the `users.password` column is not selected
- BUT it must NOT depend on each reader remembering to omit it. The default MUST be "not selected"

### Requirement PWD-R-2: Explicit opt-in remains possible

A code path that legitimately needs the hash MUST be able to read it, but only by requesting it explicitly.

#### Scenario PWD-R-2.S1

- GIVEN a query builder on `User`
- WHEN it explicitly adds the `password` column to its selection
- THEN the column is selected
- AND IT MUST be the only way the hash enters an entity loaded through TypeORM

### Requirement PWD-R-3: Authentication is unaffected

Custom login (Cognito), the first-login password challenge, AD login and OTP login MUST behave exactly as before.

#### Scenario PWD-R-3.S1

- GIVEN the existing auth specs (`auth.service.spec.ts`, `auth.controller.spec.ts`, `user.service.spec.ts`, `auth-microservice.service.spec.ts`)
- WHEN they run after the fix
- THEN all of them pass unchanged
- BUT a write to an already-loaded `User` (for example `save()` after a find) must NOT null or overwrite the stored hash

### Requirement PWD-R-4: The contract change is documented

The bilateral contract doc MUST record that `password` was removed from user objects in bilateral responses.

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Security (`AC-9`, TRD §8) | 0 occurrences of a user hash in any response |
| Backwards compatibility (`AC-4`) | Removal of one leaked field only. No consumer may legitimately depend on it. Recorded in the change log |
| Performance | No change (one fewer column selected) |
| Data | No migration. The schema is untouched |

## 9. Defect Classes → Gate

| # | Defect class this fix can produce or miss | Gate that catches it |
|---|---|---|
| D1 | A TypeORM relation or find still selects the hash | **Regression test**: offline TypeORM SQL generation for the bilateral relation set and for a plain `User` query, asserting no `password` column. Red today (proven), green after |
| D2 | Opt-in is broken, so a future reader can't get the hash | The same test asserts that `addSelect` of `password` *does* emit the column |
| D3 | A raw-SQL query selects `users.password` (or `u.*`) and returns it. `select: false` does not cover raw SQL | **No automated gate.** Substitute: a grep audit recorded in the task (`password` and `users.*` / `u.*` in raw SQL). Today it finds only the two dead readers. Accepted risk for *future* raw SQL |
| D4 | An auth flow breaks | The existing auth specs, run scoped |
| D5 | Saving a loaded `User` nulls the hash | No automated gate. Premise: TypeORM skips `undefined` properties on `save`. Accepted risk, with low impact, because local hashes are unused by login |
| D6 | The deployed payload still contains the field (stale build or wrong branch) | **Manual check at the HITL pause**: a local-stack `GET /api/bilateral/11475`, response searched for `"password"`. Read-only. Production confirmation (proposal OQ-1) is for an authorized person after deploy |

## 10. Open Questions

- **PWD-OQ-1** (carried from proposal OQ-1, does not block): confirming production exposure is an operational task for an authorized person, together with the rotation decision (R2).

## 11. Requirement ID Index

| ID | Summary | Scenarios |
|---|---|---|
| PWD-R-1 | No response carries a user hash | S1 (bilateral repro), S2 (any User load) |
| PWD-R-2 | Explicit opt-in still works | S1 |
| PWD-R-3 | Auth flows unaffected | S1 |
| PWD-R-4 | Contract change-log row | — |

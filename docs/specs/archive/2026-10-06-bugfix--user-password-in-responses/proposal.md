# Proposal — User password hash leaks in GET responses

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/user-password-in-responses` |
| Slug | `user-password-in-responses`, derived from the user's request on 2026-10-06 |
| Type | **Bug** (security) · priority **urgent** |
| Approval Mode | `gated` |
| Status | **approved**, user 2026-10-06 |
| Date | 2026-10-06 |
| Author (session) | Santiago Sanchez |
| Origin | Found during T-7 of `bilateral/resubmit-rejected-result` (archive `2026-10-06-bilateral--resubmit-rejected-result`, `design.md` §13) |
| Depends on | none |
| Parallel-safe | yes (it touches the `User` entity and its readers, not the bilateral resubmission or notification code) |

## 2. Intent

The `password` column of a user (a bcrypt hash) must **never** appear in any API response object. Today it does.

## 3. Problem / Current Behavior

`GET /api/bilateral/:id` and `GET /api/bilateral/results` return `obj_created.password` and `obj_external_submitter.password`. On PRTest this was a real bcrypt hash (`$2y$12$…`) for at least one user. These endpoints sit outside JWT, so **any holder of a CLARISA API key** can read the hashes.

## 4. Bug Diagnosis

### Observed Symptom

The GET payload for result 11475 included `"obj_created": { …, "password": "$2y$12$…" }`. Other results show `"password": ""`, where the user has no local password.

### Reproduction Steps

1. Run `GET https://prtest-back.ciat.cgiar.org/api/bilateral/11475` with a valid `x-api-key`.
2. Inspect `response.obj_created.password` and `response.obj_external_submitter.password`.
3. **Expected:** the field is absent. **Actual:** the hash is present.

### Root Cause (confirmed)

Two things combine:

- **The column is selectable.** `onecgiar-pr-server/src/auth/modules/user/entities/user.entity.ts:44-49` declares `password` as a plain `@Column` with no `select: false` and no `@Exclude`. No `ClassSerializerInterceptor` is registered anywhere: a grep for `ClassSerializerInterceptor` and `@Exclude` under `src` finds nothing.
- **The relation is loaded wholesale.** `bilateral.service.ts` `buildResultRelations()` (~:1228-1243) loads `obj_created: true` and `obj_external_submitter: true`. That pulls every `User` column, including `password`, into the serialized response.

### Impact & Scope

- **Data exposure:** credential hashes go to external platforms (STAR, MEL, TIP, W3RU) and to anyone holding a key. bcrypt slows offline cracking but does not prevent it.
- **Blast radius to audit:** every reader that loads a `User` entity relation and returns it unfiltered. Candidates found by grep, still to confirm in specify:
  - `results-toc-results.service.ts`
  - `primary-program-request.service.ts`
  - `share-result-request.service.ts`
  - any `relations: { obj_* }` that resolves to `User`
- **Not affected:** login. `auth.service.ts:247` and `user.repository.ts:23/52` read `password` through explicit raw SQL. The recommended fix has to keep that path working.
- **Also check:** Swagger response schemas and the webhook payloads, in case they embed `User`.

### Fix Strategy

The smallest safe correction is to make `password` **non-selectable by default** (`select: false` on the column). Any code that needs it (login) must then select it explicitly. A regression test is required: a GET payload must contain no `password` key at any depth, and login must still work.

Route: `/akili-specify` (Lite) in **Bug Mode**. It is not cosmetic.

## 5. Proposed Outcome

No API response, bilateral or authenticated, contains a `password` key for any user. Login and password checks keep working.

## 6. Scope

- The `User` entity column (`select: false`).
- Every code path that legitimately needs the hash, which must select it explicitly. Login is the known one.
- An audit of every GET that serializes `User`, with any remaining exposure fixed.
- Regression tests: a scan of the bilateral GET payloads for `password`, and login still working.

## 7. Non-Goals

- Rotating or rehashing existing passwords. Recommended operationally, but outside the code change.
- Redesigning the bilateral response shape. Removing `password` is the only shape change (additive-safe, because consumers must not depend on it).

## 8. Affected Users, Systems, And Specs

| Area | Effect |
|---|---|
| External platforms (STAR, MEL, TIP, W3RU) | Stop receiving hashes |
| `auth` (login, AD, OTP) | Must keep reading the hash explicitly |
| Contract doc `bilateral-result-summaries.en.md` | Change-log row: `password` removed from user objects |

## 9. Visual Reference

- Source: None (backend only).

## 10. Approach Options

| Option | How | Trade-off |
|---|---|---|
| **A. `select: false` on the column** (recommended) | One decorator. Login adds `addSelect('u.password')`, or keeps its existing raw SQL | Fixes every TypeORM relation load at once. Each reader that needs the hash has to opt in |
| B. Strip it in `buildResultRelations` | `select` the user columns explicitly in the bilateral relations | Fixes only the bilateral GET. Other readers stay exposed |
| C. Global `ClassSerializerInterceptor` + `@Exclude` | Serializer-level hiding | Wide behaviour change across the whole API. Higher risk |

## 11. Recommended Approach

**Option A**, plus an audit pass. It closes the leak at the source for every relation load. Login already reads the hash through raw SQL, so the risk is contained.

## 12. Risks, Dependencies, And Open Questions

- **R1:** any TypeORM `findOne` that compares the password (rather than using raw SQL) breaks silently. Specify must grep every `password` reader.
- **R2:** the hash has already been exposed on PRTest and possibly in production. Whether to rotate is an operational decision for the security owner.
- **OQ-1:** is production affected the same way? Very likely, since it runs the same code. Confirm with one GET on production by someone authorized.

## 13. Success Criteria

- No response contains a `password` key at any depth. This is checked by a test over the bilateral GET payloads and by a sweep of `User` relation loads.
- Login (custom, AD, OTP) still works. This is checked by the existing auth specs, kept green.

## 14. Next Step

```text
/akili-specify bugfix/user-password-in-responses
```

Run in **Bug Mode**, with a mandatory regression test.

# Known backend bugs found on TEST — 2026-08-06

**To: Juan David Delgado**

Hi Juan David,

These two `500`s were found incidentally while I was working on the **frontend** `performance-refactor` branch (a navigation / UX pass on the client). They are not part of that scope, no ticket was open for them and nobody was assigned to them — I am handing them over rather than fixing them here, for two reasons:

1. Both are **backend** issues (`onecgiar-pr-server`), outside the branch I am working on.
2. I cannot test a fix properly: running the server locally needs **VPN access to the internal CGIAR database**, which I do not have. Everything below was verified **against the TEST backend over HTTP** (`https://prtest-back.ciat.cgiar.org`) plus reading the code — no local execution, no DB inspection.

Each section separates clearly **what I verified** from **what I am inferring**. Nothing here is a confirmed diagnosis unless it says "verified".

---

## Bug 1 — `GET /api/results/get/all` returns 500 (malformed SQL)

### Endpoint

```
GET /api/results/get/all
```

### Verbatim error (reproduced 2026-08-06, TEST)

```json
{
  "response": { "error": true },
  "statusCode": 500,
  "message": "[ResultRepository] => error: QueryFailedError: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'and r.is_active > 0' at line 71",
  "timestamp": "2026-08-06T05:56:08.925Z",
  "path": "/api/results/get/all"
}
```

### Root cause

Two problems stack on top of each other. **Both verified.**

**(a) Route shadowing.** There is no `@Get('get/all')` handler any more. The route that answers `/api/results/get/all` is the *by-id* route, because it is declared earlier in the controller and `all` matches the `:id` segment:

- `src/api/results/results.controller.ts:81` → `@Get('get/:id')` → `findResultById(@Param('id') id: number)`
- `src/api/results/results.controller.ts:103` → `@Get('get/all/data')` (the real "list all" route, declared **after**, so it never gets a chance for the 2-segment path)

So the request is served as "get the result whose id is the string `all`".

**(b) The id is interpolated raw into the SQL.** `ResultsService.findResultById` (`src/api/results/results.service.ts:1234`) forwards the value to the repository, which builds the statement by **string interpolation instead of a bound parameter**:

`src/api/results/result.repository.ts:1447-1449`

```sql
WHERE
    r.id = ${id}
    and r.is_active > 0;
```

With `id = "all"` the emitted SQL is `WHERE r.id = all and r.is_active > 0`. In MySQL, `ALL` is a reserved word forming the quantified comparison predicate `= ALL (subquery)`, so the parser expects a parenthesised subquery, finds `and` instead, and reports the failure at the token that follows — which is exactly the line holding `and r.is_active > 0`.

**Line-number check:** the template literal starts at `result.repository.ts:1378`, so `and r.is_active > 0` (source line 1449) is the **~71st/72nd line** of the query text (off-by-one depending on how the leading newline is counted, and the TEST build may differ from my checkout by a line). It is the **only** `and r.is_active > 0` occurrence in `ResultRepository` that lands near line 71 — I checked every occurrence in the file and computed the per-query offsets; the next closest candidates fall at SQL lines 39 and 22. The `[ResultRepository]` prefix in the message comes from `returnErrorRepository({ className: ResultRepository.name })` at `result.repository.ts:1456-1460`, which confirms the file.

### Always failing or conditional?

**Always failing — verified.** `/api/results/get/all` returns 500 on every call; it is deterministic, not data- or role-dependent.

More generally, the whole `get/:id` route mishandles non-numeric ids because of the raw interpolation. Verified on TEST:

| Request | Result |
|---|---|
| `GET /api/results/get/all` | 500 — SQL syntax error (`= all` reserved word) |
| `GET /api/results/get/xyz` | 500 — `QueryFailedError: Unknown column 'xyz' in 'where clause'` |
| `GET /api/results/get/999999999` | 404 — `Results Not Found` (correct behaviour) |
| `GET /api/results/get/all/data` | 200 |
| `GET /api/results/get/all/simplified` | 200 |
| `GET /api/results/get/all/roles/1` | 200 |

⚠️ **Security note (please read):** the `Unknown column 'xyz'` response proves the path parameter reaches MySQL **unescaped and unbound**. That is an SQL-injection surface on an authenticated endpoint, and it also leaks DB error text to the client. Even if the `get/all` symptom is judged low priority, the interpolation itself is worth fixing on its own merit.

### How it got here (verified via git history)

Commit `1b8ccd167` — *":bug: fix(result): result get all error fixed"*, davinzifc, **2022-11-23** — renamed the server route `@Get('get/all')` → `@Get('get/all/data')`, precisely to escape the collision with `get/:id`. The client method that calls the old path was never updated. So `/api/results/get/all` has been broken since **November 2022**; this is a long-standing leftover, not a recent regression.

### User-facing impact

The client still ships a method pointing at the dead path:

- `onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts:48-50` → `GET_AllResults()` builds `` `${this.apiBaseUrl}get/all` `` (with `apiBaseUrl = environment.apiBaseUrl + 'api/results/'`, line 34), i.e. exactly `/api/results/get/all`.

**What I verified about the frontend exposure (and a correction worth flagging):** on the `performance-refactor` branch, `GET_AllResults()` is referenced **only by its own unit test** (`results-api.service.spec.ts`) — no component or service calls it. The Results Center listing is actually served by `GET_AllResultsWithUseRole()` → `get/all/roles/filter/:userId` (`results-api.service.ts:51-77`), which returns **200** on TEST.

So: I could **not** confirm that this 500 breaks the live Results Center list, and I am deliberately not asserting that. What is confirmed is that (1) the endpoint is permanently broken, (2) the client still carries a method wired to it, so any future/other consumer that calls `GET_AllResults()` gets a hard 500 with **no client-side fallback or workaround** — there is no retry, no alternate path, nothing catching it. Other branches or the Swagger consumers may still hit it. **Inference, not verified:** if any deployment or branch other than the one I inspected wires `GET_AllResults()` into a component, that screen would fail outright.

### Suggested fix direction

1. **Bind the parameter** in `getResultById` (`result.repository.ts:1448`): use `r.id = ?` with `this.query(queryData, [id])`, as the neighbouring methods already do (e.g. `countResultByTypeAndStatus`, `result.repository.ts:177-178`).
2. **Validate the path param** at the controller: `@Param('id', ParseIntPipe) id: number` on `results.controller.ts:88`, so non-numeric ids return `400`, never a DB error.
3. Decide the fate of `/api/results/get/all`: either restore it as an alias of `get/all/data` (declared **before** `get/:id`, or with a numeric route constraint on `:id`), or drop `GET_AllResults()` from the client so the dead path stops being reachable. Adding the numeric constraint is the safer of the two, because it also protects every other `get/:id` caller.

---

## Bug 2 — `GET /api/type-one-report/fact-sheet/initiative/41` returns 500 (unguarded empty result set)

### Endpoint

```
GET /api/type-one-report/fact-sheet/initiative/41
```

Initiative 41 is **AVISA**, official code **`SGP-02`** (confirmed via `/clarisa/initiatives`: `portfolio_id = 3`, `cgiar_entity_type_id = 22`). The client treats it specially — it is partitioned out of the science-program lists as an "other project".

### Verbatim error (reproduced 2026-08-06, TEST)

```json
{
  "response": { "error": true },
  "statusCode": 500,
  "message": "[TypeOneReportRepository] => error: TypeError: Cannot read properties of undefined (reading 'initiative_stage_id')",
  "timestamp": "2026-08-06T14:47:08.380Z",
  "path": "/api/type-one-report/fact-sheet/initiative/41"
}
```

Note this is **not** a SQL error — it is an unhandled `TypeError` in JS that the repository re-throws through `returnErrorRepository`, which the global filter turns into a 500.

### Root cause — verified

`src/api/type-one-report/type-one-report.repository.ts:239`

```ts
const ginfo: any[] = await this.dataSource.query(
  initiativeGeneralInformationQuery,
  [initId],
);
const istage = ginfo[0].initiative_stage_id;   // ← line 239, no guard
```

The first query (`initiativeGeneralInformationQuery`, lines 12-75) reads from the **OST database** (`${env.DB_OST}`) and requires an *active stage* row:

`type-one-report.repository.ts:65-72`

```sql
FROM
${env.DB_OST}.initiatives i
  LEFT JOIN ${env.DB_OST}.initiatives_by_stages ibs ON ibs.initiativeId = i.id
  ...
WHERE
  ibs.active = 1
  AND i.id = ?
```

When the initiative has **no active `initiatives_by_stages` row in the OST DB**, the query returns `[]`, `ginfo[0]` is `undefined`, and line 239 throws. Lines 243-255 would fail the same way — line 239 is simply the first dereference. The SQL itself is fine and correctly parameterised; the bug is purely the missing empty-result guard.

### Always failing or conditional? — conditional, and NOT specific to initiative 41

Verified on TEST:

| Initiative id | CLARISA identity | Result |
|---|---|---|
| 1 | `INIT-01` Accelerated Breeding | 200 (`initiative_stage_id: 71`) |
| 2 | `INIT-02` Genome Editing | 200 |
| 30 | `INIT-30` | 200 |
| 35 | `INIT-35` Fragility, Conflict, and Migration | 200 |
| 38 | `PLAT-03` Environment and Biodiversity Impact Platform | **500** |
| 39 | `PLAT-04` Nutrition Impact Platform | **500** |
| 40 | `SGP-01` RTB Breeding | **500** |
| 41 | `SGP-02` **AVISA** | **500** |
| 42 | `SGP-04` AGGRi2 | **500** |
| 43 | `PLAT-05` Livelihoods Impact Platform | **500** |
| 44 | `SGP-05` Adaption Insights | **500** |
| 50 | `SP01` Breeding for Tomorrow | **500** |

So the pattern is: **the classic 2022-2024 `INIT-xx` initiatives work; platforms (`PLAT-*`), science group projects (`SGP-*`) and science programs (`SP*`) all fail.**

- **Verified:** the failure tracks the *entity family*, not initiative 41 specifically, and the exception is thrown at `type-one-report.repository.ts:239`.
- **Inferred (not verified — needs DB/VPN access to confirm):** the reason those entities fail is that they have **no proposal/stage record in the OST database** (`initiatives_by_stages` with `active = 1`), because OST only ever held the 2022-2024 investment-prospectus initiatives. The Type One Report fact sheet is fundamentally a *proposal-era* artefact (its own alert copy references the 2022-2024 investment prospectus), so newer entities have nothing to show. I could not query `${env.DB_OST}` to prove the rows are absent — that is the one link in the chain I am asserting from behaviour + code, not from data.

### User-facing impact

Type One Report → **Fact Sheet** tab (`onecgiar-pr-client/src/app/pages/type-one-report/pages/tor-fact-sheet/`). The component calls the endpoint in `ngOnInit` after setting `loadingData = true`, and its `subscribe(...)` has **only a next handler — no error handler** (`tor-fact-sheet.component.ts:63-89`). On a 500 the next handler never runs, so `loadingData` is never set back to `false`:

> **Selecting any platform / SGP / science program (including AVISA) in the Type One Report leaves the Fact Sheet page stuck on its loading state forever, with no error message.** The user sees a permanent spinner, not a "no data" state.

### Suggested fix direction

1. **Guard the empty result** at `type-one-report.repository.ts:239`: if `ginfo.length === 0`, return an empty payload (or throw a typed `NotFoundException`) instead of dereferencing `ginfo[0]`. A `404` with a clear message is far better than a `500`.
2. **Product decision needed (your call):** should the Fact Sheet tab even be offered for entities that have no OST proposal data? If not, the cleanest fix is upstream — hide/disable the tab for non-`INIT-*` entities — with the repository guard as defence in depth.
3. **Client hardening (I can take this one on the frontend side if you want):** add an error handler to the `subscribe` in `tor-fact-sheet.component.ts` so `loadingData` is reset and an empty/error state is rendered.

### Secondary finding in the same method (low severity, not the cause of the 500)

`type-one-report.repository.ts:318-323` filters the budget arrays with a misspelled key:

```ts
gi['budgetProposal'] = budgetProposal.filter((b) => {
  return b.inititiative_id === gi.inititiative_id;   // both sides are undefined
});
```

`budgetProposalQuery` aliases the column as `initiative_id` (line 165) and `gi` carries `initiative_id` (line 258) — so `b.inititiative_id` and `gi.inititiative_id` are both `undefined`, `undefined === undefined` is `true`, and the filter is a no-op that lets every row through. It happens to be harmless today because the query is already filtered by `initId`, but it is dead logic that will bite whoever changes the query later. Same shape in `budgetAnaPlan` (lines 321-323).

---

## How to reproduce

Both bugs are reproducible with a plain authenticated `GET` against TEST. **Never paste a real token into this file or any commit** — read it from the untracked `.env` at the monorepo root as described in `CLAUDE.md` (§ *Uso del token para consultas API*):

```bash
# Obtain the token as documented in the repo (root .env, key USER_TOKEN) — do NOT hardcode it.
TOKEN=$(grep '^USER_TOKEN=' /path/to/reporting/.env | cut -d'"' -f2)

# Bug 1 — always 500
curl -H "auth: $TOKEN" https://prtest-back.ciat.cgiar.org/api/results/get/all

# Bug 1 — supporting evidence that the path param reaches SQL unbound
curl -H "auth: $TOKEN" https://prtest-back.ciat.cgiar.org/api/results/get/xyz   # Unknown column 'xyz'
curl -H "auth: $TOKEN" https://prtest-back.ciat.cgiar.org/api/results/get/1     # 200 / 404 — correct

# Bug 2 — 500 for AVISA (SGP-02) and every other platform / SGP / SP entity
curl -H "auth: $TOKEN" https://prtest-back.ciat.cgiar.org/api/type-one-report/fact-sheet/initiative/41
curl -H "auth: $TOKEN" https://prtest-back.ciat.cgiar.org/api/type-one-report/fact-sheet/initiative/1   # 200 — control
```

The generic form is `curl -H "auth: <TOKEN>" <url>` — the custom `auth` header, **not** `Authorization: Bearer`.

---

## Was either bug already tracked?

**No — neither one, anywhere I could look.** What I checked:

- **`TODO` / `FIXME` / `HACK` / "known issue" markers** near the offending code: none in `src/api/type-one-report/`, none in `src/api/results/result.repository.ts`, none in `src/api/results/results.controller.ts`.
- **`onecgiar-pr-server/docs/`**: only four docs exist (`bilateral-module-portability-analysis.md`, `bilateral-result-summaries.en.md`, `p25-toc-mapping-guide.md`, `p25-toc-result-type-rules.md`). The single grep hit for `get/all` is an unrelated reference to `/api/results/type-by-level/get/all` in `p25-toc-result-type-rules.md`. Nothing mentions either failure.
- **Repo-wide search for a bug/issue register**: no `known-bugs*` / `known-issues*` file existed before this one.
- **`openspec/changes/`**: the only `get/all` hits are unrelated (`/v2/toc/level/get/all`, `/clarisa/centers/get/all`). Nothing about the fact sheet 500.
- **Tests**: `type-one-report.service.spec.ts` mocks the repository and only covers the happy path and a generic rejection — the empty-`ginfo` case is not exercised, and there is no `type-one-report.repository.spec.ts` at all. `results.controller.spec.ts` has nothing on the `get/:id` vs `get/all/*` route ordering.

The only historical trace of bug 1 is the 2022 commit `1b8ccd167` that renamed the route away from the collision without updating the client caller — but there is no note, comment or doc recording that the old path was left broken.

---

## Summary

| # | Endpoint | Failure mode | Frequency | Root cause (verified) |
|---|---|---|---|---|
| 1 | `GET /api/results/get/all` | 500 — MySQL syntax error | **Always** | `get/:id` (`results.controller.ts:81`) shadows the path; the id is interpolated raw into SQL at `result.repository.ts:1448`, so `r.id = all` hits MySQL's reserved `ALL` predicate |
| 2 | `GET /api/type-one-report/fact-sheet/initiative/:id` | 500 — `TypeError` | **Conditional** — every `PLAT-*` / `SGP-*` / `SP*` entity (incl. 41 AVISA); `INIT-*` are fine | `ginfo[0]` dereferenced without an empty-result guard at `type-one-report.repository.ts:239` when the OST query returns no rows |

Happy to pick up the client-side half of bug 2 (the missing error handler / stuck spinner) on my branch if that helps — the backend guards and the `get/:id` parameter binding are yours to place.

— Yeck

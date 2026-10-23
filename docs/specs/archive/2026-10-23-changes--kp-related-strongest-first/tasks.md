# Tasks — KP related: strongest first (`KRS`)

> Status: Approved 2026-10-22 (gated).


## 1. Scope of this task list

Four tasks:

| Task | What it does | Order |
|---|---|---|
| T-1 | Server filter | Can run in parallel with T-2 (different packages) |
| T-2 | Client tier ordering and the "N of 3" suffix | Can run in parallel with T-1; touches only the client and uses the existing KRR tier |
| T-3 | Client toggle and copy | Needs T-1's contract; same component as T-2, so it runs after T-2 |
| T-4 | PRTest acceptance | Last |

Budget (design §12): 4 tasks, ~500 LOC, 1–2 review rounds per task. Exceeding it trips the execute Leader.

## 2. Pre-flight checklist

- [ ] KRR archive (staged 2026-10-22) is committed on the working branch, so both specs never edit the same files concurrently (proposal Dep).
- [ ] Machine rules: Jest `--maxWorkers=2`, scoped, one run at a time. Before push, run `--findRelatedTests` on the changed files in each package.
- [ ] Live probes are GET-only against the public Discovery APIs. Browser checks are read-only: never click "Use this item" or "Create and continue".

## 3. Task list

### KRS-T-1 — Server: related-only filter, request-wide gate, echo

| Field | Value |
|---|---|
| Status | [x] done (PASS 2026-10-22, attempt 1) |
| Size | M (~70 prod + ~110 test LOC) |
| Depends on | — |
| Requirements | R-2 (server side), R-3, NFR-1, NFR-2, NFR-3 |
| Design | §5, §6, §7.1–§7.3, DD-3, DD-4 |
| Skills | `nestjs-expert`, `api-design-principles`, `tdd` |

**Scope**
- DTO: add `projectRelatedOnly`, an optional boolean, with a Swagger description. This DTO has no boolean query param yet, so add a `@Transform` that maps the string `'true'` to `true` and anything else to `false` (query strings arrive as text; a bare `@IsBoolean` would reject `"true"`). DTO spec covers `'true'`, `'false'`, absent.
- `buildRelevanceBlock`: add a filter mode that emits the same clauses without the `*:*` arm.
- `resolveProjectScope`: `relatedOnly = requested ∧ ranked ∧ fitsUntrimmed`, evaluated over **every** registered adapter with the full block (design §7.2).
- `composeScopedQuery` / `translateParams`: for `related`, use the filter form when `relatedOnly`. No `sort` when ranked, as today.
- Service: echo `projectScope.relatedOnly`, and add the param to the search cache key.

**Tests** (literal strings)
- The filter-form query for P-1486 on CGSpace: contains `AND NOT (` and ` AND (dcterms.subject:`, and does **not** contain `*:* OR`.
- **Byte-identical** params versus KRR when the param is absent or `false`, for related and linked, and for the non-project browse.
- Gate false. A multi-byte text that forces trimming (KRR-T-2 fixture) gives:
  - `relatedOnly=false` in the echo;
  - KRR behavior unchanged (boost form if ranked, plain if not);
  - no filter form on any adapter.
- A block that fits trimmed but not untrimmed gives `relatedOnly=false` (DD-4).
- Linked plus `projectRelatedOnly=true`: the linked query is unchanged.
- The cache key differs when only the param differs.
- With search text plus a type, affiliation and year filter, the filter-form request keeps the text base and every existing filter param (literal `query` and `f.*` params), so R-2's "AND IT MUST keep text/type/affiliation/year filters" holds.

**Verification**
- `cd onecgiar-pr-server && npx jest --maxWorkers=2 --silent --testPathPattern="repositories.config|project-relevance|cgspace-discovery|cgspace-search-query"`, then eslint on the touched files.
- Live GET probe on 3 hosts, P-1486 and iSPARK, year 2026. Report:
  - unfiltered vs filtered related totals;
  - linked ∩ filtered-related = ∅ (no handle overlap on page 1);
  - the share of `none`-tier items on the filtered page 1 (accepted residual, design §10).

- **Fails if:** any filtered total ≥ the unfiltered total; the filter form contains `*:*`; any toggle-off request differs from KRR.
- **Not evidence:** a probe on one host, or against fixtures.

**Done:** green, lint clean, probe table recorded in `execution.md`.

---

### KRS-T-2 — Client: tier ordering per loaded page, SP soft-sort scoped out, "N of 3" suffix

| Field | Value |
|---|---|
| Status | [x] done (PASS 2026-10-22, attempt 1) |
| Size | M (~50 prod + ~110 test LOC) |
| Depends on | — (uses the existing KRR `projectMatch`; can run in parallel with T-1) |
| Requirements | R-1, R-4 |
| Design | §8 (Tier ordering, SP soft-sort, Label suffix), DD-1, DD-2, DD-6, §11 |
| Skills | `angular-developer`, `spartan`, `tdd` |

**Scope**
- In `applyScopeOutcome`, for `scope=related` with echo `ranked=true`: stable-sort the incoming page by tier rank (strong, partial, weak, none/missing), then append.
- `displayItems`: skip the "SP matches first" reorder while the related list is ranked. Keep "Show matches only" filtering. Linked and unranked lists are unchanged.
- Badge text: `<label> · <n> of 3` for strong, partial and weak; "No direct match" has no count. Copy constants live in `KP_BROWSE_COPY`.
- Update KPAM specs that assumed SP-first on a ranked related list (design §11 item 1). Keep their SP-first assertions for linked and unranked lists.

**Tests** (`kp-cgspace-browse.component.spec.ts`)
- The iSPARK page: [Weak (MEL), Partial, Partial, Strong, Weak] renders as Strong, Partial, Partial, Weak (MEL), Weak, written literally.
- Append: page 1 is [Weak, Strong]. Page 2 is [Strong, None]. The DOM order is Strong, Weak, Strong, None, so page 1 items do not move.
- Unranked related: the order is unchanged, and SP-first still applies (KPAM).
- Linked list: SP-first still applies; no tier ordering.
- Labels:
  - "Strong match · 3 of 3", "Partial match · 2 of 3", "Weak match · 1 of 3";
  - "No direct match" with no count;
  - no `%` anywhere in the related section;
  - the badge tooltip is still present and focusable.

**Verification**
`cd onecgiar-pr-client && npx jest --maxWorkers=2 --no-coverage --testPathPattern=kp-cgspace-browse.component.spec`, then `npx ng lint --quiet --lint-file-patterns <touched files>`, then `npm run build:dev`.

- **Fails if:** the append test shows a page-1 card moving, or SP-first reorders a ranked related list.
- **Cannot prove:** the visual grouping and its legibility (jsdom). That goes to T-4.

**Done:** green, lint and build pass, KPAM coverage kept for the unranked and linked paths.

---

### KRS-T-3 — Client: "Only related KPs" toggle, param, unavailable state, proxy note

| Field | Value |
|---|---|
| Status | [x] done (PASS 2026-10-22, attempt 2) |
| Size | M (~60 prod + ~100 test LOC) |
| Depends on | T-1 (contract), T-2 (same component) |
| Requirements | R-2 (client side), R-3 (client side), R-5, NFR-3, NFR-4 |
| Design | §5, §8 (Toggle, Toggle state, Proxy note, Counts), DD-5 |
| Skills | `angular-developer`, `spartan`, `tailwind-design-system` |

**Scope**
- A `relatedOnly` signal, default false. It resets wherever `relatedRanked` resets.
- The toggle is a Spartan button with `aria-pressed`, matching the "Show matches only" control, placed next to it in the related header. It is shown only when the last related echo had `ranked=true`.
- `buildParams` sends `projectRelatedOnly=true` only when the toggle is on (related and linked requests alike; the server ignores it for linked).
- Toggling reruns the related search from page 0.
- Echo `relatedOnly=false` while the toggle is on → the toggle is disabled with the tooltip "Not available for this search", and the count is not presented as filtered.
- The ranked proxy note uses the design §8 copy. The unranked path keeps the KRR quick copy.

**Tests**
- Off by default; no param sent.
- On → the param is sent and the search restarts at page 0.
- Off again → the request params are identical to the initial off request.
- Echo `relatedOnly=false` with the toggle on → the unavailable state, and no "filtered" wording.
- Hidden when unranked.
- Resets when the project changes.
- `aria-pressed` reflects the state.
- The note copy is exact for both the ranked and the unranked path.
- The existing assertion "not tagged with this project" still passes.

**Verification**
Same commands as T-2, plus `npx jest --maxWorkers=2 --findRelatedTests <changed client files>`.

- **Fails if:** a toggle-off request differs from the pre-toggle request, or the toggle is shown on an unranked list.
- **Cannot prove:** keyboard operation in a real browser. That goes to T-4.

**Done:** green, lint and build pass.

---

### KRS-T-4 — PRTest acceptance (human or Leader browser check)

| Field | Value |
|---|---|
| Status | [x] done (PASS 2026-10-23, PRTest) |
| Size | S (manual) |
| Depends on | T-1..T-3 deployed to PRTest through `performance-refactor` (~30 min) |
| Requirements | R-1..R-5 (behavior), NFR-4 |
| Design | §8 |
| Skills | browser check (Claude in Chrome), read-only |

**Steps** (Centers → CIP → P-1486-GCDT; Centers → IITA → iSPARK; Output → Knowledge Product)
1. Confirm the served bundle contains the new copy ("Only related KPs").
2. First related page, no text: cards grouped Strong → Partial → Weak → None. "Load more" does not move earlier cards.
3. Labels show "· N of 3" and no `%` appears.
4. Toggle on: the total drops below 3821, linked is still excluded, and every visible card has a tier, apart from the accepted residual (count any "No direct match").
5. Keyboard: Tab to the toggle, Space/Enter toggles it, and the state is announced (`aria-pressed`).
6. Toggle off: the totals return to the KRR values.
7. iSPARK: the same checks; linked still shows 2 with no tier.

- **Fails if:** the first card of a ranked page is not the page's highest tier, or the toggle-on total is ≥ the toggle-off total.
- **Not evidence:** a check against a bundle not confirmed current.

**Done:** evidence and screenshots in `execution.md`, and the user confirms.

## 4. Dependency graph

```text
T-1 (server) ─────────┐
T-2 (client order) ───┴──► T-3 (client toggle) ──► T-4 (PRTest)
```

## 5. Coverage closure (scenario / clause → task)

| Clause | Owner |
|---|---|
| R-1 first-page order, literal | T-2 |
| R-1 "intra-tier relative order kept" | T-2 (literal iSPARK vector) |
| R-1 "BUT earlier pages must NOT move" | T-2 (append test), T-4 step 2 |
| R-1 "AND IT MUST NOT apply to linked or unranked" | T-2 |
| R-1 SP soft-sort scenario (replaced on ranked related; badge kept; KPAM kept elsewhere) | T-2 |
| R-2 toggle on: reload from page 0 | T-3 |
| R-2 toggle on: ≥ 1 factor clause; tier ≥ Weak when confirmable | T-1 (filter form), T-1 probe (`none` share), T-4 step 4 |
| R-2 toggle on: real totals < 3821 | T-1 probe, T-4 step 4 |
| R-2 "BUT must NOT include linked items" | T-1 (literal keeps `AND NOT`), T-1 probe, T-4 step 7 |
| R-2 "AND IT MUST keep text/type/affiliation/year filters" | T-1 (filter form keeps base and filter queries; assert in literal test) |
| R-2 toggle off: byte-identical | T-1 (server), T-3 (client params) |
| R-2 not available: hidden and no param | T-3 |
| R-2 default off and reset on context change | T-3 |
| R-3 gate false: plain or KRR request, echo false | T-1 |
| R-3 client must NOT label the count filtered; toggle unavailable | T-3 |
| R-4 three labels with "N of 3"; none has no count | T-2 |
| R-4 "BUT must NOT contain %" | T-2, T-4 step 3 |
| R-4 "AND IT MUST keep tooltip and focus" | T-2 |
| R-5 ranked note copy; unranked quick copy | T-3 |
| NFR-1 no extra upstream calls | T-1 (service call-count assertion unchanged) |
| NFR-2 < 2000 chars, untrimmed rule | T-1 |
| NFR-3 additive fields | T-1 (DTO/echo), T-3 (optional interface) |
| NFR-4 keyboard and state | T-3 (`aria-pressed`), T-4 step 5 |

## 6. Rollout & roll-back

- **Commits:** server (T-1), client (T-2 + T-3), docs. Promote through `performance-refactor` for PRTest.
- **Roll-back:** the client stops sending `projectRelatedOnly` and hides the toggle, and the server is unaffected (param absent → KRR). The tier ordering and the suffix are client-only reverts.

# Tasks — KP browse: related-section relevance ranking (`KRR`)

## 1. Scope of this task list

Five tasks. T-1 is a pure server module. T-2 wires the query, the DTO and the adapters, including the **live calibration**. T-3 attaches the explanation in the mapper and service. T-4 is the client. T-5 is the live acceptance on PRTest.

Budget (design §12): 5 tasks, ~650 LOC, 1–2 review rounds per task. Exceeding it trips the execute Leader.

## 2. Pre-flight checklist

- [ ] KPSF is on the working branch (`project-match.ts` exports `buildProjectMatch`, `buildProjectClause`).
- [ ] Test runs follow the machine rules: Jest `--maxWorkers=2`, scoped `--testPathPattern`, one run at a time. Before push, run `--findRelatedTests` on the changed files.
- [ ] Live probes only GET the public Discovery APIs. No PRMS writes.

## 3. Task list

### KRR-T-1 — `project-relevance.ts`: keywords, plural fold, relevance block, factors and tier

| Field | Value |
|---|---|
| Status | [x] done (2026-10-22, PASS attempt 1) |
| Size | M (~110 prod + ~140 test LOC) |
| Depends on | — |
| Requirements | R-5, R-6, R-9, NFR-2, NFR-3 |
| Design | §7.1, DD-2, DD-4 |
| Skills | `nestjs-expert`, `tdd` |

**Scope**
- New pure module next to `project-match.ts`. It reuses that module's tokenizer, stop-word list and min-length rule (export them if needed, without changing behavior) and the KPSF Solr escaping.
- `extractRelevanceKeywords`: at most 8 title words + 8 description words, lead-center acronym excluded, deduped.
- `foldPlural`: strips one trailing `s`/`es` on words of 4+ letters.
- `buildRelevanceBlock(adapter, keywords, centerName, program, weights)`: returns `null` when there are no keywords, no center name and no program.
- `evaluateProjectMatch`: factors in fixed order `keywords, center, program`; tier by count, 3/2/1/0 → strong/partial/weak/none.
- Program rule: port of the client `matchesTaggedMetadata`. Copy its spec vectors into this spec, so the two can never drift silently (DD-4).

**Tests** (`project-relevance.spec.ts`)
- Positives: `genebank` ↔ subject `genebanks`; `nematode` ↔ `root-lesion nematode`.
- Negatives:
  - `gene` ✗ `genebanks`;
  - a keyword only in the title ✗ (subjects are the only source);
  - no subjects ✗;
  - stop words or acronym only ✗;
  - acronym-only center ✗;
  - no affiliations ✗.
- Tier table: all 8 factor combinations → the expected tier.
- Injection: a description containing `") OR *:* (`, `\`, `"`, `^`, `~`, `AND NOT` produces only escaped word tokens; field names come from the adapter only.
- Length: the worst case (16 longest keywords + center + program) has an encoded length < 2000.
- `null` block when there is no usable context.

**Verification**
`cd onecgiar-pr-server && npx jest --maxWorkers=2 --silent --testPathPattern=project-relevance`, then `npx eslint <touched files> --quiet`.

- **Fails if:** `gene` matches `genebanks`, or a 2-factor item yields `strong`.
- **Not evidence:** a test that builds its expected string with the same helper it is testing. Expected strings are written literally.

**Done:** all vectors green, lint clean, no Nest imports in the module.

---

### KRR-T-2 — Query wiring: DTO params, adapter fields, `translateParams` relevance block, live calibration

| Field | Value |
|---|---|
| Status | [x] done (2026-10-22, PASS attempt 3) |
| Size | M (~70 prod + ~110 test LOC) |
| Depends on | T-1 |
| Requirements | R-1, R-2, R-3, R-4, R-9, NFR-1, NFR-2, NFR-4 |
| Design | §6, §7.2, §7.4, DD-1, DD-3, DD-6 |
| Skills | `nestjs-expert`, `api-design-principles`, `tdd` |

**Scope**
- DTO: add `projectDescription` (≤ 1000), `projectProgram` (≤ 200) and `projectLeadCenterName` (≤ 200), all trimmed and optional, with Swagger descriptions.
- Adapters: add `fields.subject` (CGSpace `dcterms.subject`, MEL/WorldFish `dc.subject`) and `fields.program` (`cg.contributor.programAccelerator`).
- `translateParams`: only for `related` + `applied` + non-null block, emit `<KPSF related query> AND (<block>)` and **no** `sort`; weights come from DD-3 by text presence. Otherwise the params are byte-identical.
- Echo `projectScope.ranked`.
- **Live calibration** (read-only probe script in the session scratchpad, not committed):
  - P-1486-GCDT context, year 2026, all three hosts: ranked total = unranked total, and the top CGSpace item has a genebank subject;
  - with text "potato": the total equals the text-only total, and the first item's title contains "potato" — tune the with-text weights until this holds;
  - check that `cg.contributor.programAccelerator` is queryable on MEL/WorldFish. Where it is not, drop that adapter's program boost (§7.4).
  - Record the final weights and the probe results in `execution.md`.

**Tests** (`repositories.config.spec.ts`)
- Literal expected `query` strings for: related + no text, related + text (with-text weights), and an adapter without a program boost.
- `sort` absent when ranked; present (`dc.date.accessioned,DESC`) when unranked.
- **Byte-identical** params versus today for: linked; related with an unusable project; related with no relevance context; the non-project browse (R-3, R-4).
- No `country` boost is ever emitted (R-10 deferred).

**Verification**
`npx jest --maxWorkers=2 --silent --testPathPattern="repositories.config|cgspace-search-query"`, plus the live probe output pasted into `execution.md`.

- **Fails if:** the ranked total ≠ unranked total on any host, or the "potato" first item lacks "potato" in its title.
- **Not evidence:** a probe run against fixtures or mocks, or a single host. All three hosts must be probed, with their totals reported.

**Done:** unit tests green; the probe shows equal totals on all three hosts and potato first with text; weights recorded.

---

### KRR-T-3 — Mapper `subjects` + service attaches `projectMatch` on ranked related pages

| Field | Value |
|---|---|
| Status | [x] done (2026-10-22, PASS attempt 1) |
| Size | S (~50 prod + ~90 test LOC) |
| Depends on | T-1, T-2 |
| Requirements | R-3, R-4, R-5, R-6, NFR-1, NFR-3, NFR-4 |
| Design | §5, §7.3, §7.4, §9 |
| Skills | `nestjs-expert`, `tdd` |

**Scope**
- Mapper: add `subjects` from `adapter.fields.subject`; the program read moves to `adapter.fields.program` (same values).
- Item DTO: add `subjects?` and `projectMatch?`.
- Service: when `ranked`, set `projectMatch` on each item of each `ok` source before the merge. Dedup keeps the survivor's value.
- No extra upstream call.

**Tests**
- Mapper: `subjects` from the CGSpace and MEL/WorldFish fixtures; program values unchanged against the existing fixture assertions.
- Service:
  - a ranked related page → every item has `projectMatch`;
  - a linked page → none;
  - an unranked related page → none;
  - the upstream call count is unchanged.

**Verification**
`npx jest --maxWorkers=2 --silent --testPathPattern="cgspace-discovery.(mapper|service)"`.

- **Fails if:** a linked item carries `projectMatch`, or an extra HTTP call appears in the call-count assertion.

**Done:** green; existing KPSF service tests untouched and passing.

---

### KRR-T-4 — Client: send context, render tier badge, factors, tooltip, ranked proxy note

| Field | Value |
|---|---|
| Status | [x] done (2026-10-22, PASS attempt 1) |
| Size | M (~90 prod + ~140 test LOC) |
| Depends on | T-2, T-3 (contract) |
| Requirements | R-7, R-8, R-3 (client side), R-4 (no tier on linked) |
| Design | §6, §8, §9 |
| Skills | `angular-developer`, `spartan`, `tailwind-design-system` |

**Scope**
- `buildParams`: when `scope` is set, add `projectDescription` (truncated to 1000), `projectProgram` (`<code> - <name>`) and `projectLeadCenterName`. The name is resolved from `leadCenterAcronym` through the existing name↔acronym map, and omitted when unresolved.
- Interfaces: add `subjects?`, `projectMatch?` and `projectScope.ranked?`.
- Related card: Spartan `hlmBadge` (neutral outline, `text-[11px]`, dot glyph by tier) after the `Proxy` marker, a factor line, and an `hlmTooltip` on the badge (focusable). Consult the Spartan MCP for the badge and tooltip contracts before writing.
- Copy keys added to `KP_BROWSE_COPY`. The ranked proxy note is shown only when the response says `ranked`; otherwise the quick copy stays.
- `none` tier → "No direct match", with no factor line.
- **Scope extension (user-approved 2026-10-22, INC-166020 screenshot circles "Proxy ?")**: the `Proxy` marker gets a Spartan `hlmTooltip` (focusable, `tabindex="0"`) replacing the native `title`, copy key `proxyMarkerTooltip`: "Proxy: this KP is not tagged with this project in the repository. Its relation to the project is approximate — see the match label." Keep the marker's `aria-label` and `data-test`.

**Tests** (`kp-cgspace-browse.component.spec.ts`)
- Params:
  - the three new params are sent with `scope`;
  - the center name is resolved for `CIP` → `International Potato Center`;
  - it is omitted for an unknown acronym;
  - no new params without `scope`.
- Render:
  - factors `keywords+center` → "Partial match" + "Project keywords · Center";
  - all four labels are exact;
  - `none` → "No direct match" and no factor line;
  - **no `%` character** anywhere in the related cards;
  - the `Proxy` marker is still present;
  - the `Proxy` marker has the Spartan tooltip with the `proxyMarkerTooltip` copy and is focusable (scope extension);
  - linked cards have no tier badge;
  - the ranked note is shown only when `ranked=true`;
  - the existing assertion `not tagged with this project` still passes.

**Verification**
`cd onecgiar-pr-client && npm run test:local -- --testPathPattern=kp-cgspace-browse`, then `npx eslint <touched files> --quiet`. `npm run build:dev` is required to typecheck the template; `tsc` does not.

**What the presence assertions cannot prove:** that the badge is legible and the tooltip opens on hover and focus (jsdom cannot lay these out). That check belongs to T-5 in a real browser.

**Done:** green spec, clean lint, the build passes.

---

### KRR-T-5 — Live acceptance on PRTest (R-11), human check

| Field | Value |
|---|---|
| Status | [x] done (2026-10-22, PRTest check delegated by the user to the Leader; re-checked after T-6) |
| Size | S (manual) |
| Depends on | T-1..T-4 deployed to PRTest (via `performance-refactor`, ~30 min) |
| Requirements | R-1 (quality), R-2 (order with text), R-7 (visual), R-11 |
| Design | §8, DD-3 |
| Skills | `playwright-cli` if installed; otherwise a manual check by the user |

**Scope**
- Read-only browser check. Never click "Use this item" or "Create and continue": the environment shares prdb and the mailer.
- Steps:
  1. P-1486-GCDT, 2026: the CGSpace related top shows genebank/conservation KPs.
  2. Every related card has a tier; the totals match the unranked totals from the same session's probe.
  3. Type "potato": the potato items lead.
  4. Hover and focus the badge: the tooltip shows.
  5. The linked section is unchanged.
- Screenshot the evidence for the Jira/INC reply.

**Verification:** human check at the HITL pause. This is the only gate for ranking quality (requirements §8).

- **Fails if:** the first related page with no text shows no genebank/conservation item, or the potato search is led by non-potato items.
- **Not evidence:** a check against a dev server whose bundle was not confirmed current (client guide §9).

**Done:** user confirms; evidence attached; INC-166020 reply drafted.

### KRR-T-6 — Keyword quality: drop project-code tokens and funding boilerplate, widen the description pool (user-approved 2026-10-22)

| Field | Value |
|---|---|
| Status | [x] done (2026-10-22, PASS attempt 1 + refinement) |
| Size | S (~30 prod + ~60 test LOC) |
| Depends on | T-1..T-5 evidence (OI-5 in `execution.md`) |
| Requirements | R-1 (quality), R-5, R-9, NFR-2 |
| Design | §7.1 (amended by T-6) |
| Skills | `nestjs-expert`, `tdd` |

**Why.** T-5 on PRTest found that with real P-1486 data, `extractRelevanceKeywords` returns `1486, gcdt, long, term, grant, global, crop, diversity, trust, providing, dedicated, funding, operation`:
- the code embedded in the title leaks in;
- the first-8 description cap drops `genebank`, `potato`, `sweetpotato` and `germplasm`.

**Scope** (only `extractRelevanceKeywords` in `project-relevance.ts`, plus its spec; factor rules, block format, weights and trim are unchanged)
- Exclude the tokens of the project code (the code split on non-alphanumerics, normalized), and any purely numeric token, from title and description keywords.
- Exclude a small explicit list of funding/administrative boilerplate words, kept as a named constant with a comment: grant, grants, funding, funded, fund, provide, provides, providing, dedicated, support, supporting, operation, operations, long, term, project, projects, program, programme, phase, activities, implementation, international, standards, standard.
- Description pool: take up to **12** distinctive description words (was 8), still in order of appearance, after the exclusions. The title cap stays at 8.
- **Plural matching (user-approved extension, 2026-10-22):** replace the single-fold equality with candidate matching, {w, w−"s", w−"es"} for words of 4+ letters, so that `potatoes`↔`potato` and `diseases`↔`disease` match. Matching stays whole-word, so `gene` ✗ `genebanks`. Live evidence: CGSpace 10568/183744 has subject `potatoes` and was tiered `none`.
- NFR-2 is still guaranteed by the existing `appendRelevanceBlock` trim and the request-wide `ranked` gate. Re-run the worst-case tests.

**Tests** (literal expected arrays)
- Real P-1486 input: title `P-1486-GCDT-Long term grant`, code `P-1486-GCDT`, lead `CIP`, plus the real description recorded in `execution.md` T-5. The keywords contain `genebank`, `potato` and `sweetpotato`, and contain none of `1486`, `gcdt`, `grant`, `funding`, `providing`, `long` or `term`. Assert the full literal array.
- iSPARK-like input: the code tokens `t`, `pj` and `003936` are excluded.
- The description cap is 12; the title cap is still 8.
- The existing T-1/T-2 worst-case and NFR-2 tests stay green. Update any literal that changes, and explain why in the report.

**Verification**
`cd onecgiar-pr-server && npx jest --maxWorkers=2 --silent --testPathPattern="project-relevance|repositories.config|cgspace-discovery"`, then eslint on the touched files. Then run a live GET probe with the real P-1486 and iSPARK contexts on 3 hosts: totals unchanged, and the keyword list printed.

- **Fails if:** the P-1486 keywords lack `genebank` or `potato`, contain a code token, or any ranked total ≠ unranked total.

## 4. Dependency graph

```text
T-1 ──► T-2 ──► T-3 ──► T-4 ──► T-5
         └──────────────►┘   (T-4 needs the T-2 params and the T-3 response shape)
```

T-1 → T-2 → T-3 is sequential (same folder, shared test run). T-4 can start after T-2 against the DTO shape from design §5, but must finish after T-3. T-5 is last.

## 5. Coverage closure (scenario / clause → task)

| Requirement clause | Owner |
|---|---|
| R-1 "first CGSpace page led by genebank-topic KPs" | T-2 (probe), T-5 (live) |
| R-1 "total equals the total without ranking" | T-2 (probe, three hosts) |
| R-1 "BUT must NOT include any KP the linked section would return" | T-2 (literal query keeps `AND NOT (clause)`) |
| R-1 "MUST NOT send `sort=dc.date.accessioned,DESC` for a ranked related request" | T-2 |
| R-1 "MUST boost only the metadata the factors read" | T-1 (block fields), T-2 (literal strings) |
| R-2 "total equals the unranked text-only total" | T-2 (probe) |
| R-2 "first page led by KPs about potato" | T-2 (calibration), T-5 |
| R-2 "BUT must NOT add items that do not match the text" | T-2 (literal query: text stays the base of the AND) |
| R-3 request/response byte-identical, no `projectMatch` | T-2 (params), T-3 (no `projectMatch`), T-4 (no params without scope) |
| R-4 linked query/order/counts/badges unchanged | T-2 (byte-identical linked), T-3 (no `projectMatch` on linked), T-4 (no tier on linked) |
| R-5 factor table (keywords on subjects, center, program) | T-1 |
| R-5 negatives (stop words/acronym, title-only, substring, no subjects, no affiliations) | T-1 |
| R-5 positives (genebank/genebanks, nematode/root-lesion nematode) | T-1 |
| R-6 tier by count, equal weights | T-1 (8-combination table) |
| R-7 "Partial match" + factor line for keywords+center | T-4 |
| R-7 exact four labels | T-4 |
| R-7 "BUT must NOT show a percentage or numeric score" | T-4 (no `%` assertion) |
| R-7 "MUST keep the Proxy marker" | T-4 |
| R-7 "none shows No direct match, not an empty chip" | T-4 |
| R-7 hover/focus explanation | T-4 (presence), T-5 (behavior) |
| R-8 ranked note when ranking active; quick copy otherwise | T-4 |
| R-9 sanitized tokens, adapter field names, caps 8+8 | T-1 |
| R-9 "result total is unchanged by the description" | T-2 (probe with a metacharacter description) |
| R-10 deferred, "SHALL NOT emit country" | T-2 |
| R-11 all clauses | T-5 |
| NFR-1 no extra upstream calls | T-3 |
| NFR-2 query < 2000 chars | T-1 |
| NFR-3 factor computation pure and fast | T-1 (pure module), T-3 (in-memory, before the merge) |
| NFR-4 additive optional fields | T-2 (DTO), T-3 (item DTO), T-4 (optional interfaces) |

## 6. Test plan

| Layer | Command | Owner |
|---|---|---|
| Server unit | `npx jest --maxWorkers=2 --silent --testPathPattern=cgspace-discovery` | T-1..T-3 |
| Client unit | `npm run test:local -- --testPathPattern=kp-cgspace-browse` | T-4 |
| Pre-push | `npx jest --maxWorkers=2 --findRelatedTests <changed files>` in each package | Leader |
| Live probe | Scratchpad script (GET only) | T-2 |
| Browser | PRTest read-only | T-5 |

## 7. Rollout & roll-back

- One PR (~650 LOC with tests). Review server first (T-1..T-3), then the client (T-4).
- Roll-back: revert the client param change. The server then never emits the relevance block, giving KPSF behavior byte-for-byte.

# Execution — KP browse: related-section relevance ranking (`KRR`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/kp-related-relevance-ranking/` |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` |
| Leader | Opus 5.5 (T1) · Implementer `akili-implementer` (T2) · Reviewer `akili-reviewer` (T3) |
| Started | 2026-10-22 |

Pre-flight: KPSF is present (`project-match.ts` exports `buildProjectMatch` and `buildProjectClause`). `cgspace-discovery/` was clean before T-1, so the diff baseline is clean.

## 2. Task Execution History

### KRR-T-1 — `project-relevance.ts`: keywords, plural fold, relevance block, factors and tier

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-10-22 |
| Skills / effort | `nestjs-expert`, `tdd` · effort `high` (injection surface, R-9) |
| Requirements | R-5, R-6, R-9, NFR-2 (block part), NFR-3 |

**Attempt 1**

Files changed (all under `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/`):
- `project-relevance.ts` (NEW, 300 lines). Exports `extractRelevanceKeywords`, `foldPlural`, `buildRelevanceBlock`, `evaluateProjectMatch` and `matchesTaggedMetadata` (the DD-4 port), plus the types `RelevanceAdapter`, `RelevanceWeights`, `ProjectProgram`, `RelevanceContext`, `RelevanceItemInput`, `ProjectMatchFactor`, `ProjectMatchTier` and `ProjectMatchResult`.
- `project-relevance.spec.ts` (NEW, 62 tests, literal expected strings). It includes the client KPAM `matchesProgram` vectors.
- `project-match.ts`: `export` added to `MIN_WORD_LENGTH`, `ROMAN_NUMERALS`, `STOPWORDS` and `tokenize`. No behavior change.

Verification:
- `npx jest --maxWorkers=2 --silent --testPathPattern=project-relevance` → 62/62 pass. The first run was red with TS2307 (module not found).
- `--testPathPattern='project-relevance|project-match'` → 2 suites, 90/90 pass.
- `npx eslint <3 files> --quiet` → clean.
- Falsifier: making the subject match substring-based turns the `gene` vs `genebanks` test red. The change was then reverted.

Reviewer verdict: **STATUS: PASS**. T-1 scope, tests, "Fails if" and "Not evidence" all conform. No Nest imports. The four exports change no behavior. The 8-combination tier table is in place. The injection vectors are covered. The `matchesTaggedMetadata` port matches the client (`kp-cgspace-browse.component.ts` L58-127) line for line, and the vectors match the client spec (L1471-1508).

**Implementer assumptions (Reviewer: all conform)**
1. `foldPlural` strips `es` only after s/x/z/ch/sh, otherwise strips `s`, and keeps a trailing `ss`. Reason: a literal "strip es" would fold `nematodes` to `nematod`.
2. Keyword tokens longer than 30 characters are dropped (the NFR-2 bound). Dedup is on the folded form.
3. The worst-case block is 1898 encoded characters. This covers the block only.
4. Center and program phrases go through `normalizeText`. One program clause is emitted: the name, or the code when there is no name.
5. Parsing `<code> - <name>` is left to T-2.

**ADVISORY (4R, non-gating, recorded only)**
- Reliability: `foldPlural` mis-folds `-se`/`-us` nouns. `diseases` becomes `diseas` and does not equal `disease`; the same happens with `responses` and `statuses`. A project keyword `disease` would miss a subject `plant diseases`. Suggested fix: strip `es` only after x/z/ch/sh/ss.
- Reliability: the boost emits the first spelling of a keyword, but the tier compares folded forms. If a host's subject field is not stemmed, ranking and tier disagree (DD-2). The T-2 probe should check this.
- Resilience: the center phrase is normalized (lowercase, ASCII). If `cg.contributor.affiliation` is indexed as an exact string, the center boost matches nothing. The T-2 probe should check this per host.
- Readability: `buildRelevanceBlock` silently glues multi-word keywords together (`.replace(/ /g, '')`). A one-line comment would explain it.

**Forward pointers → KRR-T-2** (carry them into the T-2 brief)
- FP-1: NFR-2 covers the **full** upstream query. Add a worst-case test on the full query (KPSF related clause + search text + block) < 2000. Tighten the block budget if needed (a lower keyword cap, or truncated phrases).
- FP-2: Split the `projectProgram` param `<code> - <name>` into `{ code, name }`. Names can contain hyphens.
- FP-3: The live probe must also confirm, per host, that the subject boost works on the emitted spelling and that the center boost (a normalized phrase) changes the order.

Final verification: PASS (62/62, lint clean).

### KRR-T-2 — Query wiring: DTO params, adapter fields, `translateParams` relevance block, live calibration

| Field | Value |
|---|---|
| Final status | in progress |
| Date | 2026-10-22 |
| Skills / effort | `nestjs-expert`, `api-design-principles`, `tdd` · effort `high` → `xhigh` on rework |

**Attempt 1 — Reviewer FAIL**

Files: `repositories.config.ts`/spec, `dto/cgspace-search-query.dto.ts`/spec, `dto/cgspace-item.dto.ts` (`ranked`), `cgspace-discovery.service.ts`/spec. The service change echoes `ranked` and adds the 3 new params to `buildSearchCacheKey`; the Reviewer judged that in scope and needed for correctness.

Verification:
- Jest, 6 cgspace-discovery suites: 223/223 pass.
- eslint clean on 7 files.
- Falsifier: disabling the trim turns 2 NFR-2 tests red.

Reviewer FAIL (verbatim issue):
1. **Discovered Issue:** `resolveProjectScope` computes `ranked` once. It probes the CGSpace adapter with the no-text weights and no `relatedQuery`, so it never applies the length check. Inside `translateParams`, `appendRelevanceBlock` can return `null` (the block is dropped and `sort=dc.date.accessioned,DESC` stays), yet the response still says `ranked: true`. This is reachable with DTO-valid input (`'a'+':'×199` text, 8×30-char title, 200-char center and program). The length check also differs per host. **Violated Rule:** design.md §5, §7.2; execution.md FP-1 (dropping the whole block is not tightening it). **Remediation:** bound the center and program phrases so that `*:*` plus one bounded clause always fits under 2000 after the longest prefix the DTO allows, so that `ranked` is correct by construction. Add a worst-case test asserting ` AND (*:* OR ` is present and there is no `sort` on all 3 adapters. Alternatively, derive `ranked` from the params actually sent. Either way, add a test tying `ranked` to the block being present.

Leader rulings, confirmed by the Reviewer:
- (a) WorldFish "potato" is N/A: none of the 4 titles contains "potato", and the ranked first item is the same as the unranked first item. Evidence gap: the CGSpace top-item subjects must still be confirmed.
- (c) The cache-key addition is in scope.
- (d) The "adapter without a program boost" case is not needed: all 3 hosts index `programAccelerator`, so the §7.4 drop path doesn't exist.
- (e) Generic title words such as long, term and grant become keywords. Recorded as advisory.

ADVISORY (attempt 1):
- The trim drops keywords before the phrases.
- A test name over-claims what it checks.
- The with-text weights were tuned on one query.
- The cache key splits linked requests by project context.

**Attempt 2 — Reviewer FAIL** (effort `xhigh`)

Changes:
- `MAX_PHRASE_LENGTH = 60` (cut at a word boundary).
- `composeScopedQuery` returns `{ query, ranked }`; `resolveProjectScope.ranked` is true only when all 3 adapters fit the block.
- Trim order: program → center → trailing keywords, down to 1 keyword.
- Worst-case tests: 5 inputs × 3 adapters, plus a 48-variant matrix tying block presence to `ranked`.

Verification:
- Jest 231/231; eslint clean.
- Falsifier: returning null on overflow turns 5 tests red.
- Evidence gap closed. The top CGSpace item ("Annual Technical Report 2025: Genebanks Accelerator") has subjects `biodiversity conservation, genebanks, plant genetic resources`. Total 3464, no sort, encoded length 704.
- The full probe was not re-run. That the probed requests (~700 chars, short center) are unaffected is reasoning, not a re-probe.

Reviewer FAIL (verbatim issue):
1. **Discovered Issue:** `resolveProjectScope` sets `ranked` true only when all 3 adapters fit the block, but `translateParams` emits the block for each adapter on its own. When the hosts disagree, the hosts that fit are sent boosted with no sort while the echo says `ranked: false`. This is reachable with multi-byte text (each `€`, CJK or curly quote encodes to 9 chars), which can bring the prefix near 2000 so that one host drops the last keyword. **Violated Rule:** design.md §5, §7.2. **Remediation:** in `translateParams`, use the block query and delete `sort` only when `project.ranked` is true; otherwise use the plain related query and keep `sort`. Add a test where the block fits on one adapter but not another: no block and `sort` kept on all 3 adapters, with `ranked=false`.

Reviewer rulings:
- The "1 keyword can't fit" path is reachable: 200 three-byte characters encode to ~1800, plus the ~430 KPSF clause.
- The 1998 margin is safe, because the check runs on the final encoded string.
- NFR-2 gap: the KPSF prefix alone can exceed 2000 with multi-byte text. This predates KRR.

Leader adjudication (NFR-2 scope): KRR-NFR-2 is read as "the KRR relevance block never makes the upstream query exceed 2000". The KPSF prefix length is KPSF behavior, which requirements §4 puts out of scope ("The linked section, the KPSF match rule … stay"). Not a T-2 FAIL. Surfaced to the user at the gate as a possible follow-up.

ADVISORY (attempt 2):
- `MAX_PHRASE_LENGTH = 60` cuts ICARDA (63), ICRISAT (64) and CIFOR-ICRAF (66). Raise it to about 80.
- The `ranked` probe checks every registered adapter, not only the selected ones. Document this.
- Record that no re-probe was done (recorded above).

**Attempt 3 — Reviewer PASS** (effort `max`)

Changes:
- **One gate.** `translateParams` emits the block and drops `sort` only when `project.ranked && scoped.ranked`. Otherwise it sends the plain KPSF query.
- `composeScopedQuery` returns `{ query, ranked: string | null }`.
- Comments: "unreachable" claims removed; the comment now says every registered adapter takes part in the `ranked` decision.
- `MAX_PHRASE_LENGTH` stays at 60. 80 was tried (advisory-grade) and broke the program-only worst case. ICARDA's 63-char name is cut by a test.

Tests (+3, 51 in `repositories.config.spec.ts`):
- disagreement case `'€'.repeat(189)`: unranked on all 3 adapters;
- 200 × `€` / `漢`: no block, `ranked=false`;
- the ICARDA cut.

Verification:
- Jest, 6 cgspace-discovery suites: 234/234. eslint exit 0.
- Falsifier: gating on the per-adapter value turns the disagreement test red.

Reviewer **STATUS: PASS**. The emission matches `ranked` exactly on every registered adapter and request shape, because both sides use the same inputs and the computation is deterministic. Linked, unusable, no-context and doesn't-fit requests stay byte-identical to KPSF. No regressions.

ADVISORY (final):
- An adapter outside the registry could show `ranked=true` with no block (only the test adapter today). Assert registry membership if a 4th host is ever added.
- Rename `ranked: string | null` to `rankedQuery`.
- About 9 query compositions per request: negligible.

**Final weights (DD-3, calibrated live 2026-10-22)**
- No text: subject ^4, center ^2, program ^2.
- With text: subject ^0.001, center ^0.0005, program ^0.0005.
- The design starting values ^0.3/^0.15/^0.15 put a Genebanks report first for "potato".
- Sweep: 1, 0.1 → genebank first; 0.05 to 0.01 → "Sweetpotato" first (substring only); 0.005 → whole-word potato first; 0.001 → same first item as text-only ("Potatoes, jobs, and digitalization…").
- Cross-check on CGSpace (potato, maize, wheat, genebank, rice): top-10 title hits stay near the text-only counts (rice 9 vs 10).
- Weights must be ≥ 0.0001; smaller values print as `1e-5`, which Solr rejects.

**Live probe (2026-10-22, GET only, year 2026, P-1486-GCDT / CIP / SP13 Genebanks)**

| Host | Text | Unranked | Ranked | Top ranked item |
|---|---|---|---|---|
| CGSpace | none | 3464 | 3464 | "Annual Technical Report 2025: Genebanks Accelerator" (subjects: biodiversity conservation, genebanks, plant genetic resources) |
| MELSpace | none | 238 | 238 | "From genebank to farmers…" (genebank) |
| WorldFish | none | 119 | 119 | "Safeguarding … genetic diversity in Pacific island food systems…" |
| CGSpace | potato | 423 | 423 | "Potatoes, jobs, and digitalization…" |
| MELSpace | potato | 2 | 2 | "Genome editing in tetraploid potato…" |
| WorldFish | potato | 4 | 4 | N/A: none of the 4 titles contains "potato"; the ranked first = the unranked first |

- Metacharacter description: totals unchanged on all 3 hosts. Ranked requests carry no `sort`; encoded length 431–761.
- FP-3:
  - `genebank` = `genebanks` counts (CGSpace 9, MELSpace 2).
  - The subject boost changes the order on all 3 hosts. The center boost changes it on CGSpace and WorldFish; MELSpace has 0 CIP items in 2026. The program boost changes it on CGSpace and MELSpace.
  - Center phrase counts are equal for lowercase and original casing (CGSpace 101/3097, MELSpace 0/517 on `cg.contributor.center`, WorldFish 2/30).
  - `cg.contributor.programAccelerator` is queryable on all 3 hosts, so no adapter drops its program boost.
- The probe was not re-run after attempts 2 and 3. Reasoning: the P-1486 requests are ~700 chars with a 28-char center, so the trim and gate changes do not affect them.

**Decisions**
- The 3 new params were added to the service cache key (correctness).
- The trim order is program → center → trailing keywords.
- Phrase cap: 60.
- NFR-2 is read as "the KRR block never pushes the query past 2000". Leader adjudication.

**Open items for the user**
- OI-1: the KPSF prefix alone can exceed 2000 encoded chars with 200 multi-byte search characters. This predates KRR. Possible follow-up: a cap on the encoded query in the DTO or service.
- OI-2: generic title words (long, term, grant) become keywords. With a short description, a rice "long-term experiments" KP ranks 3rd on CGSpace.
- OI-3: center names over 60 chars (ICARDA, ICRISAT, CIFOR-ICRAF) are cut in the boost, so the tier and the ranking may differ slightly.

**Budget tripwire:** T-2 took 3 review rounds against a budget of 1–2. Escalated to the user at the gate.

Requirements covered: R-1, R-2, R-3, R-4, R-9, R-10, NFR-1, NFR-2 (as adjudicated), NFR-4. Final verification: PASS.

Budget tripwire acknowledged by the user on 2026-10-22 ("Sigue"); continuing to T-3.

### KRR-T-3 — Mapper `subjects` + service attaches `projectMatch` on ranked related pages

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-10-22 |
| Skills / effort | `nestjs-expert`, `tdd` · effort `medium` |
| Requirements | R-3, R-4, R-5, R-6, NFR-1, NFR-3, NFR-4 |

Files (all under `cgspace-discovery/`):
- mapper: `subjects` from `adapter.fields.subject` (always present, `[]` when absent); program via `adapter.fields.program`.
- `dto/cgspace-item.dto.ts`: `subjects?`, `projectMatch?`, new `CgspaceProjectMatchDto`.
- service: a single `resolveProjectScope(dto)` call, moved before the merge. When `projectScope.ranked`, each item becomes the spread copy `{...item, projectMatch: evaluateProjectMatch(...)}`. Keywords are computed once per request.
- specs: mapper +4 tests (two existing full-object assertions gained `subjects: []`); service +5 tests.

Verification:
- `npx jest --maxWorkers=2 --silent --testPathPattern="cgspace-discovery|repositories.config|project-relevance|project-match|cgspace-search-query"` → 8 suites, 269/269.
- eslint clean on 5 files.
- Red first: TS2339 (`subjects` missing on the DTO).
- Falsifier: gating on `relevance` instead of `ranked` turns the `'€'.repeat(189)` ranked=false test red.

Reviewer **STATUS: PASS**:
- The attach and the echo share one `ranked` value.
- Linked pages carry no `projectMatch`; 3 upstream calls (unchanged).
- The cached payload is not mutated.
- The dedupe survivor keeps its own value (`merge.ts:222`).
- KPSF tests untouched.

ADVISORY:
- No test for a ranked request served from cache keeping `projectMatch`.
- No service-level test for the dedupe survivor's `projectMatch`.
- `subjects` now appears on every item, including the non-project browse. This is additive, as design §5 says ("Always (can be `[]`)"). Recorded as the accepted reading of R-3 "byte-for-byte" (the request is identical; the response gains an optional field).
- OI-3 again: tier vs boost on center names over 60 chars.

## Scope change: KRR-T-4 (user-approved 2026-10-22)

The user approved a Spartan tooltip on the `Proxy` marker (it replaces the native `title`; copy key `proxyMarkerTooltip`). Reason: the INC-166020 screenshot circles "Proxy ?", and Nicoleta asks for the meaning of proxy to be more transparent. Added to the T-4 Scope and Tests in `tasks.md`. Small, client-only, same card; no budget re-run requested.

### KRR-T-4 — Client: send context, render tier badge, factors, tooltips, ranked proxy note

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-10-22 |
| Skills / effort | `angular-developer`, `spartan`, `tailwind-design-system` · effort `high` |
| Requirements | R-3 (client), R-4, R-7, R-8, plus the user-approved Proxy tooltip extension |

Files: `kp-cgspace-browse.component.ts` / `.html` / `.spec.ts`. The new interfaces (`KpProjectMatch`, `KpProjectScopeEcho.ranked`) and the copy keys live in the component `.ts`; there is no separate interface file. The pre-existing `quick/kp-proxy-note-ranking` copy edit was kept.

Changes:
- `buildParams`: +3 params whenever `scope` is set.
- `centerNameFromAcronym`: reverse lookup on `CGIAR_CENTER_ACRONYMS`. CIP → International Potato Center; ALLIANCE → Alliance of Bioversity International and CIAT; an unknown acronym is omitted.
- `relatedRanked` signal, set only from the related response's echo.
- Related cards: `hlmBadge` outline with a dot glyph per tier, a factor line, and an `hlmTooltip` with `tabindex="0"`.
- Proxy marker: `hlmTooltip` with `proxyMarkerTooltip` replaces the native `title`.

Verification:
- `npx jest --no-coverage --maxWorkers=1 --testPathPattern=kp-cgspace-browse.component.spec` → 114/114 (16 new). `maxWorkers=1` because free RAM was under 4 GB. `npm run test:local` exits 1 silently on Windows.
- `npx ng lint --quiet --lint-file-patterns <3 files>` → pass. The client has no flat eslint config.
- `npm run build:dev` → exit 0 (pre-existing sass warnings only).
- `npx jest --maxWorkers=2 --findRelatedTests <component .ts/.html>` → 58 suites, 2619/2619.
- Falsifier: appending ` 67%` to the badge and putting back the native Proxy `title` turned 5 tests red.

Reviewer **STATUS: PASS**:
- The ranked note keys off the related response only.
- The center-name resolution is deterministic.
- No `%` or numeric score is possible.
- Linked cards never show a tier.
- Field names and param limits match the server DTOs.
- Styling follows §8 and UI rules 7/9 (no new color).
- Spartan is used for both tooltips; no `data-test` was renamed.

ADVISORY:
- The Proxy marker `<span tabindex="0">` has no `focus-visible` ring class. Check it in T-5.
- If CLARISA's lead acronym is `CIFOR-ICRAF`, no name resolves and the center factor is silently never met. Check the real `leadCenterAcronym` values in T-5.
- No negative test for a linked echo with `ranked: true`.
- A `projectProgram` cut at 200 chars could leave a dangling " -" (negligible).

Open for T-5: the jsdom limit. Badge legibility and the tooltip opening on hover and focus can only be shown in the browser.

# Execution Log — KP browse: strict bilateral project filter (`KPSF`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `changes/kp-project-strict-filter` |
| Branch | `qa-development-2026-ss` |
| Started | 2026-10-14 |
| Leader | Claude Code session (Opus) — `/akili-execute` |
| Approval Mode | Spec says `gated`; the user's standing preference is to run all tasks to the end and stop only on HALT, Pivot or tripwire. Spec `Status: draft`; the `/akili-execute` invocation was taken as approval. |
| Commits | None. The user's standing rule is no commit without an explicit go-ahead. |
| Environment note | Free RAM was 1.3 GB at start (below the 4 GB rule), so Jest runs are single-pattern with `--runInBand` instead of `--maxWorkers=2`. |

## 2. Task Execution History

### KPSF-T-1 — Project match rule util with real-label fixtures

- **Status:** PASS (attempt 1 of 3)
- **Date:** 2026-10-14
- **Effort / skills:** Implementer `high` (correctness-critical rule), `nestjs-expert` + `tdd` as listed in the task.
- **Review mode:** two parallel lens Reviewers, because the task's review is "lenses (correctness-critical rule)":
  - (a) spec conformance + reliability/correctness;
  - (b) spec conformance + risk/resilience (KPSF-R-9 injection).

#### Attempt 1

- **Files:** new `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/project-match.ts` and `project-match.spec.ts`.
- **Exported API:**
  - `ProjectMatchContext { code?, title?, leadCenter? }`
  - `buildProjectMatch(ctx) → { words, codePhrases, usable }`
  - `buildProjectClause(field, ctx) → string | null`. The clause has no outer parens; T-2 must wrap it in `(…)`.
  - `labelMatchesProject(label, ctx)`
  - `normalizeText(value)`
- **Verification:**
  - Red: `npx jest --silent --reporters=summary --forceExit --runInBand --testPathPattern="project-match"` → `Test Suites: 1 failed` (module absent).
  - Green: same command → `Tests: 28 passed, 28 total`.
  - `npx eslint project-match.ts project-match.spec.ts --quiet` → clean.
- **Reviewer (a):** `STATUS: PASS`. design.md §8.1, KPSF-R-2 (all three scenarios), R-9 and R-13 are met, and no T-1 Falsifier triggers. The distinctive words for T-PJ-003942 are exactly `accelerated innovation delivery initiative aid mozambique`.
- **Reviewer (b):** `STATUS: PASS`. Only `[a-z0-9]` tokens plus the module's fixed syntax reach the clause, for any input. Operator and range words are blocked twice, by the stopwords and by the 3-character minimum. The rule is deterministic and has no ReDoS risk.

#### Decisions: Implementer deviations, accepted by Reviewer (a)

1. **Accent folding.** `normalizeText` folds accents (NFD, then strips U+0300–U+036F) before the alphanumeric allow-list. Without it, "Côte" would break into fragments shorter than 3 characters. Output is still `[a-z0-9]` only.
2. **Extra stopwords.** A few function words were added to the "basic list" (`into`, `via`, `sin`, `uno`, `ou`, `au`, `al`, …).
3. **First digit run only.** Code phrases use only the first run of digits in the code, which matches the single-run `T-PJ-xxxxxx` format.

#### ADVISORY (4R, non-gating)

- **RELIABILITY (a), forward pointer → T-2 / T-5:**
  - The project fields are multi-valued. `F:(w1 AND … AND wn)` matches at item level, so the words could come from different labels on the same item, while `labelMatchesProject` checks one label at a time.
  - Result: an item tagged with two projects could pass the clause without any single label passing R-2, which is a residual gap against KPSF-R-1 "must NOT contain any item whose project labels fail R-2".
  - Code phrases are not affected (the position-increment gap stops a phrase from spanning two values).
  - Leader adjudication: an inherent limit of the KPSF-DD-2 upstream split. Real-world likelihood is very low, because all distinctive words would have to be spread across another project's labels. Not a Pivot.
  - Carried to the T-2 brief and to the user's final summary as an accepted-risk candidate.
- **RELIABILITY (a):** the Solr analyzer may stem or fold differently from the predicate. The T-5 live smoke is the real check.
- **CORRECTNESS (a, minor):**
  - `buildCodePhrases` emits `pj <digits>` even when the code has no `pj` token.
  - Unpadded code digits in a title are not excluded from the distinctive words.
- **RISK (b), forward pointer → T-2:** `field` is interpolated raw, which is safe only if callers pass adapter constants (`cg.identifier.project` / `cg.contributor.project`), never request values.
- **RESILIENCE (b), forward pointer → T-2:** `normalizeText` assumes a string. A repeated query param (an array) would throw a 500, so the DTO needs `@IsOptional() @IsString() @MaxLength()` on `projectCode`, `projectTitle` and `projectLeadCenter`.
- **READABILITY (b):** the diacritic regex uses literal combining characters; prefer `/[̀-ͯ]/g`.
- **RISK (b), test hardening:** add a Unicode hostile-title fixture (fullwidth characters, Turkish `İ`, Arabic-Indic digits).
- **EVIDENCE (a):** the run used `--runInBand` instead of `--maxWorkers=2` because of the low-RAM rule; equivalent for one suite.

#### Coverage

- **Requirements covered:** KPSF-R-2 (all scenarios), KPSF-R-9 (sanitized clause), KPSF-R-13 (the 182744 label as a positive).
- **Issues:** none.
- **Final verification:** green, 28/28.

### KPSF-T-2 — Scoped linked/related search on the server

- **Status:** PASS (attempt 1 of 3)
- **Date:** 2026-10-14
- **Effort / skills:** Implementer `high`; `nestjs-expert`, `api-design-principles`, `tdd` as listed in the task.
- **Review mode:** full, one Reviewer at `high` with the 4R checklist.

#### Attempt 1

- **Files changed** (all under `onecgiar-pr-server/src/api/results/results-knowledge-products/`):
  - `cgspace-discovery/repositories.config.ts`:
    - `fields.project` per adapter;
    - `facets.project` removed;
    - `resolveProjectScope`;
    - scoped composition in `translateParams`.
  - `cgspace-discovery/dto/cgspace-search-query.dto.ts`:
    - `projectCode` ≤50, `projectTitle` ≤300, `projectLeadCenter` ≤20, each `@IsOptional @IsString @MaxLength`;
    - `projectScope` `@IsIn(['linked','related'])`, which requires a code or title;
    - the query-required rule counts `projectScope`;
    - legacy `project` kept and deprecated.
  - `cgspace-discovery/dto/cgspace-item.dto.ts`: `CgspaceProjectScopeDto` and an optional `projectScope` echo on the page.
  - `cgspace-discovery/cgspace-discovery.service.ts`:
    - cache key includes the 4 new params;
    - an unusable `linked` short-circuits to an empty page with no HTTP call;
    - the echo is sent only when a scope or the legacy `project` param was requested.
  - `cgspace-discovery/cgspace-discovery.mapper.ts`: `projects[]` = `adapter.fields.project` ∪ `cg.identifier.project`.
  - `results-knowledge-products.controller.ts`: Swagger text only.
  - Specs:
    - new `cgspace-discovery/repositories.config.spec.ts`;
    - extended service, mapper and DTO specs.
- **Updated existing tests (not weakened, confirmed by the Reviewer):**
  - `(a1b)` asserted `f.project` forwarding, which R-11 removes; its replacement is stricter.
  - The `(g4)` cache-key literal gained the 4 new fields.
- **Emitted queries:**
  - CGSpace linked, 2026, no text: `*:* AND (cg.identifier.project:(accelerated AND innovation AND delivery AND initiative AND aid AND mozambique) OR cg.identifier.project:"pj 003942" OR cg.identifier.project:"pj 3942")`, with `sort=dc.date.accessioned,DESC` and `f.dateIssued=[2026 TO 2026],equals`.
  - MEL/WorldFish related: `*:* AND NOT (cg.contributor.project:(…) OR …)`.
  - With text: `(seed) AND NOT (<clause>)`.
- **Verification:**
  - Red (`--runInBand --testPathPattern="cgspace-discovery|cgspace-search-query|results-knowledge-products.controller|project-match"`): `Test Suites: 4 failed, 4 passed, 8 total; Tests: 4 failed, 115 passed`.
  - Green: `Test Suites: 8 passed, 8 total; Tests: 171 passed, 171 total`.
  - Pre-change non-bilateral snapshot: 3 literal cases, green before and after.
  - eslint on the 10 touched files: exit 0.
- **Environment:**
  - Drive `C:` ran out of space mid-run (ENOSPC), so the Implementer ran jest/eslint via `node node_modules/...` with TEMP and the cache on `D:\kpsf-tmp`.
  - The sandbox blocked deleting `D:\kpsf-tmp`, so it was left for the user.
  - The user was told to free space on `C:`.
- **Reviewer:** `STATUS: PASS`. Every T-2 Falsifier and DoD item holds. The Disqualifier was not triggered. R-10 output is byte-identical. `field` comes only from adapter constants, which closes T-1 RISK(b). The DTO rejects arrays and oversized input, which closes T-1 RESILIENCE(b). Per-repository failures are still reported per scope. Nothing new is logged.

#### Decisions: Implementer assumptions, accepted by the Reviewer

1. With no text the query is `*:* AND (clause)` instead of the literal `(*:*) AND (clause)`. They are semantically identical; the Lucene parser reads it as `+*:* -(…)`.
2. `projectScope` without a code or title returns 400 (design §7).
3. Legacy `project` is split on the first ` - `.
4. The `projectScope` echo is sent only when the request carried a scope (additive).

#### ADVISORY (4R, non-gating)

1. **RELIABILITY → T-5:**
   - The live smoke must send the exact emitted strings (`*:* AND (…)`, `*:* AND NOT (…)`, `(text) AND NOT (…)`) on all 3 hosts.
   - User text ending in a bare operator can still be rejected by Solr. This existed before this change.
2. **CORRECTNESS (legacy path):** legacy `project` carries no lead center, so a lead-center acronym in the title becomes a required word and lowers recall for old clients during the one-release window. Non-PJ codes emit a harmless unmatched phrase.
3. **READABILITY/RISK:** project params sent without `projectScope` are ignored but still split the cache key. The Swagger text "Requires `projectScope`" is not enforced by the DTO.
4. **RISK → T-3:** MEL/WorldFish items now carry `projects[]` in non-bilateral browse too (additive). T-3 must make sure no project badge renders outside the bilateral context (R-10).
5. **HYGIENE:** the untracked `onecgiar-pr-server/src/a.py` must not be staged with KPSF commits.
6. **EVIDENCE:** runs used `--runInBand` (low-RAM rule) instead of `--maxWorkers=2`.

#### Coverage

- **Requirements covered:** KPSF-R-1 (unit), R-3/R-4 (server halves), R-7, R-8, R-9 (not applicable; HTTP 200 at unit level), R-10 (server half), R-11.

## Budget Tripwire: after KPSF-T-2

| Metric | Budget (design.md §1) | Actual after T-1 + T-2 |
|---|---|---|
| Tasks | 5 | 2 of 5 done |
| LOC incl. tests | ~700 | ~1,210 added: production ~430 (`project-match.ts` 218, other server ~214), tests ~780 |
| Review rounds | ≤ 2 per task | 1 per task |

- **Cause:** test volume. Server specs alone are ~780 LOC (28 + ~55 new cases), driven by the per-host / per-scope / snapshot Falsifier matrix. Production code is ~430 LOC, within an expected server share.
- **Remaining work:** T-3 and T-4 (client) will add more.
- **Action:** execution stopped, escalated to the user before T-3.
- **User decision (2026-10-14):** continue, with the budget raised to **~2,000 LOC including tests**. The overrun is test volume, not scope. Execution resumes at T-3.

### KPSF-T-3 — Client: two-scope fetch and state, remove the project fuzzy matcher and the facet chip logic

- **Status:** PASS (attempt 1 of 3)
- **Date:** 2026-10-14
- **Effort / skills:** Implementer `high`; `angular-developer`, `tdd`.
- **Review mode:** full, one Reviewer at `high`.

#### Attempt 1

- **Files changed** (`onecgiar-pr-client/.../kp-cgspace-browse/`):
  - `kp-cgspace-browse.component.ts`;
  - `.spec.ts` (the KPPJ block was replaced by a KPSF block);
  - `.html` (minimal removals so it still compiles).
  - `results-api.service.ts` untouched, since `GET_cgspaceSearch(params: any)` passes the params through.
  - Client diff: +573 / -667.
- **Removed:**
  - `buildProjectMatchCandidates`, `matchesProjectTags`, `deriveMatchPhrases`;
  - the `REPOSITORY_PROJECT_*` constants and `BILATERAL_PROJECT_SOURCE_LABEL`;
  - the chip members (`projectRepositoryFilter*`, `toggleProjectRepositoryFilter`, `showProjectRepositoryFilterChip`);
  - the fuzzy and highlight members (`matchesProject`, `projectMatchCount`, `contextualMatch*`, `projectMatchZeroNotice*`, …);
  - the legacy `params['project']`;
  - the stale copy.
- **Added:**
  - linked-scope signals: `linkedItems`, `linkedTotal`, `linkedPage`, `linkedHasMore`, `linkedStatus`, `linkedLoadingMore`, `linkedApplied`, `linkedSources`;
  - `isProjectScoped`, `displayLinkedItems`, `loadMoreLinked()`;
  - `runSearch(page, append, scope)`, with per-scope `catchError`;
  - `failedSources` as the union of both scopes.
- **Verification:**
  - Red: `Tests: 15 failed, 68 passed, 83 total`; all 15 failures are the new KPSF cases.
  - Green: `Tests: 83 passed, 83 total`.
  - Command: `npx jest --no-coverage --maxWorkers=1 --testPathPattern="kp-cgspace-browse" --cacheDirectory=D:\kpsf-tmp\jest-cache`. `npm run test:local` exits 1 on this Windows machine because `spawnSync('npx')` fails, and RAM was ~1.4 GB.
  - grep for the removed helpers under `onecgiar-pr-client/src`: 0 hits; the Reviewer re-ran it for every removed member, template included.
  - eslint (`ESLINT_USE_FLAT_CONFIG=false`) on the 3 files: exit 0.
  - `tsc --noEmit -p tsconfig.spec.json`: no errors in the browse files.
  - `ng build` not run (low RAM).
- **Reviewer:** `STATUS: PASS`. Every Falsifier item holds:
  - a reset sends exactly 2 requests with identical filters;
  - related "Load more" never fires a linked request;
  - non-bilateral browse sends no `project*` param and shows no project badge, which closes T-2 ADVISORY 4;
  - KPAM is intact per list;
  - per-scope failures are isolated;
  - a single `switchMap` cancels both scopes on a re-search.
  - Disqualifier not triggered: no consumer changed.

#### Decisions: accepted by the Reviewer

1. **Auto-search on open:** a project-scoped bilateral browse now searches in `ngOnInit`, as R-13 and design §9 require. The old KPPJ "should not auto-query on bilateral open" test was superseded, not weakened. R-10 stays guarded by a new non-bilateral no-auto-search test. **Flagged to the user for confirmation;** a 3-line removal reverts it.
2. **Two-scope condition:** two-scope mode = `isBilateralBrowse() && (projectCode || projectTitle)`. Project fields are truncated to the DTO limits 50/300/20.
3. **Inputs kept:** `enableProjectRepositoryFilter`, `projectSummary` and `projectDescription` stay, because the Disqualifier forbids touching consumers.
4. **Template:** T-3 only made stand-in edits; T-4 owns the sections.

#### ADVISORY (4R, non-gating)

- **RISK → T-4:** `repositoryChips` reads only the related scope's `sources()`.
  - A repository that fails only in linked would still show a count.
  - In two-scope mode the count reads 80, not 81.
  - T-4 must define the chip semantics in two-scope mode.
  - Risk to the T-4 Falsifier and to R-5.
- **RESILIENCE (pre-existing):** `resetResults()` does not cancel an in-flight or debounced request, so a late response can repaint a list after the panel went idle.
- **RELIABILITY:** project inputs that change after `ngOnInit` do not re-trigger the load. Low risk, since the drawer passes them before init.
- **READABILITY → T-4:**
  - Typing 1–2 characters in project-scoped mode resets both lists to idle and suppresses the 3-character hint.
  - `matchCount` spans both lists but renders next to the related-only counter.
- **HYGIENE (follow-up):** `projectSummary` and `projectDescription` are dead inputs. Remove them later, together with the bilateral bindings.

#### Coverage

- **Requirements covered:** KPSF-R-3 (client fetch), R-4 (state; section 2 "Load more" does not re-query section 1), R-6 (fuzzy matcher removed), R-10 (client), R-11 (chip logic).

### KPSF-T-4 — Client: two-section template, empty linked state, proxy note, copy, a11y

- **Status:** PASS (attempt 2 of 3; attempt 1 FAIL)
- **Date:** 2026-10-14
- **Effort / skills:** Implementer `medium` → `high` on retry; `angular-developer`, `tailwind-design-system`, `spartan`.
- **Review mode:** checklist.

#### Attempt 1: FAIL

- **Files changed:**
  - `kp-cgspace-browse.component.html`:
    - the card moved into `<ng-template #kpCard>` with a `variant` of single, linked or related;
    - two `<section>`s with `<h3>` headings;
    - empty, not-applied, error and loading states;
    - the proxy note and marker, and the linked badge.
  - `.ts`:
    - `KP_BROWSE_COPY` constants and `projectDisplayLabel`;
    - `repositoryChips` covers both scopes in project-scoped mode (unavailable if either scope failed; count = linked + related).
  - `.spec.ts`: a "KPSF-T-4: two-section template" block with 12 cases.
- **Verification:**
  - Green: `npx jest --no-coverage --maxWorkers=1 --testPathPattern="kp-cgspace-browse" --cacheDirectory=D:\kpsf-tmp\jest-cache` → `Tests: 95 passed`.
  - **No red run was captured.** The Reviewer confirmed the new DOM assertions fail against the T-3 template, so they are not tautological.
  - Lint clean. Grep for the stale copy: 0 hits.
- **Live evidence (user's local stack, screenshot):**
  - Section 1 shows 10568/182744 with "Linked to T-PJ-003942", but the card's "Project:" line shows only the first 3 of its 4 `cg.identifier.project` labels.
  - The Leader confirmed the 4 labels live from CGSpace: `['PABRA Al Sumait Prize Award (Kuwait)', 'CIMMYT (USA-USAID) - Accelerated Innovation Delivery Initiative (AIDI)', 'AGRA -PABRA 2023 Africa Food Prize', 'IITA (USA-USAID) - Accelerated Innovation Delivery Initiative (AID-I) for Mozambique']`.
  - The only R-2 match is the hidden 4th label.
- **Reviewer:** `STATUS: FAIL`. One issue:
  1. **Discovered Issue:** the section 1 card does not show the label that makes the item linked. `html` L66-70 renders `item.projects.slice(0, 3).join(' · ')`. The visible CIMMYT label is an R-2 negative fixture. The spec fixture has a single label, so it cannot catch a cap or ordering problem.
     - **Violated Rule:** requirements §6 KPSF-R-1, Scenario "CGSpace prefixed label": "AND that item's label 'IITA (USA-USAID) - … for Mozambique' is shown on the card"; tasks §5 assigns R-1 "label … is shown on the card" to T-4.
     - **Remediation:**
       - (a) client-only: for `variant === 'linked'`, render every `item.projects` entry with no cap;
       - (b) preferred, but outside T-4: the server puts matching labels first, or adds `matchedProjects[]`, which needs a Leader scope decision;
       - either way, add the falsifying 4-real-label case.
- **Leader adjudication:**
  - Remediation (a) goes into the rework because it stays within T-4's boundary.
  - (b) is not taken: it would reopen T-2, a scope change. It is offered to the user as a follow-up, since showing non-matching labels next to the "Linked" badge stays a UX weakness.
- **ADVISORY (attempt 1, non-gating; recorded only, not added to the rework):**
  - **RISK:** `linkedApplied` falls back to `true` when the response has no `projectScope` echo (`.ts` L944). A new client on an old server would show unconstrained items as linked. Mitigated by the server-first deploy (design §12).
  - **A11y:**
    - `aria-label` on a role-less span is ignored by screen readers.
    - `tabindex=0` on `role=status` empty states adds redundant tab stops.
    - The new "Load more" buttons copy `focus:outline-none` (client Hard UI rule 4).
  - **i18n:** several sentences are still inline in the template instead of `KP_BROWSE_COPY`.
  - **RELIABILITY:** with "Show matches only" on, a section can show its counter and no cards with no explanation (pre-existing behavior).
  - **STYLE:** `pi` icons and rem text sizes are legacy debt.
  - **GAP:** `kp-cgspace-browse.cy.ts` was not run; it asserts `kp-results-counter`.

#### Attempt 2: PASS

- **Scope:** remediation (a) only, client-only.
- **Files:** `kp-cgspace-browse.component.html` and `.spec.ts`.
- **Change:** linked cards now render every `item.projects` label as a `<ul>`/`<li data-test="kp-linked-project-label">`, uncapped and in live order. The heading reads "Project:" or "Projects:".
- **New falsifying case:** the 4 real labels of 182744 with the matching one last. It asserts content, order and count.
- **Verification:**
  - Red: `Tests: 1 failed, 95 passed, 96 total`. Expected the IITA … Mozambique label; received the 3 capped labels.
  - Green: `Tests: 96 passed, 96 total`, same command as attempt 1.
  - Lint: spec clean (Implementer); html `LINT_OK` (Leader).
- **Reviewer:** `STATUS: PASS`. The R-1 label is visible regardless of its position. The new test failed before the fix and passes after. No regression; no setup was weakened. DoD met.

#### Follow-up offered to the user

Remediation (b), out of scope: in the linked scope the server puts R-2-matching labels first, or exposes `matchedProjects[]`. Today a non-matching label (the CIMMYT one) still renders above the matching one, next to the "Linked" badge.

#### Coverage

- **Requirements covered:** KPSF-R-1 (label on card), R-3 (rendering), R-5, R-6, R-9 (client half), R-11 (copy), R-12, NFR accessibility.

### KPSF-T-5: Live smoke evidence (2026-10-14)

Live-smoke half only; the browser half (R-13) is pending with the user. Params were generated by calling `translateParams` (ts-node, transpile-only) for each adapter with `projectCode=T-PJ-003942`, the AID-I Mozambique title, `projectLeadCenter=IITA`, `year=2026`, `size=1`, sent with `curl -G --data-urlencode` to `<host>/server/api/discover/search/objects`. No repo files were created or changed.

| Host | Scope | Type | HTTP | totalElements | Handle(s) |
|---|---|---|---|---|---|
| CGSpace | linked | none | 200 | 1 | 10568/182744 |
| CGSpace | related | none | 200 | 3345 | (first: 10568/185974) |
| CGSpace | unconstrained | none | 200 | 3346 | (first: 10568/185974) |
| CGSpace | linked | Case Study | 200 | 1 | 10568/182744 |
| CGSpace | related | Case Study | 200 | 80 | (first: 10568/185933) |
| CGSpace | unconstrained | Case Study | 200 | 81 | (first: 10568/185933) |
| MELSpace | linked | none | 200 | 0 | none |
| MELSpace | related | none | 200 | 238 | (first: 20.500.11766/70934) |
| MELSpace | unconstrained | none | 200 | 238 | (first: 20.500.11766/70934) |
| MELSpace | linked / related / unconstrained | Case Study | 200 | 0 / 0 / 0 | none |
| WorldFish | linked | none | 200 | 0 | none |
| WorldFish | related | none | 200 | 116 | (first: 20.500.12348/7067) |
| WorldFish | unconstrained | none | 200 | 116 | (first: 20.500.12348/7067) |
| WorldFish | linked / related / unconstrained | Case Study | 200 | 0 / 0 / 0 | none |

Falsifier items:

- **CGSpace linked total = 1, item 10568/182744:** HELD (with and without type).
- **linked + related = unconstrained, Case Study 2026:** HELD, 1 + 80 = 81 (matches the 2026-10-14 baseline in `design.md` §2).
- **linked + related = unconstrained, no type, 2026:** HELD on all three hosts (CGSpace 1 + 3345 = 3346; MELSpace 0 + 238 = 238; WorldFish 0 + 116 = 116).
- **Every host returns 200:** HELD, 18 of 18 requests.

Notes:

- No baseline drift: CGSpace Case Study numbers equal the 2026-10-14 baseline exactly.
- MELSpace and WorldFish return 0 for `f.itemtype=Case Study,equals` with year 2026 even unconstrained, so the Case Study sum there (0 + 0 = 0) is true but vacuous. Their linked = 0 for this project is the expected outcome (no item carries this project label); the project clause was accepted with HTTP 200 on `cg.contributor.project`, as in `design.md` §2.

### User decision: auto-search on open (2026-10-14)

The user confirmed **automatic**: a project-scoped bilateral browse searches on open (KPSF-T-3 Decision 1). No code change.

### KPSF-T-5: Browser acceptance evidence (user's local stack, 2026-10-14)

**Screenshot 1:** Bilateral › IITA › T-PJ-003942 › Browse, year 2026 locked, no text, no type, page reloaded with the new bundle.

- **Section 1:** "KPs linked to the project · 1" shows `10568/182744` "Strengthening bean seed systems to reach 78,000 farmers…" with the "Linked to T-PJ-003942" badge.
  - "Projects:" lists all 4 labels, including "IITA (USA-USAID) - Accelerated Innovation Delivery Initiative (AID-I) for Mozambique". This confirms the T-4 attempt-2 fix and R-1.
  - The R-12 info line is present.
- **Section 2:** "Other KPs potentially related · 3345" with the "Proxy:" note.
  - Cards carry the "Proxy" marker, and the SP badge still renders inside it (KPAM kept).
  - 3345 matches the live-smoke related total (3346 − 1).
- **No interaction needed:** the search ran on open, with no text or type (R-13 "must NOT be necessary to page, search text or pick a type").
- **MELSpace and WorldFish:** they show as unavailable because the local `.env` has no `MELSPACE_DISCOVERY_URL` / `WORLDFISH_DISCOVERY_URL` (local configuration, not code). The live smoke proved both hosts return 200 for the generated queries. So the browser covered CGSpace only.
- **No write action** was performed.

**Screenshot 2:** the same browse, with the type filter set to **Case Study** (Applied filters: "ACTIVE Item type: Case Study", "LOCKED Reporting year: 2026").

- **Section 1:** "KPs linked to the project · 1" shows `10568/182744` with the "Linked to T-PJ-003942" badge and all 4 project labels, IITA … Mozambique included.
- **Section 2:** "Other KPs potentially related · 80" with "Showing 10 of 80 items · CGSpace 80".
  - The proxy note and the "Proxy" marker are present.
  - The first card is `10568/185933`, not 182744.
- **Numbers:** they match the live smoke and the design §2 baseline (1 + 80 = 81). This covers R-13 "same when type = Case Study" and R-4 "section 1 reads 1 / section 2 reads 80, never the unfiltered 81".
- **No write action** was performed.

**OQ-6 (other-center KPs under IITA):** the bilateral browse has no center constraint. Other-center CGSpace items, such as Ethiopia fertilizer items whose affiliation is IITA or others, appear only in section 2 with the proxy marker. Nothing other-center appears in section 1. This confirms the expected cause; no change is needed. A WorldFish "Coast"-type case could not be observed locally (the WorldFish URL is not configured locally). Per T-5 it is expected in section 2, since the WorldFish linked total for T-PJ-003942 is 0 (live smoke).

### KPSF-T-5: Review attempt 1, FAIL (evidence gap)

**What held:**

- All live-smoke Falsifier items: CGSpace linked = 1 (`10568/182744`); 1 + 80 = 81 and 1 + 3345 = 3346; 18/18 requests returned HTTP 200.
- 182744 is in section 1 with no type/text/paging, and absent from section 2 (proven by arithmetic).
- R-4 live, and the DoD write-safety rule.
- **Disqualifier not triggered:** screenshot 1 shows all 4 labels, which only the attempt-2 bundle can produce, and there is no index drift.
- Coverage limits are recorded honestly.

**Issue:**

1. **Discovered Issue:** R-13 "AND choosing it proceeds to KP creation exactly as today" has no evidence and is not recorded as a gap. T-4 rewrote the template into sections, so the select wiring on the section 1 card is a real risk.
   - **Violated Rule:** requirements KPSF-R-13 L223; tasks KPSF-T-5 "KPSF-R-13: all clauses" and §5 "R-13 all clauses | T-5".
   - **Remediation:** either (a) the user clicks the section 1 card and stops before Create/Save, or (b) record a reasoned gap and defer it to PRTest.

**Leader adjudication: take (a).**

- **Read-only:** "Use this item" is read-only. `bilateral-manual-create-form.component.ts:254` `onCgspaceItemSelected` only validates the handle client-side, calls `GET_mqapValidation(url)` (a GET), and sets form signals (`kpHandle`, `title`).
- **No write:** the write happens only on "Create and continue", which stays forbidden.
- **Same wiring in every section:** all three variants (`single` / `linked` / `related`) render through the same `<ng-template #kpCard>` (`html` L473/L608/L677), so the button wiring is identical to the pre-spec card.
- **Next:** the user was asked for the click and a screenshot.

### KPSF-T-5: Attempt 2 evidence, R-13 "choosing it proceeds to KP creation" (user's local stack, 2026-10-14)

**Screenshot 3:** the user clicked "Use this item" on the section 1 card for `10568/182744`. The button switched to "Retrieving…" (`validatingKpHandle`, i.e. the `GET_mqapValidation` read).

**Screenshot 4:** the drawer returned to the create form:

- Result Level "Output" and Result Type "Knowledge Product".
- The "Browse repositories" tab is active, with a "SELECTED FROM CGSPACE" panel showing "Strengthening bean seed systems to reach 78,000 farmers…" and `https://hdl.handle.net/10568/182744`, plus "Change item".
- "Result title" is prefilled (21/30 words).
- The duplicate check reads "No existing result found with this exact title. You can proceed to create this result."
- The footer reads "Ready to create", with "Create and continue" enabled.

This is the same flow as the pre-spec card (`onCgspaceItemSelected`, unchanged). "Create and continue" was **not** clicked; no write action happened.

### KPSF-T-5: Final status

- **Status:** PASS (attempt 2 of 3; attempt 1 FAIL on the missing R-13 selection evidence).
- **Reviewer attempt 2:** `STATUS: PASS`. Screenshots 3 and 4 show the section 1 card going into the unchanged create flow with no write. The source confirms the click path `#kpCard` → `onSelect` → `itemSelected` → `onCgspaceItemSelected` (GET only). All R-13 clauses and the T-5 DoD items have evidence.
- **Requirements covered:** KPSF-R-13 (all clauses), R-1 / R-4 / R-9 (live parts), the requirements §8 rows for the live smoke and the visual check, and OQ-6.

## 3. Summary

| Task | Result | Attempts |
|---|---|---|
| KPSF-T-1 Project match rule | PASS | 1 |
| KPSF-T-2 Scoped server search | PASS | 1 |
| KPSF-T-3 Client two-scope fetch | PASS | 1 |
| KPSF-T-4 Two-section template | PASS | 2 (label cap hid the R-1 label) |
| KPSF-T-5 Live smoke + browser acceptance | PASS | 2 (R-13 selection evidence) |

### Budget

- Raised from ~700 to ~2,000 LOC by the user after T-2; within the raised budget.
- At most 2 review rounds per task, so the original review-round budget held.

### Not committed

The user's rule is no commit without an explicit go-ahead. The working tree holds:

- **Server:** 6 modified files, plus the new `project-match.ts`, `project-match.spec.ts` and `repositories.config.spec.ts`.
- **Client:** 3 modified files.
- **Spec folder:** this spec.
- **Do not stage:** the untracked `onecgiar-pr-server/src/a.py`, which is unrelated.

### Deploy note

Server first, or in the same pipeline run as the client (design §12). A new client against an old server breaks: the old server answers 400 on the unknown params, and the `linkedApplied` fallback to `true` is advisory risk T-4 a1.

### Follow-ups (not in this spec)

1. Server orders the R-2-matching labels first, or adds `matchedProjects[]`, so the linked card does not show the CIMMYT label first (T-4 remediation b).
2. Treat a missing `projectScope` echo as not applied (`linkedApplied=false`).
3. A11y and i18n polish: aria-label on the span, redundant tab stops, `focus:outline-none` on "Load more", inline copy.
4. The unconfigured-repository banner says "did not respond" (pre-existing KPM copy).
5. Remove the dead `projectSummary` / `projectDescription` inputs.
6. `npm run test:local` is broken on Windows (`spawnSync npx`).
7. `kp-cgspace-browse.cy.ts` CT not run.
8. Update TRD W9 at archive.
9. Send Theresa the tagging rule.
10. Multi-valued item-level match residual risk (T-1 advisory).
11. Re-run the T-5 live smoke on PRTest after the deploy.
12. Delete `D:\kpsf-tmp` and free space on `C:`.

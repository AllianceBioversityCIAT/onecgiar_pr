# Tasks — KP browse: strict bilateral project filter (`KPSF`)

## 1. Scope of this task list

Implements `requirements.md` KPSF-R-1..R-13 per `design.md`.

- **Budget (tripwire):** 5 tasks · ~700 LOC including tests · ≤ 2 review rounds per task.
- **Branch:** `qa-development-2026-ss`.
- **Commit format:** `<emoji> <type>(<scope>) [INC-165339]: <description>`, with no apostrophes, `$` or quotes in the subject (Jenkins).
- **Execution rules:**
  - Jest always with `--maxWorkers=2` and a scoped pattern.
  - One test run at a time on the machine.
  - Never the full suite.

## 2. Pre-flight checklist

- [ ] `git status` clean on `qa-development-2026-ss`
- [ ] Free RAM ≥ 4 GB before running Jest (`Get-CimInstance Win32_OperatingSystem`)
- [ ] Read `design.md` §8 (rule) and §9 (client state) before T-1 / T-3

## 3. Task list

### KPSF-T-1 — Project match rule util with real-label fixtures

- **Type:** server
- **Description:** Create `project-match.ts`, a pure module with no Nest dependencies, implementing `design.md` §8.1. It covers normalization, distinctive words (stopwords, roman numerals, < 3 chars, lead-center acronym, code parts; first 8), code phrases (with and without leading zeros), usability, the Solr clause for a given field, and a label predicate with the same semantics. Then create `project-match.spec.ts` with the fixture table.
- **Implements:**
  - KPSF-R-2: all three scenarios.
  - KPSF-R-9: "only sanitized words appear in the clause".
  - KPSF-R-13: the 182744 label as a positive.
- **Files (expected):** `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/project-match.ts`, `…/project-match.spec.ts`
- **Depends on:** —
- **Blocks:** KPSF-T-2
- **Estimate:** S
- **Review:** lenses (correctness-critical rule)
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:** any of these outcomes fails the task:
    - "IITA (USA-USAID) - Accelerated Innovation Delivery Initiative (AID-I) for Mozambique" → `false` for `T-PJ-003942` / IITA;
    - "CIMMYT (USA-USAID) - Accelerated Innovation Delivery Initiative (AIDI)" → `true`;
    - "IITA - T-PJ-003763 something" → `true`;
    - "IITA - Western Africa Hub" → `true`;
    - a 1-word title matching on that word alone;
    - the clause for a title containing `" : ( ) * ? \ AND OR` containing any character outside `[a-z0-9 ]` plus the operators and field syntax the module emits;
    - the distinctive words for `T-PJ-003942` not being exactly `accelerated innovation delivery initiative aid mozambique`.
  - **Red run:** `cd onecgiar-pr-server && npx jest --silent --reporters=summary --forceExit --maxWorkers=2 --testPathPattern="project-match"`. It fails before (module absent) and passes after.
  - **Disqualifier:** if the rule cannot satisfy all R-2 positives and negatives at once, stop and escalate (the rule needs re-design), rather than weakening a fixture.
  - **Consumers:** none (new module).
- **Status:** [x] PASS 2026-10-14 (attempt 1; see `execution.md`)
- **Definition of done:**
  - [x] Fixture table covers every R-2 scenario bullet, the R-9 special-character case and the R-13 label
  - [x] `npx eslint <touched files> --quiet` clean
  - [x] No commit without user go-ahead

### KPSF-T-2 — Scoped linked/related search on the server

- **Type:** server
- **Description:**
  - **Adapters:** add `fields.project` (CGSpace `cg.identifier.project`; MEL/WorldFish `cg.contributor.project`) and remove `facets.project`.
  - **`translateParams`:** compose the base query (escaped user text or `*:*`, keeping `sort` when there is no text) with the T-1 clause:
    - `linked` → `AND`
    - `related` → `AND NOT`
    - an unusable project → `linked` returns an empty page with no upstream call; `related` sends the base query only.
  - **DTO:** add `projectCode`, `projectTitle`, `projectLeadCenter` and `projectScope`; the "query required" rule also counts `projectScope`; map the legacy `project` (`<code> - <title>`) to `linked`.
  - **Service:** include the new params in the cache key; echo `projectScope: { scope, applied }` on the page.
  - **Mapper:** `projects[]` = `adapter.fields.project` ∪ `cg.identifier.project`.
  - **Controller:** update the Swagger description.
- **Implements:**
  - **KPSF-R-1:** both scenarios, including "must NOT send the legacy `f.project` facet".
  - **KPSF-R-3 (server half):** "the same search without the project constraint, excluding every item already in section 1" (`AND NOT`).
  - **KPSF-R-4 (server half):** the totals of each scope describe their own set.
  - **KPSF-R-7.**
  - **KPSF-R-8:** "AND-combined with text, type, center, year" and "must not change their individual semantics".
  - **KPSF-R-9:** "the server MUST report the constraint as not applicable", and "every repository returns HTTP 200 (no upstream 400)" at unit level.
  - **KPSF-R-10 (server half):** no project params → `translateParams` output identical to today.
  - **KPSF-R-11:** facet removal and the legacy `project` param.
- **Files (expected):** `…/cgspace-discovery/repositories.config.ts`, `…/cgspace-discovery/dto/cgspace-search-query.dto.ts`, `…/dto/cgspace-item.dto.ts`, `…/cgspace-discovery.service.ts`, `…/cgspace-discovery.mapper.ts`, `…/results-knowledge-products.controller.ts`, and their `*.spec.ts`
- **Depends on:** KPSF-T-1
- **Blocks:** KPSF-T-3, KPSF-T-5
- **Estimate:** M
- **Review:** full (changes a shared API contract)
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`
- **Verification:**
  - **Falsifier:** any of these outcomes fails the task:
    - `translateParams({ projectCode:'T-PJ-003942', projectTitle:'IITA Accelerated…', projectLeadCenter:'IITA', projectScope:'linked', year:'2026' }, cgspace)` yields a `query` without `cg.identifier.project:(accelerated AND … AND mozambique)`;
    - the same call for MEL uses `cg.identifier.project` instead of `cg.contributor.project`;
    - `related` lacks `AND NOT`;
    - any output contains `f.project`;
    - a call with no project params differs from the pre-change snapshot;
    - the MEL mapper fixture with `cg.contributor.project` yields an empty `projects[]`;
    - the cache key for `linked` equals the cache key for `related`.
  - **Red run:** `cd onecgiar-pr-server && npx jest --silent --reporters=summary --forceExit --maxWorkers=2 --testPathPattern="cgspace-discovery|cgspace-search-query|results-knowledge-products.controller"`. The new cases fail before and pass after; the existing cases stay green.
  - **Disqualifier:** if an existing KPM/KPPJ server spec has to be **weakened** (not just updated for `f.project` removal) to pass, stop and report.
  - **Consumers:** `CgspaceDiscoveryService.search` (controller `results-knowledge-products.controller.ts:50`); `translateParams` callers in `cgspace-discovery.service.ts`; `CgspaceItemDto.projects` consumers (client browse, `merge.ts`).
- **Status:** [x] PASS 2026-10-14 (attempt 1; see `execution.md`)
- **Definition of done:**
  - [x] Swagger description updated (no `f.project` mention)
  - [x] `npx eslint <touched files> --quiet` clean
  - [x] `/api/bilateral/*` untouched (no change-log entry needed)

### KPSF-T-3 — Client: two-scope fetch and state, remove the project fuzzy matcher and the facet chip logic

- **Type:** client
- **Description:**
  - **State (`kp-cgspace-browse.component.ts`):** keep the existing list as the related/unconstrained list. Add the linked-scope signals (items, page, hasMore, total, status, applied).
  - **Search reset (`isBilateralBrowse()`):** fire the linked and related requests in parallel, both at page 0, with `projectCode`, `projectTitle`, `projectLeadCenter` and `projectScope`.
  - **"Load more":** per scope.
  - **Non-bilateral:** a single request with no project params.
  - **Remove:** `projectRepositoryFilterOn`, `toggleProjectRepositoryFilter`, `projectRepositoryFilterValue`, `buildProjectMatchCandidates`, `matchesProjectTags` and the project branches of `matchesProject` / `displayItems` / `onlyMatches`.
  - **Keep:** the KPAM SP match and soft-sort within each list.
- **Implements:**
  - **KPSF-R-3 (client fetch):** "both sections MUST apply the same text, type, center and year filters".
  - **KPSF-R-4:** "each section MUST show its own count", and "a section 2 Load more does not re-query section 1" (NFR performance).
  - **KPSF-R-6:** "the client fuzzy matcher is no longer used for projects".
  - **KPSF-R-10:** "MUST send no project parameters" for non-bilateral.
  - **KPSF-R-11:** chip logic removal.
- **Files (expected):** `onecgiar-pr-client/…/kp-cgspace-browse/kp-cgspace-browse.component.ts`, `…/kp-cgspace-browse.component.spec.ts`
- **Depends on:** KPSF-T-2 (contract)
- **Blocks:** KPSF-T-4
- **Estimate:** M
- **Review:** full
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:** any of these outcomes fails the task:
    - a bilateral search reset issues anything other than exactly 2 search requests, one per scope, each carrying the same `type` / `center` / `year` / `query`;
    - section 2 "Load more" triggers a linked request;
    - a non-bilateral search sends any `project*` param;
    - `matchesProjectTags` / `buildProjectMatchCandidates` are still referenced anywhere in the client (`grep` returns hits);
    - the SP badge logic (KPAM specs) breaks.
  - **Red run:** `cd onecgiar-pr-client && npm run test:local -- --testPathPattern="kp-cgspace-browse"`. The new two-scope cases fail before and pass after.
  - **Disqualifier:** if keeping the existing list as "related" forces changes to non-bilateral callers (Programme Results, AoW, lab), stop and re-design the state split.
  - **Consumers:**
    - `kp-cgspace-browse` usages: `report-result-form.component.html:100`, `lab-report-form.component.html:178`, `aow-hlo-create-modal.component.html:121`, `bilateral-manual-create-form.component.html:107-122`;
    - exported helpers removed: grep confirms no import outside the browse folder.
- **Status:** [x] PASS 2026-10-14 (attempt 1; see `execution.md`)
- **Definition of done:**
  - [x] `npx eslint <touched files> --quiet` clean
  - [x] Scoped specs green, including the KPAM / KPM cases in the same spec file

### KPSF-T-4 — Client: two-section template, empty linked state, proxy note, copy, a11y

- **Type:** client
- **Description:** Bilateral template:
  - **Section 1:** heading "KPs linked to the project · N"; cards with the "Linked to <code>" badge; a compact empty state naming the project when N = 0 (or when `applied=false`, with a one-line notice); its own "Load more".
  - **Section 2:** heading "Other KPs potentially related · M"; one-line proxy note; a "Proxy" marker on each card; its own "Load more".
  - **Info line:** the R-12 sentence.
  - **Removed:** the chip markup and the copy "CGSpace uses highlight matching only" / "does not hide other items".
  - **Kept:** failed repositories still read "unavailable".
  - **Rules:** Tailwind/Spartan as in the existing template, and the headings are real headings.

  Then rewrite the KPPJ template specs against the sections.
- **Implements:**
  - **KPSF-R-3 (rendering):** order, the proxy note, and "182744 must NOT appear again in section 2" at render level.
  - **KPSF-R-5:** all clauses, including "must NOT render the generic no-results copy" and "IT MUST still report a failed repository as unavailable".
  - **KPSF-R-6:** the linked badge only in section 1, and the proxy marker on every section 2 card.
  - **KPSF-R-9 (client half):** "show section 1 empty with a one-line notice, and section 2 as normal".
  - **KPSF-R-11:** copy removal.
  - **KPSF-R-12.**
  - **NFR accessibility:** headings and accessible names; the proxy note is text, not color only.
- **Files (expected):** `…/kp-cgspace-browse/kp-cgspace-browse.component.html`, `…/kp-cgspace-browse.component.spec.ts`
- **Depends on:** KPSF-T-3
- **Blocks:** KPSF-T-5
- **Estimate:** M
- **Review:** checklist
- **Skills:** `angular-developer`, `tailwind-design-system`, `spartan`
- **Verification:**
  - **Falsifier:** any of these outcomes fails the task:
    - with the linked mock = [182744] and the related mock = [80 items], the DOM shows 182744 in section 2, a section 2 card without the proxy marker, or a section 1 card without the linked badge;
    - with the linked mock = [] the generic "no results" copy renders, or section 2 is hidden;
    - with a failed CGSpace source, any section shows "0" for CGSpace;
    - the text "highlight matching only" is still present in the template.
  - **Red run:** `cd onecgiar-pr-client && npm run test:local -- --testPathPattern="kp-cgspace-browse"`.
  - **What these assertions cannot prove:** layout, spacing, contrast and visual hierarchy, because jsdom does not lay out. They are covered by the T-5 browser check.
  - **Disqualifier:** if a section needs a new shared component used outside this browse, stop and spec it.
  - **Consumers:** none outside the browse template.
- **Status:** [x] PASS 2026-10-14 (attempt 2; see `execution.md`)
- **Definition of done:**
  - [x] `npx eslint <touched files> --quiet` clean
  - [x] Scoped specs green

### KPSF-T-5 — Live smoke on 3 repositories + R-13 browser acceptance

- **Type:** rollout
- **Description:**
  - **Live smoke:** run the exact `query` strings `translateParams` generates for `T-PJ-003942` (linked and related, year 2026, with and without type Case Study) against CGSpace, MELSpace and WorldFish, and record totals and HTTP codes in `execution.md`.
  - **Browser acceptance:** with the local stack (server + client from this branch; do not click write buttons, the DB is shared), open Bilateral › IITA › T-PJ-003942 › Create result › Knowledge product › Browse and verify R-13.
  - **OQ-6:** record which section the other-center KPs land in.
  - **Deploy note:** the server ships before or with the client.
- **Implements:**
  - **KPSF-R-13:** all clauses, including "must NOT be necessary to page, search text or pick a type" and "same when type = Case Study".
  - **KPSF-R-1:** the live part of "exactly 10568/182744 (total 1)".
  - **KPSF-R-4:** live "section 1 reads 1 / section 2 reads 80".
  - **KPSF-R-9:** live "every repository returns HTTP 200".
  - **Requirements §8:** live-smoke and visual-check rows.
- **Files (expected):** `docs/specs/changes/kp-project-strict-filter/execution.md` (evidence only)
- **Depends on:** KPSF-T-2, KPSF-T-4
- **Blocks:** —
- **Estimate:** S
- **Review:** checklist
- **Skills:** `claude-in-chrome` (browser) or manual by the user
- **Verification:**
  - **Falsifier:** any of these outcomes fails the task:
    - CGSpace linked total ≠ 1, or its item ≠ `10568/182744`;
    - linked + related ≠ unconstrained for Case Study 2026 (1 + 80 = 81);
    - any host returns non-200;
    - in the browser, 182744 is absent from section 1 without type/text, or present in section 2.
  - **Red run:** n/a (no test gate; live and manual evidence).
  - **Disqualifier:** if the served bundle is stale (the method source does not match disk), the browser evidence is void. Start our own `ng serve` and re-check. If a CGSpace total differs only because the index changed since 2026-10-14, record the new numbers and the reason instead of passing.
  - **Consumers:** none (no shared symbol changed).
- **Status:** [x] PASS 2026-10-14 (attempt 2; see `execution.md`)
- **Definition of done:**
  - [x] Evidence table in `execution.md`
  - [x] Screenshot or description of both sections for R-13
  - [x] No write action performed in the browser

## 4. Dependency graph

```
T-1 → T-2 → T-3 → T-4 → T-5
               └──────────┘ (T-5 also needs T-2)
```

The graph is strictly sequential (each task consumes the previous contract); there are no cycles.

## 5. Coverage closure (scenario / clause → task)

| Requirement clause | Owner |
|---|---|
| R-1 "THEN section 1 is exactly 10568/182744" | T-2 (unit), T-5 (live) |
| R-1 "label … is shown on the card" | T-4 |
| R-1 "BUT must NOT contain any item failing R-2" | T-1 (rule), T-2 (AND clause) |
| R-1 MEL/WorldFish "returns the matching items" + "MUST NOT send f.project" | T-2 |
| R-2 positives / negatives / "must NOT treat code prefix alone" / too-few-words | T-1 |
| R-3 order + proxy note + "182744 must NOT appear again in section 2" | T-2 (AND NOT), T-4 (render) |
| R-3 "same text, type, center, year filters" | T-3 |
| R-4 "section 1 reads 1, no Load more" / "section 2 reads 80" / "BUT must NOT show unfiltered 81" | T-3, T-4, T-5 (live) |
| R-5 empty state + section 2 visible / "must NOT render generic no-results" / "MUST report failed repository as unavailable" | T-4 |
| R-6 linked badge only in section 1 / "must NOT be badged as linked" in section 2 / client fuzzy matcher not used | T-3, T-4 |
| R-7 MEL/WorldFish labels | T-2 |
| R-8 AND with text; section 2 = text minus section 1 | T-2, T-3 |
| R-9 sanitized clause | T-1 |
| R-9 "report the constraint as not applicable" | T-2 |
| R-9 "show section 1 empty with notice, section 2 normal" | T-4 |
| R-9 "every repository returns HTTP 200" | T-2 (unit), T-5 (live) |
| R-10 no project params / single list | T-2 (server), T-3 (client) |
| R-11 facet removal + legacy param | T-2 |
| R-11 copy removal | T-4 |
| R-12 info line | T-4 |
| R-13 all clauses | T-5 (with T-1..T-4 as prerequisites) |
| NFR performance (≤ 1 extra request per repository; "Load more" does not re-query section 1) | T-3 |
| NFR accessibility | T-4 |
| NFR security / observability | T-1, T-2 |

## 6. Test plan

As in `design.md` §11. Commands live in each task's **Red run**.

## 7. Rollout & roll-back

- **Rollout:**
  1. Server first, or in the same pipeline run as the client (`design.md` §12).
  2. PRTest deploys from `performance-refactor` after a fast-forward from QA (~30 min).
  3. Re-run the T-5 live smoke on PRTest.
- **Roll-back:** revert the KPSF commits. There are no migrations or data changes.
- **Follow-ups:**
  - KPSF-OQ-5: program keyword approximation, as a separate spec.
  - TRD W9 update at archive.
  - Send Theresa the exact title rule: CLARISA / mapping-list title, a prefix is allowed, or the PJ code.

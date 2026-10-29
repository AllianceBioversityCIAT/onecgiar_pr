# Tasks — KP related: rank by factor count (`KFS`)

> Status: Approved 2026-10-23 (gated). Budget (design §11): 2 tasks, ~200 LOC, 1–2 review rounds.

## 1. Pre-flight

- [ ] Machine rules: Jest `--maxWorkers=2`, scoped, one run at a time. Run `--findRelatedTests` on the changed files before push.
- [ ] Live probes use GET only against the public Discovery APIs. Browser checks are read-only: never click "Use this item" or "Create and continue".
- [ ] Probe inputs are **real project records** (kaizen KRR P1). For T-PJ-003161, take the title, description, Center (IITA) and program (SP02 Sustainable Farming) exactly as PRTest shows them. Use the same for P-1486 and iSPARK.

## 2. Task list

### KFS-T-1 — Server: constant-score factor clauses + regression test + live ordering probe

| Field | Value |
|---|---|
| Status | [x] done 2026-10-23 (PASS attempt 2, see execution.md) |
| Size | S–M (~30 prod + ~170 test LOC) |
| Depends on | — |
| Requirements | KFS-R-1, KFS-R-2, KFS-R-3, NFR-1, NFR-2, NFR-3 |
| Design | §7, DD-1..DD-4, reversion challenge §10 |
| Skills | `nestjs-expert`, `tdd`, `systematic-debugging` |

**Scope**
- `buildRelevanceBlock`:
  - group the keywords into one subject clause;
  - give each factor clause a constant score (`^=`);
  - boost and filter forms otherwise unchanged.
- `RELEVANCE_WEIGHTS_NO_TEXT` = 1/1/1 and `RELEVANCE_WEIGHTS_WITH_TEXT` = 0.001/0.001/0.001.
- Update the KRR/KRS literal expectations that assert per-keyword `^4` clauses (design §10, challenge item 2). Keep every other assertion.
- (Pivot 2026-10-23, KFS-R-3, DD-5) `matchesCenter` in `project-relevance.ts`: whole-word phrase containment instead of full-name equality. Tests: "(IITA)" and "… - IITA" count; a partial-word or reordered name does not; acronym-only context counts nothing; update any KRR test that asserted equality-only behavior.

**Regression test (red before, green after)**
1. Add a literal test **before the fix** using a long-title fixture modeled on T-PJ-003161, with ≥ 6 keywords plus Center and program. It asserts:
   - the CGSpace boost form contains exactly one `dcterms.subject:(` group, followed by `)^=1`;
   - `affiliation:"…")^=1` and `cg.contributor.programAccelerator:"…")^=1` are present;
   - the query does **not** contain `^4` or `^2`.
2. Run it on the current code: it must fail. Record the failure line in `execution.md`.
3. Apply the fix and run it again: it must pass.

**Other tests**
- The filter form: the same three clauses, with no `*:*` arm.
- With text: the constants are `^=0.001`, and the text base and the `f.*` filter params are unchanged.
- Linked, plain (unranked) and non-project-browse params are byte-identical to before. Reuse the KRS byte-identity loop.
- The KRS DD-4 gate fixture still gives `relatedOnly=false` when the untrimmed filter does not fit. Adjust the fixture length if grouping now makes it fit; the test must still reach the gate-false branch.
- Encoded length is < 2000 for the long-title fixture in both forms.

**Verification**
- Jest:
  - `cd onecgiar-pr-server && npx jest --maxWorkers=2 --silent --testPathPattern="project-relevance|repositories.config|cgspace-discovery"`
  - then `--findRelatedTests` on the 2 prod files.
  - Run eslint on the touched files.
- **Live ordering probe.** GET only, 3 hosts, year 2026, real inputs, using the real `translateParams`. For T-PJ-003161, P-1486 and iSPARK, boost form and filter form:
  - **Factor count:** compute the factor count of the first 30 items per host with the real `evaluateProjectMatch`. It must be non-increasing.
  - **Totals:** compare old vs new totals on the same run, building the old query from the pre-fix code path.
  - **First item:** report the first-item tier.
  - **Text:** "potato" on P-1486, where the first item still matches the text.
- **Fails if:**
  - the regression test passes on unfixed code;
  - CGSpace shows a lower factor count before a higher one in the first 30 for T-PJ-003161 or P-1486 (strict; amended 2026-10-23);
  - on any other host × project row, a rise is not attributable to the accepted stemming residual (requirements §6) — i.e. the earlier item has no subject that stem-matches a project keyword the label missed, and the pair is not a score tie;
  - any total differs between old and new beyond corpus drift (re-run once; a persistent difference is a FAIL);
  - the literal still contains a per-keyword `^4`;
  - a linked or plain request differs from before.
- **Not evidence:**
  - a probe on invented project text;
  - a probe on one host;
  - a factor count computed by any function other than `evaluateProjectMatch`.

**Done:**
- the red run is recorded;
- green, lint clean;
- the probe table (host × project × form: factor-count sequence head, totals old/new) is in `execution.md`.

---

### KFS-T-2 — PRTest acceptance (read-only browser check)

| Field | Value |
|---|---|
| Status | [x] done 2026-10-23 (PASS, user confirmed; see execution.md) |
| Size | S (manual) |
| Depends on | T-1, committed and deployed to PRTest through `performance-refactor` (~30 min, with the user's go-ahead for commit and push) |
| Requirements | KFS-R-1, KFS-R-2, NFR-3 |
| Design | §2 |
| Skills | browser check (Claude in Chrome), read-only |

**Steps**
1. Confirm the bundle and server are current. The tier order on T-PJ-003161 is the signal.
2. **T-PJ-003161, no text** (the reproduction). Load 3 pages.
   - The first card is the highest tier present.
   - Page 1 holds Strong/Partial if they exist.
   - Compare the per-page tier table against the proposal §3 table.
3. Toggle on for T-PJ-003161. The order is the same, and the total is unchanged from before the fix (1313 ± drift).
4. P-1486 and iSPARK: the first card is still Strong, and the toggle-on totals are 468 / 1489 ± drift.
5. "potato" on P-1486: the first cards match the text.

- **Fails if:**
  - page 1 of T-PJ-003161 is all Weak/None while Strong or Partial exist further down;
  - any toggle total moves beyond drift.
- **Not evidence:** a check before the deploy is confirmed.

**Done:** the tier table and totals are recorded in `execution.md`, and the user confirms.

## 3. Coverage closure

| Clause | Owner |
|---|---|
| R-1 long-title: highest-factor first per repository | T-1 probe, T-2 step 2 |
| R-1 "page 1 contains ≥ 1 Partial/Strong when ≥ 10 exist" (CGSpace) | T-1 probe (CGSpace row), T-2 step 2 |
| R-1 "BUT Weak must NOT precede 2/3-factor" | T-1 probe (strict CGSpace check + stemming attribution elsewhere, amended 2026-10-23) |
| R-1 "AND IT MUST hold for the filter form" | T-1 (filter literal and probe), T-2 step 3 |
| R-1 P-1486 / iSPARK first Strong and totals | T-1 probe, T-2 step 4 |
| R-2 set and totals unchanged | T-1 probe (old vs new), T-2 steps 3–4 |
| R-2 text still leads | T-1 (with-text literal, "potato" probe), T-2 step 5 |
| R-2 linked, plain and browse byte-identical | T-1 byte-identity loop |
| NFR-1 no extra calls | T-1 (existing service call-count test unchanged) |
| NFR-2 < 2000, DD-4 gate | T-1 (length test, gate fixture) |
| R-3 center label = Solr phrase semantics | T-1 (matchesCenter tests, probe non-increasing check) |
| NFR-3 no payload or UI change | T-1 (no DTO diff), T-2 |

## 4. Rollout & roll-back

- **Commit:** one server commit, plus a docs commit, promoted through `performance-refactor`.
- **Roll-back:** revert the server commit. This restores the per-keyword weights. Nothing client-side or in the data changes.

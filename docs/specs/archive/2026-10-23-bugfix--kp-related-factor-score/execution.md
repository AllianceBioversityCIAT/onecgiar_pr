# Execution Log — KP related: rank by factor count (`KFS`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bugfix/kp-related-factor-score/` |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` (base 1d6529e5f) |
| Leader | Claude Code, Opus 5.5 (T1) |
| Implementer / Reviewer | `akili-implementer` (T2 sonnet) / `akili-reviewer` (T3 opus) wrappers |
| Started | 2026-10-23 |
| Note | Working tree carries unrelated uncommitted changes from `replicated-innovation-reminders`; every diff in this log is scoped to `cgspace-discovery/` and this spec folder |

## 2. Task Execution History

### KFS-T-1 — Server: constant-score factor clauses + regression test + live ordering probe

| Field | Value |
|---|---|
| Status | in progress (`[~]` pending) — code + Jest done, evidence probe owed |
| Date | 2026-10-23 |
| Skills | `nestjs-expert`, `tdd` (Leader dropped `systematic-debugging` as default-load: no failure to debug at brief time) |
| Effort | Implementer `high` (one above T2 default: Solr syntax + multi-dimension live probe) |

#### Attempt 1 — Implementer

- Files (numstat, `cgspace-discovery/`): `project-relevance.ts` +20/-9 · `repositories.config.ts` +15/-12 · `project-relevance.spec.ts` +25/-29 · `repositories.config.spec.ts` +154/-22 · `cgspace-discovery.service.spec.ts` +2/-2 (one `dcterms.subject:accelerated^4` literal, design §10 item 2).
- **RED (unfixed code, new tests first):** 7 failed / 1 passed (the pass is the linked/plain no-`^=` guard). First failure verbatim, `repositories.config.spec.ts:945:57`:
  ```
  Expected: " AND (*:* OR (dcterms.subject:(cassava OR seed OR systems OR smallholder OR farmers OR west OR africa OR mozambique))^=1 OR (cg.contributor.affiliation:\"international institute of tropical agriculture\")^=1 OR (cg.contributor.programAccelerator:\"sustainable farming\")^=1)"
  Received: " AND (*:* OR dcterms.subject:cassava^4 OR dcterms.subject:seed^4 OR dcterms.subject:systems^4 OR dcterms.subject:smallholder^4 OR dcterms.subject:farmers^4 OR dcterms.subject:west^4 OR dcterms.subject:africa^4 OR dcterms.subject:mozambique^4 OR cg.contributor.affiliation:\"international institute of tropical agriculture\"^2 OR cg.contributor.programAccelerator:\"sustainable farming\"^2)"
  ```
- **GREEN:** `npx jest --maxWorkers=2 --silent --testPathPattern="project-relevance|repositories.config|cgspace-discovery"` → 8 suites / 315 tests passed. `--findRelatedTests` on the 2 prod files → 17 suites / 348 passed. eslint `--quiet` clean on 5 files.
- Probe script: scratchpad `kfs-probe/probe.ts` (pre-fix copies in `kfs-probe/prefix/` for the OLD query). Smoke on placeholder inputs only — **NOT EVIDENCE**: 24/24 requests 200, totals old == new, filter form emitted on 12/12 filter rows; `^=` accepted by all 3 hosts.
- **Finding (spec gap candidate):** Solr's center clause is a phrase match (`cg.contributor.affiliation:"international institute of tropical agriculture"` matches "… (IITA)" and "… - IITA"), while `evaluateProjectMatch.matchesCenter` requires full-name equality. Solr can therefore score an item 3 that the tier label calls 2, and the T-1 "non-increasing `evaluateProjectMatch` count" check tripped on CGSpace + MELSpace in the placeholder smoke. Pre-existing KRR behavior, not introduced by this fix. Escalated to the user (gated).
- Not Done: evidence probe (needs real inputs for T-PJ-003161, P-1486, iSPARK).

#### Attempt 1 — Reviewer (code + test portion; probe excluded by brief)

- **STATUS: PASS.** Clause shape, boost/filter forms, weights, unchanged trim/gate, byte-identity (KRR linked/unusable/code-only literals + KRS loop untouched and green), regression test and length test conform to design §7 / DD-1..DD-4 and tasks §KFS-T-1. Every changed expectation is a `^4`/`^2`/`^0.001`/`^0.0005` → `^=` literal conversion; no `expect` deleted.
- ADVISORY (recorded, no rework): RELIABILITY — Jest proves query shape only; the live probe is the only evidence for R-1 and the totals part of R-2, so T-1 must not reach `[x]` without it. READABILITY — some converted `toContain` strings lost the field prefix (`'OR cassava OR'` at `repositories.config.spec.ts:312`, `:360`); optional.

## Pivot Record: KFS-T-1

- **Date:** 2026-10-23. Task stays `[~]`; no rework attempt consumed.
- **Blocker:** design §7 claimed Solr order and tier label "agree by construction". False: Solr's center clause is a phrase match on a tokenized field, `matchesCenter` is full-name equality (KRR). Affiliations like "International Institute of Tropical Agriculture (IITA)" score as Center in Solr but are labeled without it, so the T-1 non-increasing check fails for IITA projects.
- **Alternatives:** (a) align `matchesCenter` to Solr phrase semantics; (b) keep equality, amend the probe criterion and accept mislabels; (c) pause.
- **Decision (user, 2026-10-23):** (a). Spec amended: requirements §2 summary, new **KFS-R-3**, NFR-3, ID index; design §5–6 note, §7 tier-attachment bullet, new **DD-5** (supersedes the KRR "full-name equality" rule — spec-level, not a TRD ADR); tasks T-1 scope bullet + requirements row + coverage row. `matchesCenter` lives in `project-relevance.ts`, already in T-1's file scope.
- **Correction closure sweep:** forward grep `by construction|equality` across the spec folder — remaining hits are the amended text itself, the proposal's Option A rationale (score = tier by construction, still true of the score) and this log. Backward: tasks T-1 probe criterion (`evaluateProjectMatch` non-increasing) now holds as written once DD-5 lands; no other section cited the equality rule.
- **Budget:** still 2 tasks; LOC estimate +~40 (matchesCenter + tests), within the ~200 order of magnitude. Review rounds: 2 of 1–2 used after the rework.
- **Approval:** user, 2026-10-23 ("que sigue? puedes probar en local?" — read as go-ahead after choosing (a)). Probe inputs read-only from the PRMS DB via the server `.env` (`clarisa_projects`, 3 rows → scratchpad `kfs-probe/projects.json`); programs per user: T-PJ-003161 SP02, P-1486 SP13, iSPARK SP02.

#### Attempt 2 — Implementer (post-Pivot DD-5 + evidence probe)

- `matchesCenter` = whole-word phrase containment (DD-5). Advisory done: field prefix restored on the 2 converted `toContain` strings. Cumulative numstat vs HEAD: `project-relevance.ts` 31/12 · `project-relevance.spec.ts` 73/29 · `repositories.config.ts` 15/12 · `repositories.config.spec.ts` 157/22 · `cgspace-discovery.service.spec.ts` 2/2.
- **RED:** 4 failed / 7 passed. First failure `project-relevance.spec.ts:680:65` ("… International Institute of Tropical Agriculture (IITA)"): expected `["center"]`, received `[]`. Negatives ("Tropical Agriculture Research Institute", partial name, reordered, "…Agricultures", "Superinternational …", "IITA" alone, acronym-only/null/blank) pass on old and new.
- **GREEN:** scoped Jest 8 suites / 326 tests passed; `--findRelatedTests` 17 / 359 passed; eslint clean. RAM 6.0 GB free.
- **Evidence probe** (2026-10-23, real inputs, GET only, year 2026, size 30; OLD = pre-fix snapshot; NEW labels = post-DD-5 `evaluateProjectMatch`). Totals old == new in 24/24 rows; filter form emitted on every filter row; encoded length 473–793.

| project | host | boost / filter totals (old = new) | NEW first-30 factor counts | non-increasing | first tier old→new |
|---|---|---|---|---|---|
| P-1486 | CGSpace | 3492 / 444 | 333322222222222222222222222222 | ✅ (old ❌) | strong→strong |
| P-1486 | MELSpace | 238 / 22 | 011111011111111111111100000000 | ❌ | weak→none |
| P-1486 | WorldFish | 126 / 2 | 210000000000000000000000000000 | ✅ | partial→partial |
| T-PJ-003161 | CGSpace | 3492 / 1256 | 333322222222222222222222222222 | ✅ (old ❌) | weak→strong |
| T-PJ-003161 | MELSpace | 238 / 39 | 112200111011111110111111111111 | ❌ | weak→weak |
| T-PJ-003161 | WorldFish | 126 / 19 | 111111111101111111100000000000 | ❌ | weak→weak |
| iSPARK | CGSpace | 3490 / 1423 | 232223332323122122222111221121 | ❌ | weak→partial |
| iSPARK | MELSpace | 238 / 50 | 221211111111111111111111111001 | ❌ | weak→partial |
| iSPARK | WorldFish | 126 / 20 | 111110010011111000000000000000 | ❌ | weak→weak |

- Reproduction: CGSpace T-PJ-003161 old `111111111111111112111111111110` (no Strong in the first 30) → new `3333222222…`; page 1 = 4 Strong + 6 Partial. "potato" on P-1486: CGSpace 9/10 potato titles, same first item as old; text still leads where text hits exist.
- **Remaining violations — root cause:** Solr stems subjects (English analyzer); `matchesKeywords` folds plurals only ("integrating"↔"integrated", "bundled"↔"bundle/bundling", "sustainability"↔"sustainable"). Solr adds the keyword factor, the label does not. Several are score ties. This is the residual already accepted in KRR §8 / KRS design §10 ("Solr stems subjects, and the tier check folds only simple plurals"). A crude diagnostic stemmer (NOT evidence) makes 3 of the 7 rows monotonic; the rest are not explained by it.
- Evidence files: scratchpad `kfs-probe/evidence.txt`, `evidence-out.json`, `inputs.json`.
- Status vs tasks "Fails if": strict all-host non-increasing criterion **not met** (7/9 rows). Escalated to the user as a second spec-gap decision; T-1 stays `[~]`.

## Pivot Record: KFS-T-1 (2) — probe criterion amended

- **Date:** 2026-10-23. **Decision (user):** accept the stemming residual rather than a second code Pivot (stemmer in `matchesKeywords`).
- **Amended:** requirements R-1 "BUT" clause + §6 new accepted-residual paragraph; tasks T-1 "Fails if" — strict non-increasing on CGSpace for T-PJ-003161 and P-1486 (the reproduction and the prior acceptance project); every other rising pair must be attributable to a stem-only keyword hit or a score tie. iSPARK/CGSpace is therefore under the attribution rule, not the strict one.
- **Sweep:** forward grep `non-increasing|lower count before` — requirements §6 defect-class row still states the strict 3-host form; it describes the defect class the probe hunts ("`^=` ignored"), which the CGSpace strict rows and the 24/24 order change already rule out — amended to match. Backward: tasks coverage row "R-1 BUT …" amended to "strict CGSpace check + stemming attribution elsewhere".

#### Attempt 2 — Reviewer

- **STATUS: PASS.** DD-5 `matchesCenter` matches design DD-5 word for word; the new tests cover every case KFS-R-3 names; no assertion weakened (the interdiff tightens attempt-1's `'OR cassava OR'` into a full literal). The probe meets the amended Fails-if: both CGSpace strict rows (P-1486, T-PJ-003161; boost + filter) are non-increasing, totals are old == new on 24/24. The Reviewer checked **every** rising pair in `evidence-out.json`, not just the DIAGNOSTIC sample. Each one is a stem-only keyword hit: integrating↔integrated, sustainability↔sustainable, build↔building, resilience↔resilient, bundled↔bundling, using↔use, crop↔cropping. Position 28 on iSPARK/CGSpace is also a score tie. No rise comes from the program factor. Inputs are real, all 3 hosts were probed, the counts come from `evaluateProjectMatch`, and old/new queries ran in the same run.
- ADVISORY (recorded, no rework):
  - RELIABILITY: the DIAGNOSTIC section of `evidence.txt` is partial (it shows only some rises and truncates `prevAffiliations` to 6). **`kfs-probe/evidence-out.json` is the complete record** for the probe table above.
  - RELIABILITY: Solr's phrase clause is stemmed too, so an affiliation like "…Tropical Agricultures" scores as Center in Solr but not under DD-5. This is the same accepted stemming residual applied to the center factor. It is a candidate one-liner for requirements §6, not applied here (no advisory→spec edits).
  - READABILITY: the non-increasing rule applies to **no-text rows only**. The "potato" rows rise by design because the text score leads.

### KFS-T-1 — Final

- **Status: PASS** on attempt 2 (attempt 1 PASS on code, with the probe scope owed. Two user-approved Pivots: DD-5 center alignment, then the stemming-residual criterion).
- Requirements covered: KFS-R-1, R-2, R-3, NFR-1 (no new upstream calls; service call-count tests unchanged), NFR-2 (encoded 473–793 < 2000; DD-4 gate fixture green), NFR-3 (no DTO diff).
- Budget: 1 task of 2 done; ~289 LOC (prod ~43, tests ~246) against an estimate of ~240 including the +40 from the Pivot; 2 review rounds, within the 1–2 budget. Slightly over on LOC, driven by tests; no tripwire stop.
- Final verification: scoped Jest 326/326, `--findRelatedTests` 359/359, eslint clean, live probe table above.
- Not committed (no-auto-commit rule). T-2 needs the commit + push through `performance-refactor` with the user's go-ahead.

### KFS-T-2 — PRTest acceptance (read-only browser check)

| Field | Value |
|---|---|
| Status | **PASS** — user confirmed 2026-10-23 ("si la doy por buena") |
| Date | 2026-10-23, by the Leader at the user's request ("Ya se desplegó … puedes probar?") |
| Deploy | `performance-refactor` = 56929266f (af5cdfc81 server fix), deployed per the user |
| Path | Bilateral → IITA → T-PJ-003161 / T-PJ-003936 (iSPARK), CIP → P-1486-GCDT → Create result → Complete the form manually → Output → Knowledge Product. Primary SP chosen in the drawer only (SP02 for the IITA projects; P-1486 was preset to SP13 Genebank) |
| Read-only | "Use this item" and "Create and continue" were never clicked. Drawers were closed with ✕; nothing was saved |

| # | Check | Evidence | Result |
|---|---|---|---|
| 1 | Bundle/server current | T-PJ-003161 first card "Strong match · 3 of 3" (before the fix it was Weak; proposal §3) | ✅ |
| 2 | T-PJ-003161, no text, 3 pages (vs proposal §3 table) | P1: 4 S · 8 P · 15 W · 3 N (was 0·0·24·6). P2: 0·10·17·3 (was 0·1·26·3). P3: 0·10·10·10 (was 1·0·18·11). Each page is non-increasing. The first Strong is at position 1 (was 90); the first Partial is at position 5 (was 31) | ✅ |
| 3 | T-PJ-003161 toggle on | 3858 → **1314** (CGSpace 1256 · MELSpace 39 · WorldFish 19; T-1 probe filter totals were identical). Expected 1313 ± drift. P1: S×4 P×8 W×15 N×3. Toggle off returns to 3858 | ✅ |
| 4 | iSPARK | Related 3856. First card Strong; P1: S×5 P×8 W×13 N×4. Toggle on gives **1494** (KRS-T-4 had 1489 ± drift). Toggle off returns to 3856. The toggle-on page sequence was read 3 s after the header changed and came back identical to the toggle-off one, so the toggle-on first card is not independently confirmed | ✅ (totals) |
| 5 | P-1486 | Related 3863 (CGSpace 3497 · MEL 238 · WF 128). First card Strong; P1: S×4 P×7 W×9 N×10. Toggle on gives **470** (CGSpace 446 · MEL 22 · WF 2; KRS-T-4 had 468 ± drift). Toggle off returns to 3863 | ✅ |
| 6 | "potato" on P-1486 | 432 items (CGSpace 426 · MEL 2 · WF 4). The first card is a WorldFish item; WorldFish has no potato titles, the same as in the T-1 probe and KRR. It comes first because of the KRS per-page tier sort across the interleaved repositories. Cards 2–6 are all potato titles from CGSpace. Text leads within each repository | ✅ |

- Fails-if check: page 1 of T-PJ-003161 is not all Weak/None (4 Strong + 8 Partial). No toggle total moved beyond drift (1314/1313, 1494/1489, 470/468).

## Summary

- Both tasks are PASS. KFS-T-1 passed on attempt 2, after two user-approved Pivots (DD-5 center alignment, then the stemming-residual criterion). KFS-T-2 passed as the PRTest acceptance check, confirmed by the user.
- Commits: af5cdfc81 (server fix), 56929266f (spec + T-1 log). Both are on `qa-development-2026-ss` and `performance-refactor`. This log update is committed separately.
- Outcome: on T-PJ-003161 the first Strong moved from position 90 to position 1. Totals are unchanged, and text precedence is unchanged.
- Open for archive / kaizen:
  - Reviewer advisories: the center-factor stemming residual one-liner for requirements §6; the DIAGNOSTIC section in `evidence.txt` is partial.
  - Lesson: the probe in the acceptance projects of KRS hid the long-title case, and the T-1 smoke exposed the gap between the label and Solr.
  - CodeGraph sync is pending.

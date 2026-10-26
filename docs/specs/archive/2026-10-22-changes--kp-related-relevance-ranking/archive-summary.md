# Archive Summary — KP browse: related-section relevance ranking (`KRR`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `changes/kp-related-relevance-ranking` |
| Archive date | 2026-10-22 |
| Branch | `qa-development-2026-ss` (spec branch; `Default Branch: master`) |
| Commits | `65ae4c2c4` server · `00a86f0f4` client · `a20e06725` server T-6 · spec docs `226ffa29c`, `76b9d1914`, `e84fb9fbb` |
| Delivered on | `performance-refactor` at `76b9d1914` (PRTest). Not in production: promotion is Cristian's step |
| Source | INC-166020 (Nicoleta Trifa) |
| Owner | santiago.sanchez@cgiar.org |

## 2. Original Spec Path

`docs/specs/changes/kp-related-relevance-ranking/`

## 3. Archive Date

2026-10-22

## 4. Final Status

**Done.** Six tasks, every one with a Reviewer PASS, and the live acceptance passed on PRTest.

| Task | Result |
|---|---|
| KRR-T-1 `project-relevance.ts` | ✅ PASS on attempt 1 |
| KRR-T-2 Query wiring + live calibration | ✅ PASS on attempt 3 (2 Reviewer FAILs on the `ranked` echo) |
| KRR-T-3 Mapper `subjects` + `projectMatch` | ✅ PASS on attempt 1 |
| KRR-T-4 Client badge, factors, tooltips | ✅ PASS on attempt 1 (+ user-approved Proxy tooltip) |
| KRR-T-5 PRTest acceptance (R-11) | ✅ PASS, re-checked after T-6. Browser check delegated to the Leader by the user |
| KRR-T-6 Keyword quality + plural matching | ✅ PASS (added from the T-5 finding OI-5, user-approved) |

## 5. Requirements Delivered

| Requirement | Delivered by |
|---|---|
| R-1 Related ranked by project relevance, same total | Non-filtering boost block `AND (*:* OR …)`, no `sort` when ranked. Totals equal on 3 hosts (3464/238/119) |
| R-2 Text dominates when present | With-text weights ^0.001/^0.0005/^0.0005. "potato" leads on PRTest |
| R-3 Non-project browse unchanged | Byte-identical params (tests). Response gains optional `subjects` only (accepted reading) |
| R-4 Linked section unchanged | Byte-identical linked params; no tier on linked cards (iSPARK check) |
| R-5 / R-6 Factors and tier | `evaluateProjectMatch`: keywords on subjects, center, program; 3/2/1/0 → Strong/Partial/Weak/None |
| R-7 Tier badge, factor line, tooltip, no `%` | Spartan `hlmBadge` + `hlmTooltip`, focusable |
| R-8 Ranked proxy note | Shown only when the related echo says `ranked` |
| R-9 Sanitized, bounded keywords | Escaped tokens, adapter field names, caps 8 title + 12 description (T-6), code/numeric/boilerplate excluded |
| R-10 Country factor | Deferred (KRR-OQ-1); no `country` boost is emitted |
| R-11 End-to-end acceptance | T-5 on PRTest, P-1486-GCDT and iSPARK |
| NFR-1..NFR-4 | No extra upstream calls; KRR block never pushes the query past 2000 (as adjudicated); pure module; additive optional fields |

## 6. Files Changed Summary

| Package | Files | Change |
|---|---|---|
| server | `project-relevance.ts` + spec (NEW) | Keywords, plural forms, relevance block, factors, tier, `matchesTaggedMetadata` port |
| server | `project-match.ts` | `export` on tokenizer, stop words, min length (no behavior change) |
| server | `repositories.config.ts` + spec | Adapter `subject`/`program` fields, `composeScopedQuery`, one `ranked` gate, trim order, phrase cap 60 |
| server | `dto/cgspace-search-query.dto.ts` + spec | `projectDescription`, `projectProgram`, `projectLeadCenterName` |
| server | `dto/cgspace-item.dto.ts` | `subjects?`, `projectMatch?`, `projectScope.ranked` |
| server | `cgspace-discovery.service.ts` + spec, `cgspace-discovery.mapper.ts` + spec | Cache key, `projectMatch` attach before merge, `subjects` mapping |
| client | `kp-cgspace-browse.component.{ts,html,spec.ts}` | 3 new params, center-name lookup, tier badge, factor line, two Spartan tooltips, ranked note |

About 2,590 inserted lines: server ~2,240 (prod ~760), client ~350 (prod ~140). Plan was ~650 including tests.

## 7. Test Evidence Summary

- Server: T-6 `--findRelatedTests` 17 suites, 326/326. Pre-push 18 suites, 330/330. Red runs and falsifiers recorded per task in `execution.md`.
- Client: `kp-cgspace-browse` 114/114 (16 new). `--findRelatedTests` 58 suites, 2619/2619. `npm run build:dev` exit 0.
- Live GET probes on all 3 Discovery hosts before and after T-6 (totals, top items, weight sweep).
- No `test-report.md`: `/akili-test` was not run. The user accepted this absence by asking to archive (same as the previous archives).

## 8. Validation Summary

- No `validation-report.md`: `/akili-validate` was not run. The user accepted this absence by asking to archive.
- PRTest acceptance (T-5, re-checked after T-6): CGSpace related top led by a Strong genebank/sweetpotato KP; related 3821 equals the unranked totals; "potato" led by potato items; tooltips open on hover and keyboard focus; iSPARK linked cards have no badge and linked + related = year total.

## 9. Accepted Warnings Or Follow-Ups

| # | Follow-up | Owner / where |
|---|---|---|
| 1 | Strongest-first ordering across repositories, related-only count, "2 of 3" factor count | New spec `changes/kp-related-strongest-first` (proposal approved) |
| 2 | KRR-OQ-2: Nicoleta has to accept tier + factors instead of a percentage | INC-166020 reply; partly addressed by follow-up #1 |
| 3 | OI-1: the KPSF prefix alone can exceed 2000 encoded chars with 200 multi-byte search characters (predates KRR) | Possible follow-up: cap the encoded query |
| 4 | OI-3: center names over 60 chars (ICARDA, ICRISAT, CIFOR-ICRAF) are cut in the boost, so tier and ranking may differ slightly | Accepted |
| 5 | With an empty project description, keywords are generic CGIAR words, so many items rank Weak | Accepted residual limit |
| 6 | Transient CGSpace timeouts (`SEARCH_TIMEOUT_MS = 8000`); "Retry CGSpace" recovers | Existing behavior |
| 7 | R-10 country factor | Deferred |
| 8 | Reviewer advisories: rename `ranked: string \| null` → `rankedQuery`; no cache-hit test keeping `projectMatch`; worst-case test does not pin trim drop order | Cosmetic / test gaps |
| 9 | Production promotion | Cristian Gamboa |

## 10. Historical Notes

- The spec grew from 5 to 6 tasks: T-5 on PRTest showed that the real P-1486 title embeds its project code and that the "first 8 description words" cap dropped `genebank` and `potato`. T-6 fixed keyword extraction and widened plural matching (`potatoes` ↔ `potato`).
- T-2 needed 3 review rounds: `ranked` was first computed apart from the code that emits the block, so the echo could disagree with the request actually sent. The fix makes one gate drive both.
- Weight calibration: the design's ^0.3 with-text weights put a Genebanks report first for "potato"; the live sweep settled at ^0.001. Solr rejects weights printed in exponent form (< 0.0001).
- The `Proxy` marker tooltip was a user-approved scope extension during T-4 (INC-166020 screenshot circled "Proxy ?").

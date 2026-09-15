# Judgment Day — `design.md` (rev 1 → rev 2)

| Field | Value |
|---|---|
| Target | `docs/specs/changes/kp-multi-repository-browse/design.md` rev 1 (immutable at review time), read against `requirements.md`, `proposal.md`, archived `KPB` design and the code |
| Mode | judgment_day · round 1 · **one round, fixes applied without scoped re-judgment (standing mandate 2026-09-02, pre-approved mode)** |
| Judges | A and B — `akili-reviewer`, model `opus` (author = Fable; author ≠ auditor) — blind, read-only, identical scope and criteria |
| Verdicts | A: 4 SEVERE · 10 WARNING · 5 SUGGESTION — B: 5 SEVERE · 10 WARNING · 3 SUGGESTION |
| Counts | Confirmed severe **5** · Suspect **1** · Contradictions **0** · INFO **21** (14 applied, 7 recorded) |
| Fix actor | Leader inline (design edits only); correction sweep forward/backward over the spec folder |
| Terminal | `JUDGMENT: APPROVED ✅` — with the re-judgment waiver recorded above |

## Confirmed severe (both judges) — fixed in rev 2

| ID | A / B | Finding | Fix applied |
|---|---|---|---|
| C-1 | JA-1 / JB-1 | Merged `totalElements` defined pre-dedup; requirements (`KPM-AC-5`, scenario R-5) count a deduplicated pair once. | `totalElements` = Σ ok totals − `dedupedCount`; raw totals stay in `sources[]` (§4.1, §5, `KPM-DD-4`). |
| C-2 | JA-2 / JB-5 | "Every source non-ok → 502" made an all-`unconfigured` deployment a 5xx, violating `KPM-R-13`. | 502 only when every selected source is `timeout`/`error`; all-`unconfigured` → 200 + `sources[]` + empty list (§2.2, §4.1, §5, `KPM-DD-2`). |
| C-3 | JA-4 / JB-3 | Adapter table omitted `title`, `affiliation`, `uri`; mapper reads them and the card renders the center. | Three columns added to §3.3 and to the `KPM-T-1` capture list; mapper rule in §5. |
| C-4 | JB-2 severe / JA-7 warning | `size` undefined as per-source vs merged; DTO max 25 × 3 = 75 items breaks the stated bounds. | `size` is per source; merged ≤ `size × selected`; `page.size/number` semantics defined (§4.1); NFR wording aligned in `requirements.md` §7. |
| C-5 | JB-4 severe / JA-6 warning | Failed/unconfigured source results not excluded from the 60 s cache → Retry a no-op. | Only `status:'ok'` source results are cached; Retry re-sends the full selection and healthy sources hit the cache (§5, §6.2, `KPM-DD-2`). |

## Suspect (one judge)

| ID | Judge | Finding | Disposition |
|---|---|---|---|
| S-1 | JA-3 | §3.3 listed `10947` as a CGSpace handle prefix; the shared `kp-handle.validator.ts` accepts only `10568|20.500.11766|20.500.12348` in `hdl` form and a spec locks the rejection. | Not a design change: the column is informational (runtime uses the `items/<uuid>` host form). Wording corrected — `10947` dropped, column annotated. Recorded as suspect. |

## INFO (warnings / suggestions)

| IDs | Topic | Disposition |
|---|---|---|
| JA-5 | `allSettled` gate inert if `searchOne` swallows its own rejection | Applied: `searchOne` rejects with a classified error for `timeout`/`error`; the settle handler maps it; `requirements.md` §9 input updated. |
| JA-8 | `timeout` vs `error` classification unspecified | Applied: Axios `code ∈ {ECONNABORTED, ETIMEDOUT}` → `timeout`, else `error`. |
| JA-13 / JB-6 | Validator spelling for the array field | Applied: `@IsArray()`, `@ArrayMinSize(1)`, `@IsIn(…, { each: true })`, transform handles undefined / string / string[]. |
| JA-9 / JB-11 | "Retrieving metadata from CGSpace…" also in the browse template (`html:104`, spec `:483`) | Applied to §6.2 and `KPM-T-7/T-8`. |
| JA-10 / JB-9 | TRD integrations row and server guide env list missing from §2.1 | Applied (shared-file discipline noted). |
| JA-11 / JB-12 | Three host specs assert `'Browse CGSpace'` | Applied: named in §10 and `KPM-T-8`; LOC raised. |
| JA-12 / JB-14 | `KPM-R-20` / `KPM-R-21` unaddressed | Applied: Load more bound to `page.hasMore`; R-21 via `KPB-DD-5` (panel stays mounted). |
| JB-15 | Retry semantics | Applied (full selection, cache for healthy sources). |
| JB-13 / JA-15 | Cache sizes | Applied: search cache 200 → 600; facet cache 20 → 60 (3 × 2 × ~10 prefixes). |
| JA-16 | Only two of five `cgspace.*` events renamed | Applied: all five listed in §9. |
| JA-17 / JB-7 | `findOnCGSpace` line anchors | Applied: 635, 653, 682–686, 694–696. |
| JB-8 | Non-existent DTO test name in §15 | Applied: real name quoted. |
| JA-14 | Allow-list test count | Applied: four positive + one negative. |
| JA-18 | Lead-in string not quoted | Applied in §6.2. |
| JB-10 | `lab-report-form/CLAUDE.md` stale folder guide | Applied: deliverable of `KPM-T-8`. |
| JB-16 | `noopener,noreferrer` + `itemUrl → uri → handleUrl` fallback chain | Applied in §2.2 / `KPM-DD-10`. |
| JB-17 | Icons: client guide rule 21 (`@ng-icons/lucide` only) vs `design.md` §7 | Applied: lucide icons for new UI in this component; deviation from ux-ui §7 recorded (child guide narrows). |
| JB-18 / JA-19 | "Title retrieved from CGSpace" in `result-creator.component.html:127`, `change-result-type-modal.component.html:74` | Applied: both added to the copy task and the grep gate (copy only). |

## Sweep

Forward: `grep -n "pre-dedup\|legacy 502\|10947\|material-icons-round\|ALLOWED_HOSTS\|634, 650" docs/specs/changes/kp-multi-repository-browse/*.md` after the edits → only intentional mentions remain (this ledger, the reversion table's history). Backward: `tasks.md` and `requirements.md` re-read for claims about totals, 502, cache, size — updated where they asserted the superseded value.

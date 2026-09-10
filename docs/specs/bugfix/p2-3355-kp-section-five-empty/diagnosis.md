# P2-3355 / P2-3356 — Diagnosis: Section 5 renders nothing for Knowledge Products

**Written:** 2026-08-31 · **Verified against:** `performance-refactor`
**Tickets:** [P2-3355](https://cgiarmel.atlassian.net/browse/P2-3355) (QA - Bug, Medium, *To Be Clarified* since 19-Aug-2026) · [P2-3356](https://cgiarmel.atlassian.net/browse/P2-3356) — same CGSpace chain, diagnose together.

> **Bottom line: this is very likely already fixed and nobody has re-tested.** The cause is a client/server addressing mismatch that two commits landed *after* the QA run. Before writing any code, run the 10-minute checklist in §4.

---

## 1. What is NOT the problem

The template already renders 15+ metadata rows — Handle, Authors, DOI, Accessibility, License, Keywords, FAIR scores and more:
`onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-knowledge-product/type-knowledge-product.component.html:90-178`

**Missing UI is not the issue.** The section is empty because its single data fetch fails.

## 2. The decisive finding — id vs result_code

The endpoint resolves by **primary key**, not by result code:

`onecgiar-pr-server/src/api/results/results-knowledge-products/results-knowledge-products.service.ts:1727-1765`

```ts
if (id < 1) throw { message: 'missing data: id', status: BAD_REQUEST };
const result = await this._resultRepository.findOne({ where: { id } });
if (!result) throw { ...NOT_FOUND };
const knowledgeProduct = await this._resultsKnowledgeProductRepository.findOne({
  where: { results_id: result.id },
});
if (!knowledgeProduct) throw { message: '...does not have a linked Knowledge Product Details', status: NOT_FOUND };
```

At the time QA tested, the client fed it a **`result_code`**. The chain:

```
type-knowledge-product.component.ts:105-109   reads currentResultId
  → bilateral-api.service.ts:170              GET results-knowledge-products/get/result/{that value}
  → the pre-fix loadResult set currentResultId from the route param, which is the result_code
```

**The two numbers are different for most results.** The commit that fixed it carries the measurement: on prtest, **5.804 of 9.667 results have `id != result_code`** — e.g. row `id 11012` carries `code 5093`. So roughly 60% of the time the endpoint was handed a code that addresses a *different row*, which has no KP → 404 → the component's `error:` branch → the **"0/0"** QA reported.

Why 0/0 is the signature of the failure path: on success the checklist registers one field and shows 0/1 or 1/1. It can only collapse to 0/0 when the request failed.

### Already fixed on the branch

| Commit | Date | What it did |
|---|---|---|
| `5763e0fb5` | **19-Aug** | Stop swallowing the KP metadata failure; never route by a 0 result code |
| `f474a9e33` | **26-Aug** | *P2-3352* — publish the real result id; `currentResultId` now comes from `cf.id` |

**QA reported on 19-Aug.** `f474a9e33` landed a week later and is the one that addresses the cause. Nobody re-tested after it.

### It explains part of P2-3356 too

Geographic Location and Evidence read the same `currentResultId`
(`section-geography.component.ts:137,149`; `section-evidence.component.ts:168,371,432`) — same wrong row.
Title/Description do **not** — they come from `commonFields`, so they need H3 below.

Corroboration worth noting: `section-geography.component.ts:131-135` carries a comment describing this exact bug and added an `effect()` guard for it. **`type-knowledge-product` never got one** — it fetches once in `ngOnInit` and never retries.

## 3. Remaining hypotheses, ranked

**H2 — a `result_code` of 0 (missing `result_auto_code` trigger).** `bilateral-center.service.ts:115` inserts `result_code: 0` as a placeholder; the real code comes from a BEFORE INSERT trigger (`src/migrations/1769300000000-BilateralResultCodeAutoIncrement.ts`). ⚠️ **Triggers in this project are applied by hand, not by migration** — Testing may not have it. Then `currentResultId = 0` → `id < 1` → HTTP 400 → 0/0, literally. Counter-evidence: QA cite "code 8852", which suggests codes *are* being assigned. Checklist item 1 settles it.

**H3 — `populateKPFromCGSpace` silently no-ops the title/description write** (P2-3356 only). `results-knowledge-products.service.ts:1310-1317` calls `update()` with `title` and `description`; **TypeORM drops `undefined` keys**. If MQAP omits `Description` for that handle, the description silently stays empty — exactly "Description is empty (0/300 words)". Checklist item 6.

**H4 — a deactivated result renders a blank page with no error.** A genuine latent defect, *different symptom*, worth its own ticket:
- `bilateral-center.service.ts:171-179` — if `populateKPFromCGSpace` throws, it sets `is_active = false` and throws 400. The row survives, deactivated.
- Opening it later: `results.service.ts:3479` does **not** filter `is_active` → found; `result.repository.ts:3114-3116` **does** → null; `results.service.ts:3562-3565` returns **HTTP 200 with `commonFields: null`**.
- Client `bilateral-creation.service.ts:146` skips, `loadFailed` stays false (200 is not an error), and none of the three branches in `bilateral-result-creator.component.html:132/140/155` render. **Blank page, no message.**
- Not fixed here: turning it into a 404 is a payload-contract change that needs a decision.

**H5 — CGSpace/MQAP year gate** (low). `findOnCGSpace` throws 422 for non-admins when the publication year ≠ active `phase_year` (`results-knowledge-products.service.ts:672-712`), but that fails *creation* and the client never navigates.

**H6 — NPE in the success path** (low, cheap to rule out). `results-knowledge-products.service.ts:1832` dereferences `result.obj_version.cgspace_year` unguarded; `mapper.ts:454-455` dereferences `result_knowledge_product_altmetric_array[0]` unguarded. Either surfaces as a 500.

## 4. Testing checklist — about 10 minutes

Have the DB and the browser Network tab open. Remember the auth header here is **`auth`**, not `Authorization: Bearer`.

**1. Is the trigger present?** (settles H2)
```sql
SHOW TRIGGERS LIKE 'result';        -- expect result_auto_code, BEFORE INSERT
SELECT * FROM result_code_seq;      -- expect last_code ≈ MAX(result_code)
SELECT COUNT(*) FROM result WHERE source='API' AND (result_code IS NULL OR result_code = 0);
```
Anything > 0 on the last query ⇒ H2 is live in this environment.

**2. Create one KP result through the UI** (handle `https://hdl.handle.net/10568/185045`). Note the URL and whether the toast *"Result created without a result code"* appears.
```sql
SELECT id, result_code, version_id, is_active, status_id, title, description
FROM result WHERE source='API' ORDER BY id DESC LIMIT 5;
```
- `id != result_code` ⇒ H1's precondition. The URL must carry the **id** if the fix is working.
- `result_code = 0` ⇒ H2. · `is_active = 0` ⇒ H4/H5. · title still `Bilateral Draft #<id>` ⇒ H3.

**3. Was the KP row written at all?**
```sql
SELECT result_knowledge_product_id, results_id, handle, name, is_active
FROM results_knowledge_product WHERE results_id = <ID>;
```
Empty ⇒ `populateKPFromCGSpace` never completed; the 404 is correct and the bug is upstream in creation.

**4. Hit the endpoint both ways — the single highest-value check.**
```
GET {apiBaseUrl}api/results/results-knowledge-products/get/result/<ID>     ← internal id
GET {apiBaseUrl}api/results/results-knowledge-products/get/result/<CODE>   ← result_code
```
If H1 is the whole story: **id → 200 with metadata; code → 404 or a different KP.**

**5. On the result detail page**, Network tab filtered to `results-knowledge-products`:
- Which number is in the path, `<ID>` or `<CODE>`?
- `400 missing data: id` ⇒ H2 · `404 ...does not have a linked Knowledge Product Details` ⇒ H1 or H3 · `500` ⇒ H6
- **No request fired at all** ⇒ H4 (check the detail response for `commonFields: null` on a 200).

**6. Compare against CGSpace** (kills/confirms H3):
```
GET {apiBaseUrl}api/results/results-knowledge-products/mqap?handle=10568/185045
```
A null `description` here explains an empty description with no bug in the write path.

**7. Control — a pooled-funding KP.** Open any W1/W2 KP, note its `id` and `result_code`, hit `get/result/<id>`. It works because the pooled detail page routes by internal id throughout. This A/B proves the difference is *addressing*, not the endpoint.

## 5. What could not be determined from code

- **Whether the bug still reproduces.** Both fixes landed after the reported evidence. Section 5 may already render.
- **Whether `result_auto_code` exists in Testing.** Not answerable from the repo — triggers are applied by hand here.
- **The QA "code 8852"**, which conflicts with the code-0 reading of H2. Item 1 resolves it.
- **Why Title/Description stayed at the placeholder** if the code was not 0. H3 is the best guess; needs the MQAP payload.

## 6. Recommendations

1. **Run the checklist before writing any code.** It will close or re-scope both tickets.
2. **The AC1 product decision may be moot.** If Section 5 now renders, AC1 is satisfied and no call is needed from the PO.
3. **File H4 separately** — a deactivated bilateral result renders a blank page with no error.
4. **Consider giving `type-knowledge-product` the same `effect()` re-fetch guard geography has** (`section-geography.component.ts:136-145`). Its one-shot `ngOnInit` fetch is the only type-specific section with no retry path.

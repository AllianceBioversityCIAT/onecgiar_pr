## 1. Client — AI Review button rule

- [ ] 1.1 In `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-sections-sidebar/result-sections.service.ts`, drop `r.result_type_id != 6` from `showAiReview` and record P2-2385 in the getter's doc comment.
- [ ] 1.2 In `.../result-sections-sidebar/result-sections.service.spec.ts`, replace the "hides AI review for knowledge products (type 6)" test with its inverse and keep the read-only / status gates asserted for a Knowledge Product.

## 2. Client — Impact-Areas-only dialog for Knowledge Products

- [ ] 2.1 In `onecgiar-pr-client/src/app/shared/services/api/ai-review.service.ts`, branch `onAIReviewClick()` on `dataControlSE.isKnowledgeProductSignal()`: skip `GET_resultContext()`, set `currnetFieldsList` to `[]`, and skip `POST_createProposal()` for a Knowledge Product.
- [ ] 2.2 In `.../api/ai-review.service.spec.ts`, cover both branches: a Knowledge Product calls neither `GET_resultContext` nor `POST_createProposal` and ends with an empty `currnetFieldsList`; any other type calls both and keeps the matched fields.

## 3. Verification

- [ ] 3.1 `npx jest --silent --reporters=summary --no-coverage --maxWorkers=2` green in `onecgiar-pr-client`.
- [ ] 3.2 `npm run build:dev` green in `onecgiar-pr-client` (the only gate that typechecks Angular templates).
- [ ] 3.3 Endpoint sanity already verified read-only against prtest for Knowledge Products 12015 / 12008: `GET /api/ai/result-context/dac-scores/{id}` and `GET /v2/api/results/ai/context?resultId={id}` both answer `200`.
- [ ] 3.4 UI check on prtest once deployed: open a Knowledge Product in `Editing` with all sections green, press **AI review**, confirm the dialog shows the IMPACT AREAS block and no Title/Description card.

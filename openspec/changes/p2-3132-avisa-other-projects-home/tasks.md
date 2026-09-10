## 1. Partition AVISA on home service

- [x] 1.1 Add `isAvisaScienceProgram()` helper (`initiativeId` 41, `SGP-02`, `SGP02`)
- [x] 1.2 Add `otherProjectsList` signal; partition API response in `getScienceProgramsProgress()`
- [x] 1.3 Dedupe AVISA by `initiativeId`; default empty arrays when response fields missing

## 2. Home page UI

- [x] 2.1 Add **Other projects** section in `result-framework-reporting-home.component.html` after Other SPs
- [x] 2.2 Reuse card grid + loading skeleton; hide section when list empty
- [x] 2.3 Add SCSS for `otherProjects` grid (match Other SPs layout)

## 3. Downstream fallback

- [x] 3.1 Include `otherProjectsList` in `entity-details.component.ts` SGP-02 short-name fallback

## 4. Tests

- [x] 4.1 Service spec: AVISA moved from my/other into `otherProjectsList`
- [x] 4.2 Service spec: non-AVISA items unchanged
- [x] 4.3 Run affected Jest specs

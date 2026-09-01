# rd-partners (P22 Partners & Contributors)

**Verified:** 2026-09-01 · branch performance-refactor · 17fd108db

## What it is
The Partners & Contributors section of Result Detail for the **P22 portfolio only**
(`routing-data.ts`, `portfolioAcronym: 'P22'`). P25 uses `../rd-contributors-and-partners/` instead.

## Contract
- State: `RdPartnersService` (`providedIn: 'root'`) owns `partnersBody`, `possibleLeadPartners`,
  `possibleLeadCenters`, `leadPartnerId`, `leadCenterCode`, `updatingLeadData`, `sectionLoading`.
- Catalogues: `CentersService.centersList`, `InstitutionsService.institutionsWithoutCentersList`,
  both awaited through their `loaded*` subjects in the service constructor.
- Children: `components/normal-selector/`, `components/knowledge-product-selector/`.

## ⚠️ The service has a TWIN, and they are not interchangeable
`RdPartnersService` (here) and `../rd-contributors-and-partners/rd-contributors-and-partners.service.ts`
implement the same lead-partner/lead-centre logic for different portfolios. Grep is misleading because
**both are injected under the name `rdPartnersSE`**:

| Page | Injects | Portfolio |
|---|---|---|
| `rd-partners` (this folder) | `RdPartnersService` | P22 |
| `rd-contributors-and-partners` | `RdContributorsAndPartnersService` | P25 |
| `ipsr-contributors` | `RdContributorsAndPartnersService` | IPSR |

So a call site reading `this.rdPartnersSE.setPossibleLeadCenters(true)` may belong to **either**
service. Check the injection before assuming which one you are looking at. A change here reaches P22
only; the twin reaches P25 **and** Innovation Packages.

## Traps (⚠️ = already broke something)
- ⚠️ **`updatingLeadData` is signal-backed and must stay that way** (P2-3322). It is raised to hide
  the Lead selects while the possible-leads list is recomputed and cleared inside a
  `setTimeout(..., 25)`; under zoneless change detection a plain field never triggers the second
  render pass and the select stays hidden (`rd-partners.component.html:58,70`). The public API is a
  plain boolean, so callers are unaffected — do not turn it back into a field.
- ⚠️ **It previously used `ViewRefreshService.schedule()` instead.** That is an `ApplicationRef.tick()`
  from the root: it worked (nothing in this page's ancestor chain is OnPush) but it skips an OnPush
  ancestor that is not dirty, and **a TestBed cannot drive it**, so the behaviour could not be pinned
  by any test. That is why the mechanism was converged onto the twin's signal, not because it was
  producing a live defect.
- ⚠️ **A test asserting `updatingLeadData` instead of the rendered select passes with the bug present.**
  `rd-partners.zoneless.spec.ts` asserts on `app-pr-select[label="Lead center"]` existing in the DOM.
  Keep it that way; reverting the service must fail it.
- The chip delete icon renders only when `!rolesSE.readOnly`, the result has no `status`, and the
  centre is not `from_cgspace` — a DOM test must satisfy all three to reach it.
- `sectionLoading` is raised in `ngOnInit`, not in `getSectionInformation`: the service is a root
  singleton, so without that the skeleton would only ever show for the first result of the session.

## Where it is used
- `resultDetailRouting` → the Partners section of Result Detail, P22 results only.

## Tests
- `rd-partners.zoneless.spec.ts` — real DOM under `provideZonelessChangeDetection()`. Mirrors the
  twin's `../rd-contributors-and-partners/rd-contributors-and-partners.zoneless.spec.ts`.
- `rd-partners.service.spec.ts`, `rd-partners.component.spec.ts` — Jest.

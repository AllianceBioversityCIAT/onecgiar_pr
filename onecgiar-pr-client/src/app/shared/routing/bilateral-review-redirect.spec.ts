import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { ResultFrameworkReportingRouting } from './routing-data';
import { BilateralReviewComponent } from '../../pages/result-framework-reporting/pages/bilateral-review/bilateral-review.component';

// @akili-spec changes/sp-bilateral-review-tab (BRT-T-6, BRT-R-16, BRT-AC-11)
//
// `BilateralReviewComponent` (`pages/bilateral-review/`) is owned by a concurrently-active spec
// task and injects a real DI tree (ApiService, CentersService, SmartNavigationService,
// ResultFrameworkReportingHomeService, the review services, plus band/table child components).
// Fully constructing it here would couple this routing test to that component's fast-changing
// internals. So this spec proves the two things BRT-R-16/AC-11 actually require, at the two levels
// where they live:
//   1. Config-level: the PRODUCTION `entity-details/:entityId/bilateral-review` entry in
//      `routing-data.ts` resolves (via its real `loadComponent`) to `BilateralReviewComponent`.
//   2. Runtime-level: navigating the PRODUCTION redirect entry through a real Router lands on the
//      new URL with the query string intact, and activates whatever component that entry's leaf
//      resolves to — verified with a stub swapped in for the leaf only, so the redirect wiring
//      under test is the untouched production `redirectTo`/`pathMatch` pair.
describe('Bilateral review route — legacy redirect (BRT-T-6)', () => {
  const redirectRoute = ResultFrameworkReportingRouting.find(r => r.path === 'entity-details/:entityId/results-review');
  const bilateralReviewRoute = ResultFrameworkReportingRouting.find(r => r.path === 'entity-details/:entityId/bilateral-review');

  it('keeps the production redirect entry pointed at the new path with a full path match', () => {
    expect(redirectRoute).toBeTruthy();
    expect(redirectRoute?.redirectTo).toBe('entity-details/:entityId/bilateral-review');
    expect(redirectRoute?.pathMatch).toBe('full');
  });

  it('resolves the production bilateral-review route to BilateralReviewComponent', async () => {
    expect(bilateralReviewRoute).toBeTruthy();
    await expect(bilateralReviewRoute!.loadComponent!()).resolves.toBe(BilateralReviewComponent);
  });

  it('navigates the legacy URL to the new URL for the same program, keeping the query string', async () => {
    @Component({ standalone: true, template: '' })
    class BilateralReviewStubComponent {}

    const testRoutes: Routes = [
      {
        path: 'result-framework-reporting',
        children: [
          { path: redirectRoute!.path!, redirectTo: redirectRoute!.redirectTo, pathMatch: redirectRoute!.pathMatch },
          { path: bilateralReviewRoute!.path!, component: BilateralReviewStubComponent }
        ]
      }
    ];

    TestBed.configureTestingModule({ providers: [provideRouter(testRoutes)] });
    const harness = await RouterTestingHarness.create();

    const instance = await harness.navigateByUrl(
      '/result-framework-reporting/entity-details/SP13/results-review?center=12&search=x',
      BilateralReviewStubComponent
    );

    const router = TestBed.inject(Router);
    expect(router.url).toBe('/result-framework-reporting/entity-details/SP13/bilateral-review?center=12&search=x');
    expect(instance).toBeInstanceOf(BilateralReviewStubComponent);
  });
});

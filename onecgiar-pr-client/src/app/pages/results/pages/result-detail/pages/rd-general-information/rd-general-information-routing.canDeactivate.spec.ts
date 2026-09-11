import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HlmDialogService } from '@spartan/dialog';
import { of } from 'rxjs';

import { UnsavedChangesGuard } from '../../../../../../shared/guards/unsaved-changes.guard';
import { UnsavedNavigationIntentService } from '../../../../../../shared/services/unsaved-changes/unsaved-navigation-intent.service';
import { CanComponentDeactivate } from '../../../../../../shared/guards/unsaved-changes.types';
import { resultDetailRouting, rdResultTypesPages } from '../../../../../../shared/routing/routing-data';

/**
 * Cross-cutting correction, `docs/specs/changes/unsaved-changes-alert/` (routing fix, no task id —
 * this is the missing verification the fix's own description called for).
 *
 * Reproduces the exact two-level route shape `resultDetailRouting` uses for every `rd-*` section:
 * an OUTER node with no `component` (production: `loadChildren`; here: `children`) and an INNER
 * node (`path: ''`) that carries both `component` AND `canDeactivate`. Angular's router treats
 * these as two separate nodes in the route tree, so `canDeactivate` MUST live on the inner node —
 * on the outer node it fires with `component: null`, and `UnsavedChangesGuard.canDeactivate()`
 * dereferences `component.hasUnsavedChanges()` unguarded, throwing on every navigation away from
 * the section (this bug shipped silently because every prior guard test called
 * `guard.canDeactivate(component)` directly with a stubbed component, never through a real
 * `Router`).
 *
 * This test drives a REAL `Router` end to end and asserts the guard receives the REAL routed
 * component instance — not `null`. Self-verified by temporarily moving `canDeactivate` back onto
 * the outer node (mirroring the pre-fix `routing-data.ts` shape): with that revert, the guard is
 * invoked with `component: null` and the `toBeInstanceOf` assertion below fails (the navigation
 * itself throws the same `TypeError` the bug produced in production). See the routing modules'
 * `UnsavedChangesGuard` wiring (e.g. `rd-general-information-routing.module.ts`) and
 * `shared/routing/routing-data.ts`'s `resultDetailRouting` entries for the real, fixed shape.
 */
describe('resultDetailRouting two-level canDeactivate shape (routing-config correction)', () => {
  @Component({ standalone: true, template: '' })
  class SectionStubComponent implements CanComponentDeactivate {
    hasUnsavedChangesReturn = false;
    saveSectionSpy = jest.fn(() => of(true));

    hasUnsavedChanges(): boolean {
      return this.hasUnsavedChangesReturn;
    }

    saveSection() {
      return this.saveSectionSpy();
    }
  }

  @Component({ standalone: true, template: '' })
  class OtherRouteStubComponent {}

  const buildTestRoutes = (): Routes => [
    {
      // Mirrors the outer `resultDetailRouting` entry: no `component`, just a nesting node.
      // Production uses `loadChildren`; `children` reproduces the identical route-tree shape
      // (two nodes) without requiring a real lazy module.
      path: 'general-information',
      children: [{ path: '', component: SectionStubComponent, canDeactivate: [UnsavedChangesGuard] }]
    },
    { path: 'other', component: OtherRouteStubComponent }
  ];

  it('invokes UnsavedChangesGuard.canDeactivate with the REAL routed component, not null', async () => {
    // The guard's constructor eagerly injects `UnsavedChangesDialogService` -> `HlmDialogService`
    // (a Spartan/CDK overlay service) even though this test's silent-save branch never calls
    // `openSaveDiscard()`. Stub it so DI resolves without pulling in the full overlay stack — the
    // dialog path itself is covered by `UnsavedChangesDialogService`'s own spec.
    TestBed.configureTestingModule({
      providers: [provideRouter(buildTestRoutes()), { provide: HlmDialogService, useValue: { open: jest.fn() } }]
    });

    const harness = await RouterTestingHarness.create();
    const section = await harness.navigateByUrl('/general-information', SectionStubComponent);
    expect(section).toBeInstanceOf(SectionStubComponent);

    // Simulate the silent Back/Next save path (`UCA-R-1`) so the guard resolves via
    // `component.saveSection()` instead of opening the real Save/Discard dialog — keeping this a
    // focused routing test while still exercising the guard's actual dirty branch.
    section.hasUnsavedChangesReturn = true;
    TestBed.inject(UnsavedNavigationIntentService).markSilent();

    const canDeactivateSpy = jest.spyOn(UnsavedChangesGuard.prototype, 'canDeactivate');

    await harness.navigateByUrl('/other', OtherRouteStubComponent);

    expect(canDeactivateSpy).toHaveBeenCalledTimes(1);
    const receivedComponent = canDeactivateSpy.mock.calls[0][0];
    expect(receivedComponent).not.toBeNull();
    expect(receivedComponent).toBeInstanceOf(SectionStubComponent);
    expect(receivedComponent).toBe(section);
    expect(section.saveSectionSpy).toHaveBeenCalledTimes(1);
  });

  /**
   * Regression guard for the actual shipped route tables (Reviewer FAIL on the first pass of this
   * correction: the test above proves Angular's semantics against a hand-written stub, but does
   * nothing to stop `canDeactivate` being re-added to a `resultDetailRouting`/`rdResultTypesPages`
   * OUTER entry in the future — which would reintroduce the exact bug this correction fixes,
   * silently, since this suite would stay green). Any entry that has `loadChildren` and no
   * `component` is componentless — Angular invokes `canDeactivate` there with `component: null`.
   */
  it('no resultDetailRouting/rdResultTypesPages entry with loadChildren and no component carries canDeactivate', () => {
    const allEntries = [...resultDetailRouting, ...rdResultTypesPages];
    const offenders = allEntries.filter(
      entry => !!entry.loadChildren && !('component' in entry) && !!(entry as { canDeactivate?: unknown[] }).canDeactivate
    );

    expect(offenders).toEqual([]);
  });
});

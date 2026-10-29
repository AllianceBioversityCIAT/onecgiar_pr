import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HlmDialogService } from '@spartan/dialog';

import { UnsavedChangesGuard } from './unsaved-changes.guard';
import { CanComponentDeactivate } from './unsaved-changes.types';

/**
 * @akili-spec bugfix/result-detail-not-found-navigation (RDN-R-1)
 *
 * Mirrors `result-detail.component.html:64`: the parent renders its `<router-outlet>` only while a
 * flag is true. A real root outlet (`RouterTestingHarness`) builds the parent; on the not-found /
 * error screens the flag is false, so the routed section never mounts and Angular invokes
 * `canDeactivate` with `component: null`. The control case flips the flag and proves it is the
 * flag, not the harness, that decides what the guard receives.
 */
describe('UnsavedChangesGuard through a real Router with an unmounted outlet (RDN-R-1)', () => {
  const parentConstructed = jest.fn();
  const sectionConstructed = jest.fn();
  let sectionReady = false;

  @Component({ standalone: true, template: '' })
  class SectionStubComponent implements CanComponentDeactivate {
    constructor() {
      sectionConstructed();
    }
    hasUnsavedChanges(): boolean {
      return false;
    }
    saveSection() {
      return true as unknown as ReturnType<CanComponentDeactivate['saveSection']>;
    }
  }

  @Component({
    standalone: true,
    imports: [RouterOutlet],
    template: '@if (ready) {<router-outlet />} @else {<p>not found</p>}'
  })
  class ParentStubComponent {
    ready = sectionReady;
    constructor() {
      parentConstructed();
    }
  }

  @Component({ standalone: true, template: '' })
  class OtherStubComponent {}

  const routes: Routes = [
    { path: 'detail', component: ParentStubComponent, children: [{ path: '', component: SectionStubComponent, canDeactivate: [UnsavedChangesGuard] }] },
    { path: 'other', component: OtherStubComponent }
  ];

  beforeEach(() => {
    parentConstructed.mockClear();
    sectionConstructed.mockClear();
    sectionReady = false;
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: HlmDialogService, useValue: { open: jest.fn() } }]
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('lets the navigation away complete when no section is mounted', async () => {
    const canDeactivateSpy = jest.spyOn(UnsavedChangesGuard.prototype, 'canDeactivate');
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/detail');
    expect(harness.routeNativeElement?.textContent).toContain('not found');
    expect(parentConstructed).toHaveBeenCalledTimes(1);
    expect(sectionConstructed).toHaveBeenCalledTimes(0);

    const result = await harness.navigateByUrl('/other');

    expect(canDeactivateSpy).toHaveBeenCalledTimes(1);
    expect(canDeactivateSpy.mock.calls[0][0]).toBeNull();
    expect(result).toBeInstanceOf(OtherStubComponent);
    expect(TestBed.inject(Router).url).toBe('/other');
    expect(sectionConstructed).toHaveBeenCalledTimes(0);
  });

  it('control: with the outlet rendered the section mounts and the guard receives it', async () => {
    sectionReady = true;
    const canDeactivateSpy = jest.spyOn(UnsavedChangesGuard.prototype, 'canDeactivate');
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/detail');
    expect(parentConstructed).toHaveBeenCalledTimes(1);
    expect(sectionConstructed).toHaveBeenCalledTimes(1);

    const result = await harness.navigateByUrl('/other');

    expect(canDeactivateSpy).toHaveBeenCalledTimes(1);
    expect(canDeactivateSpy.mock.calls[0][0]).toBeInstanceOf(SectionStubComponent);
    expect(result).toBeInstanceOf(OtherStubComponent);
    expect(TestBed.inject(Router).url).toBe('/other');
  });
});

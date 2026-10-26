import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterModule } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HlmBreadcrumbImports } from '@spartan/breadcrumb';
import { PhaseManagementComponent } from './phase-management.component';
import { PHASE_MANAGEMENT_COPY } from '../../../../internationalization/phase-management.copy';

@Component({ template: '', standalone: true })
class DummyComponent {}

describe('PhaseManagementComponent', () => {
  let component: PhaseManagementComponent;
  let fixture: ComponentFixture<unknown>;
  let router: Router;

  const tabs = (): HTMLAnchorElement[] => Array.from(fixture.nativeElement.querySelectorAll('nav[aria-label="' + PHASE_MANAGEMENT_COPY.tabsNavLabel + '"] a'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PhaseManagementComponent],
      imports: [RouterModule, ...HlmBreadcrumbImports],
      providers: [
        provideRouter([
          {
            path: 'admin-module/phase-management',
            component: PhaseManagementComponent,
            children: [
              { path: 'reporting', component: DummyComponent },
              { path: 'innovation-package', component: DummyComponent }
            ]
          }
        ])
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  // The component is rendered through the router so its relative routerLinks resolve like in the app.
  const renderAt = async (url: string) => {
    const harness = await RouterTestingHarness.create();
    component = await harness.navigateByUrl(url, PhaseManagementComponent);
    fixture = harness.fixture;
    harness.detectChanges();
    await fixture.whenStable();
    harness.detectChanges();
  };

  it('should create', async () => {
    await renderAt('/admin-module/phase-management/reporting');
    expect(component).toBeTruthy();
  });

  it('shows the reporting title and description on the reporting route', async () => {
    await renderAt('/admin-module/phase-management/reporting');
    expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe(PHASE_MANAGEMENT_COPY.reportingTitle);
    expect(fixture.nativeElement.textContent).toContain(PHASE_MANAGEMENT_COPY.reportingDescription);
  });

  it('shows the IPSR title on the innovation-package route', async () => {
    await renderAt('/admin-module/phase-management/innovation-package');
    expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe(PHASE_MANAGEMENT_COPY.ipsrTitle);
    expect(fixture.nativeElement.textContent).toContain(PHASE_MANAGEMENT_COPY.ipsrDescription);
  });

  it('marks only the active tab with aria-current="page"', async () => {
    await renderAt('/admin-module/phase-management/reporting');
    const [results, ipsr] = tabs();
    expect(results.getAttribute('aria-current')).toBe('page');
    expect(ipsr.hasAttribute('aria-current')).toBe(false);
  });

  it('switches title and aria-current when navigating to the other tab', async () => {
    await renderAt('/admin-module/phase-management/reporting');
    await router.navigateByUrl('/admin-module/phase-management/innovation-package');
    await fixture.whenStable();
    fixture.detectChanges();
    const [results, ipsr] = tabs();
    expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe(PHASE_MANAGEMENT_COPY.ipsrTitle);
    expect(ipsr.getAttribute('aria-current')).toBe('page');
    expect(results.hasAttribute('aria-current')).toBe(false);
  });

  it('renders the breadcrumb trail', async () => {
    await renderAt('/admin-module/phase-management/reporting');
    const text = fixture.nativeElement.querySelector('nav[aria-label="breadcrumb"]').textContent;
    expect(text).toContain(PHASE_MANAGEMENT_COPY.breadcrumbAdmin);
    expect(text).toContain(PHASE_MANAGEMENT_COPY.breadcrumbPhaseManagement);
  });
});

// @akili-spec changes/admin-reminders-page (ARP-T-1): real page template; children are real (API mocked) or stubs exposing the outputs
import { Component, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmBreadcrumbImports } from '@spartan/breadcrumb';
import { HlmBadge } from '@spartan/badge';
import { HlmButtonImports } from '@spartan/button';
import { HlmDialogImports } from '@spartan/dialog';
import { HlmInputImports } from '@spartan/input';
import { HlmSkeleton } from '@spartan/skeleton';
import { HlmTableImports } from '@spartan/table';
import { HlmTabsImports } from '@spartan/tabs';
import { of, Subject, throwError } from 'rxjs';
import { ResultsApiService } from '../../../../shared/services/api/results-api.service';
import { CenterFocalPointsComponent } from './components/center-focal-points/center-focal-points.component';
import { RemindersPageComponent } from './reminders-page.component';

const root = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
const q = (f: ComponentFixture<unknown>, id: string) => root(f).querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

describe('RemindersPageComponent with real children', () => {
  let fixture: ComponentFixture<RemindersPageComponent>;
  let api: Record<string, jest.Mock>;

  async function setup(focal: unknown = of({ response: [{ code: 'C1', acronym: 'A', name: 'A', route_all_to_center: false, contacts: [] }] })) {
    api = {
      GET_reminderCampaigns: jest.fn().mockReturnValue(
        of({ response: { phase: { id: 36, phase_name: 'Reporting 2026', phase_year: 2026 }, campaigns: [], pending_total: 0, unreachable_total: 0 } })
      ),
      GET_centerFocalPoints: jest.fn().mockReturnValue(focal)
    };
    TestBed.overrideComponent(CenterFocalPointsComponent, {
      set: {
        imports: [HlmButtonImports, HlmBadge, HlmDialogImports, HlmInputImports, HlmSkeleton, HlmTableImports]
      }
    });
    await TestBed.configureTestingModule({
      providers: [
        { provide: ResultsApiService, useValue: api },
        { provide: BrnDialogRef, useValue: new BrnDialogRef() }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(RemindersPageComponent);
    fixture.detectChanges();
    // A synchronous response makes the child emit during the first pass; the next tick renders the pill.
    fixture.detectChanges();
  }

  it('renders breadcrumb, title and description', async () => {
    await setup();
    const crumb = root(fixture).querySelector('nav[hlmBreadcrumb]')?.textContent;
    expect(crumb).toContain('Admin module');
    expect(crumb).toContain('Reminders');
    expect(root(fixture).querySelector('h1')?.textContent).toContain('Reminders');
    expect(root(fixture).querySelector('h1 + p')?.textContent?.length).toBeGreaterThan(10);
  });

  it('selects the reminders tab by default and keeps both panels mounted (P-12 / ARP-NFR-3)', async () => {
    await setup();
    expect(q(fixture, 'arp-tab-reminders')?.getAttribute('aria-selected')).toBe('true');
    expect(q(fixture, 'arp-tab-focal-points')?.getAttribute('aria-selected')).toBe('false');
    expect(q(fixture, 'arp-panel-reminders')?.hasAttribute('hidden')).toBe(false);
    expect(q(fixture, 'arp-panel-focal-points')?.hasAttribute('hidden')).toBe(true);
    expect(q(fixture, 'arp-panel-focal-points')?.querySelector('app-center-focal-points')).not.toBeNull();
  });

  it('opens each endpoint exactly once on page open, and not again on a tab switch (ARP-NFR-3)', async () => {
    await setup();
    expect(api['GET_reminderCampaigns']).toHaveBeenCalledTimes(1);
    expect(api['GET_centerFocalPoints']).toHaveBeenCalledTimes(1);
    q(fixture, 'arp-tab-focal-points')!.click();
    fixture.detectChanges();
    expect(q(fixture, 'arp-panel-focal-points')?.hasAttribute('hidden')).toBe(false);
    expect(q(fixture, 'arp-panel-reminders')?.hasAttribute('hidden')).toBe(true);
    expect(api['GET_reminderCampaigns']).toHaveBeenCalledTimes(1);
    expect(api['GET_centerFocalPoints']).toHaveBeenCalledTimes(1);
  });

  it('shows the count pill from the real focal points before their tab is opened', async () => {
    await setup();
    expect(q(fixture, 'arp-missing-pill')?.textContent?.trim()).toBe('1');
    expect(q(fixture, 'arp-missing-text')?.textContent).toContain('1 Center without a focal point');
  });

  it('shows no pill while the focal points are loading', async () => {
    await setup(new Subject());
    expect(q(fixture, 'arp-missing-pill')).toBeNull();
  });

  it('shows no pill when the focal points failed to load', async () => {
    await setup(throwError(() => ({ error: { message: 'Boom' } })));
    expect(q(fixture, 'arp-missing-pill')).toBeNull();
  });

  it('shows no pill when every Center has a contact', async () => {
    await setup(
      of({ response: [{ code: 'C1', acronym: 'A', name: 'A', route_all_to_center: false, contacts: [{ id: 1, name: null, email: 'a@x.org', is_active: true }] }] })
    );
    expect(q(fixture, 'arp-missing-pill')).toBeNull();
  });
});

@Component({ selector: 'app-replicated-innovation-reminders', template: '' })
class StubRemindersComponent {
  readonly fixFocalPoints = output<void>();
}
@Component({ selector: 'app-center-focal-points', template: '' })
class StubFocalPointsComponent {
  readonly missingCount = output<number>();
}

describe('RemindersPageComponent output wiring (stubbed children)', () => {
  let fixture: ComponentFixture<RemindersPageComponent>;
  const reminders = () => fixture.debugElement.query(By.directive(StubRemindersComponent)).componentInstance as StubRemindersComponent;
  const focal = () => fixture.debugElement.query(By.directive(StubFocalPointsComponent)).componentInstance as StubFocalPointsComponent;

  beforeEach(async () => {
    TestBed.overrideComponent(RemindersPageComponent, {
      set: { imports: [...HlmBreadcrumbImports, ...HlmTabsImports, StubRemindersComponent, StubFocalPointsComponent] }
    });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(RemindersPageComponent);
    fixture.detectChanges();
  });

  it('defaults to the reminders tab', () => {
    expect(q(fixture, 'arp-tab-reminders')?.getAttribute('aria-selected')).toBe('true');
  });

  it('fixFocalPoints from the reminders child selects the focal points tab', () => {
    reminders().fixFocalPoints.emit();
    fixture.detectChanges();
    expect(q(fixture, 'arp-tab-focal-points')?.getAttribute('aria-selected')).toBe('true');
    expect(q(fixture, 'arp-panel-focal-points')?.hasAttribute('hidden')).toBe(false);
  });

  it('missingCount 3 renders pill "3" with accessible text', () => {
    focal().missingCount.emit(3);
    fixture.detectChanges();
    expect(q(fixture, 'arp-missing-pill')?.textContent?.trim()).toBe('3');
    expect(q(fixture, 'arp-missing-text')?.textContent).toContain('3 Centers without a focal point');
  });

  it('missingCount 0 renders no pill', () => {
    focal().missingCount.emit(0);
    fixture.detectChanges();
    expect(q(fixture, 'arp-missing-pill')).toBeNull();
  });

  it('no emission renders no pill', () => {
    expect(q(fixture, 'arp-missing-pill')).toBeNull();
  });

  it('a count that drops to 0 after fixing removes the pill', () => {
    focal().missingCount.emit(2);
    fixture.detectChanges();
    focal().missingCount.emit(0);
    fixture.detectChanges();
    expect(q(fixture, 'arp-missing-pill')).toBeNull();
  });
});

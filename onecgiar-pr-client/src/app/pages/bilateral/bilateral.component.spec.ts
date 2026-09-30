import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';
import { Subject } from 'rxjs';
import { BilateralComponent } from './bilateral.component';
import { BilateralContextService } from './services/bilateral-context.service';
import { BilateralAiService } from './services/bilateral-ai.service';
import { BilateralManualCreateFlowService } from './services/bilateral-manual-create-flow.service';
import { BilateralManualCreateDrawerHostComponent } from './components/bilateral-manual-create-drawer-host/bilateral-manual-create-drawer-host.component';
import { ApiService } from '../../shared/services/api/api.service';
import { RolesService } from '../../shared/services/global/roles.service';
import { CentersService } from '../../shared/services/global/centers.service';

describe('BilateralComponent — center resolution', () => {
  const CENTERS = [
    { acronym: 'CIP', name: 'International Potato Center', code: 'CENTER-05', institutionId: 49 },
    { acronym: 'IRRI', name: 'International Rice Research Institute', code: 'CENTER-12', institutionId: 51 },
  ];

  let paramMap$: Subject<ParamMap>;
  let ctx: BilateralContextService;
  let component: BilateralComponent;
  let resolveCenters: (centers: typeof CENTERS) => void;

  beforeEach(() => {
    paramMap$ = new Subject<ParamMap>();

    TestBed.configureTestingModule({
      providers: [
        BilateralContextService,
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$ } },
        { provide: ApiService, useValue: { dataControlSE: { detailSectionTitle: jest.fn() } } },
        { provide: BilateralAiService, useValue: { loadAllDrafts: jest.fn() } },
        {
          provide: RolesService,
          useValue: {
            // Non-empty so `resolveCenter` skips the role refreshes and goes straight to CLARISA.
            getMyCenters: () => [{ center_acronym: 'OTHER' }],
            updateRolesListFromLocalStorage: jest.fn(),
            updateRolesList: jest.fn(),
          },
        },
        {
          provide: CentersService,
          // Each call hands back a promise the test resolves by hand, so the window between the
          // synchronous acronym write and the async CLARISA resolution can be observed.
          useValue: { getData: () => new Promise(resolve => (resolveCenters = resolve)) },
        },
      ],
    });

    ctx = TestBed.inject(BilateralContextService);
    component = TestBed.runInInjectionContext(() => new BilateralComponent());
    component.ngOnInit();
  });

  afterEach(() => component.ngOnDestroy());

  function navigateTo(acronym: string): void {
    paramMap$.next(convertToParamMap({ acronym }));
  }

  async function settle(): Promise<void> {
    resolveCenters(CENTERS);
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  it('clears the previous center code and institution id until the new center resolves', async () => {
    navigateTo('CIP');
    await settle();
    expect(ctx.centerId()).toBe('CENTER-05');
    expect(ctx.centerInstitutionId()).toBe(49);

    navigateTo('IRRI');

    expect(ctx.centerAcronym()).toBe('IRRI');
    expect(ctx.centerId()).toBeNull();
    expect(ctx.centerInstitutionId()).toBeNull();

    await settle();

    expect(ctx.centerId()).toBe('CENTER-12');
    expect(ctx.centerInstitutionId()).toBe(51);
  });

  it('keeps the resolved code when the same center is emitted again', async () => {
    navigateTo('CIP');
    await settle();

    navigateTo('CIP');

    expect(ctx.centerId()).toBe('CENTER-05');
    expect(ctx.centerInstitutionId()).toBe(49);
  });
});

// `ARM-T-2` (bilateral/ai-queue-report-manually, `ARM-R-3` B / `ARM-DD-1`): the create drawer
// host used to be mounted separately in `bilateral-result-creator` and `bilateral-projects-panel`
// (two mounts on the same `drawerOpen` signal). It now mounts once here, in the shell, next to the
// `router-outlet`, so it stays reachable from every bilateral route. `NO_ERRORS_SCHEMA` lets the
// real `<router-outlet>` render as inert markup (no `RouterTestingModule` plumbing needed) while
// the host itself is imported for real, so the count below reflects the actual DOM.
describe('BilateralComponent — single create-drawer host mount (ARM-T-2)', () => {
  let fixture: ComponentFixture<BilateralComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BilateralComponent],
      imports: [BilateralManualCreateDrawerHostComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        BilateralContextService,
        { provide: ActivatedRoute, useValue: { paramMap: new Subject<ParamMap>() } },
        { provide: ApiService, useValue: { dataControlSE: { detailSectionTitle: jest.fn() } } },
        { provide: BilateralAiService, useValue: { loadAllDrafts: jest.fn() } },
        {
          provide: RolesService,
          useValue: { getMyCenters: () => [], updateRolesListFromLocalStorage: jest.fn(), updateRolesList: jest.fn() },
        },
        { provide: CentersService, useValue: { getData: () => Promise.resolve([]) } },
        // The host's own specs (`bilateral-manual-create-drawer-host.component.spec.ts`) cover its
        // real behavior; here only `drawerOpen` needs to exist for the host template's outer `@if`.
        { provide: BilateralManualCreateFlowService, useValue: { drawerOpen: signal(false) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralComponent);
    fixture.detectChanges();
  });

  afterEach(() => fixture.componentInstance.ngOnDestroy());

  it('ARM-T-2 / ARM-R-3 B: renders exactly one create-drawer host', () => {
    const hosts = fixture.nativeElement.querySelectorAll('app-bilateral-manual-create-drawer-host');
    expect(hosts.length).toBe(1);
  });
});

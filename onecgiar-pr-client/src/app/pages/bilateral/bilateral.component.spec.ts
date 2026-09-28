import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';
import { Subject } from 'rxjs';
import { BilateralComponent } from './bilateral.component';
import { BilateralContextService } from './services/bilateral-context.service';
import { BilateralAiService } from './services/bilateral-ai.service';
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

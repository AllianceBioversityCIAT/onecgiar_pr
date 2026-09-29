import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { BilateralManualCreateDrawerHostComponent } from './bilateral-manual-create-drawer-host.component';
import { BilateralManualCreateFlowService } from '../../services/bilateral-manual-create-flow.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralProject } from '../../services/bilateral-creation.interfaces';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { RolesService } from '../../../../shared/services/global/roles.service';

describe('BilateralManualCreateDrawerHostComponent', () => {
  let fixture: ComponentFixture<BilateralManualCreateDrawerHostComponent>;
  let flow: BilateralManualCreateFlowService;
  let creationService: BilateralCreationService;

  const multiSpProject: BilateralProject = {
    id: 1368,
    shortName: 'B-A1368',
    fullName: 'Next-Generation Crop Breeding Tools and Trait Introgression',
    summary: null,
    description: null,
    leadCenter: { id: 1, name: 'Bioversity International', acronym: 'Bioversity' },
    sciencePrograms: [
      { programId: 2, programCode: 'SP01', spName: 'Breeding for Tomorrow', spShortName: 'Breeding', allocation: '80' },
      { programId: 1, programCode: 'GENE', spName: 'Genebank', spShortName: 'Genebank', allocation: '20' },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BilateralManualCreateDrawerHostComponent],
      // No `BilateralAutoSaveService` provider — deliberately the production DI shape. That
      // service is `@Injectable()` with no `providedIn: 'root'`; its only provider in the whole
      // app is component-local on `bilateral-result-creator.component.ts`. This host is mounted
      // unconditionally from `bilateral-projects-panel` on the bilateral home page, outside that
      // provider's scope (`APF-T-7` rework, Reviewer FAIL issue 1).
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        // `AIQ-T-7`: this host's 'ai' branch mounts the real `BilateralAiUploadComponent`, which
        // injects `ActivatedRoute` (`?job=` deep link) — no test in this file reached that branch
        // before, so nothing had provided it yet.
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralManualCreateDrawerHostComponent);
    flow = TestBed.inject(BilateralManualCreateFlowService);
    creationService = TestBed.inject(BilateralCreationService);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders nothing while the drawer is closed', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="manual-drawer-setup"]')).toBeNull();
  });

  // `AIQ-T-7` Reviewer FAIL issue 1 (P-13, "Never-block change misses a host" — High): this host
  // (`html:97-100`) is the SECOND mount site for `app-bilateral-ai-upload`, reached from the
  // bilateral-home "+ Create result" catalog (`beginFromProject`), not just from the creator wizard.
  // A never-blocking-form regression that only broke this host would pass the creator's own specs.
  it('AIQ-T-7: hosts the real, submittable upload form once the AI way is selected', () => {
    flow.beginFromProject(multiSpProject);
    flow.selectReportingWay('ai');
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector('[data-testid="manual-drawer-ai-upload"]');
    expect(host).toBeTruthy();

    const uploadComponent = host.querySelector('app-bilateral-ai-upload');
    expect(uploadComponent).toBeTruthy();

    // Disqualifier: the real file input, not a CSS class.
    const fileInput: HTMLInputElement | null = uploadComponent.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();
    expect(fileInput!.disabled).toBe(false);
  });

  /**
   * The regression itself: `app-bilateral-sp-selector` (mounted here with `primaryLayout="list"`)
   * hosts the "Contributing Science Programs" disclosure (`APF-DD-11`) as `app-bilateral-accordion`.
   * Before the fix, `app-bilateral-accordion` required `BilateralAutoSaveService` unconditionally —
   * absent here, picking a primary SP that leaves secondary SPs behind threw `NullInjectorError`
   * the moment the accordion instantiated, taking the drawer down mid-flow.
   */
  it('lets a primary SP pick with secondary SPs render the inline contributing section without throwing', () => {
    flow.beginFromProject(multiSpProject);
    fixture.detectChanges();

    expect(flow.drawerOpen()).toBe(true);
    expect(flow.showSpSelectionInDrawer()).toBe(true);

    const primaryOption = fixture.nativeElement.querySelector('.sps-option--list') as HTMLElement | null;
    expect(primaryOption).toBeTruthy();

    expect(() => {
      primaryOption!.click();
      fixture.detectChanges();
    }).not.toThrow();

    expect(creationService.selectedPrimarySp()?.programCode).toBe('SP01');
    // Streamlined UX (fewer clicks): renders inline contributing section without accordion collapse barrier
    expect(fixture.nativeElement.querySelector('[data-testid="sps-contributing-inline"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.bp-accordion-header')).toBeNull();
  });

  it('renders Step 1 and Step 2 headers and the notice banner before SP is selected', () => {
    flow.beginFromProject(multiSpProject);
    fixture.detectChanges();

    const textContent = fixture.nativeElement.textContent;
    expect(textContent).toContain('Select Primary Science Program');
    expect(textContent).toContain('Choose Creation Method');

    const notice = fixture.nativeElement.querySelector('[data-testid="manual-drawer-sp-notice"]');
    expect(notice).toBeTruthy();
    expect(notice.textContent).toContain('Step 1 selection required');

    // Select primary SP
    const primaryOption = fixture.nativeElement.querySelector('.sps-option--list') as HTMLElement;
    primaryOption.click();
    fixture.detectChanges();

    // Notice should be removed once SP is selected
    expect(fixture.nativeElement.querySelector('[data-testid="manual-drawer-sp-notice"]')).toBeNull();
  });

  it('triggers onBlockedWayClick and highlights SP gate when notice or blocked selector is clicked', () => {
    jest.useFakeTimers();
    flow.beginFromProject(multiSpProject);
    fixture.detectChanges();

    expect(fixture.componentInstance.highlightSp()).toBe(false);

    const notice = fixture.nativeElement.querySelector('[data-testid="manual-drawer-sp-notice"]') as HTMLElement;
    notice.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.highlightSp()).toBe(true);

    jest.advanceTimersByTime(1600);
    expect(fixture.componentInstance.highlightSp()).toBe(false);

    jest.useRealTimers();
  });

  // `ASC-T-5` rework (`ASC-R-15`, `ASC-AC-13`): the reviewer-found gap. `[canUseAi]="flow.canUseAi()"`
  // is bound here, on the REAL drawer-host template, reachable from both the bilateral-home
  // "+ Create result" (`beginFromProject`) and the in-wizard drawer (`openDrawerForManual`) — proven
  // through the RENDERED AI card's disabled state, not the signal alone (Conformance issue 2).
  describe('ASC-T-5 — AI option gated by centre membership', () => {
    function pickPrimarySp(): void {
      flow.beginFromProject(multiSpProject);
      fixture.detectChanges();
      const primaryOption = fixture.nativeElement.querySelector('.sps-option--list') as HTMLElement;
      primaryOption.click();
      fixture.detectChanges();
    }

    function aiCard(): HTMLElement {
      // `options[0]` is the AI-Assisted card (`bilateral-reporting-way-selector.component.ts`).
      return fixture.nativeElement.querySelectorAll('.brws-card')[0] as HTMLElement;
    }

    it('renders the AI card enabled for a Center User of this centre', () => {
      TestBed.inject(BilateralContextService).setCenter('Bioversity', 'Bioversity International');
      TestBed.inject(RolesService).roles = {
        center: [{ center_id: 'Bioversity', center_acronym: 'Bioversity', role_id: 9 }]
      };
      pickPrimarySp();

      expect(flow.canUseAi()).toBe(true);
      const card = aiCard();
      expect(card.getAttribute('aria-disabled')).toBe('false');
      expect(card.classList.contains('brws-card--disabled')).toBe(false);
    });

    it('ASC-AC-13 — renders the AI card disabled for an admin who is not a Center User of this centre', () => {
      TestBed.inject(BilateralContextService).setCenter('Bioversity', 'Bioversity International');
      const roles = TestBed.inject(RolesService);
      roles.roles = { center: [] };
      roles.isAdmin = true;
      pickPrimarySp();

      expect(flow.canUseAi()).toBe(false);
      const card = aiCard();
      expect(card.getAttribute('aria-disabled')).toBe('true');
      expect(card.classList.contains('brws-card--disabled')).toBe(true);

      // Clicking the disabled card must not select the AI way (`isOptionDisabled` short-circuits
      // `selectWay`) — the rendered proof that the gate isn't cosmetic only.
      card.click();
      fixture.detectChanges();
      expect(flow.selectedReportingWay()).not.toBe('ai');
    });
  });
});

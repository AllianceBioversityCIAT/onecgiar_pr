import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BilateralManualCreateDrawerHostComponent } from './bilateral-manual-create-drawer-host.component';
import { BilateralManualCreateFlowService } from '../../services/bilateral-manual-create-flow.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralProject } from '../../services/bilateral-creation.interfaces';

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
      providers: [provideHttpClient(), provideHttpClientTesting()],
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
});

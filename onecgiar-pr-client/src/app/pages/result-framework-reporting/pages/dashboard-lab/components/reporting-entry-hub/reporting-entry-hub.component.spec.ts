import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import {
  ReportingEntryHubComponent,
  HubAowRow,
  HubProgramLevelRow,
  HubCenterProjects,
  HubProject,
  HubW3State
} from './reporting-entry-hub.component';

const COLLAPSE_KEY = 'pr.hub.collapsed';

/** Builds N synthetic projects for a center; index 0 carries `codeMarker` so search tests have a
 * deterministic single hit (`REH-AC-4`: `'1368'` matches exactly one project across both centers). */
function buildProjects(count: number, prefix: string, codeMarker?: string): HubProject[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    shortName: i === 0 && codeMarker ? codeMarker : `${prefix}-${1000 + i}`,
    fullName: i === 0 && codeMarker ? 'Seed systems for climate-resilient legumes' : `${prefix} project ${i}`,
    allocation: 40
  }));
}

describe('ReportingEntryHubComponent', () => {
  let fixture: ComponentFixture<ReportingEntryHubComponent>;
  let component: ReportingEntryHubComponent;

  const aowRows: HubAowRow[] = [
    { code: 'AOW01', name: 'Accelerating AI-Enabled Farm Advisory at Scale', done: 1, total: 69 },
    { code: 'AOW02', name: 'Enabling Preparedness and Rapid Response', done: 1, total: 65 },
    { code: 'AOW03', name: 'Delivering Integrated Solutions', done: 1, total: 67 },
    { code: 'AOW04', name: 'Incubating Innovation in Sustainable Farming', done: 1, total: 23 },
    { code: 'AOW05', name: 'Accelerating Impact', done: 0, total: 74 }
  ];

  const programLevelRows: HubProgramLevelRow[] = [
    { kind: 'intermediate', name: 'Intermediate outcomes', done: 1, total: 16 },
    { kind: '2030', name: '2030 outcomes', done: 0, total: 9 }
  ];

  const allianceProjects = buildProjects(44, 'B-A2000', 'B-A1368');
  const africaRiceProjects = buildProjects(17, 'AR-3000');

  const alliance: HubCenterProjects = {
    code: 'C1',
    name: 'Alliance of Bioversity and CIAT',
    acronym: 'Alliance',
    total: 198,
    matching: 44,
    projects: allianceProjects
  };

  const africaRice: HubCenterProjects = {
    code: 'C2',
    name: 'Africa Rice Center',
    acronym: 'AfricaRice',
    total: 52,
    matching: 17,
    projects: africaRiceProjects
  };

  const readyState: HubW3State = {
    status: 'ready',
    data: { programCode: 'SP02', activeYear: 2026, truncated: false, centers: [alliance, africaRice] }
  };

  async function setup(overrides: Partial<Record<string, unknown>> = {}): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ReportingEntryHubComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportingEntryHubComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('programCode', overrides['programCode'] ?? 'SP02');
    fixture.componentRef.setInput('phaseLabel', overrides['phaseLabel'] ?? '2026');
    fixture.componentRef.setInput('isActivePhase', overrides['isActivePhase'] ?? true);
    fixture.componentRef.setInput('activeYear', overrides['activeYear'] ?? 2026);
    fixture.componentRef.setInput('aowRows', overrides['aowRows'] ?? aowRows);
    fixture.componentRef.setInput('w1w2Loading', overrides['w1w2Loading'] ?? false);
    fixture.componentRef.setInput('programLevelRows', overrides['programLevelRows'] ?? programLevelRows);
    fixture.componentRef.setInput('canReportW1W2', overrides['canReportW1W2'] ?? true);
    fixture.componentRef.setInput('w3State', overrides['w3State'] ?? readyState);
    fixture.componentRef.setInput('myCentersCount', overrides['myCentersCount'] ?? 2);
    fixture.detectChanges();
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // (a) two lanes render with the AoW rows + Intermediate/2030 rows and the given done/total.
  it('renders both lanes with the AoW rows and program-level rows', async () => {
    await setup();
    const body = text();
    expect(body).toContain('W1/W2 · Pooled funding');
    expect(body).toContain('W3 · Bilateral projects');
    for (const row of aowRows) {
      expect(body).toContain(row.code);
      expect(body).toContain(row.name);
    }
    expect(body).toContain('Intermediate outcomes');
    expect(body).toContain('2030 outcomes');
    // done/total render contiguous ("1" + "/69") for every row, per the given fixture values.
    for (const row of [...aowRows, ...programLevelRows]) {
      expect(body).toContain(`${row.done}/${row.total}`);
    }
  });

  // (b) canReportW1W2=false → Report buttons aria-disabled with the tooltip text, line present.
  it('disables Report buttons and shows the no-rights line when canReportW1W2 is false', async () => {
    await setup({ canReportW1W2: false });
    const reportButtons = fixture.debugElement
      .queryAll(By.css('button'))
      .filter(el => (el.nativeElement as HTMLElement).textContent?.trim().startsWith('Report'));
    expect(reportButtons.length).toBeGreaterThan(0);
    for (const btn of reportButtons) {
      const el = btn.nativeElement as HTMLElement;
      expect(el.getAttribute('aria-disabled')).toBe('true');
      expect(el.getAttribute('title')).toBe('You do not have reporting rights on this program');
    }
    expect(text()).toContain('Ask your program admin to add you to SP02.');
  });

  it('does not emit reportAow when disabled by canReportW1W2', async () => {
    await setup({ canReportW1W2: false });
    const spy = jest.spyOn(component.reportAow, 'emit');
    component.onReportAow(aowRows[0]);
    expect(spy).not.toHaveBeenCalled();
  });

  // (c) W3 ready with Alliance(44/198)+AfricaRice(17/52): Alliance expanded 3 rows + Show all 44;
  // AfricaRice collapsed header text; totals 61 projects · 2 centers.
  it('expands the first funding center with a 3-row slice and collapses the rest', async () => {
    await setup();
    expect(text()).toContain('61 projects · 2 centers');
    expect(component.isCenterExpanded(alliance)).toBe(true);
    expect(component.isCenterExpanded(africaRice)).toBe(false);
    expect(component.visibleProjectsFor(alliance).length).toBe(3);
    expect(text()).toContain('Show all 44');
    expect(text()).toContain('17 of 52 projects fund SP02');
  });

  // (d) Show all → 44 rows, Show less → 3.
  it('Show all reveals every project; Show less restores the 3-row slice', async () => {
    await setup();
    component.toggleShowAll(alliance);
    fixture.detectChanges();
    expect(component.visibleProjectsFor(alliance).length).toBe(44);
    component.toggleShowAll(alliance);
    fixture.detectChanges();
    expect(component.visibleProjectsFor(alliance).length).toBe(3);
  });

  // (e) search '1368' → only matching rows across centers, counter '1 / 61'; clearing → (c) state again.
  it('filters projects across all centers by search query and restores state when cleared', async () => {
    await setup();
    component.onSearchInput('1368');
    fixture.detectChanges();
    expect(text()).toContain('1 / 61');
    expect(component.visibleProjectsFor(alliance)).toEqual([allianceProjects[0]]);
    expect(component.isCenterExpanded(alliance)).toBe(true);
    expect(component.isCenterExpanded(africaRice)).toBe(false);

    component.onSearchInput('');
    fixture.detectChanges();
    expect(text()).toContain('61 / 61');
    expect(component.visibleProjectsFor(alliance).length).toBe(3);
    expect(component.isCenterExpanded(alliance)).toBe(true);
    expect(component.isCenterExpanded(africaRice)).toBe(false);
  });

  // (f) no-centers → empty state with mailto, lane present.
  it('renders the no-centers empty state with a mailto Request access link', async () => {
    await setup({ w3State: { status: 'no-centers' }, myCentersCount: 0 });
    expect(text()).toContain('W3 results are reported by CGIAR Centers. You are not assigned to a center yet.');
    const link = fixture.debugElement.query(By.css('a[href^="mailto:"]'));
    expect(link).toBeTruthy();
    expect((link.nativeElement as HTMLAnchorElement).href).toContain('PRMSTechSupport@cgiar.org');
    expect(text()).toContain('W3 · Bilateral projects');
  });

  // (g) all centers matching=0 → "None of your centers…" + "0 of M" rows.
  it('renders the none-funding sentence and 0-of-M rows when no center funds the program', async () => {
    const zeroAlliance: HubCenterProjects = { ...alliance, matching: 0, projects: [] };
    const zeroAfricaRice: HubCenterProjects = { ...africaRice, matching: 0, projects: [] };
    await setup({
      w3State: { status: 'ready', data: { programCode: 'SP02', activeYear: 2026, truncated: false, centers: [zeroAlliance, zeroAfricaRice] } }
    });
    expect(text()).toContain('None of your centers has a project allocated to SP02 in 2026.');
    expect(text()).toContain('0 of 198 projects fund SP02');
    expect(text()).toContain('0 of 52 projects fund SP02');
  });

  // (h) error → message + Retry emits retryW3.
  it('renders the error message and emits retryW3 on Retry', async () => {
    await setup({ w3State: { status: 'error' } });
    expect(text()).toContain('Could not load your center projects.');
    const spy = jest.spyOn(component.retryW3, 'emit');
    const retryButton = fixture.debugElement
      .queryAll(By.css('button'))
      .find(el => (el.nativeElement as HTMLElement).textContent?.trim() === 'Retry');
    retryButton!.nativeElement.click();
    expect(spy).toHaveBeenCalled();
  });

  // (h2) a center with error:true renders "Could not load projects for <center>" while others render.
  it('renders a per-center error row while other centers render normally', async () => {
    const erroredAlliance: HubCenterProjects = { ...alliance, error: true, total: 0, matching: 0, projects: [] };
    await setup({
      w3State: { status: 'ready', data: { programCode: 'SP02', activeYear: 2026, truncated: false, centers: [erroredAlliance, africaRice] } }
    });
    expect(text()).toContain('Could not load projects for Alliance of Bioversity and CIAT');
    expect(text()).toContain('17 of 52 projects fund SP02');
  });

  // (i) Collapse → localStorage written.
  it('persists the collapse state to localStorage on toggle', async () => {
    await setup();
    expect(component.collapsed()).toBe(false);
    component.toggleCollapse();
    fixture.detectChanges();
    expect(localStorage.getItem(COLLAPSE_KEY)).toBe('true');
    expect(component.collapsed()).toBe(true);
    expect(text()).toContain('W1/W2 · 5 AoWs · W3 · 61 projects across 2 centers');
  });

  // (i) init with stored true → collapsed summary rendered.
  it('restores the collapsed state from localStorage on init', async () => {
    localStorage.setItem(COLLAPSE_KEY, 'true');
    await setup();
    expect(component.collapsed()).toBe(true);
    expect(text()).toContain('W1/W2 · 5 AoWs · W3 · 61 projects across 2 centers');
  });

  // (j) group button toggles aria-expanded and live region text changes.
  it('toggles aria-expanded on the group button and updates the live region', async () => {
    await setup();
    const groupButtons = fixture.debugElement.queryAll(By.css('section[aria-labelledby="reporting-entry-hub-w3"] button'));
    const africaRiceButton = groupButtons.find(el => (el.nativeElement as HTMLElement).textContent?.includes('Africa Rice Center'));
    expect(africaRiceButton!.nativeElement.getAttribute('aria-expanded')).toBe('false');

    africaRiceButton!.nativeElement.click();
    fixture.detectChanges();
    expect(africaRiceButton!.nativeElement.getAttribute('aria-expanded')).toBe('true');
    expect(component.liveMessage()).toContain('Africa Rice Center expanded');
  });

  // (k) Create result emits {project, center}.
  it('emits createResult with the project and center on click', async () => {
    await setup();
    const spy = jest.spyOn(component.createResult, 'emit');
    component.onCreateResult(allianceProjects[0], alliance);
    expect(spy).toHaveBeenCalledWith({ project: allianceProjects[0], center: alliance });
  });

  it('disables Create result and does not emit when the center has no acronym', async () => {
    const noAcronymCenter: HubCenterProjects = { ...alliance, acronym: undefined };
    await setup({
      w3State: { status: 'ready', data: { programCode: 'SP02', activeYear: 2026, truncated: false, centers: [noAcronymCenter, africaRice] } }
    });
    const spy = jest.spyOn(component.createResult, 'emit');
    component.onCreateResult(allianceProjects[0], noAcronymCenter);
    expect(spy).not.toHaveBeenCalled();
    const createButtons = fixture.debugElement
      .queryAll(By.css('button'))
      .filter(el => (el.nativeElement as HTMLElement).textContent?.trim() === 'Create result');
    expect(createButtons[0].nativeElement.getAttribute('aria-disabled')).toBe('true');
    expect(createButtons[0].nativeElement.getAttribute('title')).toBe('Center acronym missing — open it from My CGIAR Centers');
  });

  // (l) truncated → notice.
  it('shows the truncated notice when the response was capped', async () => {
    await setup({
      w3State: { status: 'ready', data: { programCode: 'SP02', activeYear: 2026, truncated: true, centers: [alliance, africaRice] } }
    });
    expect(text()).toContain('Showing the first 300 projects — refine your search');
  });

  // (m) isActivePhase=false → note.
  it('shows the active-phase note when the selected phase is not the active reporting phase', async () => {
    await setup({ isActivePhase: false, activeYear: 2025 });
    expect(text()).toContain('Bilateral projects are listed for the active reporting phase (2026).');
  });

  it('shows a 3-row loading skeleton while w3State is loading', async () => {
    await setup({ w3State: { status: 'loading' } });
    const skeletonRows = fixture.debugElement.queryAll(By.css('section[aria-labelledby="reporting-entry-hub-w3"] .animate-pulse'));
    expect(skeletonRows.length).toBe(3);
  });

  it('defaults to collapsed for a pure viewer (no reporting rights, no centers) with nothing stored', async () => {
    await setup({ canReportW1W2: false, myCentersCount: 0, w3State: { status: 'no-centers' } });
    expect(component.collapsed()).toBe(true);
  });

  it('emits reportAow / reportProgramLevel with the row code / kind', async () => {
    await setup();
    const aowSpy = jest.spyOn(component.reportAow, 'emit');
    component.onReportAow(aowRows[2]);
    expect(aowSpy).toHaveBeenCalledWith('AOW03');

    const levelSpy = jest.spyOn(component.reportProgramLevel, 'emit');
    component.onReportProgramLevel(programLevelRows[1]);
    expect(levelSpy).toHaveBeenCalledWith('2030');
  });

  it('emits collapsedChange when toggled', async () => {
    await setup();
    const spy = jest.spyOn(component.collapsedChange, 'emit');
    component.toggleCollapse();
    expect(spy).toHaveBeenCalledWith(true);
  });

  it('does not announce expand/collapse from toggleCenterExpanded while a search is active', async () => {
    await setup();
    component.onSearchInput('1368');
    component.liveMessage.set('');
    component.toggleCenterExpanded(alliance);
    expect(component.liveMessage()).toBe('');
  });

  it('does not throw when localStorage access fails', async () => {
    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    await setup();
    expect(() => component.toggleCollapse()).not.toThrow();
    spy.mockRestore();
  });

  describe('W1/W2 lane loading skeleton (REH-R-4.5)', () => {
    it('renders 3 skeleton rows and hides AoW/program-level rows while w1w2Loading is true', async () => {
      await setup({ w1w2Loading: true });
      const lane = (fixture.nativeElement as HTMLElement).querySelector('section[aria-labelledby="hub-w12-title"]') as HTMLElement;
      expect(lane.querySelectorAll('.animate-pulse').length).toBe(3);
      expect(lane.textContent).not.toContain('AOW01');
      expect(lane.querySelectorAll('button').length).toBe(0);
    });

    it('renders the AoW rows and no skeleton when w1w2Loading is false', async () => {
      await setup({ w1w2Loading: false });
      const lane = (fixture.nativeElement as HTMLElement).querySelector('section[aria-labelledby="hub-w12-title"]') as HTMLElement;
      expect(lane.querySelectorAll('.animate-pulse').length).toBe(0);
      expect(lane.textContent).toContain('AOW01');
    });
  });
});

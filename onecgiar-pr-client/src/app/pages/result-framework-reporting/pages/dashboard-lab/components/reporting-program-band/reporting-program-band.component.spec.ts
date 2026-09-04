import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ReportingProgramBandComponent, ReportingSummaryStats } from './reporting-program-band.component';
import { ReportingGuideService } from '../../services/reporting-guide.service';

/**
 * The band renders the whole programme shell chrome, so these tests go through the real template:
 * a markup change that drops the Reporting heading or the compact bar has to fail here.
 *
 * Covers the two behaviours added for GAP-ANALYSIS P14 (toolbar heading) and P4 (compact band).
 */
describe('ReportingProgramBandComponent', () => {
  let fixture: ComponentFixture<ReportingProgramBandComponent>;
  let component: ReportingProgramBandComponent;

  const build = async (inputs: Record<string, unknown> = {}) => {
    await TestBed.configureTestingModule({
      imports: [ReportingProgramBandComponent],
      providers: [provideRouter([])]
    }).compileComponents();
    fixture = TestBed.createComponent(ReportingProgramBandComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('programCode', 'SP01');
    fixture.componentRef.setInput('programName', 'Breeding for Tomorrow');
    fixture.componentRef.setInput('collapsible', true);
    Object.entries(inputs).forEach(([k, v]) => fixture.componentRef.setInput(k, v));
    fixture.detectChanges();
  };

  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent ?? '';
  /** The sticky band is the host's only top-level box; the identity block is its first child. */
  const identity = () => root().firstElementChild?.firstElementChild as HTMLElement;
  /** Everything that only exists while the band is condensed carries the fade class. */
  const collapsedParts = () => root().querySelectorAll('.pr-band-fade');

  /**
   * jsdom never really scrolls, so the offset is stubbed and the event dispatched by hand — which
   * is exactly what the component listens to (`window` + `scroll`).
   */
  const scrollTo = (offset: number) => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: offset });
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
  };

  afterEach(() => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  });

  // ── P14 · Reporting toolbar heading ───────────────────────────────────────
  describe('reporting heading', () => {
    it('does not render the redundant section heading for Reporting', async () => {
      await build({ showToolbar: true, cycleYear: 2026 });

      const heading = root().querySelector('h2');
      expect(heading).toBeNull();
      expect(text()).not.toContain('Report results linked');
    });

    it('follows the cycle instead of hardcoding a year', async () => {
      await build({ showToolbar: true, cycleYear: 2026 });
      fixture.componentRef.setInput('cycleYear', '2027');
      fixture.detectChanges();

      expect(component.reportingHeading()).toContain("program's 2027 ToC");
      expect(text()).not.toContain('2026 ToC');
      expect(text()).not.toContain('2027 ToC');
    });

    it('drops the year rather than leaving a gap when no cycle is loaded', async () => {
      await build({ showToolbar: true, cycleYear: null });

      expect(component.reportingHeading()).toBe("Report results linked to the program's ToC");
    });

    it('is absent on Overview, where there is no toolbar', async () => {
      await build({ showToolbar: false, cycleYear: 2026 });

      expect(root().querySelector('h2')).toBeNull();
      expect(text()).not.toContain('Report results linked');
    });

    it('does not steal the page h1 from the programme name', async () => {
      await build({ showToolbar: true, cycleYear: 2026 });

      const h1s = root().querySelectorAll('h1');
      expect(h1s.length).toBe(1);
      expect(h1s[0].textContent?.trim()).toBe('Breeding for Tomorrow');
    });
  });

  // ── P4 · compact band on scroll ───────────────────────────────────────────
  describe('fixed header (default)', () => {
    it('stays expanded and fixed at all scroll offsets by default', async () => {
      await build({ showToolbar: true, collapsible: false });

      expect(component.bandCollapsed()).toBe(false);
      expect(identity().className).toContain('h-[64px]');

      scrollTo(200);

      expect(component.bandCollapsed()).toBe(false);
      expect(identity().className).toContain('h-[64px]');
      expect(collapsedParts().length).toBe(0);
      expect(component.isScrolled()).toBe(true);
    });
  });

  describe('compact band (collapsible: true)', () => {
    it('starts expanded: identity block at 64px, nothing collapsed rendered', async () => {
      await build({ showToolbar: true, collapsible: true });

      expect(component.bandCollapsed()).toBe(false);
      expect(identity().className).toContain('h-[64px]');
      expect(collapsedParts().length).toBe(0);
    });

    it('stays expanded up to and including the 64px identity block', async () => {
      await build({ showToolbar: true, collapsible: true });

      scrollTo(64);

      expect(component.bandCollapsed()).toBe(false);
      expect(identity().className).toContain('h-[64px]');
    });

    it('condenses once scrolled past the identity block', async () => {
      await build({ showToolbar: true, collapsible: true });

      scrollTo(65);

      expect(component.bandCollapsed()).toBe(true);
      // Height animates to 0, the block is clipped, and `inert` pulls its CTA/ⓘ out of the tab
      // order so keyboard focus can never land on the invisible copy.
      expect(identity().className).toContain('h-0');
      expect(identity().className).toContain('overflow-hidden');
      expect(identity().hasAttribute('inert')).toBe(true);
    });

    it('puts the identity block back in the tab order when it expands', async () => {
      await build({ showToolbar: true, collapsible: true });
      scrollTo(200);

      scrollTo(0);

      expect(identity().hasAttribute('inert')).toBe(false);
    });

    it('keeps the programme name, the tabs and the CTA in the condensed bar', async () => {
      await build({ showToolbar: true, collapsible: true });

      scrollTo(200);

      const nav = root().querySelector('nav') as HTMLElement;
      expect(nav.textContent).toContain('Breeding for Tomorrow');
      expect(nav.textContent).toContain('Overview');
      expect(nav.textContent).toContain('Reporting');
      // One strip serves both shapes, so the third tab has to survive the collapse.
      expect(nav.textContent).toContain('Results');
      expect(nav.textContent).toContain('Where to report');
      // dot + name row and the 32px CTA fade in (Back is gone).
      expect(collapsedParts().length).toBe(2);
    });

    it('condenses on Overview too, where the toolbar is hidden', async () => {
      await build({ showToolbar: false, collapsible: true });

      scrollTo(200);

      expect(component.bandCollapsed()).toBe(true);
      expect((root().querySelector('nav') as HTMLElement).textContent).toContain('Breeding for Tomorrow');
    });

    it('expands again when the page scrolls back to the top', async () => {
      await build({ showToolbar: true, collapsible: true });
      scrollTo(200);

      scrollTo(0);

      expect(component.bandCollapsed()).toBe(false);
      expect(collapsedParts().length).toBe(0);
      expect(identity().className).toContain('h-[64px]');
    });

    it('closes the ⓘ popover when the band changes shape — it is anchored to what collapses', async () => {
      await build({ showToolbar: true, collapsible: true });
      component.toggleInfo(new MouseEvent('click'));
      fixture.detectChanges();
      expect(root().querySelector('#pr-band-info-popover')).toBeTruthy();

      scrollTo(200);

      expect(component.infoOpen()).toBe(false);
      expect(root().querySelector('#pr-band-info-popover')).toBeNull();
    });

    it('ignores scroll events that do not cross the threshold', async () => {
      await build({ showToolbar: true, collapsible: true });
      const spy = jest.spyOn(component.bandCollapsed, 'set');

      scrollTo(10);
      scrollTo(40);
      scrollTo(64);

      expect(spy).not.toHaveBeenCalled();
    });

    it('stops listening once destroyed', async () => {
      await build({ showToolbar: true, collapsible: true });
      fixture.destroy();

      Object.defineProperty(window, 'scrollY', { configurable: true, value: 500 });
      window.dispatchEvent(new Event('scroll'));

      expect(component.bandCollapsed()).toBe(false);
    });
  });

  // ── Emerging-result CTA — a MODAL on the host, not a route ────────────────
  describe('report emerging result', () => {
    /** Both copies of the CTA carry the same label; index 0 is the identity block's. */
    const ctas = () =>
      Array.from(root().querySelectorAll('button')).filter(b => b.textContent?.includes('Where to report'));

    it('emits instead of navigating when the expanded CTA is clicked', async () => {
      await build({ showToolbar: true });
      const emitted = jest.fn();
      const whereEmitted = jest.fn();
      component.reportEmerging.subscribe(emitted);
      component.whereToReport.subscribe(whereEmitted);

      ctas()[0].click();

      expect(emitted).toHaveBeenCalledTimes(1);
      expect(whereEmitted).toHaveBeenCalledTimes(1);
    });

    it('emits from the condensed bar copy too — one behaviour, two renders', async () => {
      await build({ showToolbar: true });
      const emitted = jest.fn();
      const whereEmitted = jest.fn();
      component.reportEmerging.subscribe(emitted);
      component.whereToReport.subscribe(whereEmitted);
      scrollTo(200);

      // Only the condensed copy is left once the identity block collapses away.
      const condensed = ctas().find(b => b.className.includes('pr-band-fade')) as HTMLButtonElement;
      condensed.click();

      expect(emitted).toHaveBeenCalledTimes(1);
      expect(whereEmitted).toHaveBeenCalledTimes(1);
    });

    it('is not a link — the /emerging route is no longer the entry point', async () => {
      await build({ showToolbar: true });

      const links = Array.from(root().querySelectorAll('a')).filter(a => a.textContent?.includes('Report emerging result'));
      expect(links).toHaveLength(0);
      expect(ctas()).toHaveLength(1);
    });

    it('hides both copies when the programme cannot report (AVISA)', async () => {
      await build({ showToolbar: true, canReport: false });
      expect(ctas()).toHaveLength(0);

      scrollTo(200);

      expect(text()).not.toContain('Report emerging result');
      // Only the collapsed identity (dot + name) fades in — the action group is gone with canReport false.
      expect(collapsedParts().length).toBe(1);
    });
  });

  // ── OSF-T-2c · collapsed action group must not overflow its own box ──────
  // jsdom performs no layout, so this can only assert structure — the browser measurement at
  // OSF-NFR-Responsive's five widths is the real gate (see design.md OSF-DD-15).
  describe('collapsed action group overflow guard (OSF-T-2c)', () => {
    const collapsedCta = () =>
      Array.from(root().querySelectorAll('button')).find(
        b => b.className.includes('pr-band-fade') && b.textContent?.includes('Where to report')
      ) as HTMLButtonElement;

    it("does not pin the CTA at its intrinsic width — the label truncates instead of forcing overflow", async () => {
      await build({ showToolbar: true });
      scrollTo(200);

      const cta = collapsedCta();
      expect(cta.className).not.toContain('shrink-0');
      expect(cta.className).toContain('min-w-0');

      const label = cta.querySelector('span:not(.pointer-events-none):not(.material-icons-round)') as HTMLElement;
      expect(label.textContent?.trim()).toBe('Where to report');
      expect(label.className).toContain('truncate');
      expect(label.className).toContain('min-w-0');
    });

    it('keeps the CTA icon fixed-size so it never gets clipped by the truncating label', async () => {
      await build({ showToolbar: true });
      scrollTo(200);

      const icon = collapsedCta().querySelector('.material-icons-round') as HTMLElement;
      expect(icon.className).toContain('shrink-0');
    });

    it('keeps the tooltip overlay intact and unclipped by the band (not the cause of the overflow)', async () => {
      await build({ showToolbar: true });
      scrollTo(200);

      const tooltip = collapsedCta().querySelector('.pointer-events-none') as HTMLElement;
      expect(tooltip).toBeTruthy();
      expect(tooltip.className).toContain('w-[220px]');
      expect(tooltip.textContent).toContain('Find the right reporting pathway');
    });
  });

  // ── OSF-T-10 · the action group itself must not carry an automatic min-width ──────────────
  // jsdom performs no layout, so this can only assert structure — the real gate is the page-level
  // scrollWidth === clientWidth browser measurement at 768px with the band collapsed (execution.md).
  // Without `min-w-0` on this ancestor, a flex item nested in another flex container keeps a
  // min-content width equal to the sum of its children (back button + CTA) regardless of `ml-auto`,
  // which is what let the group overflow the page by 47px at 768px despite the CTA's own
  // `min-w-0`/`truncate` chain (OSF-T-2c) already being correctly composed.
  describe('collapsed action group must allow its own box to shrink (OSF-T-10)', () => {
    const collapsedGroup = () =>
      root().querySelector('[data-testid="program-band-collapsed-actions"]') as HTMLElement;
    const collapsedCta = () =>
      Array.from(root().querySelectorAll('button')).find(
        b => b.className.includes('pr-band-fade') && b.textContent?.includes('Where to report')
      ) as HTMLButtonElement;

    it('carries min-w-0 on the ml-auto action group so the CTA truncation chain can take effect', async () => {
      await build({ showToolbar: true });
      scrollTo(200);

      const group = collapsedGroup();
      expect(group.className).toContain('ml-auto');
      expect(group.className).toContain('min-w-0');
    });

    it('does not regress the CTA shrink/truncate chain that OSF-T-2c composed', async () => {
      await build({ showToolbar: true });
      scrollTo(200);

      expect(collapsedCta().className).toContain('min-w-0');
      expect(collapsedCta().className).not.toContain('shrink-0');
    });
  });

  // OSF-T-15 (collapsed Back truncation) is gone with the Back control.

  // ── P2-3252 · global Expand all / Collapse all ────────────────────────────
  describe('expand all / collapse all', () => {
    const control = () =>
      Array.from(root().querySelectorAll('button')).find(b => /Expand all|Collapse all/.test(b.textContent ?? '')) as
        | HTMLButtonElement
        | undefined;

    it('offers Expand all while the list is collapsed', async () => {
      await build({ showToolbar: true });

      expect(control()?.textContent?.trim()).toBe('Expand all');
    });

    it('flips to Collapse all once everything is open', async () => {
      await build({ showToolbar: true, allExpanded: true });

      expect(control()?.textContent?.trim()).toBe('Collapse all');
      expect(text()).not.toContain('Expand all');
      // The changing label is the whole state — `aria-pressed` on top of it announces
      // "Collapse all, pressed", i.e. two contradictory facts to a screen reader.
      expect(control()?.hasAttribute('aria-pressed')).toBe(false);
    });

    it('announces the intent instead of holding the state itself', async () => {
      await build({ showToolbar: true });
      const emitted = jest.fn();
      component.toggleExpandAll.subscribe(emitted);

      control()?.click();

      expect(emitted).toHaveBeenCalledTimes(1);
      // The band is stateless — the label only moves when the host says so.
      expect(control()?.textContent?.trim()).toBe('Expand all');
    });

    it('is absent in All indicators, a flat list with nothing to open', async () => {
      await build({ showToolbar: true, viewMode: 'flat' });

      expect(control()).toBeUndefined();
    });

    it('is absent on Overview, where there is no toolbar at all', async () => {
      await build({ showToolbar: false });

      expect(control()).toBeUndefined();
    });

    // The band renders OUTSIDE the host's browse-view switch, so `?tocView=byAow` / `?tocView=indicators`
    // put it above surfaces that keep their own inline disclosure state and ignore this control.
    it('is absent when the surface below cannot answer the switch', async () => {
      await build({ showToolbar: true, canExpandAll: false });

      expect(control()).toBeUndefined();
      // The grouping switch is unaffected — it is the browse surface that changed, not the mode.
      expect(text()).toContain('All indicators');
    });
  });

  // ── Tab strip — Overview · Reporting · Results (design `tabResults`) ───────
  describe('tab strip', () => {
    /** Only the tabs are anchors inside the nav; the CTA is a button. */
    const tabs = () => Array.from((root().querySelector('nav') as HTMLElement).querySelectorAll('a'));
    const tabText = (a: HTMLAnchorElement) => a.querySelector('.pr-tab-label')?.textContent?.trim() || a.textContent?.trim();
    const tab = (label: string) => tabs().find(a => tabText(a) === label) as HTMLAnchorElement;

    it('renders the three programme tabs in the order the design shows', async () => {
      await build({ showToolbar: true });

      expect(tabs().map(tabText)).toEqual(['Overview', 'Reporting', 'Results']);
    });

    it('points Results at the `/results` route under the programme', async () => {
      await build({ showToolbar: true });

      expect(component.resultsPath()).toBe('/result-framework-reporting/entity-details/SP01/results');
      expect(tab('Results').getAttribute('href')).toBe('/result-framework-reporting/entity-details/SP01/results');
    });

    it('follows the programme code instead of freezing the href', async () => {
      await build({ showToolbar: true });
      fixture.componentRef.setInput('programCode', 'SP07');
      fixture.detectChanges();

      expect(tab('Results').getAttribute('href')).toBe('/result-framework-reporting/entity-details/SP07/results');
    });

    it('underlines and announces Results when it is the active tab', async () => {
      await build({ showToolbar: true, activeTab: 'results' });

      const results = tab('Results');
      expect(results.className).toContain('border-[var(--pr-color-primary-300)]');
      expect(results.className).toContain('font-semibold');
      expect(results.getAttribute('aria-current')).toBe('page');
    });

    it('leaves Results neutral while another tab is active', async () => {
      await build({ showToolbar: true, activeTab: 'reporting' });

      const results = tab('Results');
      expect(results.className).toContain('border-transparent');
      expect(results.className).not.toContain('border-[var(--pr-color-primary-300)]');
      expect(results.getAttribute('aria-current')).toBeNull();
    });

    it('moves the active treatment with `activeTab` — exactly one tab is current', async () => {
      await build({ showToolbar: true, activeTab: 'overview' });
      expect(tab('Overview').getAttribute('aria-current')).toBe('page');
      expect(tab('Results').getAttribute('aria-current')).toBeNull();

      fixture.componentRef.setInput('activeTab', 'results');
      fixture.detectChanges();

      expect(tab('Results').getAttribute('aria-current')).toBe('page');
      expect(tab('Overview').getAttribute('aria-current')).toBeNull();
      expect(tab('Reporting').getAttribute('aria-current')).toBeNull();
      expect(tabs().filter(a => a.getAttribute('aria-current') === 'page')).toHaveLength(1);
    });

    it('keeps the three tabs in the condensed bar — one strip serves both shapes', async () => {
      await build({ showToolbar: true, activeTab: 'results' });

      scrollTo(200);

      expect(tabs().map(tabText)).toEqual(['Overview', 'Reporting', 'Results']);
      expect(tab('Results').getAttribute('aria-current')).toBe('page');
    });

    // The design's fourth tab (`tabDrafts`, PRMS-Reporting.dc.html:420 / :443) is wrapped in an
    // `sc-if` on `centerMode`: it is a CENTER-view tab. Its absence here is the spec, not a gap.
    it('does not render the Center-only Drafts tab', async () => {
      await build({ showToolbar: true });

      expect(tabs().map(a => a.textContent?.trim())).not.toContain('Drafts');
      expect(text()).not.toContain('Drafts');
    });
  });

  // ── P3 · eyebrow metric ───────────────────────────────────────────────────
  describe('eyebrow', () => {
    it('renders the code in the mono family via the Tailwind utility, not the unlayered .pr-code', async () => {
      await build({ cycleYear: 2026, cyclePhase: 'P25' });

      const code = Array.from(root().querySelectorAll('span')).find(s => s.textContent?.trim() === 'SP01') as HTMLElement;
      expect(code).toBeTruthy();
      expect(code.className).toContain('font-mono');
      // `.pr-code` is unlayered SCSS (12px/500) and would beat the layered utilities beside it.
      expect(code.className).not.toContain('pr-code');
      expect(code.className).toContain('text-[11px]');
      expect(code.className).toContain('font-semibold');
      expect(code.className).toContain('tracking-[0.08em]');
    });

    /**
     * `changes/overview-phase-filter` OPF-T-4 (Leader remediation): the Overview host wires
     * `phaseLabelOverride` to its own `effectiveVersionId()`-derived phase label so the eyebrow
     * follows an explicit phase selection instead of the global `reportingCurrentPhase`
     * (`cycleYear`/`cyclePhase`).
     */
    it('replaces the cycleYear/cyclePhase-derived tail with phaseLabelOverride when provided', async () => {
      await build({ cycleYear: 2026, cyclePhase: 'P25', phaseLabelOverride: 'Reporting 2025 · 2025' });

      expect(component.eyebrowCycle()).toBe('· Reporting 2025 · 2025');
      expect(text()).toContain('Reporting 2025 · 2025');
      expect(text()).not.toContain('Reporting cycle 2026');
    });

    /** Absent input (default `''`) keeps the original cycleYear/cyclePhase tail byte-identical. */
    it('falls back to the cycleYear/cyclePhase-derived tail when phaseLabelOverride is absent', async () => {
      await build({ cycleYear: 2026, cyclePhase: 'P25' });

      expect(component.eyebrowCycle()).toBe('· Reporting cycle 2026 · P25');
    });
  });

  describe('clearAllFilters', () => {
    it('shows the button only while filters are active and emits on click', async () => {
      await build({ showToolbar: true, activeTab: 'reporting', filtersActive: false });
      const find = () =>
        Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(b =>
          (b.textContent ?? '').includes('Clear filters')
        );
      expect(find()).toBeUndefined();
      fixture.componentRef.setInput('filtersActive', true);
      fixture.detectChanges();
      const emitted: boolean[] = [];
      component.clearAllFilters.subscribe(() => emitted.push(true));
      const btn = find();
      expect(btn).toBeDefined();
      btn!.click();
      expect(emitted.length).toBe(1);
    });
  });

  describe('compactFilters (By-AOW mode)', () => {
    it('provides By-AoW popover filters (Center, Result Type, Status) and hides grouped-mode Category, Section multiselect, and Grouping toggle', async () => {
      await build({
        showToolbar: true,
        activeTab: 'reporting',
        compactFilters: true,
        centerOptions: [{ value: 'CIAT', label: 'CIAT (5)' }]
      });
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[aria-label="Filter by center"]')).not.toBeNull();
      expect(el.querySelector('[aria-label="Filter by result type"]')).not.toBeNull();
      expect(el.querySelector('[aria-label="Filter by status"]')).not.toBeNull();
      expect(el.querySelector('[aria-label="Filter by category"]')).toBeNull();
      expect(el.querySelector('[aria-label="Grouping"]')).toBeNull();
      expect(el.querySelector('app-pr-filter-multiselect')).toBeNull();
      expect(el.querySelector('[aria-label="Switch Area of Work"] app-pr-filter-select')).not.toBeNull();
    });

    it('displays active filter chips for Center and Result Type in By-AoW mode', async () => {
      await build({
        showToolbar: true,
        activeTab: 'reporting',
        compactFilters: true,
        centerOptions: [{ value: 'CIAT', label: 'CIAT (5)' }],
        centerValue: 'CIAT',
        byAowTypeOptions: [{ value: 'KP', label: 'Knowledge product (3)' }],
        byAowTypeValue: 'KP'
      });
      const textContent = fixture.nativeElement.textContent;
      expect(textContent).toContain('Center:');
      expect(textContent).toContain('CIAT');
      expect(textContent).toContain('Type:');
      expect(textContent).toContain('Knowledge product');
      expect(component.activeFilterCount()).toBe(2);
    });

    it('emits centerChange and byAowTypeChange when removing active chips', async () => {
      await build({
        showToolbar: true,
        activeTab: 'reporting',
        compactFilters: true,
        centerOptions: [{ value: 'CIAT', label: 'CIAT (5)' }],
        centerValue: 'CIAT',
        byAowTypeOptions: [{ value: 'KP', label: 'Knowledge product (3)' }],
        byAowTypeValue: 'KP'
      });
      const centerEmitted: (string | null)[] = [];
      const typeEmitted: (string | null)[] = [];
      component.centerChange.subscribe(v => centerEmitted.push(v));
      component.byAowTypeChange.subscribe(v => typeEmitted.push(v));

      component.removeCenterChip();
      component.removeByAowTypeChip();

      expect(centerEmitted).toEqual([null]);
      expect(typeEmitted).toEqual([null]);
    });
  });

  // ── MRF-T-2 · band controls (Only pending + Sort) ─────────────────────────
  describe('band controls (Only pending + Sort)', () => {
    const onlyPendingBtn = () =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
        b => b.textContent?.trim() === 'Only pending'
      ) as HTMLButtonElement;
    const sortTab = (label: string) =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[aria-label="Sort"] button')).find(
        b => b.textContent?.trim() === label
      ) as HTMLButtonElement;

    it('renders Only pending unchecked and Catalogue selected by default', async () => {
      await build({ showToolbar: true, activeTab: 'reporting' });

      expect(onlyPendingBtn().getAttribute('aria-checked')).toBe('false');
      expect(sortTab('Catalogue').getAttribute('aria-selected')).toBe('true');
      expect(sortTab('Remaining work').getAttribute('aria-selected')).toBe('false');
    });

    it('emits onlyPendingChange with the flipped value on click', async () => {
      await build({ showToolbar: true, activeTab: 'reporting', onlyPending: false });
      const emitted: boolean[] = [];
      component.onlyPendingChange.subscribe(v => emitted.push(v));

      onlyPendingBtn().click();

      expect(emitted).toEqual([true]);
    });

    it('reflects onlyPending=true as checked', async () => {
      await build({ showToolbar: true, activeTab: 'reporting', onlyPending: true });

      expect(onlyPendingBtn().getAttribute('aria-checked')).toBe('true');
    });

    it('emits burndownSortChange with the clicked segment', async () => {
      await build({ showToolbar: true, activeTab: 'reporting' });
      const emitted: string[] = [];
      component.burndownSortChange.subscribe(v => emitted.push(v));

      sortTab('Remaining work').click();

      expect(emitted).toEqual(['remaining']);
    });

    it('marks Remaining work selected when burndownSort is remaining', async () => {
      await build({ showToolbar: true, activeTab: 'reporting', burndownSort: 'remaining' });

      expect(sortTab('Remaining work').getAttribute('aria-selected')).toBe('true');
      expect(sortTab('Catalogue').getAttribute('aria-selected')).toBe('false');
    });

    it('stays visible in By-AOW mode (compactFilters), unlike Type/Category/Status', async () => {
      await build({ showToolbar: true, activeTab: 'reporting', compactFilters: true });

      expect(onlyPendingBtn()).toBeTruthy();
      expect(sortTab('Catalogue')).toBeTruthy();
      expect(sortTab('Remaining work')).toBeTruthy();
    });

    it('is absent on Overview, where there is no toolbar at all', async () => {
      await build({ showToolbar: false });

      expect(onlyPendingBtn()).toBeUndefined();
      expect((fixture.nativeElement as HTMLElement).querySelector('[aria-label="Sort"]')).toBeNull();
    });
  });

  describe('program-band back button removed', () => {
    it('does not render Back in expanded or collapsed views', async () => {
      await build({ showToolbar: true, programCode: 'SP02' });

      expect(root().querySelector('[data-testid="program-band-back-btn"]')).toBeNull();
      expect(root().querySelector('[data-testid="program-band-back-btn-collapsed"]')).toBeNull();
      expect(text()).not.toContain('Back to Science programs');

      scrollTo(200);

      expect(root().querySelector('[data-testid="program-band-back-btn"]')).toBeNull();
      expect(root().querySelector('[data-testid="program-band-back-btn-collapsed"]')).toBeNull();
      expect(text()).not.toContain('Back to');
    });
  });

  describe('summary stats card', () => {
    it('renders summary stats card above reporting heading when summaryStats is provided', async () => {
      await build({
        showToolbar: true,
        summaryStats: {
          programsCount: 1,
          aowsCount: 5,
          totalKpis: 41,
          reportedKpis: 0
        }
      });

      const text = root().textContent || '';
      expect(text).toContain('Programs/Accelerators');
      expect(text).toContain('Areas of Work');
      expect(text).toContain('Total KPIs');
      expect(text).toContain('KPIs with Evidence');
    });
  });

  // ── KCR-T-3 · Total KPIs disclosure (KCR-R-2.1 / KCR-DD-4, KCR-AC-2) ──────
  /**
   * The big figure is *Counted*; the two numbers it cannot show — how many KPIs were PLANNED and
   * how many the zero-target rule removed from the denominator — live in its `title`. The full
   * string is asserted on purpose: requirements.md §9 records that "a `title` present with wrong
   * text is caught only if the test asserts the text".
   * @akili-spec bugfix/kpi-count-reconciliation
   */
  describe('Total KPIs zero-target disclosure (KCR-R-2.1)', () => {
    /** The KPI card carrying `label`, resolved upwards from its uppercase label span. */
    const kpiCard = (label: string): HTMLElement => {
      const heading = Array.from(root().querySelectorAll('span')).find(s => s.textContent?.trim() === label);
      return heading!.closest('div.flex.flex-col') as HTMLElement;
    };
    const totalKpisFigure = (): HTMLElement => kpiCard('Total KPIs').querySelector('.pr-figure') as HTMLElement;
    const totalKpisTitle = (): string | null => totalKpisFigure().getAttribute('title');

    /** The requirements.md §7 fixture: planned 11, zero-target 2 (`a4`, `#902`), counted 9. */
    const stats = (over: Partial<ReportingSummaryStats> = {}): ReportingSummaryStats => ({
      programsCount: 1,
      aowsCount: 2,
      totalKpis: 9,
      reportedKpis: 1,
      plannedKpis: 11,
      zeroTargetKpis: 2,
      ...over
    });

    it('states planned and the plural exclusion: "11 planned · excludes 2 zero-target KPIs"', async () => {
      await build({ showToolbar: true, summaryStats: stats() });

      expect(totalKpisFigure().textContent?.trim()).toBe('9');
      expect(totalKpisTitle()).toBe('11 planned · excludes 2 zero-target KPIs');
    });

    it('drops the excludes clause entirely when nothing was excluded: "11 planned"', async () => {
      // The same fixture with the two zero-target KPIs given `target = 1`: planned stays 11, the
      // denominator becomes 11 and there is nothing left to disclose.
      await build({ showToolbar: true, summaryStats: stats({ totalKpis: 11, zeroTargetKpis: 0 }) });

      expect(totalKpisTitle()).toBe('11 planned');
      expect(totalKpisTitle()).not.toContain('excludes');
    });

    it('uses the singular noun for exactly one: "11 planned · excludes 1 zero-target KPI"', async () => {
      await build({ showToolbar: true, summaryStats: stats({ totalKpis: 10, zeroTargetKpis: 1 }) });

      expect(totalKpisTitle()).toBe('11 planned · excludes 1 zero-target KPI');
    });

    it('omits the attribute for a caller that carries no planned figure (optional-field contract)', async () => {
      await build({
        showToolbar: true,
        summaryStats: { programsCount: 1, aowsCount: 5, totalKpis: 41, reportedKpis: 0 }
      });

      expect(totalKpisTitle()).toBeNull();
    });
  });

  describe('program description popover (resolvedDescription)', () => {
    it('resolves SP04 description for Multifunctional Landscapes', async () => {
      await build({ programCode: 'SP04', programName: 'Multifunctional Landscapes' });
      expect(component.resolvedDescription()).toContain('Multifunctional Landscapes advances systemic, landscape-scale solutions');
      expect(component.resolvedDescription()).not.toContain('Breeding for Tomorrow');
    });

    it('resolves SP01 description for Breeding for Tomorrow', async () => {
      await build({ programCode: 'SP01', programName: 'Breeding for Tomorrow' });
      expect(component.resolvedDescription()).toContain('Breeding for Tomorrow modernizes CGIAR');
    });

    it('prioritizes explicit programDescription input if provided', async () => {
      await build({ programCode: 'SP04', programDescription: 'Custom explicit program description.' });
      expect(component.resolvedDescription()).toBe('Custom explicit program description.');
    });

    it('falls back to contextual description for unknown program codes', async () => {
      await build({ programCode: 'SP99', programName: 'Special Pioneer Initiative' });
      expect(component.resolvedDescription()).toContain('Special Pioneer Initiative is a CGIAR research program delivering science');
    });
  });

  describe('All Areas of Work button (compactFilters mode)', () => {
    it('renders All Areas of Work button when compactFilters is true and emits allAowsClick when clicked', async () => {
      await build({ showToolbar: true, compactFilters: true });
      const spy = jest.fn();
      component.allAowsClick.subscribe(spy);

      const btn = Array.from(root().querySelectorAll('button')).find(b => b.textContent?.includes('All Areas of Work'));
      expect(btn).toBeTruthy();

      btn?.click();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('does not render All Areas of Work button when compactFilters is false', async () => {
      await build({ showToolbar: true, compactFilters: false });
      const btn = Array.from(root().querySelectorAll('button')).find(b => b.textContent?.includes('All Areas of Work'));
      expect(btn).toBeUndefined();
    });
  });

  // ── SP Guided Tour (SPTOUR-R-1, SPTOUR-T-2) ──────────────────────────────
  describe('SP guided tour launcher', () => {
    it('renders the tour button in the header actions block', async () => {
      await build();

      const tourBtn = root().querySelector('[data-guide="sp-tour-trigger"]') as HTMLButtonElement;
      expect(tourBtn).toBeTruthy();
      expect(tourBtn.textContent).toContain('Tour');
    });

    it('renders the tour button in the condensed bar when scrolled', async () => {
      await build();
      scrollTo(100);

      const condensedActions = root().querySelector('[data-testid="program-band-collapsed-actions"]');
      expect(condensedActions).toBeTruthy();

      const tourBtn = Array.from(condensedActions!.querySelectorAll('button')).find(b => b.textContent?.includes('Tour'));
      expect(tourBtn).toBeTruthy();
    });

    it('invokes startSpTour on the guide service with correct parameters when tour button is clicked', async () => {
      await build({ cycleYear: 2026 });

      const guideSE = TestBed.inject(ReportingGuideService);
      const startSpy = jest.spyOn(guideSE, 'startSpTour').mockImplementation();
      const router = TestBed.inject(Router);
      const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

      const tourBtn = root().querySelector('[data-guide="sp-tour-trigger"]') as HTMLButtonElement;
      tourBtn.click();

      expect(startSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          programName: 'Breeding for Tomorrow',
          cycleYear: 2026,
          onTabNavigate: expect.any(Function)
        })
      );

      // Verify onTabNavigate handler
      const opts = startSpy.mock.calls[0][0];
      opts.onTabNavigate('overview');
      expect(navSpy).toHaveBeenCalledWith(['/result-framework-reporting/entity-details/SP01/overview'], { queryParamsHandling: 'preserve' });

      opts.onTabNavigate('results');
      expect(navSpy).toHaveBeenCalledWith(['/result-framework-reporting/entity-details/SP01/results'], { queryParamsHandling: 'preserve' });

      opts.onTabNavigate('reporting');
      expect(navSpy).toHaveBeenCalledWith(['/result-framework-reporting/entity-details/SP01'], { queryParamsHandling: 'preserve' });
    });
  });
});

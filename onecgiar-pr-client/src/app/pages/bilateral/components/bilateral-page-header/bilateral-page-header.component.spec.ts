import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterModule } from '@angular/router';
import { By } from '@angular/platform-browser';
import { environment } from '../../../../../environments/environment';
import { BilateralPageHeaderComponent } from './bilateral-page-header.component';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { normalizeJob } from '../../bilateral-ai-job.model';
import { rawJob } from '../../bilateral-ai-job.fixtures';
import { CustomizedAlertsFeService } from '../../../../shared/services/customized-alerts-fe.service';

describe('BilateralPageHeaderComponent', () => {
  let component: BilateralPageHeaderComponent;
  let fixture: ComponentFixture<BilateralPageHeaderComponent>;
  let ctx: BilateralContextService;
  let aiService: BilateralAiService;

  const BULK_UPLOADER_URL_UNDER_TEST = 'https://bulk-uploader.test.cgiar.org/';
  let configuredBulkUploaderUrl: unknown;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BilateralPageHeaderComponent, RouterModule.forRoot([])],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralPageHeaderComponent);
    component = fixture.componentInstance;
    ctx = TestBed.inject(BilateralContextService);
    aiService = TestBed.inject(BilateralAiService);

    // `src/environments/*.ts` is gitignored and supplied per environment by CI, so the CTA's URL
    // key is absent from most checkouts and from the build agents — reading it here made these
    // specs assert against whichever config happened to be on disk. Stub it: what is under test is
    // the component's behaviour when a URL *is* configured, not the config itself. The negative
    // case (key absent) is pinned by its own test below.
    configuredBulkUploaderUrl = (environment as Record<string, unknown>)['bulkUploaderUrl'];
    (environment as Record<string, unknown>)['bulkUploaderUrl'] = BULK_UPLOADER_URL_UNDER_TEST;
  });

  afterEach(() => {
    if (configuredBulkUploaderUrl === undefined) {
      delete (environment as Record<string, unknown>)['bulkUploaderUrl'];
    } else {
      (environment as Record<string, unknown>)['bulkUploaderUrl'] = configuredBulkUploaderUrl;
    }
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders nothing until the center acronym resolves', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')).toBeNull();
  });

  it('shows the center acronym and name once resolved with compact typography', () => {
    ctx.setCenter('SMO', 'CGIAR System Organization');
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1?.textContent.trim()).toBe('SMO');
    expect(h1?.classList.contains('text-[18px]')).toBe(true);
    expect(h1?.classList.contains('font-bold')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('CGIAR System Organization');
  });

  it('hides the tab bar and CTA when activeTab is not set (e.g. the create-result wizard)', () => {
    ctx.setCenter('SMO', 'CGIAR System Organization');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Bulk Results Uploader');
  });

  it('shows the tab bar, icons, and marks the active tab when activeTab is set', () => {
    ctx.setCenter('SMO', 'CGIAR System Organization');
    fixture.componentRef.setInput('activeTab', 'results');
    fixture.detectChanges();

    const links = fixture.debugElement.queryAll(By.css('nav a'));
    expect(links.map(l => l.nativeElement.textContent.replace(/\s+/g, ' ').trim())).toEqual([
      'space_dashboard Overview',
      'track_changes Reporting',
      'table_chart Results',
      'fact_check AI Draft Results',
    ]);

    // Verify icons on all four tabs
    const icons = fixture.debugElement.queryAll(By.css('nav a .material-icons-round'));
    expect(icons.map(i => i.nativeElement.textContent.trim())).toEqual([
      'space_dashboard',
      'track_changes',
      'table_chart',
      'fact_check',
    ]);

    // Active tab assertions
    const active = links.find(l => l.nativeElement.getAttribute('aria-current') === 'page');
    expect(active?.nativeElement.textContent.trim()).toContain('Results');
    expect(fixture.nativeElement.textContent).toContain('Bulk Results Uploader');

    // Horizontal scroll and styling
    const nav = fixture.debugElement.query(By.css('nav[aria-label="Center sections"]'));
    expect(nav.nativeElement.classList.contains('overflow-x-auto')).toBe(true);
    expect(nav.nativeElement.classList.contains('no-scrollbar')).toBe(true);
  });

  it('shows the info button on tabbed pages and opens tab-specific explainer copy', () => {
    ctx.setCenter('AfricaRice', 'Africa Rice Center');
    fixture.componentRef.setInput('activeTab', 'reporting');
    fixture.detectChanges();

    const infoButton = fixture.nativeElement.querySelector('[data-testid="bilateral-header-info-button"]') as HTMLButtonElement;
    expect(infoButton).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="bilateral-header-info-popover"]')).toBeNull();

    infoButton.click();
    fixture.detectChanges();

    const popover = fixture.nativeElement.querySelector('[data-testid="bilateral-header-info-popover"]') as HTMLElement;
    expect(popover).toBeTruthy();
    expect(popover.textContent).toContain('Reporting');
    expect(popover.textContent).toContain('Browse bilateral projects mapped to Science Programs');
    expect(popover.textContent).toContain('Africa Rice Center');
  });

  it('updates the info popover when the active tab changes', () => {
    ctx.setCenter('AfricaRice', 'Africa Rice Center');
    fixture.componentRef.setInput('activeTab', 'overview');
    fixture.detectChanges();

    const infoButton = fixture.nativeElement.querySelector('[data-testid="bilateral-header-info-button"]') as HTMLButtonElement;
    infoButton.click();
    fixture.detectChanges();

    let popover = fixture.nativeElement.querySelector('[data-testid="bilateral-header-info-popover"]') as HTMLElement;
    expect(popover.textContent).toContain('Overview');
    expect(popover.textContent).toContain('dashboard of your center');

    component.closeInfo();
    fixture.componentRef.setInput('activeTab', 'drafts');
    fixture.detectChanges();

    infoButton.click();
    fixture.detectChanges();

    popover = fixture.nativeElement.querySelector('[data-testid="bilateral-header-info-popover"]') as HTMLElement;
    expect(popover.textContent).toContain('AI Draft Results');
    expect(popover.textContent).toContain('AI-generated draft results');
  });

  it('hides the info button when activeTab is not set', () => {
    ctx.setCenter('SMO', 'CGIAR System Organization');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="bilateral-header-info-button"]')).toBeNull();
  });

  it('does not display a dividing line between hero and tabs when activeTab is set', () => {
    ctx.setCenter('SMO', 'CGIAR System Organization');
    fixture.componentRef.setInput('activeTab', 'reporting');
    fixture.detectChanges();

    const heroDiv = fixture.nativeElement.querySelector('.h-\\[64px\\]');
    expect(heroDiv).toBeTruthy();
    expect(heroDiv.classList.contains('border-b-band')).toBe(false);
  });

  it('displays a bottom dividing border on the hero when activeTab is NOT set', () => {
    ctx.setCenter('SMO', 'CGIAR System Organization');
    fixture.componentRef.setInput('pageTitle', 'Create Result');
    fixture.detectChanges();

    const heroDiv = fixture.nativeElement.querySelector('.h-\\[64px\\]');
    expect(heroDiv).toBeTruthy();
    expect(heroDiv.classList.contains('border-b-band')).toBe(true);
  });

  it('activates the Reporting tab when activeTab is "reporting"', () => {
    ctx.setCenter('SMO', 'CGIAR System Organization');
    fixture.componentRef.setInput('activeTab', 'reporting');
    fixture.detectChanges();

    const active = fixture.debugElement.queryAll(By.css('nav a[aria-current="page"]'));
    expect(active.length).toBe(1);
    expect(active[0].nativeElement.textContent.trim()).toContain('Reporting');
    expect(component.isOverviewActive()).toBe(false);
  });

  /**
   * `'overview'` used to be a legacy alias of Reporting. Now that Overview is its own tab the
   * alias is retired (`COV-DD-4`): the literal activates Overview and nothing else.
   */
  it('activates only the Overview tab when activeTab is "overview"', () => {
    ctx.setCenter('SMO', 'CGIAR System Organization');
    fixture.componentRef.setInput('activeTab', 'overview');
    fixture.detectChanges();

    const active = fixture.debugElement.queryAll(By.css('nav a[aria-current="page"]'));
    expect(active.length).toBe(1);
    expect(active[0].nativeElement.textContent.trim()).toContain('Overview');
    expect(active[0].nativeElement.getAttribute('href')).toBe('/bilateral/SMO/overview');
    expect(component.isReportingActive()).toBe(false);
  });

  it('renders the four center tabs with Overview first', () => {
    ctx.setCenter('SMO', 'CGIAR System Organization');
    fixture.componentRef.setInput('activeTab', 'overview');
    fixture.detectChanges();

    const labels = fixture.debugElement
      .queryAll(By.css('nav[aria-label="Center sections"] a'))
      .map(a => a.nativeElement.textContent.replace(/\s+/g, ' ').trim());
    expect(labels.length).toBe(4);
    expect(labels[0]).toContain('Overview');
    expect(labels[1]).toContain('Reporting');
    expect(labels[2]).toContain('Results');
    expect(labels[3]).toContain('AI Draft Results');
  });

  describe('shared phase on the tab links (COV-R-5 A)', () => {
    const tabHrefs = () =>
      fixture.debugElement
        .queryAll(By.css('nav[aria-label="Center sections"] a'))
        .map(a => a.nativeElement.getAttribute('href'));

    it('leaves the tab links bare while no phase is selected', () => {
      ctx.setCenter('SMO', 'CGIAR System Organization');
      ctx.selectedVersionId.set(null);
      fixture.componentRef.setInput('activeTab', 'overview');
      fixture.detectChanges();

      expect(component.tabQueryParams()).toBeNull();
      expect(tabHrefs()).toEqual([
        '/bilateral/SMO/overview',
        '/bilateral/SMO/home',
        '/bilateral/SMO/results',
        '/bilateral/SMO/drafts',
      ]);
    });

    it('carries ?phase= on all four tab links once a phase is selected', () => {
      ctx.setCenter('SMO', 'CGIAR System Organization');
      ctx.selectedVersionId.set(35);
      fixture.componentRef.setInput('activeTab', 'overview');
      fixture.detectChanges();

      expect(component.tabQueryParams()).toEqual({ phase: 35 });
      expect(tabHrefs()).toEqual([
        '/bilateral/SMO/overview?phase=35',
        '/bilateral/SMO/home?phase=35',
        '/bilateral/SMO/results?phase=35',
        '/bilateral/SMO/drafts?phase=35',
      ]);
    });
  });

  describe('draft count badge', () => {
    it('renders badge when draft count > 0', () => {
      aiService.draftList.set([
        { id: 1, result_title: 'Draft 1' } as any,
        { id: 2, result_title: 'Draft 2' } as any,
      ]);
      ctx.setCenter('SMO', 'CGIAR System Organization');
      fixture.componentRef.setInput('activeTab', 'reporting');
      fixture.detectChanges();

      const badge = fixture.debugElement.query(By.css('[data-testid="bilateral-drafts-badge"]'));
      expect(badge).not.toBeNull();
      expect(badge.nativeElement.textContent.trim()).toBe('2');
    });

    it('does not render badge when draft count is 0', () => {
      aiService.draftList.set([]);
      ctx.setCenter('SMO', 'CGIAR System Organization');
      fixture.componentRef.setInput('activeTab', 'reporting');
      fixture.detectChanges();

      const badge = fixture.debugElement.query(By.css('[data-testid="bilateral-drafts-badge"]'));
      expect(badge).toBeNull();
    });
  });

  describe('back button visibility (BSA-R-2, BSA-AC-2)', () => {
    it('does NOT render back button in default tabbed variant', () => {
      ctx.setCenter('SMO', 'CGIAR System Organization');
      fixture.componentRef.setInput('activeTab', 'reporting');
      fixture.detectChanges();

      const backBtn = fixture.debugElement.query(By.css('[data-testid="bilateral-header-back-btn"]'));
      expect(backBtn).toBeNull();
    });

    it('renders back button in band mode with pageTitle when activeTab is null and handles goBack()', () => {
      ctx.setCenter('SMO', 'CGIAR System Organization');
      fixture.componentRef.setInput('pageTitle', 'Report New Bilateral Result');
      fixture.detectChanges();

      const backBtn = fixture.debugElement.query(By.css('[data-testid="bilateral-header-back-btn"]'));
      expect(backBtn).not.toBeNull();
      expect(backBtn.nativeElement.textContent).toContain('Back');

      const spy = jest.spyOn(component, 'goBack');
      backBtn.nativeElement.click();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('respects backLabelOverride in band mode with pageTitle', () => {
      ctx.setCenter('SMO', 'CGIAR System Organization');
      fixture.componentRef.setInput('pageTitle', 'Report New Bilateral Result');
      fixture.componentRef.setInput('backLabelOverride', 'Back to Results list');
      fixture.detectChanges();

      const backBtn = fixture.debugElement.query(By.css('[data-testid="bilateral-header-back-btn"]'));
      expect(backBtn).not.toBeNull();
      expect(backBtn.nativeElement.textContent).toContain('Back to Results list');
    });

    it('does NOT render back button in detail variant as navigation is anchored in rail (BRRA-R-3, Gate D4)', () => {
      ctx.setCenter('ABC', 'Alliance of Bioversity International and CIAT');
      fixture.componentRef.setInput('variant', 'detail');
      fixture.componentRef.setInput('pageTitle', 'A bilateral result');
      fixture.detectChanges();

      const backBtn = fixture.debugElement.query(By.css('[data-testid="bilateral-header-back-btn"]'));
      expect(backBtn).toBeNull();
    });
  });

  describe('result identity strip (P2-3352)', () => {
    const withTitle = () => {
      ctx.setCenter('ABC', 'Alliance of Bioversity International and CIAT');
      fixture.componentRef.setInput('pageTitle', 'A bilateral result');
      fixture.detectChanges();
    };

    it('renders nothing when no identity is provided', () => {
      withTitle();
      expect(component.hasIdentityStrip()).toBe(false);
      expect(fixture.nativeElement.textContent).not.toContain('W3/Bilateral');
    });

    it('renders the code, the type and the funding tag', () => {
      fixture.componentRef.setInput('resultCode', 8682);
      fixture.componentRef.setInput('resultTypeName', 'Policy Change');
      fixture.componentRef.setInput('isW3Bilateral', true);
      withTitle();
      expect(component.hasIdentityStrip()).toBe(true);
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('8682');
      expect(text).toContain('Policy Change');
      expect(text).toContain('W3/Bilateral');
    });

    it('shows the strip when only one piece is known', () => {
      fixture.componentRef.setInput('resultCode', 1234);
      withTitle();
      expect(component.hasIdentityStrip()).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('1234');
      expect(fixture.nativeElement.textContent).not.toContain('W3/Bilateral');
    });

    it.each([
      [1, 'Editing'],
      [5, 'Pending review'],
      [6, 'Approved'],
      [7, 'Rejected'],
    ])('renders the %i status as the "%s" badge', (statusId, label) => {
      fixture.componentRef.setInput('statusId', statusId);
      withTitle();
      const badge = fixture.debugElement.query(By.css('[data-testid="bilateral-status-badge"]'));
      expect(badge.nativeElement.textContent.trim()).toBe(label);
    });

    it('renders no badge for a status outside the four the story lists, and none for null', () => {
      fixture.componentRef.setInput('statusId', 3);
      withTitle();
      expect(fixture.debugElement.query(By.css('[data-testid="bilateral-status-badge"]'))).toBeNull();

      fixture.componentRef.setInput('statusId', null);
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('[data-testid="bilateral-status-badge"]'))).toBeNull();
    });

    it('shows the strip when the status is the only thing known', () => {
      fixture.componentRef.setInput('statusId', 6);
      withTitle();
      expect(component.hasIdentityStrip()).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('Approved');
    });

    it('does not render the strip on the tabbed variant, which has no result', () => {
      ctx.setCenter('ABC', 'Alliance of Bioversity International and CIAT');
      fixture.componentRef.setInput('activeTab', 'results');
      fixture.componentRef.setInput('resultCode', 8682);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('8682');
    });
  });

  describe('page-title variant (P2-3100 AC1)', () => {
    beforeEach(() => {
      ctx.setCenter('ABC', 'Alliance of Bioversity International and CIAT');
      fixture.componentRef.setInput('pageTitle', 'Report New Bilateral Result');
      fixture.detectChanges();
    });

    it('renders the page title as the heading instead of the acronym', () => {
      expect(fixture.nativeElement.querySelector('h1')?.textContent.trim()).toBe(
        'Report New Bilateral Result',
      );
    });

    it('renders the breadcrumb as CGIAR Center > [Full Center Name] (INITIALS)', () => {
      const crumb = fixture.debugElement.query(By.css('nav[aria-label="Breadcrumb"]'));
      expect(crumb).toBeTruthy();

      const segments = crumb.nativeElement.querySelectorAll('li');
      expect(
        Array.from(segments)
          .map((li: any) => li.textContent.trim())
          .join(' '),
      ).toBe('CGIAR Center > Alliance of Bioversity International and CIAT (ABC)');
    });

    it('marks the center as the current breadcrumb node and hides the separator from assistive tech', () => {
      const crumb = fixture.debugElement.query(By.css('nav[aria-label="Breadcrumb"]'));
      expect(
        crumb.nativeElement.querySelector('[aria-current="page"]')?.textContent.trim(),
      ).toBe('Alliance of Bioversity International and CIAT (ABC)');
      expect(crumb.nativeElement.querySelector('[aria-hidden="true"]')?.textContent.trim()).toBe(
        '>',
      );
    });

    it('drops the stacked centre block that the tabbed pages show', () => {
      expect(fixture.nativeElement.textContent).not.toContain('CGIAR Center\n');
      const headings = fixture.nativeElement.querySelectorAll('h1');
      expect(headings.length).toBe(1);
    });

    it('falls back to the acronym alone when the center name has not resolved', () => {
      ctx.setCenter('ABC', '');
      fixture.detectChanges();
      expect(component.centerBreadcrumbLabel()).toBe('ABC');
    });
  });

  it('leaves the tabbed pages on the stacked centre block when no page title is given', () => {
    ctx.setCenter('SMO', 'CGIAR System Organization');
    fixture.componentRef.setInput('activeTab', 'reporting');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('nav[aria-label="Breadcrumb"]'))).toBeNull();
    expect(fixture.nativeElement.querySelector('h1')?.textContent.trim()).toBe('SMO');
    expect(fixture.nativeElement.textContent).toContain('CGIAR System Organization');
  });

  /**
   * @akili-spec bilateral/bulk-uploader-handoff (BIL-HO-T-7)
   *
   * The CTA is a <button> that mints a one-time handoff code, then navigates a tab it opened
   * *before* the mint (R-12 "order of operations"). jsdom cannot observe a real popup blocker, so
   * (a) is a call-order proxy — the real blocker behaviour is the T-9 manual/browser check.
   */
  describe('Bulk Results Uploader CTA — mint-then-navigate (BIL-HO-T-7)', () => {
    const HANDOFF_URL = `${environment.apiBaseUrl}api/bilateral/center/handoff`;

    let httpMock: HttpTestingController;
    let alertService: CustomizedAlertsFeService;
    let openSpy: jest.SpyInstance;
    let tabStub: { location: { href: string }; close: jest.Mock; opener: unknown };

    beforeEach(() => {
      httpMock = TestBed.inject(HttpTestingController);
      alertService = TestBed.inject(CustomizedAlertsFeService);
      tabStub = { location: { href: '' }, close: jest.fn(), opener: {} };

      ctx.setCenter('SMO', 'CGIAR System Organization', 'SMO-CODE');
      fixture.componentRef.setInput('activeTab', 'overview');
      fixture.detectChanges();
    });

    afterEach(() => {
      // `DataControlService` (upstream, center-overview-tab) issues an eager GET /api/versioning on
      // construction; drain it so `verify()` only judges the handoff traffic this block is about.
      httpMock.match(req => req.url.includes('api/versioning')).forEach(req => req.flush({ response: [] }));
      httpMock.verify();
      openSpy?.mockRestore();
    });

    function clickCta(): void {
      const cta = fixture.debugElement.query(By.css('[data-testid="bilateral-bulk-uploader-cta"]'));
      cta.nativeElement.click();
    }

    it('(a) opens the tab before the HTTP request to `start` is issued', () => {
      const httpClient = TestBed.inject(HttpClient) as unknown as { post: HttpClient['post'] };
      const postSpy = jest.spyOn(httpClient, 'post');
      openSpy = jest.spyOn(window, 'open').mockReturnValue(tabStub as unknown as Window);

      clickCta();

      expect(openSpy).toHaveBeenCalledTimes(1);
      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(openSpy.mock.invocationCallOrder[0]).toBeLessThan(postSpy.mock.invocationCallOrder[0]);

      httpMock
        .expectOne(HANDOFF_URL)
        .flush({ response: { code: 'c', expires_in: 120, redirect_url: 'https://partner.test/entry/?code=c' } });
    });

    it('(b) opens with no destination URL and severs the opener link before minting', () => {
      openSpy = jest.spyOn(window, 'open').mockReturnValue(tabStub as unknown as Window);

      clickCta();

      // No URL/features string is ever passed to `open` — `rel="noopener"` on an <a> would make
      // `open` return null by spec, so the handle is obtained plain and the opener link severed
      // by hand (see the docstring on `openBulkUploader`).
      expect(openSpy).toHaveBeenCalledWith('', '_blank');
      expect(tabStub.opener).toBeNull();

      httpMock
        .expectOne(HANDOFF_URL)
        .flush({ response: { code: 'c', expires_in: 120, redirect_url: 'https://partner.test/entry/?code=c' } });
    });

    it('(c) navigates the already-open tab to `redirect_url` on success', () => {
      openSpy = jest.spyOn(window, 'open').mockReturnValue(tabStub as unknown as Window);

      clickCta();
      expect(component.isMinting()).toBe(true);

      httpMock
        .expectOne(HANDOFF_URL)
        .flush({ response: { code: 'c', expires_in: 120, redirect_url: 'https://partner.test/entry/?code=abc' } });

      expect(tabStub.location.href).toBe('https://partner.test/entry/?code=abc');
      expect(tabStub.close).not.toHaveBeenCalled();
      expect(component.isMinting()).toBe(false);
    });

    it('(d) on a 403 closes the tab, shows the error alert, re-enables the CTA, and never navigates', () => {
      openSpy = jest.spyOn(window, 'open').mockReturnValue(tabStub as unknown as Window);
      // `.show()` touches the real DOM (`<app-root>`, absent in this component's test host) —
      // stub it the way it's actually intended to be exercised: recorded, not executed.
      const showSpy = jest.spyOn(alertService, 'show').mockImplementation(() => undefined);

      clickCta();
      httpMock
        .expectOne(HANDOFF_URL)
        .flush({ statusCode: 403, message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

      expect(tabStub.close).toHaveBeenCalledTimes(1);
      expect(showSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
      expect(component.isMinting()).toBe(false);
      expect(tabStub.location.href).toBe('');
    });

    it('(e) when the popup is blocked, shows the error alert and issues no HTTP request', () => {
      openSpy = jest.spyOn(window, 'open').mockReturnValue(null);
      const showSpy = jest.spyOn(alertService, 'show').mockImplementation(() => undefined);

      clickCta();

      httpMock.expectNone(HANDOFF_URL);
      expect(showSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
      expect(component.isMinting()).toBe(false);
    });
  });

  it('leaves the tabs pointing at the current center', () => {
    ctx.setCenter('SMO', 'CGIAR System Organization');
    fixture.componentRef.setInput('activeTab', 'reporting');
    fixture.detectChanges();

    const draftsTab = fixture.debugElement.queryAll(By.css('nav a')).find(l =>
      l.nativeElement.textContent.includes('AI Draft Results'),
    );
    expect(draftsTab?.nativeElement.getAttribute('href')).toBe('/bilateral/SMO/drafts');
  });

  /**
   * How PROD behaves until the bulk platform has a destination there: the key is simply absent
   * from that environment's config and the CTA does not render. No feature flag, no dead link.
   */
  it('hides the CTA when no bulk uploader URL is configured', () => {
    const configured = (environment as Record<string, unknown>)['bulkUploaderUrl'];
    (environment as Record<string, unknown>)['bulkUploaderUrl'] = '';
    try {
      ctx.setCenter('SMO', 'CGIAR System Organization');
      fixture.componentRef.setInput('activeTab', 'reporting');
      fixture.detectChanges();

      expect(component.showBulkCta()).toBe(false);
      expect(fixture.debugElement.query(By.css('[data-testid="bilateral-bulk-uploader-cta"]'))).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Bulk Results Uploader');
    } finally {
      (environment as Record<string, unknown>)['bulkUploaderUrl'] = configured;
    }
  });

  /**
   * The CTA replaced "Report emerging result" in the same slot, so `/create` is no longer
   * reachable from this header on any tab. Pinned because it is a deliberate product decision,
   * not an oversight: the Reporting tab's per-project "Create result" buttons own that entry now.
   */
  it('no longer offers the Report emerging result CTA', () => {
    ctx.setCenter('SMO', 'CGIAR System Organization');
    fixture.componentRef.setInput('activeTab', 'reporting');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Report emerging result');
    expect(fixture.debugElement.query(By.css('a[href="/bilateral/SMO/create"]'))).toBeNull();
  });

  describe('detail variant (result editor)', () => {
    const q = (selector: string) => fixture.nativeElement.querySelector(selector);

    beforeEach(() => {
      ctx.setCenter('ABC', 'Alliance of Bioversity International and CIAT');
      fixture.componentRef.setInput('variant', 'detail');
      fixture.componentRef.setInput('pageTitle', 'Test JD');
      fixture.componentRef.setInput('resultCode', 8976);
      fixture.componentRef.setInput('resultTypeName', 'Innovation use');
      fixture.componentRef.setInput('isW3Bilateral', true);
      fixture.componentRef.setInput('statusId', 1);
      fixture.detectChanges();
    });

    it('renders the title with no in-flow back button and no breadcrumb band (BRRA-R-3, Gate D4)', () => {
      expect(q('[data-testid="bilateral-detail-header"]')).not.toBeNull();
      expect(q('h1')?.textContent.trim()).toBe('Test JD');
      expect(q('nav[aria-label="Breadcrumb"]')).toBeNull();
      expect(q('.bg-\\[var\\(--pr-surface-band\\)\\]')).toBeNull();
      expect(q('[data-testid="bilateral-header-back-btn"]')).toBeNull();
    });

    it('renders streamlined identity strip without duplicate code, type, or status (BRRA-R-4, Gate D4)', () => {
      const text = fixture.nativeElement.textContent;
      expect(text).not.toContain('8976');
      expect(text).not.toContain('Innovation use');
      expect(q('[data-testid="bilateral-status-badge"]')).toBeNull();
      expect(text).toContain('W3/Bilateral');
    });

    it('renders secondary contextual metadata in detail identity strip (BRRA-R-4)', () => {
      fixture.componentRef.setInput('resultLevelName', 'Output');
      fixture.componentRef.setInput('centerName', 'AfricaRice');
      fixture.componentRef.setInput('areaOfWork', 'Rice Breeding');
      fixture.detectChanges();

      const strip = q('[data-testid="bilateral-detail-identity-strip"]');
      expect(strip).not.toBeNull();
      expect(strip.textContent).toContain('Output');
      expect(strip.textContent).toContain('W3/Bilateral');
      expect(strip.textContent).toContain('AfricaRice');
      expect(strip.textContent).toContain('Rice Breeding');
    });

    it('keeps the band for every other page', () => {
      fixture.componentRef.setInput('variant', 'band');
      fixture.detectChanges();
      expect(q('[data-testid="bilateral-detail-header"]')).toBeNull();
      expect(q('nav[aria-label="Breadcrumb"]')).not.toBeNull();
    });

    // `APF-R-12` / `APF-DD-10` — the "Result detail (read-only)" provenance surface: a static
    // badge in the secondary metadata strip.
    describe('AI provenance badge (APF-R-12)', () => {
      it('is absent by default', () => {
        expect(q('[data-testid="ai-provenance-badge"]')).toBeNull();
      });

      it('renders in detail identity strip when the caller asks for it', () => {
        fixture.componentRef.setInput('showAiProvenanceBadge', true);
        fixture.detectChanges();
        const badge = q('[data-testid="ai-provenance-badge"]');
        expect(badge).not.toBeNull();
        expect(badge.getAttribute('aria-label')).toBe(
          'Generated with AI assistance from your sources. Review and edit before submitting.',
        );
        const pills = fixture.nativeElement.querySelectorAll('.rounded-full');
        expect(pills.length).toBe(1);
      });

      it('shows the identity strip for the badge alone, even with no status/code/type known', () => {
        fixture.componentRef.setInput('statusId', null);
        fixture.componentRef.setInput('resultCode', null);
        fixture.componentRef.setInput('showAiProvenanceBadge', true);
        fixture.detectChanges();
        expect(component.hasIdentityStrip()).toBe(true);
        expect(q('[data-testid="ai-provenance-badge"]')).not.toBeNull();
      });
    });
  });

  describe('Reporting Cycle Eyebrow', () => {
    it('defaults to "CGIAR Center" when reporting current phase has no year or acronym', () => {
      ctx.setCenter('AfricaRice', 'Africa Rice Center');
      fixture.componentRef.setInput('activeTab', 'reporting');
      fixture.detectChanges();

      const eyebrowEl = fixture.nativeElement.querySelector('[data-testid="bilateral-eyebrow"]');
      expect(eyebrowEl).toBeTruthy();
      expect(eyebrowEl.textContent.trim()).toBe('CGIAR Center');
    });

    it('renders "CGIAR Center · Reporting cycle 2026 · P25" when reportingCurrentPhase is populated', () => {
      ctx.setCenter('AfricaRice', 'Africa Rice Center');
      fixture.componentRef.setInput('activeTab', 'reporting');

      component.dataControlSE.reportingCurrentPhase.phaseYear = 2026;
      component.dataControlSE.reportingCurrentPhase.portfolioAcronym = 'P25';
      component.dataControlSE.reportingPhaseVersion.update(v => v + 1);
      fixture.detectChanges();

      const eyebrowEl = fixture.nativeElement.querySelector('[data-testid="bilateral-eyebrow"]');
      expect(eyebrowEl).toBeTruthy();
      expect(eyebrowEl.textContent.trim()).toBe('CGIAR Center · Reporting cycle 2026 · P25');
    });

    it('reactively updates eyebrow on phase load', () => {
      ctx.setCenter('CIAT', 'International Center for Tropical Agriculture');
      fixture.componentRef.setInput('activeTab', 'drafts');
      fixture.detectChanges();

      let eyebrowEl = fixture.nativeElement.querySelector('[data-testid="bilateral-eyebrow"]');
      expect(eyebrowEl.textContent.trim()).toBe('CGIAR Center');

      component.dataControlSE.reportingCurrentPhase.phaseYear = 2027;
      component.dataControlSE.reportingCurrentPhase.portfolioAcronym = 'P26';
      component.dataControlSE.reportingPhaseVersion.update(v => v + 1);
      fixture.detectChanges();

      eyebrowEl = fixture.nativeElement.querySelector('[data-testid="bilateral-eyebrow"]');
      expect(eyebrowEl.textContent.trim()).toBe('CGIAR Center · Reporting cycle 2027 · P26');
    });
  });

  describe('"AI job running" chip (APF-R-10)', () => {
    const chip = () => fixture.debugElement.query(By.css('[data-testid="bilateral-ai-job-chip"]'));

    it('renders with the elapsed time in the accessible name when the service reports an alive job for the current center', () => {
      ctx.setCenter('AfricaRice', 'Africa Rice Center');
      fixture.componentRef.setInput('activeTab', 'reporting');
      aiService.uploadState.set({ jobId: 'job-1', status: 'processing', uploadProgress: 100 });
      (aiService as unknown as { activeJob: unknown }).activeJob = {
        jobId: 'job-1',
        centerAcronym: 'AfricaRice',
        startedAt: Date.now() - (4 * 60_000 + 12_000),
      };
      fixture.detectChanges();

      const el = chip();
      expect(el).not.toBeNull();
      expect(el.nativeElement.textContent).toContain('AI job running');
      expect(el.nativeElement.textContent).toContain('04:12');
      expect(el.nativeElement.getAttribute('aria-label')).toContain('4 minutes');
      expect(el.nativeElement.getAttribute('aria-label')).toContain('12 seconds');
    });

    it('is absent when the tracked job belongs to a different center (CIMMYT)', () => {
      ctx.setCenter('CIMMYT', 'International Maize and Wheat Improvement Center');
      fixture.componentRef.setInput('activeTab', 'reporting');
      aiService.uploadState.set({ jobId: 'job-1', status: 'processing', uploadProgress: 100 });
      (aiService as unknown as { activeJob: unknown }).activeJob = {
        jobId: 'job-1',
        centerAcronym: 'AfricaRice',
        startedAt: Date.now(),
      };
      fixture.detectChanges();

      expect(chip()).toBeNull();
    });

    it('is absent once the job reaches a terminal state', () => {
      ctx.setCenter('AfricaRice', 'Africa Rice Center');
      fixture.componentRef.setInput('activeTab', 'reporting');
      aiService.uploadState.set({ jobId: 'job-1', status: 'completed', uploadProgress: 100 });
      (aiService as unknown as { activeJob: unknown }).activeJob = {
        jobId: 'job-1',
        centerAcronym: 'AfricaRice',
        startedAt: Date.now(),
      };
      fixture.detectChanges();

      expect(chip()).toBeNull();
    });

    it('is absent while idle (no tracked job)', () => {
      ctx.setCenter('AfricaRice', 'Africa Rice Center');
      fixture.componentRef.setInput('activeTab', 'reporting');
      fixture.detectChanges();

      expect(chip()).toBeNull();
    });

    it('links to the upload step with the job id as a query param', () => {
      ctx.setCenter('AfricaRice', 'Africa Rice Center');
      fixture.componentRef.setInput('activeTab', 'reporting');
      aiService.uploadState.set({ jobId: 'job-9', status: 'pending', uploadProgress: 100 });
      (aiService as unknown as { activeJob: unknown }).activeJob = {
        jobId: 'job-9',
        centerAcronym: 'AfricaRice',
        startedAt: Date.now(),
      };
      fixture.detectChanges();

      expect(chip().nativeElement.getAttribute('href')).toBe('/bilateral/AfricaRice/create?job=job-9');
    });

    it('uses the elapsed value from the queue-entry clock once a poll has landed, not the resume record', () => {
      ctx.setCenter('AfricaRice', 'Africa Rice Center');
      fixture.componentRef.setInput('activeTab', 'reporting');
      aiService.uploadState.set({ jobId: 'job-1', status: 'still_running', uploadProgress: 100 });
      // The resume record's startedAt is stale (would read as ~10 min) — the freshly-polled job's
      // queueEntryDate (~90 s ago) must win.
      (aiService as unknown as { activeJob: unknown }).activeJob = {
        jobId: 'job-1',
        centerAcronym: 'AfricaRice',
        startedAt: Date.now() - 600_000,
      };
      aiService.currentJob.set(
        normalizeJob(rawJob({ job_id: 'job-1', created_date: new Date(Date.now() - 90_500).toISOString(), retried_date: null })),
      );
      fixture.detectChanges();

      expect(chip().nativeElement.textContent).toContain('01:30');
    });

    describe('tick gating (rework addendum, Reviewer-advisory)', () => {
      afterEach(() => {
        jest.useRealTimers();
      });

      it('does not schedule the 1 s tick while there is no alive job for this center', () => {
        jest.useFakeTimers();
        const setIntervalSpy = jest.spyOn(globalThis, 'setInterval');

        ctx.setCenter('AfricaRice', 'Africa Rice Center');
        fixture.componentRef.setInput('activeTab', 'reporting');
        fixture.detectChanges();

        setIntervalSpy.mockClear();
        jest.advanceTimersByTime(5000);

        expect(setIntervalSpy).not.toHaveBeenCalled();
        expect(chip()).toBeNull();
      });

      it('advances the chip elapsed label once a second while the job stays alive for this center', () => {
        jest.useFakeTimers();

        ctx.setCenter('AfricaRice', 'Africa Rice Center');
        fixture.componentRef.setInput('activeTab', 'reporting');
        aiService.uploadState.set({ jobId: 'job-1', status: 'processing', uploadProgress: 100 });
        (aiService as unknown as { activeJob: unknown }).activeJob = {
          jobId: 'job-1',
          centerAcronym: 'AfricaRice',
          startedAt: Date.now(),
        };
        fixture.detectChanges();

        expect(chip().nativeElement.textContent).toContain('00:00');

        jest.advanceTimersByTime(1000);
        fixture.detectChanges();

        expect(chip().nativeElement.textContent).toContain('00:01');
      });
    });
  });
});

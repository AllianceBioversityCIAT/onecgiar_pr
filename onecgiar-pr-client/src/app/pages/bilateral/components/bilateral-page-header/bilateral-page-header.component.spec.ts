import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterModule } from '@angular/router';
import { By } from '@angular/platform-browser';
import { BilateralPageHeaderComponent } from './bilateral-page-header.component';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BilateralAiService } from '../../services/bilateral-ai.service';

describe('BilateralPageHeaderComponent', () => {
  let component: BilateralPageHeaderComponent;
  let fixture: ComponentFixture<BilateralPageHeaderComponent>;
  let ctx: BilateralContextService;
  let aiService: BilateralAiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BilateralPageHeaderComponent, RouterModule.forRoot([])],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralPageHeaderComponent);
    component = fixture.componentInstance;
    ctx = TestBed.inject(BilateralContextService);
    aiService = TestBed.inject(BilateralAiService);
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
    expect(fixture.nativeElement.textContent).not.toContain('Report emerging result');
  });

  it('shows the tab bar, icons, and marks the active tab when activeTab is set', () => {
    ctx.setCenter('SMO', 'CGIAR System Organization');
    fixture.componentRef.setInput('activeTab', 'results');
    fixture.detectChanges();

    const links = fixture.debugElement.queryAll(By.css('nav a'));
    expect(links.map(l => l.nativeElement.textContent.trim().split('\n')[0].trim())).toEqual([
      'track_changes\n          Reporting',
      'table_chart\n          Results',
      'fact_check\n          Draft Results',
    ].map(s => s.replace(/\s+/g, ' ')));

    // Verify icons on all three tabs
    const icons = fixture.debugElement.queryAll(By.css('nav a .material-icons-round'));
    expect(icons.map(i => i.nativeElement.textContent.trim())).toEqual([
      'track_changes',
      'table_chart',
      'fact_check',
    ]);

    // Active tab assertions
    const active = links.find(l => l.nativeElement.getAttribute('aria-current') === 'page');
    expect(active?.nativeElement.textContent.trim()).toContain('Results');
    expect(fixture.nativeElement.textContent).toContain('Report emerging result');

    // Horizontal scroll and styling
    const nav = fixture.debugElement.query(By.css('nav[aria-label="Center sections"]'));
    expect(nav.nativeElement.classList.contains('overflow-x-auto')).toBe(true);
    expect(nav.nativeElement.classList.contains('no-scrollbar')).toBe(true);
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

  it('activates Reporting tab when activeTab is "reporting" or "overview"', () => {
    ctx.setCenter('SMO', 'CGIAR System Organization');
    fixture.componentRef.setInput('activeTab', 'reporting');
    fixture.detectChanges();

    let active = fixture.debugElement.query(By.css('nav a[aria-current="page"]'));
    expect(active?.nativeElement.textContent.trim()).toContain('Reporting');

    fixture.componentRef.setInput('activeTab', 'overview');
    fixture.detectChanges();

    active = fixture.debugElement.query(By.css('nav a[aria-current="page"]'));
    expect(active?.nativeElement.textContent.trim()).toContain('Reporting');
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

    it('does NOT render back button in band mode with pageTitle', () => {
      ctx.setCenter('SMO', 'CGIAR System Organization');
      fixture.componentRef.setInput('pageTitle', 'Report New Bilateral Result');
      fixture.detectChanges();

      const backBtn = fixture.debugElement.query(By.css('[data-testid="bilateral-header-back-btn"]'));
      expect(backBtn).toBeNull();
    });

    it('renders back button in detail variant and handles goBack()', () => {
      ctx.setCenter('ABC', 'Alliance of Bioversity International and CIAT');
      fixture.componentRef.setInput('variant', 'detail');
      fixture.componentRef.setInput('pageTitle', 'A bilateral result');
      fixture.detectChanges();

      const backBtn = fixture.debugElement.query(By.css('[data-testid="bilateral-header-back-btn"]'));
      expect(backBtn).not.toBeNull();

      const spy = jest.spyOn(component, 'goBack');
      backBtn.nativeElement.click();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('respects backLabelOverride in detail variant', () => {
      ctx.setCenter('ABC', 'Alliance of Bioversity International and CIAT');
      fixture.componentRef.setInput('variant', 'detail');
      fixture.componentRef.setInput('pageTitle', 'A bilateral result');
      fixture.componentRef.setInput('backLabelOverride', 'Back to Custom Destination');
      fixture.detectChanges();

      const backBtn = fixture.debugElement.query(By.css('[data-testid="bilateral-header-back-btn"]'));
      expect(backBtn.nativeElement.textContent).toContain('Back to Custom Destination');
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
    fixture.componentRef.setInput('activeTab', 'overview');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('nav[aria-label="Breadcrumb"]'))).toBeNull();
    expect(fixture.nativeElement.querySelector('h1')?.textContent.trim()).toBe('SMO');
    expect(fixture.nativeElement.textContent).toContain('CGIAR System Organization');
  });

  it('links the Report emerging result CTA and tabs to the current center', () => {
    ctx.setCenter('SMO', 'CGIAR System Organization');
    fixture.componentRef.setInput('activeTab', 'overview');
    fixture.detectChanges();

    const cta = fixture.debugElement.query(By.css('a[href*="create"]'));
    expect(cta.nativeElement.getAttribute('href')).toBe('/bilateral/SMO/create');

      const draftsTab = fixture.debugElement.queryAll(By.css('nav a')).find(l =>
        l.nativeElement.textContent.includes('Draft Results'),
    );
    expect(draftsTab?.nativeElement.getAttribute('href')).toBe('/bilateral/SMO/drafts');
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

    it('renders the title with the way back above it and no breadcrumb band', () => {
      expect(q('[data-testid="bilateral-detail-header"]')).not.toBeNull();
      expect(q('h1')?.textContent.trim()).toBe('Test JD');
      expect(q('nav[aria-label="Breadcrumb"]')).toBeNull();
      expect(q('.bg-\\[var\\(--pr-surface-band\\)\\]')).toBeNull();
      const back = q('[data-testid="bilateral-header-back-btn"]');
      expect(back).not.toBeNull();
      expect(back.textContent).toContain(component.backLabel());
    });

    it('spends the one pill on the status and lists the funding tag as text', () => {
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('8976');
      expect(text).toContain('Innovation use');
      expect(text).toContain('W3/Bilateral');
      expect(q('[data-testid="bilateral-status-badge"]')?.textContent.trim()).toBe('Editing');
      const pills = fixture.nativeElement.querySelectorAll('.rounded-full');
      expect(pills.length).toBe(1);
    });

    it('keeps the band for every other page', () => {
      fixture.componentRef.setInput('variant', 'band');
      fixture.detectChanges();
      expect(q('[data-testid="bilateral-detail-header"]')).toBeNull();
      expect(q('nav[aria-label="Breadcrumb"]')).not.toBeNull();
    });
  });
});

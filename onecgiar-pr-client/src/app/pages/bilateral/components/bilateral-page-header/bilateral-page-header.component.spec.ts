import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterModule } from '@angular/router';
import { By } from '@angular/platform-browser';
import { BilateralPageHeaderComponent } from './bilateral-page-header.component';
import { BilateralContextService } from '../../services/bilateral-context.service';

describe('BilateralPageHeaderComponent', () => {
  let component: BilateralPageHeaderComponent;
  let fixture: ComponentFixture<BilateralPageHeaderComponent>;
  let ctx: BilateralContextService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BilateralPageHeaderComponent, RouterModule.forRoot([])],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralPageHeaderComponent);
    component = fixture.componentInstance;
    ctx = TestBed.inject(BilateralContextService);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders nothing until the center acronym resolves', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')).toBeNull();
  });

  it('shows the center acronym and name once resolved', () => {
    ctx.setCenter('SMO', 'CGIAR System Organization');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')?.textContent.trim()).toBe('SMO');
    expect(fixture.nativeElement.textContent).toContain('CGIAR System Organization');
  });

  it('hides the tab bar and CTA when activeTab is not set (e.g. the create-result wizard)', () => {
    ctx.setCenter('SMO', 'CGIAR System Organization');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Report emerging result');
  });

  it('shows the tab bar and marks the active tab when activeTab is set', () => {
    ctx.setCenter('SMO', 'CGIAR System Organization');
    fixture.componentRef.setInput('activeTab', 'results');
    fixture.detectChanges();

    const links = fixture.debugElement.queryAll(By.css('nav a'));
    expect(links.map(l => l.nativeElement.textContent.trim().split('\n')[0].trim())).toEqual([
      'Overview',
      'Results',
      'Drafts',
    ]);
    const active = links.find(l => l.nativeElement.getAttribute('aria-current') === 'page');
    expect(active?.nativeElement.textContent.trim()).toContain('Results');
    expect(fixture.nativeElement.textContent).toContain('Report emerging result');
  });

  // P2-3100 AC1: the creation screen needs a one-line breadcrumb
  // `CGIAR Center > [Full Center Name] (INITIALS)` with the page title directly below.
  // The three tabbed pages share this component and must be untouched by it.
  // P2-3352: the header must identify the result — code, type, funding tag and status. The status
  // badge was long believed blocked on the backend (P2-3437); it never was — the detail response has
  // always carried `status_id` and the client was dropping it.
  describe('result identity strip (P2-3352)', () => {
    const withTitle = () => {
      // The whole header is gated on `@if (ctx.centerAcronym())`, so without a centre nothing renders
      // and every textContent assertion passes against an empty string.
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
      // hasIdentityStrip is true, but the strip lives in the pageTitle branch only.
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
      l.nativeElement.textContent.includes('Drafts'),
    );
    expect(draftsTab?.nativeElement.getAttribute('href')).toBe('/bilateral/SMO/drafts');
  });

  describe('smart back button', () => {
    it('renders the smart back button in the header', () => {
      ctx.setCenter('SMO', 'CGIAR System Organization');
      fixture.componentRef.setInput('pageTitle', 'Report New Bilateral Result');
      fixture.detectChanges();

      const backBtn = fixture.debugElement.query(By.css('[data-testid="bilateral-header-back-btn"]'));
      expect(backBtn).toBeTruthy();
      expect(backBtn.nativeElement.textContent).toContain('Back to Center overview');
    });

    it('calls goBack() on click', () => {
      ctx.setCenter('SMO', 'CGIAR System Organization');
      fixture.componentRef.setInput('pageTitle', 'Report New Bilateral Result');
      fixture.detectChanges();

      const spy = jest.spyOn(component, 'goBack');
      const backBtn = fixture.debugElement.query(By.css('[data-testid="bilateral-header-back-btn"]'));
      backBtn.nativeElement.click();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('respects backLabelOverride when supplied', () => {
      ctx.setCenter('SMO', 'CGIAR System Organization');
      fixture.componentRef.setInput('backLabelOverride', 'Back to Custom Destination');
      fixture.detectChanges();

      const backBtn = fixture.debugElement.query(By.css('[data-testid="bilateral-header-back-btn"]'));
      expect(backBtn.nativeElement.textContent).toContain('Back to Custom Destination');
    });
  });

  // The result editor's header: in flow, way back on top, title, identity strip — the W1/W2 shape.
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

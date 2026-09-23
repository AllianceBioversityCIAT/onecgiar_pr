import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BILATERAL_MANUAL_CREATE_COPY } from '../../../../internationalization/bilateral-manual-create.copy';
import { BilateralCreateDrawerComponent } from './bilateral-create-drawer.component';

describe('BilateralCreateDrawerComponent', () => {
  let fixture: ComponentFixture<BilateralCreateDrawerComponent>;
  let component: BilateralCreateDrawerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BilateralCreateDrawerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralCreateDrawerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('projectCode', 'B-A1080');
    fixture.componentRef.setInput('projectTitle', 'STAR Project');
    fixture.componentRef.setInput('programCode', 'SP01');
    fixture.componentRef.setInput('programName', 'Climate Action');
    fixture.detectChanges();
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('locks body scroll while mounted', () => {
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('renders drawer chrome and context header', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="bilateral-create-drawer"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="bilateral-create-drawer-context"]')?.textContent).toContain('STAR Project');
    expect(el.querySelector('[data-testid="bilateral-create-drawer-context"]')?.textContent).toContain('SP01');
  });

  it('emits closed when scrim is clicked', () => {
    const spy = jest.spyOn(component.closed, 'emit');
    (fixture.nativeElement as HTMLElement).querySelector('[data-testid="bilateral-create-drawer-scrim"]')?.dispatchEvent(new Event('click'));
    expect(spy).toHaveBeenCalled();
  });

  it('emits closed when close button is clicked', () => {
    const spy = jest.spyOn(component.closed, 'emit');
    (fixture.nativeElement as HTMLElement).querySelector('[data-testid="bilateral-create-drawer-close"]')?.dispatchEvent(new Event('click'));
    expect(spy).toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    const spy = jest.spyOn(component, 'requestClose');
    component.onEscape();
    expect(spy).toHaveBeenCalled();
  });

  it('uses full viewport width on mobile', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });
    component.onWindowResize();
    expect(component.width()).toBe(375);
    expect(component.isMobile()).toBe(true);
  });

  it('exposes complementary role and aria-label', () => {
    const panel = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="bilateral-create-drawer"]');
    expect(panel?.getAttribute('role')).toBe('complementary');
    expect(panel?.getAttribute('aria-label')).toBe(BILATERAL_MANUAL_CREATE_COPY.drawer.ariaLabel);
  });

  it('renders SP chip with label in context header', () => {
    const sp = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="bilateral-create-drawer-sp"]');
    expect(sp?.textContent).toContain(BILATERAL_MANUAL_CREATE_COPY.drawer.primaryScienceProgramLabel);
    expect(sp?.textContent).toContain('Climate Action');
  });

  // P2-3756 (AC2/AC3): the drawer is where the creation flow lives now, so the read-only project
  // summary and description have to be legible here — one labelled block per field that has text.
  it('renders labelled Project Summary and Project Description blocks when both are filled', () => {
    fixture.componentRef.setInput('projectSummary', 'Climate adaptation training across partner countries');
    fixture.componentRef.setInput('projectDescription', 'Longer description text');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const summary = host.querySelector('[data-testid="bilateral-create-drawer-project-summary"]');
    const description = host.querySelector('[data-testid="bilateral-create-drawer-project-description"]');

    expect(summary?.textContent).toContain(BILATERAL_MANUAL_CREATE_COPY.drawer.projectSummaryLabel);
    expect(summary?.textContent).toContain('Climate adaptation training across partner countries');
    expect(description?.textContent).toContain(BILATERAL_MANUAL_CREATE_COPY.drawer.projectDescriptionLabel);
    expect(description?.textContent).toContain('Longer description text');
    expect(host.querySelector('[data-testid="bilateral-create-drawer-project-details-empty"]')).toBeNull();
  });

  it('renders only the description block when CLARISA left the summary empty', () => {
    fixture.componentRef.setInput('projectSummary', '');
    fixture.componentRef.setInput('projectDescription', 'Groundwater management support in Laos');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="bilateral-create-drawer-project-summary"]')).toBeNull();
    expect(host.querySelector('[data-testid="bilateral-create-drawer-project-description"]')?.textContent).toContain(
      'Groundwater management support in Laos'
    );
  });

  it('states that the project has neither field instead of rendering nothing', () => {
    fixture.componentRef.setInput('projectSummary', '');
    fixture.componentRef.setInput('projectDescription', '');
    fixture.detectChanges();

    const empty = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="bilateral-create-drawer-project-details-empty"]'
    );
    expect(empty?.textContent).toContain(BILATERAL_MANUAL_CREATE_COPY.drawer.projectDetailsEmpty);
  });

  it('clamps long project text behind a Read more toggle and expands it on click', () => {
    const longText = 'Varietal improvement of potato and sweetpotato for biotic resistance with ICAR institutes in India. '.repeat(
      3
    );
    fixture.componentRef.setInput('projectSummary', longText);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const text = host.querySelector(
      '[data-testid="bilateral-create-drawer-project-summary"] p:last-of-type'
    ) as HTMLElement;
    const toggle = host.querySelector(
      '[data-testid="bilateral-create-drawer-project-details-toggle"]'
    ) as HTMLButtonElement;

    expect(text.classList.contains('line-clamp-2')).toBe(true);
    expect(toggle.textContent?.trim()).toBe(BILATERAL_MANUAL_CREATE_COPY.drawer.projectDetailsExpand);

    toggle.click();
    fixture.detectChanges();

    expect(text.classList.contains('line-clamp-2')).toBe(false);
    expect(toggle.textContent?.trim()).toBe(BILATERAL_MANUAL_CREATE_COPY.drawer.projectDetailsCollapse);
  });

  it('omits the toggle for text short enough to read in full', () => {
    fixture.componentRef.setInput('projectSummary', 'Short summary');
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="bilateral-create-drawer-project-details-toggle"]'
      )
    ).toBeNull();
  });

  it('truncates long project titles with a native tooltip', () => {
    const longTitle = 'A very long bilateral project title that should clamp to two lines in the drawer header';
    fixture.componentRef.setInput('projectTitle', longTitle);
    fixture.detectChanges();
    const titleEl = (fixture.nativeElement as HTMLElement).querySelector('.bcd-context__title');
    expect(titleEl?.getAttribute('title')).toBe(longTitle);
  });
});

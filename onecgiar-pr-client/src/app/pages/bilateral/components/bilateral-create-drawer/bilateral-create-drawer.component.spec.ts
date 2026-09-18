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

  it('renders project subtitle below the title when provided', () => {
    fixture.componentRef.setInput('projectSubtitle', 'Climate adaptation training across partner countries');
    fixture.detectChanges();

    const subtitleEl = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="bilateral-create-drawer-project-subtitle"]'
    );
    expect(subtitleEl?.textContent).toContain('Climate adaptation training');
    expect(subtitleEl?.getAttribute('title')).toBe('Climate adaptation training across partner countries');
  });

  it('omits project subtitle when empty', () => {
    fixture.componentRef.setInput('projectSubtitle', '');
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[data-testid="bilateral-create-drawer-project-subtitle"]')
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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ResultFrameworkReportingCenterCardItemComponent } from './result-framework-reporting-center-card-item.component';
import { centerLogoSrc } from './center-logos';

describe('ResultFrameworkReportingCenterCardItemComponent', () => {
  let component: ResultFrameworkReportingCenterCardItemComponent;
  let fixture: ComponentFixture<ResultFrameworkReportingCenterCardItemComponent>;

  const render = (item: any) => {
    component.item = item;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultFrameworkReportingCenterCardItemComponent, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultFrameworkReportingCenterCardItemComponent);
    component = fixture.componentInstance;
  });

  it('shows the Center logo on its card (AC1)', () => {
    const el = render({ center_id: 'CENTER-13', center_name: 'International Rice Research Institute', center_acronym: 'IRRI' });
    const img = el.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/assets/result-framework-reporting/Centers-Logos/IRRI.png');
    expect(img.getAttribute('alt')).toBe('IRRI');
    expect(el.textContent).not.toContain('account_balance');
  });

  it('keeps the generic icon for a Center without a logo (AC2)', () => {
    const el = render({ center_id: 'X', center_name: 'Unknown Center', center_acronym: 'NOPE' });
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('account_balance');
  });

  it('falls back to the generic icon when the logo file fails to load (AC2)', () => {
    const el = render({ center_id: 'CENTER-05', center_name: 'CIMMYT', center_acronym: 'CIMMYT' });
    el.querySelector('img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('account_balance');
  });

  describe('centerLogoSrc', () => {
    it('maps both Alliance entries to the single Alliance logo', () => {
      expect(centerLogoSrc('CIAT (Alliance)')).toBe('/assets/result-framework-reporting/Centers-Logos/Alliance.png');
      expect(centerLogoSrc('Bioversity (Alliance)')).toBe('/assets/result-framework-reporting/Centers-Logos/Alliance.png');
    });

    it('tolerates surrounding spaces and returns null for empty or unknown acronyms', () => {
      expect(centerLogoSrc(' IWMI ')).toBe('/assets/result-framework-reporting/Centers-Logos/IWMI.png');
      expect(centerLogoSrc('')).toBeNull();
      expect(centerLogoSrc(null)).toBeNull();
      expect(centerLogoSrc(undefined)).toBeNull();
      expect(centerLogoSrc('toString')).toBeNull();
    });
  });
});

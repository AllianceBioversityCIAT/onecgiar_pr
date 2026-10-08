import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CenterMarkerComponent } from './center-marker.component';

describe('CenterMarkerComponent', () => {
  let fixture: ComponentFixture<CenterMarkerComponent>;

  const render = (inputs: Record<string, unknown>) => {
    fixture = TestBed.createComponent(CenterMarkerComponent);
    Object.entries(inputs).forEach(([k, v]) => fixture.componentRef.setInput(k, v));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => TestBed.configureTestingModule({ imports: [CenterMarkerComponent] }));

  it('renders the mapped logo at the requested size', () => {
    const img = render({ acronym: 'IFPRI', size: 44 }).querySelector('img');
    expect(img?.getAttribute('src')).toBe('/assets/result-framework-reporting/Centers-Logos/IFPRI.png');
    expect(img?.style.width).toBe('44px');
  });

  it('falls back to the diamond for a Center without a logo', () => {
    const el = render({ acronym: 'UNKNOWN' });
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('span')).not.toBeNull();
  });

  it('renders nothing without a logo when the fallback is off', () => {
    const el = render({ acronym: 'UNKNOWN', showFallback: false });
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('span')).toBeNull();
  });

  it('swaps a logo that fails to load for the diamond', () => {
    const el = render({ acronym: 'CIP' });
    el.querySelector('img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('span')).not.toBeNull();
  });
});

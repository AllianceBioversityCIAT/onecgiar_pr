// @akili-spec changes/admin-reminders-page (ARP-T-2)
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeliveryBarComponent } from './delivery-bar.component';

describe('DeliveryBarComponent', () => {
  let fixture: ComponentFixture<DeliveryBarComponent>;

  const render = (sent: number, unreachable: number, skipped: number, failed: number, dispatched: boolean) => {
    fixture = TestBed.createComponent(DeliveryBarComponent);
    fixture.componentRef.setInput('sent', sent);
    fixture.componentRef.setInput('unreachable', unreachable);
    fixture.componentRef.setInput('skipped', skipped);
    fixture.componentRef.setInput('failed', failed);
    fixture.componentRef.setInput('dispatched', dispatched);
    fixture.detectChanges();
  };
  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().querySelector('[data-testid="arp-delivery-text"]')!.textContent!.trim();
  const segments = () => Array.from(root().querySelectorAll('[data-testid^="arp-delivery-seg-"]'));

  beforeEach(() => TestBed.configureTestingModule({ imports: [DeliveryBarComponent] }));

  it('(16,4,0,0): text "16 sent · 4 unreachable" and exactly 2 segments', () => {
    render(16, 4, 0, 0, true);
    expect(text()).toBe('16 sent · 4 unreachable');
    expect(segments()).toHaveLength(2);
    expect(segments().map(s => s.getAttribute('data-testid'))).toEqual(['arp-delivery-seg-sent', 'arp-delivery-seg-unreachable']);
  });

  it('(0,0,0,0) not sent: "Not sent yet" and no segment', () => {
    render(0, 0, 0, 0, false);
    expect(text()).toBe('Not sent yet');
    expect(segments()).toHaveLength(0);
  });

  it('(sent 1, failed 2): text includes "2 failed" and no skipped or unreachable', () => {
    render(1, 0, 0, 2, true);
    expect(text()).toContain('2 failed');
    expect(text()).not.toContain('unreachable');
    expect(text()).not.toContain('skipped');
    expect(segments()).toHaveLength(2);
  });

  it('dispatched with nothing to show reads "No recipients", not "Not sent yet"', () => {
    render(0, 0, 0, 0, true);
    expect(text()).toBe('No recipients');
  });
});

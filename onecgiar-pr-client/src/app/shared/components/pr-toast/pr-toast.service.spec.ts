import { TestBed } from '@angular/core/testing';
import { PrToastService } from './pr-toast.service';

describe('PrToastService', () => {
  let service: PrToastService;

  beforeEach(() => {
    jest.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(PrToastService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('auto-removes after life ?? 4000 when no new fields are given (unchanged behavior)', () => {
    service.add({ summary: 'Saved' });
    expect(service.toasts().length).toBe(1);

    jest.advanceTimersByTime(3999);
    expect(service.toasts().length).toBe(1);

    jest.advanceTimersByTime(1);
    expect(service.toasts().length).toBe(0);
  });

  it('keeps a sticky toast present after 60s (no auto-remove)', () => {
    service.add({ summary: 'P-1941 is ready', sticky: true });
    expect(service.toasts().length).toBe(1);

    jest.advanceTimersByTime(60000);
    expect(service.toasts().length).toBe(1);
  });

  it('still auto-removes a sticky:false toast after life ?? 4000', () => {
    service.add({ summary: 'Saved', sticky: false });

    jest.advanceTimersByTime(4000);
    expect(service.toasts().length).toBe(0);
  });

  it('carries the optional action through to the active toast', () => {
    const run = jest.fn();
    service.add({ summary: 'P-1941 is ready', action: { label: 'View', run }, sticky: true });

    const [toast] = service.toasts();
    expect(toast.action?.label).toBe('View');
    expect(toast.action?.run).toBe(run);
  });
});

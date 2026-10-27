import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrToastComponent } from './pr-toast.component';
import { PrToastService } from './pr-toast.service';

describe('PrToastComponent', () => {
  let fixture: ComponentFixture<PrToastComponent>;
  let component: PrToastComponent;
  let service: PrToastService;

  beforeEach(async () => {
    jest.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [PrToastComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PrToastComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(PrToastService);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders no action button when the toast has no action', () => {
    service.add({ summary: 'Saved' });
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.pr-toast__action');
    expect(button).toBeNull();
  });

  it('renders a focusable action button when the toast has an action, and running it dismisses the toast', () => {
    const run = jest.fn();
    service.add({ summary: 'P-1941 is ready', action: { label: 'View', run }, sticky: true });
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.pr-toast__action');
    expect(button).toBeTruthy();
    expect(button.textContent?.trim()).toBe('View');
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(button.tabIndex).not.toBe(-1);

    button.click();
    fixture.detectChanges();

    expect(run).toHaveBeenCalledTimes(1);
    expect(service.toasts().length).toBe(0);
  });

  it('keeps default markup identical (no action fields) for a toast without action/sticky', () => {
    service.add({ severity: 'success', summary: 'Saved', detail: 'All good' });
    fixture.detectChanges();

    const toastEl = fixture.nativeElement.querySelector('.pr-toast');
    expect(toastEl).toBeTruthy();
    expect(toastEl.querySelector('.pr-toast__action')).toBeNull();
    expect(toastEl.querySelector('.pr-toast__summary').textContent.trim()).toBe('Saved');
    expect(toastEl.querySelector('.pr-toast__detail').textContent.trim()).toBe('All good');
    expect(toastEl.querySelector('.pr-toast__close')).toBeTruthy();
  });

  // AQT-D2 (bilateral/ai-queue-toast-info): lock the shared `info` variant at the render
  // level so a future drift in the host's `icons` map (e.g. info reusing `check_circle`)
  // is caught here — read the real rendered DOM, not just the class list.
  it('renders the info variant with the pr-toast--info class and the info icon glyph, not the success icon', () => {
    service.add({ severity: 'info', summary: 'Queued', detail: 'In progress' });
    fixture.detectChanges();

    const toastEl: HTMLElement = fixture.nativeElement.querySelector('.pr-toast');
    expect(toastEl).toBeTruthy();
    expect(toastEl.classList.contains('pr-toast--info')).toBe(true);

    const icon = toastEl.querySelector('.pr-toast__icon');
    expect(icon).toBeTruthy();
    expect(icon!.textContent?.trim()).toBe('info');
    expect(icon!.textContent?.trim()).not.toBe('check_circle');
  });
});

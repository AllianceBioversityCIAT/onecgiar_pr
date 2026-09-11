import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { UNSAVED_CHANGES_DIALOG_COPY, UnsavedChangesDialogComponent } from './unsaved-changes-dialog.component';

describe('UnsavedChangesDialogComponent', () => {
  let fixture: ComponentFixture<UnsavedChangesDialogComponent>;
  let component: UnsavedChangesDialogComponent;
  let closeSpy: jest.Mock;

  beforeEach(async () => {
    closeSpy = jest.fn();

    await TestBed.configureTestingModule({
      imports: [UnsavedChangesDialogComponent],
      providers: [{ provide: BrnDialogRef, useValue: { close: closeSpy } }]
    }).compileComponents();

    fixture = TestBed.createComponent(UnsavedChangesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the exact UCA-R-3 copy', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain(UNSAVED_CHANGES_DIALOG_COPY);
  });

  it('renders exactly two actionable buttons — Save and Discard — no third action', () => {
    const buttons: HTMLButtonElement[] = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    expect(buttons.length).toBe(2);

    buttons[0].click();
    expect(closeSpy).toHaveBeenCalledWith('save');

    closeSpy.mockClear();
    buttons[1].click();
    expect(closeSpy).toHaveBeenCalledWith('discard');
  });

  it('resolves Escape as discard — an explicit binding, not the default undefined dismissal', () => {
    (fixture.nativeElement as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(closeSpy).toHaveBeenCalledWith('discard');
  });

  // Manual/real-browser confirmation is the authority per UCA-T-3's DoD (jsdom's focus semantics
  // inside a real CDK overlay are not fully representative). This assertion targets the component's
  // own explicit `.focus()` call (plain DOM API, not CDK's overlay-driven autoFocus), which jsdom
  // *can* observe — it is a useful signal, just not proof of the real-overlay behavior.
  it('moves focus to the Save button on init', () => {
    const saveButton = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    expect(document.activeElement).toBe(saveButton);
  });
});

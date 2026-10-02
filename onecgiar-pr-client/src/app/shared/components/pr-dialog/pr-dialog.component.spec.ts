import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrDialogComponent } from './pr-dialog.component';

/**
 * `ICM-T-3` — `PrDialogComponent.floatingClose` (opt-in, default `false`, `ICM-DD-2`).
 *
 * Spec: `docs/specs/bugfix/ipsr-complementary-innovation-modal-overlap/` (`ICM-*`), task `ICM-T-3`.
 *
 * Falsifier (per the task's Verification clause): flipping the input's default to `true` must turn
 * the first test below red (a floating `×` would then render even with no opt-in).
 */
describe('PrDialogComponent — floatingClose (ICM-T-3)', () => {
  let fixture: ComponentFixture<PrDialogComponent>;
  let component: PrDialogComponent;

  const closeButtons = () => fixture.nativeElement.querySelectorAll('.pr-dialog__close');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrDialogComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PrDialogComponent);
    component = fixture.componentInstance;
    component.visible = true;
  });

  it('renders no floating × by default (floatingClose defaults to false)', () => {
    component.showHeader = false;
    fixture.detectChanges();

    expect(closeButtons().length).toBe(0);
  });

  it('with floatingClose + showHeader=false, renders exactly one × and clicking it emits visibleChange(false) and onHide', () => {
    component.showHeader = false;
    component.floatingClose = true;
    fixture.detectChanges();

    const closes = closeButtons();
    expect(closes.length).toBe(1);
    expect(closes[0].classList.contains('pr-dialog__close--floating')).toBe(true);

    const visibleChangeSpy = jest.fn();
    const onHideSpy = jest.fn();
    component.visibleChange.subscribe(visibleChangeSpy);
    component.onHide.subscribe(onHideSpy);

    (closes[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(visibleChangeSpy).toHaveBeenCalledWith(false);
    expect(onHideSpy).toHaveBeenCalled();
    expect(component.visible).toBe(false);
  });

  it('with showHeader=true, the header × stays and no floating one is added even if floatingClose=true', () => {
    component.showHeader = true;
    component.header = 'Title';
    component.floatingClose = true;
    fixture.detectChanges();

    const closes = closeButtons();
    expect(closes.length).toBe(1);
    expect(closes[0].classList.contains('pr-dialog__close--floating')).toBe(false);
  });

  it('does not add a floating × when closable=false, even with floatingClose + showHeader=false', () => {
    component.showHeader = false;
    component.floatingClose = true;
    component.closable = false;
    fixture.detectChanges();

    expect(closeButtons().length).toBe(0);
  });
});

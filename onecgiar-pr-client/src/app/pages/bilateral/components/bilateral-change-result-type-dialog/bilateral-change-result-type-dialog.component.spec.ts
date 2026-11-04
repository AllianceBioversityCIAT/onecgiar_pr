import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BrnButton } from '@spartan-ng/brain/button';
import { of } from 'rxjs';

import { BilateralChangeResultTypeDialogComponent } from './bilateral-change-result-type-dialog.component';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';

describe('BilateralChangeResultTypeDialogComponent', () => {
  let fixture: ComponentFixture<BilateralChangeResultTypeDialogComponent>;
  let component: BilateralChangeResultTypeDialogComponent;
  let api: { PATCH_changeBilateralResultType: jest.Mock };

  const optionById = (id: number) => component.options.find(o => o.id === id)!;
  const submitButton = (): HTMLButtonElement => {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('.bctd-footer button')) as HTMLButtonElement[];
    return buttons.find(b => (b.textContent ?? '').includes('Change result type') || (b.textContent ?? '').includes('Changing'))!;
  };
  // hlmBtn forwards `[disabled]` to the BrnButton host directive (mocked under Jest: it stores the value and does
  // not reflect it on the DOM), so the rendered button's disabled state is read from that directive instance.
  const settle = async (): Promise<void> => {
    fixture.detectChanges(false);
    await fixture.whenStable();
    fixture.detectChanges(false);
  };
  const isSubmitDisabled = (): boolean => {
    const el = submitButton();
    const debug = fixture.debugElement.queryAll(By.css('.bctd-footer button')).find(d => d.nativeElement === el)!;
    return !!debug.injector.get(BrnButton).disabled || el.disabled;
  };

  beforeEach(async () => {
    api = { PATCH_changeBilateralResultType: jest.fn().mockReturnValue(of({})) };
    await TestBed.configureTestingModule({
      imports: [BilateralChangeResultTypeDialogComponent],
      providers: [{ provide: BilateralApiService, useValue: api }]
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralChangeResultTypeDialogComponent);
    component = fixture.componentInstance;
    component.resultId = 9901;
    component.currentTypeId = 8;
    component.currentLevelId = 4;
    component.visible = true;
    fixture.detectChanges();
  });

  it('enables submit with a new type and an empty reason (rendered button not disabled)', async () => {
    component.select(optionById(7));
    component.justification = '';
    await settle();

    expect(component.canSubmit()).toBe(true);
    expect(isSubmitDisabled()).toBe(false);
  });

  it('submits an empty reason as justification "" and on success closes and emits changed', async () => {
    const changed = jest.fn();
    const visibleChange = jest.fn();
    component.changed.subscribe(changed);
    component.visibleChange.subscribe(visibleChange);
    component.select(optionById(7));

    component.submit();

    expect(api.PATCH_changeBilateralResultType).toHaveBeenCalledWith(9901, {
      result_level_id: 4,
      result_type_id: 7,
      justification: ''
    });
    expect(visibleChange).toHaveBeenCalledWith(false);
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('trims the reason in the request body', async () => {
    component.select(optionById(7));
    component.justification = '  Fixed  ';

    component.submit();

    expect(api.PATCH_changeBilateralResultType.mock.calls[0][1].justification).toBe('Fixed');
  });

  it('disables submit when no type is selected or while submitting', async () => {
    await settle();
    expect(component.canSubmit()).toBe(false);
    expect(isSubmitDisabled()).toBe(true);

    component.select(optionById(7));
    component.submitting = true;
    await settle();
    expect(component.canSubmit()).toBe(false);
    expect(isSubmitDisabled()).toBe(true);
  });

  it('keeps submit disabled for Knowledge Product with an empty reason and an empty handle', async () => {
    component.select(optionById(6));
    component.justification = '';
    component.handle = '';
    await settle();

    expect(component.canSubmit()).toBe(false);
    expect(isSubmitDisabled()).toBe(true);
  });

  it('enables submit for Knowledge Product with an empty reason once the handle is typed', async () => {
    component.select(optionById(6));
    component.justification = '';
    component.handle = '10568/175322';
    await settle();

    expect(component.canSubmit()).toBe(true);
    expect(isSubmitDisabled()).toBe(false);
  });

  it('shows no required asterisk on the reason label but keeps it on the type label', async () => {
    const el: HTMLElement = fixture.nativeElement;
    const reasonTitle = Array.from(el.querySelectorAll('.bctd-field-title')).find(t => (t.textContent ?? '').includes('Why is this change needed?'));
    expect(reasonTitle).toBeTruthy();
    expect(reasonTitle!.textContent).not.toContain('*');

    const typeLabel = Array.from(el.querySelectorAll('.bctd-label')).find(t => (t.textContent ?? '').includes('Select the new result type'));
    expect(typeLabel).toBeTruthy();
    expect(typeLabel!.textContent).toContain('*');
  });
});

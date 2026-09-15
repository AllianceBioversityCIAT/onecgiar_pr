import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrInputComponent } from './pr-input.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrFieldHeaderComponent } from '../pr-field-header/pr-field-header.component';
import { PrFieldValidationsComponent } from '../pr-field-validations/pr-field-validations.component';
import { YesOrNotByBooleanPipe } from '../pipes/yes-or-not-by-boolean.pipe';

describe('PrInputComponent', () => {
  let component: PrInputComponent;
  let fixture: ComponentFixture<PrInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrInputComponent, PrFieldHeaderComponent, PrFieldValidationsComponent, YesOrNotByBooleanPipe],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PrInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps a present value pending when the consumer marks it as invalid', () => {
    component.writeValue('Bilateral Draft #1199');
    fixture.componentRef.setInput('valueValid', false);
    fixture.detectChanges();

    expect(component.hasValue).toBe(false);
  });

  /*
   * Ángel, 15-sep-2026, `innovation-dev-info` → "Total USD Value": the box took letters and then
   * "se escribe y se borra". Two halves of one gap — the field only sanitized and only published
   * its value on BLUR, so anything non-numeric survived on screen until the caret left and then
   * vanished, and anything typed never reached the bound model in between (a save or a re-render
   * of the row in that window went out without it).
   *
   * Reverting either half of `onCurrencyInput` turns these red.
   */
  describe('type="currency" — what is typed is what is stored', () => {
    let changed: any;

    beforeEach(() => {
      fixture.componentRef.setInput('type', 'currency');
      fixture.detectChanges();
      changed = undefined;
      component.registerOnChange((v: any) => (changed = v));
    });

    /** What the `<input>` does: ngModel writes the raw text, then the handler runs. */
    const type = (text: string) => {
      component.currencyRaw = text;
      component.onCurrencyInput();
    };

    it('never lets a letter into the box in the first place', () => {
      type('12a3b');

      expect(component.currencyRaw).toBe('123');
      expect(component.value).toBe(123);
    });

    it('publishes the amount while typing, without waiting for blur', () => {
      type('2500');

      expect(changed).toBe(2500);
      expect(component.value).toBe(2500);
    });

    it('does not reformat mid-typing, so "10." keeps its caret and its dot', () => {
      type('10.');

      expect(component.currencyRaw).toBe('10.');
      expect(component.value).toBe(10);
    });

    it('keeps a single decimal point', () => {
      type('10.5.7');

      expect(component.currencyRaw).toBe('10.57');
      expect(component.value).toBe(10.57);
    });

    it('empties the model when the box is cleared', () => {
      type('2500');
      type('');

      expect(changed).toBeNull();
      expect(component.value).toBeNull();
    });

    it('still formats as USD on blur', () => {
      type('2432432');
      component.onCurrencyBlur();

      expect(component.currencyRaw).toBe('$2,432,432.00');
      expect(component.value).toBe(2432432);
    });
  });
});

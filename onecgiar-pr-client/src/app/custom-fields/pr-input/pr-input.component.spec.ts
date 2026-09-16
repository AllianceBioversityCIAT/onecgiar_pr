import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrInputComponent } from './pr-input.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../pr-field-header/pr-field-header.component';
import { PrFieldValidationsComponent } from '../pr-field-validations/pr-field-validations.component';
import { YesOrNotByBooleanPipe } from '../pipes/yes-or-not-by-boolean.pipe';

describe('PrInputComponent', () => {
  let component: PrInputComponent;
  let fixture: ComponentFixture<PrInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrInputComponent, PrFieldHeaderComponent, PrFieldValidationsComponent, YesOrNotByBooleanPipe],
      imports: [HttpClientTestingModule, FormsModule]
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

    /*
     * 🛑 El que muerde de verdad. Los demás llaman al método a mano, así que seguirían verdes si
     * alguien quitara `(ngModelChange)` del template — que es justo la línea que trae el arreglo.
     * Este pasa por el `<input>` real: teclea en el DOM y mira el modelo enlazado.
     */
    it('wires the handler to the real input, not just to the class', async () => {
      // Sin estas dos, el campo se pinta en su forma de solo lectura: `app-field-card` no está
      // declarado aquí (no proyecta su contenido) y `RolesService` arranca en solo lectura.
      fixture.componentRef.setInput('showFieldHeader', false);
      (component.rolesSE as any).readOnly = false;
      fixture.detectChanges();

      const input: HTMLInputElement = fixture.nativeElement.querySelector('.pr-input input[inputmode="decimal"]');
      expect(input).toBeTruthy();

      input.value = '12a3b';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(input.value).toBe('123');
      expect(changed).toBe(123);
    });

    it('still formats as USD on blur', () => {
      type('2432432');
      component.onCurrencyBlur();

      expect(component.currencyRaw).toBe('$2,432,432.00');
      expect(component.value).toBe(2432432);
    });
  });
});

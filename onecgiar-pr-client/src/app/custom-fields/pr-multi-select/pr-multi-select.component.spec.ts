import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrMultiSelectComponent } from './pr-multi-select.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('PrMultiSelectComponent', () => {
  let component: PrMultiSelectComponent;
  let fixture: ComponentFixture<PrMultiSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrMultiSelectComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PrMultiSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('optionsIntance() flat mode', () => {
    const setup = (options: any[]) => {
      fixture.componentRef.setInput('options', options);
      fixture.componentRef.setInput('optionValue', 'code');
      fixture.componentRef.setInput('optionLabel', 'full_name');
      fixture.detectChanges();
    };

    it('marks options present in the bound value as selected', () => {
      setup([{ code: 'C1' }, { code: 'C2' }, { code: 'C3' }]);
      component.writeValue([{ code: 'C1' }, { code: 'C2' }]);

      const decorated = component.optionsIntance();
      expect(decorated.find(o => o.code === 'C1').selected).toBe(true);
      expect(decorated.find(o => o.code === 'C2').selected).toBe(true);
      expect(decorated.find(o => o.code === 'C3').selected).toBe(false);
    });

    // Regression: parents deselect by mutating the bound array in place (e.g.
    // `contributing_center.splice(i, 1)`), which does NOT change the array reference and never
    // triggers writeValue. optionsIntance() must still reflect the removal on the next cycle.
    it('reflects an external in-place removal (splice) of the bound value', () => {
      setup([{ code: 'C1' }, { code: 'C2' }, { code: 'C3' }]);
      const model = [{ code: 'C1' }, { code: 'C2' }];
      component.writeValue(model);

      expect(component.optionsIntance().find(o => o.code === 'C1').selected).toBe(true);

      model.splice(0, 1); // parent removes C1 in place

      const decorated = component.optionsIntance();
      expect(decorated.find(o => o.code === 'C1').selected).toBe(false);
      expect(decorated.find(o => o.code === 'C2').selected).toBe(true);
    });

    it('never mutates the original options array passed by the parent', () => {
      const options = [{ code: 'C1' }, { code: 'C2' }];
      setup(options);
      component.writeValue([{ code: 'C1' }]);
      fixture.componentRef.setInput('disableOptions', [{ code: 'C2' }]);
      fixture.detectChanges();

      component.optionsIntance();

      expect(options[0].hasOwnProperty('selected')).toBe(false);
      expect(options[0].hasOwnProperty('disabled')).toBe(false);
      expect(options[1].hasOwnProperty('disabled')).toBe(false);
    });

    it('writeValue keeps the same array reference when every entry is already an object', () => {
      setup([{ code: 'C1' }, { code: 'C2' }]);
      const model = [{ code: 'C1' }];
      component.writeValue(model);
      expect(component.value).toBe(model);
    });

    it('writeValue maps raw IDs to option objects for chip rendering', () => {
      setup([
        { code: 'C1', full_name: 'Center 1' },
        { code: 'C2', full_name: 'Center 2' }
      ]);
      component.writeValue(['C1']);
      expect(component.value.length).toBe(1);
      expect(component.value[0].code).toBe('C1');
    });
  });
});

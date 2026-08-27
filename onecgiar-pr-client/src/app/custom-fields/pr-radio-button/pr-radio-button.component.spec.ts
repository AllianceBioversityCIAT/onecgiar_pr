import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, CUSTOM_ELEMENTS_SCHEMA, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

import { PrRadioButtonComponent } from './pr-radio-button.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RolesService } from '../../shared/services/global/roles.service';

/**
 * The sub-option rows bind `[(ngModel)]` to `<app-pr-checkbox>` and `<app-pr-input>`. Under
 * CUSTOM_ELEMENTS_SCHEMA alone those are unknown elements with no value accessor, and NgModel throws
 * NG01203 before the sub-group is ever rendered — so the group has to be exercised against stubs that
 * satisfy the accessor contract and nothing more.
 */
@Component({
  selector: 'app-pr-checkbox',
  template: '',
  standalone: false,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PrCheckboxStubComponent), multi: true }]
})
class PrCheckboxStubComponent implements ControlValueAccessor {
  writeValue(): void {}
  registerOnChange(): void {}
  registerOnTouched(): void {}
}

@Component({
  selector: 'app-pr-input',
  template: '',
  standalone: false,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PrInputStubComponent), multi: true }]
})
class PrInputStubComponent implements ControlValueAccessor {
  writeValue(): void {}
  registerOnChange(): void {}
  registerOnTouched(): void {}
}

describe('RadioButtonComponent', () => {
  let component: PrRadioButtonComponent;
  let fixture: ComponentFixture<PrRadioButtonComponent>;

  /** Renders one instance with two options, the way every real consumer uses it. */
  const renderGroup = (labels: string[]): ComponentFixture<PrRadioButtonComponent> => {
    const f = TestBed.createComponent(PrRadioButtonComponent);
    f.componentInstance.options = labels.map((name, i) => ({ name, id: i + 1 }));
    f.componentInstance.optionLabel = 'name';
    f.componentInstance.optionValue = 'id';
    f.detectChanges();
    return f;
  };

  const idsOf = (f: ComponentFixture<PrRadioButtonComponent>): string[] =>
    Array.from(f.nativeElement.querySelectorAll('input.pr-native-radio')).map((i: any) => i.id);

  const forsOf = (f: ComponentFixture<PrRadioButtonComponent>): string[] =>
    Array.from(f.nativeElement.querySelectorAll('label.name')).map((l: any) => l.getAttribute('for'));

  /**
   * Renders the shape the Innovation team diversity question actually has (P2-3291): question 112
   * serves THREE top-level answers, and only the affirmative one carries the six diversity types as
   * level-3 sub-options. The two dismissal answers have none.
   */
  const DIVERSITY_TYPES = [
    'Gender diversity',
    'Diversity in years of experience',
    'Diversity in expertise',
    'Disciplinary diversity',
    'Regional diversity',
    'Other'
  ];

  const renderDiversityQuestion = (selected: number | null): ComponentFixture<PrRadioButtonComponent> => {
    const f = TestBed.createComponent(PrRadioButtonComponent);
    const c = f.componentInstance;
    c.options = [
      {
        id: 113,
        name: 'Yes, concrete actions have been taken to ensure:',
        subOptions: DIVERSITY_TYPES.map(question_text => ({ question_text, answer_boolean: null, answer_text: null }))
      },
      { id: 114, name: 'No concrete actions to diversify the innovation team composition', subOptions: [] },
      { id: 115, name: 'This does not apply to this innovation', subOptions: [] }
    ];
    c.optionLabel = 'name';
    c.optionValue = 'id';
    c.verticalAlignment = true;
    c.subLabel = 'Multiple answers can be selected.';
    c.checkboxConfig = {
      listAttr: 'subOptions',
      optionLabel: 'question_text',
      optionValue: 'answer_boolean',
      optionTextValue: 'answer_text'
    };
    c.writeValue(selected);
    f.detectChanges();
    return f;
  };

  const subGroupOf = (f: ComponentFixture<PrRadioButtonComponent>): HTMLElement | null => f.nativeElement.querySelector('.radioButton__subGroup');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrRadioButtonComponent, PrCheckboxStubComponent, PrInputStubComponent],
      imports: [HttpClientTestingModule, FormsModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    // `RolesService.readOnly` defaults to TRUE, which renders every option `[disabled]` — a click
    // then does nothing and the component looks broken for a reason that has nothing to do with it.
    TestBed.inject(RolesService).readOnly = false;

    fixture = TestBed.createComponent(PrRadioButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // P2-3350: ids used to be `radio_{{i}}`, indexed only within each instance's own *ngFor, so two
  // groups on the same page emitted the same ids. `<label for>` resolves via getElementById(), which
  // returns the FIRST match — clicking a later group's option text checked an earlier group's radio.
  it('gives every option an id unique across instances, and points each label at its own input', () => {
    const lengthOfTraining = renderGroup(['Short-term', 'Long-term']);
    const deliveryMethod = renderGroup(['Virtual / Online', 'In person', 'Blended']);

    const firstIds = idsOf(lengthOfTraining);
    const secondIds = idsOf(deliveryMethod);

    expect(firstIds).toHaveLength(2);
    expect(secondIds).toHaveLength(3);
    expect(firstIds.every(id => !!id)).toBe(true);
    expect(secondIds.every(id => !!id)).toBe(true);

    // No id is shared between the two groups.
    expect(new Set([...firstIds, ...secondIds]).size).toBe(firstIds.length + secondIds.length);

    // Each label targets the input rendered beside it, in order.
    expect(forsOf(lengthOfTraining)).toEqual(firstIds);
    expect(forsOf(deliveryMethod)).toEqual(secondIds);
  });

  it('keeps the native radio group name aligned with the option ids', () => {
    const group = renderGroup(['Yes', 'No']);
    const names: string[] = Array.from(group.nativeElement.querySelectorAll('input.pr-native-radio')).map((i: any) => i.getAttribute('name'));

    expect(new Set(names).size).toBe(1);
    idsOf(group).forEach(id => expect(id.startsWith(names[0])).toBe(true));
  });

  /**
   * P2-3291. Business could not tell the six diversity types derived from "Yes": they were rendered as
   * free-floating rows at `margin-left: 20px`, which puts a checkbox to the LEFT of the radio label it
   * depends on. The conditional logic was never missing — this block already rendered only for the
   * selected option — so the fix is the containment, and these cases pin it.
   */
  describe('conditional sub-options are contained in a sub-group (P2-3291)', () => {
    it('wraps the sub-options of the selected option, sub-label included', () => {
      const group = renderDiversityQuestion(113);
      const subGroup = subGroupOf(group);

      expect(subGroup).toBeTruthy();
      expect(subGroup.querySelectorAll('.checkboxList')).toHaveLength(DIVERSITY_TYPES.length);

      // The note belongs to the group, not to the top-level list. Its rule used to be nested under
      // `.radioButton`, where it could never match, because the <p> is a SIBLING of that element.
      const subLabel = subGroup.querySelector('.radioButton__subLabel');
      expect(subLabel).toBeTruthy();
      expect(subLabel.textContent.trim()).toBe('Multiple answers can be selected.');
      expect(subLabel.closest('.radioButton')).toBeNull();
    });

    it('renders no sub-group while a dismissal answer is selected', () => {
      [114, 115].forEach(dismissal => {
        const group = renderDiversityQuestion(dismissal);
        expect(subGroupOf(group)).toBeNull();
        expect(group.nativeElement.querySelectorAll('.checkboxList')).toHaveLength(0);
      });
    });

    it('renders no sub-group before any answer is given', () => {
      expect(subGroupOf(renderDiversityQuestion(null))).toBeNull();
    });

    it('leaves an ordinary radio group without sub-options untouched', () => {
      const group = renderGroup(['Short-term', 'Long-term']);
      expect(subGroupOf(group)).toBeNull();
      expect(group.nativeElement.querySelectorAll('.checkboxList')).toHaveLength(0);
    });
  });

  /**
   * The five Impact Area scores in General information are the only consumers of `variant="segmented"`,
   * and they could not be answered AT ALL: the variant paints `<button>`s, so there is no
   * `[(ngModel)]` writing the value the way the list's `<input type="radio">` does, and the click
   * handler only called `onSelect()` — which exclusively DEselects. Five real clicks left
   * `aria-checked="false"` on all fifteen buttons, "0 of 5 impact areas scored", and no request.
   */
  describe('segmented variant writes the value on click', () => {
    const renderSegmented = (values: any[] = [1, 2, 3], preloaded: any = null, disabled = false, readOnly = false): ComponentFixture<PrRadioButtonComponent> => {
      const f = TestBed.createComponent(PrRadioButtonComponent);
      const c = f.componentInstance;
      c.variant = 'segmented';
      c.options = values.map((id, i) => ({ id, full_name: `(${i}) Score ${i}` }));
      c.optionLabel = 'full_name';
      c.optionValue = 'id';
      c.disabled = disabled;
      c.readOnly = readOnly;
      // Seeded BEFORE the first pass: writing it between two change-detection runs trips NG0100 on
      // `hasValue`, which says nothing about the component.
      if (preloaded !== null) c.writeValue(preloaded);
      f.detectChanges();
      return f;
    };

    const segmentsOf = (f: ComponentFixture<PrRadioButtonComponent>): HTMLButtonElement[] =>
      Array.from(f.nativeElement.querySelectorAll('button[role="radio"]'));

    const checkedFlags = (f: ComponentFixture<PrRadioButtonComponent>): string[] => segmentsOf(f).map(b => b.getAttribute('aria-checked'));

    it('renders one button per option instead of native radios', () => {
      const group = renderSegmented();
      expect(segmentsOf(group)).toHaveLength(3);
      expect(group.nativeElement.querySelectorAll('input.pr-native-radio')).toHaveLength(0);
    });

    it('selects the clicked option and marks only that button checked', () => {
      const group = renderSegmented();
      const emitted: any[] = [];
      group.componentInstance.registerOnChange((v: any) => emitted.push(v));

      segmentsOf(group)[1].click();
      group.detectChanges();

      expect(group.componentInstance.value).toBe(2);
      expect(group.componentInstance.hasValue).toBe(true);
      expect(checkedFlags(group)).toEqual(['false', 'true', 'false']);
      expect(emitted).toEqual([2]);
    });

    it('moves the selection when another option of the same group is clicked', () => {
      const group = renderSegmented();
      const emitted: any[] = [];
      group.componentInstance.registerOnChange((v: any) => emitted.push(v));

      segmentsOf(group)[0].click();
      group.detectChanges();
      segmentsOf(group)[2].click();
      group.detectChanges();

      expect(group.componentInstance.value).toBe(3);
      expect(checkedFlags(group)).toEqual(['false', 'false', 'true']);
      expect(emitted).toEqual([1, 3]);
    });

    it('treats 0 as a real answer, not as empty', () => {
      const group = renderSegmented([0, 1, 2]);
      const emitted: any[] = [];
      group.componentInstance.registerOnChange((v: any) => emitted.push(v));

      segmentsOf(group)[0].click();
      group.detectChanges();

      expect(group.componentInstance.value).toBe(0);
      expect(group.componentInstance.hasValue).toBe(true);
      expect(checkedFlags(group)).toEqual(['true', 'false', 'false']);
      expect(emitted).toEqual([0]);
      expect(group.nativeElement.querySelector('.pr-field').classList).toContain('complete');
    });

    it('paints a pre-loaded answer and lets it be replaced', () => {
      const group = renderSegmented([1, 2, 3], 2);
      expect(checkedFlags(group)).toEqual(['false', 'true', 'false']);

      segmentsOf(group)[0].click();
      group.detectChanges();

      expect(group.componentInstance.value).toBe(1);
      expect(checkedFlags(group)).toEqual(['true', 'false', 'false']);
    });

    it('still clears the answer when the selected option is clicked again, as the list does', () => {
      const group = renderSegmented();
      segmentsOf(group)[1].click();
      group.detectChanges();
      segmentsOf(group)[1].click();
      group.detectChanges();

      expect(group.componentInstance.value).toBeNull();
      expect(checkedFlags(group)).toEqual(['false', 'false', 'false']);
    });

    /**
     * P2-3477 AC9: read-only must be told apart from the defect this ticket reported. Both states
     * paint fifteen buttons that do nothing when clicked, so `[disabled]` alone is not enough —
     * with no visual difference a reporter cannot know whether the form is locked or broken, which
     * is exactly how the original bug reached QA. The track therefore carries a state class and
     * `aria-disabled`, and the chosen score stays painted underneath.
     */
    describe('read-only is visibly distinguishable (P2-3477 AC9)', () => {
      const trackOf = (f: ComponentFixture<PrRadioButtonComponent>): HTMLElement => f.nativeElement.querySelector('[role="radiogroup"]');

      /**
       * Locked BEFORE the first pass, like `preloaded`: flipping `readOnly` between two
       * change-detection runs trips NG0100 on the buttons' own `[disabled]`, which is an artefact
       * of the test and says nothing about the component.
       */
      const renderLocked = (setup: (c: PrRadioButtonComponent) => void): ComponentFixture<PrRadioButtonComponent> => {
        const f = TestBed.createComponent(PrRadioButtonComponent);
        const c = f.componentInstance;
        c.variant = 'segmented';
        c.options = [1, 2, 3].map((id, i) => ({ id, full_name: `(${i}) Score ${i}` }));
        c.optionLabel = 'full_name';
        c.optionValue = 'id';
        c.writeValue(2);
        setup(c);
        f.detectChanges();
        return f;
      };

      it('marks neither the track nor the group while the field is editable', () => {
        const group = renderSegmented([1, 2, 3], 2);

        expect(trackOf(group).classList).not.toContain('segmented-track--readonly');
        expect(trackOf(group).getAttribute('aria-disabled')).toBeNull();
        expect(segmentsOf(group).every(b => b.disabled)).toBe(false);
      });

      it('marks the track read-only and keeps the selected score visible', () => {
        const group = renderLocked(c => (c.readOnly = true));

        expect(trackOf(group).classList).toContain('segmented-track--readonly');
        expect(trackOf(group).getAttribute('aria-disabled')).toBe('true');
        expect(segmentsOf(group).every(b => b.disabled)).toBe(true);
        // The answer must survive the lock: read-only hides the controls, never the data.
        expect(checkedFlags(group)).toEqual(['false', 'true', 'false']);
      });

      it('marks it read-only through the global role too, not only the local input', () => {
        // The `beforeEach` fixture is attached to the same ApplicationRef and reads the same
        // singleton, so flipping the role under it makes the tick raise NG0100 on IT rather than on
        // the fixture under test. This block never uses it.
        fixture.destroy();
        TestBed.inject(RolesService).readOnly = true;
        const group = renderLocked(() => undefined);

        expect(trackOf(group).classList).toContain('segmented-track--readonly');
        expect(trackOf(group).getAttribute('aria-disabled')).toBe('true');
      });

      it('leaves a static (non-editable-by-design) render untouched, as `segmentsDisabled` already does', () => {
        const group = renderLocked(c => {
          c.readOnly = true;
          c.isStatic = true;
        });

        expect(trackOf(group).classList).not.toContain('segmented-track--readonly');
        expect(trackOf(group).getAttribute('aria-disabled')).toBeNull();
      });
    });

    it('emits selectOptionEvent so consumers can run their own side effects', () => {
      const group = renderSegmented();
      const spy = jest.fn();
      group.componentInstance.selectOptionEvent.subscribe(spy);

      segmentsOf(group)[0].click();
      group.detectChanges();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('does not modify value when disabled or readOnly', () => {
      const groupDisabled = renderSegmented([1, 2, 3], null, true, false);
      segmentsOf(groupDisabled)[0].click();
      groupDisabled.detectChanges();
      expect(groupDisabled.componentInstance.value).toBeFalsy();

      const groupReadOnly = renderSegmented([1, 2, 3], null, false, true);
      segmentsOf(groupReadOnly)[0].click();
      groupReadOnly.detectChanges();
      expect(groupReadOnly.componentInstance.value).toBeFalsy();
    });
  });

  describe('list variant is unchanged', () => {
    const radiosOf = (f: ComponentFixture<PrRadioButtonComponent>): HTMLInputElement[] =>
      Array.from(f.nativeElement.querySelectorAll('input.pr-native-radio'));

    it('is still the default variant, and still renders native radios rather than the track', () => {
      const group = renderGroup(['Yes', 'No']);
      expect(group.componentInstance.variant).toBe('list');
      expect(radiosOf(group)).toHaveLength(2);
      expect(group.nativeElement.querySelectorAll('button[role="radio"]')).toHaveLength(0);
      expect(group.nativeElement.querySelector('[role="radiogroup"]')).toBeNull();
    });

    it('writes the value through ngModel when a radio is clicked, and notifies the form', () => {
      const group = renderGroup(['Yes', 'No']);
      const emitted: any[] = [];
      group.componentInstance.registerOnChange((v: any) => emitted.push(v));

      radiosOf(group)[1].click();
      group.detectChanges();

      expect(group.componentInstance.value).toBe(2);
      expect(emitted).toEqual([2]);
    });

    it('keeps `onSelect` deselect-only: it clears the current answer and never sets one', () => {
      const group = renderGroup(['Yes', 'No']);
      const c = group.componentInstance;

      c.writeValue(1);
      c.onSelect(2);
      expect(c.value).toBe(1);

      c.onSelect(1);
      expect(c.value).toBeNull();
    });
  });
});

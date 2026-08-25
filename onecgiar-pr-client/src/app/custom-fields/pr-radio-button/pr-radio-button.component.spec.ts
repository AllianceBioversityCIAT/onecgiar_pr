import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, CUSTOM_ELEMENTS_SCHEMA, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

import { PrRadioButtonComponent } from './pr-radio-button.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

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

  const subGroupOf = (f: ComponentFixture<PrRadioButtonComponent>): HTMLElement | null =>
    f.nativeElement.querySelector('.radioButton__subGroup');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrRadioButtonComponent, PrCheckboxStubComponent, PrInputStubComponent],
      imports: [HttpClientTestingModule, FormsModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

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
    const names: string[] = Array.from(group.nativeElement.querySelectorAll('input.pr-native-radio')).map(
      (i: any) => i.getAttribute('name')
    );

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
});

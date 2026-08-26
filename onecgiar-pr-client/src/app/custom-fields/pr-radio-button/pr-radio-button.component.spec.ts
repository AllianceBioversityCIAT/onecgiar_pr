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
    /**
     * The Impact Area shape: `full_name` is `(${id - 1}) ${title}`, which is what the track splits
     * into a mono digit + wording. Values are passed in so a group can be built with `0` as a real,
     * selectable answer.
     */
    const renderSegmented = (values: any[] = [1, 2, 3], preloaded: any = null): ComponentFixture<PrRadioButtonComponent> => {
      const f = TestBed.createComponent(PrRadioButtonComponent);
      const c = f.componentInstance;
      c.variant = 'segmented';
      c.options = values.map((id, i) => ({ id, full_name: `(${i}) Score ${i}` }));
      c.optionLabel = 'full_name';
      c.optionValue = 'id';
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
      // The form is told: this is what makes the section complete and the PATCH fire.
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

    /**
     * ⚠️ The regression to guard forever: on a `0 / 1 / 2` scale, `0` is a legitimate score
     * ("Not targeted"). Any falsy test in the write path leaves the lowest score as the one answer
     * that cannot be given — i.e. Gender and Climate broken exactly where most results sit.
     */
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
      // The class the mandatory-field scan reads must agree with `hasValue`.
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

    it('emits selectOptionEvent so consumers can run their own side effects', () => {
      const group = renderSegmented();
      const spy = jest.fn();
      group.componentInstance.selectOptionEvent.subscribe(spy);

      segmentsOf(group)[0].click();
      group.detectChanges();

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * Non-regression: the segmented fix must not reach the list variant, whose write path is the
   * `[(ngModel)]` on the native radio and is untouched by it.
   *
   * These cases assert the VALUE contract and the rendered shape, not `input.checked`: under jsdom
   * the radio's checkedness is reverted between the capture and the bubble phase of the very same
   * click, so asserting it would pin an artifact of the test environment rather than the component.
   * Real-browser coverage of the list variant lives in `pr-radio-button.cy.ts`.
   */
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

    /**
     * The list's `(click)` still routes to the bare `onSelect`, which ONLY deselects — the selection
     * itself comes from `[(ngModel)]`. `onSegmentSelect` must not have leaked into this path, and
     * `onSelect` must not have grown a select branch of its own.
     */
    it('keeps `onSelect` deselect-only: it clears the current answer and never sets one', () => {
      const group = renderGroup(['Yes', 'No']);
      const c = group.componentInstance;

      // A different option: the click handler alone writes nothing (ngModel does that).
      c.writeValue(1);
      c.onSelect(2);
      expect(c.value).toBe(1);

      // The selected one: cleared, as it has been since LFUB-567.
      c.onSelect(1);
      expect(c.value).toBeNull();
    });
  });
});

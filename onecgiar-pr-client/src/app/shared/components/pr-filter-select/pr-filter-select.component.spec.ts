import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrFilterSelectComponent } from './pr-filter-select.component';

describe('PrFilterSelectComponent', () => {
  let component: PrFilterSelectComponent;
  let fixture: ComponentFixture<PrFilterSelectComponent>;

  const OPTIONS = [
    { label: 'Knowledge product', value: 'kp' },
    { label: 'Innovation use', value: 'iu' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PrFilterSelectComponent] }).compileComponents();
    fixture = TestBed.createComponent(PrFilterSelectComponent);
    component = fixture.componentInstance;
    component.options = OPTIONS;
    component.optionLabel = 'label';
    component.optionValue = 'value';
    component.placeholder = 'Category';
    fixture.detectChanges();
  });

  it('shows the placeholder while nothing is picked', () => {
    expect(component.hasValue).toBe(false);
    expect(component.triggerLabel).toBe('Category');
  });

  it('picking an option stores its value and shows its label', () => {
    const changed = jest.spyOn(component.changed, 'emit');
    component.pick(OPTIONS[0], null);

    expect(component.value).toBe('kp');
    expect(component.triggerLabel).toBe('Knowledge product');
    expect(changed).toHaveBeenCalledWith('kp');
  });

  it('picking the active option again clears back to the empty value', () => {
    component.pick(OPTIONS[0], null);
    component.pick(OPTIONS[0], null);

    expect(component.value).toBe('all');
    expect(component.hasValue).toBe(false);
    expect(component.triggerLabel).toBe('Category');
  });

  it('honours a custom emptyValue', () => {
    component.emptyValue = '';
    component.writeValue('');

    expect(component.hasValue).toBe(false);
    expect(component.triggerLabel).toBe('Category');
  });

  it('holds whole objects when optionValue is not set', () => {
    component.optionValue = undefined;
    component.pick(OPTIONS[1], null);

    expect(component.value).toEqual(OPTIONS[1]);
    expect(component.isSelected(OPTIONS[1])).toBe(true);
    expect(component.isSelected(OPTIONS[0])).toBe(false);
  });

  it('does not react while disabled', () => {
    component.setDisabledState(true);
    component.pick(OPTIONS[0], null);

    expect(component.value).toBeNull();
  });

  it('falls back to the placeholder when the stored value is not in the options', () => {
    component.writeValue('gone');

    expect(component.hasValue).toBe(true);
    expect(component.triggerLabel).toBe('Category');
  });

  it('propagates changes through the ControlValueAccessor hooks', () => {
    const onChange = jest.fn();
    const onTouched = jest.fn();
    component.registerOnChange(onChange);
    component.registerOnTouched(onTouched);

    component.pick(OPTIONS[0], null);
    expect(onChange).toHaveBeenCalledWith('kp');

    component.removeFocus(null);
    expect(onTouched).toHaveBeenCalled();
  });

  it('renders one row per option and marks the active one', () => {
    component.writeValue('iu');
    fixture.detectChanges();

    const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.option'));
    expect(rows.length).toBe(2);
    expect(rows[1].classList).toContain('is-active');
    expect(rows[0].classList).not.toContain('is-active');
  });
});

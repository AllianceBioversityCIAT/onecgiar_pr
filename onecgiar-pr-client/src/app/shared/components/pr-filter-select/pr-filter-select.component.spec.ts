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

  describe('filter search', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('filter', true);
      fixture.componentRef.setInput('filterPlaceholder', 'Search item...');
      fixture.detectChanges();
    });

    it('renders search input when filter is enabled', () => {
      const searchContainer = fixture.nativeElement.querySelector('.search_input_container');
      expect(searchContainer).toBeTruthy();

      const input: HTMLInputElement = searchContainer.querySelector('input');
      expect(input).toBeTruthy();
      expect(input.placeholder).toBe('Search item...');
    });

    it('filters options case-insensitively based on searchText', () => {
      component.searchText = 'knowledge';
      expect(component.filteredOptions.length).toBe(1);
      expect(component.filteredOptions[0].value).toBe('kp');

      component.searchText = 'INNOVATION';
      expect(component.filteredOptions.length).toBe(1);
      expect(component.filteredOptions[0].value).toBe('iu');

      component.searchText = 'non-existent';
      expect(component.filteredOptions.length).toBe(0);

      fixture.detectChanges();
      const noInfo = fixture.nativeElement.querySelector('.no_info');
      expect(noInfo).toBeTruthy();
      expect(noInfo.textContent).toContain('No information found');
    });

    it('clears searchText and restores all options with clearSearch', () => {
      component.searchText = 'knowledge';
      component.clearSearch();

      expect(component.searchText).toBe('');
      expect(component.filteredOptions.length).toBe(2);
    });

    it('picks single matching option on Enter key press', () => {
      const emitSpy = jest.spyOn(component.changed, 'emit');
      component.searchText = 'knowledge';

      component.onSearchEnter();
      expect(component.value).toBe('kp');
      expect(emitSpy).toHaveBeenCalledWith('kp');
      expect(component.searchText).toBe('');
    });

    it('does not pick option on Enter if there are multiple matches or zero matches', () => {
      const emitSpy = jest.spyOn(component.changed, 'emit');
      component.searchText = ''; // 2 matches
      component.onSearchEnter();
      expect(emitSpy).not.toHaveBeenCalled();

      component.searchText = 'xyz'; // 0 matches
      component.onSearchEnter();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('clears searchText when an option is picked or removeFocus is called', () => {
      component.searchText = 'knowledge';
      component.pick(OPTIONS[0]);
      expect(component.searchText).toBe('');

      component.searchText = 'something';
      component.removeFocus();
      expect(component.searchText).toBe('');
    });
  });
});

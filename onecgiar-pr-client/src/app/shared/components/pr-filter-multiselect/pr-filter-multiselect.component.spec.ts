import { PrFilterMultiselectComponent } from './pr-filter-multiselect.component';

/**
 * P2-3307 / P2-3308 — "Contributing Science Programs" and "Contributing W3/Bilateral Projects"
 * were reported as losing or toggling selections.
 *
 * The dropdown compared model entries with `===`. Without `optionValue` the model holds whole
 * option objects, so a selection preloaded from a different response — an equal object, but not
 * the same instance — rendered as unselected, and clicking it appended a duplicate instead of
 * removing it. These tests fail against that identity comparison.
 */
describe('PrFilterMultiselectComponent — value equality (P2-3307 / P2-3308)', () => {
  const OPTIONS = [
    { id: 1, name: 'SP01' },
    { id: 2, name: 'SP03' },
    { id: 3, name: 'SP12' }
  ];

  let component: PrFilterMultiselectComponent;

  beforeEach(() => {
    component = new PrFilterMultiselectComponent();
    component.options = OPTIONS;
    component.optionLabel = 'name';
  });

  it('marks a preselected option as selected even when it is a copy, not the same instance', () => {
    component.writeValue([{ ...OPTIONS[0] }]);

    expect(component.isSelected(OPTIONS[0])).toBe(true);
    expect(component.isSelected(OPTIONS[1])).toBe(false);
  });

  it('removes a preselected copy on click instead of appending a duplicate', () => {
    component.writeValue([{ ...OPTIONS[0] }]);

    component.toggle(OPTIONS[0]);

    expect(component.value).toEqual([]);
  });

  it('accumulates selections across consecutive clicks', () => {
    component.writeValue([]);

    component.toggle(OPTIONS[0]);
    component.toggle(OPTIONS[1]);
    component.toggle(OPTIONS[2]);

    expect(component.value).toHaveLength(3);
    expect(OPTIONS.every(o => component.isSelected(o))).toBe(true);
  });

  it('keeps the earlier selections when a later one is removed', () => {
    component.writeValue([{ ...OPTIONS[0] }, { ...OPTIONS[1] }]);

    component.toggle(OPTIONS[1]);

    expect(component.isSelected(OPTIONS[0])).toBe(true);
    expect(component.isSelected(OPTIONS[1])).toBe(false);
  });

  it('still compares primitives by value when optionValue is set', () => {
    component.optionValue = 'id';
    component.writeValue([1]);

    expect(component.isSelected(OPTIONS[0])).toBe(true);

    component.toggle(OPTIONS[1]);
    expect(component.value).toEqual([1, 2]);
  });

  it('does not treat two different options as equal', () => {
    component.writeValue([{ ...OPTIONS[0] }]);

    expect(component.isSelected(OPTIONS[1])).toBe(false);
    expect(component.isSelected(OPTIONS[2])).toBe(false);
  });

  it('emits the new array on every toggle', () => {
    const emitted: any[][] = [];
    component.changed.subscribe(v => emitted.push(v));
    component.writeValue([]);

    component.toggle(OPTIONS[0]);
    component.toggle(OPTIONS[0]);

    expect(emitted).toHaveLength(2);
    expect(emitted[0]).toHaveLength(1);
    expect(emitted[1]).toHaveLength(0);
  });
});

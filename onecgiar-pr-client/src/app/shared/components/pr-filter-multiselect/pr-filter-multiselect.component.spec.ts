import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrFilterMultiselectComponent } from './pr-filter-multiselect.component';
import { PrFilterMultiselectModule } from './pr-filter-multiselect.module';

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

// @akili-spec changes/my-work-board (MWB-T-13)
/**
 * The panel is shown by `.field:focus-within`, so the dropdown stays open only while focus stays
 * inside it. Every row node destroyed mid-interaction takes the focused checkbox with it: focus
 * falls back to `<body>`, `:focus-within` goes false and the panel closes — measured by MWB-T-14
 * on the Results tab's Section control, where ticking one option closed the popover.
 *
 * Two sources of that churn, both fixed inside the control:
 *   1. grouped mode rebuilt `{ label, children }` wrappers on EVERY change-detection pass, so the
 *      outer `*ngFor` (identity `trackBy`) destroyed and recreated every group and every row;
 *   2. neither `*ngFor` declared a `trackBy`, so a fresh `options` array carrying equal-but-new
 *      option objects recreated every row as well.
 *
 * These tests assert the DOM NODES survive, not that a method was called — they are what tells a
 * refactor of the memo apart from a regression of the panel.
 */
describe('PrFilterMultiselectComponent — row identity across change detection (MWB-T-13)', () => {
  const FLAT = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Gamma' }
  ];
  const GROUPED = [
    { label: 'Areas of work', items: [{ value: 'AOW01', label: 'AOW01' }, { value: 'AOW02', label: 'AOW02' }] },
    { label: 'Program-level', items: [{ value: 'UNTAGGED', label: 'Not tagged' }] }
  ];

  const copyFlat = () => FLAT.map(option => ({ ...option }));
  const copyGrouped = () => GROUPED.map(group => ({ ...group, items: group.items.map(item => ({ ...item })) }));

  let fixture: ComponentFixture<PrFilterMultiselectComponent>;
  let component: PrFilterMultiselectComponent;

  const rows = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('.option'));
  const checkboxes = (): HTMLInputElement[] => Array.from(fixture.nativeElement.querySelectorAll('.option .pr-native-check'));
  const labels = (): string[] => rows().map(row => (row.querySelector('.label') as HTMLElement).textContent.trim());
  /**
   * Node-IDENTITY comparison. `expect(rows()).toEqual(before)` is NOT this: jest compares DOM
   * nodes structurally, so a fully recreated row list passes it — the exact false green this
   * whole describe exists to catch.
   */
  const expectSameRows = (before: HTMLElement[]): void => {
    const now = rows();
    expect(now).toHaveLength(before.length);
    now.forEach((row, index) => expect(row).toBe(before[index]));
  };
  /** Re-binds `options` the way a parent template would, so the pass is a real input change. */
  const setOptions = (options: any[]): void => {
    fixture.componentRef.setInput('options', options);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PrFilterMultiselectModule] }).compileComponents();

    fixture = TestBed.createComponent(PrFilterMultiselectComponent);
    component = fixture.componentInstance;
    component.optionLabel = 'label';
    component.optionValue = 'value';
  });

  describe('flat mode', () => {
    beforeEach(() => {
      component.options = copyFlat();
      fixture.detectChanges();
    });

    it('keeps the clicked row node — and the focus inside it — when an option is selected', () => {
      const before = rows();
      const checkbox = checkboxes()[0];
      checkbox.focus();
      expect(document.activeElement).toBe(checkbox);

      checkbox.click();
      fixture.detectChanges();

      expect(component.value).toEqual(['a']);
      expect(rows()[0]).toBe(before[0]);
      expect(rows()[1]).toBe(before[1]);
      expect(checkbox.isConnected).toBe(true);
      expect(document.activeElement).toBe(checkbox);
    });

    it('does not recreate rows when a fresh options array with equal content arrives', () => {
      const before = rows();

      setOptions(copyFlat());

      expectSameRows(before);
    });

    it('still re-renders when the options really change', () => {
      setOptions([{ value: 'a', label: 'Alpha' }, { value: 'z', label: 'Zeta' }]);

      expect(labels()).toEqual(['Alpha', 'Zeta']);
    });

    it('returns the same filteredOptions instance until the search text changes', () => {
      component.filter = true;
      component.searchText = 'a';
      const first = component.filteredOptions;

      expect(component.filteredOptions).toBe(first);

      component.searchText = 'al';
      expect(component.filteredOptions).not.toBe(first);
      expect(component.filteredOptions.map(o => o.value)).toEqual(['a']);
    });
  });

  describe('grouped mode', () => {
    beforeEach(() => {
      component.group = true;
      component.optionGroupLabel = 'label';
      component.optionGroupChildren = 'items';
      component.options = copyGrouped();
      fixture.detectChanges();
    });

    it('keeps the clicked row node — and the focus inside it — when an option is selected', () => {
      const before = rows();
      const checkbox = checkboxes()[0];
      checkbox.focus();
      expect(document.activeElement).toBe(checkbox);

      checkbox.click();
      fixture.detectChanges();

      expect(component.value).toEqual(['AOW01']);
      expect(rows()[0]).toBe(before[0]);
      expect(rows()[1]).toBe(before[1]);
      expect(rows()[2]).toBe(before[2]);
      expect(checkbox.isConnected).toBe(true);
      expect(document.activeElement).toBe(checkbox);
    });

    it('keeps every row node across a change-detection pass that changed nothing', () => {
      const before = rows();

      fixture.detectChanges();

      expectSameRows(before);
    });

    it('does not recreate rows when a fresh grouped options array with equal content arrives', () => {
      const before = rows();

      setOptions(copyGrouped());

      expectSameRows(before);
    });

    it('still re-renders when a group really changes', () => {
      const next = copyGrouped();
      next[0].items = [{ value: 'AOW03', label: 'AOW03' }];
      setOptions(next);

      expect(labels()).toEqual(['AOW03', 'Not tagged']);
    });

    it('returns the same filteredGroups instance until the search text changes', () => {
      component.filter = true;
      component.searchText = 'aow';
      const first = component.filteredGroups;

      expect(component.filteredGroups).toBe(first);

      component.searchText = 'aow0';
      expect(component.filteredGroups).not.toBe(first);
    });
  });
});

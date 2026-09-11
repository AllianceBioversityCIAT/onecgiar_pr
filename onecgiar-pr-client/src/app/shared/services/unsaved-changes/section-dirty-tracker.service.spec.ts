import { SectionDirtyTrackerService } from './section-dirty-tracker.service';

describe('SectionDirtyTrackerService', () => {
  let service: SectionDirtyTrackerService;

  beforeEach(() => {
    service = new SectionDirtyTrackerService();
  });

  it('is false before any snapshot() call', () => {
    expect(service.isDirty({ a: 1 })).toBe(false);
  });

  it('is false immediately after snapshot(value) with that same value', () => {
    const value = { a: 1, b: [1, 2, 3] };

    service.snapshot(value);

    expect(service.isDirty(value)).toBe(false);
  });

  it('is true after snapshot(value) then mutating a field on value (same reference) and re-checking', () => {
    const value = { a: 1, b: [1, 2, 3] };

    service.snapshot(value);
    value.a = 2; // mutate in place — reference never changes

    expect(service.isDirty(value)).toBe(true);
  });

  it('does not let a later mutation of the original object retroactively change the stored snapshot', () => {
    const value = { a: 1 };

    service.snapshot(value);
    value.a = 999; // mutate the original AFTER snapshotting it

    // The stored baseline is still "{ a: 1 }" — proves snapshot() cloned the
    // value at call time rather than keeping a live reference to it.
    expect(service.isDirty({ a: 1 })).toBe(false);
    expect(service.isDirty({ a: 999 })).toBe(true);
  });
});

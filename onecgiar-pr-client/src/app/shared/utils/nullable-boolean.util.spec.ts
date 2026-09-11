import { toNullableBoolean } from './nullable-boolean.util';

describe('toNullableBoolean', () => {
  // The reported defect: MySQL `tinyint(1)` travels as a number, and `1 === true` is false.
  it('turns the tinyint a MySQL flag arrives as into a real boolean', () => {
    expect(toNullableBoolean(1)).toBe(true);
    expect(toNullableBoolean(0)).toBe(false);
  });

  it('leaves an actual boolean alone', () => {
    expect(toNullableBoolean(true)).toBe(true);
    expect(toNullableBoolean(false)).toBe(false);
  });

  // 🥇 "Not answered" is a third state the screen depends on. Collapsing it to false would report
  // an unanswered mandatory question as answered.
  it('keeps "not answered" as null', () => {
    expect(toNullableBoolean(null)).toBeNull();
    expect(toNullableBoolean(undefined)).toBeNull();
    expect(toNullableBoolean('')).toBeNull();
  });

  it('reads the string forms a query layer can hand back', () => {
    expect(toNullableBoolean('1')).toBe(true);
    expect(toNullableBoolean('0')).toBe(false);
    expect(toNullableBoolean('true')).toBe(true);
    expect(toNullableBoolean(' FALSE ')).toBe(false);
  });

  // A shape nobody planned for is not an answer. It must not become a confident "No".
  it('returns null for a value it cannot read, never a guess', () => {
    expect(toNullableBoolean('maybe')).toBeNull();
    expect(toNullableBoolean({})).toBeNull();
    expect(toNullableBoolean([])).toBeNull();
  });
});

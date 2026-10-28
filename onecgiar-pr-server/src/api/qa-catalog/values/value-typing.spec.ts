// @akili-spec quality-assurance/qa-results-feed
// QRF-R-7 / QRF-DD-9: typing by field type. Expected values are literals from the requirement, not recomputed.
import { emptyValue, isScalarType, typeScalar } from './value-typing';

describe('typeScalar (QRF-DD-9)', () => {
  it('boolean: tinyint 0 is false and 1 is true, never the driver number', () => {
    expect(typeScalar('boolean', 0)).toBe(false);
    expect(typeScalar('boolean', 1)).toBe(true);
    expect(typeScalar('boolean', Buffer.from([0]))).toBe(false);
    expect(typeScalar('boolean', Buffer.from([1]))).toBe(true);
    expect(typeScalar('boolean', '0')).toBe(false);
    expect(typeScalar('boolean', null)).toBeNull();
  });

  it('number: DECIMAL strings become numbers; unparseable or empty is null', () => {
    expect(typeScalar('number', '12.50')).toBe(12.5);
    expect(typeScalar('number', 7)).toBe(7);
    expect(typeScalar('number', 0)).toBe(0);
    expect(typeScalar('number', '')).toBeNull();
    expect(typeScalar('number', 'n/a')).toBeNull();
    expect(typeScalar('number', null)).toBeNull();
  });

  it('date: DATETIME is ISO-8601 UTC, read from the stored wall clock whatever the process zone', () => {
    // `new Date(y, m, d, h, mi, s)` is what mysql2 builds from the stored text in `local` mode
    expect(typeScalar('date', new Date(2026, 0, 2, 3, 4, 5, 6))).toBe(
      '2026-01-02T03:04:05.006Z',
    );
    expect(typeScalar('date', '2026-03-04 05:06:07')).toBe(
      '2026-03-04T05:06:07.000Z',
    );
  });

  it('date: a DATE column is YYYY-MM-DD', () => {
    expect(
      typeScalar('date', new Date(2026, 5, 30), { temporal: 'date' }),
    ).toBe('2026-06-30');
    expect(typeScalar('date', '2026-06-30', { temporal: 'date' })).toBe(
      '2026-06-30',
    );
    expect(typeScalar('date', null, { temporal: 'date' })).toBeNull();
    expect(typeScalar('date', new Date('invalid'))).toBeNull();
  });

  it('text: strings pass through (empty string is a stored value), null stays null', () => {
    expect(typeScalar('text', 'a')).toBe('a');
    expect(typeScalar('text', '')).toBe('');
    expect(typeScalar('text', Buffer.from('b'))).toBe('b');
    expect(typeScalar('text', null)).toBeNull();
  });

  it('single_select: the stored option id as is', () => {
    expect(typeScalar('single_select', 4)).toBe(4);
    expect(typeScalar('single_select', 'merge')).toBe('merge');
    expect(typeScalar('single_select', 0)).toBe(0);
    expect(typeScalar('single_select', null)).toBeNull();
  });
});

describe('emptyValue (QRF-R-7: present with null, [] for multi_select / list)', () => {
  it.each([
    ['multi_select', []],
    ['list', []],
    ['text', null],
    ['number', null],
    ['boolean', null],
    ['date', null],
    ['single_select', null],
    ['object', null],
  ] as const)('%s -> %j', (type, expected) => {
    expect(emptyValue(type)).toEqual(expected);
  });
});

describe('isScalarType', () => {
  it('splits scalar from collection types', () => {
    expect(
      ['text', 'number', 'boolean', 'date', 'single_select'].every((t) =>
        isScalarType(t as never),
      ),
    ).toBe(true);
    expect(
      ['multi_select', 'list', 'object'].some((t) => isScalarType(t as never)),
    ).toBe(false);
  });
});

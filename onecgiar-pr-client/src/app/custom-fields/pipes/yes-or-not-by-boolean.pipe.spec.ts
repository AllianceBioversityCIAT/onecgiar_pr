import { YesOrNotByBooleanPipe } from './yes-or-not-by-boolean.pipe';

describe('YesOrNotByBooleanPipe', () => {
  let pipe: YesOrNotByBooleanPipe;

  beforeEach(() => {
    pipe = new YesOrNotByBooleanPipe();
  });

  it('should transform true to "Yes"', () => {
    const result = pipe.transform(true);
    expect(result).toBe('Yes');
  });

  it('should transform false to "No"', () => {
    const result = pipe.transform(false);
    expect(result).toBe('No');
  });

  it('should return the same value', () => {
    const value = 'SomeValue';
    const result = pipe.transform(value);
    expect(result).toBe(value);
  });
});

import { ReversePipe } from './reverse.pipe';

describe('ReversePipe', () => {
  let pipe: ReversePipe;

  beforeEach(() => {
    pipe = new ReversePipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should reverse an array of numbers', () => {
    const input = [1, 2, 3, 4, 5];
    const expected = [5, 4, 3, 2, 1];
    expect(pipe.transform(input)).toEqual(expected);
  });

  it('should reverse an array of strings', () => {
    const input = ['a', 'b', 'c'];
    const expected = ['c', 'b', 'a'];
    expect(pipe.transform(input)).toEqual(expected);
  });

  it('should reverse an array of objects', () => {
    const input = [
      { id: 1, name: 'First' },
      { id: 2, name: 'Second' },
      { id: 3, name: 'Third' }
    ];
    const expected = [
      { id: 3, name: 'Third' },
      { id: 2, name: 'Second' },
      { id: 1, name: 'First' }
    ];
    expect(pipe.transform(input)).toEqual(expected);
  });

  it('should return an empty array when input is empty', () => {
    const input: any[] = [];
    expect(pipe.transform(input)).toEqual([]);
  });

  it('should not modify the original array', () => {
    const input = [1, 2, 3];
    const originalCopy = [...input];
    pipe.transform(input);
    expect(input).toEqual(originalCopy);
  });

  it('should handle null or undefined gracefully', () => {
    expect(pipe.transform(null as any)).toBeNull();
    expect(pipe.transform(undefined as any)).toBeUndefined();
  });

  it('should return the same value if input is not an array', () => {
    const nonArrayInput = 'not an array' as any;
    expect(pipe.transform(nonArrayInput)).toBe(nonArrayInput);
  });
});


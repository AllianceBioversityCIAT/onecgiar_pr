import { countWords } from './count-words';

const words = (n: number, sep = ' ') =>
  Array.from({ length: n }, (_, i) => `w${i}`).join(sep);

describe('countWords', () => {
  it('returns 0 for empty, whitespace-only, null and undefined', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   \n\t ')).toBe(0);
    expect(countWords(null)).toBe(0);
    expect(countWords(undefined)).toBe(0);
  });

  it('ignores leading, trailing and repeated whitespace', () => {
    expect(countWords('  a\n\tb  ')).toBe(2);
    expect(countWords('one')).toBe(1);
    expect(countWords('a    b')).toBe(2);
  });

  it('counts 99, 100 and 101 words', () => {
    expect(countWords(words(99))).toBe(99);
    expect(countWords(words(100))).toBe(100);
    expect(countWords(words(101))).toBe(101);
  });

  it('counts 100 words joined by mixed whitespace', () => {
    const seps = [' ', '\n', '\t', '  ', '\r\n'];
    const text = Array.from(
      { length: 100 },
      (_, i) => `w${i}${i < 99 ? seps[i % seps.length] : ''}`,
    ).join('');
    expect(countWords(`  ${text}\n`)).toBe(100);
  });

  it('treats U+00A0 and U+3000 as separators (FP-7)', () => {
    expect(countWords('a b')).toBe(2);
    expect(countWords('a　b')).toBe(2);
    expect(countWords(' a 　b　')).toBe(2);
  });

  it('aligns with MySQL ICU [[:space:]]: U+0085 separates words, U+FEFF does not (FP-7 / FP-9)', () => {
    expect(countWords('ab')).toBe(2);
    expect(countWords('a')).toBe(1);
    // U+FEFF is JS-only whitespace: it is NOT a separator nor trimmed, so it is part of a word
    expect(countWords('a﻿b')).toBe(1);
    expect(countWords('﻿')).toBe(1);
    expect(countWords('a ﻿ b')).toBe(3);
  });
});

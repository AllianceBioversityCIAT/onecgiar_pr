import { alignPtEmptyNotice } from './pt-empty-notice';

/** The sentence Progress Tracker sends for an empty KPI, written as if the indicator were a knowledge product. */
const PT_KP_EMPTY_NOTICE =
  "No knowledge product for this KPI was found in the Progress Tracker evidence. The evidence shows another kind of output, such as an event or meeting (other output) and an innovation (innovation development), which don't count toward this indicator. The Progress Tracker lists them with the reason.";

/**
 * The sentence observed on SP08 CARR-F. The matching example is named before "such as",
 * not only inside that list. This is the text PT sends, before the panel rewrites it.
 */
const PT_LEADING_EXAMPLE_NOTICE =
  "No knowledge product for this KPI was found in the Progress Tracker evidence. The evidence shows an innovation (innovation development) and another kind of output, such as an event or meeting (other output), which don't count toward this indicator. The Progress Tracker lists them with the reason.";

describe('alignPtEmptyNotice', () => {
  it('keeps a knowledge product notice, including the examples that do not count toward it', () => {
    expect(alignPtEmptyNotice(PT_KP_EMPTY_NOTICE, 'Knowledge product')).toBe(PT_KP_EMPTY_NOTICE);
  });

  it('names innovation development and does not say that category fails to count', () => {
    const text = alignPtEmptyNotice(PT_KP_EMPTY_NOTICE, 'Innovation development');
    expect(text).toBe(
      "No innovation development for this KPI was found in the Progress Tracker evidence. The evidence shows another kind of output, such as an event or meeting (other output), which doesn't count toward this indicator. The Progress Tracker lists them with the reason."
    );
    expect(text).not.toContain('(innovation development)');
    expect(text).not.toMatch(/\bNo knowledge product\b/);
  });

  it('names a third category with the same sentence, and still lists the other kinds of output', () => {
    const text = alignPtEmptyNotice(PT_KP_EMPTY_NOTICE, 'Policy change');
    expect(text).toContain('No policy change for this KPI was found');
    expect(text).toContain('an event or meeting (other output) and an innovation (innovation development)');
    expect(text).toContain("which don't count toward this indicator");
    expect(text).not.toMatch(/\bNo knowledge product\b/);
  });

  it('accepts a result-type slug and a capacity-sharing label', () => {
    expect(alignPtEmptyNotice('No knowledge product for this KPI was found.', 'innovation_use')).toBe('No innovation use for this KPI was found.');
    expect(alignPtEmptyNotice(PT_KP_EMPTY_NOTICE, 'Capacity sharing for development')).toContain(
      'No capacity sharing for development for this KPI was found'
    );
  });

  it('leaves the sentence alone when the category is missing or is not a result type', () => {
    expect(alignPtEmptyNotice(PT_KP_EMPTY_NOTICE, null)).toBe(PT_KP_EMPTY_NOTICE);
    expect(alignPtEmptyNotice(PT_KP_EMPTY_NOTICE, '')).toBe(PT_KP_EMPTY_NOTICE);
    expect(alignPtEmptyNotice(PT_KP_EMPTY_NOTICE, 'Number of innovations profiled')).toBe(PT_KP_EMPTY_NOTICE);
  });

  it('does not rewrite a notice that is not the knowledge-product empty sentence', () => {
    expect(alignPtEmptyNotice('Nothing reportable yet.', 'Innovation development')).toBe('Nothing reportable yet.');
    expect(alignPtEmptyNotice('AI drafting is busy.', 'Policy change')).toBe('AI drafting is busy.');
    expect(alignPtEmptyNotice('  ', 'Innovation development')).toBeNull();
    expect(alignPtEmptyNotice(null, 'Innovation development')).toBeNull();
  });

  it('drops every example once each one is the indicator category', () => {
    const notice =
      'No knowledge product for this KPI was found in the Progress Tracker evidence. The evidence shows another kind of output, such as an innovation (innovation development), which does not count toward this indicator.';
    expect(alignPtEmptyNotice(notice, 'Innovation development')).toBe(
      'No innovation development for this KPI was found in the Progress Tracker evidence. The evidence shows another kind of output, which does not count toward this indicator.'
    );
  });

  it('rewrites the real CARR-F sentence, where the matching example comes before such as', () => {
    const text = alignPtEmptyNotice(PT_LEADING_EXAMPLE_NOTICE, 'Innovation development');
    expect(text).toBe(
      "No innovation development for this KPI was found in the Progress Tracker evidence. The evidence shows another kind of output, such as an event or meeting (other output), which doesn't count toward this indicator. The Progress Tracker lists them with the reason."
    );
    expect(text).not.toContain('(innovation development)');
  });

  it('leaves that same Progress Tracker sentence unchanged for a knowledge product', () => {
    expect(alignPtEmptyNotice(PT_LEADING_EXAMPLE_NOTICE, 'Knowledge product')).toBe(PT_LEADING_EXAMPLE_NOTICE);
  });

  it('drops every example on both sides when each one is the expected category', () => {
    const notice =
      "No knowledge product for this KPI was found in the Progress Tracker evidence. The evidence shows an innovation (innovation development) and another kind of output, such as a prototype (innovation development), which don't count toward this indicator.";
    expect(alignPtEmptyNotice(notice, 'Innovation development')).toBe(
      "No innovation development for this KPI was found in the Progress Tracker evidence. The evidence shows another kind of output, which doesn't count toward this indicator."
    );
  });

  it('keeps one other example that sits before such as, and uses the singular verb', () => {
    const notice =
      "No knowledge product for this KPI was found in the Progress Tracker evidence. The evidence shows an event or meeting (other output) and an innovation (innovation development) and another kind of output, such as a prototype (innovation development), which don't count toward this indicator.";
    expect(alignPtEmptyNotice(notice, 'Innovation development')).toBe(
      "No innovation development for this KPI was found in the Progress Tracker evidence. The evidence shows an event or meeting (other output) and another kind of output, which doesn't count toward this indicator."
    );
  });

  it('keeps several other examples from both sides of such as, and uses the plural verb', () => {
    const notice =
      "No knowledge product for this KPI was found in the Progress Tracker evidence. The evidence shows a paper (knowledge product) and an innovation (innovation development) and another kind of output, such as an event or meeting (other output) and a training (capacity sharing for development), which don't count toward this indicator.";
    const text = alignPtEmptyNotice(notice, 'Innovation development');
    expect(text).toBe(
      "No innovation development for this KPI was found in the Progress Tracker evidence. The evidence shows a paper (knowledge product) and another kind of output, such as an event or meeting (other output) and a training (capacity sharing for development), which don't count toward this indicator."
    );
    expect(text).not.toContain('(innovation development)');
  });
});

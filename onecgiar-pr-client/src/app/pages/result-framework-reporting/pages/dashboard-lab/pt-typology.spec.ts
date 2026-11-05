import { canonicalResultType, ptTypologyTone } from './pt-typology';

describe('pt-typology', () => {
  it('recognises the Progress Tracker slugs and the PRMS row labels, and nothing else', () => {
    expect(canonicalResultType('knowledge_product')).toBe('knowledge_product');
    expect(canonicalResultType('Knowledge product')).toBe('knowledge_product');
    expect(canonicalResultType('Innovation development')).toBe('innovation_development');
    expect(canonicalResultType('Capacity sharing for development')).toBe('capacity_sharing');
    expect(canonicalResultType('Number of knowledge products')).toBeNull();
    expect(canonicalResultType('')).toBeNull();
    expect(canonicalResultType(null)).toBeNull();
  });

  it('is blue only when every drafted type is the indicator category, yellow when one differs, and blank otherwise', () => {
    expect(ptTypologyTone('Knowledge product', ['knowledge_product'])).toBe('aligned');
    expect(ptTypologyTone('Knowledge product', ['knowledge_product', 'Knowledge product'])).toBe('aligned');
    expect(ptTypologyTone('Knowledge product', ['innovation_development'])).toBe('divergent');
    expect(ptTypologyTone('Knowledge product', ['knowledge_product', 'innovation_development'])).toBe('divergent');
    expect(ptTypologyTone('Knowledge product', [])).toBe('none');
    expect(ptTypologyTone('Knowledge product', ['custom'])).toBe('none');
    expect(ptTypologyTone('', ['knowledge_product'])).toBe('none');
    expect(ptTypologyTone(null, ['knowledge_product'])).toBe('none');
  });
});

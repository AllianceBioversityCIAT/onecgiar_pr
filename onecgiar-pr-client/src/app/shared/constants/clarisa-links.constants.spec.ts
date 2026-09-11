import { CLARISA_GLOSSARY_URL } from './clarisa-links.constants';

describe('clarisa-links constants', () => {
  it('exports the canonical CLARISA glossary landing page URL (P2-3145)', () => {
    expect(CLARISA_GLOSSARY_URL).toBe('https://clarisa.cgiar.org/landing-page/glossary');
  });
});

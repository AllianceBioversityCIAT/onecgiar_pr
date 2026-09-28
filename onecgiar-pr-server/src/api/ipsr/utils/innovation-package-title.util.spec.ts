import {
  INNOVATION_PACKAGE_TITLE_PREFIX,
  buildInnovationPackageTitle,
  joinGeoScopeNames,
  INNOVATION_PACKAGE_TITLE_MAX_WORDS,
  fitCoreTitleToCap,
} from './innovation-package-title.util';

describe('joinGeoScopeNames', () => {
  it('renders one, two and three or more names', () => {
    expect(joinGeoScopeNames(['Kenya'])).toBe('Kenya');
    expect(joinGeoScopeNames(['Kenya', 'Morocco'])).toBe('Kenya and Morocco');
    expect(joinGeoScopeNames(['Kenya', 'Morocco', 'Peru'])).toBe(
      'Kenya, Morocco and Peru',
    );
  });
});

describe('buildInnovationPackageTitle', () => {
  it('keeps the core innovation casing for regional packages', () => {
    const title = buildInnovationPackageTitle({
      coreInnovationTitle: 'Drought tolerant maize',
      geoScopeId: 2,
      regionNames: ['Western Africa', 'Northern Africa'],
    });

    expect(title).toBe(
      `${INNOVATION_PACKAGE_TITLE_PREFIX} Drought tolerant maize in Western Africa and Northern Africa`,
    );
  });

  it('lowercases the core innovation for country scoped packages', () => {
    for (const geoScopeId of [3, 4, 5]) {
      expect(
        buildInnovationPackageTitle({
          coreInnovationTitle: 'Drought Tolerant Maize',
          geoScopeId,
          countryNames: ['Morocco'],
        }),
      ).toBe(
        `${INNOVATION_PACKAGE_TITLE_PREFIX} drought tolerant maize in Morocco`,
      );
    }
  });

  it('falls back to the global form and closes with a period', () => {
    expect(
      buildInnovationPackageTitle({
        coreInnovationTitle: 'Drought Tolerant Maize',
        geoScopeId: 1,
      }),
    ).toBe(`${INNOVATION_PACKAGE_TITLE_PREFIX} drought tolerant maize.`);
  });

  it('strips a trailing period from the core innovation title', () => {
    expect(
      buildInnovationPackageTitle({
        coreInnovationTitle: 'Drought tolerant maize.',
        geoScopeId: 2,
        regionNames: ['Western Africa'],
      }),
    ).toBe(
      `${INNOVATION_PACKAGE_TITLE_PREFIX} Drought tolerant maize in Western Africa`,
    );
  });

  it('accepts the geo scope id as a string', () => {
    expect(
      buildInnovationPackageTitle({
        coreInnovationTitle: 'Maize',
        geoScopeId: '3' as unknown as number,
        countryNames: ['Peru'],
      }),
    ).toBe(`${INNOVATION_PACKAGE_TITLE_PREFIX} maize in Peru`);
  });

  it('uses the global form when the expected geo names are missing', () => {
    expect(
      buildInnovationPackageTitle({
        coreInnovationTitle: 'Maize',
        geoScopeId: 2,
        regionNames: [],
      }),
    ).toBe(`${INNOVATION_PACKAGE_TITLE_PREFIX} maize.`);
  });
});

// P2-3427 (PO review, 25-Sep-2026): the generated title must never exceed the 30-word cap the form enforces.
describe('buildInnovationPackageTitle — never longer than the form allows (P2-3427)', () => {
  const words = (s: string) => s.trim().split(/\s+/).length;
  const longCore =
    'Using accurate detection tools to develop a successful management strategy for lentil and chickpea viruses in farmers fields in the highlands of Ethiopia and beyond the region';

  it('trims the core innovation part so a country-scoped title fits in 30 words, keeping the country suffix intact', () => {
    const title = buildInnovationPackageTitle({
      coreInnovationTitle: longCore,
      geoScopeId: 4,
      countryNames: ['Ethiopia'],
    });
    expect(words(title)).toBeLessThanOrEqual(
      INNOVATION_PACKAGE_TITLE_MAX_WORDS,
    );
    expect(title.endsWith(' in Ethiopia')).toBe(true);
    expect(
      title.startsWith(
        'Innovation Package and Scaling Readiness assessment for using accurate detection tools',
      ),
    ).toBe(true);
  });

  it('trims a regional title the same way', () => {
    const title = buildInnovationPackageTitle({
      coreInnovationTitle: longCore,
      geoScopeId: 2,
      regionNames: ['Eastern Africa', 'Southern Asia'],
    });
    expect(words(title)).toBeLessThanOrEqual(
      INNOVATION_PACKAGE_TITLE_MAX_WORDS,
    );
    expect(title.endsWith(' in Eastern Africa and Southern Asia')).toBe(true);
  });

  it('trims a global title and still closes with a period', () => {
    const title = buildInnovationPackageTitle({
      coreInnovationTitle: longCore,
      geoScopeId: 1,
    });
    expect(words(title)).toBeLessThanOrEqual(
      INNOVATION_PACKAGE_TITLE_MAX_WORDS,
    );
    expect(title.endsWith('.')).toBe(true);
  });

  it('negative control: a short core innovation is left untouched', () => {
    const title = buildInnovationPackageTitle({
      coreInnovationTitle: 'Drought tolerant maize.',
      geoScopeId: 4,
      countryNames: ['Kenya'],
    });
    expect(title).toBe(
      'Innovation Package and Scaling Readiness assessment for drought tolerant maize in Kenya',
    );
  });

  it('fitCoreTitleToCap cuts at a word boundary and never returns an empty core', () => {
    expect(fitCoreTitleToCap('a b', 'one two three four', 'x y', 6)).toBe(
      'one two',
    );
    expect(fitCoreTitleToCap('a b c d e f', 'one two', 'g h', 6)).toBe('one');
  });
});

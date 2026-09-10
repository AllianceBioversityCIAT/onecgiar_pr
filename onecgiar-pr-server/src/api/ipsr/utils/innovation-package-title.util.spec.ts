import {
  INNOVATION_PACKAGE_TITLE_PREFIX,
  buildInnovationPackageTitle,
  joinGeoScopeNames,
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

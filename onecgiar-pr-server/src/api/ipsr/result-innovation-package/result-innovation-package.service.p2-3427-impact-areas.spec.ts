import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * P2-3427 (Ángel, 25-Sep-2026 review of the IPSR flow) — when a package is created from a core
 * innovation, `createHeader` copied only the Gender and Climate scores (LFUB-712, June 2023, when
 * those were the only two Impact Areas). Nutrition, Environment and Poverty stayed empty, so the
 * step 1 form opened with two areas pre-selected and three blank. All five must follow the same rule.
 *
 * Source contract, same style as the P2-3824 spec: the service has ~40 injected dependencies and
 * no behaviour spec of its own.
 */
describe('ResultInnovationPackageService — createHeader copies the five Impact Area scores (P2-3427)', () => {
  const source = readFileSync(
    join(__dirname, 'result-innovation-package.service.ts'),
    'utf8',
  );
  const headerSave = source.slice(
    source.indexOf(
      'const newInnovationHeader = await this._resultRepository.save({',
    ),
    source.indexOf('const newResult = newInnovationHeader.id;'),
  );

  it('the header save block is where the core innovation is copied', () => {
    expect(headerSave.length).toBeGreaterThan(0);
    expect(headerSave).toMatch(/result_type_id: 10,/);
  });

  it.each([
    'gender_tag_level_id',
    'climate_change_tag_level_id',
    'nutrition_tag_level_id',
    'environmental_biodiversity_tag_level_id',
    'poverty_tag_level_id',
  ])('%s is copied from the core innovation', (column) => {
    expect(headerSave).toMatch(new RegExp(`${column}:\\s*result\\.${column},`));
  });
});

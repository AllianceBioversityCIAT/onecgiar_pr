import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * P2-3824 — the P22 General-information save (`ResultInnovationPackageService.generalInformation`)
 * upserts one evidence per Impact Area tag, looked up by the tag flag alone. IPSR Step 3 evidence
 * carries the same flags on the same package result, so without `evidence_type_id IS NULL` a P22
 * General-information save would overwrite — or deactivate — a tagged Step 3 file.
 *
 * Source contract, not a behaviour test: the service has ~40 injected dependencies and no spec of
 * its own; this pins the five lookups instead of mocking the whole graph.
 */
describe('ResultInnovationPackageService — Impact Area evidence lookups (P2-3824)', () => {
  const source = readFileSync(
    join(__dirname, 'result-innovation-package.service.ts'),
    'utf8',
  );

  it.each([
    'gender_related',
    'youth_related',
    'nutrition_related',
    'environmental_biodiversity_related',
    'poverty_related',
  ])('the %s lookup only matches General-information rows', (flag) => {
    const lookup = new RegExp(
      `findOne\\(\\{\\s*where: \\{\\s*result_id: resultId,\\s*is_active: 1,\\s*evidence_type_id: Or\\(IsNull\\(\\), Not\\(EvidenceTypeEnum\\.IPSR_STEP_THREE\\)\\),\\s*${flag}: true,\\s*\\},\\s*\\}\\)`,
    );
    expect(source).toMatch(lookup);
  });

  it('no Impact Area lookup is left without the type filter', () => {
    const unfiltered =
      /is_active: 1,\s*(gender|youth|nutrition|environmental_biodiversity|poverty)_related: true/;
    expect(source).not.toMatch(unfiltered);
  });
});

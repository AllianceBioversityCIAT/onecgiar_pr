import {
  buildCenterIndex,
  resolveProjectOwnerCenter,
} from './project-owner-center.util';
import { ClarisaCenter } from '../../../clarisa/clarisa-centers/entities/clarisa-center.entity';

const center = (code: string, institutionId: number): ClarisaCenter =>
  ({ code, institutionId }) as ClarisaCenter;

describe('resolveProjectOwnerCenter', () => {
  it('resolves via organizationCode -> institutionId when a Center matches (org-code hit)', () => {
    const index = buildCenterIndex([
      center('CENTER-06', 67),
      center('CENTER-01', 12),
    ]);

    const result = resolveProjectOwnerCenter(
      { organizationCode: 67, sourceCenterAcronym: null },
      index,
    );

    expect(result).toEqual({ code: 'CENTER-06', institutionId: 67 });
  });

  it('falls through to the alias map when organizationCode is set but no Center matches (org-code miss -> alias hit)', () => {
    // organizationCode 999 has no Center in the index; BIOVERSITY is a known W3 alias.
    const index = buildCenterIndex([center('CENTER-02', 42)]);

    const result = resolveProjectOwnerCenter(
      { organizationCode: 999, sourceCenterAcronym: 'BIOVERSITY' },
      index,
    );

    expect(result).toEqual({ code: 'CENTER-02', institutionId: 42 });
  });

  it('returns the alias code with institutionId null when the index has no Center for it', () => {
    // Leader decision: the alias-map code is trusted even when it is not present in the index.
    const index = buildCenterIndex([]);

    const result = resolveProjectOwnerCenter(
      { organizationCode: null, sourceCenterAcronym: 'BIOVERSITY' },
      index,
    );

    expect(result).toEqual({ code: 'CENTER-02', institutionId: null });
  });

  it('returns null when the acronym is unknown to the alias map (alias unknown -> null)', () => {
    const index = buildCenterIndex([]);

    const result = resolveProjectOwnerCenter(
      { organizationCode: null, sourceCenterAcronym: 'NOT-A-REAL-CENTER' },
      index,
    );

    expect(result).toBeNull();
  });

  it('returns null when both organizationCode and sourceCenterAcronym are null (both null -> null)', () => {
    const index = buildCenterIndex([]);

    const result = resolveProjectOwnerCenter(
      { organizationCode: null, sourceCenterAcronym: null },
      index,
    );

    expect(result).toBeNull();
  });
});

describe('buildCenterIndex', () => {
  it('indexes centers by institutionId and by code', () => {
    const index = buildCenterIndex([center('CENTER-06', 67)]);

    expect(index.byInstitutionId.get(67)).toEqual({
      code: 'CENTER-06',
      institutionId: 67,
    });
    expect(index.byCode.get('CENTER-06')).toEqual({
      code: 'CENTER-06',
      institutionId: 67,
    });
  });
});

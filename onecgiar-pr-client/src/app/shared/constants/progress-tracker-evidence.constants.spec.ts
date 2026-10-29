import { PT_TEMPORARY_EVIDENCE_PREFIX, isPtTemporaryEvidence } from './progress-tracker-evidence.constants';

describe('progress-tracker-evidence.constants', () => {
  it('recognises the prefix the server writes on Progress Tracker evidence', () => {
    expect(isPtTemporaryEvidence(`${PT_TEMPORARY_EVIDENCE_PREFIX} Field report`)).toBe(true);
    expect(isPtTemporaryEvidence(PT_TEMPORARY_EVIDENCE_PREFIX)).toBe(true);
  });

  it('ignores user evidence and empty descriptions', () => {
    expect(isPtTemporaryEvidence('Field report')).toBe(false);
    expect(isPtTemporaryEvidence('')).toBe(false);
    expect(isPtTemporaryEvidence(null)).toBe(false);
    expect(isPtTemporaryEvidence(undefined)).toBe(false);
  });
});

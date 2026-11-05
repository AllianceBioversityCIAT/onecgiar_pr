import { PT_UNSAVED_EVIDENCE_DETAIL } from './progress-tracker-evidence.constants';
import {
  dismissPtUnsavedEvidence,
  ptUnsavedEvidenceBannerHtml,
  readPtUnsavedEvidence,
  rememberPtUnsavedEvidence
} from './pt-unsaved-evidence-notice';

describe('pt-unsaved-evidence-notice', () => {
  beforeEach(() => sessionStorage.clear());

  it('remembers names for a result code and ignores blanks', () => {
    rememberPtUnsavedEvidence('31235', ['  Field note  ', '', 'Field note', 'Photo <draft>']);
    expect(readPtUnsavedEvidence('31235')).toEqual(['Field note', 'Photo <draft>']);
    expect(readPtUnsavedEvidence('31246')).toEqual([]);
    expect(readPtUnsavedEvidence(null)).toEqual([]);
  });

  it('hides the reminder without touching any other result', () => {
    rememberPtUnsavedEvidence('31235', ['Field note']);
    rememberPtUnsavedEvidence('31246', ['Other note']);
    dismissPtUnsavedEvidence('31235');
    expect(readPtUnsavedEvidence('31235')).toEqual([]);
    expect(readPtUnsavedEvidence('31246')).toEqual(['Other note']);
  });

  it('renders an escaped list and says the item was not saved', () => {
    const html = ptUnsavedEvidenceBannerHtml(['Photo <draft>']);
    expect(html).toContain('<strong>Photo &lt;draft&gt;</strong>');
    expect(html).toContain(PT_UNSAVED_EVIDENCE_DETAIL);
    expect(html).toContain('not an evidence record');
    expect(ptUnsavedEvidenceBannerHtml([])).toBe('');
  });

  it('returns nothing when storage is unreadable', () => {
    sessionStorage.setItem('prms.pt-unsaved-evidence.v1', '{not json');
    expect(readPtUnsavedEvidence('31235')).toEqual([]);
  });
});
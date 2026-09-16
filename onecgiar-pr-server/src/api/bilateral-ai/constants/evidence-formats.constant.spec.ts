import {
  QUALIFYING_EVIDENCE_EXTENSIONS,
  isQualifyingEvidenceDocument,
} from './evidence-formats.constant';
import { DraftEvidenceSourceType } from '../entities/draft-evidence.entity';

/**
 * ADE-R-2 / ADE-AC-2. Expected values are written literally from `requirements.md` `ADE-R-2`,
 * never derived from `QUALIFYING_EVIDENCE_EXTENSIONS` — a suite that iterates the constant to
 * build its own expectations proves nothing about whether the constant holds the right values.
 */
describe('QUALIFYING_EVIDENCE_EXTENSIONS', () => {
  it('is exactly pdf, docx, xls, xlsx, pptx', () => {
    expect(QUALIFYING_EVIDENCE_EXTENSIONS).toEqual([
      'pdf',
      'docx',
      'xls',
      'xlsx',
      'pptx',
    ]);
  });
});

describe('isQualifyingEvidenceDocument', () => {
  it.each([['pdf'], ['docx'], ['xls'], ['xlsx'], ['pptx']])(
    'qualifies a DOCUMENT source with the allowed extension .%s',
    (extension) => {
      expect(
        isQualifyingEvidenceDocument({
          source_type: DraftEvidenceSourceType.DOCUMENT,
          file_name: `report.${extension}`,
        }),
      ).toBe(true);
    },
  );

  /**
   * The falsifying case: `ADE-R-2` names `txt` explicitly because the AI uploader accepts it as
   * a `DOCUMENT` source. A predicate written against `source_type` alone returns `true` here.
   */
  it('does NOT qualify notes.txt although source_type is DOCUMENT', () => {
    expect(
      isQualifyingEvidenceDocument({
        source_type: DraftEvidenceSourceType.DOCUMENT,
        file_name: 'notes.txt',
      }),
    ).toBe(false);
  });

  it('does NOT qualify an audio extension (VOICE_NOTE source)', () => {
    expect(
      isQualifyingEvidenceDocument({
        source_type: DraftEvidenceSourceType.VOICE_NOTE,
        file_name: 'voice-note.m4a',
      }),
    ).toBe(false);
  });

  it('does NOT qualify a TEXT_CONTEXT row', () => {
    expect(
      isQualifyingEvidenceDocument({
        source_type: DraftEvidenceSourceType.TEXT_CONTEXT,
        file_name: null,
      }),
    ).toBe(false);
  });

  it('does NOT qualify a DOCUMENT row whose file_name has no extension', () => {
    expect(
      isQualifyingEvidenceDocument({
        source_type: DraftEvidenceSourceType.DOCUMENT,
        file_name: 'report',
      }),
    ).toBe(false);
  });

  it('qualifies mixed-case extensions (REPORT.PDF)', () => {
    expect(
      isQualifyingEvidenceDocument({
        source_type: DraftEvidenceSourceType.DOCUMENT,
        file_name: 'REPORT.PDF',
      }),
    ).toBe(true);
  });

  it('does NOT qualify a DOCUMENT row with a null file_name', () => {
    expect(
      isQualifyingEvidenceDocument({
        source_type: DraftEvidenceSourceType.DOCUMENT,
        file_name: null,
      }),
    ).toBe(false);
  });
});

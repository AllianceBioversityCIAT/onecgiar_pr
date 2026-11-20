// @akili-spec bilateral/evidence-privacy-tag (EVP-T-2, EVP-R-1, EVP-DD-2)

import { resolveEvidenceVisibility } from './evidence-visibility';

/**
 * Expected values come from design.md §3.1 "Visibility resolver" table, not from the code.
 */
describe('resolveEvidenceVisibility (design §3.1)', () => {
  it('link, is_public = 1 -> public, exposed true', () => {
    expect(
      resolveEvidenceVisibility({ is_sharepoint: 0, is_public: 1 }),
    ).toEqual({ visibility: 'public', exposed: true });
  });

  it('link, is_public = 0 -> private, exposed false', () => {
    expect(
      resolveEvidenceVisibility({ is_sharepoint: 0, is_public: 0 }),
    ).toEqual({ visibility: 'private', exposed: false });
  });

  it('link, is_public NULL (untagged) -> public, exposed null', () => {
    expect(
      resolveEvidenceVisibility({ is_sharepoint: 0, is_public: null }),
    ).toEqual({ visibility: 'public', exposed: null });
  });

  it('file, is_public_file = 1 -> public, exposed true', () => {
    expect(
      resolveEvidenceVisibility({
        is_sharepoint: 1,
        is_public: null,
        is_public_file: 1,
      }),
    ).toEqual({ visibility: 'public', exposed: true });
  });

  it('file, is_public_file = 0 -> private, exposed false', () => {
    expect(
      resolveEvidenceVisibility({
        is_sharepoint: 1,
        is_public: null,
        is_public_file: 0,
      }),
    ).toEqual({ visibility: 'private', exposed: false });
  });

  it('file, is_public_file NULL -> private, exposed false', () => {
    expect(
      resolveEvidenceVisibility({
        is_sharepoint: 1,
        is_public: null,
        is_public_file: null,
      }),
    ).toEqual({ visibility: 'private', exposed: false });
  });

  it('file, no SharePoint row (legacy anomaly) -> private, exposed false', () => {
    expect(
      resolveEvidenceVisibility({ is_sharepoint: 1, is_public: null }),
    ).toEqual({ visibility: 'private', exposed: false });
  });

  it('file ignores is_public: is_public = 1 with is_public_file = 0 -> private', () => {
    expect(
      resolveEvidenceVisibility({
        is_sharepoint: 1,
        is_public: 1,
        is_public_file: 0,
      }),
    ).toEqual({ visibility: 'private', exposed: false });
  });

  it('file ignores is_public: is_public = 0 with is_public_file = 1 -> public', () => {
    expect(
      resolveEvidenceVisibility({
        is_sharepoint: 1,
        is_public: 0,
        is_public_file: 1,
      }),
    ).toEqual({ visibility: 'public', exposed: true });
  });

  it('normalizes boolean inputs like tinyint ones', () => {
    expect(
      resolveEvidenceVisibility({ is_sharepoint: false, is_public: false }),
    ).toEqual({ visibility: 'private', exposed: false });
    expect(
      resolveEvidenceVisibility({
        is_sharepoint: true,
        is_public: null,
        is_public_file: true,
      }),
    ).toEqual({ visibility: 'public', exposed: true });
  });

  it('treats undefined is_public on a link as untagged', () => {
    expect(resolveEvidenceVisibility({ is_sharepoint: 0 })).toEqual({
      visibility: 'public',
      exposed: null,
    });
  });
});

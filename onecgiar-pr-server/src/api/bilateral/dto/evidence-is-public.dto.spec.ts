import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EvidenceDto } from './create-bilateral.dto';

// @akili-spec bilateral/evidence-privacy-tag (EVP-R-4, EVP-R-5, EVP-DD-4)
const STORAGE_HOSTS = [
  'https://cgiar.sharepoint.com/sites/2025TechnicalReportingTeams/Shared',
  'https://drive.google.com/file/d/1abc/view',
  'https://www.dropbox.com/s/abc/file.pdf',
  'https://1drv.ms/b/s!Abc',
  'https://onedrive.live.com/redir?resid=1',
  'https://docs.google.com/document/d/1abc/edit',
];

const PUBLIC_STATES: Array<[string, Record<string, unknown>, boolean]> = [
  ['false', { is_public: false }, true],
  ['true', { is_public: true }, false],
  ['null', { is_public: null }, false],
  ['absent', {}, false],
];

const run = async (link: string, extra: Record<string, unknown>) => {
  const dto = plainToInstance(EvidenceDto, {
    link,
    description: 'Contract',
    ...extra,
  });
  return validate(dto, { whitelist: true, forbidNonWhitelisted: false });
};

describe('EvidenceDto.is_public x storage link', () => {
  describe.each(STORAGE_HOSTS)('host %s', (link) => {
    it.each(PUBLIC_STATES)(
      'is_public %s',
      async (_label, extra, accepted) => {
        const errors = await run(link, extra);
        const linkError = errors.find((e) => e.property === 'link');
        if (accepted) {
          expect(errors).toEqual([]);
        } else {
          expect(linkError).toBeDefined();
          expect(JSON.stringify(linkError?.constraints)).toContain(
            'file storage platforms',
          );
        }
      },
    );
  });

  it('rejects a non-boolean is_public on property is_public', async () => {
    const errors = await run('https://cgiar.sharepoint.com/sites/x', {
      is_public: 'no',
    });
    expect(errors.find((e) => e.property === 'is_public')).toBeDefined();
  });

  it.each([true, false, null])(
    'accepts is_public %p on a public link',
    async (value) => {
      expect(
        await run('https://doi.org/10.1234/abcd.2025.01', {
          is_public: value,
        }),
      ).toEqual([]);
    },
  );

  it('keeps is_public: false after whitelisting', async () => {
    const dto = plainToInstance(EvidenceDto, {
      link: 'https://cgiar.sharepoint.com/sites/x',
      description: 'Contract',
      is_public: false,
    });
    await validate(dto, { whitelist: true, forbidNonWhitelisted: false });
    expect((dto as { is_public?: unknown }).is_public).toBe(false);
  });

  it('still reports a missing scheme for a private link', async () => {
    const errors = await run('some-report.docx', { is_public: false });
    expect(errors.find((e) => e.property === 'link')).toBeDefined();
  });
});

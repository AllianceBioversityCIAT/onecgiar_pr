import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EvidenceDto } from './create-bilateral.dto';

/**
 * PRMS stores an evidence link and never fetches the document, so what gets accepted
 * here is exactly what a reviewer and the Results Dashboard will have to work with.
 * Both rules below were already stated and enforced in the reporting tool; this surface
 * accepted what the form refused until 2026-08.
 */
describe('EvidenceDto.link', () => {
  const validateLink = async (link: unknown) => {
    const dto = plainToInstance(EvidenceDto, {
      link,
      description: 'Evidence 1',
    });
    const errors = await validate(dto);
    return errors.find((error) => error.property === 'link');
  };

  it.each([
    'https://cgspace.cgiar.org/handle/10568/181939',
    'https://doi.org/10.1234/abcd.2025.01',
    'http://example.org/report.pdf',
  ])('accepts the publicly reachable link %s', async (link) => {
    expect(await validateLink(link)).toBeUndefined();
  });

  // With class-validator's defaults a bare file name passes `@IsUrl()`, because `.pdf`
  // satisfies its TLD check. `result-28808-Document-202607042143-8310.pdf` was stored as
  // an evidence link on exactly that basis (evidence 12974 in TEST, 2026-08-26).
  it.each([
    'result-28808-Document-202607042143-8310.pdf',
    'some-report.docx',
    'cgspace.cgiar.org/handle/10568/181939',
  ])('rejects %s, which carries no scheme', async (link) => {
    expect(await validateLink(link)).toBeDefined();
  });

  it.each([
    'https://cgiar.sharepoint.com/sites/2025TechnicalReportingTeams/Shared',
    'https://drive.google.com/file/d/1abc/view',
    'https://www.dropbox.com/s/abc/file.pdf',
    'https://1drv.ms/b/s!Abc',
    'https://onedrive.live.com/redir?resid=1',
    'https://docs.google.com/document/d/1abc/edit',
  ])('rejects the file storage link %s', async (link) => {
    const error = await validateLink(link);
    expect(error).toBeDefined();
    expect(JSON.stringify(error?.constraints)).toContain(
      'file storage platforms',
    );
  });

  it('rejects an empty link', async () => {
    expect(await validateLink('')).toBeDefined();
  });
});

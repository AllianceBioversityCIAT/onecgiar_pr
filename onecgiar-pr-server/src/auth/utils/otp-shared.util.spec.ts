import { parseOtpAllowedDomains } from './otp-shared.util';

// @akili-spec changes/cognito-email-otp-login (OTP-T-17, design.md §19.2,
// requirements.md OTP-AC-24) — `parseOtpAllowedDomains` must apply the exact
// same rule documented for `AuthService.getOtpAllowedDomains()`: split on
// `,`, trim, lower-case, drop one leading `@`, drop empty/malformed entries,
// de-duplicate. Expected values below come from that documented rule, not
// from re-deriving the implementation.
describe('parseOtpAllowedDomains', () => {
  it('splits, trims and lower-cases a comma-separated list', () => {
    expect(parseOtpAllowedDomains('ICRISAT.org, ilri.org ,iita.org')).toEqual([
      'icrisat.org',
      'ilri.org',
      'iita.org',
    ]);
  });

  it('strips one leading "@" from an entry', () => {
    expect(parseOtpAllowedDomains('@icrisat.org,ilri.org')).toEqual([
      'icrisat.org',
      'ilri.org',
    ]);
  });

  it('drops an entry that still contains "@" after stripping one leading "@"', () => {
    expect(parseOtpAllowedDomains('user@icrisat.org,ilri.org')).toEqual([
      'ilri.org',
    ]);
  });

  it('drops empty entries produced by stray commas', () => {
    expect(parseOtpAllowedDomains('icrisat.org,,  ,ilri.org')).toEqual([
      'icrisat.org',
      'ilri.org',
    ]);
  });

  it('de-duplicates case-insensitively', () => {
    expect(parseOtpAllowedDomains('icrisat.org,ICRISAT.org')).toEqual([
      'icrisat.org',
    ]);
  });

  it.each([
    ['empty string', ''],
    ['null', null],
    ['undefined', undefined],
  ])('treats %s as no allow-list', (_label, raw) => {
    expect(parseOtpAllowedDomains(raw as never)).toEqual([]);
  });
});

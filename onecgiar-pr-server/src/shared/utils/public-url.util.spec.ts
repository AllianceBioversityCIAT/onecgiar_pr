import { checkPublicHttpsUrl } from './public-url.util';

/**
 * The negative cases are the point of this file. This guard exists so that an authenticated platform
 * cannot register a destination that turns PRMS into a request forwarder into our own network.
 */
describe('checkPublicHttpsUrl', () => {
  it('accepts a normal public https URL', () => {
    const check = checkPublicHttpsUrl(
      'https://platform.example.org/prms/callback',
    );

    expect(check.ok).toBe(true);
    expect(check.url?.toString()).toBe(
      'https://platform.example.org/prms/callback',
    );
  });

  it('normalises the stored value through URL', () => {
    const check = checkPublicHttpsUrl('  https://platform.example.org  ');

    expect(check.ok).toBe(true);
    // Trailing slash added by URL — storing the normalised form keeps comparisons stable.
    expect(check.url?.toString()).toBe('https://platform.example.org/');
  });

  describe('rejects what would let us be used as a proxy', () => {
    it.each([
      ['plain http', 'http://platform.example.org/hook'],
      ['localhost', 'https://localhost/hook'],
      ['loopback IPv4', 'https://127.0.0.1/hook'],
      ['loopback IPv6', 'https://[::1]/hook'],
      ['private 10/8', 'https://10.1.2.3/hook'],
      ['private 172.16/12', 'https://172.20.0.5/hook'],
      ['private 192.168/16', 'https://192.168.1.10/hook'],
      ['cloud metadata', 'https://169.254.169.254/latest/meta-data/'],
      ['carrier-grade NAT', 'https://100.64.0.1/hook'],
      ['zero network', 'https://0.0.0.0/hook'],
      ['unique-local IPv6', 'https://[fd00::1]/hook'],
      ['mDNS name', 'https://printer.local/hook'],
      ['internal TLD', 'https://service.internal/hook'],
      ['bare hostname', 'https://internal-service/hook'],
    ])('rejects %s', (_label, url) => {
      const check = checkPublicHttpsUrl(url);

      expect(check.ok).toBe(false);
      expect(check.reason).toBeTruthy();
    });
  });

  it('rejects credentials embedded in the URL', () => {
    // These would be stored and replayed on every delivery.
    const check = checkPublicHttpsUrl(
      'https://user:pass@platform.example.org/hook',
    );

    expect(check.ok).toBe(false);
    expect(check.reason).toContain('credentials');
  });

  it.each([
    ['empty', ''],
    ['whitespace only', '   '],
    ['not a URL', 'not-a-url'],
    ['relative path', '/hook'],
  ])('rejects %s', (_label, value) => {
    expect(checkPublicHttpsUrl(value).ok).toBe(false);
  });

  it('rejects a URL longer than the column allows', () => {
    const check = checkPublicHttpsUrl(
      `https://platform.example.org/${'a'.repeat(600)}`,
    );

    expect(check.ok).toBe(false);
    expect(check.reason).toContain('500');
  });
});

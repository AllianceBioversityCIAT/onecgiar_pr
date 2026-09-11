import { APP_VERSION } from './app-version.constants';

/**
 * The version is written by hand on every delivery, which is exactly why it needs a guard: the
 * previous format was a bare counter ('57') and typing one again would silently go out to QA.
 */
describe('APP_VERSION', () => {
  const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

  it('follows MAJOR.MINOR.PATCH', () => {
    expect(APP_VERSION).toMatch(SEMVER);
  });

  it('rejects the old bare-counter format', () => {
    // Control: the guard has to actually reject what it exists to reject, or the test above passes
    // for the wrong reason.
    expect('57').not.toMatch(SEMVER);
    expect('1.0').not.toMatch(SEMVER);
    expect('v1.0.0').not.toMatch(SEMVER);
    expect('01.0.0').not.toMatch(SEMVER);
  });

  it('is not left at 0.0.0', () => {
    expect(APP_VERSION).not.toBe('0.0.0');
  });
});

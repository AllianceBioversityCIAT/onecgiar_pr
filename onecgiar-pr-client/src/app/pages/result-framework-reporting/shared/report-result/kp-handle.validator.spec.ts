import {
  KP_HANDLE_EMPTY_MESSAGE,
  KP_HANDLE_UNSUPPORTED_MESSAGE,
  normalizeKpHandle,
  validateKpHandle
} from './kp-handle.validator';

describe('validateKpHandle', () => {
  it.each([
    ['CGSpace item uuid', 'https://cgspace.cgiar.org/items/0a1b2c3d-4e5f-6789-abcd-ef0123456789'],
    ['MELSpace item uuid', 'https://repo.mel.cgiar.org/items/0a1b2c3d-4e5f-6789-abcd-ef0123456789'],
    ['WorldFish item uuid', 'https://digitalarchive.worldfishcenter.org/items/0a1b2c3d-4e5f-6789-abcd-ef0123456789'],
    ['hdl 10568', 'https://hdl.handle.net/10568/128401'],
    ['hdl 20.500.11766', 'https://hdl.handle.net/20.500.11766/12345'],
    ['hdl 20.500.12348', 'https://hdl.handle.net/20.500.12348/6789'],
    ['CGSpace legacy handle path', 'https://cgspace.cgiar.org/handle/10568/129887']
  ])('accepts a %s', (_label, handle) => {
    expect(validateKpHandle(handle)).toEqual({ status: false, message: '' });
  });

  // KPH-R-1 / KPH-T-1 regression: bare handle (no https:// prefix) — the exact way CGSpace,
  // MELSpace and WorldFish display handles by default. Red before this task's regex extension.
  it.each([
    ['bare CGSpace handle (10568)', '10568/183891'],
    ['bare MELSpace handle (20.500.11766)', '20.500.11766/9021'],
    ['bare WorldFish handle (20.500.12348)', '20.500.12348/9021']
  ])('accepts a %s', (_label, handle) => {
    expect(validateKpHandle(handle)).toEqual({ status: false, message: '' });
  });

  it.each([
    ['an empty string', ''],
    ['null', null],
    ['undefined', undefined]
  ])('reports %s as a missing handle', (_label, handle) => {
    expect(validateKpHandle(handle as any)).toEqual({ status: true, message: KP_HANDLE_EMPTY_MESSAGE });
  });

  it.each([
    ['plain http', 'http://hdl.handle.net/10568/128401'],
    ['another CGIAR repository', 'https://repository.cimmyt.org/items/0a1b2c3d-4e5f-6789-abcd-ef0123456789'],
    ['a handle with no number', 'https://hdl.handle.net/10568/'],
    ['an unknown handle prefix', 'https://hdl.handle.net/99999/128401'],
    ['a bare sentence', 'my knowledge product'],
    ['a trailing path after a valid handle', 'https://hdl.handle.net/10568/128401/extra'],
    // KPH-R-5 negative cases: bare handle acceptance must not widen beyond the 3 whitelisted
    // prefixes, and must not accept any string just because it contains a slash.
    ['a bare handle with an unknown prefix', '99999/1'],
    ['a non-handle string', 'not-a-handle']
  ])('rejects %s with the repository message', (_label, handle) => {
    expect(validateKpHandle(handle)).toEqual({ status: true, message: KP_HANDLE_UNSUPPORTED_MESSAGE });
  });
});

describe('normalizeKpHandle', () => {
  it.each([
    ['bare CGSpace handle (10568)', '10568/183891', 'https://cgspace.cgiar.org/handle/10568/183891'],
    ['bare MELSpace handle (20.500.11766)', '20.500.11766/9021', 'https://hdl.handle.net/20.500.11766/9021'],
    ['bare WorldFish handle (20.500.12348)', '20.500.12348/9021', 'https://hdl.handle.net/20.500.12348/9021']
  ])('rewrites a %s to its canonical URL', (_label, handle, expected) => {
    expect(normalizeKpHandle(handle)).toBe(expected);
  });

  it.each([
    ['a CGSpace item URL', 'https://cgspace.cgiar.org/items/0a1b2c3d-4e5f-6789-abcd-ef0123456789'],
    ['an hdl.handle.net URL', 'https://hdl.handle.net/10568/128401'],
    ['a CGSpace legacy handle URL', 'https://cgspace.cgiar.org/handle/10568/129887']
  ])('returns a %s unchanged (already-URL passthrough)', (_label, handle) => {
    expect(normalizeKpHandle(handle)).toBe(handle);
  });

  it('returns an unsupported/invalid value unchanged', () => {
    expect(normalizeKpHandle('99999/1')).toBe('99999/1');
    expect(normalizeKpHandle('not-a-handle')).toBe('not-a-handle');
  });
});

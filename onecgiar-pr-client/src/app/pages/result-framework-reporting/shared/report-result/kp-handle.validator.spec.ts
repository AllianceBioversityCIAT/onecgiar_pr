import { KP_HANDLE_EMPTY_MESSAGE, KP_HANDLE_UNSUPPORTED_MESSAGE, validateKpHandle } from './kp-handle.validator';

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
    ['a trailing path after a valid handle', 'https://hdl.handle.net/10568/128401/extra']
  ])('rejects %s with the repository message', (_label, handle) => {
    expect(validateKpHandle(handle)).toEqual({ status: true, message: KP_HANDLE_UNSUPPORTED_MESSAGE });
  });
});

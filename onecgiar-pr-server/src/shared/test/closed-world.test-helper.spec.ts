import { createClosedWorld } from './closed-world.test-helper';

// @akili-spec bilateral/resubmit-rejected-result — RSB-T-5 (T-4 review advisory B, pointer 6): an
// undeclared member is a recording proxy at ANY depth, so a nested write (`dataSource.manager.update`)
// is a recorded violation, not just a TypeError a `try/catch` could swallow.
describe('closed-world test helper', () => {
  it('declared reads are returned untouched and are not violations', async () => {
    const world = createClosedWorld();
    const find = jest.fn().mockResolvedValue([1]);
    const fake = world.fake('repo', { find });

    await expect(fake.find()).resolves.toEqual([1]);

    expect(world.violations).toEqual([]);
  });

  it('a flat undeclared call is recorded and throws', () => {
    const world = createClosedWorld();
    const fake = world.fake('repo');

    expect(() => fake.save({})).toThrow('closed world: repo.save()');

    expect(world.violations).toEqual(['repo.save']);
  });

  it('a NESTED undeclared call (dataSource.manager.update) is recorded with its full path', () => {
    const world = createClosedWorld();
    const fake = world.fake('dataSource');

    expect(() => fake.manager.update({}, {})).toThrow(
      'closed world: dataSource.manager.update()',
    );
    expect(() => fake.manager.getRepository(1).save({})).toThrow();

    expect(world.violations).toEqual([
      'dataSource.manager.update',
      'dataSource.manager.getRepository',
    ]);
  });

  it('a swallowed throw still leaves the violation behind', () => {
    const world = createClosedWorld();
    const fake = world.fake('dataSource');

    try {
      fake.manager.update({}, {});
    } catch {
      // a refusal path that only logs
    }

    expect(world.violations).toEqual(['dataSource.manager.update']);
  });

  it('only reading an undeclared path is not a violation (nothing was called)', () => {
    const world = createClosedWorld();
    const fake = world.fake('dataSource');

    void fake.manager.update;

    expect(world.violations).toEqual([]);
  });

  it('is not mistaken for a thenable (await on a fake resolves to the fake)', async () => {
    const world = createClosedWorld();
    const fake = world.fake('dataSource');

    await expect(Promise.resolve(fake)).resolves.toBe(fake);
    expect(world.violations).toEqual([]);
  });
});

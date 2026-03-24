import { AdUserRepository } from './ad-users.repository';

describe('AdUserRepository', () => {
  const makeRepo = () => {
    const dataSource = { createEntityManager: jest.fn(() => ({})) } as any;
    const repo = new AdUserRepository(dataSource) as any;
    return { repo, dataSource };
  };

  it('searchLocalUsers should return [] if query is empty or <2 chars', async () => {
    const { repo } = makeRepo();
    repo.find = jest.fn();

    await expect(repo.searchLocalUsers('')).resolves.toEqual([]);
    await expect(repo.searchLocalUsers('a')).resolves.toEqual([]);
    expect(repo.find).not.toHaveBeenCalled();
  });

  it('searchLocalUsers should call find with where/or and order', async () => {
    const { repo } = makeRepo();
    repo.find = jest.fn().mockResolvedValue([{ id: 1 }]);

    const res = await repo.searchLocalUsers('ab');
    expect(res).toEqual([{ id: 1 }]);
    expect(repo.find).toHaveBeenCalledTimes(1);
    expect(repo.find.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        where: expect.any(Array),
        order: { display_name: 'ASC' },
        take: 100,
      }),
    );
  });

  it('findByEmail / findByIdentifier deben construir where correcto', async () => {
    const { repo } = makeRepo();
    repo.findOne = jest.fn().mockResolvedValue(null);

    await repo.findByEmail('x@y.com');
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { mail: 'x@y.com', is_active: true },
    });

    await repo.findByIdentifier('id');
    expect(repo.findOne).toHaveBeenCalledWith({
      where: [
        { mail: 'id', is_active: true },
        { sam_account_name: 'id', is_active: true },
        { user_principal_name: 'id', is_active: true },
      ],
    });
  });

  it('saveFromADUser should update when it exists and save when it does not', async () => {
    const { repo } = makeRepo();

    repo.findByEmail = jest.fn().mockResolvedValueOnce({ id: 10 });
    repo.update = jest.fn().mockResolvedValue(undefined);
    repo.findOne = jest.fn().mockResolvedValue({ id: 10, mail: 'a@b.com' });

    const updated = await repo.saveFromADUser({
      mail: 'a@b.com',
      displayName: 'A',
      sAMAccountName: 'sam',
    });
    expect(repo.update).toHaveBeenCalledTimes(1);
    expect(updated).toEqual({ id: 10, mail: 'a@b.com' });

    repo.findByEmail = jest.fn().mockResolvedValueOnce(null);
    repo.save = jest.fn().mockResolvedValue({ id: 11, mail: 'c@d.com' });

    const created = await repo.saveFromADUser({
      mail: 'c@d.com',
      displayName: 'C',
      sAMAccountName: 'sam2',
    });
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(created).toEqual({ id: 11, mail: 'c@d.com' });
  });

  it('getUsersNeedingSync should build query builder and return getMany', async () => {
    const { repo } = makeRepo();
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 1 }]),
    };
    repo.createQueryBuilder = jest.fn().mockReturnValue(qb);

    const res = await repo.getUsersNeedingSync(1);
    expect(repo.createQueryBuilder).toHaveBeenCalledWith('user');
    expect(qb.where).toHaveBeenCalledTimes(1);
    expect(qb.andWhere).toHaveBeenCalledTimes(1);
    expect(res).toEqual([{ id: 1 }]);
  });
});

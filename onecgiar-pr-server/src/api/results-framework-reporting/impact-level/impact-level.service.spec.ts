import { HttpStatus } from '@nestjs/common';
import { ImpactLevelService } from './impact-level.service';

describe('ImpactLevelService.getStudyTypes (IRS-R-3 / E2)', () => {
  const seed = [
    {
      id: 1,
      name: 'Learning study',
      definition:
        'Evaluates the effectiveness of an intervention in a localized context',
      is_active: true,
    },
    {
      id: 2,
      name: 'Accountability study',
      definition:
        'Evaluates the total effect of an intervention that has gone to scale',
      is_active: true,
    },
  ];

  const build = (find: jest.Mock) => {
    const handlers = {
      returnErrorRes: jest.fn((c) => ({
        response: {},
        message: c.error.message,
        status: 500,
      })),
    };
    return {
      service: new ImpactLevelService(
        { find } as any,
        {} as any,
        handlers as any,
      ),
      handlers,
    };
  };

  it('returns exactly the two seeded types as {id, name, definition}, filtering active only', async () => {
    const find = jest.fn().mockResolvedValue(seed);
    const { service } = build(find);

    const res = await service.getStudyTypes();

    expect(find).toHaveBeenCalledWith({
      where: { is_active: true },
      order: { id: 'ASC' },
    });
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.response).toEqual([
      {
        id: 1,
        name: 'Learning study',
        definition:
          'Evaluates the effectiveness of an intervention in a localized context',
      },
      {
        id: 2,
        name: 'Accountability study',
        definition:
          'Evaluates the total effect of an intervention that has gone to scale',
      },
    ]);
  });

  it('does not expose is_active in the payload', async () => {
    const { service } = build(jest.fn().mockResolvedValue(seed));
    const res = await service.getStudyTypes();
    expect(Object.keys(res.response[0]).sort()).toEqual([
      'definition',
      'id',
      'name',
    ]);
  });

  it('delegates errors to HandlersError', async () => {
    const { service, handlers } = build(
      jest.fn().mockRejectedValue(new Error('boom')),
    );
    const res = await service.getStudyTypes();
    expect(handlers.returnErrorRes).toHaveBeenCalled();
    expect(res.status).toBe(500);
  });
});

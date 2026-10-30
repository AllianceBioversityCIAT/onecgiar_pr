import { RequestMethod } from '@nestjs/common';
import { ImpactLevelController } from './impact-level.controller';

/**
 * IRS-T-5 (IRS-T-3 reviewer advisory) — proves E2/E3/E4 routing (design §4.1) without booting Nest:
 * the module is mounted at `results-framework-reporting/impact-level`, so the handler paths below
 * are the tail of each endpoint.
 */
describe('ImpactLevelController routing (E2-E6)', () => {
  const proto = ImpactLevelController.prototype as any;
  const route = (name: string) => ({
    path: Reflect.getMetadata('path', proto[name]),
    method: Reflect.getMetadata('method', proto[name]),
  });

  it('maps E2 GET study-types', () => {
    expect(route('getStudyTypes')).toEqual({
      path: 'study-types',
      method: RequestMethod.GET,
    });
  });

  it('maps E3 GET get/result/:resultId', () => {
    expect(route('getImpactLevelInfo')).toEqual({
      path: 'get/result/:resultId',
      method: RequestMethod.GET,
    });
  });

  it('maps E4 PATCH save/result/:resultId', () => {
    expect(route('saveImpactLevelInfo')).toEqual({
      path: 'save/result/:resultId',
      method: RequestMethod.PATCH,
    });
  });

  it('maps E5 GET previous-results/search and E6 GET counts', () => {
    expect(route('searchPreviousResults')).toEqual({
      path: 'previous-results/search',
      method: RequestMethod.GET,
    });
    expect(route('getCounts')).toEqual({
      path: 'counts',
      method: RequestMethod.GET,
    });
  });

  it('delegates E5 and E6 to the search service with the query object', () => {
    const search = {
      searchPreviousResults: jest.fn().mockReturnValue('found'),
      getCounts: jest.fn().mockReturnValue('counted'),
    };
    const controller = new ImpactLevelController({} as any, search as any);
    const q5 = { q: 'maize', limit: '10' } as any;
    const q6 = { initiativeId: '11', versionId: '3' } as any;

    expect(controller.searchPreviousResults(q5)).toBe('found');
    expect(search.searchPreviousResults).toHaveBeenCalledWith(q5);
    expect(controller.getCounts(q6)).toBe('counted');
    expect(search.getCounts).toHaveBeenCalledWith(q6);
  });

  it('delegates E3 and E4 to the service with the id, body and token user', () => {
    const service = {
      getImpactLevelInfo: jest.fn().mockReturnValue('read'),
      saveImpactLevelInfo: jest.fn().mockReturnValue('saved'),
    };
    const controller = new ImpactLevelController(service as any, {} as any);
    const user = { id: 5 } as any;
    const body = { cgiar_contribution: 'x' };

    expect(controller.getImpactLevelInfo(10)).toBe('read');
    expect(service.getImpactLevelInfo).toHaveBeenCalledWith(10);
    expect(controller.saveImpactLevelInfo(10, body, user)).toBe('saved');
    expect(service.saveImpactLevelInfo).toHaveBeenCalledWith(10, body, user);
  });
});

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../services/api/api.service';
import { UserContextService } from './user-context.service';

const ITEMS = [
  { result_code: 5844, title: 'Maize resilience in East Africa', version_id: 10, status_name: 'Editing' },
  { result_code: 5900, title: 'Rice yield improvement', version_id: 10, status_name: 'Submitted' }
];

function apiMock() {
  const GET_AllResultsWithUseRole = jest.fn().mockReturnValue(of({ response: { items: ITEMS } }));
  return {
    authSE: { localStorageUser: { id: 7, user_name: 'Grace Hopper', email: 'grace@cgiar.org' } },
    rolesSE: { isAdmin: false, readOnly: false },
    resultsSE: { GET_AllResultsWithUseRole }
  };
}

describe('UserContextService', () => {
  let service: UserContextService;
  let api: ReturnType<typeof apiMock>;

  beforeEach(() => {
    api = apiMock();
    TestBed.configureTestingModule({
      providers: [UserContextService, { provide: ApiService, useValue: api }]
    });
    service = TestBed.inject(UserContextService);
  });

  it('exposes the user identity (name, first name, role)', () => {
    const id = service.identity();
    expect(id.name).toBe('Grace Hopper');
    expect(id.firstName).toBe('Grace');
    expect(id.isAdmin).toBe(false);
  });

  it('fetches and caches the results (one API call)', async () => {
    await service.myResults();
    await service.myResults();
    expect(api.resultsSE.GET_AllResultsWithUseRole).toHaveBeenCalledTimes(1);
  });

  it('finds a result by exact code', async () => {
    const found = await service.findResults('5844');
    expect(found).toHaveLength(1);
    expect(found[0].code).toBe('5844');
  });

  it('finds a result by title keyword (accent-insensitive)', async () => {
    const found = await service.findResults('maize');
    expect(found[0].code).toBe('5844');
  });

  it('returns empty when nothing matches', async () => {
    expect(await service.findResults('quantum computing')).toEqual([]);
  });

  // ---------------------------------------------------------------------------

  function serviceWith(api: any): UserContextService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [UserContextService, { provide: ApiService, useValue: api }] });
    return TestBed.inject(UserContextService);
  }

  describe('identity', () => {
    it('reads the admin and read-only flags from the roles service', () => {
      const custom = serviceWith({ ...apiMock(), rolesSE: { isAdmin: true, readOnly: true } });
      expect(custom.identity()).toEqual(
        expect.objectContaining({ isAdmin: true, readOnly: true, email: 'grace@cgiar.org' })
      );
    });

    it('falls back to empty strings when there is no user in storage', () => {
      const custom = serviceWith({ ...apiMock(), authSE: { localStorageUser: null } });
      expect(custom.identity()).toEqual({ name: '', firstName: '', email: '', isAdmin: false, readOnly: false });
    });

    it('falls back to empty strings when the user has no name or email', () => {
      const custom = serviceWith({ ...apiMock(), authSE: { localStorageUser: { id: 1 } } });
      const id = custom.identity();
      expect(id.name).toBe('');
      expect(id.firstName).toBe('');
      expect(id.email).toBe('');
    });

    it('trims a whitespace-only name down to nothing', () => {
      const custom = serviceWith({ ...apiMock(), authSE: { localStorageUser: { id: 1, user_name: '   ' } } });
      expect(custom.identity().name).toBe('');
      expect(custom.identity().firstName).toBe('');
    });
  });

  describe('myResults', () => {
    it('returns an empty list when there is no user id', async () => {
      const api2 = { ...apiMock(), authSE: { localStorageUser: { user_name: 'Nobody' } } };
      const custom = serviceWith(api2);
      expect(await custom.myResults()).toEqual([]);
      expect(api2.resultsSE.GET_AllResultsWithUseRole).not.toHaveBeenCalled();
    });

    it('shares one in-flight request between concurrent callers', async () => {
      const [a, b] = await Promise.all([service.myResults(), service.myResults()]);
      expect(a).toBe(b);
      expect(api.resultsSE.GET_AllResultsWithUseRole).toHaveBeenCalledTimes(1);
    });

    it('falls back to the id and to empty strings for missing fields', async () => {
      const api2 = {
        ...apiMock(),
        resultsSE: {
          GET_AllResultsWithUseRole: jest.fn().mockReturnValue(of({ response: { items: [{ id: 42 }, {}] } }))
        }
      };
      const results = await serviceWith(api2).myResults();
      expect(results).toEqual([
        { code: '42', title: '', versionId: '', statusName: undefined, phaseName: undefined },
        { code: '', title: '', versionId: '', statusName: undefined, phaseName: undefined }
      ]);
    });

    it('tolerates a response without items', async () => {
      const api2 = {
        ...apiMock(),
        resultsSE: { GET_AllResultsWithUseRole: jest.fn().mockReturnValue(of({ response: {} })) }
      };
      expect(await serviceWith(api2).myResults()).toEqual([]);

      const api3 = {
        ...apiMock(),
        resultsSE: { GET_AllResultsWithUseRole: jest.fn().mockReturnValue(of({})) }
      };
      expect(await serviceWith(api3).myResults()).toEqual([]);
    });

    it('caches an empty list when the request fails', async () => {
      const api2 = {
        ...apiMock(),
        resultsSE: { GET_AllResultsWithUseRole: jest.fn().mockReturnValue(throwError(() => new Error('boom'))) }
      };
      const custom = serviceWith(api2);

      expect(await custom.myResults()).toEqual([]);
      expect(await custom.myResults()).toEqual([]);
      expect(api2.resultsSE.GET_AllResultsWithUseRole).toHaveBeenCalledTimes(1);
    });
  });

  describe('findResults', () => {
    it('returns nothing for an empty or whitespace query', async () => {
      expect(await service.findResults('')).toEqual([]);
      expect(await service.findResults('   ')).toEqual([]);
      expect(api.resultsSE.GET_AllResultsWithUseRole).not.toHaveBeenCalled();
    });

    it('matches a partial code before falling back to the title', async () => {
      const found = await service.findResults('59');
      expect(found).toHaveLength(1);
      expect(found[0].code).toBe('5900');
    });

    it('ranks a code hit above a title hit', async () => {
      const api2 = {
        ...apiMock(),
        resultsSE: {
          GET_AllResultsWithUseRole: jest.fn().mockReturnValue(
            of({
              response: {
                items: [
                  { result_code: 1, title: 'Something about rice', version_id: 1 },
                  { result_code: 999, title: 'Wheat', version_id: 1 }
                ]
              }
            })
          )
        }
      };
      const found = await serviceWith(api2).findResults('99');
      expect(found[0].code).toBe('999');
    });

    it('matches on overlapping long words when neither code nor title contains the query', async () => {
      const found = await service.findResults('resilience africa');
      expect(found).toHaveLength(1);
      expect(found[0].code).toBe('5844');
    });

    it('ignores words of three characters or less in the overlap fallback', async () => {
      expect(await service.findResults('in the of')).toEqual([]);
    });

    it('drops entries without a title and a code', async () => {
      const api2 = {
        ...apiMock(),
        resultsSE: { GET_AllResultsWithUseRole: jest.fn().mockReturnValue(of({ response: { items: [{}] } })) }
      };
      expect(await serviceWith(api2).findResults('anything')).toEqual([]);
    });

    it('honours the limit', async () => {
      const items = Array.from({ length: 8 }, (_, i) => ({ result_code: 6000 + i, title: 'Maize trial', version_id: 1 }));
      const api2 = {
        ...apiMock(),
        resultsSE: { GET_AllResultsWithUseRole: jest.fn().mockReturnValue(of({ response: { items } })) }
      };
      const custom = serviceWith(api2);

      expect(await custom.findResults('maize')).toHaveLength(5);
      expect(await custom.findResults('maize', 2)).toHaveLength(2);
    });

    it('normalizes accents on both sides', async () => {
      const api2 = {
        ...apiMock(),
        resultsSE: {
          GET_AllResultsWithUseRole: jest.fn().mockReturnValue(
            of({ response: { items: [{ result_code: 1, title: 'Investigación agrícola', version_id: 1 }] } })
          )
        }
      };
      const found = await serviceWith(api2).findResults('INVESTIGACIÓN');
      expect(found).toHaveLength(1);
    });
  });
});

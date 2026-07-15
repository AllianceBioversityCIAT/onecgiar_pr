import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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
});
